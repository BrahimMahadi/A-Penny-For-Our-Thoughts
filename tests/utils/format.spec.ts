import { describe, it, expect } from 'vitest';
import { fmt, pct } from '@/utils/format';

describe('fmt', () => {
  it('formats whole numbers with two decimals', () => {
    expect(fmt(100)).toBe('$100.00');
  });

  it('inserts thousands separators', () => {
    expect(fmt(1234.5)).toBe('$1,234.50');
  });

  it('handles zero', () => {
    expect(fmt(0)).toBe('$0.00');
  });

  it('accepts string input', () => {
    expect(fmt('42.5')).toBe('$42.50');
  });

  it('rounds to two decimal places', () => {
    expect(fmt(1.005)).toBe('$1.01');
    expect(fmt(1.004)).toBe('$1.00');
  });

  it('handles large numbers', () => {
    expect(fmt(1_000_000)).toBe('$1,000,000.00');
  });

  it('handles negative numbers', () => {
    expect(fmt(-42.5)).toBe('-$42.50');
  });
});

describe('pct', () => {
  it('returns a string with one decimal', () => {
    expect(pct(50, 100)).toBe('50.0');
  });

  it('returns "0.0" when divisor is zero', () => {
    expect(pct(50, 0)).toBe('0.0');
  });

  it('caps at 100', () => {
    expect(pct(200, 100)).toBe('100.0');
  });

  it('handles small ratios', () => {
    expect(pct(1, 3)).toBe('33.3');
  });

  it('returns "0.0" for negative divisors (defensive)', () => {
    expect(pct(50, -10)).toBe('0.0');
  });
});
