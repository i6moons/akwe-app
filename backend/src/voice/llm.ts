/**
 * Appel du modèle distant pour structurer une phrase dictée.
 *
 * Le repli local reste la référence : ce module n'est sollicité que lorsque la
 * lecture locale doute, et sa réponse est revalidée de bout en bout. Un modèle
 * peut renvoyer n'importe quoi — un type d'opération inventé, une confiance de
 * 12, une date illisible — et ces valeurs partaient jusqu'en base où les
 * contraintes `check` les refusaient, faisant échouer tout un lot de
 * synchronisation pour une seule phrase mal comprise.
 */

import type { VoiceParseRequest, VoiceParseResponse } from '../../contracts/api';
import { TRANSACTION_TYPES } from '../sync/normalize';

const DEFAULT_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_MODEL = 'llama-3.1-8b-instant';

/**
 * 8 s. La trésorière attend devant son téléphone : au-delà, mieux vaut la
 * lecture locale que l'attente. Sans cette limite, une requête suspendue
 * gardait la connexion HTTP ouverte indéfiniment.
 */
const TIMEOUT_MS = 8_000;

const MAX_AMOUNT = 2_147_483_647;

const SYSTEM_PROMPT =
  'Tu structures des cotisations de tontine au Bénin. Réponds en JSON : ' +
  'member_name, amount (entier FCFA ou null), ' +
  'type (contribution|payout|loan|repayment|fee|unknown), ' +
  'occurred_at (ISO ou null), confidence (0-1), clarification (français ou null). ' +
  "N'invente jamais un montant : en cas de doute, amount vaut null.";

export function hasLlm(): boolean {
  return Boolean(process.env.LLM_API_KEY?.trim());
}

function readType(value: unknown): VoiceParseResponse['type'] {
  return typeof value === 'string' && (TRANSACTION_TYPES as readonly string[]).includes(value)
    ? (value as VoiceParseResponse['type'])
    : 'unknown';
}

function readAmount(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isInteger(value)) return null;
  return value > 0 && value <= MAX_AMOUNT ? value : null;
}

function readConfidence(value: unknown): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return 0.5;
  return Math.min(1, Math.max(0, value));
}

function readDate(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function readText(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

/** Relit la réponse du modèle sans jamais lui faire confiance. */
export function readLlmPayload(raw: unknown): VoiceParseResponse {
  const payload =
    raw !== null && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};

  return {
    member_name: readText(payload.member_name),
    amount: readAmount(payload.amount),
    type: readType(payload.type),
    occurred_at: readDate(payload.occurred_at),
    confidence: readConfidence(payload.confidence),
    clarification: readText(payload.clarification),
  };
}

export async function parseVoiceWithLlm(request: VoiceParseRequest): Promise<VoiceParseResponse> {
  const key = process.env.LLM_API_KEY?.trim();
  if (!key) throw new Error('LLM_API_KEY absente');

  const endpoint = process.env.LLM_API_URL?.trim() || DEFAULT_ENDPOINT;
  const model = process.env.LLM_MODEL?.trim() || DEFAULT_MODEL;

  const response = await fetch(endpoint, {
    method: 'POST',
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: JSON.stringify({
            transcript: request.transcript,
            member_names: request.member_names,
            today: request.today,
            group_id: request.group_id,
          }),
        },
      ],
    }),
  });

  if (!response.ok) throw new Error(`LLM ${response.status}`);

  const body = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const raw = body.choices?.[0]?.message?.content;
  if (!raw) throw new Error('Réponse LLM vide');

  return readLlmPayload(JSON.parse(raw) as unknown);
}
