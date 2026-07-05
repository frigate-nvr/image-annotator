#!/usr/bin/env node
/**
 * Assembles the self-hosted model assets for the segmentation feature:
 *   <outDir>/Xenova/slimsam-77-uniform/...   (downloaded from huggingface.co)
 *   <outDir>/ort/...                         (copied from the installed onnxruntime-web)
 *
 * Usage: node scripts/download-models.mjs [outDir=models]
 *
 * This runs at build/deploy time only; the published component never
 * contacts huggingface.co at runtime.
 */
import { createRequire } from 'node:module'
import { mkdir, copyFile, stat } from 'node:fs/promises'
import { createWriteStream } from 'node:fs'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const MODEL_ID = 'Xenova/slimsam-77-uniform'
const MODEL_FILES = [
  'config.json',
  'preprocessor_config.json',
  'onnx/vision_encoder_quantized.onnx',
  'onnx/prompt_encoder_mask_decoder_quantized.onnx',
]
// all runtime variants; the browser only fetches the one it needs
// (webgpu uses asyncify/jspi depending on browser support, wasm cpu
// uses the plain build, older ort versions use .jsep)
const ORT_FILES = [
  'ort-wasm-simd-threaded.mjs',
  'ort-wasm-simd-threaded.wasm',
  'ort-wasm-simd-threaded.jsep.mjs',
  'ort-wasm-simd-threaded.jsep.wasm',
  'ort-wasm-simd-threaded.asyncify.mjs',
  'ort-wasm-simd-threaded.asyncify.wasm',
  'ort-wasm-simd-threaded.jspi.mjs',
  'ort-wasm-simd-threaded.jspi.wasm',
]

const outDir = process.argv[2] ?? 'models'

const exists = async (file) => {
  try {
    const s = await stat(file)
    return s.size > 0
  } catch {
    return false
  }
}

const download = async (url, dest) => {
  const res = await fetch(url, { redirect: 'follow' })
  if (!res.ok || !res.body) {
    throw new Error(`${res.status} ${res.statusText} for ${url}`)
  }
  await pipeline(Readable.fromWeb(res.body), createWriteStream(dest))
}

const main = async () => {
  for (const file of MODEL_FILES) {
    const dest = path.join(outDir, MODEL_ID, file)
    await mkdir(path.dirname(dest), { recursive: true })
    if (await exists(dest)) {
      console.log(`skip  ${dest}`)
      continue
    }
    const url = `https://huggingface.co/${MODEL_ID}/resolve/main/${file}`
    console.log(`fetch ${url}`)
    await download(url, dest)
    const s = await stat(dest)
    console.log(`  -> ${dest} (${(s.size / 1024 / 1024).toFixed(2)} MB)`)
  }

  // resolve the onnxruntime-web that transformers.js actually depends on so
  // the wasm binaries always match the bundled runtime
  const require = createRequire(fileURLToPath(import.meta.url))
  const transformersDir = path.dirname(require.resolve('@huggingface/transformers'))
  const ortRequire = createRequire(path.join(transformersDir, 'noop.js'))
  const ortDist = path.dirname(ortRequire.resolve('onnxruntime-web'))

  const ortOut = path.join(outDir, 'ort')
  await mkdir(ortOut, { recursive: true })
  for (const file of ORT_FILES) {
    const src = path.join(ortDist, file)
    const dest = path.join(ortOut, file)
    if (await exists(dest)) {
      console.log(`skip  ${dest}`)
      continue
    }
    await copyFile(src, dest)
    const s = await stat(dest)
    console.log(`copy  ${dest} (${(s.size / 1024 / 1024).toFixed(2)} MB)`)
  }

  console.log(`\nModel assets ready in ${outDir}/`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
