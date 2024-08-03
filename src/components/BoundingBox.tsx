import { MouseEventHandler } from "react";
import { DraggableEventHandler } from "react-draggable";
import { Rnd, RndResizeCallback } from "react-rnd";

export enum BoundingBoxType {
  truePositive,
  falsePositive,
  suggestion,
}

interface IBoundingBoxProps {
  type: BoundingBoxType;
  selected: boolean;
  difficult?: boolean;
  className?: string;
  zIndex: number;
  x: number;
  y: number;
  w: number;
  h: number;
  onDragStop?: DraggableEventHandler;
  onResizeStop?: RndResizeCallback;
  onMouseDown: (e: MouseEvent) => void;
  onClickDelete: MouseEventHandler<HTMLDivElement>;
  onClickEdit?: MouseEventHandler<HTMLDivElement>;
  label: string;
}

const selectedColors = {
  [BoundingBoxType.truePositive]: '#84cc16',
  [BoundingBoxType.falsePositive]: '#cc2216',
  [BoundingBoxType.suggestion]: '#84cc16'
}

const unselectedColors = {
  [BoundingBoxType.truePositive]: '#ffffff',
  [BoundingBoxType.falsePositive]: '#c95d55',
  [BoundingBoxType.suggestion]: '#3dd8ff'
}

const BoundingBox = (props: IBoundingBoxProps) => {
  let color = props.selected ? selectedColors[props.type] : unselectedColors[props.type];
  const editable = props.type !== BoundingBoxType.falsePositive

  if (props.difficult) {
    color = props.selected ? "#fae352" : "#ad9e3d";
  }

  return (
    <Rnd
      className={`${props.className ?? ""} border-2 border-solid`}
      style={{
        zIndex: props.zIndex,
        borderColor: color
      }}
      bounds="parent"
      position={{
        x: props.x,
        y: props.y,
      }}
      size={{
        width: props.w,
        height: props.h,
      }}
      onDragStop={props.onDragStop}
      onResizeStop={props.onResizeStop}
      disableDragging={!editable}
      enableResizing={editable}
      onMouseDown={props.onMouseDown}
    >
      <mark
        className={`absolute bottom-[-25px] right-[-2px] ${props.type === BoundingBoxType.falsePositive ? 'line-through' : ''} decoration-2`}
        style={{
          backgroundColor: color,
        }}
      >
        {props.label}
      </mark>
      <div
        className="absolute right-[-27px] top-[-13px] z-20 flex h-6 w-6 flex-shrink-0 cursor-pointer items-center justify-center rounded-full bg-red-400"
        onClick={props.onClickDelete}
        style={{
          visibility: props.selected ? "visible" : "hidden",
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
      {editable && (
        <div
          className="absolute right-[-27px] top-[14px] z-20 flex h-6 w-6 flex-shrink-0 cursor-pointer items-center justify-center rounded-full bg-blue-400"
          onClick={props.onClickEdit}
          style={{
            visibility: props.selected ? "visible" : "hidden",
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
      )}
    </Rnd>
  );
};

export default BoundingBox;
