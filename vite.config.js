import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Relative base so the static build works when served from a content hash
  // (Bulletin / dot.li), where absolute paths break. Same as LocalDOT's web app.
  base: './',
  plugins: [react()],
  server: {
    port: 5173
  }
});
