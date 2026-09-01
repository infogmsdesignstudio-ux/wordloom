// ═══════════════════════════════════════════════════════════════════════════════════════════
// Worldloom — analisi matematica dei delta fra Pedine
//
// Legge i cards.json veri e applica ESATTAMENTE la matematica del motore:
//   src/game/combattimento.js  (risolviSimbolo, danneggiaSimmetrico, pareggio mortale)
//   src/game/costanti.js       (DADI_ARCHETIPO, calcolaMatchup)
//   src/game/evocazione.js     (valoreTributi: un L2 costa 2 tributi, un L3 ne costa 3)
//
// Baseline nuda e VOLUTA: niente effetti carta, niente Magie/Trappole, niente diritto di
// ripetizione, niente effetti di ruolo. Serve a misurare le STATISTICHE, non la partita intera.
//
//   node Engine/analisi-bilanciamento/analisi_delta.mjs
//
// Rilanciarlo dopo ogni modifica alla curva di bilanciamento per vedere come si spostano
// ritmo (turni per uccidere), texture (tiri a vuoto, quota Cuore) ed economia dei tributi.
// ═══════════════════════════════════════════════════════════════════════════════════════════

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const QUI = path.dirname(fileURLToPath(import.meta.url));
const RADICE = path.resolve(QUI, "..", "..");
const MAZZI = path.join(RADICE, "Mazzi");

// ── Costanti del regolamento (copia fedele di src/game/costanti.js) ────────────────────────
const DADI = {
  Viandante:  ["S", "S", "U", "U", "C", "C", "D", "D"],
  Assalitore: ["S", "S", "S", "S", "U", "C", "C", "D"],
  Effimeri:   ["S", "S", "U", "C", "C", "D", "D", "D"],
  Colosso:    ["S", "U", "U", "U", "C", "D", "D", "D"],
  Tessitore:  ["S", "S", "S", "U", "C", "C", "D", "D"],
};
const RUOTA = ["Viandante", "Assalitore", "Effimeri", "Colosso", "Tessitore"];
const EFFICACE_CONTRO = {};
RUOTA.forEach((a, i) => (EFFICACE_CONTRO[a] = RUOTA[(i + 1) % RUOTA.length]));

function calcolaMatchup(archA, archD, ruoloA, ruoloD) {
  if (ruoloA === "bilanciato" || ruoloD === "bilanciato") return "neutro";
  if (EFFICACE_CONTRO[archA] === archD) return "eff";
  if (EFFICACE_CONTRO[archD] === archA) return "ineff";
  return "neutro";
}

// Range dichiarati in Regolamento/rules.json (documento di game design, non letto a runtime).
const RANGE_DICHIARATI = {
  1: { att: [1, 12],  par: [1, 12],  vita: [6, 16] },
  2: { att: [10, 18], par: [10, 18], vita: [14, 26] },
  3: { att: [16, 30], par: [16, 30], vita: [24, 40] },
};

// ── Caricamento delle Pedine reali ─────────────────────────────────────────────────────────
function caricaPedine() {
  const out = [];
  for (const dir of fs.readdirSync(MAZZI, { withFileTypes: true })) {
    if (!dir.isDirectory()) continue;
    const f = path.join(MAZZI, dir.name, "cards.json");
    if (!fs.existsSync(f)) continue;
    const j = JSON.parse(fs.readFileSync(f, "utf8"));
    for (const c of j.carte ?? []) {
      // il tipo si chiama "pedina" dal 2026-08-29, "alieno" resta accettato in lettura
      if (c.tipoCarta !== "pedina" && c.tipoCarta !== "alieno") continue;
      out.push({ mazzo: dir.name.split(" - ")[0], ...c });
    }
  }
  return out;
}

const PEDINE = caricaPedine();
// Guardiano di Marbion ha Attacco 0: non può far danno su nessuna faccia. Escluso dai calcoli
// di combattimento (falserebbe le medie), ma segnalato a parte nella sezione dei fuori-range.
const perLivello = (lv, conAttaccoZero = false) =>
  PEDINE.filter((p) => p.livello === lv && (conAttaccoZero || p.attacco > 0));

// ── Matematica del singolo colpo (copia fedele di combattimento.js) ────────────────────────
function danneggiaSimmetrico(A, valoreDifensore) {
  const diff = A - valoreDifensore;
  if (diff > 0) return { dDif: Math.max(diff, Math.ceil(A / 2)), dAtt: 0 };
  if (diff < 0) return { dDif: 0, dAtt: -diff };
  return { dDif: 0, dAtt: 0 };
}

function risolviSimbolo(simbolo, att, dif) {
  const A = att.attacco;
  if (simbolo === "C") return { dDif: A, dAtt: 0 };
  if (simbolo === "D") return { dDif: 0, dAtt: 0 };
  if (simbolo === "S") {
    if (A === dif.attacco) return { dDif: 0, dAtt: 0, pareggioMortale: true };
    return danneggiaSimmetrico(A, dif.attacco);
  }
  if (simbolo === "U") return danneggiaSimmetrico(A, dif.parata);
  return { dDif: 0, dAtt: 0 };
}

// Valore atteso su tutte le 8 facce del dado del DIFENSORE (è lui che tira).
function attesa(att, dif) {
  const facce = DADI[dif.archetipo] ?? DADI.Viandante;
  let dDif = 0, dAtt = 0, pMortale = 0, pZero = 0;
  for (const f of facce) {
    const r = risolviSimbolo(f, att, dif);
    dDif += r.dDif;
    dAtt += r.dAtt;
    if (r.pareggioMortale) pMortale += 1 / facce.length;
    else if (r.dDif === 0) pZero += 1 / facce.length;
  }
  return { dDif: dDif / facce.length, dAtt: dAtt / facce.length, pMortale, pZero };
}

const ttk = (att, dif) => {
  const perTurno = attesa(att, dif).dDif * att.attacchi;
  return perTurno > 0 ? dif.vita / perTurno : Infinity;
};

// ── Monte Carlo: scontro vero, turni alternati ─────────────────────────────────────────────
const tira = (arch) => (DADI[arch] ?? DADI.Viandante)[Math.floor(Math.random() * 8)];
const istanza = (p) => ({ attacco: p.attacco, parata: p.parata, hp: p.vita, archetipo: p.archetipo, n: p.attacchi });

function colpo(A, D) {
  const r = risolviSimbolo(tira(D.archetipo), A, D);
  if (r.pareggioMortale) { A.hp = 0; D.hp = 0; return; }
  D.hp -= r.dDif;
  A.hp -= r.dAtt;
}

function squadra(lv, n) {
  const pool = perLivello(lv);
  return Array.from({ length: n }, () => istanza(pool[Math.floor(Math.random() * pool.length)]));
}

function duello(lvA, nA, lvB, nB) {
  const A = squadra(lvA, nA), B = squadra(lvB, nB);
  for (let t = 0; t < 60; t++) {
    const lato = t % 2 === 0 ? A : B, altro = t % 2 === 0 ? B : A;
    for (const c of lato.filter((x) => x.hp > 0)) {
      for (let k = 0; k < c.n; k++) {
        const vivi = altro.filter((x) => x.hp > 0);
        if (!vivi.length) break;
        colpo(c, vivi[0]);
      }
    }
    if (!B.some((x) => x.hp > 0)) return "A";
    if (!A.some((x) => x.hp > 0)) return "B";
  }
  return "stallo";
}

const N = 20000;
const vittorie = (lvA, nA, lvB, nB) => {
  let w = 0;
  for (let i = 0; i < N; i++) if (duello(lvA, nA, lvB, nB) === "A") w++;
  return w / N;
};

// ── Utilità ────────────────────────────────────────────────────────────────────────────────
const mediana = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
const media = (a) => a.reduce((x, y) => x + y, 0) / a.length;
const pct = (x) => `${(x * 100).toFixed(1)}%`;
const riga = (c = "─") => c.repeat(96);
const titolo = (t) => { console.log(`\n${riga("═")}\n${t}\n${riga("═")}`); };

// ═══════════════════════════════════════════════════════════════════════════════════════════
titolo("1 · FOTOGRAFIA DELLE STATISTICHE PER LIVELLO");

for (const lv of [1, 2, 3]) {
  const g = perLivello(lv);
  const A = g.map((p) => p.attacco), P = g.map((p) => p.parata), V = g.map((p) => p.vita);
  console.log(`\nLIVELLO ${lv} — ${g.length} Pedine (Attacco > 0)`);
  console.log(`  Attacco  ${Math.min(...A)}–${Math.max(...A)}   mediana ${mediana(A)}   media ${media(A).toFixed(1)}`);
  console.log(`  Parata   ${Math.min(...P)}–${Math.max(...P)}   mediana ${mediana(P)}   media ${media(P).toFixed(1)}`);
  console.log(`  Vita     ${Math.min(...V)}–${Math.max(...V)}   mediana ${mediana(V)}   media ${media(V).toFixed(1)}`);
  console.log(`  ► Attacco/Parata ${(media(A) / media(P)).toFixed(2)}   ·   Vita/Attacco ${(media(V) / media(A)).toFixed(2)}`);
}
console.log(`\n  Il rapporto Attacco/Parata è la spia: sopra 1 le facce Spada e Scudo funzionano,`);
console.log(`  sotto 1 si spengono e resta solo il Cuore.`);

// ═══════════════════════════════════════════════════════════════════════════════════════════
titolo("2 · LA RADICE — le finestre Attacco e Parata dei livelli non si sovrappongono");

console.log("\n  Quota di matchup in cui l'attaccante supera la Parata del difensore (colpo su Scudo):");
console.log("              → Parata L1   → Parata L2   → Parata L3");
for (const a of [1, 2, 3]) {
  let out = `  Att L${a}  `;
  for (const d of [1, 2, 3]) {
    let ok = 0, tot = 0;
    for (const A of perLivello(a)) for (const D of perLivello(d)) {
      if (A === D) continue;
      tot++;
      if (A.attacco > D.parata) ok++;
    }
    out += `${((ok / tot) * 100).toFixed(0)}%`.padStart(13);
  }
  console.log(out);
}
const attMax = (lv) => Math.max(...perLivello(lv).map((p) => p.attacco));
const parMin = (lv) => Math.min(...perLivello(lv).map((p) => p.parata));
console.log(`\n  Attacco massimo L1 = ${attMax(1)} · Attacco massimo L2 = ${attMax(2)} · Parata minima L3 = ${parMin(3)}`);
console.log(`  ⇒ nessuna Pedina di Livello 1 o 2 può superare la Parata di nessuna Pedina di Livello 3.`);
console.log(`  ⇒ contro un L3 resta una sola faccia utile su otto: il Cuore.`);
console.log(`\n  Nota di progetto: rules.json dichiara Attacco e Parata con lo STESSO intervallo a ogni`);
console.log(`  livello ([1,12]/[1,12] · [10,18]/[10,18] · [16,30]/[16,30]). L'asimmetria che fa`);
console.log(`  funzionare il Livello 1 non è progettata: dipende da come sono state scritte le carte.`);

// ═══════════════════════════════════════════════════════════════════════════════════════════
titolo("3 · RITMO E TEXTURE — tutte le coppie dello stesso livello");

for (const lv of [1, 2, 3]) {
  const g = perLivello(lv);
  const ts = [], zeri = [];
  let quotaCuore = 0, quotaTot = 0, oltre6 = 0, coppie = 0;
  for (const A of g) for (const D of g) {
    if (A === D) continue;
    coppie++;
    const e = attesa(A, D), t = ttk(A, D);
    ts.push(t === Infinity ? 99 : t);
    zeri.push(e.pZero);
    if (t === Infinity || t > 6) oltre6++;
    const facce = DADI[D.archetipo] ?? DADI.Viandante;
    for (const f of facce) {
      const r = risolviSimbolo(f, A, D);
      if (r.dDif > 0) { quotaTot += r.dDif; if (f === "C") quotaCuore += r.dDif; }
    }
  }
  console.log(`\nLIVELLO ${lv} — ${coppie} matchup`);
  console.log(`  Turni per uccidere (mediana)   ${mediana(ts).toFixed(2)}`);
  console.log(`  Coppie oltre 6 turni           ${pct(oltre6 / coppie)}`);
  console.log(`  Colpi che fanno zero danni     ${pct(media(zeri))}`);
  console.log(`  Danno che arriva dal Cuore     ${pct(quotaCuore / quotaTot)}`);
}

// ═══════════════════════════════════════════════════════════════════════════════════════════
titolo("4 · L'ECONOMIA DEI TRIBUTI — un L2 costa 2 tributi, un L3 ne costa 3");

console.log(`\n  Monte Carlo, ${N.toLocaleString("it-IT")} duelli per riga, turni alternati.`);
console.log(`  A parità di tributi spesi il risultato giusto sarebbe ~50%.\n`);
for (const [nA, lvB, nota] of [[2, 1, "controprova dentro il livello"], [2, 2, "pari prezzo"], [3, 3, "pari prezzo"]]) {
  const v = vittorie(1, nA, lvB, 1);
  console.log(`  ${nA}× Livello 1 contro 1× Livello ${lvB}  →  gruppo ${pct(v).padStart(6)}  ·  singolo ${pct(1 - v).padStart(6)}   (${nota})`);
}

// ═══════════════════════════════════════════════════════════════════════════════════════════
titolo("5 · LA RUOTA DEGLI ARCHETIPI — quanto si attiva il diritto di ripetizione");

for (const lv of [1, 2, 3]) {
  const g = perLivello(lv, true);
  const c = { eff: 0, ineff: 0, neutro: 0 };
  for (const A of g) for (const D of g) {
    if (A === D) continue;
    c[calcolaMatchup(A.archetipo, D.archetipo, A.ruolo, D.ruolo)]++;
  }
  const tot = c.eff + c.ineff + c.neutro;
  const mix = {};
  g.forEach((p) => (mix[p.archetipo] = (mix[p.archetipo] ?? 0) + 1));
  const mixTxt = Object.entries(mix).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(" · ");
  console.log(`\nLIVELLO ${lv} — ${tot} matchup`);
  console.log(`  efficace ${pct(c.eff / tot)} · inefficace ${pct(c.ineff / tot)} · NEUTRO ${pct(c.neutro / tot)}`);
  console.log(`  archetipi: ${mixTxt}`);
}
console.log(`\n  Un matchup neutro non dà a nessuno dei due il diritto di ripetizione: la Ruota non fa nulla.`);
console.log(`  Il dado del Colosso è il più chiuso del gioco: 1 Cuore e 3 Schivate su 8 facce.`);

// ═══════════════════════════════════════════════════════════════════════════════════════════
titolo("6 · PEDINE FUORI DAI RANGE DICHIARATI IN rules.json");

let fuori = 0;
for (const lv of [1, 2, 3]) {
  const r = RANGE_DICHIARATI[lv];
  const righe = [];
  for (const p of perLivello(lv, true)) {
    const bad = [];
    if (p.attacco < r.att[0] || p.attacco > r.att[1]) bad.push(`Attacco ${p.attacco} ∉ [${r.att}]`);
    if (p.parata < r.par[0] || p.parata > r.par[1]) bad.push(`Parata ${p.parata} ∉ [${r.par}]`);
    if (p.vita < r.vita[0] || p.vita > r.vita[1]) bad.push(`Vita ${p.vita} ∉ [${r.vita}]`);
    if (bad.length) { fuori++; righe.push(`    ${p.nome.padEnd(34)} ${bad.join(" · ")}`); }
  }
  if (righe.length) {
    console.log(`\n  Livello ${lv} — ${righe.length} fuori range`);
    righe.forEach((x) => console.log(x));
  }
}
console.log(`\n  Totale: ${fuori} Pedine su ${PEDINE.length} fuori dai range dichiarati.`);
console.log(`  I range corretti cadono da soli una volta scelta la curva di bilanciamento.\n`);
