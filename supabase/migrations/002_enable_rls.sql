-- ═══════════════════════════════════════════════════════════════════════════
-- Migration:  002_enable_rls.sql
-- Project:    A Penny For Our Thoughts
-- Created:    May 2026 (Sprint 25 — Supabase Auth)
-- Summary:    Enable Row Level Security policies on all tables.
--
--             Sprint 24 used a service-role key that bypasses RLS.
--             Now that real auth is in place (Sprint 25), the anon key is
--             used instead and each user may only access their own rows.
--
--             Policies follow a simple pattern:
--               - profiles:  auth.uid() = id
--               - all others: auth.uid() = user_id
--
-- To apply: run this script in the Supabase SQL editor
--           (Dashboard → SQL Editor → New query → paste → Run).
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── profiles ─────────────────────────────────────────────────────────────
create policy "Users can read own profile"
  on profiles for select using (id = auth.uid());

create policy "Users can insert own profile"
  on profiles for insert with check (id = auth.uid());

create policy "Users can update own profile"
  on profiles for update using (id = auth.uid());

create policy "Users can delete own profile"
  on profiles for delete using (id = auth.uid());

-- ─── income_streams ───────────────────────────────────────────────────────
create policy "Own income streams"
  on income_streams for all using (user_id = auth.uid());

-- ─── expense_cards ────────────────────────────────────────────────────────
create policy "Own expense cards"
  on expense_cards for all using (user_id = auth.uid());

-- ─── expense_items ────────────────────────────────────────────────────────
create policy "Own expense items"
  on expense_items for all using (user_id = auth.uid());

-- ─── purchases ────────────────────────────────────────────────────────────
create policy "Own purchases"
  on purchases for all using (user_id = auth.uid());

-- ─── spending_history_periods ─────────────────────────────────────────────
create policy "Own spending history periods"
  on spending_history_periods for all using (user_id = auth.uid());

-- ─── spending_history_items ───────────────────────────────────────────────
create policy "Own spending history items"
  on spending_history_items for all using (user_id = auth.uid());

-- ─── loans ────────────────────────────────────────────────────────────────
create policy "Own loans"
  on loans for all using (user_id = auth.uid());

-- ─── credit_cards ─────────────────────────────────────────────────────────
create policy "Own credit cards"
  on credit_cards for all using (user_id = auth.uid());

-- ─── subscriptions ────────────────────────────────────────────────────────
create policy "Own subscriptions"
  on subscriptions for all using (user_id = auth.uid());

-- ─── wishlist_items ───────────────────────────────────────────────────────
create policy "Own wishlist items"
  on wishlist_items for all using (user_id = auth.uid());

-- ─── savings_accounts ────────────────────────────────────────────────────
create policy "Own savings accounts"
  on savings_accounts for all using (user_id = auth.uid());

-- ─── goals ───────────────────────────────────────────────────────────────
create policy "Own goals"
  on goals for all using (user_id = auth.uid());

-- ─── assets ──────────────────────────────────────────────────────────────
create policy "Own assets"
  on assets for all using (user_id = auth.uid());

-- ─── net_worth_snapshots ─────────────────────────────────────────────────
create policy "Own net worth snapshots"
  on net_worth_snapshots for all using (user_id = auth.uid());

-- ─── rules ───────────────────────────────────────────────────────────────
create policy "Own rules"
  on rules for all using (user_id = auth.uid());

-- ─── budget_alerts ───────────────────────────────────────────────────────
create policy "Own budget alerts"
  on budget_alerts for all using (user_id = auth.uid());

-- ─── spending_categories ─────────────────────────────────────────────────
create policy "Own spending categories"
  on spending_categories for all using (user_id = auth.uid());
