import type { Meta, StoryObj } from '@storybook/react'
import { ImageAnnotator } from '../components/ImageAnnotator'

const meta: Meta<typeof ImageAnnotator> = {
  title: 'ImageAnnotator',
  component: ImageAnnotator,
}

export default meta

type Story = StoryObj<typeof meta>

// More on writing stories with args: https://storybook.js.org/docs/writing-stories/args
export const Default: Story = {
  args: {
    imageUrl:
      'https://github.com/frigate-nvr/image-annotator/blob/main/src/stories/assets/back.jpg?raw=true',
    manageLabelUrl: 'https://frigate.video',
    annotations: [],
    suggestions: [],
    falsePositives: [],
    labels: ['person', 'dhl', 'deer', 'dog', 'horse'],
  },
}

export const FalsePositives: Story = {
  args: {
    imageUrl:
      'https://github.com/frigate-nvr/image-annotator/blob/main/src/stories/assets/back.jpg?raw=true',
    annotations: [],
    suggestions: [],
    falsePositives: [
      {
        id: 'fp_1',
        x: 0.1,
        y: 0.1,
        w: 0.1,
        h: 0.1,
        label: 'dog',
      },
    ],
    labels: ['person', 'car', 'dog'],
  },
}

export const Suggestions: Story = {
  args: {
    imageUrl:
      'https://github.com/frigate-nvr/image-annotator/blob/main/src/stories/assets/back.jpg?raw=true',
    annotations: [],
    suggestions: [
      {
        id: 'sug_1',
        suggestion: true,
        x: 0.1,
        y: 0.1,
        w: 0.1,
        h: 0.1,
        label: 'dog',
      },
    ],
    falsePositives: [],
    labels: ['person', 'car', 'dog'],
  },
}

export const SmallImage: Story = {
  args: {
    imageUrl:
      'https://github.com/frigate-nvr/image-annotator/blob/main/src/stories/assets/back_small.jpg?raw=true',
    annotations: [],
    suggestions: [],
    falsePositives: [],
    labels: ['person', 'car', 'dog'],
  },
}

export const ManyLabels: Story = {
  args: {
    imageUrl:
      'https://github.com/frigate-nvr/image-annotator/blob/main/src/stories/assets/back.jpg?raw=true',
    annotations: [],
    suggestions: [],
    falsePositives: [],
    labels: [
      'person',
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
      'rabbit',
    ],
  },
}

const BACK =
  'https://github.com/frigate-nvr/image-annotator/blob/main/src/stories/assets/back.jpg?raw=true'
const BACK_SMALL =
  'https://github.com/frigate-nvr/image-annotator/blob/main/src/stories/assets/back_small.jpg?raw=true'

export const WithNavigation: Story = {
  args: {
    imageUrl: BACK,
    annotations: [
      {
        id: 'a_1',
        x: 0.2,
        y: 0.2,
        w: 0.2,
        h: 0.2,
        label: 'dog',
      },
    ],
    suggestions: [],
    falsePositives: [],
    labels: ['person', 'car', 'dog'],
    previousImages: [
      { id: 'p3', thumbnailUrl: BACK_SMALL },
      { id: 'p2', thumbnailUrl: BACK_SMALL },
      { id: 'p1', thumbnailUrl: BACK_SMALL },
    ],
    nextImages: [
      { id: 'n1', thumbnailUrl: BACK_SMALL },
      { id: 'n2', thumbnailUrl: BACK_SMALL },
      { id: 'n3', thumbnailUrl: BACK_SMALL },
    ],
    currentThumbnailUrl: BACK_SMALL,
    previousImage: () => console.log('previous image'),
    nextImage: () => console.log('next image'),
    navigateToImage: (id: string) => console.log('navigate to', id),
  },
}

export const WithNavigationAtEnd: Story = {
  args: {
    ...WithNavigation.args,
    previousImages: [],
    nextImages: [{ id: 'n1', thumbnailUrl: BACK_SMALL }],
  },
}

export const DefaultLabel: Story = {
  args: {
    imageUrl:
      'https://github.com/frigate-nvr/image-annotator/blob/main/src/stories/assets/back.jpg?raw=true',
    annotations: [],
    suggestions: [],
    falsePositives: [],
    labels: ['person', 'dhl', 'deer', 'dog', 'horse', 'package', 'waste_bin', 'an_post', 'bird'],
    verifiedLabels: ['person'],
  },
}
