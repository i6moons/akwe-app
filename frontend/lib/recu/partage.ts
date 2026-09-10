'use client';

import { lienWhatsApp } from '@/lib/recu/message';

export type ResultatPartage = 'partage' | 'annule' | 'telecharge' | 'echec';

/**
 * Envoie le reçu au membre.
 *
 * Une URL `wa.me` ne transporte que du texte : aucun lien ne peut joindre une
 * image à un message WhatsApp. Le seul chemin qui dépose vraiment le PNG dans
 * la conversation est le partage natif du téléphone, où WhatsApp figure parmi
 * les destinations. C'est donc la voie principale, et elle couvre Android
 * comme iOS.
 *
 * Là où ce partage n'existe pas — un ordinateur, un navigateur ancien — on
 * enregistre l'image et on ouvre la conversation avec le texte du reçu. La
 * trésorière n'a plus qu'à joindre le fichier : moins direct, mais jamais un
 * bouton mort.
 */
export async function partagerRecu(
  fichier: File,
  texte: string,
  phone: string | null,
): Promise<ResultatPartage> {
  if (typeof navigator !== 'undefined' && navigator.canShare?.({ files: [fichier] })) {
    try {
      await navigator.share({ files: [fichier], text: texte });
      return 'partage';
    } catch (erreur) {
      // Fermer la feuille de partage n'est pas une panne : on se tait.
      if (erreur instanceof DOMException && erreur.name === 'AbortError') return 'annule';
      return 'echec';
    }
  }

  try {
    telecharger(fichier);
    window.open(lienWhatsApp(phone, texte), '_blank', 'noopener,noreferrer');
    return 'telecharge';
  } catch {
    return 'echec';
  }
}

/** Enregistre le PNG dans les téléchargements du téléphone. */
export function telecharger(fichier: File): void {
  const url = URL.createObjectURL(fichier);
  const lien = document.createElement('a');
  lien.href = url;
  lien.download = fichier.name;
  document.body.append(lien);
  lien.click();
  lien.remove();
  // Le navigateur a besoin d'un instant pour lire l'objet avant sa libération.
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
