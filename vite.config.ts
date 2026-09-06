import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import tailwindCss from 'tailwindcss';

export default defineConfig({
  base: './',
  css: {
    postcss: {
      plugins: [tailwindCss()],
    },
  },
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      '@app/hooks': path.resolve(__dirname, 'app/hooks'),
      '@app/types': path.resolve(__dirname, 'app/types'),
      '@app/components': path.resolve(__dirname, 'app/components'),
      '@app/styles': path.resolve(__dirname, 'app/styles'),
      '@app/utils': path.resolve(__dirname, 'app/utils'),
      '@app/audio': path.resolve(__dirname, 'app/audio'),
      '@app/persistence': path.resolve(__dirname, 'app/persistence'),
      '@app/src': path.resolve(__dirname, 'app/src'),
      '@ketakketik/engine': path.resolve(__dirname, 'engine/src'),
    },
  },
  server: {
    port: 5173,
  },
  build: {
    outDir: 'dist',
  },
});
