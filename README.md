# Frigate+ Image Annotator

This is an opinionated image annotation component designed for Frigate+.

[Storybook Demo](https://frigate-nvr.github.io/image-annotator/)

## Dependencies

This library depends on tailwind libraries for styling.

```shell
npm install -D tailwindcss @tailwindcss/forms
```

## Configuration

You need to include the library in your `tailwind.config.js` file.

```typescript
/** @type {import('tailwindcss').Config} */

import tailwindForms from '@tailwindcss/forms'

export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    'node_modules/@frigate-nvr/image-annotator/dist/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [tailwindForms],
}
```

## Segmentation (click-to-segment)

The annotator can run a Segment Anything model (SlimSAM, Apache-2.0) entirely in
the browser via [transformers.js](https://github.com/huggingface/transformers.js)
(Apache-2.0) and onnxruntime-web (MIT). In "Magic" mode, hovering previews the
segmented object and clicking creates a bounding box automatically. WebGPU is
used when available, with a WASM fallback.

Model assets are **self-hosted only** — the component never contacts
huggingface.co at runtime. Assemble the assets at build/deploy time:

```shell
node node_modules/@frigate-nvr/image-annotator/scripts/download-models.mjs public/models
```

which produces:

```
public/models/
  Xenova/slimsam-77-uniform/   (model + processor config, ~14 MB)
  ort/                          (onnxruntime wasm runtimes; only the
                                 variant the browser needs is fetched)
```

Serve `.wasm` as `application/wasm` and `.mjs` as JavaScript. Then:

```tsx
<ImageAnnotator
  ...
  crossOrigin="anonymous"            // or "use-credentials" for cookie-authed images
  segmentation={{ modelPath: '/models' }}
/>
```

Requirements and notes:

- The image must be readable pixel-wise: set `crossOrigin` and serve the image
  with matching CORS headers (`Access-Control-Allow-Origin`, plus
  `Access-Control-Allow-Credentials: true` when using `use-credentials`).
  Without CORS the feature degrades gracefully and reports
  "Segmentation unavailable".
- Model files are cached by the browser after the first download.
- The segmentation runtime is loaded lazily; consumers that do not pass
  `segmentation` never download it.
