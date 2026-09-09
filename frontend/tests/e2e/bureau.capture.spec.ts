import { test } from '@playwright/test';

/**
 * Captures sur grand écran, pour la revue de design.
 * Ignorées par la configuration Playwright : à lancer à la main.
 */
test.use({ viewport: { width: 1440, height: 900 } });

const ECRANS = [
  { nom: 'bureau-01-accueil', chemin: '/accueil' },
  { nom: 'bureau-02-nouvelle', chemin: '/caisses/nouvelle' },
  { nom: 'bureau-03-caisses', chemin: '/caisses' },
  { nom: 'bureau-04-detail', chemin: '/caisses/detail?caisse=grp-ayaba' },
  { nom: 'bureau-05-membres', chemin: '/caisses/membres?caisse=grp-ayaba' },
  { nom: 'bureau-06-manuelle', chemin: '/caisses/operations/manuelle?caisse=grp-ayaba' },
  { nom: 'bureau-07-historique', chemin: '/operations' },
];

for (const { nom, chemin } of ECRANS) {
  test(nom, async ({ page }) => {
    await page.goto(chemin);
    await page.waitForTimeout(1600);
    await page.screenshot({ path: `captures/${nom}.png` });
  });
}
