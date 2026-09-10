'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { preparerCarnet } from '@/lib/db/preparer';
import { MotionProvider } from '@/components/ui/motion';
import { ToastProvider } from '@/components/ui/toast';
import { AppShell } from '@/components/layout/app-shell';

/**
 * Amorce l'application côté navigateur.
 * Dexie et le service worker n'existent pas côté serveur : tout est fait ici,
 * après le premier rendu, pour ne jamais bloquer l'affichage.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    // Le carnet local s'affiche sans attendre le serveur. La relecture se fait
    // en arrière-plan et complète l'écran quand elle arrive : la faire attendre
    // laissait la trésorière devant des tirets pendant plusieurs secondes, pour
    // des données qu'elle avait déjà sur son téléphone.
    setReady(true);

    void preparerCarnet().catch((error: unknown) => {
      if (!cancelled) console.error('AKWÈ : préparation du carnet impossible', error);
    });

    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js').catch((error: unknown) => {
        console.warn('AKWÈ : service worker non enregistré', error);
      });
    }

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <MotionProvider>
      <ToastProvider>
        <div data-app-ready={ready} className="min-h-dvh">
          <AppShell>{children}</AppShell>
        </div>
      </ToastProvider>
    </MotionProvider>
  );
}
