import { describe, it, expect } from 'vitest';
import { genId, deepClone } from '@/utils/id';

describe('genId', () => {
  it('returns a string', () => {
    expect(typeof genId()).toBe('string');
  });

  it('returns non-empty values', () => {
    expect(genId().length).toBeGreaterThan(0);
  });

  it('produces unique IDs on consecutive calls', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 1000; i++) {
      ids.add(genId());
    }
    expect(ids.size).toBe(1000);
  });
});

describe('deepClone', () => {
  it('clones primitive values', () => {
    expect(deepClone(42)).toBe(42);
    expect(deepClone('hello')).toBe('hello');
    expect(deepClone(null)).toBe(null);
  });

  it('clones flat objects', () => {
    const original = { a: 1, b: 'two', c: true };
    const clone = deepClone(original);
    expect(clone).toEqual(original);
    expect(clone).not.toBe(original);
  });

  it('clones nested objects independently', () => {
    const original = { outer: { inner: { value: 1 } } };
    const clone = deepClone(original);
    clone.outer.inner.value = 99;
    expect(original.outer.inner.value).toBe(1);
  });

  it('clones arrays', () => {
    const original = [1, 2, { nested: 'value' }];
    const clone = deepClone(original);
    expect(clone).toEqual(original);
    expect(clone).not.toBe(original);
    expect(clone[2]).not.toBe(original[2]);
  });
});
