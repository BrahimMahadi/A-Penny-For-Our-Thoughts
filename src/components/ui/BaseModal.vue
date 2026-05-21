<!--
  Module:   components/ui/BaseModal.vue
  Project:  A Penny For Our Thoughts
  Created:  May 2026 (Vue 3 migration — Sprint 2)
  Summary:  Accessible modal: Teleport to body, slot-driven content,
            scroll lock, ESC to close, focus trap, click-outside dismiss.

  Usage:
    <BaseModal v-model:open="isOpen" title="Edit goal">
      <div>…fields…</div>
      <template #footer>
        <BaseButton @click="save">Save</BaseButton>
      </template>
    </BaseModal>
-->

<script setup lang="ts">
import { ref, watch, nextTick, computed } from 'vue';
import { useModal } from '@/composables/useModal';

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

watch(
  () => props.open,
  (open) => {
    if (open) {
      previouslyFocused = document.activeElement as HTMLElement | null;
      focusFirst();
    } else if (previouslyFocused) {
      previouslyFocused.focus();
      previouslyFocused = null;
    }
  },
);

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
</script>

<template>
  <Teleport to="body">
    <Transition name="base-modal">
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
  background: var(--surface, #0a1810);
  border: 1px solid var(--border, #2a3041);
  border-radius: 12px;
  padding: 1.5rem;
  width: 100%;
  max-height: calc(100vh - 2rem);
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
  color: var(--muted, #5a7a63);
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
  background: var(--surface2, #0f2018);
  color: var(--text, #e3e6ee);
}
.base-modal__close:focus-visible {
  outline: 2px solid var(--accent, #4ade80);
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

/* Enter / leave transitions */
.base-modal-enter-active,
.base-modal-leave-active {
  transition: opacity 0.2s ease;
}
.base-modal-enter-active .base-modal,
.base-modal-leave-active .base-modal {
  transition:
    transform 0.2s cubic-bezier(0.16, 1, 0.3, 1),
    opacity 0.2s ease;
}
.base-modal-enter-from,
.base-modal-leave-to {
  opacity: 0;
}
.base-modal-enter-from .base-modal,
.base-modal-leave-to .base-modal {
  transform: translateY(20px) scale(0.98);
  opacity: 0;
}

@media (max-width: 540px) {
  .base-modal-overlay {
    padding: 0.5rem;
  }
}
</style>
