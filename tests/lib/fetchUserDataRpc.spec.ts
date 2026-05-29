/**
 * Module:   tests/lib/fetchUserDataRpc.spec.ts
 * Project:  A Penny For Our Thoughts
 * Created:  May 2026 (Sprint RS-31 — Supabase fetch reliability, Level 2)
 * Summary:  Contract test between the `fetch_user_data(uid)` Postgres RPC
 *           (supabase/migrations/006_fetch_user_data_rpc.sql) and the
 *           `FetchUserDataPayload` shape the TypeScript adapter expects
 *           (src/lib/db.ts).
 *
 *           Failure modes this catches:
 *             1. A new table is added to the schema (and to fetchAllUserData)
 *                but the corresponding `from <table>` clause is not added to
 *                the SQL function — silent missing data at runtime.
 *             2. A jsonb_build_object key is renamed in SQL without updating
 *                the TS interface — silent missing data at runtime.
 *             3. The function loses the `coalesce(... , '[]'::jsonb)` wrap
 *                on an array key — would cause `.map is not a function`
 *                when the table is empty.
 *             4. The function loses its `security invoker` qualifier — would
 *                silently elevate privileges and bypass RLS.
 *             5. The `auth.uid()` defensive check is removed.
 *
 *           This spec reads the SQL file as plain text — it does NOT
 *           execute SQL. The contract is structural.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sqlPath = join(__dirname, '../../supabase/migrations/006_fetch_user_data_rpc.sql');
const dbTsPath = join(__dirname, '../../src/lib/db.ts');

/**
 * The 18 tables the app's BudgetState depends on. If a new table is added
 * to the schema and threaded through fetchAllUserData, it MUST be added
 * here too — and to the SQL function. Either step missing fails the test.
 */
const EXPECTED_TABLES = [
  'profiles',
  'income_streams',
  'expense_cards',
  'expense_items',
  'purchases',
  'spending_history_periods',
  'spending_history_items',
  'loans',
  'credit_cards',
  'subscriptions',
  'wishlist_items',
  'savings_accounts',
  'goals',
  'assets',
  'net_worth_snapshots',
  'rules',
  'budget_alerts',
  'spending_categories',
] as const;

/**
 * The camelCase keys the SQL `jsonb_build_object(...)` must emit, matching
 * the `FetchUserDataPayload` interface in src/lib/db.ts.
 */
const EXPECTED_KEYS = [
  'profile',
  'incomeStreams',
  'expenseCards',
  'expenseItems',
  'purchases',
  'spendingHistoryPeriods',
  'spendingHistoryItems',
  'loans',
  'creditCards',
  'subscriptions',
  'wishlistItems',
  'savingsAccounts',
  'goals',
  'assets',
  'netWorthSnapshots',
  'rules',
  'budgetAlerts',
  'spendingCategories',
] as const;

function readSql(): string {
  return readFileSync(sqlPath, 'utf8');
}

describe('RS-31 — fetch_user_data RPC contract', () => {
  it('SQL migration file exists and is non-empty', () => {
    const sql = readSql();
    expect(sql.length).toBeGreaterThan(500);
  });

  it('declares the function with the exact expected signature', () => {
    const sql = readSql();
    // The TS code calls `supabase.rpc('fetch_user_data', { uid: userId })`
    // — the function name and `uid uuid` arg must match exactly.
    expect(sql).toMatch(/create or replace function\s+fetch_user_data\s*\(\s*uid\s+uuid\s*\)/i);
  });

  it('uses `security invoker` so RLS still applies on every subquery', () => {
    const sql = readSql();
    expect(sql).toMatch(/security\s+invoker/i);
    // Defensive — explicitly NOT `security definer`, which would bypass RLS.
    expect(sql).not.toMatch(/security\s+definer/i);
  });

  it('pins search_path to public (search-path injection guard)', () => {
    const sql = readSql();
    expect(sql).toMatch(/set\s+search_path\s*=\s*public/i);
  });

  it('includes the auth.uid() defensive check', () => {
    const sql = readSql();
    // Belt-and-braces auth check at top of body.
    expect(sql).toMatch(/auth\.uid\(\)\s+is\s+null/i);
    expect(sql).toMatch(/auth\.uid\(\)\s*<>\s*uid/i);
    expect(sql).toMatch(/raise\s+exception/i);
  });

  it('references every expected table', () => {
    const sql = readSql();
    const missing = EXPECTED_TABLES.filter(
      (table) => !new RegExp(`\\bfrom\\s+${table}\\b`, 'i').test(sql),
    );
    expect(
      missing,
      `SQL function is missing FROM clauses for: ${missing.join(', ')}. ` +
      'A new table was added without threading it through the RPC.',
    ).toEqual([]);
  });

  it('emits every expected jsonb_build_object key', () => {
    const sql = readSql();
    const missing = EXPECTED_KEYS.filter(
      (key) => !new RegExp(`'${key}'`).test(sql),
    );
    expect(
      missing,
      `SQL function is missing keys in its jsonb_build_object: ${missing.join(', ')}. ` +
      'The TS FetchUserDataPayload interface and SQL output keys have drifted.',
    ).toEqual([]);
  });

  it('wraps every array key in coalesce(..., \'[]\'::jsonb)', () => {
    const sql = readSql();
    // Every array-returning subquery must coalesce so empty tables yield
    // `[]` not `null`. Count the coalesce calls — should match # of arrays
    // (everything except the `profile` key).
    const coalesceMatches = sql.match(/coalesce\s*\(\s*jsonb_agg/gi) ?? [];
    const expectedCount = EXPECTED_KEYS.length - 1; // minus profile
    expect(
      coalesceMatches.length,
      `Expected ${expectedCount} coalesce(jsonb_agg(...)) array wraps but found ` +
      `${coalesceMatches.length}. Empty tables would surface as null instead of [].`,
    ).toBe(expectedCount);
  });

  it('preserves `order by date desc nulls last` on purchases and spending_history_periods', () => {
    const sql = readSql();
    // These two tables had explicit ordering in the old code — preserve.
    expect(sql).toMatch(/purchases[\s\S]*?order\s+by[\s\S]*?date\s+desc\s+nulls\s+last/i);
    expect(sql).toMatch(/spending_history_periods[\s\S]*?order\s+by[\s\S]*?date\s+desc\s+nulls\s+last/i);
  });

  it('grants execute only to authenticated (not anon, not public)', () => {
    const sql = readSql();
    expect(sql).toMatch(/grant\s+execute\s+on\s+function\s+fetch_user_data\s*\(\s*uuid\s*\)\s+to\s+authenticated/i);
    // Public must be explicitly revoked — otherwise `grant execute to
    // authenticated` is additive and anon could still call.
    expect(sql).toMatch(/revoke\s+all\s+on\s+function\s+fetch_user_data\s*\(\s*uuid\s*\)\s+from\s+public/i);
  });

  it('notifies PostgREST to reload its schema cache', () => {
    const sql = readSql();
    // Without this, the first call after the migration fails with PGRST202.
    expect(sql).toMatch(/notify\s+pgrst\s*,\s*'reload schema'/i);
  });

  it('the TS adapter calls the RPC by the correct name', () => {
    const ts = readFileSync(dbTsPath, 'utf8');
    expect(ts).toMatch(/\.rpc\(\s*['"]fetch_user_data['"]/);
    expect(ts).toMatch(/\{\s*uid:\s*userId\s*\}/);
  });

  it('the TS FetchUserDataPayload interface declares every expected key', () => {
    const ts = readFileSync(dbTsPath, 'utf8');
    const ifaceMatch = ts.match(/interface\s+FetchUserDataPayload\s*\{([\s\S]*?)\}/);
    expect(ifaceMatch, 'db.ts should declare a FetchUserDataPayload interface').toBeTruthy();
    const iface = ifaceMatch![1];
    const missing = EXPECTED_KEYS.filter((key) => !new RegExp(`\\b${key}\\b`).test(iface));
    expect(
      missing,
      `FetchUserDataPayload is missing keys: ${missing.join(', ')}`,
    ).toEqual([]);
  });
});
