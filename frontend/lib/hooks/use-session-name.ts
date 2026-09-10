'use client';

import { useEffect, useState } from 'react';
import { getSession } from '@/lib/auth/session';

/**
 * Prénom affiché dans l'en-tête d'accueil.
 * Lu après le montage : `localStorage` n'existe pas pendant le rendu serveur, et
 * lire pendant le rendu provoquerait une divergence d'hydratation.
 */
export function useSessionName(fallback = 'Trésorière'): string {
  const [name, setName] = useState(fallback);

  useEffect(() => {
    const session = getSession();
    if (session) setName(session.displayName);
  }, []);

  return name;
}
