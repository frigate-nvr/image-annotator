import type { Meta, StoryObj } from "@storybook/react";
import { FormElement } from "../components/FormElement";

const meta: Meta<typeof FormElement> = {
  title: "FormElement",
  component: FormElement,
};

export default meta;

type Story = StoryObj<typeof meta>;

// More on writing stories with args: https://storybook.js.org/docs/writing-stories/args
export const Default: Story = {
  args: {
    children: (
        <input
            id="id"
            type="input"
        />
    )
  },
};
