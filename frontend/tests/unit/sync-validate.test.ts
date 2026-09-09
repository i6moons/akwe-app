import { describe, expect, it } from 'vitest';
import {
  applyIdempotentInsert,
  validateLot,
  type IncomingOperation,
  type ValidOperation,
} from '@/lib/sync/validate';

const ctx = {
  ownedGroupIds: new Set(['grp-ayaba']),
  memberIdsByGroup: new Map([['grp-ayaba', new Set(['grp-ayaba-m0', 'grp-ayaba-m1'])]]),
};

function op(
  partial: Partial<IncomingOperation> & Pick<IncomingOperation, 'client_uuid'>,
): IncomingOperation {
  return {
    group_id: 'grp-ayaba',
    member_id: 'grp-ayaba-m0',
    amount: 2000,
    type: 'contribution',
    method: 'cash',
    source: 'manual',
    raw_transcript: null,
    confidence: null,
    occurred_at: '2026-09-09T10:00:00.000Z',
    ...partial,
  };
}

describe('validateLot', () => {
  it('10 opérations dont 2 invalides → 8 acceptées, 2 rejetées', () => {
    const operations = [
      ...Array.from({ length: 8 }, (_, i) => op({ client_uuid: `ok-${i}` })),
      op({ client_uuid: 'bad-amount', amount: 12.5 }),
      op({ client_uuid: '', amount: 2000 }),
    ];
    const { accepted, rejected } = validateLot(operations, ctx);
    expect(accepted).toHaveLength(8);
    expect(rejected).toHaveLength(2);
    expect(rejected.every((row) => row.reason.includes('abandonner'))).toBe(true);
  });

  it('trois upserts du même lot ne changent pas le store', () => {
    const { accepted } = validateLot(
      Array.from({ length: 8 }, (_, i) => op({ client_uuid: `id-${i}` })),
      ctx,
    );
    const store = new Map<string, ValidOperation>();
    applyIdempotentInsert(store, accepted);
    applyIdempotentInsert(store, accepted);
    applyIdempotentInsert(store, accepted);
    expect(store.size).toBe(8);
  });
});
