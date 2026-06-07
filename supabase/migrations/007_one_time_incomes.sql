-- ═══════════════════════════════════════════════════════════════════════════
-- Migration:  007_one_time_incomes.sql
-- Project:    A Penny For Our Thoughts
-- Created:    June 2026 (feat/one-time-income-db-persistence)
-- Summary:    Adds the one_time_incomes table so windfall / one-time income
--             entries survive sign-out/sign-in.
--
--             Prior to this migration the oneTimeIncomes array only lived in
--             localStorage and was never written to Supabase, so it was lost
--             whenever the user signed out or opened the app in a new browser.
--
--             Changes:
--               1. New table  one_time_incomes  with user-owned RLS
--               2. auto-updated_at trigger (uses existing handle_updated_at())
--               3. fetch_user_data RPC updated to include the new table as
--                  the camelCase key 'oneTimeIncomes'
--
-- To apply:   Supabase Dashboard → SQL Editor → New query → paste → Run
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1. Table ─────────────────────────────────────────────────────────────

create table if not exists one_time_incomes (
  id           text        primary key,
  user_id      uuid        not null references auth.users(id) on delete cascade,
  label        text        not null default '',
  amount       numeric     not null default 0,
  -- date the income was received (ISO 'YYYY-MM-DD')
  date         text        not null default '',
  -- IncomeSourceType: gift | freelance | refund | bonus | sale | other
  type         text        not null default 'other',
  -- IncomeAllocation JSONB: { needs, wants, savings } percentages summing to 100
  allocation   jsonb       not null default '{}',
  -- pay-period this income belongs to (ISO 'YYYY-MM-DD')
  period_start text        not null default '',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ─── 2. Auto-stamp updated_at ─────────────────────────────────────────────

create trigger one_time_incomes_updated_at
  before update on one_time_incomes
  for each row execute procedure handle_updated_at();

-- ─── 3. Row-Level Security ────────────────────────────────────────────────

alter table one_time_incomes enable row level security;

create policy "Own one-time incomes"
  on one_time_incomes for all
  using (user_id = auth.uid());

-- ─── 4. Updated fetch_user_data RPC ──────────────────────────────────────
--
-- `create or replace` preserves the function signature; only the body
-- changes (one new key appended to the jsonb_build_object call).
-- The security / grant / notify block below re-applies because
-- `create or replace` resets privileges on the function.

create or replace function fetch_user_data(uid uuid)
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
begin
  if auth.uid() is null or auth.uid() <> uid then
    raise exception 'fetch_user_data: caller must match uid' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'profile', (
      select to_jsonb(p) from profiles p where p.id = uid
    ),

    'incomeStreams', (
      select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb)
      from income_streams t where t.user_id = uid
    ),

    'expenseCards', (
      select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb)
      from expense_cards t where t.user_id = uid
    ),

    'expenseItems', (
      select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb)
      from expense_items t where t.user_id = uid
    ),

    'purchases', (
      select coalesce(jsonb_agg(to_jsonb(t) order by t.date desc nulls last), '[]'::jsonb)
      from purchases t where t.user_id = uid
    ),

    'spendingHistoryPeriods', (
      select coalesce(jsonb_agg(to_jsonb(t) order by t.date desc nulls last), '[]'::jsonb)
      from spending_history_periods t where t.user_id = uid
    ),

    'spendingHistoryItems', (
      select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb)
      from spending_history_items t where t.user_id = uid
    ),

    'loans', (
      select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb)
      from loans t where t.user_id = uid
    ),

    'creditCards', (
      select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb)
      from credit_cards t where t.user_id = uid
    ),

    'subscriptions', (
      select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb)
      from subscriptions t where t.user_id = uid
    ),

    'wishlistItems', (
      select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb)
      from wishlist_items t where t.user_id = uid
    ),

    'savingsAccounts', (
      select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb)
      from savings_accounts t where t.user_id = uid
    ),

    'goals', (
      select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb)
      from goals t where t.user_id = uid
    ),

    'assets', (
      select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb)
      from assets t where t.user_id = uid
    ),

    'netWorthSnapshots', (
      select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb)
      from net_worth_snapshots t where t.user_id = uid
    ),

    'rules', (
      select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb)
      from rules t where t.user_id = uid
    ),

    'budgetAlerts', (
      select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb)
      from budget_alerts t where t.user_id = uid
    ),

    'spendingCategories', (
      select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb)
      from spending_categories t where t.user_id = uid
    ),

    -- RS-32: one-time (windfall) income entries, ordered newest first
    'oneTimeIncomes', (
      select coalesce(jsonb_agg(to_jsonb(t) order by t.date desc nulls last), '[]'::jsonb)
      from one_time_incomes t where t.user_id = uid
    )
  );
end;
$$;

revoke all on function fetch_user_data(uuid) from public;
grant execute on function fetch_user_data(uuid) to authenticated;

notify pgrst, 'reload schema';
