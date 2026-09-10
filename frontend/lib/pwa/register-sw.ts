/**
 * Enregistrement du service worker.
 *
 * `skipWaiting` dans le SW prend le contrôle tout de suite. Sans rechargement,
 * la page en mémoire garde l'ancien JavaScript pendant que le nouveau cache
 * sert les lots suivants : écran blanc. On ne recharge que lors d'une *mise à
 * jour* — pas à la première installation, qui ajouterait un aller-retour 3G.
 */

export interface UpdateReloader {
  noteUpdateFound(alreadyControlled: boolean): void;
  handleControllerChange(): void;
}

export function createUpdateReloader(reload: () => void): UpdateReloader {
  let shouldReload = false;
  let didReload = false;

  return {
    noteUpdateFound(alreadyControlled: boolean): void {
      if (alreadyControlled) shouldReload = true;
    },
    handleControllerChange(): void {
      if (!shouldReload || didReload) return;
      didReload = true;
      reload();
    },
  };
}

export function registerServiceWorker(): void {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  if (process.env.NODE_ENV !== 'production') return;

  const reloader = createUpdateReloader(() => {
    window.location.reload();
  });

  void navigator.serviceWorker
    .register('/sw.js')
    .then((registration) => {
      registration.addEventListener('updatefound', () => {
        reloader.noteUpdateFound(navigator.serviceWorker.controller !== null);
      });
    })
    .catch((error: unknown) => {
      console.warn('AKWÈ : service worker non enregistré', error);
    });

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    reloader.handleControllerChange();
  });
}
