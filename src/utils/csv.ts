/**
 * Module:   utils/csv.ts
 * Project:  A Penny For Our Thoughts
 * Created:  May 2026 (Vue 3 migration — Sprint 1)
 * Summary:  RFC 4180 CSV escape and parse helpers.
 */

/**
 * Escape a value for safe embedding inside a CSV field (RFC 4180).
 * Wraps the value in double-quotes only when necessary (contains a comma,
 * double-quote, or newline). Existing double-quotes are doubled.
 *
 * @param val Any value; coerced to string via `String(val ?? '')`.
 * @returns Safely escaped CSV field (may or may not be quoted).
 *
 * @example
 * csvEscape('hello')         // 'hello'
 * csvEscape('a,b')           // '"a,b"'
 * csvEscape('say "hi"')      // '"say ""hi"""'
 */
export function csvEscape(val: unknown): string {
  const s = String(val ?? '');
  return s.includes(',') || s.includes('"') || s.includes('\n')
    ? `"${s.replace(/"/g, '""')}"`
    : s;
}

/**
 * Parse a single CSV row string into an array of field strings.
 * Handles RFC 4180 quoting rules: quoted fields may contain commas and
 * newlines; doubled double-quotes are unescaped to a single double-quote.
 *
 * @param row A single CSV row (no trailing newline).
 * @returns Array of raw field values (not trimmed).
 *
 * @example
 * parseCSVRow('a,b,c')         // ['a', 'b', 'c']
 * parseCSVRow('"a,b",c')       // ['a,b', 'c']
 * parseCSVRow('"say ""hi"""')  // ['say "hi"']
 */
export function parseCSVRow(row: string): string[] {
  const fields: string[] = [];
  let cur = '';
  let inQ = false;

  for (let i = 0; i < row.length; i++) {
    const ch = row[i];
    if (ch === '"') {
      if (inQ && row[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQ = !inQ;
      }
    } else if (ch === ',' && !inQ) {
      fields.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  fields.push(cur);
  return fields;
}
