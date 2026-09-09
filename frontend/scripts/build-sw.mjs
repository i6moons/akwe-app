/**
 * Génère `public/sw.js` après `next build`.
 *
 * Le service worker doit connaître la liste exacte des fichiers produits par le
 * build — les noms des lots JavaScript changent à chaque compilation. Sans cette
 * liste, une page ouverte hors connexion aurait son HTML mais pas son code, et
 * resterait blanche. On lit donc les manifestes de Next et on injecte tout dans
 * le modèle.
 */
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const NEXT_DIR = path.join(ROOT, '.next');

/** Chemins pré-rendus, lus depuis la source unique `lib/routes.ts`. */
async function staticPaths() {
  const source = await readFile(path.join(ROOT, 'lib', 'routes.ts'), 'utf8');
  const block = source.split('export const STATIC_PATHS = [')[1]?.split(']')[0] ?? '';
  return [...block.matchAll(/'([^']+)'/g)].map((match) => match[1]);
}

async function readManifest(file) {
  const full = path.join(NEXT_DIR, file);
  if (!existsSync(full)) return {};
  return JSON.parse(await readFile(full, 'utf8'));
}

async function buildAssets() {
  const app = await readManifest('app-build-manifest.json');
  const pages = await readManifest('build-manifest.json');

  const files = new Set();
  for (const list of Object.values(app.pages ?? {})) {
    for (const file of list) files.add(file);
  }
  for (const file of pages.rootMainFiles ?? []) files.add(file);
  for (const file of pages.polyfillFiles ?? []) files.add(file);

  return [...files]
    .filter((file) => file.endsWith('.js') || file.endsWith('.css'))
    .map((file) => `/_next/${file}`);
}

const precache = [...(await staticPaths()), '/manifest.webmanifest', ...(await buildAssets())];

// Le nom du cache change dès qu'un fichier change : l'ancien cache est alors
// supprimé à l'activation, et personne ne reste bloqué sur une vieille version.
const version = createHash('sha256').update(precache.join('|')).digest('hex').slice(0, 8);

const template = await readFile(path.join(ROOT, 'scripts', 'sw-template.js'), 'utf8');
const output = template
  .replace('__CACHE_NAME__', `akwe-${version}`)
  .replace('__PRECACHE__', JSON.stringify(precache, null, 2));

await writeFile(path.join(ROOT, 'public', 'sw.js'), output);

console.log(`✓ public/sw.js — ${precache.length} fichiers en cache (akwe-${version})`);
