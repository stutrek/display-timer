import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dirname = path.dirname(fileURLToPath(import.meta.url));

const localPreactHA = path.resolve(dirname, '../preact-homeassistant');
const hasLocalPreactHA = fs.existsSync(path.join(localPreactHA, 'package.json'));

export default defineConfig({
  plugins: [preact()],
  build: {
    lib: {
      entry: path.resolve(dirname, 'src/__CardClass__/index.tsx'),
      name: '__CardClass__',
      formats: ['es'],
      fileName: () => '__CARD_TAG__.js',
    },
    rollupOptions: {
      external: [],
    },
    outDir: 'dist',
    minify: false,
  },
  resolve: {
    dedupe: ['preact', 'preact/hooks', 'preact/compat'],
    alias: hasLocalPreactHA ? { 'preact-homeassistant': localPreactHA } : {},
  },
});
