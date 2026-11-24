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

/* Notifications d'édition (seulement si la personne les a activées dans « Mes sujets »). */
self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = {}; }
  event.waitUntil(
    self.registration.showNotification(data.title || "MUNDI", {
      body: data.body || "Une nouvelle édition est en ligne.",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: "mundi-edition",
      data: { url: typeof data.url === "string" && data.url.startsWith("/") ? data.url : "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (client.url.startsWith(self.location.origin) && "focus" in client) {
          client.navigate(url).catch(() => {});
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
