import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [tailwindcss()],
  // Serve from the project root (index.html lives here)
  root: '.',

  // Required for GitHub Pages subdirectory deployment:
  // https://brahimmahadi.github.io/A-Penny-For-Our-Thoughts/
  // Only affects `vite build` output — `vite dev` always uses '/'
  base: '/A-Penny-For-Our-Thoughts/',

  server: {
    port: 3000,
    open: true,
  },

  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
});
