<!--
  Module:   components/sections/ProfileSettings.vue
  Project:  A Penny For Our Thoughts
  Created:  June 2026 (feat/user-display-name — v2.45.0)
  Summary:  Settings card for the user's display name — the name shown in the
            dashboard greeting ("Welcome back, {name}"). Reads/writes
            budget.displayName via setDisplayName(). Existing users (who never
            saw onboarding) set their name here; anyone can change it anytime.
            Leaving the field blank clears it back to a bare "Welcome back".
-->

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useBudgetStore } from '@/stores/budget';
import { useToast } from '@/composables/useToast';
import BaseButton from '@/components/ui/BaseButton.vue';

const budget = useBudgetStore();
const toast  = useToast();

// Local draft, seeded from the stored name. Kept in sync if the name is
// changed elsewhere (e.g. onboarding completing while Settings is mounted).
const draft = ref(budget.displayName);
watch(() => budget.displayName, (val) => { draft.value = val; });

/** True when the trimmed draft differs from what's stored. */
const dirty = computed(() => draft.value.trim() !== budget.displayName);

function save(): void {
  if (!dirty.value) return;
  const hadName = draft.value.trim().length > 0;
  budget.setDisplayName(draft.value);
  // Reflect the stored (trimmed/capped) value back into the input.
  draft.value = budget.displayName;
  toast.show(hadName ? 'Name updated.' : 'Name cleared.', 'success');
}
</script>

<template>
  <div class="profile-name">
    <label
      class="profile-name__label"
      for="profile-display-name"
    >Display name</label>
    <div class="profile-name__row">
      <input
        id="profile-display-name"
        v-model="draft"
        class="profile-name__input"
        type="text"
        maxlength="40"
        placeholder="Add your name"
        aria-label="Display name"
        @keyup.enter="save"
      >
      <BaseButton
        size="sm"
        :disabled="!dirty"
        data-testid="profile-name-save"
        @click="save"
      >
        Save
      </BaseButton>
    </div>
    <p class="profile-name__hint">
      Shown in your dashboard greeting. Leave blank for a simple “Welcome back”.
    </p>
  </div>
</template>

<style scoped>
.profile-name {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.profile-name__label {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--muted);
  font-family: var(--font-mono);
  margin-bottom: 0.3rem;
}

.profile-name__row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.profile-name__input {
  flex: 1;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 0.6rem 0.8rem;
  color: var(--text);
  font-size: 0.95rem;
  font-family: inherit;
  transition: border-color var(--transition-fast);
}

.profile-name__input:focus {
  outline: none;
  border-color: var(--accent);
}

.profile-name__hint {
  font-size: 0.75rem;
  color: var(--muted);
  margin: 0.4rem 0 0;
  line-height: 1.4;
}
</style>
