<!--
  Module:   components/ui/CardHoverFX.vue
  Project:  A Penny For Our Thoughts
  Created:  May 2026 (Sprint RS-21 — Card Hover Effects)
  Summary:  Purely decorative render component that injects the shine,
            background, tile, and line DOM nodes required by card-hover.css
            into any card that adopts the .card-hfx host class.

  Usage:
    1. Add class="card-hfx" to the card's root element.
    2. Drop <CardHoverFX /> (or <CardHoverFX :tiles="false" />) as the
       LAST child inside that element so natural DOM order ensures the
       decoration layers sit below all card content in the paint order.

  Props:
    tiles  (default true)  When false the blinking tile layer is omitted.
                           Use for large section cards where the tile grid
                           would look sparse (e.g. BaseCard, SavingsGoals).

  Z-stacking:
    Both rendered elements use z-index:-1 inside the parent's
    isolation:isolate stacking context — they are always behind card
    content without requiring any change to existing child z-index values.

  Accessibility:
    Both root elements carry aria-hidden="true" — they are purely visual
    and must be invisible to assistive technologies.
-->

<script setup lang="ts">
defineOptions({ inheritAttrs: false });

interface Props {
  /**
   * When false the .chfx-tiles element and its 10 tile children are not
   * rendered. Use on larger cards where the tile animation looks sparse.
   */
  tiles?: boolean;
}

withDefaults(defineProps<Props>(), { tiles: true });
</script>

<template>
  <!-- Conic-gradient glow layer -->
  <div
    class="chfx-shine"
    aria-hidden="true"
  />

  <!-- Tile grid + line grid (clipped to top-right by CSS mask) -->
  <div
    class="chfx-bg"
    aria-hidden="true"
  >
    <div
      v-if="tiles"
      class="chfx-tiles"
    >
      <div class="chfx-tile chfx-tile--1" />
      <div class="chfx-tile chfx-tile--2" />
      <div class="chfx-tile chfx-tile--3" />
      <div class="chfx-tile chfx-tile--4" />
      <div class="chfx-tile chfx-tile--5" />
      <div class="chfx-tile chfx-tile--6" />
      <div class="chfx-tile chfx-tile--7" />
      <div class="chfx-tile chfx-tile--8" />
      <div class="chfx-tile chfx-tile--9" />
      <div class="chfx-tile chfx-tile--10" />
    </div>

    <div class="chfx-line chfx-line--1" />
    <div class="chfx-line chfx-line--2" />
    <div class="chfx-line chfx-line--3" />
  </div>
</template>
