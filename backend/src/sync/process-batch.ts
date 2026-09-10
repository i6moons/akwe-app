import { randomUUID } from 'node:crypto';
import type { SyncBatchItem, SyncRequest, SyncResponse } from '../../contracts/api';
import { getMemoryStore } from '../lib/memory-store';
import { createServiceClient, hasSupabase } from '../lib/supabase';

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function str(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function intAmount(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) return null;
  return value;
}

async function upsertSupabase(
  item: SyncBatchItem,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const supabase = createServiceClient();
  if (!supabase) return { ok: false, reason: 'Supabase non configuré' };

  const payload = asRecord(item.payload);

  if (item.entity === 'group') {
    const name = str(payload.name) ?? str(payload.full_name);
    const amount = intAmount(payload.contribution_amount ?? payload.contributionAmount);
    const frequency = str(payload.frequency) ?? 'weekly';
    if (!name || amount === null) return { ok: false, reason: 'Groupe invalide' };

    const { error } = await supabase.from('groups').upsert(
      {
        id: str(payload.id) ?? undefined,
        name,
        contribution_amount: amount,
        frequency,
        owner_id: str(payload.owner_id) ?? str(payload.ownerId),
        location: str(payload.location),
      },
      { onConflict: 'id' },
    );
    return error ? { ok: false, reason: error.message } : { ok: true };
  }

  if (item.entity === 'member') {
    const groupId = str(payload.group_id) ?? str(payload.groupId);
    const fullName = str(payload.full_name) ?? str(payload.fullName);
    if (!groupId || !fullName) return { ok: false, reason: 'Membre invalide' };

    const { error } = await supabase.from('members').upsert(
      {
        id: str(payload.id) ?? undefined,
        group_id: groupId,
        full_name: fullName,
        phone: str(payload.phone),
      },
      { onConflict: 'id' },
    );
    return error ? { ok: false, reason: error.message } : { ok: true };
  }

  const groupId = str(payload.group_id) ?? str(payload.groupId);
  const amount = intAmount(payload.amount);
  const type = str(payload.type) ?? 'contribution';
  if (!groupId || amount === null) return { ok: false, reason: 'Transaction invalide' };

  const { error } = await supabase.from('transactions').upsert(
    {
      client_uuid: item.client_uuid,
      group_id: groupId,
      member_id: str(payload.member_id) ?? str(payload.memberId),
      amount,
      type,
      source: str(payload.source) ?? 'manual',
      method: str(payload.method) ?? 'cash',
      raw_transcript: str(payload.raw_transcript) ?? str(payload.rawTranscript),
      occurred_at: str(payload.occurred_at) ?? str(payload.occurredAt) ?? new Date().toISOString(),
      synced_at: new Date().toISOString(),
    },
    { onConflict: 'client_uuid' },
  );
  return error ? { ok: false, reason: error.message } : { ok: true };
}

function upsertMemory(item: SyncBatchItem): { ok: true } | { ok: false; reason: string } {
  const store = getMemoryStore();
  const payload = asRecord(item.payload);

  if (item.entity === 'group') {
    const name = str(payload.name);
    const amount = intAmount(payload.contribution_amount ?? payload.contributionAmount);
    if (!name || amount === null) return { ok: false, reason: 'Groupe invalide' };
    store.upsertByClientUuid(store.groups, {
      id: str(payload.id) ?? randomUUID(),
      name,
      owner_id: str(payload.owner_id) ?? str(payload.ownerId),
      contribution_amount: amount,
      frequency: str(payload.frequency) ?? 'weekly',
      client_uuid: item.client_uuid,
    });
    return { ok: true };
  }

  if (item.entity === 'member') {
    const groupId = str(payload.group_id) ?? str(payload.groupId);
    const fullName = str(payload.full_name) ?? str(payload.fullName);
    if (!groupId || !fullName) return { ok: false, reason: 'Membre invalide' };
    store.upsertByClientUuid(store.members, {
      id: str(payload.id) ?? randomUUID(),
      group_id: groupId,
      full_name: fullName,
      phone: str(payload.phone),
      client_uuid: item.client_uuid,
    });
    return { ok: true };
  }

  const groupId = str(payload.group_id) ?? str(payload.groupId);
  const amount = intAmount(payload.amount);
  if (!groupId || amount === null) return { ok: false, reason: 'Transaction invalide' };

  store.upsertByClientUuid(store.transactions, {
    id: str(payload.id) ?? randomUUID(),
    group_id: groupId,
    member_id: str(payload.member_id) ?? str(payload.memberId),
    amount,
    type: str(payload.type) ?? 'contribution',
    source: str(payload.source) ?? 'manual',
    client_uuid: item.client_uuid,
    occurred_at: str(payload.occurred_at) ?? str(payload.occurredAt) ?? new Date().toISOString(),
    synced_at: new Date().toISOString(),
  });
  return { ok: true };
}

/** Traite un lot de sync. Idempotent via `client_uuid`. */
export async function processSyncBatch(request: SyncRequest): Promise<SyncResponse> {
  const confirmed: string[] = [];
  const rejected: NonNullable<SyncResponse['rejected']> = [];

  for (const item of request.batch) {
    if (!item.client_uuid?.trim()) {
      rejected.push({ client_uuid: item.client_uuid ?? '', reason: 'client_uuid manquant' });
      continue;
    }

    const result = hasSupabase() ? await upsertSupabase(item) : upsertMemory(item);
    if (result.ok) confirmed.push(item.client_uuid);
    else rejected.push({ client_uuid: item.client_uuid, reason: result.reason });
  }

  return rejected.length > 0 ? { confirmed, rejected } : { confirmed };
}
