import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Panel (HTML page) build. Output assets may be content-hashed: only
 * dist/panel.html itself is referenced statically by the MV3 manifest, and the
 * generated .html references its own hashed assets, which is fine.
 *
 * Styling is plain hand-rolled CSS (docs/TECHNICAL_DECISIONS.md D9).
 */
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: false, // background/content builds share dist/
    rollupOptions: {
      input: {
        panel: 'panel.html',
      },
    },
  },
});
