import { NextResponse } from 'next/server';
import { ensureProfile, isDemoMode, serviceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/** Un numéro béninois compte 10 chiffres, le code en compte 6. */
const LONGUEUR_NUMERO = 10;
const LONGUEUR_CODE = 6;
const MIN_NOM = 2;
const MAX_NOM = 60;

/**
 * Crée le compte d'une trésorière : nom, numéro, et code à six chiffres.
 *
 * Le code n'est pas envoyé par SMS, il est choisi. Un fournisseur de SMS se
 * facture au message, ce qu'une tontine qui démarre ne peut pas porter ; le
 * code tient donc lieu de mot de passe, et l'écran le dit franchement.
 *
 * La création passe obligatoirement par la clé de service : elle seule peut
 * marquer l'adresse comme vérifiée. Sans cela Supabase attendrait la
 * confirmation d'un courriel qui n'arrivera jamais, notre adresse étant
 * technique, et le compte resterait inutilisable sans explication.
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
  const nom = typeof fullName === 'string' ? fullName.trim().replace(/\s+/g, ' ') : '';

  if (nom.length < MIN_NOM || nom.length > MAX_NOM) {
    return NextResponse.json({ error: 'Entrez votre nom et prénom.' }, { status: 400 });
  }
  if (numero.length !== LONGUEUR_NUMERO) {
    return NextResponse.json({ error: 'Numéro invalide.' }, { status: 400 });
  }
  if (secret.length !== LONGUEUR_CODE) {
    return NextResponse.json({ error: 'Le code doit contenir 6 chiffres.' }, { status: 400 });
  }

  const supabase = serviceClient();
  // Sans projet configuré, ou en démonstration, le compte reste local :
  // l'application doit rester présentable même sans base.
  if (!supabase || isDemoMode()) {
    return NextResponse.json({ horsLigne: true });
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email: `${numero}@akwe.invalid`,
    password: secret,
    email_confirm: true,
    user_metadata: { phone: numero, full_name: nom },
  });

  if (error) {
    // Le numéro sert d'identifiant : deux comptes ne peuvent pas le partager.
    if (/already|registered|exists/i.test(error.message)) {
      return NextResponse.json({ error: 'deja-inscrit' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Création du compte impossible.' }, { status: 502 });
  }

  if (data.user) await ensureProfile(supabase, data.user.id, numero, nom);
  return NextResponse.json({ horsLigne: false });
}
