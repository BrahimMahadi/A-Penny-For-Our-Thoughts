/**
 * Module:   composables/useFormValidation.ts
 * Project:  A Penny For Our Thoughts
 * Created:  May 2026 (Sprint 13)
 * Summary:  Lightweight, field-level form validation composable.
 *           Tracks "touched" state per field so errors only appear
 *           after the user has interacted with a field (or clicked Save).
 *
 * Usage:
 *   const { errors, touch, touchAll, isValid } = useFormValidation(() => ({
 *     name: rules.required(form.name, 'Name'),
 *     amount: rules.positiveNumber(form.amount, 'Amount'),
 *   }));
 *
 *   // In template:
 *   <input @blur="touch('name')" ... />
 *   <p v-if="errors.name" class="field-error">{{ errors.name }}</p>
 *   <button :disabled="!isValid" @click="submit">Save</button>
 */

import { ref, computed, type ComputedRef } from 'vue';

// ─── Validator helpers ────────────────────────────────────────────

export const rules = {
  /**
   * Returns an error string if `value` is empty/null/undefined/whitespace,
   * otherwise `null` (no error).
   */
  required(value: string | number | null | undefined, label = 'This field'): string | null {
    if (value === null || value === undefined) return `${label} is required.`;
    if (typeof value === 'string' && value.trim() === '') return `${label} is required.`;
    return null;
  },

  /**
   * Returns an error string if `value` is not a finite number greater than 0.
   */
  positiveNumber(value: number | string | null | undefined, label = 'Amount'): string | null {
    const n = typeof value === 'string' ? parseFloat(value) : value;
    if (n === null || n === undefined || isNaN(n as number)) return `${label} must be a number.`;
    if ((n as number) <= 0) return `${label} must be greater than 0.`;
    return null;
  },

  /**
   * Returns an error string if `value` is not a finite number ≥ 0.
   */
  nonNegativeNumber(value: number | string | null | undefined, label = 'Amount'): string | null {
    const n = typeof value === 'string' ? parseFloat(value) : value;
    if (n === null || n === undefined || isNaN(n as number)) return `${label} must be a number.`;
    if ((n as number) < 0) return `${label} must be 0 or more.`;
    return null;
  },

  /**
   * Returns an error string if `value` is not a valid YYYY-MM string
   * representing a future month (or the current month).
   */
  futureMonth(value: string | null | undefined, label = 'Target date'): string | null {
    if (!value || typeof value !== 'string' || !/^\d{4}-\d{2}$/.test(value)) {
      return `${label} must be in YYYY-MM format.`;
    }
    const now = new Date();
    const currentYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    if (value < currentYM) return `${label} must be in the current or a future month.`;
    return null;
  },

  /**
   * Returns an error if `balance` exceeds `limit`.
   */
  notExceedsLimit(balance: number, limit: number, label = 'Balance'): string | null {
    if (balance > limit) return `${label} cannot exceed the limit.`;
    return null;
  },

  /**
   * Returns an error if `remaining` exceeds `original`.
   */
  notExceedsOriginal(remaining: number, original: number): string | null {
    if (remaining > original) return 'Remaining balance cannot exceed the original balance.';
    return null;
  },
};

// ─── Composable ───────────────────────────────────────────────────

/**
 * Maps field names to error strings (or null when the field is valid).
 */
export type ValidationErrors<K extends string> = Record<K, string | null>;

/**
 * @param buildErrors  Reactive thunk that returns a Record<fieldName, errorOrNull>.
 *                     Called as a computed getter, so it re-evaluates on dependency changes.
 */
export function useFormValidation<K extends string>(
  buildErrors: () => ValidationErrors<K>,
) {
  // Use `string` internally to avoid TypeScript UnwrapRefSimple complications
  const touched = ref<Set<string>>(new Set());

  // Full error map (ignoring touched state) — used at submit time
  const allErrors: ComputedRef<ValidationErrors<K>> = computed(buildErrors);

  // Visible errors — only show for touched fields
  const errors: ComputedRef<ValidationErrors<K>> = computed(() => {
    const result = {} as ValidationErrors<K>;
    for (const key in allErrors.value) {
      result[key as K] = touched.value.has(key) ? allErrors.value[key as K] : null;
    }
    return result;
  });

  /** Mark one field as interacted — its error becomes visible */
  function touch(field: K): void {
    const next = new Set(touched.value);
    next.add(field);
    touched.value = next;
  }

  /** Mark all fields as touched — used just before a Save attempt */
  function touchAll(): void {
    touched.value = new Set(Object.keys(allErrors.value));
  }

  /** Reset touched state (e.g. after form is closed/reset) */
  function reset(): void {
    touched.value = new Set<string>();
  }

  /** True when there are no errors (regardless of touched state) */
  const isValid: ComputedRef<boolean> = computed(() =>
    Object.values(allErrors.value).every(e => e === null),
  );

  return { errors, touch, touchAll, reset, isValid };
}
