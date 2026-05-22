/**
 * Module:   composables/useChartStyles.ts
 * Project:  A Penny For Our Thoughts
 * Created:  May 2026 (Vue 3 migration — Sprint 3)
 * Summary:  Reactive chart style tokens derived from CSS custom properties.
 *           Re-evaluates automatically when the theme store toggles
 *           dark ↔ light so chart colours always match the active theme.
 *
 *           Usage:
 *             const styles = useChartStyles();   // ComputedRef<ChartStyles>
 *             // Inside another computed:
 *             plugins: { tooltip: styles.value.tooltip }
 */

import { computed, type ComputedRef } from 'vue';
import { useThemeStore } from '@/stores/theme';
import { cssVar, hexToRgba } from '@/utils/dom';

// ─── Shared constant ─────────────────────────────────────────────
export const CHART_FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

// ─── Type ────────────────────────────────────────────────────────
export interface ChartStyles {
  /** Pre-built Chart.js tooltip plugin config with theme-aware colours. */
  tooltip: Record<string, unknown>;
  /** Tick / axis label colour. */
  tickColor: string;
  /** Grid line colour. */
  gridColor: string;
  /** Shared font family string. */
  fontFamily: string;
  /** Primary accent colour (green). */
  accent: string;
  /** Secondary accent colour (blue-green). */
  accent2: string;
  /** Surface background. */
  surface: string;
  /** Elevated surface. */
  surface2: string;
  /** Danger / red. */
  danger: string;
  /** Warning / amber. */
  warn: string;
  /** Convenience alias for hexToRgba — collocated so callers don't import dom.ts. */
  rgba: (hex: string, alpha: number) => string;
}

// ─── Composable ──────────────────────────────────────────────────
/**
 * Return a `ComputedRef<ChartStyles>` that re-computes whenever the
 * theme store toggles.  Every chart option object that spreads or
 * reads from `styles.value` will also invalidate and re-render.
 */
export function useChartStyles(): ComputedRef<ChartStyles> {
  const theme = useThemeStore();

  return computed<ChartStyles>(() => {
    // Accessing `theme.mode` registers this computed as a dependent of the
    // theme store — next toggle invalidates the cached value so all chart
    // colour computeds downstream re-run with the fresh CSS variable values.
    void theme.mode;

    const g = (name: string) => cssVar(name);

    return {
      tooltip: {
        backgroundColor: g('--chart-tooltip-bg'),
        titleColor:      g('--chart-tooltip-text'),
        bodyColor:       g('--chart-tooltip-text'),
        borderColor:     g('--chart-tooltip-border'),
        borderWidth:  1,
        padding:      12,
        // weight must be a number — Chart.js FontSpec.weight: number | 'bold' | ...
        titleFont: { size: 13, weight: 700, family: CHART_FONT },
        bodyFont:  { size: 12, weight: 400, family: CHART_FONT },
      },
      tickColor:  g('--chart-tick'),
      gridColor:  g('--chart-grid'),
      fontFamily: CHART_FONT,
      accent:     g('--accent'),
      accent2:    g('--accent2'),
      surface:    g('--surface'),
      surface2:   g('--surface2'),
      danger:     g('--danger'),
      warn:       g('--warn'),
      rgba:       hexToRgba,
    };
  });
}
