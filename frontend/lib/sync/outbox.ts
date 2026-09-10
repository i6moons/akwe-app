import { getDb, type OutboxEntry } from '@/lib/db/schema';
import type { ReponseSync } from '@/lib/sync/client';

/**
 * File d'attente de synchronisation.
 *
 * Chaque entrée porte un `clientUuid` unique. Le serveur fait un upsert sur cette
 * clé, donc rejouer la file après une coupure ne crée jamais de doublon — c'est le
 * point dur de l'offline-first, et il est traité ici plutôt que côté serveur.
 */

const MAX_ATTEMPTS = 5;

export async function enqueue(
  entity: OutboxEntry['entity'],
  operation: OutboxEntry['operation'],
  uuid: string,
  payload: unknown,
): Promise<void> {
  await getDb().outbox.add({
    clientUuid: uuid,
    entity,
    operation,
    payload: JSON.stringify(payload),
    status: 'pending',
    attempts: 0,
    lastError: null,
    refusedByServer: false,
    createdAt: new Date().toISOString(),
  });
}

/**
 * Les trois statuts comptent comme « pas encore arrivé ».
 *
 * `sending` en fait partie, et ce n'est pas un détail : une écriture que deux
 * synchronisations simultanées se disputaient pouvait y rester coincée. Ni le
 * compteur ni la file ne regardaient ce statut, si bien que l'opération
 * devenait invisible et n'était plus jamais réessayée — le badge annonçait
 * « 0 en attente » alors qu'une cotisation n'était jamais partie.
 */
const EN_ATTENTE = ['pending', 'failed', 'sending'] as const;

export async function pendingCount(): Promise<number> {
  return getDb()
    .outbox.where('status')
    .anyOf(...EN_ATTENTE)
    .count();
}

export async function pendingEntries(): Promise<OutboxEntry[]> {
  const rows = await getDb()
    .outbox.where('status')
    .anyOf(...EN_ATTENTE)
    .toArray();
  return rows
    .filter((entry) => entry.attempts < MAX_ATTEMPTS)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/** Résultat d'un envoi, tel que renvoyé par `POST /api/sync`. */
export interface SyncOutcome {
  sent: number;
  failed: number;
}

type Sender = (entries: readonly OutboxEntry[]) => Promise<ReponseSync>;

/** Refus explicites du serveur restant dans la file, et leur motif dominant. */
export interface RefusEnAttente {
  nombre: number;
  motif: string;
}

/**
 * Ce que le serveur a nommément refusé et qui attend encore.
 *
 * La trésorière voyait « N opérations en attente » sans jamais savoir que
 * certaines ne partiraient pas, ni pourquoi. Le motif remonte maintenant
 * jusqu'à elle.
 */
export async function refusEnAttente(): Promise<RefusEnAttente | null> {
  const rows = await getDb()
    .outbox.where('status')
    .anyOf(...EN_ATTENTE)
    .toArray();
  const refuses = rows.filter((entry) => entry.refusedByServer === true);
  if (refuses.length === 0) return null;

  // Un même motif touche en général toutes les lignes concernées ; on montre le
  // plus fréquent plutôt que d'énumérer.
  const comptes = new Map<string, number>();
  for (const entry of refuses) {
    const motif = entry.lastError ?? 'refusée par le serveur';
    comptes.set(motif, (comptes.get(motif) ?? 0) + 1);
  }
  const [motif] = [...comptes.entries()].sort((a, b) => b[1] - a[1])[0]!;
  return { nombre: refuses.length, motif };
}

/**
 * Vide la file par lot. `send` est injecté pour que les tests n'aient pas besoin
 * du réseau, et pour que l'endpoint réel reste du ressort du lead technique.
 */
/**
 * Vidage en cours, s'il y en a un.
 *
 * L'écran relance la synchronisation dès que le nombre d'attentes change, ce
 * qui peut déclencher deux vidages qui se chevauchent. Le second remettait
 * alors à « en cours d'envoi » des écritures que le premier venait de marquer
 * en échec, et elles s'y figeaient. Une seule à la fois, donc.
 */
let vidageEnCours: Promise<SyncOutcome> | null = null;

export function flushOutbox(send: Sender): Promise<SyncOutcome> {
  vidageEnCours ??= vider(send).finally(() => {
    vidageEnCours = null;
  });
  return vidageEnCours;
}

async function vider(send: Sender): Promise<SyncOutcome> {
  const entries = await pendingEntries();
  if (entries.length === 0) return { sent: 0, failed: 0 };

  // Le serveur plafonne un lot à 200 opérations et rejette tout au-delà. Une
  // trésorière restée une semaine sans réseau dépasse ce seuil sans peine :
  // sans découpage, sa file entière échouerait d'un bloc, indéfiniment.
  const total: SyncOutcome = { sent: 0, failed: 0 };
  for (let debut = 0; debut < entries.length; debut += TAILLE_LOT) {
    const lot = entries.slice(debut, debut + TAILLE_LOT);
    const resultat = await envoyerLot(lot, send);
    total.sent += resultat.sent;
    total.failed += resultat.failed;
    // Un lot refusé annonce en général une panne : inutile d'insister avec les
    // suivants, ils repartiront à la prochaine tentative.
    if (resultat.failed > 0) break;
  }
  return total;
}

/** Plafond appliqué par `POST /api/sync` (`MAX_SYNC_BATCH`). */
const TAILLE_LOT = 200;

async function envoyerLot(entries: readonly OutboxEntry[], send: Sender): Promise<SyncOutcome> {
  const db = getDb();
  const ids = entries.map((entry) => entry.id).filter((id): id is number => id !== undefined);
  await db.outbox.bulkUpdate(ids.map((id) => ({ key: id, changes: { status: 'sending' } })));

  try {
    const { confirmed, rejected } = await send(entries);
    const confirmedSet = new Set(confirmed);
    const done = entries.filter((entry) => confirmedSet.has(entry.clientUuid));

    await db.outbox.bulkDelete(
      done.map((entry) => entry.id).filter((id): id is number => id !== undefined),
    );
    await markTransactionsSynced(done);

    const remaining = entries.length - done.length;
    if (remaining > 0) {
      const motifs = new Map(rejected.map((refus) => [refus.clientUuid, refus.reason]));
      await markFailed(entries, confirmedSet, motifs, 'Non confirmé par le serveur');
    }
    return { sent: done.length, failed: remaining };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur réseau';
    await markFailed(entries, new Set(), new Map(), message);
    return { sent: 0, failed: entries.length };
  }
}

async function markTransactionsSynced(entries: readonly OutboxEntry[]): Promise<void> {
  const uuids = entries
    .filter((entry) => entry.entity === 'transaction')
    .map((entry) => entry.clientUuid);
  if (uuids.length === 0) return;

  const db = getDb();
  const rows = await db.transactions.where('clientUuid').anyOf(uuids).toArray();
  await db.transactions.bulkUpdate(
    rows.map((row) => ({ key: row.id, changes: { syncStatus: 'synced' as const } })),
  );
}

/**
 * `motifs` porte les refus nommés par le serveur ; `defaut` couvre le reste,
 * c'est-à-dire une panne de transport ou un lot resté sans réponse. La
 * distinction est conservée sur l'entrée : seul le premier cas mérite d'être
 * montré à la trésorière, le second se réglera tout seul au retour du réseau.
 */
async function markFailed(
  entries: readonly OutboxEntry[],
  confirmed: ReadonlySet<string>,
  motifs: ReadonlyMap<string, string>,
  defaut: string,
): Promise<void> {
  const db = getDb();
  const stuck = entries.filter((entry) => !confirmed.has(entry.clientUuid));
  await db.outbox.bulkUpdate(
    stuck
      .filter((entry) => entry.id !== undefined)
      .map((entry) => {
        const refus = motifs.get(entry.clientUuid);
        return {
          key: entry.id!,
          changes: {
            status: 'failed' as const,
            attempts: entry.attempts + 1,
            lastError: refus ?? defaut,
            refusedByServer: refus !== undefined,
          },
        };
      }),
  );
}
