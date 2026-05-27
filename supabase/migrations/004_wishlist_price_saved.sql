-- Migration:  004_wishlist_price_saved.sql
-- Project:    A Penny For Our Thoughts
-- Created:    May 2026
-- Fixes:      BUG-023 — rs-14 added price/saved to WishlistItem but never
--             migrated the live wishlist_items table, causing every
--             db.wishlist.update() call to return HTTP 400:
--             "Could not find the 'price' column in the schema cache"
--
-- Safe to re-run: ADD COLUMN IF NOT EXISTS is idempotent.

alter table wishlist_items
  add column if not exists price  numeric(10, 2),
  add column if not exists saved  numeric(10, 2);

-- Refresh Supabase's PostgREST schema cache so the new columns are
-- immediately visible without a manual restart.
notify pgrst, 'reload schema';
