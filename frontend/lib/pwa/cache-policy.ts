/**
 * Politique de cache du service worker.
 *
 * Le SW (`scripts/sw-template.js`) applique les mêmes règles : ce module est la
 * version testée. Une donnée financière n'y figure jamais.
 */

export type CacheStrategy = 'bypass' | 'navigate' | 'static' | 'fresh';

export interface RequestView {
  method: string;
  url: string;
  mode: string;
  destination: string;
  pageOrigin: string;
  header: (name: string) => string | null;
}

function headerHas(view: RequestView, name: string): boolean {
  const value = view.header(name);
  return value !== null && value !== '';
}

function isRsc(view: RequestView, url: URL): boolean {
  if (url.searchParams.has('_rsc')) return true;
  if (url.pathname.startsWith('/_next/data/')) return true;
  if (view.header('rsc') === '1' || view.header('RSC') === '1') return true;
  if (headerHas(view, 'next-router-state-tree') || headerHas(view, 'Next-Router-State-Tree')) {
    return true;
  }
  if (headerHas(view, 'next-url') || headerHas(view, 'Next-Url')) return true;
  return false;
}

function isStaticAsset(view: RequestView, url: URL): boolean {
  const dest = view.destination;
  if (
    dest === 'script' ||
    dest === 'style' ||
    dest === 'font' ||
    dest === 'image' ||
    dest === 'manifest'
  ) {
    return true;
  }
  if (url.pathname.startsWith('/_next/static/')) return true;
  return /\.(?:js|css|woff2?|png|jpe?g|gif|svg|webp|ico)$/i.test(url.pathname);
}

/**
 * Décide comment le service worker doit traiter une requête.
 *
 * - `bypass` : ne pas intercepter (API, autre origine, écriture).
 * - `navigate` : réseau d'abord, HTML en cache, `/offline` en dernier.
 * - `static` : cache d'abord (fichiers hashés, polices, images).
 * - `fresh` : réseau d'abord (vols RSC). Le cache ne sert qu'hors ligne.
 */
export function classifyRequest(view: RequestView): CacheStrategy {
  if (view.method !== 'GET') return 'bypass';

  let url: URL;
  try {
    url = new URL(view.url);
  } catch {
    return 'bypass';
  }

  if (url.origin !== view.pageOrigin) return 'bypass';
  if (url.pathname.startsWith('/api/')) return 'bypass';

  if (view.mode === 'navigate' || view.destination === 'document') return 'navigate';
  if (isRsc(view, url)) return 'fresh';
  if (isStaticAsset(view, url)) return 'static';
  return 'fresh';
}

/** Chemins à précacher pour `next/font` (fichiers sous `.next/static/media`). */
export function fontUrlsFromMediaFiles(fileNames: readonly string[]): string[] {
  return fileNames
    .filter((name) => /\.(woff2?|ttf|otf)$/i.test(name))
    .map((name) => `/_next/static/media/${name}`);
}
