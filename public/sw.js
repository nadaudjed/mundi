/*
 * Service worker MUNDI — volontairement minimal.
 * - Pages : toujours le réseau d'abord. Sans connexion, une page
 *   « Vous êtes hors connexion » s'affiche. Il n'y a PAS de lecture hors ligne
 *   des récits.
 * - Fichiers /_next/static/ (CSS, JS, polices) : mis en cache à la première
 *   visite ; leurs noms changent à chaque version, il n'y a donc pas de risque
 *   d'afficher une ancienne version.
 * - Rien d'autre n'est mis en cache (ni vidéos, ni images, ni données).
 */
const VERSION = "mundi-shell-v1";
const OFFLINE_URL = "/hors-ligne/";
const PRECACHE = [OFFLINE_URL, "/icons/icon-192.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(VERSION).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)));
    return;
  }

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.open(VERSION).then(async (cache) => {
        const hit = await cache.match(request);
        if (hit) return hit;
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      }),
    );
  }
});
