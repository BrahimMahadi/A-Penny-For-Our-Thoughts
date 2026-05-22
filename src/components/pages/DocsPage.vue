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
    <!-- ── Mobile section picker ──────────────────────────────────── -->
    <div class="docs-mobile-nav">
      <button
        class="docs-mobile-toggle"
        :aria-expanded="mobileOpen"
        @click="mobileOpen = !mobileOpen"
      >
        <span>{{ sections.find(s => s.id === activeSection)?.icon }} {{ activeLabel() }}</span>
        <span class="docs-mobile-toggle__chevron">{{ mobileOpen ? '▲' : '▼' }}</span>
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
          </ul>

          <h3
            id="ug-schedule"
            class="docs-h3"
          >
            📅 Recurring Schedule
          </h3>
          <p>The Schedule tab shows a 6-month forecast and a calendar view of all bills with due dates. Toggle between List and Calendar views with the ☰ / ⊞ buttons.</p>

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
          <p>Rules are tested in order — first match wins. Use the live test field in Settings to verify your rules.</p>

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

          <div class="release-block">
            <div class="release-header">
              <span class="release-version">v3.0</span>
              <span class="release-date">May 2026</span>
            </div>
            <p class="release-tagline">
              Vue 3 + TypeScript migration
            </p>
            <ul class="docs-list">
              <li>Full rewrite from vanilla JS to <strong>Vue 3 + Pinia + TypeScript</strong>. All features preserved and extended.</li>
              <li>346-test Vitest suite covering stores, composables, calculations, CSV, and all section components.</li>
              <li>CSV import / export now accessible from the header toolbar (⬆ / ⬇) on every tab.</li>
              <li>Global keyboard shortcuts: <kbd>?</kbd> help panel, <kbd>1</kbd>–<kbd>4</kbd> tab switch, <kbd>E</kbd> export, <kbd>T</kbd> theme.</li>
              <li>New <strong>Settings tab</strong>: pay period anchor, transaction rules, budget alerts, chequing balance.</li>
              <li>Improved reduced-motion support across all animated components.</li>
            </ul>
          </div>

          <div class="release-block">
            <div class="release-header">
              <span class="release-version">v2.4</span>
              <span class="release-date">May 2026</span>
            </div>
            <p class="release-tagline">
              Sprint 3 — Polish &amp; UX Refinement
            </p>
            <ul class="docs-list">
              <li><strong>Toast notifications</strong> — self-dismissing pill confirmations after every save, add, and delete action.</li>
              <li><strong>Keyboard shortcuts</strong> — press <kbd>?</kbd> to open the shortcut panel.</li>
              <li><strong>Empty state illustrations</strong> — animated icons and guidance text in all 10 data sections.</li>
              <li><strong>Micro-interactions</strong> — card hover lift, button press, progress bar fill animation, list item stagger.</li>
              <li><strong>Mobile form UX</strong> — decimal keypad on iOS/Android, shake-on-error validation, single-column collapse at ≤380 px.</li>
            </ul>
          </div>

          <div class="release-block">
            <div class="release-header">
              <span class="release-version">v2.0</span>
              <span class="release-date">May 2026</span>
            </div>
            <p class="release-tagline">
              Performance &amp; modularisation
            </p>
            <ul class="docs-list">
              <li>Transaction Rules Engine for auto-categorising wants purchases.</li>
              <li>Month-over-month spending analytics with trend insights.</li>
              <li>Budget vs. Actual dashboard panel with green / amber / red status chips.</li>
              <li>Savings Goal Tracker — per-account targets with progress bars and on-track status.</li>
              <li>Net Worth tracker — assets, liabilities, monthly snapshot history chart.</li>
              <li>Recurring Expense Calendar — 6-month forecast + interactive calendar grid.</li>
            </ul>
          </div>

          <div class="release-block">
            <div class="release-header">
              <span class="release-version">v1.0</span>
              <span class="release-date">2025</span>
            </div>
            <p class="release-tagline">
              Initial release
            </p>
            <ul class="docs-list">
              <li>50/30/20 budget allocation with editable percentages.</li>
              <li>Income streams, expense cards, loans, credit cards, subscriptions, wishlist.</li>
              <li>Bi-weekly wants envelope with donut chart.</li>
              <li>CSV import / export, dark / light theme toggle, localStorage persistence.</li>
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
  gap: 0.75rem;
}

/* ─── Layout ─────────────────────────────────────────────────────── */
.docs-layout {
  display: grid;
  grid-template-columns: 180px 1fr;
  gap: 1.5rem;
  align-items: start;
}

/* ─── Desktop sidebar ────────────────────────────────────────────── */
.docs-sidebar {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  position: sticky;
  top: calc(var(--header-height, 70px) + 1.25rem);
}

.docs-nav-btn {
  background: transparent;
  border: none;
  border-radius: 6px;
  color: var(--muted);
  font-size: 0.85rem;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  padding: 0.45rem 0.7rem;
  text-align: left;
  transition: background 0.12s, color 0.12s;
  white-space: nowrap;
}

.docs-nav-btn:hover {
  background: var(--surface2);
  color: var(--text);
}

.docs-nav-btn--active {
  background: var(--surface2);
  color: var(--accent, #4ade80);
  font-weight: 600;
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
  border-radius: 8px;
  color: var(--text);
  font-family: inherit;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  padding: 0.6rem 0.9rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.docs-mobile-toggle__chevron {
  font-size: 0.7rem;
  color: var(--muted);
}

.docs-mobile-menu {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
  z-index: 20;
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
  padding: 0.6rem 0.9rem;
  text-align: left;
}

.docs-mobile-item:last-child { border-bottom: none; }

.docs-mobile-item--active {
  color: var(--accent, #4ade80);
  font-weight: 600;
}

/* ─── Section content ────────────────────────────────────────────── */
.docs-content {
  min-width: 0;
}

.docs-section-title {
  font-size: 1.2rem;
  font-weight: 700;
  margin: 0 0 0.75rem;
  color: var(--text);
}

.docs-intro {
  font-size: 0.9rem;
  color: var(--muted);
  line-height: 1.6;
  margin: 0 0 1.25rem;
}

.docs-h3 {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--text);
  margin: 1.25rem 0 0.4rem;
}

.docs-h3:first-of-type {
  margin-top: 0;
}

p {
  font-size: 0.875rem;
  color: var(--text);
  line-height: 1.6;
  margin: 0 0 0.5rem;
}

.docs-list {
  font-size: 0.875rem;
  color: var(--text);
  line-height: 1.6;
  padding-left: 1.4rem;
  margin: 0 0 0.75rem;
}

.docs-list li { margin-bottom: 0.25rem; }

code {
  font-family: ui-monospace, monospace;
  font-size: 0.82em;
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: 3px;
  padding: 0.1em 0.35em;
  color: var(--accent, #4ade80);
}

kbd {
  display: inline-block;
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 0.1rem 0.4rem;
  font-family: ui-monospace, monospace;
  font-size: 0.8em;
  color: var(--accent, #4ade80);
}

/* ─── Inline link button ─────────────────────────────────────────── */
.docs-inline-link {
  background: none;
  border: none;
  color: var(--accent, #4ade80);
  font-family: inherit;
  font-size: inherit;
  cursor: pointer;
  padding: 0;
  text-decoration: underline;
  text-underline-offset: 2px;
}

/* ─── Release notes ──────────────────────────────────────────────── */
.release-block {
  padding: 0.75rem 0;
  border-bottom: 1px solid var(--border);
}

.release-block:last-child { border-bottom: none; }

.release-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.2rem;
}

.release-version {
  font-size: 0.95rem;
  font-weight: 800;
  color: var(--accent, #4ade80);
}

.release-date {
  font-size: 0.78rem;
  color: var(--muted);
}

.release-tagline {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--muted);
  margin: 0 0 0.4rem;
}

/* ─── FAQ ────────────────────────────────────────────────────────── */
.faq-item {
  padding: 0.75rem 0;
  border-bottom: 1px solid var(--border);
}

.faq-item:last-child { border-bottom: none; }

.faq-q {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--text);
  margin: 0 0 0.35rem;
}

/* ─── CSV reference ──────────────────────────────────────────────── */
.docs-code {
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 0.75rem 1rem;
  font-family: ui-monospace, monospace;
  font-size: 0.78rem;
  color: var(--text);
  overflow-x: auto;
  line-height: 1.6;
  margin: 0.5rem 0 1rem;
  white-space: pre;
}

.csv-table-wrap {
  overflow-x: auto;
  margin: 0.5rem 0 1rem;
}

.csv-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.8rem;
}

.csv-table th,
.csv-table td {
  text-align: left;
  padding: 0.4rem 0.6rem;
  border-bottom: 1px solid var(--border);
  vertical-align: top;
  line-height: 1.4;
}

.csv-table th {
  color: var(--muted);
  font-weight: 600;
  font-size: 0.72rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.csv-table tr:last-child td { border-bottom: none; }

/* ─── Responsive ─────────────────────────────────────────────────── */
@media (max-width: 768px) {
  .docs-layout {
    grid-template-columns: 1fr;
    gap: 0;
  }
  .docs-sidebar { display: none; }
  .docs-mobile-nav { display: block; }
}
</style>
