/**
 * Lecture d'un montant dicté en français.
 *
 * Règle du domaine : ne jamais inventer un montant. En cas de doute, la
 * fonction renvoie `null` et l'appelant pose une question à la trésorière.
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

const NUMBER_WORDS: ReadonlySet<string> = new Set([
  ...Object.keys(UNITS),
  ...Object.keys(MULTIPLIERS),
  'et',
]);

export function normalize(text: string): string {
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

/**
 * Nombre à décimales : un ou deux chiffres après un point ou une virgule.
 *
 * « 3.000 » est un séparateur de milliers, mais « 2.5 » est une décimale — et
 * comme la normalisation remplace la ponctuation par une espace, le montant
 * devenait « 2 5 » puis 25 : dix fois la somme annoncée, enregistrée sans un
 * mot. Un franc CFA ne se divise pas ; ces nombres sont donc retirés de la
 * phrase avant lecture, quitte à poser la question.
 */
const DECIMAL_NUMBER = /\d+[.,]\d{1,2}(?!\d)/g;

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

/**
 * Découpe la phrase en suites de mots-nombres *contigus*.
 *
 * Rassembler tous les mots-nombres de la phrase mélangeait des nombres qui ne
 * se suivaient pas : « deux membres ont donné trois mille » additionnait
 * « deux » et « trois » et annonçait 5 000 F au lieu de 3 000 F.
 */
function spokenRuns(words: readonly string[]): string[][] {
  const runs: string[][] = [];
  let run: string[] = [];

  const flush = (): void => {
    if (run.some((word) => word !== 'et')) runs.push(run);
    run = [];
  };

  for (const word of words) {
    if (NUMBER_WORDS.has(word)) run.push(word);
    else flush();
  }
  flush();

  return runs;
}

/** Renvoie le montant dicté, ou `null` si la phrase n'en porte pas de sûr. */
export function extractAmount(text: string): number | null {
  const folded = normalize(text.replace(DECIMAL_NUMBER, ' '));

  // « 2 000 francs », « 5 k », « 3 millions » : le chiffre suivi de son unité
  // est la lecture la plus fiable, on la tente en premier.
  const withUnit = [...folded.matchAll(/(\d[\d\s.]*)\s*(k|mille|millions?|f(?:cfa)?|francs?)\b/g)];
  for (const match of withUnit.reverse()) {
    const amount = fromDigits(match[1] ?? '', match[2]);
    if (amount !== null) return amount;
  }

  const hasCurrency = /\b(f|fcfa|francs?|cfa)\b/.test(folded);
  const words = folded.split(' ');

  for (const run of spokenRuns(words).reverse()) {
    const spoken = parseSpoken(run);
    if (spoken === null) continue;
    // Sous cent, sans unité ni échelle, « cinq » est plus souvent un nombre de
    // parts ou de jours qu'un montant : on préfère poser la question.
    const hasScale = run.some((word) => word in MULTIPLIERS || word === 'cent' || word === 'cents');
    if (spoken >= 100 || hasCurrency || hasScale) return spoken;
  }

  const digits = [...folded.matchAll(/(\d[\d\s.]*)/g)]
    .map((match) => fromDigits(match[1] ?? ''))
    .filter((value): value is number => value !== null && value >= 100);
  return digits.at(-1) ?? null;
}
