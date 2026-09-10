/**
 * Service worker AKWÈ — NE PAS MODIFIER `public/sw.js`.
 *
 * Ce fichier est le modèle ; `scripts/build-sw.mjs` y injecte la liste des
 * fichiers à mettre en cache après chaque `next build`, puis écrit le résultat
 * dans `public/sw.js`.
 *
 * Stratégie : tout le coquillage de l'application (chaque écran et son code)
 * est mis en cache dès l'installation. Une trésorière peut donc ouvrir
 * n'importe quel écran sans réseau, même un écran jamais visité. Les données,
 * elles, vivent dans IndexedDB. On ne met jamais en cache les appels d'API :
 * une donnée financière périmée serait pire que pas de donnée du tout.
 *
 * Les règles de classement (navigation / RSC / statique) sont les mêmes que
 * dans `lib/pwa/cache-policy.ts`.
 */

const CACHE = '__CACHE_NAME__';
const PRECACHE = __PRECACHE__;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) =>
        // `Promise.allSettled` : un seul fichier manquant ne doit pas faire
        // échouer toute l'installation et laisser l'application sans cache.
        Promise.allSettled(PRECACHE.map((url) => cache.add(url))),
      )
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

function isRsc(url, request) {
  if (url.searchParams.has('_rsc')) return true;
  if (url.pathname.startsWith('/_next/data/')) return true;
  if (request.headers.get('RSC') === '1') return true;
  if (request.headers.get('Next-Router-State-Tree')) return true;
  if (request.headers.get('Next-Url')) return true;
  return false;
}

function isStaticAsset(url, request) {
  const dest = request.destination;
  if (
    dest === 'script' ||
    dest === 'style' ||
    dest === 'font' ||
    dest === 'image' ||
    dest === 'manifest'
  ) {
    return true;
  }
  if (url.pathname.startsWith('/_next/static/')) return true;
  return /\.(?:js|css|woff2?|png|jpe?g|gif|svg|webp|ico)$/i.test(url.pathname);
}

function networkFirst(request, offlinePage) {
  return fetch(request)
    .then((response) => {
      if (response.ok) {
        const copy = response.clone();
        void caches.open(CACHE).then((cache) => cache.put(request, copy));
      }
      return response;
    })
    .catch(() => {
      const options = offlinePage ? { ignoreSearch: true } : undefined;
      return caches.match(request, options).then((cached) => {
        if (cached) return cached;
        if (offlinePage) return caches.match('/offline');
        return Promise.reject(new Error('offline'));
      });
    });
}

function cacheFirst(request) {
  return caches.match(request).then((cached) => {
    if (cached) return cached;
    return fetch(request).then((response) => {
      if (response.ok && response.type === 'basic') {
        const copy = response.clone();
        void caches.open(CACHE).then((cache) => cache.put(request, copy));
      }
      return response;
    });
  });
}

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;

  // Navigation : réseau d'abord, cache ensuite, écran « hors connexion » en
  // dernier recours.
  //
  // On ne sert JAMAIS le contenu d'une autre page en repli. Afficher l'accueil
  // sous l'adresse d'un formulaire donne une application qui ment sur l'endroit
  // où l'on se trouve — et la trésorière croit avoir perdu sa saisie.
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(networkFirst(request, true));
    return;
  }

  // Vols RSC de Next : réseau d'abord. Les servir depuis le cache pendant
  // qu'on est en ligne, après un déploiement, mélange HTML neuf et arbre périmé.
  if (isRsc(url, request)) {
    event.respondWith(networkFirst(request, false));
    return;
  }

  // Ressources statiques (hashées) : cache d'abord, c'est ce qui coûte le plus
  // cher en data.
  if (isStaticAsset(url, request)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  event.respondWith(networkFirst(request, false));
});
