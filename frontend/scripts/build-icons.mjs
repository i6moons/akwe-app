/**
 * Génère les icônes et l'image de partage à partir de `public/logo-akwe.png`.
 *
 * Tout est dérivé d'une source unique : le jour où le logo change, une seule
 * commande refait les six fichiers. Les icônes précédentes avaient été
 * recadrées à la main et le mot y était coupé des deux côtés — c'est
 * exactement ce qu'un script évite.
 *
 * `sharp` est déjà installé avec Next : aucune dépendance ajoutée.
 */
import sharp from 'sharp';
import path from 'node:path';

const PUBLIC = path.join(process.cwd(), 'public');
const SOURCE = path.join(PUBLIC, 'logo-akwe.png');

/** Fond de l'application (`--color-brand-800`). */
const VERT = { r: 0, g: 0x46, b: 0x43, alpha: 1 };

/**
 * Largeur du logo, en proportion du côté de l'image.
 *
 * `0.76` laisse une marge confortable sur les icônes ordinaires. `0.58` est
 * imposé par les icônes « maskable » : Android les recadre en cercle et rogne
 * environ 20 % du bord, donc le mot doit tenir dans la zone centrale sûre,
 * sinon il ressort tronqué sur l'écran d'accueil du téléphone.
 */
const PROPORTIONS = { normale: 0.76, sure: 0.58, partage: 0.42 };

async function composer({ largeur, hauteur, proportion, sortie, alpha = true, base = PUBLIC }) {
  const cible = Math.round(largeur * proportion);

  const logo = await sharp(SOURCE)
    // `lanczos3` limite le flou : la source est petite, chaque agrandissement
    // se voit.
    .resize({ width: cible, kernel: sharp.kernel.lanczos3 })
    .toBuffer();

  const image = sharp({
    create: { width: largeur, height: hauteur, channels: 4, background: VERT },
  }).composite([{ input: logo, gravity: 'centre' }]);

  // iOS n'accepte pas la transparence sur l'icône d'accueil : elle rendrait le
  // fond noir. On aplatit.
  await (alpha ? image : image.flatten({ background: VERT }))
    .png({ compressionLevel: 9 })
    .toFile(path.join(base, sortie));

  return sortie;
}

const CIBLES = [
  { largeur: 192, hauteur: 192, proportion: PROPORTIONS.normale, sortie: 'icons/icon-192.png' },
  { largeur: 512, hauteur: 512, proportion: PROPORTIONS.normale, sortie: 'icons/icon-512.png' },
  {
    largeur: 512,
    hauteur: 512,
    proportion: PROPORTIONS.sure,
    sortie: 'icons/icon-maskable-512.png',
  },
  {
    largeur: 180,
    hauteur: 180,
    proportion: PROPORTIONS.normale,
    sortie: 'icons/apple-touch-icon.png',
    alpha: false,
  },
  // Image de partage. Le format 1200×630 est celui qu'attendent WhatsApp,
  // Facebook et LinkedIn — c'est par WhatsApp que le lien circulera au Bénin.
  { largeur: 1200, hauteur: 630, proportion: PROPORTIONS.partage, sortie: 'og-image.png' },
];

/*
 * `app/favicon.ico` n'est pas produit ici : `sharp` n'écrit pas ce format, et un
 * PNG de 512 px réduit par le navigateur rend moins bien dans l'onglet qu'un ICO
 * contenant de vraies vignettes 16, 32 et 48. Il se régénère à la main, le jour
 * où le logo change :
 *
 *   convert public/icons/icon-512.png -define icon:auto-resize=48,32,16 app/favicon.ico
 */

for (const cible of CIBLES) {
  await composer(cible);
  const dossier = path.relative(process.cwd(), cible.base ?? PUBLIC);
  console.log(`✓ ${dossier}/${cible.sortie} — ${cible.largeur}×${cible.hauteur}`);
}
