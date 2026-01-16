import { defineConfig } from 'vite';
import electron from 'vite-plugin-electron';
import { resolve } from 'path';

export default defineConfig({
  // Set the root to the renderer directory for the web build
  root: resolve(__dirname, 'src/renderer'),
  plugins: [
    electron([
      {
        // Main process entry point
        entry: resolve(__dirname, 'src/main.ts'),
        onstart(options) {
          // Start Electron when Vite starts in dev mode
          options.startup();
        },
        vite: {
          build: {
            outDir: resolve(__dirname, 'dist'),
            rollupOptions: {
              external: ['electron', 'playwright'],
            },
          },
        },
      },
      {
        // Preload script entry point
        entry: resolve(__dirname, 'src/preload.ts'),
        onstart(options) {
          // Reload when preload changes
          options.reload();
        },
        vite: {
          build: {
            outDir: resolve(__dirname, 'dist'),
            rollupOptions: {
              external: ['electron'],
            },
          },
        },
      },
    ]),
  ],
  build: {
    outDir: resolve(__dirname, 'dist/renderer'),
    emptyOutDir: false,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
});
