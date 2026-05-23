<!--
  Module:   components/onboarding/WhatsNewBanner.vue
  Project:  A Penny For Our Thoughts
  Created:  May 2026 (Sprint 10 — Onboarding Flow)
  Summary:  Dismissible "What's New" banner shown at the top of the
            dashboard whenever the stored dismissedVersion differs from
            the current APP_VERSION constant.

            Driven by a hardcoded version manifest — no remote fetching.
            Dismissed state is stored in BudgetState so it survives
            page reloads.

  Usage:
    <WhatsNewBanner />   (self-contained; reads + writes budget store)
-->

<script setup lang="ts">
import { computed } from 'vue';
import { useBudgetStore } from '@/stores/budget';

/** Bump this string whenever new release notes should surface. */
const APP_VERSION = '1.11.0';

interface ReleaseNote { icon: string; text: string }

const RELEASE_NOTES: ReleaseNote[] = [
  { icon: '📆', text: 'Custom-days frequency for subscriptions — mark a subscription as recurring on specific days of the week (e.g., parking Mon · Tue · Wed only)' },
  { icon: '🗓️', text: 'Calendar and Pay Period views badge each occurrence on its exact day for custom-days subscriptions' },
  { icon: '📋', text: 'List view collapses all custom-days occurrences into one row showing total count and monthly cost' },
  { icon: '📤', text: 'CSV import/export fully supports the new custom-days frequency and day-of-week data' },
];

const budget = useBudgetStore();

const visible = computed(
  () => budget.dismissedVersion !== APP_VERSION,
);

function dismiss(): void {
  budget.dismissWhatsNew(APP_VERSION);
}
</script>

<template>
  <Transition name="wnb">
    <div
      v-if="visible"
      class="wnb"
      role="status"
      aria-label="What's new in version {{ APP_VERSION }}"
    >
      <div class="wnb__inner">
        <div class="wnb__header">
          <span class="wnb__badge">✨ What's new in v{{ APP_VERSION }}</span>
          <button
            class="wnb__close"
            aria-label="Dismiss what's new"
            @click="dismiss"
          >
            ✕
          </button>
        </div>
        <ul class="wnb__list">
          <li
            v-for="note in RELEASE_NOTES"
            :key="note.text"
            class="wnb__item"
          >
            <span
              class="wnb__icon"
              aria-hidden="true"
            >{{ note.icon }}</span>
            {{ note.text }}
          </li>
        </ul>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.wnb {
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--accent, #4ade80) 8%, var(--surface, #0a1810)),
    var(--surface, #0a1810)
  );
  border: 1px solid color-mix(in srgb, var(--accent, #4ade80) 30%, var(--border, #2a3041));
  border-radius: 10px;
  margin-bottom: 1.25rem;
  overflow: hidden;
}

.wnb__inner {
  padding: 0.85rem 1rem;
}

.wnb__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.6rem;
}

.wnb__badge {
  font-size: 0.78rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--accent, #4ade80);
}

.wnb__close {
  background: transparent;
  border: 0;
  color: var(--muted, #5a7a63);
  font-size: 0.9rem;
  cursor: pointer;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s ease, color 0.15s ease;
  flex-shrink: 0;
}

.wnb__close:hover {
  background: var(--surface2, #0f2018);
  color: var(--text, #e3e6ee);
}

.wnb__close:focus-visible {
  outline: 2px solid var(--accent, #4ade80);
  outline-offset: 2px;
}

.wnb__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.wnb__item {
  font-size: 0.83rem;
  color: var(--muted, #5a7a63);
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  line-height: 1.5;
}

.wnb__icon {
  flex-shrink: 0;
  font-size: 0.9rem;
}

/* Slide-down enter / slide-up leave */
.wnb-enter-active,
.wnb-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease, margin-bottom 0.2s ease;
}

.wnb-enter-from,
.wnb-leave-to {
  opacity: 0;
  transform: translateY(-8px);
  margin-bottom: 0;
}

@media (prefers-reduced-motion: reduce) {
  .wnb-enter-active,
  .wnb-leave-active {
    transition: none;
  }
}
</style>
