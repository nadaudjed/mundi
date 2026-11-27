"use client";

/**
 * Notifications d'édition (Web Push), avec l'accord explicite de la personne.
 * Le navigateur fournit une adresse technique d'abonnement, gardée par le site
 * (Worker Cloudflare, worker/push-api.mjs) : ni nom, ni e-mail, ni historique de lecture.
 */
export type PushState = "loading" | "unsupported" | "ios-install" | "unavailable" | "denied" | "off" | "on";
const API = "/api/push";

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}
function isIos() {
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
}

function keyBytes(base64url: string) {
  const b64 = (base64url + "=".repeat((4 - (base64url.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

async function registration() {
  return (await navigator.serviceWorker.getRegistration("/")) ?? navigator.serviceWorker.register("/sw.js", { scope: "/" });
}

async function publicKey(): Promise<string | null> {
  try {
    const res = await fetch(API, { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as { publicKey?: string };
    return data.publicKey ?? null;
  } catch { return null; }
}

export async function pushState(): Promise<PushState> {
  // Sur iPhone, les notifications ne sont possibles que dans l'application installée.
  if (isIos() && !isStandalone()) return "ios-install";
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return "unsupported";
  if (!(await publicKey())) return "unavailable";
  if (Notification.permission === "denied") return "denied";
  const reg = await navigator.serviceWorker.getRegistration("/");
  const sub = await reg?.pushManager.getSubscription();
  return sub && Notification.permission === "granted" ? "on" : "off";
}

/** À appeler depuis un geste (toucher le bouton) : demande l'accord puis s'abonne. */
export async function enablePush(): Promise<PushState> {
  const key = await publicKey();
  if (!key) return "unavailable";
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return permission === "denied" ? "denied" : "off";
  const reg = await registration();
  await navigator.serviceWorker.ready;
  const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(key) }));
  const res = await fetch(API, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ subscription: sub.toJSON() }) });
  if (!res.ok) { await sub.unsubscribe(); return "unavailable"; }
  return "on";
}

export async function disablePush(): Promise<PushState> {
  const reg = await navigator.serviceWorker.getRegistration("/");
  const sub = await reg?.pushManager.getSubscription();
  if (sub) {
    await fetch(API, { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint }) }).catch(() => {});
    await sub.unsubscribe();
  }
  return "off";
}

/** Envoie une notification d'essai à cet appareil seulement (au plus une par minute). */
export async function testPush(): Promise<boolean> {
  const reg = await navigator.serviceWorker.getRegistration("/");
  const sub = await reg?.pushManager.getSubscription();
  if (!sub) return false;
  const res = await fetch(`${API}/test`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint }) }).catch(() => null);
  return Boolean(res?.ok);
}
