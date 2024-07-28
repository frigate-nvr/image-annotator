import type { Meta, StoryObj } from "@storybook/react";
import Crosshairs from "../components/Crosshairs";

const meta: Meta<typeof Crosshairs> = {
  title: "Crosshairs",
  component: Crosshairs,
};

export default meta;

type Story = StoryObj<typeof meta>;

// More on writing stories with args: https://storybook.js.org/docs/writing-stories/args
export const Default: Story = {
  args: {
    show: true,
    className: "h-96 w-96 border-solid border-2"
  },
};
