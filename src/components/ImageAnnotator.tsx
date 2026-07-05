import {
  useState,
  useRef,
  MouseEventHandler,
  KeyboardEventHandler,
  Fragment,
  useEffect,
} from 'react'

import { Position, DraggableData } from 'react-rnd'

import { Button } from './Button'
import { Crosshairs } from './Crosshairs'
import { InfoDialog } from './InfoDialog'
import { LabelDialog } from './LabelDialog'
import { ThumbnailPanel } from './ThumbnailPanel'
import { VerifyDialog } from './VerifyDialog'
import { BoundingBox, BoundingBoxType } from './BoundingBox'
import { maskToBoundingBox } from '../lib/maskUtils'
import type { DecodedMask, SamSession } from '../lib/sam'
import { Annotation } from '../types/Annotation'
import { FalsePositive } from '../types/FalsePositive'
import { INavThumbnail } from '../types/NavThumbnail'
import { ReactZoomPanPinchRef, TransformComponent, TransformWrapper } from 'react-zoom-pan-pinch'
import { useDebouncedCallback } from 'use-debounce'

type SegmentStatus = 'idle' | 'loading-model' | 'encoding' | 'ready' | 'error' | 'unsupported'

interface EditorState {
  createMode: boolean
  drawingMode: boolean
  segmentMode: boolean
  segmentStatus: SegmentStatus
  showBoxes: boolean
  drawStartX: number
  drawStartY: number
  selectedBox?: string
  showLabeler: boolean
  selectedLabel: string
  difficult: boolean
  height: number
  width: number
  showHelp: boolean
  showVerify: boolean
  showDelete: boolean
  showTutorial: boolean
  showConfirmDeleteFalsePositive: boolean
  showThumbnails: boolean
  showConfirmDiscard: boolean
}

interface IImageAnnotationProps {
  annotations: Annotation[]
  suggestions: Annotation[]
  falsePositives: FalsePositive[]
  nextImage: () => void
  previousImage?: () => void
  // required for segmentation pixel readback of cross-origin images
  crossOrigin?: 'anonymous' | 'use-credentials'
  // enables click-to-segment; modelPath serves the self-hosted model
  // assets produced by scripts/download-models.mjs
  segmentation?: { modelPath: string }
  // thumbnails for the side panel, ordered newest (top) to oldest (bottom)
  previousImages?: INavThumbnail[]
  nextImages?: INavThumbnail[]
  currentThumbnailUrl?: string
  navigateToImage?: (id: string) => void
  save: (
    annotations: Annotation[],
    reviewedSuggestions: string[],
    deleteFalsePositive: boolean,
    verified: string[]
  ) => void
  delete: () => void
  back: () => void
  imageUrl: string
  labels: string[]
  manageLabelUrl?: string
  verifiedLabels: string[]
  userAnnotationCount: number
}

type Pad = { leftPad: number; topPad: number }

/**
 * A image annotation component.
 * @component
 * @params props - Component props.
 * @param props.annotations - Bounding boxes
 * @param props.save - Callback for the save button.
 */
const ImageAnnotator = (props: IImageAnnotationProps) => {
  const shortcuts = [
    { codes: ['?'], action: 'Shortcut help' },
    { codes: ['w'], action: 'Add Box' },
    { codes: ['d'], action: 'Mark Difficult' },
    { codes: ['s'], action: 'Cycle Label' },
    { codes: ['Shift', 's'], action: 'Previous Label' },
    { codes: ['Tab'], action: 'Select Next Box' },
    { codes: ['Del'], action: 'Delete Box' },
    { codes: ['Esc'], action: 'Deselect/Cancel' },
    { codes: ['← ↑ → ↓'], action: 'Move Box' },
    { codes: ['Shift', '← ↑ → ↓'], action: 'Resize Box' },
    { codes: ['m'], action: 'Magic segment (click object)' },
    { codes: ['←'], action: 'Previous Image (no box selected)' },
    { codes: ['→'], action: 'Next Image (no box selected)' },
    { codes: ['f'], action: 'Toggle Unselected Boxes' },
    { codes: ['Spacebar'], action: 'Verify and Save' },
  ]

  const [bboxes, setBBoxes] = useState<Annotation[]>([])

  const [fpboxes, setFPBoxes] = useState<FalsePositive[]>([])

  const [state, setState] = useState<EditorState>({
    createMode: false,
    drawingMode: false,
    segmentMode: false,
    segmentStatus: 'idle',
    showBoxes: true,
    showLabeler: false,
    showHelp: false,
    showVerify: false,
    showDelete: false,
    showConfirmDeleteFalsePositive: false,
    showThumbnails: true,
    showConfirmDiscard: false,
    showTutorial: props.userAnnotationCount === 0,
    drawStartX: 0,
    drawStartY: 0,
    selectedLabel:
      props.labels.find((l) => !(props.verifiedLabels ?? []).includes(l)) ?? props.labels[0],
    difficult: false,
    width: 1,
    height: 1,
  })

  const ref = useRef<HTMLImageElement>(null)

  const rootRef = useRef<HTMLDivElement>(null)

  const editorRef = useRef<HTMLDivElement>(null)

  const transformRef = useRef<ReactZoomPanPinchRef>(null)

  // unsaved box edits; guards navigation away from the image
  const [dirty, setDirty] = useState(false)

  const pendingNavRef = useRef<(() => void) | null>(null)

  // segmentation refs; the hover mask is drawn imperatively so decodes
  // don't cause react re-renders
  const maskCanvasRef = useRef<HTMLCanvasElement>(null)
  const samSessionRef = useRef<SamSession | null>(null)
  const pendingPointRef = useRef<{ nx: number; ny: number } | null>(null)
  const decodeBusyRef = useRef(false)
  const lastDecodeRef = useRef<{ nx: number; ny: number; result: DecodedMask } | null>(null)
  const decodeTimesRef = useRef<number[]>([])
  const hoverDisabledRef = useRef(false)
  // invalidates in-flight segmentation work on mode exit or image change
  const segmentGenRef = useRef(0)

  const resize = () => {
    const naturalHeight = ref.current?.naturalHeight ?? 1
    const naturalWidth = ref.current?.naturalWidth ?? 1
    const aspectRatio = naturalWidth / naturalHeight

    const editorHeight = editorRef.current?.clientHeight ?? 0
    const editorWidth = editorRef.current?.clientWidth ?? 0

    const maxHeight = editorHeight - 5
    const maxWidth = editorWidth - 5
    const desiredWidth = maxHeight * aspectRatio

    // if too wide when max height, then use maxWidth
    let calculatedWidth
    let calculatedHeight

    if (desiredWidth > maxWidth) {
      calculatedWidth = maxWidth
      calculatedHeight = Math.round(maxWidth / aspectRatio)
    } else {
      calculatedWidth = desiredWidth
      calculatedHeight = Math.round(desiredWidth / aspectRatio)
    }

    setState({
      ...state,
      width: calculatedWidth,
      height: calculatedHeight,
    })

    const leftPad = (calculatedWidth * 0.1) / 2
    const topPad = (calculatedHeight * 0.1) / 2

    return { leftPad, topPad }
  }

  const handleResize = useDebouncedCallback(() => {
    resize()
  }, 200)

  useEffect(() => {
    window.addEventListener('resize', handleResize)
    rootRef.current?.focus()

    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [handleResize])

  // embeddings belong to a single image; exit segment mode and drop
  // them whenever the image changes (covers non-remounting consumers)
  useEffect(() => {
    return () => {
      segmentGenRef.current += 1
      pendingPointRef.current = null
      samSessionRef.current?.clearCache()
      lastDecodeRef.current = null
      setState((prev) =>
        prev.segmentMode || prev.segmentStatus !== 'idle'
          ? { ...prev, segmentMode: false, segmentStatus: 'idle' }
          : prev
      )
    }
  }, [props.imageUrl])

  const onResizeStop = (elem: HTMLElement, position: Position, boxId: string) => {
    setDirty(true)
    setBBoxes((prev) =>
      prev.map((a) => {
        if (a.id === boxId) {
          return {
            ...a,
            x: position.x / state.width,
            y: position.y / state.height,
            w: elem.offsetWidth / state.width,
            h: elem.offsetHeight / state.height,
          }
        }
        return a
      })
    )
  }
  const onDragStop = (d: DraggableData, boxId: string) => {
    setDirty(true)
    setBBoxes((prev) =>
      prev.map((a) => {
        if (a.id === boxId) {
          return {
            ...a,
            x: d.x / state.width,
            y: d.y / state.height,
          }
        }
        return a
      })
    )
  }

  const onMouseDown: MouseEventHandler<HTMLImageElement> = (e) => {
    if (state.segmentMode) {
      if (state.segmentStatus === 'ready') {
        const point = segmentPointFromEvent(e)
        if (point) {
          void acceptSegmentClick(point)
        }
      }
      return
    }
    if (state.createMode) {
      const scale = transformRef.current?.instance.transformState.scale ?? 1
      const bounds = ref.current?.getBoundingClientRect()
      const x = (e.clientX - (bounds?.left ?? 0)) / scale / state.width
      const y = (e.clientY - (bounds?.top ?? 0)) / scale / state.height

      setState({
        ...state,
        drawingMode: true,
        drawStartX: x,
        drawStartY: y,
        selectedBox: 'draft',
      })
      setBBoxes((prev) => [
        ...prev,
        {
          id: 'draft',
          x,
          y,
          w: 0.0,
          h: 0.0,
        },
      ])
    } else {
      setState({ ...state, selectedBox: undefined })
    }
  }

  const onMouseUp: MouseEventHandler<HTMLImageElement> = (e) => {
    if (state.drawingMode) {
      const newId = Date.now().toString()
      {
        // same commit threshold as the reducer below; only mark dirty
        // when a box is actually created
        const scale = transformRef.current?.instance.transformState.scale ?? 1
        const bounds = ref.current?.getBoundingClientRect()
        const x = (e.clientX - (bounds?.left ?? 0)) / scale / state.width
        const y = (e.clientY - (bounds?.top ?? 0)) / scale / state.height
        if (Math.min(Math.abs(state.drawStartX - x), Math.abs(state.drawStartY - y)) > 0.001) {
          setDirty(true)
        }
      }
      setState({
        ...state,
        drawingMode: false,
        createMode: false,
        selectedBox: newId,
      })
      setBBoxes((prev) =>
        prev.reduce<Annotation[]>((out, a) => {
          if (a.id === 'draft') {
            const scale = transformRef.current?.instance.transformState.scale ?? 1
            const bounds = ref.current?.getBoundingClientRect()
            const x = (e.clientX - (bounds?.left ?? 0)) / scale / state.width
            const y = (e.clientY - (bounds?.top ?? 0)) / scale / state.height

            if (Math.min(Math.abs(state.drawStartX - x), Math.abs(state.drawStartY - y)) > 0.001) {
              let left = Math.min(state.drawStartX, x)
              let top = Math.min(state.drawStartY, y)
              let width = Math.abs(state.drawStartX - x)
              let height = Math.abs(state.drawStartY - y)
              if (left < 0) {
                width -= Math.abs(left)
                left = 0
              }
              if (top < 0) {
                height -= Math.abs(top)
                top = 0
              }
              out.push({
                ...a,
                id: newId,
                label: state.selectedLabel,
                difficult: false,
                x: left,
                y: top,
                w: Math.min(1.0 - left, width),
                h: Math.min(1.0 - top, height),
              })
            }
          } else {
            out.push(a)
          }
          return out
        }, [])
      )
    }
  }

  const onMouseMove: MouseEventHandler<HTMLImageElement> = (e) => {
    if (state.segmentMode) {
      if (state.segmentStatus === 'ready' && !hoverDisabledRef.current) {
        const point = segmentPointFromEvent(e)
        const last = lastDecodeRef.current
        // skip redundant decodes while idle-hovering
        const moved =
          !last ||
          Math.abs(last.nx - (point?.nx ?? 0)) * state.width > 4 ||
          Math.abs(last.ny - (point?.ny ?? 0)) * state.height > 4
        if (point && moved) {
          pendingPointRef.current = point
          void pumpDecodes()
        }
      }
      return
    }
    if (state.drawingMode) {
      setBBoxes((prev) =>
        prev.map((a) => {
          if (a.id === 'draft') {
            const scale = transformRef.current?.instance.transformState.scale ?? 1
            const bounds = ref.current?.getBoundingClientRect()
            const x = (e.pageX - (bounds?.left ?? 0)) / scale / state.width
            const y = (e.pageY - (bounds?.top ?? 0)) / scale / state.height

            return {
              ...a,
              x: Math.min(state.drawStartX, x),
              y: Math.min(state.drawStartY, y),
              w: Math.abs(state.drawStartX - x),
              h: Math.abs(state.drawStartY - y),
            }
          }
          return a
        })
      )
    }
  }

  const clickCreate: MouseEventHandler<HTMLButtonElement> = () => {
    if (!state.createMode && state.segmentMode) {
      segmentGenRef.current += 1
      pendingPointRef.current = null
      clearMaskOverlay()
      setState({ ...state, createMode: true, segmentMode: false, selectedBox: undefined })
      return
    }
    setState({ ...state, createMode: !state.createMode })
  }

  const onClickBBox = (boxId: string) => {
    const selectedBox = bboxes.find((b) => b.id === boxId)
    setState({
      ...state,
      selectedBox: boxId,
      selectedLabel: selectedBox?.label ?? state.selectedLabel,
      difficult: selectedBox?.difficult ?? state.difficult,
    })
  }

  const moveBox = (boxId: string, vertical: number, horizontal: number) => {
    setDirty(true)
    setBBoxes((prev) =>
      prev.map((a) => {
        if (a.id === boxId) {
          return {
            ...a,
            x: Math.min(1.0 - a.w, Math.max(0.0, a.x + horizontal / state.width)),
            y: Math.min(1.0 - a.h, Math.max(0.0, a.y + vertical / state.height)),
          }
        }
        return a
      })
    )
  }

  const resizeBox = (boxId: string, vertical: number, horizontal: number) => {
    setDirty(true)
    setBBoxes((prev) =>
      prev.map((a) => {
        if (a.id === boxId) {
          return {
            ...a,
            w: Math.min(1.0 - a.x, a.w + horizontal / state.width),
            h: Math.min(1.0 - a.y, a.h + vertical / state.height),
          }
        }
        return a
      })
    )
  }

  const toggleDifficult = (boxId: string) => {
    setDirty(true)
    setBBoxes((prev) =>
      prev.map((a) => {
        if (a.id === boxId) {
          return {
            ...a,
            difficult: !a.difficult,
          }
        }
        return a
      })
    )
  }

  const cycleLabel = (boxId: string, reverse = false) => {
    const currentLabelIndex = props.labels.findIndex((label) => state.selectedLabel === label)
    const lastIndex = props.labels.length - 1

    let newIndex = 0
    if (reverse) {
      newIndex = currentLabelIndex === 0 ? lastIndex : currentLabelIndex - 1
    } else {
      newIndex = currentLabelIndex === lastIndex ? 0 : currentLabelIndex + 1
    }
    const newLabel = props.labels[newIndex]
    setDirty(true)
    setBBoxes((prev) =>
      prev.map((a) => {
        if (a.id === boxId) {
          return {
            ...a,
            label: newLabel,
          }
        }
        return a
      })
    )
    setState({ ...state, selectedLabel: newLabel })
  }

  const deleteBox = (boxId: string) => {
    setDirty(true)
    setBBoxes((prev) => prev.filter((a) => a.id !== boxId))
  }

  const deleteFP = (boxId: string) => {
    setDirty(true)
    setFPBoxes((prev) => prev.filter((a) => a.id !== boxId))
  }

  const getFPLabel = (boxId: string) => {
    return fpboxes.find((box) => box.id === boxId)?.label
  }

  const getBox = (boxId: string) => {
    return bboxes.find((box) => box.id === boxId)
  }

  const nextBox = (boxId?: string) => {
    if (!boxId) {
      return bboxes[0].id
    }
    const currentIndex = bboxes.findIndex((box) => box.id === boxId)
    if (currentIndex === bboxes.length - 1) {
      return bboxes[0].id
    } else {
      return bboxes[currentIndex + 1].id
    }
  }

  const stepSize = 5 / (transformRef.current?.instance.transformState.scale ?? 1)
  const onKeyDown: KeyboardEventHandler<HTMLDivElement> = (e) => {
    if (e.code === 'Escape') {
      if (state.segmentMode) {
        toggleSegmentMode()
      } else if (state.createMode) {
        setState({ ...state, createMode: false })
      } else {
        setState({ ...state, selectedBox: undefined })
      }
    }
    if (e.code === 'KeyW') {
      if (!state.createMode) {
        if (state.segmentMode) {
          segmentGenRef.current += 1
          pendingPointRef.current = null
          clearMaskOverlay()
        }
        setState({ ...state, createMode: true, segmentMode: false, selectedBox: undefined })
      } else {
        setState({ ...state, createMode: false })
      }
    }
    if (e.code === 'KeyM') {
      toggleSegmentMode()
    }
    if (e.code === 'KeyF') {
      setState({ ...state, showBoxes: !state.showBoxes })
    }
    if (e.code === 'KeyD') {
      if (state.selectedBox) {
        toggleDifficult(state.selectedBox)
      }
    }
    if (e.code === 'KeyS') {
      if (state.selectedBox) {
        cycleLabel(state.selectedBox, e.shiftKey)
      }
    }
    if (e.code === 'Delete' && state.selectedBox) {
      deleteBox(state.selectedBox)
      setState({ ...state, selectedBox: undefined })
    }
    if (e.code === 'Tab') {
      const next = nextBox(state.selectedBox)
      const box = getBox(next)
      setState({
        ...state,
        selectedBox: next,
        selectedLabel: box?.label ?? state.selectedLabel,
      })
      e.preventDefault()
    }
    if (e.code === 'Space') {
      save(true)
    }
    if (e.code === 'Slash' && e.shiftKey) {
      setState({ ...state, showHelp: true })
    }
    if (state.selectedBox) {
      if (e.code === 'ArrowLeft') {
        if (e.shiftKey) {
          resizeBox(state.selectedBox, 0, -stepSize)
        } else {
          moveBox(state.selectedBox, 0, -stepSize)
        }
      }
      if (e.code === 'ArrowRight') {
        if (e.shiftKey) {
          resizeBox(state.selectedBox, 0, stepSize)
        } else {
          moveBox(state.selectedBox, 0, stepSize)
        }
      }
      if (e.code === 'ArrowUp') {
        if (e.shiftKey) {
          resizeBox(state.selectedBox, -stepSize, 0)
        } else {
          moveBox(state.selectedBox, -stepSize, 0)
        }
      }
      if (e.code === 'ArrowDown') {
        if (e.shiftKey) {
          resizeBox(state.selectedBox, stepSize, 0)
        } else {
          moveBox(state.selectedBox, stepSize, 0)
        }
      }
    } else if (!state.createMode && !state.drawingMode) {
      if (e.code === 'ArrowLeft' && hasPrevious) {
        guardedNavigate(props.previousImage)
      }
      if (e.code === 'ArrowRight' && hasNext) {
        guardedNavigate(props.nextImage)
      }
    }
  }

  const onLoad = (_e: React.SyntheticEvent<HTMLImageElement>): Pad => {
    const pad = resize()

    setDirty(false)
    setBBoxes(props.annotations.concat(props.suggestions).sort((a, b) => b.w * b.h - a.w * a.h))
    setFPBoxes(props.falsePositives.sort((a, b) => b.w * b.h - a.w * a.h))

    return pad
  }

  const onSaveLabel: MouseEventHandler<HTMLButtonElement> = () => {
    setDirty(true)
    setState({ ...state, showLabeler: false })
    setBBoxes((prev) =>
      prev.map((a) => {
        if (a.id === state.selectedBox) {
          return {
            ...a,
            label: state.selectedLabel,
            difficult: state.difficult,
          }
        }
        return a
      })
    )
  }

  const onCancelLabel = () => {
    setState({ ...state, showLabeler: false })
    setBBoxes((prev) => prev.filter((a) => a.label))
  }

  const save = (verified: boolean) => {
    setDirty(false)
    props.save(
      bboxes,
      props.suggestions.map((s) => s.id),
      fpboxes.length === 0,
      verified ? props.labels : []
    )
  }

  const clearMaskOverlay = () => {
    const canvas = maskCanvasRef.current
    canvas?.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height)
    lastDecodeRef.current = null
  }

  const drawMaskOverlay = (result: DecodedMask) => {
    const canvas = maskCanvasRef.current
    if (!canvas) {
      return
    }
    if (canvas.width !== result.width || canvas.height !== result.height) {
      canvas.width = result.width
      canvas.height = result.height
    }
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      return
    }
    const imageData = ctx.createImageData(result.width, result.height)
    const pixels = imageData.data
    for (let i = 0; i < result.mask.length; i += 1) {
      if (result.mask[i]) {
        const offset = i * 4
        // primary-400 tint
        pixels[offset] = 99
        pixels[offset + 1] = 179
        pixels[offset + 2] = 237
        pixels[offset + 3] = 115
      }
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.putImageData(imageData, 0, 0)
  }

  const initSegmentation = async () => {
    if (!props.segmentation || !ref.current) {
      return
    }
    const generation = segmentGenRef.current
    const fail = (e: unknown) => {
      // eslint-disable-next-line no-console
      console.warn('[image-annotator] segmentation unavailable:', e)
      if (segmentGenRef.current === generation) {
        setState((prev) => ({ ...prev, segmentStatus: 'error' }))
      }
    }

    try {
      setState((prev) => ({ ...prev, segmentStatus: 'loading-model' }))
      const sam = await import('../lib/sam')
      if (!sam.isSupported()) {
        if (segmentGenRef.current === generation) {
          setState((prev) => ({ ...prev, segmentStatus: 'unsupported' }))
        }
        return
      }
      const session = await sam.getSession(props.segmentation.modelPath)
      if (segmentGenRef.current !== generation) {
        return
      }
      samSessionRef.current = session

      setState((prev) => ({ ...prev, segmentStatus: 'encoding' }))
      await session.encodeImage(ref.current!, props.imageUrl)
      if (segmentGenRef.current === generation) {
        setState((prev) => ({ ...prev, segmentStatus: 'ready' }))
      }
    } catch (e) {
      fail(e)
    }
  }

  const toggleSegmentMode = () => {
    if (!props.segmentation) {
      return
    }
    if (state.segmentMode) {
      segmentGenRef.current += 1
      pendingPointRef.current = null
      clearMaskOverlay()
      setState({ ...state, segmentMode: false })
      return
    }
    setState({
      ...state,
      segmentMode: true,
      createMode: false,
      drawingMode: false,
      selectedBox: undefined,
    })
    if (state.segmentStatus === 'idle' || state.segmentStatus === 'error') {
      void initSegmentation()
    }
  }

  // one decode in flight; the latest hover point wins
  const pumpDecodes = async () => {
    const session = samSessionRef.current
    if (decodeBusyRef.current || !session) {
      return
    }
    decodeBusyRef.current = true
    const generation = segmentGenRef.current
    try {
      while (pendingPointRef.current) {
        const point = pendingPointRef.current
        pendingPointRef.current = null
        const started = performance.now()
        // eslint-disable-next-line no-await-in-loop
        const result = await session.decodePoint(point.nx, point.ny)
        if (segmentGenRef.current !== generation) {
          return
        }
        lastDecodeRef.current = { ...point, result }
        drawMaskOverlay(result)

        // adaptive degrade: stop hover previews when decodes are slow
        const times = decodeTimesRef.current
        if (times.length < 3) {
          times.push(performance.now() - started)
          if (times.length === 3 && [...times].sort((a, b) => a - b)[1]! > 400) {
            hoverDisabledRef.current = true
          }
        }
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('[image-annotator] mask decode failed:', e)
    } finally {
      decodeBusyRef.current = false
    }
  }

  const segmentPointFromEvent = (e: { clientX: number; clientY: number }) => {
    const scale = transformRef.current?.instance.transformState.scale ?? 1
    const bounds = ref.current?.getBoundingClientRect()
    const nx = (e.clientX - (bounds?.left ?? 0)) / scale / state.width
    const ny = (e.clientY - (bounds?.top ?? 0)) / scale / state.height
    if (nx < 0 || nx > 1 || ny < 0 || ny > 1) {
      return null
    }
    return { nx, ny }
  }

  const acceptSegmentClick = async (point: { nx: number; ny: number }) => {
    const session = samSessionRef.current
    if (!session) {
      return
    }
    const generation = segmentGenRef.current

    let decoded = lastDecodeRef.current
    const closeEnough =
      decoded &&
      Math.abs(decoded.nx - point.nx) * state.width < 2 &&
      Math.abs(decoded.ny - point.ny) * state.height < 2
    if (!decoded || !closeEnough) {
      try {
        const result = await session.decodePoint(point.nx, point.ny)
        decoded = { ...point, result }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('[image-annotator] mask decode failed:', e)
        return
      }
    }
    if (segmentGenRef.current !== generation) {
      return
    }

    const box = maskToBoundingBox(decoded.result.mask, decoded.result.width, decoded.result.height)
    if (!box) {
      return
    }

    const newId = Date.now().toString()
    setDirty(true)
    setBBoxes((prev) => [
      ...prev,
      {
        id: newId,
        label: state.selectedLabel,
        difficult: false,
        ...box,
      },
    ])
    setState((prev) => ({ ...prev, selectedBox: newId }))
    clearMaskOverlay()
  }

  // navigation away from the image passes through here so unsaved
  // edits get a discard confirmation first
  const guardedNavigate = (nav?: () => void) => {
    if (!nav) {
      return
    }
    if (dirty) {
      pendingNavRef.current = nav
      setState({ ...state, showConfirmDiscard: true })
    } else {
      nav()
    }
  }

  const hasPrevious = (props.previousImages?.length ?? 0) > 0
  const hasNext = (props.nextImages?.length ?? 0) > 0
  const showPanel =
    props.navigateToImage !== undefined &&
    (props.previousImages !== undefined || props.nextImages !== undefined)

  const defaultZIndex = state.showBoxes ? 0 : -1

  return (
    <>
      <TransformWrapper
        ref={transformRef}
        disabled={state.createMode || state.drawingMode || state.segmentMode}
        minScale={0.9}
      >
        {({ zoomIn, zoomOut, setTransform }) => (
          <div
            ref={rootRef}
            className='flex h-screen min-w-[600px] flex-col bg-slate-900'
            onKeyDown={onKeyDown}
            tabIndex={0}
          >
            <div className='flex flex-initial bg-slate-300 p-1'>
              <div className='flex-initial'>
                <button
                  type='button'
                  onClick={() => guardedNavigate(props.back)}
                >
                  <Button
                    secondary
                    sm
                  >
                    Back
                  </Button>
                </button>
                {props.previousImage !== undefined && (
                  <>
                    <button
                      type='button'
                      disabled={!hasPrevious}
                      onClick={() => guardedNavigate(props.previousImage)}
                    >
                      <Button
                        secondary
                        sm
                        disabled={!hasPrevious}
                      >
                        ‹ Prev
                      </Button>
                    </button>
                    <button
                      type='button'
                      disabled={!hasNext}
                      onClick={() => guardedNavigate(props.nextImage)}
                    >
                      <Button
                        secondary
                        sm
                        disabled={!hasNext}
                      >
                        Next ›
                      </Button>
                    </button>
                  </>
                )}
              </div>
              <div className='flex flex-auto justify-center'>
                <button
                  type='button'
                  onClick={() => {
                    zoomOut()
                  }}
                >
                  <Button>
                    <svg
                      xmlns='http://www.w3.org/2000/svg'
                      className='h-6 w-6'
                      fill='none'
                      viewBox='0 0 24 24'
                      stroke='currentColor'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth='2'
                        d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7'
                      />
                    </svg>
                  </Button>
                </button>
                <button
                  type='button'
                  onClick={() => {
                    zoomIn()
                  }}
                >
                  <Button>
                    <svg
                      xmlns='http://www.w3.org/2000/svg'
                      className='h-6 w-6'
                      fill='none'
                      viewBox='0 0 24 24'
                      stroke='currentColor'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth='2'
                        d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7'
                      />
                    </svg>
                  </Button>
                </button>
                <button
                  type='button'
                  onClick={clickCreate}
                >
                  <Button
                    secondary
                    sm
                  >
                    Add (w)
                  </Button>
                </button>
                {props.segmentation && (
                  <button
                    type='button'
                    disabled={state.segmentStatus === 'unsupported'}
                    title={
                      state.segmentStatus === 'error' || state.segmentStatus === 'unsupported'
                        ? 'Segmentation unavailable'
                        : 'Click an object to box it automatically'
                    }
                    onClick={toggleSegmentMode}
                  >
                    <span className={state.segmentMode ? 'rounded-md ring-2 ring-primary-500' : ''}>
                      <Button
                        secondary
                        sm
                        disabled={state.segmentStatus === 'unsupported'}
                      >
                        {state.segmentMode &&
                        (state.segmentStatus === 'loading-model' ||
                          state.segmentStatus === 'encoding') ? (
                          <svg
                            xmlns='http://www.w3.org/2000/svg'
                            className='mr-1 h-4 w-4 animate-spin'
                            fill='none'
                            viewBox='0 0 24 24'
                          >
                            <circle
                              className='opacity-25'
                              cx='12'
                              cy='12'
                              r='10'
                              stroke='currentColor'
                              strokeWidth='4'
                            />
                            <path
                              className='opacity-75'
                              fill='currentColor'
                              d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z'
                            />
                          </svg>
                        ) : (
                          <svg
                            xmlns='http://www.w3.org/2000/svg'
                            className='mr-1 h-4 w-4'
                            fill='none'
                            viewBox='0 0 24 24'
                            stroke='currentColor'
                          >
                            <path
                              strokeLinecap='round'
                              strokeLinejoin='round'
                              strokeWidth='2'
                              d='M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z'
                            />
                          </svg>
                        )}
                        Magic (m)
                      </Button>
                    </span>
                  </button>
                )}
              </div>
              <div className='flex-initial'>
                <button
                  onClick={() => {
                    setState({ ...state, showVerify: true })
                  }}
                >
                  <Button sm>Verify &amp; Save</Button>
                </button>
                <button
                  onClick={() => {
                    save(false)
                  }}
                >
                  <Button
                    green
                    sm
                  >
                    Save
                  </Button>
                </button>
                <button
                  onClick={() => {
                    setState({ ...state, showDelete: true })
                  }}
                >
                  <Button
                    red
                    sm
                  >
                    Delete
                  </Button>
                </button>
                <button
                  onClick={() => {
                    setState({ ...state, showHelp: true })
                  }}
                >
                  <Button
                    sm
                    secondary
                  >
                    ?
                  </Button>
                </button>
              </div>
            </div>
            <div className='relative flex min-h-0 flex-auto'>
              {state.segmentMode && state.segmentStatus !== 'ready' && (
                <div className='absolute left-1/2 top-2 z-20 -translate-x-1/2 rounded bg-slate-800/80 px-2 py-1 text-xs text-slate-200'>
                  {state.segmentStatus === 'loading-model' && 'Loading model…'}
                  {state.segmentStatus === 'encoding' && 'Analyzing image…'}
                  {(state.segmentStatus === 'error' || state.segmentStatus === 'unsupported') &&
                    'Segmentation unavailable'}
                  {state.segmentStatus === 'idle' && 'Preparing…'}
                </div>
              )}
              <div
                ref={editorRef}
                className='grid flex-auto place-content-center'
              >
                <TransformComponent>
                  <div
                    className='grid place-content-center'
                    onMouseDown={onMouseDown}
                    onMouseUp={onMouseUp}
                    onMouseMove={onMouseMove}
                    onMouseLeave={() => {
                      if (state.segmentMode) {
                        pendingPointRef.current = null
                        clearMaskOverlay()
                      }
                    }}
                  >
                    <img
                      ref={ref}
                      className='col-start-1 row-start-1 h-full w-full'
                      alt='annotate'
                      src={props.imageUrl}
                      crossOrigin={props.crossOrigin}
                      onLoad={(e) => {
                        const pad = onLoad(e)
                        setTransform(pad.leftPad, pad.topPad, 0.9, 0)
                      }}
                      style={{
                        width: state.width,
                        height: state.height,
                      }}
                    />
                    <canvas
                      ref={maskCanvasRef}
                      className={`pointer-events-none col-start-1 row-start-1 ${
                        state.segmentMode ? 'z-10' : '-z-10'
                      }`}
                      style={{
                        width: state.width,
                        height: state.height,
                      }}
                    />
                    {fpboxes.map((box) => (
                      <BoundingBox
                        type={BoundingBoxType.falsePositive}
                        label={box.label ?? ''}
                        key={box.id}
                        zIndex={box.id === state.selectedBox ? 1 : defaultZIndex}
                        x={box.x * state.width}
                        y={box.y * state.height}
                        w={box.w * state.width}
                        h={box.h * state.height}
                        initialScale={transformRef.current?.instance.transformState.scale}
                        selected={box.id === state.selectedBox}
                        onMouseDown={(e: { stopPropagation: () => void }) => {
                          if (!state.createMode && !state.segmentMode) {
                            onClickBBox(box.id)
                            e.stopPropagation()
                          }
                        }}
                        onClickDelete={() => {
                          setState({
                            ...state,
                            showConfirmDeleteFalsePositive: true,
                          })
                        }}
                      />
                    ))}
                    {bboxes.map((box) => (
                      <BoundingBox
                        type={
                          box.suggestion ? BoundingBoxType.suggestion : BoundingBoxType.truePositive
                        }
                        label={box.label ?? ''}
                        difficult={box.difficult}
                        key={box.id}
                        zIndex={box.id === state.selectedBox ? 1 : defaultZIndex}
                        x={box.x * state.width}
                        y={box.y * state.height}
                        w={box.w * state.width}
                        h={box.h * state.height}
                        initialScale={transformRef.current?.instance.transformState.scale}
                        selected={box.id === state.selectedBox}
                        onMouseDown={(e: { stopPropagation: () => void }) => {
                          if (!state.createMode && !state.segmentMode) {
                            onClickBBox(box.id)
                            e.stopPropagation()
                          }
                        }}
                        onDragStop={(_e, d) => {
                          onDragStop(d, box.id)
                        }}
                        onResizeStop={(_e, _d, r: HTMLElement, _delta, p) => {
                          onResizeStop(r, p, box.id)
                        }}
                        onClickDelete={() => {
                          deleteBox(box.id)
                        }}
                        onClickEdit={() => {
                          setState({ ...state, showLabeler: true })
                        }}
                      />
                    ))}
                    <Crosshairs
                      className={`col-start-1 row-start-1 ${state.createMode && !state.drawingMode ? 'z-10' : '-z-10'}`}
                      show={state.createMode && !state.drawingMode}
                    />
                  </div>
                </TransformComponent>
              </div>
              {showPanel && (
                <ThumbnailPanel
                  previousImages={props.previousImages ?? []}
                  nextImages={props.nextImages ?? []}
                  currentThumbnailUrl={props.currentThumbnailUrl}
                  collapsed={!state.showThumbnails}
                  onToggleCollapsed={() => {
                    setState({ ...state, showThumbnails: !state.showThumbnails })
                    // canvas fit depends on the editor width
                    handleResize()
                  }}
                  onNavigate={(id) => guardedNavigate(() => props.navigateToImage?.(id))}
                />
              )}
            </div>
          </div>
        )}
      </TransformWrapper>
      <LabelDialog
        title='Annotate'
        show={state.showLabeler}
        cancelText='Cancel'
        button={
          <button
            type='button'
            onClick={onSaveLabel}
          >
            <Button
              sm
              green
            >
              Save
            </Button>
          </button>
        }
        handleCancel={onCancelLabel}
      >
        <div className='my-2 grid grid-cols-1 gap-y-2'>
          <div>
            <select
              className='w-full rounded-md border-gray-300 shadow-sm focus:border-primary-300 focus:ring focus:ring-primary-200 focus:ring-opacity-50'
              value={state.selectedLabel}
              onChange={(e) => {
                setState({ ...state, selectedLabel: e.target.value })
              }}
            >
              {props.labels.map((o) => (
                <option
                  key={o}
                  value={o}
                >
                  {o}
                </option>
              ))}
            </select>

            {props.manageLabelUrl && (
              <a
                className='text-sm text-primary-500 underline hover:text-primary-600'
                href={props.manageLabelUrl}
                target='_blank'
              >
                Manage Label Options
              </a>
            )}
          </div>
          <div className='flex items-center'>
            <input
              id='difficult'
              className='rounded border-gray-300 text-primary-600 shadow-sm hover:border-gray-300 focus:border-primary-300 focus:ring focus:ring-primary-200 focus:ring-opacity-50 focus:ring-offset-0'
              type='checkbox'
              checked={state.difficult}
              onChange={(e) => {
                setState({ ...state, difficult: e.target.checked })
              }}
            />
            <label
              htmlFor='difficult'
              className='ml-2'
            >
              Difficult?
            </label>
          </div>
        </div>
      </LabelDialog>
      <InfoDialog
        title='Keyboard shortcuts'
        show={state.showHelp}
        handleClose={() => {
          setState({ ...state, showHelp: false })
        }}
      >
        <div className='grid w-full grid-cols-2 place-content-center gap-2 p-5'>
          {shortcuts.map((s) => (
            <Fragment key={s.action}>
              <div>{s.action}</div>
              <div className='justify-self-end'>
                {s.codes
                  .map<React.ReactNode>((c) => (
                    <span
                      key={c}
                      className='rounded-md bg-slate-100 p-1 font-mono text-xs shadow-inner'
                    >
                      {c}
                    </span>
                  ))
                  .reduce((prev, curr) => [prev, ' + ', curr])}
              </div>
            </Fragment>
          ))}
        </div>
      </InfoDialog>
      <VerifyDialog
        title='Are all of the objects in this image labeled?'
        description=' '
        maxWidthClass='max-w-lg'
        handleCancel={() => {
          setState({ ...state, showVerify: false })
        }}
        show={state.showVerify}
        cancelText='Cancel'
        button={
          <button
            type='button'
            onClick={() => {
              save(true)
              setState({ ...state, showVerify: false })
            }}
          >
            <Button
              sm
              green
            >
              Yes, all objects are labeled
            </Button>
          </button>
        }
      >
        <div className='flex flex-wrap'>
          {props.labels.map((o) => (
            <div
              className='m-1 rounded-md bg-slate-200 p-1 font-mono'
              key={o}
            >
              {o}
            </div>
          ))}
        </div>
      </VerifyDialog>
      <VerifyDialog
        title='Are you sure you want to delete this image?'
        description=''
        handleCancel={() => {
          setState({ ...state, showDelete: false })
        }}
        show={state.showDelete}
        cancelText='Cancel'
        button={
          <button
            type='button'
            onClick={() => {
              props.delete()
              setState({ ...state, showDelete: false })
            }}
          >
            <Button
              sm
              red
            >
              Yes, permanently delete
            </Button>
          </button>
        }
      >
        This cannot be undone.
      </VerifyDialog>
      <VerifyDialog
        title='Are you sure you want to delete this reported false positive?'
        description=' '
        maxWidthClass='max-w-xl'
        handleCancel={() => {
          setState({ ...state, showConfirmDeleteFalsePositive: false })
        }}
        show={state.showConfirmDeleteFalsePositive}
        cancelText='Cancel'
        button={
          <button
            type='button'
            onClick={() => {
              if (state.selectedBox) {
                deleteFP(state.selectedBox)
              }
              setState({
                ...state,
                showConfirmDeleteFalsePositive: false,
                selectedBox: undefined,
              })
            }}
          >
            <Button
              sm
              red
            >
              Do not teach my model that this is not a{' '}
              {state.selectedBox ? getFPLabel(state.selectedBox) : ' '}
            </Button>
          </button>
        }
      >
        <p>
          False positives submitted from Frigate are used to improve your model and should not be
          deleted unless you submitted them accidentally.
        </p>
      </VerifyDialog>
      <VerifyDialog
        title='Discard unsaved changes?'
        description=''
        handleCancel={() => {
          pendingNavRef.current = null
          setState({ ...state, showConfirmDiscard: false })
        }}
        show={state.showConfirmDiscard}
        cancelText='Cancel'
        button={
          <button
            type='button'
            onClick={() => {
              const nav = pendingNavRef.current
              pendingNavRef.current = null
              setState({ ...state, showConfirmDiscard: false })
              nav?.()
            }}
          >
            <Button
              sm
              red
            >
              Discard changes
            </Button>
          </button>
        }
      >
        Your box edits on this image have not been saved.
      </VerifyDialog>
    </>
  )
}

export { ImageAnnotator }
