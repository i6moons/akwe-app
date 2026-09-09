import { NextResponse } from 'next/server';
import { handleReceipts } from '../../../../backend/src/handlers';
import type { ReceiptRequest } from '../../../../backend/contracts/api';

export const dynamic = 'force-dynamic';

/** Envoi du reçu WhatsApp / SMS après une cotisation. */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ReceiptRequest;
    const result = await handleReceipts(body);
    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur reçu';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
