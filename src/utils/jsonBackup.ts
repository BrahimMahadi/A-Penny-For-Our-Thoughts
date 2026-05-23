/**
 * Module:   utils/jsonBackup.ts
 * Project:  A Penny For Our Thoughts
 * Created:  May 2026 (Sprint 13)
 * Summary:  Lossless JSON backup / restore for the full BudgetState.
 *           Complements the CSV export/import (which flattens nested
 *           structures). JSON preserves every field exactly, making it
 *           the preferred format for full system backups.
 *
 *           Format:
 *           {
 *             schemaVersion: 2,
 *             exportedAt: "ISO datetime",
 *             state: { ...BudgetState }
 *           }
 */

import type { BudgetState } from '@/types/state';

/** Must match the current penny_state_v2 schema generation. */
export const JSON_SCHEMA_VERSION = 2;

export interface JSONBackupEnvelope {
  schemaVersion: number;
  exportedAt: string;
  state: BudgetState;
}

// ─── Export ───────────────────────────────────────────────────────

/**
 * Serialise the full BudgetState to a formatted JSON string.
 * The envelope includes a schema version for future migration support.
 */
export function exportStateToJSON(state: BudgetState): string {
  const envelope: JSONBackupEnvelope = {
    schemaVersion: JSON_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    state,
  };
  return JSON.stringify(envelope, null, 2);
}

/**
 * Trigger a browser download of the JSON backup.
 * @param json     Output of `exportStateToJSON()`
 * @param filename Defaults to `penny-backup-YYYY-MM-DD.json`
 */
export function triggerJSONDownload(json: string, filename?: string): void {
  const date = new Date().toISOString().slice(0, 10);
  const name = filename ?? `penny-backup-${date}.json`;
  const blob = new Blob([json], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Import ───────────────────────────────────────────────────────

/**
 * Parse a JSON backup string and return the BudgetState it contains.
 *
 * @throws {Error} if the string is not valid JSON, the envelope is
 *                 malformed, or the schema version is unsupported.
 */
export function parseJSONToState(text: string): BudgetState {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('The file is not valid JSON.');
  }

  if (!data || typeof data !== 'object') {
    throw new Error('Invalid backup file: not an object.');
  }

  const envelope = data as Partial<JSONBackupEnvelope>;

  if (typeof envelope.schemaVersion !== 'number') {
    throw new Error('Invalid backup file: missing schemaVersion.');
  }

  if (envelope.schemaVersion !== JSON_SCHEMA_VERSION) {
    throw new Error(
      `Unsupported backup version ${envelope.schemaVersion}. ` +
      `This app reads version ${JSON_SCHEMA_VERSION} only.`,
    );
  }

  if (!envelope.state || typeof envelope.state !== 'object') {
    throw new Error('Invalid backup file: missing state object.');
  }

  return envelope.state as BudgetState;
}
