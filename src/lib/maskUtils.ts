export interface NormalizedBox {
  x: number
  y: number
  w: number
  h: number
}

/**
 * Derives a normalized bounding box from a binary segmentation mask.
 *
 * Finds the largest 4-connected component of nonzero pixels (so stray
 * mask specks don't inflate the box) and returns its extents normalized
 * to 0..1, or null when the largest component is smaller than minPixels.
 */
export function maskToBoundingBox(
  mask: Uint8Array,
  width: number,
  height: number,
  minPixels = 64
): NormalizedBox | null {
  if (width <= 0 || height <= 0 || mask.length < width * height) {
    return null
  }

  const visited = new Uint8Array(width * height)
  // iterative BFS; masks can be millions of pixels so no recursion
  const queue = new Int32Array(width * height)

  let best: { area: number; minX: number; minY: number; maxX: number; maxY: number } | null = null

  for (let start = 0; start < width * height; start += 1) {
    if (visited[start] || !mask[start]) {
      continue
    }

    let head = 0
    let tail = 0
    queue[tail] = start
    tail += 1
    visited[start] = 1

    let area = 0
    let minX = width
    let minY = height
    let maxX = -1
    let maxY = -1

    while (head < tail) {
      const idx = queue[head] as number
      head += 1
      area += 1

      const x = idx % width
      const y = (idx - x) / width
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y

      if (x > 0 && !visited[idx - 1] && mask[idx - 1]) {
        visited[idx - 1] = 1
        queue[tail] = idx - 1
        tail += 1
      }
      if (x < width - 1 && !visited[idx + 1] && mask[idx + 1]) {
        visited[idx + 1] = 1
        queue[tail] = idx + 1
        tail += 1
      }
      if (y > 0 && !visited[idx - width] && mask[idx - width]) {
        visited[idx - width] = 1
        queue[tail] = idx - width
        tail += 1
      }
      if (y < height - 1 && !visited[idx + width] && mask[idx + width]) {
        visited[idx + width] = 1
        queue[tail] = idx + width
        tail += 1
      }
    }

    if (!best || area > best.area) {
      best = { area, minX, minY, maxX, maxY }
    }
  }

  if (!best || best.area < minPixels) {
    return null
  }

  const x = best.minX / width
  const y = best.minY / height
  const w = (best.maxX + 1) / width - x
  const h = (best.maxY + 1) / height - y

  return {
    x: Math.max(0, Math.min(1, x)),
    y: Math.max(0, Math.min(1, y)),
    w: Math.max(0, Math.min(1 - x, w)),
    h: Math.max(0, Math.min(1 - y, h)),
  }
}
