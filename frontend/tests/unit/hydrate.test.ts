import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getDb } from '@/lib/db/schema';
import { hydrater } from '@/lib/sync/hydrate';
import { createTransaction } from '@/lib/db/repository';
import type { OperationDraft } from '@/lib/types';

/**
 * La relecture doit compléter le carnet local, jamais le casser.
 *
 * Une opération porte deux identités : l'identifiant du téléphone et celui de
 * la base. Quand la relecture les confondait, elle tentait de réinsérer une
 * ligne déjà connue sous un autre identifiant, l'index unique sur `clientUuid`
 * refusait le lot entier, et l'erreur Dexie qui s'ensuivait vidait l'accueil.
 */

function brouillon(): OperationDraft {
  return {
    groupId: 'g1',
    memberId: 'm1',
    memberName: 'Kossi Agbodjan',
    amount: 2000,
    type: 'contribution',
    occurredAt: '2026-09-01T10:00:00.000Z',
    source: 'manual',
    rawTranscript: null,
    confidence: null,
  };
}

function reponse(corps: unknown) {
  return { ok: true, json: async () => corps } as Response;
}

beforeEach(async () => {
  const db = getDb();
  await Promise.all([db.transactions.clear(), db.outbox.clear(), db.groups.clear()]);
  localStorage.setItem('akwe.session', JSON.stringify({ accessToken: 'jeton-test' }));
});

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe('relecture depuis le serveur', () => {
  it('conserve l’identifiant local quand le serveur renvoie le sien', async () => {
    const locale = await createTransaction(brouillon());

    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        reponse({
          groups: [],
          members: [],
          transactions: [
            {
              // Même opération, mais l'identifiant que la base lui a donné.
              id: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
              client_uuid: locale.clientUuid,
              group_id: 'g1',
              member_id: 'm1',
              amount: 2000,
              type: 'contribution',
              occurred_at: '2026-09-01T10:00:00.000Z',
            },
          ],
        }),
      ),
    );

    await expect(hydrater()).resolves.not.toBeNull();

    const db = getDb();
    expect(await db.transactions.count()).toBe(1);
    const gardee = await db.transactions.get(locale.id);
    expect(gardee?.clientUuid).toBe(locale.clientUuid);
  });

  it('ajoute une opération venue d’un autre téléphone', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        reponse({
          transactions: [
            {
              id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
              client_uuid: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
              group_id: 'g1',
              member_id: 'm1',
              amount: 5000,
              type: 'contribution',
              occurred_at: '2026-09-02T10:00:00.000Z',
            },
          ],
        }),
      ),
    );

    await hydrater();

    const db = getDb();
    expect(await db.transactions.count()).toBe(1);
    expect((await db.transactions.toArray())[0]?.amount).toBe(5000);
  });
});
