'use client';

/**
 * Session locale de la trésorière.
 *
 * On ne garde ici que de quoi ouvrir l'application hors ligne : le numéro, le
 * nom affiché, et le jeton signé par Supabase. Le code fixe n'est jamais
 * conservé — un téléphone se prête, et il ne doit rien laisser lire.
 */

const STORAGE_KEY = 'akwe.session';

/**
 * Ce que l'on affiche tant que la trésorière ne s'est pas nommée.
 *
 * Une fonction, pas un prénom inventé : accueillir tout le monde par « Adjovi »
 * donnait à chaque compte la même identité, et sonnait faux dès la deuxième
 * personne qui ouvrait l'application.
 */
const NOM_PAR_DEFAUT = 'Trésorière';

export interface Session {
  phone: string;
  displayName: string;
  since: string;
  /**
   * Jeton signé à présenter à l'API. Absent tant que l'authentification réelle
   * n'est pas branchée : `lib/auth/token.ts` retombe alors sur celui de
   * démonstration.
   */
  accessToken?: string;
}

export function getSession(): Session | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<Session>;
    if (typeof parsed.phone !== 'string') return null;
    return {
      phone: parsed.phone,
      displayName: typeof parsed.displayName === 'string' ? parsed.displayName : NOM_PAR_DEFAUT,
      since: typeof parsed.since === 'string' ? parsed.since : new Date().toISOString(),
      accessToken: typeof parsed.accessToken === 'string' ? parsed.accessToken : undefined,
    };
  } catch {
    return null;
  }
}

export function openSession(
  phone: string,
  displayName = NOM_PAR_DEFAUT,
  accessToken?: string,
): Session {
  const session: Session = {
    phone,
    displayName,
    since: new Date().toISOString(),
    accessToken,
  };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  return session;
}

/**
 * Remplace le seul jeton, en laissant le reste de la session intacte.
 *
 * Le jeton signé par Supabase expire au bout d'une heure. Celui capturé à la
 * connexion était conservé tel quel : passé ce délai, chaque envoi repartait
 * avec un jeton mort, se faisait refuser en 401 et consommait une tentative.
 * Cinq saisies plus tard, l'opération était abandonnée sans un mot.
 */
export function rafraichirJeton(accessToken: string): void {
  const session = getSession();
  if (!session || session.accessToken === accessToken) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...session, accessToken }));
}

export function closeSession(): void {
  window.localStorage.removeItem(STORAGE_KEY);
}

/**
 * Inscription en cours, le temps de passer du formulaire au choix du code.
 *
 * En `sessionStorage` et non en `localStorage` : une inscription abandonnée ne
 * doit pas ressurgir des semaines plus tard sur l'écran du code.
 */
const INSCRIPTION_KEY = 'akwe.inscription';

export interface Inscription {
  phone: string;
  fullName: string;
}

export function setInscription(inscription: Inscription): void {
  window.sessionStorage.setItem(INSCRIPTION_KEY, JSON.stringify(inscription));
}

export function getInscription(): Inscription | null {
  if (typeof window === 'undefined') return null;
  const raw = window.sessionStorage.getItem(INSCRIPTION_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<Inscription>;
    if (typeof parsed.phone !== 'string' || typeof parsed.fullName !== 'string') return null;
    return { phone: parsed.phone, fullName: parsed.fullName };
  } catch {
    return null;
  }
}

export function clearInscription(): void {
  window.sessionStorage.removeItem(INSCRIPTION_KEY);
}
