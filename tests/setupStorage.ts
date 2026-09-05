/**
 * Module:   tests/setupStorage.ts
 * Project:  A Penny For Our Thoughts
 * Created:  September 2026 (BUG-037 — Node 26 shadows jsdom's localStorage)
 * Summary:  Publishes working Web Storage globals for the jsdom test env.
 *
 *           Node 22+ ships an experimental global `localStorage` /
 *           `sessionStorage` accessor pair. Without the `--localstorage-file`
 *           flag those getters resolve to `undefined` — but the properties
 *           still EXIST on `globalThis`. Vitest 1.x's jsdom environment only
 *           copies a window key onto the global when the global does not
 *           already define one, so from Node 22 onward jsdom's Storage objects
 *           are never published and every `localStorage.*` call in a spec
 *           throws `Cannot read properties of undefined`.
 *
 *           Under `globals: true`, `window`, `document.defaultView` and
 *           `globalThis` are all the SAME populated object, so the real jsdom
 *           Storage is unreachable from the test context. We therefore stand
 *           up a throwaway JSDOM instance purely to borrow its spec-compliant
 *           Storage implementations (correct `length`, `key(n)`, value
 *           stringification and quota behaviour) and define those on the
 *           global, replacing Node's inert accessors.
 *
 *           The borrowed instances come from a different jsdom realm than the
 *           test environment's own, so we publish that realm's `Storage`
 *           constructor alongside them. Without it `Storage.prototype` and
 *           `localStorage`'s prototype are two different objects, and specs
 *           that stub quota errors via `vi.spyOn(Storage.prototype, 'setItem')`
 *           silently fail to intercept.
 *
 *           This file must be the FIRST entry in `test.setupFiles` so the
 *           shim is in place before any module that reads storage at import
 *           time is evaluated.
 *
 *           Remove once the toolchain is on Vitest 3+, which publishes the
 *           jsdom globals unconditionally. See docs/BUGS.md → BUG-037.
 */

import { JSDOM } from 'jsdom';

const STORAGE_KEYS = ['localStorage', 'sessionStorage'] as const;

// Node only shadows SOME of these (v26: `localStorage` only), so a per-key
// decision would leave the realm split — one store from jsdom's environment,
// the other from ours, with only one matching the `Storage` global. Decide
// once for the whole group instead: if any key is missing, republish all of
// them, plus the constructor, from a single realm.
const needsShim = STORAGE_KEYS.some((key) => !globalThis[key]);

if (needsShim) {
  // A `url` is required — jsdom refuses to create Storage for an opaque origin.
  const storageHost = new JSDOM('', { url: 'http://localhost' }).window;

  for (const key of STORAGE_KEYS) {
    Object.defineProperty(globalThis, key, {
      value: storageHost[key],
      writable: true,
      configurable: true,
      enumerable: true,
    });
  }

  // Keep the realm self-consistent: `localStorage instanceof Storage` must
  // hold, and `Storage.prototype` must be the object the published instances
  // inherit from, or prototype-level spies won't reach them.
  Object.defineProperty(globalThis, 'Storage', {
    value: storageHost.Storage,
    writable: true,
    configurable: true,
    enumerable: false,
  });
}
