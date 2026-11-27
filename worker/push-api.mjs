/**
 * Notifications d'édition sur Cloudflare (ticket #129) : logique du Worker, sans dépendance à Cloudflare
 * pour être testée dans Node (tests/worker-push.test.mjs). Le stockage (« hub ») est un Durable Object
 * en production (worker/index.mjs), un simple objet en mémoire dans les tests.
 *
 * Interface du hub : add(id, sub), remove(id), get(id), all() → [[id, sub]], getState(), setState(s),
 * touchTest(id, nowMs) → true si un essai est permis (au plus un par minute et par appareil).
 *
 * Seule l'adresse technique fournie par le navigateur est gardée : ni nom, ni e-mail, ni sujet suivi.
 */
import { planEdition, validSubscription } from "../lib/push-edition.mjs";
import { sendPush } from "./webpush.mjs";

const json = (body, status = 200) => Response.json(body, { status, headers: { "cache-control": "no-store" } });

export async function subscriptionId(endpoint) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(endpoint));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Clés et stockage présents : sinon les notifications sont « indisponibles » (enabled: false). */
export function pushConfig(env) {
  const publicKey = env.VAPID_PUBLIC_KEY, privateKey = env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey || !env.PUSH_HUB) return null;
  return { publicKey, privateKey, subject: env.VAPID_SUBJECT || env.MUNDI_SITE_URL || "https://mundi.nadaudjacques004.workers.dev" };
}

const TEST_MESSAGE = { title: "MUNDI · Notification d'essai", body: "Les notifications fonctionnent sur cet appareil.", url: "/mes-sujets/" };

/** /api/push : GET clé publique ; POST { subscription } ; DELETE { endpoint } ; POST /api/push/test { endpoint }. */
export async function handlePush(request, env, hub, { fetcher = fetch, now = Date.now } = {}) {
  const url = new URL(request.url);
  const config = pushConfig(env);
  if (!config) return json({ enabled: false }, request.method === "GET" ? 200 : 503);
  if (request.method === "GET" && url.pathname === "/api/push") return json({ enabled: true, publicKey: config.publicKey });
  // Écriture : seulement depuis les pages du site (pas depuis un autre site).
  const origin = request.headers.get("origin");
  if (origin && origin !== url.origin) return json({ error: "Origine refusée" }, 403);
  let body;
  try { body = await request.json(); } catch { return json({ error: "JSON attendu" }, 400); }
  if (url.pathname === "/api/push/test" && request.method === "POST") {
    if (typeof body?.endpoint !== "string") return json({ error: "Adresse manquante" }, 400);
    const id = await subscriptionId(body.endpoint);
    const sub = await hub.get(id);
    if (!sub) return json({ error: "Appareil non abonné" }, 404);
    if (!(await hub.touchTest(id, now()))) return json({ error: "Un essai par minute au plus" }, 429);
    let status = 0;
    try { status = await sendPush(sub, JSON.stringify(TEST_MESSAGE), config, { ttl: 600, urgency: "high", fetcher }); }
    catch { return json({ ok: false, error: "Service de notifications injoignable" }, 502); }
    if (status === 404 || status === 410) await hub.remove(id);
    return json({ ok: status >= 200 && status < 300, status }, status >= 200 && status < 300 ? 200 : 502);
  }
  if (url.pathname !== "/api/push") return json({ error: "Introuvable" }, 404);
  if (request.method === "POST") {
    const sub = body?.subscription;
    if (!validSubscription(sub)) return json({ error: "Abonnement invalide" }, 400);
    await hub.add(await subscriptionId(sub.endpoint), { endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } });
    return json({ ok: true }, 201);
  }
  if (request.method === "DELETE") {
    if (typeof body?.endpoint !== "string") return json({ error: "Adresse manquante" }, 400);
    await hub.remove(await subscriptionId(body.endpoint));
    return json({ ok: true });
  }
  return json({ error: "Méthode non prise en charge" }, 405);
}

/**
 * Tâche planifiée (toutes les 10 minutes) : lit /fil.json de la version en ligne. Si de nouvelles
 * publications y sont apparues depuis le dernier passage, une notification « L'édition du matin /
 * de l'après-midi est en ligne » part vers les abonnés (au plus une par heure). Le premier passage
 * mémorise l'existant sans rien envoyer.
 */
export async function runEdition(env, hub, { readFeed, fetcher = fetch, now = new Date() }) {
  const config = pushConfig(env);
  if (!config) return { sent: 0, skipped: "notifications non configurées" };
  const feed = await readFeed();
  const items = Array.isArray(feed?.items) ? feed.items.filter((i) => typeof i?.slug === "string" && typeof i?.title === "string") : [];
  if (!items.length) return { sent: 0, skipped: "fil.json vide ou illisible" };
  const plan = planEdition(await hub.getState(), items, now);
  await hub.setState(plan.state);
  if (!plan.message) return { sent: 0, skipped: "rien de nouveau" };
  const payload = JSON.stringify(plan.message);
  let sent = 0, removed = 0;
  for (const [id, sub] of await hub.all()) {
    try {
      const status = await sendPush(sub, payload, config, { topic: "edition", fetcher });
      if (status >= 200 && status < 300) sent++;
      else if (status === 404 || status === 410) { await hub.remove(id); removed++; }
    } catch { /* un appareil injoignable n'empêche pas les autres */ }
  }
  return { sent, removed, message: plan.message.title };
}
