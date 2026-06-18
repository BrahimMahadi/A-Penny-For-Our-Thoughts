<!--
  Module:   components/sections/Wishlist.vue
  Project:  A Penny For Our Thoughts
  Created:  May 2026 (Vue 3 migration — Sprint 4)
  Updated:  May 2026 (RS-14) — full card-grid redesign: price tracking,
            per-item saved progress, months-to-goal badge, affordability chip,
            inline "Add savings" interaction, sort toggle, and URL icon button.
  Summary:  Wishlist rendered as a responsive card grid. Each card shows:
              - Emoji icon in a violet box
              - "~N mo" months-to-goal badge (derived from monthly savings rate)
              - Item name and target price
              - Progress bar + "$X saved · Y%"
              - "Add savings" inline form (RS-13 style)
            Header shows total wishlist value + savings rate.
            CRUD via BaseModal. openAdd() exposed for parent CTAs.
-->

<script setup lang="ts">
import { ref, reactive, computed, nextTick, onMounted } from 'vue';
import { useBudgetStore } from '@/stores/budget';
import { useToast } from '@/composables/useToast';
import { useAnalytics } from '@/composables/useAnalytics';
import { useGsap } from '@/composables/useGsap';
import { useListTransition } from '@/composables/useListTransition';
import { useFormValidation, rules } from '@/composables/useFormValidation';
import {
  wishlistTargetStatus,
  formatTargetMonthLabel,
  requiredMonthlyRate,
  type WishlistStatus,
} from '@/utils/calculations';
import BaseModal from '@/components/ui/BaseModal.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import EmptyState from '@/components/ui/EmptyState.vue';
import CardHoverFX from '@/components/ui/CardHoverFX.vue';
import { fmt } from '@/utils/format';
import type { WishlistItem } from '@/types/budget';

const budget = useBudgetStore();
const toast  = useToast();
const { totalMonthlyIncome } = useAnalytics();

// ─── GSAP animations ──────────────────────────────────────────────────────────

const sectionRef = ref<HTMLElement | null>(null);
const { from: gsapFrom } = useGsap();
const { onItemEnter, onItemLeave } = useListTransition({ enterY: 16, enterDuration: 0.3 });

/** Stagger-in all visible cards on first mount. */
onMounted(() => {
  nextTick(() => {
    const cards = sectionRef.value?.querySelectorAll<HTMLElement>('.wish-card');
    if (cards?.length) {
      gsapFrom(Array.from(cards), {
        opacity: 0,
        y: 18,
        duration: 0.35,
        ease: 'power2.out',
        stagger: 0.055,
        clearProps: 'opacity,y,transform',
      });
    }
  });
});

// ─── Budget maths ─────────────────────────────────────────────────────────────

/** Monthly savings envelope (income × savings%) */
const monthlySavingsRate = computed(() =>
  totalMonthlyIncome.value * ((budget.allocation.savings ?? 0) / 100),
);

/** One bi-weekly wants envelope (monthly wants ÷ 2) */
const wantsBudgetPerPeriod = computed(() =>
  totalMonthlyIncome.value * ((budget.allocation.wants ?? 0) / 100) / 2,
);

// ─── Header stats ─────────────────────────────────────────────────────────────

const pricedItems = computed(() => budget.wishlist.filter(w => w.price != null && w.price > 0));

const totalValue = computed(() =>
  pricedItems.value.reduce((s, w) => s + (w.price ?? 0), 0),
);

// ─── Sort ─────────────────────────────────────────────────────────────────────

// RS-28: 'target-asc' added — soonest target first; items without a target
// month are pushed to the end (treated as Infinity).
type SortKey = 'default' | 'price-asc' | 'price-desc' | 'target-asc';
const sortKey = ref<SortKey>('default');

const sortedWishlist = computed(() => {
  const items = [...budget.wishlist];
  if (sortKey.value === 'price-asc') {
    items.sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
  } else if (sortKey.value === 'price-desc') {
    items.sort((a, b) => (b.price ?? -Infinity) - (a.price ?? -Infinity));
  } else if (sortKey.value === 'target-asc') {
    // Lexicographic sort on 'YYYY-MM' strings — chronologically correct.
    // Items without a target month sort to the END of the list.
    //
    // BUG-021 fix: the original implementation used U+FFFF as a "sort to end"
    // sentinel inside the comparator. That codepoint is a Unicode noncharacter
    // and the Vue parser (rule: vue/no-parsing-error,
    // noncharacter-in-input-stream) refused to compile the SFC, blocking the
    // build-and-deploy CI step. Explicit null-handling avoids any non-printable
    // characters in the source file.
    items.sort((a, b) => {
      const at = a.targetMonth;
      const bt = b.targetMonth;
      if (at === bt) return 0;
      if (!at) return 1;   // a has no target → sort it after b
      if (!bt) return -1;  // b has no target → sort it after a
      return at.localeCompare(bt);
    });
  }
  return items;
});

// ─── Per-card helpers ──────────────────────────────────────────────────────────

/** Months until item is fully saved for, based on monthly savings rate. */
function monthsToGoal(item: WishlistItem): number | null {
  if (!item.price || item.price <= 0 || monthlySavingsRate.value <= 0) return null;
  const remaining = Math.max(0, item.price - (item.saved ?? 0));
  if (remaining <= 0) return 0;
  return Math.ceil(remaining / monthlySavingsRate.value);
}

// ─── RS-28: target-month per-card helpers ────────────────────────────────────
//
// All three helpers thin-wrap the pure functions in calculations.ts so the
// template stays declarative and the unit tests can hit the math directly.

/** True when the item has a user-set target month — drives the "By [Month]" badge. */
function hasTarget(item: WishlistItem): boolean {
  return typeof item.targetMonth === 'string' && item.targetMonth.length > 0;
}

/** "Mar 2027" style label for an item's target month; null when unset/invalid. */
function targetLabel(item: WishlistItem): string | null {
  return formatTargetMonthLabel(item.targetMonth);
}

/** Status verdict — drives the on-card chip. */
function statusFor(item: WishlistItem): WishlistStatus {
  return wishlistTargetStatus(
    item.price,
    item.saved,
    item.targetMonth,
    monthlySavingsRate.value,
  );
}

/**
 * Dollar amount per month the user would need to allocate (from now)
 * to reach `price` exactly by the target month. Null when not applicable
 * (no remaining, no target, or target in the past).
 *
 * Surfaced as an inline hint when the status chip is "behind".
 */
function requiredRateFor(item: WishlistItem): number | null {
  const remaining = Math.max(0, (item.price ?? 0) - (item.saved ?? 0));
  return requiredMonthlyRate(remaining, item.targetMonth);
}

/** Progress percentage (saved / price), clamped to 0–100. */
function progressPct(item: WishlistItem): number {
  if (!item.price || item.price <= 0) return 0;
  return Math.min(100, Math.round(((item.saved ?? 0) / item.price) * 100));
}

/** True when the item price fits within one bi-weekly wants envelope. */
function isAffordable(price: number | undefined): boolean {
  if (price == null || price <= 0) return false;
  return wantsBudgetPerPeriod.value > 0 && price <= wantsBudgetPerPeriod.value;
}

/**
 * RS-28: min value for the target-month picker. Prevents users from selecting
 * past months (which would always show "behind" with negative months-to-target).
 * Computed at script-eval time — refreshes on each page mount, which is fine.
 */
const minTargetMonth = new Date().toISOString().slice(0, 7);

/**
 * Live hint shown below the "Saved amount" field in the edit modal.
 * Extracted from template mustache to avoid a Vite HMR 500 caused by
 * `const` declarations inside IIFE expressions inside {{ }} (BUG-019).
 */
function monthsHintText(): string {
  const priceNum = +form.price;
  const savedNum = +(form.saved || 0);
  if (!priceNum || priceNum <= 0 || monthlySavingsRate.value <= 0) return '';
  const remaining = Math.max(0, priceNum - savedNum);
  if (remaining <= 0) return '✓ Already saved enough!';
  const months = Math.ceil(remaining / monthlySavingsRate.value);
  return `~${months} month${months !== 1 ? 's' : ''} to save up at ${fmt(monthlySavingsRate.value)}/mo`;
}

// ─── Inline "Add savings" (RS-13 pattern) ─────────────────────────────────────

const inlineWishId  = ref<string | null>(null);
const inlineAmount  = ref('');

function openInlineSavings(id: string): void {
  inlineWishId.value = id;
  inlineAmount.value = '';
  // Bug fix: refs inside v-for become arrays in Composition API — use getElementById
  // instead so we target the correct per-item input regardless of list length.
  nextTick(() => {
    const el = document.getElementById(`wish-inline-${id}`) as HTMLInputElement | null;
    if (el && typeof el.focus === 'function') el.focus();
  });
}

function closeInlineSavings(): void {
  inlineWishId.value = null;
  inlineAmount.value = '';
}

function applyInlineSavings(id: string): void {
  const amount = parseFloat(inlineAmount.value);
  if (isNaN(amount) || amount <= 0) { closeInlineSavings(); return; }
  const item = budget.wishlist.find(w => w.id === id);
  if (!item) return;
  budget.updateWishlistItem(id, { saved: (item.saved ?? 0) + amount });
  toast.show(`+${fmt(amount)} saved toward "${item.name}"`, 'success');
  closeInlineSavings();
}

// ─── Modal CRUD ────────────────────────────────────────────────────────────────

const showModal = ref(false);
const editingId  = ref<string | null>(null);

// RS-28: targetMonth is 'YYYY-MM' (matches Goal.targetDate convention).
// Empty string = "no target" — the field remains optional.
const form = reactive({ name: '', icon: '🛒', url: '', price: '', saved: '', targetMonth: '' });

const nameValidation = useFormValidation(() => ({
  name: rules.required(form.name, 'Name'),
}));

function resetForm(): void {
  form.name        = '';
  form.icon        = '🛒';
  form.url         = '';
  form.price       = '';
  form.saved       = '';
  form.targetMonth = '';
  editingId.value = null;
  nameValidation.reset();
}

function openAdd(): void {
  resetForm();
  showModal.value = true;
}

function openEdit(id: string): void {
  const item = budget.wishlist.find(w => w.id === id);
  if (!item) return;
  form.name        = item.name;
  form.icon        = item.icon || '🛒';
  form.url         = item.url || '';
  form.price       = item.price != null ? String(item.price) : '';
  form.saved       = item.saved != null ? String(item.saved) : '';
  form.targetMonth = item.targetMonth ?? '';
  editingId.value  = id;
  showModal.value  = true;
}

const formError = computed<string>(() => {
  // Bug fix: Vue 3 v-model on <input type="number"> coerces the reactive field
  // from string → number after the first user keystroke. Wrap with String() so
  // .trim() is always safe regardless of which type the field currently holds.
  if (!form.name.trim()) return 'Name is required.';
  const priceStr = String(form.price ?? '').trim();
  const savedStr = String(form.saved ?? '').trim();
  if (priceStr !== '' && (isNaN(+priceStr) || +priceStr < 0)) {
    return 'Price must be a positive number.';
  }
  if (savedStr !== '' && (isNaN(+savedStr) || +savedStr < 0)) {
    return 'Saved amount must be a positive number.';
  }
  if (savedStr !== '' && priceStr !== '' && +savedStr > +priceStr) {
    return 'Saved amount cannot exceed the price.';
  }
  return '';
});

function save(): void {
  nameValidation.touchAll();
  if (formError.value) return;
  const priceStr = String(form.price ?? '').trim();
  const savedStr = String(form.saved ?? '').trim();
  const parsedPrice = priceStr !== '' ? +priceStr : undefined;
  const parsedSaved = savedStr !== '' ? +savedStr : undefined;
  const trimmedTarget = form.targetMonth.trim();
  const payload = {
    name:  form.name.trim(),
    icon:  form.icon || '🛒',
    url:   form.url.trim(),
    price: parsedPrice,
    saved: parsedSaved,
    // RS-28: pass through undefined when blank so existing items don't end
    // up with empty-string sentinel values that would break the helpers.
    targetMonth: trimmedTarget !== '' ? trimmedTarget : undefined,
  };
  if (editingId.value) {
    budget.updateWishlistItem(editingId.value, payload);
    toast.show('Wishlist item updated.', 'success');
  } else {
    budget.addWishlistItem(payload);
    toast.show('Item added to wishlist.', 'success');
  }
  showModal.value = false;
  resetForm();
}

function remove(id: string): void {
  const item = budget.wishlist.find(w => w.id === id);
  if (!item) return;
  if (!window.confirm(`Remove "${item.name}" from wishlist?`)) return;
  budget.deleteWishlistItem(id);
  toast.show('Item removed.', 'success');
}

// Allow the parent page to trigger the Add modal from a header CTA
defineExpose({ openAdd });
</script>

<template>
  <div ref="sectionRef" class="wishlist-section">

    <!-- ── Header ──────────────────────────────────────────────── -->
    <div class="wishlist-section__header">
      <div class="wishlist-section__meta">
        <span class="wishlist-section__count">
          {{ budget.wishlist.length }} item{{ budget.wishlist.length !== 1 ? 's' : '' }}
        </span>
        <span
          v-if="pricedItems.length > 0"
          class="wishlist-section__total"
        >
          {{ fmt(totalValue) }}
          <span
            v-if="monthlySavingsRate > 0"
            class="wishlist-section__rate"
          >
            · at {{ fmt(monthlySavingsRate) }}/mo savings rate
          </span>
        </span>
      </div>

      <div class="wishlist-section__controls">
        <select
          v-if="budget.wishlist.length > 1"
          v-model="sortKey"
          class="wishlist-sort"
          aria-label="Sort wishlist"
        >
          <option value="default">Default order</option>
          <option value="price-asc">Price ↑</option>
          <option value="price-desc">Price ↓</option>
          <option value="target-asc">Target ↑</option>
        </select>
        <BaseButton
          size="sm"
          @click="openAdd"
        >
          + Add Item
        </BaseButton>
      </div>
    </div>

    <!-- ── Empty state ─────────────────────────────────────────── -->
    <EmptyState
      v-if="budget.wishlist.length === 0"
      icon="🛒"
      title="Wishlist is empty"
      hint="Add items you're saving up for — set a price to track your progress."
    />

    <!-- ── Card grid ───────────────────────────────────────────── -->
    <!-- :css="false" → GSAP handles enter/leave; move-class keeps CSS FLIP       -->
    <!-- so card reordering still animates smoothly without the Flip plugin.      -->
    <TransitionGroup
      v-else
      :css="false"
      move-class="wish-card-move"
      tag="div"
      class="wish-grid"
      @enter="onItemEnter"
      @leave="onItemLeave"
    >
      <div
        v-for="item in sortedWishlist"
        :key="item.id"
        class="wish-card card-hfx"
      >
        <!-- Icon + months badge -->
        <div class="wish-card__top">
          <div class="wish-card__icon-box">
            <span
              class="wish-icon"
              aria-hidden="true"
            >{{ item.icon || '🛒' }}</span>
          </div>

          <!--
            RS-28: when targetMonth is set we replace the default
            "~N mo at current rate" badge with "By [Month YYYY]" + an
            on-track / behind / complete status chip. Otherwise the
            original months-to-goal badge renders unchanged.
          -->
          <div
            v-if="hasTarget(item)"
            class="wish-card__target-group"
            data-testid="wish-target-group"
          >
            <span
              class="wish-card__target-badge"
              :title="`Target month: ${targetLabel(item)}`"
            >
              By {{ targetLabel(item) }}
            </span>
            <span
              v-if="statusFor(item) !== 'no-target'"
              class="wish-card__status-chip"
              :class="`wish-card__status-chip--${statusFor(item)}`"
              :data-testid="`wish-status-${statusFor(item)}`"
            >
              <template v-if="statusFor(item) === 'complete'">Complete ✓</template>
              <template v-else-if="statusFor(item) === 'on-track'">On track ✓</template>
              <template v-else>Behind ✗</template>
            </span>
          </div>

          <!-- Default months-to-goal badge (no target month set) -->
          <span
            v-else-if="monthsToGoal(item) !== null && monthsToGoal(item)! > 0"
            class="wish-card__months-badge"
            :title="`~${monthsToGoal(item)} months to save up at ${fmt(monthlySavingsRate)}/mo`"
          >
            ~{{ monthsToGoal(item) }} mo
          </span>
          <span
            v-else-if="monthsToGoal(item) === 0"
            class="wish-card__months-badge wish-card__months-badge--done"
          >
            ✓ Saved
          </span>
        </div>

        <!-- Name -->
        <span class="wish-name">{{ item.name }}</span>

        <!-- Price -->
        <span
          v-if="item.price != null && item.price > 0"
          class="wish-price"
        >
          {{ fmt(item.price) }}
        </span>

        <!-- Progress bar (only when price set) -->
        <template v-if="item.price != null && item.price > 0">
          <div class="wish-card__progress-wrap">
            <div
              class="wish-card__progress-fill"
              :style="{ width: progressPct(item) + '%' }"
              :aria-valuenow="progressPct(item)"
              aria-valuemin="0"
              aria-valuemax="100"
              role="progressbar"
            />
          </div>

          <div class="wish-card__saved-row">
            <span class="wish-card__saved-text">{{ fmt(item.saved ?? 0) }} saved</span>
            <span class="wish-card__pct">{{ progressPct(item) }}%</span>
            <span
              v-if="isAffordable(item.price)"
              class="wish-chip wish-chip--affordable"
              title="Within one bi-weekly wants budget"
            >
              Affordable ✓
            </span>
          </div>

          <!--
            RS-28: required-rate hint — only shown when the user is BEHIND
            on a targeted item. Tells them exactly the monthly allocation
            needed to still hit the target month.
          -->
          <p
            v-if="hasTarget(item) && statusFor(item) === 'behind' && requiredRateFor(item) !== null"
            class="wish-card__required-hint"
            data-testid="wish-required-hint"
          >
            Need <strong>{{ fmt(requiredRateFor(item)!) }}/mo</strong> to hit your target
          </p>
        </template>

        <!-- Inline "Add savings" form -->
        <div
          v-if="inlineWishId === item.id"
          class="wish-card__inline"
        >
          <div class="wish-inline-wrap">
            <span class="wish-inline-prefix">$</span>
            <input
              :id="`wish-inline-${item.id}`"
              v-model="inlineAmount"
              class="wish-inline-input"
              type="number"
              inputmode="decimal"
              min="0"
              step="0.01"
              placeholder="0.00"
              @keyup.enter="applyInlineSavings(item.id)"
              @keyup.escape="closeInlineSavings"
            >
          </div>
          <div class="wish-inline-btns">
            <button
              class="wish-inline-confirm"
              @click="applyInlineSavings(item.id)"
            >
              + Add
            </button>
            <button
              class="wish-inline-cancel"
              @click="closeInlineSavings"
            >
              Cancel
            </button>
          </div>
        </div>

        <!-- Action row -->
        <div class="wish-actions">
          <button
            v-if="item.price != null && item.price > 0 && inlineWishId !== item.id"
            class="wish-card__add-savings"
            @click="openInlineSavings(item.id)"
          >
            + Add savings
          </button>
          <a
            v-if="item.url"
            :href="item.url"
            target="_blank"
            rel="noopener"
            class="wish-link-btn"
            :aria-label="`View ${item.name} (opens in new tab)`"
            title="Open link"
          >🔗</a>
          <BaseButton
            size="xs"
            variant="secondary"
            @click="openEdit(item.id)"
          >
            Edit
          </BaseButton>
          <BaseButton
            size="xs"
            variant="danger"
            @click="remove(item.id)"
          >
            Delete
          </BaseButton>
        </div>
        <CardHoverFX />
      </div>
    </TransitionGroup>

    <!-- ── Add / Edit modal ───────────────────────────────────── -->
    <BaseModal
      v-model:open="showModal"
      :title="editingId ? 'Edit Wishlist Item' : 'Add to Wishlist'"
      size="sm"
    >
      <div class="modal-form">
        <!-- Icon + Name row -->
        <div class="form-row-icon">
          <div class="form-group icon-group">
            <label
              class="form-label"
              for="wish-icon"
            >Icon</label>
            <input
              id="wish-icon"
              v-model="form.icon"
              class="form-input icon-input"
              type="text"
              maxlength="4"
              placeholder="🛒"
            >
          </div>
          <div class="form-group name-group">
            <label
              class="form-label"
              for="wish-name-input"
            >Item name</label>
            <input
              id="wish-name-input"
              v-model="form.name"
              class="form-input"
              :class="{ 'form-input--error': nameValidation.errors.value.name }"
              type="text"
              placeholder="e.g. AirPods Pro"
              @blur="nameValidation.touch('name')"
            >
          </div>
        </div>

        <!-- Price + Saved row -->
        <div class="form-row-2">
          <div class="form-group">
            <label
              class="form-label"
              for="wish-price"
            >Target price (optional)</label>
            <div class="form-input-wrap">
              <span class="form-input-prefix">$</span>
              <input
                id="wish-price"
                v-model="form.price"
                class="form-input form-input--prefixed"
                type="number"
                inputmode="decimal"
                min="0"
                step="0.01"
                placeholder="0.00"
              >
            </div>
          </div>
          <div class="form-group">
            <label
              class="form-label"
              for="wish-saved"
            >Amount saved (optional)</label>
            <div class="form-input-wrap">
              <span class="form-input-prefix">$</span>
              <input
                id="wish-saved"
                v-model="form.saved"
                class="form-input form-input--prefixed"
                type="number"
                inputmode="decimal"
                min="0"
                step="0.01"
                placeholder="0.00"
              >
            </div>
          </div>
        </div>

        <!-- URL field -->
        <div class="form-group">
          <label
            class="form-label"
            for="wish-url"
          >URL (optional)</label>
          <input
            id="wish-url"
            v-model="form.url"
            class="form-input"
            type="url"
            placeholder="https://..."
          >
        </div>

        <!-- RS-28: Target month (optional) -->
        <div class="form-group">
          <label
            class="form-label"
            for="wish-target-month"
          >Target month (optional)</label>
          <input
            id="wish-target-month"
            v-model="form.targetMonth"
            class="form-input"
            type="month"
            :min="minTargetMonth"
            data-testid="wish-target-month-input"
          >
          <p class="wish-field-hint">
            When set, the card shows "By [Month]" with an on-track / behind chip
            based on your monthly savings rate. Leave blank for the default "~N mo" badge.
          </p>
        </div>

        <!-- Live affordability hint -->
        <p
          v-if="form.price && +form.price > 0 && wantsBudgetPerPeriod > 0"
          class="wish-afford-hint"
          :class="isAffordable(+form.price) ? 'wish-afford-hint--yes' : 'wish-afford-hint--no'"
        >
          {{ isAffordable(+form.price)
            ? `✓ Fits within your ${fmt(wantsBudgetPerPeriod)} bi-weekly wants budget.`
            : `✗ Over your ${fmt(wantsBudgetPerPeriod)} bi-weekly wants budget by ${fmt(+form.price - wantsBudgetPerPeriod)}.`
          }}
        </p>

        <!-- Live months-to-goal hint (BUG-019: extracted from IIFE to script fn) -->
        <p
          v-if="monthsHintText()"
          class="wish-months-hint"
        >
          {{ monthsHintText() }}
        </p>

        <p
          v-if="formError"
          class="form-error"
        >
          {{ formError }}
        </p>
      </div>

      <template #footer>
        <BaseButton
          variant="secondary"
          @click="showModal = false; resetForm()"
        >
          Cancel
        </BaseButton>
        <BaseButton
          :disabled="!!formError"
          @click="save"
        >
          {{ editingId ? 'Update' : 'Add' }}
        </BaseButton>
      </template>
    </BaseModal>
  </div>
</template>

<style scoped>
.wishlist-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* ─── Header ───────────────────────────────────────────────────── */
.wishlist-section__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.wishlist-section__meta {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.wishlist-section__count {
  font-size: 0.8rem;
  color: var(--muted);
}

.wishlist-section__total {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text);
  font-variant-numeric: tabular-nums;
}

.wishlist-section__rate {
  font-weight: 400;
  color: var(--muted);
}

.wishlist-section__controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

/* ─── Sort select ──────────────────────────────────────────────── */
.wishlist-sort {
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 0.3rem 0.55rem;
  font-size: 0.75rem;
  color: var(--text);
  font-family: inherit;
  cursor: pointer;
  height: 28px;
}

.wishlist-sort:focus {
  outline: none;
  border-color: var(--accent);
}

/* ─── Card grid ────────────────────────────────────────────────── */
/*
 * auto-fit (not auto-fill): empty tracks collapse to 0 so existing cards
 * always stretch to fill the available row width. Result: fewer items →
 * wider cards; more items → more columns. Cards grow and shrink naturally.
 *
 * min(220px, 100%) keeps the minmax safe on narrow containers so the
 * minimum never exceeds the container width and causes horizontal scroll.
 */
.wish-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(220px, 100%), 1fr));
  gap: 1rem;
  position: relative; /* required: leaving cards are pinned absolute so remaining cards reflow correctly */
}

/* ─── Card FLIP move transition (reorder on sort / delete) ──── */
/*
 * Enter / leave are handled by GSAP in useListTransition (see <script>).
 * The move-class is still CSS-based: Vue records element positions before
 * and after the DOM update, then applies a transform diff so cards slide
 * smoothly to their new positions when sorted or when a peer is deleted.
 */
.wish-card-move {
  transition: transform 0.32s ease;
}

/* Disable move animation for users who prefer reduced motion */
@media (prefers-reduced-motion: reduce) {
  .wish-card-move {
    transition: none;
  }
}

/* ─── Individual card ─────────────────────────────────────────── */
.wish-card {
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  transition: border-color 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease;
}

.wish-card:hover {
  border-color: color-mix(in srgb, var(--accent) 50%, var(--border));
  transform: translateY(-2px);
  box-shadow: 0 4px 16px color-mix(in srgb, var(--accent) 8%, transparent);
}

/* ─── Card top: icon box + months badge ───────────────────────── */
.wish-card__top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.5rem;
}

.wish-card__icon-box {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  background: color-mix(in srgb, var(--accent) 14%, var(--surface));
  border: 1px solid color-mix(in srgb, var(--accent) 25%, var(--border));
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.wish-icon {
  font-size: 1.4rem;
  line-height: 1;
}

/* ─── Months badge ────────────────────────────────────────────── */
.wish-card__months-badge {
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  padding: 2px 8px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--accent) 12%, var(--surface));
  color: var(--accent);
  border: 1px solid color-mix(in srgb, var(--accent) 25%, var(--border));
  white-space: nowrap;
  flex-shrink: 0;
  align-self: flex-start;
  margin-top: 2px;
}

.wish-card__months-badge--done {
  background: color-mix(in srgb, var(--success) 12%, var(--surface));
  color: var(--success);
  border-color: color-mix(in srgb, var(--success) 25%, var(--border));
}

/* ─── RS-28: target month badge + status chip ──────────────────── */
.wish-card__target-group {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  align-self: flex-start;
  margin-top: 2px;
  flex-shrink: 0;
}

.wish-card__target-badge {
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  padding: 3px 8px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--accent) 12%, var(--surface));
  color: var(--accent);
  border: 1px solid color-mix(in srgb, var(--accent) 25%, var(--border));
  white-space: nowrap;
}

.wish-card__status-chip {
  font-size: 0.64rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  padding: 2px 7px;
  border-radius: 999px;
  white-space: nowrap;
  border: 1px solid;
}

.wish-card__status-chip--complete {
  background: color-mix(in srgb, var(--success) 14%, var(--surface));
  color: var(--success);
  border-color: color-mix(in srgb, var(--success) 30%, var(--border));
}

.wish-card__status-chip--on-track {
  background: color-mix(in srgb, var(--accent2-text) 14%, var(--surface));
  color: var(--accent2-text);
  border-color: color-mix(in srgb, var(--accent2-text) 30%, var(--border));
}

.wish-card__status-chip--behind {
  background: color-mix(in srgb, var(--danger) 12%, var(--surface));
  color: var(--danger);
  border-color: color-mix(in srgb, var(--danger) 30%, var(--border));
}

.wish-card__required-hint {
  margin: 4px 0 0;
  font-size: 0.75rem;
  color: var(--danger);
  line-height: 1.4;
}

.wish-card__required-hint strong {
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

/* RS-28: inline-field hint used inside the modal form */
.wish-field-hint {
  margin: 0.25rem 0 0;
  font-size: 0.72rem;
  color: var(--muted);
  line-height: 1.4;
  max-width: 50ch;
}

/* ─── Name + price ────────────────────────────────────────────── */
.wish-name {
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--text);
  line-height: 1.3;
}

.wish-price {
  font-size: 1.25rem;
  font-weight: 800;
  color: var(--text);
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
  line-height: 1.2;
}

/* ─── Progress bar ────────────────────────────────────────────── */
.wish-card__progress-wrap {
  height: 6px;
  background: var(--border);
  border-radius: 999px;
  overflow: hidden;
}

.wish-card__progress-fill {
  height: 100%;
  background: var(--accent);
  border-radius: 999px;
  transition: width 0.4s ease;
  min-width: 0;
}

/* ─── Saved row: amount + pct + affordable chip ───────────────── */
.wish-card__saved-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: wrap;
}

.wish-card__saved-text {
  font-size: 0.78rem;
  color: var(--muted);
  font-variant-numeric: tabular-nums;
}

.wish-card__pct {
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--accent);
  font-variant-numeric: tabular-nums;
}

.wish-chip {
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  padding: 1px 6px;
  border-radius: 999px;
}

.wish-chip--affordable {
  background: color-mix(in srgb, var(--success) 12%, var(--surface));
  color: var(--success);
  border: 1px solid color-mix(in srgb, var(--success) 30%, var(--border));
}

/* ─── Inline savings form ─────────────────────────────────────── */
.wish-card__inline {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  padding: 0.5rem;
  background: var(--surface);
  border: 1px solid var(--accent);
  border-radius: 8px;
}

.wish-inline-wrap {
  position: relative;
}

.wish-inline-prefix {
  position: absolute;
  left: 0.55rem;
  top: 50%;
  transform: translateY(-50%);
  font-size: 0.82rem;
  color: var(--muted);
  pointer-events: none;
}

.wish-inline-input {
  width: 100%;
  padding: 0.35rem 0.55rem 0.35rem 1.4rem;
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: 6px;
  font-size: 0.88rem;
  color: var(--text);
  box-sizing: border-box;
  font-family: inherit;
}

.wish-inline-input:focus {
  outline: none;
  border-color: var(--accent);
}

.wish-inline-btns {
  display: flex;
  gap: 0.4rem;
}

.wish-inline-confirm,
.wish-inline-cancel {
  flex: 1;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.3rem 0.5rem;
  border-radius: 6px;
  border: 1px solid;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.15s, color 0.15s;
}

.wish-inline-confirm {
  background: var(--accent);
  color: #fff;
  border-color: var(--accent);
}

.wish-inline-confirm:hover {
  background: color-mix(in srgb, var(--accent) 85%, black);
}

.wish-inline-cancel {
  background: transparent;
  color: var(--muted);
  border-color: var(--border);
}

.wish-inline-cancel:hover {
  background: var(--surface2);
  color: var(--text);
}

/* ─── Actions row ─────────────────────────────────────────────── */
.wish-actions {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  flex-wrap: wrap;
  margin-top: auto;
  padding-top: 0.25rem;
  border-top: 1px solid var(--border);
}

.wish-card__add-savings {
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--accent);
  background: color-mix(in srgb, var(--accent) 10%, var(--surface));
  border: 1px solid color-mix(in srgb, var(--accent) 25%, var(--border));
  border-radius: 6px;
  padding: 2px 8px;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.15s, border-color 0.15s;
  white-space: nowrap;
}

.wish-card__add-savings:hover {
  background: color-mix(in srgb, var(--accent) 18%, var(--surface));
  border-color: var(--accent);
}

.wish-link-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 6px;
  background: var(--surface);
  border: 1px solid var(--border);
  font-size: 0.8rem;
  text-decoration: none;
  color: var(--text);
  transition: background 0.15s, border-color 0.15s;
  flex-shrink: 0;
  margin-left: auto;
}

.wish-link-btn:hover {
  background: var(--accent-soft);
  border-color: var(--accent);
}

/* ─── Modal form ───────────────────────────────────────────────── */
.modal-form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.form-row-icon {
  display: grid;
  grid-template-columns: 60px 1fr;
  gap: 0.75rem;
}

.form-row-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

@media (max-width: 480px) {
  .form-row-2 { grid-template-columns: 1fr; }
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.form-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--muted);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.form-input {
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 0.45rem 0.65rem;
  font-size: 0.9rem;
  color: var(--text);
  width: 100%;
  transition: border-color 0.15s;
  box-sizing: border-box;
  font-family: inherit;
}

.form-input:focus {
  outline: none;
  border-color: var(--accent);
}

.form-input-wrap {
  position: relative;
}

.form-input-prefix {
  position: absolute;
  left: 0.6rem;
  top: 50%;
  transform: translateY(-50%);
  font-size: 0.85rem;
  color: var(--muted);
  pointer-events: none;
}

.form-input--prefixed {
  padding-left: 1.4rem;
}

.icon-input {
  text-align: center;
  font-size: 1.25rem;
}

/* ─── Hints ────────────────────────────────────────────────────── */
.wish-afford-hint {
  font-size: 0.78rem;
  font-weight: 600;
  margin: 0;
  padding: 0.45rem 0.65rem;
  border-radius: 6px;
}

.wish-afford-hint--yes {
  background: color-mix(in srgb, var(--success) 10%, var(--surface));
  color: var(--success);
  border: 1px solid color-mix(in srgb, var(--success) 25%, var(--border));
}

.wish-afford-hint--no {
  background: color-mix(in srgb, var(--warn) 8%, var(--surface));
  color: var(--warn);
  border: 1px solid color-mix(in srgb, var(--warn) 25%, var(--border));
}

.wish-months-hint {
  font-size: 0.78rem;
  font-weight: 600;
  margin: 0;
  padding: 0.4rem 0.65rem;
  border-radius: 6px;
  background: color-mix(in srgb, var(--accent) 8%, var(--surface));
  color: var(--accent);
  border: 1px solid color-mix(in srgb, var(--accent) 20%, var(--border));
}

.form-error {
  font-size: 0.8rem;
  color: var(--danger);
  margin: 0;
}

/* ─── Responsive ────────────────────────────────────────────────── */
@media (max-width: 768px) {
  .wish-grid {
    /* Tighter minimum on mobile — cards still grow/shrink with auto-fit */
    grid-template-columns: repeat(auto-fit, minmax(min(160px, 100%), 1fr));
  }
}

@media (max-width: 480px) {
  .wish-card__target-badge { font-size: 0.72rem; }
  .wish-card__status-chip  { font-size: 0.72rem; }
  .wish-chip               { font-size: 0.72rem; }
}
</style>
