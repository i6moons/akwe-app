import { detectType } from '@/lib/voice/keywords';
import { normalize, parseFrenchAmount } from '@/lib/voice/french-numbers';
import type { Member, OperationDraft } from '@/lib/types';

export { detectType };

/**
 * Extraction locale d'une transaction à partir d'une phrase dictée.
 *
 * Sert de repli quand l'API LLM est injoignable ou saturée — ce qui, en 3G
 * béninoise un jour de démo, n'est pas une hypothèse théorique.
 */

/**
 * Mots que Chrome pose souvent dans une dictée, et qui ne sont jamais un prénom.
 * Sans ça, « mille » ou « pour » peuvent coller à un nom court par hasard.
 */
const STOPWORDS = new Set([
  'les',
  'des',
  'une',
  'pour',
  'dans',
  'avec',
  'francs',
  'franc',
  'fcfa',
  'cfa',
  'cotisation',
  'cotise',
  'verse',
  'donne',
  'paye',
  'aujourdhui',
  'aujourd',
  'hui',
  'hier',
  'avant',
  'mille',
  'milles',
  'cents',
  'cent',
  'deux',
  'trois',
  'quatre',
  'cinq',
  'six',
  'sept',
  'huit',
  'neuf',
  'dix',
  'onze',
  'vingt',
  'vingts',
  'trente',
  'membre',
  'tontine',
  'caisse',
  'pret',
  'emprunt',
  'recu',
  'retrait',
  'tour',
  'frais',
  'amende',
  'part',
  'son',
  'ses',
  'elle',
  'aussi',
  'ainsi',
  'merci',
]);

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

function nameTokens(transcript: string): string[] {
  const tokens = normalize(transcript).replace(/-/g, ' ').split(' ').filter(Boolean);

  const glued: string[] = [];
  for (let index = 0; index < tokens.length - 1; index += 1) {
    const left = tokens[index]!;
    const right = tokens[index + 1]!;
    // Chrome coupe souvent « Adjovi » en « à jovi ». On recolle les syllabes courtes.
    if (left.length <= 4 && right.length <= 6) glued.push(left + right);
  }

  return [...tokens, ...glued].filter((word) => word.length >= 3 && !STOPWORDS.has(word));
}

function toleranceFor(part: string): number {
  // « aussi » est à 2 de « Kossi » : trop large pour un prénom de 5 lettres.
  return part.length <= 5 ? 1 : 2;
}

/**
 * Rapproche un nom entendu du membre le plus proche de la caisse.
 * Les noms béninois s'écrivent de plusieurs façons : on compare prénom par
 * prénom et on tolère deux caractères d'écart.
 */
export function matchMember(transcript: string, members: readonly Member[]): Member | null {
  const words = nameTokens(transcript);
  let best: { member: Member; distance: number } | null = null;
  let tied = false;

  for (const member of members) {
    for (const part of normalize(member.fullName).split(' ')) {
      if (part.length < 3) continue;
      for (const word of words) {
        const distance = editDistance(part, word);
        if (distance > toleranceFor(part)) continue;

        if (best === null || distance < best.distance) {
          best = { member, distance };
          tied = false;
        } else if (distance === best.distance && member.id !== best.member.id) {
          tied = true;
        }
      }
    }
  }

  if (tied) return null;
  return best?.member ?? null;
}

/**
 * Chrome propose plusieurs lectures d'une même phrase. On garde celle qui
 * contient un prénom de la caisse — « Kossi » plutôt que « aussi ».
 */
export function pickBestTranscript(
  alternatives: readonly string[],
  names: readonly string[],
): string {
  const nonempty = alternatives.map((item) => item.trim()).filter(Boolean);
  if (nonempty.length === 0) return '';

  const members: Member[] = names.map((fullName, index) => ({
    id: `alt-${index}`,
    groupId: '',
    fullName,
    phone: null,
    joinedAt: '',
    isActive: true,
  }));

  let winner = nonempty[0]!;
  let winnerScore = Number.NEGATIVE_INFINITY;

  for (const alternative of nonempty) {
    const member = matchMember(alternative, members);
    const amount = parseFrenchAmount(alternative);
    const type = detectType(alternative);
    let score = 0;
    if (member) score += 3;
    if (amount !== null) score += 2;
    if (type) score += 2;
    if (score > winnerScore) {
      winner = alternative;
      winnerScore = score;
    }
  }

  return winner;
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
