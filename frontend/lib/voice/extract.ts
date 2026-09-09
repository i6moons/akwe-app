import { normalize, parseFrenchAmount } from '@/lib/voice/french-numbers';
import type { Member, OperationDraft, TransactionType } from '@/lib/types';

/**
 * Extraction locale d'une transaction à partir d'une phrase dictée.
 *
 * Sert de repli quand l'API LLM est injoignable ou saturée — ce qui, en 3G
 * béninoise un jour de démo, n'est pas une hypothèse théorique.
 */

const TYPE_KEYWORDS: readonly (readonly [TransactionType, readonly string[]])[] = [
  ['repayment', ['rembourse', 'remboursement', 'a rendu', 'rendu largent']],
  ['loan', ['pret', 'prete', 'emprunt', 'a emprunte']],
  ['payout', ['versement', 'a recu', 'retrait', 'a retire', 'j ai donne a']],
  ['fee', ['frais', 'amende', 'penalite', 'depense']],
  ['contribution', ['verse', 'cotise', 'cotisation', 'a donne', 'a paye', 'apporte']],
];

/** Distance de Levenshtein bornée, pour rapprocher Adjoavi/Adjovi, Kossi/Kossy. */
export function editDistance(a: string, b: string): number {
  const rows = a.length + 1;
  const cols = b.length + 1;
  let previous = Array.from({ length: cols }, (_, index) => index);

  for (let i = 1; i < rows; i += 1) {
    const current = [i];
    for (let j = 1; j < cols; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(
        (current[j - 1] ?? 0) + 1,
        (previous[j] ?? 0) + 1,
        (previous[j - 1] ?? 0) + cost,
      );
    }
    previous = current;
  }
  return previous[cols - 1] ?? Math.max(a.length, b.length);
}

/**
 * Rapproche un nom entendu du membre le plus proche de la caisse.
 * Les noms béninois s'écrivent de plusieurs façons : on compare prénom par
 * prénom et on tolère deux caractères d'écart.
 */
export function matchMember(transcript: string, members: readonly Member[]): Member | null {
  const words = normalize(transcript)
    .split(' ')
    .filter((word) => word.length >= 3);
  let best: { member: Member; distance: number } | null = null;

  for (const member of members) {
    for (const part of normalize(member.fullName).split(' ')) {
      if (part.length < 3) continue;
      for (const word of words) {
        const distance = editDistance(part, word);
        const tolerance = part.length <= 4 ? 1 : 2;
        if (distance <= tolerance && (best === null || distance < best.distance)) {
          best = { member, distance };
        }
      }
    }
  }

  return best?.member ?? null;
}

export function detectType(transcript: string): TransactionType | null {
  const text = normalize(transcript);
  for (const [type, keywords] of TYPE_KEYWORDS) {
    if (keywords.some((keyword) => text.includes(keyword))) return type;
  }
  return null;
}

/** « aujourd'hui », « hier », « avant-hier ». Sinon, la date du jour. */
export function detectDate(transcript: string, now: Date = new Date()): Date {
  const text = normalize(transcript);
  const date = new Date(now);
  if (text.includes('avant-hier') || text.includes('avant hier')) date.setDate(date.getDate() - 2);
  else if (text.includes('hier')) date.setDate(date.getDate() - 1);
  return date;
}

export function extractDraft(
  transcript: string,
  groupId: string,
  members: readonly Member[],
  now: Date = new Date(),
): OperationDraft {
  const amount = parseFrenchAmount(transcript);
  const member = matchMember(transcript, members);
  const type = detectType(transcript);

  // La confiance chute dès qu'une information manque : l'écran de confirmation
  // surligne alors le champ douteux au lieu de laisser passer une erreur.
  let confidence = 1;
  if (amount === null) confidence -= 0.45;
  if (member === null) confidence -= 0.35;
  if (type === null) confidence -= 0.15;

  return {
    groupId,
    memberId: member?.id ?? null,
    memberName: member?.fullName ?? null,
    amount,
    type: type ?? 'contribution',
    occurredAt: detectDate(transcript, now).toISOString(),
    source: 'voice',
    rawTranscript: transcript.trim(),
    confidence: Math.max(0, Number(confidence.toFixed(2))),
  };
}
