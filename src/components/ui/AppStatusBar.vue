<!--
  Module:   components/ui/AppStatusBar.vue
  Project:  A Penny For Our Thoughts
  Created:  May 2026 (RS-8)
  Updated:  May 2026 (RS-8 rev) — moved to bottom, right-to-left CSS scroll ticker
  Summary:  Fixed strip pinned to the bottom of the viewport (desktop only,
            hidden at ≤768px). Two zones:
              Left  — continuous right-to-left CSS ticker (news / ESPN style).
                      Up to 5 recent purchases are rendered twice (original +
                      duplicate) so the animation loops seamlessly at -50%.
                      Hovers pause the ticker. Fades at edges with a mask gradient.
              Right — static "Up next" bill (first upcoming payPeriodForecast item).
            Both zones show graceful fallback text when no data exists.
-->

<script setup lang="ts">
import { computed } from 'vue';
import { useBudgetStore } from '@/stores/budget';
import { useAnalytics } from '@/composables/useAnalytics';
import { fmt } from '@/utils/format';

const budget = useBudgetStore();
const { payPeriodForecast } = useAnalytics();

// ─── Recent purchases ticker ──────────────────────────────────────
/** Last 5 wants purchases, newest first. */
const recentPurchases = computed(() =>
  [...budget.purchases]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5),
);

const hasPurchases = computed(() => recentPurchases.value.length > 0);

/**
 * Animation duration scales with item count so the scroll speed feels
 * consistent regardless of how many items are showing.
 * ~6 s per item, min 12 s.
 */
const tickerDuration = computed(() =>
  `${Math.max(recentPurchases.value.length * 6, 12)}s`,
);

// ─── Upcoming bills ticker ────────────────────────────────────────
const todayStr = new Date().toISOString().split('T')[0];

/** Up to 5 upcoming items in the current pay period, sorted chronologically. */
const upcomingBills = computed(() =>
  (payPeriodForecast.value?.dated ?? [])
    .filter(item => item.periodDate >= todayStr)
    .slice(0, 5),
);

const hasBills = computed(() => upcomingBills.value.length > 0);

/** Duration scales like the purchases ticker — ~7 s per item, min 14 s. */
const billTickerDuration = computed(() =>
  `${Math.max(upcomingBills.value.length * 7, 14)}s`,
);

// ─── Formatters ───────────────────────────────────────────────────
function daysAgo(dateStr: string): string {
  const ms = Date.now() - new Date(dateStr + 'T00:00:00').getTime();
  const d = Math.floor(ms / 86400000);
  if (d === 0) return 'today';
  if (d === 1) return 'yesterday';
  return `${d}d ago`;
}

function fmtDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-CA', {
    month: 'short',
    day:   'numeric',
  });
}
</script>

<template>
  <div
    class="app-status-bar"
    aria-label="Status bar"
    role="status"
  >

    <!-- ── Left: scrolling purchases ticker ─────────────────────── -->
    <div class="ticker-zone">
      <!-- Static label — always visible, acts as an anchor -->
      <span
        class="ticker-label"
        aria-hidden="true"
      >💳 RECENT</span>

      <div
        v-if="hasPurchases"
        class="ticker-wrap"
        :title="'Hover to pause'"
      >
        <div
          class="ticker-inner"
          :style="{ '--ticker-duration': tickerDuration }"
        >
          <!-- Original pass -->
          <template
            v-for="p in recentPurchases"
            :key="p.id"
          >
            <span class="ticker-item">
              <span class="ticker-item__name">{{ p.name }}</span>
              <span
                class="ticker-item__sep"
                aria-hidden="true"
              >·</span>
              <span class="ticker-item__amt">{{ fmt(p.amount) }}</span>
              <span
                class="ticker-item__sep"
                aria-hidden="true"
              >·</span>
              <span class="ticker-item__date">{{ daysAgo(p.date) }}</span>
            </span>
            <span
              class="ticker-bullet"
              aria-hidden="true"
            >◆</span>
          </template>

          <!-- Duplicate pass — creates the seamless loop -->
          <template
            v-for="p in recentPurchases"
            :key="`dup-${p.id}`"
          >
            <span
              class="ticker-item"
              aria-hidden="true"
            >
              <span class="ticker-item__name">{{ p.name }}</span>
              <span class="ticker-item__sep">·</span>
              <span class="ticker-item__amt">{{ fmt(p.amount) }}</span>
              <span class="ticker-item__sep">·</span>
              <span class="ticker-item__date">{{ daysAgo(p.date) }}</span>
            </span>
            <span
              class="ticker-bullet"
              aria-hidden="true"
            >◆</span>
          </template>
        </div>
      </div>

      <!-- Empty state -->
      <span
        v-else
        class="ticker-empty"
      >No recent purchases</span>
    </div>

    <!-- ── Divider ────────────────────────────────────────────────── -->
    <div
      class="status-divider"
      aria-hidden="true"
    />

    <!-- ── Right: scrolling upcoming-bills ticker ───────────────── -->
    <div class="bill-zone">
      <!-- Static label — always visible, acts as an anchor -->
      <span
        class="bill-label"
        aria-hidden="true"
      >📅 UPCOMING</span>

      <div
        v-if="hasBills"
        class="bill-wrap"
        :title="'Hover to pause'"
      >
        <div
          class="bill-inner"
          :style="{ '--bill-duration': billTickerDuration }"
        >
          <!-- Original pass -->
          <template
            v-for="b in upcomingBills"
            :key="`${b.periodDate}-${b.name}`"
          >
            <span class="bill-item">
              <span class="bill-item__name">{{ b.name }}</span>
              <span
                class="bill-item__sep"
                aria-hidden="true"
              >·</span>
              <span class="bill-item__amt">{{ fmt(b.amount) }}</span>
              <span
                class="bill-item__sep"
                aria-hidden="true"
              >·</span>
              <span class="bill-item__date">{{ fmtDate(b.periodDate) }}</span>
            </span>
            <span
              class="ticker-bullet"
              aria-hidden="true"
            >◆</span>
          </template>

          <!-- Duplicate pass — creates the seamless loop -->
          <template
            v-for="b in upcomingBills"
            :key="`dup-${b.periodDate}-${b.name}`"
          >
            <span
              class="bill-item"
              aria-hidden="true"
            >
              <span class="bill-item__name">{{ b.name }}</span>
              <span class="bill-item__sep">·</span>
              <span class="bill-item__amt">{{ fmt(b.amount) }}</span>
              <span class="bill-item__sep">·</span>
              <span class="bill-item__date">{{ fmtDate(b.periodDate) }}</span>
            </span>
            <span
              class="ticker-bullet"
              aria-hidden="true"
            >◆</span>
          </template>
        </div>
      </div>

      <!-- Empty state -->
      <span
        v-else
        class="ticker-empty"
      >Nothing due soon</span>
    </div>

  </div>
</template>

<style scoped>
/* ─── Bar shell ──────────────────────────────────────────────────── */
.app-status-bar {
  position: fixed;
  bottom: 0;
  left: 64px;          /* flush with the right edge of the sidebar */
  right: 0;
  z-index: 90;

  height: 36px;
  display: flex;
  align-items: center;
  gap: 0;

  background: var(--surface2);
  border-top: 1px solid var(--border);
  box-sizing: border-box;

  /* Hidden on mobile — BottomNav takes this space */
  @media (max-width: 768px) {
    display: none;
  }
}

/* ─── Ticker zone (left) ─────────────────────────────────────────── */
.ticker-zone {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 0;
  min-width: 0;
  overflow: hidden;
  height: 100%;
}

.ticker-label {
  flex-shrink: 0;
  font-size: 0.62rem;
  font-weight: 800;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--muted);
  padding: 0 0.65rem 0 0.85rem;
  border-right: 1px solid var(--border);
  height: 100%;
  display: flex;
  align-items: center;
  background: var(--surface2);
  white-space: nowrap;
}

/* Scroll window — clips the running content */
.ticker-wrap {
  flex: 1;
  overflow: hidden;
  height: 100%;
  display: flex;
  align-items: center;
  /* Soft fade at both edges */
  mask-image: linear-gradient(
    to right,
    transparent,
    black 4%,
    black 96%,
    transparent
  );
  -webkit-mask-image: linear-gradient(
    to right,
    transparent,
    black 4%,
    black 96%,
    transparent
  );
}

.ticker-wrap:hover .ticker-inner {
  animation-play-state: paused;
}

/* The running strip — duplicated content so the loop is seamless */
.ticker-inner {
  display: inline-flex;
  align-items: center;
  white-space: nowrap;
  gap: 0;
  animation: ticker-scroll var(--ticker-duration, 18s) linear infinite;
  will-change: transform;
}

@keyframes ticker-scroll {
  0%   { transform: translateX(0); }
  100% { transform: translateX(-50%); }  /* half = one full set of items */
}

/* ─── Individual ticker items ────────────────────────────────────── */
.ticker-item {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.78rem;
  padding: 0 0.3rem;
}

.ticker-item__name {
  font-weight: 600;
  color: var(--text);
}

.ticker-item__amt {
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--accent);
  font-variant-numeric: tabular-nums;
}

.ticker-item__date {
  font-size: 0.72rem;
  color: var(--muted);
}

.ticker-item__sep {
  color: var(--border);
  font-size: 0.65rem;
}

/* Bullet separator between items */
.ticker-bullet {
  font-size: 0.45rem;
  color: var(--accent);
  opacity: 0.5;
  padding: 0 0.7rem;
  flex-shrink: 0;
}

/* ─── Divider ────────────────────────────────────────────────────── */
.status-divider {
  width: 1px;
  height: 18px;
  background: var(--border);
  flex-shrink: 0;
  margin: 0 0.75rem;
}

/* ─── Bill zone (right) ──────────────────────────────────────────── */
.bill-zone {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 0;
  min-width: 0;
  overflow: hidden;
  height: 100%;
}

.bill-label {
  flex-shrink: 0;
  font-size: 0.62rem;
  font-weight: 800;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--muted);
  padding: 0 0.65rem 0 0.85rem;
  border-right: 1px solid var(--border);
  height: 100%;
  display: flex;
  align-items: center;
  background: var(--surface2);
  white-space: nowrap;
}

/* Scroll window — clips the running bill content */
.bill-wrap {
  flex: 1;
  overflow: hidden;
  height: 100%;
  display: flex;
  align-items: center;
  /* Soft fade at both edges */
  mask-image: linear-gradient(
    to right,
    transparent,
    black 4%,
    black 96%,
    transparent
  );
  -webkit-mask-image: linear-gradient(
    to right,
    transparent,
    black 4%,
    black 96%,
    transparent
  );
}

.bill-wrap:hover .bill-inner {
  animation-play-state: paused;
}

/* The running strip — duplicated content so the loop is seamless */
.bill-inner {
  display: inline-flex;
  align-items: center;
  white-space: nowrap;
  gap: 0;
  animation: ticker-scroll var(--bill-duration, 14s) linear infinite;
  will-change: transform;
}

/* ─── Individual bill items ──────────────────────────────────────── */
.bill-item {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.78rem;
  padding: 0 0.3rem;
}

.bill-item__name {
  font-weight: 600;
  color: var(--text);
}

.bill-item__amt {
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--warn);
  font-variant-numeric: tabular-nums;
}

.bill-item__date {
  font-size: 0.72rem;
  color: var(--muted);
}

.bill-item__sep {
  color: var(--border);
  font-size: 0.65rem;
}

/* ─── Empty states ───────────────────────────────────────────────── */
.ticker-empty {
  font-size: 0.73rem;
  color: var(--muted);
  font-style: italic;
  padding-left: 0.75rem;
}

/* ─── prefers-reduced-motion ─────────────────────────────────────── */
@media (prefers-reduced-motion: reduce) {
  .ticker-inner {
    animation: none;
  }
}
</style>
