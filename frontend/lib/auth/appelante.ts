import type { SupabaseClient } from '@supabase/supabase-js';
import { isDemoMode } from '@/lib/supabase/server';

/**
 * Identifie la trésorière derrière une requête `/api/*`.
 *
 * Partagé par toutes les routes authentifiées : dupliquer cette vérification,
 * c'est prendre le risque qu'une copie s'assouplisse un jour sans que l'autre
 * suive, et qu'une route laisse passer ce que sa voisine refuse.
 */
export interface Appelante {
  id: string;
  phone: string;
  fullName: string;
}

export async function identifier(
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
