import type { Meta, StoryObj } from "@storybook/react";
import Counter from "../components/Counter";

const meta: Meta<typeof Counter> = {
  title: "Counter",
  component: Counter,
};

export default meta;

type Story = StoryObj<typeof meta>;

// More on writing stories with args: https://storybook.js.org/docs/writing-stories/args
export const Default: Story = {
  args: {},
};
