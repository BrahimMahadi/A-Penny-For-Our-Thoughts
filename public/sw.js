/**
 * Module:   public/sw.js
 * Project:  A Penny For Our Thoughts
 * Created:  September 2026 (MOBILE-5)
 * Summary:  Minimal service worker — installability only, NOT offline support.
 *
 *           Chrome/Android will not fire `beforeinstallprompt` unless a service
 *           worker with a `fetch` handler is registered. iOS "Add to Home
 *           Screen" needs no worker at all. This file exists to satisfy that
 *           one requirement and nothing more.
 *
 *           DELIBERATELY DOES NOT CACHE. The handler is pass-through: every
 *           request goes to the network exactly as it would without a worker.
 *           Adding a cache here without a versioning and invalidation strategy
 *           is how a PWA starts serving a stale build that users cannot escape
 *           by refreshing — the app is deployed to GitHub Pages on every merge,
 *           so that failure mode would be frequent and hard to diagnose.
 *
 *           Real offline support (precaching the app shell plus the Chart.js
 *           and Google Fonts CDN assets, with cache versioning and an update
 *           prompt) is tracked separately as ROADMAP item F, "PWA / Offline
 *           Support". Do that work there, not by quietly growing this file.
 */

// Take over from any previous worker immediately rather than waiting for every
// tab to close. With no cache to migrate this is safe, and it means a user who
// installed an older build is not pinned to a stale worker.
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

/**
 * Pass-through fetch handler.
 *
 * Its presence — not its behaviour — is what makes the app installable. We call
 * `respondWith` so the handler is unambiguously "used" from the browser's point
 * of view; returning nothing would let some engines treat the worker as having
 * no fetch handler at all.
 */
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});
