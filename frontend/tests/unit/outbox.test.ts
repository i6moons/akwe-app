import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getDb } from '@/lib/db/schema';
import { createTransaction, balanceOf } from '@/lib/db/repository';
import { flushOutbox, pendingCount, refusEnAttente } from '@/lib/sync/outbox';
import type { OperationDraft } from '@/lib/types';

/**
 * Le cœur de l'offline-first : une écriture hors ligne doit survivre, remonter
 * une seule fois, et ne jamais se dupliquer si la file est rejouée.
 */

function draft(amount: number): OperationDraft {
  return {
    groupId: 'g1',
    memberId: 'm1',
    memberName: 'Kossi Agbodjan',
    amount,
    type: 'contribution',
    occurredAt: new Date().toISOString(),
    source: 'manual',
    rawTranscript: null,
    confidence: null,
  };
}

beforeEach(async () => {
  const db = getDb();
  await Promise.all([db.transactions.clear(), db.outbox.clear()]);
});

describe('deux synchronisations qui se chevauchent', () => {
  it('n’en exécute qu’une et laisse l’autre attendre le même résultat', async () => {
    await createTransaction(draft(2000));

    let appels = 0;
    const envoi = async (entries: readonly { clientUuid: string }[]) => {
      appels += 1;
      await new Promise((resolve) => setTimeout(resolve, 20));
      return { confirmed: entries.map((entry) => entry.clientUuid), rejected: [] };
    };

    const [a, b] = await Promise.all([flushOutbox(envoi), flushOutbox(envoi)]);

    expect(appels).toBe(1);
    expect(a).toEqual(b);
    expect(await pendingCount()).toBe(0);
  });

  it('ne perd pas une écriture laissée « en cours d’envoi » par un vidage interrompu', async () => {
    await createTransaction(draft(3000));
    const db = getDb();
    const bloquee = await db.outbox.toCollection().first();
    // État exact dans lequel une course laissait l'écriture : plus jamais
    // comptée, donc plus jamais réessayée.
    await db.outbox.update(bloquee!.id!, { status: 'sending' });

    expect(await pendingCount()).toBe(1);

    const { sent } = await flushOutbox(async (entries) => ({
      confirmed: entries.map((entry) => entry.clientUuid),
      rejected: [],
    }));

    expect(sent).toBe(1);
    expect(await pendingCount()).toBe(0);
  });
});

describe('écriture hors ligne', () => {
  it('écrit dans IndexedDB et empile dans la file', async () => {
    await createTransaction(draft(2000));

    expect(await getDb().transactions.count()).toBe(1);
    expect(await pendingCount()).toBe(1);
  });

  it('refuse un montant nul ou négatif', async () => {
    await expect(createTransaction(draft(0))).rejects.toThrow(/Montant invalide/);
    await expect(createTransaction({ ...draft(1), amount: -5 })).rejects.toThrow();
  });

  it('tronque un montant à virgule en entier de FCFA', async () => {
    const transaction = await createTransaction({ ...draft(1), amount: 2000.87 });
    expect(transaction.amount).toBe(2000);
  });
});

describe('flushOutbox', () => {
  it('vide la file et marque les opérations comme synchronisées', async () => {
    await createTransaction(draft(2000));
    const send = vi.fn(async (entries: readonly { clientUuid: string }[]) => ({
      confirmed: entries.map((entry) => entry.clientUuid),
      rejected: [],
    }));

    const outcome = await flushOutbox(send);

    expect(outcome).toEqual({ sent: 1, failed: 0 });
    expect(await pendingCount()).toBe(0);
    const rows = await getDb().transactions.toArray();
    expect(rows[0]?.syncStatus).toBe('synced');
  });

  it('conserve la file quand le réseau échoue', async () => {
    await createTransaction(draft(2000));
    const send = vi.fn(async () => {
      throw new Error('Réseau indisponible');
    });

    const outcome = await flushOutbox(send);

    expect(outcome.sent).toBe(0);
    expect(await pendingCount()).toBe(1);
  });

  it('est idempotent : rejouer une file déjà vidée ne renvoie rien', async () => {
    await createTransaction(draft(2000));
    const send = vi.fn(async (entries: readonly { clientUuid: string }[]) => ({
      confirmed: entries.map((entry) => entry.clientUuid),
      rejected: [],
    }));

    await flushOutbox(send);
    const second = await flushOutbox(send);

    expect(second).toEqual({ sent: 0, failed: 0 });
    expect(send).toHaveBeenCalledTimes(1);
    expect(await getDb().transactions.count()).toBe(1);
  });

  it('attribue un client_uuid unique à chaque écriture', async () => {
    await createTransaction(draft(2000));
    await createTransaction(draft(3000));

    const uuids = (await getDb().transactions.toArray()).map((row) => row.clientUuid);
    expect(new Set(uuids).size).toBe(2);
  });
});

describe('refus explicite du serveur', () => {
  it('conserve le motif du serveur et le distingue d’une panne de réseau', async () => {
    await createTransaction({ ...draft(2000), type: 'repayment' });
    const db = getDb();
    const entree = await db.outbox.toCollection().first();

    const outcome = await flushOutbox(async (entries) => ({
      confirmed: [],
      rejected: entries.map((entry) => ({
        clientUuid: entry.clientUuid,
        reason: "ce type d'opération n'est pas accepté",
      })),
    }));

    expect(outcome).toEqual({ sent: 0, failed: 1 });
    const apres = await db.outbox.get(entree!.id!);
    expect(apres?.lastError).toBe("ce type d'opération n'est pas accepté");
    expect(apres?.refusedByServer).toBe(true);

    // L'opération reste dans la file : elle n'a jamais atteint la base, et rien
    // ne doit laisser croire le contraire.
    expect(await pendingCount()).toBe(1);
    expect(await refusEnAttente()).toEqual({
      nombre: 1,
      motif: "ce type d'opération n'est pas accepté",
    });
  });

  it('ne signale aucun refus quand c’est le réseau qui a lâché', async () => {
    await createTransaction(draft(2000));

    await flushOutbox(async () => {
      throw new Error('Réseau indisponible');
    });

    const entree = await getDb().outbox.toCollection().first();
    expect(entree?.lastError).toBe('Réseau indisponible');
    expect(entree?.refusedByServer).toBe(false);
    expect(await refusEnAttente()).toBeNull();
  });

  it('confirme une partie du lot et laisse le reste avec son motif', async () => {
    await createTransaction(draft(1000));
    await createTransaction(draft(2000));
    const db = getDb();
    const [premiere, seconde] = await db.outbox.orderBy('createdAt').toArray();

    const outcome = await flushOutbox(async () => ({
      confirmed: [premiere!.clientUuid],
      rejected: [{ clientUuid: seconde!.clientUuid, reason: 'la caisse est introuvable' }],
    }));

    expect(outcome).toEqual({ sent: 1, failed: 1 });
    expect(await db.outbox.get(premiere!.id!)).toBeUndefined();
    expect((await db.outbox.get(seconde!.id!))?.lastError).toBe('la caisse est introuvable');

    // La confirmée est bien marquée, la refusée reste « en attente ».
    const operations = await db.transactions.toArray();
    const parUuid = new Map(operations.map((row) => [row.clientUuid, row.syncStatus]));
    expect(parUuid.get(premiere!.clientUuid)).toBe('synced');
    expect(parUuid.get(seconde!.clientUuid)).not.toBe('synced');
  });
});

describe('balanceOf', () => {
  it('additionne les entrées et retranche les sorties', async () => {
    await createTransaction(draft(5000));
    await createTransaction({ ...draft(2000), type: 'loan' });

    expect(balanceOf(await getDb().transactions.toArray())).toBe(3000);
  });
});
