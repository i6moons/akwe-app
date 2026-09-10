import { expect, test, type Page } from '@playwright/test';

/**
 * La même page se comporte volontairement différemment sous le pouce et à la
 * souris. Ces tests tournent sur les deux gabarits et vérifient, à chaque fois,
 * la règle qui s'applique à celui-là.
 */

/** Le seuil `lg` de Tailwind, où la barre latérale remplace le tiroir. */
const SEUIL_BUREAU = 1024;

function estBureau(page: Page): boolean {
  return (page.viewportSize()?.width ?? 0) >= SEUIL_BUREAU;
}

const ACTIONS = [
  { chemin: '/caisses/nouvelle', nom: 'Créer la caisse', role: 'button' as const },
  { chemin: '/caisses', nom: 'Nouvelle caisse', role: 'link' as const },
];

test.describe('Gabarits', () => {
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

  test("les écrans d'authentification gardent une largeur de lecture", async ({ page }) => {
    test.skip(!estBureau(page), 'Règle propre aux grands écrans.');
    await page.goto('/connexion');

    // Six cases de code réparties sur toute la fenêtre ne se lisent plus comme
    // un code, et un champ de téléphone d'un mètre non plus.
    const champ = page.getByLabel('Numéro de téléphone');
    const boite = await champ.boundingBox();
    expect(boite).not.toBeNull();
    expect(boite!.width).toBeLessThan(page.viewportSize()!.width * 0.6);
  });
});
