import { expect, test } from '@playwright/test';

/** Une erreur muette ou une action destructive sans garde-fou coûte cher en démo. */
test.describe('Retours à l’utilisatrice', () => {
  test('quitter un champ obligatoire vide affiche l’erreur tout de suite', async ({ page }) => {
    await page.goto('/caisses/nouvelle');

    const nom = page.getByLabel('Nom de la caisse');
    await nom.click();
    await nom.fill('ab');
    // On quitte le champ sans avoir rien validé.
    await page.getByLabel('Montant de la cotisation').click();

    const erreur = page.getByText('Donnez un nom à votre caisse.');
    await expect(erreur).toBeVisible();
    await expect(nom).toHaveAttribute('aria-invalid', 'true');

    // Le message doit être rattaché au champ, sinon il n'existe pas pour un
    // lecteur d'écran.
    const decritPar = await nom.getAttribute('aria-describedby');
    expect(decritPar).toBe('nom-erreur');

    await nom.fill('Tontine des amies');
    await expect(erreur).toBeHidden();
  });

  test('une caisse enregistrée déclenche un message de réussite', async ({ page }) => {
    await page.goto('/caisses/nouvelle');
    await page.getByLabel('Nom de la caisse').fill('Tontine des amies');
    await page.getByLabel('Montant de la cotisation').fill('2000');
    await page.getByRole('button', { name: 'Créer la caisse' }).click();

    const message = page.getByText('Caisse « Tontine des amies » créée');
    await expect(message).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Liste des membres' })).toBeVisible();
  });

  test('désactiver un membre demande confirmation avant d’agir', async ({ page }) => {
    await page.goto('/caisses');
    await page.getByRole('link', { name: /Tontine Ayaba/ }).click();
    await page.getByRole('link', { name: /Membres/ }).click();
    // Un membre nommé plutôt qu'un rang dans la page : la navigation
    // permanente des grands écrans ajoute des liens avant celui-ci.
    await page.getByRole('link', { name: /Adjovi Sébastien/ }).click();
    await page.getByRole('link', { name: 'Modifier le membre' }).click();

    await page.getByRole('button', { name: 'Inactif' }).click();

    const dialogue = page.getByRole('dialog', { name: 'Désactiver ce membre ?' });
    await expect(dialogue).toBeVisible();
    await expect(dialogue.getByText('Vous pourrez le réactiver plus tard.')).toBeVisible();

    // Annuler ne doit rien changer.
    await dialogue.getByRole('button', { name: 'Annuler' }).click();
    await expect(dialogue).toBeHidden();
    await expect(page.getByRole('button', { name: '✓ Actif' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });
});
