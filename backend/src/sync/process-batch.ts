import { randomUUID } from 'node:crypto';
import type { SyncRequest, SyncResponse } from '../../contracts/api';
import { getMemoryStore } from '../lib/memory-store';
import { createServiceClient, type AkweSupabase } from '../lib/supabase';
import { normalizeItem, readClientUuid, type NormalizedItem } from './normalize';

type Written = { ok: true } | { ok: false; reason: string };

/**
 * Une caisse avant ses membres, les membres avant les cotisations.
 *
 * Une trésorière hors ligne crée sa caisse, y inscrit ses membres puis note des
 * versements : le tout remonte dans un même lot. Écrire dans l'ordre d'arrivée
 * ne garantissait rien, et une cotisation traitée avant sa caisse violait la
 * clé étrangère — l'opération était rejetée puis renvoyée indéfiniment.
 */
const ENTITY_ORDER: Readonly<Record<NormalizedItem['entity'], number>> = {
  group: 0,
  member: 1,
  transaction: 2,
};

async function writeSupabase(supabase: AkweSupabase, item: NormalizedItem): Promise<Written> {
  if (item.entity === 'group') {
    const { error } = await supabase.from('groups').upsert(item.row, { onConflict: 'id' });
    return error ? { ok: false, reason: error.message } : { ok: true };
  }

  if (item.entity === 'member') {
    const { error } = await supabase.from('members').upsert(item.row, { onConflict: 'id' });
    return error ? { ok: false, reason: error.message } : { ok: true };
  }

  const { error } = await supabase
    .from('transactions')
    .upsert({ ...item.row, synced_at: new Date().toISOString() }, { onConflict: 'client_uuid' });
  return error ? { ok: false, reason: error.message } : { ok: true };
}

function writeMemory(item: NormalizedItem): Written {
  const store = getMemoryStore();

  if (item.entity === 'group') {
    store.upsertByClientUuid(store.groups, { ...item.row, client_uuid: item.client_uuid });
    return { ok: true };
  }

  if (item.entity === 'member') {
    store.upsertByClientUuid(store.members, { ...item.row, client_uuid: item.client_uuid });
    return { ok: true };
  }

  store.upsertByClientUuid(store.transactions, {
    ...item.row,
    id: randomUUID(),
    synced_at: new Date().toISOString(),
  });
  return { ok: true };
}

/**
 * Traite un lot de sync. Idempotent via `client_uuid` : rejouer un lot déjà
 * traité laisse la base dans le même état et reconfirme les mêmes entrées.
 */
export async function processSyncBatch(request: SyncRequest): Promise<SyncResponse> {
  const confirmed: string[] = [];
  const rejected: NonNullable<SyncResponse['rejected']> = [];

  const accepted: NormalizedItem[] = [];
  // Un même `client_uuid` peut apparaître deux fois dans une file rejouée :
  // l'écrire deux fois serait sans effet, mais le confirmer deux fois ferait
  // croire au client qu'il a envoyé plus d'opérations qu'il n'en avait.
  const seen = new Set<string>();

  for (const raw of request.batch) {
    const result = normalizeItem(raw);
    if (!result.ok) {
      rejected.push({ client_uuid: readClientUuid(raw), reason: result.reason });
      continue;
    }
    if (seen.has(result.item.client_uuid)) continue;
    seen.add(result.item.client_uuid);
    accepted.push(result.item);
  }

  accepted.sort((left, right) => ENTITY_ORDER[left.entity] - ENTITY_ORDER[right.entity]);

  // Un seul client pour tout le lot : il en naissait un par opération, soit
  // deux cents instanciations pour un lot plein.
  const supabase = createServiceClient();

  for (const item of accepted) {
    const result = supabase ? await writeSupabase(supabase, item) : writeMemory(item);
    if (result.ok) confirmed.push(item.client_uuid);
    else rejected.push({ client_uuid: item.client_uuid, reason: result.reason });
  }

  return rejected.length > 0 ? { confirmed, rejected } : { confirmed };
}
