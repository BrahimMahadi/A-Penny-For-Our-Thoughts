/**
 * Module:   tests/components/onboarding.spec.ts
 * Project:  A Penny For Our Thoughts
 * Created:  May 2026 (Sprint 10 — Onboarding Flow)
 * Summary:  Tests for the onboarding system:
 *             - Budget store: hasOnboarded flag, dismissedVersion, isFirstRun getter,
 *               completeOnboarding(), dismissWhatsNew() actions, and migrateState() compat.
 *             - OnboardingModal: step navigation, income submission, skip, done emission.
 *               Note: the modal uses <Teleport to="body"> so all DOM assertions use
 *               document.body.querySelector rather than wrapper.find().
 *             - WhatsNewBanner: visibility logic and dismiss behaviour.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';

import { useBudgetStore, makeDefaultState, makeBlankState, migrateState } from '@/stores/budget';
import OnboardingModal from '@/components/onboarding/OnboardingModal.vue';
import WhatsNewBanner  from '@/components/onboarding/WhatsNewBanner.vue';

// ─── Helpers ─────────────────────────────────────────────────────

/** Return all buttons whose trimmed text matches the given string. */
function bodyButtons(label: string): HTMLButtonElement[] {
  return Array.from(document.body.querySelectorAll<HTMLButtonElement>('button')).filter(
    (b) => b.textContent?.trim() === label,
  );
}

/** Click the first body button whose text contains `label`. */
async function clickBodyButton(label: string): Promise<void> {
  const btn = Array.from(document.body.querySelectorAll<HTMLButtonElement>('button')).find(
    (b) => b.textContent?.trim().includes(label),
  );
  if (!btn) throw new Error(`Button containing "${label}" not found in body`);
  btn.click();
  await nextTick();
}

// ─────────────────────────────────────────────────────────────────
//  Budget store — onboarding state
// ─────────────────────────────────────────────────────────────────
describe('budget store — onboarding fields', () => {
  it('makeDefaultState sets hasOnboarded = false', () => {
    expect(makeDefaultState().hasOnboarded).toBe(false);
  });

  it('makeDefaultState sets dismissedVersion = null', () => {
    expect(makeDefaultState().dismissedVersion).toBeNull();
  });

  it('makeBlankState also initialises both flags', () => {
    const s = makeBlankState();
    expect(s.hasOnboarded).toBe(false);
    expect(s.dismissedVersion).toBeNull();
  });

  it('migrateState adds hasOnboarded = false for legacy state without it', () => {
    const legacy = { allocation: { needs: 50, wants: 30, savings: 20 } };
    const migrated = migrateState(legacy);
    expect(migrated.hasOnboarded).toBe(false);
  });

  it('migrateState adds dismissedVersion = null for legacy state without it', () => {
    const legacy = { allocation: { needs: 50, wants: 30, savings: 20 } };
    const migrated = migrateState(legacy);
    expect(migrated.dismissedVersion).toBeNull();
  });

  it('migrateState preserves existing hasOnboarded = true', () => {
    const s = { ...makeDefaultState(), hasOnboarded: true };
    expect(migrateState(s).hasOnboarded).toBe(true);
  });

  it('migrateState preserves existing dismissedVersion', () => {
    const s = { ...makeDefaultState(), dismissedVersion: '1.3.0' };
    expect(migrateState(s).dismissedVersion).toBe('1.3.0');
  });
});

// ─────────────────────────────────────────────────────────────────
//  Budget store — actions
// ─────────────────────────────────────────────────────────────────
describe('budget store — completeOnboarding / dismissWhatsNew', () => {
  beforeEach(() => { setActivePinia(createPinia()); });

  it('completeOnboarding sets hasOnboarded = true', () => {
    const store = useBudgetStore();
    expect(store.hasOnboarded).toBe(false);
    store.completeOnboarding();
    expect(store.hasOnboarded).toBe(true);
  });

  it('dismissWhatsNew sets dismissedVersion to the given string', () => {
    const store = useBudgetStore();
    expect(store.dismissedVersion).toBeNull();
    store.dismissWhatsNew('1.4.0');
    expect(store.dismissedVersion).toBe('1.4.0');
  });

  it('calling dismissWhatsNew again updates to the new version', () => {
    const store = useBudgetStore();
    store.dismissWhatsNew('1.4.0');
    store.dismissWhatsNew('1.5.0');
    expect(store.dismissedVersion).toBe('1.5.0');
  });
});

// ─────────────────────────────────────────────────────────────────
//  Budget store — setDisplayName (v2.45.0)
// ─────────────────────────────────────────────────────────────────
describe('budget store — displayName', () => {
  beforeEach(() => { setActivePinia(createPinia()); });

  it('makeDefaultState seeds displayName as empty string', () => {
    expect(makeDefaultState().displayName).toBe('');
  });

  it('makeBlankState seeds displayName as empty string', () => {
    expect(makeBlankState().displayName).toBe('');
  });

  it('migrateState back-fills displayName = "" for legacy state without it', () => {
    const legacy = { ...makeDefaultState() } as Record<string, unknown>;
    delete legacy.displayName;
    expect(migrateState(legacy as never).displayName).toBe('');
  });

  it('migrateState preserves an existing displayName', () => {
    const s = { ...makeDefaultState(), displayName: 'Brahim' };
    expect(migrateState(s).displayName).toBe('Brahim');
  });

  it('setDisplayName stores a trimmed name', () => {
    const store = useBudgetStore();
    store.setDisplayName('  Brahim  ');
    expect(store.displayName).toBe('Brahim');
  });

  it('setDisplayName caps the name at 40 characters', () => {
    const store = useBudgetStore();
    store.setDisplayName('x'.repeat(60));
    expect(store.displayName).toHaveLength(40);
  });

  it('setDisplayName with whitespace-only clears the name', () => {
    const store = useBudgetStore();
    store.setDisplayName('Brahim');
    store.setDisplayName('   ');
    expect(store.displayName).toBe('');
  });
});

// ─────────────────────────────────────────────────────────────────
//  Budget store — isFirstRun getter
// ─────────────────────────────────────────────────────────────────
describe('budget store — isFirstRun getter', () => {
  beforeEach(() => { setActivePinia(createPinia()); });

  it('is true when hasOnboarded=false and no income streams', () => {
    const store = useBudgetStore();
    expect(store.isFirstRun).toBe(true);
  });

  it('is false once completeOnboarding() is called', () => {
    const store = useBudgetStore();
    store.completeOnboarding();
    expect(store.isFirstRun).toBe(false);
  });

  it('is false when an income stream exists (even if hasOnboarded=false)', () => {
    const store = useBudgetStore();
    store.addIncomeStream({ name: 'Salary', amount: 3000, biweekly: false });
    expect(store.isFirstRun).toBe(false);
  });

  it('stays false once completeOnboarding is called, regardless of streams', () => {
    const store = useBudgetStore();
    store.completeOnboarding();
    expect(store.isFirstRun).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────
//  OnboardingModal
//  The modal uses <Teleport to="body"> so DOM assertions target
//  document.body, not the wrapper element.
// ─────────────────────────────────────────────────────────────────
describe('OnboardingModal', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let wrapper: any;

  beforeEach(() => {
    setActivePinia(createPinia());
    document.body.innerHTML = '';
  });

  afterEach(() => {
    wrapper?.unmount();
    document.body.innerHTML = '';
  });

  it('renders Step 1 into document.body via Teleport', async () => {
    wrapper = mount(OnboardingModal, { attachTo: document.body });
    await nextTick();
    expect(document.body.querySelector('.ob-modal')).not.toBeNull();
    expect(document.body.textContent).toContain('Welcome to');
  });

  it('advances to Step 2 when "Get started" is clicked', async () => {
    wrapper = mount(OnboardingModal, { attachTo: document.body });
    await nextTick();
    await clickBodyButton('Get started →');
    expect(document.body.textContent).toContain('Add your first income stream');
  });

  it('shows Steps 2 → 3 → 4 via Next navigation', async () => {
    wrapper = mount(OnboardingModal, { attachTo: document.body });
    await nextTick();

    // Step 1 → 2
    await clickBodyButton('Get started →');
    expect(document.body.textContent).toContain('Add your first income stream');

    // Step 2 → 3 (no income entered — Next still advances)
    await clickBodyButton('Next →');
    expect(document.body.textContent).toContain('When does your pay period start');

    // Step 3 → 4
    await clickBodyButton('Next →');
    expect(document.body.textContent).toContain('Confirm your budget split');
  });

  it('emits "done" when "Skip setup" is clicked from Step 2', async () => {
    wrapper = mount(OnboardingModal, { attachTo: document.body });
    await nextTick();
    await clickBodyButton('Get started →'); // → step 2
    await clickBodyButton('Skip setup');
    expect(wrapper.emitted('done')).toBeTruthy();
  });

  it('adds income stream to store on Finish', async () => {
    const store = useBudgetStore();
    wrapper = mount(OnboardingModal, { attachTo: document.body });
    await nextTick();

    await clickBodyButton('Get started →');

    // Fill amount input
    const amountInput = document.body.querySelector<HTMLInputElement>('#ob-income-amount');
    expect(amountInput).not.toBeNull();
    amountInput!.value = '2500';
    amountInput!.dispatchEvent(new Event('input'));
    await nextTick();

    await clickBodyButton('Next →'); // step 2 → 3
    await clickBodyButton('Next →'); // step 3 → 4

    // Finish — applyIncome runs here
    await clickBodyButton('Finish 🎉');

    expect(wrapper.emitted('done')).toBeTruthy();
    expect(store.incomeStreams).toHaveLength(1);
    expect(store.incomeStreams[0].amount).toBe(2500);
  });

  it('does not add income stream when no amount entered (skip path)', async () => {
    const store = useBudgetStore();
    wrapper = mount(OnboardingModal, { attachTo: document.body });
    await nextTick();

    await clickBodyButton('Get started →');
    await clickBodyButton('Skip setup'); // no income entered

    expect(store.incomeStreams).toHaveLength(0);
  });

  it('"Finish" button is disabled when allocation does not sum to 100', async () => {
    wrapper = mount(OnboardingModal, { attachTo: document.body });
    await nextTick();

    // Navigate to step 4
    await clickBodyButton('Get started →');
    await clickBodyButton('Next →');
    await clickBodyButton('Next →');

    // Corrupt the first allocation input (needs)
    const inputs = document.body.querySelectorAll<HTMLInputElement>('input[type="number"]');
    inputs[0].value = '99';
    inputs[0].dispatchEvent(new Event('input'));
    await nextTick();

    const finishBtn = bodyButtons('Finish 🎉')[0];
    expect(finishBtn).toBeTruthy();
    expect(finishBtn.disabled).toBe(true);
  });

  // ── v2.45.0: display-name capture on the Welcome step ──
  it('renders the display-name field on Step 1', async () => {
    wrapper = mount(OnboardingModal, { attachTo: document.body });
    await nextTick();
    expect(document.body.querySelector('#ob-display-name')).not.toBeNull();
  });

  it('persists the name to the store when leaving the Welcome step', async () => {
    const store = useBudgetStore();
    wrapper = mount(OnboardingModal, { attachTo: document.body });
    await nextTick();

    const nameInput = document.body.querySelector<HTMLInputElement>('#ob-display-name');
    nameInput!.value = '  Brahim  ';
    nameInput!.dispatchEvent(new Event('input'));
    await nextTick();

    await clickBodyButton('Get started →');
    expect(store.displayName).toBe('Brahim');
  });

  it('keeps the name even when the user skips the remaining steps', async () => {
    const store = useBudgetStore();
    wrapper = mount(OnboardingModal, { attachTo: document.body });
    await nextTick();

    const nameInput = document.body.querySelector<HTMLInputElement>('#ob-display-name');
    nameInput!.value = 'Sam';
    nameInput!.dispatchEvent(new Event('input'));
    await nextTick();

    await clickBodyButton('Get started →'); // → step 2, name already persisted
    await clickBodyButton('Skip setup');

    expect(store.displayName).toBe('Sam');
    expect(wrapper.emitted('done')).toBeTruthy();
  });

  it('leaves displayName empty when the field is left blank', async () => {
    const store = useBudgetStore();
    wrapper = mount(OnboardingModal, { attachTo: document.body });
    await nextTick();

    await clickBodyButton('Get started →'); // no name entered
    expect(store.displayName).toBe('');
  });
});

// ─────────────────────────────────────────────────────────────────
//  WhatsNewBanner
// ─────────────────────────────────────────────────────────────────
describe('WhatsNewBanner', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let wrapper: any;

  beforeEach(() => {
    setActivePinia(createPinia());
    document.body.innerHTML = '';
  });

  afterEach(() => {
    wrapper?.unmount();
    document.body.innerHTML = '';
  });

  it('is visible when dismissedVersion !== current APP_VERSION', async () => {
    const store = useBudgetStore();
    expect(store.dismissedVersion).toBeNull();
    wrapper = mount(WhatsNewBanner, { attachTo: document.body });
    await nextTick();
    expect(wrapper.find('.wnb').exists()).toBe(true);
  });

  it('is hidden when dismissedVersion matches APP_VERSION', async () => {
    const store = useBudgetStore();
    store.dismissWhatsNew('2.45.0');
    wrapper = mount(WhatsNewBanner, { attachTo: document.body });
    await nextTick();
    expect(wrapper.find('.wnb').exists()).toBe(false);
  });

  it('updates the store when ✕ is clicked', async () => {
    const store = useBudgetStore();
    wrapper = mount(WhatsNewBanner, { attachTo: document.body });
    await nextTick();

    await wrapper.find('.wnb__close').trigger('click');
    await nextTick();

    expect(store.dismissedVersion).toBe('2.45.0');
  });

  it('renders all release notes', async () => {
    wrapper = mount(WhatsNewBanner, { attachTo: document.body });
    await nextTick();
    const items = wrapper.findAll('.wnb__item');
    expect(items.length).toBe(4);
  });
});
