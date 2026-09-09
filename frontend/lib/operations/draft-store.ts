'use client';

import type { OperationDraft } from '@/lib/types';

/**
 * Brouillon de l'opération en cours de saisie.
 *
 * Stocké dans `sessionStorage` : il survit à un rafraîchissement accidentel ou à
 * un téléphone qui s'éteint entre la dictée et la validation, sans jamais partir
 * sur le réseau.
 */

const KEY = 'akwe.draft';

export function saveDraft(draft: OperationDraft): void {
  window.sessionStorage.setItem(KEY, JSON.stringify(draft));
}

export function readDraft(): OperationDraft | null {
  if (typeof window === 'undefined') return null;
  const raw = window.sessionStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as OperationDraft;
  } catch {
    return null;
  }
}

export function clearDraft(): void {
  window.sessionStorage.removeItem(KEY);
}
