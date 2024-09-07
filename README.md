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

import tailwindForms from "@tailwindcss/forms";

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "node_modules/@frigate-nvr/image-annotator/dist/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {},
  },
  plugins: [tailwindForms],
}
```