import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [vue(), tailwindcss()],

  // Serve from the project root (index.html lives here)
  root: '.',

  // Required for GitHub Pages subdirectory deployment:
  // https://brahimmahadi.github.io/A-Penny-For-Our-Thoughts/
  // Only affects `vite build` output — `vite dev` always uses '/'
  base: '/A-Penny-For-Our-Thoughts/',

  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },

  server: {
    port: 3000,
    open: true,
  },

  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },

  test: {
    globals: true,
    environment: 'jsdom',
    include: ['tests/**/*.{test,spec}.ts'],
    setupFiles: ['./tests/setup.ts'],
  },
});
