/* ═══════════════════════════════════════════════════════════════
   Module:   utils.js
   Project:  A Penny For Our Thoughts
   Created:  May 2026
   Summary:  Pure helper functions with no side effects or
             dependencies on other modules. Safe to load first.
   Functions: genId, fmt, pct, daysUntil, monthlyAmount,
              deepClone, csvEscape, parseCSVRow, showToast
═══════════════════════════════════════════════════════════════ */

/**
 * Generate a collision-resistant unique ID string.
 * Combines a base-36 random suffix with a base-36 timestamp.
 *
 * @returns {string} A unique identifier (e.g. "k7f2zxm1n1mhz8c")
 */
export function genId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/**
 * Format a number as a Canadian dollar string with exactly 2 decimal places.
 * Uses `en-CA` locale grouping (e.g. $1,234.50).
 *
 * @param {number|string} n - The numeric value to format.
 * @returns {string} Dollar-prefixed string (e.g. "$1,234.50").
 */
export function fmt(n) {
  return '$' + Number(n).toLocaleString('en-CA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Return the percentage of `a` relative to `b`, capped at 100 %.
 * Returns "0.0" when `b` is zero to avoid division by zero.
 *
 * @param {number} a - The part value.
 * @param {number} b - The total value.
 * @returns {string} Percentage string with one decimal place (e.g. "72.5").
 */
export function pct(a, b) {
  return b > 0 ? Math.min(100, (a / b) * 100).toFixed(1) : '0.0';
}

/**
 * Return the number of whole days from today (midnight local) until a date string.
 * Negative values indicate the date is in the past.
 *
 * @param {string} dateStr - ISO date string in "YYYY-MM-DD" format.
 * @returns {number} Signed integer day count (negative = past).
 */
export function daysUntil(dateStr) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((new Date(dateStr + 'T00:00:00') - now) / 86400000);
}

/**
 * Return the effective monthly dollar cost for a single expense item.
 * Bi-weekly items are paid twice per month, so their amount is doubled.
 *
 * @param {{ amount: number, biweekly?: boolean }} item - Expense item object.
 * @returns {number} Monthly cost in dollars.
 */
export function monthlyAmount(item) {
  return item.biweekly ? item.amount * 2 : item.amount;
}

/**
 * Perform a deep clone of any JSON-serialisable value.
 * Uses JSON round-trip; `undefined`, `Function`, and `Symbol` values
 * are dropped by JSON.stringify.
 *
 * @template T
 * @param {T} obj - Value to clone.
 * @returns {T} Independent deep copy.
 */
export function deepClone(obj) { return JSON.parse(JSON.stringify(obj)); }

/**
 * Escape a value for safe embedding inside a CSV field (RFC 4180).
 * Wraps the value in double-quotes only when necessary (contains a comma,
 * double-quote, or newline).  Existing double-quotes are doubled.
 *
 * @param {*} val - Any value; coerced to string via `String(val ?? '')`.
 * @returns {string} Safely escaped CSV field (may or may not be quoted).
 *
 * @example
 * csvEscape('hello')         // 'hello'
 * csvEscape('a,b')           // '"a,b"'
 * csvEscape('say "hi"')      // '"say ""hi"""'
 */
export function csvEscape(val) {
  const s = String(val ?? '');
  return s.includes(',') || s.includes('"') || s.includes('\n')
    ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * Read a CSS custom property value from the document root at call-time.
 * Useful for reading theme-aware values (e.g. --accent) inside JS at render time.
 *
 * @param {string} name - CSS variable name including the '--' prefix (e.g. '--accent').
 * @returns {string} The trimmed property value (e.g. '#4ade80').
 */
export function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/**
 * Convert a 6-digit hex colour string and an alpha value into an rgba() string.
 * Used to compose translucent colours from CSS variable values at render time.
 *
 * @param {string} hex   - 6-digit hex colour (e.g. '#4ade80' or '4ade80').
 * @param {number} alpha - Alpha channel 0–1 (e.g. 0.15).
 * @returns {string} CSS rgba() string (e.g. 'rgba(74,222,128,0.15)').
 */
export function hexToRgba(hex, alpha) {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/**
 * Parse a single CSV row string into an array of field strings.
 * Handles RFC 4180 quoting rules: quoted fields may contain commas and
 * newlines; doubled double-quotes are unescaped to a single double-quote.
 *
 * @param {string} row - A single CSV row (no trailing newline).
 * @returns {string[]} Array of raw field values (not trimmed).
 *
 * @example
 * parseCSVRow('a,b,c')         // ['a', 'b', 'c']
 * parseCSVRow('"a,b",c')       // ['a,b', 'c']
 * parseCSVRow('"say ""hi"""')  // ['say "hi"']
 */
export function parseCSVRow(row) {
  const fields = [];
  let cur = '', inQ = false;

  for (let i = 0; i < row.length; i++) {
    const ch = row[i];
    if (ch === '"') {
      if (inQ && row[i + 1] === '"') { cur += '"'; i++; }
      else inQ = !inQ;
    } else if (ch === ',' && !inQ) {
      fields.push(cur); cur = '';
    } else {
      cur += ch;
    }
  }
  fields.push(cur);
  return fields;
}

/**
 * Display a self-dismissing toast notification at the bottom-right of the screen.
 * Appends a toast element to #toast-container, animates it in, then removes it
 * after 2.5 s via an exit animation.  Safe to call before the DOM is ready —
 * silently no-ops if the container is absent.
 *
 * @param {string} message          - Text to display in the toast.
 * @param {'success'|'danger'|'info'} [type='success'] - Visual variant.
 * @returns {void}
 */
export function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.setAttribute('role', 'status');
  toast.textContent = message;
  container.appendChild(toast);

  // Begin exit animation after 2.5 s, then remove from DOM once it finishes
  setTimeout(() => {
    toast.classList.add('toast--out');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
  }, 2500);
}
