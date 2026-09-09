'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { seedDemoData } from '@/lib/db/seed';
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

    void seedDemoData()
      .catch((error: unknown) => {
        console.error('AKWÈ : amorçage des données de démonstration impossible', error);
      })
      .finally(() => {
        if (!cancelled) setReady(true);
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
