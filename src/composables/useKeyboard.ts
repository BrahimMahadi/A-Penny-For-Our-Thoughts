/**
 * Module:   composables/useKeyboard.ts
 * Project:  A Penny For Our Thoughts
 * Created:  May 2026 (Vue 3 migration — Sprint 2)
 * Summary:  Generic keyboard shortcut binder. Registers a keydown
 *           handler on mount, removes it on unmount.
 */

import { onMounted, onBeforeUnmount } from 'vue';

export interface ShortcutOptions {
  /** If true, only fires when no input/textarea/select is focused */
  guardFromInputs?: boolean;
}

/**
 * Bind a keyboard shortcut to a callback. Component-scoped — auto-cleanup
 * on unmount.
 *
 * Combo string syntax: 'Escape', 'cmd+k', 'shift+/', 'ctrl+s', etc.
 */
export function useKeyboard(
  combo: string,
  handler: (e: KeyboardEvent) => void,
  options: ShortcutOptions = {},
): void {
  const { guardFromInputs = false } = options;
  const parts = combo
    .toLowerCase()
    .split('+')
    .map((p) => p.trim());
  const key = parts[parts.length - 1];
  const needsMeta = parts.includes('cmd') || parts.includes('meta');
  const needsCtrl = parts.includes('ctrl');
  const needsShift = parts.includes('shift');
  const needsAlt = parts.includes('alt') || parts.includes('option');

  function onKey(e: KeyboardEvent) {
    if (guardFromInputs) {
      const t = e.target as HTMLElement | null;
      if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
      if (t && t.isContentEditable) return;
    }
    if (e.key.toLowerCase() !== key) return;
    if (needsMeta !== (e.metaKey || false)) return;
    if (needsCtrl !== (e.ctrlKey || false)) return;
    if (needsShift !== (e.shiftKey || false)) return;
    if (needsAlt !== (e.altKey || false)) return;
    handler(e);
  }

  onMounted(() => {
    window.addEventListener('keydown', onKey);
  });
  onBeforeUnmount(() => {
    window.removeEventListener('keydown', onKey);
  });
}
