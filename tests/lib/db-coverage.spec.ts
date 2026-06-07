/**
 * Module:   tests/lib/db-coverage.spec.ts
 * Project:  A Penny For Our Thoughts
 * Created:  June 2026 (chore — DB sync policy enforcement)
 * Summary:  Regression guard for the Database Sync Policy (see CLAUDE.md).
 *
 *           The windfall-income bug (v2.38.x → v2.39.0) showed that a store
 *           entity can exist for months without anyone noticing it was never
 *           wired to Supabase. This spec fails loudly the moment that happens.
 *
 *           TWO layers are checked:
 *
 *           1. Entity registry — every key in ALL_DB_ENTITY_KEYS exists as a
 *              top-level property on the `db` object exported from db.ts.
 *              Adding a new entity to the store without adding it to db.ts
 *              fails here.
 *
 *           2. CRUD shape — every standard entity has insert / update / delete
 *              functions. Non-standard shapes (spendingHistory, netWorthHistory)
 *              have their own assertions below.
 *
 *           A sentinel "total count" test forces a deliberate update of this
 *           file whenever the entity list changes — you cannot accidentally
 *           add or remove an entity and have these tests silently stay green.
 *
 *           NOTE: this spec imports db directly and does NOT mock Supabase.
 *           It only inspects the shape of the object, never calls the helpers,
 *           so no network traffic is generated.
 */

import { describe, it, expect } from 'vitest';

// Import after vitest sets up the module graph — no Supabase mock needed
// because we only inspect typeof, not invoke anything.
import { db } from '@/lib/db';

// ─── Entity registry ──────────────────────────────────────────────────────────

/**
 * EVERY persisted store entity must appear here.
 *
 * When you add a new entity to BudgetState that must survive sign-out:
 *   1. Add its db key to this array.
 *   2. Run the tests — they will fail until db.ts is also updated.
 *   3. Follow the full Database Sync Policy checklist in CLAUDE.md.
 */
const ALL_DB_ENTITY_KEYS = [
  'incomeStreams',
  'expenseCards',
  'expenseItems',
  'purchases',
  'spendingHistory',
  'loans',
  'creditCards',
  'subscriptions',
  'wishlist',
  'savingsAccounts',
  'goals',
  'assets',
  'netWorthHistory',
  'rules',
  'budgetAlerts',
  'spendingCategories',
  'oneTimeIncomes',
] as const;

/**
 * Entities whose db helpers follow the standard { insert, update, delete }
 * shape. Entities with non-standard shapes are tested individually below.
 */
const STANDARD_CRUD_ENTITY_KEYS = [
  'incomeStreams',
  'expenseCards',
  'expenseItems',
  'purchases',
  'loans',
  'creditCards',
  'subscriptions',
  'wishlist',
  'savingsAccounts',
  'goals',
  'assets',
  'rules',
  'budgetAlerts',
  'spendingCategories',
  'oneTimeIncomes',
] as const;

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('DB sync coverage — entity registry', () => {
  it.each(ALL_DB_ENTITY_KEYS)(
    '%s is registered as a top-level key on db',
    (entity) => {
      expect(
        db,
        `db.${entity} is missing — follow the Database Sync Policy in CLAUDE.md to add it`,
      ).toHaveProperty(entity);
    },
  );

  it(
    'total entity count is 17 — update ALL_DB_ENTITY_KEYS in this file when adding or removing a persisted entity',
    () => {
      expect(ALL_DB_ENTITY_KEYS.length).toBe(17);
    },
  );
});

describe('DB sync coverage — standard CRUD shape (insert / update / delete)', () => {
  it.each(STANDARD_CRUD_ENTITY_KEYS)(
    '%s exposes insert, update, and delete helpers',
    (entity) => {
      // Cast to a loose record so TypeScript doesn't complain about indexing
      // `as const` objects with a variable key.
      const helpers = db[entity] as Record<string, unknown>;

      expect(
        typeof helpers.insert,
        `db.${entity}.insert must be a function`,
      ).toBe('function');

      expect(
        typeof helpers.update,
        `db.${entity}.update must be a function`,
      ).toBe('function');

      expect(
        typeof helpers.delete,
        `db.${entity}.delete must be a function`,
      ).toBe('function');
    },
  );
});

describe('DB sync coverage — non-standard CRUD shapes', () => {
  it('spendingHistory has insertPeriod, updatePeriodSnapshots, and deletePeriod', () => {
    expect(typeof db.spendingHistory.insertPeriod).toBe('function');
    expect(typeof db.spendingHistory.updatePeriodSnapshots).toBe('function');
    expect(typeof db.spendingHistory.deletePeriod).toBe('function');
  });

  it('netWorthHistory has insert and delete — snapshots are immutable so no update exists', () => {
    expect(typeof db.netWorthHistory.insert).toBe('function');
    expect(typeof db.netWorthHistory.delete).toBe('function');
    // Explicitly assert no update — if one is ever added, this test should be
    // updated to document the intent rather than silently passing.
    expect(
      (db.netWorthHistory as Record<string, unknown>).update,
    ).toBeUndefined();
  });
});
