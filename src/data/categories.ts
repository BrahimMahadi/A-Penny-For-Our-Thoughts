/**
 * Module:   data/categories.ts
 * Project:  A Penny For Our Thoughts
 * Created:  May 2026 (Vue 3 migration — Sprint 1)
 * Summary:  Static category lists and palette. No state dependency.
 *           Ported from legacy analytics.js exports.
 */

import type { AssetCategoryMeta } from '@/types/budget';

/** Fixed category list used by the rules engine and UI dropdowns */
export const WANT_CATEGORIES = [
  'Food & Drink',
  'Groceries',
  'Entertainment',
  'Shopping',
  'Health & Fitness',
  'Transportation',
  'Other',
] as const;

/** Per-category display colour (hex) */
export const CATEGORY_COLOURS: Record<string, string> = {
  'Food & Drink':     '#ff8c42',
  'Groceries':        '#00d4aa',
  'Entertainment':    '#a78bfa',
  'Shopping':         '#60a5fa',
  'Health & Fitness': '#34d399',
  'Transportation':   '#fbbf24',
  'Other':            '#8b95ad',
};

/** Asset categories for the Net Worth tracker */
export const ASSET_CATEGORIES: ReadonlyArray<AssetCategoryMeta> = [
  { key: 'investment',  label: 'Investments', icon: '💰' },
  { key: 'real_estate', label: 'Real Estate', icon: '🏠' },
  { key: 'vehicle',     label: 'Vehicles',    icon: '🚗' },
  { key: 'other',       label: 'Other',       icon: '📦' },
];
