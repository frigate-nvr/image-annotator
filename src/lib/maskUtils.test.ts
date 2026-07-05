import { describe, expect, it } from 'vitest'

import { maskToBoundingBox, NormalizedBox } from './maskUtils'

const expectBox = (box: NormalizedBox | null, expected: NormalizedBox) => {
  expect(box).not.toBeNull()
  expect(box!.x).toBeCloseTo(expected.x, 10)
  expect(box!.y).toBeCloseTo(expected.y, 10)
  expect(box!.w).toBeCloseTo(expected.w, 10)
  expect(box!.h).toBeCloseTo(expected.h, 10)
}

// builds a mask from rows of '.' (empty) and '#' (set)
const maskFrom = (rows: string[]) => {
  const height = rows.length
  const width = rows[0]!.length
  const mask = new Uint8Array(width * height)
  rows.forEach((row, y) => {
    for (let x = 0; x < width; x += 1) {
      if (row[x] === '#') {
        mask[y * width + x] = 1
      }
    }
  })
  return { mask, width, height }
}

describe('maskToBoundingBox', () => {
  it('returns null for an empty mask', () => {
    const { mask, width, height } = maskFrom(['....', '....'])
    expect(maskToBoundingBox(mask, width, height, 1)).toBeNull()
  })

  it('boxes a single blob with exclusive extents', () => {
    const { mask, width, height } = maskFrom([
      '........',
      '..##....',
      '..###...',
      '...##...',
      '........',
    ])
    const box = maskToBoundingBox(mask, width, height, 1)
    expectBox(box, { x: 2 / 8, y: 1 / 5, w: 3 / 8, h: 3 / 5 })
  })

  it('picks the largest connected component', () => {
    const { mask, width, height } = maskFrom(['#.......', '........', '....####', '....####'])
    const box = maskToBoundingBox(mask, width, height, 1)
    expectBox(box, { x: 4 / 8, y: 2 / 4, w: 4 / 8, h: 2 / 4 })
  })

  it('treats diagonal pixels as separate components', () => {
    const { mask, width, height } = maskFrom(['#...', '.###'])
    const box = maskToBoundingBox(mask, width, height, 1)
    expectBox(box, { x: 1 / 4, y: 1 / 2, w: 3 / 4, h: 1 / 2 })
  })

  it('returns null when the largest component is below minPixels', () => {
    const { mask, width, height } = maskFrom(['##......', '........'])
    expect(maskToBoundingBox(mask, width, height, 3)).toBeNull()
  })

  it('boxes a full-frame mask as the whole image', () => {
    const { mask, width, height } = maskFrom(['###', '###', '###'])
    expect(maskToBoundingBox(mask, width, height, 1)).toEqual({
      x: 0,
      y: 0,
      w: 1,
      h: 1,
    })
  })

  it('handles non-square images', () => {
    const { mask, width, height } = maskFrom([
      '................',
      '.#..............',
      '................',
      '................',
    ])
    const box = maskToBoundingBox(mask, width, height, 1)
    expectBox(box, { x: 1 / 16, y: 1 / 4, w: 1 / 16, h: 1 / 4 })
  })

  it('returns null for invalid dimensions', () => {
    expect(maskToBoundingBox(new Uint8Array(0), 0, 0)).toBeNull()
    expect(maskToBoundingBox(new Uint8Array(2), 4, 4)).toBeNull()
  })
})
