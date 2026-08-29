// Copia i JSON generati (cards.json per mazzo, rules.json) dentro src/data/generated,
// cosi' Vite li incorpora nel bundle in fase di build (necessario per poter aprire
// il gioco come file singolo, senza server: un fetch a runtime non funzionerebbe
// aprendo il file con doppio click, per via del CORS sui file:// locali).
// Non scrive MAI nei file sorgente: quelli restano generati da genera_cards_json.py
// o scritti a mano in Regolamento/.
import { existsSync, mkdirSync, copyFileSync, readdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { MAZZI } from "../src/data/mazzi-registry.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..", ".."); // cartella principale del progetto
const outDir = join(__dirname, "..", "src", "data", "generated");
const outMazziDir = join(outDir, "mazzi");

const cartelleMazzo = {
  "frost-land": join(root, "Mazzi", "Frost Land - Primitivi del ghiaccio"),
  "kepler-452b": join(root, "Mazzi", "Marbion - Kepler - 452 B - Manipolatrici d'aura"),
};

mkdirSync(outMazziDir, { recursive: true });

for (const mazzo of MAZZI) {
  const cartellaMazzo = cartelleMazzo[mazzo.id];
  const cardsPath = cartellaMazzo && join(cartellaMazzo, "cards.json");
  if (cardsPath && existsSync(cardsPath)) {
    const destDir = join(outMazziDir, mazzo.id);
    mkdirSync(destDir, { recursive: true });
    copyFileSync(cardsPath, join(destDir, "cards.json"));
    console.log(`OK  ${mazzo.nome} -> src/data/generated/mazzi/${mazzo.id}/cards.json`);

    // Copia le "Complete cards" (PNG gia' impaginati) cosi' l'app puo' mostrare
    // l'illustrazione al posto della carta HTML in mano e nello zoom.
    // WORLDLOOM_COMPLETE_CARDS_DIR (opt-in, solo per build leggere da condividere come link):
    // se impostata, legge da "Complete cards compressed" invece che da "Complete cards" — il
    // build normale (nessuna variabile impostata) resta invariato, qualita' piena come sempre.
    const nomeCartellaCarte = process.env.WORLDLOOM_COMPLETE_CARDS_DIR || "Complete cards";
    const carteComplete = join(cartellaMazzo, nomeCartellaCarte);
    const destCarteComplete = join(destDir, "complete-cards");
    if (existsSync(carteComplete)) {
      rmSync(destCarteComplete, { recursive: true, force: true });
      mkdirSync(destCarteComplete, { recursive: true });
      let copiate = 0;
      for (const file of readdirSync(carteComplete)) {
        if (file.endsWith(".jpg")) {
          copyFileSync(join(carteComplete, file), join(destCarteComplete, file));
          copiate += 1;
        }
      }
      console.log(`OK  ${mazzo.nome} -> ${copiate} Complete cards -> src/data/generated/mazzi/${mazzo.id}/complete-cards/`);
    } else {
      console.warn(`SKIP ${mazzo.nome}: nessuna cartella "Complete cards" trovata in "${carteComplete}"`);
    }

    // Sfondi campo di battaglia (cap. editor mazzi, richiesta esplicita dell'utente): immagini
    // ambientate nel mondo del mazzo, caricate a mano dall'utente in "Sfondo Campo/" dentro la
    // cartella del mondo — nessuna generazione automatica, questa cartella resta vuota finché
    // l'utente non ci mette dentro dei file. Estensioni ammesse: svg/jpg/png/webp (i due default
    // creati per test sono .svg). Stesso meccanismo delle Complete cards: copiate qui, poi
    // bundlate da useMazzi.js con import.meta.glob.
    const cartellaSfondi = join(cartellaMazzo, "Sfondo Campo");
    const destSfondi = join(destDir, "sfondo-campo");
    if (existsSync(cartellaSfondi)) {
      rmSync(destSfondi, { recursive: true, force: true });
      mkdirSync(destSfondi, { recursive: true });
      let copiati = 0;
      for (const file of readdirSync(cartellaSfondi)) {
        if (/\.(svg|jpg|jpeg|png|webp)$/i.test(file)) {
          copyFileSync(join(cartellaSfondi, file), join(destSfondi, file));
          copiati += 1;
        }
      }
      console.log(`OK  ${mazzo.nome} -> ${copiati} Sfondo Campo -> src/data/generated/mazzi/${mazzo.id}/sfondo-campo/`);
    }
  } else {
    console.warn(`SKIP ${mazzo.nome}: nessun cards.json trovato in "${cardsPath}" (genera prima dal suo Excel)`);
  }
}

const rulesPath = join(root, "Regolamento", "rules.json");
if (existsSync(rulesPath)) {
  copyFileSync(rulesPath, join(outDir, "rules.json"));
  console.log("OK  rules.json -> src/data/generated/rules.json");
} else {
  console.warn(`SKIP rules.json: non trovato in "${rulesPath}"`);
}
