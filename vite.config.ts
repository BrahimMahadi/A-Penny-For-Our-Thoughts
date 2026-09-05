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
  //
  // Applies to BOTH `vite build` AND `vite dev` — the dev server serves the app
  // at http://localhost:3000/A-Penny-For-Our-Thoughts/, and the bare root path
  // returns a blank page. (An earlier comment here claimed dev always used '/',
  // which is wrong; corrected in MOBILE-5 after it cost a debugging round.)
  //
  // Anything referencing an asset by absolute path — the PWA manifest, its
  // icons, the service worker — must carry this prefix or it 404s in
  // production. See public/manifest.webmanifest and src/lib/registerSW.ts,
  // which builds its paths from import.meta.env.BASE_URL for exactly this
  // reason. tests/lib/pwa.spec.ts guards it.
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
    setupFiles: ['./tests/setupStorage.ts', './tests/setup.ts'],
  },
});
