// Source du service worker (bundlée par scripts/build-sw.mjs en dist/sw.js
// via esbuild + workbox-build injectManifest). N'est JAMAIS exécutée dans
// l'app React Native elle-même — c'est un script séparé qui tourne dans le
// thread du navigateur dédié aux service workers.
import { BackgroundSyncPlugin } from 'workbox-background-sync';
import { ExpirationPlugin } from 'workbox-expiration';
import { precacheAndRoute, createHandlerBoundToURL } from 'workbox-precaching';
import { NavigationRoute, registerRoute, setCatchHandler } from 'workbox-routing';
import { CacheFirst, NetworkFirst, NetworkOnly, StaleWhileRevalidate } from 'workbox-strategies';

declare const self: ServiceWorkerGlobalScope;

// injectManifest remplace cette ligne par la vraie liste des fichiers
// exportés (JS/CSS/HTML hashés) — ne pas la modifier à la main.
precacheAndRoute(self.__WB_MANIFEST);

// --- Lecture : contenu des cours (texte/JSON), déjà ouvert = reste lisible
// hors-ligne, revalidé en tâche de fond au retour réseau.
registerRoute(
  ({ url }) => /\/courses(\/|$)|\/lessons(\/|$)/.test(url.pathname),
  new StaleWhileRevalidate({ cacheName: 'course-content-v1' }),
);

// --- Images (peu importe l'hébergeur — Cloudinary ou autre) : gardées
// longtemps, c'est le gros du poids réseau sur une 3G instable.
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'images-v1',
    plugins: [new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 60 * 24 * 60 * 60 })],
  }),
);

// --- Jamais en cache : tout ce qui touche à l'identité/l'auth. Doit être
// enregistré AVANT la règle API générale ci-dessous (Workbox retient la
// première route qui matche).
registerRoute(({ url }) => /\/auth\/|\/profile(\/|$)/.test(url.pathname), new NetworkOnly());

// --- Écritures hors-ligne : ces 3 actions utilisateur sont rejouées
// automatiquement par le navigateur au retour du réseau (Background Sync),
// même si l'onglet est fermé entre-temps. Les 3 routes backend sont déjà
// idempotentes par construction (upsert/garde "déjà fait" côté serveur,
// voir fristaid-backend) : un rejeu ne double-attribue jamais de points.
const offlineWritesQueue = new BackgroundSyncPlugin('offline-writes', {
  maxRetentionTime: 24 * 60, // minutes — abandonne une écriture trop vieille pour rester pertinente
});
registerRoute(
  ({ url, request }) =>
    request.method === 'POST' &&
    /\/courses\/[^/]+\/quiz\/submit$|\/missions\/[^/]+\/complete$|\/weekly-challenges\/[^/]+\/attempt$/.test(
      url.pathname,
    ),
  new NetworkOnly({ plugins: [offlineWritesQueue] }),
  'POST',
);

// --- Lectures API générales : réseau d'abord, mais pas d'attente infinie
// sur une 3G capricieuse.
registerRoute(({ url }) => url.pathname.startsWith('/') && !url.pathname.startsWith('/_expo'), new NetworkFirst({
  cacheName: 'api-reads-v1',
  networkTimeoutSeconds: 4,
}));

// --- Navigation (ouverture d'une route, rafraîchissement d'une page
// profonde) : sert la page précachée en premier choix réseau, et retombe
// sur l'app shell si la route demandée n'a jamais été visitée hors-ligne —
// le routeur côté client prend ensuite la main une fois le JS chargé.
const navigationHandler = createHandlerBoundToURL('/index.html');
registerRoute(new NavigationRoute(navigationHandler));

// Dernier recours absolu (ex. app shell lui-même pas encore en cache, tout
// premier lancement hors-ligne) : page de secours dédiée plutôt qu'un
// écran blanc.
setCatchHandler(async ({ request }) => {
  if (request.destination === 'document') {
    return (await caches.match('/offline/index.html')) ?? Response.error();
  }
  return Response.error();
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
