import test from "node:test";
import assert from "node:assert/strict";
import { createECDH, randomBytes } from "node:crypto";
import ece from "http_ece";
import webpush from "web-push";
import { b64u, fromB64u, encryptPayload, vapidAuthorization } from "../worker/webpush.mjs";
import { handlePush, runEdition, subscriptionId } from "../worker/push-api.mjs";

/** Un faux appareil abonné : clés comme celles d'un navigateur. */
function device() {
  const ecdh = createECDH("prime256v1");
  ecdh.generateKeys();
  const auth = randomBytes(16);
  return { ecdh, auth, keys: { p256dh: b64u(ecdh.getPublicKey()), auth: b64u(auth) } };
}
const vapid = { subject: "https://mundi.nadaudjacques004.workers.dev", ...(() => { const k = webpush.generateVAPIDKeys(); return { publicKey: k.publicKey, privateKey: k.privateKey }; })() };

test("Web Push : le message chiffré par le Worker est lu par l'implémentation de référence (RFC 8291)", async () => {
  const d = device();
  const body = await encryptPayload(JSON.stringify({ title: "MUNDI · essai", body: "Éditions : café ☕" }), d.keys);
  const plain = ece.decrypt(Buffer.from(body), { version: "aes128gcm", privateKey: d.ecdh, authSecret: d.auth });
  assert.deepEqual(JSON.parse(plain.toString("utf8")), { title: "MUNDI · essai", body: "Éditions : café ☕" });
});

test("VAPID : jeton ES256 signé avec la clé privée, vérifiable avec la clé publique (RFC 8292)", async () => {
  const header = await vapidAuthorization("https://web.push.apple.com/abc", vapid, Date.parse("2026-11-27T12:00:00Z"));
  const [, token, key] = header.match(/^vapid t=([^,]+), k=(.+)$/);
  assert.equal(key, vapid.publicKey);
  const [h, c, s] = token.split(".");
  const claims = JSON.parse(new TextDecoder().decode(fromB64u(c)));
  assert.equal(claims.aud, "https://web.push.apple.com");
  assert.equal(claims.sub, vapid.subject);
  assert.ok(claims.exp - Date.parse("2026-11-27T12:00:00Z") / 1000 <= 24 * 3600);
  const pub = await crypto.subtle.importKey("raw", fromB64u(vapid.publicKey), { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"]);
  assert.ok(await crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, pub, fromB64u(s), new TextEncoder().encode(`${h}.${c}`)));
});

/** Hub en mémoire, mêmes méthodes que le Durable Object. */
function memoryHub() {
  const subs = new Map(), tests = new Map();
  let state = null;
  return {
    subs,
    add: async (id, s) => { subs.set(id, s); }, remove: async (id) => { subs.delete(id); },
    get: async (id) => subs.get(id) ?? null, all: async () => [...subs],
    getState: async () => state, setState: async (s) => { state = s; },
    touchTest: async (id, now) => { if (now - (tests.get(id) ?? 0) < 60_000) return false; tests.set(id, now); return true; },
  };
}
const env = { VAPID_PUBLIC_KEY: vapid.publicKey, VAPID_PRIVATE_KEY: vapid.privateKey, PUSH_HUB: {} };
const site = "https://mundi.nadaudjacques004.workers.dev";
const req = (method, path, body, origin = site) => new Request(site + path, { method, headers: { "content-type": "application/json", ...(origin ? { origin } : {}) }, body: body ? JSON.stringify(body) : undefined });

test("/api/push : indisponible sans clés (« enabled: false »), clé publique sinon", async () => {
  const off = await handlePush(req("GET", "/api/push"), {}, null);
  assert.deepEqual(await off.json(), { enabled: false });
  assert.equal((await handlePush(req("POST", "/api/push", {}), {}, null)).status, 503);
  const on = await handlePush(req("GET", "/api/push"), env, memoryHub());
  assert.deepEqual(await on.json(), { enabled: true, publicKey: vapid.publicKey });
});

test("/api/push : inscription, refus d'un abonnement invalide ou d'un autre site, désabonnement", async () => {
  const hub = memoryHub();
  const d = device();
  const sub = { endpoint: "https://fcm.googleapis.com/fcm/send/abc", keys: d.keys };
  assert.equal((await handlePush(req("POST", "/api/push", { subscription: { endpoint: "http://x", keys: d.keys } }), env, hub)).status, 400);
  assert.equal((await handlePush(req("POST", "/api/push", { subscription: sub }, "https://evil.example"), env, hub)).status, 403);
  assert.equal((await handlePush(req("POST", "/api/push", { subscription: sub }), env, hub)).status, 201);
  assert.equal((await handlePush(req("POST", "/api/push", { subscription: sub }), env, hub)).status, 201);
  assert.equal(hub.subs.size, 1, "réinscrire le même appareil ne crée pas de doublon");
  assert.ok(hub.subs.has(await subscriptionId(sub.endpoint)));
  assert.equal((await handlePush(req("DELETE", "/api/push", { endpoint: sub.endpoint }), env, hub)).status, 200);
  assert.equal(hub.subs.size, 0);
});

test("/api/push/test : envoie un essai chiffré à cet appareil seulement, une fois par minute", async () => {
  const hub = memoryHub();
  const d = device();
  const sub = { endpoint: "https://updates.push.services.mozilla.com/wpush/v2/xyz", keys: d.keys };
  await handlePush(req("POST", "/api/push", { subscription: sub }), env, hub);
  const sent = [];
  const fetcher = async (url, init) => { sent.push({ url, init }); return new Response(null, { status: 201 }); };
  let t = 1_000_000;
  const first = await handlePush(req("POST", "/api/push/test", { endpoint: sub.endpoint }), env, hub, { fetcher, now: () => t });
  assert.equal(first.status, 200);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].url, sub.endpoint);
  assert.equal(sent[0].init.headers["Content-Encoding"], "aes128gcm");
  assert.match(sent[0].init.headers.Authorization, /^vapid t=.+, k=/);
  const plain = ece.decrypt(Buffer.from(sent[0].init.body), { version: "aes128gcm", privateKey: d.ecdh, authSecret: d.auth });
  assert.match(JSON.parse(plain.toString()).title, /essai/);
  assert.equal((await handlePush(req("POST", "/api/push/test", { endpoint: sub.endpoint }), env, hub, { fetcher, now: () => t + 1000 })).status, 429);
  assert.equal((await handlePush(req("POST", "/api/push/test", { endpoint: "https://fcm.googleapis.com/autre" }), env, hub, { fetcher })).status, 404);
});

test("Tâche planifiée : rien au premier passage, une notification quand une publication apparaît, abonnements expirés oubliés", async () => {
  const hub = memoryHub();
  const a = device(), b = device();
  await hub.add("a", { endpoint: "https://push.example/a", keys: a.keys });
  await hub.add("b", { endpoint: "https://push.example/b", keys: b.keys });
  const calls = [];
  const fetcher = async (url) => { calls.push(url); return new Response(null, { status: url.endsWith("/b") ? 410 : 201 }); };
  const feed1 = { items: [{ slug: "x", title: "Ancien" }] };
  const feed2 = { items: [{ slug: "y", title: "Cobalt : le Congo prolonge ses quotas" }, { slug: "x", title: "Ancien" }] };
  const first = await runEdition(env, hub, { readFeed: async () => feed1, fetcher, now: new Date("2026-11-27T07:00:00Z") });
  assert.equal(first.sent, 0);
  assert.equal(calls.length, 0);
  const second = await runEdition(env, hub, { readFeed: async () => feed2, fetcher, now: new Date("2026-11-27T07:10:00Z") });
  assert.equal(second.sent, 1);
  assert.equal(second.removed, 1);
  assert.match(second.message, /édition du matin/);
  assert.deepEqual([...hub.subs.keys()], ["a"]);
  const third = await runEdition(env, hub, { readFeed: async () => feed2, fetcher, now: new Date("2026-11-27T07:20:00Z") });
  assert.equal(third.sent, 0, "même fil : pas de seconde notification");
  assert.equal((await runEdition({}, hub, { readFeed: async () => feed2 })).skipped, "notifications non configurées");
});
