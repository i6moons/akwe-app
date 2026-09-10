/**
 * Conversion des nombres dits en toutes lettres.
 * « deux mille » → 2000, « cinq mille cinq cents » → 5500, « 2k » → 2000.
 *
 * Ce module tourne dans le navigateur : il donne un résultat immédiat même sans
 * réseau, et sert de repli quand l'API d'extraction n'est pas joignable.
 */

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

const NUMBER_WORDS = new Set([...Object.keys(UNITS), ...Object.keys(MULTIPLIERS), 'et']);

/** Retire les accents et la ponctuation pour comparer des mots dictés. */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
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

/**
 * « quatre-vingt » = 80, « soixante-dix » = 70.
 * Les traits d'union de la dictée sont coupés avant de parcourir les mots.
 */
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

/**
 * Extrait le premier montant entier trouvé dans une phrase.
 * Retourne `null` plutôt que de deviner : un montant inventé est pire que pas de
 * montant du tout.
 */
export function parseFrenchAmount(sentence: string): number | null {
  const text = normalize(sentence).replace(/-/g, ' ');

  // Montant collé à une unité : « 10.000 F », « 2k », « 3 mille ».
  const withUnit = [...text.matchAll(/(\d[\d\s.]*)\s*(k|mille|millions?|f(?:cfa)?|francs?)\b/g)];
  if (withUnit.length > 0) {
    const last = withUnit[withUnit.length - 1]!;
    const amount = fromDigits(last[1] ?? '', last[2]);
    if (amount !== null) return amount;
  }

  const words = text.split(' ').filter((word) => NUMBER_WORDS.has(word));
  const spoken = parseSpoken(words);
  if (spoken !== null) {
    const hasCurrency = /\b(f|fcfa|francs?|cfa)\b/.test(text);
    const hasScale = words.some(
      (word) => word in MULTIPLIERS || word === 'cent' || word === 'cents',
    );
    if (spoken >= 100 || hasCurrency || hasScale) return spoken;
  }

  // Dernier nombre assez grand pour être un montant, pas un n° de membre.
  const digits = [...text.matchAll(/(\d[\d\s.]*)/g)]
    .map((match) => fromDigits(match[1] ?? ''))
    .filter((value): value is number => value !== null && value >= 100);
  return digits.at(-1) ?? null;
}
