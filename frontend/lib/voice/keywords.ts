import { normalize } from '@/lib/voice/french-numbers';
import type { TransactionType } from '@/lib/types';

/**
 * Mots-clés d'une dictée. Chrome déforme souvent « versé » / « cotisé » :
 * on normalise (accents, traits d'union) et on accepte les variantes orales.
 */
export const TYPE_KEYWORDS: readonly (readonly [TransactionType, readonly string[]])[] = [
  [
    'repayment',
    ['rembourse', 'remboursé', 'rembourser', 'remboursement', 'a rendu', "rendu l'argent"],
  ],
  ['loan', ['prêt', 'prêté', 'prete', 'emprunt', 'emprunté', 'emprunte', 'avance']],
  [
    'payout',
    ['versement', 'a reçu', 'a recu', 'reçoit', 'retrait', 'a retiré', "j'ai donné à", 'son tour'],
  ],
  ['fee', ['frais', 'amende', 'pénalité', 'penalite', 'dépense', 'depense']],
  [
    'contribution',
    [
      'versé',
      'verser',
      'verse',
      'cotise',
      'cotisé',
      'cotiser',
      'cotisation',
      'a donné',
      'a donne',
      'donné',
      'donne',
      'donner',
      'a payé',
      'a paye',
      'payé',
      'paye',
      'paie',
      'apporte',
      'apport',
    ],
  ],
];

/** Lexique passé à Web Speech pour biaiser la reconnaissance vers ces mots. */
export function speechHints(memberNames: readonly string[] = []): string[] {
  const types = TYPE_KEYWORDS.flatMap(([, words]) => [...words]);
  const names = memberNames.flatMap((name) => name.split(' ').filter((part) => part.length >= 3));
  return [...types, ...names, 'francs', 'franc', 'mille', 'aujourd hui', 'hier'];
}

function folded(text: string): string {
  return normalize(text).replace(/-/g, ' ');
}

/** Le mot-clé est-il dans la phrase, malgré une conjugaison ou un accent manquant ? */
export function containsKeyword(transcript: string, keyword: string): boolean {
  const hay = folded(transcript);
  const needle = folded(keyword);
  if (!needle || !hay) return false;
  if (hay.includes(needle)) return true;

  if (!needle.includes(' ') && needle.length >= 4) {
    return hay.split(' ').some((token) => token === needle || token.startsWith(needle));
  }
  return false;
}

export function detectType(transcript: string): TransactionType | null {
  const text = folded(transcript);
  if (!text) return null;
  for (const [type, keywords] of TYPE_KEYWORDS) {
    if (keywords.some((keyword) => containsKeyword(text, keyword))) return type;
  }
  return null;
}
