import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  css: {
    transformer: 'postcss'
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
  },
  build: {
    sourcemap: false,  // ← ОТКЛЮЧАЕТ SOURCEMAP
    outDir: 'dist/public',
    emptyOutDir: true,
  },
});