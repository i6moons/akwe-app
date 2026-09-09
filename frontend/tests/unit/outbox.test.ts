import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getDb } from '@/lib/db/schema';
import { createTransaction, balanceOf } from '@/lib/db/repository';
import { flushOutbox, pendingCount } from '@/lib/sync/outbox';
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

describe('balanceOf', () => {
  it('additionne les entrées et retranche les sorties', async () => {
    await createTransaction(draft(5000));
    await createTransaction({ ...draft(2000), type: 'loan' });

    expect(balanceOf(await getDb().transactions.toArray())).toBe(3000);
  });
});
