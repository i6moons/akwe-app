/**
 * Capture d'écran de chaque page, au format d'un téléphone.
 * Sert à comparer le rendu aux maquettes sans lancer la suite e2e complète.
 *
 *   node tests/captures.mjs [url]
 */
import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

const BASE = process.argv[2] ?? 'http://127.0.0.1:3000';
const OUT = 'captures';

const PAGES = [
  ['01-splash', '/'],
  ['02-connexion', '/connexion'],
  ['03-verification', '/verification'],
  ['04-accueil', '/accueil'],
  ['05-caisses', '/caisses'],
  ['06-caisse-nouvelle', '/caisses/nouvelle'],
  ['07-caisse-detail', '/caisses/detail?caisse=grp-ayaba'],
  ['08-membres', '/caisses/membres?caisse=grp-ayaba'],
  ['09-membre-nouveau', '/caisses/membres/nouveau?caisse=grp-ayaba'],
  ['10-membre-score', '/caisses/membre?caisse=grp-ayaba&membre=grp-ayaba-m0'],
  ['11-vocale', '/caisses/operations/vocale?caisse=grp-ayaba'],
  ['12-manuelle', '/caisses/operations/manuelle?caisse=grp-ayaba'],
  ['13-historique', '/caisses/operations?caisse=grp-ayaba'],
];

// `--no-proxy-server` : sans cela, Chromium route même 127.0.0.1 vers le proxy
// éventuellement défini dans l'environnement, et la connexion est refusée.
const browser = await chromium.launch({ args: ['--no-proxy-server'] });
const context = await browser.newContext({
  viewport: { width: 402, height: 874 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  locale: 'fr-BJ',
});

const errors = [];
const page = await context.newPage();
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(`${page.url()} → ${message.text()}`);
});
page.on('pageerror', (error) => errors.push(`${page.url()} → ${error.message}`));

await mkdir(OUT, { recursive: true });

// Premier passage : laisse le temps aux données de démonstration de s'écrire.
await page.goto(`${BASE}/accueil`, { waitUntil: 'networkidle' });
await page.waitForTimeout(2500);

for (const [name, path] of PAGES) {
  await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
  console.log(`✓ ${name}`);
}

await browser.close();

if (errors.length > 0) {
  console.log('\n⚠ Erreurs console :');
  for (const error of errors) console.log(`  ${error}`);
} else {
  console.log('\n✓ Aucune erreur console.');
}
