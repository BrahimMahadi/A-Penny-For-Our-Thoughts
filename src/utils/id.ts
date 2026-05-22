/**
 * Module:   utils/id.ts
 * Project:  A Penny For Our Thoughts
 * Created:  May 2026 (Vue 3 migration — Sprint 1)
 * Summary:  Unique identifier generation. Ported verbatim from
 *           legacy utils.js to preserve existing ID format so
 *           older localStorage data stays referenceable.
 */

/**
 * Generate a collision-resistant unique ID string.
 * Combines a base-36 random suffix with a base-36 timestamp.
 *
 * @returns A unique identifier (e.g. "k7f2zxm1n1mhz8c")
 */
export function genId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/**
 * Perform a deep clone of any JSON-serialisable value.
 * Uses JSON round-trip; `undefined`, `Function`, and `Symbol` values
 * are dropped by JSON.stringify.
 *
 * @param obj Value to clone.
 * @returns Independent deep copy.
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj)) as T;
}
