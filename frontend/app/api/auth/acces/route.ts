import { NextResponse } from 'next/server';
import { ensureProfile, isDemoMode, serviceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/** Un numéro béninois compte 10 chiffres, le code en compte 6. */
const LONGUEUR_NUMERO = 10;
const LONGUEUR_CODE = 6;

/**
 * Ouvre l'accès d'une trésorière avant sa connexion.
 *
 * La création d'un compte passe obligatoirement par la clé de service : elle
 * seule peut marquer l'adresse comme vérifiée. Sans cela Supabase attendrait la
 * confirmation d'un courriel qui n'arrivera jamais, notre adresse étant
 * technique, et la connexion resterait bloquée sans explication.
 *
 * La route ne connecte personne : c'est le navigateur qui présente ensuite le
 * code à Supabase. Un code erroné y est refusé, donc le compte d'une autre
 * trésorière reste inaccessible même en connaissant son numéro.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Requête illisible.' }, { status: 400 });
  }

  const { phone, code, fullName } = (body ?? {}) as Record<string, unknown>;
  const numero = typeof phone === 'string' ? phone.replace(/\D/g, '') : '';
  const secret = typeof code === 'string' ? code.replace(/\D/g, '') : '';

  if (numero.length !== LONGUEUR_NUMERO) {
    return NextResponse.json({ error: 'Numéro invalide.' }, { status: 400 });
  }
  if (secret.length !== LONGUEUR_CODE) {
    return NextResponse.json({ error: 'Le code doit contenir 6 chiffres.' }, { status: 400 });
  }

  const supabase = serviceClient();
  // Sans projet configuré, ou en démonstration, la connexion locale suffit :
  // l'application doit rester présentable même sans base.
  if (!supabase || isDemoMode()) {
    return NextResponse.json({ nouveau: false, horsLigne: true });
  }

  const email = `${numero}@akwe.invalid`;
  const nom = typeof fullName === 'string' && fullName.trim() ? fullName.trim() : 'Trésorière';

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: secret,
    email_confirm: true,
    user_metadata: { phone: numero, full_name: nom },
  });

  if (error) {
    // Adresse déjà prise : c'est le cas normal d'une trésorière qui revient.
    // Son code sera vérifié par Supabase à l'étape suivante.
    if (/already|registered|exists/i.test(error.message)) {
      return NextResponse.json({ nouveau: false });
    }
    return NextResponse.json({ error: 'Création du compte impossible.' }, { status: 502 });
  }

  if (data.user) await ensureProfile(supabase, data.user.id, numero, nom);
  return NextResponse.json({ nouveau: true });
}
