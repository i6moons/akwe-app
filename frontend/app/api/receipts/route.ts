import { NextResponse } from 'next/server';
import { deliverReceipt, type ReceiptRow } from '@/lib/receipts';

export const dynamic = 'force-dynamic';

/**
 * Envoi d'un reçu WhatsApp / SMS.
 * Autonome : n'importe pas `backend/` (nécessaire pour Vercel, Root Directory = frontend).
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      transaction_id?: unknown;
      member_phone?: unknown;
      channel?: unknown;
      member_name?: unknown;
      amount?: unknown;
      occurred_at?: unknown;
      total_saved?: unknown;
    };

    const transaction_id =
      typeof body.transaction_id === 'string' ? body.transaction_id.trim() : '';
    const member_phone = typeof body.member_phone === 'string' ? body.member_phone.trim() : '';
    const channel = body.channel === 'sms' || body.channel === 'whatsapp' ? body.channel : null;

    if (!transaction_id || !member_phone || !channel) {
      return NextResponse.json({ error: 'champs reçus incomplets' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const first =
      typeof body.member_name === 'string' && body.member_name.trim()
        ? body.member_name.trim().split(/\s+/)[0]
        : 'membre';

    const row: ReceiptRow = {
      id: crypto.randomUUID(),
      transaction_id,
      member_phone,
      member_first_name: first && first.length > 0 ? first : 'membre',
      amount: typeof body.amount === 'number' && Number.isInteger(body.amount) ? body.amount : 0,
      occurred_at: typeof body.occurred_at === 'string' ? body.occurred_at : now,
      total_saved:
        typeof body.total_saved === 'number' && Number.isInteger(body.total_saved)
          ? body.total_saved
          : 0,
      channel,
      status: 'pending',
      attempts: 0,
      error: null,
      provider_message_id: null,
      created_at: now,
    };

    const result = await deliverReceipt(row);
    return NextResponse.json({
      sent: result.ok,
      provider_message_id: result.ok ? result.id : null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur reçu';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
