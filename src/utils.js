/* ═══════════════════════════════════════════════════════════════
   Module:   utils.js
   Project:  A Penny For Our Thoughts
   Created:  May 2026
   Summary:  Pure helper functions with no side effects or
             dependencies on other modules. Safe to load first.
   Functions: genId, fmt, pct, daysUntil, monthlyAmount,
              deepClone, csvEscape, parseCSVRow
═══════════════════════════════════════════════════════════════ */

/**
 * Generate a collision-resistant unique ID string.
 * Combines a base-36 random suffix with a base-36 timestamp.
 *
 * @returns {string} A unique identifier (e.g. "k7f2zxm1n1mhz8c")
 */
function genId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/**
 * Format a number as a Canadian dollar string with exactly 2 decimal places.
 * Uses `en-CA` locale grouping (e.g. $1,234.50).
 *
 * @param {number|string} n - The numeric value to format.
 * @returns {string} Dollar-prefixed string (e.g. "$1,234.50").
 */
function fmt(n) {
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
function pct(a, b) {
  return b > 0 ? Math.min(100, (a / b) * 100).toFixed(1) : '0.0';
}

/**
 * Return the number of whole days from today (midnight local) until a date string.
 * Negative values indicate the date is in the past.
 *
 * @param {string} dateStr - ISO date string in "YYYY-MM-DD" format.
 * @returns {number} Signed integer day count (negative = past).
 */
function daysUntil(dateStr) {
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
function monthlyAmount(item) {
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
function deepClone(obj) { return JSON.parse(JSON.stringify(obj)); }

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
function csvEscape(val) {
  const s = String(val ?? '');
  return s.includes(',') || s.includes('"') || s.includes('\n')
    ? `"${s.replace(/"/g, '""')}"` : s;
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
function parseCSVRow(row) {
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
