import {
  useState,
  useRef,
  useCallback,
  useEffect,
  MouseEventHandler,
  KeyboardEventHandler,
  ReactEventHandler,
  Fragment,
} from "react";

// import {
//   TransformWrapper,
//   TransformComponent,
//   KeepScale,
//   useTransformEffect,
//   useTransformContext,
// } from "react-zoom-pan-pinch";

import classNames from "classnames";
// import Link from "next/link";
import { Position, DraggableData, Rnd } from "react-rnd";
import { ulid } from "ulid";
import { useDebouncedCallback } from "use-debounce";

import Button from "./Button";
import { InfoDialog } from "./InfoDialog";
import { LabelDialog } from "./LabelDialog";
// import { TutorialDialog } from "../dialog/TutorialDialog";
import { VerifyDialog } from "./VerifyDialog";
import FormElement from "./FormElement";
import { FormElementBox } from "./FormElementBox";
// import { AppConfig } from "../utils/AppConfig";

interface EditorState {
  createMode: boolean;
  drawingMode: boolean;
  showBoxes: boolean;
  drawStartX: number;
  drawStartY: number;
  selectedBox?: string;
  showLabeler: boolean;
  selectedLabel: string;
  difficult: boolean;
  imgWidth: number;
  imgHeight: number;
  height: number;
  width: number;
  zoom: number;
  showHelp: boolean;
  showVerify: boolean;
  showDelete: boolean;
  showTutorial: boolean;
  showConfirmDeleteFalsePositive: boolean;
}

interface CrosshairsState {
  top: number;
  left: number;
}

export interface Annotation {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  label?: string;
  difficult?: boolean;
  suggestion?: boolean;
}

export interface FalsePositive {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  label?: string;
}

interface IImageAnnotationProps {
  annotations: Annotation[];
  suggestions: Annotation[];
  falsePositives: FalsePositive[];
  nextImage: () => void;
  save: (
    annotations: Annotation[],
    deleteFalsePositive: boolean,
    verified: boolean
  ) => void;
  excludeImage: () => void;
  imageUrl: string;
  labels: string[];
  userAnnotationCount: number;
}

/**
 * A image annotation component.
 * @component
 * @params props - Component props.
 * @param props.annotations - Bounding boxes
 * @param props.save - Callback for the save button.
 */
const ImageAnnotator = (props: IImageAnnotationProps) => {
  const shortcuts = [
    { codes: ["?"], action: "Shortcut help" },
    { codes: ["w"], action: "Add Box" },
    { codes: ["d"], action: "Mark Difficult" },
    { codes: ["s"], action: "Cycle Label" },
    { codes: ["Tab"], action: "Select Next Box" },
    { codes: ["Del"], action: "Delete Box" },
    { codes: ["Esc"], action: "Deselect/Cancel" },
    { codes: ["← ↑ → ↓"], action: "Move Box" },
    { codes: ["Shift", "← ↑ → ↓"], action: "Resize Box" },
    { codes: ["-"], action: "Zoom Out" },
    { codes: ["="], action: "Zoom In" },
    { codes: ["f"], action: "Toggle Unselected Boxes" },
    { codes: ["Spacebar"], action: "Verify and Save" },
  ];

  const [bboxes, setBBoxes] = useState<Annotation[]>([]);

  const [fpboxes, setFPBoxes] = useState<FalsePositive[]>([]);

  const [state, setState] = useState<EditorState>({
    createMode: false,
    drawingMode: false,
    showBoxes: true,
    showLabeler: false,
    showHelp: false,
    showVerify: false,
    showDelete: false,
    showConfirmDeleteFalsePositive: false,
    showTutorial: props.userAnnotationCount === 0,
    drawStartX: 0,
    drawStartY: 0,
    selectedLabel: "person",
    difficult: false,
    width: 1,
    height: 1,
    imgHeight: 1,
    imgWidth: 1,
    zoom: 2,
  });

  const [crosshairs, setCrosshairs] = useState<CrosshairsState>({
    top: 0,
    left: 0,
  });

  const ref = useRef<HTMLImageElement>(null);

  const editorRef = useRef<HTMLDivElement>(null);

  // const context = useTransformContext();

  const changeZoom = useCallback(
    (change: number) => {
      let adjustedZoom = state.zoom + change;
      const { imgHeight, imgWidth } = state;
      const desiredHeight = Math.round(imgHeight * adjustedZoom);
      const editorHeight =
        window.innerHeight -
        (editorRef.current?.getBoundingClientRect().top ?? 0);

      if (desiredHeight > editorHeight - 50) {
        adjustedZoom = (editorHeight - 50) / imgHeight;
      }

      const desiredWidth = Math.round(imgWidth * adjustedZoom);
      const editorWidth = editorRef.current?.getBoundingClientRect().width ?? 0;

      if (desiredWidth > editorWidth - 50) {
        adjustedZoom = (editorWidth - 50) / imgWidth;
      }

      setState({
        ...state,
        zoom: adjustedZoom,
        width: imgWidth * adjustedZoom,
        height: imgHeight * adjustedZoom,
      });
      setBBoxes((prev) => prev.map((a) => ({ ...a })));
    },
    [state]
  );

  const handleResize: (this: Window, ev: UIEvent) => void = useDebouncedCallback(() => {
    if (state.height > window.innerHeight || state.width > window.innerWidth) {
      changeZoom(0.0);
    }
  }, 200);

  useEffect(() => {
    window.addEventListener("resize", handleResize);
    editorRef.current?.parentElement?.focus();

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [handleResize]);

  const onResizeStop = (
    elem: HTMLElement,
    position: Position,
    boxId: string
  ) => {
    setBBoxes((prev) =>
      prev.map((a) => {
        if (a.id === boxId) {
          return {
            ...a,
            x: position.x / state.width,
            y: position.y / state.height,
            w: elem.offsetWidth / state.width,
            h: elem.offsetHeight / state.height,
          };
        }
        return a;
      })
    );
  };
  const onDragStop = (d: DraggableData, boxId: string) => {
    setBBoxes((prev) =>
      prev.map((a) => {
        if (a.id === boxId) {
          return {
            ...a,
            x: d.x / state.width,
            y: d.y / state.height,
          };
        }
        return a;
      })
    );
  };

  const onMouseDown: MouseEventHandler<HTMLImageElement> = (e) => {
    if (state.createMode) {
      const x =
        (e.pageX - (ref.current?.getBoundingClientRect().left ?? 0)) /
        state.width;
      const y =
        (e.pageY - (ref.current?.getBoundingClientRect().top ?? 0)) /
        state.height;
      setState({
        ...state,
        drawingMode: true,
        drawStartX: x,
        drawStartY: y,
        selectedBox: "draft",
      });
      setBBoxes((prev) => [
        ...prev,
        {
          id: "draft",
          x,
          y,
          w: 0.0,
          h: 0.0,
        },
      ]);
    } else {
      setState({ ...state, selectedBox: undefined });
    }
  };

  const onMouseUp: MouseEventHandler<HTMLImageElement> = (e) => {
    if (state.drawingMode) {
      const newId = ulid();
      setState({
        ...state,
        drawingMode: false,
        createMode: false,
        selectedBox: newId,
      });
      setBBoxes((prev) =>
        prev.reduce<Annotation[]>((out, a) => {
          if (a.id === "draft") {
            const x =
              (e.pageX - (ref.current?.getBoundingClientRect().left ?? 0)) /
              state.width;
            const y =
              (e.pageY - (ref.current?.getBoundingClientRect().top ?? 0)) /
              state.height;

            if (
              Math.min(
                Math.abs(state.drawStartX - x),
                Math.abs(state.drawStartY - y)
              ) > 0.001
            ) {
              let left = Math.min(state.drawStartX, x);
              let top = Math.min(state.drawStartY, y);
              let width = Math.abs(state.drawStartX - x);
              let height = Math.abs(state.drawStartY - y);
              if (left < 0) {
                width -= Math.abs(left);
                left = 0;
              }
              if (top < 0) {
                height -= Math.abs(top);
                top = 0;
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
              });
            }
          } else {
            out.push(a);
          }
          return out;
        }, [])
      );
    }
  };

  const onMouseMove: MouseEventHandler<HTMLImageElement> = (e) => {
    if (state.createMode) {
      const x = e.pageX - (ref.current?.getBoundingClientRect().left ?? 0);
      const y = e.pageY - (ref.current?.getBoundingClientRect().top ?? 0);
      setCrosshairs({
        left: x,
        top: y,
      });
    }
    if (state.drawingMode) {
      setBBoxes((prev) =>
        prev.map((a) => {
          if (a.id === "draft") {
            const x =
              (e.pageX - (ref.current?.getBoundingClientRect().left ?? 0)) /
              state.width;
            const y =
              (e.pageY - (ref.current?.getBoundingClientRect().top ?? 0)) /
              state.height;

            return {
              ...a,
              x: Math.min(state.drawStartX, x),
              y: Math.min(state.drawStartY, y),
              w: Math.abs(state.drawStartX - x),
              h: Math.abs(state.drawStartY - y),
            };
          }
          return a;
        })
      );
    }
  };

  const clickCreate: MouseEventHandler<HTMLButtonElement> = () => {
    setState({ ...state, createMode: !state.createMode });
  };

  const onClickBBox = (boxId: string) => {
    const selectedBox = bboxes.find((b) => b.id === boxId);
    setState({
      ...state,
      selectedBox: boxId,
      selectedLabel: selectedBox?.label ?? state.selectedLabel,
      difficult: selectedBox?.difficult ?? state.difficult,
    });
  };

  const moveBox = (boxId: string, vertical: number, horizontal: number) => {
    setBBoxes((prev) =>
      prev.map((a) => {
        if (a.id === boxId) {
          return {
            ...a,
            x: Math.min(
              1.0 - a.w,
              Math.max(0.0, a.x + horizontal / state.width)
            ),
            y: Math.min(
              1.0 - a.h,
              Math.max(0.0, a.y + vertical / state.height)
            ),
          };
        }
        return a;
      })
    );
  };

  const resizeBox = (boxId: string, vertical: number, horizontal: number) => {
    setBBoxes((prev) =>
      prev.map((a) => {
        if (a.id === boxId) {
          return {
            ...a,
            w: Math.min(1.0 - a.x, a.w + horizontal / state.width),
            h: Math.min(1.0 - a.y, a.h + vertical / state.height),
          };
        }
        return a;
      })
    );
  };

  const toggleDifficult = (boxId: string) => {
    setBBoxes((prev) =>
      prev.map((a) => {
        if (a.id === boxId) {
          return {
            ...a,
            difficult: !a.difficult,
          };
        }
        return a;
      })
    );
  };

  const cycleLabel = (boxId: string, reverse = false) => {
    const currentLabelIndex = props.labels.findIndex(
      (label) => state.selectedLabel === label
    );
    const lastIndex = props.labels.length - 1;

    let newIndex = 0;
    if (reverse) {
      newIndex = currentLabelIndex === 0 ? lastIndex : currentLabelIndex - 1;
    } else {
      newIndex = currentLabelIndex === lastIndex ? 0 : currentLabelIndex + 1;
    }
    const newLabel = props.labels[newIndex];
    setBBoxes((prev) =>
      prev.map((a) => {
        if (a.id === boxId) {
          return {
            ...a,
            label: newLabel,
          };
        }
        return a;
      })
    );
    setState({ ...state, selectedLabel: newLabel });
  };

  const deleteBox = (boxId: string) => {
    setBBoxes((prev) => prev.filter((a) => a.id !== boxId));
  };

  const deleteFP = (boxId: string) => {
    setFPBoxes((prev) => prev.filter((a) => a.id !== boxId));
  };

  const getFPLabel = (boxId: string) => {
    return fpboxes.find((box) => box.id === boxId)?.label;
  };

  const getBox = (boxId: string) => {
    return bboxes.find((box) => box.id === boxId);
  };

  const nextBox = (boxId?: string) => {
    if (!boxId) {
      return bboxes[0].id;
    }
    const currentIndex = bboxes.findIndex((box) => box.id === boxId);
    if (currentIndex === bboxes.length - 1) {
      return bboxes[0].id;
    } else {
      return bboxes[currentIndex + 1].id;
    }
  };

  const stepSize = 5;
  const onKeyDown: KeyboardEventHandler<HTMLDivElement> = (e) => {
    if (e.code === "Escape") {
      if (state.createMode) {
        setState({ ...state, createMode: false });
      } else {
        setState({ ...state, selectedBox: undefined });
      }
    }
    if (e.code === "KeyW") {
      if (!state.createMode) {
        setState({ ...state, createMode: true, selectedBox: undefined });
      } else {
        setState({ ...state, createMode: false });
      }
    }
    if (e.code === "KeyF") {
      setState({ ...state, showBoxes: !state.showBoxes });
    }
    if (e.code === "KeyD") {
      if (state.selectedBox) {
        toggleDifficult(state.selectedBox);
      }
    }
    if (e.code === "KeyS") {
      if (state.selectedBox) {
        cycleLabel(state.selectedBox, e.shiftKey);
      }
    }
    if (e.code === "Delete" && state.selectedBox) {
      deleteBox(state.selectedBox);
      setState({ ...state, selectedBox: undefined });
    }
    if (e.code === "Tab") {
      const next = nextBox(state.selectedBox);
      const box = getBox(next);
      setState({
        ...state,
        selectedBox: next,
        selectedLabel: box?.label ?? state.selectedLabel,
      });
      e.preventDefault();
    }
    if (e.code === "Space") {
      props.save(bboxes, fpboxes.length === 0, true);
    }
    if (e.code === "Minus") {
      changeZoom(-0.1);
    }
    if (e.code === "Equal") {
      changeZoom(0.1);
    }
    if (e.code === "Slash" && e.shiftKey) {
      setState({ ...state, showHelp: true });
    }
    if (state.selectedBox) {
      if (e.code === "ArrowLeft") {
        if (e.shiftKey) {
          resizeBox(state.selectedBox, 0, -stepSize);
        } else {
          moveBox(state.selectedBox, 0, -stepSize);
        }
      }
      if (e.code === "ArrowRight") {
        if (e.shiftKey) {
          resizeBox(state.selectedBox, 0, stepSize);
        } else {
          moveBox(state.selectedBox, 0, stepSize);
        }
      }
      if (e.code === "ArrowUp") {
        if (e.shiftKey) {
          resizeBox(state.selectedBox, -stepSize, 0);
        } else {
          moveBox(state.selectedBox, -stepSize, 0);
        }
      }
      if (e.code === "ArrowDown") {
        if (e.shiftKey) {
          resizeBox(state.selectedBox, stepSize, 0);
        } else {
          moveBox(state.selectedBox, stepSize, 0);
        }
      }
    }
  };

  const onLoad: ReactEventHandler<HTMLImageElement> = (e) => {
    let adjustedZoom = state.zoom;
    const { naturalHeight, naturalWidth } = e.currentTarget;
    const desiredHeight = Math.round(naturalHeight * adjustedZoom);
    const editorHeight = editorRef.current?.getBoundingClientRect().height ?? 0;

    if (desiredHeight > editorHeight - 50) {
      adjustedZoom = (editorHeight - 50) / naturalHeight;
    }

    const desiredWidth = Math.round(naturalWidth * adjustedZoom);
    const editorWidth = editorRef.current?.getBoundingClientRect().width ?? 0;

    if (desiredWidth > editorWidth - 50) {
      adjustedZoom = (editorWidth - 50) / naturalWidth;
    }

    setState({
      ...state,
      imgWidth: naturalWidth,
      imgHeight: naturalHeight,
      width: Math.round(naturalWidth * adjustedZoom),
      height: Math.round(naturalHeight * adjustedZoom),
      zoom: adjustedZoom,
    });

    setBBoxes(
      props.annotations
        .concat(props.suggestions)
        .sort((a, b) => b.w * b.h - a.w * a.h)
    );
    setFPBoxes(props.falsePositives.sort((a, b) => b.w * b.h - a.w * a.h));
  };

  const onSaveLabel: MouseEventHandler<HTMLButtonElement> = () => {
    setState({ ...state, showLabeler: false });
    setBBoxes((prev) =>
      prev.map((a) => {
        if (a.id === state.selectedBox) {
          return {
            ...a,
            label: state.selectedLabel,
            difficult: state.difficult,
          };
        }
        return a;
      })
    );
  };

  const onCancelLabel = () => {
    setState({ ...state, showLabeler: false });
    setBBoxes((prev) => prev.filter((a) => a.label));
  };

  const boxClass = (boxId: string, falsePositive: boolean) => {
    let colorClass = falsePositive ? "border-[#c95d55]" : "border-white";
    const box = getBox(boxId);
    if (box?.suggestion) {
      colorClass = "border-[#3dd8ff]";
    }
    if (boxId === state.selectedBox) {
      const selectedColor = box?.difficult
        ? "border-[#fae352]"
        : "border-[#84cc16]";
      colorClass = falsePositive ? "border-[#cc2216]" : selectedColor;
    } else {
      if (box?.difficult) {
        colorClass = "border-[#ad9e3d]";
      }
    }

    return classNames("flex", "border-2", "border-solid", colorClass);
  };

  const defaultZIndex = state.showBoxes ? 0 : -1;

  return (
    <>
        <div
          className="flex flex-col h-screen overflow-hidden bg-slate-900 min-w-[600px]"
          onKeyDown={onKeyDown}
          tabIndex={0}
        >
          <div className="flex-initial p-1 flex bg-slate-300">
            <div className="flex-initial">
              <button type="button" onClick={props.nextImage}>
                <Button secondary sm>
                  Skip
                </Button>
              </button>
            </div>
            <div className="flex-auto flex justify-center">
              <button type="button" onClick={() => { changeZoom(-0.1); }}>
                <Button>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7"
                    />
                  </svg>
                </Button>
              </button>
              <span className="flex items-center mx-2">
                {Math.round(state.zoom * 100)}%
              </span>
              <button type="button" onClick={() => { changeZoom(0.1); }}>
                <Button>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
                    />
                  </svg>
                </Button>
              </button>
              <button type="button" onClick={clickCreate}>
                <Button secondary sm>
                  Add (w)
                </Button>
              </button>
            </div>
            <div className="flex-initial">
              <button onClick={() => { setState({ ...state, showVerify: true }); }}>
                <Button sm>Verify &amp; Save</Button>
              </button>
              <button
                onClick={() => { props.save(bboxes, fpboxes.length === 0, false); }}
              >
                <Button green sm>
                  Save
                </Button>
              </button>
              <button onClick={() => { setState({ ...state, showDelete: true }); }}>
                <Button red sm>
                  Exclude
                </Button>
              </button>
              <button onClick={() => { setState({ ...state, showHelp: true }); }}>
                <Button sm secondary>
                  ?
                </Button>
              </button>
            </div>
          </div>
          <div ref={editorRef} className="flex-auto grid place-content-center">
            <div
              className={`relative ${
                state.createMode ? "cursor-crosshair" : ""
              }`}
              style={{
                width: state.width,
                height: state.height,
              }}
              onMouseDown={onMouseDown}
              onMouseUp={onMouseUp}
              onMouseMove={onMouseMove}
            >
              <img
                ref={ref}
                className="h-full w-full"
                alt="annotate"
                src={props.imageUrl}
                onLoad={onLoad}
              />
              {fpboxes.map((box) => (
                <Rnd
                  key={box.id}
                  className={boxClass(box.id, true)}
                  style={{
                    zIndex: box.id === state.selectedBox ? 1 : defaultZIndex,
                  }}
                  bounds="parent"
                  position={{
                    x: box.x * state.width,
                    y: box.y * state.height,
                  }}
                  size={{
                    width: box.w * state.width,
                    height: box.h * state.height,
                  }}
                  disableDragging={true}
                  enableResizing={false}
                  onMouseDown={(e: { stopPropagation: () => void }) => {
                    if (!state.createMode) {
                      onClickBBox(box.id);
                      e.stopPropagation();
                    }
                  }}
                >
                    <mark
                      className={`line-through decoration-2 absolute bottom-[-25px] right-[-2px] ${
                        box.id === state.selectedBox
                          ? "bg-[#cc2216]"
                          : "bg-[#c95d55]"
                      }`}
                    >
                      {box.label}
                    </mark>
                    <div
                      className="w-6 h-6 flex items-center justify-center rounded-full bg-red-400 flex-shrink-0 absolute top-[-13px] right-[-27px] z-20 cursor-pointer"
                      onClick={() =>
                        { setState({
                          ...state,
                          showConfirmDeleteFalsePositive: true,
                        }); }
                      }
                      style={{
                        visibility:
                          box.id === state.selectedBox ? "visible" : "hidden",
                      }}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-6 w-6"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M18 12H6"
                        />
                      </svg>
                    </div>
                </Rnd>
              ))}
              {bboxes.map((box) => (
                <Rnd
                  key={box.id}
                  className={boxClass(box.id, false)}
                  style={{
                    zIndex: box.id === state.selectedBox ? 1 : defaultZIndex,
                  }}
                  bounds="parent"
                  position={{
                    x: box.x * state.width,
                    y: box.y * state.height,
                  }}
                  size={{
                    width: box.w * state.width,
                    height: box.h * state.height,
                  }}
                  onDragStop={(_e, d) => { onDragStop(d, box.id); }}
                  onResizeStop={(
                    _e,
                    _d,
                    r: HTMLElement,
                    _delta,
                    p
                  ) => { onResizeStop(r, p, box.id); }}
                  disableDragging={state.createMode}
                  onMouseDown={(e: { stopPropagation: () => void }) => {
                    if (!state.createMode) {
                      onClickBBox(box.id);
                      e.stopPropagation();
                    }
                  }}
                >
                    <mark
                      className={`absolute bottom-[-25px] right-[-2px] ${
                        box.id === state.selectedBox
                          ? "bg-[#84cc16]"
                          : "bg-white"
                      }`}
                    >
                      {box.label}
                    </mark>
                    <div
                      className="w-6 h-6 flex items-center justify-center rounded-full bg-red-400 flex-shrink-0 absolute top-[-13px] right-[-27px] z-20 cursor-pointer"
                      onClick={() => { deleteBox(box.id); }}
                      style={{
                        visibility:
                          box.id === state.selectedBox ? "visible" : "hidden",
                      }}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-6 w-6"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M18 12H6"
                        />
                      </svg>
                    </div>
                    <div
                      className="w-6 h-6 flex items-center justify-center rounded-full bg-blue-400 flex-shrink-0 absolute top-[14px] right-[-27px] z-20 cursor-pointer"
                      onClick={() => { setState({ ...state, showLabeler: true }); }}
                      style={{
                        visibility:
                          box.id === state.selectedBox ? "visible" : "hidden",
                      }}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                        />
                      </svg>
                    </div>
                </Rnd>
              ))}
              <div
                className="absolute z-2 border-l-2 border-dashed border-black top-0"
                style={{
                  left: crosshairs.left,
                  height: state.height,
                  visibility:
                    state.createMode && !state.drawingMode
                      ? "visible"
                      : "hidden",
                }}
              ></div>
              <div
                className="absolute z-2 border-t-2 border-dashed border-black left-0"
                style={{
                  top: crosshairs.top,
                  width: state.width,
                  visibility:
                    state.createMode && !state.drawingMode
                      ? "visible"
                      : "hidden",
                }}
              ></div>
            </div>
          </div>
        </div>
        <LabelDialog
          title="Annotate"
          show={state.showLabeler}
          cancelText="Cancel"
          button={
            <button type="button" onClick={onSaveLabel}>
              <Button sm green>
                Save
              </Button>
            </button>
          }
          handleCancel={onCancelLabel}
        >
          <div className="my-2 grid grid-cols-1 gap-y-2">
            <FormElement>
              <select
                value={state.selectedLabel}
                onChange={(e) =>
                  { setState({ ...state, selectedLabel: e.target.value }); }
                }
              >
                {props.labels.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </FormElement>
            <FormElementBox htmlFor="difficult" text="Difficult?">
              <input
                id="difficult"
                type="checkbox"
                checked={state.difficult}
                onChange={(e) =>
                  { setState({ ...state, difficult: e.target.checked }); }
                }
              />
            </FormElementBox>
          </div>
        </LabelDialog>
        <InfoDialog
          title="Keyboard shortcuts"
          show={state.showHelp}
          handleClose={() => { setState({ ...state, showHelp: false }); }}
        >
          <div className="grid grid-cols-2 gap-2 place-content-center w-full p-5">
            {shortcuts.map((s) => (
              <Fragment key={s.action}>
                <div>{s.action}</div>
                <div className="justify-self-end">
                  {s.codes
                    .map<React.ReactNode>((c) => (
                      <span
                        key={c}
                        className="font-mono shadow-inner rounded-md p-1 bg-slate-100 text-xs"
                      >
                        {c}
                      </span>
                    ))
                    .reduce((prev, curr) => [prev, " + ", curr])}
                </div>
              </Fragment>
            ))}
          </div>
        </InfoDialog>
        <VerifyDialog
          title="Are all objects in this image labeled?"
          description=" "
          handleCancel={() => { setState({ ...state, showVerify: false }); }}
          show={state.showVerify}
          cancelText="Cancel"
          button={
            <button
              type="button"
              onClick={() => {
                props.save(bboxes, fpboxes.length === 0, true);
                setState({ ...state, showVerify: false });
              }}
            >
              <Button sm green>
                Yes, all objects are labeled
              </Button>
            </button>
          }
        >
          <ul className="list-disc list-inside">
            {props.labels.map((o) => (
              <li key={o}>{o}</li>
            ))}
          </ul>
        </VerifyDialog>
        <VerifyDialog
          title="Are you sure you want to exclude this image?"
          description=""
          handleCancel={() => { setState({ ...state, showDelete: false }); }}
          show={state.showDelete}
          cancelText="Cancel"
          button={
            <button
              type="button"
              onClick={() => {
                props.excludeImage();
                setState({ ...state, showDelete: false });
              }}
            >
              <Button sm red>
                Yes, exclude
              </Button>
            </button>
          }
        >
          Image will be excluded from training
        </VerifyDialog>
        <VerifyDialog
          title="Are you sure you want to delete this reported false positive?"
          description=" "
          maxWidthClass="max-w-xl"
          handleCancel={() =>
            { setState({ ...state, showConfirmDeleteFalsePositive: false }); }
          }
          show={state.showConfirmDeleteFalsePositive}
          cancelText="Cancel"
          button={
            <button
              type="button"
              onClick={() => {
                if (state.selectedBox) {
                  deleteFP(state.selectedBox);
                }
                setState({
                  ...state,
                  showConfirmDeleteFalsePositive: false,
                  selectedBox: undefined,
                });
              }}
            >
              <Button sm red>
                Do not teach my model that this is not a{" "}
                {state.selectedBox ? getFPLabel(state.selectedBox) : " "}
              </Button>
            </button>
          }
        >
          <p>
            False positives submitted from Frigate are used to improve your
            model and should not be deleted unless you submitted them
            accidentally.
          </p>
        </VerifyDialog>
        </>
  );
};

export default ImageAnnotator;