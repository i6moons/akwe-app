'use client';

import { useCallback, useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { flushOutbox, pendingCount } from '@/lib/sync/outbox';
import { sendBatch } from '@/lib/sync/client';
import { useOnline } from '@/lib/hooks/use-online';

export interface SyncState {
  online: boolean;
  /** Nombre d'opérations enregistrées localement mais pas encore remontées. */
  pending: number;
  syncing: boolean;
  flush: () => Promise<void>;
}

/**
 * Pilote la remontée des écritures hors ligne.
 * La file est vidée au retour du réseau, sans action de la trésorière : c'est
 * exactement ce que montre la démo quand on rebranche la connexion.
 */
export function useSync(): SyncState {
  const online = useOnline();
  const [syncing, setSyncing] = useState(false);
  const pending = useLiveQuery(() => pendingCount(), [], 0) ?? 0;

  const flush = useCallback(async (): Promise<void> => {
    if (!navigator.onLine) return;
    setSyncing(true);
    try {
      await flushOutbox(sendBatch);
    } finally {
      setSyncing(false);
    }
  }, []);

  useEffect(() => {
    if (online && pending > 0) void flush();
  }, [online, pending, flush]);

  return { online, pending, syncing, flush };
}
