import type { SupabaseClient } from '@supabase/supabase-js';
import { ecrireLignes } from '@/lib/sync/ecriture';
import { lireCaisse, lireMembre, type EntreeLot } from '@/lib/sync/entities';
import { validateLot, type IncomingOperation } from '@/lib/sync/validate';
import type { RejectedOperation, SyncContext } from '@/lib/sync/validate';

/** Caisses de la trésorière et membres qui s'y rattachent, à l'instant présent. */
export async function chargerContexte(
  supabase: SupabaseClient,
  ownerId: string,
): Promise<SyncContext> {
  const { data: caisses } = await supabase.from('groups').select('id').eq('owner_id', ownerId);
  const ownedGroupIds = new Set((caisses ?? []).map((row) => row.id as string));

  const memberIdsByGroup = new Map<string, Set<string>>();
  if (ownedGroupIds.size > 0) {
    const { data: membres } = await supabase
      .from('members')
      .select('id, group_id')
      .in('group_id', [...ownedGroupIds]);
    for (const membre of membres ?? []) {
      const set = memberIdsByGroup.get(membre.group_id) ?? new Set<string>();
      set.add(membre.id);
      memberIdsByGroup.set(membre.group_id, set);
    }
  }

  return { ownedGroupIds, memberIdsByGroup };
}

export interface Resultat {
  confirmed: string[];
  rejected: RejectedOperation[];
}

function operationDepuis(entree: EntreeLot): IncomingOperation {
  const p = entree.payload;
  return {
    client_uuid: entree.client_uuid,
    group_id: p.group_id ?? p.groupId,
    member_id: p.member_id ?? p.memberId,
    amount: p.amount,
    type: p.type,
    method: p.method,
    source: p.source,
    raw_transcript: p.raw_transcript ?? p.rawTranscript,
    confidence: p.confidence,
    occurred_at: p.occurred_at ?? p.occurredAt,
  };
}

/**
 * Écrit un lot complet, entité par entité et dans cet ordre.
 *
 * Les caisses d'abord, car les membres s'y rattachent ; les membres ensuite, car
 * les transactions les désignent. Le contexte est rechargé entre chaque étape,
 * sans quoi une cotisation créée hors ligne juste après sa caisse serait rejetée
 * au motif que cette caisse « n'existe pas ».
 */
export async function ecrireLot(
  supabase: SupabaseClient,
  ownerId: string,
  entrees: readonly EntreeLot[],
): Promise<Resultat> {
  const confirmed: string[] = [];
  const rejected: RejectedOperation[] = [];

  const caisses = entrees
    .filter((entree) => entree.entity === 'group')
    .map((entree) => ({ entree, ligne: lireCaisse(entree, ownerId) }));

  const caissesEcrites = await ecrireLignes(
    supabase,
    'groups',
    caisses
      .filter((item) => item.ligne !== null)
      .map((item) => ({ cle: item.entree.client_uuid, valeur: item.ligne! })),
    'id',
  );
  confirmed.push(...caissesEcrites.reussies);
  rejected.push(...caissesEcrites.echecs);
  for (const item of caisses) {
    if (item.ligne === null) {
      rejected.push({ client_uuid: item.entree.client_uuid, reason: 'caisse incomplète' });
    }
  }

  let contexte = await chargerContexte(supabase, ownerId);

  const membres = entrees
    .filter((entree) => entree.entity === 'member')
    .map((entree) => ({ entree, ligne: lireMembre(entree, contexte.ownedGroupIds) }));

  const membresEcrits = await ecrireLignes(
    supabase,
    'members',
    membres
      .filter((item) => item.ligne !== null)
      .map((item) => ({ cle: item.entree.client_uuid, valeur: item.ligne! })),
    'id',
  );
  confirmed.push(...membresEcrits.reussies);
  rejected.push(...membresEcrits.echecs);
  for (const item of membres) {
    if (item.ligne === null) {
      rejected.push({
        client_uuid: item.entree.client_uuid,
        reason: 'membre rattachée à une caisse inconnue',
      });
    }
  }

  contexte = await chargerContexte(supabase, ownerId);

  const brutes = entrees.filter((entree) => entree.entity === 'transaction');
  const { accepted, rejected: refusees } = validateLot(brutes.map(operationDepuis), contexte);
  rejected.push(...refusees);

  /*
   * Identifiant produit par le téléphone, conservé tel quel.
   *
   * Laisser Postgres en générer un second donnait deux identités à la même
   * opération. À la relecture, elle revenait sous un identifiant inconnu du
   * téléphone, qui tentait alors de l'ajouter une seconde fois — et son index
   * unique sur `clientUuid` rejetait l'ensemble du lot.
   */
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const idTelephone = new Map(
    brutes
      .map((entree) => [entree.client_uuid, entree.payload.id] as const)
      .filter(([, id]) => typeof id === 'string' && UUID.test(id)),
  );

  const horodatage = new Date().toISOString();
  const operationsEcrites = await ecrireLignes(
    supabase,
    'transactions',
    accepted.map((row) => ({
      cle: row.client_uuid,
      valeur: {
        ...(idTelephone.has(row.client_uuid) ? { id: idTelephone.get(row.client_uuid) } : {}),
        client_uuid: row.client_uuid,
        group_id: row.group_id,
        member_id: row.member_id,
        amount: row.amount,
        type: row.type,
        source: row.source,
        occurred_at: row.occurred_at,
        created_by: ownerId,
        synced_at: horodatage,
      },
    })),
    'client_uuid',
  );
  confirmed.push(...operationsEcrites.reussies);
  rejected.push(...operationsEcrites.echecs);

  return { confirmed, rejected };
}
