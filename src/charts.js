/* ═══════════════════════════════════════════════════════════════
   Module:   charts.js
   Project:  A Penny For Our Thoughts
   Created:  May 2026
   Summary:  All Chart.js instance management. Instances are reused
             across renders via in-place data updates (chart.update()),
             falling back to full create only when the canvas is
             detached or the instance is null.
   Functions: renderWantsDonut, renderCcBarChart,
              renderAnalyticsLineChart, renderAnalyticsBarChart,
              renderBudgetVsActualChart, renderNetWorthChart
   Depends on: utils.js (fmt, cssVar, hexToRgba), Chart.js (CDN global)
═══════════════════════════════════════════════════════════════ */

import { fmt, cssVar, hexToRgba } from './utils.js';
import { getTopCategories } from './analytics.js';

// ────────────────────────────────────────────────────────────────
// CHART INSTANCES
// ────────────────────────────────────────────────────────────────
export let wantsChart             = null;
export let ccChart                = null;
export let analyticsLineChart     = null;
export let analyticsBarChart      = null;
export let momTrendChart          = null;
export let budgetVsActualChart    = null;
export let netWorthChart          = null;
export let forecastBarChart       = null;

/**
 * Returns true if the Chart.js instance exists and its canvas is
 * still mounted in the DOM. If the canvas has been detached (e.g.
 * after a theme-triggered re-render) we must create a new instance.
 */
export function _chartValid(instance) {
  return !!(instance && instance.canvas && instance.canvas.isConnected);
}

// ────────────────────────────────────────────────────────────────
// SHARED CHART STYLE HELPERS
// ────────────────────────────────────────────────────────────────
export const CHART_FONT_FAMILY = '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

/**
 * Read all theme-aware chart style tokens from the current CSS variables.
 * Called at the start of each chart render function so that colours always
 * reflect the active theme (dark or light) at render time.
 *
 * @returns {{ tooltip: object, tickColor: string, gridColor: string,
 *             accent: string, accent2: string, surface: string,
 *             surface2: string, danger: string, warn: string }} Style tokens.
 */
export function getChartStyles() {
  const g = n => cssVar(n);
  return {
    tooltip: {
      backgroundColor: g('--chart-tooltip-bg'),
      titleColor:      g('--chart-tooltip-text'),
      bodyColor:       g('--chart-tooltip-text'),
      borderColor:     g('--chart-tooltip-border'),
      borderWidth: 1,
      padding: 12,
      titleFont: { size: 13, weight: '700' },
      bodyFont:  { size: 12 },
    },
    tickColor:  g('--chart-tick'),
    gridColor:  g('--chart-grid'),
    fontFamily: CHART_FONT_FAMILY,
    accent:     g('--accent'),
    accent2:    g('--accent2'),
    surface:    g('--surface'),
    surface2:   g('--surface2'),
    danger:     g('--danger'),
    warn:       g('--warn'),
  };
}

/**
 * Destroy all Chart.js instances and reset their references to null.
 * Called by applyTheme() before renderAll() so that charts are
 * recreated with the new theme's colours instead of being updated
 * in-place with stale dataset colours.
 *
 * @returns {void}
 */
export function resetAllCharts() {
  [wantsChart, ccChart, analyticsLineChart, analyticsBarChart, momTrendChart, budgetVsActualChart, netWorthChart, forecastBarChart]
    .forEach(c => { if (c) c.destroy(); });
  wantsChart = ccChart = analyticsLineChart = analyticsBarChart = momTrendChart = budgetVsActualChart = netWorthChart = forecastBarChart = null;
}

// ────────────────────────────────────────────────────────────────
// WANTS DONUT
// ────────────────────────────────────────────────────────────────
/**
 * Render (or update in-place) the Wants envelope donut chart.
 * Each spending category is rendered as its own coloured arc using the
 * shared CATEGORY_COLOURS palette. A neutral "remaining" arc fills
 * whatever budget is left. Subscriptions deducted this period appear as
 * a separate indigo arc labelled "Subscriptions".
 *
 * @param {Object<string,number>} categorySpending
 *   Per-category totals, e.g. { 'Food & Drink': 45, Subscriptions: 20 }.
 *   Pass an empty object when nothing has been spent.
 * @param {number} remaining - Remaining balance after all spending (clamped ≥ 0 by caller).
 * @param {number} usedPct   - Percentage of the envelope used (0-100+), used only to colour the centre text.
 * @returns {void}
 */
export function renderWantsDonut(categorySpending, remaining, usedPct) {
  const S = getChartStyles();
  const SUBS_COLOUR = S.accent;    // subscriptions arc matches primary accent
  const REST_COLOUR = S.surface2;  // unused envelope — neutral surface tint

  // Build per-segment arrays from non-zero spending entries
  const entries = Object.entries(categorySpending).filter(([, v]) => v > 0);
  const labels  = entries.map(([cat]) => cat);
  const data    = entries.map(([, v]) => v);
  const colors  = entries.map(([cat]) =>
    cat === 'Subscriptions' ? SUBS_COLOUR : (CATEGORY_COLOURS[cat] || '#8b95ad'));

  // Remaining envelope segment (grey) — absent when overspent
  if (remaining > 0) {
    labels.push('Remaining');
    data.push(remaining);
    colors.push(REST_COLOUR);
  }

  // Empty-state guard: show a plain grey ring when nothing has been spent/allocated
  if (data.length === 0) {
    labels.push('Remaining');
    data.push(1);
    colors.push(REST_COLOUR);
  }

  if (_chartValid(wantsChart)) {
    wantsChart.data.labels                         = labels;
    wantsChart.data.datasets[0].data               = data;
    wantsChart.data.datasets[0].backgroundColor    = colors;
    wantsChart.data.datasets[0].borderColor        = Array(data.length).fill('transparent');
    wantsChart.update();
    return;
  }

  if (wantsChart) { wantsChart.destroy(); wantsChart = null; }
  wantsChart = new Chart(document.getElementById('wantsDonut'), {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: colors,
        borderColor: Array(data.length).fill('transparent'),
        borderWidth: 0,
        borderRadius: 2,
      }],
    },
    options: {
      cutout: '72%',
      plugins: {
        legend: { display: false },
        tooltip: {
          ...S.tooltip,
          padding: 10,
          titleFont: { size: 12, weight: '700' },
          bodyFont: { size: 11 },
          callbacks: {
            title: ctx => ctx[0].label,
            label: ctx => ' ' + fmt(ctx.parsed),
          },
        },
      },
      animation: { duration: 600, easing: 'easeInOutQuart' },
    },
  });
}

// ────────────────────────────────────────────────────────────────
// CREDIT CARD BAR
// ────────────────────────────────────────────────────────────────
/**
 * Render (or update in-place) the stacked credit card utilisation bar chart.
 * Each bar shows Balance (coloured by utilisation %) and Available credit (grey).
 *
 * @param {Array<{name: string, balance: number, limit: number}>} cards
 *   Array of credit card objects from state.
 * @returns {void}
 */
export function renderCcBarChart(cards) {
  const S = getChartStyles();
  const labels    = cards.map(c => c.name.split(' ').slice(0, 2).join(' '));
  const balances  = cards.map(c => +c.balance);
  const available = cards.map(c => Math.max(0, +c.limit - +c.balance));
  const bgColors  = cards.map(c => {
    const p = (+c.balance / +c.limit) * 100;
    return p > 50 ? S.danger : p > 30 ? S.warn : S.accent2;
  });

  if (_chartValid(ccChart)) {
    ccChart.data.labels                        = labels;
    ccChart.data.datasets[0].data              = balances;
    ccChart.data.datasets[0].backgroundColor   = bgColors;
    ccChart.data.datasets[1].data              = available;
    ccChart.update();
    return;
  }

  if (ccChart) { ccChart.destroy(); ccChart = null; }
  ccChart = new Chart(document.getElementById('ccBar'), {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Balance',
          data: balances,
          backgroundColor: bgColors,
          borderColor: 'transparent',
          borderRadius: 6,
          borderSkipped: false,
        },
        {
          label: 'Available',
          data: available,
          backgroundColor: S.surface2,
          borderColor: 'transparent',
          borderRadius: 6,
          borderSkipped: false,
        },
      ],
    },
    options: {
      responsive: true,
      stacked: true,
      plugins: {
        legend: {
          labels: {
            color: S.tickColor,
            font: { size: 12, weight: '600', family: CHART_FONT_FAMILY },
            padding: 14,
            usePointStyle: true,
            pointStyle: 'rect',
          },
        },
        tooltip: { ...S.tooltip, callbacks: { label: ctx => ' ' + ctx.dataset.label + ': ' + fmt(ctx.parsed.y) } },
      },
      scales: {
        x: {
          ticks: { color: S.tickColor, font: { size: 11, family: CHART_FONT_FAMILY } },
          grid: { color: S.gridColor, drawBorder: false },
        },
        y: {
          ticks: { color: S.tickColor, font: { size: 11, family: CHART_FONT_FAMILY }, callback: v => '$' + v.toLocaleString() },
          grid: { color: S.gridColor, drawBorder: false },
        },
      },
    },
  });
}

// ────────────────────────────────────────────────────────────────
// ANALYTICS — LINE (spending over time)
// ────────────────────────────────────────────────────────────────
/**
 * Render (or update in-place) the Analytics spending-over-time line chart.
 * Destroys the instance and returns early when `history` is empty.
 *
 * @param {Array<{label?: string, date: string, total: number}>} history
 *   Filtered spending history periods from `getFilteredSpendingHistory()`.
 * @returns {void}
 */
export function renderAnalyticsLineChart(history) {
  if (!history.length) {
    if (analyticsLineChart) { analyticsLineChart.destroy(); analyticsLineChart = null; }
    return;
  }

  const labels = history.map(p => p.label || p.date);
  const data   = history.map(p => p.total);

  if (_chartValid(analyticsLineChart)) {
    analyticsLineChart.data.labels            = labels;
    analyticsLineChart.data.datasets[0].data  = data;
    analyticsLineChart.update();
    return;
  }

  const S = getChartStyles();
  if (analyticsLineChart) { analyticsLineChart.destroy(); analyticsLineChart = null; }
  analyticsLineChart = new Chart(document.getElementById('analyticsLine'), {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Spending Over Time',
        data,
        borderColor: S.accent,
        backgroundColor: hexToRgba(S.accent, 0.1),
        fill: true,
        tension: 0.4,
        pointBackgroundColor: S.accent,
        pointBorderColor: S.surface,
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 7,
        borderWidth: 3,
      }],
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          display: true,
          labels: {
            color: S.tickColor,
            font: { size: 12, weight: '600', family: CHART_FONT_FAMILY },
            padding: 16,
            usePointStyle: true,
            pointStyle: 'circle',
          },
        },
        tooltip: { ...S.tooltip, callbacks: { label: ctx => ' Spent: ' + fmt(ctx.parsed.y) } },
      },
      scales: {
        x: {
          ticks: { color: S.tickColor, font: { size: 11, family: CHART_FONT_FAMILY }, maxRotation: 45 },
          grid: { color: S.gridColor, drawBorder: false },
        },
        y: {
          ticks: { color: S.tickColor, font: { size: 11, family: CHART_FONT_FAMILY }, callback: v => '$' + v.toLocaleString() },
          grid: { color: S.gridColor, drawBorder: false },
        },
      },
    },
  });
}

// ────────────────────────────────────────────────────────────────
// ANALYTICS — BAR (top spending categories)
// ────────────────────────────────────────────────────────────────
/**
 * Render (or update in-place) the Analytics top-categories horizontal bar chart.
 * Data is derived from `getTopCategories(filteredHistory)`.
 * Destroys the instance and returns early when there are no categories.
 *
 * @param {Array<{items?: Array<{name: string, amount: number, category?: string}>}>} filteredHistory
 *   Filtered spending history from `getFilteredSpendingHistory()`.
 * @returns {void}
 */
export function renderAnalyticsBarChart(filteredHistory) {
  const topCats = getTopCategories(filteredHistory);
  if (!topCats.length) {
    if (analyticsBarChart) { analyticsBarChart.destroy(); analyticsBarChart = null; }
    return;
  }

  const labels = topCats.map(([name]) => name);
  const data   = topCats.map(([, amt]) => amt);

  if (_chartValid(analyticsBarChart)) {
    analyticsBarChart.data.labels           = labels;
    analyticsBarChart.data.datasets[0].data = data;
    analyticsBarChart.update();
    return;
  }

  const S = getChartStyles();
  if (analyticsBarChart) { analyticsBarChart.destroy(); analyticsBarChart = null; }
  analyticsBarChart = new Chart(document.getElementById('analyticsBar'), {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Top Categories',
        data,
        backgroundColor: S.accent2,
        borderColor: hexToRgba(S.accent2, 0.3),
        borderWidth: 1,
        borderRadius: 6,
      }],
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      plugins: {
        legend: {
          display: true,
          labels: {
            color: S.tickColor,
            font: { size: 12, weight: '600', family: CHART_FONT_FAMILY },
            padding: 16,
            usePointStyle: true,
            pointStyle: 'rect',
          },
        },
        tooltip: { ...S.tooltip, callbacks: { label: ctx => ' Total: ' + fmt(ctx.parsed.x) } },
      },
      scales: {
        x: {
          ticks: { color: S.tickColor, font: { size: 11, family: CHART_FONT_FAMILY }, callback: v => '$' + v.toLocaleString() },
          grid: { color: S.gridColor, drawBorder: false },
        },
        y: {
          ticks: { color: S.tickColor, font: { size: 11, family: CHART_FONT_FAMILY } },
          grid: { color: S.gridColor, drawBorder: false },
        },
      },
    },
  });
}

// ────────────────────────────────────────────────────────────────
// BUDGET VS. ACTUAL — BAR
// ────────────────────────────────────────────────────────────────
/**
 * Render (or update in-place) the Budget vs. Actual grouped bar chart
 * showing Needs / Wants / Savings budgeted vs. actual spending.
 *
 * @param {{ needs: number, wants: number, savings: number }} budgeted
 *   Budgeted amounts from `getMonthBudgeted()`.
 * @param {{ needs: number, wants: number, savings: number }} actuals
 *   Actual amounts from `getMonthActuals()`.
 * @returns {void}
 */
export function renderBudgetVsActualChart(budgeted, actuals) {
  const budgetedData = [budgeted.needs, budgeted.wants, budgeted.savings];
  const actualsData  = [actuals.needs,  actuals.wants,  actuals.savings];

  if (_chartValid(budgetVsActualChart)) {
    budgetVsActualChart.data.datasets[0].data = budgetedData;
    budgetVsActualChart.data.datasets[1].data = actualsData;
    budgetVsActualChart.update();
    return;
  }

  const S = getChartStyles();
  if (budgetVsActualChart) { budgetVsActualChart.destroy(); budgetVsActualChart = null; }
  budgetVsActualChart = new Chart(
    document.getElementById('budgetVsActualChart').getContext('2d'),
    {
      type: 'bar',
      data: {
        labels: ['Needs', 'Wants', 'Savings'],
        datasets: [
          {
            label: 'Budgeted',
            data: budgetedData,
            backgroundColor: S.accent,
            borderColor: hexToRgba(S.accent, 0.3),
            borderWidth: 1,
            borderRadius: 6,
          },
          {
            label: 'Actual',
            data: actualsData,
            backgroundColor: S.accent2,
            borderColor: hexToRgba(S.accent2, 0.3),
            borderWidth: 1,
            borderRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            labels: {
              color: S.tickColor,
              font: { size: 12, weight: '600' },
              usePointStyle: true,
              pointStyle: 'rect',
            },
          },
          tooltip: { ...S.tooltip, callbacks: { label: ctx => ' ' + ctx.dataset.label + ': ' + fmt(ctx.parsed.y) } },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { callback: v => fmt(v), color: S.tickColor, font: { size: 11 } },
            grid: { color: S.gridColor, drawBorder: false },
          },
          x: {
            ticks: { color: S.tickColor, font: { size: 11 } },
            grid: { display: false },
          },
        },
      },
    }
  );
}

// ────────────────────────────────────────────────────────────────
// NET WORTH — LINE
// ────────────────────────────────────────────────────────────────
/**
 * Render (or update in-place) the Net Worth line chart.
 * Line and fill colour adapt dynamically to positive (green) or
 * negative (red) net worth.  A note element (`#nw-chart-note`) is
 * shown when fewer than 2 data points exist.
 *
 * @param {Array<{date: string, netWorth: number}>} history
 *   Array of monthly snapshots from `state.netWorthHistory`, sorted ascending.
 * @returns {void}
 */
export function renderNetWorthChart(history) {
  const canvas = document.getElementById('netWorthChart');
  if (!canvas) return;

  const labels    = history.map(h => {
    const [y, m] = h.date.split('-');
    return new Date(+y, +m - 1).toLocaleString('en-CA', { month: 'short', year: '2-digit' });
  });
  const values    = history.map(h => h.netWorth);
  const lastValue = values[values.length - 1] ?? 0;

  const noteEl = document.getElementById('nw-chart-note');
  if (noteEl) noteEl.style.display = history.length < 2 ? 'block' : 'none';

  const S = getChartStyles();
  const positiveColor = hexToRgba(S.accent2, 0.8);
  const negativeColor = hexToRgba(S.danger,  0.8);
  const lineColor     = lastValue >= 0 ? positiveColor : negativeColor;
  const fillColor     = lastValue >= 0 ? hexToRgba(S.accent2, 0.08) : hexToRgba(S.danger, 0.08);

  if (_chartValid(netWorthChart)) {
    netWorthChart.data.labels                        = labels;
    netWorthChart.data.datasets[0].data              = values;
    netWorthChart.data.datasets[0].borderColor       = lineColor;
    netWorthChart.data.datasets[0].backgroundColor   = fillColor;
    netWorthChart.data.datasets[0].pointBackgroundColor = lineColor;
    netWorthChart.data.datasets[0].pointRadius       = history.length === 1 ? 6 : 3;
    netWorthChart.update();
    return;
  }

  if (netWorthChart) { netWorthChart.destroy(); netWorthChart = null; }
  netWorthChart = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Net Worth',
        data: values,
        borderColor: lineColor,
        backgroundColor: fillColor,
        borderWidth: 2,
        pointRadius: history.length === 1 ? 6 : 3,
        pointBackgroundColor: lineColor,
        tension: 0.3,
        fill: true,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => ' ' + fmt(ctx.parsed.y) } },
      },
      scales: {
        x: {
          grid: { color: S.gridColor },
          ticks: { color: S.tickColor, font: { size: 11 } },
        },
        y: {
          grid: { color: S.gridColor },
          ticks: { color: 'var(--muted)', font: { size: 11 }, callback: v => '$' + (v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v) },
        },
      },
    },
  });
}

// ────────────────────────────────────────────────────────────────
// SCHEDULE — 6-MONTH FORECAST BAR
// ────────────────────────────────────────────────────────────────
/**
 * Render (or update in-place) the 6-month recurring expense forecast bar chart.
 * Bars are coloured green (under budget) or red (over budget).
 * A horizontal budget reference line is drawn across all bars.
 * Clicking a bar calls onBarClick(year, month) to navigate the schedule.
 *
 * @param {Array<{year,month,label,total,budgeted}>} forecastData
 *   From getSixMonthForecast().
 * @param {function(year:number, month:number):void} onBarClick
 *   Callback invoked when the user clicks a bar.
 * @returns {void}
 */
export function renderForecastBarChart(forecastData, onBarClick) {
  const canvas = document.getElementById('forecastBarChart');
  if (!canvas) return;

  const S        = getChartStyles();
  const labels   = forecastData.map(d => d.label);
  const totals   = forecastData.map(d => d.total);
  const budgeted = forecastData[0]?.budgeted ?? 0;
  const barColors = forecastData.map(d =>
    d.total > d.budgeted ? hexToRgba(S.danger, 0.8) : hexToRgba(S.accent2, 0.8));
  const hoverColors = forecastData.map(d =>
    d.total > d.budgeted ? S.danger : S.accent2);

  if (_chartValid(forecastBarChart)) {
    forecastBarChart.data.labels                        = labels;
    forecastBarChart.data.datasets[0].data              = totals;
    forecastBarChart.data.datasets[0].backgroundColor   = barColors;
    forecastBarChart.data.datasets[0].hoverBackgroundColor = hoverColors;
    forecastBarChart.data.datasets[1].data              = Array(labels.length).fill(budgeted);
    forecastBarChart.update();
    return;
  }

  if (forecastBarChart) { forecastBarChart.destroy(); forecastBarChart = null; }
  forecastBarChart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Recurring Bills',
          data: totals,
          backgroundColor: barColors,
          hoverBackgroundColor: hoverColors,
          borderColor: 'transparent',
          borderRadius: 6,
          borderSkipped: false,
          order: 2,
        },
        {
          label: 'Needs Budget',
          data: Array(labels.length).fill(budgeted),
          type: 'line',
          borderColor: hexToRgba(S.accent, 0.6),
          backgroundColor: 'transparent',
          borderWidth: 2,
          borderDash: [5, 4],
          pointRadius: 0,
          order: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: S.tickColor,
            font: { size: 11, weight: '600', family: CHART_FONT_FAMILY },
            padding: 12,
            usePointStyle: true,
            pointStyle: 'rect',
          },
        },
        tooltip: {
          ...S.tooltip,
          callbacks: {
            label: ctx => ctx.dataset.type === 'line'
              ? ' Budget: ' + fmt(ctx.parsed.y)
              : ' Bills: ' + fmt(ctx.parsed.y),
          },
        },
      },
      scales: {
        x: {
          ticks: { color: S.tickColor, font: { size: 11, family: CHART_FONT_FAMILY } },
          grid:  { color: S.gridColor, drawBorder: false },
        },
        y: {
          beginAtZero: true,
          ticks: { color: S.tickColor, font: { size: 11, family: CHART_FONT_FAMILY }, callback: v => '$' + (v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v) },
          grid:  { color: S.gridColor, drawBorder: false },
        },
      },
      onClick(event, elements) {
        if (!elements.length || !onBarClick) return;
        const idx = elements[0].index;
        const d   = forecastData[idx];
        if (d) onBarClick(d.year, d.month);
      },
      onHover(event, elements) {
        event.native.target.style.cursor = elements.length ? 'pointer' : 'default';
      },
    },
  });
}

// ────────────────────────────────────────────────────────────────
// MONTH-OVER-MONTH TREND CHART
// ────────────────────────────────────────────────────────────────
/**
 * Render (or update in-place) the Monthly Wants Spending trend bar chart.
 * The current month's bar uses a brighter accent colour; past months are muted.
 * Shows the Wants budget as a dashed reference line.
 *
 * @param {Array<{label:string, total:number, isCurrent:boolean}>} monthlyData
 *   From getMonthlyWantsHistory().
 * @param {number} wantsBudget
 *   Monthly Wants budget amount (drawn as dashed reference line).
 * @returns {void}
 */
export function renderMomTrendChart(monthlyData, wantsBudget) {
  const canvas = document.getElementById('momTrendChart');
  if (!canvas) return;

  const S      = getChartStyles();
  const labels = monthlyData.map(d => d.label);
  const totals = monthlyData.map(d => d.total);
  const colors = monthlyData.map(d =>
    d.isCurrent ? S.accent2 : hexToRgba(S.accent2, 0.45));
  const hoverColors = monthlyData.map(d =>
    d.isCurrent ? hexToRgba(S.accent2, 0.9) : hexToRgba(S.accent2, 0.65));

  if (_chartValid(momTrendChart)) {
    momTrendChart.data.labels                            = labels;
    momTrendChart.data.datasets[0].data                  = totals;
    momTrendChart.data.datasets[0].backgroundColor       = colors;
    momTrendChart.data.datasets[0].hoverBackgroundColor  = hoverColors;
    momTrendChart.data.datasets[1].data                  = Array(labels.length).fill(wantsBudget);
    momTrendChart.update();
    return;
  }

  if (momTrendChart) { momTrendChart.destroy(); momTrendChart = null; }
  momTrendChart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          type: 'bar',
          label: 'Wants Spending',
          data: totals,
          backgroundColor: colors,
          hoverBackgroundColor: hoverColors,
          borderRadius: 6,
          order: 2,
        },
        {
          type: 'line',
          label: 'Wants Budget',
          data: Array(labels.length).fill(wantsBudget),
          borderColor: hexToRgba(S.accent, 0.7),
          borderDash: [5, 4],
          borderWidth: 2,
          pointRadius: 0,
          fill: false,
          order: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          labels: {
            color: S.tickColor,
            font: { size: 11, weight: '600', family: CHART_FONT_FAMILY },
            padding: 12,
            usePointStyle: true,
            pointStyle: 'rect',
            filter: item => item.type !== 'line' || item.text === 'Wants Budget',
          },
        },
        tooltip: {
          ...S.tooltip,
          callbacks: {
            label: ctx => ctx.dataset.type === 'line'
              ? ' Budget: ' + fmt(ctx.parsed.y)
              : ' Spent: '  + fmt(ctx.parsed.y),
          },
        },
      },
      scales: {
        x: {
          ticks: { color: S.tickColor, font: { size: 11, family: CHART_FONT_FAMILY } },
          grid:  { color: S.gridColor, drawBorder: false },
        },
        y: {
          beginAtZero: true,
          ticks: {
            color: S.tickColor,
            font:  { size: 11, family: CHART_FONT_FAMILY },
            callback: v => '$' + (v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v),
          },
          grid: { color: S.gridColor, drawBorder: false },
        },
      },
    },
  });
}
