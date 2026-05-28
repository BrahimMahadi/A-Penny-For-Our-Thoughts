/**
 * Module:   composables/useListFilter.ts
 * Project:  A Penny For Our Thoughts
 * Created:  May 2026 (Sprint 22)
 * Summary:  Generic search / sort / filter state for the expandable-drawer
 *           (Option B) interaction pattern used by SpendingPage (purchases)
 *           and Subscriptions.
 *
 *           The composable owns:
 *           - search, catFilter, typeFilter, cardFilter, sortKey — all refs
 *           - drawerOpen — controls the slide-open filter panel
 *           - activeFilterCount — computed badge value for the Filters button
 *           - isFiltered — true when any search/filter is active
 *           - clearFilters() — resets everything except sortKey
 *           - toggleDrawer() — opens/closes the filter panel
 *           - applyFilters(items) — filters items against current state;
 *             card lookup is done via budget.expenseCards so the composable
 *             stays decoupled from card-label formatting.
 *
 *           Sorting is intentionally left to the caller — purchase sort logic
 *           differs from subscription sort logic (monthly-cost field, etc.).
 */

import { ref, computed } from 'vue';
import { useBudgetStore } from '@/stores/budget';

// ─── Public interface ─────────────────────────────────────────────

export interface ListFilterable {
  name: string;
  category?: string;
  budgetType?: string;
  cardId?: string | null;
}

export function useListFilter(defaultSort: string) {
  const budget = useBudgetStore();

  // ── Reactive state ──────────────────────────────────────────────
  const search     = ref('');
  const catFilter  = ref('');
  const typeFilter = ref('');
  /** '' = all · 'none' = no card · any other string = card label */
  const cardFilter = ref('');
  const sortKey    = ref(defaultSort);
  const drawerOpen = ref(false);

  // ── Derived ────────────────────────────────────────────────────
  const activeFilterCount = computed(() =>
    (catFilter.value  ? 1 : 0) +
    (typeFilter.value ? 1 : 0) +
    (cardFilter.value ? 1 : 0),
  );

  const isFiltered = computed(() =>
    !!search.value || activeFilterCount.value > 0,
  );

  // ── Actions ────────────────────────────────────────────────────
  function clearFilters(): void {
    search.value     = '';
    catFilter.value  = '';
    typeFilter.value = '';
    cardFilter.value = '';
  }

  function toggleDrawer(): void {
    drawerOpen.value = !drawerOpen.value;
  }

  /**
   * Filter `items` against the current search / cat / type / card state.
   * Card labels are resolved via `budget.expenseCards` so callers never
   * need to pass a lookup function.
   *
   * @returns A new array; the original is never mutated.
   */
  function applyFilters<T extends ListFilterable>(items: T[]): T[] {
    return items.filter(item => {
      // ── Search ──────────────────────────────────────────────
      if (
        search.value &&
        !item.name.toLowerCase().includes(search.value.toLowerCase())
      ) {
        return false;
      }

      // ── Category ────────────────────────────────────────────
      if (catFilter.value && (item.category ?? '') !== catFilter.value) {
        return false;
      }

      // ── Budget type ─────────────────────────────────────────
      if (
        typeFilter.value &&
        (item.budgetType ?? 'wants') !== typeFilter.value
      ) {
        return false;
      }

      // ── Card ────────────────────────────────────────────────
      if (cardFilter.value === 'none') {
        if (item.cardId) return false;
      } else if (cardFilter.value) {
        const label = item.cardId
          ? (budget.expenseCards.find(c => c.id === item.cardId)?.label ?? null)
          : null;
        if (label !== cardFilter.value) return false;
      }

      return true;
    });
  }

  return {
    // state
    search,
    catFilter,
    typeFilter,
    cardFilter,
    sortKey,
    drawerOpen,
    // derived
    activeFilterCount,
    isFiltered,
    // actions
    clearFilters,
    toggleDrawer,
    applyFilters,
  };
}
