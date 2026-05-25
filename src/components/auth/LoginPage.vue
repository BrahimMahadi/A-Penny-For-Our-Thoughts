<!--
  Module:   components/auth/LoginPage.vue
  Project:  A Penny For Our Thoughts
  Created:  May 2026 (Sprint 25 — Supabase Auth)
  Summary:  Full-page authentication gate shown when no Supabase session
            exists. Supports magic-link email sign-in and Google OAuth.

            States:
              idle          — email form + Google button
              loading       — spinner on active button, inputs disabled
              sent          — "check your inbox" confirmation (magic link)
              error         — inline error message below the form
-->

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { useThemeStore } from '@/stores/theme';

const auth  = useAuthStore();
const theme = useThemeStore();

const email   = ref('');
const sending = ref(false);
const googling = ref(false);

const emailValid = computed(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value));

/**
 * Maps raw Supabase error messages to friendlier copy.
 * Falls back to the original message for anything unrecognised.
 */
const friendlyError = computed((): string => {
  const msg = (auth.error ?? '').toLowerCase();
  if (msg.includes('rate limit') || msg.includes('too many'))
    return 'Too many sign-in emails sent — please wait a few minutes, then try again. You can also sign in with Google right now.';
  if (msg.includes('invalid email'))
    return 'That doesn\'t look like a valid email address. Please double-check and try again.';
  if (msg.includes('network') || msg.includes('fetch'))
    return 'Network error — check your connection and try again.';
  return auth.error ?? '';
});

async function handleMagicLink(): Promise<void> {
  if (!emailValid.value || sending.value) return;
  sending.value = true;
  auth.clearError();
  await auth.signInWithMagicLink(email.value.trim());
  sending.value = false;
}

async function handleGoogle(): Promise<void> {
  if (googling.value) return;
  googling.value = true;
  auth.clearError();
  await auth.signInWithGoogle();
  // If there's an error, the redirect didn't happen; re-enable button
  googling.value = false;
}

function handleKeydown(e: KeyboardEvent): void {
  if (e.key === 'Enter') handleMagicLink();
}
</script>

<template>
  <div class="login-page">
    <!-- Theme toggle (top-right, always accessible) -->
    <button
      class="login-theme-toggle"
      :aria-label="`Switch to ${theme.isDark ? 'light' : 'dark'} mode`"
      @click="theme.toggle"
    >
      {{ theme.isDark ? '🌙' : '☀️' }}
    </button>

    <div class="login-card">
      <!-- Branding -->
      <div class="login-brand">
        <span
          class="login-brand__emoji"
          aria-hidden="true"
        >💸</span>
        <h1 class="login-brand__title">
          A Penny For Our Thoughts
        </h1>
        <p class="login-brand__tagline">
          Your personal 50/30/20 budget dashboard
        </p>
      </div>

      <!-- ── Magic-link sent confirmation ── -->
      <div
        v-if="auth.magicLinkSent"
        class="login-sent"
        role="status"
        aria-live="polite"
      >
        <span
          class="login-sent__icon"
          aria-hidden="true"
        >📬</span>
        <p class="login-sent__heading">
          Check your inbox
        </p>
        <p class="login-sent__body">
          We sent a sign-in link to <strong>{{ email }}</strong>.
          Click it to open your dashboard — no password needed.
        </p>
        <button
          class="login-sent__back"
          @click="auth.clearError(); email = ''"
        >
          Use a different email
        </button>
      </div>

      <!-- ── Sign-in form ── -->
      <template v-else>
        <!-- Magic link -->
        <div class="login-form">
          <label
            class="login-label"
            for="login-email"
          >Email address</label>
          <input
            id="login-email"
            v-model="email"
            class="login-input"
            type="email"
            placeholder="you@example.com"
            autocomplete="email"
            :disabled="sending || googling"
            @keydown="handleKeydown"
          >
          <button
            class="login-btn login-btn--primary"
            :disabled="!emailValid || sending || googling"
            :aria-busy="sending"
            @click="handleMagicLink"
          >
            <span
              v-if="sending"
              class="login-spinner"
              aria-hidden="true"
            />
            <span>{{ sending ? 'Sending link…' : 'Send magic link' }}</span>
          </button>
        </div>

        <!-- Divider -->
        <div
          class="login-divider"
          aria-hidden="true"
        >
          <span>or</span>
        </div>

        <!-- Google OAuth -->
        <button
          class="login-btn login-btn--google"
          :disabled="sending || googling"
          :aria-busy="googling"
          @click="handleGoogle"
        >
          <span
            v-if="googling"
            class="login-spinner login-spinner--dark"
            aria-hidden="true"
          />
          <svg
            v-else
            class="login-google-icon"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          <span>{{ googling ? 'Redirecting…' : 'Sign in with Google' }}</span>
        </button>

        <!-- Error -->
        <p
          v-if="auth.error"
          class="login-error"
          role="alert"
        >
          {{ friendlyError }}
        </p>
      </template>
    </div>
  </div>
</template>

<style scoped>
/* ─── Page shell ────────────────────────────────────────────────── */
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg, #0d1117);
  padding: 1.5rem;
  position: relative;
}

.login-theme-toggle {
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: var(--surface, #0a0f1a);
  border: 1px solid var(--border, #1e2840);
  border-radius: 8px;
  width: 40px;
  height: 40px;
  font-size: 1.2rem;
  cursor: pointer;
  transition: filter 0.15s ease;
}
.login-theme-toggle:hover { filter: brightness(1.2); }

/* ─── Card ──────────────────────────────────────────────────────── */
.login-card {
  width: 100%;
  max-width: 400px;
  background: var(--surface, #0a0f1a);
  border: 1px solid var(--border, #1e2840);
  border-radius: 16px;
  padding: 2.5rem 2rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

/* ─── Branding ──────────────────────────────────────────────────── */
.login-brand {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
  margin-bottom: 0.5rem;
}

.login-brand__emoji {
  font-size: 3rem;
  line-height: 1;
}

.login-brand__title {
  margin: 0;
  font-size: 1.3rem;
  font-weight: 700;
  color: var(--text, #e3e6ee);
  letter-spacing: -0.02em;
}

.login-brand__tagline {
  margin: 0;
  font-size: 0.82rem;
  color: var(--muted, #6b7a99);
}

/* ─── Form ──────────────────────────────────────────────────────── */
.login-form {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.login-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--muted, #6b7a99);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.login-input {
  width: 100%;
  box-sizing: border-box;
  background: var(--surface2, #0f1829);
  border: 1px solid var(--border, #1e2840);
  border-radius: 8px;
  padding: 0.7rem 0.9rem;
  font-size: 0.95rem;
  color: var(--text, #e3e6ee);
  outline: none;
  transition: border-color 0.15s ease;
  font-family: inherit;
}
.login-input::placeholder { color: var(--muted, #6b7a99); }
.login-input:focus { border-color: var(--accent, #4ade80); }
.login-input:disabled { opacity: 0.5; cursor: not-allowed; }

/* ─── Buttons ───────────────────────────────────────────────────── */
.login-btn {
  width: 100%;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  transition: filter 0.15s ease, opacity 0.15s ease;
}
.login-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.login-btn:not(:disabled):hover { filter: brightness(1.1); }
.login-btn:focus-visible {
  outline: 2px solid var(--accent, #4ade80);
  outline-offset: 2px;
}

.login-btn--primary {
  background: var(--accent, #4ade80);
  color: #0a1810;
}

.login-btn--google {
  background: #fff;
  color: #3c4043;
  border: 1px solid #dadce0;
}

/* ─── Google icon ───────────────────────────────────────────────── */
.login-google-icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

/* ─── Divider ───────────────────────────────────────────────────── */
.login-divider {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: var(--muted, #6b7a99);
  font-size: 0.8rem;
  margin: -0.1rem 0;
}
.login-divider::before,
.login-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--border, #1e2840);
}

/* ─── Spinner ───────────────────────────────────────────────────── */
.login-spinner {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid rgba(10, 24, 16, 0.3);
  border-top-color: #0a1810;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  flex-shrink: 0;
}
.login-spinner--dark {
  border-color: rgba(60, 64, 67, 0.3);
  border-top-color: #3c4043;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* ─── Error ─────────────────────────────────────────────────────── */
.login-error {
  margin: 0;
  padding: 0.6rem 0.9rem;
  background: rgba(248, 113, 113, 0.1);
  border: 1px solid rgba(248, 113, 113, 0.3);
  border-radius: 8px;
  color: var(--danger, #f87171);
  font-size: 0.85rem;
  line-height: 1.4;
}

/* ─── Sent confirmation ─────────────────────────────────────────── */
.login-sent {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem 0;
}
.login-sent__icon   { font-size: 2.5rem; }
.login-sent__heading {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text, #e3e6ee);
}
.login-sent__body {
  margin: 0;
  font-size: 0.87rem;
  color: var(--muted, #6b7a99);
  line-height: 1.5;
  max-width: 30ch;
}
.login-sent__body strong { color: var(--text, #e3e6ee); }
.login-sent__back {
  margin-top: 0.5rem;
  background: none;
  border: none;
  color: var(--accent, #4ade80);
  font-size: 0.85rem;
  cursor: pointer;
  text-decoration: underline;
  font-family: inherit;
}

/* ─── Responsive ────────────────────────────────────────────────── */
@media (max-width: 480px) {
  .login-card {
    padding: 2rem 1.25rem;
    border-radius: 12px;
  }
}

/* ─── prefers-reduced-motion ────────────────────────────────────── */
@media (prefers-reduced-motion: reduce) {
  .login-spinner { animation: none; opacity: 0.6; }
  .login-btn, .login-theme-toggle { transition: none; }
}
</style>
