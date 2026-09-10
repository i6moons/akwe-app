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

const UNITS: Readonly<Record<string, number>> = {
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
  vingts: 20,
  trente: 30,
  quarante: 40,
  cinquante: 50,
  soixante: 60,
  cent: 100,
  cents: 100,
};

const MULTIPLIERS: Readonly<Record<string, number>> = {
  mille: 1000,
  milles: 1000,
  million: 1_000_000,
  millions: 1_000_000,
};

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/['’]/g, ' ')
    .replace(/-/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function fromDigits(raw: string, suffix?: string): number | null {
  const base = Number.parseInt(raw.replace(/[\s.]/g, ''), 10);
  if (!Number.isSafeInteger(base) || base <= 0) return null;
  if (suffix === 'k' || suffix === 'mille') return base * 1000;
  if (suffix?.startsWith('million')) return base * 1_000_000;
  return base;
}

function parseSpoken(tokens: readonly string[]): number | null {
  let total = 0;
  let current = 0;
  let seen = false;

  for (let index = 0; index < tokens.length; index += 1) {
    const word = tokens[index]!;
    if (word === 'et') continue;

    const next = tokens[index + 1];
    if (word === 'quatre' && (next === 'vingt' || next === 'vingts')) {
      current += 80;
      seen = true;
      index += 1;
      continue;
    }

    const multiplier = MULTIPLIERS[word];
    if (multiplier !== undefined) {
      total += (current === 0 ? 1 : current) * multiplier;
      current = 0;
      seen = true;
      continue;
    }

    const unit = UNITS[word];
    if (unit === undefined) continue;
    seen = true;
    current = unit === 100 ? (current === 0 ? 1 : current) * 100 : current + unit;
  }

  const value = total + current;
  return seen && value > 0 ? value : null;
}

function extractAmount(text: string): number | null {
  const folded = normalize(text);

  const withUnit = [
    ...folded.matchAll(/(\d[\d\s.]*)\s*(k|mille|millions?|f(?:cfa)?|francs?)\b/g),
  ];
  if (withUnit.length > 0) {
    const last = withUnit[withUnit.length - 1]!;
    const amount = fromDigits(last[1] ?? '', last[2]);
    if (amount !== null) return amount;
  }

  const numberWords = new Set([...Object.keys(UNITS), ...Object.keys(MULTIPLIERS), 'et']);
  const words = folded.split(' ').filter((word) => numberWords.has(word));
  const spoken = parseSpoken(words);
  if (spoken !== null) {
    const hasCurrency = /\b(f|fcfa|francs?|cfa)\b/.test(folded);
    const hasScale = words.some(
      (word) => word in MULTIPLIERS || word === 'cent' || word === 'cents',
    );
    if (spoken >= 100 || hasCurrency || hasScale) return spoken;
  }

  const digits = [...folded.matchAll(/(\d[\d\s.]*)/g)]
    .map((match) => fromDigits(match[1] ?? ''))
    .filter((value): value is number => value !== null && value >= 100);
  return digits.at(-1) ?? null;
}

function detectType(text: string): TransactionType | 'unknown' {
  const n = normalize(text);
  for (const [type, words] of TYPE_KEYWORDS) {
    if (words.some((w) => n.includes(normalize(w)))) return type;
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

function matchMember(text: string, names: string[]): string | null {
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
