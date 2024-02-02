import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        optionsTest: resolve(__dirname, 'options-test.html'),
      },
    },
  },
});
