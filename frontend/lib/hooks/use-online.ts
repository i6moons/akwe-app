'use client';

import { useEffect, useState } from 'react';

import { fetchAvecDelai } from '@/lib/api';

/** Intervalle de vérification active. `navigator.onLine` ment souvent en 3G béninoise. */
const PING_INTERVAL_MS = 30_000;

/**
 * Échéance de la sonde, volontairement courte.
 *
 * C'est le cœur même de ce que ce hook est censé détecter : sur une antenne
 * accrochée mais sans débit, un `fetch` sans délai ne répond ni ne rejette. La
 * sonde restait pendante, `setOnline(false)` n'était jamais appelé, et
 * l'application continuait d'annoncer « en ligne » — précisément dans le seul
 * cas où elle avait quelque chose à signaler. Une sonde de plus partait toutes
 * les trente secondes, sans qu'aucune ne conclue jamais.
 */
const PING_TIMEOUT_MS = 5_000;

/**
 * État de connexion réel.
 * On combine l'événement natif (instantané) et un ping léger périodique, car un
 * téléphone accroché à une antenne sans débit se déclare « en ligne ».
 */
export function useOnline(): boolean {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const update = (): void => setOnline(navigator.onLine);
    update();

    window.addEventListener('online', update);
    window.addEventListener('offline', update);

    const ping = async (): Promise<void> => {
      if (!navigator.onLine) {
        setOnline(false);
        return;
      }
      try {
        await fetchAvecDelai('/api/health', { method: 'HEAD', cache: 'no-store' }, PING_TIMEOUT_MS);
        setOnline(true);
      } catch {
        setOnline(false);
      }
    };

    const timer = window.setInterval(() => void ping(), PING_INTERVAL_MS);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
      window.clearInterval(timer);
    };
  }, []);

  return online;
}
