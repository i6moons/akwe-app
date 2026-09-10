'use client';

/**
 * Session locale de la trésorière.
 *
 * L'authentification réelle (téléphone + PIN, Supabase) est du ressort du lead
 * technique. Le front conserve ici uniquement de quoi ouvrir l'application hors
 * ligne : le numéro et le prénom affiché. Aucun secret n'est stocké.
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

/** Met à jour le nom affiché sans toucher au jeton ni rouvrir la session. */
export function renommerSession(displayName: string): void {
  const session = getSession();
  if (!session) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...session, displayName }));
}

export function closeSession(): void {
  window.localStorage.removeItem(STORAGE_KEY);
}

/** Numéro en attente de vérification, transmis entre l'écran de connexion et l'OTP. */
const PENDING_KEY = 'akwe.pending-phone';

export function setPendingPhone(phone: string): void {
  window.sessionStorage.setItem(PENDING_KEY, phone);
}

export function getPendingPhone(): string | null {
  if (typeof window === 'undefined') return null;
  return window.sessionStorage.getItem(PENDING_KEY);
}
