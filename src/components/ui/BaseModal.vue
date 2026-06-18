<!--
  Module:   components/ui/BaseModal.vue
  Project:  A Penny For Our Thoughts
  Created:  May 2026 (Vue 3 migration — Sprint 2)
  Modified: May 2026 (RS-17) — GSAP spring entrance (back.out ease)
  Summary:  Accessible modal: Teleport to body, slot-driven content,
            scroll lock, ESC to close, focus trap, click-outside dismiss.
            Entrance/exit animated by GSAP: backdrop fades while the panel
            springs up with a slight overshoot (back.out(1.4)).

  Usage:
    <BaseModal v-model:open="isOpen" title="Edit goal">
      <div>…fields…</div>
      <template #footer>
        <BaseButton @click="save">Save</BaseButton>
      </template>
    </BaseModal>
-->

<script setup lang="ts">
import { ref, watch, nextTick, computed, onBeforeUnmount } from 'vue';
import { useModal } from '@/composables/useModal';
import { useGsap } from '@/composables/useGsap';

const { timeline } = useGsap();

interface Props {
  /** Two-way bind: visibility */
  open: boolean;
  /** Header title; can be replaced via #header slot */
  title?: string;
  /** Modal width preset */
  size?: 'sm' | 'md' | 'lg';
  /** Clicking the backdrop closes the modal */
  closeOnBackdrop?: boolean;
  /** Show the default ✕ close button in the header */
  closable?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  title: '',
  size: 'md',
  closeOnBackdrop: true,
  closable: true,
});

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void;
  (e: 'close'): void;
}>();

const isOpen = computed({
  get: () => props.open,
  set: (v: boolean) => emit('update:open', v),
});

const dialogRef = ref<HTMLElement | null>(null);
let previouslyFocused: HTMLElement | null = null;

function close(): void {
  emit('update:open', false);
  emit('close');
}

useModal(isOpen, close);

/* ── Focus management ─────────────────────────────────────────── */
async function focusFirst(): Promise<void> {
  await nextTick();
  if (!dialogRef.value) return;
  const focusables = dialogRef.value.querySelectorAll<HTMLElement>(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
  );
  const first = focusables[0];
  if (first) first.focus();
  else dialogRef.value.focus();
}

/* ── 9A: Virtual keyboard awareness (visualViewport) ─────────── */
function scrollFocusedIntoView(): void {
  const focused = document.activeElement as HTMLElement | null;
  if (focused && dialogRef.value?.contains(focused)) {
    focused.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

let vpResizeHandler: (() => void) | null = null;

function attachViewportListener(): void {
  if (!window.visualViewport) return;
  vpResizeHandler = scrollFocusedIntoView;
  window.visualViewport.addEventListener('resize', vpResizeHandler);
}

function detachViewportListener(): void {
  if (!window.visualViewport || !vpResizeHandler) return;
  window.visualViewport.removeEventListener('resize', vpResizeHandler);
  vpResizeHandler = null;
}

watch(
  () => props.open,
  (open) => {
    if (open) {
      previouslyFocused = document.activeElement as HTMLElement | null;
      focusFirst();
      attachViewportListener();
    } else {
      detachViewportListener();
      if (previouslyFocused) {
        previouslyFocused.focus();
        previouslyFocused = null;
      }
    }
  },
);

onBeforeUnmount(detachViewportListener);

/* ── Focus trap (Tab cycling inside the modal) ────────────────── */
function onKeydown(e: KeyboardEvent): void {
  if (e.key !== 'Tab' || !dialogRef.value) return;
  const focusables = Array.from(
    dialogRef.value.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  );
  if (!focusables.length) return;
  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}

function onBackdropClick(): void {
  if (props.closeOnBackdrop) close();
}

// ─── GSAP transition hooks ────────────────────────────────────────────────
// The <Transition :css="false"> wrapper calls these instead of CSS classes.

function onModalEnter(el: Element, done: () => void): void {
  const overlay = el as HTMLElement;
  const dialog  = overlay.querySelector<HTMLElement>('.base-modal');
  if (!dialog) { done(); return; }

  const tl = timeline({ onComplete: done });
  tl.from(overlay, { opacity: 0, duration: 0.2, ease: 'power2.out' });
  tl.from(dialog,  { y: 22, scale: 0.97, opacity: 0, duration: 0.32,
                     ease: 'back.out(1.4)' }, 0);
}

function onModalLeave(el: Element, done: () => void): void {
  const overlay = el as HTMLElement;
  const dialog  = overlay.querySelector<HTMLElement>('.base-modal');
  if (!dialog) { done(); return; }

  const tl = timeline({ onComplete: done });
  tl.to(dialog,  { y: 10, scale: 0.97, opacity: 0, duration: 0.18,
                   ease: 'power2.in' });
  tl.to(overlay, { opacity: 0, duration: 0.16, ease: 'power2.in' }, 0);
}
</script>

<template>
  <Teleport to="body">
    <Transition
      :css="false"
      @enter="onModalEnter"
      @leave="onModalLeave"
    >
      <div
        v-if="open"
        class="base-modal-overlay"
        @mousedown.self="onBackdropClick"
      >
        <div
          ref="dialogRef"
          class="base-modal"
          :class="`base-modal--${size}`"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="title ? 'base-modal-title' : undefined"
          tabindex="-1"
          @keydown="onKeydown"
        >
          <header
            v-if="title || $slots.header || closable"
            class="base-modal__header"
          >
            <slot name="header">
              <h2
                v-if="title"
                id="base-modal-title"
                class="base-modal__title"
              >
                {{ title }}
              </h2>
            </slot>
            <button
              v-if="closable"
              type="button"
              class="base-modal__close"
              aria-label="Close modal"
              @click="close"
            >
              ✕
            </button>
          </header>

          <div class="base-modal__body">
            <slot />
          </div>

          <footer
            v-if="$slots.footer"
            class="base-modal__footer"
          >
            <slot name="footer" />
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.base-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9000;
  padding: 1rem;
}

.base-modal {
  background: var(--surface, #16161e);
  border: 1px solid var(--border, #2a3041);
  border-radius: 12px;
  padding: 1.5rem;
  width: 100%;
  /* dvh accounts for the virtual keyboard — falls back to vh in older browsers */
  max-height: calc(100vh - 2rem);
  max-height: calc(100dvh - 2rem);
  overflow-y: auto;
  color: var(--text, #e3e6ee);
  box-shadow: 0 30px 80px rgba(0, 0, 0, 0.55);
}

.base-modal:focus-visible {
  outline: none;
}

.base-modal--sm {
  max-width: 380px;
}
.base-modal--md {
  max-width: 520px;
}
.base-modal--lg {
  max-width: 720px;
}

.base-modal__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}

.base-modal__title {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.base-modal__close {
  background: transparent;
  border: 0;
  color: var(--muted, #8b8b95);
  font-size: 1.2rem;
  cursor: pointer;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s ease, color 0.15s ease;
}
.base-modal__close:hover {
  background: var(--surface2, #1a1a24);
  color: var(--text, #e3e6ee);
}
.base-modal__close:focus-visible {
  outline: 2px solid var(--accent, #5b3df5);
  outline-offset: 2px;
}

.base-modal__body {
  /* Children control their own spacing */
}

.base-modal__footer {
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border, #2a3041);
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

/* ─── 9C: Bottom-sheet layout on phones ─────────────────────── */
@media (max-width: 480px) {
  .base-modal-overlay {
    align-items: flex-end;
    padding: 0;
  }

  .base-modal {
    position: relative;
    max-width: 100%;
    border-radius: 20px 20px 0 0;
    border-bottom: 0;
    /* Extra top padding to make room for the drag handle pill */
    padding-top: 2rem;
    /* Respect device safe area (notch phones) */
    padding-bottom: max(1.5rem, env(safe-area-inset-bottom, 0px));
    /* 9A: dvh keeps the sheet below the keyboard on modern iOS */
    max-height: 90vh;
    max-height: 90dvh;
  }

  /* Drag handle — visual affordance above the modal header */
  .base-modal::before {
    content: '';
    position: absolute;
    top: 0.75rem;
    left: 50%;
    transform: translateX(-50%);
    width: 36px;
    height: 4px;
    background: var(--border-light, #2c2c3a);
    border-radius: 2px;
  }

  /* 9D: Close button — minimum 44×44 touch target */
  .base-modal__close {
    width: 44px;
    height: 44px;
  }
}
</style>
