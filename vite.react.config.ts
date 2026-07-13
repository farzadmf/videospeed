import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

// Builds only the React popup/options; esbuild still owns content/background/manifest.
// Runs AFTER scripts/build.mjs, which empties dist/.
export default defineConfig({
  root: path.resolve(__dirname, 'src', 'ui'),
  base: './', // extension-relative asset URLs; MV3 forbids absolute-root paths
  css: { postcss: {} }, // repo-root postcss.config.js is for content styles only
  plugins: [react()],
  resolve: {
    alias: { '@shared': path.resolve(__dirname, 'src', 'shared') },
  },
  build: {
    outDir: path.resolve(__dirname, 'dist', 'ui-react'),
    emptyOutDir: true, // scoped to ui-react/, never touches esbuild output
    rollupOptions: {
      input: {
        popup: path.resolve(__dirname, 'src', 'ui', 'popup-react', 'index.html'),
      },
    },
  },
});
