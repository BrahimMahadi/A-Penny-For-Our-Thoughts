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
import { useGsap } from '@/composables/useGsap';

const { to, from, timeline } = useGsap();

/** Bump this string whenever new release notes should surface. */
const APP_VERSION = '2.22.0';

interface ReleaseNote { icon: string; text: string }

const RELEASE_NOTES: ReleaseNote[] = [
  { icon: '🚀', text: 'Supabase sync collapsed from 18 parallel queries into a single RPC call (fetch_user_data). Pool pressure on the free tier is now structurally impossible — not just papered over by the retry' },
  { icon: '🔒', text: 'The new RPC function runs as security invoker with a belt-and-braces auth.uid() check, so RLS still enforces per-user isolation on every subquery — same security model, just one round trip instead of eighteen' },
  { icon: '🧪', text: 'New 13-test SQL contract suite reads the migration file and pins the function signature, key shape, ordering, and grants — so adding a future table to the schema without wiring it through the RPC fails loudly in PR review, not silently at runtime' },
  { icon: '🛟', text: 'RS-30\'s retry helper kept as a defensive belt-and-braces. Cost is near-zero and it covers the transient deploy window where migrate.yml and deploy.yml race on push to main' },
  { icon: '✅', text: '1240 tests passing, zero TypeScript errors, zero new ESLint warnings — full quality gate maintained' },
];

const budget = useBudgetStore();

const visible = computed(
  () => budget.dismissedVersion !== APP_VERSION,
);

function dismiss(): void {
  budget.dismissWhatsNew(APP_VERSION);
}

// ─── GSAP transition hooks ────────────────────────────────────────────────
function onWnbEnter(el: Element, done: () => void): void {
  from(el, { opacity: 0, y: -10, duration: 0.25, ease: 'power2.out', onComplete: done });
}

function onWnbLeave(el: Element, done: () => void): void {
  const tl = timeline({ onComplete: done });
  tl.to(el, { opacity: 0, y: -8, duration: 0.15, ease: 'power2.in' });
  // Collapse height + margin so subsequent content flows up smoothly
  tl.to(el, { height: 0, marginBottom: 0, paddingTop: 0, paddingBottom: 0,
               duration: 0.2, ease: 'power2.inOut' }, '-=0.05');
}
</script>

<template>
  <Transition
    :css="false"
    @enter="onWnbEnter"
    @leave="onWnbLeave"
  >
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
    color-mix(in srgb, var(--accent, #5b3df5) 8%, var(--surface, #16161e)),
    var(--surface, #16161e)
  );
  border: 1px solid color-mix(in srgb, var(--accent, #5b3df5) 30%, var(--border, #2a3041));
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
  color: var(--accent, #5b3df5);
}

.wnb__close {
  background: transparent;
  border: 0;
  color: var(--muted, #8b8b95);
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
  background: var(--surface2, #1a1a24);
  color: var(--text, #e3e6ee);
}

.wnb__close:focus-visible {
  outline: 2px solid var(--accent, #5b3df5);
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
  color: var(--muted, #8b8b95);
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  line-height: 1.5;
}

.wnb__icon {
  flex-shrink: 0;
  font-size: 0.9rem;
}

/* prefers-reduced-motion is handled by useGsap — no CSS overrides needed */
</style>
