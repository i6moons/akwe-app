import type {
  TransactionType,
  VoiceParseRequest,
  VoiceParseResponse,
} from '../../contracts/api';

const TYPE_KEYWORDS: readonly (readonly [TransactionType, readonly string[]])[] = [
  ['repayment', ['rembourse', 'remboursement', 'a rendu']],
  ['loan', ['pret', 'prêt', 'emprunte', 'emprunt']],
  ['payout', ['tour', 'retrait', 'paiement', 'a recu', 'a reçu', 'reçoit']],
  ['fee', ['frais', 'amende', 'penalite', 'pénalité']],
  ['contribution', ['cotise', 'cotisation', 'verse', 'paye', 'payé', 'donne', 'apport']],
];

const FRENCH_NUMBERS: Record<string, number> = {
  zero: 0,
  un: 1,
  une: 1,
  deux: 2,
  trois: 3,
  quatre: 4,
  cinq: 5,
  six: 6,
  sept: 7,
  huit: 8,
  neuf: 9,
  dix: 10,
  onze: 11,
  douze: 12,
  treize: 13,
  quatorze: 14,
  quinze: 15,
  seize: 16,
  vingt: 20,
  trente: 30,
  quarante: 40,
  cinquante: 50,
  soixante: 60,
  cent: 100,
  mille: 1000,
};

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/['’]/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractAmount(text: string): number | null {
  const digit = text.match(/(\d[\d\s.]{0,12})\s*(?:f(?:cfa)?|francs?)?/i);
  if (digit?.[1]) {
    const n = Number.parseInt(digit[1].replace(/[\s.]/g, ''), 10);
    if (!Number.isNaN(n) && n > 0) return n;
  }

  let total = 0;
  let current = 0;
  let found = false;
  for (const token of normalize(text).split(' ')) {
    const value = FRENCH_NUMBERS[token];
    if (value === undefined) continue;
    found = true;
    if (value === 1000) {
      current = (current || 1) * 1000;
      total += current;
      current = 0;
    } else if (value === 100) {
      current = (current || 1) * 100;
    } else {
      current += value;
    }
  }
  total += current;
  return found && total > 0 ? total : null;
}

function detectType(text: string): TransactionType | 'unknown' {
  const n = normalize(text);
  for (const [type, words] of TYPE_KEYWORDS) {
    if (words.some((w) => n.includes(normalize(w)))) return type;
  }
  return 'contribution';
}

function matchMember(text: string, names: string[]): string | null {
  const n = normalize(text);
  let best: string | null = null;
  let bestLen = 0;
  for (const name of names) {
    const full = normalize(name);
    if (n.includes(full) && full.length > bestLen) {
      best = name;
      bestLen = full.length;
    }
  }
  if (best) return best;

  for (const name of names) {
    for (const token of normalize(name).split(' ').filter((t) => t.length >= 3)) {
      if (new RegExp(`\\b${token}\\b`).test(n) && name.length > bestLen) {
        best = name;
        bestLen = name.length;
      }
    }
  }
  return best;
}

function detectDate(text: string, today: string): string | null {
  const n = normalize(text);
  const base = new Date(`${today}T12:00:00.000Z`);
  if (Number.isNaN(base.getTime())) return null;
  if (n.includes('avant hier') || n.includes('avant-hier')) base.setUTCDate(base.getUTCDate() - 2);
  else if (n.includes('hier')) base.setUTCDate(base.getUTCDate() - 1);
  else if (!n.includes('aujourdhui') && !n.includes('aujourd hui')) {
    /* keep today */
  }
  return base.toISOString();
}

/**
 * Structure une phrase dictée. Repli local fiable sans LLM — puis option LLM.
 * Ne jamais inventer un montant : `null` si doute.
 */
export async function parseVoice(request: VoiceParseRequest): Promise<VoiceParseResponse> {
  const local = parseVoiceLocal(request);
  if (local.confidence >= 0.7 || !process.env.LLM_API_KEY?.trim()) return local;

  try {
    const llm = await parseVoiceWithLlm(request);
    return llm.confidence >= local.confidence ? llm : local;
  } catch {
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
  else if (!member_name) clarification = 'De quelle membre s’agit-il ?';

  return {
    member_name,
    amount,
    type,
    occurred_at,
    confidence: Math.min(1, confidence),
    clarification,
  };
}

async function parseVoiceWithLlm(request: VoiceParseRequest): Promise<VoiceParseResponse> {
  const model = process.env.LLM_MODEL?.trim() || 'llama-3.1-8b-instant';
  const key = process.env.LLM_API_KEY!.trim();

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'Tu structures des cotisations de tontine au Bénin. Réponds en JSON : member_name, amount (entier FCFA ou null), type (contribution|payout|loan|repayment|fee|unknown), occurred_at (ISO ou null), confidence (0-1), clarification (français ou null). Ne invente jamais un montant.',
        },
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

  const parsed = JSON.parse(raw) as Partial<VoiceParseResponse>;
  const amount =
    typeof parsed.amount === 'number' && Number.isInteger(parsed.amount) && parsed.amount > 0
      ? parsed.amount
      : null;

  return {
    member_name: typeof parsed.member_name === 'string' ? parsed.member_name : null,
    amount,
    type: (parsed.type as VoiceParseResponse['type']) ?? 'unknown',
    occurred_at: typeof parsed.occurred_at === 'string' ? parsed.occurred_at : null,
    confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
    clarification: typeof parsed.clarification === 'string' ? parsed.clarification : null,
  };
}
