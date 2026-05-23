<!--
  Module:   components/sections/RulesEngine.vue
  Project:  A Penny For Our Thoughts
  Created:  May 2026 (Vue 3 migration — Sprint 7)
  Summary:  CRUD for transaction categorisation rules.
            Each rule has a pattern, a matchType (contains/startsWith/exact),
            and a target category. Rules are applied in order — first match wins.
            applyRulesToName() from calculations.ts handles the matching.
-->

<script setup lang="ts">
import { ref, reactive, computed } from 'vue';
import { useBudgetStore } from '@/stores/budget';
import { useToast } from '@/composables/useToast';
import BaseModal from '@/components/ui/BaseModal.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import EmptyState from '@/components/ui/EmptyState.vue';
import { WANT_CATEGORIES } from '@/data/categories';
import type { Rule, RuleMatchType } from '@/types/budget';

const budget = useBudgetStore();
const toast  = useToast();

const MATCH_TYPES: { value: RuleMatchType; label: string }[] = [
  { value: 'contains',    label: 'Contains' },
  { value: 'startsWith',  label: 'Starts with' },
  { value: 'exact',       label: 'Exact match' },
];

// ─── Sorted rules (display order = array order = priority) ────────────────────
const rules = computed(() => budget.rules);

// ─── Add / Edit modal ─────────────────────────────────────────────────────────
const showModal = ref(false);
const editingId = ref<string | null>(null);

const form = reactive({
  pattern:   '',
  matchType: 'contains' as RuleMatchType,
  category:  WANT_CATEGORIES[0] as string,
});

function openAdd(): void {
  editingId.value = null;
  form.pattern   = '';
  form.matchType = 'contains';
  form.category  = WANT_CATEGORIES[0];
  showModal.value = true;
}

function openEdit(rule: Rule): void {
  editingId.value  = rule.id;
  form.pattern     = rule.pattern;
  form.matchType   = rule.matchType;
  form.category    = rule.category;
  showModal.value  = true;
}

function saveRule(): void {
  const pattern = form.pattern.trim();
  if (!pattern) {
    toast.show('Pattern cannot be empty.', 'warning');
    return;
  }
  if (editingId.value) {
    budget.updateRule(editingId.value, {
      pattern,
      matchType: form.matchType,
      category:  form.category,
    });
    toast.show('Rule updated.', 'success');
  } else {
    budget.addRule({ pattern, matchType: form.matchType, category: form.category });
    toast.show('Rule added.', 'success');
  }
  showModal.value = false;
}

function deleteRule(id: string): void {
  budget.deleteRule(id);
  toast.show('Rule deleted.', 'success');
}

// ─── Live test ────────────────────────────────────────────────────────────────
import { applyRulesToName } from '@/utils/calculations';

const testInput = ref('');
const testResult = computed(() => {
  if (!testInput.value.trim()) return null;
  return applyRulesToName(budget.rules, testInput.value.trim());
});
</script>

<template>
  <div class="rules-engine">
    <!-- Header row -->
    <div class="rules-engine__header">
      <p class="rules-engine__desc">
        Rules automatically categorise purchases as you type. First matching rule wins.
      </p>
      <BaseButton
        size="sm"
        @click="openAdd"
      >
        + Add Rule
      </BaseButton>
    </div>

    <!-- Rules list -->
    <div
      v-if="rules.length"
      class="rules-engine__list"
    >
      <div
        v-for="(rule, idx) in rules"
        :key="rule.id"
        class="rules-engine__row"
      >
        <span class="rules-engine__priority">{{ idx + 1 }}</span>
        <span class="rules-engine__pattern">{{ rule.pattern }}</span>
        <span class="rules-engine__match-type">{{ MATCH_TYPES.find(m => m.value === rule.matchType)?.label }}</span>
        <span class="rules-engine__arrow">→</span>
        <span class="rules-engine__category">{{ rule.category }}</span>
        <div class="rules-engine__row-actions">
          <button
            class="rules-engine__icon-btn"
            aria-label="Edit rule"
            title="Edit"
            @click="openEdit(rule)"
          >
            ✎
          </button>
          <button
            class="rules-engine__icon-btn rules-engine__icon-btn--danger"
            aria-label="Delete rule"
            title="Delete"
            @click="deleteRule(rule.id)"
          >
            ×
          </button>
        </div>
      </div>
    </div>

    <EmptyState
      v-else
      icon="🤖"
      title="No rules yet"
      hint="Add rules to automatically categorise your purchases."
    />

    <!-- Live test input -->
    <div
      v-if="rules.length"
      class="rules-engine__test"
    >
      <label
        class="rules-engine__test-label"
        for="rules-test-input"
      >
        Test a purchase name:
      </label>
      <div class="rules-engine__test-row">
        <input
          id="rules-test-input"
          v-model="testInput"
          type="text"
          class="rules-engine__test-input"
          placeholder="e.g. Tim Hortons"
          aria-label="Test purchase name"
        >
        <span
          v-if="testResult !== null"
          class="rules-engine__test-match"
        >
          → {{ testResult }}
        </span>
        <span
          v-else-if="testInput.trim()"
          class="rules-engine__test-no-match"
        >
          No match
        </span>
      </div>
    </div>

    <!-- Add / Edit Modal -->
    <BaseModal
      v-model:open="showModal"
      :title="editingId ? 'Edit Rule' : 'Add Rule'"
      size="sm"
    >
      <div class="rules-modal__form">
        <div class="rules-modal__field">
          <label
            class="rules-modal__label"
            for="rule-pattern"
          >Pattern</label>
          <input
            id="rule-pattern"
            v-model="form.pattern"
            type="text"
            class="rules-modal__input"
            placeholder="e.g. tim hortons"
            aria-required="true"
          >
          <span class="rules-modal__hint">Case-insensitive. Matches against the purchase name.</span>
        </div>

        <div class="rules-modal__field">
          <label
            class="rules-modal__label"
            for="rule-match-type"
          >Match type</label>
          <select
            id="rule-match-type"
            v-model="form.matchType"
            class="rules-modal__select"
          >
            <option
              v-for="mt in MATCH_TYPES"
              :key="mt.value"
              :value="mt.value"
            >
              {{ mt.label }}
            </option>
          </select>
        </div>

        <div class="rules-modal__field">
          <label
            class="rules-modal__label"
            for="rule-category"
          >Assign category</label>
          <select
            id="rule-category"
            v-model="form.category"
            class="rules-modal__select"
          >
            <option
              v-for="cat in WANT_CATEGORIES"
              :key="cat"
              :value="cat"
            >
              {{ cat }}
            </option>
          </select>
        </div>

        <div class="rules-modal__actions">
          <BaseButton @click="saveRule">
            {{ editingId ? 'Update' : 'Add Rule' }}
          </BaseButton>
          <BaseButton
            variant="ghost"
            @click="showModal = false"
          >
            Cancel
          </BaseButton>
        </div>
      </div>
    </BaseModal>
  </div>
</template>

<style scoped>
.rules-engine {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.rules-engine__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  /* Wrap button below description on narrow screens so it's never crushed */
  flex-wrap: wrap;
}

.rules-engine__desc {
  font-size: 0.82rem;
  color: var(--muted);
  margin: 0;
  line-height: 1.45;
  max-width: 44ch;
}

/* ─── Rules list ─────────────────────────────────────────────────── */
.rules-engine__list {
  display: flex;
  flex-direction: column;
  gap: 0;
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
}

.rules-engine__row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.55rem 0.75rem;
  font-size: 0.82rem;
  border-bottom: 1px solid var(--border);
  transition: background 0.12s;
}

.rules-engine__row:last-child {
  border-bottom: none;
}

.rules-engine__row:hover {
  background: var(--surface2);
}

.rules-engine__priority {
  width: 1.2rem;
  text-align: center;
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--muted);
  flex-shrink: 0;
}

.rules-engine__pattern {
  font-family: ui-monospace, monospace;
  font-size: 0.8rem;
  color: var(--accent, #4ade80);
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rules-engine__match-type {
  font-size: 0.72rem;
  color: var(--muted);
  flex-shrink: 0;
  width: 7rem;
}

.rules-engine__arrow {
  color: var(--muted);
  flex-shrink: 0;
}

.rules-engine__category {
  font-weight: 600;
  flex-shrink: 0;
  width: 8rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rules-engine__row-actions {
  display: flex;
  align-items: center;
  gap: 0.2rem;
  margin-left: auto;
  flex-shrink: 0;
}

.rules-engine__icon-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--muted);
  font-size: 1rem;
  width: 24px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: color 0.12s, background 0.12s;
}

.rules-engine__icon-btn:hover {
  color: var(--text);
  background: rgba(255,255,255,0.06);
}

.rules-engine__icon-btn--danger:hover {
  color: var(--danger, #f87171);
}

/* ─── Live test ──────────────────────────────────────────────────── */
.rules-engine__test {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding: 0.6rem 0.75rem;
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: 8px;
}

.rules-engine__test-label {
  font-size: 0.75rem;
  color: var(--muted);
  font-weight: 600;
}

.rules-engine__test-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.rules-engine__test-input {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text);
  padding: 0.3rem 0.6rem;
  font-size: 0.875rem;
  font-family: inherit;
  height: 30px;
  flex: 1;
  min-width: 140px;
}

.rules-engine__test-input:focus {
  outline: 2px solid var(--accent, #4ade80);
  outline-offset: 2px;
}

.rules-engine__test-match {
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--accent, #4ade80);
}

.rules-engine__test-no-match {
  font-size: 0.82rem;
  color: var(--muted);
}

/* ─── Modal form ─────────────────────────────────────────────────── */
.rules-modal__form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.rules-modal__field {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.rules-modal__label {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--muted);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.rules-modal__input,
.rules-modal__select {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text);
  padding: 0.45rem 0.6rem;
  font-size: 0.875rem;
  font-family: inherit;
  width: 100%;
  box-sizing: border-box;
}

.rules-modal__input:focus,
.rules-modal__select:focus {
  outline: 2px solid var(--accent, #4ade80);
  outline-offset: 2px;
}

.rules-modal__hint {
  font-size: 0.72rem;
  color: var(--muted);
}

.rules-modal__actions {
  display: flex;
  gap: 0.5rem;
  padding-top: 0.25rem;
}

@media (max-width: 540px) {
  .rules-engine__match-type { display: none; }
  .rules-engine__category { width: auto; }
}
</style>
