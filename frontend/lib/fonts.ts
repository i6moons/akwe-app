import { Inknut_Antiqua, Inter } from 'next/font/google';

/**
 * Les deux seules polices de l'application.
 *
 * Chargées par `next/font` et donc **servies depuis notre propre domaine** : un
 * `<link>` vers fonts.googleapis.com exigerait le réseau à chaque ouverture et
 * casserait le mode hors ligne, en plus d'ajouter deux connexions sur une 3G
 * déjà lente. Ici, les fichiers sont mis en cache par le service worker comme
 * le reste de l'application.
 */

/** Titres. Une antiqua large, présente : c'est la signature d'AKWÈ. */
export const display = Inknut_Antiqua({
  subsets: ['latin'],
  weight: '700',
  variable: '--font-display-family',
  display: 'swap',
  // Inknut Antiqua est lourde : on la limite aux vrais titres.
  preload: true,
});

/**
 * Tout le reste : paragraphes, libellés, boutons, montants.
 *
 * Police variable : un seul fichier couvre toutes les graisses. Le corps de
 * texte est réglé sur 500 dans `globals.css` ; les graisses supérieures restent
 * disponibles pour les montants et les libellés, sans second téléchargement ni
 * gras synthétique.
 */
export const body = Inter({
  subsets: ['latin'],
  variable: '--font-body-family',
  display: 'swap',
});

/** À poser sur `<html>` pour exposer les deux variables CSS. */
export const fontVariables = `${display.variable} ${body.variable}`;
