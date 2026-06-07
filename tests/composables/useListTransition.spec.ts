/**
 * Module:   tests/composables/useListTransition.spec.ts
 * Project:  A Penny For Our Thoughts
 * Created:  May 2026 (RS-19 — List & Micro-interactions)
 * Summary:  Unit tests for useListTransition composable.
 *           GSAP is mocked in tests/setup.ts — all tweens call onComplete
 *           synchronously, so done() callbacks fire during the same tick.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import gsap from 'gsap';
import { useListTransition } from '@/composables/useListTransition';

// ─── Helpers ─────────────────────────────────────────────────────

function makeEl(): HTMLElement {
  return document.createElement('div');
}

// ─────────────────────────────────────────────────────────────────
describe('useListTransition', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Factory defaults ───────────────────────────────────────────

  it('returns onItemEnter and onItemLeave functions', () => {
    const { onItemEnter, onItemLeave } = useListTransition();
    expect(typeof onItemEnter).toBe('function');
    expect(typeof onItemLeave).toBe('function');
  });

  // ── onItemEnter ────────────────────────────────────────────────

  it('onItemEnter calls gsap.from with the element', () => {
    const { onItemEnter } = useListTransition();
    const el   = makeEl();
    const done = vi.fn();
    onItemEnter(el, done);
    expect(gsap.from).toHaveBeenCalledWith(el, expect.objectContaining({ opacity: 0 }));
  });

  it('onItemEnter calls done() via onComplete (GSAP mock fires synchronously)', () => {
    const { onItemEnter } = useListTransition();
    const done = vi.fn();
    onItemEnter(makeEl(), done);
    expect(done).toHaveBeenCalledTimes(1);
  });

  it('onItemEnter uses default enterY = 14', () => {
    const { onItemEnter } = useListTransition();
    onItemEnter(makeEl(), vi.fn());
    expect(gsap.from).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ y: 14 }),
    );
  });

  it('onItemEnter respects custom enterY option', () => {
    const { onItemEnter } = useListTransition({ enterY: 24 });
    onItemEnter(makeEl(), vi.fn());
    expect(gsap.from).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ y: 24 }),
    );
  });

  it('onItemEnter uses default enterDuration = 0.28', () => {
    const { onItemEnter } = useListTransition();
    onItemEnter(makeEl(), vi.fn());
    expect(gsap.from).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ duration: 0.28 }),
    );
  });

  it('onItemEnter respects custom enterDuration option', () => {
    const { onItemEnter } = useListTransition({ enterDuration: 0.5 });
    onItemEnter(makeEl(), vi.fn());
    expect(gsap.from).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ duration: 0.5 }),
    );
  });

  it('onItemEnter defaults to enterEase = "power2.out"', () => {
    const { onItemEnter } = useListTransition();
    onItemEnter(makeEl(), vi.fn());
    expect(gsap.from).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ ease: 'power2.out' }),
    );
  });

  it('onItemEnter respects custom enterEase option', () => {
    const { onItemEnter } = useListTransition({ enterEase: 'back.out(1.4)' });
    onItemEnter(makeEl(), vi.fn());
    expect(gsap.from).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ ease: 'back.out(1.4)' }),
    );
  });

  // ── onItemLeave ────────────────────────────────────────────────

  it('onItemLeave calls gsap.to with the element', () => {
    const { onItemLeave } = useListTransition();
    const el   = makeEl();
    const done = vi.fn();
    onItemLeave(el, done);
    expect(gsap.to).toHaveBeenCalledWith(el, expect.objectContaining({ opacity: 0 }));
  });

  it('onItemLeave calls done() via onComplete (GSAP mock fires synchronously)', () => {
    const { onItemLeave } = useListTransition();
    const done = vi.fn();
    onItemLeave(makeEl(), done);
    expect(done).toHaveBeenCalledTimes(1);
  });

  it('onItemLeave collapses height to 0 (removes item from document flow)', () => {
    const { onItemLeave } = useListTransition();
    onItemLeave(makeEl(), vi.fn());
    expect(gsap.to).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ height: 0, opacity: 0 }),
    );
  });

  it('onItemLeave uses default leaveDuration = 0.2', () => {
    const { onItemLeave } = useListTransition();
    onItemLeave(makeEl(), vi.fn());
    expect(gsap.to).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ duration: 0.2 }),
    );
  });

  it('onItemLeave respects custom leaveDuration option', () => {
    const { onItemLeave } = useListTransition({ leaveDuration: 0.35 });
    onItemLeave(makeEl(), vi.fn());
    expect(gsap.to).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ duration: 0.35 }),
    );
  });

  it('onItemLeave defaults to leaveEase = "power2.in"', () => {
    const { onItemLeave } = useListTransition();
    onItemLeave(makeEl(), vi.fn());
    expect(gsap.to).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ ease: 'power2.in' }),
    );
  });

  it('onItemLeave respects custom leaveEase option', () => {
    const { onItemLeave } = useListTransition({ leaveEase: 'power2.out' });
    onItemLeave(makeEl(), vi.fn());
    expect(gsap.to).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ ease: 'power2.out' }),
    );
  });

  // ── Custom options — combined ──────────────────────────────────

  it('all options can be provided together', () => {
    const { onItemEnter, onItemLeave } = useListTransition({
      enterY:        20,
      enterDuration: 0.4,
      leaveDuration: 0.15,
      enterEase:     'back.out(1.4)',
      leaveEase:     'power3.in',
    });
    const done = vi.fn();

    onItemEnter(makeEl(), done);
    expect(gsap.from).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ y: 20, duration: 0.4, ease: 'back.out(1.4)' }),
    );

    onItemLeave(makeEl(), done);
    expect(gsap.to).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ height: 0, opacity: 0, duration: 0.15, ease: 'power3.in' }),
    );
  });
});
