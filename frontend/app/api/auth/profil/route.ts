import { NextResponse } from 'next/server';
import { identifier } from '@/lib/auth/appelante';
import { isDemoMode, serviceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/** Assez court pour une initiale suivie d'un nom, assez long pour un nom composé. */
const MIN_NOM = 2;
const MAX_NOM = 60;

/**
 * Enregistre le nom que la trésorière se donne.
 *
 * Le nom est demandé à la première connexion et n'est jamais deviné : afficher
 * « Bienvenue, Adjovi » à quelqu'un qui ne s'appelle pas Adjovi est le genre de
 * détail qui décrédibilise tout le reste.
 *
 * Il est écrit à deux endroits, car ils servent deux usages : les métadonnées du
 * compte suivent la trésorière d'un appareil à l'autre, tandis que `public.users`
 * est ce que lisent les caisses et les reçus.
 */
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
    return NextResponse.json({ error: 'Requête illisible.' }, { status: 400 });
  }

  const brut = (body ?? {}) as Record<string, unknown>;
  const nom = typeof brut.fullName === 'string' ? brut.fullName.trim().replace(/\s+/g, ' ') : '';

  if (nom.length < MIN_NOM || nom.length > MAX_NOM) {
    return NextResponse.json({ error: 'Nom invalide.' }, { status: 400 });
  }

  // Sans base, le nom ne vit que dans la session du navigateur : la démo doit
  // rester présentable, mais elle n'a rien où l'écrire.
  if (!supabase || isDemoMode()) {
    return NextResponse.json({ fullName: nom });
  }

  const { error } = await supabase.auth.admin.updateUserById(appelante.id, {
    user_metadata: { phone: appelante.phone, full_name: nom },
  });
  if (error) {
    return NextResponse.json({ error: 'Enregistrement impossible.' }, { status: 502 });
  }

  await supabase.from('users').update({ full_name: nom }).eq('id', appelante.id);
  return NextResponse.json({ fullName: nom });
}
