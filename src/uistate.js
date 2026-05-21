/* ═══════════════════════════════════════════════════════════════
   Module:   uistate.js
   Project:  A Penny For Our Thoughts
   Created:  May 2026
   Summary:  Shared mutable UI state used by both render.js and
             app.js. Exported as a single object so that mutations
             in one module are immediately visible in the other,
             avoiding a circular import dependency.
   Exports:  uiState
═══════════════════════════════════════════════════════════════ */

const _now = new Date();

/**
 * Shared UI state object.
 * Mutate properties directly — both app.js and render.js hold a
 * reference to the same object, so changes are instantly reflected.
 */
export const uiState = {
  /** Analytics date/keyword filter values */
  analyticsFilters: { startDate: '', endDate: '', search: '' },

  /** Schedule tab — currently-displayed month (1-based) */
  scheduleViewYear:  _now.getFullYear(),
  scheduleViewMonth: _now.getMonth() + 1,

  /** Schedule tab — 'list' | 'calendar' */
  scheduleView: 'list',
};
