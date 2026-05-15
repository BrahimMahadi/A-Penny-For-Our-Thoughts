/* ═══════════════════════════════════════════════════════════════
   Module:   render.js
   Project:  A Penny For Our Thoughts
   Created:  May 2026
   Summary:  All DOM render functions. Each function reads from
             global state and rebuilds its section idempotently.
             No state mutations here — rendering only.
   Functions: renderDate, renderIncome, renderIncomeStreams,
              renderWants, renderPurchaseList,
              renderBudgetVsActual, renderBudgetVarianceCards,
              renderVarianceSummary, toggleAnalyticsPanel,
              renderSpendingAnalytics, renderAnalyticsHistory,
              renderExpenseCards, renderLoans, renderCreditCards,
              renderSavings, renderGoals, renderNetWorth,
              renderSubscriptions, renderRules, renderBudgetAlerts,
              renderWishlist, renderSchedule, renderAll
   Depends on: utils.js, state.js, analytics.js, charts.js
═══════════════════════════════════════════════════════════════ */

// ────────────────────────────────────────────────────────────────
// HEADER
// ────────────────────────────────────────────────────────────────
function renderDate() {
  const el = document.getElementById('header-date');
  if (el) {
    el.textContent = new Date().toLocaleDateString('en-CA', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
  }
}

// ────────────────────────────────────────────────────────────────
// INCOME OVERVIEW
// ────────────────────────────────────────────────────────────────
function renderIncome() {
  const inc   = getTotalMonthlyIncome();
  const alloc = getAlloc();

  const needs   = inc * alloc.needs;
  const wants   = inc * alloc.wants;
  const savings = inc * alloc.savings;
  const biWants   = wants   / 2;
  const biSavings = savings / 2;

  const { needs: nPct, wants: wPct, savings: sPct } = state.allocation;
  const displayMode = state.budgetDisplayMode || { needs: 'monthly', wants: 'monthly', savings: 'monthly' };

  document.getElementById('disp-income-sub').textContent =
    (state.incomeStreams || []).length === 0 ? 'no income streams added' :
    (state.incomeStreams || []).length === 1 ? 'from 1 stream' :
    `from ${(state.incomeStreams || []).length} streams`;

  document.getElementById('disp-income').textContent           = fmt(inc);
  document.getElementById('disp-needs').textContent            = fmt(displayMode.needs   === 'biweekly' ? needs   / 2 : needs);
  document.getElementById('disp-wants').textContent            = fmt(displayMode.wants   === 'biweekly' ? wants   / 2 : wants);
  document.getElementById('disp-savings-income').textContent   = fmt(displayMode.savings === 'biweekly' ? savings / 2 : savings);
  document.getElementById('disp-biwants').textContent          = fmt(biWants);
  document.getElementById('disp-savings-biweekly').textContent = fmt(biSavings);

  document.getElementById('needs-toggle-label').textContent   = displayMode.needs   === 'biweekly' ? 'Bi-Weekly' : 'Monthly';
  document.getElementById('wants-toggle-label').textContent   = displayMode.wants   === 'biweekly' ? 'Bi-Weekly' : 'Monthly';
  document.getElementById('savings-toggle-label').textContent = displayMode.savings === 'biweekly' ? 'Bi-Weekly' : 'Monthly';

  document.getElementById('disp-needs-pct-label').textContent   = `${nPct}% of income`;
  document.getElementById('disp-wants-pct-label').textContent   = `${wPct}% of income`;
  document.getElementById('disp-savings-pct-label').textContent = `${sPct}% of income`;

  document.getElementById('bar-needs-pct').textContent   = nPct;
  document.getElementById('bar-wants-pct').textContent   = wPct;
  document.getElementById('bar-savings-pct').textContent = sPct;
  document.getElementById('bar-needs').textContent       = fmt(needs);
  document.getElementById('bar-wants').textContent       = fmt(wants);
  document.getElementById('bar-savings').textContent     = fmt(savings);

  document.getElementById('seg-needs').style.width   = nPct + '%';
  document.getElementById('seg-wants').style.width   = wPct + '%';
  document.getElementById('seg-savings').style.width = sPct + '%';

  document.getElementById('disp-savings').textContent = fmt(savings);

  // Update tooltip formula examples with live numbers
  const tipNeeds = document.getElementById('tip-needs');
  if (tipNeeds) {
    tipNeeds.querySelector('.tip-formula').innerHTML =
      `Total Income × Needs %<br>${fmt(inc)} × ${nPct}% = <strong>${fmt(needs)}</strong> / mo`;
  }
  const tipWants = document.getElementById('tip-wants');
  if (tipWants) {
    tipWants.querySelector('.tip-formula').innerHTML =
      `Total Income × Wants %<br>${fmt(inc)} × ${wPct}% = <strong>${fmt(wants)}</strong> / mo<br>→ <strong>${fmt(biWants)}</strong> per bi-weekly envelope`;
  }
  const tipSavings = document.getElementById('tip-savings');
  if (tipSavings) {
    tipSavings.querySelector('.tip-formula').innerHTML =
      `Total Income × Savings %<br>${fmt(inc)} × ${sPct}% = <strong>${fmt(savings)}</strong> / mo<br>→ <strong>${fmt(biSavings)}</strong> per bi-weekly period`;
  }
}

// ────────────────────────────────────────────────────────────────
// INCOME STREAMS
// ────────────────────────────────────────────────────────────────
function renderIncomeStreams() {
  const streams = state.incomeStreams || [];
  const ul      = document.getElementById('income-stream-list');
  const empty   = document.getElementById('income-empty-state');
  const counter = document.getElementById('income-stream-count');

  counter.textContent = `${streams.length} stream${streams.length !== 1 ? 's' : ''}`;
  ul.innerHTML        = '';

  if (!streams.length) { empty.style.display = 'flex'; return; }
  empty.style.display = 'none';

  streams.forEach(stream => {
    const monthly = stream.biweekly ? stream.amount * 2 : +stream.amount;
    const li = document.createElement('li');
    li.className = 'income-stream-item';
    li.innerHTML = `
      <span class="stream-name">${stream.name}</span>
      ${stream.biweekly ? '<span class="chip purple" style="font-size:10px;padding:2px 7px">bi-wk</span>' : ''}
      <span class="stream-raw">${fmt(stream.amount)}${stream.biweekly ? '/pay' : '/mo'}</span>
      <span class="stream-monthly">${fmt(monthly)}/mo</span>
      <button class="btn icon-btn" onclick="openEditIncomeStream('${stream.id}')" aria-label="Edit ${stream.name}">✎</button>
      <button class="btn icon-btn del" onclick="deleteIncomeStream('${stream.id}')" aria-label="Delete ${stream.name}">×</button>`;
    ul.appendChild(li);
  });
}

// ────────────────────────────────────────────────────────────────
// WANTS TRACKER
// ────────────────────────────────────────────────────────────────
function renderWants() {
  const inc     = getTotalMonthlyIncome();
  const biWants = inc * getAlloc().wants / 2;

  // Wants-only purchases (needs-tagged purchases deduct from Needs budget instead)
  const purchases    = (state.purchases || []).filter(p => (p.budgetType || 'wants') !== 'needs').reduce((s, p) => s + +p.amount, 0);
  const deductedSubs = getSubsDeductedThisPeriod();
  const subTotal     = deductedSubs.reduce((s, sub) => s + (+sub.amount || 0) * sub.renewalDates.length, 0);
  const spent        = purchases + subTotal;
  const remaining    = biWants - spent;
  const usedPct      = biWants > 0 ? Math.min(100, (spent / biWants) * 100) : 0;

  document.getElementById('disp-biwants2').textContent             = fmt(biWants);
  document.getElementById('disp-wants-spent').textContent          = fmt(spent);
  document.getElementById('disp-wants-remaining-amt').textContent  = fmt(Math.max(0, remaining));
  document.getElementById('disp-wants-remaining-label').textContent = remaining >= 0 ? 'remaining' : 'over by';
  document.getElementById('donut-pct').textContent                  = usedPct.toFixed(0) + '%';

  document.getElementById('wants-status-chip').innerHTML = remaining >= 0
    ? `<span class="chip green">✓ On Track</span>`
    : `<span class="chip red">⚠ Over by ${fmt(Math.abs(remaining))}</span>`;

  // ── Budget alert chips ────────────────────────────────────────
  const alertChipsEl = document.getElementById('wants-alert-chips');
  if (alertChipsEl) {
    const triggered = getTriggeredAlerts();
    if (triggered.length > 0) {
      alertChipsEl.innerHTML = triggered.map(a =>
        `<span class="alert-chip">⚠ ${a.category}: ${fmt(a.spent)} &gt; ${fmt(a.threshold)}</span>`
      ).join('');
      alertChipsEl.style.display = 'flex';
    } else {
      alertChipsEl.innerHTML = '';
      alertChipsEl.style.display = 'none';
    }
  }

  // ── Payday anchor line ────────────────────────────────────────
  const anchorEl = document.getElementById('payday-anchor-line');
  if (anchorEl) {
    const periodStart = getCurrentPeriodStart();
    if (!periodStart) {
      anchorEl.innerHTML = `
        <span style="color:var(--muted);font-size:12px">No payday configured —</span>
        <button class="btn xs secondary" onclick="openSetPayStart()">Set Payday</button>
        <span style="color:var(--muted);font-size:12px">to enable subscription deductions</span>
        <button class="btn xs danger" onclick="resetWants()" style="margin-left:auto">↺ Reset</button>`;
    } else {
      const start  = new Date(periodStart + 'T00:00:00');
      const end    = new Date(start);
      end.setDate(end.getDate() + 13);
      const opts   = { month: 'short', day: 'numeric' };
      const sLabel = start.toLocaleDateString('en-CA', opts);
      const eLabel = end.toLocaleDateString('en-CA', opts);
      const subInfo = subTotal > 0
        ? ` · <span style="color:var(--accent2)">${fmt(subTotal)} in subscriptions</span>`
        : '';
      anchorEl.innerHTML = `
        <span style="font-size:12px;color:var(--muted)">
          Period: <strong style="color:var(--text)">${sLabel} – ${eLabel}</strong>${subInfo}
        </span>
        <button class="btn xs secondary" onclick="openSetPayStart()">✎ Payday</button>
        <button class="btn xs danger" onclick="resetWants()">↺ Reset</button>`;
    }
  }

  // ── Subscription deduction breakdown ─────────────────────────
  const subBreakdownEl = document.getElementById('wants-sub-breakdown');
  if (subBreakdownEl) {
    if (deductedSubs.length > 0) {
      subBreakdownEl.style.display = 'block';
      subBreakdownEl.innerHTML = `
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:var(--muted);margin-bottom:6px">Subscriptions This Period</div>
        ${deductedSubs.map(sub => `
          <div class="sub-deduction-row">
            <span class="sub-deduction-name">${sub.name}</span>
            <span class="sub-deduction-date">${sub.renewalDates[0]}</span>
            <span class="sub-deduction-amt">${fmt(+sub.amount * sub.renewalDates.length)}</span>
          </div>`).join('')}`;
    } else {
      subBreakdownEl.style.display = 'none';
    }
  }

  // ── Category spending breakdown ───────────────────────────────
  const catBreakdownEl = document.getElementById('purchase-cat-breakdown');
  if (catBreakdownEl) {
    const purchases = state.purchases || [];
    if (purchases.length > 0) {
      const spending = getCategorySpending(purchases);
      const entries  = Object.entries(spending).sort((a, b) => b[1] - a[1]);
      catBreakdownEl.innerHTML = `
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:var(--muted);margin-bottom:8px">Spending by Category</div>
        <div class="cat-breakdown-chips">
          ${entries.map(([cat, amt]) => {
            const colour = CATEGORY_COLOURS[cat] || '#8b95ad';
            return `<span class="cat-breakdown-chip" style="background:${colour}20;color:${colour}">${cat} · ${fmt(amt)}</span>`;
          }).join('')}
        </div>`;
      catBreakdownEl.style.display = 'block';
    } else {
      catBreakdownEl.style.display = 'none';
    }
  }

  renderPurchaseList();
  populatePurchaseCardSelect();

  // Build per-category spending for the donut; include subscription deductions as a segment
  // Only Wants-tagged purchases go into the donut (Needs purchases count against the Needs budget)
  const wantsPurchases = (state.purchases || []).filter(p => (p.budgetType || 'wants') !== 'needs');
  const catSpending = getCategorySpending(wantsPurchases);
  if (subTotal > 0) catSpending['Subscriptions'] = subTotal;
  renderWantsDonut(catSpending, Math.max(0, remaining), usedPct);
}

function renderPurchaseList() {
  const ul = document.getElementById('purchase-list');
  ul.innerHTML = '';

  if (!(state.purchases || []).length) {
    ul.innerHTML = '<li style="color:var(--muted);font-size:12px;padding:8px 0">No purchases yet this period.</li>';
    return;
  }
  const cards    = state.expenseCards || [];
  const hasCards = cards.length > 0;

  state.purchases.forEach(p => {
    const cat    = p.category || 'Other';
    const colour = CATEGORY_COLOURS[cat] || '#8b95ad';
    const catOpts = WANT_CATEGORIES
      .map(c => `<option value="${c}" ${c === cat ? 'selected' : ''}>${c}</option>`)
      .join('');

    // Inline card selector chip — shown only when expense cards exist
    let cardChip = '';
    if (hasCards) {
      const cardOpts = cards
        .map(c => `<option value="${c.id}"${c.id === p.cardId ? ' selected' : ''}>${c.label}</option>`)
        .join('');
      cardChip = `
        <span class="purchase-card-chip${p.cardId ? '' : ' no-card'}">
          ≡ <select class="card-inline-select" onchange="setPurchaseCard('${p.id}',this.value)" aria-label="Payment card for ${p.name}">
            <option value="">No card</option>
            ${cardOpts}
          </select>
        </span>`;
    }

    // Budget type chip — amber/tinted when Needs, hidden when default Wants
    const budgetType = p.budgetType || 'wants';
    const budgetChip = budgetType === 'needs'
      ? `<span class="purchase-budget-chip needs">
           <select class="budget-type-inline-select" onchange="setPurchaseBudgetType('${p.id}',this.value)" aria-label="Budget type for ${p.name}">
             <option value="wants">Wants</option>
             <option value="needs" selected>Needs</option>
           </select>
         </span>`
      : `<span class="purchase-budget-chip wants">
           <select class="budget-type-inline-select" onchange="setPurchaseBudgetType('${p.id}',this.value)" aria-label="Budget type for ${p.name}">
             <option value="wants" selected>Wants</option>
             <option value="needs">Needs</option>
           </select>
         </span>`;

    const li = document.createElement('li');
    li.className = 'purchase-item';
    li.innerHTML = `
      <div class="p-card-left">
        <div class="p-name">${p.name}</div>
        <div class="p-chips">
          <span class="purchase-cat-badge" style="background:${colour}20;color:${colour}">
            <select class="cat-inline-select" onchange="setPurchaseCategory('${p.id}',this.value)" style="color:${colour}" aria-label="Category for ${p.name}">${catOpts}</select>
          </span>
          ${budgetChip}
          ${cardChip}
        </div>
      </div>
      <div class="p-card-right">
        <span class="amount">${fmt(p.amount)}</span>
        <button class="p-del-btn" onclick="removePurchase('${p.id}')" aria-label="Delete ${p.name}">🗑</button>
      </div>`;
    ul.appendChild(li);
  });
}

/**
 * Populate the payment card dropdown in the quick-add purchase row.
 * Called from renderWants() so the list stays in sync when cards change.
 * Preserves any currently selected value to survive re-renders mid-session.
 */
function populatePurchaseCardSelect() {
  const sel = document.getElementById('purchase-card');
  if (!sel) return;
  const current = sel.value;
  sel.innerHTML =
    '<option value="">No card</option>' +
    (state.expenseCards || [])
      .map(c => `<option value="${c.id}"${c.id === current ? ' selected' : ''}>${c.label}</option>`)
      .join('');
}

// ────────────────────────────────────────────────────────────────
// BUDGET VS. ACTUAL
// ────────────────────────────────────────────────────────────────
function renderBudgetVsActual() {
  const today    = new Date();
  const actuals  = getMonthActuals(today.getFullYear(), today.getMonth() + 1);
  const budgeted = getMonthBudgeted(today.getFullYear(), today.getMonth() + 1);

  renderBudgetVarianceCards(budgeted, actuals);
  renderBudgetVsActualChart(budgeted, actuals);
  renderVarianceSummary(budgeted, actuals, getTotalMonthlyIncome());
}

/** Render three variance cards (Needs, Wants, Savings) */
function renderBudgetVarianceCards(budgeted, actuals) {
  const container  = document.getElementById('budget-variance-cards');
  container.innerHTML = '';

  const categories = [
    { key: 'needs',   label: 'Needs',   color: 'var(--accent-text)' },
    { key: 'wants',   label: 'Wants',   color: 'var(--accent2)' },
    { key: 'savings', label: 'Savings', color: 'var(--warn)' },
  ];

  categories.forEach(cat => {
    const variance    = calculateVariance(budgeted[cat.key], actuals[cat.key], cat.key);
    const statusColor = variance.status === 'on-track' ? cssVar('--accent2') : variance.status === 'caution' ? cssVar('--warn') : cssVar('--danger');
    const statusLabel = variance.status === 'on-track' ? 'On Track' : variance.status === 'caution' ? 'Caution' : 'Over';

    const card = document.createElement('div');
    card.className  = 'card';
    card.style.borderLeft = `4px solid ${statusColor}`;
    card.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
        <span style="font-size:12px;font-weight:700;color:${cat.color}">${cat.label}</span>
        <span style="font-size:11px;font-weight:600;padding:2px 6px;border-radius:3px;background:${statusColor}20;color:${statusColor}">${statusLabel}</span>
      </div>
      <div style="font-size:13px;color:var(--muted);margin-bottom:4px">Budgeted</div>
      <div style="font-size:18px;font-weight:700;margin-bottom:12px">${fmt(budgeted[cat.key])}</div>
      <div style="font-size:13px;color:var(--muted);margin-bottom:4px">Actual</div>
      <div style="font-size:18px;font-weight:700;margin-bottom:12px">${fmt(actuals[cat.key])}</div>
      <div style="font-size:12px;color:${statusColor};font-weight:600">${variance.percent.toFixed(1)}% of budget</div>
    `;
    container.appendChild(card);
  });
}

/** Render variance summary table */
function renderVarianceSummary(budgeted, actuals, income) {
  const container = document.getElementById('budget-variance-summary');

  const rows = ['needs', 'wants', 'savings'].map(key => {
    const variance = calculateVariance(budgeted[key], actuals[key], key);
    const varColor = variance.status === 'on-track' ? cssVar('--accent2') : variance.status === 'caution' ? cssVar('--warn') : cssVar('--danger');
    const label    = key.charAt(0).toUpperCase() + key.slice(1);
    return `
      <tr style="border-bottom:1px solid var(--border-light)">
        <td style="padding:8px 0;color:var(--text)">${label}</td>
        <td style="text-align:right;padding:8px 0;color:var(--muted)">${fmt(budgeted[key])}</td>
        <td style="text-align:right;padding:8px 0;color:var(--text);font-weight:600">${fmt(actuals[key])}</td>
        <td style="text-align:right;padding:8px 0;color:${varColor};font-weight:600">
          ${variance.dollar >= 0 ? '+' : ''}${fmt(variance.dollar)} (${variance.percent.toFixed(1)}%)
        </td>
      </tr>`;
  }).join('');

  container.innerHTML = `
    <div style="font-size:12px;overflow-x:auto">
      <table style="width:100%;border-collapse:collapse" aria-label="Budget vs. actual variance summary">
        <thead>
          <tr style="border-bottom:1px solid var(--border-light)">
            <th scope="col" style="text-align:left;padding:8px 0;color:var(--muted);font-weight:600">Category</th>
            <th scope="col" style="text-align:right;padding:8px 0;color:var(--muted);font-weight:600">Budgeted</th>
            <th scope="col" style="text-align:right;padding:8px 0;color:var(--muted);font-weight:600">Actual</th>
            <th scope="col" style="text-align:right;padding:8px 0;color:var(--muted);font-weight:600">Variance</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <div style="margin-top:16px;padding:12px;background:rgba(139,149,173,0.05);border-left:3px solid #8b95ad;border-radius:4px;font-size:12px;color:var(--muted);line-height:1.5">
      <strong style="color:var(--text)">Note:</strong> Actual values include both current period spending and archived spending history from this month.
    </div>`;
}

// ────────────────────────────────────────────────────────────────
// SPENDING ANALYTICS
// ────────────────────────────────────────────────────────────────
function toggleAnalyticsPanel() {
  const panel   = document.getElementById('analytics-panel');
  const btn     = document.getElementById('analytics-toggle-btn');
  const visible = panel.style.display !== 'none';

  if (visible) resetAnalyticsFilters();
  panel.style.display = visible ? 'none' : 'block';
  btn.textContent     = visible ? '📊 Show Spending Analytics' : '📊 Hide Spending Analytics';
  if (!visible) renderSpendingAnalytics();
}

function renderSpendingAnalytics() {
  const history = getFilteredSpendingHistory();

  const allTimeTotal = history.reduce((s, p) => s + p.total, 0);
  const avgPerPeriod = history.length > 0 ? allTimeTotal / history.length : 0;
  const allPurchases = history.flatMap(p => p.items || []);
  const largestPurch = allPurchases.reduce((max, p) => +p.amount > max ? +p.amount : max, 0);

  const hasActiveFilters = analyticsFilters.startDate || analyticsFilters.endDate || analyticsFilters.search;
  const filterHint = hasActiveFilters ? ` <span style="font-size:10px;color:var(--accent)">ℹ Filters Active</span>` : '';

  document.getElementById('analytics-stats').innerHTML = `
    <div class="analytics-stat-card">
      <div class="analytics-stat-label">Periods Tracked${filterHint}</div>
      <div class="analytics-stat-value">${history.length}</div>
    </div>
    <div class="analytics-stat-card">
      <div class="analytics-stat-label">Filtered Total</div>
      <div class="analytics-stat-value">${fmt(allTimeTotal)}</div>
    </div>
    <div class="analytics-stat-card">
      <div class="analytics-stat-label">Avg / Period</div>
      <div class="analytics-stat-value">${fmt(avgPerPeriod)}</div>
    </div>
    <div class="analytics-stat-card">
      <div class="analytics-stat-label">Largest Purchase</div>
      <div class="analytics-stat-value">${fmt(largestPurch)}</div>
    </div>`;

  renderAnalyticsLineChart(history);
  renderAnalyticsBarChart(history);
  renderAnalyticsHistory(history);
}

function renderAnalyticsHistory(filteredHistory) {
  const container = document.getElementById('analytics-history');
  const history   = filteredHistory || [];

  if (!history.length) {
    container.innerHTML = '<div style="color:var(--muted);font-size:13px;text-align:center;padding:16px">No periods match the current filters.</div>';
    return;
  }

  container.innerHTML = [...history].reverse().map(period => `
    <div class="period-history-item" id="period-${period.id}">
      <div class="period-header">
        <div>
          <span class="period-label">${period.label}</span>
          <span style="font-size:11px;color:var(--muted);margin-left:8px">${period.date}</span>
        </div>
        <div style="display:flex;align-items:center;gap:8px;flex-shrink:0">
          <span style="font-weight:700;color:var(--accent2)">${fmt(period.total)}</span>
          <button class="btn xs danger" onclick="deleteHistoryPeriod('${period.id}')">Delete Period</button>
        </div>
      </div>
      <div class="period-purchases">
        ${!(period.items || []).length
          ? '<div style="color:var(--muted);font-size:12px;padding:4px 0">No purchases in this period.</div>'
          : (period.items || []).map(p => `
            <div class="period-purchase-row">
              <span class="period-purchase-name">${p.name}</span>
              <span class="period-purchase-amt">${fmt(p.amount)}</span>
              <button class="btn xs secondary" onclick="openEditHistoryPurchase('${period.id}','${p.id}')">Edit</button>
              <button class="btn xs danger"    onclick="deleteHistoryPurchase('${period.id}','${p.id}')">×</button>
            </div>`).join('')
        }
      </div>
    </div>`).join('');
}

// ────────────────────────────────────────────────────────────────
// EXPENSE CARDS
// ────────────────────────────────────────────────────────────────
function renderExpenseCards() {
  const cards = state.expenseCards || [];
  const grid  = document.getElementById('expense-cards-grid');
  const empty = document.getElementById('expense-empty-state');
  const count = document.getElementById('disp-card-count');

  grid.innerHTML = '';
  empty.style.display = cards.length ? 'none' : 'block';
  count.textContent   = cards.length
    ? `across ${cards.length} payment card${cards.length !== 1 ? 's' : ''}`
    : 'no payment cards added';

  cards.forEach(card => {
    // ── Linked subscriptions: check which are due this calendar month ──
    const now          = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth   = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    startOfMonth.setHours(0, 0, 0, 0);
    endOfMonth.setHours(0, 0, 0, 0);

    const linkedSubs = (state.subscriptions || []).filter(s => s.cardId === card.id);
    const subData    = linkedSubs.map(sub => {
      const renewals = getRenewalDatesBetween(sub, startOfMonth, endOfMonth);
      return { sub, isDue: renewals.length > 0 };
    });
    const activeSubTotal = subData.filter(({ isDue }) => isDue)
      .reduce((s, { sub }) => s + (+sub.amount || 0), 0);

    // ── Linked loans: check which have a payment due this calendar month ──
    const linkedLoans = (state.loans || []).filter(l => l.cardId === card.id && l.paymentAmount > 0 && l.date);
    const loanData    = linkedLoans.map(loan => {
      const renewals = getRenewalDatesBetween(loan, startOfMonth, endOfMonth);
      return { loan, isDue: renewals.length > 0 };
    });
    const activeLoanTotal = loanData.filter(({ isDue }) => isDue)
      .reduce((s, { loan }) => s + (+loan.paymentAmount || 0), 0);

    const cardTotal = (card.items || []).reduce((s, i) => s + monthlyAmount(i), 0) + activeSubTotal + activeLoanTotal;

    const div = document.createElement('div');
    div.className = 'card';
    div.id        = 'ecard-' + card.id;
    div.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <div class="card-title">${card.label}</div>
        <div style="display:flex;gap:4px">
          <button class="btn icon-btn" onclick="openEditExpenseCard('${card.id}')" aria-label="Rename ${card.label} card">✎</button>
          <button class="btn icon-btn del" onclick="deleteExpenseCard('${card.id}')" aria-label="Delete ${card.label} card">×</button>
        </div>
      </div>
      <ul class="expense-list" id="list-${card.id}"></ul>
      <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-top:1px solid var(--border);margin-top:4px">
        <span style="font-size:11px;font-weight:700;letter-spacing:.6px;color:var(--muted)">TOTAL</span>
        <span style="font-weight:700" id="total-${card.id}">${fmt(cardTotal)}</span>
      </div>
      <div class="add-form-stacked" style="margin-top:8px">
        <div class="add-form-field">
          <span class="add-form-label">Expense Name</span>
          <input id="new-name-${card.id}" type="text" placeholder="e.g. Rent" />
        </div>
        <div class="add-form-field">
          <span class="add-form-label">Amount</span>
          <input id="new-amount-${card.id}" type="number" placeholder="$0.00" min="0" step="0.01" />
        </div>
        <label class="toggle-row">
          <div class="toggle-info">
            <span class="toggle-label-text">Bi-weekly pay</span>
            <span class="toggle-sublabel">Amount per paycheque (×2 monthly)</span>
          </div>
          <div class="toggle-switch">
            <input type="checkbox" id="new-bw-${card.id}" />
            <div class="toggle-track"></div>
            <div class="toggle-thumb"></div>
          </div>
        </label>
        <button class="add-form-submit" onclick="addExpense('${card.id}')">Add Expense</button>
      </div>`;
    grid.appendChild(div);

    const ul = div.querySelector('#list-' + card.id);

    // ── Regular expense items ──
    (card.items || []).forEach(item => {
      const li = document.createElement('li');
      li.className = 'expense-item swipeable';

      // Build the row-2 badge: merge bi-wk + due into one pill when both exist
      let badge = '';
      if (item.biweekly && item.dueDay) {
        badge = `<span class="e-badge">2× · due ${ordinal(item.dueDay)}</span>`;
      } else if (item.biweekly) {
        badge = `<span class="e-biweekly">bi-wk ×2</span>`;
      } else if (item.dueDay) {
        badge = `<span class="e-due">due ${ordinal(item.dueDay)}</span>`;
      }

      li.innerHTML = `
        <div class="swipe-delete-bg" aria-hidden="true">🗑</div>
        <div class="swipe-content">
          <div class="e-row">
            <span class="e-name">${item.name}</span>
            <span class="e-amount">${fmt(monthlyAmount(item))}</span>
          </div>
          <div class="e-row">
            ${badge}
            <span class="e-row-spacer"></span>
            <button class="btn icon-btn" onclick="openEditExpenseItem('${card.id}','${item.id}')" aria-label="Edit ${item.name}">✎</button>
            <button class="btn icon-btn del" onclick="removeExpense('${card.id}','${item.id}')" aria-label="Delete ${item.name}">×</button>
          </div>
        </div>`;
      ul.appendChild(li);
    });

    // ── Linked subscription rows (read-only) ──
    subData.forEach(({ sub, isDue }) => {
      const nextDate = isDue ? null : getNextRenewal(sub);
      const nextStr  = nextDate
        ? new Date(nextDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        : '—';
      const li = document.createElement('li');
      li.className = `sub-linked-row${isDue ? '' : ' sub-inactive'}`;
      li.setAttribute('aria-label', `${sub.name} subscription${isDue ? ', due this month' : ', next renewal ' + nextStr}`);
      li.innerHTML = `
        <div class="swipe-content">
          <span class="sub-link-icon" aria-hidden="true">↻</span>
          <span class="e-name">${sub.name}</span>
          <span class="sub-freq-badge">${sub.frequency}</span>
          ${isDue
            ? `<span class="e-amount">${fmt(+sub.amount || 0)}</span>`
            : `<span class="e-amount sub-next-date">Next: ${nextStr}</span>`}
        </div>`;
      ul.appendChild(li);
    });

    // ── Linked loan payment rows (read-only) ──
    loanData.forEach(({ loan, isDue }) => {
      const nextDate = isDue ? null : getNextRenewal(loan);
      const nextStr  = nextDate
        ? new Date(nextDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        : '—';
      const li = document.createElement('li');
      li.className = `sub-linked-row loan-linked-row${isDue ? '' : ' sub-inactive'}`;
      li.setAttribute('aria-label', `${loan.name} loan payment${isDue ? ', due this month' : ', next payment ' + nextStr}`);
      li.innerHTML = `
        <div class="swipe-content">
          <span class="sub-link-icon loan-link-icon" aria-hidden="true">🏦</span>
          <span class="e-name">${loan.name}</span>
          <span class="sub-freq-badge">${loan.frequency}</span>
          ${isDue
            ? `<span class="e-amount">${fmt(+loan.paymentAmount || 0)}</span>`
            : `<span class="e-amount sub-next-date">Next: ${nextStr}</span>`}
        </div>`;
      ul.appendChild(li);
    });
  });

  const grand         = grandTotal();
  const needsSubTotal = getSubsDeductedThisMonth()
    .reduce((sum, sub) => sum + (+sub.amount || 0) * sub.renewalDates.length, 0);
  const needsBudget   = getTotalMonthlyIncome() * getAlloc().needs;
  const totalNeeds    = grand + needsSubTotal;
  const remaining     = needsBudget - totalNeeds;

  document.getElementById('disp-grand-total').textContent     = fmt(grand);
  document.getElementById('disp-needs-remaining').textContent = fmt(remaining);
  document.getElementById('disp-needs-used-pct').textContent  = remaining >= 0
    ? `${pct(totalNeeds, needsBudget)}% of needs budget used${needsSubTotal > 0 ? ` (incl. ${fmt(needsSubTotal)} in subs)` : ''}`
    : `Over needs budget by ${fmt(Math.abs(remaining))}`;

  document.getElementById('needs-status-card').className = 'card ' + (remaining >= 0 ? '' : 'danger');
  document.getElementById('disp-needs-remaining').style.color = remaining >= 0 ? 'var(--accent2)' : 'var(--danger)';
}

// ────────────────────────────────────────────────────────────────
// LOANS
// ────────────────────────────────────────────────────────────────
function renderLoans() {
  const grid = document.getElementById('loans-grid');
  grid.innerHTML = '';

  (state.loans || []).forEach(loan => {
    const pctUsed    = +loan.original > 0 ? (+loan.remaining / +loan.original) * 100 : 0;
    const colour     = pctUsed > 70 ? cssVar('--danger') : pctUsed > 40 ? cssVar('--warn') : cssVar('--accent2');
    const linkedCard = loan.cardId ? (state.expenseCards || []).find(c => c.id === loan.cardId) : null;
    const hasPayment = loan.paymentAmount > 0 && loan.date;

    // Build next payment date string for display
    let nextPayStr = '';
    if (hasPayment) {
      const nextDate = getNextRenewal(loan);
      nextPayStr = nextDate
        ? new Date(nextDate + 'T00:00:00').toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })
        : '—';
    }

    const div = document.createElement('div');
    div.className = 'card loan-card';
    div.innerHTML = `
      <div class="loan-name">${loan.name}</div>
      ${linkedCard ? `<div class="loan-card-tag">💳 ${linkedCard.label}</div>` : ''}
      <div class="loan-amounts">
        <span>${fmt(loan.remaining)} remaining</span>
        <span>${pct(loan.remaining, loan.original)}%</span>
      </div>
      <div class="progress-track">
        <div class="progress-fill" style="width:${Math.min(100, pctUsed).toFixed(1)}%;background:${colour}"></div>
      </div>
      <div style="font-size:11px;color:var(--muted);margin-top:4px">of ${fmt(loan.original)} original</div>
      ${hasPayment ? `
        <div class="loan-payment-row">
          <div class="loan-payment-detail">
            <span class="loan-payment-label">Payment</span>
            <span class="loan-payment-amount">${fmt(loan.paymentAmount)}</span>
            <span class="loan-payment-freq">${loan.frequency}</span>
          </div>
          <span class="loan-payment-next">Next: ${nextPayStr}</span>
        </div>` : ''}
      <div class="loan-actions">
        <button class="btn xs secondary" onclick="openEditLoan('${loan.id}')">Edit</button>
        <button class="btn xs danger"    onclick="deleteLoan('${loan.id}')">Delete</button>
      </div>`;
    grid.appendChild(div);
  });
}

// ────────────────────────────────────────────────────────────────
// CREDIT CARDS
// ────────────────────────────────────────────────────────────────
function renderCreditCards() {
  const cards     = state.creditCards || [];
  const container = document.getElementById('cc-bars-container');
  container.innerHTML = '';

  let totalBal = 0, totalLim = 0;

  cards.forEach(cc => {
    totalBal += +cc.balance;
    totalLim += +cc.limit;
    const usePct  = (+cc.balance / +cc.limit) * 100;
    const colour  = usePct > 50 ? cssVar('--danger') : usePct > 30 ? cssVar('--warn') : cssVar('--accent2');
    const chipCls = usePct > 30 ? 'red' : 'green';

    const div = document.createElement('div');
    div.className = 'cc-bar-wrap';
    div.innerHTML = `
      <div class="cc-bar-header">
        <span style="font-weight:600">${cc.name}</span>
        <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
          <span>
            ${fmt(cc.balance)} / ${fmt(cc.limit)}
            <span class="chip ${chipCls}">${usePct.toFixed(0)}%</span>
          </span>
          <button class="btn icon-btn" onclick="openEditCreditCard('${cc.id}')" aria-label="Edit ${cc.name}">✎</button>
          <button class="btn icon-btn del" onclick="deleteCreditCard('${cc.id}')" aria-label="Delete ${cc.name}">×</button>
        </div>
      </div>
      <div class="cc-bar-track">
        <div class="cc-bar-fill" style="width:${Math.min(100, usePct).toFixed(1)}%;background:${colour}"></div>
        <div class="cc-bar-threshold" style="left:30%"></div>
      </div>`;
    container.appendChild(div);
  });

  const totalPct = totalLim > 0 ? (totalBal / totalLim) * 100 : 0;
  document.getElementById('cc-total-balance').textContent = fmt(totalBal);
  document.getElementById('cc-total-limit').textContent   = fmt(totalLim);
  document.getElementById('cc-total-chip').innerHTML =
    `<span class="chip ${totalPct > 30 ? 'red' : 'green'}">${totalPct.toFixed(1)}% total</span>`;

  renderCcBarChart(cards);
}

// ────────────────────────────────────────────────────────────────
// SAVINGS
// ────────────────────────────────────────────────────────────────
function renderSavings() {
  const today     = new Date();
  const year      = today.getFullYear();
  const month     = today.getMonth() + 1;
  const budget    = getTotalMonthlyIncome() * getAlloc().savings;
  const accounts  = state.savingsAccounts || [];
  const allocated   = accounts.reduce((s, a) => s + getAllocationForMonth(a, year, month), 0);
  const unallocated = budget - allocated;
  const allocPct    = budget > 0 ? Math.min(100, (allocated / budget) * 100) : 0;

  document.getElementById('disp-savings').textContent             = fmt(budget);
  document.getElementById('disp-savings-allocated').textContent   = fmt(allocated);
  document.getElementById('disp-savings-unallocated').textContent = fmt(unallocated);
  document.getElementById('disp-savings-unallocated').style.color = unallocated >= 0 ? 'var(--text)' : 'var(--danger)';

  document.getElementById('savings-alloc-pct').textContent      = allocPct.toFixed(0) + '%';
  document.getElementById('savings-alloc-bar').style.width      = allocPct.toFixed(1) + '%';
  document.getElementById('savings-alloc-bar').style.background =
    allocPct > 100 ? 'var(--danger)' : allocPct >= 90 ? 'var(--warn)' : 'var(--accent2)';

  const ul = document.getElementById('savings-accounts-list');
  ul.innerHTML = '';
  accounts.forEach(acct => {
    const monthlyAlloc = getAllocationForMonth(acct, year, month);
    const li = document.createElement('li');
    li.className = 'savings-acct-item swipeable';
    li.innerHTML = `
      <div class="swipe-delete-bg" aria-hidden="true">🗑</div>
      <div class="swipe-content">
        <span class="dot"></span>
        <span class="acct-name">${acct.name}</span>
        <div class="acct-details">
          <span class="acct-balance">Balance: ${fmt(acct.balance || 0)}</span>
          <span class="acct-monthly">Monthly: ${fmt(monthlyAlloc)}</span>
        </div>
        <button class="btn icon-btn" onclick="openEditSavingsAccount('${acct.id}')" aria-label="Edit ${acct.name}">✎</button>
        <button class="btn icon-btn del" onclick="deleteSavingsAccount('${acct.id}')" aria-label="Delete ${acct.name}">×</button>
      </div>`;
    ul.appendChild(li);
  });
}

// ────────────────────────────────────────────────────────────────
// SAVINGS GOALS
// ────────────────────────────────────────────────────────────────
function renderGoals() {
  const container = document.getElementById('goals-list');
  if (!container) return;

  const goals = state.goals || [];
  if (!goals.length) {
    container.innerHTML = '<p style="color:var(--text-secondary);padding:16px 0">No savings goals yet. Add one to get started!</p>';
    return;
  }

  container.innerHTML = '';
  goals.forEach(goal => {
    const progress = getGoalProgress(goal);
    if (!progress) return;

    const li = document.createElement('div');
    li.className = `goal-item goal-status-${progress.status}`;
    li.innerHTML = `
      <div class="goal-header">
        <span class="goal-account-name">${progress.accountName}</span>
        <span class="goal-target">${fmt(progress.targetAmount)} by ${progress.targetDate}</span>
        <div style="margin-left:auto;display:flex;gap:8px">
          <button class="btn icon-btn" onclick="openEditGoal('${goal.id}')" aria-label="Edit goal for ${progress.accountName}">✎</button>
          <button class="btn icon-btn del" onclick="deleteGoal('${goal.id}')" aria-label="Delete goal for ${progress.accountName}">×</button>
        </div>
      </div>
      <div class="goal-progress-container">
        <div class="progress-bar" style="width:${progress.progressPercent.toFixed(1)}%">
          <span class="progress-label">${fmt(progress.currentAmount)} / ${fmt(progress.targetAmount)}</span>
        </div>
      </div>
      <div class="goal-stats">
        <div class="stat">
          <span class="stat-label">Monthly Needed</span>
          <span class="stat-value">${fmt(progress.monthlySavingsNeeded)}</span>
        </div>
        <div class="stat">
          <span class="stat-label">Time Remaining</span>
          <span class="stat-value">${progress.monthsRemaining} month${progress.monthsRemaining !== 1 ? 's' : ''}</span>
        </div>
        <div class="stat">
          <span class="stat-label">Status</span>
          <span class="status-badge status-${progress.status}">
            ${progress.status === 'on-track' ? '✓ On Track' : progress.status === 'caution' ? '⚠ Caution' : progress.status === 'complete' ? '✓ Complete' : '✗ Off Track'}
          </span>
        </div>
      </div>`;
    container.appendChild(li);
  });
}

// ────────────────────────────────────────────────────────────────
// NET WORTH
// ────────────────────────────────────────────────────────────────
function renderNetWorth() {
  if (!document.getElementById('net-worth-section')) return;

  const d       = getNetWorthData();
  const nwColor = d.netWorth >= 0 ? 'var(--accent2)' : 'var(--danger)';

  let momHTML = '<span style="color:var(--muted);font-size:13px">No prior data</span>';
  if (d.momChange !== null) {
    const sign  = d.momChange >= 0 ? '+' : '';
    const color = d.momChange >= 0 ? 'var(--accent2)' : 'var(--danger)';
    const arrow = d.momChange >= 0 ? '▲' : '▼';
    momHTML = `<span style="color:${color};font-size:20px;font-weight:700">${arrow} ${sign}${fmt(d.momChange)}</span>`;
  }

  document.getElementById('nw-net-worth').textContent    = fmt(d.netWorth);
  document.getElementById('nw-net-worth').style.color    = nwColor;
  document.getElementById('nw-total-assets').textContent = fmt(d.totalAssets);
  document.getElementById('nw-total-liab').textContent   = fmt(d.totalLiabilities);
  document.getElementById('nw-mom-change').innerHTML     = momHTML;

  const totalAssetsPanel = document.getElementById('nw-total-assets-panel');
  if (totalAssetsPanel) totalAssetsPanel.textContent = fmt(d.totalAssets);

  // Liquid savings rows
  let savingsRows = (state.savingsAccounts || []).map(a =>
    `<div class="nw-breakdown-row">
      <span class="nw-breakdown-name">${a.name}</span>
      <span class="nw-breakdown-val">${fmt(a.balance || 0)}</span>
    </div>`
  ).join('') || '<div class="nw-breakdown-empty">No savings accounts</div>';
  document.getElementById('nw-savings-rows').innerHTML      = savingsRows;
  document.getElementById('nw-savings-total').textContent   = fmt(d.liquidAssets);

  // Manual asset categories
  const catContainer = document.getElementById('nw-category-rows');
  catContainer.innerHTML = '';
  d.byCategory.forEach(cat => {
    const itemRows = cat.items.map(a => `
      <div class="nw-breakdown-row nw-item-row">
        <span class="nw-breakdown-name">${a.name}</span>
        <span style="display:flex;align-items:center;gap:6px">
          <span class="nw-breakdown-val">${fmt(a.value)}</span>
          <button class="btn icon-btn" onclick="openEditAsset('${a.id}')" aria-label="Edit ${a.name}">✎</button>
          <button class="btn icon-btn del" onclick="deleteAsset('${a.id}')" aria-label="Delete ${a.name}">×</button>
        </span>
      </div>`).join('');

    const section = document.createElement('div');
    section.className = 'nw-category-section';
    section.innerHTML = `
      <div class="nw-category-header">
        <span>${cat.icon} ${cat.label}</span>
        <span style="display:flex;align-items:center;gap:8px">
          <span class="nw-category-total">${fmt(cat.total)}</span>
          <button class="btn" style="font-size:11px;padding:3px 8px" onclick="openAddAsset('${cat.key}')">+ Add</button>
        </span>
      </div>
      ${itemRows || '<div class="nw-breakdown-empty">None added</div>'}`;
    catContainer.appendChild(section);
  });

  // Liabilities
  const loanRows = (state.loans || []).map(l =>
    `<div class="nw-breakdown-row">
      <span class="nw-breakdown-name">${l.name}</span>
      <span class="nw-breakdown-val" style="color:var(--danger)">${fmt(l.remaining)}</span>
    </div>`
  ).join('') || '<div class="nw-breakdown-empty">No loans</div>';

  const ccRows = (state.creditCards || []).map(c =>
    `<div class="nw-breakdown-row">
      <span class="nw-breakdown-name">${c.name}</span>
      <span class="nw-breakdown-val" style="color:var(--danger)">${fmt(c.balance)}</span>
    </div>`
  ).join('') || '<div class="nw-breakdown-empty">No credit cards</div>';

  document.getElementById('nw-loan-rows').innerHTML    = loanRows;
  document.getElementById('nw-loan-total').textContent = fmt(d.totalLoans);
  document.getElementById('nw-cc-rows').innerHTML      = ccRows;
  document.getElementById('nw-cc-total').textContent   = fmt(d.totalCC);
  document.getElementById('nw-liab-total').textContent = fmt(d.totalLiabilities);

  renderNetWorthChart(d.history);
}

// ────────────────────────────────────────────────────────────────
// SUBSCRIPTIONS
// ────────────────────────────────────────────────────────────────
function renderSubscriptions() {
  const ul     = document.getElementById('sub-list');
  ul.innerHTML = '';

  const freqLabel = { monthly: '/mo', quarterly: '/qtr', 'bi-yearly': '/6mo', annual: '/yr' };

  [...(state.subscriptions || [])].sort((a, b) => new Date(a.date) - new Date(b.date)).forEach(sub => {
    const days       = daysUntil(sub.date);
    const chipCls    = days < 0 ? 'red' : days < 60 ? 'warn' : 'green';
    const chipTxt    = days < 0 ? 'Expired' : days === 0 ? 'Today!' : `${days}d`;
    const amount     = +sub.amount || 0;
    const suffix     = freqLabel[sub.frequency || 'monthly'] || '/mo';
    const budgetType = sub.budgetType || 'wants';
    const cardLabel  = sub.cardId
      ? ((state.expenseCards || []).find(c => c.id === sub.cardId)?.label ?? '?')
      : null;

    // Format the renewal date as "Jun 2, 2026"
    const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const [sy, sm, sd] = sub.date ? sub.date.split('-') : ['','',''];
    const displayDate = sub.date
      ? `${MONTHS[+sm - 1]} ${+sd}, ${sy}`
      : '—';

    const li = document.createElement('li');
    li.className = 'sub-item swipeable';
    li.setAttribute('aria-label', `${sub.name} subscription${days === 0 ? ', due today' : days < 0 ? ', expired' : `, renews in ${days} days`}`);
    li.innerHTML = `
      <div class="swipe-delete-bg" aria-hidden="true">🗑</div>
      <div class="swipe-content">
        <div class="sub-row-1">
          <span class="sub-name">${sub.name}</span>
          <span class="chip ${chipCls}">${chipTxt}</span>
        </div>
        <div class="sub-row-2">
          <span class="sub-badge ${budgetType}">${budgetType === 'needs' ? 'Needs' : 'Wants'}</span>
          ${cardLabel
            ? `<span class="chip purple sub-card-chip" title="Charged to ${cardLabel}">💳 ${cardLabel}</span>`
            : `<span class="chip warn sub-card-chip" title="No payment card linked">⚠ No card</span>`}
          <span class="sub-amount">${amount > 0 ? fmt(amount) + suffix : '—'}</span>
        </div>
        <div class="sub-row-3">
          <span class="sub-date">Renews ${displayDate}</span>
          <div style="display:flex;gap:6px">
            <button class="btn icon-btn" onclick="openEditSubscription('${sub.id}')" aria-label="Edit ${sub.name}">✎</button>
            <button class="btn icon-btn del" onclick="deleteSubscription('${sub.id}')" aria-label="Delete ${sub.name}">×</button>
          </div>
        </div>
      </div>`;
    ul.appendChild(li);
  });

  // ── Totals by budget type ─────────────────────────────────────
  const moRate = { monthly: 1, quarterly: 1 / 3, 'bi-yearly': 1 / 6, annual: 1 / 12 };
  const wantsMo = (state.subscriptions || [])
    .filter(s => (s.budgetType || 'wants') !== 'needs')
    .reduce((sum, s) => sum + (+s.amount || 0) * (moRate[s.frequency || 'monthly'] ?? 1), 0);
  const needsMo = (state.subscriptions || [])
    .filter(s => s.budgetType === 'needs')
    .reduce((sum, s) => sum + (+s.amount || 0) * (moRate[s.frequency || 'monthly'] ?? 1), 0);

  const wantsTotEl = document.getElementById('sub-wants-monthly');
  const needsTotEl = document.getElementById('sub-needs-monthly');
  if (wantsTotEl) wantsTotEl.textContent = fmt(wantsMo) + '/mo';
  if (needsTotEl) needsTotEl.textContent = fmt(needsMo) + '/mo';
}

// ────────────────────────────────────────────────────────────────
// WISHLIST
// ────────────────────────────────────────────────────────────────
function renderWishlist() {
  const ul     = document.getElementById('wishlist');
  ul.innerHTML = '';

  (state.wishlist || []).forEach(item => {
    const li = document.createElement('li');
    li.className = 'wish-item swipeable';
    li.innerHTML = `
      <div class="swipe-delete-bg" aria-hidden="true">🗑</div>
      <div class="swipe-content">
        <span class="wish-icon" aria-hidden="true">${item.icon || '🛒'}</span>
        <span class="wish-name">${item.name}</span>
        ${item.url ? `<a class="wish-link" href="${item.url}" target="_blank" rel="noopener" aria-label="View ${item.name} (opens in new tab)">Link ↗</a>` : ''}
        <div class="wish-actions">
          <button class="btn icon-btn" onclick="openEditWishlistItem('${item.id}')" aria-label="Edit ${item.name}">✎</button>
          <button class="btn icon-btn del" onclick="deleteWishlistItem('${item.id}')" aria-label="Delete ${item.name}">×</button>
        </div>
      </div>`;
    ul.appendChild(li);
  });
}

// ────────────────────────────────────────────────────────────────
// SPENDING RULES
// ────────────────────────────────────────────────────────────────
function renderRules() {
  const container = document.getElementById('rules-list');
  if (!container) return;

  const rules = state.rules || [];
  if (!rules.length) {
    container.innerHTML = '<p style="color:var(--muted);font-size:12px;padding:8px 0">No rules yet. Add a rule to auto-categorize purchases as you type.</p>';
    return;
  }

  const matchLabels = { contains: 'contains', startsWith: 'starts with', exact: 'exactly' };
  container.innerHTML = rules.map(r => {
    const colour = CATEGORY_COLOURS[r.category] || '#8b95ad';
    return `
      <div class="rule-item">
        <span class="rule-pattern">"${r.pattern}"</span>
        <span class="rule-matchtype">${matchLabels[r.matchType] || r.matchType}</span>
        <span class="rule-arrow">→</span>
        <span class="rule-category" style="background:${colour}20;color:${colour}">${r.category}</span>
        <div style="margin-left:auto;display:flex;gap:4px">
          <button class="btn icon-btn" onclick="openEditRule('${r.id}')" aria-label="Edit rule for ${r.pattern}">✎</button>
          <button class="btn icon-btn del" onclick="deleteRule('${r.id}')" aria-label="Delete rule for ${r.pattern}">×</button>
        </div>
      </div>`;
  }).join('');
}

// ────────────────────────────────────────────────────────────────
// BUDGET ALERTS
// ────────────────────────────────────────────────────────────────
function renderBudgetAlerts() {
  const container = document.getElementById('budget-alerts-list');
  if (!container) return;

  const alerts = state.budgetAlerts || [];
  if (!alerts.length) {
    container.innerHTML = '<p style="color:var(--muted);font-size:12px;padding:8px 0">No alerts set. Add an alert to be warned when spending in a category exceeds your threshold.</p>';
    return;
  }

  const spending = getCategorySpending(state.purchases || []);
  container.innerHTML = alerts.map(a => {
    const spent     = spending[a.category] || 0;
    const pctUsed   = a.threshold > 0 ? Math.min(100, (spent / a.threshold) * 100) : 0;
    const triggered = spent > a.threshold;
    const barColour = triggered ? '#ff4d6d' : pctUsed > 75 ? '#ffa63d' : 'var(--accent2)';
    const catColour = CATEGORY_COLOURS[a.category] || '#8b95ad';
    return `
      <div class="alert-item${triggered ? ' triggered' : ''}">
        <div class="alert-item-header">
          <span class="alert-category" style="background:${catColour}20;color:${catColour}">${a.category}</span>
          <span class="alert-amounts">${fmt(spent)} / ${fmt(a.threshold)}</span>
          ${triggered ? '<span class="chip red" style="font-size:10px;padding:2px 6px">⚠ Over</span>' : ''}
          <div style="margin-left:auto;display:flex;gap:4px">
            <button class="btn icon-btn" onclick="openEditAlert('${a.id}')" aria-label="Edit alert for ${a.category}">✎</button>
            <button class="btn icon-btn del" onclick="deleteAlert('${a.id}')" aria-label="Delete alert for ${a.category}">×</button>
          </div>
        </div>
        <div class="progress-track" style="margin-top:8px">
          <div class="progress-fill" style="width:${pctUsed.toFixed(1)}%;background:${barColour}"></div>
        </div>
        <div style="font-size:10px;color:var(--muted);margin-top:3px">${pctUsed.toFixed(0)}% of threshold</div>
      </div>`;
  }).join('');
}

// ────────────────────────────────────────────────────────────────
// RENDER ALL
// ────────────────────────────────────────────────────────────────
// ────────────────────────────────────────────────────────────────
// EXPENSE SCHEDULE
// ────────────────────────────────────────────────────────────────

/**
 * Render the 3-month summary bar + active-month bill list.
 * Reads scheduleViewYear/Month from app.js globals.
 */
function renderSchedule() {
  const summaryEl = document.getElementById('schedule-summary');
  const detailEl  = document.getElementById('schedule-detail');
  if (!summaryEl || !detailEl) return;

  const today = new Date();

  // ── 3-month summary cards ──────────────────────────────────────
  summaryEl.innerHTML = '';
  for (let offset = 0; offset < 3; offset++) {
    const d     = new Date(scheduleViewYear, scheduleViewMonth - 1 + offset, 1);
    const y     = d.getFullYear();
    const m     = d.getMonth() + 1;
    const fc    = getMonthForecast(y, m);
    const isActive = (y === scheduleViewYear && m === scheduleViewMonth);

    const overBudget = fc.variance < 0;
    const atLabel    = d.toLocaleString('en-CA', { month: 'long', year: 'numeric' });
    const varSign    = overBudget ? '+' : '';
    const varAmt     = fmt(Math.abs(fc.variance));
    const varColor   = overBudget ? 'var(--danger)' : 'var(--accent2)';
    const varLabel   = overBudget ? 'over budget' : 'under budget';

    const card = document.createElement('button');
    card.type      = 'button';
    card.className = 'schedule-summary-card' + (isActive ? ' active' : '');
    card.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    card.setAttribute('aria-label', atLabel);
    card.onclick   = () => { scheduleViewYear = y; scheduleViewMonth = m; renderSchedule(); };
    card.innerHTML = `
      <div class="ssc-month">${atLabel}</div>
      <div class="ssc-total">${fmt(fc.total)}</div>
      <div class="ssc-variance" style="color:${varColor}">
        ${varSign}${varAmt} ${varLabel}
      </div>
      <div class="ssc-count">${fc.dated.length + fc.undated.length} recurring bill${fc.dated.length + fc.undated.length !== 1 ? 's' : ''}</div>`;
    summaryEl.appendChild(card);
  }

  // ── Active-month detail ───────────────────────────────────────
  const fc       = getMonthForecast(scheduleViewYear, scheduleViewMonth);
  const monthLabel = new Date(scheduleViewYear, scheduleViewMonth - 1, 1)
    .toLocaleString('en-CA', { month: 'long', year: 'numeric' });

  /** Render a single bill row */
  function billRow(item) {
    const dayLabel   = item.dueDay ? ordinal(item.dueDay) : '∞';
    const cardBadge  = `<span class="schedule-badge card-label">${item.cardLabel}</span>`;
    const typeBadge  = item.biweekly
      ? `<span class="schedule-badge biweekly">×2 bi-wk</span>`
      : item.source === 'subscription'
        ? `<span class="schedule-badge sub">subscription</span>`
        : '';
    return `
      <div class="schedule-bill-row">
        <span class="sched-day">${dayLabel}</span>
        <span class="sched-name">${item.name}</span>
        ${cardBadge}
        ${typeBadge}
        <span class="sched-amt">${fmt(item.totalForMonth)}</span>
      </div>`;
  }

  const datedHtml   = fc.dated.map(billRow).join('');
  const undatedHtml = fc.undated.map(billRow).join('');

  const emptyHtml = `
    <div class="empty-state" style="margin-top:16px">
      <div>📅</div>
      <div>No recurring bills yet — add expense cards or subscriptions to see them here.</div>
    </div>`;

  const hasAny = fc.dated.length > 0 || fc.undated.length > 0;

  const overBudget = fc.variance < 0;
  const totalColor = overBudget ? 'var(--danger)' : 'var(--accent2)';

  detailEl.innerHTML = `
    <div class="schedule-detail-header">
      <button class="btn xs secondary" onclick="prevScheduleMonth()">‹ Prev</button>
      <div class="schedule-detail-title">
        ${monthLabel}
        <span class="schedule-total" style="color:${totalColor}">${fmt(fc.total)} / mo</span>
      </div>
      <button class="btn xs secondary" onclick="nextScheduleMonth()">Next ›</button>
    </div>

    ${!hasAny ? emptyHtml : `
      ${fc.dated.length ? `
        <div class="schedule-group-label">Scheduled by date</div>
        ${datedHtml}
      ` : ''}
      ${fc.undated.length ? `
        <div class="schedule-group-label">Any time this month</div>
        ${undatedHtml}
      ` : ''}
      <div class="schedule-total-row">
        <span>Total recurring</span>
        <span style="color:${totalColor};font-weight:800">${fmt(fc.total)}</span>
      </div>
    `}`;
}

/** Format a day number as an ordinal string (1 → "1st", 15 → "15th"). */
function ordinal(n) {
  const s = ['th','st','nd','rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/**
 * Re-render every dashboard section from current state.
 * This is the "nuclear option" — used only for full resets such as CSV
 * import, clearAllData, and the initial page load.  For incremental
 * mutations, prefer the targeted render calls in app.js CRUD handlers.
 *
 * The Schedule tab is intentionally excluded from the default pass: it
 * is expensive to compute and is only rendered when the Schedule tab is
 * currently active.
 *
 * @returns {void}
 */
function renderAll() {
  renderIncome();
  renderIncomeStreams();
  renderWants();
  renderBudgetVsActual();
  renderExpenseCards();
  renderLoans();
  renderCreditCards();
  renderSavings();
  renderGoals();
  renderNetWorth();
  renderSubscriptions();
  renderRules();
  renderBudgetAlerts();
  renderWishlist();
  // Schedule is expensive — only render when the tab is visible
  if (document.getElementById('tab-schedule')?.classList.contains('active')) renderSchedule();
}
