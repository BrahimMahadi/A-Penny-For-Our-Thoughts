/**
 * Tests for src/composables/useFormValidation.ts
 * Covers: rules helpers and useFormValidation composable
 */

import { describe, it, expect } from 'vitest';
import { reactive } from 'vue';
import { rules, useFormValidation } from '@/composables/useFormValidation';

// ─── rules ───────────────────────────────────────────────────────────────────

describe('rules.required', () => {
  it('returns null for a non-empty string', () => {
    expect(rules.required('hello')).toBeNull();
  });

  it('returns an error for an empty string', () => {
    expect(rules.required('')).toMatch(/required/i);
  });

  it('returns an error for a whitespace-only string', () => {
    expect(rules.required('   ')).toMatch(/required/i);
  });

  it('returns an error for null', () => {
    expect(rules.required(null)).toMatch(/required/i);
  });

  it('returns an error for undefined', () => {
    expect(rules.required(undefined)).toMatch(/required/i);
  });

  it('includes the custom label in the error', () => {
    expect(rules.required('', 'Name')).toContain('Name');
  });

  it('returns null for numeric 0 (zero is a value)', () => {
    // 0 is a valid number — required only rejects null/undefined/empty string
    expect(rules.required(0)).toBeNull();
  });
});

describe('rules.positiveNumber', () => {
  it('returns null for a positive number', () => {
    expect(rules.positiveNumber(42)).toBeNull();
  });

  it('returns null for a positive float', () => {
    expect(rules.positiveNumber(0.01)).toBeNull();
  });

  it('returns an error for zero', () => {
    expect(rules.positiveNumber(0)).toMatch(/greater than 0/i);
  });

  it('returns an error for a negative number', () => {
    expect(rules.positiveNumber(-5)).toMatch(/greater than 0/i);
  });

  it('returns an error for NaN', () => {
    expect(rules.positiveNumber(NaN)).toMatch(/must be a number/i);
  });

  it('returns an error for null', () => {
    expect(rules.positiveNumber(null)).toMatch(/must be a number/i);
  });

  it('parses a valid numeric string', () => {
    expect(rules.positiveNumber('10.5')).toBeNull();
  });

  it('returns an error for a non-numeric string', () => {
    expect(rules.positiveNumber('abc')).toMatch(/must be a number/i);
  });

  it('includes the custom label in the error', () => {
    expect(rules.positiveNumber(0, 'Monthly payment')).toContain('Monthly payment');
  });
});

describe('rules.nonNegativeNumber', () => {
  it('returns null for zero', () => {
    expect(rules.nonNegativeNumber(0)).toBeNull();
  });

  it('returns null for a positive number', () => {
    expect(rules.nonNegativeNumber(100)).toBeNull();
  });

  it('returns an error for a negative number', () => {
    expect(rules.nonNegativeNumber(-1)).toMatch(/0 or more/i);
  });

  it('returns an error for NaN', () => {
    expect(rules.nonNegativeNumber(NaN)).toMatch(/must be a number/i);
  });

  it('parses a valid numeric string', () => {
    expect(rules.nonNegativeNumber('0')).toBeNull();
  });

  it('includes the custom label in the error', () => {
    expect(rules.nonNegativeNumber(-1, 'Remaining balance')).toContain('Remaining balance');
  });
});

describe('rules.futureMonth', () => {
  /** Returns a YYYY-MM string relative to today */
  function relativeMonth(offsetMonths: number): string {
    const d = new Date();
    d.setMonth(d.getMonth() + offsetMonths);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  it('returns null for the current month', () => {
    expect(rules.futureMonth(relativeMonth(0))).toBeNull();
  });

  it('returns null for a future month', () => {
    expect(rules.futureMonth(relativeMonth(6))).toBeNull();
  });

  it('returns an error for a past month', () => {
    expect(rules.futureMonth(relativeMonth(-1))).toMatch(/current or a future month/i);
  });

  it('returns an error for null', () => {
    expect(rules.futureMonth(null)).toMatch(/YYYY-MM/i);
  });

  it('returns an error for a malformed string', () => {
    expect(rules.futureMonth('Dec-2026')).toMatch(/YYYY-MM/i);
  });

  it('includes the custom label', () => {
    expect(rules.futureMonth(null, 'Target date')).toContain('Target date');
  });
});

describe('rules.notExceedsLimit', () => {
  it('returns null when balance is below the limit', () => {
    expect(rules.notExceedsLimit(500, 1000)).toBeNull();
  });

  it('returns null when balance equals the limit', () => {
    expect(rules.notExceedsLimit(1000, 1000)).toBeNull();
  });

  it('returns an error when balance exceeds the limit', () => {
    expect(rules.notExceedsLimit(1001, 1000)).toMatch(/cannot exceed/i);
  });

  it('includes the custom label', () => {
    expect(rules.notExceedsLimit(1001, 1000, 'Balance')).toContain('Balance');
  });
});

describe('rules.notExceedsOriginal', () => {
  it('returns null when remaining is less than original', () => {
    expect(rules.notExceedsOriginal(500, 1000)).toBeNull();
  });

  it('returns null when remaining equals original', () => {
    expect(rules.notExceedsOriginal(1000, 1000)).toBeNull();
  });

  it('returns an error when remaining exceeds original', () => {
    expect(rules.notExceedsOriginal(1001, 1000)).toMatch(/cannot exceed/i);
  });
});

// ─── useFormValidation composable ────────────────────────────────────────────

describe('useFormValidation', () => {
  it('starts with no visible errors (nothing touched)', () => {
    const form = { name: '' };
    const v = useFormValidation(() => ({
      name: rules.required(form.name, 'Name'),
    }));
    expect(v.errors.value.name).toBeNull();
  });

  it('shows error after touch() for an invalid field', () => {
    const form = { name: '' };
    const v = useFormValidation(() => ({
      name: rules.required(form.name, 'Name'),
    }));
    v.touch('name');
    expect(v.errors.value.name).toMatch(/required/i);
  });

  it('clears the error when the value becomes valid after touch', () => {
    // Must use reactive() so Vue's computed() tracks the dependency
    const form = reactive({ name: '' });
    const v = useFormValidation(() => ({
      name: rules.required(form.name, 'Name'),
    }));
    v.touch('name');
    expect(v.errors.value.name).not.toBeNull();
    form.name = 'Alice';
    // computed re-evaluates reactively — error should now be null
    expect(v.errors.value.name).toBeNull();
  });

  it('shows all errors after touchAll()', () => {
    const form = { name: '', amount: 0 };
    const v = useFormValidation(() => ({
      name:   rules.required(form.name, 'Name'),
      amount: rules.positiveNumber(form.amount, 'Amount'),
    }));
    v.touchAll();
    expect(v.errors.value.name).toMatch(/required/i);
    expect(v.errors.value.amount).toMatch(/greater than 0/i);
  });

  it('isValid is false when there are errors', () => {
    const form = { name: '' };
    const v = useFormValidation(() => ({
      name: rules.required(form.name, 'Name'),
    }));
    expect(v.isValid.value).toBe(false);
  });

  it('isValid is true when all fields pass', () => {
    const form = { name: 'Alice', amount: 10 };
    const v = useFormValidation(() => ({
      name:   rules.required(form.name, 'Name'),
      amount: rules.positiveNumber(form.amount, 'Amount'),
    }));
    expect(v.isValid.value).toBe(true);
  });

  it('reset() hides all errors again', () => {
    const form = { name: '' };
    const v = useFormValidation(() => ({
      name: rules.required(form.name, 'Name'),
    }));
    v.touchAll();
    expect(v.errors.value.name).not.toBeNull();
    v.reset();
    expect(v.errors.value.name).toBeNull();
  });

  it('isValid reflects multiple fields together', () => {
    // Must use reactive() so Vue's computed() tracks the dependency
    const form = reactive({ name: 'Bob', amount: 0 });
    const v = useFormValidation(() => ({
      name:   rules.required(form.name),
      amount: rules.positiveNumber(form.amount),
    }));
    // name is valid, amount is not → overall invalid
    expect(v.isValid.value).toBe(false);
    form.amount = 50;
    expect(v.isValid.value).toBe(true);
  });

  it('only shows errors for touched fields, not untouched ones', () => {
    const form = { name: '', amount: 0 };
    const v = useFormValidation(() => ({
      name:   rules.required(form.name),
      amount: rules.positiveNumber(form.amount),
    }));
    v.touch('name');
    expect(v.errors.value.name).not.toBeNull();
    expect(v.errors.value.amount).toBeNull(); // not yet touched
  });
});
