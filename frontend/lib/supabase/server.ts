import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Accès à Supabase depuis les routes `/api/*`.
 *
 * La clé de service contourne les politiques RLS : elle ne doit jamais quitter
 * le serveur, et chaque route reste donc responsable de vérifier que les données
 * touchées appartiennent bien à l'appelante.
 */
export function serviceClient(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** `true` quand la démo tourne sans base : les écritures restent en mémoire. */
export function isDemoMode(): boolean {
  return process.env.DEMO_MODE === 'true' || process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
}

/**
 * Garantit la fiche de la trésorière dans `public.users`.
 *
 * `groups.owner_id` pointe vers cette table : sans fiche, la création d'une
 * caisse échouerait sur une violation de clé étrangère, avec un message que
 * personne ne saurait interpréter à l'écran.
 *
 * L'opération est idempotente et se répète à chaque synchronisation, ce qui
 * couvre aussi les comptes créés avant l'arrivée de cette route.
 */
export async function ensureProfile(
  supabase: SupabaseClient,
  userId: string,
  phone: string,
  fullName: string,
): Promise<void> {
  await supabase.from('users').upsert(
    {
      id: userId,
      phone,
      full_name: fullName,
      // La colonne est héritée du schéma initial et déclarée non nulle. Le
      // secret réel est tenu par Supabase Auth ; on n'en garde donc aucune
      // copie ici, seulement la mention de qui en a la charge.
      pin_hash: 'supabase-auth',
    },
    { onConflict: 'id', ignoreDuplicates: true },
  );
}
