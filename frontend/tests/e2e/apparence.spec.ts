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

  const ACTIONS = [
    { chemin: '/caisses/nouvelle', nom: 'Créer la caisse', role: 'button' as const },
    { chemin: '/caisses', nom: 'Nouvelle caisse', role: 'link' as const },
  ];

  for (const { chemin, nom, role } of ACTIONS) {
    test(`l'action « ${nom} » est bien placée`, async ({ page }) => {
      await page.goto(chemin);

      // Cadré sur le contenu : la navigation permanente porte les mêmes noms.
      const bouton = page.locator('main').getByRole(role, { name: nom });
      await expect(bouton).toBeInViewport();

      const boite = await bouton.boundingBox();
      expect(boite).not.toBeNull();
      const { width: largeur, height: hauteur } = page.viewportSize()!;

      if (!estBureau(page)) {
        // Sous le pouce, il occupe le dernier quart de l'écran.
        expect(boite!.y).toBeGreaterThan(hauteur * 0.75);
        return;
      }

      // À la souris, tout l'écran est atteignable : le bouton reprend sa place
      // dans le flux plutôt que de flotter, détaché, en bas de fenêtre.
      expect(boite!.width).toBeLessThan(largeur / 2);

      // Et il suit le contenu de près. Un voisin en `flex-1` qui se dilate sur
      // toute la hauteur le rejetait tout en bas, séparé de ce qu'il valide.
      // On ignore ses propres ancêtres, dont la base passe forcément sous lui.
      const basDuContenu = await bouton.evaluate((element) => {
        const main = element.closest('main');
        if (!main) return 0;
        let bas = 0;
        for (const noeud of main.querySelectorAll('*')) {
          if (noeud.contains(element)) continue;
          const boite = noeud.getBoundingClientRect();
          if (boite.height > 40) bas = Math.max(bas, boite.bottom);
        }
        return bas;
      });
      expect(boite!.y - basDuContenu, `« ${nom} » décroché du contenu`).toBeLessThan(60);
    });
  }

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
