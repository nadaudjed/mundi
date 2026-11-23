#!/usr/bin/env node
/** Petit serveur statique pour tester le dossier out/ (tests E2E, aperçu local). */
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { createGzip } from "node:zlib";

const root = join(process.cwd(), "out");
const port = Number(process.env.PORT ?? 4173);
const types = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json",
  ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".ico": "image/x-icon",
  ".woff2": "font/woff2", ".mp4": "video/mp4", ".webm": "video/webm", ".webmanifest": "application/manifest+json", ".vtt": "text/vtt; charset=utf-8", ".txt": "text/plain; charset=utf-8",
};

createServer((req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");
  let path = normalize(join(root, decodeURIComponent(url.pathname)));
  if (!path.startsWith(root)) return void res.writeHead(403).end();
  if (existsSync(path) && statSync(path).isDirectory()) path = join(path, "index.html");
  if (!existsSync(path)) {
    res.writeHead(404, { "content-type": types[".html"] });
    return void createReadStream(join(root, "404.html")).pipe(res);
  }
  const size = statSync(path).size;
  const type = types[extname(path)] ?? "application/octet-stream";
  const range = req.headers.range?.match(/bytes=(\d*)-(\d*)/);
  if (range) {
    // Requêtes partielles : indispensables à la lecture vidéo dans les navigateurs.
    const start = range[1] ? Number(range[1]) : 0;
    const end = range[2] ? Number(range[2]) : size - 1;
    res.writeHead(206, { "content-type": type, "content-range": `bytes ${start}-${end}/${size}`, "accept-ranges": "bytes", "content-length": end - start + 1 });
    return void createReadStream(path, { start, end }).pipe(res);
  }
  // Compression des fichiers texte, comme le fait Netlify en production :
  // les mesures « réseau lent » des tests restent ainsi réalistes.
  if (/^(text\/|application\/(json|manifest)|image\/svg)/.test(type) && /\bgzip\b/.test(req.headers["accept-encoding"] ?? "")) {
    res.writeHead(200, { "content-type": type, "content-encoding": "gzip", vary: "accept-encoding" });
    return void createReadStream(path).pipe(createGzip()).pipe(res);
  }
  res.writeHead(200, { "content-type": type, "content-length": size, "accept-ranges": "bytes" });
  createReadStream(path).pipe(res);
}).listen(port, () => console.log(`MUNDI statique sur http://localhost:${port}`));
