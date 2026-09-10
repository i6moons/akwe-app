/**
 * Mémoire locale pour la démo sans projet Supabase.
 * Même sémantique d'idempotence que `client_uuid` en base.
 */

import type { GroupRow, MemberRow, TransactionRow } from '../sync/normalize';

export interface StoredGroup extends GroupRow {
  client_uuid: string;
}

export interface StoredMember extends MemberRow {
  client_uuid: string;
}

export interface StoredTransaction extends TransactionRow {
  id: string;
  synced_at: string;
}

class MemoryStore {
  groups = new Map<string, StoredGroup>();
  members = new Map<string, StoredMember>();
  transactions = new Map<string, StoredTransaction>();

  /**
   * Équivalent de `insert … on conflict (client_uuid) do update`.
   *
   * Le `client_uuid` est la clé de la table : le rejeu écrase la même entrée au
   * lieu d'en créer une seconde. L'identifiant déjà attribué est conservé, un
   * rejeu ne devant jamais renuméroter une ligne existante.
   */
  upsertByClientUuid<T extends { id: string; client_uuid: string }>(
    table: Map<string, T>,
    row: T,
  ): T {
    const existing = table.get(row.client_uuid);
    const merged = existing ? { ...existing, ...row, id: existing.id } : row;
    table.set(row.client_uuid, merged);
    return merged;
  }
}

const globalStore = globalThis as typeof globalThis & { __akweStore?: MemoryStore };

export function getMemoryStore(): MemoryStore {
  if (!globalStore.__akweStore) globalStore.__akweStore = new MemoryStore();
  return globalStore.__akweStore;
}

export function resetMemoryStore(): void {
  globalStore.__akweStore = new MemoryStore();
}
