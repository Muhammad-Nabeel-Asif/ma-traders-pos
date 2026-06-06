import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' so the built assets load correctly when served from file:// inside Electron
export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:4317',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
