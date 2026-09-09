'use client';

import { useEffect, useState } from 'react';

/** Intervalle de vérification active. `navigator.onLine` ment souvent en 3G béninoise. */
const PING_INTERVAL_MS = 30_000;

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
        await fetch('/api/health', { method: 'HEAD', cache: 'no-store' });
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
