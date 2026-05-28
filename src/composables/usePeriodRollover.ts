/**
 * Module:   composables/usePeriodRollover.ts
 * Project:  A Penny For Our Thoughts
 * Created:  May 2026 (Sprint RS-23 — Automatic Pay Period Rollover)
 * Summary:  App-root orchestration for the bi-weekly auto-archive system.
 *
 *           Calls `budget.autoArchiveMissedPeriods(today)` on two surfaces:
 *             1. When `budget.payStart` becomes set (immediate=true watcher).
 *                This handles app load — payStart is null until budget data
 *                hydrates from localStorage / Supabase, then becomes a string,
 *                firing the watcher exactly once.
 *             2. When the document becomes visible (`visibilitychange`).
 *                Covers the "left the tab open across a weekend" case.
 *
 *           When the action returns N ≥ 1 (periods were archived):
 *             • Resets `ui.schedulePayPeriodOffset` to 0 so the Schedule nav
 *               lands on the new current period rather than a now-stale one.
 *             • Shows a success toast indicating how many periods were filed.
 *
 *           A small re-entrancy guard (`running`) prevents the watcher from
 *           reacting to its own mutations (the action mutates payStart's
 *           parent object — its containing reactive proxy — which Vue's
 *           reactivity could otherwise re-trigger).
 *
 * Usage:
 *   In App.vue's <script setup>:
 *     import { usePeriodRollover } from '@/composables/usePeriodRollover';
 *     usePeriodRollover();
 *
 *   No options, no return value — the side effects (toast + nav reset) happen
 *   transparently when the user comes back to the app after one or more
 *   bi-weekly periods have elapsed.
 */

import { onMounted, onBeforeUnmount, watch } from 'vue';
import { useBudgetStore } from '@/stores/budget';
import { useUiStore } from '@/stores/ui';
import { useToast } from '@/composables/useToast';

export function usePeriodRollover(): void {
  const budget = useBudgetStore();
  const ui     = useUiStore();
  const toast  = useToast();

  let running = false;

  /**
   * Run the rollover check. Safe to call multiple times — the action itself
   * is idempotent. The local `running` flag just avoids redundant work and
   * any chance of the post-mutation reactivity bouncing back into us.
   */
  function check(): void {
    if (running) return;
    if (!budget.payStart) return;
    running = true;
    try {
      const archived = budget.autoArchiveMissedPeriods(new Date());
      if (archived > 0) {
        ui.resetToCurrentPayPeriod();
        const noun = archived === 1 ? 'pay period' : 'pay periods';
        toast.show(
          `${archived} ${noun} archived to Spending History — new period started.`,
          'success',
        );
      }
    } finally {
      running = false;
    }
  }

  // ── Surface 1: react to budget hydration ────────────────────────────────
  // `immediate: true` so we also fire the first time the watcher attaches
  // (covers the case where payStart was already set when this composable
  // mounted — e.g. localStorage-only mode with no auth resolution gap).
  const stopWatch = watch(
    () => budget.payStart,
    (next) => { if (next) check(); },
    { immediate: true },
  );

  // ── Surface 2: react to visibility changes ──────────────────────────────
  function onVisibility(): void {
    if (document.visibilityState === 'visible') check();
  }

  onMounted(() => {
    document.addEventListener('visibilitychange', onVisibility);
  });

  onBeforeUnmount(() => {
    document.removeEventListener('visibilitychange', onVisibility);
    stopWatch();
  });
}
