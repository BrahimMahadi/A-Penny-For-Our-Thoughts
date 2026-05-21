import { describe, it, expect } from 'vitest';
import { csvEscape, parseCSVRow } from '@/utils/csv';

describe('csvEscape', () => {
  it('passes simple strings through unchanged', () => {
    expect(csvEscape('hello')).toBe('hello');
    expect(csvEscape('123')).toBe('123');
  });

  it('quotes values containing commas', () => {
    expect(csvEscape('a,b')).toBe('"a,b"');
  });

  it('quotes values containing newlines', () => {
    expect(csvEscape('line1\nline2')).toBe('"line1\nline2"');
  });

  it('doubles internal double-quotes and wraps in quotes', () => {
    expect(csvEscape('say "hi"')).toBe('"say ""hi"""');
  });

  it('returns empty string for null and undefined', () => {
    expect(csvEscape(null)).toBe('');
    expect(csvEscape(undefined)).toBe('');
  });

  it('coerces numbers to strings', () => {
    expect(csvEscape(42)).toBe('42');
  });
});

describe('parseCSVRow', () => {
  it('parses simple comma-separated values', () => {
    expect(parseCSVRow('a,b,c')).toEqual(['a', 'b', 'c']);
  });

  it('handles quoted fields with embedded commas', () => {
    expect(parseCSVRow('"a,b",c')).toEqual(['a,b', 'c']);
  });

  it('unescapes doubled double-quotes inside quoted fields', () => {
    expect(parseCSVRow('"say ""hi"""')).toEqual(['say "hi"']);
  });

  it('preserves empty fields', () => {
    expect(parseCSVRow('a,,c')).toEqual(['a', '', 'c']);
  });

  it('handles a single empty row', () => {
    expect(parseCSVRow('')).toEqual(['']);
  });

  it('round-trips through csvEscape', () => {
    const original = ['hello, world', 'say "hi"', 'normal'];
    const escaped = original.map(csvEscape).join(',');
    const parsed = parseCSVRow(escaped);
    expect(parsed).toEqual(original);
  });
});
