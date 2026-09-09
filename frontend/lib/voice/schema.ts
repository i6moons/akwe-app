import { parseAmount } from '@/lib/format';

/** Types d'opération autorisés (SPEC). Tout autre libellé devient `unknown`. */
export const ALLOWED_TYPES = ['contribution', 'payout', 'loan'] as const;
export type AllowedType = (typeof ALLOWED_TYPES)[number];
export type VoiceType = AllowedType | 'unknown';

export const DEMO_TRANSCRIPT = "Kossi a versé deux mille francs aujourd'hui";
export const DEMO_KOSSI_ID = 'grp-ayaba-m5';
export const DEMO_KOSSI_NAME = 'Kossi Agbodjan';

export const MODEL_TIMEOUT_MS = 8_000;

/**
 * Prompt système — SPEC section 7.
 * Le modèle ne doit renvoyer QUE du JSON, aucune prose.
 */
export const SYSTEM_PROMPT = `Tu structures des opérations de tontine (AKWÈ, Bénin).
Réponds UNIQUEMENT par un objet JSON, aucune phrase autour, aucun markdown.
Champs exacts :
{
  "member_name": string | null,
  "amount": number | null,
  "type": "contribution" | "payout" | "loan" | "unknown",
  "occurred_at": string | null,
  "confidence": number,
  "clarification": string | null
}
Règles :
- amount : entier en FCFA. Si tu n'es pas sûr, null. N'arrondis JAMAIS. Pas de virgule.
- type : versé / cotisé / payé → contribution ; tour / reçu / retrait → payout ; prêt / avance → loan.
- occurred_at : ISO 8601. Interprète aujourd'hui, hier, avant-hier par rapport à la date fournie. Jamais une date future.
- member_name : copie exacte d'un nom de la liste, sinon null.
- Phrase floue : amount null et clarification courte en français simple.`;

export interface VoiceParseInput {
  transcript: string;
  groupId: string;
  today: string;
}

export interface CaisseMember {
  id: string;
  full_name: string;
}

export interface VoiceParseResult {
  member_id: string | null;
  member_name: string | null;
  amount: number | null;
  type: VoiceType;
  occurred_at: string | null;
  confidence: number;
  clarification: string | null;
}

export function isDemoMode(): boolean {
  return process.env.DEMO_MODE === 'true' || process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
}

function fold(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['’]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

export function isDemoTranscript(transcript: string): boolean {
  return fold(transcript) === fold(DEMO_TRANSCRIPT);
}

export function parseRequest(body: unknown): VoiceParseInput | null {
  if (body === null || typeof body !== 'object') return null;
  const record = body as Record<string, unknown>;
  const transcript = record.transcript;
  const groupId = record.groupId ?? record.group_id;
  const today = record.today;
  if (typeof transcript !== 'string' || typeof groupId !== 'string' || typeof today !== 'string') {
    return null;
  }
  return { transcript: transcript.trim(), groupId: groupId.trim(), today: today.trim() };
}

/** Entier FCFA via parseAmount. Jamais d'arrondi : un float est rejeté. */
export function validateAmount(raw: unknown): number | null {
  if (typeof raw === 'number') {
    if (!Number.isInteger(raw) || raw <= 0) return null;
    return parseAmount(String(raw));
  }
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (/[.,]\d{1,2}$/.test(trimmed)) return null;
  return parseAmount(trimmed);
}

export function validateType(raw: unknown): VoiceType {
  if (typeof raw !== 'string') return 'unknown';
  return (ALLOWED_TYPES as readonly string[]).includes(raw) ? (raw as AllowedType) : 'unknown';
}

export function validateOccurredAt(raw: unknown, today: string): string | null {
  if (typeof raw !== 'string' || raw.trim() === '') return null;
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(raw.trim()) ? `${raw.trim()}T12:00:00.000Z` : raw.trim();
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const todayEnd = new Date(`${today}T23:59:59.999Z`);
  if (Number.isNaN(todayEnd.getTime()) || date.getTime() > todayEnd.getTime()) return null;
  return date.toISOString();
}

export function matchExistingMember(
  name: unknown,
  members: readonly CaisseMember[],
): CaisseMember | null {
  if (typeof name !== 'string' || name.trim() === '') return null;
  const needle = fold(name);
  const exact = members.find((member) => fold(member.full_name) === needle);
  if (exact) return exact;
  return (
    members.find((member) =>
      fold(member.full_name)
        .split(' ')
        .some((part) => part.length >= 3 && part === needle),
    ) ?? null
  );
}

export function clampConfidence(raw: unknown): number {
  const value = typeof raw === 'number' ? raw : Number.parseFloat(String(raw ?? ''));
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

export function emptyParse(clarification: string): VoiceParseResult {
  return {
    member_id: null,
    member_name: null,
    amount: null,
    type: 'unknown',
    occurred_at: null,
    confidence: 0,
    clarification,
  };
}

export function demoResponse(today: string, members: readonly CaisseMember[]): VoiceParseResult {
  const kossi =
    matchExistingMember('Kossi', members) ??
    members.find((member) => fold(member.full_name).includes('kossi')) ?? {
      id: DEMO_KOSSI_ID,
      full_name: DEMO_KOSSI_NAME,
    };

  const occurred = validateOccurredAt(`${today}T12:00:00.000Z`, today);

  return {
    member_id: kossi.id,
    member_name: kossi.full_name,
    amount: parseAmount('2000'),
    type: 'contribution',
    occurred_at: occurred,
    confidence: 1,
    clarification: null,
  };
}

/** Ne jamais renvoyer la sortie brute du modèle : tout passe par ici. */
export function validateModelPayload(
  raw: unknown,
  members: readonly CaisseMember[],
  today: string,
): VoiceParseResult {
  const record =
    raw !== null && typeof raw === 'object' ? (raw as Record<string, unknown>) : null;
  if (!record) {
    return emptyParse("Je n'ai pas compris. Pouvez-vous répéter, plus simplement ?");
  }

  const amount = validateAmount(record.amount);
  const type = validateType(record.type);
  const occurred_at = validateOccurredAt(record.occurred_at, today);
  const member = matchExistingMember(record.member_name, members);
  const confidence = clampConfidence(record.confidence);

  let clarification: string | null =
    typeof record.clarification === 'string' && record.clarification.trim()
      ? record.clarification.trim()
      : null;

  if (amount === null) {
    clarification = clarification ?? 'Quel montant, en francs CFA ?';
  } else if (!member) {
    clarification = clarification ?? 'De quelle membre s’agit-il ?';
  }

  return {
    member_id: member?.id ?? null,
    member_name: member?.full_name ?? null,
    amount,
    type,
    occurred_at,
    confidence,
    clarification,
  };
}
