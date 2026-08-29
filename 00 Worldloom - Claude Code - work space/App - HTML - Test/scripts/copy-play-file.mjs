// Copia il build appena generato (dist/index.html, file singolo autosufficiente)
// in GIOCA.html nella radice della cartella app, cosi' c'e' sempre un file
// col nome fisso pronto da aprire a doppio click per fare una partita.
import { existsSync, copyFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const src = join(__dirname, "..", "dist", "index.html");
const dest = join(__dirname, "..", "GIOCA.html");

if (!existsSync(src)) {
  console.error('dist/index.html non trovato: lancia prima "npm run build"');
  process.exit(1);
}

copyFileSync(src, dest);
console.log("OK  dist/index.html -> GIOCA.html (apri questo file per giocare)");
