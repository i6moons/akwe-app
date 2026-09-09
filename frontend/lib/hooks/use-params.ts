'use client';

import { useSearchParams } from 'next/navigation';
import { PARAM_CAISSE, PARAM_MEMBRE } from '@/lib/routes';

/**
 * Identifiants lus dans l'adresse.
 *
 * Ces écrans sont pré-rendus au build sans connaître la caisse : le paramètre
 * n'existe que côté navigateur. Les composants qui appellent ces hooks doivent
 * donc être placés sous une frontière `<Suspense>`.
 */

/** Identifiant de la caisse ouverte, `null` si l'adresse est incomplète. */
export function useCaisseId(): string | null {
  return useSearchParams().get(PARAM_CAISSE);
}

/** Identifiant du membre ouvert, `null` si l'adresse est incomplète. */
export function useMembreId(): string | null {
  return useSearchParams().get(PARAM_MEMBRE);
}
