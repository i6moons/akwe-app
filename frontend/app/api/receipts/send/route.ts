import { NextResponse } from 'next/server';
import {
  enqueueReceipts,
  processPending,
  type ReceiptRow,
  type SyncedOperation,
} from '@/lib/receipts';

export const dynamic = 'force-dynamic';

type Store = Map<string, ReceiptRow>;

const globalReceipts = globalThis as typeof globalThis & { __akweReceipts?: Store };

function receiptStore(): Store {
  if (!globalReceipts.__akweReceipts) globalReceipts.__akweReceipts = new Map();
  return globalReceipts.__akweReceipts;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function parseOperations(body: unknown): SyncedOperation[] {
  const record = asRecord(body);
  const raw = record && Array.isArray(record.operations) ? record.operations : [];
  const parsed: SyncedOperation[] = [];

  for (const item of raw) {
    const row = asRecord(item);
    if (!row) continue;
    const transaction_id =
      typeof row.transaction_id === 'string'
        ? row.transaction_id
        : typeof row.client_uuid === 'string'
          ? row.client_uuid
          : '';
    if (!transaction_id) continue;
    parsed.push({
      transaction_id,
      member_id: typeof row.member_id === 'string' ? row.member_id : null,
      member_phone: typeof row.member_phone === 'string' ? row.member_phone : null,
      member_name: typeof row.member_name === 'string' ? row.member_name : null,
      amount: typeof row.amount === 'number' ? row.amount : 0,
      occurred_at: typeof row.occurred_at === 'string' ? row.occurred_at : new Date().toISOString(),
      total_saved:
        typeof row.total_saved === 'number'
          ? row.total_saved
          : typeof row.amount === 'number'
            ? row.amount
            : 0,
    });
  }

  return parsed;
}

/**
 * Traite les reçus pending. Toujours 200 : un échec WhatsApp/SMS
 * ne remonte jamais comme une erreur d'enregistrement.
 */
export async function POST(request: Request) {
  try {
    let body: unknown = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const store = receiptStore();
    const operations = parseOperations(body);
    const queued = enqueueReceipts(store, operations);
    const report = await processPending(store);

    return NextResponse.json({
      queued: queued.queued.length,
      skipped_no_phone: queued.skipped,
      sent: report.sent,
      failed: report.failed,
      still_pending: report.still_pending,
    });
  } catch {
    return NextResponse.json({
      queued: 0,
      skipped_no_phone: 0,
      sent: [],
      failed: [],
      still_pending: 0,
      note: 'Envoi des reçus reporté — la cotisation reste enregistrée.',
    });
  }
}
