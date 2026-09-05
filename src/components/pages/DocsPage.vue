<!--
  Module:   components/pages/DocsPage.vue
  Project:  A Penny For Our Thoughts
  Created:  May 2026 (Vue 3 migration — Sprint 7)
  Summary:  Documentation tab. Five sections: User Guide, Release Notes,
            FAQ, Privacy & Data, CSV Reference. Desktop sidebar nav +
            mobile dropdown. Content ported from index.legacy.html.
-->

<script setup lang="ts">
import { ref } from 'vue';

type DocSection = 'user-guide' | 'release-notes' | 'faq' | 'privacy' | 'csv-reference';

const activeSection = ref<DocSection>('user-guide');

const sections: { id: DocSection; label: string; icon: string }[] = [
  { id: 'user-guide',    label: 'User Guide',      icon: '📖' },
  { id: 'release-notes', label: 'Release Notes',   icon: '🚀' },
  { id: 'faq',           label: 'FAQ',             icon: '❓' },
  { id: 'privacy',       label: 'Privacy & Data',  icon: '🔒' },
  { id: 'csv-reference', label: 'CSV Reference',   icon: '📋' },
];

function goTo(id: DocSection): void {
  activeSection.value = id;
  // On mobile the dropdown closes after selection
  mobileOpen.value = false;
}

// Mobile dropdown
const mobileOpen = ref(false);
const activeLabel = () => sections.find(s => s.id === activeSection.value)?.label ?? '';
</script>

<template>
  <div class="page-docs">

    <!-- ── Page header ───────────────────────────────────────────── -->
    <div class="docs-page-header">
      <div class="docs-page-header__left">
        <div class="docs-eyebrow">Documentation</div>
        <h1 class="docs-page-title">How it works</h1>
      </div>
      <div class="docs-section-badge">
        <span
          class="docs-section-badge__icon"
          aria-hidden="true"
        >{{ sections.find(s => s.id === activeSection)?.icon }}</span>
        <span class="docs-section-badge__label">{{ sections.find(s => s.id === activeSection)?.label }}</span>
      </div>
    </div>

    <!-- ── Mobile section picker ──────────────────────────────────── -->
    <div class="docs-mobile-nav">
      <button
        class="docs-mobile-toggle"
        :aria-expanded="mobileOpen"
        @click="mobileOpen = !mobileOpen"
      >
        <span>{{ sections.find(s => s.id === activeSection)?.icon }} {{ activeLabel() }}</span>
        <span
          class="docs-mobile-toggle__chevron"
          :class="{ 'docs-mobile-toggle__chevron--open': mobileOpen }"
          aria-hidden="true"
        >›</span>
      </button>
      <div
        v-show="mobileOpen"
        class="docs-mobile-menu"
        role="menu"
      >
        <button
          v-for="s in sections"
          :key="s.id"
          class="docs-mobile-item"
          :class="{ 'docs-mobile-item--active': activeSection === s.id }"
          role="menuitem"
          @click="goTo(s.id)"
        >
          {{ s.icon }} {{ s.label }}
        </button>
      </div>
    </div>

    <!-- ── Layout ─────────────────────────────────────────────────── -->
    <div class="docs-layout">
      <!-- Desktop sidebar -->
      <nav
        class="docs-sidebar"
        aria-label="Documentation sections"
      >
        <button
          v-for="s in sections"
          :key="s.id"
          class="docs-nav-btn"
          :class="{ 'docs-nav-btn--active': activeSection === s.id }"
          @click="goTo(s.id)"
        >
          {{ s.icon }} {{ s.label }}
        </button>
      </nav>

      <!-- Content -->
      <div class="docs-content">
        <!-- ─── User Guide ─────────────────────────────────────── -->
        <section
          v-if="activeSection === 'user-guide'"
          class="docs-section"
        >
          <h2 class="docs-section-title">
            User Guide
          </h2>
          <p class="docs-intro">
            A Penny For Our Thoughts is a personal finance dashboard built on the 50/30/20 budget rule.
            Everything runs in your browser — no account, no server, no internet required after the first load.
          </p>

          <h3
            id="ug-income"
            class="docs-h3"
          >
            💰 Income Streams
          </h3>
          <p>Add every source of income under <strong>Income Streams</strong>. Each stream has a name, a monthly dollar amount, and an optional <em>bi-weekly</em> toggle for pay cheques received every two weeks.</p>
          <ul class="docs-list">
            <li>Click <strong>+ Add Stream</strong> to create a new income source.</li>
            <li>Enable <strong>Bi-wk</strong> for pay cheques — the app tracks spending against 2-week pay periods.</li>
            <li>The <strong>Monthly Income</strong> stat card updates instantly and drives all budget calculations.</li>
          </ul>

          <h3
            id="ug-allocation"
            class="docs-h3"
          >
            📊 Budget Allocation
          </h3>
          <p>The coloured bar below the income cards shows your 50/30/20 split. Click <strong>Edit %</strong> to adjust — percentages must always sum to 100%.</p>
          <ul class="docs-list">
            <li><strong>Needs</strong> — rent, groceries, utilities, insurance.</li>
            <li><strong>Wants</strong> — dining, entertainment, hobbies.</li>
            <li><strong>Savings</strong> — emergency fund, investments, retirement.</li>
          </ul>
          <p>The <strong>Budget vs. Actual</strong> panel shows how actual spending compares to each allocation this month, with green / amber / red status indicators.</p>

          <h3
            id="ug-wants"
            class="docs-h3"
          >
            🛍 Wants Tracker
          </h3>
          <p>Track discretionary spending against your Wants envelope. Each entry is a purchase with a name, amount, and category.</p>
          <ul class="docs-list">
            <li>The donut chart shows spending by category for the current bi-weekly period.</li>
            <li>Use <strong>Close Period</strong> to archive the current period and start fresh.</li>
            <li>The envelope resets based on your <strong>Pay Period Anchor</strong> date (set in Settings).</li>
            <li>If you have Transaction Rules, the category auto-fills as you type the purchase name.</li>
          </ul>

          <h3
            id="ug-expenses"
            class="docs-h3"
          >
            💳 Expense Cards
          </h3>
          <p>Model your fixed monthly bills by payment method. Each card (e.g. Visa, bank account) holds a list of expense items.</p>
          <ul class="docs-list">
            <li>Click <strong>+ Add Card</strong> to create a new payment method.</li>
            <li>Enable <strong>Bi-wk</strong> for expenses charged every two weeks.</li>
            <li>Set an optional <strong>Due Day</strong> (1–31) so items appear in the Recurring Schedule.</li>
          </ul>

          <h3
            id="ug-subscriptions"
            class="docs-h3"
          >
            🔄 Subscriptions
          </h3>
          <p>Track recurring services. Supported frequencies: weekly, bi-weekly, monthly, quarterly, yearly.</p>
          <ul class="docs-list">
            <li>Set <strong>Budget Type</strong> to Needs or Wants so the renewal counts against the right category.</li>
            <li>A renewal countdown chip shows days until the next renewal date.</li>
            <li>The <strong>⚠ No card</strong> chip flags subscriptions that aren't linked to a payment card.</li>
          </ul>

          <h3
            id="ug-savings"
            class="docs-h3"
          >
            🏦 Savings &amp; Goals
          </h3>
          <p>Track savings account balances and set targets for each account.</p>
          <ul class="docs-list">
            <li>Each account has a <strong>Balance</strong> and a <strong>Default Monthly Allocation</strong>.</li>
            <li>Click <strong>+ Add Goal</strong> to set a target amount and target month for an account.</li>
            <li>Goals show progress %, monthly savings needed, and on-track / caution / off-track status.</li>
          </ul>

          <h3
            id="ug-loans"
            class="docs-h3"
          >
            🏛 Loans &amp; Credit Cards
          </h3>
          <p>Track outstanding debt for visibility in your net worth calculation.</p>
          <ul class="docs-list">
            <li><strong>Loans:</strong> remaining balance, original amount, payment amount, and frequency.</li>
            <li><strong>Credit Cards:</strong> current balance and credit limit to track utilisation.</li>
            <li>Both feed into the Liabilities side of the Net Worth tracker automatically.</li>
          </ul>

          <h3
            id="ug-wishlist"
            class="docs-h3"
          >
            🎯 Wishlist
          </h3>
          <p>A simple list of items to save up for. Add an icon, name, and optional URL. Purely a reference list — no budget calculations.</p>

          <h3
            id="ug-networth"
            class="docs-h3"
          >
            📈 Net Worth
          </h3>
          <p>Your net worth is calculated automatically from your assets and liabilities.</p>
          <ul class="docs-list">
            <li><strong>Assets:</strong> savings balances (auto-listed), plus manual investments, property, vehicles, and other assets.</li>
            <li><strong>Liabilities:</strong> loan balances and credit card balances — pulled in automatically.</li>
            <li>A snapshot is recorded once per calendar month. Click <strong>Record Snapshot</strong> to save one manually.</li>
            <li>The Net Worth stat card shows a <strong>MoM delta chip</strong> — positive = green (wealth grew), negative = red.</li>
          </ul>

          <h3
            id="ug-goals-timeline"
            class="docs-h3"
          >
            🎯 Goals Timeline
          </h3>
          <p>The Goals Timeline card ranks all your savings goals and projects their completion dates based on current allocations.</p>
          <ul class="docs-list">
            <li>Each row shows: progress bar, target date, projected date, and months late (if behind).</li>
            <li>Active goals appear first (on-track → caution → off-track), then complete, then missed.</li>
            <li>A goal is "on-track" when your current monthly allocation ≥ the monthly savings needed to hit the target.</li>
          </ul>

          <h3
            id="ug-trend-chart"
            class="docs-h3"
          >
            📊 Spending Trend Chart
          </h3>
          <p>The 6-Month Spending Trend chart sits at the top of the dashboard and shows your macro spending picture at a glance.</p>
          <ul class="docs-list">
            <li>Stacked bars: Needs (red) / Wants (amber) / Savings (green) per calendar month.</li>
            <li>Dashed income reference line shows your total monthly income.</li>
            <li>Current month bars are full opacity; past months are dimmed.</li>
            <li>Hover any bar for a tooltip breakdown.</li>
          </ul>

          <h3
            id="ug-forecast"
            class="docs-h3"
          >
            📉 Envelope Forecast
          </h3>
          <p>Below the Wants Tracker progress bar, a colour-coded forecast chip projects your end-of-period spend at the current daily rate.</p>
          <ul class="docs-list">
            <li><strong>Green</strong> — on track (projected &lt; 90% of budget).</li>
            <li><strong>Amber</strong> — caution (projected 90–99% of budget).</li>
            <li><strong>Red</strong> — over budget projection (projected ≥ 100%).</li>
            <li>The chip only appears after at least one purchase has been logged in the current period.</li>
          </ul>

          <h3
            id="ug-schedule"
            class="docs-h3"
          >
            📅 Recurring Schedule
          </h3>
          <p>The Schedule tab shows a 6-month forecast and a calendar view of all bills with due dates. Toggle between List and Calendar views with the ☰ / ⊞ buttons. Click any of the 6 month cards to jump directly to that month.</p>

          <h3
            id="ug-rules"
            class="docs-h3"
          >
            ⚙️ Transaction Rules
          </h3>
          <p>Rules auto-categorise wants purchases as you type the name. Set them up in <strong>Settings → Transaction Rules</strong>. Three match modes:</p>
          <ul class="docs-list">
            <li><strong>Contains</strong> — name includes the pattern anywhere.</li>
            <li><strong>Starts with</strong> — name begins with the pattern.</li>
            <li><strong>Exact</strong> — name matches exactly.</li>
          </ul>
          <p>Rules are tested in order — first match wins. Use the live test field in Settings to verify your rules before saving.</p>

          <h3
            id="ug-onboarding"
            class="docs-h3"
          >
            👋 Onboarding &amp; What's New
          </h3>
          <p>First-time users see a 4-step guided wizard covering income, pay period, and budget split. Once completed or skipped, it never appears again.</p>
          <ul class="docs-list">
            <li>When a new app version ships, a dismissible <strong>What's New</strong> banner appears at the top of the dashboard.</li>
            <li>Click <strong>×</strong> to dismiss — it won't reappear until the next version.</li>
          </ul>

          <h3
            id="ug-csv"
            class="docs-h3"
          >
            📤 Import &amp; Export
          </h3>
          <p>All data can be exported to a single CSV file and re-imported later.</p>
          <ul class="docs-list">
            <li>Click <strong>⬆ Export</strong> in the header toolbar to download <code>penny-export.csv</code>.</li>
            <li>Click <strong>⬇ Import</strong> and select a <code>.csv</code> file to restore. <em>This replaces all current data.</em></li>
            <li>Keyboard shortcut: press <kbd>E</kbd> to export quickly.</li>
          </ul>
        </section>

        <!-- ─── Release Notes ──────────────────────────────────── -->
        <section
          v-else-if="activeSection === 'release-notes'"
          class="docs-section"
        >
          <h2 class="docs-section-title">
            Release Notes
          </h2>
          <p class="docs-intro">
            A record of every feature, fix, and improvement shipped to A Penny For Our Thoughts.
          </p>

          <!-- ════════════════════════════════════════════════════════════════
               RS-26 refresh: v1.19.0 through v2.17.0 entries added below.
               Order: newest first. The "Vivid Modern Redesign (v2.x)" heading
               marks the boundary between the late-v1 cleanup work and the
               v2.0+ ground-up redesign.
          ═══════════════════════════════════════════════════════════════════ -->

          <div class="release-block">
            <div class="release-header">
              <span class="release-version">v2.47.1</span>
              <span class="release-date">September 2026</span>
            </div>
            <p class="release-tagline">
              Mobile fixes — safe-area top inset, swipe navigation (BUG-039, BUG-040)
            </p>
            <ul class="docs-list">
              <li><strong>Content no longer sits under the status bar (BUG-040).</strong> v2.47.0 added <code>apple-mobile-web-app-status-bar-style: black-translucent</code>, which makes an installed PWA draw its web view underneath the status bar. The app had no <code>env(safe-area-inset-top)</code> rule anywhere, so the What&rsquo;s New banner ended up behind the clock and notch. <code>.app-main</code> now reserves the top inset, matching the bottom inset it already reserved for the home indicator.</li>
              <li><strong>Swipe no longer reaches tabs with no button (BUG-039).</strong> The swipe order and the bottom nav each declared their own tab list, and MOBILE-4&rsquo;s 5+More split made them disagree &mdash; swiping past Insights landed on Docs, which has no nav slot, so the bar showed no active tab. Both now read <code>src/lib/tabs.ts</code>, and swiping cycles only the five primary tabs.</li>
              <li><strong>Swiping a wide table scrolls the table (BUG-039).</strong> Measured on the Spending page at 375px, the purchases table is 480px wide inside a 296px viewport; swiping it sideways to read the right-hand columns switched tab instead of scrolling. The gesture now defers to any horizontally-scrollable region that still has room to travel, and only changes tab once that content reaches its end.</li>
              <li><strong>Swipe cooldown.</strong> A second flick arriving mid-transition is ignored for 350ms, so a bouncy gesture cannot skip a tab. Note the observer was verified <em>not</em> to multi-fire &mdash; one continuous drag has always advanced exactly one tab.</li>
              <li><strong>1573 tests across 54 spec files.</strong> Adds coverage for the shared tab order, the gesture gate, and the safe-area rules.</li>
            </ul>
          </div>

          <div class="release-block">
            <div class="release-header">
              <span class="release-version">v2.47.0</span>
              <span class="release-date">September 2026</span>
            </div>
            <p class="release-tagline">
              Mobile — installable PWA, monogram app icon, tactile feedback, contained overscroll (MOBILE-5)
            </p>
            <ul class="docs-list">
              <li><strong>Installable to the home screen.</strong> A web app manifest, an <code>apple-touch-icon</code> and theme-colour metas (one per colour scheme) make Penny installable. On iPhone use Share &rarr; Add to Home Screen; on Android an install prompt appears. It launches full-screen with no browser chrome. A minimal service worker ships alongside &mdash; Chrome will not offer installation without one &mdash; but it <em>deliberately does not cache</em>: the app remains online-only. Genuine offline support is tracked separately.</li>
              <li><strong>New app icon.</strong> A cent-sign monogram in JetBrains Mono on the brand violet gradient, replacing the 💸 emoji favicon. Shipped at 192/512/180/48px plus a maskable 512 variant, so Android crops it to its own shape without clipping the mark.</li>
              <li><strong>Tactile feedback.</strong> A new <code>v-press</code> directive gives the bottom nav tabs, the More button, overflow-sheet items and the floating section handle a quick scale-down on touch with a spring release &mdash; surfaces that previously had no press state at all, since touch has no <code>:hover</code>. Cancelled entirely under <code>prefers-reduced-motion</code>.</li>
              <li><strong>Contained overscroll.</strong> Scrolling a modal, the More sheet, or the page to its edge no longer chains to whatever is behind it, so an upward pull no longer fires the browser&rsquo;s pull-to-refresh mid-edit.</li>
              <li><strong>Modal scroll lock fixed (BUG-038).</strong> Reported during testing: with a modal open on a phone, scrolling still dragged the dashboard behind it. The lock had been setting <code>overflow: hidden</code> on the body &mdash; which desktop Chrome honours but iOS Safari ignores for touch scrolling, so it failed on exactly the devices where the bottom-sheet modal is used. The page is now pinned in place while a modal is open, and closing it returns you to the precise scroll position you left. (<code>overscroll-behavior</code> does not cover this: it stops scroll <em>chaining</em> out of an inner scroller, not the page scrolling underneath &mdash; two different problems.)</li>
              <li><strong>1552 tests across 53 spec files.</strong> Includes a PWA spec that guards every install path against the GitHub Pages base prefix &mdash; the failure mode there is silent: a root-relative path 404s in production and the install prompt simply never appears &mdash; plus the first-ever coverage of the modal scroll lock, whose absence is how BUG-038 shipped.</li>
            </ul>
          </div>

          <div class="release-block">
            <div class="release-header">
              <span class="release-version">v2.46.3</span>
              <span class="release-date">September 2026</span>
            </div>
            <p class="release-tagline">
              Test environment — Web Storage shim for Node 26 (BUG-037)
            </p>
            <ul class="docs-list">
              <li><strong>254 failing tests restored.</strong> Recent Node defines a global <code>localStorage</code> accessor that resolves to <code>undefined</code> unless the <code>--localstorage-file</code> flag is passed, but the property still exists on <code>globalThis</code> (measured: absent on v20/v22/v24, present on v26.5.1). Vitest 1.x only copies a jsdom window key onto the global when no global of that name is already defined, so jsdom&rsquo;s real Storage was never published and every <code>localStorage</code> call in a spec threw. 8 spec files and 254 tests failed on a codebase that had not changed.</li>
              <li><strong>Single-realm storage shim.</strong> <code>tests/setupStorage.ts</code> now runs first in <code>setupFiles</code> and republishes <code>localStorage</code>, <code>sessionStorage</code> and the <code>Storage</code> constructor together from one jsdom realm. Publishing them as a group matters: Node shadows only <code>localStorage</code>, so a per-key fix would leave the two stores in different realms and quietly break <code>vi.spyOn(Storage.prototype, …)</code> in the quota-handling specs.</li>
              <li><strong>Regression guard.</strong> <code>tests/setupStorage.spec.ts</code> asserts the globals exist, round-trip, stay separate, share a prototype with the <code>Storage</code> global, and remain interceptable by prototype spies &mdash; so a future Node or Vitest bump surfaces one diagnostic failure rather than hundreds of misleading app failures.</li>
              <li><strong>Node version pinned.</strong> CI and the deploy workflow both hard-coded Node 20 &mdash; end-of-life since 2026-04-30 &mdash; while local development had moved to Node 26. Six majors of drift is why CI stayed green through BUG-037. Both workflows now read <code>.nvmrc</code> (Node 24 Active LTS), and a second CI job runs the suite on Node Current so host-global regressions surface in CI instead of on a developer&rsquo;s machine.</li>
              <li><strong>1520 tests across 50 spec files.</strong> Verified green on Node 20, 22, 24 and 26. Test-infrastructure and CI only &mdash; no application, store, or schema changes.</li>
            </ul>
          </div>

          <div class="release-block">
            <div class="release-header">
              <span class="release-version">v2.46.2</span>
              <span class="release-date">June 2026</span>
            </div>
            <p class="release-tagline">
              Mobile — 5+More bottom nav, collapsible What's New banner, greeting truncation fix (MOBILE-4)
            </p>
            <ul class="docs-list">
              <li><strong>5+More bottom nav.</strong> The 7-tab bottom bar was too cramped on a 375px phone (~53px per tab, labels clipping). The nav now shows 5 primary tabs — Dashboard, Schedule, Spending, Goals, Insights — plus a "More ···" button that slides up a sheet with Docs and Settings. The More button adopts the accent colour and an indicator dot when an overflow tab is active.</li>
              <li><strong>Collapsible What's New banner.</strong> On mobile the release banner now collapses to a compact single-line bar (badge + chevron + dismiss button) on first render, saving ~80px of vertical space. Tap the bar to expand the release notes; tap ✕ to dismiss. On desktop the banner is always fully expanded as before.</li>
              <li><strong>Greeting truncation fix.</strong> The global <code>responsive.css</code> rule that applied <code>max-width: 140px; text-overflow: ellipsis</code> at ≤480px was targeting all <code>&lt;header&gt;</code> elements, silently clipping the Dashboard's "Welcome back, [Name]" greeting. A scoped override in DashboardPage now cancels that rule for <code>.dash-header__title</code>.</li>
              <li><strong>1509 tests across 48 spec files.</strong> Pure CSS and template refactor — no store or schema changes.</li>
            </ul>
          </div>

          <div class="release-block">
            <div class="release-header">
              <span class="release-version">v2.46.1</span>
              <span class="release-date">June 2026</span>
            </div>
            <p class="release-tagline">
              Mobile — iOS zoom fix, readable text floors, and a type-scale token system (MOBILE-3)
            </p>
            <ul class="docs-list">
              <li><strong>iOS auto-zoom eliminated.</strong> iOS Safari zooms the viewport whenever a focused input is smaller than 16px. All inputs, selects, and textareas now use a 16px minimum at ≤768px (previously 14px), so the page stays put when you tap any field.</li>
              <li><strong>Mobile text floor.</strong> Nothing on a phone-sized screen (≤480px) renders below 0.72rem (~11.5px) any more. The previous low was 0.55rem (8.8px — invisible) in chart axis labels. All 16 affected components received targeted media-query overrides.</li>
              <li><strong>Type-scale tokens.</strong> Seven new CSS custom properties — <code>--text-2xs</code> (0.65rem) through <code>--text-xl</code> (1.25rem) — are now available in <code>tokens.css</code> as a shared sizing vocabulary for future components.</li>
              <li><strong>1509 tests across 48 spec files.</strong> Pure CSS refactor — no store or template changes; the full suite passes unchanged.</li>
            </ul>
          </div>

          <div class="release-block">
            <div class="release-header">
              <span class="release-version">v2.46.0</span>
              <span class="release-date">June 2026</span>
            </div>
            <p class="release-tagline">
              New — switch light/dark theme from mobile (Settings + a header shortcut)
            </p>
            <ul class="docs-list">
              <li><strong>Appearance panel in Settings.</strong> A new “Appearance” card (top of Settings) with a Light / Dark pill — the canonical, discoverable home for the theme switch, reachable on any device. Previously the only toggles lived in the desktop sidebar and on the login screen, leaving no way to switch themes on a phone.</li>
              <li><strong>One-tap header button.</strong> A sun/moon icon in the Dashboard header flips the theme instantly (it shows the icon for the theme you’d switch <em>to</em>). On phones it sits top-right; the primary actions stack below it.</li>
              <li><strong>All in sync.</strong> The header icon, the Settings pill, the desktop sidebar pill, and the <code>T</code> keyboard shortcut all drive the same setting, which persists across reloads as before.</li>
              <li><strong>1509 tests across 48 spec files.</strong> 5 new tests cover the shared <code>ThemeToggle</code> in both its icon (toggle) and pill (explicit Light/Dark) forms.</li>
            </ul>
          </div>

          <div class="release-block">
            <div class="release-header">
              <span class="release-version">v2.45.4</span>
              <span class="release-date">June 2026</span>
            </div>
            <p class="release-tagline">
              Mobile — consolidated every responsive breakpoint onto one 3-tier system (MOBILE-2)
            </p>
            <ul class="docs-list">
              <li><strong>17 breakpoints → 3.</strong> The app had accumulated 17 different responsive breakpoint values (380, 420, 540, 600, 640, 700, 820, 860, 900, 1100, 1280…). Every one now snaps to the canonical <code>sm 480 / md 768 / lg 1024</code> tiers, so layouts reflow predictably at the same widths everywhere.</li>
              <li><strong>Internal cleanup.</strong> No intended change to how the app looks at any given screen width — this is groundwork that makes future mobile work faster and more consistent.</li>
              <li><strong>Verified across widths.</strong> No layout overflow on any tab at 375 / 480 / 600 / 700 / 768 / 900 / 1024 px; 1504 tests still green. (CSS-only — breakpoint behaviour isn’t measurable in jsdom, so verification was live.)</li>
            </ul>
          </div>

          <div class="release-block">
            <div class="release-header">
              <span class="release-version">v2.45.3</span>
              <span class="release-date">June 2026</span>
            </div>
            <p class="release-tagline">
              Mobile — bigger, friendlier touch targets (first of the mobile-optimization sprints)
            </p>
            <ul class="docs-list">
              <li><strong>44px buttons.</strong> Primary and secondary buttons now meet the 44px touch-target minimum (they were ~37px), and on phones the Dashboard’s “Log income / Add purchase” actions stack full-width for easy thumb reach.</li>
              <li><strong>Tactile feedback.</strong> Buttons, the type selector, and category chips give a subtle press animation when tapped (touch devices have no hover state), and the default grey tap-flash is suppressed. Respects “reduce motion”.</li>
              <li><strong>Bigger hit areas.</strong> The wants/needs toggle and category chips get larger tap zones on small screens.</li>
              <li><strong>Breakpoint foundation.</strong> Introduced a consistent 3-tier breakpoint system (sm 480 / md 768 / lg 1024) that future responsive work builds on. CSS-only sprint — verified live at 375px; no jsdom-measurable surface, so the suite holds at 1504 tests.</li>
            </ul>
          </div>

          <div class="release-block">
            <div class="release-header">
              <span class="release-version">v2.45.2</span>
              <span class="release-date">June 2026</span>
            </div>
            <p class="release-tagline">
              Dashboard — the hero card now shows how this pay period compares to the last
            </p>
            <ul class="docs-list">
              <li><strong>Period-over-period on the hero.</strong> The “Available to spend” card gained a small ↑/↓ chip comparing your spend so far to the previous pay period — for whichever bucket (wants/needs) the toggle is on.</li>
              <li><strong>Pace-adjusted, so it’s honest mid-period.</strong> It compares against last period’s spend <em>through the same elapsed day</em>, not its full total — so early in a period it doesn’t look falsely great (and late, falsely alarming).</li>
              <li><strong>Removed the separate “Wants/Needs spent” card.</strong> Once the comparison lives on the hero, that card just duplicated the hero’s bi-weekly figures, so it’s gone — leaving a cleaner 3-card KPI row.</li>
              <li><strong>1504 tests across 47 spec files.</strong> 10 new tests cover the pace math (elapsed-day tracking, bucket apportioning from the archived snapshot, legacy archives, empty/absent prior period) and the hero delta chip’s direction.</li>
            </ul>
          </div>

          <div class="release-block">
            <div class="release-header">
              <span class="release-version">v2.45.1</span>
              <span class="release-date">June 2026</span>
            </div>
            <p class="release-tagline">
              Bug fix — windfall &amp; wants/needs cards now reset correctly when the pay period rolls over
            </p>
            <ul class="docs-list">
              <li><strong>Windfall &amp; hero reset on rollover (BUG-035).</strong> When a new bi-weekly period started while the app was left open, the “Additional Income This Period” list and the hero “Available to spend” card kept showing the previous period’s data until a reload. They now self-heal the moment the calendar crosses the boundary, via a single reactive day-clock that every date-scoped value reads.</li>
              <li><strong>Correct wants/needs split (BUG-036).</strong> The monthly “Wants/Needs spent” card folded an entire closed period’s spend into <em>wants</em> — so a rolled-over period’s needs inflated your wants total (and needs were under-counted). Archived periods are now split by their per-bucket snapshot; older archives without one are apportioned by their saved budget ratio.</li>
              <li><strong>Clearer label.</strong> The Wants/Needs spent card is now tagged “this month”, so it’s never confused with the bi-weekly hero card above it.</li>
              <li><strong>1494 tests across 47 spec files.</strong> 15 new tests, including a period-boundary regression guard that crosses a rollover and asserts the windfall list empties, plus per-bucket accounting coverage (no cross-bucket bleed, legacy-archive split).</li>
            </ul>
          </div>

          <div class="release-block">
            <div class="release-header">
              <span class="release-version">v2.45.0</span>
              <span class="release-date">June 2026</span>
            </div>
            <p class="release-tagline">
              New — personalised dashboard greeting with your own name
            </p>
            <ul class="docs-list">
              <li><strong>Your name, your dashboard.</strong> The greeting at the top of the Dashboard now reads “Welcome back, {your name}” instead of a fixed name. New users are asked “What should we call you?” on the first onboarding step.</li>
              <li><strong>Editable in Settings.</strong> A new “Your Name” panel (top of the Settings page) lets anyone — including existing users who never saw onboarding — set, change, or clear their name at any time. Leave it blank for a simple “Welcome back”.</li>
              <li><strong>Syncs everywhere.</strong> The name is stored as a profile field and synced to the cloud alongside the rest of your data (migration <code>009</code>), so it persists across sign-out and follows you between devices.</li>
              <li><strong>1479 tests across 46 spec files.</strong> 23 new tests cover the store action (trim/cap/clear), DB round-trip, localStorage back-fill, onboarding capture (including the skip path), the Settings field, and the greeting fallback.</li>
            </ul>
          </div>

          <div class="release-block">
            <div class="release-header">
              <span class="release-version">v2.44.3</span>
              <span class="release-date">June 2026</span>
            </div>
            <p class="release-tagline">
              Bug fix — scroll-reveal cards no longer get stranded invisible after collapsing the widget row (BUG-034)
            </p>
            <ul class="docs-list">
              <li><strong>Root cause (BUG-034).</strong> GSAP ScrollTrigger caches trigger start/end positions at measurement time and only recalculates on <code>window.resize</code> — NOT on DOM height changes. Collapsing the Recurring Spend, Loan Payoff, or Savings Accounts cards above the Subscriptions row shrank the page, but the triggers kept the old positions. Cards could enter the viewport invisibly (stale <code>start</code> too far down), or exit instantly via a stale <code>onLeave</code> while still on-screen.</li>
              <li><strong>ResizeObserver + debounced refresh.</strong> <code>useScrollReveal</code> now observes <code>document.body</code> for height changes. Any collapse, expand, or async chart render fires <code>ScrollTrigger.refresh()</code> after a 150 ms debounce, recalculating all trigger positions with the true DOM state.</li>
              <li><strong>onRefresh self-heal.</strong> Every ScrollTrigger now has an <code>onRefresh</code> callback. After positions are recalculated, it snaps each element to the state matching its true scroll position: visible if currently in-viewport, faded-out if scrolled past, hidden if still below fold.</li>
              <li><strong>1456 tests across 46 spec files.</strong> 11 new tests cover ResizeObserver wiring, debounce (3 rapid events → 1 refresh), <code>onRefresh</code> in all 3 states (active / scrolled-past / below fold), and cleanup on unmount.</li>
            </ul>
          </div>

          <div class="release-block">
            <div class="release-header">
              <span class="release-version">v2.44.2</span>
              <span class="release-date">June 2026</span>
            </div>
            <p class="release-tagline">
              Chore — removed sprint demo files; demo cleanup added to mandatory release checklist
            </p>
            <ul class="docs-list">
              <li><strong>Demo file cleanup.</strong> Sprint demo HTML files (<code>demo-scrolltrigger-history.html</code>, <code>day-detail-comparison.html</code>, <code>filter-ui-comparison.html</code>, <code>section-nav-prototype.html</code>) were accumulating in the project root after their sprints shipped. All removed.</li>
              <li><strong>Release checklist updated.</strong> Deleting the sprint demo file is now item 8 in the mandatory deployment routine in <code>CLAUDE.md</code>, so demos are cleaned up automatically on every future merge.</li>
              <li><strong>No app changes.</strong> Pure housekeeping — 1445 tests, no behaviour change.</li>
            </ul>
          </div>

          <div class="release-block">
            <div class="release-header">
              <span class="release-version">v2.44.1</span>
              <span class="release-date">June 2026</span>
            </div>
            <p class="release-tagline">
              Bug fix — Dashboard donut and pay-period forecast now include the windfall income boost
            </p>
            <ul class="docs-list">
              <li><strong>Donut budget fixed (BUG-033).</strong> The Dashboard "Purchases This Period" donut computed its bi-weekly wants/needs budgets without the windfall (one-time income) boost, so it showed a smaller budget and a higher used-percentage than the Spending tab for the exact same period. Both tabs now use the identical formula.</li>
              <li><strong>Forecast fixed.</strong> <code>getEnvelopeForecast</code> — the engine behind the pay-period projection — had the same gap and could project "over budget" even when a windfall fully covered the extra spending. It now includes the current period's windfall wants boost.</li>
              <li><strong>Scope note.</strong> The Wishlist affordability hint and monthly-scope widgets (Recurring Spend, Subscriptions meter) intentionally keep the steady-state budget: a one-time windfall should not inflate future-period planning.</li>
              <li><strong>1445 tests across 46 spec files.</strong> 5 new regression tests pin the windfall math on the donut (wants + needs) and the forecast (current-period boost counted, prior-period windfall ignored).</li>
            </ul>
          </div>

          <div class="release-block">
            <div class="release-header">
              <span class="release-version">v2.44.0</span>
              <span class="release-date">June 2026</span>
            </div>
            <p class="release-tagline">
              GSAP ScrollTrigger scroll reveal — bidirectional fade-in animations for Dashboard and Spending tab
            </p>
            <ul class="docs-list">
              <li><strong>Dashboard scroll reveal.</strong> Every section below the fold fades and rises from 24 px as it enters the viewport, using a springy <code>back.out</code> ease. The hero KPI card and stat tiles animate immediately on mount (no scroll required).</li>
              <li><strong>Bidirectional fade-out.</strong> Sections also fade out as they leave the viewport — upward exit on top, downward exit on bottom — so the dashboard always feels alive while you scroll.</li>
              <li><strong>Spending tab slide-in.</strong> Charts row and purchases card slide in from the right (48 px X offset), giving the history view a distinct horizontal feel separate from the vertical dashboard flow.</li>
              <li><strong>Reduced-motion safe.</strong> All scroll animations are completely skipped when <code>prefers-reduced-motion: reduce</code> is active in the OS/browser accessibility settings.</li>
              <li><strong>1440 tests across 46 spec files.</strong> New <code>useScrollReveal.spec.ts</code> adds 23 tests covering the composable API, config overrides, callbacks, and cleanup.</li>
            </ul>
          </div>

          <div class="release-block">
            <div class="release-header">
              <span class="release-version">v2.43.0</span>
              <span class="release-date">June 2026</span>
            </div>
            <p class="release-tagline">
              GSAP Observer swipe navigation — dual-axis tab transitions for desktop and mobile
            </p>
            <ul class="docs-list">
              <li><strong>Swipe to navigate on mobile.</strong> Swipe left or right on the content area to move between tabs. GSAP Observer replaces the previous raw touch-event listener with built-in tolerance, axis-locking, and a 40 px drag minimum — diagonal gestures and micro-movements no longer trigger accidental switches.</li>
              <li><strong>Vertical slide on desktop.</strong> Clicking a sidebar tab now animates vertically (up/down) to match the sidebar's layout axis. Clicking a tab below the current one brings the new page in from below; clicking above brings it in from the top.</li>
              <li><strong>Horizontal slide on mobile.</strong> All mobile navigation — swipe gestures and BottomNav taps — uses the existing left/right slide so the motion matches the gesture direction.</li>
              <li><strong>Timing tuned to 0.28 s / 52 px.</strong> Matches the values approved in the interactive demo before implementation.</li>
              <li><strong>1417 tests across 45 spec files.</strong></li>
            </ul>
          </div>

          <div class="release-block">
            <div class="release-header">
              <span class="release-version">v2.42.0</span>
              <span class="release-date">June 2026</span>
            </div>
            <p class="release-tagline">
              GSAP Flip purchase animations — smooth add and delete transitions in the Spending tab
            </p>
            <ul class="docs-list">
              <li><strong>New purchase flies in.</strong> When you add a purchase from the Spending tab modal, the modal closes and the new row flies down from above while existing rows ripple to make room — powered by GSAP Flip's layout-state snapshot.</li>
              <li><strong>Delete animates out.</strong> Clicking Delete in the edit modal closes the modal first, then the row fades and shrinks out before the remaining rows close the gap with a staggered Flip animation.</li>
              <li><strong>Dashboard quick-add pulse.</strong> After logging a purchase from the "Log a purchase" hero button, the "Available to Spend" amount briefly pulses to confirm the balance has updated.</li>
              <li><strong>Reduced-motion respected.</strong> All three animations are instant snaps when the OS has reduced motion enabled — no duration, no stagger.</li>
              <li><strong>1407 tests across 44 spec files.</strong></li>
            </ul>
          </div>

          <div class="release-block">
            <div class="release-header">
              <span class="release-version">v2.41.0</span>
              <span class="release-date">June 2026</span>
            </div>
            <p class="release-tagline">
              Drag-to-reorder income streams with GSAP Draggable + Flip
            </p>
            <ul class="docs-list">
              <li><strong>Income streams are now reorderable.</strong> A grip handle (⠿) appears on the left of each income-stream row — always visible on mobile, hover-reveal on desktop. Drag any row up or down and the rest of the list flows to its new position using GSAP Flip's layout-state animation.</li>
              <li><strong>Order persists to the cloud.</strong> The chosen stream order is stored in <code>profiles.income_stream_order</code> in Supabase so it survives sign-out and is restored correctly on any device. No separate entity table is needed — this qualifies as a scalar config field (profiles table exemption).</li>
              <li><strong>Reduced-motion respected.</strong> When the OS has reduced-motion enabled, the drag gesture still works but the Flip animation plays at duration 0 — items snap to their new positions without animation.</li>
              <li><strong>New <code>useDraggableList</code> composable.</strong> Encapsulates Draggable init, drop-indicator positioning, Flip snapshot/from logic, and lifecycle cleanup. Exported <code>reinit()</code> function lets callers rebuild instances after list-data changes.</li>
              <li><strong>1407 tests across 44 spec files.</strong></li>
            </ul>
          </div>

          <div class="release-block">
            <div class="release-header">
              <span class="release-version">v2.39.1</span>
              <span class="release-date">June 2026</span>
            </div>
            <p class="release-tagline">
              Database Sync Policy + automated coverage test for all persisted entities
            </p>
            <ul class="docs-list">
              <li><strong>Database Sync Policy added to CLAUDE.md.</strong> A new mandatory section defines a 6-item checklist (migration file, database types, db helpers, store wiring, migration import, RPC update) that must be completed whenever a persisted store entity is added, changed, or removed. Skipping any step causes the same class of data-loss bug as the windfall income oversight in v2.38.x.</li>
              <li><strong>New <code>tests/lib/db-coverage.spec.ts</code>.</strong> 35 new tests act as an automated tripwire: every entity in the canonical <code>ALL_DB_ENTITY_KEYS</code> list is checked for presence on the <code>db</code> object and for the expected CRUD methods. A sentinel "total count" test means you cannot add or remove an entity without deliberately updating the spec — CI catches the gap before merge.</li>
              <li><strong>Non-standard shapes documented.</strong> <code>spendingHistory</code> (<code>insertPeriod / deletePeriod</code>) and <code>netWorthHistory</code> (insert-only snapshots) each have dedicated assertions so their intentional deviations from standard CRUD are explicit and guarded.</li>
              <li><strong>1393 tests across 43 spec files.</strong></li>
            </ul>
          </div>

          <div class="release-block">
            <div class="release-header">
              <span class="release-version">v2.39.0</span>
              <span class="release-date">June 2026</span>
            </div>
            <p class="release-tagline">
              Windfall income now persists to the cloud across sign-out/sign-in
            </p>
            <ul class="docs-list">
              <li><strong>One-time income saved to Supabase.</strong> Windfall / one-time income entries are now written to a new <code>one_time_incomes</code> table in the database. They were previously only stored in <code>localStorage</code>, so they were lost on sign-out or on any new device.</li>
              <li><strong>Full CRUD synced.</strong> Adding, editing, and deleting a windfall income entry all fire fire-and-forget Supabase writes (same pattern as purchases, subscriptions, etc.). On next sign-in the entries are loaded back via the <code>fetch_user_data</code> RPC alongside all other user data.</li>
              <li><strong>Import/export covered.</strong> The JSON import migration path (<code>runMigration</code>) and full-reset delete path (<code>deleteAllUserData</code>) both include <code>one_time_incomes</code>, so data integrity is maintained across all state-management flows.</li>
            </ul>
          </div>

          <div class="release-block">
            <div class="release-header">
              <span class="release-version">v2.38.1</span>
              <span class="release-date">June 2026</span>
            </div>
            <p class="release-tagline">
              Bug fix — Subscriptions category filter no longer misplaces items
            </p>
            <ul class="docs-list">
              <li><strong>Subscriptions filter fixed.</strong> Switching category filters in the Subscriptions section no longer causes items to appear far below empty space or stay invisible. Leaving items are now pinned with <code>position: absolute</code> during their exit animation so they are taken out of the document flow immediately — entering items render at the top of the list where they belong.</li>
              <li><strong>Rapid switching safe.</strong> Interrupting an in-flight enter or leave animation (e.g. clicking filters quickly) no longer leaves items stuck at partial opacity — in-progress tweens are killed before each new animation starts, and stale inline styles are cleared on re-enter.</li>
            </ul>
          </div>

          <div class="release-block">
            <div class="release-header">
              <span class="release-version">v2.38.0</span>
              <span class="release-date">June 2026</span>
            </div>
            <p class="release-tagline">
              GSAP Flip — sliding pill indicators on all toggles
            </p>
            <ul class="docs-list">
              <li><strong>Sliding pill indicators everywhere.</strong> The sidebar nav bar, theme switcher, Dashboard hero Wants/Needs toggle, Schedule view toggle, and Spending donut toggle all animate with a smooth GSAP Flip sliding pill — the background moves with the active state rather than crossfading.</li>
              <li><strong>Chip bounce &amp; row stagger.</strong> Clicking any type or category filter chip in the Spending tab triggers a back.out spring bounce. Changing filters stagger-fades the table rows in.</li>
              <li><strong>Reduced-motion safe.</strong> All indicators snap instantly when <code>prefers-reduced-motion: reduce</code> is set in the OS — no animation at all, just immediate repositioning.</li>
              <li><strong>Shared composable.</strong> A new <code>useFlipIndicator</code> composable drives every indicator — one source of truth for axis modes, easing, and reveal-on-mount logic.</li>
            </ul>
          </div>

          <div class="release-block">
            <div class="release-header">
              <span class="release-version">v2.37.0</span>
              <span class="release-date">June 2026</span>
            </div>
            <p class="release-tagline">
              One-time income — windfall budget boosts
            </p>
            <ul class="docs-list">
              <li><strong>Log windfall income for the current period.</strong> Use the new "Log income" button on the Dashboard (or the Windfall Income panel in Settings) to record e-transfers, gifts, bonuses, freelance payments, refunds, and sales. Each entry carries a proportional 50/30/20 allocation split by default — fully adjustable per bucket, locked to sum to 100%.</li>
              <li><strong>Budget envelopes update automatically.</strong> The needs/wants/savings bi-weekly envelopes on the Dashboard hero and Spending tab both reflect the windfall boost, so "remaining" figures are always accurate. The add-purchase preview also accounts for windfall income.</li>
              <li><strong>Dashboard callout.</strong> When windfall income is logged, a green "+$X windfall this period" pill appears beneath the hero spending caption.</li>
              <li><strong>Income This Period section.</strong> The Spending tab shows a collapsible card listing current-period windfall entries with allocation chips, date, type badge, and edit/delete controls.</li>
              <li><strong>39 new tests</strong> covering store actions, getters, allocation math, modal seeding/validation, and the section list component (1354 total).</li>
            </ul>
          </div>

          <div class="release-block">
            <div class="release-header">
              <span class="release-version">v2.36.0</span>
              <span class="release-date">June 2026</span>
            </div>
            <p class="release-tagline">
              TECH-DEBT-1 (Phase 3) + code-health cleanup
            </p>
            <ul class="docs-list">
              <li><strong>Finished the hard-coded-values sweep (Phase 3).</strong> The budget-type default ("Wants" for new / legacy-migrated / CSV-imported items) is now a single shared <code>DEFAULT_BUDGET_TYPE</code> constant in <code>constants/budget.ts</code>, with a guard test. Per the Phase-3 scoping decision, type-safe comparison literals and CSS-var colour fallbacks were intentionally left inline.</li>
              <li><strong>Code-health cleanup (fallow).</strong> Ran a static-analysis pass and removed dead weight: unused exports demoted/deleted (<code>CATEGORY_COLOURS</code>, <code>WANT_CATEGORIES</code>, <code>SECTION_GROUPS</code>, the legacy imperative <code>showToast</code> helper), an unused runtime dependency (<code>date-fns</code>), and a stale <code>design_handoff_schedule_spending/</code> design-mockup folder. Pure housekeeping — no behaviour change, full suite still green.</li>
            </ul>
          </div>

          <div class="release-block">
            <div class="release-header">
              <span class="release-version">v2.35.0</span>
              <span class="release-date">June 2026</span>
            </div>
            <p class="release-tagline">
              TECH-DEBT-1 (Phase 2) — Frequency maps &amp; status thresholds
            </p>
            <ul class="docs-list">
              <li><strong>Consolidated the recurring-frequency rate maps and the status thresholds.</strong> Phase 2 adds <code>src/constants/frequency.ts</code> (<code>MO_RATE</code>, <code>YR_RATE</code>, <code>FREQ_LABEL</code>, <code>FREQ_DISPLAY</code>, and the weekday-occurrence helpers used to cost <code>custom-days</code> subscriptions). The per-frequency cost maths previously lived inline in <code>Subscriptions.vue</code>, with <code>Loans.vue</code> keeping its own partial copy of the display labels — now both share one source. Status thresholds also moved into <code>constants/budget.ts</code>: <code>VARIANCE_OVER_PCT</code> / <code>VARIANCE_CAUTION_PCT</code> (category variance), <code>ENVELOPE_CAUTION_RATIO</code> (the bi-weekly forecast's 90% caution line), and <code>SUB_BUDGET_OVER_PCT</code> / <code>SUB_BUDGET_CAUTION_PCT</code> (the subscription budget bar's 60/30 cutoffs). Pure refactor — no behaviour change. 5 new guard tests (annual≈12×monthly, threshold ordering, variance status derivation). Phase 3 (budget-type constants + chart-palette hex) follows.</li>
            </ul>
          </div>

          <div class="release-block">
            <div class="release-header">
              <span class="release-version">v2.34.0</span>
              <span class="release-date">June 2026</span>
            </div>
            <p class="release-tagline">
              TECH-DEBT-1 (Phase 1) — Single-source-of-truth constants
            </p>
            <ul class="docs-list">
              <li><strong>Centralised the core hard-coded values that caused recent drift bugs.</strong> Phase 1 of the hard-coded-values sweep introduces <code>src/constants/budget.ts</code> (<code>PERIOD_DAYS</code>, <code>PERIOD_WEEKS</code>, <code>DEFAULT_ALLOCATION</code>) and <code>src/constants/datetime.ts</code> (shared <code>MONTHS_SHORT</code> / <code>DOW_FULL</code> / <code>DOW_SHORT</code> / <code>DOW_MINI</code>), plus a <code>FALLBACK_CATEGORY_NAME</code> export in <code>data/categories.ts</code>. The bi-weekly period length (previously a bare <code>14</code> scattered across the store and calculations), the 50/30/20 default split (3 copies in the store), the month/weekday label arrays (duplicated across three components), and the <code>'Other'</code> category fallback (~20 literals across 7 files) now each have one definition. Pure refactor — no behaviour change. 7 guard tests lock the canonical values and assert consumers derive from them so the drift can't silently return. Phases 2 (frequency rate maps + status thresholds) and 3 (budget-type constants + chart-palette hex) follow.</li>
            </ul>
          </div>

          <div class="release-block">
            <div class="release-header">
              <span class="release-version">v2.33.0</span>
              <span class="release-date">June 2026</span>
            </div>
            <p class="release-tagline">
              BUG-032 — Subscriptions roll forward to their next renewal date
            </p>
            <ul class="docs-list">
              <li><strong>BUG-032 fixed: subscriptions no longer show "Expired".</strong> <code>Subscription.date</code> is a stored <em>anchor</em> date. Once it passed, the card read it raw — <code>daysUntil(sub.date)</code> went negative, so the chip showed "Expired" and the date line stayed stuck on a past date, even though the subscription is recurring. All budget/forecast maths were already correct (they recompute occurrences from the anchor), so this was a display-only bug. Fix: the card now derives the next renewal via <code>getNextRenewal(sub)</code> (anchor untouched). The chip shows "Today" on the due date or an <em>Nd</em> countdown otherwise; the date line shows "Due today" or "Renews {next date}"; the renewal-alert banner and the renewal sort use the derived date; and the Edit modal pre-fills the upcoming renewal date instead of a stale anchor. Recurring subscriptions never display "Expired" again. <code>custom-days</code> subs are unaffected (they show their weekday pattern).</li>
            </ul>
          </div>

          <div class="release-block">
            <div class="release-header">
              <span class="release-version">v2.32.0</span>
              <span class="release-date">June 2026</span>
            </div>
            <p class="release-tagline">
              RS-33 — Period-scoped date picker in the Add/Edit Purchase modal
            </p>
            <ul class="docs-list">
              <li><strong>The Add/Edit Purchase date picker is now constrained to the displayed pay period.</strong> The <code>&lt;input type="date"&gt;</code> now carries <code>min</code> / <code>max</code> bound to the current period window (<code>periodStart</code> → <code>periodEnd</code>). This prevents dating a purchase outside any visible period — the underlying cause of the BUG-023 / BUG-024 / BUG-026 family, where out-of-period rows inflated totals or vanished from the period-scoped views. Future dates <em>within</em> the current period are still allowed (e.g. a charge you know is coming later this fortnight).</li>
              <li><strong>"+ Add" is disabled outside the current period.</strong> Purchases can only be added to the period in progress. When you navigate to a past or upcoming period via the Prev / Next buttons, the Add button is disabled and a hint appears with a one-click link back to the current period. Editing existing purchases still works in any displayed period, scoped to that period's window.</li>
              <li><strong>Save-time guard.</strong> <code>savePurchase</code> re-checks the date against the period window before committing, so the constraint holds even if the native <code>min</code> / <code>max</code> is bypassed by manual keyboard entry. An out-of-range date shows a clear error toast and blocks the save.</li>
              <li><strong>5 new regression tests</strong> covering the date bounds, future-within-period allowance, the disabled state + hint, the hint's return-to-current link, and the save-time guard.</li>
            </ul>
          </div>

          <div class="release-block">
            <div class="release-header">
              <span class="release-version">v2.31.0</span>
              <span class="release-date">June 2026</span>
            </div>
            <p class="release-tagline">
              BUG-031 — Amount column header alignment
            </p>
            <ul class="docs-list">
              <li><strong>BUG-031 fixed: the "Amount" column header now right-aligns with its values.</strong> In the All Purchases table the amount cells (<code>.col-amt</code>) are right-aligned for currency, but the header <code>&lt;th&gt;</code> stayed left-aligned because the global <code>.purchases-table thead th { text-align: left }</code> rule (specificity 0,1,2) outweighed the <code>.col-amt</code> class (0,1,0). Added a higher-specificity <code>.purchases-table thead th.col-amt { text-align: right }</code> rule so the header lines up with the numbers below it.</li>
            </ul>
          </div>

          <div class="release-block">
            <div class="release-header">
              <span class="release-version">v2.30.0</span>
              <span class="release-date">June 2026</span>
            </div>
            <p class="release-tagline">
              BUG-030 — Spending KPIs now follow the Wants / Needs toggle
            </p>
            <ul class="docs-list">
              <li><strong>BUG-030 fixed: "Daily average" and "Top category" tiles now respect the Spent This Period toggle.</strong> The Spending tab's top KPI row has a Wants / Needs toggle on the "Spent this period" card. The "Spent this period" value already followed the toggle, but "Daily average" and "Top category" were hard-wired to all-types figures: <code>dailyAvg</code> divided <code>totalSpentInPeriod</code> (every purchase regardless of type) and <code>topCategoryInfo</code> ran <code>getCategorySpending</code> over all period purchases. Fix: both now source from <code>donutPurchases</code> / <code>wantsSpentInPeriod</code> (the active-type data), so all three KPIs update together when the toggle flips. <code>Days left</code> is intentionally type-independent (it's a period property) and was left unchanged.</li>
            </ul>
          </div>

          <div class="release-block">
            <div class="release-header">
              <span class="release-version">v2.29.0</span>
              <span class="release-date">June 2026</span>
            </div>
            <p class="release-tagline">
              BUG-029 — Same-day purchase sort order now reflects insertion order
            </p>
            <ul class="docs-list">
              <li><strong>BUG-029 fixed: most-recently-added purchase now appears first when multiple purchases share the same date.</strong> The "Newest first" sort in the Spending tab compared purchases by ISO date string only. When two purchases had the same calendar date, the tiebreaker was undefined — the browser's sort left them in whatever internal order it chose, which often put older purchases above newer ones (since PostgreSQL returns same-date rows in heap order, meaning older rows come first). Fix: <code>applySort</code> now pre-computes each purchase's position in the source array and uses that as a stable tiebreaker. A later position means the purchase was added more recently, so it wins the "newest first" tie. The <code>allDatedRows</code> computation (which merges purchases with virtual subscription/loan rows) relies on ECMAScript's guaranteed stable sort to propagate this order correctly without a second tiebreaker pass.</li>
            </ul>
          </div>

          <div class="release-block">
            <div class="release-header">
              <span class="release-version">v2.28.0</span>
              <span class="release-date">June 2026</span>
            </div>
            <p class="release-tagline">
              BUG-028 — Transaction rules now apply in the Dashboard quick-add modal
            </p>
            <ul class="docs-list">
              <li><strong>BUG-028 fixed: transaction rules auto-categorise in the Dashboard quick-add modal.</strong> The "Log a purchase" modal on the Dashboard was missing the same <code>watch</code> on the name field that the Spending tab's Add Purchase form already had. As a result, typing a purchase name that matched a configured rule (Settings → Rules Engine) had no effect — the category pill stayed on the default and had to be changed manually. Fix: added a <code>watch(quickAddName, ...)</code> that calls <code>applyRulesToName</code> and updates <code>quickAddCategory</code> when a match is found, causing the corresponding pill to highlight automatically. The user can still tap any other pill to override the rule.</li>
            </ul>
          </div>

          <div class="release-block">
            <div class="release-header">
              <span class="release-version">v2.27.0</span>
              <span class="release-date">June 2026</span>
            </div>
            <p class="release-tagline">
              BUG-027 — Category Manager label layout fix
            </p>
            <ul class="docs-list">
              <li><strong>BUG-027 fixed: "Name" label now stacks above the input in the Add/Edit Category modal.</strong> <code>CategoryManager.vue</code> was the only section component that used the shared <code>.form-group</code> / <code>.form-label</code> / <code>.form-input</code> CSS classes without defining them in its own <code>&lt;style scoped&gt;</code> block. Without those rules, the browser rendered the label inline beside the input (default flow layout) instead of stacked above it. Every other section form in the app — CreditCards, Loans, Subscriptions, IncomeStreams, Savings, SavingsGoals, Wishlist, NetWorth, ExpenseCards — already had the correct <code>display: flex; flex-direction: column</code> definition. The fix adds the same standard block to CategoryManager.</li>
            </ul>
          </div>

          <div class="release-block">
            <div class="release-header">
              <span class="release-version">v2.26.0</span>
              <span class="release-date">June 2026</span>
            </div>
            <p class="release-tagline">
              BUG-026 — Unfiltered purchases sweep: period-scoped data in all financial calculations
            </p>
            <ul class="docs-list">
              <li><strong>Spending tab "Add Purchase" preview fixed.</strong> The "Bi-weekly remaining after" preview in the Add Purchase modal was using <code>budget.purchases</code> (the raw store array, no date filter) instead of the current period's purchases. Any stale cross-period rows still in the array caused the preview to show a wildly negative balance like <code>-$364.53 OVER BUDGET</code> even with no amount entered. Fix: the preview now uses a dedicated <code>currentPeriodPurchasesForPreview</code> computed (always offset=0) so it reflects the true current envelope regardless of which historical period is displayed in the table. It also now subtracts subscription and loan deductions for the wants envelope, matching the DashboardPage quick-add behaviour exactly.</li>
              <li><strong>Full app sweep — six additional locations fixed.</strong> The same unfiltered-<code>state.purchases</code> pattern was found and fixed across <code>calculations.ts</code>: (1) <code>getEnvelopeForecast</code> — the bi-weekly spending forecast now only counts purchases within the current period window, so stale rows no longer inflate the projected overage. (2) <code>getTriggeredAlerts</code> — budget alerts now fire based on current-period category spending, not all-time spending; the function signature now accepts <code>payStart</code> for the period boundary. (3) <code>calculateActualNeeds</code> and (4) <code>calculateActualWants</code> — monthly actual calculations now filter purchases to the current calendar month, preventing double-counting when the live array contains entries from a previous month. (5) <code>getWantsCategoryActuals</code> — the category analytics breakdown for the current month now month-filters purchases. (6) <code>getMonthlyWantsHistory</code> — the 6-month trend chart's "current month" bucket now filters purchases by month prefix.</li>
              <li><strong>6 new regression tests.</strong> Each covers the stale-data scenario: SpendingPage preview shows positive remaining when stale purchases exist; <code>getEnvelopeForecast</code> ignores out-of-period purchases; <code>getTriggeredAlerts</code> does not fire on stale data; <code>getWantsCategoryActuals</code> excludes prior-month purchases. All existing tests updated to carry dates that match the function's "today" parameter so they remain correct under the new filters.</li>
            </ul>
          </div>

          <div class="release-block">
            <div class="release-header">
              <span class="release-version">v2.25.0</span>
              <span class="release-date">June 2026</span>
            </div>
            <p class="release-tagline">
              RS-32 — Subscriptions &amp; loans in the period view (Spending tab + Dashboard donut)
            </p>
            <ul class="docs-list">
              <li><strong>Subscriptions and loan payments now appear in the Spending tab table.</strong> Every subscription renewal and loan payment that falls within the displayed pay period appears as a read-only row on its exact date, sorted alongside manually-logged purchases. These "virtual" rows are never stored as <code>Purchase</code> objects so they have no effect on archiving, DB sync, or rollover logic. They display a teal <strong>Sub</strong> or amber <strong>Loan</strong> badge instead of the Want/Need badge, and are not clickable (they're managed via the Subscriptions and Loans sections instead).</li>
              <li><strong>"Purchases This Period" donut now shows Subscriptions and Loans rows separately.</strong> The old single "Auto-deducted" row has been replaced with two distinct rows — one for subscriptions and one for loans. Both now work for the Needs envelope as well as Wants: parking, car insurance, and other needs-type recurring items are correctly reflected when the Needs toggle is active. The period window uses <code>min(today, periodEnd)</code> so only items that have already occurred are counted.</li>
              <li><strong>Period total includes virtual rows.</strong> The <code>X of Y · $total</code> count in the Spending tab and the <code>filteredAmountTotal</code> both include subscription and loan rows so the figure represents the full money drawn from each envelope.</li>
              <li><strong>Two new generic calculation helpers.</strong> <code>getSubsInWindow(state, start, end, budgetType)</code> and <code>getLoansInWindow(state, start, end, budgetType)</code> replace the type-locked per-function approach and work for any period offset and any budget type.</li>
              <li><strong>18 new regression tests.</strong> 8 tests for the new calculation helpers (wants/needs filtering, window edge cases, multi-renewal expansion), 3 for the updated dashboard donut (Subscriptions row, Loans row, needs-type support), 7 for SpendingPage virtual rows (Sub/Loan badges, date sort, type filter, period total, non-clickable).</li>
            </ul>
          </div>

          <div class="release-block">
            <div class="release-header">
              <span class="release-version">v2.24.0</span>
              <span class="release-date">June 2026</span>
            </div>
            <p class="release-tagline">
              BUG-025 — Quick-add category name fix + migrateState normalisation
            </p>
            <ul class="docs-list">
              <li><strong>BUG-025 fixed: Dashboard quick-add modal now stores category display names.</strong> The quick-add modal was storing the category <em>id</em> (e.g. <code>'entertainment'</code>) instead of the category <em>name</em> (e.g. <code>'Entertainment'</code>). This caused category badges to render with the wrong colour (fallback grey), the edit-purchase dropdown to show blank, and the spending donut chart / analytics to create a separate bucket for quick-add purchases instead of merging them with the same category from the full add form. Fix: the active-state check and click handler now use <code>c.name</code> instead of <code>c.id</code> throughout the modal.</li>
              <li><strong>One-time migration for existing data.</strong> Added a normalisation pass to <code>migrateState</code> in the budget store: on the next app load any purchase whose <code>category</code> field matches a known <code>SpendingCategory.id</code> is automatically remapped to the corresponding display name. Existing correctly-named purchases and custom category strings are left untouched.</li>
              <li><strong>6 new regression tests.</strong> 4 in the budget store asserting the <code>migrateState</code> normalisation handles id→name conversion, already-correct names, unknown strings, and empty arrays correctly. 2 in DashboardPage confirming the modal defaults to the first category <em>name</em> and that submitting the form saves the display name (not the slug id).</li>
            </ul>
          </div>

          <div class="release-block">
            <div class="release-header">
              <span class="release-version">v2.23.0</span>
              <span class="release-date">June 2026</span>
            </div>
            <p class="release-tagline">
              BUG-023 / BUG-024 — Multi-device sync fix + Dashboard period filter
            </p>
            <ul class="docs-list">
              <li><strong>BUG-023 fixed: archived purchases now deleted from Supabase.</strong> When a bi-weekly period reset, the archived purchases were moved out of <code>budget.purchases</code> in memory but were never deleted from the <code>purchases</code> table in Supabase. On a second device, loading from the DB would repopulate the live array with all those stale rows. Because <code>lastArchivedPeriodStart</code> was already advanced, the rollover guard would skip re-archiving, leaving the old purchases in the Dashboard totals indefinitely. Fix: all three archive actions (<code>closeCurrentPeriod</code>, <code>closeCurrentPeriodManually</code>, <code>autoArchiveMissedPeriods</code>) now fire <code>db.purchases.delete</code> for each row they move to history.</li>
              <li><strong>BUG-024 fixed: Dashboard now date-filters purchases to the current period.</strong> The hero "Available to Spend" card and "Purchases This Period" widget were summing <em>all</em> purchases in <code>budget.purchases</code> with no date boundary — matching the Spending tab's <code>purchasesInPeriod</code> behaviour was the intended design. The fix adds a <code>currentPeriodPurchases</code> computed that filters by <code>[periodStart, periodEnd]</code> exactly as SpendingPage does, so both tabs always agree. This also independently protects against any future DB drift.</li>
              <li><strong>14 new regression tests.</strong> 9 tests for BUG-023 including a "cross-device scenario" that directly simulates Device B loading stale purchases after the rollover anchor was already advanced. 5 tests for BUG-024 confirming the hero card and donut widget ignore out-of-period and undated purchases. 2 pre-existing RecurringCalendar test failures (hardcoded May 2026 dates that drifted into the past) also fixed by pinning with fake timers.</li>
            </ul>
          </div>

          <div class="release-block">
            <div class="release-header">
              <span class="release-version">v2.22.0</span>
              <span class="release-date">May 2026</span>
            </div>
            <p class="release-tagline">
              RS-31 — Supabase fetch reliability (Level 2): one RPC call instead of eighteen
            </p>
            <ul class="docs-list">
              <li><strong>Single round-trip fetch.</strong> The 18 parallel <code>Promise.all</code> queries that <code>fetchAllUserData</code> used to fire are now a single call to a new Postgres function, <code>fetch_user_data(uid)</code>, that returns one JSON object with every table inside it. PgBouncer pool pressure on the free tier is now structurally impossible — not papered over by retries.</li>
              <li><strong>RLS still applies, by design.</strong> The function is declared <code>security invoker</code> with <code>set search_path = public</code> and a defensive <code>auth.uid()</code> check at the top, so each subquery still hits RLS exactly as the per-table calls did. Belt-and-braces: if a policy ever gets accidentally weakened in the future, the function still refuses.</li>
              <li><strong>Contract test pinned.</strong> A new 13-test suite (<code>fetchUserDataRpc.spec.ts</code>) reads the migration file as text and asserts the function signature, every key, every <code>FROM</code> clause, the <code>coalesce</code> empty-array wraps, the date ordering on purchases and history, the grants, and the schema-reload notify. Adding a new table to the schema without wiring it through the RPC now fails loudly in PR review, not silently at runtime.</li>
              <li><strong>RS-30's retry kept as a safety net.</strong> The single-call refactor removes the cause, but the retry is cheap and covers the brief window where <code>migrate.yml</code> and <code>deploy.yml</code> race on push to main. Defence in depth.</li>
            </ul>
          </div>

          <div class="release-block">
            <div class="release-header">
              <span class="release-version">v2.21.0</span>
              <span class="release-date">May 2026</span>
            </div>
            <p class="release-tagline">
              RS-30 — Supabase fetch reliability (Level 1)
            </p>
            <ul class="docs-list">
              <li><strong>Automatic retry on timeout.</strong> Supabase sync now retries once automatically when the first attempt times out — covers the burst-pressure pattern on Supabase free tier where 18 parallel queries occasionally outpace the connection pool. By the time the retry fires (2 s later), the first batch has cleared the pool and the retry usually succeeds.</li>
              <li><strong>Fetch timeout bumped 20s → 30s</strong> to cover the long tail of pool-queued queries. Combined with the retry, you should see the "Cloud sync failed" warning toast far less often.</li>
              <li><strong>Retry only fires on TIMEOUT</strong> — not on RLS violations, 4xx/5xx, or other persistent failures. Those still throw immediately so we don't waste your time re-attempting something that won't fix itself.</li>
              <li><strong>Calmer toast messaging</strong> — when both attempts fail, the warning now reads "tried twice, showing local backup" instead of "check your project status".</li>
              <li>RS-31 (now shipped in v2.22.0): collapsed the 18 parallel queries into a single Supabase RPC call so pool pressure becomes structurally impossible — bigger refactor that this Level 1 work bought headroom to do on a comfortable schedule.</li>
            </ul>
          </div>

          <div class="release-block">
            <div class="release-header">
              <span class="release-version">v2.20.1</span>
              <span class="release-date">May 2026</span>
            </div>
            <p class="release-tagline">
              BUG-022 — `migrate.yml` regenerate wiped `*Row` re-exports (hotfix)
            </p>
            <ul class="docs-list">
              <li>The first migration after RS-29 (the auto-applied 005 SQL) triggered `migrate.yml`'s auto-regenerate-and-commit step, which overwrote `src/types/database.ts` with the canonical Supabase generator output — wiping the hand-maintained <code>*Row</code> alias block at the bottom that <code>src/lib/db.ts</code> imports by name. Every import failed with TS2305 and the next deploy died at type-check.</li>
              <li><strong>Three-layer fix:</strong> restored the alias block, patched the workflow to re-append it automatically after every regenerate, and added 3 contract tests that catch this class of bug at the test-runner stage before it can reach deploy.</li>
              <li>Bug never reached production users — the failed deploy meant nothing shipped. <code>APP_VERSION</code> in WhatsNewBanner intentionally NOT bumped to avoid re-showing an already-dismissed banner for a no-visible-change fix.</li>
            </ul>
          </div>

          <div class="release-block">
            <div class="release-header">
              <span class="release-version">v2.20.0</span>
              <span class="release-date">May 2026</span>
            </div>
            <p class="release-tagline">
              RS-29 — DB column refresh (multi-device sync for accumulated optional fields)
            </p>
            <ul class="docs-list">
              <li><strong>Multi-device sync now works</strong> for the four optional fields that previously persisted on the originating device only: wishlist target months (RS-28), spending-history period budget / spent snapshots (RS-24), and the auto-rollover anchor (RS-23).</li>
              <li><strong>Real Supabase columns added</strong> via <code>supabase/migrations/005_optional_fields_refresh.sql</code>: <code>wishlist_items.target_month</code>, <code>spending_history_periods.budgets</code> (JSONB), <code>spending_history_periods.spent</code> (JSONB), and <code>profiles.last_archived_period_start</code>.</li>
              <li><strong>Push-up migration</strong> runs once on first load after this version deploys — any localStorage-only values from the v2.14 / v2.15 / v2.19 era are promoted to the new columns BEFORE the normal hydration would have clobbered them with null. Idempotent: no-ops on every subsequent load.</li>
              <li><strong>Zero behavioural change</strong> for end users beyond reliable cross-device persistence; the four features themselves work identically to how they did at release.</li>
              <li>1,209 tests across 35 spec files — 32 new tests cover the round-trip mappings and every branch of the push-up migration including a failure-resilience scenario.</li>
            </ul>
          </div>

          <div class="release-block">
            <div class="release-header">
              <span class="release-version">v2.19.1</span>
              <span class="release-date">May 2026</span>
            </div>
            <p class="release-tagline">
              BUG-021 — Wishlist sort: U+FFFF noncharacter blocked CI lint (hotfix)
            </p>
            <ul class="docs-list">
              <li>The RS-28 wishlist "Target ↑" sort comparator used U+FFFF (a Unicode noncharacter) as a "sort to end" sentinel. The runtime accepted it but the Vue ESLint parser rejected it under <code>vue/no-parsing-error · noncharacter-in-input-stream</code>, failing the build-and-deploy CI step.</li>
              <li>Replaced the sentinel with explicit null-handling in the comparator. Same observable sort order — soonest target first, undated items at the end.</li>
              <li>Bug never reached production (build failed before deploy). <code>APP_VERSION</code> in WhatsNewBanner was intentionally NOT bumped from 2.19.0 → 2.19.1 to avoid re-showing an already-dismissed banner for a no-visible-change fix.</li>
            </ul>
          </div>

          <div class="release-block">
            <div class="release-header">
              <span class="release-version">v2.19.0</span>
              <span class="release-date">May 2026</span>
            </div>
            <p class="release-tagline">
              RS-28 — Wishlist target month
            </p>
            <ul class="docs-list">
              <li><strong>Wishlist items can now have an optional target month.</strong> Open any item's add/edit modal and pick a "Target month" — the card swaps the default "~N mo at current rate" badge for <strong>"By Mar 2027"</strong> plus an on-track / behind / complete chip.</li>
              <li><strong>Required-rate hint</strong> when behind — when the card status is "Behind ✗", an inline hint shows the exact monthly rate you'd need to allocate: <em>"Need $134/mo to hit your target"</em>.</li>
              <li><strong>New "Target ↑" sort option</strong> joins the Wishlist sort dropdown. Soonest target first, undated items at the end.</li>
              <li><strong>Backward-compatible</strong> — items without a target month render the original "~N mo" badge unchanged. The field is optional and added to <code>WishlistItem</code> as <code>targetMonth?: ISODate</code> (YYYY-MM, matching the convention used by <code>Goal.targetDate</code>).</li>
              <li>1,177 tests across 34 spec files — 42 new tests cover the date math, status logic, sort behaviour, and modal integration.</li>
            </ul>
          </div>

          <div class="release-block">
            <div class="release-header">
              <span class="release-version">v2.18.0</span>
              <span class="release-date">May 2026</span>
            </div>
            <p class="release-tagline">
              RS-27 — "Insights" tab (formerly the keyboard-only "Advanced")
            </p>
            <ul class="docs-list">
              <li><strong>The Advanced tab has a new name and a real home.</strong> What used to be reachable only via the <kbd>7</kbd> keyboard shortcut is now called <strong>Insights</strong> and lives in the sidebar (and bottom nav on mobile) between Goals and Docs.</li>
              <li><strong>Same four sections, same drag-to-reorder behaviour</strong> — 6-Month Spending Trend, Spending Analytics, Budget vs. Actual, Net Worth. Just easier to find.</li>
              <li><strong>Keyboard shortcut <kbd>7</kbd> still works</strong> — kept for backward compatibility so muscle memory isn't broken. The shortcut-help table description was updated from "Switch to Advanced" → "Switch to Insights".</li>
              <li><strong>Internal rename</strong> across the codebase: <code>'advanced'</code> → <code>'insights'</code> in the TabId type, store fields, store actions, and the page component file. Existing users' drag-reorder preferences are migrated transparently — the load helper reads the legacy <code>advancedSectionOrder</code> localStorage key on first load, and the next save persists under the new <code>insightsSectionOrder</code> key.</li>
              <li>1,135 tests across 33 spec files.</li>
            </ul>
          </div>

          <div class="release-block">
            <div class="release-header">
              <span class="release-version">v2.17.0</span>
              <span class="release-date">May 2026</span>
            </div>
            <p class="release-tagline">
              RS-26 — Release notes refreshed
            </p>
            <ul class="docs-list">
              <li><strong>This Release Notes section is now complete.</strong> Before this sprint it stopped at v1.18.0 and was missing every v2.x sprint — eighteen versions of work documented only in the project's internal PHASE_TRACKING.md.</li>
              <li>Added release blocks for v1.19.0 plus every v2.x version (v2.0.0 through v2.16.0). The BUG-020 patch series is consolidated into a single v2.10.1 – .3 entry for readability.</li>
              <li>New <strong>"Vivid Modern Redesign (v2.x)"</strong> divider marks the boundary between the late-v1 cleanup work and the v2.0+ ground-up redesign so the section is easier to scan.</li>
              <li>Five new regression-guard tests assert every shipped version is still documented — future docs drift gets caught at the test gate, not in production.</li>
              <li>1,125 tests across 33 spec files.</li>
            </ul>
          </div>

          <div class="release-block">
            <div class="release-header">
              <span class="release-version">v2.16.0</span>
              <span class="release-date">May 2026</span>
            </div>
            <p class="release-tagline">
              RS-25 — Code cleanup: orphaned WantsTracker removed
            </p>
            <ul class="docs-list">
              <li><strong>Dead code removed</strong> — the WantsTracker section component had been fully orphaned since RS-11 (the dashboard switched to <code>PurchasesThisPeriod</code>) and RS-24 (manual close-period moved to Settings). Deleting it removed 1,959 lines and 30 redundant test cases.</li>
              <li><strong>Stale comment fixes</strong> in <code>calculations.ts</code> and <code>useListFilter.ts</code> now point at the actual current consumers (PurchasesThisPeriod, SpendingPage, Dashboard hero KPI) rather than the removed component.</li>
              <li><strong>Nothing user-visible changed</strong> — this was a pure subtraction sprint to shrink the maintenance surface.</li>
              <li>1,120 tests across 33 spec files; zero TypeScript errors.</li>
            </ul>
          </div>

          <div class="release-block">
            <div class="release-header">
              <span class="release-version">v2.15.0</span>
              <span class="release-date">May 2026</span>
            </div>
            <p class="release-tagline">
              RS-24 — Pay-period rollover UX enhancements
            </p>
            <ul class="docs-list">
              <li><strong>Countdown indicator</strong> in Settings → Pay Cycle: "Rolls over in <em>N</em> days", with amber emphasis when ≤ 2 days remain so you always know when the next reset is coming.</li>
              <li><strong>"Close period now" button</strong> in Settings — a power-user affordance for force-ending the current period early without waiting for the natural 14-day boundary. Confirms before archiving; disabled when there's nothing to close.</li>
              <li><strong>Per-period surplus / overage rollup</strong> in Spending Analytics: each archived period now shows "Wants: $234 / $300 · under $66 ✓" or "Needs: $612 / $500 · over $112 ✗" — answering "did I stay under?" at a glance.</li>
              <li>Manual close advances the rollover anchor so the natural auto-rollover never double-archives the same window.</li>
              <li>1,150 tests across 33 spec files.</li>
            </ul>
          </div>

          <div class="release-block">
            <div class="release-header">
              <span class="release-version">v2.14.0</span>
              <span class="release-date">May 2026</span>
            </div>
            <p class="release-tagline">
              RS-23 — Automatic bi-weekly pay-period rollover
            </p>
            <ul class="docs-list">
              <li><strong>Auto-archive</strong> — when a bi-weekly period ends, last period's purchases are automatically archived to Spending History and all three budgets (Needs, Wants, Savings) reset to their full allocations. No manual "close period" button needed.</li>
              <li><strong>Multi-period catch-up</strong> — open the app after missing several periods (e.g. away for a month) and each missed period is archived as its own row, with purchases date-bucketed into the correct window. Undated purchases land in the most-recent missed period; backdated orphans land in the oldest.</li>
              <li>Runs on app load and whenever the tab becomes visible — handles both the daily-user and the "left it open all weekend" cases.</li>
              <li>Success toast reports how many periods were archived; the Schedule nav snaps to the new current period.</li>
              <li>Re-entrancy guarded so the watcher doesn't loop on its own mutations.</li>
            </ul>
          </div>

          <div class="release-block">
            <div class="release-header">
              <span class="release-version">v2.13.0</span>
              <span class="release-date">May 2026</span>
            </div>
            <p class="release-tagline">
              RS-22 — Manage Sections cleanup
            </p>
            <ul class="docs-list">
              <li><strong>Focused picker</strong> — the Manage Sections panel is now a streamlined jump-to-section + collapse/expand tool. Drag handles, move-up/down buttons, and reset controls have been retired (the Dashboard is a fixed-grid layout, so reordering never actually moved anything on the page).</li>
              <li><strong>Order matches reality</strong> — the section list now mirrors the actual visual order of the Dashboard (Chequing Balance first → Wishlist last) so what you see in the picker matches what you see on the page.</li>
              <li><strong>Advanced group removed</strong> from the picker — the Advanced tab itself remains accessible via keyboard shortcut <kbd>7</kbd>. <em>(Updated in RS-27: the tab was renamed to "Insights" and surfaced in the sidebar between Goals and Docs; the <kbd>7</kbd> shortcut is preserved for backward compatibility.)</em></li>
              <li>Legacy <code>sectionOrder</code> field in localStorage silently ignored on load and dropped on the next save — no breakage for existing users.</li>
            </ul>
          </div>

          <div class="release-block">
            <div class="release-header">
              <span class="release-version">v2.12.0</span>
              <span class="release-date">May 2026</span>
            </div>
            <p class="release-tagline">
              RS-21 — Card hover effects
            </p>
            <ul class="docs-list">
              <li><strong>Polished hover effect</strong> on cards: a conic-gradient shine glow, a blinking tile grid, and three staggered expanding grid-lines appear in the top-right corner when you hover any card.</li>
              <li><strong>Applied across all tiers</strong>: StatCard KPI tiles get the full effect; BaseCard section containers get a subtle variant (shine + lines, no tiles); and individual item cards in Wishlist, Expense Cards, Savings Goals, and Income Streams get the full treatment.</li>
              <li><strong>Theme-adaptive</strong> — brighter sweep in light mode, more saturated in dark mode — driven by the <code>--accent</code> design token throughout.</li>
              <li>Tile animation and all transitions automatically disabled for users who prefer reduced motion.</li>
            </ul>
          </div>

          <div class="release-block">
            <div class="release-header">
              <span class="release-version">v2.11.0</span>
              <span class="release-date">May 2026</span>
            </div>
            <p class="release-tagline">
              RS-20 — Form validation + dashboard form improvements
            </p>
            <ul class="docs-list">
              <li><strong>Card selector in Dashboard quick-add</strong> — charge purchases directly to an expense card from the header shortcut, no more switching to the Spending tab first.</li>
              <li><strong>Live "Bi-weekly remaining after" preview</strong> in the Spending tab's Add Purchase modal — updates as you type the amount or switch between Want / Need.</li>
              <li><strong>Red-border field validation</strong> across every input in every modal (Wishlist, Expense Cards, Quick-add, Savings, Income, Subscriptions). Per-field error messages on blur; validation state resets cleanly when modals are opened or cancelled.</li>
              <li>1,069 tests across 30 spec files.</li>
            </ul>
          </div>

          <div class="release-block">
            <div class="release-header">
              <span class="release-version">v2.10.1 – .3</span>
              <span class="release-date">May 2026</span>
            </div>
            <p class="release-tagline">
              BUG-020 patch series — Tab-transition blank-screen fix
            </p>
            <ul class="docs-list">
              <li><strong>Symptom</strong>: switching tabs occasionally left the app stuck on a blank screen. Root cause was a Vue <code>&lt;Transition mode="out-in"&gt;</code> state-machine deadlock interacting with GSAP RAF callbacks during page enter/leave.</li>
              <li>Fix landed in three iterations: a GSAP <code>onInterrupt</code> callback (.1), then a CSS-only directional transition (.2), then dropping <code>mode="out-in"</code> entirely with the leaving page absolutely positioned (.3 — definitive fix).</li>
              <li>The entering page is now mounted immediately while the leaving page fades out simultaneously — a blank screen is structurally impossible with this pattern.</li>
            </ul>
          </div>

          <div class="release-block">
            <div class="release-header">
              <span class="release-version">v2.10.0</span>
              <span class="release-date">May 2026</span>
            </div>
            <p class="release-tagline">
              RS-19 — List &amp; micro-interaction animations
            </p>
            <ul class="docs-list">
              <li><strong>useListTransition composable</strong> — staggered enter / leave choreography for list-based sections.</li>
              <li><strong>Wishlist</strong> now staggers card entrance on first load and on filter changes; cards FLIP-animate to new positions on sort.</li>
              <li><strong>Subscriptions</strong> wrapped in TransitionGroup with smooth move animations when the user reorders or deletes.</li>
              <li><strong>BaseButton spring-press</strong> — every primary button gets a subtle squash-and-rebound on click for a tactile feel.</li>
            </ul>
          </div>

          <div class="release-block">
            <div class="release-header">
              <span class="release-version">v2.9.0</span>
              <span class="release-date">May 2026</span>
            </div>
            <p class="release-tagline">
              RS-18 — Page load &amp; navigation animations
            </p>
            <ul class="docs-list">
              <li><strong>useFadeSlide composable</strong> for page-level transitions.</li>
              <li><strong>Direction-aware tab transitions</strong> in App.vue: forward navigation slides in from the right, back navigation slides in from the left.</li>
              <li><strong>Sidebar hover polish</strong> + AppStatusBar ticker rewritten with smoother scroll easing.</li>
            </ul>
          </div>

          <div class="release-block">
            <div class="release-header">
              <span class="release-version">v2.8.0</span>
              <span class="release-date">May 2026</span>
            </div>
            <p class="release-tagline">
              RS-17 — GSAP foundation
            </p>
            <ul class="docs-list">
              <li><strong>useGsap composable</strong> introduces GSAP across the codebase with <code>prefers-reduced-motion</code> guards baked in at the composable level.</li>
              <li>Mock harness for testing GSAP-backed components without canvas in jsdom.</li>
              <li>Hero KPI fade-up on dashboard load; WhatsNewBanner enter / leave choreography.</li>
            </ul>
          </div>

          <div class="release-block">
            <div class="release-header">
              <span class="release-version">v2.7.0</span>
              <span class="release-date">May 2026</span>
            </div>
            <p class="release-tagline">
              RS-16 — Shared Wants / Needs toggle
            </p>
            <ul class="docs-list">
              <li>Dashboard hero KPI and the PurchasesThisPeriod widget now share a single Want / Need toggle that controls both at once.</li>
              <li>Spending tab donut also toggles between Wants and Needs.</li>
              <li>Row-action cleanup: delete moved into the edit modal across cards, eliminating accidental-click risk.</li>
            </ul>
          </div>

          <div class="release-block">
            <div class="release-header">
              <span class="release-version">v2.6.0</span>
              <span class="release-date">May 2026</span>
            </div>
            <p class="release-tagline">
              RS-15 — Purchase type (Want vs Need)
            </p>
            <ul class="docs-list">
              <li>Every purchase is now tagged Want or Need via a <code>budgetType</code> field.</li>
              <li>Stacked bar chart in Spending analytics shows the breakdown over time.</li>
              <li>Type column + type filter in the Spending tab; the wants-only donut respects the filter.</li>
              <li>Quick-add modal updated to capture type at creation time.</li>
            </ul>
          </div>

          <div class="release-block">
            <div class="release-header">
              <span class="release-version">v2.5.0</span>
              <span class="release-date">May 2026</span>
            </div>
            <p class="release-tagline">
              RS-14 — Wishlist card-grid redesign
            </p>
            <ul class="docs-list">
              <li>Wishlist re-rendered as a responsive card grid with savings progress per item.</li>
              <li>Each card shows <strong>months-to-goal</strong>, an inline "Add savings" interaction, a URL link button, and an "Affordable ✓" chip when the price fits inside one bi-weekly wants envelope.</li>
              <li>Supabase sync fix for savings amounts (previously could de-sync on rapid edits).</li>
            </ul>
          </div>

          <div class="release-block">
            <div class="release-header">
              <span class="release-version">v2.4.0</span>
              <span class="release-date">May 2026</span>
            </div>
            <p class="release-tagline">
              RS-13 — Inline interactions on debt &amp; savings cards
            </p>
            <ul class="docs-list">
              <li>Loan, Credit Card, and Savings cards now have inline pay / charge / deposit / withdraw forms — no more modal jumps for routine operations.</li>
              <li>Each inline form has its own validation and toast feedback.</li>
            </ul>
          </div>

          <div class="release-block">
            <div class="release-header">
              <span class="release-version">v2.3.0</span>
              <span class="release-date">May 2026</span>
            </div>
            <p class="release-tagline">
              RS-12 — Dashboard charts row
            </p>
            <ul class="docs-list">
              <li><strong>"Purchases This Period"</strong> donut widget on the dashboard with category breakdown chips.</li>
              <li><strong>"Money Flow"</strong> 12-month income / spend chart.</li>
              <li>Recurring Spend widget reorganised for the new charts row.</li>
            </ul>
          </div>

          <div class="release-block">
            <div class="release-header">
              <span class="release-version">v2.2.0</span>
              <span class="release-date">May 2026</span>
            </div>
            <p class="release-tagline">
              RS-11 — Dashboard grid restructure
            </p>
            <ul class="docs-list">
              <li>Dashboard is now a <strong>fixed-grid layout</strong> — Sections like income-streams, savings-goals, and wants-tracker moved off the dashboard to their proper homes (Settings, Goals tab).</li>
              <li>ExpenseCards renamed "Recurring Spend"; Loans renamed "Loan Payoff" to match the new IA.</li>
              <li>Bar charts stripped from the dashboard — replaced by progress bars and KPI tiles for a cleaner overview.</li>
            </ul>
          </div>

          <div class="release-block">
            <div class="release-header">
              <span class="release-version">v2.1.0</span>
              <span class="release-date">May 2026</span>
            </div>
            <p class="release-tagline">
              RS-10 — Sidebar hover-expand
            </p>
            <ul class="docs-list">
              <li>The 64-pixel icon sidebar expands to show labels on hover, then collapses again on mouse leave.</li>
              <li>Overlay mode prevents content layout shift when the sidebar expands.</li>
            </ul>
          </div>

          <!-- ────────────────────────────────────────────────────────────────
               Section divider: the "Vivid Modern" ground-up redesign.
          ───────────────────────────────────────────────────────────────────── -->
          <h3 class="release-series-heading" data-testid="release-series-vivid">
            ✨ Vivid Modern Redesign (v2.x)
          </h3>
          <p class="release-series-blurb">
            A nine-sprint visual + structural redesign that introduced the violet "Vivid Modern" palette,
            the icon sidebar, the Goals tab, and the hero-KPI dashboard. Released as v2.0.0.
          </p>

          <div class="release-block">
            <div class="release-header">
              <span class="release-version">v2.0.0</span>
              <span class="release-date">May 2026</span>
            </div>
            <p class="release-tagline">
              "Vivid Modern" complete redesign (RS-1 through RS-9)
            </p>
            <ul class="docs-list">
              <li><strong>New violet "Vivid Modern" palette</strong> with chartreuse accent2 — design tokens consolidated in <code>tokens.css</code>; both light and dark themes redesigned simultaneously.</li>
              <li><strong>64-pixel icon sidebar</strong> replaces the top nav; BottomNav for mobile (≤ 768px); slim, focused, always-accessible navigation.</li>
              <li><strong>New Goals tab</strong> for savings goals (was a dashboard section); <strong>Advanced</strong> analytics folded into its own tab.</li>
              <li><strong>Settings reorganised</strong> into a two-column layout with inline sliders for the 50/30/20 allocation.</li>
              <li><strong>Hero-KPI dashboard</strong> with quick-add modal accessible from the header on every tab.</li>
              <li><strong>Sticky bottom status bar</strong> (purchase ticker + next-bill) for ambient awareness.</li>
              <li><strong>Docs tab fully reskinned</strong> with sidebar nav and section-based content (this very page!).</li>
              <li>707 tests across 25 spec files.</li>
            </ul>
          </div>

          <div class="release-block">
            <div class="release-header">
              <span class="release-version">v1.19.0</span>
              <span class="release-date">May 2026</span>
            </div>
            <p class="release-tagline">
              Sprint 25b — Advanced tab + IA polish + Supabase sync hardening
            </p>
            <ul class="docs-list">
              <li><strong>New Advanced analytics tab</strong> (keyboard shortcut <kbd>7</kbd>) hosting Spending Trend, Spending Analytics, Budget vs. Actual, and Net Worth — moved out of the dashboard for clarity.</li>
              <li><strong>Floating section handle</strong> on the right edge of the viewport opens the Manage Sections panel from anywhere.</li>
              <li><strong>Budget Allocation</strong> moved out of the dashboard into Settings where it belongs (rarely changed).</li>
              <li><strong>Multiple Supabase fixes</strong>: session dedup guard, concurrent <code>initStore</code> protection, optimistic sign-out, connectivity probe, visible cloud-sync failure surfacing.</li>
              <li>Toolbar refactor — import / export actions moved to Settings → Data Management.</li>
            </ul>
          </div>

          <div class="release-block">
            <div class="release-header">
              <span class="release-version">v1.18.0</span>
              <span class="release-date">May 2026</span>
            </div>
            <p class="release-tagline">
              Sprint 25 — Supabase Auth (Magic Link + Google OAuth)
            </p>
            <ul class="docs-list">
              <li><strong>Magic link authentication</strong> — enter your email and receive a one-click sign-in link; no password required. The Supabase client handles the PKCE token exchange automatically when you return to the app.</li>
              <li><strong>Google OAuth</strong> — one-click "Sign in with Google" using the official OAuth 2.0 PKCE flow via Supabase; redirects back to the app and sets a persistent session.</li>
              <li><strong>Hard auth gate</strong> — when Supabase is configured, the full app shell is only shown after a verified session is established; unauthenticated visitors see only the <code>LoginPage</code>.</li>
              <li><strong>Row Level Security</strong> — all 18 Supabase tables now enforce RLS policies (<code>auth.uid() = user_id</code>); the anon key replaces the service key so each user can only read and write their own rows.</li>
              <li><strong>User menu &amp; Settings sign-out</strong> — an avatar chip in the toolbar and a "Sign out" button in Settings both call <code>auth.signOut()</code>, which triggers the <code>onAuthStateChange</code> handler that resets the budget store and clears localStorage.</li>
              <li><strong>887 tests</strong> across 27 spec files — +16 in <code>tests/stores/auth.spec.ts</code> (init, magic link, Google OAuth, sign-out, clearError, getters).</li>
            </ul>
          </div>

          <div class="release-block">
            <div class="release-header">
              <span class="release-version">v1.17.0</span>
              <span class="release-date">May 2026</span>
            </div>
            <p class="release-tagline">
              Sprint 24 — Supabase DB Integration
            </p>
            <ul class="docs-list">
              <li><strong>Supabase Postgres backend</strong> — all 18 data tables (income, purchases, subscriptions, expense cards, loans, credit cards, savings, goals, assets, net worth, rules, alerts, categories) now persist to a real database, replacing localStorage as the primary store.</li>
              <li><strong>One-time localStorage → Supabase migration</strong> — <code>migrateIfNeeded()</code> runs once on first load, reading the existing <code>penny_state_v2</code> blob and inserting every entity into Supabase in FK-dependency order; sets a <code>penny_migrated_to_supabase</code> flag so it never re-runs.</li>
              <li><strong>Optimistic update pattern</strong> — every CRUD action updates local Pinia state instantly, then fires a background <code>syncDb()</code> call; UI never waits for the network.</li>
              <li><strong>Graceful offline fallback</strong> — <code>initStore()</code> falls back to <code>loadFromStorage()</code> if Supabase is unconfigured or returns an error; localStorage remains fully functional as a standalone offline mode.</li>
              <li><strong>camelCase ↔ snake_case adapter layer</strong> — <code>src/lib/db.ts</code> maps all domain types to/from Postgres column names; no snake_case ever leaks into components or the Pinia store.</li>
              <li><strong>26 new unit tests</strong> — <code>tests/lib/db.spec.ts</code> (13 tests: fetch mapping, insert payloads, update/delete, upsertProfile) and <code>tests/lib/migrateLocalStorage.spec.ts</code> (13 tests: skip conditions, success, flag behaviour, per-entity migration). 871 tests total across 26 spec files.</li>
            </ul>
          </div>

          <div class="release-block">
            <div class="release-header">
              <span class="release-version">v1.16.0</span>
              <span class="release-date">May 2026</span>
            </div>
            <p class="release-tagline">
              Sprint 23 — Retroactive Category Editing on Archived Purchases
            </p>
            <ul class="docs-list">
              <li><strong>Inline category editor on spending history</strong> — hover any line item in a closed spending period and click the ✏ pencil icon to reassign its category without altering the period total or any other data.</li>
              <li><strong>Live category colour sync</strong> — the spending history donut chart immediately reflects the updated category assignment, pulling from your custom <code>spendingCategories</code> palette.</li>
              <li><strong>Keyboard accessible</strong> — the inline edit control is fully reachable via Tab and operable with Enter/Space.</li>
              <li>871 tests across 26 spec files.</li>
            </ul>
          </div>

          <div class="release-block">
            <div class="release-header">
              <span class="release-version">v1.15.0</span>
              <span class="release-date">May 2026</span>
            </div>
            <p class="release-tagline">
              Sprint 21–22 — Search, Sort &amp; Filter for Purchases and Subscriptions
            </p>
            <ul class="docs-list">
              <li><strong>Purchase filter toolbar</strong> — live search, expandable filter drawer (category / budget type / expense card), sort by date, amount or name; active filter count badge; animated drawer; "no results" empty state; hidden when no purchases exist.</li>
              <li><strong>Subscription filter toolbar</strong> — identical Option B toolbar; sort by renewal date, monthly cost, amount or name; same animated filter drawer pattern.</li>
              <li><strong><code>useListFilter</code> composable</strong> — shared search/filter/sort state (search, catFilter, typeFilter, cardFilter, sortKey, drawerOpen) extracted into a generic, reusable composable.</li>
              <li><strong>Bug fix</strong> — WantsDonut chart now reads colours live from <code>budget.spendingCategories</code> instead of a stale hard-coded map; custom category colours are reflected immediately.</li>
              <li><strong>Bug fix</strong> — ProgressBar labels rendered as siblings of the track, no longer inside the <code>overflow:hidden</code> container that was clipping long label text.</li>
              <li>835 tests across 24 spec files — +29 new tests (13 WantsTracker toolbar, 12 Subscriptions toolbar, 4 WantsDonut/categoryColors integration).</li>
            </ul>
          </div>

          <div class="release-block">
            <div class="release-header">
              <span class="release-version">v1.14.0</span>
              <span class="release-date">May 2026</span>
            </div>
            <p class="release-tagline">
              Sprint 20 — Calendar Day Detail (Slide Panel &amp; Hover Popover)
            </p>
            <ul class="docs-list">
              <li><strong>Slide panel</strong> — click any calendar or pay-period cell with bills to reveal an animated panel showing bill name, type, amount, frequency, and card; colour-coded by type (blue/purple/amber).</li>
              <li><strong>Hover popover</strong> — on desktop, hovering a cell shows a fixed popover with a bill preview; 150 ms grace period keeps it open while moving the mouse to it.</li>
              <li>Touch devices use only the slide panel; popover is suppressed on <code>hover: none</code> media.</li>
            </ul>
          </div>

          <div class="release-block">
            <div class="release-header">
              <span class="release-version">v1.13.0</span>
              <span class="release-date">May 2026</span>
            </div>
            <p class="release-tagline">
              Sprint 19 — Category Manager, Bi-Yearly Frequency &amp; Chequing Balance
            </p>
            <ul class="docs-list">
              <li><strong>Category Manager</strong> — create, rename, recolour and delete custom spending categories used across purchases, subscriptions and the donut chart.</li>
              <li><strong>Bi-Yearly frequency</strong> — subscriptions and loans can now recur every 6 months in addition to monthly, weekly, etc.</li>
              <li><strong>Chequing balance dashboard card</strong> — shows current chequing balance as a standalone stat alongside income and savings.</li>
            </ul>
          </div>

          <div class="release-block">
            <div class="release-header">
              <span class="release-version">v1.12.0</span>
              <span class="release-date">May 2026</span>
            </div>
            <p class="release-tagline">
              Sprint 18 — Collapsible Sections &amp; Drag-and-Drop Reorder
            </p>
            <ul class="docs-list">
              <li><strong>Collapsible sections</strong> — every dashboard section can be collapsed to a header bar to reduce clutter; state persists between sessions.</li>
              <li><strong>Drag-and-drop reorder</strong> — drag section cards to reorder them to your preference; order persisted to localStorage. <em>(Simplified in RS-22: the Dashboard is now a fixed-grid layout and the Section Picker is a focused jump + collapse tool.)</em></li>
              <li><strong>Section Picker</strong> — settings panel with move-up/move-down buttons and a reset-to-default option for accessibility-first reordering. <em>(Reorder controls retired in RS-22.)</em></li>
            </ul>
          </div>

          <div class="release-block">
            <div class="release-header">
              <span class="release-version">v1.11.0</span>
              <span class="release-date">May 2026</span>
            </div>
            <p class="release-tagline">
              Sprint 17 — Custom-Days Subscriptions
            </p>
            <ul class="docs-list">
              <li><strong>Custom-days frequency</strong> — subscriptions can now be set to repeat on specific days of the week (e.g., every Mon &amp; Wed).</li>
              <li>Recurring Calendar correctly maps custom-day subscriptions to all matching days in the month and pay-period views.</li>
            </ul>
          </div>

          <div class="release-block">
            <div class="release-header">
              <span class="release-version">v1.10.0</span>
              <span class="release-date">May 2026</span>
            </div>
            <p class="release-tagline">
              Sprint 16 — Loans on the Schedule Tab
            </p>
            <ul class="docs-list">
              <li><strong>Loans in the Recurring Calendar</strong> — loan payments now appear as bill entries in the calendar alongside subscriptions and fixed expenses.</li>
              <li>Loan bills show an amber <code>bill-badge--loan</code> colour band and the correct frequency label in the slide panel.</li>
            </ul>
          </div>

          <div class="release-block">
            <div class="release-header">
              <span class="release-version">v1.9.0</span>
              <span class="release-date">May 2026</span>
            </div>
            <p class="release-tagline">
              Sprint 15 — Pay-Period Schedule View
            </p>
            <ul class="docs-list">
              <li><strong>14-day pay-period view</strong> — a compact calendar covering the current pay period showing all bills due within it; controlled by your pay-anchor date.</li>
              <li>Bills in the period deducted from the Wants envelope to give an accurate remaining-budget forecast.</li>
            </ul>
          </div>

          <div class="release-block">
            <div class="release-header">
              <span class="release-version">v1.8.0</span>
              <span class="release-date">May 2026</span>
            </div>
            <p class="release-tagline">
              Sprint 14 — Dashboard Polish &amp; Analytics
            </p>
            <ul class="docs-list">
              <li>Visual polish pass across all sections — tighter spacing, improved typography hierarchy, and consistent card shadows.</li>
              <li>Analytics enhancements: category breakdown table, spending velocity indicator, and improved tooltip formatting on all Chart.js instances.</li>
            </ul>
          </div>

          <div class="release-block">
            <div class="release-header">
              <span class="release-version">v1.7.0</span>
              <span class="release-date">May 2026</span>
            </div>
            <p class="release-tagline">
              Sprint 13 — Dashboard Polish, Form Validation &amp; JSON Backup
            </p>
            <ul class="docs-list">
              <li><strong>JSON backup / restore</strong> — export a full <code>.json</code> snapshot of your state and re-import it on any device.</li>
              <li><strong>Form validation</strong> — inline real-time validation with error messages on all add/edit forms; invalid submissions are blocked.</li>
              <li>Improved number formatting and edge-case handling throughout (zero-income guard, overspend badges).</li>
            </ul>
          </div>

          <div class="release-block">
            <div class="release-header">
              <span class="release-version">v1.6.0</span>
              <span class="release-date">May 2026</span>
            </div>
            <p class="release-tagline">
              Sprint 12 — Spending Trend Chart &amp; Goals Timeline
            </p>
            <ul class="docs-list">
              <li><strong>6-Month Spending Trend Chart</strong> — stacked bar (Needs/Wants/Savings) with income reference line; lazy-rendered; current month at full opacity.</li>
              <li><strong>Goals Timeline</strong> — ranked projection card showing projected completion dates and months late for all savings goals.</li>
              <li>508 tests across 21 spec files — 38 new tests for <code>getSpendingTrend</code> and <code>getGoalsTimeline</code>.</li>
            </ul>
          </div>

          <div class="release-block">
            <div class="release-header">
              <span class="release-version">v1.5.0</span>
              <span class="release-date">May 2026</span>
            </div>
            <p class="release-tagline">
              Sprint 11 — Envelope Forecast &amp; MoM Stat Deltas
            </p>
            <ul class="docs-list">
              <li><strong>Envelope Forecast</strong> — "At this pace, $X by end of period" projection chip in Wants Tracker; green / amber / red status.</li>
              <li><strong>MoM Stat Deltas</strong> — ▲/▼ chips on Needs, Wants, and Net Worth dashboard stat cards vs. prior month.</li>
              <li>GitHub Pages deploy confirmed live at <code>brahimmahadi.github.io/A-Penny-For-Our-Thoughts/</code>.</li>
            </ul>
          </div>

          <div class="release-block">
            <div class="release-header">
              <span class="release-version">v1.4.0</span>
              <span class="release-date">May 2026</span>
            </div>
            <p class="release-tagline">
              Sprint 10 — Onboarding Flow
            </p>
            <ul class="docs-list">
              <li><strong>First-Run Wizard</strong> — 4-step guided onboarding for new users (income, pay period, budget split). Shows once, never again.</li>
              <li><strong>What's New banner</strong> — dismissible version-gated highlights for returning users on each release.</li>
            </ul>
          </div>

          <div class="release-block">
            <div class="release-header">
              <span class="release-version">v1.3.0</span>
              <span class="release-date">May 2026</span>
            </div>
            <p class="release-tagline">
              Sprint 9 — Mobile UX Pass
            </p>
            <ul class="docs-list">
              <li><strong>Swipe navigation</strong> — swipe left/right on the main content area to switch tabs on touch devices.</li>
              <li>Mobile responsiveness fixes: stats row collapses gracefully, modals scroll correctly, touch targets audited.</li>
              <li><code>useSwipe</code> composable — reusable, tested, threshold-guarded.</li>
            </ul>
          </div>

          <div class="release-block">
            <div class="release-header">
              <span class="release-version">v1.2.0</span>
              <span class="release-date">May 2026</span>
            </div>
            <p class="release-tagline">
              Sprint 8 — Error Handling, Lazy Charts &amp; Architecture Docs
            </p>
            <ul class="docs-list">
              <li><strong>Storage error handling</strong> — graceful try/catch on all localStorage operations; "Storage is full" danger toast with export reminder.</li>
              <li><strong>Lazy chart rendering</strong> — charts use <code>IntersectionObserver</code> to render only when visible; shimmer skeleton placeholder while off-screen.</li>
              <li>Full <code>docs/ARCHITECTURE.md</code> rewrite for Vue 3 + TypeScript stack.</li>
            </ul>
          </div>

          <div class="release-block">
            <div class="release-header">
              <span class="release-version">v1.1.0</span>
              <span class="release-date">May 2026</span>
            </div>
            <p class="release-tagline">
              Sprint 7 — Settings, Rules Engine &amp; Budget Alerts
            </p>
            <ul class="docs-list">
              <li><strong>Settings tab</strong> — pay period anchor, chequing balance, danger zone (clear all data).</li>
              <li><strong>Transaction Rules Engine</strong> — keyword → category auto-classification; three match modes (contains / starts with / exact).</li>
              <li><strong>Budget Alerts</strong> — per-category spending thresholds; alert chip appears in Wants Tracker when exceeded.</li>
              <li>448 tests covering all new sections.</li>
            </ul>
          </div>

          <div class="release-block">
            <div class="release-header">
              <span class="release-version">v1.0.0</span>
              <span class="release-date">May 2026</span>
            </div>
            <p class="release-tagline">
              Vue 3 + TypeScript migration complete
            </p>
            <ul class="docs-list">
              <li>Full rewrite from vanilla JS to <strong>Vue 3 + Pinia + TypeScript</strong>. All features preserved and extended.</li>
              <li>346-test Vitest suite covering stores, composables, calculations, CSV, and all section components.</li>
              <li>CSV import / export in the header toolbar (⬆ / ⬇) on every tab; keyboard shortcuts: <kbd>?</kbd> help, <kbd>1</kbd>–<kbd>4</kbd> tabs, <kbd>E</kbd> export, <kbd>T</kbd> theme.</li>
              <li>All 8 Chart.js chart SFCs with automatic theme-aware re-colouring.</li>
              <li>localStorage error handling, <code>prefers-reduced-motion</code> support throughout.</li>
            </ul>
          </div>

          <div class="release-block">
            <div class="release-header">
              <span class="release-version">Legacy</span>
              <span class="release-date">2025 – early 2026</span>
            </div>
            <p class="release-tagline">
              Vanilla JS era (v1.0 – v2.4)
            </p>
            <ul class="docs-list">
              <li>50/30/20 budget allocation, income streams, bi-weekly wants envelope, expense cards, loans, credit cards, subscriptions, wishlist, CSV import/export.</li>
              <li>Budget vs. Actual, Savings Goal Tracker, Net Worth tracker, Recurring Expense Calendar, MoM analytics, Transaction Rules, Budget Alerts.</li>
              <li>Vite + Tailwind CSS v4 migration; CSS modularisation (8 focused files).</li>
            </ul>
          </div>
        </section>

        <!-- ─── FAQ ───────────────────────────────────────────── -->
        <section
          v-else-if="activeSection === 'faq'"
          class="docs-section"
        >
          <h2 class="docs-section-title">
            FAQ &amp; Troubleshooting
          </h2>

          <div class="faq-item">
            <h3 class="faq-q">
              Is my data safe?
            </h3>
            <p>
              Yes. All data is stored locally in your browser's <code>localStorage</code>. Nothing is ever sent to a server.
              See the
              <button
                class="docs-inline-link"
                @click="goTo('privacy')"
              >
                Privacy &amp; Data
              </button>
              section for full details.
            </p>
          </div>

          <div class="faq-item">
            <h3 class="faq-q">
              Will clearing my browser history delete my data?
            </h3>
            <p>Yes. Clearing cookies and site data removes localStorage. Export a CSV backup regularly to avoid data loss.</p>
          </div>

          <div class="faq-item">
            <h3 class="faq-q">
              The Wants Tracker shows "Set a pay start date in Settings"
            </h3>
            <p>Go to <strong>Settings → Pay Period Anchor</strong> and set a recent pay date. The bi-weekly cycle repeats every 14 days from that anchor.</p>
          </div>

          <div class="faq-item">
            <h3 class="faq-q">
              How does the bi-weekly wants budget work?
            </h3>
            <p>The monthly Wants budget is divided by 2 to get the bi-weekly envelope. Each 14-day period starts from your pay anchor date. Subscriptions and loans due in the period are deducted from the envelope automatically.</p>
          </div>

          <div class="faq-item">
            <h3 class="faq-q">
              Import fails with "Invalid CSV format"
            </h3>
            <p>
              Common causes: (1) The file was not exported from this app — only Penny CSV format is supported.
              (2) The file was manually edited and a column was added, removed, or renamed.
              (3) A value contains a comma that wasn't quoted properly.
              Try re-exporting a fresh backup and importing that. See the
              <button
                class="docs-inline-link"
                @click="goTo('csv-reference')"
              >
                CSV Reference
              </button>
              for the expected structure.
            </p>
          </div>

          <div class="faq-item">
            <h3 class="faq-q">
              Can I use the app on multiple devices?
            </h3>
            <p>Not automatically — data is device-local. To sync between devices, export a CSV on device A and import it on device B.</p>
          </div>

          <div class="faq-item">
            <h3 class="faq-q">
              The charts look wrong after toggling the theme
            </h3>
            <p>Charts re-colour on theme toggle. If a chart looks off, switch to another tab and back — this triggers a re-render.</p>
          </div>

          <div class="faq-item">
            <h3 class="faq-q">
              How do I reset everything?
            </h3>
            <p>Go to <strong>Settings → Danger Zone</strong> and click <strong>Clear All Data</strong>. Export a backup first — this cannot be undone.</p>
          </div>
        </section>

        <!-- ─── Privacy & Data ─────────────────────────────────── -->
        <section
          v-else-if="activeSection === 'privacy'"
          class="docs-section"
        >
          <h2 class="docs-section-title">
            Privacy &amp; Data
          </h2>
          <p class="docs-intro">
            Your financial data never leaves your device. Here's exactly how it works.
          </p>

          <h3 class="docs-h3">
            Where is my data stored?
          </h3>
          <p>All data is saved in your browser's <code>localStorage</code> under the key <code>penny_state_v2</code>. It exists only in the browser on the device you used to enter it.</p>

          <h3 class="docs-h3">
            Does the app make network requests?
          </h3>
          <p>No. After the initial page load, the app makes zero network requests. There is no backend, no database, no analytics tracking, and no third-party scripts that phone home.</p>

          <h3 class="docs-h3">
            What happens if I clear my browser data?
          </h3>
          <p>Clearing cookies, site data, or localStorage will permanently delete all app data. Always keep a CSV export as a backup. You can re-import it at any time.</p>

          <h3 class="docs-h3">
            How can I back up my data?
          </h3>
          <p>Click the <strong>⬆ Export</strong> button in the header toolbar. Save the downloaded <code>penny-export.csv</code> somewhere safe. To restore, click <strong>⬇ Import</strong> and select the file.</p>

          <h3 class="docs-h3">
            Can I delete my data?
          </h3>
          <p>Go to <strong>Settings → Danger Zone → Clear All Data</strong>. This wipes all localStorage data and resets the app to its default state. Alternatively, clear your browser's site data for this page via your browser's privacy settings.</p>

          <h3 class="docs-h3">
            Is this app open source?
          </h3>
          <p>The codebase is available to review locally. No minification or obfuscation — you can audit exactly what runs in your browser.</p>
        </section>

        <!-- ─── CSV Reference ──────────────────────────────────── -->
        <section
          v-else-if="activeSection === 'csv-reference'"
          class="docs-section"
        >
          <h2 class="docs-section-title">
            CSV Format Reference
          </h2>
          <p class="docs-intro">
            The export file is a plain-text CSV divided into named sections.
            Each section begins with a <code>SECTION:name</code> header row,
            followed by a column-name row, then data rows.
            Sections are separated by a blank line.
          </p>

          <h3 class="docs-h3">
            File structure
          </h3>
          <pre class="docs-code">SECTION:meta
key,value
payStart,2026-05-01
exportedAt,2026-05-22T10:00:00.000Z

SECTION:allocation
needs,wants,savings
50,30,20

SECTION:incomeStreams
id,name,amount,biweekly
abc123,Paycheque,3500,false

...</pre>

          <h3 class="docs-h3">
            Section reference
          </h3>
          <div class="csv-table-wrap">
            <table class="csv-table">
              <thead>
                <tr>
                  <th>Section</th>
                  <th>Columns</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><code>meta</code></td>
                  <td>key, value</td>
                  <td>payStart (YYYY-MM-DD), exportedAt (ISO datetime)</td>
                </tr>
                <tr>
                  <td><code>allocation</code></td>
                  <td>needs, wants, savings</td>
                  <td>Integer percentages summing to 100</td>
                </tr>
                <tr>
                  <td><code>incomeStreams</code></td>
                  <td>id, name, amount, biweekly</td>
                  <td>biweekly: true/false</td>
                </tr>
                <tr>
                  <td><code>expenseCards</code></td>
                  <td>cardId, cardLabel, itemId, itemName, itemAmount, itemBiweekly, itemDueDay</td>
                  <td>One row per item; itemDueDay blank when undated</td>
                </tr>
                <tr>
                  <td><code>purchases</code></td>
                  <td>id, name, amount, category, cardId, budgetType, date</td>
                  <td>Current period purchases</td>
                </tr>
                <tr>
                  <td><code>spendingHistory</code></td>
                  <td>periodId, periodDate, periodLabel, periodTotal, itemId, itemName, itemAmount, itemCategory, itemDate</td>
                  <td>One row per item; blank periodTotal row precedes items</td>
                </tr>
                <tr>
                  <td><code>loans</code></td>
                  <td>id, name, remaining, original, paymentAmount, frequency, date, budgetType, cardId</td>
                  <td />
                </tr>
                <tr>
                  <td><code>creditCards</code></td>
                  <td>id, name, balance, limit</td>
                  <td />
                </tr>
                <tr>
                  <td><code>subscriptions</code></td>
                  <td>id, name, amount, frequency, date, category, budgetType, cardId</td>
                  <td />
                </tr>
                <tr>
                  <td><code>wishlist</code></td>
                  <td>id, icon, name, url</td>
                  <td />
                </tr>
                <tr>
                  <td><code>savingsAccounts</code></td>
                  <td>id, name, balance, defaultAllocated, monthlyAllocations</td>
                  <td>monthlyAllocations: JSON object {"YYYY-MM": amount}</td>
                </tr>
                <tr>
                  <td><code>goals</code></td>
                  <td>id, accountId, targetAmount, targetDate</td>
                  <td>targetDate: YYYY-MM</td>
                </tr>
                <tr>
                  <td><code>assets</code></td>
                  <td>id, name, category, value</td>
                  <td>category: investment / real_estate / vehicle / other</td>
                </tr>
                <tr>
                  <td><code>netWorthHistory</code></td>
                  <td>id, date, netWorth, totalAssets, totalLiabilities</td>
                  <td>date: YYYY-MM</td>
                </tr>
                <tr>
                  <td><code>rules</code></td>
                  <td>id, pattern, matchType, category</td>
                  <td>matchType: contains / startsWith / exact</td>
                </tr>
                <tr>
                  <td><code>budgetAlerts</code></td>
                  <td>id, category, threshold</td>
                  <td />
                </tr>
                <tr>
                  <td><code>budgetDisplayMode</code></td>
                  <td>needs, wants, savings</td>
                  <td>Values: monthly / biweekly</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 class="docs-h3">
            Notes on backward compatibility
          </h3>
          <ul class="docs-list">
            <li>Unknown sections are silently ignored during import.</li>
            <li>Old 4-column loans (without paymentAmount / frequency) are imported with defaults.</li>
            <li>Old 3-column subscriptions (without budgetType / cardId) are imported with <code>budgetType: wants</code> and <code>cardId: null</code>.</li>
            <li>Savings accounts exported before the monthlyAllocations column was added import with <code>monthlyAllocations: {}</code>.</li>
          </ul>
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-docs {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* ─── Page header ────────────────────────────────────────────────── */
.docs-page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 1rem;
  flex-wrap: wrap;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--border);
}

.docs-eyebrow {
  font-size: 0.72rem;
  color: var(--muted);
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  margin-bottom: 4px;
}

.docs-page-title {
  margin: 0;
  font-size: clamp(1.3rem, 3.5vw, 1.6rem);
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1.1;
  color: var(--text);
}

.docs-section-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  background: var(--accent-soft);
  color: var(--accent);
  border: 1px solid color-mix(in srgb, var(--accent) 20%, transparent);
  border-radius: 999px;
  padding: 0.35rem 0.9rem;
  font-size: 0.78rem;
  font-weight: 700;
  white-space: nowrap;
  flex-shrink: 0;
}

.docs-section-badge__icon { font-size: 0.9rem; line-height: 1; }

/* ─── Layout ─────────────────────────────────────────────────────── */
.docs-layout {
  display: grid;
  grid-template-columns: 200px 1fr;
  gap: 1.75rem;
  align-items: start;
}

/* ─── Desktop sidebar ────────────────────────────────────────────── */
.docs-sidebar {
  display: flex;
  flex-direction: column;
  gap: 0;
  position: sticky;
  top: calc(var(--header-height, 70px) + 1.25rem);
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 0.35rem;
  overflow: hidden;
}

.docs-nav-btn {
  position: relative;
  background: transparent;
  border: none;
  border-radius: 8px;
  color: var(--muted);
  font-size: 0.83rem;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  padding: 0.52rem 0.8rem;
  text-align: left;
  transition: background var(--transition-fast), color var(--transition-fast);
  white-space: nowrap;
}

.docs-nav-btn:hover {
  background: var(--accent-soft);
  color: var(--accent);
}

.docs-nav-btn:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: -2px;
}

.docs-nav-btn--active {
  background: var(--accent-soft);
  color: var(--accent);
  font-weight: 700;
  box-shadow: inset 3px 0 0 var(--accent);
}

/* ─── Mobile nav ─────────────────────────────────────────────────── */
.docs-mobile-nav {
  display: none;
  position: relative;
}

.docs-mobile-toggle {
  width: 100%;
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: 10px;
  color: var(--text);
  font-family: inherit;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  padding: 0.65rem 0.9rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: border-color var(--transition-fast), background var(--transition-fast);
}

.docs-mobile-toggle:hover {
  border-color: var(--accent);
  background: var(--accent-soft);
  color: var(--accent);
}

.docs-mobile-toggle:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.docs-mobile-toggle__chevron {
  font-size: 1.15rem;
  color: var(--muted);
  display: inline-block;
  line-height: 1;
  transition: transform var(--transition-fast);
}

.docs-mobile-toggle__chevron--open {
  transform: rotate(90deg);
}

.docs-mobile-menu {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  overflow: hidden;
  z-index: 20;
  box-shadow: var(--card-shadow);
}

.docs-mobile-item {
  width: 100%;
  background: transparent;
  border: none;
  border-bottom: 1px solid var(--border);
  color: var(--text);
  font-family: inherit;
  font-size: 0.875rem;
  cursor: pointer;
  padding: 0.65rem 0.9rem;
  text-align: left;
  transition: background var(--transition-fast), color var(--transition-fast);
}

.docs-mobile-item:last-child { border-bottom: none; }

.docs-mobile-item:hover {
  background: var(--accent-soft);
  color: var(--accent);
}

.docs-mobile-item--active {
  color: var(--accent);
  font-weight: 700;
  background: var(--accent-soft);
}

/* ─── Section content ────────────────────────────────────────────── */
.docs-content {
  min-width: 0;
}

.docs-section {
  display: flex;
  flex-direction: column;
}

.docs-section-title {
  font-size: 1.35rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  margin: 0 0 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--border);
  color: var(--text);
}

.docs-intro {
  font-size: 0.9rem;
  color: var(--muted);
  line-height: 1.7;
  margin: 0 0 1.25rem;
}

.docs-h3 {
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--text);
  margin: 1.4rem 0 0.45rem;
  padding-left: 0.65rem;
  border-left: 3px solid color-mix(in srgb, var(--accent) 30%, transparent);
}

.docs-h3:first-of-type {
  margin-top: 0;
}

p {
  font-size: 0.875rem;
  color: var(--text);
  line-height: 1.65;
  margin: 0 0 0.5rem;
}

.docs-list {
  font-size: 0.875rem;
  color: var(--text);
  line-height: 1.65;
  padding-left: 1.4rem;
  margin: 0 0 0.75rem;
}

.docs-list li { margin-bottom: 0.3rem; }

code {
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 0.82em;
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 0.1em 0.35em;
  color: var(--accent);
}

kbd {
  display: inline-block;
  background: var(--surface2);
  border: 1px solid var(--border);
  border-bottom-width: 2px;
  border-radius: 4px;
  padding: 0.1rem 0.45rem;
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 0.78em;
  color: var(--text);
  font-weight: 600;
}

/* ─── Inline link button ─────────────────────────────────────────── */
.docs-inline-link {
  background: none;
  border: none;
  color: var(--accent);
  font-family: inherit;
  font-size: inherit;
  cursor: pointer;
  padding: 0;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.docs-inline-link:hover {
  opacity: 0.8;
}

/* ─── Release notes ──────────────────────────────────────────────── */
.release-block {
  padding: 0.85rem 0;
  border-bottom: 1px solid var(--border);
}

.release-block:last-child { border-bottom: none; }

/* RS-26: era / series divider between v1.x and v2.x release blocks. */
.release-series-heading {
  margin: 1.4rem 0 0.25rem;
  padding-top: 1.1rem;
  border-top: 2px solid var(--accent);
  font-size: 0.95rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: var(--accent);
}

.release-series-blurb {
  margin: 0 0 0.4rem;
  font-size: 0.82rem;
  color: var(--muted);
  line-height: 1.5;
  max-width: 64ch;
}

.release-header {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin-bottom: 0.25rem;
}

.release-version {
  display: inline-flex;
  align-items: center;
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--accent);
  background: var(--accent-soft);
  border: 1px solid color-mix(in srgb, var(--accent) 20%, transparent);
  border-radius: 999px;
  padding: 0.2em 0.75em;
  letter-spacing: 0.01em;
}

.release-date {
  font-size: 0.75rem;
  color: var(--muted);
}

.release-tagline {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--text);
  margin: 0 0 0.4rem;
}

/* ─── FAQ ────────────────────────────────────────────────────────── */
.faq-item {
  padding: 0.75rem;
  border-bottom: 1px solid var(--border);
  border-radius: 8px;
  transition: background var(--transition-fast);
}

.faq-item:last-child { border-bottom: none; }

.faq-item:hover { background: var(--accent-soft); }

.faq-q {
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--text);
  margin: 0 0 0.35rem;
}

/* ─── CSV reference ──────────────────────────────────────────────── */
.docs-code {
  background: var(--surface3);
  border: 1px solid var(--border);
  border-left: 3px solid var(--accent);
  border-radius: 8px;
  padding: 0.85rem 1.1rem;
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 0.78rem;
  color: var(--text);
  overflow-x: auto;
  line-height: 1.65;
  margin: 0.5rem 0 1rem;
  white-space: pre;
}

.csv-table-wrap {
  overflow-x: auto;
  margin: 0.5rem 0 1rem;
  border: 1px solid var(--border);
  border-radius: 10px;
}

.csv-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.8rem;
}

.csv-table th,
.csv-table td {
  text-align: left;
  padding: 0.45rem 0.75rem;
  border-bottom: 1px solid var(--border);
  vertical-align: top;
  line-height: 1.45;
}

.csv-table thead tr {
  background: var(--surface2);
}

.csv-table th {
  color: var(--muted);
  font-weight: 600;
  font-size: 0.7rem;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.csv-table tbody tr {
  transition: background var(--transition-fast);
}

.csv-table tbody tr:hover {
  background: var(--accent-soft);
}

.csv-table tr:last-child td { border-bottom: none; }

/* ─── Responsive ─────────────────────────────────────────────────── */
@media (max-width: 768px) {
  .docs-page-header {
    align-items: flex-start;
  }

  .docs-layout {
    grid-template-columns: 1fr;
    gap: 0;
  }

  .docs-sidebar { display: none; }
  .docs-mobile-nav { display: block; }
}

@media (max-width: 480px) {
  .docs-section-badge { display: none; }
}

@media (prefers-reduced-motion: reduce) {
  .docs-mobile-toggle__chevron { transition: none; }
  .faq-item { transition: none; }
  .csv-table tbody tr { transition: none; }
}
</style>
