import {
  useState,
  useRef,
  MouseEventHandler,
  KeyboardEventHandler,
  ReactEventHandler,
  Fragment,
  useEffect,
} from "react";

import { Position, DraggableData } from "react-rnd";

import { Button } from "./Button";
import { Crosshairs } from "./Crosshairs";
import { InfoDialog } from "./InfoDialog";
import { LabelDialog } from "./LabelDialog";
import { VerifyDialog } from "./VerifyDialog";
import { BoundingBox, BoundingBoxType } from "./BoundingBox";
import { Annotation } from "../types/Annotation";
import { FalsePositive } from "../types/FalsePositive";
import { ReactZoomPanPinchRef, TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";
import { useDebouncedCallback } from "use-debounce";

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
  height: number;
  width: number;
  showHelp: boolean;
  showVerify: boolean;
  showDelete: boolean;
  showTutorial: boolean;
  showConfirmDeleteFalsePositive: boolean;
}

interface IImageAnnotationProps {
  annotations: Annotation[];
  suggestions: Annotation[];
  falsePositives: FalsePositive[];
  nextImage: () => void;
  save: (
    annotations: Annotation[],
    reviewedSuggestions: string[],
    deleteFalsePositive: boolean,
    verified: string[],
  ) => void;
  delete: () => void;
  back: () => void;
  imageUrl: string;
  labels: string[];
  manageLabelUrl?: string;
  verifiedLabels: string[];
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
    selectedLabel: props.labels.find((l) => !(props.verifiedLabels ?? []).includes(l)) ?? props.labels[0],
    difficult: false,
    width: 1,
    height: 1,
  });

  const ref = useRef<HTMLImageElement>(null);

  const editorRef = useRef<HTMLDivElement>(null);

  const transformRef = useRef<ReactZoomPanPinchRef>(null);

  const resize = () => {
    const naturalHeight = ref.current?.naturalHeight ?? 1;
    const naturalWidth = ref.current?.naturalWidth ?? 1;
    const aspectRatio = naturalWidth/naturalHeight;

    const editorHeight = editorRef.current?.clientHeight ?? 0;
    const editorWidth = editorRef.current?.clientWidth ?? 0;

    const maxHeight = editorHeight - 5;
    const maxWidth = editorWidth - 5;
    const desiredWidth = maxHeight * aspectRatio;
    
    // if too wide when max height, then use maxWidth
    if (desiredWidth > maxWidth) {
      setState({
        ...state,
        width: maxWidth,
        height: Math.round(maxWidth/aspectRatio),
      });
    } else {
      setState({
        ...state,
        width: desiredWidth,
        height: Math.round(desiredWidth/aspectRatio),
      })
    }
  }

  const handleResize = useDebouncedCallback(() => {
    resize()
  }, 200);

  useEffect(() => {
    window.addEventListener('resize', handleResize);
    editorRef.current?.parentElement?.focus();

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [handleResize]);
  
  const onResizeStop = (
    elem: HTMLElement,
    position: Position,
    boxId: string,
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
      }),
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
      }),
    );
  };

  const onMouseDown: MouseEventHandler<HTMLImageElement> = (e) => {
    if (state.createMode) {
      const scale = transformRef.current?.instance.transformState.scale ?? 1;
      const bounds = ref.current?.getBoundingClientRect();
      const x =
        (e.clientX - (bounds?.left ?? 0)) / scale /
        state.width;
      const y =
        (e.clientY - (bounds?.top ?? 0)) / scale /
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
      const newId = Date.now().toString();
      setState({
        ...state,
        drawingMode: false,
        createMode: false,
        selectedBox: newId,
      });
      setBBoxes((prev) =>
        prev.reduce<Annotation[]>((out, a) => {
          if (a.id === "draft") {
            const scale = transformRef.current?.instance.transformState.scale ?? 1;
            const bounds = ref.current?.getBoundingClientRect();
            const x =
              (e.clientX - (bounds?.left ?? 0)) / scale /
              state.width;
            const y =
              (e.clientY - (bounds?.top ?? 0)) / scale /
              state.height;

            if (
              Math.min(
                Math.abs(state.drawStartX - x),
                Math.abs(state.drawStartY - y),
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
        }, []),
      );
    }
  };

  const onMouseMove: MouseEventHandler<HTMLImageElement> = (e) => {
    if (state.drawingMode) {
      setBBoxes((prev) =>
        prev.map((a) => {
          if (a.id === "draft") {
            const scale = transformRef.current?.instance.transformState.scale ?? 1;
            const bounds = ref.current?.getBoundingClientRect();
            const x =
              (e.pageX - (bounds?.left ?? 0)) / scale /
              state.width;
            const y =
              (e.pageY - (bounds?.top ?? 0)) / scale /
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
        }),
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
              Math.max(0.0, a.x + horizontal / state.width),
            ),
            y: Math.min(
              1.0 - a.h,
              Math.max(0.0, a.y + vertical / state.height),
            ),
          };
        }
        return a;
      }),
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
      }),
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
      }),
    );
  };

  const cycleLabel = (boxId: string, reverse = false) => {
    const currentLabelIndex = props.labels.findIndex(
      (label) => state.selectedLabel === label,
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
      }),
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

  const stepSize = 5 / (transformRef.current?.instance.transformState.scale ?? 1);
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
      save(true);
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

  const onLoad: ReactEventHandler<HTMLImageElement> = (_e) => {
    resize();

    setBBoxes(
      props.annotations
        .concat(props.suggestions)
        .sort((a, b) => b.w * b.h - a.w * a.h),
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
      }),
    );
  };

  const onCancelLabel = () => {
    setState({ ...state, showLabeler: false });
    setBBoxes((prev) => prev.filter((a) => a.label));
  };
  
  const save = (verified: boolean) => {
    props.save(bboxes, props.suggestions.map((s) => s.id), fpboxes.length === 0, verified ? props.labels : []);
  }

  const defaultZIndex = state.showBoxes ? 0 : -1;

  return (
    <>
      <TransformWrapper ref={transformRef} disabled={state.createMode || state.drawingMode} minScale={0.9}>
        {({ zoomIn, zoomOut }) => (
          <div
            className="flex h-screen min-w-[600px] flex-col bg-slate-900"
            onKeyDown={onKeyDown}
            tabIndex={0}
          >
            <div className="flex flex-initial bg-slate-300 p-1">
              <div className="flex-initial">
                <button type="button" onClick={props.back}>
                  <Button secondary sm>
                    Back
                  </Button>
                </button>
              </div>
              <div className="flex flex-auto justify-center">
                <button
                  type="button"
                  onClick={() => {
                    zoomOut();
                  }}
                >
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
                <button
                  type="button"
                  onClick={() => {
                    zoomIn();
                  }}
                >
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
                <button
                  onClick={() => {
                    setState({ ...state, showVerify: true });
                  }}
                >
                  <Button sm>Verify &amp; Save</Button>
                </button>
                <button
                  onClick={() => {
                    save(false);
                  }}
                >
                  <Button green sm>
                    Save
                  </Button>
                </button>
                <button
                  onClick={() => {
                    setState({ ...state, showDelete: true });
                  }}
                >
                  <Button red sm>
                    Delete
                  </Button>
                </button>
                <button
                  onClick={() => {
                    setState({ ...state, showHelp: true });
                  }}
                >
                  <Button sm secondary>
                    ?
                  </Button>
                </button>
              </div>
            </div>
            <div
              ref={editorRef}
              className="grid flex-auto place-content-center"
            >
              <TransformComponent>
                <div
                  className="grid place-content-center"
                  onMouseDown={onMouseDown}
                  onMouseUp={onMouseUp}
                  onMouseMove={onMouseMove}
                  
                >
                  <img
                    ref={ref}
                    className="col-start-1 row-start-1 h-full w-full"
                    alt="annotate"
                    src={props.imageUrl}
                    onLoad={onLoad}
                    style={{
                      width: state.width,
                      height: state.height,
                    }}
                  />
                  {fpboxes.map((box) => (
                    <BoundingBox
                      type={BoundingBoxType.falsePositive}
                      label={box.label ?? ""}
                      key={box.id}
                      zIndex={box.id === state.selectedBox ? 1 : defaultZIndex}
                      x={box.x * state.width}
                      y={box.y * state.height}
                      w={box.w * state.width}
                      h={box.h * state.height}
                      initialScale={transformRef.current?.instance.transformState.scale}
                      selected={box.id === state.selectedBox}
                      onMouseDown={(e: { stopPropagation: () => void }) => {
                        if (!state.createMode) {
                          onClickBBox(box.id);
                          e.stopPropagation();
                        }
                      }}
                      onClickDelete={() => {
                        setState({
                          ...state,
                          showConfirmDeleteFalsePositive: true,
                        });
                      }}
                    />
                  ))}
                  {bboxes.map((box) => (
                    <BoundingBox
                      type={
                        box.suggestion
                          ? BoundingBoxType.suggestion
                          : BoundingBoxType.truePositive
                      }
                      label={box.label ?? ""}
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
                        if (!state.createMode) {
                          onClickBBox(box.id);
                          e.stopPropagation();
                        }
                      }}
                      onDragStop={(_e, d) => {
                        onDragStop(d, box.id);
                      }}
                      onResizeStop={(_e, _d, r: HTMLElement, _delta, p) => {
                        onResizeStop(r, p, box.id);
                      }}
                      onClickDelete={() => {
                        deleteBox(box.id);
                      }}
                      onClickEdit={() => {
                        setState({ ...state, showLabeler: true });
                      }}
                    />
                  ))}
                  <Crosshairs
                    className={`col-start-1 row-start-1 ${(state.createMode && !state.drawingMode) ? 'z-10' : '-z-10'}`}
                    show={state.createMode && !state.drawingMode}
                  />
                </div>
              </TransformComponent>
            </div>
          </div>
        )}
      </TransformWrapper>
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
          <div>
            <select
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-300 focus:ring focus:ring-primary-200 focus:ring-opacity-50"
              value={state.selectedLabel}
              onChange={(e) => {
                setState({ ...state, selectedLabel: e.target.value });
              }}
            >
              {props.labels.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>

            {props.manageLabelUrl && (
              <a className="text-primary-500 hover:text-primary-600 underline text-sm" href={props.manageLabelUrl} target="blank">Manage Label Options</a>
            )}
          </div>
          <div className="flex items-center">
            <input
              id="difficult"
              className="border-gray-300 text-primary-600 shadow-sm hover:border-gray-300 focus:border-primary-300 focus:ring focus:ring-primary-200 focus:ring-opacity-50 focus:ring-offset-0 rounded"
              type="checkbox"
              checked={state.difficult}
              onChange={(e) => {
                setState({ ...state, difficult: e.target.checked });
              }}
            />
            <label htmlFor="difficult" className="ml-2">
              Difficult?
            </label>
          </div>
        </div>
      </LabelDialog>
      <InfoDialog
        title="Keyboard shortcuts"
        show={state.showHelp}
        handleClose={() => {
          setState({ ...state, showHelp: false });
        }}
      >
        <div className="grid w-full grid-cols-2 place-content-center gap-2 p-5">
          {shortcuts.map((s) => (
            <Fragment key={s.action}>
              <div>{s.action}</div>
              <div className="justify-self-end">
                {s.codes
                  .map<React.ReactNode>((c) => (
                    <span
                      key={c}
                      className="rounded-md bg-slate-100 p-1 font-mono text-xs shadow-inner"
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
        title="Are all of the objects in this image labeled?"
        description=" "
        maxWidthClass="max-w-lg"
        handleCancel={() => {
          setState({ ...state, showVerify: false });
        }}
        show={state.showVerify}
        cancelText="Cancel"
        button={
          <button
            type="button"
            onClick={() => {
              save(true);
              setState({ ...state, showVerify: false });
            }}
          >
            <Button sm green>
              Yes, all objects are labeled
            </Button>
          </button>
        }
      >
        <div className="flex flex-wrap">
          {props.labels.map((o) => (
            <div className="font-mono m-1 bg-slate-200 p-1 rounded-md" key={o}>{o}</div>
          ))}
        </div>
      </VerifyDialog>
      <VerifyDialog
        title="Are you sure you want to delete this image?"
        description=""
        handleCancel={() => {
          setState({ ...state, showDelete: false });
        }}
        show={state.showDelete}
        cancelText="Cancel"
        button={
          <button
            type="button"
            onClick={() => {
              props.delete();
              setState({ ...state, showDelete: false });
            }}
          >
            <Button sm red>
              Yes, permanently delete
            </Button>
          </button>
        }
      >
        This cannot be undone.
      </VerifyDialog>
      <VerifyDialog
        title="Are you sure you want to delete this reported false positive?"
        description=" "
        maxWidthClass="max-w-xl"
        handleCancel={() => {
          setState({ ...state, showConfirmDeleteFalsePositive: false });
        }}
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
          False positives submitted from Frigate are used to improve your model
          and should not be deleted unless you submitted them accidentally.
        </p>
      </VerifyDialog>
    </>
  );
};

export { ImageAnnotator };
