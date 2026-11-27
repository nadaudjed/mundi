/**
 * Envoi Web Push sans dépendance, avec WebCrypto (disponible dans les Workers et dans Node 22).
 * - Chiffrement du message : RFC 8291 (« aes128gcm »).
 * - Signature du serveur : RFC 8292 (VAPID, jeton ES256).
 * La bibliothèque web-push de Node n'est pas utilisable dans un Worker (modules http et crypto de Node).
 * Testé contre l'implémentation de référence http_ece dans tests/worker-push.test.mjs.
 */
const te = new TextEncoder();

export function b64u(bytes) {
  let bin = "";
  for (const b of new Uint8Array(bytes)) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
export function fromB64u(text) {
  const b64 = String(text).replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}
function concat(...parts) {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let i = 0;
  for (const p of parts) { out.set(p, i); i += p.length; }
  return out;
}
async function hmac(key, data) {
  const k = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", k, data));
}
/** HKDF (extraction puis une seule expansion, longueur ≤ 32 octets). */
async function hkdf(salt, ikm, info, length) {
  const prk = await hmac(salt, ikm);
  return (await hmac(prk, concat(info, new Uint8Array([1])))).slice(0, length);
}

/** Jeton VAPID pour le service de notifications de l'abonnement (Apple, Google, Mozilla…). */
export async function vapidAuthorization(endpoint, { subject, publicKey, privateKey }, now = Date.now()) {
  const pub = fromB64u(publicKey);
  if (pub.length !== 65 || pub[0] !== 4) throw new Error("Clé publique VAPID invalide");
  const key = await crypto.subtle.importKey("jwk",
    { kty: "EC", crv: "P-256", x: b64u(pub.slice(1, 33)), y: b64u(pub.slice(33)), d: privateKey, ext: true },
    { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const header = b64u(te.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const claims = b64u(te.encode(JSON.stringify({ aud: new URL(endpoint).origin, exp: Math.floor(now / 1000) + 12 * 3600, sub: subject })));
  const unsigned = `${header}.${claims}`;
  const signature = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, te.encode(unsigned));
  return `vapid t=${unsigned}.${b64u(signature)}, k=${publicKey}`;
}

/** Chiffre le message pour un abonnement (clés p256dh et auth fournies par le navigateur). */
export async function encryptPayload(payload, { p256dh, auth }, { salt = crypto.getRandomValues(new Uint8Array(16)), localKeys } = {}) {
  const uaPublic = fromB64u(p256dh);
  const authSecret = fromB64u(auth);
  const local = localKeys ?? await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const localPublic = new Uint8Array(await crypto.subtle.exportKey("raw", local.publicKey));
  const uaKey = await crypto.subtle.importKey("raw", uaPublic, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: uaKey }, local.privateKey, 256));
  const ikm = await hkdf(authSecret, shared, concat(te.encode("WebPush: info\0"), uaPublic, localPublic), 32);
  const cek = await hkdf(salt, ikm, te.encode("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(salt, ikm, te.encode("Content-Encoding: nonce\0"), 12);
  const key = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  // Un seul enregistrement, terminé par l'octet 2 (RFC 8188).
  const plain = concat(typeof payload === "string" ? te.encode(payload) : payload, new Uint8Array([2]));
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, key, plain));
  const rs = new Uint8Array([0, 0, 16, 0]); // 4096 octets par enregistrement
  return concat(salt, rs, new Uint8Array([localPublic.length]), localPublic, cipher);
}

/**
 * Envoie une notification. Renvoie le code HTTP du service : 201 = accepté ;
 * 404 ou 410 = abonnement expiré ou retiré, à oublier.
 */
export async function sendPush(subscription, payload, vapid, { ttl = 6 * 3600, urgency = "normal", topic, fetcher = fetch } = {}) {
  const body = await encryptPayload(payload, subscription.keys);
  const headers = {
    Authorization: await vapidAuthorization(subscription.endpoint, vapid),
    "Content-Encoding": "aes128gcm",
    "Content-Type": "application/octet-stream",
    TTL: String(ttl),
    Urgency: urgency,
  };
  if (topic) headers.Topic = topic;
  const res = await fetcher(subscription.endpoint, { method: "POST", headers, body });
  return res.status;
}
