/**
 * Module:   utils/format.ts
 * Project:  A Penny For Our Thoughts
 * Created:  May 2026 (Vue 3 migration — Sprint 1)
 * Summary:  Number, currency, and percentage formatters. All return
 *           strings ready for direct DOM insertion.
 */

/**
 * Format a number as a Canadian dollar string with exactly 2 decimal places.
 * Uses `en-CA` locale grouping (e.g. $1,234.50). Negative values are
 * formatted with the sign BEFORE the dollar symbol (-$42.50) — this
 * matches standard English convention and differs from the legacy
 * `utils.js#fmt` which produced "$-42.50".
 *
 * @param n The numeric value to format.
 * @returns Dollar-prefixed string (e.g. "$1,234.50" or "-$42.50").
 */
export function fmt(n: number | string): string {
  const num = Number(n);
  const abs = Math.abs(num).toLocaleString('en-CA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return num < 0 ? `-$${abs}` : `$${abs}`;
}

/**
 * Return the percentage of `a` relative to `b`, capped at 100 %.
 * Returns "0.0" when `b` is zero to avoid division by zero.
 *
 * @param a The part value.
 * @param b The total value.
 * @returns Percentage string with one decimal place (e.g. "72.5").
 */
export function pct(a: number, b: number): string {
  return b > 0 ? Math.min(100, (a / b) * 100).toFixed(1) : '0.0';
}
