<!--
  Module:   components/onboarding/OnboardingModal.vue
  Project:  A Penny For Our Thoughts
  Created:  May 2026 (Sprint 10 — Onboarding Flow)
  Summary:  4-step first-run wizard that walks the user through the
            essentials: welcome → income → pay date → budget split.
            Emits "done" when finished or skipped; the parent marks
            hasOnboarded = true and the modal never reappears.

            Steps:
              1  Welcome — value prop, no skip
              2  Income  — add first income stream
              3  Pay date — set bi-weekly anchor
              4  Budget   — confirm or adjust 50/30/20 split

  Usage:
    <OnboardingModal v-if="budget.isFirstRun" @done="budget.completeOnboarding()" />
-->

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useBudgetStore } from '@/stores/budget';
import BaseButton from '@/components/ui/BaseButton.vue';

const emit = defineEmits<{ (e: 'done'): void }>();

const budget = useBudgetStore();

// ─── Step management ─────────────────────────────────────────────
const TOTAL_STEPS = 4;
const step = ref(1);

function next(): void { step.value = Math.min(step.value + 1, TOTAL_STEPS); }
function prev(): void { step.value = Math.max(step.value - 1, 1); }

function skip(): void {
  emit('done');
}

function finish(): void {
  // Persist all collected data then close
  applyIncome();
  applyPayDate();
  applyAllocation();
  emit('done');
}

// ─── Step 2: Income stream ────────────────────────────────────────
const incomeName      = ref('My Income');
const incomeAmount    = ref<number | null>(null);
const incomeBiweekly  = ref(true);
const incomeError     = ref('');

function validateIncome(): boolean {
  if (!incomeAmount.value || incomeAmount.value <= 0) {
    incomeError.value = 'Please enter a positive amount.';
    return false;
  }
  incomeError.value = '';
  return true;
}

function applyIncome(): void {
  if (!incomeAmount.value || incomeAmount.value <= 0) return;
  budget.addIncomeStream({
    name: incomeName.value.trim() || 'My Income',
    amount: incomeAmount.value,
    biweekly: incomeBiweekly.value,
  });
}

function nextFromIncome(): void {
  if (incomeAmount.value && incomeAmount.value > 0) {
    incomeError.value = '';
    next();
  } else if (!incomeAmount.value) {
    // Allow skipping with no income
    next();
  } else {
    validateIncome();
  }
}

// ─── Step 3: Pay start date ───────────────────────────────────────
const payDate = ref('');

function applyPayDate(): void {
  if (payDate.value) budget.setPayStart(payDate.value);
}

// ─── Step 4: Budget allocation ────────────────────────────────────
const needs   = ref(budget.allocation.needs);
const wants   = ref(budget.allocation.wants);
const savings = ref(budget.allocation.savings);

const allocationSum  = computed(() => needs.value + wants.value + savings.value);
const allocationValid = computed(() => allocationSum.value === 100);

function applyAllocation(): void {
  if (!allocationValid.value) return;
  budget.setAllocation({ needs: needs.value, wants: wants.value, savings: savings.value });
}
</script>

<template>
  <Teleport to="body">
    <div class="ob-overlay">
      <div
        class="ob-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ob-title"
      >
        <!-- Progress dots -->
        <div
          class="ob-dots"
          aria-label="Step {{ step }} of {{ TOTAL_STEPS }}"
        >
          <span
            v-for="n in TOTAL_STEPS"
            :key="n"
            class="ob-dot"
            :class="{ 'ob-dot--active': n === step, 'ob-dot--done': n < step }"
          />
        </div>

        <!-- ── Step 1: Welcome ─────────────────────────────────── -->
        <div
          v-if="step === 1"
          class="ob-step"
        >
          <div
            class="ob-icon"
            aria-hidden="true"
          >
            💸
          </div>
          <h2
            id="ob-title"
            class="ob-title"
          >
            Welcome to<br>A Penny For Our Thoughts
          </h2>
          <p class="ob-body">
            Your personal 50/30/20 budget dashboard. It takes about 2 minutes
            to get set up — let's start with the basics.
          </p>
          <ul class="ob-checklist">
            <li>📊 Track income &amp; spending across every category</li>
            <li>🎯 Set savings goals and watch your progress</li>
            <li>📅 See upcoming bills in a monthly calendar</li>
          </ul>
          <div class="ob-actions ob-actions--single">
            <BaseButton
              size="lg"
              block
              @click="next"
            >
              Get started →
            </BaseButton>
          </div>
        </div>

        <!-- ── Step 2: Income ──────────────────────────────────── -->
        <div
          v-else-if="step === 2"
          class="ob-step"
        >
          <h2
            id="ob-title"
            class="ob-title"
          >
            Add your first income stream
          </h2>
          <p class="ob-body">
            The dashboard is built around your take-home pay.
            You can add more streams later.
          </p>

          <div class="ob-form">
            <div class="ob-field">
              <label
                class="ob-label"
                for="ob-income-name"
              >Label</label>
              <input
                id="ob-income-name"
                v-model="incomeName"
                class="ob-input"
                type="text"
                placeholder="e.g. Salary, Freelance…"
                maxlength="60"
              >
            </div>

            <div class="ob-field">
              <label
                class="ob-label"
                for="ob-income-amount"
              >Amount ($)</label>
              <input
                id="ob-income-amount"
                v-model.number="incomeAmount"
                class="ob-input"
                :class="{ 'ob-input--error': incomeError }"
                type="number"
                inputmode="decimal"
                min="0"
                step="0.01"
                placeholder="0.00"
              >
              <p
                v-if="incomeError"
                class="ob-error"
              >
                {{ incomeError }}
              </p>
            </div>

            <label class="ob-toggle-row">
              <input
                v-model="incomeBiweekly"
                type="checkbox"
                class="ob-checkbox"
              >
              <span>Paid bi-weekly (every 2 weeks)</span>
            </label>
          </div>

          <div class="ob-actions">
            <BaseButton
              variant="ghost"
              @click="skip"
            >
              Skip setup
            </BaseButton>
            <div class="ob-actions__right">
              <BaseButton
                variant="secondary"
                @click="prev"
              >
                ← Back
              </BaseButton>
              <BaseButton @click="nextFromIncome">
                Next →
              </BaseButton>
            </div>
          </div>
        </div>

        <!-- ── Step 3: Pay start date ──────────────────────────── -->
        <div
          v-else-if="step === 3"
          class="ob-step"
        >
          <h2
            id="ob-title"
            class="ob-title"
          >
            When does your pay period start?
          </h2>
          <p class="ob-body">
            This anchors your bi-weekly budget envelope so the app knows
            exactly how many days are left in each period.
          </p>

          <div class="ob-form">
            <div class="ob-field">
              <label
                class="ob-label"
                for="ob-pay-date"
              >First pay date</label>
              <input
                id="ob-pay-date"
                v-model="payDate"
                class="ob-input"
                type="date"
              >
            </div>
          </div>

          <div class="ob-actions">
            <BaseButton
              variant="ghost"
              @click="skip"
            >
              Skip setup
            </BaseButton>
            <div class="ob-actions__right">
              <BaseButton
                variant="secondary"
                @click="prev"
              >
                ← Back
              </BaseButton>
              <BaseButton @click="next">
                Next →
              </BaseButton>
            </div>
          </div>
        </div>

        <!-- ── Step 4: Budget split ────────────────────────────── -->
        <div
          v-else-if="step === 4"
          class="ob-step"
        >
          <h2
            id="ob-title"
            class="ob-title"
          >
            Confirm your budget split
          </h2>
          <p class="ob-body">
            The classic 50/30/20 rule allocates income to needs, wants, and
            savings. Adjust the percentages to match your lifestyle — they
            just need to add up to 100.
          </p>

          <div class="ob-form">
            <div class="ob-alloc-row">
              <label class="ob-alloc-label">
                <span class="ob-alloc-badge ob-alloc-badge--needs">Needs</span>
              </label>
              <input
                v-model.number="needs"
                class="ob-input ob-input--pct"
                type="number"
                inputmode="numeric"
                min="0"
                max="100"
                step="1"
              >
              <span class="ob-alloc-pct">%</span>
            </div>
            <div class="ob-alloc-row">
              <label class="ob-alloc-label">
                <span class="ob-alloc-badge ob-alloc-badge--wants">Wants</span>
              </label>
              <input
                v-model.number="wants"
                class="ob-input ob-input--pct"
                type="number"
                inputmode="numeric"
                min="0"
                max="100"
                step="1"
              >
              <span class="ob-alloc-pct">%</span>
            </div>
            <div class="ob-alloc-row">
              <label class="ob-alloc-label">
                <span class="ob-alloc-badge ob-alloc-badge--savings">Savings</span>
              </label>
              <input
                v-model.number="savings"
                class="ob-input ob-input--pct"
                type="number"
                inputmode="numeric"
                min="0"
                max="100"
                step="1"
              >
              <span class="ob-alloc-pct">%</span>
            </div>

            <p
              class="ob-sum"
              :class="allocationValid ? 'ob-sum--ok' : 'ob-sum--bad'"
            >
              Total: {{ allocationSum }}% {{ allocationValid ? '✓' : '— must equal 100' }}
            </p>
          </div>

          <div class="ob-actions">
            <BaseButton
              variant="ghost"
              @click="skip"
            >
              Skip setup
            </BaseButton>
            <div class="ob-actions__right">
              <BaseButton
                variant="secondary"
                @click="prev"
              >
                ← Back
              </BaseButton>
              <BaseButton
                :disabled="!allocationValid"
                @click="finish"
              >
                Finish 🎉
              </BaseButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
/* ─── Overlay ───────────────────────────────────────────────────── */
.ob-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(3px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9500;
  padding: 1rem;
}

/* ─── Modal shell ───────────────────────────────────────────────── */
.ob-modal {
  background: var(--surface, #0a1810);
  border: 1px solid var(--border, #2a3041);
  border-radius: 16px;
  padding: 2rem;
  width: 100%;
  max-width: 480px;
  max-height: calc(100dvh - 2rem);
  overflow-y: auto;
  color: var(--text, #e3e6ee);
  box-shadow: 0 40px 100px rgba(0, 0, 0, 0.6);
  animation: ob-enter 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes ob-enter {
  from { opacity: 0; transform: translateY(20px) scale(0.97); }
  to   { opacity: 1; transform: none; }
}

/* ─── Progress dots ─────────────────────────────────────────────── */
.ob-dots {
  display: flex;
  justify-content: center;
  gap: 0.5rem;
  margin-bottom: 1.75rem;
}

.ob-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--border, #2a3041);
  transition: background 0.2s ease, transform 0.2s ease;
}

.ob-dot--done {
  background: var(--accent2, #34d399);
}

.ob-dot--active {
  background: var(--accent, #4ade80);
  transform: scale(1.35);
}

/* ─── Step content ──────────────────────────────────────────────── */
.ob-step {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.ob-icon {
  font-size: 3rem;
  text-align: center;
  line-height: 1;
}

.ob-title {
  margin: 0;
  font-size: clamp(1.15rem, 4vw, 1.4rem);
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.25;
  text-align: center;
}

.ob-body {
  margin: 0;
  font-size: 0.9rem;
  color: var(--muted, #5a7a63);
  line-height: 1.6;
  text-align: center;
}

/* ─── Welcome checklist ─────────────────────────────────────────── */
.ob-checklist {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.ob-checklist li {
  font-size: 0.88rem;
  padding: 0.55rem 0.75rem;
  background: var(--surface2, #0f2018);
  border: 1px solid var(--border, #2a3041);
  border-radius: 8px;
}

/* ─── Form ──────────────────────────────────────────────────────── */
.ob-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 0.25rem;
}

.ob-field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.ob-label {
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--muted, #5a7a63);
}

.ob-input {
  background: var(--surface2, #0f2018);
  border: 1px solid var(--border, #2a3041);
  border-radius: 8px;
  padding: 0.6rem 0.8rem;
  color: var(--text, #e3e6ee);
  font-size: 0.95rem;
  font-family: inherit;
  width: 100%;
  box-sizing: border-box;
  transition: border-color 0.15s ease;
}

.ob-input:focus {
  outline: none;
  border-color: var(--accent, #4ade80);
}

.ob-input--error {
  border-color: var(--danger, #f87171);
}

.ob-input--pct {
  width: 80px;
  text-align: right;
}

.ob-error {
  margin: 0;
  font-size: 0.8rem;
  color: var(--danger, #f87171);
}

.ob-toggle-row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-size: 0.88rem;
  color: var(--muted, #5a7a63);
  cursor: pointer;
  user-select: none;
}

.ob-checkbox {
  accent-color: var(--accent, #4ade80);
  width: 1rem;
  height: 1rem;
  cursor: pointer;
  flex-shrink: 0;
}

/* ─── Allocation step ───────────────────────────────────────────── */
.ob-alloc-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.ob-alloc-label {
  flex: 1;
}

.ob-alloc-badge {
  display: inline-block;
  padding: 0.25rem 0.6rem;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.ob-alloc-badge--needs   { background: rgba(74, 222, 128, 0.12); color: var(--accent,  #4ade80); }
.ob-alloc-badge--wants   { background: rgba(251, 191,  36, 0.12); color: #fbbf24; }
.ob-alloc-badge--savings { background: rgba(52,  211, 153, 0.12); color: var(--accent2, #34d399); }

.ob-alloc-pct {
  font-size: 0.88rem;
  color: var(--muted, #5a7a63);
  min-width: 1.2rem;
}

.ob-sum {
  margin: 0.25rem 0 0;
  font-size: 0.85rem;
  font-weight: 600;
  text-align: right;
}

.ob-sum--ok  { color: var(--accent2, #34d399); }
.ob-sum--bad { color: var(--danger, #f87171); }

/* ─── Actions bar ───────────────────────────────────────────────── */
.ob-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-top: 0.5rem;
  flex-wrap: wrap;
}

.ob-actions--single {
  justify-content: center;
}

.ob-actions__right {
  display: flex;
  gap: 0.5rem;
}

/* ─── Bottom-sheet on phones ────────────────────────────────────── */
@media (max-width: 540px) {
  .ob-overlay {
    align-items: flex-end;
    padding: 0;
  }

  .ob-modal {
    max-width: 100%;
    border-radius: 20px 20px 0 0;
    border-bottom: 0;
    padding-top: 2rem;
    padding-bottom: max(1.5rem, env(safe-area-inset-bottom, 0px));
    max-height: 92dvh;
    animation: ob-enter-bottom 0.3s cubic-bezier(0.32, 0.72, 0, 1);
  }

  @keyframes ob-enter-bottom {
    from { transform: translateY(100%); }
    to   { transform: translateY(0); }
  }

  .ob-modal::before {
    content: '';
    position: absolute;
    top: 0.75rem;
    left: 50%;
    transform: translateX(-50%);
    width: 36px;
    height: 4px;
    background: var(--border-light, #244530);
    border-radius: 2px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .ob-modal { animation: none; }
}
</style>
