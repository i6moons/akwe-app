import type {
  ReceiptRequest,
  SyncRequest,
  VoiceParseRequest,
} from '../contracts/api';
import { sendReceipt } from './receipts/send';
import { processSyncBatch } from './sync/process-batch';
import { parseVoice } from './voice/parse';
import { hasSupabase } from './lib/supabase';

export async function handleSync(body: SyncRequest) {
  if (!Array.isArray(body.batch)) {
    return { status: 400 as const, body: { error: 'batch manquant' } };
  }
  const result = await processSyncBatch(body);
  return { status: 200 as const, body: result };
}

export async function handleVoiceParse(body: VoiceParseRequest) {
  if (typeof body.transcript !== 'string' || typeof body.group_id !== 'string') {
    return { status: 400 as const, body: { error: 'transcript et group_id requis' } };
  }
  const result = await parseVoice({
    transcript: body.transcript,
    group_id: body.group_id,
    member_names: Array.isArray(body.member_names) ? body.member_names : [],
    today: typeof body.today === 'string' ? body.today : new Date().toISOString().slice(0, 10),
  });
  return { status: 200 as const, body: result };
}

export async function handleReceipts(body: ReceiptRequest) {
  if (!body.transaction_id || !body.member_phone || !body.channel) {
    return { status: 400 as const, body: { error: 'champs reçus incomplets' } };
  }
  if (body.channel !== 'whatsapp' && body.channel !== 'sms') {
    return { status: 400 as const, body: { error: 'channel invalide' } };
  }
  const result = await sendReceipt(body);
  return { status: 200 as const, body: result };
}

export function handleHealth() {
  return {
    status: 200 as const,
    body: {
      ok: true,
      at: new Date().toISOString(),
      supabase: hasSupabase(),
      mode: hasSupabase() ? 'supabase' : 'memory',
    },
  };
}
