import path, { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { globSync } from 'glob'
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import dts from "vite-plugin-dts";
import tailwindcss from "tailwindcss";

export default defineConfig({
  plugins: [react(), dts({
    rollupTypes: true,
    exclude: ['**/*.stories.tsx']
  })],
  build: {
    lib: {
      entry: resolve(__dirname, "./src/index.ts"),
      formats: ['es'],
    },
    rollupOptions: {
      external: ["react", "react-dom", 'react/jsx-runtime', "tailwindcss"],
      input: Object.fromEntries(
        globSync(['src/components/**/index.tsx', 'src/index.ts']).map((file) => {
          // This remove `src/` as well as the file extension from each
          // file, so e.g. src/nested/foo.js becomes nested/foo
          const entryName = path.relative(
            'src',
            file.slice(0, file.length - path.extname(file).length)
          )
          // This expands the relative paths to absolute paths, so e.g.
          // src/nested/foo becomes /project/src/nested/foo.js
          const entryUrl = fileURLToPath(new URL(file, import.meta.url))
          return [entryName, entryUrl]
        })
      ),
      output: {
        entryFileNames: '[name].js',
        assetFileNames: 'assets/[name][extname]',
        globals: {
          react: "React",
          "react-dom": "React-dOM",
          'react/jsx-runtime': 'react/jsx-runtime',
          tailwindcss: "tailwindcss"
        },
      },
    },
    //Generates sourcemaps for the built files,
    //aiding in debugging.
    sourcemap: true,
    //Clears the output directory before building.
    emptyOutDir: true,
  },
  //react() enables React support.
  //dts() generates TypeScript declaration files (*.d.ts)
  //during the build.
  css: {
    postcss: {
        plugins: [tailwindcss],
    },
  },
});