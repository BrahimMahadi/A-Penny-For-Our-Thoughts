import { defineConfig } from 'vite';

export default defineConfig({
  // Serve from the project root (index.html lives here)
  root: '.',

  server: {
    port: 3000,
    open: true,
  },

  build: {
    outDir: 'dist',
    // Keep relative asset paths — important for the localStorage-only app
    assetsDir: 'assets',
  },
});
