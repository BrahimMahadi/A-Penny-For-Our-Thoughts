/* ═══════════════════════════════════════════════════════════════
   Module:   app.js
   Project:  A Penny For Our Thoughts
   Created:  May 2026
   Summary:  Application entry point. Handles all CRUD operations
             (open/edit/delete modals), UI interactions (modal
             system, tab switching, analytics filters), and
             CSV import/export. Calls render functions after every
             state mutation.
   Depends on: utils.js, state.js, analytics.js, charts.js, render.js
═══════════════════════════════════════════════════════════════ */

// ────────────────────────────────────────────────────────────────
// UI STATE
// ────────────────────────────────────────────────────────────────
let analyticsFilters = { startDate: '', endDate: '', search: '' };

// Schedule view — defaults to current month on load
const _now = new Date();
let scheduleViewYear  = _now.getFullYear();
let scheduleViewMonth = _now.getMonth() + 1;  // 1-based

// ────────────────────────────────────────────────────────────────
// TABS
// ────────────────────────────────────────────────────────────────
function switchTab(tab) {
  // Hide all pages and deactivate all tab buttons
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));

  const page    = document.getElementById('tab-' + tab);
  const tabBtn  = document.getElementById('tab-btn-' + tab);
  if (page)   page.classList.add('active');
  if (tabBtn) tabBtn.classList.add('active');

  // Re-render schedule when navigating to it (data may have changed)
  if (tab === 'schedule') renderSchedule();
}

// ────────────────────────────────────────────────────────────────
// TARGETED RENDER HELPERS
// ────────────────────────────────────────────────────────────────

/** Re-renders the Schedule only when it is the active tab. */
function _scheduleIfActive() {
  if (document.getElementById('tab-schedule')?.classList.contains('active')) renderSchedule();
}

/**
 * Re-renders every section whose displayed value is derived from income
 * (i.e. income, wants envelope, expense card remaining, BvA, savings, goals).
 * Called after any income-stream or allocation-% mutation.
 */
function _renderIncomeDependents() {
  renderIncome();
  renderIncomeStreams();
  renderWants();
  renderExpenseCards();
  renderBudgetVsActual();
  renderSavings();
  renderGoals();
  _scheduleIfActive();
}

// ────────────────────────────────────────────────────────────────
// SCHEDULE NAVIGATION
// ────────────────────────────────────────────────────────────────
function prevScheduleMonth() {
  scheduleViewMonth--;
  if (scheduleViewMonth < 1) { scheduleViewMonth = 12; scheduleViewYear--; }
  renderSchedule();
}

function nextScheduleMonth() {
  scheduleViewMonth++;
  if (scheduleViewMonth > 12) { scheduleViewMonth = 1; scheduleViewYear++; }
  renderSchedule();
}

// ────────────────────────────────────────────────────────────────
// INFO TOOLTIPS
// ────────────────────────────────────────────────────────────────
function toggleInfoTip(e, id) {
  e.stopPropagation();
  const tip    = document.getElementById(id);
  const isOpen = tip.classList.contains('open');
  // Close all open tips first
  document.querySelectorAll('.info-tip.open').forEach(t => t.classList.remove('open'));
  if (!isOpen) tip.classList.add('open');
}

// Dismiss any open tip when clicking outside
document.addEventListener('click', () => {
  document.querySelectorAll('.info-tip.open').forEach(t => t.classList.remove('open'));
});

// ────────────────────────────────────────────────────────────────
// MODAL SYSTEM
// ────────────────────────────────────────────────────────────────
function openModal(title, bodyHTML, onSave) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML    = bodyHTML;
  document.getElementById('modal-save-btn').onclick  = onSave;
  document.getElementById('modal-overlay').classList.add('active');
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('active');
}

function handleOverlayClick(e) {
  if (e.target === document.getElementById('modal-overlay')) closeModal();
}

/** Build a labelled modal input field as an HTML string */
function mField(label, id, type, value, placeholder, extraAttrs) {
  return `
    <div class="modal-field">
      <label>${label}</label>
      <input type="${type}" id="${id}"
             value="${value !== undefined ? value : ''}"
             placeholder="${placeholder || ''}"
             ${extraAttrs || ''} />
    </div>`;
}

// ────────────────────────────────────────────────────────────────
// BUDGET ALLOCATION
// ────────────────────────────────────────────────────────────────
function openEditAllocation() {
  const a = state.allocation || { needs: 50, wants: 30, savings: 20 };
  openModal(
    'Edit Budget Allocation',
    mField('Needs %',   'alloc-needs',   'number', a.needs,   '50', 'min="0" max="100" step="1" oninput="updateAllocValidation()"') +
    mField('Wants %',   'alloc-wants',   'number', a.wants,   '30', 'min="0" max="100" step="1" oninput="updateAllocValidation()"') +
    mField('Savings %', 'alloc-savings', 'number', a.savings, '20', 'min="0" max="100" step="1" oninput="updateAllocValidation()"') +
    `<div id="alloc-validation" style="margin-top:12px;padding:8px;border-radius:4px;font-size:13px;font-weight:600;background:#3a4456;color:#8b95ad">
      Total: <span id="alloc-total">100</span>%
    </div>`,
    () => {
      const n = parseFloat(document.getElementById('alloc-needs').value)   || 0;
      const w = parseFloat(document.getElementById('alloc-wants').value)   || 0;
      const s = parseFloat(document.getElementById('alloc-savings').value) || 0;
      if (Math.round(n + w + s) !== 100) {
        alert(`Budget allocation must sum to 100%. Currently: ${n + w + s}%`);
        return;
      }
      state.allocation = { needs: n, wants: w, savings: s };
      saveToStorage(); _renderIncomeDependents(); closeModal();
    }
  );
  updateAllocValidation();
}

function updateAllocValidation() {
  const n     = parseFloat(document.getElementById('alloc-needs').value)   || 0;
  const w     = parseFloat(document.getElementById('alloc-wants').value)   || 0;
  const s     = parseFloat(document.getElementById('alloc-savings').value) || 0;
  const total = n + w + s;
  const isValid = Math.round(total) === 100;

  document.getElementById('alloc-total').textContent = total;
  const display = document.getElementById('alloc-validation');
  display.style.color      = isValid ? '#00d4aa' : total > 100 ? '#ff4d6d' : '#ffa63d';
  display.style.fontWeight = isValid ? '600' : '700';
}

function toggleBudgetMode(category) {
  if (!state.budgetDisplayMode) state.budgetDisplayMode = { needs: 'monthly', wants: 'monthly', savings: 'monthly' };
  state.budgetDisplayMode[category] = state.budgetDisplayMode[category] === 'monthly' ? 'biweekly' : 'monthly';
  saveToStorage(); renderIncome();
}

// ────────────────────────────────────────────────────────────────
// INCOME STREAMS — CRUD
// ────────────────────────────────────────────────────────────────
function addIncomeStream() {
  const name     = document.getElementById('new-stream-name').value.trim();
  const amount   = parseFloat(document.getElementById('new-stream-amount').value);
  const biweekly = document.getElementById('new-stream-biweekly').checked;
  if (!name || isNaN(amount) || amount <= 0) return;
  state.incomeStreams.push({ id: genId(), name, amount, biweekly });
  document.getElementById('new-stream-name').value         = '';
  document.getElementById('new-stream-amount').value       = '';
  document.getElementById('new-stream-biweekly').checked   = false;
  saveToStorage(); _renderIncomeDependents();
}

function openEditIncomeStream(id) {
  const stream = (state.incomeStreams || []).find(s => s.id === id);
  if (!stream) return;
  openModal(
    'Edit Income Stream',
    mField('Stream Name', 'mis-name',   'text',   stream.name,   '') +
    mField('Amount ($)',  'mis-amount', 'number', stream.amount, '0.00', 'min="0" step="0.01"') +
    `<div class="modal-field">
      <label>Frequency</label>
      <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
        <input type="checkbox" id="mis-biweekly" ${stream.biweekly ? 'checked' : ''} />
        Bi-weekly (paid every 2 weeks)
      </label>
    </div>`,
    () => {
      const name     = document.getElementById('mis-name').value.trim();
      const amount   = parseFloat(document.getElementById('mis-amount').value);
      const biweekly = document.getElementById('mis-biweekly').checked;
      if (!name || isNaN(amount)) return;
      Object.assign(stream, { name, amount, biweekly });
      saveToStorage(); _renderIncomeDependents(); closeModal();
    }
  );
}

function deleteIncomeStream(id) {
  if (!confirm('Remove this income stream?')) return;
  state.incomeStreams = state.incomeStreams.filter(s => s.id !== id);
  saveToStorage(); _renderIncomeDependents();
}

// ────────────────────────────────────────────────────────────────
// WANTS — CRUD
// ────────────────────────────────────────────────────────────────
function addPurchase() {
  const name   = document.getElementById('purchase-name').value.trim();
  const amount = parseFloat(document.getElementById('purchase-amount').value);
  if (!name || isNaN(amount) || amount <= 0) return;
  const category = applyRulesToName(name) || 'Other';
  state.purchases.push({ id: genId(), name, amount, category });
  document.getElementById('purchase-name').value   = '';
  document.getElementById('purchase-amount').value = '';
  // Clear preview
  const preview = document.getElementById('purchase-cat-preview');
  if (preview) preview.innerHTML = '';
  saveToStorage(); renderWants(); renderBudgetVsActual();
}

function removePurchase(id) {
  state.purchases = state.purchases.filter(p => p.id !== id);
  saveToStorage(); renderWants(); renderBudgetVsActual();
}

/** Manually override the category of a current-period purchase */
function setPurchaseCategory(id, category) {
  const p = (state.purchases || []).find(p => p.id === id);
  if (!p) return;
  p.category = category;
  saveToStorage(); renderPurchaseList(); renderWants();
}

/** Re-apply all rules to current-period purchases (non-destructive: only sets if a rule matches) */
function reapplyRulesToPurchases() {
  let changed = 0;
  (state.purchases || []).forEach(p => {
    const matched = applyRulesToName(p.name);
    if (matched && p.category !== matched) { p.category = matched; changed++; }
  });
  if (changed) { saveToStorage(); renderPurchaseList(); renderWants(); }
  return changed;
}

/**
 * Archive current purchases to spendingHistory, then reset.
 * Refreshes analytics panel if it is open.
 */
function resetWants() {
  if (!confirm('Reset all purchases for this bi-weekly period?')) return;
  if ((state.purchases || []).length > 0) {
    const total = state.purchases.reduce((s, p) => s + +p.amount, 0);
    state.spendingHistory.push({
      id:    genId(),
      date:  new Date().toISOString().split('T')[0],
      label: `Period ending ${new Date().toLocaleDateString('en-CA')}`,
      total,
      items: deepClone(state.purchases),
    });
  }
  state.purchases = [];
  saveToStorage(); renderWants(); renderBudgetVsActual();
  const panel = document.getElementById('analytics-panel');
  if (panel && panel.style.display !== 'none') renderSpendingAnalytics();
}

// ────────────────────────────────────────────────────────────────
// ANALYTICS FILTERS
// ────────────────────────────────────────────────────────────────
function updateAnalyticsFilters() {
  analyticsFilters.startDate = document.getElementById('analytics-filter-start').value;
  analyticsFilters.endDate   = document.getElementById('analytics-filter-end').value;
  analyticsFilters.search    = document.getElementById('analytics-filter-search').value;
  renderSpendingAnalytics();
}

function resetAnalyticsFilters() {
  analyticsFilters = { startDate: '', endDate: '', search: '' };
  document.getElementById('analytics-filter-start').value  = '';
  document.getElementById('analytics-filter-end').value    = '';
  document.getElementById('analytics-filter-search').value = '';
  renderSpendingAnalytics();
}

// ────────────────────────────────────────────────────────────────
// SPENDING HISTORY — CRUD
// ────────────────────────────────────────────────────────────────
function openEditHistoryPurchase(periodId, purchaseId) {
  const period   = (state.spendingHistory || []).find(p => p.id === periodId);
  if (!period) return;
  const purchase = (period.items || []).find(p => p.id === purchaseId);
  if (!purchase) return;
  openModal(
    'Edit Purchase',
    mField('Item Name',  'mhp-name',   'text',   purchase.name,   '') +
    mField('Amount ($)', 'mhp-amount', 'number', purchase.amount, '0.00', 'min="0" step="0.01"'),
    () => {
      const name   = document.getElementById('mhp-name').value.trim();
      const amount = parseFloat(document.getElementById('mhp-amount').value);
      if (!name || isNaN(amount)) return;
      Object.assign(purchase, { name, amount });
      period.total = period.items.reduce((s, p) => s + +p.amount, 0);
      saveToStorage(); renderAnalyticsHistory(); closeModal();
    }
  );
}

function deleteHistoryPurchase(periodId, purchaseId) {
  const period = (state.spendingHistory || []).find(p => p.id === periodId);
  if (!period || !confirm('Remove this purchase from history?')) return;
  period.items = period.items.filter(p => p.id !== purchaseId);
  period.total = period.items.reduce((s, p) => s + +p.amount, 0);
  saveToStorage(); renderSpendingAnalytics();
}

function deleteHistoryPeriod(periodId) {
  if (!confirm('Delete this entire spending period from history?')) return;
  state.spendingHistory = state.spendingHistory.filter(p => p.id !== periodId);
  saveToStorage(); renderSpendingAnalytics();
}

// ────────────────────────────────────────────────────────────────
// EXPENSE CARDS — CRUD
// ────────────────────────────────────────────────────────────────
function addExpense(cardId) {
  const card = (state.expenseCards || []).find(c => c.id === cardId);
  if (!card) return;
  const name     = document.getElementById('new-name-'   + cardId).value.trim();
  const amount   = parseFloat(document.getElementById('new-amount-' + cardId).value);
  const biweekly = document.getElementById('new-bw-'     + cardId).checked;
  if (!name || isNaN(amount) || amount <= 0) return;
  card.items.push({ id: genId(), name, amount, biweekly });
  document.getElementById('new-name-'   + cardId).value   = '';
  document.getElementById('new-amount-' + cardId).value   = '';
  document.getElementById('new-bw-'     + cardId).checked = false;
  saveToStorage(); renderExpenseCards(); renderBudgetVsActual(); _scheduleIfActive();
}

function removeExpense(cardId, itemId) {
  const card = (state.expenseCards || []).find(c => c.id === cardId);
  if (!card) return;
  card.items = card.items.filter(i => i.id !== itemId);
  saveToStorage(); renderExpenseCards(); renderBudgetVsActual(); _scheduleIfActive();
}

function openAddExpenseCard() {
  openModal('Add Payment Card', mField('Card Label', 'mec-label', 'text', '', 'e.g. TD Debit'), () => {
    const label = document.getElementById('mec-label').value.trim();
    if (!label) return;
    state.expenseCards.push({ id: genId(), label, items: [] });
    saveToStorage(); renderExpenseCards(); renderBudgetVsActual(); _scheduleIfActive(); closeModal();
  });
}

function openEditExpenseCard(id) {
  const card = (state.expenseCards || []).find(c => c.id === id);
  if (!card) return;
  openModal('Rename Payment Card', mField('Card Label', 'mec-label', 'text', card.label, ''), () => {
    const label = document.getElementById('mec-label').value.trim();
    if (!label) return;
    card.label = label;
    saveToStorage(); renderExpenseCards(); renderBudgetVsActual(); _scheduleIfActive(); closeModal();
  });
}

function deleteExpenseCard(id) {
  if (!confirm('Delete this payment card and all its expenses?')) return;
  state.expenseCards = state.expenseCards.filter(c => c.id !== id);
  saveToStorage(); renderExpenseCards(); renderBudgetVsActual(); _scheduleIfActive();
}

function openEditExpenseItem(cardId, itemId) {
  const card = (state.expenseCards || []).find(c => c.id === cardId);
  if (!card) return;
  const item = (card.items || []).find(i => i.id === itemId);
  if (!item) return;

  const body =
    mField('Expense Name', 'mei-name', 'text', item.name, 'e.g. Rent') +
    `<div class="modal-row">` +
      mField('Amount ($)', 'mei-amount', 'number', item.amount, '0.00', 'min="0" step="0.01"') +
      mField('Due Day (optional)', 'mei-dueday', 'number', item.dueDay ?? '', '1–31', 'min="1" max="31" step="1"') +
    `</div>` +
    `<div class="modal-field">
      <label style="flex-direction:row;align-items:center;gap:8px;text-transform:none;letter-spacing:0;font-size:13px;font-weight:600;color:var(--text)">
        <input type="checkbox" id="mei-biweekly" ${item.biweekly ? 'checked' : ''} />
        Bi-weekly pay (amount is per paycheque — ×2 for monthly)
      </label>
    </div>`;

  openModal('Edit Expense Item', body, () => {
    const name     = document.getElementById('mei-name').value.trim();
    const amount   = parseFloat(document.getElementById('mei-amount').value);
    const biweekly = document.getElementById('mei-biweekly').checked;
    const dueDayRaw = parseInt(document.getElementById('mei-dueday').value, 10);
    const dueDay   = (!isNaN(dueDayRaw) && dueDayRaw >= 1 && dueDayRaw <= 31) ? dueDayRaw : null;

    if (!name || isNaN(amount) || amount <= 0) return;
    Object.assign(item, { name, amount, biweekly, dueDay });
    saveToStorage(); renderExpenseCards(); renderBudgetVsActual(); _scheduleIfActive(); closeModal();
  });
}

// ────────────────────────────────────────────────────────────────
// LOANS — CRUD
// ────────────────────────────────────────────────────────────────
function openAddLoan() {
  openModal(
    'Add Loan',
    mField('Loan Name', 'ml-name', 'text', '', 'e.g. Car Loan') +
    '<div class="modal-row">' +
    mField('Remaining Balance ($)', 'ml-rem',  'number', '', '0.00', 'min="0" step="0.01"') +
    mField('Original Balance ($)',  'ml-orig', 'number', '', '0.00', 'min="0" step="0.01"') +
    '</div>',
    () => {
      const name = document.getElementById('ml-name').value.trim();
      const rem  = parseFloat(document.getElementById('ml-rem').value);
      const orig = parseFloat(document.getElementById('ml-orig').value);
      if (!name || isNaN(rem) || isNaN(orig)) return;
      state.loans.push({ id: genId(), name, remaining: rem, original: orig });
      saveToStorage(); renderLoans(); renderNetWorth(); closeModal();
    }
  );
}

function openEditLoan(id) {
  const loan = state.loans.find(l => l.id === id);
  if (!loan) return;
  openModal(
    'Edit Loan',
    mField('Loan Name', 'ml-name', 'text', loan.name, '') +
    '<div class="modal-row">' +
    mField('Remaining Balance ($)', 'ml-rem',  'number', loan.remaining, '0.00', 'min="0" step="0.01"') +
    mField('Original Balance ($)',  'ml-orig', 'number', loan.original,  '0.00', 'min="0" step="0.01"') +
    '</div>',
    () => {
      const name = document.getElementById('ml-name').value.trim();
      const rem  = parseFloat(document.getElementById('ml-rem').value);
      const orig = parseFloat(document.getElementById('ml-orig').value);
      if (!name || isNaN(rem) || isNaN(orig)) return;
      Object.assign(loan, { name, remaining: rem, original: orig });
      saveToStorage(); renderLoans(); renderNetWorth(); closeModal();
    }
  );
}

function deleteLoan(id) {
  if (!confirm('Delete this loan?')) return;
  state.loans = state.loans.filter(l => l.id !== id);
  saveToStorage(); renderLoans(); renderNetWorth();
}

// ────────────────────────────────────────────────────────────────
// CREDIT CARDS — CRUD
// ────────────────────────────────────────────────────────────────
function openAddCreditCard() {
  openModal(
    'Add Credit Card',
    mField('Card Name',  'cc-name',    'text',   '', 'e.g. TD Small CC (9602)') +
    '<div class="modal-row">' +
    mField('Balance ($)', 'cc-balance', 'number', '', '0.00', 'min="0" step="0.01"') +
    mField('Limit ($)',   'cc-limit',   'number', '', '0.00', 'min="0" step="0.01"') +
    '</div>',
    () => {
      const name    = document.getElementById('cc-name').value.trim();
      const balance = parseFloat(document.getElementById('cc-balance').value);
      const limit   = parseFloat(document.getElementById('cc-limit').value);
      if (!name || isNaN(balance) || isNaN(limit)) return;
      state.creditCards.push({ id: genId(), name, balance, limit });
      saveToStorage(); renderCreditCards(); renderNetWorth(); closeModal();
    }
  );
}

function openEditCreditCard(id) {
  const cc = state.creditCards.find(c => c.id === id);
  if (!cc) return;
  openModal(
    'Edit Credit Card',
    mField('Card Name',   'cc-name',    'text',   cc.name,    '') +
    '<div class="modal-row">' +
    mField('Balance ($)', 'cc-balance', 'number', cc.balance, '0.00', 'min="0" step="0.01"') +
    mField('Limit ($)',   'cc-limit',   'number', cc.limit,   '0.00', 'min="0" step="0.01"') +
    '</div>',
    () => {
      const name    = document.getElementById('cc-name').value.trim();
      const balance = parseFloat(document.getElementById('cc-balance').value);
      const limit   = parseFloat(document.getElementById('cc-limit').value);
      if (!name || isNaN(balance) || isNaN(limit)) return;
      Object.assign(cc, { name, balance, limit });
      saveToStorage(); renderCreditCards(); renderNetWorth(); closeModal();
    }
  );
}

function deleteCreditCard(id) {
  if (!confirm('Delete this credit card?')) return;
  state.creditCards = state.creditCards.filter(c => c.id !== id);
  saveToStorage(); renderCreditCards(); renderNetWorth();
}

// ────────────────────────────────────────────────────────────────
// SAVINGS ACCOUNTS — CRUD
// ────────────────────────────────────────────────────────────────
function addSavingsAccount() {
  const name             = document.getElementById('new-savings-name').value.trim();
  const defaultAllocated = parseFloat(document.getElementById('new-savings-amount').value) || 0;
  if (!name) return;
  state.savingsAccounts.push({ id: genId(), name, balance: 0, defaultAllocated, monthlyAllocations: {} });
  document.getElementById('new-savings-name').value   = '';
  document.getElementById('new-savings-amount').value = '';
  saveToStorage(); renderSavings(); renderGoals(); renderNetWorth();
}

function openEditSavingsAccount(id) {
  const acct = (state.savingsAccounts || []).find(a => a.id === id);
  if (!acct) return;
  openModal(
    'Edit Savings Account',
    mField('Account Name', 'msa-name', 'text', acct.name, '') +
    '<div class="modal-row">' +
    mField('Current Balance ($)',    'msa-balance',      'number', acct.balance || 0,          '0.00', 'min="0" step="0.01"') +
    mField('Monthly Allocation ($)', 'msa-default-alloc', 'number', acct.defaultAllocated || 0, '0.00', 'min="0" step="0.01"') +
    '</div>',
    () => {
      const name             = document.getElementById('msa-name').value.trim();
      const balance          = parseFloat(document.getElementById('msa-balance').value);
      const defaultAllocated = parseFloat(document.getElementById('msa-default-alloc').value);
      if (!name || isNaN(balance) || isNaN(defaultAllocated)) return;
      Object.assign(acct, { name, balance, defaultAllocated });
      saveToStorage(); renderSavings(); renderGoals(); renderNetWorth(); closeModal();
    }
  );
}

function deleteSavingsAccount(id) {
  if (!confirm('Remove this savings account?')) return;
  state.savingsAccounts = state.savingsAccounts.filter(a => a.id !== id);
  state.goals           = (state.goals || []).filter(g => g.accountId !== id);
  saveToStorage(); renderSavings(); renderGoals(); renderNetWorth();
}

function openAllocateSavingsModal() {
  const today     = new Date();
  const year      = today.getFullYear();
  const month     = today.getMonth() + 1;
  const monthStr  = `${year}-${String(month).padStart(2, '0')}`;
  const monthName = today.toLocaleString('en-CA', { month: 'long', year: 'numeric' });
  const budget    = getTotalMonthlyIncome() * getAlloc().savings;
  const accounts  = state.savingsAccounts || [];

  const accountFields = accounts.map(acct => {
    const currentMonthAlloc = getAllocationForMonth(acct, year, month);
    return `
      <div style="display:grid;grid-template-columns:2fr 1fr;gap:12px;align-items:center;padding:8px;background:var(--surface);border-radius:6px">
        <span style="font-weight:600;font-size:13px">${acct.name}</span>
        <input type="number" class="alloc-input" id="alloc-${acct.id}" value="${currentMonthAlloc}" min="0" step="0.01" style="font-size:13px;padding:6px">
      </div>`;
  }).join('');

  openModal(
    'Allocate Monthly Savings Budget',
    `<div style="margin-bottom:16px;padding:12px;background:var(--surface);border-radius:8px">
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;font-size:13px">
        <div>
          <div style="color:var(--muted);font-size:11px;text-transform:uppercase;letter-spacing:0.5px">Monthly Savings Budget</div>
          <div style="font-size:18px;font-weight:700;margin-top:4px">${fmt(budget)}</div>
        </div>
        <div>
          <div style="color:var(--muted);font-size:11px;text-transform:uppercase;letter-spacing:0.5px">Currently Allocated</div>
          <div style="font-size:18px;font-weight:700;margin-top:4px" id="alloc-current">—</div>
        </div>
        <div>
          <div style="color:var(--muted);font-size:11px;text-transform:uppercase;letter-spacing:0.5px">Remaining</div>
          <div style="font-size:18px;font-weight:700;margin-top:4px" id="alloc-remaining">—</div>
        </div>
      </div>
    </div>
    <div style="font-size:12px;color:var(--muted);margin-bottom:12px">Allocating for: <strong>${monthName}</strong></div>
    <div style="display:flex;flex-direction:column;gap:12px;margin-bottom:16px">${accountFields}</div>
    <div style="font-size:12px;color:var(--muted);padding:10px;background:var(--surface);border-radius:6px;border-left:3px solid var(--accent2)">
      💡 Adjust amounts per account. Total must not exceed budget. Changes apply to <strong>${monthName}</strong> only.
    </div>`,
    () => {
      let totalAllocated = 0;
      const updates = {};
      accounts.forEach(acct => {
        const value = parseFloat(document.getElementById(`alloc-${acct.id}`).value) || 0;
        totalAllocated += value;
        updates[acct.id] = value;
      });
      if (totalAllocated > budget) {
        alert(`❌ Total allocation ($${totalAllocated.toFixed(2)}) exceeds budget ($${budget.toFixed(2)})`);
        return;
      }
      accounts.forEach(acct => {
        if (!acct.monthlyAllocations) acct.monthlyAllocations = {};
        const newValue = updates[acct.id];
        if (newValue !== acct.defaultAllocated) {
          acct.monthlyAllocations[monthStr] = newValue;
        } else {
          delete acct.monthlyAllocations[monthStr];
        }
      });
      saveToStorage(); renderSavings(); renderBudgetVsActual(); closeModal();
      alert('✓ Allocation updated for ' + monthName);
    }
  );

  // Real-time validation (deferred so modal is in DOM)
  setTimeout(() => {
    const updateValidation = () => {
      let total = 0;
      accounts.forEach(acct => { total += parseFloat(document.getElementById(`alloc-${acct.id}`).value) || 0; });
      const remaining = budget - total;
      document.getElementById('alloc-current').textContent   = fmt(total);
      document.getElementById('alloc-remaining').textContent = fmt(remaining);
      document.getElementById('alloc-remaining').style.color = remaining < 0 ? 'var(--danger)' : 'var(--text)';
    };
    document.querySelectorAll('.alloc-input').forEach(input => input.addEventListener('input', updateValidation));
    updateValidation();
  }, 0);
}

// ────────────────────────────────────────────────────────────────
// SAVINGS GOALS — CRUD
// ────────────────────────────────────────────────────────────────
function openAddGoal() {
  const accounts = state.savingsAccounts || [];
  if (!accounts.length) { alert('Please add a savings account first'); return; }

  const dropdown = '<select id="goal-account-id" required><option value="">Select Account</option>' +
    accounts.map(a => `<option value="${a.id}">${a.name}</option>`).join('') + '</select>';

  openModal(
    'Add Savings Goal',
    dropdown +
    mField('Target Amount ($)',   'goal-target-amount', 'number', '', '0.00', 'min="0" step="0.01" required') +
    mField('Target Date (YYYY-MM)', 'goal-target-date', 'month',  '', ''),
    () => {
      const accountId    = document.getElementById('goal-account-id').value;
      const targetAmount = parseFloat(document.getElementById('goal-target-amount').value);
      const targetDate   = document.getElementById('goal-target-date').value;
      if (!accountId || isNaN(targetAmount) || !targetDate) { alert('Please fill in all fields'); return; }
      state.goals.push({ id: genId(), accountId, targetAmount, targetDate });
      saveToStorage(); renderGoals(); closeModal();
    }
  );
}

function openEditGoal(id) {
  const goal     = (state.goals || []).find(g => g.id === id);
  if (!goal) return;
  const accounts = state.savingsAccounts || [];

  const dropdown = '<select id="goal-account-id" required><option value="">Select Account</option>' +
    accounts.map(a => `<option value="${a.id}" ${a.id === goal.accountId ? 'selected' : ''}>${a.name}</option>`).join('') + '</select>';

  openModal(
    'Edit Savings Goal',
    dropdown +
    mField('Target Amount ($)',   'goal-target-amount', 'number', goal.targetAmount, '0.00', 'min="0" step="0.01"') +
    mField('Target Date (YYYY-MM)', 'goal-target-date', 'month',  goal.targetDate,   ''),
    () => {
      const accountId    = document.getElementById('goal-account-id').value;
      const targetAmount = parseFloat(document.getElementById('goal-target-amount').value);
      const targetDate   = document.getElementById('goal-target-date').value;
      if (!accountId || isNaN(targetAmount) || !targetDate) { alert('Please fill in all fields'); return; }
      Object.assign(goal, { accountId, targetAmount, targetDate });
      saveToStorage(); renderGoals(); closeModal();
    }
  );
}

function deleteGoal(id) {
  if (!confirm('Delete this savings goal?')) return;
  state.goals = (state.goals || []).filter(g => g.id !== id);
  saveToStorage(); renderGoals();
}

// ────────────────────────────────────────────────────────────────
// SUBSCRIPTIONS — CRUD
// ────────────────────────────────────────────────────────────────
const SUB_CATEGORIES = ['Entertainment', 'Utilities', 'Health', 'Productivity', 'Other'];

function _subModalBody(sub) {
  const catOpts  = SUB_CATEGORIES.map(c =>
    `<option value="${c}" ${c === (sub?.category || 'Other') ? 'selected' : ''}>${c}</option>`
  ).join('');
  const freqOpts = [
    ['monthly',   'Monthly'],
    ['quarterly', 'Quarterly'],
    ['annual',    'Annual'],
  ].map(([v, l]) =>
    `<option value="${v}" ${v === (sub?.frequency || 'monthly') ? 'selected' : ''}>${l}</option>`
  ).join('');

  return (
    mField('Service Name', 'ms-name',   'text',   sub?.name        ?? '',     'e.g. Spotify, Netflix') +
    mField('Cost ($)',     'ms-amount', 'number', sub?.amount      ?? '',     '0.00', 'min="0" step="0.01"') +
    `<div class="modal-row">
      <div class="modal-field">
        <label>Frequency</label>
        <select id="ms-frequency">${freqOpts}</select>
      </div>
      <div class="modal-field">
        <label>Budget Type</label>
        <select id="ms-budgettype">
          <option value="wants" ${(sub?.budgetType ?? 'wants') === 'wants' ? 'selected' : ''}>Wants</option>
          <option value="needs" ${sub?.budgetType === 'needs' ? 'selected' : ''}>Needs</option>
        </select>
      </div>
    </div>
    <div class="modal-row">
      <div class="modal-field">
        <label>Category</label>
        <select id="ms-category">${catOpts}</select>
      </div>
      <div class="modal-field">
        <label>Next Renewal Date</label>
        <input type="date" id="ms-date" value="${sub?.date ?? ''}" />
      </div>
    </div>`
  );
}

function _readSubModal() {
  return {
    name:       document.getElementById('ms-name').value.trim(),
    amount:     parseFloat(document.getElementById('ms-amount').value) || 0,
    frequency:  document.getElementById('ms-frequency').value,
    budgetType: document.getElementById('ms-budgettype').value,
    category:   document.getElementById('ms-category').value,
    date:       document.getElementById('ms-date').value,
  };
}

function openAddSubscription() {
  openModal('Add Subscription', _subModalBody(null), () => {
    const { name, amount, frequency, budgetType, category, date } = _readSubModal();
    if (!name || !date) { alert('Please enter a name and renewal date.'); return; }
    state.subscriptions.push({ id: genId(), name, amount, frequency, date, category, budgetType });
    saveToStorage(); renderSubscriptions(); renderWants(); renderExpenseCards(); _scheduleIfActive(); closeModal();
  });
}

function openEditSubscription(id) {
  const sub = (state.subscriptions || []).find(s => s.id === id);
  if (!sub) return;
  openModal('Edit Subscription', _subModalBody(sub), () => {
    const { name, amount, frequency, budgetType, category, date } = _readSubModal();
    if (!name || !date) return;
    Object.assign(sub, { name, amount, frequency, date, category, budgetType });
    saveToStorage(); renderSubscriptions(); renderWants(); renderExpenseCards(); _scheduleIfActive(); closeModal();
  });
}

function deleteSubscription(id) {
  if (!confirm('Remove this subscription?')) return;
  state.subscriptions = state.subscriptions.filter(s => s.id !== id);
  saveToStorage(); renderSubscriptions(); renderWants(); renderExpenseCards(); _scheduleIfActive();
}

// ────────────────────────────────────────────────────────────────
// PAYDAY ANCHOR
// ────────────────────────────────────────────────────────────────
function openSetPayStart() {
  openModal(
    'Set Payday Anchor',
    `<div style="font-size:13px;color:var(--muted);margin-bottom:16px;line-height:1.6">
       Choose the date of your most recent paycheque. All bi-weekly periods are
       calculated automatically from this anchor — no manual resets needed.
     </div>` +
    mField('Most Recent Payday', 'pay-start-date', 'date', state.payStart || '', '') +
    `<div style="font-size:12px;color:var(--muted);margin-top:12px;padding:10px;background:var(--surface);border-radius:6px;border-left:3px solid var(--accent2)">
       💡 Example: if you last got paid May 7, pick May 7. Your next period starts May 21, then June 4, etc.
     </div>`,
    () => {
      const date = document.getElementById('pay-start-date').value;
      if (!date) { alert('Please select a date.'); return; }
      state.payStart = date;
      saveToStorage(); renderWants(); renderSubscriptions(); renderExpenseCards(); _scheduleIfActive(); closeModal();
    }
  );
}

// ────────────────────────────────────────────────────────────────
// TRANSACTION RULES — CRUD
// ────────────────────────────────────────────────────────────────
function _ruleCatOpts(selected) {
  return WANT_CATEGORIES
    .map(c => `<option value="${c}" ${c === selected ? 'selected' : ''}>${c}</option>`)
    .join('');
}

function _ruleModalBody(rule) {
  const matchOpts = [
    ['contains',   'Contains (default)'],
    ['startsWith', 'Starts With'],
    ['exact',      'Exact Match'],
  ].map(([v, l]) => `<option value="${v}" ${v === (rule?.matchType || 'contains') ? 'selected' : ''}>${l}</option>`).join('');

  return (
    mField('Keyword / Pattern', 'rule-pattern', 'text', rule?.pattern ?? '', 'e.g. tim hortons, netflix') +
    `<div class="modal-row">
      <div class="modal-field">
        <label>Match Type</label>
        <select id="rule-matchtype">${matchOpts}</select>
      </div>
      <div class="modal-field">
        <label>Category</label>
        <select id="rule-category">${_ruleCatOpts(rule?.category ?? 'Other')}</select>
      </div>
    </div>`
  );
}

function _readRuleModal() {
  return {
    pattern:   document.getElementById('rule-pattern').value.trim().toLowerCase(),
    matchType: document.getElementById('rule-matchtype').value,
    category:  document.getElementById('rule-category').value,
  };
}

function openAddRule() {
  openModal('Add Spending Rule', _ruleModalBody(null), () => {
    const { pattern, matchType, category } = _readRuleModal();
    if (!pattern) { alert('Please enter a keyword or pattern.'); return; }
    if (!state.rules) state.rules = [];
    state.rules.push({ id: genId(), pattern, matchType, category });
    saveToStorage(); renderRules(); closeModal();
    // Offer retroactive apply to current period
    if ((state.purchases || []).length > 0) {
      const changed = reapplyRulesToPurchases();
      // reapplyRulesToPurchases already re-renders if anything changed
    }
  });
}

function openEditRule(id) {
  const rule = (state.rules || []).find(r => r.id === id);
  if (!rule) return;
  openModal('Edit Rule', _ruleModalBody(rule), () => {
    const { pattern, matchType, category } = _readRuleModal();
    if (!pattern) return;
    Object.assign(rule, { pattern, matchType, category });
    saveToStorage(); renderRules(); closeModal();
    reapplyRulesToPurchases();
  });
}

function deleteRule(id) {
  if (!confirm('Delete this rule?')) return;
  state.rules = (state.rules || []).filter(r => r.id !== id);
  saveToStorage(); renderRules();
}

// ────────────────────────────────────────────────────────────────
// BUDGET ALERTS — CRUD
// ────────────────────────────────────────────────────────────────
function openAddAlert() {
  openModal(
    'Add Budget Alert',
    `<div class="modal-field">
      <label>Category</label>
      <select id="alert-category">${_ruleCatOpts('Food & Drink')}</select>
    </div>` +
    mField('Threshold ($)', 'alert-threshold', 'number', '', '0.00', 'min="0.01" step="0.01"') +
    `<div style="font-size:12px;color:var(--muted);margin-top:12px;padding:10px;background:var(--surface);border-radius:6px;border-left:3px solid var(--warn)">
      ⚠ A warning chip appears in the Wants card when spending in this category exceeds the threshold during the current bi-weekly period.
    </div>`,
    () => {
      const category  = document.getElementById('alert-category').value;
      const threshold = parseFloat(document.getElementById('alert-threshold').value);
      if (isNaN(threshold) || threshold <= 0) { alert('Please enter a valid threshold amount.'); return; }
      if (!state.budgetAlerts) state.budgetAlerts = [];
      if (state.budgetAlerts.some(a => a.category === category)) {
        alert(`An alert for "${category}" already exists. Edit the existing one instead.`);
        return;
      }
      state.budgetAlerts.push({ id: genId(), category, threshold });
      saveToStorage(); renderBudgetAlerts(); renderWants(); closeModal();
    }
  );
}

function openEditAlert(id) {
  const alertItem = (state.budgetAlerts || []).find(a => a.id === id);
  if (!alertItem) return;
  openModal(
    'Edit Budget Alert',
    `<div class="modal-field">
      <label>Category</label>
      <select id="alert-category">${_ruleCatOpts(alertItem.category)}</select>
    </div>` +
    mField('Threshold ($)', 'alert-threshold', 'number', alertItem.threshold, '0.00', 'min="0.01" step="0.01"'),
    () => {
      const category  = document.getElementById('alert-category').value;
      const threshold = parseFloat(document.getElementById('alert-threshold').value);
      if (isNaN(threshold) || threshold <= 0) return;
      // Check for duplicate (allow same category if it's the same alert being edited)
      const duplicate = (state.budgetAlerts || []).find(a => a.category === category && a.id !== id);
      if (duplicate) { alert(`An alert for "${category}" already exists.`); return; }
      Object.assign(alertItem, { category, threshold });
      saveToStorage(); renderBudgetAlerts(); renderWants(); closeModal();
    }
  );
}

function deleteAlert(id) {
  if (!confirm('Delete this alert?')) return;
  state.budgetAlerts = (state.budgetAlerts || []).filter(a => a.id !== id);
  saveToStorage(); renderBudgetAlerts(); renderWants();
}

// ────────────────────────────────────────────────────────────────
// WISHLIST — CRUD
// ────────────────────────────────────────────────────────────────
function addWishlistItem() {
  const icon = document.getElementById('new-wish-icon').value.trim() || '🛒';
  const name = document.getElementById('new-wish-name').value.trim();
  const url  = document.getElementById('new-wish-url').value.trim();
  if (!name) return;
  state.wishlist.push({ id: genId(), icon, name, url });
  document.getElementById('new-wish-icon').value = '';
  document.getElementById('new-wish-name').value = '';
  document.getElementById('new-wish-url').value  = '';
  saveToStorage(); renderWishlist();
}

function openEditWishlistItem(id) {
  const item = (state.wishlist || []).find(w => w.id === id);
  if (!item) return;
  openModal(
    'Edit Wishlist Item',
    mField('Icon / Emoji',   'mw-icon', 'text', item.icon || '', '🛒') +
    mField('Item Name',      'mw-name', 'text', item.name, '') +
    mField('URL (optional)', 'mw-url',  'text', item.url  || '', 'https://...'),
    () => {
      const icon = document.getElementById('mw-icon').value.trim() || '🛒';
      const name = document.getElementById('mw-name').value.trim();
      const url  = document.getElementById('mw-url').value.trim();
      if (!name) return;
      Object.assign(item, { icon, name, url });
      saveToStorage(); renderWishlist(); closeModal();
    }
  );
}

function deleteWishlistItem(id) {
  if (!confirm('Remove this item from the wishlist?')) return;
  state.wishlist = state.wishlist.filter(w => w.id !== id);
  saveToStorage(); renderWishlist();
}

// ────────────────────────────────────────────────────────────────
// NET WORTH — CRUD (manual assets)
// ────────────────────────────────────────────────────────────────
function openAddAsset(category) {
  const cat = ASSET_CATEGORIES.find(c => c.key === category);
  const placeholders = { investment: 'RRSP', vehicle: '2022 Honda Civic', real_estate: 'Primary Residence', other: 'Collectibles' };
  openModal(
    `Add ${cat.icon} ${cat.label.slice(0, -1)}`,
    mField('Name', 'asset-name', 'text', '', `e.g. ${placeholders[category] || ''}`) +
    mField('Current Value ($)', 'asset-value', 'number', '', '0', 'min="0" step="0.01"'),
    () => {
      const name  = document.getElementById('asset-name').value.trim();
      const value = parseFloat(document.getElementById('asset-value').value) || 0;
      if (!name) { alert('Please enter a name.'); return; }
      state.assets.push({ id: genId(), name, category, value });
      saveToStorage(); renderNetWorth(); closeModal();
    }
  );
}

function openEditAsset(id) {
  const asset = (state.assets || []).find(a => a.id === id);
  if (!asset) return;
  const cat = ASSET_CATEGORIES.find(c => c.key === asset.category);
  openModal(
    `Edit ${cat?.icon ?? ''} ${asset.name}`,
    mField('Name', 'asset-name', 'text', asset.name, '') +
    mField('Current Value ($)', 'asset-value', 'number', asset.value, '0', 'min="0" step="0.01"'),
    () => {
      const name  = document.getElementById('asset-name').value.trim();
      const value = parseFloat(document.getElementById('asset-value').value) || 0;
      if (!name) { alert('Please enter a name.'); return; }
      Object.assign(asset, { name, value });
      saveToStorage(); renderNetWorth(); closeModal();
    }
  );
}

function deleteAsset(id) {
  if (!confirm('Remove this asset?')) return;
  state.assets = state.assets.filter(a => a.id !== id);
  saveToStorage(); renderNetWorth();
}

// ────────────────────────────────────────────────────────────────
// CSV EXPORT / IMPORT
// ────────────────────────────────────────────────────────────────

/** Export the entire state as a structured multi-section CSV file. */
function exportCsv() {
  const rows  = [];
  const e     = csvEscape;
  const today = new Date().toISOString().split('T')[0];

  rows.push('SECTION:meta', 'key,value', `exported,${today}`, `payStart,${state.payStart || ''}`, '');
  rows.push('SECTION:allocation', 'needs,wants,savings',
    `${state.allocation.needs},${state.allocation.wants},${state.allocation.savings}`, '');
  rows.push('SECTION:budgetDisplayMode', 'needs,wants,savings',
    `${state.budgetDisplayMode.needs || 'monthly'},${state.budgetDisplayMode.wants || 'monthly'},${state.budgetDisplayMode.savings || 'monthly'}`, '');

  rows.push('SECTION:incomeStreams', 'id,name,amount,biweekly');
  (state.incomeStreams || []).forEach(s => rows.push(`${e(s.id)},${e(s.name)},${s.amount},${s.biweekly}`));
  rows.push('');

  rows.push('SECTION:expenseCards', 'cardId,cardLabel,itemId,itemName,itemAmount,itemBiweekly,itemDueDay');
  (state.expenseCards || []).forEach(card => {
    if (!(card.items || []).length) {
      rows.push(`${e(card.id)},${e(card.label)},,,,, `);
    } else {
      card.items.forEach(item =>
        rows.push(`${e(card.id)},${e(card.label)},${e(item.id)},${e(item.name)},${item.amount},${item.biweekly},${item.dueDay ?? ''}`)
      );
    }
  });
  rows.push('');

  rows.push('SECTION:purchases', 'id,name,amount,category');
  (state.purchases || []).forEach(p => rows.push(`${e(p.id)},${e(p.name)},${p.amount},${e(p.category || 'Other')}`));
  rows.push('');

  rows.push('SECTION:spendingHistory', 'periodId,periodDate,periodLabel,periodTotal,purchaseId,purchaseName,purchaseAmount,purchaseCategory');
  (state.spendingHistory || []).forEach(period => {
    if (!(period.items || []).length) {
      rows.push(`${e(period.id)},${e(period.date)},${e(period.label)},${period.total},,,,`);
    } else {
      period.items.forEach(p =>
        rows.push(`${e(period.id)},${e(period.date)},${e(period.label)},${period.total},${e(p.id)},${e(p.name)},${p.amount},${e(p.category || 'Other')}`)
      );
    }
  });
  rows.push('');

  rows.push('SECTION:loans', 'id,name,remaining,original');
  (state.loans || []).forEach(l => rows.push(`${e(l.id)},${e(l.name)},${l.remaining},${l.original}`));
  rows.push('');

  rows.push('SECTION:creditCards', 'id,name,balance,limit');
  (state.creditCards || []).forEach(c => rows.push(`${e(c.id)},${e(c.name)},${c.balance},${c.limit}`));
  rows.push('');

  rows.push('SECTION:subscriptions', 'id,name,amount,frequency,date,category,budgetType');
  (state.subscriptions || []).forEach(s =>
    rows.push(`${e(s.id)},${e(s.name)},${s.amount ?? 0},${e(s.frequency || 'monthly')},${e(s.date)},${e(s.category || 'Other')},${e(s.budgetType || 'wants')}`)
  );
  rows.push('');

  rows.push('SECTION:wishlist', 'id,icon,name,url');
  (state.wishlist || []).forEach(w => rows.push(`${e(w.id)},${e(w.icon || '')},${e(w.name)},${e(w.url || '')}`));
  rows.push('');

  rows.push('SECTION:savingsAccounts', 'id,name,balance,defaultAllocated,monthlyAllocations');
  (state.savingsAccounts || []).forEach(a =>
    rows.push(`${e(a.id)},${e(a.name)},${a.balance || 0},${a.defaultAllocated || 0},${e(JSON.stringify(a.monthlyAllocations || {}))}`)
  );
  rows.push('');

  rows.push('SECTION:goals', 'id,accountId,targetAmount,targetDate');
  (state.goals || []).forEach(g => rows.push(`${e(g.id)},${e(g.accountId)},${g.targetAmount},${g.targetDate}`));
  rows.push('');

  rows.push('SECTION:assets', 'id,name,category,value');
  (state.assets || []).forEach(a => rows.push(`${e(a.id)},${e(a.name)},${e(a.category)},${a.value}`));
  rows.push('');

  rows.push('SECTION:netWorthHistory', 'id,date,netWorth,totalAssets,totalLiabilities');
  (state.netWorthHistory || []).forEach(h =>
    rows.push(`${e(h.id)},${h.date},${h.netWorth},${h.totalAssets},${h.totalLiabilities}`)
  );
  rows.push('');

  rows.push('SECTION:rules', 'id,pattern,matchType,category');
  (state.rules || []).forEach(r => rows.push(`${e(r.id)},${e(r.pattern)},${e(r.matchType)},${e(r.category)}`));
  rows.push('');

  rows.push('SECTION:budgetAlerts', 'id,category,threshold');
  (state.budgetAlerts || []).forEach(a => rows.push(`${e(a.id)},${e(a.category)},${a.threshold}`));
  rows.push('');

  const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const link = Object.assign(document.createElement('a'), { href: url, download: `penny-export-${today}.csv` });
  link.click();
  URL.revokeObjectURL(url);
}

/** Read a CSV file and restore state from it. */
function importCsv(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const newState = parseCsv(e.target.result);
      if (!confirm('Import this CSV? This will replace all current data.')) { event.target.value = ''; return; }
      state = newState;
      saveToStorage(); renderAll(); switchTab('dashboard');
    } catch (err) {
      alert('Failed to import CSV: ' + err.message);
    } finally {
      event.target.value = '';
    }
  };
  reader.readAsText(file);
}

/** Clear all data and reset to blank defaults. */
function clearAllData() {
  if (!confirm('⚠️  WARNING: This will delete ALL your data and reset to a blank dashboard.\n\nThis action cannot be undone. Are you sure you want to continue?')) return;
  if (!confirm('This will permanently delete all your data.\n\nClick OK and type "CLEAR" in the prompt below to confirm.')) return;
  if (prompt('Type CLEAR to confirm deletion of all data:') !== 'CLEAR') {
    alert('Clear cancelled. Your data is safe.');
    return;
  }
  state = deepClone(DEFAULT_STATE);
  saveToStorage(); renderAll();
  alert('✓ All data has been cleared. Starting fresh!');
}

/** Parse a multi-section CSV string into a valid state object. */
function parseCsv(text) {
  const parsed = {};
  let currentSection = null;
  let headers        = null;

  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim();
    if (!line) continue;
    if (line.startsWith('SECTION:')) { currentSection = line.slice(8); headers = null; continue; }
    if (!headers) { headers = parseCSVRow(line); continue; }

    const vals = parseCSVRow(line);
    switch (currentSection) {
      case 'meta':
        // Persist payStart stored in meta section
        if (vals[0] === 'payStart' && vals[1]) parsed.payStart = vals[1] || null;
        break;

      case 'allocation':
        parsed.allocation = { needs: +vals[0] || 50, wants: +vals[1] || 30, savings: +vals[2] || 20 };
        break;

      case 'budgetDisplayMode':
        parsed.budgetDisplayMode = { needs: vals[0] || 'monthly', wants: vals[1] || 'monthly', savings: vals[2] || 'monthly' };
        break;

      case 'incomeStreams':
        if (!parsed.incomeStreams) parsed.incomeStreams = [];
        parsed.incomeStreams.push({ id: vals[0], name: vals[1], amount: +vals[2], biweekly: vals[3] === 'true' });
        break;

      case 'expenseCards': {
        if (!parsed.expenseCards) parsed.expenseCards = [];
        const [cardId, cardLabel, itemId, itemName, itemAmount, itemBiweekly, itemDueDay] = vals;
        let card = parsed.expenseCards.find(c => c.id === cardId);
        if (!card) { card = { id: cardId, label: cardLabel, items: [] }; parsed.expenseCards.push(card); }
        if (itemId && itemName) {
          const dueDayParsed = parseInt(itemDueDay, 10);
          const dueDay = (!isNaN(dueDayParsed) && dueDayParsed >= 1 && dueDayParsed <= 31) ? dueDayParsed : null;
          card.items.push({ id: itemId, name: itemName, amount: +itemAmount, biweekly: itemBiweekly === 'true', dueDay });
        }
        break;
      }

      case 'purchases':
        if (!parsed.purchases) parsed.purchases = [];
        parsed.purchases.push({ id: vals[0], name: vals[1], amount: +vals[2], category: vals[3] || 'Other' });
        break;

      case 'spendingHistory': {
        if (!parsed.spendingHistory) parsed.spendingHistory = [];
        const [pId, pDate, pLabel, pTotal, purchId, purchName, purchAmt, purchCat] = vals;
        let period = parsed.spendingHistory.find(p => p.id === pId);
        if (!period) { period = { id: pId, date: pDate, label: pLabel, total: +pTotal, items: [] }; parsed.spendingHistory.push(period); }
        if (purchId && purchName) period.items.push({ id: purchId, name: purchName, amount: +purchAmt, category: purchCat || 'Other' });
        break;
      }

      case 'loans':
        if (!parsed.loans) parsed.loans = [];
        parsed.loans.push({ id: vals[0], name: vals[1], remaining: +vals[2], original: +vals[3] });
        break;

      case 'creditCards':
        if (!parsed.creditCards) parsed.creditCards = [];
        parsed.creditCards.push({ id: vals[0], name: vals[1], balance: +vals[2], limit: +vals[3] });
        break;

      case 'subscriptions':
        if (!parsed.subscriptions) parsed.subscriptions = [];
        if (vals.length >= 7) {
          // New format: id,name,amount,frequency,date,category,budgetType
          parsed.subscriptions.push({
            id: vals[0], name: vals[1], amount: +vals[2] || 0,
            frequency: vals[3] || 'monthly', date: vals[4],
            category: vals[5] || 'Other', budgetType: vals[6] || 'wants',
          });
        } else {
          // Old format fallback: id,name,date
          parsed.subscriptions.push({
            id: vals[0], name: vals[1], amount: 0,
            frequency: 'monthly', date: vals[2],
            category: 'Other', budgetType: 'wants',
          });
        }
        break;

      case 'wishlist':
        if (!parsed.wishlist) parsed.wishlist = [];
        parsed.wishlist.push({ id: vals[0], icon: vals[1], name: vals[2], url: vals[3] || '' });
        break;

      case 'savingsAccounts':
        if (!parsed.savingsAccounts) parsed.savingsAccounts = [];
        if (vals.length >= 5) {
          parsed.savingsAccounts.push({ id: vals[0], name: vals[1], balance: +vals[2], defaultAllocated: +vals[3], monthlyAllocations: vals[4] ? JSON.parse(vals[4]) : {} });
        } else {
          parsed.savingsAccounts.push({ id: vals[0], name: vals[1], balance: 0, defaultAllocated: +vals[2], monthlyAllocations: {} });
        }
        break;

      case 'goals':
        if (!parsed.goals) parsed.goals = [];
        parsed.goals.push({ id: vals[0], accountId: vals[1], targetAmount: +vals[2], targetDate: vals[3] });
        break;

      case 'assets':
        if (!parsed.assets) parsed.assets = [];
        parsed.assets.push({ id: vals[0], name: vals[1], category: vals[2], value: +vals[3] });
        break;

      case 'netWorthHistory':
        if (!parsed.netWorthHistory) parsed.netWorthHistory = [];
        parsed.netWorthHistory.push({ id: vals[0], date: vals[1], netWorth: +vals[2], totalAssets: +vals[3], totalLiabilities: +vals[4] });
        break;

      case 'rules':
        if (!parsed.rules) parsed.rules = [];
        parsed.rules.push({ id: vals[0], pattern: vals[1], matchType: vals[2], category: vals[3] });
        break;

      case 'budgetAlerts':
        if (!parsed.budgetAlerts) parsed.budgetAlerts = [];
        parsed.budgetAlerts.push({ id: vals[0], category: vals[1], threshold: +vals[2] });
        break;
    }
  }

  if (!parsed.allocation)        parsed.allocation        = { needs: 50, wants: 30, savings: 20 };
  if (!parsed.budgetDisplayMode) parsed.budgetDisplayMode = { needs: 'monthly', wants: 'monthly', savings: 'monthly' };
  if (!parsed.incomeStreams)     parsed.incomeStreams      = [];
  if (!parsed.expenseCards)      parsed.expenseCards       = [];
  if (!parsed.purchases)         parsed.purchases          = [];
  if (!parsed.spendingHistory)   parsed.spendingHistory    = [];
  if (!parsed.loans)             parsed.loans              = [];
  if (!parsed.creditCards)       parsed.creditCards        = [];
  if (!parsed.subscriptions)     parsed.subscriptions      = [];
  if (!parsed.wishlist)          parsed.wishlist           = [];
  if (!parsed.savingsAccounts)   parsed.savingsAccounts    = [];
  if (!parsed.goals)             parsed.goals              = [];
  if (!parsed.assets)            parsed.assets             = [];
  if (!parsed.netWorthHistory)   parsed.netWorthHistory    = [];
  if (parsed.payStart === undefined) parsed.payStart       = null;
  if (!parsed.rules)             parsed.rules              = [];
  if (!parsed.budgetAlerts)      parsed.budgetAlerts       = [];

  return parsed;
}

// ────────────────────────────────────────────────────────────────
// KEYBOARD SHORTCUTS
// ────────────────────────────────────────────────────────────────
document.getElementById('purchase-name').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('purchase-amount').focus();
});
document.getElementById('purchase-amount').addEventListener('keydown', e => {
  if (e.key === 'Enter') addPurchase();
});

// Live category preview — shows matched rule as user types the purchase name
document.getElementById('purchase-name').addEventListener('input', function () {
  const matched = applyRulesToName(this.value);
  const preview = document.getElementById('purchase-cat-preview');
  if (!preview) return;
  if (matched && this.value.trim()) {
    const colour = CATEGORY_COLOURS[matched] || '#8b95ad';
    preview.innerHTML = `<span style="color:${colour};font-size:11px;font-weight:700;padding:2px 0">→ ${matched}</span>`;
  } else {
    preview.innerHTML = '';
  }
});

// ────────────────────────────────────────────────────────────────
// INIT
// ────────────────────────────────────────────────────────────────
initTheme();
loadFromStorage();
renderDate();
renderAll();
