<!--
  Module:   components/sections/CategoryManager.vue
  Project:  A Penny For Our Thoughts
  Created:  May 2026 (Sprint 19)
  Summary:  User-editable spending category list. Rendered inside the
            Settings tab. Allows adding, renaming (migrates purchases),
            recolouring, and deleting (orphan strategy) categories.
            The built-in 'other' category is protected and cannot be deleted.
-->

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { useBudgetStore } from '@/stores/budget';
import { useToast } from '@/composables/useToast';
import BaseModal from '@/components/ui/BaseModal.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import { CATEGORY_COLOR_PRESETS } from '@/data/categories';

const budget = useBudgetStore();
const toast  = useToast();

// ─── Modal state ─────────────────────────────────────────────────
const showModal  = ref(false);
const editingId  = ref<string | null>(null);

const form = reactive({ name: '', color: '' });
const nameError = ref('');

function openAdd(): void {
  editingId.value = null;
  form.name       = '';
  form.color      = CATEGORY_COLOR_PRESETS[0];
  nameError.value = '';
  showModal.value = true;
}

function openEdit(id: string): void {
  const cat = budget.spendingCategories.find(c => c.id === id);
  if (!cat) return;
  editingId.value = id;
  form.name       = cat.name;
  form.color      = cat.color;
  nameError.value = '';
  showModal.value = true;
}

function closeModal(): void {
  showModal.value = false;
}

function save(): void {
  const trimmed = form.name.trim();
  if (!trimmed) {
    nameError.value = 'Name is required.';
    return;
  }
  // Duplicate name check (excluding the item being edited)
  const duplicate = budget.spendingCategories.some(
    c => c.name.toLowerCase() === trimmed.toLowerCase() && c.id !== editingId.value,
  );
  if (duplicate) {
    nameError.value = 'A category with this name already exists.';
    return;
  }

  if (editingId.value) {
    budget.updateCategory(editingId.value, trimmed, form.color);
    toast.show('Category updated.', 'success');
  } else {
    const result = budget.addCategory(trimmed, form.color);
    if (!result) {
      nameError.value = 'A category with this name already exists.';
      return;
    }
    toast.show('Category added.', 'success');
  }
  closeModal();
}

function remove(id: string): void {
  const cat = budget.spendingCategories.find(c => c.id === id);
  if (!cat) return;
  if (!window.confirm(`Delete "${cat.name}"? Purchases using this category will keep the name.`)) return;
  budget.deleteCategory(id);
  toast.show('Category deleted.', 'success');
}
</script>

<template>
  <div class="cat-manager">
    <!-- Category list -->
    <ul
      v-if="budget.spendingCategories.length > 0"
      class="cat-list"
    >
      <li
        v-for="cat in budget.spendingCategories"
        :key="cat.id"
        class="cat-item"
      >
        <span
          class="cat-swatch"
          :style="{ background: cat.color }"
          aria-hidden="true"
        />
        <span class="cat-name">{{ cat.name }}</span>
        <span
          v-if="cat.id === 'other'"
          class="cat-badge"
        >built-in</span>
        <div class="cat-actions">
          <BaseButton
            size="xs"
            variant="ghost"
            @click="openEdit(cat.id)"
          >
            Edit
          </BaseButton>
          <BaseButton
            v-if="cat.id !== 'other'"
            size="xs"
            variant="danger"
            @click="remove(cat.id)"
          >
            Delete
          </BaseButton>
        </div>
      </li>
    </ul>

    <BaseButton
      size="sm"
      variant="outline"
      class="cat-add-btn"
      @click="openAdd"
    >
      + Add Category
    </BaseButton>

    <!-- Add / Edit modal -->
    <BaseModal
      v-model:open="showModal"
      :title="editingId ? 'Edit Category' : 'Add Category'"
    >
      <div class="modal-form">
        <!-- Name input -->
        <div class="form-group">
          <label
            class="form-label"
            for="cat-name"
          >Name</label>
          <input
            id="cat-name"
            v-model="form.name"
            type="text"
            class="form-input"
            :class="{ 'form-input--error': nameError }"
            placeholder="e.g. Hobbies"
            maxlength="40"
            @input="nameError = ''"
          >
          <p
            v-if="nameError"
            class="field-error"
          >
            {{ nameError }}
          </p>
        </div>

        <!-- Colour picker -->
        <div class="form-group">
          <label class="form-label">Colour</label>
          <div class="cat-color-grid">
            <button
              v-for="preset in CATEGORY_COLOR_PRESETS"
              :key="preset"
              type="button"
              class="cat-color-btn"
              :class="{ 'cat-color-btn--active': form.color === preset }"
              :style="{ background: preset }"
              :aria-label="`Select colour ${preset}`"
              :aria-pressed="form.color === preset"
              @click="form.color = preset"
            />
          </div>
          <!-- Preview swatch -->
          <div class="cat-preview">
            <span
              class="cat-swatch"
              :style="{ background: form.color }"
            />
            <span class="cat-preview-name">{{ form.name || 'Preview' }}</span>
          </div>
        </div>
      </div>

      <template #footer>
        <BaseButton
          variant="secondary"
          @click="closeModal"
        >
          Cancel
        </BaseButton>
        <BaseButton @click="save">
          {{ editingId ? 'Update' : 'Add' }}
        </BaseButton>
      </template>
    </BaseModal>
  </div>
</template>

<style scoped>
.cat-manager {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

/* ─── Category list ──────────────────────────────────────────────── */
.cat-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.cat-item {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.5rem 0.7rem;
  border-radius: 8px;
  background: var(--surface2);
  border: 1px solid var(--border);
  transition: background var(--transition-fast);
}

.cat-item:hover {
  background: var(--accent-soft);
}

.cat-swatch {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  border-radius: 50%;
}

.cat-name {
  flex: 1;
  font-size: 0.875rem;
  color: var(--text);
}

.cat-badge {
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--accent);
  background: var(--accent-soft);
  border: 1px solid color-mix(in srgb, var(--accent) 20%, transparent);
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
}

.cat-actions {
  display: flex;
  gap: 0.35rem;
}

.cat-add-btn {
  align-self: flex-start;
}

/* ─── Colour picker ──────────────────────────────────────────────── */
.cat-color-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-top: 0.35rem;
}

.cat-color-btn {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  transition: transform 0.1s ease, border-color 0.12s ease;
}

.cat-color-btn:hover {
  transform: scale(1.15);
}

.cat-color-btn--active {
  border-color: var(--text, #e3e6ee);
  transform: scale(1.15);
}

/* ─── Preview ────────────────────────────────────────────────────── */
.cat-preview {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.5rem;
  padding: 0.4rem 0.7rem;
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: 8px;
  width: fit-content;
}

.cat-preview-name {
  font-size: 0.8rem;
  color: var(--text);
}
</style>
