import type { Meta, StoryObj } from "@storybook/react";
import { ImageAnnotator } from "../components/ImageAnnotator";

const meta: Meta<typeof ImageAnnotator> = {
  title: "ImageAnnotator",
  component: ImageAnnotator,
};

export default meta;

type Story = StoryObj<typeof meta>;

// More on writing stories with args: https://storybook.js.org/docs/writing-stories/args
export const Default: Story = {
  args: {
    imageUrl: 'https://github.com/frigate-nvr/image-annotator/blob/main/src/stories/assets/back.jpg?raw=true',
    annotations: [],
    suggestions: [],
    falsePositives: [],
    labels: ['person',
      'dhl',
      'deer',
      'dog',
      'horse']
  },
};

export const FalsePositives: Story = {
  args: {
    imageUrl: 'https://github.com/frigate-nvr/image-annotator/blob/main/src/stories/assets/back.jpg?raw=true',
    annotations: [],
    suggestions: [],
    falsePositives: [
      {
        id: "fp_1",
        x: 0.1,
        y: 0.1,
        w: 0.1,
        h: 0.1,
        label: "dog",
      }
    ],
    labels: ['person', 'car', 'dog']
  },
};

export const Suggestions: Story = {
  args: {
    imageUrl: 'https://github.com/frigate-nvr/image-annotator/blob/main/src/stories/assets/back.jpg?raw=true',
    annotations: [],
    suggestions: [
      {
        id: "sug_1",
        suggestion: true,
        x: 0.1,
        y: 0.1,
        w: 0.1,
        h: 0.1,
        label: "dog",
      }
    ],
    falsePositives: [],
    labels: ['person', 'car', 'dog']
  },
};

export const SmallImage: Story = {
  args: {
    imageUrl: 'https://github.com/frigate-nvr/image-annotator/blob/main/src/stories/assets/back_small.jpg?raw=true',
    annotations: [],
    suggestions: [],
    falsePositives: [],
    labels: ['person', 'car', 'dog']
  },
};


export const ManyLabels: Story = {
  args: {
    imageUrl: 'https://github.com/frigate-nvr/image-annotator/blob/main/src/stories/assets/back.jpg?raw=true',
    annotations: [],
    suggestions: [],
    falsePositives: [],
    labels: ['person',
      'dhl',
      'deer',
      'dog',
      'horse',
      'package',
      'waste_bin',
      'an_post',
      'bird',
      'robot_lawnmower',
      'raccoon',
      'boat',
      'fox',
      'umbrella',
      'bear',
      'cat',
      'license_plate',
      'purolator',
      'bbq_grill',
      'cow',
      'face',
      'usps',
      'ups',
      'amazon',
      'postnl',
      'fedex',
      'bicycle',
      'squirrel',
      'nzpost',
      'car',
      'motorcycle',
      'postnord',
      'gls',
      'dpd',
      'goat',
      'rabbit',
      'dhl',
      'deer',
      'dog',
      'horse',
      'package',
      'waste_bin',
      'an_post',
      'bird',
      'robot_lawnmower',
      'raccoon',
      'boat',
      'fox',
      'umbrella',
      'bear',
      'cat',
      'license_plate',
      'purolator',
      'bbq_grill',
      'cow',
      'face',
      'usps',
      'ups',
      'amazon',
      'postnl',
      'fedex',
      'bicycle',
      'squirrel',
      'nzpost',
      'car',
      'motorcycle',
      'postnord',
      'gls',
      'dpd',
      'goat',
      'rabbit',
      'robot_lawnmower',
      'raccoon',
      'boat',
      'fox',
      'umbrella',
      'bear',
      'cat',
      'license_plate',
      'purolator',
      'bbq_grill',
      'cow',
      'face',
      'usps',
      'ups',
      'amazon',
      'postnl',
      'fedex',
      'bicycle',
      'squirrel',
      'nzpost',
      'car',
      'motorcycle',
      'postnord',
      'gls',
      'dpd',
      'goat',
      'rabbit']
  },
};