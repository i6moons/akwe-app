/**
 * Mémoire locale pour la démo sans projet Supabase.
 * Même sémantique d'idempotence que `client_uuid` en base.
 */

export interface StoredGroup {
  id: string;
  name: string;
  owner_id: string | null;
  contribution_amount: number;
  frequency: string;
  client_uuid: string;
}

export interface StoredMember {
  id: string;
  group_id: string;
  full_name: string;
  phone: string | null;
  client_uuid: string;
}

export interface StoredTransaction {
  id: string;
  group_id: string;
  member_id: string | null;
  amount: number;
  type: string;
  source: string;
  client_uuid: string;
  occurred_at: string;
  synced_at: string;
}

class MemoryStore {
  groups = new Map<string, StoredGroup>();
  members = new Map<string, StoredMember>();
  transactions = new Map<string, StoredTransaction>();

  upsertByClientUuid<T extends { id: string; client_uuid: string }>(
    table: Map<string, T>,
    row: T,
  ): T {
    for (const [key, existing] of table) {
      if (existing.client_uuid === row.client_uuid) {
        const merged = { ...existing, ...row, id: existing.id };
        table.set(key, merged);
        return merged;
      }
    }
    table.set(row.client_uuid, row);
    return row;
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
