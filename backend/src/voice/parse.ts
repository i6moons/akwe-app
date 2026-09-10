import type { TransactionType, VoiceParseRequest, VoiceParseResponse } from '../../contracts/api';
import { extractAmount, normalize } from './french-numbers';
import { hasLlm, parseVoiceWithLlm } from './llm';

/** Au-dessus, la lecture locale se suffit à elle-même. */
const CONFIDENCE_FLOOR = 0.7;

const TYPE_KEYWORDS: readonly (readonly [TransactionType, readonly string[]])[] = [
  ['repayment', ['rembourse', 'remboursé', 'rembourser', 'remboursement', 'a rendu']],
  ['loan', ['pret', 'prêt', 'prete', 'emprunt', 'emprunte', 'avance']],
  ['payout', ['tour', 'retrait', 'paiement', 'a recu', 'a reçu', 'reçoit', 'son tour']],
  ['fee', ['frais', 'amende', 'penalite', 'pénalité', 'depense']],
  [
    'contribution',
    [
      'cotise',
      'cotisé',
      'cotiser',
      'cotisation',
      'verse',
      'versé',
      'verser',
      'paye',
      'payé',
      'paie',
      'donne',
      'donné',
      'donner',
      'apport',
    ],
  ],
];

/**
 * Le mot dicté peut porter une terminaison que la liste n'a pas (« cotisaient »).
 * On accepte donc le préfixe, mais seulement à partir de quatre lettres : plus
 * court, « pre » attraperait « prendre » et classerait une cotisation en prêt.
 */
function tokenStartsWith(haystack: string, needle: string): boolean {
  if (needle.length < 4) return false;
  return haystack.split(' ').some((token) => token.startsWith(needle));
}

function detectType(text: string): TransactionType | 'unknown' {
  const folded = normalize(text);
  for (const [type, words] of TYPE_KEYWORDS) {
    const found = words.some((word) => {
      const needle = normalize(word);
      return folded.includes(needle) || tokenStartsWith(folded, needle);
    });
    if (found) return type;
  }
  return 'unknown';
}

function editDistance(a: string, b: string): number {
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
 * Mots de la phrase, plus les paires recollées : la reconnaissance vocale
 * découpe souvent un prénom en deux (« Ad joa »).
 */
function heardTokens(text: string): string[] {
  const tokens = normalize(text).split(' ').filter(Boolean);
  const glued: string[] = [];
  for (let index = 0; index < tokens.length - 1; index += 1) {
    const left = tokens[index]!;
    const right = tokens[index + 1]!;
    if (left.length <= 4 && right.length <= 6) glued.push(left + right);
  }
  return [...tokens, ...glued].filter((word) => word.length >= 3);
}

/** Rapproche un prénom entendu d'un membre de la caisse. `null` si deux membres se disputent la phrase. */
function matchMember(text: string, names: readonly string[]): string | null {
  const words = heardTokens(text);
  let best: { name: string; distance: number } | null = null;
  let tied = false;

  for (const name of names) {
    for (const part of normalize(name).split(' ')) {
      if (part.length < 3) continue;
      const tolerance = part.length <= 5 ? 1 : 2;
      for (const word of words) {
        const distance = editDistance(part, word);
        if (distance > tolerance) continue;
        if (best === null || distance < best.distance) {
          best = { name, distance };
          tied = false;
        } else if (distance === best.distance && name !== best.name) {
          tied = true;
        }
      }
    }
  }

  return tied ? null : (best?.name ?? null);
}

/**
 * « hier », « avant-hier », sinon la date du jour côté client.
 *
 * Midi UTC : le Bénin est à UTC+1, et une opération datée à minuit basculait
 * la veille dès qu'elle était relue en heure locale.
 */
function detectDate(text: string, today: string): string | null {
  const folded = normalize(text);
  const base = new Date(`${today}T12:00:00.000Z`);
  if (Number.isNaN(base.getTime())) return null;

  // `normalize` a déjà remplacé le trait d'union par une espace.
  if (folded.includes('avant hier')) base.setUTCDate(base.getUTCDate() - 2);
  else if (folded.includes('hier')) base.setUTCDate(base.getUTCDate() - 1);

  return base.toISOString();
}

/** Un nom proposé par le modèle n'existe que s'il désigne un membre de la caisse. */
function reconcileMember(candidate: string | null, names: readonly string[]): string | null {
  if (candidate === null) return null;
  const folded = normalize(candidate);
  if (!folded) return null;
  const exact = names.find((name) => normalize(name) === folded);
  return exact ?? matchMember(candidate, names);
}

/**
 * Structure une phrase dictée. Repli local fiable sans LLM — puis option LLM.
 * Ne jamais inventer un montant : `null` si doute.
 */
export async function parseVoice(request: VoiceParseRequest): Promise<VoiceParseResponse> {
  const local = parseVoiceLocal(request);
  if (local.confidence >= CONFIDENCE_FLOOR || !hasLlm()) return local;

  try {
    const llm = await parseVoiceWithLlm(request);
    // Le modèle invente parfois un prénom absent de la caisse : on ne garde
    // que ceux qui désignent un membre réel.
    const candidate: VoiceParseResponse = {
      ...llm,
      member_name: reconcileMember(llm.member_name, request.member_names),
    };
    return candidate.confidence >= local.confidence ? candidate : local;
  } catch {
    // Le modèle est un bonus : son indisponibilité ne doit jamais empêcher
    // d'enregistrer une cotisation.
    return local;
  }
}

export function parseVoiceLocal(request: VoiceParseRequest): VoiceParseResponse {
  const transcript = request.transcript.trim();
  if (!transcript) {
    return {
      member_name: null,
      amount: null,
      type: 'unknown',
      occurred_at: null,
      confidence: 0,
      clarification: 'Je n’ai rien entendu. Pouvez-vous répéter ?',
    };
  }

  const amount = extractAmount(transcript);
  const member_name = matchMember(transcript, request.member_names);
  const type = detectType(transcript);
  const occurred_at = detectDate(transcript, request.today);

  let confidence = 0.35;
  if (amount !== null) confidence += 0.35;
  if (member_name) confidence += 0.25;
  if (type !== 'unknown') confidence += 0.05;

  let clarification: string | null = null;
  if (amount === null) clarification = 'Quel montant, en francs CFA ?';
  else if (!member_name) clarification = 'De quel membre s’agit-il ?';

  return {
    member_name,
    amount,
    type,
    occurred_at,
    confidence: Math.min(1, confidence),
    clarification,
  };
}
