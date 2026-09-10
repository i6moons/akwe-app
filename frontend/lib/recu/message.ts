import type { DonneesRecu } from '@/lib/recu/image';

/** Indicatif du Bénin, que personne ne compose au quotidien. */
const INDICATIF = '229';

/**
 * Texte qui accompagne l'image sur WhatsApp.
 *
 * Il répète le montant et la date parce que l'image, elle, peut n'être qu'un
 * aperçu flou tant qu'elle n'est pas téléchargée : le message doit rester
 * lisible en 3G, sans avoir à ouvrir quoi que ce soit.
 */
export function construireMessageRecu(donnees: DonneesRecu): string {
  return [
    `Bonjour ${prenom(donnees.membre)},`,
    '',
    `Votre ${donnees.type.toLowerCase()} de ${donnees.montant.replace(/^[+-]\s*/, '')} a bien été enregistrée.`,
    `Caisse : ${donnees.caisse}`,
    `Date : ${donnees.date}`,
    '',
    `Reçu n° ${donnees.reference} — AKWÈ`,
  ].join('\n');
}

/** « Adjoavi Hounkpatin » → « Adjoavi ». On s'adresse à la personne, pas à l'état civil. */
export function prenom(nomComplet: string): string {
  const premier = nomComplet.trim().split(/\s+/)[0];
  return premier && premier.length > 0 ? premier : 'chère membre';
}

/**
 * Numéro au format international attendu par WhatsApp : chiffres seuls, sans
 * le « + », précédés de l'indicatif si la trésorière ne l'a pas saisi.
 */
export function numeroInternational(phone: string | null | undefined): string | null {
  const chiffres = (phone ?? '').replace(/\D/g, '');
  if (chiffres.length < 8) return null;
  return chiffres.startsWith(INDICATIF) ? chiffres : `${INDICATIF}${chiffres}`;
}

/**
 * Lien de conversation WhatsApp. Sans numéro connu, on ouvre quand même
 * WhatsApp : la trésorière choisit le destinataire elle-même.
 */
export function lienWhatsApp(phone: string | null | undefined, texte: string): string {
  const numero = numeroInternational(phone);
  const message = encodeURIComponent(texte);
  return numero ? `https://wa.me/${numero}?text=${message}` : `https://wa.me/?text=${message}`;
}
