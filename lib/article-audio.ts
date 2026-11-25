import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import manifest from "@/content/article-audio.json";

/**
 * Version audio enregistrée de chaque article (voix libre Piper « SIWIS », CC BY 4.0),
 * fabriquée par .github/workflows/article-audio.yml. Calculé à la construction du site.
 */
type Entry = { src: string; hash: string; updatedAt: string; duration: number; voice: string };

const testAudio = process.env.MUNDI_TEST_AUDIO;

function entries(): Record<string, Entry> {
  if (!testAudio) return manifest as Record<string, Entry>;
  if (process.env.NETLIFY || process.env.CONTEXT) throw new Error("MUNDI_TEST_AUDIO est réservé aux tests locaux.");
  return JSON.parse(readFileSync(resolve(process.cwd(), testAudio), "utf8"));
}

/** Ajoute `audio` aux articles dont le fichier existe et correspond à la version actuelle. */
export function attachArticleAudio<T extends { slug: string; updatedAt?: string }>(list: T[]): (T & { audio?: string; audioDuration?: number })[] {
  const all = entries();
  return list.map((p) => {
    const e = all[p.slug];
    if (!e || !/^\/media\/audio\/[a-z0-9-]+\.mp3$/.test(e.src)) return p;
    if (p.updatedAt && e.updatedAt && e.updatedAt !== p.updatedAt) return p; // corrigé : en attente du nouvel enregistrement
    if (!testAudio && !existsSync(resolve(process.cwd(), "public" + e.src))) return p;
    return { ...p, audio: e.src, ...(e.duration > 0 ? { audioDuration: e.duration } : {}) };
  });
}
