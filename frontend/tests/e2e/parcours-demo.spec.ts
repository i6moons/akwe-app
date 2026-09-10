import { expect, test, type Page } from '@playwright/test';

/**
 * Le parcours de démonstration, de bout en bout.
 * Ces tests protègent exactement ce qui sera montré au jury : si l'un d'eux
 * casse, le pitch casse.
 */

async function seConnecter(page: Page): Promise<void> {
  await page.goto('/connexion');
  await page.getByLabel('Numéro de téléphone').fill('0190000001');
  // `exact` : sans lui, le libellé attraperait aussi le bouton « Afficher le
  // mot de passe » posé à droite du champ.
  await page.getByLabel('Mot de passe', { exact: true }).fill('111111');
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await expect(page.getByRole('heading', { name: /Bienvenue,/ })).toBeVisible();
}

test.describe('Parcours de démonstration', () => {
  test("l'écran d'ouverture mène à la connexion", async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'AKWÈ' })).toBeVisible();
    await page.getByRole('link', { name: 'Commencer' }).click();
    await expect(page.getByRole('heading', { name: 'Bienvenue !' })).toBeVisible();
  });

  test('le bouton de connexion reste inactif tant que la saisie est incomplète', async ({
    page,
  }) => {
    await page.goto('/connexion');
    const bouton = page.getByRole('button', { name: 'Se connecter' });
    await expect(bouton).toBeDisabled();

    await page.getByLabel('Numéro de téléphone').fill('019000');
    await expect(bouton).toBeDisabled();

    await page.getByLabel('Numéro de téléphone').fill('0190000001');
    await expect(bouton).toBeDisabled();

    await page.getByLabel('Mot de passe', { exact: true }).fill('111111');
    await expect(bouton).toBeEnabled();
  });

  test("l'accueil affiche les caisses de démonstration", async ({ page }) => {
    await seConnecter(page);

    await expect(page.getByText('Epargne total')).toBeVisible();
    await expect(page.getByText('Caisses actives')).toBeVisible();
    await expect(page.getByRole('link', { name: /Tontine Ayaba/ }).first()).toBeVisible();
  });

  test('une caisse ouvre sur son solde, ses membres et son historique', async ({ page }) => {
    await seConnecter(page);
    // « Voir tout » de la section « Mes caisses », comme dans la démo.
    await page.getByRole('link', { name: 'Voir tout' }).last().click();

    await expect(page.getByRole('heading', { name: 'MES CAISSES' })).toBeVisible();
    await page
      .getByRole('link', { name: /Tontine Ayaba/ })
      .first()
      .click();

    await expect(page.getByText('Solde de la caisse')).toBeVisible();
    await expect(page.getByRole('link', { name: /Membres \(\d+\)/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /Historique des opérations/ })).toBeVisible();
  });

  test('la recherche de caisse filtre la liste', async ({ page }) => {
    await seConnecter(page);
    await page.goto('/caisses');

    await page.getByLabel('Rechercher une caisse').fill('voyage');
    await expect(page.getByRole('link', { name: /Tontine voyage/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /Tontine Ayaba/ })).toHaveCount(0);

    await page.getByLabel('Rechercher une caisse').fill('zzzz');
    await expect(page.getByText('Aucune caisse trouvée')).toBeVisible();
  });
});
