-- =============================================================================
-- Migration:  003_reset_and_rebuild.sql
-- Project:    A Penny For Our Thoughts
-- Created:    May 2026 (HF-4 — DB reset after partial migration)
-- Purpose:    Full tear-down and rebuild of the entire schema.
--
--             Run this in the Supabase SQL Editor when:
--               • the "No migrations" message appears in the dashboard
--               • authenticated queries return unexpected errors
--               • you want a guaranteed-clean slate
--
--             Safe to run multiple times (all drops use IF EXISTS).
--             User data is not lost — the app will re-sync from localStorage
--             on the next sign-in (migration path in migrateLocalStorage.ts).
--
-- INSTRUCTIONS
--   1. Go to Supabase Dashboard → SQL Editor → New query
--   2. Paste the entire contents of this file
--   3. Click "Run"
--   4. Expect: "Success. No rows returned." for each statement
--   5. Reload the app — the spinner should clear and data should sync
-- =============================================================================


-- ─── Step 1: Drop everything in dependency order ────────────────────────────
-- (child tables / triggers before parent tables)

drop trigger if exists goals_updated_at               on goals;
drop trigger if exists net_worth_snapshots_updated_at on net_worth_snapshots;
drop trigger if exists assets_updated_at              on assets;
drop trigger if exists spending_categories_updated_at on spending_categories;
drop trigger if exists budget_alerts_updated_at       on budget_alerts;
drop trigger if exists rules_updated_at               on rules;
drop trigger if exists savings_accounts_updated_at    on savings_accounts;
drop trigger if exists wishlist_items_updated_at      on wishlist_items;
drop trigger if exists subscriptions_updated_at       on subscriptions;
drop trigger if exists credit_cards_updated_at        on credit_cards;
drop trigger if exists loans_updated_at               on loans;
drop trigger if exists spending_history_periods_updated_at on spending_history_periods;
drop trigger if exists purchases_updated_at           on purchases;
drop trigger if exists expense_items_updated_at       on expense_items;
drop trigger if exists expense_cards_updated_at       on expense_cards;
drop trigger if exists income_streams_updated_at      on income_streams;
drop trigger if exists profiles_updated_at            on profiles;
drop trigger if exists on_auth_user_created           on auth.users;

drop table if exists goals                     cascade;
drop table if exists net_worth_snapshots       cascade;
drop table if exists assets                    cascade;
drop table if exists spending_categories       cascade;
drop table if exists budget_alerts             cascade;
drop table if exists rules                     cascade;
drop table if exists savings_accounts          cascade;
drop table if exists wishlist_items            cascade;
drop table if exists subscriptions             cascade;
drop table if exists credit_cards              cascade;
drop table if exists loans                     cascade;
drop table if exists spending_history_items    cascade;
drop table if exists spending_history_periods  cascade;
drop table if exists purchases                 cascade;
drop table if exists expense_items             cascade;
drop table if exists expense_cards             cascade;
drop table if exists income_streams            cascade;
drop table if exists profiles                  cascade;

drop function if exists handle_updated_at()  cascade;
drop function if exists handle_new_user()    cascade;


-- ─── Step 2: Shared trigger function ────────────────────────────────────────

create or replace function handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


-- ─── Step 3: Auto-create profile on sign-up ─────────────────────────────────
-- Fires whenever a new row is inserted into auth.users (magic link,
-- Google OAuth, etc.).  Creates a matching profile row with default values
-- so the app never encounters a missing-profile edge case.

create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();


-- ─── Step 4: Recreate all tables ────────────────────────────────────────────

-- PROFILES
create table profiles (
  id                        uuid primary key references auth.users on delete cascade,
  allocation                jsonb not null default '{"needs":50,"wants":30,"savings":20}',
  budget_display_mode       jsonb not null default '{"needs":"monthly","wants":"monthly","savings":"monthly"}',
  pay_start                 date,
  funds_remaining           numeric(12,2) not null default 0,
  funds_remaining_updated   text not null default '',
  has_onboarded             boolean not null default false,
  dismissed_version         text,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);
create trigger profiles_updated_at
  before update on profiles
  for each row execute procedure handle_updated_at();
alter table profiles enable row level security;

-- INCOME STREAMS
create table income_streams (
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

-- EXPENSE CARDS
create table expense_cards (
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

-- EXPENSE ITEMS
create table expense_items (
  id               text primary key,
  user_id          uuid not null references auth.users on delete cascade,
  expense_card_id  text not null references expense_cards on delete cascade,
  name             text not null,
  amount           numeric(12,2) not null default 0,
  biweekly         boolean not null default false,
  due_day          smallint,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index on expense_items (user_id);
create index on expense_items (expense_card_id);
create trigger expense_items_updated_at
  before update on expense_items
  for each row execute procedure handle_updated_at();
alter table expense_items enable row level security;

-- PURCHASES
create table purchases (
  id           text primary key,
  user_id      uuid not null references auth.users on delete cascade,
  name         text not null,
  amount       numeric(12,2) not null default 0,
  category     text not null default 'other',
  card_id      text,
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

-- SPENDING HISTORY PERIODS
create table spending_history_periods (
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

-- SPENDING HISTORY ITEMS
create table spending_history_items (
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

-- LOANS
create table loans (
  id              text primary key,
  user_id         uuid not null references auth.users on delete cascade,
  name            text not null,
  remaining       numeric(12,2) not null default 0,
  original        numeric(12,2) not null default 0,
  payment_amount  numeric(12,2) not null default 0,
  frequency       text not null default 'monthly',
  date            text not null default '',
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

-- CREDIT CARDS
create table credit_cards (
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

-- SUBSCRIPTIONS
create table subscriptions (
  id           text primary key,
  user_id      uuid not null references auth.users on delete cascade,
  name         text not null,
  amount       numeric(12,2) not null default 0,
  frequency    text not null default 'monthly',
  date         date not null,
  category     text not null default 'other',
  budget_type  text not null default 'wants',
  card_id      text,
  days_of_week integer[] not null default '{}',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index on subscriptions (user_id);
create trigger subscriptions_updated_at
  before update on subscriptions
  for each row execute procedure handle_updated_at();
alter table subscriptions enable row level security;

-- WISHLIST ITEMS
create table wishlist_items (
  id          text primary key,
  user_id     uuid not null references auth.users on delete cascade,
  icon        text not null default '',
  name        text not null,
  url         text not null default '',
  -- RS-14: optional target price and amount saved toward it (null = not set)
  price       numeric(10, 2),
  saved       numeric(10, 2),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index on wishlist_items (user_id);
create trigger wishlist_items_updated_at
  before update on wishlist_items
  for each row execute procedure handle_updated_at();
alter table wishlist_items enable row level security;

-- SAVINGS ACCOUNTS
create table savings_accounts (
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

-- GOALS
create table goals (
  id             text primary key,
  user_id        uuid not null references auth.users on delete cascade,
  account_id     text not null references savings_accounts on delete cascade,
  target_amount  numeric(12,2) not null default 0,
  target_date    text not null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index on goals (user_id);
create trigger goals_updated_at
  before update on goals
  for each row execute procedure handle_updated_at();
alter table goals enable row level security;

-- ASSETS
create table assets (
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

-- NET WORTH SNAPSHOTS
create table net_worth_snapshots (
  id                  text primary key,
  user_id             uuid not null references auth.users on delete cascade,
  date                text not null,
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

-- RULES
create table rules (
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

-- BUDGET ALERTS
create table budget_alerts (
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

-- SPENDING CATEGORIES
create table spending_categories (
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


-- ─── Step 5: RLS policies ────────────────────────────────────────────────────

-- profiles (uses id = auth.uid() because id IS the user's UUID)
create policy "Users can read own profile"
  on profiles for select using (id = auth.uid());
create policy "Users can insert own profile"
  on profiles for insert with check (id = auth.uid());
create policy "Users can update own profile"
  on profiles for update using (id = auth.uid());
create policy "Users can delete own profile"
  on profiles for delete using (id = auth.uid());

-- all other tables use user_id = auth.uid()
create policy "Own income streams"          on income_streams          for all using (user_id = auth.uid());
create policy "Own expense cards"           on expense_cards           for all using (user_id = auth.uid());
create policy "Own expense items"           on expense_items           for all using (user_id = auth.uid());
create policy "Own purchases"               on purchases               for all using (user_id = auth.uid());
create policy "Own spending history periods" on spending_history_periods for all using (user_id = auth.uid());
create policy "Own spending history items"  on spending_history_items  for all using (user_id = auth.uid());
create policy "Own loans"                   on loans                   for all using (user_id = auth.uid());
create policy "Own credit cards"            on credit_cards            for all using (user_id = auth.uid());
create policy "Own subscriptions"           on subscriptions           for all using (user_id = auth.uid());
create policy "Own wishlist items"          on wishlist_items          for all using (user_id = auth.uid());
create policy "Own savings accounts"        on savings_accounts        for all using (user_id = auth.uid());
create policy "Own goals"                   on goals                   for all using (user_id = auth.uid());
create policy "Own assets"                  on assets                  for all using (user_id = auth.uid());
create policy "Own net worth snapshots"     on net_worth_snapshots     for all using (user_id = auth.uid());
create policy "Own rules"                   on rules                   for all using (user_id = auth.uid());
create policy "Own budget alerts"           on budget_alerts           for all using (user_id = auth.uid());
create policy "Own spending categories"     on spending_categories     for all using (user_id = auth.uid());


-- ─── Done ────────────────────────────────────────────────────────────────────
-- All 18 tables created, RLS enabled, policies in place, handle_new_user
-- trigger wired up. Reload the app and sign in — data will sync from
-- localStorage automatically via migrateIfNeeded() on first login.
