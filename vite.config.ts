import { ManifestV3Export, crx } from '@crxjs/vite-plugin';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import eslint from 'vite-plugin-eslint';

import manifest from './manifest-react.json';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    crx({
      manifest: manifest as ManifestV3Export,
      contentScripts: {
        injectCss: true,
      },
    }),
    eslint(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    hmr: {
      port: 5173,
    },
  },
});
