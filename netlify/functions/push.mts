import { createHash } from "node:crypto";
import { getStore } from "@netlify/blobs";
import { validSubscription } from "../lib/edition.mjs";

/**
 * /api/push : abonnement aux notifications d'édition.
 * GET : clé publique (ou 503 si les clés VAPID ne sont pas configurées sur Netlify).
 * POST { subscription } : enregistre l'abonnement. DELETE { endpoint } : le retire.
 * Seule l'adresse technique fournie par le navigateur est gardée : ni nom, ni e-mail, ni sujet suivi.
 */
const store = () => getStore("push-subscriptions");
const id = (endpoint: string) => createHash("sha256").update(endpoint).digest("hex");
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "cache-control": "no-store" } });

export default async (req: Request) => {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  // Sans clés (ou en local, où le fichier statique public/api/push répond) : fonction désactivée.
  if (!publicKey || !process.env.VAPID_PRIVATE_KEY) return json({ enabled: false }, req.method === "GET" ? 200 : 503);
  if (req.method === "GET") return json({ enabled: true, publicKey });
  let body: { subscription?: unknown; endpoint?: unknown };
  try { body = await req.json(); } catch { return json({ error: "JSON attendu" }, 400); }
  if (req.method === "POST") {
    const sub = body.subscription as { endpoint: string; keys: { p256dh: string; auth: string } };
    if (!validSubscription(sub)) return json({ error: "Abonnement invalide" }, 400);
    await store().setJSON(id(sub.endpoint), { endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } });
    return json({ ok: true }, 201);
  }
  if (req.method === "DELETE") {
    if (typeof body.endpoint !== "string") return json({ error: "Adresse manquante" }, 400);
    await store().delete(id(body.endpoint));
    return json({ ok: true });
  }
  return json({ error: "Méthode non prise en charge" }, 405);
};

export const config = { path: "/api/push" };
