-- =============================================================================
-- Migration:  001_initial_schema.sql
-- Project:    A Penny For Our Thoughts
-- Created:    May 2026 (Sprint 23 — Supabase DB Integration)
-- Summary:    Full database schema for the personal finance dashboard.
--             Every table has a `user_id` FK to auth.users and RLS enabled.
--
--             Sprint 23: RLS policies are defined but the service-role key
--             is used in dev so they are not enforced yet.
--             Sprint 24: Switch to anon key + enable all policies.
-- =============================================================================

-- ─── Extensions ────────────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ─── Helper: updated_at auto-stamp ─────────────────────────────────────────
create or replace function handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =============================================================================
-- PROFILES
-- One row per user. Holds scalar config that doesn't need its own table.
-- =============================================================================
create table if not exists profiles (
  id                        uuid primary key references auth.users on delete cascade,
  -- Budget allocation (needs / wants / savings percentages, sum = 100)
  allocation                jsonb not null default '{"needs":50,"wants":30,"savings":20}',
  -- Display granularity per bucket
  budget_display_mode       jsonb not null default '{"needs":"monthly","wants":"monthly","savings":"monthly"}',
  -- Pay-period anchor date (ISO YYYY-MM-DD or null)
  pay_start                 date,
  -- Manual chequing balance
  funds_remaining           numeric(12,2) not null default 0,
  funds_remaining_updated   text not null default '',   -- ISO date or ''
  -- Onboarding & version flags
  has_onboarded             boolean not null default false,
  dismissed_version         text,
  -- Timestamps
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

create trigger profiles_updated_at
  before update on profiles
  for each row execute procedure handle_updated_at();

alter table profiles enable row level security;
-- Sprint 24: uncomment these policies
-- create policy "Users can read own profile"   on profiles for select using (id = auth.uid());
-- create policy "Users can update own profile" on profiles for update using (id = auth.uid());
-- create policy "Users can insert own profile" on profiles for insert with check (id = auth.uid());

-- =============================================================================
-- INCOME STREAMS
-- =============================================================================
create table if not exists income_streams (
  id          text primary key,
  user_id     uuid not null references auth.users on delete cascade,
  name        text not null,
  amount      numeric(12,2) not null default 0,
  biweekly    boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index on income_streams (user_id);
create trigger income_streams_updated_at
  before update on income_streams
  for each row execute procedure handle_updated_at();

alter table income_streams enable row level security;
-- create policy "Own income streams" on income_streams for all using (user_id = auth.uid());

-- =============================================================================
-- EXPENSE CARDS + EXPENSE ITEMS
-- ExpenseCard has nested ExpenseItem[] — split into two tables.
-- =============================================================================
create table if not exists expense_cards (
  id          text primary key,
  user_id     uuid not null references auth.users on delete cascade,
  label       text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index on expense_cards (user_id);
create trigger expense_cards_updated_at
  before update on expense_cards
  for each row execute procedure handle_updated_at();

alter table expense_cards enable row level security;
-- create policy "Own expense cards" on expense_cards for all using (user_id = auth.uid());

create table if not exists expense_items (
  id               text primary key,
  user_id          uuid not null references auth.users on delete cascade,
  expense_card_id  text not null references expense_cards on delete cascade,
  name             text not null,
  amount           numeric(12,2) not null default 0,
  biweekly         boolean not null default false,
  due_day          smallint,          -- 1–31 or null
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index on expense_items (user_id);
create index on expense_items (expense_card_id);
create trigger expense_items_updated_at
  before update on expense_items
  for each row execute procedure handle_updated_at();

alter table expense_items enable row level security;
-- create policy "Own expense items" on expense_items for all using (user_id = auth.uid());

-- =============================================================================
-- PURCHASES
-- =============================================================================
create table if not exists purchases (
  id           text primary key,
  user_id      uuid not null references auth.users on delete cascade,
  name         text not null,
  amount       numeric(12,2) not null default 0,
  category     text not null default 'other',
  card_id      text,                  -- FK to expense_cards.id (nullable)
  budget_type  text not null default 'wants',
  date         date,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index on purchases (user_id);
create index on purchases (user_id, date desc);
create trigger purchases_updated_at
  before update on purchases
  for each row execute procedure handle_updated_at();

alter table purchases enable row level security;
-- create policy "Own purchases" on purchases for all using (user_id = auth.uid());

-- =============================================================================
-- SPENDING HISTORY PERIODS + ITEMS
-- SpendingHistoryPeriod has nested items[] — split into two tables.
-- =============================================================================
create table if not exists spending_history_periods (
  id          text primary key,
  user_id     uuid not null references auth.users on delete cascade,
  date        date not null,
  label       text,
  total       numeric(12,2) not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index on spending_history_periods (user_id);
create index on spending_history_periods (user_id, date desc);
create trigger spending_history_periods_updated_at
  before update on spending_history_periods
  for each row execute procedure handle_updated_at();

alter table spending_history_periods enable row level security;
-- create policy "Own spending history periods" on spending_history_periods for all using (user_id = auth.uid());

create table if not exists spending_history_items (
  id          text,
  user_id     uuid not null references auth.users on delete cascade,
  period_id   text not null references spending_history_periods on delete cascade,
  name        text not null,
  amount      numeric(12,2) not null default 0,
  category    text not null default 'other',
  date        date,
  created_at  timestamptz not null default now(),
  primary key (period_id, id)
);

create index on spending_history_items (user_id);
create index on spending_history_items (period_id);

alter table spending_history_items enable row level security;
-- create policy "Own spending history items" on spending_history_items for all using (user_id = auth.uid());

-- =============================================================================
-- LOANS
-- =============================================================================
create table if not exists loans (
  id              text primary key,
  user_id         uuid not null references auth.users on delete cascade,
  name            text not null,
  remaining       numeric(12,2) not null default 0,
  original        numeric(12,2) not null default 0,
  payment_amount  numeric(12,2) not null default 0,
  frequency       text not null default 'monthly',
  date            text not null default '',  -- ISO date or ''
  budget_type     text not null default 'needs',
  card_id         text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index on loans (user_id);
create trigger loans_updated_at
  before update on loans
  for each row execute procedure handle_updated_at();

alter table loans enable row level security;
-- create policy "Own loans" on loans for all using (user_id = auth.uid());

-- =============================================================================
-- CREDIT CARDS
-- =============================================================================
create table if not exists credit_cards (
  id          text primary key,
  user_id     uuid not null references auth.users on delete cascade,
  name        text not null,
  balance     numeric(12,2) not null default 0,
  "limit"     numeric(12,2) not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index on credit_cards (user_id);
create trigger credit_cards_updated_at
  before update on credit_cards
  for each row execute procedure handle_updated_at();

alter table credit_cards enable row level security;
-- create policy "Own credit cards" on credit_cards for all using (user_id = auth.uid());

-- =============================================================================
-- SUBSCRIPTIONS
-- =============================================================================
create table if not exists subscriptions (
  id           text primary key,
  user_id      uuid not null references auth.users on delete cascade,
  name         text not null,
  amount       numeric(12,2) not null default 0,
  frequency    text not null default 'monthly',
  date         date not null,
  category     text not null default 'other',
  budget_type  text not null default 'wants',
  card_id      text,
  days_of_week integer[] not null default '{}',  -- 0=Sun…6=Sat for custom-days
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index on subscriptions (user_id);
create trigger subscriptions_updated_at
  before update on subscriptions
  for each row execute procedure handle_updated_at();

alter table subscriptions enable row level security;
-- create policy "Own subscriptions" on subscriptions for all using (user_id = auth.uid());

-- =============================================================================
-- WISHLIST ITEMS
-- =============================================================================
create table if not exists wishlist_items (
  id          text primary key,
  user_id     uuid not null references auth.users on delete cascade,
  icon        text not null default '',
  name        text not null,
  url         text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index on wishlist_items (user_id);
create trigger wishlist_items_updated_at
  before update on wishlist_items
  for each row execute procedure handle_updated_at();

alter table wishlist_items enable row level security;
-- create policy "Own wishlist items" on wishlist_items for all using (user_id = auth.uid());

-- =============================================================================
-- SAVINGS ACCOUNTS
-- monthly_allocations kept as jsonb (sparse YYYY-MM → amount map)
-- =============================================================================
create table if not exists savings_accounts (
  id                    text primary key,
  user_id               uuid not null references auth.users on delete cascade,
  name                  text not null,
  balance               numeric(12,2) not null default 0,
  default_allocated     numeric(12,2) not null default 0,
  monthly_allocations   jsonb not null default '{}',
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index on savings_accounts (user_id);
create trigger savings_accounts_updated_at
  before update on savings_accounts
  for each row execute procedure handle_updated_at();

alter table savings_accounts enable row level security;
-- create policy "Own savings accounts" on savings_accounts for all using (user_id = auth.uid());

-- =============================================================================
-- GOALS
-- =============================================================================
create table if not exists goals (
  id             text primary key,
  user_id        uuid not null references auth.users on delete cascade,
  account_id     text not null references savings_accounts on delete cascade,
  target_amount  numeric(12,2) not null default 0,
  target_date    text not null,  -- YYYY-MM (ISOMonth)
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index on goals (user_id);
create trigger goals_updated_at
  before update on goals
  for each row execute procedure handle_updated_at();

alter table goals enable row level security;
-- create policy "Own goals" on goals for all using (user_id = auth.uid());

-- =============================================================================
-- ASSETS
-- =============================================================================
create table if not exists assets (
  id          text primary key,
  user_id     uuid not null references auth.users on delete cascade,
  name        text not null,
  category    text not null default 'other',
  value       numeric(12,2) not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index on assets (user_id);
create trigger assets_updated_at
  before update on assets
  for each row execute procedure handle_updated_at();

alter table assets enable row level security;
-- create policy "Own assets" on assets for all using (user_id = auth.uid());

-- =============================================================================
-- NET WORTH SNAPSHOTS
-- =============================================================================
create table if not exists net_worth_snapshots (
  id                  text primary key,
  user_id             uuid not null references auth.users on delete cascade,
  date                text not null,  -- YYYY-MM (ISOMonth)
  net_worth           numeric(12,2) not null default 0,
  total_assets        numeric(12,2) not null default 0,
  total_liabilities   numeric(12,2) not null default 0,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index on net_worth_snapshots (user_id);
create trigger net_worth_snapshots_updated_at
  before update on net_worth_snapshots
  for each row execute procedure handle_updated_at();

alter table net_worth_snapshots enable row level security;
-- create policy "Own net worth snapshots" on net_worth_snapshots for all using (user_id = auth.uid());

-- =============================================================================
-- RULES (transaction-categorisation rules engine)
-- =============================================================================
create table if not exists rules (
  id          text primary key,
  user_id     uuid not null references auth.users on delete cascade,
  pattern     text not null,
  match_type  text not null default 'contains',
  category    text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index on rules (user_id);
create trigger rules_updated_at
  before update on rules
  for each row execute procedure handle_updated_at();

alter table rules enable row level security;
-- create policy "Own rules" on rules for all using (user_id = auth.uid());

-- =============================================================================
-- BUDGET ALERTS
-- =============================================================================
create table if not exists budget_alerts (
  id          text primary key,
  user_id     uuid not null references auth.users on delete cascade,
  category    text not null,
  threshold   numeric(5,2) not null default 80,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index on budget_alerts (user_id);
create trigger budget_alerts_updated_at
  before update on budget_alerts
  for each row execute procedure handle_updated_at();

alter table budget_alerts enable row level security;
-- create policy "Own budget alerts" on budget_alerts for all using (user_id = auth.uid());

-- =============================================================================
-- SPENDING CATEGORIES
-- =============================================================================
create table if not exists spending_categories (
  id          text primary key,
  user_id     uuid not null references auth.users on delete cascade,
  name        text not null,
  color       text not null default '#6b7a99',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index on spending_categories (user_id);
create trigger spending_categories_updated_at
  before update on spending_categories
  for each row execute procedure handle_updated_at();

alter table spending_categories enable row level security;
-- create policy "Own spending categories" on spending_categories for all using (user_id = auth.uid());
