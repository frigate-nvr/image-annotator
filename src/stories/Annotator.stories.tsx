import type { Meta, StoryObj } from "@storybook/react";
import ImageAnnotator from "../components/ImageAnnotator";

const meta: Meta<typeof ImageAnnotator> = {
  title: "ImageAnnotator",
  component: ImageAnnotator,
};

export default meta;

type Story = StoryObj<typeof meta>;

// More on writing stories with args: https://storybook.js.org/docs/writing-stories/args
export const Default: Story = {
  args: {
    imageUrl: '/src/stories/assets/back.jpg',
    annotations: [],
    suggestions: [],
    falsePositives: [],
    labels: ['person', 'car', 'dog']
  },
};
