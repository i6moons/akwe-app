import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { ensureProfile, isDemoMode, serviceClient } from '@/lib/supabase/server';
import { separerParEntite } from '@/lib/sync/entities';
import { chargerContexte, ecrireLot } from '@/lib/sync/persist';
import { MAX_SYNC_BATCH } from '@/lib/sync/validate';

export const dynamic = 'force-dynamic';

interface Appelante {
  id: string;
  phone: string;
  fullName: string;
}

async function identifier(
  request: Request,
  supabase: SupabaseClient | null,
): Promise<Appelante | null> {
  const header = request.headers.get('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) return null;

  // Jeton de démonstration : accepté uniquement sans base, ou en mode démo. Il
  // ne peut donc jamais servir à écrire dans les données réelles.
  if (token === 'demo' && (isDemoMode() || !supabase)) {
    return { id: 'demo-user', phone: '0000000000', fullName: 'Démonstration' };
  }
  if (!supabase) return null;

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;

  const meta = data.user.user_metadata ?? {};
  return {
    id: data.user.id,
    phone: typeof meta.phone === 'string' ? meta.phone : (data.user.email ?? '').split('@')[0]!,
    fullName: typeof meta.full_name === 'string' ? meta.full_name : 'Trésorière',
  };
}

export async function POST(request: Request) {
  const supabase = serviceClient();
  const appelante = await identifier(request, supabase);
  if (!appelante) {
    return NextResponse.json({ error: 'Authentification requise.' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON invalide.' }, { status: 400 });
  }

  const entrees = separerParEntite(body);
  if (entrees.length > MAX_SYNC_BATCH) {
    return NextResponse.json({ error: 'Lot plafonné à 200 opérations.' }, { status: 400 });
  }

  // Sans base configurée, on confirme le lot pour que la file se vide : la
  // démonstration hors ligne doit rester fluide.
  if (!supabase || isDemoMode()) {
    const confirmed = entrees.map((entree) => entree.client_uuid);
    return NextResponse.json({ synced: confirmed, confirmed, rejected: [] });
  }

  try {
    await ensureProfile(supabase, appelante.id, appelante.phone, appelante.fullName);
    const { confirmed, rejected } = await ecrireLot(supabase, appelante.id, entrees);
    return NextResponse.json({ synced: confirmed, confirmed, rejected });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Écriture impossible.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * Renvoie le carnet complet de la trésorière.
 *
 * C'est ce qui permet de retrouver ses caisses après avoir changé de téléphone
 * ou vidé son navigateur. Sans cette lecture, les données seraient bien en base
 * mais l'application afficherait un carnet vide, ce qui donnerait à penser
 * qu'elles ont été perdues.
 */
export async function GET(request: Request) {
  const supabase = serviceClient();
  const appelante = await identifier(request, supabase);
  if (!appelante) {
    return NextResponse.json({ error: 'Authentification requise.' }, { status: 401 });
  }
  if (!supabase || isDemoMode()) {
    return NextResponse.json({ groups: [], members: [], transactions: [] });
  }

  const { ownedGroupIds } = await chargerContexte(supabase, appelante.id);
  const ids = [...ownedGroupIds];
  if (ids.length === 0) {
    return NextResponse.json({ groups: [], members: [], transactions: [] });
  }

  const [caisses, membres, operations] = await Promise.all([
    supabase.from('groups').select('*').eq('owner_id', appelante.id),
    supabase.from('members').select('*').in('group_id', ids),
    supabase
      .from('transactions')
      .select('*')
      .in('group_id', ids)
      .order('occurred_at', { ascending: false })
      .limit(500),
  ]);

  return NextResponse.json({
    groups: caisses.data ?? [],
    members: membres.data ?? [],
    transactions: operations.data ?? [],
  });
}
