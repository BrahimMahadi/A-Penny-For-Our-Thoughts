/* ═══════════════════════════════════════════════════════════════
   Module:   utils.js
   Project:  A Penny For Our Thoughts
   Created:  May 2026
   Summary:  Pure helper functions with no side effects or
             dependencies on other modules. Safe to load first.
   Functions: genId, fmt, pct, daysUntil, monthlyAmount,
              deepClone, csvEscape, parseCSVRow
═══════════════════════════════════════════════════════════════ */

/** Generate a stable unique ID */
function genId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/** Format a number as Canadian dollar string */
function fmt(n) {
  return '$' + Number(n).toLocaleString('en-CA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Return percentage of a relative to b, as a string */
function pct(a, b) {
  return b > 0 ? Math.min(100, (a / b) * 100).toFixed(1) : '0.0';
}

/** Return days until a YYYY-MM-DD date string (negative = past) */
function daysUntil(dateStr) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((new Date(dateStr + 'T00:00:00') - now) / 86400000);
}

/** Return monthly cost for an expense item (bi-weekly items × 2) */
function monthlyAmount(item) {
  return item.biweekly ? item.amount * 2 : item.amount;
}

function deepClone(obj) { return JSON.parse(JSON.stringify(obj)); }

/** Escape a value for safe CSV embedding (RFC 4180) */
function csvEscape(val) {
  const s = String(val ?? '');
  return s.includes(',') || s.includes('"') || s.includes('\n')
    ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Parse a single CSV row into an array of field strings */
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
