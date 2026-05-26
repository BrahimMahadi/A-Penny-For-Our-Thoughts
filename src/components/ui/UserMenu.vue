<!--
  Module:   components/ui/UserMenu.vue
  Project:  A Penny For Our Thoughts
  Created:  May 2026 (Sprint 25 — Supabase Auth)
  Summary:  Avatar chip in the top-right toolbar showing the signed-in
            user's email initial. Clicking opens a small dropdown with the
            full email address and a Sign out button.
            Click-outside and Escape close the menu.
-->

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useAuthStore } from '@/stores/auth';

const auth    = useAuthStore();
const open    = ref(false);
const menuRef = ref<HTMLElement | null>(null);

function toggle(): void { open.value = !open.value; }

async function handleSignOut(): Promise<void> {
  open.value = false;
  await auth.signOut();
}

// Close on click outside
function onDocClick(e: MouseEvent): void {
  if (menuRef.value && !menuRef.value.contains(e.target as Node)) {
    open.value = false;
  }
}

// Close on Escape
function onDocKey(e: KeyboardEvent): void {
  if (e.key === 'Escape') open.value = false;
}

onMounted(() => {
  document.addEventListener('mousedown', onDocClick);
  document.addEventListener('keydown',   onDocKey);
});
onUnmounted(() => {
  document.removeEventListener('mousedown', onDocClick);
  document.removeEventListener('keydown',   onDocKey);
});
</script>

<template>
  <div
    ref="menuRef"
    class="user-menu"
  >
    <!-- Avatar trigger button -->
    <button
      class="user-menu__avatar"
      :aria-expanded="open"
      aria-haspopup="menu"
      :aria-label="`Account menu for ${auth.userEmail}`"
      @click="toggle"
    >
      {{ auth.userInitial }}
    </button>

    <!-- Dropdown -->
    <Transition name="user-menu-drop">
      <div
        v-if="open"
        class="user-menu__dropdown"
        role="menu"
      >
        <!-- Email display -->
        <p
          class="user-menu__email"
          role="menuitem"
          tabindex="-1"
        >
          {{ auth.userEmail }}
        </p>

        <div class="user-menu__divider" />

        <!-- Sign out -->
        <button
          class="user-menu__signout"
          role="menuitem"
          @click="handleSignOut"
        >
          Sign out
        </button>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.user-menu {
  position: relative;
}

/* ─── Avatar chip ────────────────────────────────────────────────── */
.user-menu__avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: var(--accent, #5b3df5);
  color: #16161e;
  border: none;
  font-size: 0.82rem;
  font-weight: 800;
  font-family: inherit;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: filter 0.15s ease;
  flex-shrink: 0;
}
.user-menu__avatar:hover  { filter: brightness(1.12); }
.user-menu__avatar:focus-visible {
  outline: 2px solid var(--accent, #5b3df5);
  outline-offset: 2px;
}

/* ─── Dropdown panel ────────────────────────────────────────────── */
.user-menu__dropdown {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  min-width: 200px;
  background: var(--surface, #0a0f1a);
  border: 1px solid var(--border, #1e2840);
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  padding: 0.4rem 0;
  z-index: 200;
  overflow: hidden;
}

.user-menu__email {
  margin: 0;
  padding: 0.55rem 1rem;
  font-size: 0.8rem;
  color: var(--muted, #6b7a99);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 220px;
}

.user-menu__divider {
  height: 1px;
  background: var(--border, #1e2840);
  margin: 0.25rem 0;
}

.user-menu__signout {
  width: 100%;
  background: none;
  border: none;
  padding: 0.55rem 1rem;
  text-align: left;
  font-size: 0.875rem;
  font-family: inherit;
  color: var(--danger, #f87171);
  cursor: pointer;
  transition: background 0.1s ease;
}
.user-menu__signout:hover {
  background: rgba(248, 113, 113, 0.08);
}
.user-menu__signout:focus-visible {
  outline: 2px solid var(--accent, #5b3df5);
  outline-offset: -2px;
}

/* ─── Dropdown transition ───────────────────────────────────────── */
.user-menu-drop-enter-active,
.user-menu-drop-leave-active {
  transition: opacity 0.12s ease, transform 0.12s ease;
}
.user-menu-drop-enter-from,
.user-menu-drop-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

@media (prefers-reduced-motion: reduce) {
  .user-menu-drop-enter-active,
  .user-menu-drop-leave-active { transition: none; }
}
</style>
