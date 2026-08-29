/* Server statico minimo per guardare il sito in locale.
   Non fa parte del sito pubblicato: serve solo a svilupparlo.

   Uso:  node "Sito web - Social/worldloomtcg/serve.mjs"        → http://localhost:4321
         node "Sito web - Social/worldloomtcg/serve.mjs" 8080   → altra porta

   (Serve un server vero e non l'apertura del file dal disco, perché la galleria
   carica assets/data/carte.json via fetch: da file:// il browser lo blocca.) */
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { join, extname, normalize, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const RADICE = dirname(fileURLToPath(import.meta.url));
const PORTA = Number(process.argv[2] || 4321);

const TIPI = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ttf": "font/ttf",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
};

createServer(async (req, res) => {
  try {
    let percorso = decodeURIComponent(req.url.split("?")[0]);
    if (percorso.endsWith("/")) percorso += "index.html";
    const file = normalize(join(RADICE, percorso));
    /* non si esce dalla cartella del sito */
    if (!file.startsWith(normalize(RADICE))) {
      res.writeHead(403).end("403");
      return;
    }
    const info = await stat(file);
    if (info.isDirectory()) {
      res.writeHead(302, { Location: percorso + "/" }).end();
      return;
    }
    res.writeHead(200, {
      "Content-Type": TIPI[extname(file).toLowerCase()] ?? "application/octet-stream",
    });
    res.end(await readFile(file));
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("404");
  }
}).listen(PORTA, () => console.log(`Sito Worldloom su http://localhost:${PORTA}`));
