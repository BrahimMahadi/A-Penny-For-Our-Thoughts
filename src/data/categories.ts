/**
 * Module:   data/categories.ts
 * Project:  A Penny For Our Thoughts
 * Created:  May 2026 (Vue 3 migration — Sprint 1)
 * Updated:  May 2026 (Sprint 19) — user-editable categories; static lists
 *           now serve only as migration seeds.
 * Summary:  Static category lists and palette. No state dependency.
 *           Ported from legacy analytics.js exports.
 */

import type { AssetCategoryMeta, SpendingCategory } from '@/types/budget';

/**
 * Canonical seed list used to populate `state.spendingCategories` for
 * first-run and migration. Matches the previous hardcoded WANT_CATEGORIES.
 * Do not modify at runtime — use the budget store actions instead.
 */
export const DEFAULT_SPENDING_CATEGORIES: SpendingCategory[] = [
  { id: 'food-drink',      name: 'Food & Drink',     color: '#ff8c42' },
  { id: 'groceries',       name: 'Groceries',         color: '#00d4aa' },
  { id: 'entertainment',   name: 'Entertainment',     color: '#a78bfa' },
  { id: 'shopping',        name: 'Shopping',          color: '#60a5fa' },
  { id: 'health-fitness',  name: 'Health & Fitness',  color: '#34d399' },
  { id: 'transportation',  name: 'Transportation',    color: '#fbbf24' },
  { id: 'other',           name: 'Other',             color: '#8b95ad' },
];

/** Fallback colour for unknown category names */
export const CATEGORY_FALLBACK_COLOR = '#8b95ad';

/**
 * Display name used when a purchase/subscription has no category set.
 * Matches the built-in `'other'` category's `name`. Centralised (TECH-DEBT-1)
 * so the fallback label has one definition across the ~8 sites that used the
 * bare `'Other'` literal.
 */
export const FALLBACK_CATEGORY_NAME = 'Other';

/** Asset categories for the Net Worth tracker */
export const ASSET_CATEGORIES: ReadonlyArray<AssetCategoryMeta> = [
  { key: 'investment',  label: 'Investments', icon: '💰' },
  { key: 'real_estate', label: 'Real Estate', icon: '🏠' },
  { key: 'vehicle',     label: 'Vehicles',    icon: '🚗' },
  { key: 'other',       label: 'Other',       icon: '📦' },
];

/** Preset palette for the category color picker */
export const CATEGORY_COLOR_PRESETS: string[] = [
  '#ff8c42', // orange
  '#fbbf24', // amber
  '#34d399', // green
  '#00d4aa', // teal
  '#60a5fa', // blue
  '#a78bfa', // violet
  '#f472b6', // pink
  '#fb7185', // rose
  '#8b95ad', // muted grey
  '#e5c07b', // gold
];
