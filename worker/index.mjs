/**
 * Worker MUNDI (ticket #129). Les pages sont des fichiers statiques (dossier out/, liaison ASSETS) ;
 * ce code ne reçoit que /api/* (voir assets.run_worker_first dans wrangler.jsonc) et la tâche planifiée.
 * Les abonnements aux notifications sont gardés dans un Durable Object (stockage SQLite de Cloudflare,
 * créé automatiquement au déploiement, sans réglage manuel).
 */
import { DurableObject } from "cloudflare:workers";
import { handlePush, runEdition } from "./push-api.mjs";

export class PushHub extends DurableObject {
  async add(id, sub) { await this.ctx.storage.put("sub:" + id, sub); }
  async remove(id) { await this.ctx.storage.delete("sub:" + id); await this.ctx.storage.delete("test:" + id); }
  async get(id) { return (await this.ctx.storage.get("sub:" + id)) ?? null; }
  async all() { return [...(await this.ctx.storage.list({ prefix: "sub:" }))].map(([k, v]) => [k.slice(4), v]); }
  async count() { return (await this.ctx.storage.list({ prefix: "sub:" })).size; }
  async getState() { return (await this.ctx.storage.get("edition")) ?? null; }
  async setState(state) { await this.ctx.storage.put("edition", state); }
  async touchTest(id, nowMs) {
    const last = (await this.ctx.storage.get("test:" + id)) ?? 0;
    if (nowMs - last < 60_000) return false;
    await this.ctx.storage.put("test:" + id, nowMs);
    return true;
  }
}

const hubOf = (env) => env.PUSH_HUB.get(env.PUSH_HUB.idFromName("mundi"));

async function readFeed(env) {
  const res = await env.ASSETS.fetch(new Request("https://assets.local/fil.json"));
  return res.ok ? res.json() : null;
}

const worker = {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (pathname === "/api/push" || pathname.startsWith("/api/push/")) return handlePush(request, env, env.PUSH_HUB ? hubOf(env) : null);
    return env.ASSETS.fetch(request);
  },
  async scheduled(_event, env, ctx) {
    if (!env.PUSH_HUB) return;
    ctx.waitUntil(runEdition(env, hubOf(env), { readFeed: () => readFeed(env) }).then((r) => console.log("édition", JSON.stringify(r))));
  },
};

export default worker;
