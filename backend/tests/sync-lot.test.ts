import { beforeEach, describe, expect, it } from 'vitest';
import { processSyncBatch } from '../src/sync/process-batch';
import { resetMemoryStore } from '../src/lib/memory-store';
import { getMemoryStore } from '../src/lib/memory-store';

function tx(client_uuid: string, amount: number) {
  return {
    client_uuid,
    entity: 'transaction' as const,
    operation: 'create' as const,
    payload: {
      group_id: 'g1',
      member_id: 'm1',
      amount,
      type: 'contribution',
      source: 'manual',
    },
  };
}

describe('lot de sync (10 dont 2 invalides)', () => {
  beforeEach(() => {
    resetMemoryStore();
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  it('accepte 8, rejette 2, et reste identique après 3 envois', async () => {
    const batch = [
      ...Array.from({ length: 8 }, (_, i) => tx(`ok-${i}`, 2000)),
      tx('bad-float', 12.5),
      { client_uuid: '', entity: 'transaction' as const, operation: 'create' as const, payload: { group_id: 'g1', amount: 2000 } },
    ];

    const runs = [
      await processSyncBatch({ batch }),
      await processSyncBatch({ batch }),
      await processSyncBatch({ batch }),
    ];

    for (const result of runs) {
      expect(result.confirmed).toHaveLength(8);
      expect(result.rejected).toHaveLength(2);
      expect(result.rejected?.[0]?.reason).toMatch(/invalide/i);
    }

    expect(runs[0]?.confirmed).toEqual(runs[1]?.confirmed);
    expect(runs[1]?.confirmed).toEqual(runs[2]?.confirmed);
    expect(getMemoryStore().transactions.size).toBe(8);
  });
});
