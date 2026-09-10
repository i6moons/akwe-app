import { beforeEach, describe, expect, it, vi } from 'vitest';
import { sendBatch } from '@/lib/sync/client';
import { openSession } from '@/lib/auth/session';
import type { OutboxEntry } from '@/lib/db/schema';

/**
 * L'en-tête d'autorisation du lot.
 *
 * `/api/sync` répond 401 sans lui, et cet échec est invisible : la file se
 * marque « échouée » et le badge « en attente » reste affiché, sans que rien
 * n'indique la cause. Le test existe pour que l'en-tête ne disparaisse pas au
 * détour d'un refactor.
 */

const ENTREE: OutboxEntry = {
  clientUuid: 'cle-1',
  entity: 'transaction',
  operation: 'create',
  payload: JSON.stringify({ amount: 5000 }),
  status: 'pending',
  attempts: 0,
  lastError: null,
  createdAt: new Date().toISOString(),
};

function fauxFetch(reponse: unknown = { confirmed: ['cle-1'] }) {
  const mock = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => reponse,
  });
  vi.stubGlobal('fetch', mock);
  return mock;
}

function entetes(mock: ReturnType<typeof fauxFetch>): Record<string, string> {
  const init = mock.mock.calls[0]?.[1] as RequestInit;
  return init.headers as Record<string, string>;
}

beforeEach(() => {
  window.localStorage.clear();
  vi.unstubAllGlobals();
});

describe('envoi du lot de synchronisation', () => {
  it('porte toujours un en-tête d’autorisation', async () => {
    const mock = fauxFetch();
    await sendBatch([ENTREE]);
    expect(entetes(mock).Authorization).toBe('Bearer demo');
  });

  it('présente le jeton de la session dès qu’il en existe un', async () => {
    // Le jour où l'authentification réelle arrive, elle range son jeton dans la
    // session : le transport doit le prendre sans être modifié.
    const session = { phone: '97123456', displayName: 'Adjovi', accessToken: 'jeton-signé' };
    window.localStorage.setItem('akwe.session', JSON.stringify(session));

    const mock = fauxFetch();
    await sendBatch([ENTREE]);
    expect(entetes(mock).Authorization).toBe('Bearer jeton-signé');
  });

  it('retombe sur le jeton de démonstration si la session n’en porte pas', async () => {
    openSession('97123456');
    const mock = fauxFetch();
    await sendBatch([ENTREE]);
    expect(entetes(mock).Authorization).toBe('Bearer demo');
  });

  it('remonte les identifiants confirmés par le serveur', async () => {
    fauxFetch({ confirmed: ['cle-1', 42, 'cle-2'] });
    const { confirmed } = await sendBatch([ENTREE]);
    // Un identifiant qui n'est pas une chaîne est écarté : le client s'en sert
    // pour effacer des lignes, une valeur douteuse effacerait la mauvaise.
    expect(confirmed).toEqual(['cle-1', 'cle-2']);
  });

  it('signale un refus du serveur plutôt que de le passer sous silence', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401 }));
    await expect(sendBatch([ENTREE])).rejects.toThrow('401');
  });
});
