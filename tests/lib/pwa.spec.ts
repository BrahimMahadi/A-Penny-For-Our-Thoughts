/**
 * Module:   tests/lib/pwa.spec.ts
 * Project:  A Penny For Our Thoughts
 * Created:  September 2026 (MOBILE-5)
 * Summary:  Guards the PWA install surface.
 *
 *           Every failure mode here is SILENT in production: a root-relative
 *           manifest path 404s under the GitHub Pages subdirectory and the
 *           install prompt simply never appears, with no console error and
 *           nothing visibly broken. These assertions are the only thing
 *           standing between a typo and an app that quietly stops being
 *           installable.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(__dirname, '../..');
const read = (rel: string): string => readFileSync(resolve(root, rel), 'utf8');

const BASE = '/A-Penny-For-Our-Thoughts/';

const manifest = JSON.parse(read('public/manifest.webmanifest')) as {
  name: string;
  short_name: string;
  start_url: string;
  scope: string;
  display: string;
  theme_color: string;
  background_color: string;
  icons: { src: string; sizes: string; type: string; purpose?: string }[];
};
const indexHtml = read('index.html');
const appVue = read('src/App.vue');
const sw = read('public/sw.js');

describe('PWA manifest', () => {
  it('declares the fields Chrome requires for installability', () => {
    expect(manifest.name).toBeTruthy();
    expect(manifest.short_name).toBeTruthy();
    expect(manifest.start_url).toBeTruthy();
    expect(manifest.display).toBe('standalone');
  });

  it('carries the GitHub Pages base in start_url and scope', () => {
    // Root-relative values here 404 in production and installability dies
    // silently — the single most likely way this ships broken.
    expect(manifest.start_url).toBe(BASE);
    expect(manifest.scope).toBe(BASE);
  });

  it('points every icon at a base-prefixed path that exists on disk', () => {
    expect(manifest.icons.length).toBeGreaterThan(0);
    for (const icon of manifest.icons) {
      expect(icon.src.startsWith(BASE)).toBe(true);
      // public/ is copied to the dist root, so strip the base to get the file.
      const onDisk = resolve(root, 'public', icon.src.slice(BASE.length));
      expect(existsSync(onDisk), `${icon.src} missing on disk`).toBe(true);
    }
  });

  it('provides the 192 and 512 sizes Chrome checks for', () => {
    const sizes = manifest.icons.map((i) => i.sizes);
    expect(sizes).toContain('192x192');
    expect(sizes).toContain('512x512');
  });

  it('provides a maskable icon so Android does not letterbox the mark', () => {
    const maskable = manifest.icons.filter((i) => i.purpose === 'maskable');
    expect(maskable.length).toBeGreaterThan(0);
    expect(maskable[0].sizes).toBe('512x512');
  });

  it('uses the dark --bg token for theme and background colour', () => {
    expect(manifest.theme_color).toBe('#0d0d12');
    expect(manifest.background_color).toBe('#0d0d12');
  });
});

describe('PWA meta tags in index.html', () => {
  it('links the manifest with the base prefix', () => {
    expect(indexHtml).toContain(`href="${BASE}manifest.webmanifest"`);
  });

  it('links a base-prefixed apple-touch-icon that exists', () => {
    expect(indexHtml).toContain(`href="${BASE}icons/apple-touch-icon-180.png"`);
    expect(existsSync(resolve(root, 'public/icons/apple-touch-icon-180.png'))).toBe(true);
  });

  it('declares a theme-color for each colour scheme', () => {
    expect(indexHtml).toContain('name="theme-color" content="#f3f4f7" media="(prefers-color-scheme: light)"');
    expect(indexHtml).toContain('name="theme-color" content="#0d0d12" media="(prefers-color-scheme: dark)"');
  });

  it('declares the apple standalone metas', () => {
    expect(indexHtml).toContain('name="apple-mobile-web-app-capable" content="yes"');
    expect(indexHtml).toContain('name="apple-mobile-web-app-title" content="Penny"');
  });

  it('keeps viewport-fit=cover so safe-area insets resolve', () => {
    // Without this, env(safe-area-inset-*) reports 0 and the 11 existing
    // safe-area rules silently become no-ops on notched devices.
    expect(indexHtml).toContain('viewport-fit=cover');
  });

  it('has no root-relative PWA asset references left behind', () => {
    // Catches href="/icons/..." or href="/manifest..." — valid-looking paths
    // that 404 under the Pages subdirectory.
    expect(indexHtml).not.toMatch(/href="\/(icons|manifest|sw\.js)/);
  });
});

describe('service worker', () => {
  it('registers a fetch handler — the reason it exists', () => {
    // Chrome will not fire beforeinstallprompt without one.
    expect(sw).toContain("addEventListener('fetch'");
    expect(sw).toContain('respondWith');
  });

  it('does not cache — installability only, not offline support', () => {
    // If this ever fails, someone added caching without the versioning and
    // invalidation story. That belongs in ROADMAP item F, not here: a stale
    // cache on a Pages deploy is unrecoverable by refresh. See public/sw.js.
    expect(sw).not.toMatch(/caches\.(open|match|addAll)/);
  });

  it('claims clients so an installed user is not pinned to an old worker', () => {
    expect(sw).toContain('skipWaiting');
    expect(sw).toContain('clients.claim');
  });
});

describe('safe-area insets (BUG-040)', () => {
  it('reserves top inset on .app-main for the translucent status bar', () => {
    // index.html sets viewport-fit=cover AND
    // apple-mobile-web-app-status-bar-style: black-translucent, so an installed
    // PWA draws under the status bar. Without a top inset the first child — the
    // What's New banner — sits behind the clock and notch. The app had no
    // safe-area-inset-top rule at all before this.
    expect(appVue).toContain('env(safe-area-inset-top');
  });

  it('keeps the translucent status bar style the inset compensates for', () => {
    // If this is ever changed to `default`, the top inset becomes unnecessary
    // padding — the two settings must move together.
    expect(indexHtml).toContain('content="black-translucent"');
  });

  it('still reserves bottom inset for the home indicator', () => {
    expect(appVue).toContain('env(safe-area-inset-bottom');
  });
});
