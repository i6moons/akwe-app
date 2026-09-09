import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Sonde de connexion réelle.
 * `navigator.onLine` répond « oui » dès qu'une antenne est accrochée, même sans
 * débit. Le client interroge cette route pour trancher.
 */
export function GET() {
  return NextResponse.json({ ok: true, at: new Date().toISOString() });
}

export function HEAD() {
  return new Response(null, { status: 204 });
}
