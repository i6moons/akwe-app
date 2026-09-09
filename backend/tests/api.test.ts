import { describe, expect, it, beforeEach } from 'vitest';
import { processSyncBatch } from '../src/sync/process-batch';
import { parseVoiceLocal } from '../src/voice/parse';
import { sendReceipt } from '../src/receipts/send';
import { resetMemoryStore } from '../src/lib/memory-store';

describe('processSyncBatch', () => {
  beforeEach(() => {
    resetMemoryStore();
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  it('confirme une transaction idempotente', async () => {
    const first = await processSyncBatch({
      batch: [
        {
          client_uuid: 'tx-1',
          entity: 'transaction',
          operation: 'create',
          payload: {
            group_id: 'g1',
            member_id: 'm1',
            amount: 5000,
            type: 'contribution',
            source: 'manual',
          },
        },
      ],
    });
    expect(first.confirmed).toEqual(['tx-1']);

    const replay = await processSyncBatch({
      batch: [
        {
          client_uuid: 'tx-1',
          entity: 'transaction',
          operation: 'create',
          payload: {
            group_id: 'g1',
            member_id: 'm1',
            amount: 5000,
            type: 'contribution',
            source: 'manual',
          },
        },
      ],
    });
    expect(replay.confirmed).toEqual(['tx-1']);
    expect(replay.rejected).toBeUndefined();
  });

  it('refuse un montant non entier', async () => {
    const result = await processSyncBatch({
      batch: [
        {
          client_uuid: 'bad',
          entity: 'transaction',
          operation: 'create',
          payload: { group_id: 'g1', amount: 12.5, type: 'contribution' },
        },
      ],
    });
    expect(result.confirmed).toEqual([]);
    expect(result.rejected?.[0]?.reason).toMatch(/invalide/i);
  });
});

describe('parseVoiceLocal', () => {
  it('structure une cotisation en français', () => {
    const parsed = parseVoiceLocal({
      transcript: 'Fatou a cotisé cinq mille francs',
      group_id: 'g1',
      member_names: ['Fatou Diallo', 'Adjoa Koffi'],
      today: '2026-09-09',
    });
    expect(parsed.amount).toBe(5000);
    expect(parsed.member_name).toBe('Fatou Diallo');
    expect(parsed.type).toBe('contribution');
    expect(parsed.confidence).toBeGreaterThanOrEqual(0.7);
  });
});

describe('sendReceipt', () => {
  it('simule un envoi sans provider', async () => {
    const result = await sendReceipt({
      transaction_id: 'abc-12345678',
      member_phone: '+22997000000',
      channel: 'whatsapp',
    });
    expect(result.sent).toBe(true);
    expect(result.provider_message_id).toMatch(/^mock-whatsapp-/);
  });
});
