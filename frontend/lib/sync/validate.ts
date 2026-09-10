import { parseAmount } from '@/lib/format';

export const MAX_SYNC_BATCH = 200;
export const ALLOWED_TYPES = ['contribution', 'payout', 'loan'] as const;
export type AllowedSyncType = (typeof ALLOWED_TYPES)[number];

export interface SyncContext {
  ownedGroupIds: ReadonlySet<string>;
  memberIdsByGroup: ReadonlyMap<string, ReadonlySet<string>>;
}

export interface IncomingOperation {
  client_uuid: unknown;
  group_id: unknown;
  member_id: unknown;
  amount: unknown;
  type: unknown;
  method: unknown;
  source: unknown;
  raw_transcript: unknown;
  confidence: unknown;
  occurred_at: unknown;
}

export interface ValidOperation {
  client_uuid: string;
  group_id: string;
  member_id: string | null;
  amount: number;
  type: AllowedSyncType;
  source: 'manual' | 'voice';
  occurred_at: string;
}

export interface RejectedOperation {
  client_uuid: string;
  reason: string;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function toIncoming(record: Record<string, unknown> | null): IncomingOperation {
  const row = record ?? {};
  return {
    client_uuid: row.client_uuid,
    group_id: row.group_id,
    member_id: row.member_id,
    amount: row.amount,
    type: row.type,
    method: row.method,
    source: row.source,
    raw_transcript: row.raw_transcript,
    confidence: row.confidence,
    occurred_at: row.occurred_at,
  };
}

function readAmount(raw: unknown): number | null {
  if (typeof raw === 'number') {
    if (!Number.isInteger(raw) || raw <= 0) return null;
    return parseAmount(String(raw));
  }
  if (typeof raw === 'string') return parseAmount(raw);
  return null;
}

/** Accepte `operations` (contrat) ou `batch` (file hors ligne existante). */
export function extractOperations(body: unknown): IncomingOperation[] | { error: string } {
  const record = asRecord(body);
  if (!record) return { error: 'Un objet JSON est requis.' };

  if (Array.isArray(record.operations)) {
    if (record.operations.length > MAX_SYNC_BATCH) {
      return { error: 'Lot plafonné à 200 opérations.' };
    }
    return record.operations.map((item) => toIncoming(asRecord(item)));
  }

  if (Array.isArray(record.batch)) {
    if (record.batch.length > MAX_SYNC_BATCH) {
      return { error: 'Lot plafonné à 200 opérations.' };
    }
    return record.batch.map((item) => {
      const row = asRecord(item) ?? {};
      const payload = asRecord(row.payload) ?? {};
      return toIncoming({
        client_uuid: row.client_uuid,
        group_id: payload.group_id ?? payload.groupId,
        member_id: payload.member_id ?? payload.memberId,
        amount: payload.amount,
        type: payload.type,
        method: payload.method,
        source: payload.source,
        raw_transcript: payload.raw_transcript ?? payload.rawTranscript,
        confidence: payload.confidence,
        occurred_at: payload.occurred_at ?? payload.occurredAt,
      });
    });
  }

  return { error: 'Champ operations requis.' };
}

export function validateOperation(
  raw: IncomingOperation,
  ctx: SyncContext,
): ValidOperation | RejectedOperation {
  const client_uuid = typeof raw.client_uuid === 'string' ? raw.client_uuid.trim() : '';
  if (!client_uuid) {
    return { client_uuid: '(manquant)', reason: 'client_uuid manquant ou vide — à abandonner' };
  }

  const amount = readAmount(raw.amount);
  if (amount === null) {
    return {
      client_uuid,
      reason: 'amount invalide : entier FCFA strictement positif requis — à abandonner',
    };
  }

  if (typeof raw.type !== 'string' || !(ALLOWED_TYPES as readonly string[]).includes(raw.type)) {
    return {
      client_uuid,
      reason: `type non autorisé (${String(raw.type)}) — à abandonner`,
    };
  }

  const group_id = typeof raw.group_id === 'string' ? raw.group_id.trim() : '';
  if (!group_id) {
    return { client_uuid, reason: 'group_id manquant — à abandonner' };
  }
  if (!ctx.ownedGroupIds.has(group_id)) {
    return { client_uuid, reason: 'cette caisse ne vous appartient pas — à abandonner' };
  }

  let member_id: string | null = null;
  if (raw.member_id !== null && raw.member_id !== undefined && raw.member_id !== '') {
    if (typeof raw.member_id !== 'string') {
      return { client_uuid, reason: 'member_id invalide — à abandonner' };
    }
    const members = ctx.memberIdsByGroup.get(group_id);
    if (!members?.has(raw.member_id)) {
      return { client_uuid, reason: 'ce membre n’appartient pas à cette caisse — à abandonner' };
    }
    member_id = raw.member_id;
  }

  const occurred_at =
    typeof raw.occurred_at === 'string' && !Number.isNaN(new Date(raw.occurred_at).getTime())
      ? new Date(raw.occurred_at).toISOString()
      : new Date().toISOString();

  return {
    client_uuid,
    group_id,
    member_id,
    amount,
    type: raw.type as AllowedSyncType,
    source: raw.source === 'voice' ? 'voice' : 'manual',
    occurred_at,
  };
}

export function validateLot(
  operations: readonly IncomingOperation[],
  ctx: SyncContext,
): { accepted: ValidOperation[]; rejected: RejectedOperation[] } {
  const accepted: ValidOperation[] = [];
  const rejected: RejectedOperation[] = [];
  const seen = new Set<string>();

  for (const raw of operations) {
    const result = validateOperation(raw, ctx);
    if ('reason' in result) {
      rejected.push(result);
      continue;
    }
    if (seen.has(result.client_uuid)) continue;
    seen.add(result.client_uuid);
    accepted.push(result);
  }

  return { accepted, rejected };
}

/** Équivalent mémoire de INSERT … ON CONFLICT (client_uuid) DO NOTHING. */
export function applyIdempotentInsert(
  store: Map<string, ValidOperation>,
  rows: readonly ValidOperation[],
): void {
  for (const row of rows) {
    if (!store.has(row.client_uuid)) store.set(row.client_uuid, { ...row });
  }
}
