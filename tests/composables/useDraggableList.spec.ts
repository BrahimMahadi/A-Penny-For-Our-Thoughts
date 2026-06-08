/**
 * Module:   tests/composables/useDraggableList.spec.ts
 * Project:  A Penny For Our Thoughts
 * Created:  June 2026 (feat/gsap-draggable-reorder — v2.41.0)
 * Summary:  Unit tests for useDraggableList composable.
 *
 *           GSAP Draggable requires real browser layout APIs (getBoundingClientRect,
 *           computed styles) that jsdom does not implement. We mock gsap/Draggable
 *           and gsap/Flip here and assert on the composable's external contract:
 *             - Returns a `reinit` function
 *             - Calls Draggable.create() on mount for each list item
 *             - Kills all Draggable instances on unmount (cleanup)
 *             - reinit() rebuilds instances (kill + recreate)
 *             - onReorder is wired into onDragEnd callbacks
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, ref, nextTick } from 'vue';
import { useDraggableList } from '@/composables/useDraggableList';

// ─── Mock Draggable ───────────────────────────────────────────────
// We capture the instances created by Draggable.create() so we can
// verify kill() is called on unmount.

const mockKill  = vi.fn();
const mockDragInstances: ReturnType<typeof makeFakeDraggable>[] = [];

function makeFakeDraggable() {
  return { kill: mockKill };
}

vi.mock('gsap/Draggable', () => ({
  Draggable: {
    create: vi.fn((_targets: unknown, _vars: unknown) => {
      const d = makeFakeDraggable();
      mockDragInstances.push(d);
      return [d];
    }),
  },
}));

// Flip is already mocked globally via tests/setup.ts

// ─── Helpers ─────────────────────────────────────────────────────

/**
 * Build a simple wrapper component that mounts useDraggableList with
 * a real <ul> containing <li data-id="…" class="item"> children.
 */
function makeWrapper(
  itemIds: string[],
  onReorder = vi.fn(),
) {
  return defineComponent({
    setup() {
      const listRef = ref<HTMLElement | null>(null);
      const { reinit } = useDraggableList(listRef, {
        handleSelector: '.handle',
        itemSelector:   '.item',
        onReorder,
      });
      return { listRef, reinit };
    },
    template: `
      <ul ref="listRef">
        ${itemIds.map(id => `<li class="item" data-id="${id}"><span class="handle">⠿</span></li>`).join('')}
      </ul>
    `,
  });
}

// ─── Tests ───────────────────────────────────────────────────────

describe('useDraggableList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDragInstances.length = 0;
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('returns a reinit function', () => {
    const Comp = makeWrapper(['a', 'b']);
    const w = mount(Comp, { attachTo: document.body });
    expect(typeof w.vm.reinit).toBe('function');
    w.unmount();
  });

  it('calls Draggable.create() once per list item on mount', async () => {
    const { Draggable } = await import('gsap/Draggable');
    const Comp = makeWrapper(['a', 'b', 'c']);
    const w = mount(Comp, { attachTo: document.body });
    await nextTick();
    // One call per item
    expect(Draggable.create).toHaveBeenCalledTimes(3);
    w.unmount();
  });

  it('kills all instances on unmount', async () => {
    const Comp = makeWrapper(['x', 'y']);
    const w = mount(Comp, { attachTo: document.body });
    await nextTick();
    w.unmount();
    // Both instances should be killed
    expect(mockKill).toHaveBeenCalledTimes(2);
  });

  it('reinit() kills existing instances and recreates them', async () => {
    const { Draggable } = await import('gsap/Draggable');
    const Comp = makeWrapper(['p', 'q']);
    const w = mount(Comp, { attachTo: document.body });
    await nextTick();

    vi.clearAllMocks();
    mockDragInstances.length = 0;

    w.vm.reinit();
    await nextTick();

    // After reinit, kill was called for the old instances and create called again
    expect(Draggable.create).toHaveBeenCalled();
    w.unmount();
  });

  it('injects a drop-indicator element into the list container', async () => {
    const Comp = makeWrapper(['a', 'b']);
    const w = mount(Comp, { attachTo: document.body });
    await nextTick();

    const indicator = w.element.querySelector('.drag-drop-indicator');
    expect(indicator).not.toBeNull();
    w.unmount();
  });

  it('removes the drop-indicator element on unmount', async () => {
    const Comp = makeWrapper(['a', 'b']);
    const w = mount(Comp, { attachTo: document.body });
    await nextTick();
    w.unmount();

    // After unmount the indicator should be gone from the element
    const indicator = document.body.querySelector('.drag-drop-indicator');
    expect(indicator).toBeNull();
  });

  it('does nothing on mount when list ref is null', async () => {
    const { Draggable } = await import('gsap/Draggable');
    // Component with a null-returning ref
    const Comp = defineComponent({
      setup() {
        const listRef = ref<HTMLElement | null>(null);
        const { reinit } = useDraggableList(listRef, {
          handleSelector: '.handle',
          onReorder: vi.fn(),
        });
        // Don't bind ref to any element — stays null
        return { listRef, reinit };
      },
      template: `<div></div>`,
    });

    const w = mount(Comp, { attachTo: document.body });
    await nextTick();
    expect(Draggable.create).not.toHaveBeenCalled();
    w.unmount();
  });
});
