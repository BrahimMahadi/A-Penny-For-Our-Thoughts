/**
 * Module:   utils/csvImportExport.ts
 * Project:  A Penny For Our Thoughts
 * Created:  May 2026 (Vue 3 migration — Sprint 5)
 * Summary:  Typed port of the legacy exportCsv() / parseCsv() functions.
 *
 *           Format: `SECTION:<name>` marker rows delimit each data block.
 *           The row immediately after each marker is a column-header row
 *           (not persisted). Subsequent rows carry data.
 *
 *           Backward-compatible with CSV files produced by the original
 *           vanilla-JS app — all 17 sections are preserved.
 *
 *           Exported functions:
 *             exportStateToCSV(state)  → string   (pure, no DOM side-effects)
 *             parseCSVToState(text)    → BudgetState
 */

import { csvEscape, parseCSVRow } from '@/utils/csv';
import { makeBlankState } from '@/stores/budget';
import type { BudgetState } from '@/types/state';
import type { Frequency } from '@/types/budget';

// ─── Export ─────────────────────────────────────────────────────────────────

/**
 * Serialise a BudgetState object into the multi-section CSV format used by
 * the app. Returns a raw string; the caller is responsible for triggering the
 * download.
 *
 * Mirrors `exportCsv()` in the legacy app.js 1:1 so existing export files
 * remain importable by both the old and new app.
 */
export function exportStateToCSV(state: BudgetState): string {
  const rows: string[] = [];
  const e = csvEscape;
  const today = new Date().toISOString().split('T')[0];

  // ── meta ──
  rows.push('SECTION:meta', 'key,value');
  rows.push(`exported,${today}`);
  rows.push(`payStart,${state.payStart ?? ''}`);
  rows.push('');

  // ── allocation ──
  rows.push('SECTION:allocation', 'needs,wants,savings');
  rows.push(`${state.allocation.needs},${state.allocation.wants},${state.allocation.savings}`);
  rows.push('');

  // ── budgetDisplayMode ──
  rows.push('SECTION:budgetDisplayMode', 'needs,wants,savings');
  rows.push(
    `${state.budgetDisplayMode.needs ?? 'monthly'},${state.budgetDisplayMode.wants ?? 'monthly'},${state.budgetDisplayMode.savings ?? 'monthly'}`,
  );
  rows.push('');

  // ── incomeStreams ──
  rows.push('SECTION:incomeStreams', 'id,name,amount,biweekly');
  (state.incomeStreams ?? []).forEach((s) =>
    rows.push(`${e(s.id)},${e(s.name)},${s.amount},${s.biweekly}`),
  );
  rows.push('');

  // ── expenseCards (flattened — one row per item; empty card gets one stub row) ──
  rows.push(
    'SECTION:expenseCards',
    'cardId,cardLabel,itemId,itemName,itemAmount,itemBiweekly,itemDueDay',
  );
  (state.expenseCards ?? []).forEach((card) => {
    if (!(card.items ?? []).length) {
      rows.push(`${e(card.id)},${e(card.label)},,,,, `);
    } else {
      card.items.forEach((item) =>
        rows.push(
          `${e(card.id)},${e(card.label)},${e(item.id)},${e(item.name)},${item.amount},${item.biweekly},${item.dueDay ?? ''}`,
        ),
      );
    }
  });
  rows.push('');

  // ── purchases ──
  rows.push('SECTION:purchases', 'id,name,amount,category,cardId,budgetType');
  (state.purchases ?? []).forEach((p) =>
    rows.push(
      `${e(p.id)},${e(p.name)},${p.amount},${e(p.category ?? 'Other')},${e(p.cardId ?? '')},${e(p.budgetType ?? 'wants')}`,
    ),
  );
  rows.push('');

  // ── spendingHistory (flattened — one row per item; empty period gets stub) ──
  rows.push(
    'SECTION:spendingHistory',
    'periodId,periodDate,periodLabel,periodTotal,purchaseId,purchaseName,purchaseAmount,purchaseCategory',
  );
  (state.spendingHistory ?? []).forEach((period) => {
    if (!(period.items ?? []).length) {
      rows.push(`${e(period.id)},${e(period.date)},${e(period.label)},${period.total},,,,`);
    } else {
      period.items.forEach((p) =>
        rows.push(
          `${e(period.id)},${e(period.date)},${e(period.label)},${period.total},${e(p.id)},${e(p.name)},${p.amount},${e(p.category ?? 'Other')}`,
        ),
      );
    }
  });
  rows.push('');

  // ── loans ──
  rows.push(
    'SECTION:loans',
    'id,name,remaining,original,paymentAmount,frequency,date,budgetType,cardId',
  );
  (state.loans ?? []).forEach((l) =>
    rows.push(
      `${e(l.id)},${e(l.name)},${l.remaining},${l.original},${l.paymentAmount ?? 0},${e(l.frequency ?? 'monthly')},${e(l.date ?? '')},${e(l.budgetType ?? 'needs')},${e(l.cardId ?? '')}`,
    ),
  );
  rows.push('');

  // ── creditCards ──
  rows.push('SECTION:creditCards', 'id,name,balance,limit');
  (state.creditCards ?? []).forEach((c) =>
    rows.push(`${e(c.id)},${e(c.name)},${c.balance},${c.limit}`),
  );
  rows.push('');

  // ── subscriptions ──
  rows.push(
    'SECTION:subscriptions',
    'id,name,amount,frequency,date,category,budgetType,cardId',
  );
  (state.subscriptions ?? []).forEach((s) =>
    rows.push(
      `${e(s.id)},${e(s.name)},${s.amount ?? 0},${e(s.frequency ?? 'monthly')},${e(s.date)},${e(s.category ?? 'Other')},${e(s.budgetType ?? 'wants')},${e(s.cardId ?? '')}`,
    ),
  );
  rows.push('');

  // ── wishlist ──
  rows.push('SECTION:wishlist', 'id,icon,name,url');
  (state.wishlist ?? []).forEach((w) =>
    rows.push(`${e(w.id)},${e(w.icon ?? '')},${e(w.name)},${e(w.url ?? '')}`),
  );
  rows.push('');

  // ── savingsAccounts (monthlyAllocations serialised as JSON) ──
  rows.push(
    'SECTION:savingsAccounts',
    'id,name,balance,defaultAllocated,monthlyAllocations',
  );
  (state.savingsAccounts ?? []).forEach((a) =>
    rows.push(
      `${e(a.id)},${e(a.name)},${a.balance ?? 0},${a.defaultAllocated ?? 0},${e(JSON.stringify(a.monthlyAllocations ?? {}))}`,
    ),
  );
  rows.push('');

  // ── goals ──
  rows.push('SECTION:goals', 'id,accountId,targetAmount,targetDate');
  (state.goals ?? []).forEach((g) =>
    rows.push(`${e(g.id)},${e(g.accountId)},${g.targetAmount},${g.targetDate}`),
  );
  rows.push('');

  // ── assets ──
  rows.push('SECTION:assets', 'id,name,category,value');
  (state.assets ?? []).forEach((a) =>
    rows.push(`${e(a.id)},${e(a.name)},${e(a.category)},${a.value}`),
  );
  rows.push('');

  // ── netWorthHistory ──
  rows.push(
    'SECTION:netWorthHistory',
    'id,date,netWorth,totalAssets,totalLiabilities',
  );
  (state.netWorthHistory ?? []).forEach((h) =>
    rows.push(`${e(h.id)},${h.date},${h.netWorth},${h.totalAssets},${h.totalLiabilities}`),
  );
  rows.push('');

  // ── rules ──
  rows.push('SECTION:rules', 'id,pattern,matchType,category');
  (state.rules ?? []).forEach((r) =>
    rows.push(`${e(r.id)},${e(r.pattern)},${e(r.matchType)},${e(r.category)}`),
  );
  rows.push('');

  // ── budgetAlerts ──
  rows.push('SECTION:budgetAlerts', 'id,category,threshold');
  (state.budgetAlerts ?? []).forEach((a) =>
    rows.push(`${e(a.id)},${e(a.category)},${a.threshold}`),
  );
  rows.push('');

  return rows.join('\n');
}

// ─── Parse ──────────────────────────────────────────────────────────────────

/**
 * Parse a multi-section CSV string (as produced by `exportStateToCSV()` or
 * the legacy `exportCsv()`) into a BudgetState.
 *
 * Mirrors `parseCsv()` from the legacy app.js. Handles old 4-column exports
 * and other backward-compat edge-cases identically.
 *
 * Throws if the text is completely unparseable. Sections missing from the
 * file fall back to safe empty defaults so partial imports work.
 *
 * @param text Raw CSV file contents.
 * @returns Fully populated BudgetState (not yet persisted).
 */
export function parseCSVToState(text: string): BudgetState {
  // Start from a blank (all-empty) state so we only persist what's in the CSV
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const parsed: any = {};

  let currentSection: string | null = null;
  let headers: string[] | null = null;

  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim();
    if (!line) continue;

    if (line.startsWith('SECTION:')) {
      currentSection = line.slice(8);
      headers = null;
      continue;
    }

    if (!headers) {
      headers = parseCSVRow(line);
      continue;
    }

    const vals = parseCSVRow(line);

    switch (currentSection) {
      case 'meta':
        if (vals[0] === 'payStart' && vals[1]) parsed.payStart = vals[1] || null;
        break;

      case 'allocation':
        parsed.allocation = {
          needs:   +vals[0] || 50,
          wants:   +vals[1] || 30,
          savings: +vals[2] || 20,
        };
        break;

      case 'budgetDisplayMode':
        parsed.budgetDisplayMode = {
          needs:   vals[0] || 'monthly',
          wants:   vals[1] || 'monthly',
          savings: vals[2] || 'monthly',
        };
        break;

      case 'incomeStreams':
        if (!parsed.incomeStreams) parsed.incomeStreams = [];
        parsed.incomeStreams.push({
          id:       vals[0],
          name:     vals[1],
          amount:   +vals[2],
          biweekly: vals[3] === 'true',
        });
        break;

      case 'expenseCards': {
        if (!parsed.expenseCards) parsed.expenseCards = [];
        const [cardId, cardLabel, itemId, itemName, itemAmount, itemBiweekly, itemDueDay] = vals;
        let card = parsed.expenseCards.find((c: { id: string }) => c.id === cardId);
        if (!card) {
          card = { id: cardId, label: cardLabel, items: [] };
          parsed.expenseCards.push(card);
        }
        if (itemId && itemName) {
          const dueDayParsed = parseInt(itemDueDay, 10);
          const dueDay =
            !isNaN(dueDayParsed) && dueDayParsed >= 1 && dueDayParsed <= 31
              ? dueDayParsed
              : null;
          card.items.push({
            id:       itemId,
            name:     itemName,
            amount:   +itemAmount,
            biweekly: itemBiweekly === 'true',
            dueDay,
          });
        }
        break;
      }

      case 'purchases':
        if (!parsed.purchases) parsed.purchases = [];
        parsed.purchases.push({
          id:         vals[0],
          name:       vals[1],
          amount:     +vals[2],
          category:   vals[3] || 'Other',
          cardId:     vals[4] || null,
          budgetType: vals[5] || 'wants',
        });
        break;

      case 'spendingHistory': {
        if (!parsed.spendingHistory) parsed.spendingHistory = [];
        const [pId, pDate, pLabel, pTotal, purchId, purchName, purchAmt, purchCat] = vals;
        let period = parsed.spendingHistory.find((p: { id: string }) => p.id === pId);
        if (!period) {
          period = { id: pId, date: pDate, label: pLabel, total: +pTotal, items: [] };
          parsed.spendingHistory.push(period);
        }
        if (purchId && purchName) {
          period.items.push({
            id:       purchId,
            name:     purchName,
            amount:   +purchAmt,
            category: purchCat || 'Other',
          });
        }
        break;
      }

      case 'loans':
        if (!parsed.loans) parsed.loans = [];
        parsed.loans.push({
          id:            vals[0],
          name:          vals[1],
          remaining:     +vals[2],
          original:      +vals[3],
          // Gracefully handle old 4-column exports that predate payment tracking
          paymentAmount: +vals[4] || 0,
          frequency:     (vals[5] || 'monthly') as Frequency,
          date:          vals[6] || '',
          budgetType:    vals[7] || 'needs',
          cardId:        vals[8] || null,
        });
        break;

      case 'creditCards':
        if (!parsed.creditCards) parsed.creditCards = [];
        parsed.creditCards.push({
          id:      vals[0],
          name:    vals[1],
          balance: +vals[2],
          limit:   +vals[3],
        });
        break;

      case 'subscriptions':
        if (!parsed.subscriptions) parsed.subscriptions = [];
        if (vals.length >= 7) {
          // Current format: id,name,amount,frequency,date,category,budgetType[,cardId]
          parsed.subscriptions.push({
            id:         vals[0],
            name:       vals[1],
            amount:     +vals[2] || 0,
            frequency:  (vals[3] || 'monthly') as Frequency,
            date:       vals[4],
            category:   vals[5] || 'Other',
            budgetType: vals[6] || 'wants',
            cardId:     vals[7] || null,
          });
        } else {
          // Old format fallback: id,name,date
          parsed.subscriptions.push({
            id:         vals[0],
            name:       vals[1],
            amount:     0,
            frequency:  'monthly' as Frequency,
            date:       vals[2],
            category:   'Other',
            budgetType: 'wants',
            cardId:     null,
          });
        }
        break;

      case 'wishlist':
        if (!parsed.wishlist) parsed.wishlist = [];
        parsed.wishlist.push({
          id:   vals[0],
          icon: vals[1],
          name: vals[2],
          url:  vals[3] || '',
        });
        break;

      case 'savingsAccounts':
        if (!parsed.savingsAccounts) parsed.savingsAccounts = [];
        if (vals.length >= 5) {
          parsed.savingsAccounts.push({
            id:                 vals[0],
            name:               vals[1],
            balance:            +vals[2],
            defaultAllocated:   +vals[3],
            monthlyAllocations: vals[4] ? JSON.parse(vals[4]) : {},
          });
        } else {
          // Old format: no monthlyAllocations column
          parsed.savingsAccounts.push({
            id:                 vals[0],
            name:               vals[1],
            balance:            0,
            defaultAllocated:   +vals[2],
            monthlyAllocations: {},
          });
        }
        break;

      case 'goals':
        if (!parsed.goals) parsed.goals = [];
        parsed.goals.push({
          id:           vals[0],
          accountId:    vals[1],
          targetAmount: +vals[2],
          targetDate:   vals[3],
        });
        break;

      case 'assets':
        if (!parsed.assets) parsed.assets = [];
        parsed.assets.push({
          id:       vals[0],
          name:     vals[1],
          category: vals[2],
          value:    +vals[3],
        });
        break;

      case 'netWorthHistory':
        if (!parsed.netWorthHistory) parsed.netWorthHistory = [];
        parsed.netWorthHistory.push({
          id:               vals[0],
          date:             vals[1],
          netWorth:         +vals[2],
          totalAssets:      +vals[3],
          totalLiabilities: +vals[4],
        });
        break;

      case 'rules':
        if (!parsed.rules) parsed.rules = [];
        parsed.rules.push({
          id:        vals[0],
          pattern:   vals[1],
          matchType: vals[2],
          category:  vals[3],
        });
        break;

      case 'budgetAlerts':
        if (!parsed.budgetAlerts) parsed.budgetAlerts = [];
        parsed.budgetAlerts.push({
          id:        vals[0],
          category:  vals[1],
          threshold: +vals[2],
        });
        break;

      // Unknown section — silently skip
      default:
        break;
    }
  }

  // ── Fill missing sections with blank defaults ──────────────────────────────
  const blank = makeBlankState();
  if (!parsed.allocation)        parsed.allocation        = blank.allocation;
  if (!parsed.budgetDisplayMode) parsed.budgetDisplayMode = blank.budgetDisplayMode;
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
  if (parsed.fundsRemaining === undefined) parsed.fundsRemaining = 0;
  if (!parsed.fundsRemainingUpdated)       parsed.fundsRemainingUpdated = '';

  return parsed as BudgetState;
}

// ─── Download helper ────────────────────────────────────────────────────────

/**
 * Trigger a CSV file download in the browser.
 * Pure DOM side-effect — kept separate from exportStateToCSV() so the
 * serialisation is independently testable.
 *
 * @param csvString  The raw CSV content to download.
 * @param filename   File name (defaults to penny-YYYY-MM-DD.csv).
 */
export function triggerCSVDownload(csvString: string, filename?: string): void {
  const today = new Date().toISOString().split('T')[0];
  const name = filename ?? `penny-export-${today}.csv`;
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = Object.assign(document.createElement('a'), {
    href: url,
    download: name,
  });
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
