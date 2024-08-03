import type { Meta, StoryObj } from "@storybook/react";
import BoundingBox, { BoundingBoxType } from "../components/BoundingBox";
import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";
import { useState } from "react";

const meta: Meta<typeof BoundingBox> = {
  title: "BoundingBox",
  component: BoundingBox,
  args: {
    type: BoundingBoxType.truePositive,
    x: 10,
    y: 10,
    h: 100,
    w: 100,
    label: "person",
    selected: false,
    zIndex: 10,
    onMouseDown: (e) => {
      e.stopPropagation();
    },
  },
  render: function Render(args) {
    const [state, setState] = useState({
      w: 100,
      h: 100,
      x: 10,
      y: 10,
    });

    args.x = state.x;
    args.y = state.y;
    args.w = state.w;
    args.h = state.h;

    args.onDragStop = (e, d) => {
      setState({ ...state, x: d.x, y: d.y });
    };
    args.onResizeStop = (e, direction, ref, delta, position) => {
      setState({
        ...state,
        x: position.x,
        y: position.y,
        w: parseInt(ref.style.width),
        h: parseInt(ref.style.height),
      });
    };

    return (
      <div className="inline-block border-2 border-solid border-red-600">
        <TransformWrapper>
          <TransformComponent>
            <div className="">
              <img
                className="col-start-1 row-start-1 h-full w-full"
                alt="annotate"
                src="/src/stories/assets/back.jpg"
              />
              <BoundingBox {...args} />
            </div>
          </TransformComponent>
        </TransformWrapper>
      </div>
    );
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

// More on writing stories with args: https://storybook.js.org/docs/writing-stories/args
export const Default: Story = {};

export const Selected: Story = {
  args: {
    selected: true,
  },
};

export const FalsePositive: Story = {
  args: {
    type: BoundingBoxType.falsePositive,
  },
};

export const FalsePositiveSelected: Story = {
  args: {
    type: BoundingBoxType.falsePositive,
    selected: true,
  },
};

export const Suggestion: Story = {
  args: {
    type: BoundingBoxType.suggestion,
  },
};

export const SuggestionSelected: Story = {
  args: {
    type: BoundingBoxType.suggestion,
    selected: true,
  },
};
