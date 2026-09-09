import { describe, expect, it } from 'vitest';
import { buildReceiptMessage, enqueueReceipts, formatFcfa, type ReceiptRow } from '@/lib/receipts';

describe('reçus', () => {
  it('n’écrit rien sans numéro de téléphone', () => {
    const store = new Map<string, ReceiptRow>();
    const { queued, skipped } = enqueueReceipts(store, [
      {
        transaction_id: 't1',
        member_id: 'm1',
        member_phone: null,
        member_name: 'Kossi Agbodjan',
        amount: 2000,
        occurred_at: '2026-09-09T10:00:00.000Z',
        total_saved: 52000,
      },
    ]);
    expect(queued).toHaveLength(0);
    expect(skipped).toBe(1);
    expect(store.size).toBe(0);
  });

  it('compose le message avec formatFcfa', () => {
    const text = buildReceiptMessage({
      member_first_name: 'Kossi',
      amount: 2000,
      occurred_at: '2026-09-09T10:00:00.000Z',
      total_saved: 52000,
    });
    expect(text).toContain('Bonjour Kossi');
    expect(text).toContain(formatFcfa(2000));
    expect(text).toContain(formatFcfa(52000));
    expect(text).toContain('Envoyé par AKWÈ');
  });
});
