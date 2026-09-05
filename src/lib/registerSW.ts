/**
 * Module:   src/lib/registerSW.ts
 * Project:  A Penny For Our Thoughts
 * Created:  September 2026 (MOBILE-5)
 * Summary:  Registers the minimal service worker that makes the app
 *           installable on Android. See public/sw.js for why it exists and
 *           why it deliberately does not cache.
 */

/**
 * Register the service worker.
 *
 * Deliberately a no-op in dev. A worker registered against the Vite dev server
 * intercepts HMR requests and produces confusing stale-module failures, and
 * installability is only meaningful for the deployed build anyway.
 *
 * Both paths are built from `import.meta.env.BASE_URL` rather than hard-coded.
 * The app is served from the `/A-Penny-For-Our-Thoughts/` subdirectory on
 * GitHub Pages, and a root-relative `/sw.js` would 404 there — the worker would
 * silently never register and the install prompt would never appear.
 */
export function registerServiceWorker(): void {
  if (import.meta.env.DEV) return;
  if (!('serviceWorker' in navigator)) return;

  const base = import.meta.env.BASE_URL;

  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${base}sw.js`, { scope: base }).catch((err: unknown) => {
      // A failed registration costs the install prompt, nothing else — the app
      // works normally. Warn rather than throw so it never breaks startup.
      console.warn('[penny] service worker registration failed', err);
    });
  });
}
