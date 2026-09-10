import { beforeEach, describe, expect, it } from 'vitest';
import type { SyncBatchItem } from '../contracts/api';
import { getMemoryStore, resetMemoryStore } from '../src/lib/memory-store';
import { normalizeItem } from '../src/sync/normalize';
import { processSyncBatch } from '../src/sync/process-batch';

beforeEach(() => {
  resetMemoryStore();
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
});

const caissePayload = {
  name: 'Tontine Ayaba',
  contribution_amount: 2000,
  frequency: 'weekly',
};

const caisse: SyncBatchItem = {
  client_uuid: 'grp-ayaba',
  entity: 'group',
  operation: 'create',
  payload: caissePayload,
};

const membre: SyncBatchItem = {
  client_uuid: 'mbr-kossi',
  entity: 'member',
  operation: 'create',
  payload: { group_id: 'grp-ayaba', full_name: 'Kossi Agbodjan' },
};

describe('idempotence des caisses et des membres', () => {
  it('trois envois de la même caisse ne créent qu’une caisse', async () => {
    for (let envoi = 0; envoi < 3; envoi += 1) {
      const result = await processSyncBatch({ batch: [caisse, membre] });
      expect(result.confirmed).toEqual(['grp-ayaba', 'mbr-kossi']);
      expect(result.rejected).toBeUndefined();
    }

    expect(getMemoryStore().groups.size).toBe(1);
    expect(getMemoryStore().members.size).toBe(1);
  });

  it('réutilise le client_uuid comme identifiant, faute de colonne dédiée', () => {
    const result = normalizeItem(caisse);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.item.row).toMatchObject({ id: 'grp-ayaba' });
  });

  it('un identifiant fourni par le téléphone est conservé', () => {
    const result = normalizeItem({ ...caisse, payload: { ...caissePayload, id: 'fixe-1' } });
    if (result.ok) expect(result.item.row).toMatchObject({ id: 'fixe-1' });
  });

  it('ne confirme qu’une fois un client_uuid présent deux fois dans le lot', async () => {
    const result = await processSyncBatch({ batch: [caisse, caisse] });
    expect(result.confirmed).toEqual(['grp-ayaba']);
  });
});

describe('ordre d’écriture', () => {
  it('écrit la caisse avant les cotisations, quel que soit l’ordre du lot', async () => {
    const cotisation: SyncBatchItem = {
      client_uuid: 'tx-1',
      entity: 'transaction',
      operation: 'create',
      payload: { group_id: 'grp-ayaba', amount: 2000, type: 'contribution' },
    };

    const result = await processSyncBatch({ batch: [cotisation, membre, caisse] });
    expect(result.confirmed).toEqual(['grp-ayaba', 'mbr-kossi', 'tx-1']);
  });
});

describe('entrées refusées', () => {
  it('refuse un type d’opération que la base n’accepterait pas', async () => {
    const result = await processSyncBatch({
      batch: [
        {
          client_uuid: 'tx-flou',
          entity: 'transaction',
          operation: 'create',
          payload: { group_id: 'g1', amount: 2000, type: 'unknown' },
        },
      ],
    });
    expect(result.confirmed).toEqual([]);
    expect(result.rejected?.[0]).toMatchObject({ client_uuid: 'tx-flou' });
    expect(result.rejected?.[0]?.reason).toMatch(/type/i);
  });

  it('refuse un montant qui déborderait la colonne entière', async () => {
    const result = await processSyncBatch({
      batch: [
        {
          client_uuid: 'tx-enorme',
          entity: 'transaction',
          operation: 'create',
          payload: { group_id: 'g1', amount: 3_000_000_000 },
        },
      ],
    });
    expect(result.confirmed).toEqual([]);
    expect(result.rejected?.[0]?.reason).toMatch(/invalide/i);
  });

  it('survit à une entrée qui n’est pas un objet', async () => {
    const batch = [null, 'bonjour', 42, { entity: 'facture', client_uuid: 'x' }];
    const result = await processSyncBatch({ batch: batch as unknown as SyncBatchItem[] });
    expect(result.confirmed).toEqual([]);
    expect(result.rejected).toHaveLength(4);
  });

  it('normalise les alias camelCase de la file existante', () => {
    const result = normalizeItem({
      client_uuid: 'tx-2',
      entity: 'transaction',
      operation: 'create',
      payload: { groupId: 'g1', memberId: 'm1', amount: 1500, occurredAt: '2026-09-01T08:00:00Z' },
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.item.row).toMatchObject({
        group_id: 'g1',
        member_id: 'm1',
        amount: 1500,
        occurred_at: '2026-09-01T08:00:00.000Z',
      });
    }
  });

  it('remplace une date illisible par l’heure du serveur', () => {
    const result = normalizeItem({
      client_uuid: 'tx-3',
      entity: 'transaction',
      operation: 'create',
      payload: { group_id: 'g1', amount: 1000, occurred_at: 'la semaine dernière' },
    });
    if (result.ok && result.item.entity === 'transaction') {
      expect(Number.isNaN(new Date(result.item.row.occurred_at).getTime())).toBe(false);
    }
  });
});
