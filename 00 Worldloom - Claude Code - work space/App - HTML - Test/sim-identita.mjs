// USA-E-GETTA — verifica l'identita' carta (nome + variante + rarita' + finitura).
// node "App - HTML - Test/sim-identita.mjs"
import { espandiListaMazzo, validaMazzo, limiteCopieCarta } from "./src/game/mazziSalvati.js";
import frost from "./src/data/generated/mazzi/frost-land/cards.json" with { type: "json" };
import marbion from "./src/data/generated/mazzi/kepler-452b/cards.json" with { type: "json" };

let ko = 0;
const ok = (c, m) => { console.log((c ? "  ok  " : "  XX  ") + m); if (!c) ko++; };

// 1 — identita' uniche
for (const [id, d] of [["frost-land", frost], ["kepler-452b", marbion]]) {
  const tutte = [...d.carte, ...d.imprevisti];
  const ids = new Set(tutte.map((c) => c.id));
  ok(ids.size === tutte.length, `${id}: ${tutte.length} carte, ${ids.size} identita' distinte`);
  ok(tutte.every((c) => c.id && c.rarita && c.finitura && c.variante), `${id}: ogni carta ha id/rarita/finitura/variante`);
}

// 2 — le due stampe convivono, stesso nome, id diverso, STESSA illustrazione
const coppie = {};
for (const d of [frost, marbion]) for (const c of d.carte) (coppie[c.nome] ??= new Set()).add(c.finitura);
const doppie = Object.entries(coppie).filter(([, f]) => f.size > 1);
ok(doppie.length === 8, `8 carte esistono in due stampe: trovate ${doppie.length} (${doppie.map(([n]) => n).join(", ")})`);
for (const d of [frost, marbion]) {
  for (const [nome] of doppie) {
    const stampe = d.carte.filter((c) => c.nome === nome);
    if (stampe.length < 2) continue;
    ok(new Set(stampe.map((c) => c.id)).size === stampe.length, `${nome}: id diversi per stampa`);
    ok(new Set(stampe.map((c) => c.immagine ?? "-")).size === 1, `${nome}: STESSA illustrazione per entrambe le stampe`);
    ok(new Set(stampe.map((c) => JSON.stringify(c.effetto))).size === 1, `${nome}: stesso effetto (il foil non cambia le regole)`);
  }
}

// 3 — un mazzo salvato NUOVO (per id) prende la stampa giusta
const rainbow = frost.carte.find((c) => c.finitura === "Rainbow");
const normale = frost.carte.find((c) => c.nome === rainbow.nome && c.finitura === "Normale");
ok(!!normale, `${rainbow.nome} esiste anche in Normale`);
const espansoRainbow = espandiListaMazzo(frost, [{ id: rainbow.id, nome: rainbow.nome, quantita: 2 }], "worldloom");
ok(espansoRainbow.length === 2 && espansoRainbow.every((c) => c.finitura === "Rainbow"),
   `lista per id -> 2 copie Rainbow (ottenute: ${espansoRainbow.map((c) => c.finitura).join(",")})`);
const espansoNormale = espandiListaMazzo(frost, [{ id: normale.id, nome: normale.nome, quantita: 2 }], "worldloom");
ok(espansoNormale.length === 2 && espansoNormale.every((c) => c.finitura === "Normale"),
   `lista per id -> 2 copie Normale (ottenute: ${espansoNormale.map((c) => c.finitura).join(",")})`);

// 4 — un mazzo salvato VECCHIO (solo nome) non si svuota
const vecchio = espandiListaMazzo(frost, [{ nome: rainbow.nome, quantita: 3 }], "worldloom");
ok(vecchio.length === 3, `mazzo salvato vecchio (solo nome) -> ${vecchio.length} copie, non si svuota`);

// 5 — validaMazzo accetta entrambi i formati e regge i limiti
const carteVarie = frost.carte.slice(0, 20);
const lista = [];
let tot = 0;
for (const c of carteVarie) {
  const q = Math.min(limiteCopieCarta(c, "worldloom"), 60 - tot);
  if (q <= 0) break;
  lista.push({ id: c.id, nome: c.nome, quantita: q });
  tot += q;
}
const impr = frost.imprevisti.slice(0, 6).map((c) => ({ id: c.id, nome: c.nome, quantita: limiteCopieCarta(c, "imprevisti") }));
const v = validaMazzo(frost, { worldloom: lista, imprevisti: impr });
ok(v.totaleWorldloom === tot, `validaMazzo conta ${v.totaleWorldloom} copie Worldloom`);
const erroriIdentita = v.errori.filter((e) => /non esiste piu/.test(e));
ok(erroriIdentita.length === 0, `validaMazzo: nessun errore di identita' (altri errori, attesi: ${v.errori.join(" | ") || "nessuno"})`);

console.log(ko ? `\n${ko} FALLITI` : "\ntutto ok");
process.exit(ko ? 1 : 0);
