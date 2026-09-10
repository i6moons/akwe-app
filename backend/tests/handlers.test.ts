import { beforeEach, describe, expect, it } from 'vitest';
import {
  MAX_SYNC_BATCH,
  handleHealth,
  handleReceipts,
  handleSync,
  handleVoiceParse,
} from '../src/handlers';
import { resetMemoryStore } from '../src/lib/memory-store';

beforeEach(() => {
  resetMemoryStore();
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  delete process.env.LLM_API_KEY;
});

describe('handleSync', () => {
  it('refuse un corps qui n’est pas un objet, sans lever d’exception', async () => {
    for (const body of [null, undefined, 'bonjour', 42, [], { batch: 'non' }]) {
      await expect(handleSync(body)).resolves.toMatchObject({ status: 400 });
    }
  });

  it('plafonne le lot comme le frontend', async () => {
    const batch = Array.from({ length: MAX_SYNC_BATCH + 1 }, (_, index) => ({
      client_uuid: `tx-${index}`,
      entity: 'transaction' as const,
      operation: 'create' as const,
      payload: { group_id: 'g1', amount: 1000 },
    }));

    const trop = await handleSync({ batch });
    expect(trop.status).toBe(400);

    const juste = await handleSync({ batch: batch.slice(0, MAX_SYNC_BATCH) });
    expect(juste.status).toBe(200);
  });
});

describe('handleVoiceParse', () => {
  it('exige transcript et group_id', async () => {
    for (const body of [null, {}, { transcript: 'x' }, { group_id: 'g1' }, { transcript: 5 }]) {
      await expect(handleVoiceParse(body)).resolves.toMatchObject({ status: 400 });
    }
  });

  it('refuse une dictée démesurée', async () => {
    const result = await handleVoiceParse({
      transcript: 'a'.repeat(5000),
      group_id: 'g1',
    });
    expect(result.status).toBe(400);
  });

  it('ignore les noms de membres qui ne sont pas des chaînes', async () => {
    const result = await handleVoiceParse({
      transcript: 'Kossi a versé deux mille francs',
      group_id: 'g1',
      member_names: ['Kossi Agbodjan', null, 42, ''],
    });
    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({ member_name: 'Kossi Agbodjan', amount: 2000 });
  });

  it('retombe sur la date du serveur quand `today` est illisible', async () => {
    const result = await handleVoiceParse({
      transcript: 'Kossi a versé deux mille francs',
      group_id: 'g1',
      member_names: ['Kossi Agbodjan'],
      today: 'la semaine dernière',
    });
    const body = result.body as { occurred_at: string | null };
    expect(body.occurred_at).not.toBeNull();
    expect(new Date(body.occurred_at!).getTime()).not.toBeNaN();
  });
});

describe('handleReceipts', () => {
  it('refuse un corps incomplet ou un canal inconnu', async () => {
    await expect(handleReceipts(null)).resolves.toMatchObject({ status: 400 });
    await expect(handleReceipts({ transaction_id: 'tx' })).resolves.toMatchObject({ status: 400 });
    await expect(
      handleReceipts({ transaction_id: 'tx', member_phone: '+22997000000', channel: 'pigeon' }),
    ).resolves.toMatchObject({ status: 400, body: { error: 'channel invalide' } });
  });

  it('accepte un reçu complet', async () => {
    const result = await handleReceipts({
      transaction_id: 'abc-12345678',
      member_phone: '+229 97 00 00 00',
      channel: 'sms',
    });
    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({ sent: true });
  });

  it('ne prétend pas avoir envoyé un reçu à un numéro impossible', async () => {
    const result = await handleReceipts({
      transaction_id: 'abc-12345678',
      member_phone: 'inconnu',
      channel: 'whatsapp',
    });
    expect(result.body).toMatchObject({ sent: false, provider_message_id: null });
  });
});

describe('handleHealth', () => {
  it('annonce le mode mémoire sans clés Supabase', () => {
    expect(handleHealth().body).toMatchObject({ ok: true, supabase: false, mode: 'memory' });
  });
});
