<!--
  Module:   components/sections/GoalsTimeline.vue
  Project:  A Penny For Our Thoughts
  Created:  May 2026 (Sprint 12 — Trend Charts & Goals Timeline)
  Summary:  Compact goals timeline card. Lists all savings goals ranked by
            urgency (soonest target date first), showing projected completion
            date, months-late status, and a mini progress bar.
            Answers "will I hit my savings goals on time?"
-->

<script setup lang="ts">
import { useAnalytics } from '@/composables/useAnalytics';
import ProgressBar from '@/components/ui/ProgressBar.vue';
import EmptyState from '@/components/ui/EmptyState.vue';
import { fmt } from '@/utils/format';
import type { GoalTimelineItem } from '@/utils/calculations';

const { goalsTimeline } = useAnalytics();

// ─── Display helpers ──────────────────────────────────────────────

function statusLabel(item: GoalTimelineItem): string {
  if (item.status === 'complete') return '✓ Complete';
  if (item.status === 'missed')   return '✗ Past due';
  if (item.monthsLate === null)   return '? No allocation';
  if (item.monthsLate <= 0)       return `On track`;
  return `${item.monthsLate}mo late`;
}

function statusClass(item: GoalTimelineItem): string {
  if (item.status === 'complete')           return 'tl-status--complete';
  if (item.status === 'missed')             return 'tl-status--over';
  if (item.monthsLate === null)             return 'tl-status--warn';
  if (item.monthsLate <= 0)                 return 'tl-status--ok';
  if (item.status === 'caution')            return 'tl-status--warn';
  return 'tl-status--over';
}

function barStatus(item: GoalTimelineItem): 'on-track' | 'caution' | 'over' {
  if (item.status === 'on-track' || item.status === 'complete') return 'on-track';
  if (item.status === 'caution') return 'caution';
  return 'over';
}

function projectionLabel(item: GoalTimelineItem): string {
  if (item.status === 'complete') return 'Goal reached!';
  if (item.status === 'missed')   return `Target was ${item.targetDate}`;
  if (!item.projectedDate)        return 'Set an allocation to project';
  return `Projected ${item.projectedDate}`;
}

function formatTargetDate(ym: string): string {
  // 'YYYY-MM' → 'Dec 2027'
  const [year, month] = ym.split('-').map(Number);
  const d = new Date(year, month - 1, 1);
  return d.toLocaleString('default', { month: 'short', year: 'numeric' });
}
</script>

<template>
  <div class="goals-timeline">
    <!-- Empty state -->
    <EmptyState
      v-if="goalsTimeline.length === 0"
      icon="🗓️"
      title="No savings goals"
      hint="Add goals in the Savings Goals section to track projected completion dates."
    />

    <!-- Timeline list -->
    <ul
      v-else
      class="tl-list"
    >
      <li
        v-for="item in goalsTimeline"
        :key="item.id"
        class="tl-item"
        :class="statusClass(item)"
      >
        <!-- Header row: account name + status badge -->
        <div class="tl-item__header">
          <span class="tl-item__name">{{ item.accountName }}</span>
          <span
            class="tl-status-badge"
            :class="statusClass(item)"
          >
            {{ statusLabel(item) }}
          </span>
        </div>

        <!-- Progress bar -->
        <ProgressBar
          :percent="item.progressPercent"
          :status="barStatus(item)"
          size="sm"
          :label="`${fmt(item.currentAmount)} / ${fmt(item.targetAmount)}`"
          :aria-label="`Goal progress for ${item.accountName}: ${item.progressPercent.toFixed(0)}%`"
        />

        <!-- Footer: target date + projection -->
        <div class="tl-item__footer">
          <span class="tl-item__meta">
            Target: <strong>{{ formatTargetDate(item.targetDate) }}</strong>
          </span>
          <span class="tl-item__projection">
            {{ projectionLabel(item) }}
          </span>
        </div>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.goals-timeline {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.tl-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.tl-item {
  border: 1px solid var(--border);
  border-left: 3px solid var(--border);
  border-radius: 8px;
  padding: 0.7rem 0.85rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  background: var(--surface2);
  transition: border-left-color 0.15s;
}

/* Left-border accent per status */
.tl-item.tl-status--ok       { border-left-color: var(--accent2); }
.tl-item.tl-status--warn     { border-left-color: var(--warn); }
.tl-item.tl-status--over     { border-left-color: var(--danger); }
.tl-item.tl-status--complete { border-left-color: var(--accent); }

/* ── Header ────────────────────────────────────────────────────── */
.tl-item__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
}

.tl-item__name {
  font-size: 0.88rem;
  font-weight: 700;
  color: var(--text);
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ── Status badge ─────────────────────────────────────────────── */
.tl-status-badge {
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  padding: 2px 7px;
  border-radius: 4px;
  white-space: nowrap;
  flex-shrink: 0;
}

.tl-status-badge.tl-status--ok {
  background: rgba(52, 211, 153, 0.12);
  color: var(--accent2);
}
.tl-status-badge.tl-status--warn {
  background: rgba(251, 191, 36, 0.12);
  color: var(--warn);
}
.tl-status-badge.tl-status--over {
  background: rgba(248, 113, 113, 0.12);
  color: var(--danger);
}
.tl-status-badge.tl-status--complete {
  background: rgba(74, 222, 128, 0.12);
  color: var(--accent);
}

/* ── Footer ────────────────────────────────────────────────────── */
.tl-item__footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.tl-item__meta,
.tl-item__projection {
  font-size: 0.72rem;
  color: var(--muted);
}

.tl-item__projection {
  font-style: italic;
}
</style>
