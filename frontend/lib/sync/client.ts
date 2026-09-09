import type { OutboxEntry } from '@/lib/db/schema';
import { apiUrl } from '@/lib/api';

/**
 * Transport de la file d'attente vers le backend.
 *
 * Le contrat est volontairement minimal : on envoie un lot, le serveur renvoie
 * la liste des `client_uuid` qu'il a bien enregistrés (upsert idempotent). La
 * forme exacte est figée dans `backend/contracts/api.ts`.
 */
export async function sendBatch(entries: readonly OutboxEntry[]): Promise<{ confirmed: string[] }> {
  const response = await fetch(apiUrl('/api/sync'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      batch: entries.map((entry) => ({
        client_uuid: entry.clientUuid,
        entity: entry.entity,
        operation: entry.operation,
        payload: JSON.parse(entry.payload) as unknown,
      })),
    }),
  });

  if (!response.ok) {
    throw new Error(`Synchronisation refusée par le serveur (${response.status})`);
  }

  const data = (await response.json()) as { confirmed?: unknown };
  const confirmed = Array.isArray(data.confirmed)
    ? data.confirmed.filter((value): value is string => typeof value === 'string')
    : [];
  return { confirmed };
}
