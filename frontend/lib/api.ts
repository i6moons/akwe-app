/**
 * Base des appels vers le backend.
 *
 * Par défaut, les routes sont servies sur la même origine (`/api/...`). Si le
 * backend est déployé séparément, il suffit de renseigner `NEXT_PUBLIC_API_URL`
 * sans toucher au code appelant.
 */
const BASE = (process.env.NEXT_PUBLIC_API_URL ?? '').replace(/\/$/, '');

export function apiUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${BASE}${normalized}`;
}

/** `true` quand la démo tourne sans backend : aucun appel réseau n'est tenté. */
export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
