import { expect, test } from '@playwright/test';

/**
 * Ces règles sont faciles à casser sans s'en rendre compte en ajoutant un
 * écran. On les vérifie donc en machine plutôt qu'à l'œil.
 */

/** Les deux seules familles autorisées, dans l'ordre où Next les nomme. */
const POLICES = ['Inknut Antiqua', 'Inter'];

test.describe('Apparence', () => {
  test("l'application n'utilise que Inknut Antiqua et Inter", async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'AKWÈ' })).toBeVisible();

    const familles = await page.evaluate(() => {
      const trouvees = new Set<string>();
      for (const noeud of document.querySelectorAll('body *')) {
        const texte = noeud.textContent?.trim();
        if (!texte || noeud.children.length > 0) continue;
        trouvees.add(getComputedStyle(noeud).fontFamily);
      }
      return [...trouvees];
    });

    expect(familles.length).toBeGreaterThan(0);
    for (const famille of familles) {
      expect(POLICES.some((police) => famille.includes(police))).toBe(true);
    }
  });

  test("le bouton d'action reste visible en bas sans faire défiler", async ({ page }) => {
    await page.goto('/caisses/nouvelle');

    const bouton = page.getByRole('button', { name: 'Créer la caisse' });
    await expect(bouton).toBeInViewport();

    const hauteur = page.viewportSize()?.height ?? 0;
    const boite = await bouton.boundingBox();
    expect(boite).not.toBeNull();
    // Le bouton occupe le dernier quart de l'écran : il est sous le pouce.
    expect(boite!.y).toBeGreaterThan(hauteur * 0.75);
  });

  test('le menu latéral se ferme avec la touche Échap', async ({ page }) => {
    await page.goto('/accueil');
    await page.getByRole('button', { name: 'Ouvrir le menu' }).click();

    const menu = page.getByRole('dialog', { name: 'Menu principal' });
    await expect(menu).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(menu).toBeHidden();
  });
});
