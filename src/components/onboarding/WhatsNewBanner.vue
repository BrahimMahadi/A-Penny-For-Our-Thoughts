<!--
  Module:   components/onboarding/WhatsNewBanner.vue
  Project:  A Penny For Our Thoughts
  Created:  May 2026 (Sprint 10 — Onboarding Flow)
  Summary:  Dismissible "What's New" banner shown at the top of the
            dashboard whenever the stored dismissedVersion differs from
            the current APP_VERSION constant.

            On mobile (≤768px) the banner starts collapsed to a single
            compact bar — tap it to expand the release notes. On desktop
            it is always fully expanded (no collapse behaviour).

            Driven by a hardcoded version manifest — no remote fetching.
            Dismissed state is stored in BudgetState so it survives
            page reloads.

  Usage:
    <WhatsNewBanner />   (self-contained; reads + writes budget store)
-->

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useBudgetStore } from '@/stores/budget';
import { useGsap } from '@/composables/useGsap';

const { to, from, timeline } = useGsap();

/** Bump this string whenever new release notes should surface. */
const APP_VERSION = '2.47.0';

interface ReleaseNote { icon: string; text: string }

const RELEASE_NOTES: ReleaseNote[] = [
  { icon: '📲', text: 'Install Penny to your home screen — on iPhone use Share → Add to Home Screen, on Android tap the install prompt. It opens full-screen with no browser chrome' },
  { icon: '¢', text: 'New app icon: a cent-sign monogram on the brand violet, replacing the emoji favicon' },
  { icon: '👆', text: 'Tactile feedback: the bottom nav, More sheet and floating button now respond to your touch with a subtle press and spring-back' },
  { icon: '🧷', text: 'Scrolling a modal or the More sheet to its edge no longer drags the page behind it, or triggers an accidental pull-to-refresh' },
]

const budget = useBudgetStore();

const visible = computed(
  () => budget.dismissedVersion !== APP_VERSION,
);

/** Collapsed by default on mobile; the desktop always-expanded state
 *  is enforced by CSS (`.wnb__body--collapsed` is overridden at >768px). */
const isCollapsed = ref(true);

function toggleCollapsed(): void {
  if (window.innerWidth > 768) return;
  isCollapsed.value = !isCollapsed.value;
}

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
      :aria-label="`What's new in version ${APP_VERSION}`"
    >
      <!-- Bar row — acts as expand/collapse toggle on mobile -->
      <div
        class="wnb__bar"
        role="button"
        tabindex="0"
        :aria-expanded="!isCollapsed"
        aria-controls="wnb-body"
        @click="toggleCollapsed"
        @keydown.enter="toggleCollapsed"
        @keydown.space.prevent="toggleCollapsed"
      >
        <span class="wnb__badge">✨ What's new in v{{ APP_VERSION }}</span>
        <span
          class="wnb__chevron"
          :class="{ 'wnb__chevron--open': !isCollapsed }"
          aria-hidden="true"
        >▾</span>
        <button
          class="wnb__close"
          aria-label="Dismiss what's new"
          @click.stop="dismiss"
        >
          ✕
        </button>
      </div>

      <!-- Release notes body — collapsed on mobile until tapped -->
      <div
        id="wnb-body"
        class="wnb__body"
        :class="{ 'wnb__body--collapsed': isCollapsed }"
      >
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

/* ── Bar row (always visible) ── */
.wnb__bar {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.85rem 1rem 0.6rem;
}

.wnb__badge {
  flex: 1;
  font-size: 0.78rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--accent, #5b3df5);
}

/* Chevron — hidden on desktop, shown on mobile */
.wnb__chevron {
  display: none;
  font-size: 0.8rem;
  color: var(--muted, #8b8b95);
  transition: transform 0.2s ease;
  flex-shrink: 0;
  line-height: 1;
}

.wnb__chevron--open {
  transform: rotate(180deg);
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
  transition: background var(--transition-fast), color var(--transition-fast);
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

/* ── Body (release notes) ── */
.wnb__body {
  padding: 0 1rem 0.85rem;
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

/* ── Mobile collapse behaviour (≤768px) ── */
@media (max-width: 768px) {
  .wnb__bar {
    padding: 0.6rem 1rem;
    cursor: pointer;
    user-select: none;
  }

  .wnb__chevron {
    display: inline-flex;
    align-items: center;
  }

  .wnb__body {
    overflow: hidden;
    max-height: 400px;
    opacity: 1;
    padding: 0.5rem 1rem 0.85rem;
    border-top: 1px solid color-mix(in srgb, var(--accent, #5b3df5) 15%, var(--border, #23232f));
    transition: max-height 0.25s ease, opacity 0.2s ease, padding 0.2s ease, border-top-color 0.2s ease;
  }

  .wnb__body--collapsed {
    max-height: 0;
    opacity: 0;
    padding-top: 0;
    padding-bottom: 0;
    border-top-color: transparent;
  }
}

/* prefers-reduced-motion is handled by useGsap — no CSS overrides needed */
</style>
