import { MouseEventHandler, useRef, useState } from "react";

interface CrosshairsState {
  top: number;
  left: number;
}

interface ICrosshairsProps {
  className: string;
  show: boolean;
}

const Crosshairs = (props: ICrosshairsProps) => {
  const ref = useRef<HTMLDivElement>(null);

  const [crosshairs, setCrosshairs] = useState<CrosshairsState>({
    top: 0,
    left: 0,
  });

  const onMouseMove: MouseEventHandler<HTMLImageElement> = (e) => {
    if (props.show) {
      const x = e.clientX - (ref.current?.getBoundingClientRect().left ?? 0) - 3;
      const y = e.clientY - (ref.current?.getBoundingClientRect().top ?? 0) - 3;
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
        className="col-start-1 row-start-1 top-0 border-l-2 border-dashed border-black"
        style={{
          marginLeft: crosshairs.left,
          visibility: props.show ? "visible" : "hidden",
        }}
      ></div>
      <div
        className="col-start-1 row-start-1 left-0 border-t-2 border-dashed border-black"
        style={{
          marginTop: crosshairs.top,
          visibility: props.show ? "visible" : "hidden",
        }}
      ></div>
    </div>
  );
};

export default Crosshairs;
