/**
 * Module:   utils/dom.ts
 * Project:  A Penny For Our Thoughts
 * Created:  May 2026 (Vue 3 migration — Sprint 1)
 * Summary:  Browser-only helpers that read computed styles or
 *           dispatch toast notifications. Safe to call before
 *           the DOM is ready — they no-op on missing nodes.
 */

/**
 * Read a CSS custom property value from the document root at call-time.
 * Useful for reading theme-aware values (e.g. --accent) inside JS at render time.
 *
 * @param name CSS variable name including the '--' prefix (e.g. '--accent').
 * @returns The trimmed property value (e.g. '#4ade80').
 */
export function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/**
 * Convert a 6-digit hex colour string and an alpha value into an rgba() string.
 * Used to compose translucent colours from CSS variable values at render time.
 *
 * @param hex 6-digit hex colour (e.g. '#4ade80' or '4ade80').
 * @param alpha Alpha channel 0–1 (e.g. 0.15).
 * @returns CSS rgba() string (e.g. 'rgba(74,222,128,0.15)').
 */
export function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/** Toast visual variant */
export type ToastType = 'success' | 'danger' | 'info';

/**
 * Display a self-dismissing toast notification at the bottom-right of the screen.
 * Appends a toast element to #toast-container, animates it in, then removes it
 * after 2.5 s via an exit animation. Safe to call before the DOM is ready —
 * silently no-ops if the container is absent.
 *
 * NOTE: Sprint 2 introduces a `<ToastContainer />` Vue component that replaces
 * this imperative helper. Keep this function around until composable+component
 * adoption is complete.
 *
 * @param message Text to display in the toast.
 * @param type Visual variant.
 */
export function showToast(message: string, type: ToastType = 'success'): void {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.setAttribute('role', 'status');
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('toast--out');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
  }, 2500);
}
