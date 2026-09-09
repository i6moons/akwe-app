import { describe, expect, it } from 'vitest';
import { groupByDay } from '@/lib/operations/group-by-day';
import type { Transaction } from '@/lib/types';

const NOW = new Date('2026-04-12T18:00:00Z');

function transaction(id: string, occurredAt: string): Transaction {
  return {
    id,
    groupId: 'g1',
    memberId: 'm1',
    amount: 2000,
    type: 'contribution',
    source: 'manual',
    occurredAt,
    rawTranscript: null,
    confidence: null,
    clientUuid: id,
    syncStatus: 'synced',
    createdAt: occurredAt,
  };
}

describe('groupByDay', () => {
  it('regroupe par journée, la plus récente en premier', () => {
    const buckets = groupByDay(
      [
        transaction('a', '2026-04-10T09:00:00Z'),
        transaction('b', '2026-04-12T08:00:00Z'),
        transaction('c', '2026-04-12T14:00:00Z'),
      ],
      NOW,
    );

    expect(buckets).toHaveLength(2);
    expect(buckets[0]?.label).toBe("Aujourd'hui");
    expect(buckets[0]?.transactions).toHaveLength(2);
    expect(buckets[1]?.label).toBe('Avant-hier');
  });

  it('trie les opérations d’une même journée de la plus récente à la plus ancienne', () => {
    const buckets = groupByDay(
      [transaction('a', '2026-04-12T08:00:00Z'), transaction('b', '2026-04-12T14:00:00Z')],
      NOW,
    );

    expect(buckets[0]?.transactions.map((item) => item.id)).toEqual(['b', 'a']);
  });

  it('rend un tableau vide sans opération', () => {
    expect(groupByDay([], NOW)).toEqual([]);
  });
});
