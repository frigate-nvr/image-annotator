
```
npm install -D tailwindcss @tailwindcss/forms
```

```
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