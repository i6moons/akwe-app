/**
 * Adresse publique du site.
 *
 * Les moteurs de partage (WhatsApp, Facebook, X) exigent des URL absolues pour
 * les images d'aperçu : une adresse relative est ignorée, et le lien s'affiche
 * sans vignette. Next a besoin de cette base pour les fabriquer.
 *
 * Elle est déduite de l'environnement plutôt qu'écrite en dur, sans quoi chaque
 * aperçu de branche annoncerait l'image de la production — et l'on croirait
 * tester ses modifications alors qu'on regarde celles d'hier.
 */
export function siteUrl(): URL {
  const explicite = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicite) return new URL(explicite);

  // Fourni par Vercel : d'abord le domaine stable de production, puis celui du
  // déploiement en cours pour les aperçus.
  const vercel =
    process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.NEXT_PUBLIC_VERCEL_URL ?? null;
  if (vercel) return new URL(`https://${vercel}`);

  return new URL('http://localhost:3000');
}
