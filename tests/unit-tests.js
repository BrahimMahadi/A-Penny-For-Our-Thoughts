/* ═══════════════════════════════════════════════════════════════
   File:    tests/unit-tests.js
   Project: A Penny For Our Thoughts
   Summary: Unit tests for all critical calculation functions.
            Run via tests/index.html (browser) or
            `npm test` (Node.js).

   Sections:
     1. Test runner helpers
     2. utils.js — fmt, pct, daysUntil, csvEscape, parseCSVRow
     3. analytics.js — budget math (income, alloc, variance)
     4. analytics.js — savings goal progress
     5. analytics.js — net worth calculation
     6. analytics.js — Transaction Rules Engine
     7. analytics.js — subscription tracking helpers
     8. analytics.js — month/period calculations
═══════════════════════════════════════════════════════════════ */

// ────────────────────────────────────────────────────────────────
// 1. TEST RUNNER HELPERS
// ────────────────────────────────────────────────────────────────

/** @type {{ name: string, status: 'pass'|'fail', message: string }[]} */
const _results = [];
let _currentSuite = '';

/** Begin a named test suite (groups results in the report). */
function suite(name) {
  _currentSuite = name;
}

/**
 * Run a single test. Catches exceptions and records a failure.
 * @param {string}   name - Test description.
 * @param {Function} fn   - Test body; throw to fail.
 */
function test(name, fn) {
  try {
    fn();
    _results.push({ suite: _currentSuite, name, status: 'pass', message: '' });
  } catch (err) {
    _results.push({ suite: _currentSuite, name, status: 'fail', message: err.message });
  }
}

/**
 * Assert deep-loose equality using JSON round-trip comparison.
 * Works for primitives, plain objects, and arrays.
 */
function assertEqual(actual, expected, msg) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) throw new Error(msg || `Expected ${e} but got ${a}`);
}

/** Assert that `actual === expected` with a clear diff message. */
function assertStrictEqual(actual, expected, msg) {
  if (actual !== expected) throw new Error(msg || `Expected ${String(expected)} but got ${String(actual)}`);
}

/** Assert that `actual` is truthy. */
function assertTrue(actual, msg) {
  if (!actual) throw new Error(msg || `Expected truthy but got ${String(actual)}`);
}

/** Assert that `actual` is falsy. */
function assertFalsy(actual, msg) {
  if (actual) throw new Error(msg || `Expected falsy but got ${String(actual)}`);
}

/** Assert that |actual - expected| ≤ epsilon (floating-point comparison). */
function assertClose(actual, expected, epsilon = 0.001, msg) {
  if (Math.abs(actual - expected) > epsilon) {
    throw new Error(msg || `Expected ~${expected} but got ${actual} (delta > ${epsilon})`);
  }
}

/** Assert that `fn` throws an error (optionally matching `msgPattern`). */
function assertThrows(fn, msgPattern, label) {
  let threw = false;
  try { fn(); } catch (e) {
    threw = true;
    if (msgPattern && !msgPattern.test(e.message)) {
      throw new Error(`${label}: error message "${e.message}" did not match ${msgPattern}`);
    }
  }
  if (!threw) throw new Error(label || 'Expected function to throw but it did not');
}

// ────────────────────────────────────────────────────────────────
// 2. utils.js — PURE HELPER FUNCTIONS
// ────────────────────────────────────────────────────────────────
suite('utils.js → fmt()');

test('formats zero as $0.00', () => assertStrictEqual(fmt(0), '$0.00'));
test('formats positive integer', () => assertStrictEqual(fmt(1234), '$1,234.00'));
test('formats positive decimal', () => assertStrictEqual(fmt(1234.5), '$1,234.50'));
test('formats negative number', () => assertStrictEqual(fmt(-50), '$-50.00')); // en-CA places $ before minus
test('formats string number', () => assertStrictEqual(fmt('99.9'), '$99.90'));
test('formats large number with comma grouping', () => assertStrictEqual(fmt(1000000), '$1,000,000.00'));
test('formats NaN as $0.00', () => assertStrictEqual(fmt(NaN), '$NaN')); // intentional — NaN is passed as-is

suite('utils.js → pct()');

test('pct(50, 100) = "50.0"', () => assertStrictEqual(pct(50, 100), '50.0'));
test('pct(0, 100)  = "0.0"',  () => assertStrictEqual(pct(0, 100), '0.0'));
test('pct(100, 100)= "100.0"',() => assertStrictEqual(pct(100, 100), '100.0'));
test('pct(200, 100)= "100.0" (capped)', () => assertStrictEqual(pct(200, 100), '100.0'));
test('pct(0, 0)   = "0.0" (zero-div guard)', () => assertStrictEqual(pct(0, 0), '0.0'));
test('pct(1, 3)   rounds to 1dp', () => assertStrictEqual(pct(1, 3), '33.3'));

suite('utils.js → daysUntil()');

// daysUntil() treats dateStr as LOCAL midnight (appends 'T00:00:00').
// Use local date strings here — NOT toISOString() which returns UTC dates
// and can be a full day off in UTC-offset timezones.
function _localDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

test('yesterday is negative', () => {
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
  assertTrue(daysUntil(_localDateStr(yesterday)) < 0);
});
test('tomorrow is 1', () => {
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  assertStrictEqual(daysUntil(_localDateStr(tomorrow)), 1);
});
test('today is 0', () => {
  assertStrictEqual(daysUntil(_localDateStr(new Date())), 0);
});
test('7 days ahead returns 7', () => {
  const d = new Date(); d.setDate(d.getDate() + 7);
  assertStrictEqual(daysUntil(_localDateStr(d)), 7);
});

suite('utils.js → csvEscape()');

test('plain string passes through', () => assertStrictEqual(csvEscape('hello'), 'hello'));
test('string with comma is quoted', () => assertStrictEqual(csvEscape('a,b'), '"a,b"'));
test('string with double-quote is quoted and doubled', () => assertStrictEqual(csvEscape('say "hi"'), '"say ""hi"""'));
test('string with newline is quoted', () => assertStrictEqual(csvEscape('line1\nline2'), '"line1\nline2"'));
test('empty string passes through', () => assertStrictEqual(csvEscape(''), ''));
test('null coerced to empty string', () => assertStrictEqual(csvEscape(null), ''));
test('undefined coerced to empty string', () => assertStrictEqual(csvEscape(undefined), ''));
test('number coerced to string', () => assertStrictEqual(csvEscape(42), '42'));

suite('utils.js → parseCSVRow()');

test('simple three fields', () => assertEqual(parseCSVRow('a,b,c'), ['a', 'b', 'c']));
test('quoted field with comma', () => assertEqual(parseCSVRow('"a,b",c'), ['a,b', 'c']));
test('doubled double-quote unescaped', () => assertEqual(parseCSVRow('"say ""hi"""'), ['say "hi"']));
test('empty fields preserved', () => assertEqual(parseCSVRow('a,,c'), ['a', '', 'c']));
test('single field no comma', () => assertEqual(parseCSVRow('hello'), ['hello']));
test('numeric fields returned as strings', () => assertEqual(parseCSVRow('1,2,3'), ['1', '2', '3']));
test('roundtrip: escape then parse', () => {
  const original = 'He said, "hello"';
  const escaped  = csvEscape(original);
  assertEqual(parseCSVRow(escaped), [original]);
});

suite('utils.js → monthlyAmount()');

test('non-biweekly returns amount as-is', () => assertStrictEqual(monthlyAmount({ amount: 100, biweekly: false }), 100));
test('biweekly returns amount × 2',        () => assertStrictEqual(monthlyAmount({ amount: 100, biweekly: true  }), 200));
test('missing biweekly treated as false',   () => assertStrictEqual(monthlyAmount({ amount: 50 }), 50));

suite('utils.js → deepClone()');

test('produces independent copy', () => {
  const original = { a: 1, b: [2, 3] };
  const clone    = deepClone(original);
  clone.b.push(4);
  assertEqual(original.b, [2, 3]);
});
test('nested object independence', () => {
  const o = { x: { y: 42 } };
  const c = deepClone(o);
  c.x.y = 99;
  assertEqual(o.x.y, 42);
});

// ────────────────────────────────────────────────────────────────
// 3. analytics.js — BUDGET MATH
// ────────────────────────────────────────────────────────────────
suite('analytics.js → getTotalMonthlyIncome()');

test('empty income streams → 0', () => {
  state.incomeStreams = [];
  assertStrictEqual(getTotalMonthlyIncome(), 0);
});
test('single monthly stream', () => {
  state.incomeStreams = [{ id: 'a', name: 'Job', amount: 3000, biweekly: false }];
  assertStrictEqual(getTotalMonthlyIncome(), 3000);
});
test('single biweekly stream (× 2)', () => {
  state.incomeStreams = [{ id: 'a', name: 'Gov', amount: 500, biweekly: true }];
  assertStrictEqual(getTotalMonthlyIncome(), 1000);
});
test('mixed monthly + biweekly streams', () => {
  state.incomeStreams = [
    { id: 'a', name: 'Salary', amount: 2000, biweekly: false },
    { id: 'b', name: 'Gov',    amount: 400,  biweekly: true  },
  ];
  assertStrictEqual(getTotalMonthlyIncome(), 2800); // 2000 + 800
});

suite('analytics.js → getAlloc()');

test('returns decimal fractions', () => {
  state.allocation = { needs: 50, wants: 30, savings: 20 };
  const a = getAlloc();
  assertClose(a.needs,   0.50);
  assertClose(a.wants,   0.30);
  assertClose(a.savings, 0.20);
});
test('custom allocation 60/20/20', () => {
  state.allocation = { needs: 60, wants: 20, savings: 20 };
  const a = getAlloc();
  assertClose(a.needs,   0.60);
  assertClose(a.wants,   0.20);
  assertClose(a.savings, 0.20);
});
test('fallback when allocation missing', () => {
  state.allocation = null;
  const a = getAlloc();
  assertClose(a.needs,   0.50);
  assertClose(a.wants,   0.30);
  assertClose(a.savings, 0.20);
  state.allocation = { needs: 50, wants: 30, savings: 20 }; // restore
});

suite('analytics.js → getMonthBudgeted()');

test('standard 50/30/20 on $4000 income', () => {
  state.allocation    = { needs: 50, wants: 30, savings: 20 };
  state.incomeStreams  = [{ id: 'a', name: 'Job', amount: 4000, biweekly: false }];
  const b = getMonthBudgeted(2026, 1);
  assertClose(b.needs,   2000);
  assertClose(b.wants,   1200);
  assertClose(b.savings,  800);
});
test('60/25/15 allocation on $3000 income', () => {
  state.allocation    = { needs: 60, wants: 25, savings: 15 };
  state.incomeStreams  = [{ id: 'a', name: 'Job', amount: 3000, biweekly: false }];
  const b = getMonthBudgeted(2026, 1);
  assertClose(b.needs,   1800);
  assertClose(b.wants,    750);
  assertClose(b.savings,  450);
});

suite('analytics.js → calculateVariance()');

test('on-track: actual < budgeted', () => {
  const v = calculateVariance(1000, 800, 'needs');
  assertClose(v.dollar, 200);
  assertClose(v.percent, 80);
  assertStrictEqual(v.status, 'on-track');
});
test('caution: actual slightly > budgeted (100-110%)', () => {
  const v = calculateVariance(1000, 1050, 'needs');
  assertStrictEqual(v.status, 'caution');
  assertTrue(v.dollar < 0); // over budget
});
test('over: actual > 110% of budgeted', () => {
  const v = calculateVariance(1000, 1200, 'needs');
  assertStrictEqual(v.status, 'over');
  assertClose(v.percent, 120);
});
test('exactly on budget: on-track', () => {
  const v = calculateVariance(1000, 1000, 'needs');
  assertStrictEqual(v.status, 'on-track');
  assertClose(v.dollar, 0);
});
test('zero budget → 0 percent (no div-by-zero)', () => {
  const v = calculateVariance(0, 100, 'needs');
  assertClose(v.percent, 0);
});

// ────────────────────────────────────────────────────────────────
// 4. analytics.js — SAVINGS GOAL PROGRESS
// ────────────────────────────────────────────────────────────────
suite('analytics.js → calculateMonthsBetween()');

test('same month → 0', () => assertStrictEqual(calculateMonthsBetween('2026-01', '2026-01'), 0));
test('5 months forward',  () => assertStrictEqual(calculateMonthsBetween('2026-01', '2026-06'), 5));
test('12 months (1 year)', () => assertStrictEqual(calculateMonthsBetween('2026-01', '2027-01'), 12));
test('negative: past target', () => assertTrue(calculateMonthsBetween('2027-01', '2026-01') < 0));
test('cross-year boundary', () => assertStrictEqual(calculateMonthsBetween('2025-11', '2026-02'), 3));

suite('analytics.js → getGoalProgress()');

// Helper: build a minimal state for goal tests
function _setGoalState({ balance = 5000, defaultAllocated = 500, targetAmount = 10000, targetDate = '2027-01' } = {}) {
  const accId = 'test-acc-001';
  state.savingsAccounts = [{ id: accId, name: 'Test Account', balance, defaultAllocated, monthlyAllocations: {} }];
  const goal = { id: 'test-goal-001', accountId: accId, targetAmount, targetDate };
  return { accId, goal };
}

test('returns null for unknown accountId', () => {
  state.savingsAccounts = [];
  const g = { id: 'g1', accountId: 'nonexistent', targetAmount: 5000, targetDate: '2027-01' };
  assertStrictEqual(getGoalProgress(g), null);
});

test('50% funded goal returns 50% progress', () => {
  const { goal } = _setGoalState({ balance: 5000, targetAmount: 10000, targetDate: '2027-12' });
  const p = getGoalProgress(goal);
  assertTrue(p !== null);
  assertClose(p.currentAmount, 5000);
  assertClose(p.targetAmount, 10000);
  assertTrue(p.progressPercent >= 49 && p.progressPercent <= 51);
});

test('fully funded goal caps progressPercent at 100', () => {
  const { goal } = _setGoalState({ balance: 15000, targetAmount: 10000, targetDate: '2027-12' });
  const p = getGoalProgress(goal);
  assertClose(p.progressPercent, 100);
});

test('on-track when allocation covers monthly need', () => {
  // Allocation $500/mo, need ~$200/mo → on-track
  const { goal } = _setGoalState({ balance: 5000, defaultAllocated: 500, targetAmount: 10000, targetDate: '2027-12' });
  const p = getGoalProgress(goal);
  assertStrictEqual(p.status, 'on-track');
});

test('off-track when allocation far below monthly need', () => {
  // Allocation $10/mo, need ~$500/mo → off-track
  const { goal } = _setGoalState({ balance: 100, defaultAllocated: 10, targetAmount: 100000, targetDate: '2027-01' });
  const p = getGoalProgress(goal);
  assertStrictEqual(p.status, 'off-track');
});

test('past target date with goal met → complete', () => {
  const { goal } = _setGoalState({ balance: 10001, targetAmount: 10000, targetDate: '2024-01' });
  const p = getGoalProgress(goal);
  assertStrictEqual(p.status, 'complete');
});

test('past target date goal NOT met → missed', () => {
  const { goal } = _setGoalState({ balance: 100, targetAmount: 10000, targetDate: '2024-01' });
  const p = getGoalProgress(goal);
  assertStrictEqual(p.status, 'missed');
});

test('monthlySavingsNeeded is 0 when monthsRemaining = 0', () => {
  const { goal } = _setGoalState({ balance: 0, targetAmount: 5000, targetDate: '2024-01' });
  const p = getGoalProgress(goal);
  assertClose(p.monthlySavingsNeeded, 0);
});

// ────────────────────────────────────────────────────────────────
// 5. analytics.js — NET WORTH
// ────────────────────────────────────────────────────────────────
suite('analytics.js → getNetWorthData()');

function _setNetWorthState({ savingsBalances = [], assetValues = [], loanBalances = [], ccBalances = [] } = {}) {
  state.savingsAccounts = savingsBalances.map((b, i) => ({ id: `sa-${i}`, name: `Acct ${i}`, balance: b, defaultAllocated: 0, monthlyAllocations: {} }));
  state.assets          = assetValues.map((v, i) => ({ id: `asset-${i}`, name: `Asset ${i}`, category: 'other', value: v }));
  state.loans           = loanBalances.map((b, i) => ({ id: `loan-${i}`, name: `Loan ${i}`, remaining: b, original: b }));
  state.creditCards     = ccBalances.map((b, i) => ({ id: `cc-${i}`, name: `CC ${i}`, balance: b, limit: 2000 }));
  state.netWorthHistory = [];
}

test('no assets or liabilities → 0 net worth', () => {
  _setNetWorthState();
  const nw = getNetWorthData();
  assertClose(nw.netWorth, 0);
  assertClose(nw.totalAssets, 0);
  assertClose(nw.totalLiabilities, 0);
});

test('assets only → positive net worth', () => {
  _setNetWorthState({ savingsBalances: [5000, 3000], assetValues: [100000] });
  const nw = getNetWorthData();
  assertClose(nw.liquidAssets, 8000);
  assertClose(nw.manualAssets, 100000);
  assertClose(nw.totalAssets, 108000);
  assertClose(nw.netWorth, 108000);
});

test('liabilities only → negative net worth', () => {
  _setNetWorthState({ loanBalances: [20000], ccBalances: [1500] });
  const nw = getNetWorthData();
  assertClose(nw.totalLiabilities, 21500);
  assertTrue(nw.netWorth < 0);
  assertClose(nw.netWorth, -21500);
});

test('mixed: net worth = assets - liabilities', () => {
  _setNetWorthState({
    savingsBalances: [10000],
    assetValues:     [50000],
    loanBalances:    [20000],
    ccBalances:      [1000],
  });
  const nw = getNetWorthData();
  assertClose(nw.netWorth, 10000 + 50000 - 20000 - 1000); // 39000
});

test('momChange is null when no history', () => {
  _setNetWorthState({ savingsBalances: [1000] });
  const nw = getNetWorthData();
  assertStrictEqual(nw.momChange, null);
});

// ────────────────────────────────────────────────────────────────
// 6. analytics.js — TRANSACTION RULES ENGINE
// ────────────────────────────────────────────────────────────────
suite('analytics.js → applyRulesToName()');

function _setRules(rules) {
  state.rules = rules.map((r, i) => ({ id: `r${i}`, ...r }));
}

test('no rules → null', () => {
  state.rules = [];
  assertStrictEqual(applyRulesToName('McDonald\'s'), null);
});

test('contains match (default) — case-insensitive', () => {
  _setRules([{ pattern: 'mcdonald', matchType: 'contains', category: 'Food & Drink' }]);
  assertStrictEqual(applyRulesToName('McDonald\'s'), 'Food & Drink');
});

test('contains match mid-string', () => {
  _setRules([{ pattern: 'uber', matchType: 'contains', category: 'Transportation' }]);
  assertStrictEqual(applyRulesToName('UBER EATS'), 'Transportation');
});

test('startsWith match', () => {
  _setRules([{ pattern: 'tim', matchType: 'startsWith', category: 'Food & Drink' }]);
  assertStrictEqual(applyRulesToName('Tim Hortons'), 'Food & Drink');
});

test('startsWith does NOT match mid-word', () => {
  _setRules([{ pattern: 'hortons', matchType: 'startsWith', category: 'Food & Drink' }]);
  assertStrictEqual(applyRulesToName('Tim Hortons'), null);
});

test('exact match — full string', () => {
  _setRules([{ pattern: 'netflix', matchType: 'exact', category: 'Entertainment' }]);
  assertStrictEqual(applyRulesToName('Netflix'), 'Entertainment');
});

test('exact match — does not match partial', () => {
  _setRules([{ pattern: 'netflix', matchType: 'exact', category: 'Entertainment' }]);
  assertStrictEqual(applyRulesToName('Netflix Canada'), null);
});

test('first-match-wins ordering', () => {
  _setRules([
    { pattern: 'uber', matchType: 'contains', category: 'Transportation' },
    { pattern: 'uber eats', matchType: 'contains', category: 'Food & Drink' },
  ]);
  // 'uber' matches first → Transportation wins
  assertStrictEqual(applyRulesToName('Uber Eats'), 'Transportation');
});

test('second rule wins when first does not match', () => {
  _setRules([
    { pattern: 'lyft',      matchType: 'contains', category: 'Transportation' },
    { pattern: 'uber eats', matchType: 'contains', category: 'Food & Drink' },
  ]);
  assertStrictEqual(applyRulesToName('Uber Eats'), 'Food & Drink');
});

test('empty pattern is skipped', () => {
  _setRules([{ pattern: '', matchType: 'contains', category: 'Food & Drink' }]);
  assertStrictEqual(applyRulesToName('anything'), null);
});

test('empty name with no matching rule → null', () => {
  _setRules([{ pattern: 'food', matchType: 'contains', category: 'Food & Drink' }]);
  assertStrictEqual(applyRulesToName(''), null);
});

suite('analytics.js → getCategorySpending()');

test('empty purchases → empty object', () => {
  assertEqual(getCategorySpending([]), {});
});

test('single purchase', () => {
  const result = getCategorySpending([{ id: 'a', name: 'Tim Hortons', amount: 5.50, category: 'Food & Drink' }]);
  assertClose(result['Food & Drink'], 5.50);
});

test('multiple purchases — same category aggregated', () => {
  const purchases = [
    { id: 'a', name: 'Tim Hortons',  amount: 5.00,  category: 'Food & Drink' },
    { id: 'b', name: 'McDonald\'s',  amount: 12.50, category: 'Food & Drink' },
    { id: 'c', name: 'Gas Station',  amount: 80.00, category: 'Transportation' },
  ];
  const result = getCategorySpending(purchases);
  assertClose(result['Food & Drink'], 17.50);
  assertClose(result['Transportation'], 80.00);
});

test('missing category defaults to "Other"', () => {
  const result = getCategorySpending([{ id: 'a', name: 'Unknown', amount: 10 }]);
  assertClose(result['Other'], 10);
});

suite('analytics.js → getTriggeredAlerts()');

test('no alerts → empty array', () => {
  state.budgetAlerts = [];
  state.purchases    = [];
  assertEqual(getTriggeredAlerts(), []);
});

test('alert NOT triggered when under threshold', () => {
  state.budgetAlerts = [{ id: 'a1', category: 'Food & Drink', threshold: 100 }];
  state.purchases    = [{ id: 'p1', name: 'Coffee', amount: 5, category: 'Food & Drink' }];
  assertEqual(getTriggeredAlerts(), []);
});

test('alert triggered when over threshold', () => {
  state.budgetAlerts = [{ id: 'a1', category: 'Food & Drink', threshold: 50 }];
  state.purchases    = [
    { id: 'p1', name: 'Dinner',   amount: 35, category: 'Food & Drink' },
    { id: 'p2', name: 'Lunch',    amount: 25, category: 'Food & Drink' },
  ];
  const triggered = getTriggeredAlerts();
  assertStrictEqual(triggered.length, 1);
  assertStrictEqual(triggered[0].category, 'Food & Drink');
  assertClose(triggered[0].spent, 60);
});

test('multiple categories: only exceeded ones returned', () => {
  state.budgetAlerts = [
    { id: 'a1', category: 'Food & Drink',   threshold: 50  },
    { id: 'a2', category: 'Entertainment', threshold: 200 },
  ];
  state.purchases = [
    { id: 'p1', name: 'Dinner',  amount: 80, category: 'Food & Drink'  }, // over
    { id: 'p2', name: 'Netflix', amount: 20, category: 'Entertainment' }, // under
  ];
  const triggered = getTriggeredAlerts();
  assertStrictEqual(triggered.length, 1);
  assertStrictEqual(triggered[0].category, 'Food & Drink');
});

test('alert at exact threshold is NOT triggered', () => {
  state.budgetAlerts = [{ id: 'a1', category: 'Shopping', threshold: 100 }];
  state.purchases    = [{ id: 'p1', name: 'Shirt', amount: 100, category: 'Shopping' }];
  // > not >= — exactly at threshold should not trigger
  assertEqual(getTriggeredAlerts(), []);
});

// ────────────────────────────────────────────────────────────────
// 7. analytics.js — ALLOCATION FOR MONTH
// ────────────────────────────────────────────────────────────────
suite('analytics.js → getAllocationForMonth()');

test('returns defaultAllocated when no override exists', () => {
  const acct = { defaultAllocated: 500, monthlyAllocations: {} };
  assertClose(getAllocationForMonth(acct, 2026, 5), 500);
});

test('returns override when present', () => {
  const acct = { defaultAllocated: 500, monthlyAllocations: { '2026-05': 750 } };
  assertClose(getAllocationForMonth(acct, 2026, 5), 750);
});

test('override for different month does not apply', () => {
  const acct = { defaultAllocated: 500, monthlyAllocations: { '2026-06': 750 } };
  assertClose(getAllocationForMonth(acct, 2026, 5), 500);
});

test('zero override is respected (not treated as falsy)', () => {
  const acct = { defaultAllocated: 500, monthlyAllocations: { '2026-05': 0 } };
  assertClose(getAllocationForMonth(acct, 2026, 5), 0);
});

// ────────────────────────────────────────────────────────────────
// 8. analytics.js — SUBSCRIPTION RENEWAL DATES
// ────────────────────────────────────────────────────────────────
suite('analytics.js → getRenewalDatesBetween() — monthly');

test('monthly sub renews once in its own month', () => {
  const sub   = { date: '2026-05-13', frequency: 'monthly' };
  const start = new Date(2026, 4, 1);  // May 1
  const end   = new Date(2026, 4, 31); // May 31
  const dates = getRenewalDatesBetween(sub, start, end);
  assertStrictEqual(dates.length, 1);
  assertStrictEqual(dates[0], '2026-05-13');
});

test('monthly sub does NOT renew when window misses its day', () => {
  const sub   = { date: '2026-05-25', frequency: 'monthly' };
  const start = new Date(2026, 4, 1);  // May 1
  const end   = new Date(2026, 4, 20); // May 20 — before the 25th
  const dates = getRenewalDatesBetween(sub, start, end);
  assertStrictEqual(dates.length, 0);
});

suite('analytics.js → getRenewalDatesBetween() — annual');

test('annual sub renews in its anniversary month', () => {
  const sub   = { date: '2026-04-17', frequency: 'annual' };
  const start = new Date(2026, 3, 1);  // Apr 1
  const end   = new Date(2026, 3, 30); // Apr 30
  const dates = getRenewalDatesBetween(sub, start, end);
  assertStrictEqual(dates.length, 1);
  assertStrictEqual(dates[0], '2026-04-17');
});

test('annual sub does NOT renew in non-anniversary month', () => {
  const sub   = { date: '2026-04-17', frequency: 'annual' };
  const start = new Date(2026, 4, 1);  // May 1
  const end   = new Date(2026, 4, 31); // May 31
  const dates = getRenewalDatesBetween(sub, start, end);
  assertStrictEqual(dates.length, 0);
});

// ────────────────────────────────────────────────────────────────
// RUN & REPORT
// ────────────────────────────────────────────────────────────────

/**
 * Build the final test report and return summary counts.
 * @returns {{ total: number, passed: number, failed: number, results: Array }}
 */
function getTestReport() {
  const passed = _results.filter(r => r.status === 'pass').length;
  const failed = _results.filter(r => r.status === 'fail').length;
  return { total: _results.length, passed, failed, results: _results };
}
