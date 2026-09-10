/**
 * Validation des requêtes, indépendamment du transport.
 *
 * Les corps arrivent en `unknown` : `JSON.parse` rend aussi bien `null` ou
 * `"bonjour"` qu'un objet, et lire `body.batch` sur `null` levait une exception
 * remontée en 500 alors que la requête était simplement mal formée.
 */

import type { ReceiptRequest, SyncBatchItem } from '../contracts/api';
import { hasSupabase } from './lib/supabase';
import { sendReceipt } from './receipts/send';
import { processSyncBatch } from './sync/process-batch';
import { parseVoice } from './voice/parse';

/** Même plafond que le frontend (`lib/sync/validate.ts`). */
export const MAX_SYNC_BATCH = 200;

/** Une phrase dictée dépasse rarement deux cents caractères. */
const MAX_TRANSCRIPT_CHARS = 2_000;

/** Au-delà, le rapprochement phonétique coûte plus qu'il ne rapporte. */
const MAX_MEMBER_NAMES = 500;

interface Handled {
  status: 200 | 400;
  body: unknown;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function bad(error: string): Handled {
  return { status: 400, body: { error } };
}

function isIsoDay(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return !Number.isNaN(new Date(`${value}T12:00:00.000Z`).getTime());
}

export async function handleSync(body: unknown): Promise<Handled> {
  const record = asRecord(body);
  if (!record || !Array.isArray(record.batch)) return bad('batch manquant');
  if (record.batch.length > MAX_SYNC_BATCH) {
    return bad(`Lot plafonné à ${MAX_SYNC_BATCH} opérations`);
  }

  const result = await processSyncBatch({ batch: record.batch as SyncBatchItem[] });
  return { status: 200, body: result };
}

export async function handleVoiceParse(body: unknown): Promise<Handled> {
  const record = asRecord(body);
  if (!record) return bad('transcript et group_id requis');

  const transcript = typeof record.transcript === 'string' ? record.transcript : null;
  const group_id = typeof record.group_id === 'string' ? record.group_id.trim() : '';
  if (transcript === null || !group_id) return bad('transcript et group_id requis');
  if (transcript.length > MAX_TRANSCRIPT_CHARS) {
    return bad(`transcript limité à ${MAX_TRANSCRIPT_CHARS} caractères`);
  }

  const member_names = Array.isArray(record.member_names)
    ? record.member_names
        .filter((name): name is string => typeof name === 'string' && name.trim() !== '')
        .slice(0, MAX_MEMBER_NAMES)
    : [];

  const result = await parseVoice({
    transcript,
    group_id,
    member_names,
    // Une date illisible ne doit pas priver l'opération de sa date : on retombe
    // sur l'horloge du serveur.
    today: isIsoDay(record.today) ? record.today : new Date().toISOString().slice(0, 10),
  });
  return { status: 200, body: result };
}

export async function handleReceipts(body: unknown): Promise<Handled> {
  const record = asRecord(body);
  if (!record) return bad('champs reçus incomplets');

  const transaction_id =
    typeof record.transaction_id === 'string' ? record.transaction_id.trim() : '';
  const member_phone = typeof record.member_phone === 'string' ? record.member_phone.trim() : '';
  if (!transaction_id || !member_phone || record.channel === undefined) {
    return bad('champs reçus incomplets');
  }
  if (record.channel !== 'whatsapp' && record.channel !== 'sms') {
    return bad('channel invalide');
  }

  const request: ReceiptRequest = { transaction_id, member_phone, channel: record.channel };
  const result = await sendReceipt(request);
  return { status: 200, body: result };
}

export function handleHealth(): Handled {
  const supabase = hasSupabase();
  return {
    status: 200,
    body: {
      ok: true,
      at: new Date().toISOString(),
      supabase,
      mode: supabase ? 'supabase' : 'memory',
    },
  };
}
