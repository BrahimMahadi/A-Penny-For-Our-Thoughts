/**
 * Module:   utils/date.ts
 * Project:  A Penny For Our Thoughts
 * Created:  May 2026 (Vue 3 migration — Sprint 1)
 * Summary:  Date arithmetic helpers. Pure functions; no DOM access.
 */

import type { ISODate, ISOMonth } from '../types/budget';

/**
 * Return the number of whole days from today (midnight local) until a date string.
 * Negative values indicate the date is in the past.
 *
 * @param dateStr ISO date string in "YYYY-MM-DD" format.
 * @returns Signed integer day count (negative = past).
 */
export function daysUntil(dateStr: ISODate): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + 'T00:00:00');
  return Math.round((target.getTime() - now.getTime()) / 86400000);
}

/**
 * Return the effective monthly dollar cost for a single expense item.
 * Bi-weekly items are paid twice per month, so their amount is doubled.
 *
 * @param item Object with at least `{ amount, biweekly? }`.
 * @returns Monthly cost in dollars.
 */
export function monthlyAmount(item: { amount: number; biweekly?: boolean }): number {
  return item.biweekly ? item.amount * 2 : item.amount;
}

/**
 * Calculate the integer number of months between two 'YYYY-MM' strings.
 * Result is `endDate - startDate`; negative when end is before start.
 *
 * @param startDate Start month 'YYYY-MM'
 * @param endDate End month 'YYYY-MM'
 * @returns Months between (can be negative).
 */
export function calculateMonthsBetween(startDate: ISOMonth, endDate: ISOMonth): number {
  const [sy, sm] = startDate.split('-').map(Number);
  const [ey, em] = endDate.split('-').map(Number);
  return (ey - sy) * 12 + (em - sm);
}

/**
 * Build a 'YYYY-MM' key from a Date object.
 *
 * @param d Date object.
 * @returns 'YYYY-MM' string in local time.
 */
export function toMonthKey(d: Date): ISOMonth {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Build a 'YYYY-MM-DD' key from a Date object.
 *
 * @param d Date object.
 * @returns 'YYYY-MM-DD' string in local time.
 */
export function toDateKey(d: Date): ISODate {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
