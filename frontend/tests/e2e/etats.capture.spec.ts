import { test } from '@playwright/test';

/**
 * Ces tests ne vérifient rien : ils produisent les captures des états de
 * feedback pour la revue de design. Ils ne tournent que sur demande explicite.
 */
test.describe('Captures des états', () => {
  test('erreur de champ, message de réussite et confirmation', async ({ page }) => {
    await page.goto('/caisses/nouvelle');
    await page.getByLabel('Nom de la caisse').click();
    await page.getByLabel('Montant de la cotisation').click();
    await page.getByLabel('Nom de la caisse').click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: 'captures/14-erreurs-champs.png', fullPage: true });

    await page.getByLabel('Nom de la caisse').fill('Tontine des amies');
    await page.getByLabel('Montant de la cotisation').fill('2000');
    await page.getByRole('button', { name: 'Créer la caisse' }).click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'captures/15-toast-reussite.png' });
  });

  test('modale de confirmation avant désactivation', async ({ page }) => {
    await page.goto('/caisses');
    await page.getByRole('link', { name: /Tontine Ayaba/ }).click();
    await page.getByRole('link', { name: /Membres/ }).click();
    await page.getByRole('link').filter({ hasText: /\w/ }).nth(1).click();
    await page.getByRole('link', { name: 'Modifier le membre' }).click();
    await page.getByRole('button', { name: 'Inactif' }).click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'captures/16-confirmation.png' });
  });
});
