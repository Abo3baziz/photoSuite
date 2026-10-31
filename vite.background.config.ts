import { defineConfig } from 'vite';

/**
 * Background service worker build.
 *
 * MV3 requires the manifest to reference `background.js` by an exact filename,
 * so the bundle is emitted with a fixed name. The worker is an ES module
 * ("type": "module" in manifest.json), which keeps shared code importable
 * without IIFE gymnastics.
 */
export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    rollupOptions: {
      input: {
        background: 'src/background/index.ts',
      },
      output: {
        format: 'es',
        entryFileNames: 'background.js',
        chunkFileNames: 'assets/bg-[name]-[hash].js',
        codeSplitting: false,
      },
    },
  },
});
