import { env, RawImage, SamModel, SamProcessor, Tensor } from '@huggingface/transformers'

const MODEL_ID = 'Xenova/slimsam-77-uniform'

export type SamDevice = 'webgpu' | 'wasm'

export interface DecodedMask {
  mask: Uint8Array
  width: number
  height: number
  score: number
}

// thrown when the image pixels can't be read (missing crossOrigin/CORS)
export class SamPixelAccessError extends Error {
  public readonly originalError: unknown

  constructor(originalError: unknown) {
    super(
      'image pixels are unreadable; set the crossOrigin prop and serve the image with CORS headers'
    )
    this.name = 'SamPixelAccessError'
    this.originalError = originalError
  }
}

export const isSupported = () => typeof WebAssembly === 'object'

const detectDevice = async (): Promise<SamDevice> => {
  try {
    const nav = navigator as Navigator & { gpu?: { requestAdapter: () => Promise<unknown> } }
    if (nav.gpu && (await nav.gpu.requestAdapter())) {
      return 'webgpu'
    }
  } catch {
    // fall through to wasm
  }
  return 'wasm'
}

interface EmbeddingCache {
  key: string
  embeddings: Record<string, Tensor>
  originalSizes: [number, number][]
  reshapedSizes: [number, number][]
}

export class SamSession {
  private model: SamModel

  private processor: SamProcessor

  public readonly device: SamDevice

  private cache: EmbeddingCache | null = null

  constructor(model: SamModel, processor: SamProcessor, device: SamDevice) {
    this.model = model
    this.processor = processor
    this.device = device
  }

  public async encodeImage(img: HTMLImageElement, cacheKey: string) {
    if (this.cache?.key === cacheKey) {
      return
    }

    const width = img.naturalWidth
    const height = img.naturalHeight
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) {
      throw new Error('unable to create 2d canvas context')
    }
    ctx.drawImage(img, 0, 0, width, height)

    let imageData: ImageData
    try {
      imageData = ctx.getImageData(0, 0, width, height)
    } catch (e) {
      throw new SamPixelAccessError(e)
    }

    const rawImage = new RawImage(new Uint8ClampedArray(imageData.data), width, height, 4)
    const inputs = await this.processor(rawImage)
    const embeddings = await this.model.get_image_embeddings({
      pixel_values: inputs.pixel_values,
    })

    this.cache = {
      key: cacheKey,
      embeddings,
      originalSizes: inputs.original_sizes,
      reshapedSizes: inputs.reshaped_input_sizes,
    }
  }

  /**
   * Decodes a mask for a point given in normalized (0..1) image
   * coordinates. encodeImage must have completed first.
   */
  public async decodePoint(nx: number, ny: number): Promise<DecodedMask> {
    const cache = this.cache
    if (!cache) {
      throw new Error('encodeImage must be called before decodePoint')
    }

    const reshaped = cache.reshapedSizes[0]!
    const point = [nx * reshaped[1], ny * reshaped[0]]
    const inputPoints = new Tensor('float32', point, [1, 1, 1, 2])
    const inputLabels = new Tensor('int64', [1n], [1, 1, 1])

    const outputs = await this.model({
      ...cache.embeddings,
      input_points: inputPoints,
      input_labels: inputLabels,
    })

    const masks = await this.processor.post_process_masks(
      outputs.pred_masks,
      cache.originalSizes,
      cache.reshapedSizes
    )

    // pick the best of the 3 predicted masks
    const scores = outputs.iou_scores.data as Float32Array
    let best = 0
    for (let i = 1; i < scores.length; i += 1) {
      if (scores[i]! > scores[best]!) {
        best = i
      }
    }

    const maskTensor = masks[0]
    const [, , height, width] = maskTensor.dims as number[]
    const data = maskTensor.data as Uint8Array
    const mask = data.subarray(best * width! * height!, (best + 1) * width! * height!)

    return { mask, width: width!, height: height!, score: scores[best]! }
  }

  public clearCache() {
    this.cache = null
  }
}

let sessionPromise: Promise<SamSession> | null = null

/**
 * Loads the model and processor once, from self-hosted assets only.
 * The promise is shared across callers; a failure resets it so the
 * next call can retry.
 */
export const getSession = (modelPath: string): Promise<SamSession> => {
  if (!sessionPromise) {
    sessionPromise = (async () => {
      const base = modelPath.replace(/\/$/, '')

      env.allowRemoteModels = false
      env.allowLocalModels = true
      env.localModelPath = base

      // ort loads its wasm/webgpu runtime from here; the proxy flag runs
      // the wasm backend in ort's own worker so the UI thread stays free
      const onnxEnv = env.backends.onnx as {
        wasm: { wasmPaths: string; proxy: boolean }
      }
      onnxEnv.wasm.wasmPaths = `${base}/ort/`
      onnxEnv.wasm.proxy = true

      const device = await detectDevice()
      const model = (await SamModel.from_pretrained(MODEL_ID, {
        dtype: 'q8',
        device,
      })) as SamModel
      const processor = (await SamProcessor.from_pretrained(MODEL_ID)) as SamProcessor

      return new SamSession(model, processor, device)
    })()

    sessionPromise.catch(() => {
      sessionPromise = null
    })
  }

  return sessionPromise
}
