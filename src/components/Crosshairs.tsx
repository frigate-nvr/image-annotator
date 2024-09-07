import { MouseEventHandler, useRef, useState } from "react";
import { useTransformEffect } from "react-zoom-pan-pinch";

interface CrosshairsState {
  top: number;
  left: number;
}

interface ICrosshairsProps {
  className: string;
  show: boolean;
}

const Crosshairs = (props: ICrosshairsProps) => {
  const [scale, setScale] = useState<number>(1);

  useTransformEffect(({ state }) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    setScale(state.scale);
  });
  
  const ref = useRef<HTMLDivElement>(null);

  const [crosshairs, setCrosshairs] = useState<CrosshairsState>({
    top: 0,
    left: 0,
  });

  const onMouseMove: MouseEventHandler<HTMLImageElement> = (e) => {
    if (props.show) {
      const bounds = ref.current?.getBoundingClientRect();
      const width = bounds?.width ?? 0;
      const height = bounds?.height ?? 0;
      const x = Math.min(width-3, e.clientX - (bounds?.left ?? 0))/scale;
      const y = Math.min(height-3, e.clientY - (bounds?.top ?? 0))/scale;
      setCrosshairs({
        left: x,
        top: y,
      });
    }
  };

  return (
    <div
      ref={ref}
      className={`${props.className} grid ${props.show ? "cursor-crosshair" : ""}`}
      onMouseMove={onMouseMove}
    >
      <div
        className="col-start-1 row-start-1 top-0 border-dashed border-black"
        style={{
          marginLeft: crosshairs.left,
          visibility: props.show ? "visible" : "hidden",
          borderLeftWidth: 2 * (1 / scale),
        }}
      ></div>
      <div
        className="col-start-1 row-start-1 left-0 border-dashed border-black"
        style={{
          marginTop: crosshairs.top,
          visibility: props.show ? "visible" : "hidden",
          borderTopWidth: 2 * (1 / scale),
        }}
      ></div>
    </div>
  );
};

export { Crosshairs };
