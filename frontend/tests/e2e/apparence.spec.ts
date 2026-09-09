import { expect, test } from '@playwright/test';

/**
 * Règles d'apparence valables sur tous les gabarits.
 * Celles qui dépendent de la largeur vivent dans `gabarits.spec.ts`.
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

  test('le contenu reste lisible avant même que le JavaScript arrive', async ({ browser }) => {
    // L'état de départ d'une animation est écrit en style en ligne dans le HTML
    // du serveur. Une entrée en fondu laissait donc l'application entièrement
    // invisible tant que le script n'était pas chargé — plusieurs secondes sur
    // une 3G, et indéfiniment s'il échoue.
    const contexte = await browser.newContext({ javaScriptEnabled: false });
    const sansScript = await contexte.newPage();

    // Deux passages : le drapeau qui désactive le fondu d'entrée vit dans un
    // module, et un module survit d'une requête à l'autre côté serveur. La
    // deuxième visite est donc celle qui compte.
    for (const chemin of ['/', '/accueil', '/', '/accueil']) {
      await sansScript.goto(chemin);
      const titre = sansScript.locator('h1').first();

      await expect(titre).toBeVisible();
      expect(await titre.textContent()).toBeTruthy();

      // `toBeVisible` ne regarde pas l'opacité, et `getComputedStyle` sur le
      // titre seul ne dit rien de ses ancêtres : un titre opaque dans un
      // conteneur transparent reste invisible. `checkVisibility` remonte l'arbre.
      const visible = await titre.evaluate((n) =>
        n.checkVisibility({ opacityProperty: true, visibilityProperty: true }),
      );
      expect(visible, `titre invisible sur ${chemin}`).toBe(true);
    }

    await contexte.close();
  });
});
