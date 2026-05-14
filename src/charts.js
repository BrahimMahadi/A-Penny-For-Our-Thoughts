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
   Depends on: utils.js (fmt), Chart.js (CDN global)
═══════════════════════════════════════════════════════════════ */

// ────────────────────────────────────────────────────────────────
// CHART INSTANCES
// ────────────────────────────────────────────────────────────────
let wantsChart             = null;
let ccChart                = null;
let analyticsLineChart     = null;
let analyticsBarChart      = null;
let budgetVsActualChart    = null;
let netWorthChart          = null;

/**
 * Returns true if the Chart.js instance exists and its canvas is
 * still mounted in the DOM. If the canvas has been detached (e.g.
 * after a theme-triggered re-render) we must create a new instance.
 */
function _chartValid(instance) {
  return !!(instance && instance.canvas && instance.canvas.isConnected);
}

// ────────────────────────────────────────────────────────────────
// SHARED CHART STYLE CONSTANTS
// ────────────────────────────────────────────────────────────────
const CHART_TOOLTIP = {
  backgroundColor: 'rgba(26, 35, 50, 0.95)',
  titleColor: '#e8eaf0',
  bodyColor: '#e8eaf0',
  borderColor: '#3a4456',
  borderWidth: 1,
  padding: 12,
  titleFont: { size: 13, weight: '700' },
  bodyFont: { size: 12 },
};
const CHART_TICK_COLOR = '#8b95ad';
const CHART_GRID_COLOR = '#3a4456';
const CHART_FONT_FAMILY = '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

// ────────────────────────────────────────────────────────────────
// WANTS DONUT
// ────────────────────────────────────────────────────────────────
/**
 * Render (or update in-place) the Wants envelope donut chart.
 * The fill colour transitions green → amber → red as spending approaches
 * or exceeds the envelope budget.
 *
 * @param {number} spent     - Total amount spent from the envelope this period.
 * @param {number} remaining - Remaining envelope balance (may be negative).
 * @param {number} usedPct   - Percentage of the envelope used (0-100+).
 * @returns {void}
 */
function renderWantsDonut(spent, remaining, usedPct) {
  const fillColour = usedPct >= 100 ? '#ff4d6d' : usedPct >= 80 ? '#ffa63d' : '#6c63ff';
  const chartData  = [Math.min(spent, spent + Math.max(0, remaining)), Math.max(0, remaining)];

  if (_chartValid(wantsChart)) {
    wantsChart.data.datasets[0].data            = chartData;
    wantsChart.data.datasets[0].backgroundColor = [fillColour, '#3a4456'];
    wantsChart.update();
    return;
  }

  if (wantsChart) { wantsChart.destroy(); wantsChart = null; }
  wantsChart = new Chart(document.getElementById('wantsDonut'), {
    type: 'doughnut',
    data: {
      datasets: [{
        data: chartData,
        backgroundColor: [fillColour, '#3a4456'],
        borderColor: ['transparent', 'transparent'],
        borderWidth: 0,
        borderRadius: 4,
      }],
    },
    options: {
      cutout: '72%',
      plugins: {
        legend: { display: false },
        tooltip: {
          ...CHART_TOOLTIP,
          padding: 10,
          titleFont: { size: 12, weight: '700' },
          bodyFont: { size: 11 },
          callbacks: { label: ctx => ' ' + fmt(ctx.parsed) },
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
function renderCcBarChart(cards) {
  const labels    = cards.map(c => c.name.split(' ').slice(0, 2).join(' '));
  const balances  = cards.map(c => +c.balance);
  const available = cards.map(c => Math.max(0, +c.limit - +c.balance));
  const bgColors  = cards.map(c => {
    const p = (+c.balance / +c.limit) * 100;
    return p > 50 ? '#ff4d6d' : p > 30 ? '#ffa63d' : '#00d4aa';
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
          backgroundColor: '#3a4456',
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
            color: CHART_TICK_COLOR,
            font: { size: 12, weight: '600', family: CHART_FONT_FAMILY },
            padding: 14,
            usePointStyle: true,
            pointStyle: 'rect',
          },
        },
        tooltip: { ...CHART_TOOLTIP, callbacks: { label: ctx => ' ' + ctx.dataset.label + ': ' + fmt(ctx.parsed.y) } },
      },
      scales: {
        x: {
          ticks: { color: CHART_TICK_COLOR, font: { size: 11, family: CHART_FONT_FAMILY } },
          grid: { color: CHART_GRID_COLOR, drawBorder: false },
        },
        y: {
          ticks: { color: CHART_TICK_COLOR, font: { size: 11, family: CHART_FONT_FAMILY }, callback: v => '$' + v.toLocaleString() },
          grid: { color: CHART_GRID_COLOR, drawBorder: false },
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
function renderAnalyticsLineChart(history) {
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

  if (analyticsLineChart) { analyticsLineChart.destroy(); analyticsLineChart = null; }
  analyticsLineChart = new Chart(document.getElementById('analyticsLine'), {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Spending Over Time',
        data,
        borderColor: '#6c63ff',
        backgroundColor: 'rgba(108,99,255,.1)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#6c63ff',
        pointBorderColor: '#1a2332',
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
            color: CHART_TICK_COLOR,
            font: { size: 12, weight: '600', family: CHART_FONT_FAMILY },
            padding: 16,
            usePointStyle: true,
            pointStyle: 'circle',
          },
        },
        tooltip: { ...CHART_TOOLTIP, callbacks: { label: ctx => ' Spent: ' + fmt(ctx.parsed.y) } },
      },
      scales: {
        x: {
          ticks: { color: CHART_TICK_COLOR, font: { size: 11, family: CHART_FONT_FAMILY }, maxRotation: 45 },
          grid: { color: CHART_GRID_COLOR, drawBorder: false },
        },
        y: {
          ticks: { color: CHART_TICK_COLOR, font: { size: 11, family: CHART_FONT_FAMILY }, callback: v => '$' + v.toLocaleString() },
          grid: { color: CHART_GRID_COLOR, drawBorder: false },
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
function renderAnalyticsBarChart(filteredHistory) {
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

  if (analyticsBarChart) { analyticsBarChart.destroy(); analyticsBarChart = null; }
  analyticsBarChart = new Chart(document.getElementById('analyticsBar'), {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Top Categories',
        data,
        backgroundColor: '#00d4aa',
        borderColor: 'rgba(0, 212, 170, 0.3)',
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
            color: CHART_TICK_COLOR,
            font: { size: 12, weight: '600', family: CHART_FONT_FAMILY },
            padding: 16,
            usePointStyle: true,
            pointStyle: 'rect',
          },
        },
        tooltip: { ...CHART_TOOLTIP, callbacks: { label: ctx => ' Total: ' + fmt(ctx.parsed.x) } },
      },
      scales: {
        x: {
          ticks: { color: CHART_TICK_COLOR, font: { size: 11, family: CHART_FONT_FAMILY }, callback: v => '$' + v.toLocaleString() },
          grid: { color: CHART_GRID_COLOR, drawBorder: false },
        },
        y: {
          ticks: { color: CHART_TICK_COLOR, font: { size: 11, family: CHART_FONT_FAMILY } },
          grid: { color: CHART_GRID_COLOR, drawBorder: false },
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
function renderBudgetVsActualChart(budgeted, actuals) {
  const budgetedData = [budgeted.needs, budgeted.wants, budgeted.savings];
  const actualsData  = [actuals.needs,  actuals.wants,  actuals.savings];

  if (_chartValid(budgetVsActualChart)) {
    budgetVsActualChart.data.datasets[0].data = budgetedData;
    budgetVsActualChart.data.datasets[1].data = actualsData;
    budgetVsActualChart.update();
    return;
  }

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
            backgroundColor: '#6c63ff',
            borderColor: 'rgba(108, 99, 255, 0.3)',
            borderWidth: 1,
            borderRadius: 6,
          },
          {
            label: 'Actual',
            data: actualsData,
            backgroundColor: '#00d4aa',
            borderColor: 'rgba(0, 212, 170, 0.3)',
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
              color: CHART_TICK_COLOR,
              font: { size: 12, weight: '600' },
              usePointStyle: true,
              pointStyle: 'rect',
            },
          },
          tooltip: { ...CHART_TOOLTIP, callbacks: { label: ctx => ' ' + ctx.dataset.label + ': ' + fmt(ctx.parsed.y) } },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { callback: v => fmt(v), color: CHART_TICK_COLOR, font: { size: 11 } },
            grid: { color: CHART_GRID_COLOR, drawBorder: false },
          },
          x: {
            ticks: { color: CHART_TICK_COLOR, font: { size: 11 } },
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
function renderNetWorthChart(history) {
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

  const positiveColor = 'rgba(0, 212, 170, 0.8)';
  const negativeColor = 'rgba(255, 77, 109, 0.8)';
  const lineColor     = lastValue >= 0 ? positiveColor : negativeColor;
  const fillColor     = lastValue >= 0 ? 'rgba(0,212,170,0.08)' : 'rgba(255,77,109,0.08)';

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
          grid: { color: 'rgba(255,255,255,0.05)' },
          ticks: { color: 'var(--muted)', font: { size: 11 } },
        },
        y: {
          grid: { color: 'rgba(255,255,255,0.05)' },
          ticks: { color: 'var(--muted)', font: { size: 11 }, callback: v => '$' + (v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v) },
        },
      },
    },
  });
}
