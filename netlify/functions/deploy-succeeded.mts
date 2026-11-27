import { getStore } from "@netlify/blobs";
import webpush from "web-push";
import { planEdition } from "../../lib/push-edition.mjs";

/**
 * Lancée par Netlify après chaque déploiement réussi. En production seulement :
 * si de nouvelles publications sont en ligne, une notification « L'édition du
 * matin / de l'après-midi est en ligne » part vers les abonnés (au plus une par heure).
 */
type Sub = { endpoint: string; keys: { p256dh: string; auth: string } };

export default async (req: Request) => {
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  // Le corps de l'événement décrit le déploiement : contexte et adresse publique du site.
  let deploy: { context?: string; ssl_url?: string; url?: string } = {};
  try { deploy = ((await req.json()) as { payload?: typeof deploy }).payload ?? {}; } catch { /* corps absent */ }
  const site = deploy.ssl_url ?? deploy.url ?? process.env.URL;
  if (deploy.context !== "production" || !pub || !priv || !site) return new Response("ignoré");

  const res = await fetch(new URL("/fil.json", site), { cache: "no-store" });
  if (!res.ok) return new Response("fil.json indisponible", { status: 502 });
  const { items } = (await res.json()) as { items: { slug: string; title: string }[] };

  const meta = getStore("push-state");
  const state = (await meta.get("edition", { type: "json" })) as { slugs: string[]; lastNotifiedAt?: string } | null;
  const plan = planEdition(state, items, new Date());
  await meta.setJSON("edition", plan.state);
  if (!plan.message) return new Response("rien à envoyer");

  webpush.setVapidDetails(new URL("/", site).toString(), pub, priv);
  const subs = getStore("push-subscriptions");
  const { blobs } = await subs.list();
  const payload = JSON.stringify(plan.message);
  let sent = 0;
  await Promise.all(blobs.map(async ({ key }) => {
    const sub = (await subs.get(key, { type: "json" })) as Sub | null;
    if (!sub) return;
    try {
      await webpush.sendNotification(sub, payload, { TTL: 6 * 3600, urgency: "normal", topic: "edition" });
      sent++;
    } catch (e) {
      // Abonnement expiré ou retiré par l'appareil : on l'oublie.
      const status = (e as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) await subs.delete(key);
    }
  }));
  return new Response(`envoyé à ${sent} appareil(s)`);
};
