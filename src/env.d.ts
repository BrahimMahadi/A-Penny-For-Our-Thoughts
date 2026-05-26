/// <reference types="vite/client" />

/**
 * Typed environment variables — keeps import.meta.env strongly typed.
 * Add new VITE_* vars here whenever they are introduced.
 */
interface ImportMetaEnv {
  /** Supabase project REST/Auth URL */
  readonly VITE_SUPABASE_URL?: string;
  /** Supabase public anon key (safe to expose — RLS enforced server-side) */
  readonly VITE_SUPABASE_ANON_KEY?: string;
  /**
   * Dev/local override: set to "true" in .env.development.local to bypass
   * the Supabase auth gate entirely and go straight to the app shell.
   * NEVER set this in production — it is a local-only escape hatch.
   */
  readonly VITE_DISABLE_AUTH?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const component: DefineComponent<Record<string, never>, Record<string, never>, any>;
  export default component;
}
