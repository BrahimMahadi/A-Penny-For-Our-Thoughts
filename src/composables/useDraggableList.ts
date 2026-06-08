/**
 * Module:   composables/useDraggableList.ts
 * Project:  A Penny For Our Thoughts
 * Created:  June 2026 (feat/gsap-draggable-reorder — v2.41.0)
 * Summary:  GSAP Draggable + Flip drag-to-reorder composable for list sections.
 *
 *           Usage:
 *             const { reinit } = useDraggableList(listRef, {
 *               handleSelector: '.drag-handle',
 *               itemSelector:   '.draggable-item',
 *               onReorder: (orderedIds) => budget.reorderIncomeStreams(orderedIds),
 *             });
 *
 *           The composable:
 *             - Attaches a Draggable (y-axis only) to each item via a handle
 *             - Shows a colour-coded drop-indicator line during drag
 *             - Uses Flip.from() to animate the reorder into place on drop
 *             - Respects prefers-reduced-motion (all durations → 0)
 *             - Cleans up all Draggable instances on component unmount
 *             - Exposes `reinit()` so the caller can rebuild when the list
 *               data changes (e.g., after an item is added or removed)
 *
 *           NOTE: the list container must have `position: relative` so the
 *           absolute-positioned drop indicator sits inside it correctly.
 */

import { onMounted, onUnmounted, type Ref } from 'vue';
import gsap from 'gsap';
import { Draggable } from 'gsap/Draggable';
import { Flip } from 'gsap/Flip';
import { prefersReducedMotion } from '@/composables/useGsap';

gsap.registerPlugin(Draggable, Flip);

// ─── Public types ─────────────────────────────────────────────────

export interface DraggableListOptions {
  /** CSS selector for the drag handle element inside each item */
  handleSelector: string;
  /** CSS selector for each draggable item inside the list (default: '> li') */
  itemSelector?: string;
  /**
   * Called after a successful drag-drop with the new ordered array of
   * `data-id` attribute values (one per list item).
   */
  onReorder: (orderedIds: string[]) => void;
  /** Duration for the Flip animation in seconds (default: 0.42) */
  flipDuration?: number;
  /** GSAP ease for the Flip animation (default: 'power3.out') */
  flipEase?: string;
}

// ─── Constants ────────────────────────────────────────────────────

const INDICATOR_HEIGHT = 2;   // px — height of the drop line
const LIFT_SCALE       = 1.02; // slight scale-up while dragging
const LIFT_SHADOW      = '0 8px 24px rgba(0,0,0,0.18)';
const DROP_ANIM_SCALE  = { duration: 0.18, ease: 'power2.out' };

// ─── Composable ───────────────────────────────────────────────────

export function useDraggableList(
  listRef: Ref<HTMLElement | null>,
  options: DraggableListOptions,
) {
  const {
    handleSelector,
    itemSelector = '> li',
    onReorder,
    flipDuration = 0.42,
    flipEase     = 'power3.out',
  } = options;

  /** Active Draggable instances — killed and rebuilt on every `reinit()` */
  let instances: Draggable[] = [];

  /** Drop-indicator <div> injected once into the list container */
  let indicator: HTMLElement | null = null;

  // ─── Indicator helpers ─────────────────────────────────────────

  function createIndicator(container: HTMLElement): HTMLElement {
    const el = document.createElement('div');
    el.className = 'drag-drop-indicator';
    el.style.cssText = [
      'position:absolute',
      'left:0',
      'right:0',
      `height:${INDICATOR_HEIGHT}px`,
      'background:var(--accent)',
      'border-radius:999px',
      'pointer-events:none',
      'opacity:0',
      'z-index:100',
      'transition:top 0.08s ease',
    ].join(';');
    container.style.position = 'relative';
    container.appendChild(el);
    return el;
  }

  function showIndicator(top: number): void {
    if (!indicator) return;
    indicator.style.top = `${top}px`;
    indicator.style.opacity = '1';
  }

  function hideIndicator(): void {
    if (!indicator) return;
    indicator.style.opacity = '0';
  }

  // ─── Drop-target calculation ───────────────────────────────────

  /**
   * Given the visual Y-centre of the dragged item and the dragged element
   * itself, return the sibling element *before which* the dragged item should
   * be inserted (or `null` to append at the end).
   */
  function calcInsertBefore(
    dragCenterY: number,
    draggedItem: HTMLElement,
    items: HTMLElement[],
  ): HTMLElement | null {
    let insertBefore: HTMLElement | null = null;

    for (const item of items) {
      if (item === draggedItem) continue;
      const rect   = item.getBoundingClientRect();
      const midY   = rect.top + rect.height / 2;
      if (dragCenterY < midY) {
        insertBefore = item;
        break;
      }
    }
    return insertBefore;
  }

  /**
   * Return the top offset (relative to list container) at which to draw the
   * indicator line for a given insertion point.
   */
  function indicatorTop(
    insertBefore: HTMLElement | null,
    container: HTMLElement,
    items: HTMLElement[],
  ): number {
    const containerRect = container.getBoundingClientRect();

    if (insertBefore) {
      const rect = insertBefore.getBoundingClientRect();
      return rect.top - containerRect.top - INDICATOR_HEIGHT / 2;
    }

    // Append at end — bottom edge of the last item
    const last = items[items.length - 1];
    if (last) {
      const rect = last.getBoundingClientRect();
      return rect.bottom - containerRect.top - INDICATOR_HEIGHT / 2;
    }
    return 0;
  }

  // ─── Core init / destroy ───────────────────────────────────────

  function init(): void {
    const container = listRef.value;
    if (!container) return;

    // Kill any previous instances before rebuilding
    destroy();

    // Create (or reuse) the indicator element
    if (!indicator) {
      indicator = createIndicator(container);
    }

    const items = Array.from(
      container.querySelectorAll<HTMLElement>(itemSelector),
    );

    instances = items.map((item) => {
      return Draggable.create(item, {
        type: 'y',
        bounds: container,
        trigger: item.querySelector<HTMLElement>(handleSelector) ?? item,
        zIndexBoost: false,

        onPress() {
          // Lift the dragged item visually
          gsap.to(item, {
            scale: LIFT_SCALE,
            boxShadow: LIFT_SHADOW,
            zIndex: 10,
            duration: DROP_ANIM_SCALE.duration,
            ease: DROP_ANIM_SCALE.ease,
          });
        },

        onDrag(this: Draggable) {
          const allItems = Array.from(
            container.querySelectorAll<HTMLElement>(itemSelector),
          );
          // Visual centre of the dragged item, accounting for GSAP's y transform
          const rect     = item.getBoundingClientRect();
          const centerY  = rect.top + rect.height / 2;

          const insertBefore = calcInsertBefore(centerY, item, allItems);
          showIndicator(indicatorTop(insertBefore, container, allItems));
        },

        onDragEnd(this: Draggable) {
          hideIndicator();

          const allItems = Array.from(
            container.querySelectorAll<HTMLElement>(itemSelector),
          );
          const rect    = item.getBoundingClientRect();
          const centerY = rect.top + rect.height / 2;
          const insertBefore = calcInsertBefore(centerY, item, allItems);

          // Snap: reset GSAP y transform before Flip snapshot
          const flipState = Flip.getState(allItems);

          // Move the dragged item in the DOM
          container.insertBefore(item, insertBefore ?? null);

          // Reset inline transforms so Flip can calculate from/to cleanly
          gsap.set(item, { y: 0, scale: 1, boxShadow: 'none', zIndex: '' });

          const reduced = prefersReducedMotion();
          Flip.from(flipState, {
            duration: reduced ? 0 : flipDuration,
            ease: flipEase,
            stagger: reduced ? 0 : 0.03,
            onComplete: () => {
              // Clear any lingering inline styles Flip might leave
              allItems.forEach((el) => gsap.set(el, { clearProps: 'transform,box-shadow,z-index' }));
            },
          });

          // Derive new order from updated DOM order
          const reorderedItems = Array.from(
            container.querySelectorAll<HTMLElement>(itemSelector),
          );
          const orderedIds = reorderedItems
            .map((el) => el.dataset.id ?? '')
            .filter(Boolean);

          onReorder(orderedIds);

          // Rebuild Draggable instances to match the new DOM order
          // (we defer slightly so Flip has a frame to settle)
          requestAnimationFrame(() => init());
        },
      })[0];
    });
  }

  function destroy(): void {
    instances.forEach((d) => d.kill());
    instances = [];
  }

  // ─── Lifecycle ────────────────────────────────────────────────

  onMounted(() => init());
  onUnmounted(() => {
    destroy();
    // Remove the indicator element on unmount
    indicator?.remove();
    indicator = null;
  });

  return {
    /** Re-initialise after the list data changes (items added / removed). */
    reinit: init,
  };
}
