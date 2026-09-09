import { getDb, type OutboxEntry } from '@/lib/db/schema';

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
    createdAt: new Date().toISOString(),
  });
}

export async function pendingCount(): Promise<number> {
  return getDb().outbox.where('status').anyOf('pending', 'failed').count();
}

export async function pendingEntries(): Promise<OutboxEntry[]> {
  const rows = await getDb().outbox.where('status').anyOf('pending', 'failed').toArray();
  return rows
    .filter((entry) => entry.attempts < MAX_ATTEMPTS)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/** Résultat d'un envoi, tel que renvoyé par `POST /api/sync`. */
export interface SyncOutcome {
  sent: number;
  failed: number;
}

type Sender = (entries: readonly OutboxEntry[]) => Promise<{ confirmed: string[] }>;

/**
 * Vide la file par lot. `send` est injecté pour que les tests n'aient pas besoin
 * du réseau, et pour que l'endpoint réel reste du ressort du lead technique.
 */
export async function flushOutbox(send: Sender): Promise<SyncOutcome> {
  const entries = await pendingEntries();
  if (entries.length === 0) return { sent: 0, failed: 0 };

  const db = getDb();
  const ids = entries.map((entry) => entry.id).filter((id): id is number => id !== undefined);
  await db.outbox.bulkUpdate(ids.map((id) => ({ key: id, changes: { status: 'sending' } })));

  try {
    const { confirmed } = await send(entries);
    const confirmedSet = new Set(confirmed);
    const done = entries.filter((entry) => confirmedSet.has(entry.clientUuid));

    await db.outbox.bulkDelete(
      done.map((entry) => entry.id).filter((id): id is number => id !== undefined),
    );
    await markTransactionsSynced(done);

    const remaining = entries.length - done.length;
    if (remaining > 0) await markFailed(entries, confirmedSet, 'Non confirmé par le serveur');
    return { sent: done.length, failed: remaining };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur réseau';
    await markFailed(entries, new Set(), message);
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

async function markFailed(
  entries: readonly OutboxEntry[],
  confirmed: ReadonlySet<string>,
  reason: string,
): Promise<void> {
  const db = getDb();
  const stuck = entries.filter((entry) => !confirmed.has(entry.clientUuid));
  await db.outbox.bulkUpdate(
    stuck
      .filter((entry) => entry.id !== undefined)
      .map((entry) => ({
        key: entry.id!,
        changes: { status: 'failed' as const, attempts: entry.attempts + 1, lastError: reason },
      })),
  );
}
