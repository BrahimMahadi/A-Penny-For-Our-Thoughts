<!--
  Module:   components/sections/Wishlist.vue
  Project:  A Penny For Our Thoughts
  Created:  May 2026 (Vue 3 migration — Sprint 4)
  Summary:  Simple wishlist with icon, name, optional URL link, and
            CRUD via BaseModal. Mirrors renderWishlist().
-->

<script setup lang="ts">
import { ref, reactive, computed } from 'vue';
import { useBudgetStore } from '@/stores/budget';
import { useToast } from '@/composables/useToast';
import BaseModal from '@/components/ui/BaseModal.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import EmptyState from '@/components/ui/EmptyState.vue';

const budget = useBudgetStore();
const toast  = useToast();

// ─── Modal state ─────────────────────────────────────────────────
const showModal = ref(false);
const editingId = ref<string | null>(null);

const form = reactive({ name: '', icon: '🛒', url: '' });

function resetForm(): void {
  form.name     = '';
  form.icon     = '🛒';
  form.url      = '';
  editingId.value = null;
}

function openAdd(): void {
  resetForm();
  showModal.value = true;
}

function openEdit(id: string): void {
  const item = budget.wishlist.find(w => w.id === id);
  if (!item) return;
  form.name     = item.name;
  form.icon     = item.icon || '🛒';
  form.url      = item.url || '';
  editingId.value = id;
  showModal.value = true;
}

const formError = computed<string>(() => {
  if (!form.name.trim()) return 'Name is required.';
  return '';
});

function save(): void {
  if (formError.value) return;
  if (editingId.value) {
    budget.updateWishlistItem(editingId.value, {
      name: form.name.trim(),
      icon: form.icon || '🛒',
      url:  form.url.trim(),
    });
    toast.show('Wishlist item updated.', 'success');
  } else {
    budget.addWishlistItem({
      name: form.name.trim(),
      icon: form.icon || '🛒',
      url:  form.url.trim(),
    });
    toast.show('Item added to wishlist.', 'success');
  }
  showModal.value = false;
  resetForm();
}

function remove(id: string): void {
  const item = budget.wishlist.find(w => w.id === id);
  if (!item) return;
  if (!window.confirm(`Remove "${item.name}" from wishlist?`)) return;
  budget.deleteWishlistItem(id);
  toast.show('Item removed.', 'success');
}

// Allow the parent page to trigger the Add modal from a header CTA
defineExpose({ openAdd });
</script>

<template>
  <div class="wishlist-section">
    <!-- Header -->
    <div class="wishlist-section__header">
      <span class="wishlist-section__count">
        {{ budget.wishlist.length }} item{{ budget.wishlist.length !== 1 ? 's' : '' }}
      </span>
      <BaseButton
        size="sm"
        @click="openAdd"
      >
        + Add Item
      </BaseButton>
    </div>

    <!-- Empty state -->
    <EmptyState
      v-if="budget.wishlist.length === 0"
      icon="🛒"
      title="Wishlist is empty"
      hint="Add items you're saving up for to keep them in view."
    />

    <!-- Wishlist -->
    <ul
      v-else
      class="wishlist-list"
    >
      <li
        v-for="item in budget.wishlist"
        :key="item.id"
        class="wish-item"
      >
        <span
          class="wish-icon"
          aria-hidden="true"
        >{{ item.icon || '🛒' }}</span>
        <span class="wish-name">{{ item.name }}</span>
        <a
          v-if="item.url"
          :href="item.url"
          target="_blank"
          rel="noopener"
          class="wish-link"
          :aria-label="`View ${item.name} (opens in new tab)`"
        >
          Link ↗
        </a>
        <div class="wish-actions">
          <BaseButton
            size="xs"
            variant="secondary"
            @click="openEdit(item.id)"
          >
            Edit
          </BaseButton>
          <BaseButton
            size="xs"
            variant="danger"
            @click="remove(item.id)"
          >
            Delete
          </BaseButton>
        </div>
      </li>
    </ul>

    <!-- Add / Edit modal -->
    <BaseModal
      v-model:open="showModal"
      :title="editingId ? 'Edit Wishlist Item' : 'Add to Wishlist'"
      size="sm"
    >
      <div class="modal-form">
        <div class="form-row-icon">
          <div class="form-group icon-group">
            <label
              class="form-label"
              for="wish-icon"
            >Icon</label>
            <input
              id="wish-icon"
              v-model="form.icon"
              class="form-input icon-input"
              type="text"
              maxlength="4"
              placeholder="🛒"
            >
          </div>
          <div class="form-group name-group">
            <label
              class="form-label"
              for="wish-name"
            >Item name</label>
            <input
              id="wish-name"
              v-model="form.name"
              class="form-input"
              type="text"
              placeholder="e.g. AirPods Pro"
            >
          </div>
        </div>

        <div class="form-group">
          <label
            class="form-label"
            for="wish-url"
          >URL (optional)</label>
          <input
            id="wish-url"
            v-model="form.url"
            class="form-input"
            type="url"
            placeholder="https://..."
          >
        </div>

        <p
          v-if="formError"
          class="form-error"
        >
          {{ formError }}
        </p>
      </div>

      <template #footer>
        <BaseButton
          variant="secondary"
          @click="showModal = false; resetForm()"
        >
          Cancel
        </BaseButton>
        <BaseButton
          :disabled="!!formError"
          @click="save"
        >
          {{ editingId ? 'Update' : 'Add' }}
        </BaseButton>
      </template>
    </BaseModal>
  </div>
</template>

<style scoped>
.wishlist-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.wishlist-section__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.wishlist-section__count {
  font-size: 0.8rem;
  color: var(--muted);
}

.wishlist-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.wish-item {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.55rem 0.75rem;
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: 8px;
  flex-wrap: wrap;
}

.wish-icon {
  font-size: 1.2rem;
  flex-shrink: 0;
}

.wish-name {
  font-weight: 600;
  font-size: 0.9rem;
  flex: 1;
  min-width: 80px;
}

.wish-link {
  font-size: 0.75rem;
  color: var(--accent);
  text-decoration: none;
  white-space: nowrap;
}

.wish-link:hover {
  text-decoration: underline;
}

.wish-actions {
  display: flex;
  gap: 0.35rem;
  margin-left: auto;
}

/* Modal */
.modal-form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.form-row-icon {
  display: grid;
  grid-template-columns: 60px 1fr;
  gap: 0.75rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.form-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--muted);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.form-input {
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 0.45rem 0.65rem;
  font-size: 0.9rem;
  color: var(--text);
  width: 100%;
  transition: border-color 0.15s;
}

.form-input:focus {
  outline: none;
  border-color: var(--accent);
}

.icon-input {
  text-align: center;
  font-size: 1.25rem;
}

.form-error {
  font-size: 0.8rem;
  color: var(--danger);
  margin: 0;
}
</style>
