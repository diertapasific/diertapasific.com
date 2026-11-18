import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  publicDir: false,
  define: { 'process.env.NODE_ENV': JSON.stringify('production') },
  build: {
    target: 'es2022',
    outDir: 'dist-worker',
    emptyOutDir: true,
    minify: false,
    lib: { entry: fileURLToPath(new URL('./index.ts', import.meta.url)), formats: ['es'], fileName: () => 'tifa-worker.js' },
  },
})
