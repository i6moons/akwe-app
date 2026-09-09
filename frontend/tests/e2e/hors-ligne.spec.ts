import { expect, test, type Page } from '@playwright/test';

/**
 * Le moment fort de la démonstration : on coupe le réseau devant le jury, on
 * saisit une cotisation, elle s'enregistre, un badge « en attente » apparaît,
 * puis tout remonte au retour de la connexion. Rien n'est perdu. Jamais.
 */

/** Laisse le service worker s'installer : c'est lui qui met les écrans en cache. */
async function attendreLeCache(page: Page): Promise<void> {
  await page.goto('/accueil');
  await page.waitForFunction(() => navigator.serviceWorker?.controller !== null, undefined, {
    timeout: 15_000,
  });
  await page.waitForTimeout(1500);
}

async function ouvrirSaisieManuelle(page: Page): Promise<void> {
  await page.goto('/caisses');
  await page
    .getByRole('link', { name: /Tontine/ })
    .first()
    .click();
  await expect(page.getByText('Solde de la caisse')).toBeVisible();

  await page.getByRole('link', { name: /Saisir manuellement/ }).click();
  await expect(page.getByLabel('Membre')).toBeEnabled();
}

test.describe('Mode hors ligne', () => {
  test('une cotisation saisie sans réseau est enregistrée et son reçu affiché', async ({
    page,
    context,
  }) => {
    await ouvrirSaisieManuelle(page);
    await context.setOffline(true);

    await page.getByLabel('Membre').selectOption({ index: 1 });
    await page.getByRole('button', { name: 'Cotisation' }).click();
    await page.getByLabel('Montant').fill('2000');
    await page.getByRole('button', { name: 'Enregistrer' }).click();

    await expect(page.getByRole('heading', { name: /Confirmation/ })).toBeVisible();
    await page.getByRole('button', { name: 'Valider' }).click();

    // L'écran de reçu s'affiche alors qu'aucun réseau n'est disponible.
    await expect(page.getByText('+ 2 000 FCFA')).toBeVisible();
    await expect(page.getByText('Enregistrée', { exact: true })).toBeVisible();
    await expect(page.getByText('Reçu envoyé', { exact: true })).toBeVisible();

    await context.setOffline(false);
  });

  test("l'opération hors ligne apparaît dans l'historique, marquée en attente", async ({
    page,
    context,
  }) => {
    await ouvrirSaisieManuelle(page);
    await context.setOffline(true);

    await page.getByLabel('Membre').selectOption({ index: 1 });
    await page.getByLabel('Montant').fill('7500');
    await page.getByRole('button', { name: 'Enregistrer' }).click();
    await page.getByRole('button', { name: 'Valider' }).click();

    await page.getByRole('link', { name: "Voir l'opération" }).click();
    await expect(page.getByRole('heading', { name: /Historique/ })).toBeVisible();
    await expect(page.getByText('7 500 FCFA').first()).toBeVisible();
    await expect(page.getByText('En attente').first()).toBeVisible();

    await context.setOffline(false);
  });

  test('« Modifier » ramène au formulaire avec les valeurs déjà saisies', async ({ page }) => {
    await ouvrirSaisieManuelle(page);

    await page.getByLabel('Membre').selectOption({ index: 1 });
    await page.getByLabel('Montant').fill('3000');
    await page.getByRole('button', { name: 'Enregistrer' }).click();
    await page.getByRole('button', { name: 'Modifier' }).click();

    await expect(page.getByLabel('Montant')).toHaveValue('3000');
  });

  test('un montant vide ou un membre manquant est refusé en français', async ({ page }) => {
    await ouvrirSaisieManuelle(page);

    await page.getByRole('button', { name: 'Enregistrer' }).click();

    await expect(page.getByText('Choisissez le membre concerné.')).toBeVisible();
    await expect(page.getByText(/Entrez un montant en FCFA/)).toBeVisible();
  });

  test("un écran jamais ouvert s'affiche quand même sans réseau", async ({ page, context }) => {
    // C'est tout l'intérêt des routes pré-rendues : le service worker les a
    // toutes mises en cache à l'installation, y compris celles jamais visitées.
    await attendreLeCache(page);
    await context.setOffline(true);

    await page.goto('/caisses/membres/nouveau?caisse=grp-ayaba');

    await expect(page.getByRole('heading', { name: 'Vous êtes hors connexion' })).toHaveCount(0);
    await expect(page.getByLabel(/Nom complet/)).toBeVisible();

    await context.setOffline(false);
  });

  test("l'historique global s'ouvre hors réseau avec les données locales", async ({
    page,
    context,
  }) => {
    await attendreLeCache(page);
    await context.setOffline(true);

    await page.goto('/operations');

    await expect(page.getByRole('heading', { name: /opérations/i })).toBeVisible();
    await expect(page.getByText('FCFA').first()).toBeVisible();

    await context.setOffline(false);
  });
});
