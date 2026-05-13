/* ═══════════════════════════════════════════════════════════════
   Module:   charts.js
   Project:  A Penny For Our Thoughts
   Created:  May 2026
   Summary:  All Chart.js instance management. Each chart is
             destroyed and recreated on data change to avoid
             conflicts. Chart instances are module-level so they
             can be cleaned up before re-render.
   Functions: renderWantsDonut, renderCcBarChart,
              renderAnalyticsLineChart, renderAnalyticsBarChart,
              renderBudgetVsActualChart, renderNetWorthChart
   Depends on: utils.js (fmt), Chart.js (CDN global)
═══════════════════════════════════════════════════════════════ */

// ────────────────────────────────────────────────────────────────
// CHART INSTANCES
// ────────────────────────────────────────────────────────────────
let wantsChart         = null;
let ccChart            = null;
let analyticsLineChart = null;
let analyticsBarChart  = null;
let netWorthChart      = null;

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
function renderWantsDonut(spent, remaining, usedPct) {
  const fillColour = usedPct >= 100 ? '#ff4d6d' : usedPct >= 80 ? '#ffa63d' : '#6c63ff';
  if (wantsChart) wantsChart.destroy();
  wantsChart = new Chart(document.getElementById('wantsDonut'), {
    type: 'doughnut',
    data: {
      datasets: [{
        data: [Math.min(spent, spent + Math.max(0, remaining)), Math.max(0, remaining)],
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
function renderCcBarChart(cards) {
  if (ccChart) ccChart.destroy();
  ccChart = new Chart(document.getElementById('ccBar'), {
    type: 'bar',
    data: {
      labels: cards.map(c => c.name.split(' ').slice(0, 2).join(' ')),
      datasets: [
        {
          label: 'Balance',
          data: cards.map(c => +c.balance),
          backgroundColor: cards.map(c => {
            const p = (+c.balance / +c.limit) * 100;
            return p > 50 ? '#ff4d6d' : p > 30 ? '#ffa63d' : '#00d4aa';
          }),
          borderColor: 'transparent',
          borderRadius: 6,
          borderSkipped: false,
        },
        {
          label: 'Available',
          data: cards.map(c => Math.max(0, +c.limit - +c.balance)),
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
function renderAnalyticsLineChart(history) {
  if (analyticsLineChart) { analyticsLineChart.destroy(); analyticsLineChart = null; }
  if (!history.length) return;

  analyticsLineChart = new Chart(document.getElementById('analyticsLine'), {
    type: 'line',
    data: {
      labels: history.map(p => p.label || p.date),
      datasets: [{
        label: 'Spending Over Time',
        data: history.map(p => p.total),
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
function renderAnalyticsBarChart(filteredHistory) {
  if (analyticsBarChart) { analyticsBarChart.destroy(); analyticsBarChart = null; }
  const topCats = getTopCategories(filteredHistory);
  if (!topCats.length) return;

  analyticsBarChart = new Chart(document.getElementById('analyticsBar'), {
    type: 'bar',
    data: {
      labels: topCats.map(([name]) => name),
      datasets: [{
        label: 'Top Categories',
        data: topCats.map(([, amt]) => amt),
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
function renderBudgetVsActualChart(budgeted, actuals) {
  if (window.budgetVsActualChartInstance) window.budgetVsActualChartInstance.destroy();

  window.budgetVsActualChartInstance = new Chart(
    document.getElementById('budgetVsActualChart').getContext('2d'),
    {
      type: 'bar',
      data: {
        labels: ['Needs', 'Wants', 'Savings'],
        datasets: [
          {
            label: 'Budgeted',
            data: [budgeted.needs, budgeted.wants, budgeted.savings],
            backgroundColor: '#6c63ff',
            borderColor: 'rgba(108, 99, 255, 0.3)',
            borderWidth: 1,
            borderRadius: 6,
          },
          {
            label: 'Actual',
            data: [actuals.needs, actuals.wants, actuals.savings],
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
function renderNetWorthChart(history) {
  const canvas = document.getElementById('netWorthChart');
  if (!canvas) return;
  if (netWorthChart) { netWorthChart.destroy(); netWorthChart = null; }

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

  netWorthChart = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Net Worth',
        data: values,
        borderColor: lineColor,
        backgroundColor: lastValue >= 0 ? 'rgba(0,212,170,0.08)' : 'rgba(255,77,109,0.08)',
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
