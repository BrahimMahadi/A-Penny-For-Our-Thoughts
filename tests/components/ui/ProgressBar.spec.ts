/**
 * Module:   tests/components/ui/ProgressBar.spec.ts
 * Project:  A Penny For Our Thoughts
 * Created:  May 2026 (Vue 3 migration — Sprint 8)
 * Summary:  Unit tests for the ProgressBar UI primitive.
 *           Verifies the restructured DOM layout (label rendered as a
 *           sibling below the track, outside the overflow:hidden container),
 *           status class auto-derivation, fill width clamping, size
 *           modifiers, and ARIA attribute correctness.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import ProgressBar from '@/components/ui/ProgressBar.vue';

// ─── Helper ───────────────────────────────────────────────────────
function mountBar(props: Record<string, unknown> = {}) {
  return mount(ProgressBar as Parameters<typeof mount>[0], {
    props: { percent: 50, ...props },
    attachTo: document.body,
  });
}

// ─────────────────────────────────────────────────────────────────
describe('ProgressBar', () => {
  afterEach(() => { document.body.innerHTML = ''; });

  // ── DOM structure (Sprint 8 BUG-FIX: label no longer inside overflow:hidden) ──

  it('renders the .base-progress-bar root wrapper', () => {
    const w = mountBar();
    expect(w.find('.base-progress-bar').exists()).toBe(true);
    w.unmount();
  });

  it('has .base-progress-bar__track as a direct child of the wrapper', () => {
    const w = mountBar();
    const wrapperEl = w.find('.base-progress-bar').element;
    const childClasses = Array.from(wrapperEl.children).map(el => el.className);
    expect(childClasses.some(c => c.includes('base-progress-bar__track'))).toBe(true);
    w.unmount();
  });

  it('has .base-progress-bar__fill inside the track', () => {
    const w = mountBar();
    const track = w.find('.base-progress-bar__track');
    expect(track.find('.base-progress-bar__fill').exists()).toBe(true);
    w.unmount();
  });

  it('label is a sibling of the track — NOT a descendant (no clipping by overflow:hidden)', () => {
    const w = mountBar({ percent: 50, label: '$500 / $1,000' });
    const track = w.find('.base-progress-bar__track');
    const label = w.find('.base-progress-bar__label');
    expect(label.exists()).toBe(true);
    // Both must share the same parent element
    expect(track.element.parentElement).toBe(label.element.parentElement);
    // The label must NOT live inside the overflow:hidden track
    expect(track.element.contains(label.element)).toBe(false);
    w.unmount();
  });

  // ── Label rendering ───────────────────────────────────────────────

  it('renders label text when the label prop is provided', () => {
    const w = mountBar({ percent: 30, label: '$300 / $1,000' });
    expect(w.find('.base-progress-bar__label').text()).toBe('$300 / $1,000');
    w.unmount();
  });

  it('omits .base-progress-bar__label when label is not provided (default)', () => {
    const w = mountBar({ percent: 50 });
    expect(w.find('.base-progress-bar__label').exists()).toBe(false);
    w.unmount();
  });

  it('omits .base-progress-bar__label when label is an empty string', () => {
    const w = mountBar({ percent: 50, label: '' });
    expect(w.find('.base-progress-bar__label').exists()).toBe(false);
    w.unmount();
  });

  // ── Fill width clamping ───────────────────────────────────────────

  it('sets fill width equal to percent (0–100 range)', () => {
    const w = mountBar({ percent: 65 });
    expect(w.find('.base-progress-bar__fill').attributes('style')).toContain('width: 65%');
    w.unmount();
  });

  it('clamps fill width to 100% when percent exceeds 100', () => {
    const w = mountBar({ percent: 150 });
    expect(w.find('.base-progress-bar__fill').attributes('style')).toContain('width: 100%');
    w.unmount();
  });

  it('clamps fill width to 0% when percent is negative', () => {
    const w = mountBar({ percent: -20 });
    expect(w.find('.base-progress-bar__fill').attributes('style')).toContain('width: 0%');
    w.unmount();
  });

  it('sets fill to 0% when percent is zero', () => {
    const w = mountBar({ percent: 0 });
    expect(w.find('.base-progress-bar__fill').attributes('style')).toContain('width: 0%');
    w.unmount();
  });

  it('sets fill to 100% when percent is exactly 100', () => {
    const w = mountBar({ percent: 100 });
    expect(w.find('.base-progress-bar__fill').attributes('style')).toContain('width: 100%');
    w.unmount();
  });

  // ── Status auto-derivation ────────────────────────────────────────

  it('auto-applies on-track class when percent ≤ 100', () => {
    const w = mountBar({ percent: 75 });
    expect(w.find('.base-progress-bar__fill--on-track').exists()).toBe(true);
    expect(w.find('.base-progress-bar__fill--caution').exists()).toBe(false);
    expect(w.find('.base-progress-bar__fill--over').exists()).toBe(false);
    w.unmount();
  });

  it('auto-applies on-track class when percent is exactly 100', () => {
    const w = mountBar({ percent: 100 });
    expect(w.find('.base-progress-bar__fill--on-track').exists()).toBe(true);
    w.unmount();
  });

  it('auto-applies caution class when 100 < percent ≤ 110', () => {
    const w = mountBar({ percent: 105 });
    expect(w.find('.base-progress-bar__fill--caution').exists()).toBe(true);
    expect(w.find('.base-progress-bar__fill--on-track').exists()).toBe(false);
    w.unmount();
  });

  it('auto-applies over class when percent > 110', () => {
    const w = mountBar({ percent: 115 });
    expect(w.find('.base-progress-bar__fill--over').exists()).toBe(true);
    expect(w.find('.base-progress-bar__fill--caution').exists()).toBe(false);
    w.unmount();
  });

  // ── Explicit status override ──────────────────────────────────────

  it('respects explicit status="over" even when percent=50', () => {
    const w = mountBar({ percent: 50, status: 'over' });
    expect(w.find('.base-progress-bar__fill--over').exists()).toBe(true);
    expect(w.find('.base-progress-bar__fill--on-track').exists()).toBe(false);
    w.unmount();
  });

  it('respects explicit status="caution" even when percent=50', () => {
    const w = mountBar({ percent: 50, status: 'caution' });
    expect(w.find('.base-progress-bar__fill--caution').exists()).toBe(true);
    expect(w.find('.base-progress-bar__fill--on-track').exists()).toBe(false);
    w.unmount();
  });

  it('respects explicit status="on-track" even when percent=120', () => {
    const w = mountBar({ percent: 120, status: 'on-track' });
    expect(w.find('.base-progress-bar__fill--on-track').exists()).toBe(true);
    expect(w.find('.base-progress-bar__fill--over').exists()).toBe(false);
    w.unmount();
  });

  // ── Size modifiers ────────────────────────────────────────────────

  it('applies --md modifier class by default', () => {
    const w = mountBar({ percent: 50 });
    expect(w.find('.base-progress-bar--md').exists()).toBe(true);
    w.unmount();
  });

  it('applies --sm modifier class when size="sm"', () => {
    const w = mountBar({ percent: 50, size: 'sm' });
    expect(w.find('.base-progress-bar--sm').exists()).toBe(true);
    expect(w.find('.base-progress-bar--md').exists()).toBe(false);
    w.unmount();
  });

  it('applies --lg modifier class when size="lg"', () => {
    const w = mountBar({ percent: 50, size: 'lg' });
    expect(w.find('.base-progress-bar--lg').exists()).toBe(true);
    expect(w.find('.base-progress-bar--md').exists()).toBe(false);
    w.unmount();
  });

  // ── ARIA ──────────────────────────────────────────────────────────

  it('has role="progressbar" with correct min/max/now attributes', () => {
    const w = mountBar({ percent: 40, ariaLabel: 'Goal progress' });
    const bar = w.find('[role="progressbar"]');
    expect(bar.exists()).toBe(true);
    expect(bar.attributes('aria-valuenow')).toBe('40');
    expect(bar.attributes('aria-valuemin')).toBe('0');
    expect(bar.attributes('aria-valuemax')).toBe('100');
    expect(bar.attributes('aria-label')).toBe('Goal progress');
    w.unmount();
  });

  it('aria-valuenow reflects the clamped value (not raw) when percent > 100', () => {
    const w = mountBar({ percent: 150 });
    const bar = w.find('[role="progressbar"]');
    // clamped → 100
    expect(bar.attributes('aria-valuenow')).toBe('100');
    w.unmount();
  });

  it('uses "Progress" as the default aria-label', () => {
    const w = mountBar({ percent: 50 });
    expect(w.find('[role="progressbar"]').attributes('aria-label')).toBe('Progress');
    w.unmount();
  });
});
