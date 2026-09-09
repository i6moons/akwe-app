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

/**
 * Extrait le premier montant entier trouvé dans une phrase.
 * Retourne `null` plutôt que de deviner : un montant inventé est pire que pas de
 * montant du tout.
 */
export function parseFrenchAmount(sentence: string): number | null {
  const text = normalize(sentence);

  // Écriture chiffrée : « 2000 », « 2 000 f », « 10.000 », « 2k ».
  const digitMatch = text.match(/(\d[\d\s.]*)\s*(k|mille|millions?)?/);
  if (digitMatch?.[1] && /\d/.test(digitMatch[1])) {
    const base = Number.parseInt(digitMatch[1].replace(/[\s.]/g, ''), 10);
    if (Number.isSafeInteger(base) && base > 0) {
      const suffix = digitMatch[2];
      if (suffix === 'k' || suffix === 'mille') return base * 1000;
      if (suffix?.startsWith('million')) return base * 1_000_000;
      return base;
    }
  }

  const words = text
    .split(' ')
    .filter((word) => word in UNITS || word in MULTIPLIERS || word === 'et');
  if (words.length === 0) return null;

  let total = 0;
  let current = 0;
  let seen = false;

  for (const word of words) {
    if (word === 'et') continue;

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
    current = unit === 100 && current > 0 ? current * 100 : current + unit;
  }

  const value = total + current;
  return seen && value > 0 ? value : null;
}
