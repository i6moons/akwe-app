'use client';

/**
 * Dessin du reçu en PNG, directement sur le téléphone.
 *
 * Le PNG plutôt que le PDF, et ce n'est pas un détail technique : nos
 * utilisatrices reçoivent le reçu sur WhatsApp, où une image s'affiche en
 * aperçu dans la conversation. Un PDF, lui, demande un lecteur, un
 * téléchargement, parfois une application absente du téléphone — autant
 * d'occasions de renoncer.
 *
 * Le dessin se fait ici et non sur le serveur : le reçu doit partir même sans
 * réseau, puisque c'est précisément au marché, hors ligne, que la trésorière
 * encaisse.
 */

const LARGEUR = 1080;
const HAUTEUR = 1500;
const VERT = '#0F5132';
const OR = '#D4A017';
const FOND = '#FAF9F6';
const ENCRE = '#111827';
const GRIS = '#6B7280';
const POLICE = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

export interface DonneesRecu {
  reference: string;
  type: string;
  montant: string;
  membre: string;
  caisse: string;
  source: string;
  date: string;
  tresoriere: string;
}

export async function genererRecuPng(donnees: DonneesRecu): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = LARGEUR;
  canvas.height = HAUTEUR;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas indisponible');

  ctx.fillStyle = FOND;
  ctx.fillRect(0, 0, LARGEUR, HAUTEUR);

  await dessinerEntete(ctx);
  dessinerMontant(ctx, donnees);
  dessinerTableau(ctx, donnees);
  dessinerPied(ctx, donnees);

  return await new Promise<Blob>((resoudre, rejeter) => {
    canvas.toBlob(
      (blob) => (blob ? resoudre(blob) : rejeter(new Error('Export PNG impossible'))),
      'image/png',
    );
  });
}

async function dessinerEntete(ctx: CanvasRenderingContext2D): Promise<void> {
  ctx.fillStyle = VERT;
  ctx.fillRect(0, 0, LARGEUR, 300);
  ctx.fillStyle = OR;
  ctx.fillRect(0, 294, LARGEUR, 6);

  const logo = await chargerLogo();
  if (logo) ctx.drawImage(logo, 72, 96, 108, 108);

  const x = logo ? 212 : 72;
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `bold 64px ${POLICE}`;
  ctx.fillText('AKWÈ', x, 158);
  ctx.fillStyle = 'rgba(255,255,255,0.82)';
  ctx.font = `36px ${POLICE}`;
  ctx.fillText('Reçu de paiement', x, 214);
}

function dessinerMontant(ctx: CanvasRenderingContext2D, donnees: DonneesRecu): void {
  ctx.textAlign = 'center';
  ctx.fillStyle = GRIS;
  ctx.font = `38px ${POLICE}`;
  ctx.fillText(donnees.type, LARGEUR / 2, 412);
  ctx.fillStyle = VERT;
  ctx.font = `bold 96px ${POLICE}`;
  ctx.fillText(donnees.montant, LARGEUR / 2, 522);
  ctx.textAlign = 'left';
}

function dessinerTableau(ctx: CanvasRenderingContext2D, donnees: DonneesRecu): void {
  const lignes: readonly (readonly [string, string])[] = [
    ['Membre', donnees.membre],
    ['Caisse', donnees.caisse],
    ['Source', donnees.source],
    ['Date', donnees.date],
  ];

  const haut = 596;
  const hauteurLigne = 118;
  const hauteur = lignes.length * hauteurLigne;
  cadre(ctx, 72, haut, LARGEUR - 144, hauteur);

  lignes.forEach(([libelle, valeur], index) => {
    const y = haut + index * hauteurLigne;
    if (index > 0) {
      ctx.strokeStyle = '#E5E7EB';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(112, y);
      ctx.lineTo(LARGEUR - 112, y);
      ctx.stroke();
    }
    const milieu = y + hauteurLigne / 2 + 14;
    ctx.fillStyle = GRIS;
    ctx.font = `36px ${POLICE}`;
    ctx.fillText(libelle, 112, milieu);

    ctx.fillStyle = ENCRE;
    ctx.font = `600 38px ${POLICE}`;
    ctx.textAlign = 'right';
    ctx.fillText(couper(ctx, valeur, 560), LARGEUR - 112, milieu);
    ctx.textAlign = 'left';
  });
}

function dessinerPied(ctx: CanvasRenderingContext2D, donnees: DonneesRecu): void {
  ctx.textAlign = 'center';
  ctx.fillStyle = GRIS;
  ctx.font = `32px ${POLICE}`;
  ctx.fillText(`Reçu n° ${donnees.reference}`, LARGEUR / 2, 1190);
  ctx.fillText(`Enregistré par ${donnees.tresoriere}`, LARGEUR / 2, 1244);

  ctx.fillStyle = VERT;
  ctx.font = `600 34px ${POLICE}`;
  ctx.fillText('Conservez ce reçu comme preuve de votre versement.', LARGEUR / 2, 1340);
  ctx.fillStyle = OR;
  ctx.fillRect(LARGEUR / 2 - 60, 1390, 120, 6);
  ctx.textAlign = 'left';
}

/** Rectangle blanc à coins arrondis, bordé de gris. */
function cadre(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  largeur: number,
  hauteur: number,
): void {
  const rayon = 32;
  ctx.beginPath();
  ctx.moveTo(x + rayon, y);
  ctx.arcTo(x + largeur, y, x + largeur, y + hauteur, rayon);
  ctx.arcTo(x + largeur, y + hauteur, x, y + hauteur, rayon);
  ctx.arcTo(x, y + hauteur, x, y, rayon);
  ctx.arcTo(x, y, x + largeur, y, rayon);
  ctx.closePath();
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
  ctx.strokeStyle = '#E5E7EB';
  ctx.lineWidth = 2;
  ctx.stroke();
}

/** Tronque un nom trop long plutôt que de le laisser déborder du cadre. */
function couper(ctx: CanvasRenderingContext2D, texte: string, largeurMax: number): string {
  if (ctx.measureText(texte).width <= largeurMax) return texte;
  let coupe = texte;
  while (coupe.length > 1 && ctx.measureText(`${coupe}…`).width > largeurMax) {
    coupe = coupe.slice(0, -1);
  }
  return `${coupe}…`;
}

async function chargerLogo(): Promise<HTMLImageElement | null> {
  return await new Promise((resoudre) => {
    const image = new Image();
    // Le logo est un agrément : s'il manque, le reçu part quand même.
    image.onload = () => resoudre(image);
    image.onerror = () => resoudre(null);
    image.src = '/logo-akwe.png';
  });
}
