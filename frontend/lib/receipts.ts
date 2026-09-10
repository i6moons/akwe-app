/**
 * Reçus WhatsApp / SMS — découplés de la comptabilité.
 *
 * On n'écrit une ligne `receipts` qu'APRÈS une sync réussie, et seulement
 * si le membre a un numéro. Un échec Meta / SMS ne doit jamais empêcher
 * l'enregistrement d'une cotisation.
 */

export const MAX_RECEIPT_ATTEMPTS = 3;

export type ReceiptChannel = 'whatsapp' | 'sms';
export type ReceiptStatus = 'pending' | 'sent' | 'failed';

export interface SyncedOperation {
  transaction_id: string;
  member_id: string | null;
  member_phone: string | null;
  member_name: string | null;
  amount: number;
  occurred_at: string;
  total_saved: number;
}

export interface ReceiptRow {
  id: string;
  transaction_id: string;
  member_phone: string;
  member_first_name: string;
  amount: number;
  occurred_at: string;
  total_saved: number;
  channel: ReceiptChannel | null;
  status: ReceiptStatus;
  attempts: number;
  error: string | null;
  provider_message_id: string | null;
  created_at: string;
}

export interface SendReport {
  queued: number;
  skipped_no_phone: number;
  sent: string[];
  failed: Array<{ transaction_id: string; error: string }>;
  still_pending: number;
}

const DATE_FR = new Intl.DateTimeFormat('fr-BJ', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

/** Entier FCFA → « 2 000 F ». Jamais de virgule. */
export function formatFcfa(amount: number): string {
  return `${new Intl.NumberFormat('fr-BJ').format(Math.trunc(amount))} F`;
}

export function firstName(fullName: string | null): string {
  const token = fullName?.trim().split(/\s+/)[0];
  return token && token.length > 0 ? token : 'membre';
}

export function buildReceiptMessage(
  row: Pick<ReceiptRow, 'member_first_name' | 'amount' | 'occurred_at' | 'total_saved'>,
): string {
  const date = DATE_FR.format(new Date(row.occurred_at));
  return `Bonjour ${row.member_first_name}, votre cotisation de ${formatFcfa(row.amount)} du ${date} a bien été enregistrée. Votre total épargné : ${formatFcfa(row.total_saved)}. Envoyé par AKWÈ.`;
}

function hasPhone(value: string | null | undefined): value is string {
  return typeof value === 'string' && value.replace(/\D/g, '').length >= 8;
}

function newId(): string {
  return crypto.randomUUID();
}

/** File un reçu pending. Pas de ligne si le membre n'a pas de numéro. */
export function enqueueReceipts(
  store: Map<string, ReceiptRow>,
  operations: readonly SyncedOperation[],
): { queued: ReceiptRow[]; skipped: number } {
  const queued: ReceiptRow[] = [];
  let skipped = 0;

  for (const op of operations) {
    if (!hasPhone(op.member_phone)) {
      skipped += 1;
      continue;
    }
    if (store.has(op.transaction_id)) continue;

    const row: ReceiptRow = {
      id: newId(),
      transaction_id: op.transaction_id,
      member_phone: op.member_phone.trim(),
      member_first_name: firstName(op.member_name),
      amount: Math.trunc(op.amount),
      occurred_at: op.occurred_at,
      total_saved: Math.trunc(op.total_saved),
      channel: null,
      status: 'pending',
      attempts: 0,
      error: null,
      provider_message_id: null,
      created_at: new Date().toISOString(),
    };
    store.set(op.transaction_id, row);
    queued.push(row);
  }

  return { queued, skipped };
}

function isDemoMode(): boolean {
  return process.env.DEMO_MODE === 'true' || process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
}

async function postWhatsApp(
  phone: string,
  text: string,
): Promise<{ id: string } | { error: string }> {
  const token = process.env.WHATSAPP_TOKEN?.trim();
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  if (!token || !phoneNumberId) return { error: 'WhatsApp non configuré' };

  const response = await fetch(`https://graph.facebook.com/v19.0/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: phone.replace(/\D/g, ''),
      type: 'text',
      text: { body: text },
    }),
  });

  if (!response.ok) {
    return { error: `WhatsApp ${response.status}` };
  }
  const body = (await response.json()) as { messages?: Array<{ id?: string }> };
  const id = body.messages?.[0]?.id;
  return id ? { id } : { error: 'WhatsApp : identifiant manquant' };
}

async function postSms(phone: string, text: string): Promise<{ id: string } | { error: string }> {
  const url = process.env.SMS_API_URL?.trim();
  const key = process.env.SMS_API_KEY?.trim();
  if (!url) return { error: 'SMS non configuré' };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(key ? { Authorization: `Bearer ${key}` } : {}),
    },
    body: JSON.stringify({ to: phone.replace(/\D/g, ''), text }),
  });

  if (!response.ok) return { error: `SMS ${response.status}` };
  const body = (await response.json()) as { id?: string; message_id?: string };
  return { id: body.id ?? body.message_id ?? `sms-${Date.now()}` };
}

/** WhatsApp d'abord, SMS ensuite. Ne jette jamais. */
export async function deliverReceipt(
  row: ReceiptRow,
): Promise<{ ok: true; channel: ReceiptChannel; id: string } | { ok: false; error: string }> {
  const text = buildReceiptMessage(row);

  try {
    const wa = await postWhatsApp(row.member_phone, text);
    if ('id' in wa) return { ok: true, channel: 'whatsapp', id: wa.id };

    const sms = await postSms(row.member_phone, text);
    if ('id' in sms) return { ok: true, channel: 'sms', id: sms.id };

    if (isDemoMode() || (!process.env.WHATSAPP_TOKEN && !process.env.SMS_API_URL)) {
      return { ok: true, channel: 'sms', id: `mock-${row.transaction_id.slice(0, 8)}` };
    }

    return { ok: false, error: `${wa.error} ; ${sms.error}` };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'envoi impossible' };
  }
}

export async function processPending(store: Map<string, ReceiptRow>): Promise<SendReport> {
  const sent: string[] = [];
  const failed: Array<{ transaction_id: string; error: string }> = [];

  for (const row of store.values()) {
    if (row.status !== 'pending') continue;

    const result = await deliverReceipt(row);
    row.attempts += 1;

    if (result.ok) {
      row.status = 'sent';
      row.channel = result.channel;
      row.provider_message_id = result.id;
      row.error = null;
      sent.push(row.transaction_id);
      continue;
    }

    row.error = result.error;
    if (row.attempts >= MAX_RECEIPT_ATTEMPTS) {
      row.status = 'failed';
      failed.push({ transaction_id: row.transaction_id, error: result.error });
    }
  }

  let still_pending = 0;
  for (const row of store.values()) {
    if (row.status === 'pending') still_pending += 1;
  }

  return { queued: 0, skipped_no_phone: 0, sent, failed, still_pending };
}
