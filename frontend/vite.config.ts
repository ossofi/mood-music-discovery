/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    port: 5173,
    // Real backend (Docker Compose): the SPA calls /api/v1/... on its own origin.
    proxy: { '/api': { target: 'http://localhost:8080', changeOrigin: true } },
    fs: { allow: ['..'] },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (!id.includes('node_modules')) return undefined;
          if (/node_modules\/(react|react-dom|react-router|react-router-dom|scheduler)\//.test(id))
            return 'react';
          if (/node_modules\/(@tanstack|zustand)\//.test(id)) return 'data';
          if (/node_modules\/(react-hook-form|zod|@hookform)\//.test(id)) return 'forms';
          return undefined;
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    env: { VITE_API_BASE: 'http://localhost/api/v1', VITE_API_MOCK: 'false' },
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
