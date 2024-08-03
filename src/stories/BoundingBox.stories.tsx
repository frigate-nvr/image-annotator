import type { Meta, StoryObj } from "@storybook/react";
import BoundingBox, { BoundingBoxType } from "../components/BoundingBox";

const meta: Meta<typeof BoundingBox> = {
  title: "BoundingBox",
  component: BoundingBox,
};

export default meta;

type Story = StoryObj<typeof meta>;

// More on writing stories with args: https://storybook.js.org/docs/writing-stories/args
export const Default: Story = {
  args: {
    type: BoundingBoxType.truePositive,
    x: 10,
    y: 10,
    h: 100,
    w: 100,
    label: "person",
    key: "1",
    selected: false,
    zIndex: 10,
  },
  render: function Render(args) {
    return (
      <div className="h-96 w-96 border-2 border-solid bg-slate-700">
        <BoundingBox {...args}/>
      </div>
    )
  }
};

export const Selected: Story = {
  args: {
    type: BoundingBoxType.truePositive,
    x: 10,
    y: 10,
    h: 100,
    w: 100,
    label: "person",
    key: "1",
    selected: true,
    zIndex: 10,
  },
  render: function Render(args) {
    return (
      <div className="h-96 w-96 border-2 border-solid bg-slate-700">
        <BoundingBox {...args}/>
      </div>
    )
  }
};

export const FalsePositive: Story = {
  args: {
    type: BoundingBoxType.falsePositive,
    x: 10,
    y: 10,
    h: 100,
    w: 100,
    label: "person",
    key: "1",
    selected: false,
    zIndex: 10,
  },
  render: function Render(args) {
    return (
      <div className="h-96 w-96 border-2 border-solid bg-slate-700">
        <BoundingBox {...args}/>
      </div>
    )
  }
};

export const FalsePositiveSelected: Story = {
  args: {
    type: BoundingBoxType.falsePositive,
    x: 10,
    y: 10,
    h: 100,
    w: 100,
    label: "person",
    key: "1",
    selected: true,
    zIndex: 10,
  },
  render: function Render(args) {
    return (
      <div className="h-96 w-96 border-2 border-solid bg-slate-700">
        <BoundingBox {...args}/>
      </div>
    )
  }
};

export const Suggestion: Story = {
  args: {
    type: BoundingBoxType.suggestion,
    x: 10,
    y: 10,
    h: 100,
    w: 100,
    label: "person",
    key: "1",
    selected: false,
    zIndex: 10,
  },
  render: function Render(args) {
    return (
      <div className="h-96 w-96 border-2 border-solid bg-slate-700">
        <BoundingBox {...args}/>
      </div>
    )
  }
};

export const SuggestionSelected: Story = {
  args: {
    type: BoundingBoxType.suggestion,
    x: 10,
    y: 10,
    h: 100,
    w: 100,
    label: "person",
    key: "1",
    selected: true,
    zIndex: 10,
  },
  render: function Render(args) {
    return (
      <div className="h-96 w-96 border-2 border-solid bg-slate-700">
        <BoundingBox {...args}/>
      </div>
    )
  }
};
