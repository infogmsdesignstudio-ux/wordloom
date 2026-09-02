// ═══════════════════════════════════════════════════════════════════════════════════════════
// Worldloom — DUELLI 1 vs 1 fra Pedine
//
// Fa scontrare le Pedine una contro una con le regole vere del motore e calcola le probabilità
// di vittoria, di doppio KO e di stallo. Serve a rispondere alla domanda concreta:
// "quante possibilità ho di battere questa carta?"
//
//   node Engine/analisi-bilanciamento/duelli_1v1.mjs          → Livello 3 reale
//   node Engine/analisi-bilanciamento/duelli_1v1.mjs 1        → Livello 1 reale
//   node Engine/analisi-bilanciamento/duelli_1v1.mjs modello  → il Livello 3 di Modello_Scala_Ruoli.md
//
// I duelli alternano i turni e metà delle volte fanno iniziare l'uno, metà l'altro, così il
// vantaggio del primo colpo non falsa il risultato. Nessun effetto carta.
// ═══════════════════════════════════════════════════════════════════════════════════════════

import fs from "node:fs";
import path from "node:path";
import { DADI, rng, istanza, REGOLE_ATTUALI, RADICE } from "./motore_bilanciamento.mjs";

const N = 20000;

// ── Le regole del modello proposto: colpo di striscio ⌈A/4⌉, niente contraccolpo ────────────
export const REGOLE_STRISCIO = {
  nome: "Colpo di striscio",
  descrizione: "Chi non supera la statistica del difensore porta comunque a casa ⌈A/4⌉; il contraccolpo è tolto.",
  dado: (d) => DADI[d.archetipo] ?? DADI.Viandante,
  risolvi(simbolo, att, dif) {
    const A = att.attacco;
    if (simbolo === "C") return { dDif: A, dAtt: 0 };
    if (simbolo === "D") return { dDif: 0, dAtt: 0 };
    const v = simbolo === "S" ? dif.attacco : dif.parata;
    if (simbolo === "S" && A === v) return { dDif: 0, dAtt: 0, pareggioMortale: true };
    const diff = A - v;
    if (diff > 0) return { dDif: Math.max(diff, Math.ceil(A / 4)), dAtt: 0 };
    return { dDif: Math.ceil(A / 4), dAtt: 0 };
  },
};

// ── Il Livello 3 del modello "Scala dei Ruoli" ─────────────────────────────────────────────
export const L3_MODELLO = [
  { nome: "Aggressore",  ruolo: "aggressore", attacco: 30, parata: 4,  vita: 26, attacchi: 2, archetipo: "Assalitore" },
  { nome: "Evasivo",     ruolo: "evasivo",    attacco: 22, parata: 6,  vita: 20, attacchi: 3, archetipo: "Effimeri" },
  { nome: "Bilanciato",  ruolo: "bilanciato", attacco: 23, parata: 16, vita: 35, attacchi: 2, archetipo: "Viandante" },
  { nome: "Supporto",    ruolo: "supporto",   attacco: 19, parata: 26, vita: 42, attacchi: 2, archetipo: "Viandante" },
  { nome: "Difensore",   ruolo: "difensore",  attacco: 14, parata: 26, vita: 43, attacchi: 2, archetipo: "Colosso" },
  { nome: "Muro (tank)", ruolo: "tank",       attacco: 12, parata: 26, vita: 82, attacchi: 1, archetipo: "Colosso" },
];

// ── Duello vero ────────────────────────────────────────────────────────────────────────────
function duello(cA, cB, rand, chiInizia, regole) {
  const A = istanza(cA), B = istanza(cB);
  for (let t = 0; t < 300; t++) {
    const att = ((t % 2 === 0) === (chiInizia === "A")) ? A : B;
    const dif = att === A ? B : A;
    for (let k = 0; k < att.attacchi; k++) {
      if (att.hp <= 0 || dif.hp <= 0) break;
      const facce = regole.dado ? regole.dado(dif) : (DADI[dif.archetipo] ?? DADI.Viandante);
      const simbolo = facce[Math.floor(rand() * facce.length)];
      const r = regole.risolvi(simbolo, att, dif);
      if (r.pareggioMortale) { att.hp = 0; dif.hp = 0; break; }
      dif.hp -= r.dDif;
      att.hp -= r.dAtt;
    }
    if (A.hp <= 0 && B.hp <= 0) return "entrambi";
    if (B.hp <= 0) return "A";
    if (A.hp <= 0) return "B";
  }
  return "stallo";
}

export function scontro(cA, cB, regole = REGOLE_ATTUALI, n = N) {
  const rand = rng(4242);
  const c = { A: 0, B: 0, entrambi: 0, stallo: 0 };
  for (let i = 0; i < n; i++) c[duello(cA, cB, rand, i % 2 === 0 ? "A" : "B", regole)]++;
  return { vinceA: c.A / n, vinceB: c.B / n, entrambi: c.entrambi / n, stallo: c.stallo / n };
}

// ── Caricamento delle Pedine reali di un livello ───────────────────────────────────────────
function pedineReali(livello) {
  const MAZZI = path.join(RADICE, "Mazzi");
  const out = [], visti = new Set();
  for (const d of fs.readdirSync(MAZZI, { withFileTypes: true })) {
    if (!d.isDirectory()) continue;
    const f = path.join(MAZZI, d.name, "cards.json");
    if (!fs.existsSync(f)) continue;
    for (const c of JSON.parse(fs.readFileSync(f, "utf8")).carte ?? []) {
      if (c.tipoCarta !== "pedina" && c.tipoCarta !== "alieno") continue;
      if (c.livello !== livello || visti.has(c.nome)) continue;
      visti.add(c.nome);
      out.push(c);
    }
  }
  return out.sort((a, b) => b.attacco - a.attacco);
}

// ── Stampa della matrice ───────────────────────────────────────────────────────────────────
function matrice(pedine, regole, titolo) {
  console.log("═".repeat(108));
  console.log(titolo);
  console.log("═".repeat(108));
  console.log("\n  Le Pedine in gara:");
  pedine.forEach((p) => console.log(
    `    ${p.nome.padEnd(28)} Att ${String(p.attacco).padStart(2)} · Par ${String(p.parata).padStart(2)} · Vita ${String(p.vita).padStart(2)} · ${p.attacchi} att · ${p.archetipo}`));

  const sigla = (n) => n.split(/[ (]/).filter(Boolean).map((w) => w[0]).join("").slice(0, 4).toUpperCase();
  let h = "\n  vince ↓ / contro →   ";
  pedine.forEach((p) => (h += sigla(p.nome).padStart(8)));
  console.log(h);

  let maxE = 0, maxS = 0, minV = 1, maxV = 0;
  for (const A of pedine) {
    let riga = `  ${sigla(A.nome).padEnd(5)} ${A.nome.slice(0, 13).padEnd(14)}`;
    for (const B of pedine) {
      if (A === B) { riga += "       —"; continue; }
      const s = scontro(A, B, regole);
      maxE = Math.max(maxE, s.entrambi);
      maxS = Math.max(maxS, s.stallo);
      minV = Math.min(minV, s.vinceA);
      maxV = Math.max(maxV, s.vinceA);
      riga += `${(s.vinceA * 100).toFixed(0)}%`.padStart(8);
    }
    console.log(riga);
  }
  console.log(`\n  Forbice delle probabilità: ${(minV * 100).toFixed(0)}% – ${(maxV * 100).toFixed(0)}%`);
  console.log(`  Doppio KO massimo: ${(maxE * 100).toFixed(1)}%   ·   stallo massimo: ${(maxS * 100).toFixed(1)}%`);
  if (maxE > 0.3) console.log(`  ⚠  con un doppio KO così alto quello non è un duello, è una lotteria che uccide entrambi.`);
  if (minV === 0 || maxV === 1) console.log(`  ⚠  esistono accoppiamenti a 0% o 100%: qualcuno non ha alcuna possibilità.`);
}

// ── CLI ────────────────────────────────────────────────────────────────────────────────────
if (process.argv[1] && process.argv[1].endsWith("duelli_1v1.mjs")) {
  const arg = process.argv[2] ?? "3";
  if (arg === "modello") {
    matrice(L3_MODELLO, REGOLE_STRISCIO,
      `LIVELLO 3 DEL MODELLO "SCALA DEI RUOLI" — ${N.toLocaleString("it-IT")} duelli per casella`);
  } else {
    const lv = Number(arg);
    matrice(pedineReali(lv), REGOLE_ATTUALI,
      `LIVELLO ${lv} REALE, REGOLE ATTUALI — ${N.toLocaleString("it-IT")} duelli per casella`);
  }
}
