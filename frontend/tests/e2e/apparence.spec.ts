import { expect, test, type Page } from '@playwright/test';

/**
 * Ces règles sont faciles à casser sans s'en rendre compte en ajoutant un
 * écran. On les vérifie donc en machine plutôt qu'à l'œil.
 *
 * Plusieurs d'entre elles dépendent de la taille : la même page se comporte
 * volontairement différemment sous le pouce et à la souris. Les tests tournent
 * sur les deux gabarits et vérifient la règle qui s'applique à chacun.
 */

/** Le seuil `lg` de Tailwind, où la barre latérale remplace le tiroir. */
const SEUIL_BUREAU = 1024;

function estBureau(page: Page): boolean {
  return (page.viewportSize()?.width ?? 0) >= SEUIL_BUREAU;
}

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

  test("le bouton d'action principal est atteignable sans faire défiler", async ({ page }) => {
    await page.goto('/caisses/nouvelle');

    const bouton = page.getByRole('button', { name: 'Créer la caisse' });
    await expect(bouton).toBeInViewport();

    const boite = await bouton.boundingBox();
    expect(boite).not.toBeNull();

    if (estBureau(page)) {
      // À la souris, tout l'écran est atteignable : le bouton reprend sa place
      // sous le formulaire plutôt que de flotter, détaché, en bas de fenêtre.
      const largeur = page.viewportSize()!.width;
      expect(boite!.width).toBeLessThan(largeur / 2);
    } else {
      // Sous le pouce, il occupe le dernier quart de l'écran.
      const hauteur = page.viewportSize()!.height;
      expect(boite!.y).toBeGreaterThan(hauteur * 0.75);
    }
  });

  test('la navigation est permanente sur grand écran, en tiroir sur téléphone', async ({
    page,
  }) => {
    await page.goto('/accueil');

    const barre = page.getByRole('navigation', { name: 'Navigation principale' });
    const bouton = page.getByRole('button', { name: 'Ouvrir le menu' });

    if (estBureau(page)) {
      await expect(barre).toBeVisible();
      // Le tiroir ferait doublon avec la barre : son bouton disparaît.
      await expect(bouton).toBeHidden();
      return;
    }

    await expect(barre).toBeHidden();
    await bouton.click();

    const menu = page.getByRole('dialog', { name: 'Menu principal' });
    await expect(menu).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(menu).toBeHidden();
  });

  test('le contenu reste lisible avant même que le JavaScript arrive', async ({ browser }) => {
    // L'état de départ d'une animation est écrit en style en ligne dans le HTML
    // du serveur. Une entrée en fondu laissait donc l'application entièrement
    // invisible tant que le script n'était pas chargé — plusieurs secondes sur
    // une 3G, et indéfiniment s'il échoue.
    const contexte = await browser.newContext({ javaScriptEnabled: false });
    const sansScript = await contexte.newPage();

    for (const chemin of ['/', '/accueil']) {
      await sansScript.goto(chemin);
      const titre = sansScript.locator('h1').first();

      await expect(titre).toBeVisible();
      expect(await titre.textContent()).toBeTruthy();
      // `toBeVisible` ne regarde pas l'opacité : il faut la lire soi-même.
      const opacite = await titre.evaluate((n) => Number(getComputedStyle(n).opacity));
      expect(opacite, `titre invisible sur ${chemin}`).toBeGreaterThan(0.9);
    }

    await contexte.close();
  });

  test("sur grand écran, le contenu reste dans une colonne au lieu de s'étirer", async ({
    page,
  }) => {
    test.skip(!estBureau(page), 'Règle propre aux grands écrans.');
    await page.goto('/accueil');

    const carte = page.getByText('Epargne total').locator('..').locator('..');
    const boite = await carte.boundingBox();
    expect(boite).not.toBeNull();

    // Sans cette limite, une carte s'étirait sur toute la fenêtre et un champ
    // destiné à recevoir « 2000 » en faisait mille.
    expect(boite!.width).toBeLessThan(page.viewportSize()!.width * 0.75);
  });
});
