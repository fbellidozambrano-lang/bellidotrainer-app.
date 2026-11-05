import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

// El lector de etiquetas usa ONNX Runtime solo con WebAssembly (sin WebGPU): el motor pesa la mitad.
const ortWasm = fileURLToPath(new URL('./node_modules/onnxruntime-web/dist/ort.wasm.bundle.min.mjs', import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: { alias: [{ find: /^onnxruntime-web$/, replacement: ortWasm }] },
  worker: { format: 'es' },
  build: { target: ['es2020', 'safari14'], assetsInlineLimit: 0, chunkSizeWarningLimit: 900 },
});
