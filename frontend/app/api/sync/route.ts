import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import {
  applyIdempotentInsert,
  extractOperations,
  validateLot,
  type ValidOperation,
} from '@/lib/sync/validate';

export const dynamic = 'force-dynamic';

type MemoryStore = Map<string, ValidOperation>;

const globalSync = globalThis as typeof globalThis & { __akweSyncStore?: MemoryStore };

function memoryStore(): MemoryStore {
  if (!globalSync.__akweSyncStore) globalSync.__akweSyncStore = new Map();
  return globalSync.__akweSyncStore;
}

function isDemoMode(): boolean {
  return process.env.DEMO_MODE === 'true' || process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
}

function serviceClient(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function authenticate(request: Request): Promise<string | null> {
  const header = request.headers.get('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) return null;
  // Jeton de démo : autorisé hors Supabase, ou si DEMO_MODE est actif.
  if (token === 'demo' && (isDemoMode() || !serviceClient())) return 'demo-user';

  const supabase = serviceClient();
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user.id;
}

async function loadContext(userId: string, groupIds: string[]) {
  const unique = [...new Set(groupIds.filter(Boolean))];
  const supabase = serviceClient();

  if (!supabase || isDemoMode()) {
    const ownedGroupIds = new Set(unique);
    const memberIdsByGroup = new Map<string, Set<string>>();
    for (const groupId of unique) {
      memberIdsByGroup.set(
        groupId,
        new Set(Array.from({ length: 12 }, (_, index) => `${groupId}-m${index}`)),
      );
    }
    return { ownedGroupIds, memberIdsByGroup };
  }

  const { data: groups } = await supabase
    .from('groups')
    .select('id')
    .eq('owner_id', userId)
    .in('id', unique.length > 0 ? unique : ['00000000-0000-0000-0000-000000000000']);

  const ownedGroupIds = new Set((groups ?? []).map((row) => row.id));
  const memberIdsByGroup = new Map<string, Set<string>>();
  if (ownedGroupIds.size > 0) {
    const { data: members } = await supabase
      .from('members')
      .select('id, group_id')
      .in('group_id', [...ownedGroupIds]);
    for (const member of members ?? []) {
      const set = memberIdsByGroup.get(member.group_id) ?? new Set<string>();
      set.add(member.id);
      memberIdsByGroup.set(member.group_id, set);
    }
  }

  return { ownedGroupIds, memberIdsByGroup };
}

async function persist(rows: readonly ValidOperation[]): Promise<void> {
  const supabase = serviceClient();
  if (!supabase || isDemoMode()) {
    applyIdempotentInsert(memoryStore(), rows);
    return;
  }

  const { error } = await supabase.from('transactions').upsert(
    rows.map((row) => ({
      client_uuid: row.client_uuid,
      group_id: row.group_id,
      member_id: row.member_id,
      amount: row.amount,
      type: row.type,
      source: row.source,
      occurred_at: row.occurred_at,
      synced_at: new Date().toISOString(),
    })),
    { onConflict: 'client_uuid', ignoreDuplicates: true },
  );

  if (error) throw new Error(error.message);
}

export async function POST(request: Request) {
  const userId = await authenticate(request);
  if (!userId) {
    return NextResponse.json({ error: 'Authentification requise.' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON invalide.' }, { status: 400 });
  }

  const extracted = extractOperations(body);
  if ('error' in extracted) {
    return NextResponse.json({ error: extracted.error }, { status: 400 });
  }

  const groupIds = extracted
    .map((row) => (typeof row.group_id === 'string' ? row.group_id : ''))
    .filter(Boolean);
  const ctx = await loadContext(userId, groupIds);
  const { accepted, rejected } = validateLot(extracted, ctx);

  try {
    if (accepted.length > 0) await persist(accepted);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Écriture impossible.';
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const synced = accepted.map((row) => row.client_uuid);
  return NextResponse.json({ synced, rejected, confirmed: synced });
}
