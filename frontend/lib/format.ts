/**
 * Formatage monétaire et temporel.
 * Règle absolue du projet : un montant est TOUJOURS un entier de FCFA.
 * Aucun nombre à virgule ne doit circuler dans le code métier.
 */

const NUMBER_FR = new Intl.NumberFormat('fr-BJ');

/** 865000 → « 865 000 F ». */
export function formatMoney(amount: number): string {
  return `${NUMBER_FR.format(Math.trunc(amount))} F`;
}

/** 865000 → « 865 000 FCFA » (libellé long des maquettes). */
export function formatMoneyLong(amount: number): string {
  return `${NUMBER_FR.format(Math.trunc(amount))} FCFA`;
}

/** Montant signé d'une opération : « + 2 000 FCFA » ou « - 2 000 FCFA ». */
export function formatSigned(amount: number, direction: 'in' | 'out'): string {
  const sign = direction === 'in' ? '+' : '-';
  return `${sign} ${formatMoneyLong(Math.abs(Math.trunc(amount)))}`;
}

/**
 * Lit un montant tapé par une utilisatrice (« 2 000 », « 2.000 », « 2000f »).
 * Retourne `null` si le résultat n'est pas un entier positif exploitable.
 */
export function parseAmount(input: string): number | null {
  const digits = input.replace(/[^\d]/g, '');
  if (digits.length === 0) return null;
  const value = Number.parseInt(digits, 10);
  return Number.isSafeInteger(value) && value > 0 ? value : null;
}

/** Normalise un numéro béninois saisi librement en « 01 90 00 00 01 ». */
export function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '').replace(/^229/, '').slice(0, 10);
  return digits.replace(/(\d{2})(?=\d)/g, '$1 ').trim();
}

const DATE_LONG = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});
const DATE_SHORT = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long' });
const TIME_SHORT = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' });

export function formatDateLong(value: Date | string): string {
  return DATE_LONG.format(new Date(value));
}

export function formatTime(value: Date | string): string {
  return TIME_SHORT.format(new Date(value));
}

/** « Aujourd'hui », « Hier », « Avant-hier », sinon la date courte. */
export function formatDayLabel(value: Date | string, now: Date = new Date()): string {
  const day = startOfDay(new Date(value));
  const diff = Math.round((startOfDay(now).getTime() - day.getTime()) / 86_400_000);
  if (diff === 0) return "Aujourd'hui";
  if (diff === 1) return 'Hier';
  if (diff === 2) return 'Avant-hier';
  return DATE_SHORT.format(day);
}

/** « il y a 2 h », « il y a 5 min » — utilisé sur la carte « dernière activité ». */
export function formatRelative(value: Date | string, now: Date = new Date()): string {
  const minutes = Math.max(0, Math.round((now.getTime() - new Date(value).getTime()) / 60_000));
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.round(hours / 24);
  return days === 1 ? 'hier' : `il y a ${days} jours`;
}

function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

/** Valeur `YYYY-MM-DD` pour un `<input type="date">`. */
export function toDateInput(value: Date | string): string {
  const date = new Date(value);
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}
