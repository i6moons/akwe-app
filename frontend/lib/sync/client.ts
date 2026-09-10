import type { OutboxEntry } from '@/lib/db/schema';
import { apiUrl } from '@/lib/api';
import { jetonDAcces } from '@/lib/auth/token';

/** Opération que le serveur a explicitement refusée, et pourquoi. */
export interface RefusServeur {
  clientUuid: string;
  reason: string;
}

export interface ReponseSync {
  confirmed: string[];
  rejected: RefusServeur[];
}

/**
 * Transport de la file d'attente vers le backend.
 *
 * On envoie un lot, le serveur renvoie les `client_uuid` enregistrés (upsert
 * idempotent) et ceux qu'il a refusés, avec un motif déjà traduit en français
 * par `lib/sync/ecriture.ts`.
 *
 * Ce motif était produit avec soin côté serveur puis jeté ici : seul `confirmed`
 * était désérialisé. Une cotisation d'un type que la base n'admet pas restait
 * donc « en attente » indéfiniment, sans que rien n'explique pourquoi.
 */
export async function sendBatch(entries: readonly OutboxEntry[]): Promise<ReponseSync> {
  const response = await fetch(apiUrl('/api/sync'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${await jetonDAcces()}`,
    },
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

  const data = (await response.json()) as { confirmed?: unknown; rejected?: unknown };
  return { confirmed: lireConfirmes(data.confirmed), rejected: lireRefus(data.rejected) };
}

function lireConfirmes(brut: unknown): string[] {
  if (!Array.isArray(brut)) return [];
  return brut.filter((value): value is string => typeof value === 'string');
}

function lireRefus(brut: unknown): RefusServeur[] {
  if (!Array.isArray(brut)) return [];
  const refus: RefusServeur[] = [];
  for (const item of brut) {
    if (typeof item !== 'object' || item === null) continue;
    const { client_uuid: uuid, reason } = item as { client_uuid?: unknown; reason?: unknown };
    if (typeof uuid !== 'string') continue;
    refus.push({ clientUuid: uuid, reason: typeof reason === 'string' ? reason : 'refusée' });
  }
  return refus;
}
