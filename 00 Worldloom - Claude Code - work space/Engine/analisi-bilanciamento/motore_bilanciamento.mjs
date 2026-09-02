// ═══════════════════════════════════════════════════════════════════════════════════════════
// Worldloom — BANCO DI PROVA PARAMETRICO del bilanciamento
//
// Modulo riusabile: permette di sostituire la FUNZIONE DI DANNO e il ROSTER di Pedine e di
// misurare gli stessi indicatori, così due modelli diversi si confrontano sugli stessi numeri.
//
// Il regolamento attuale è codificato in REGOLE_ATTUALI, copia fedele di:
//   src/game/combattimento.js  ·  src/game/costanti.js  ·  src/game/evocazione.js
//
//   import { REGOLE_ATTUALI, valutaRoster, caricaPedineReali } from "./motore_bilanciamento.mjs"
//   const rapporto = valutaRoster(caricaPedineReali(), REGOLE_ATTUALI)
//
// Determinismo: usa un PRNG con seme esplicito, così due esecuzioni danno lo stesso risultato
// e due modelli si confrontano senza rumore di campionamento.
// ═══════════════════════════════════════════════════════════════════════════════════════════

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const QUI = path.dirname(fileURLToPath(import.meta.url));
export const RADICE = path.resolve(QUI, "..", "..");

// ── PRNG deterministico (mulberry32) ───────────────────────────────────────────────────────
export function rng(seme = 20260901) {
  let a = seme >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Costanti di regolamento ────────────────────────────────────────────────────────────────
export const DADI = {
  Viandante:  ["S", "S", "U", "U", "C", "C", "D", "D"],
  Assalitore: ["S", "S", "S", "S", "U", "C", "C", "D"],
  Effimeri:   ["S", "S", "U", "C", "C", "D", "D", "D"],
  Colosso:    ["S", "U", "U", "U", "C", "D", "D", "D"],
  Tessitore:  ["S", "S", "S", "U", "C", "C", "D", "D"],
};
export const ARCHETIPI = Object.keys(DADI);
export const RUOTA = ["Viandante", "Assalitore", "Effimeri", "Colosso", "Tessitore"];

const EFFICACE_CONTRO = {};
RUOTA.forEach((a, i) => (EFFICACE_CONTRO[a] = RUOTA[(i + 1) % RUOTA.length]));

export function calcolaMatchup(archA, archD, ruoloA, ruoloD) {
  if (ruoloA === "bilanciato" || ruoloD === "bilanciato") return "neutro";
  if (EFFICACE_CONTRO[archA] === archD) return "eff";
  if (EFFICACE_CONTRO[archD] === archA) return "ineff";
  return "neutro";
}

// ═══════════════════════════════════════════════════════════════════════════════════════════
// LE REGOLE DI DANNO — sostituibili
//
// Una "regola" espone:
//   nome         etichetta leggibile
//   descrizione  una riga su cosa cambia rispetto all'attuale
//   dado(dif)    le facce del dado che tira il difensore
//   risolvi(simbolo, att, dif, stato) → { dDif, dAtt, pareggioMortale?, nota? }
//
// `att` e `dif` sono ISTANZE in campo: { attacco, parata, vita, hp, attacchi, archetipo, ruolo,
// parataResidua, ... }. `stato` è un oggetto libero per meccaniche con memoria (es. l'usura
// dell'armatura). risolvi() PUÒ mutare l'istanza del difensore (es. calare parataResidua).
// ═══════════════════════════════════════════════════════════════════════════════════════════

// Il pavimento del motore attuale: chi vince il confronto porta a casa almeno metà del proprio
// Attacco, altrimenti fra Pedine con statistiche vicine il danno era quasi zero.
function danneggiaSimmetrico(A, valoreDifensore) {
  const diff = A - valoreDifensore;
  if (diff > 0) return { dDif: Math.max(diff, Math.ceil(A / 2)), dAtt: 0 };
  if (diff < 0) return { dDif: 0, dAtt: -diff };
  return { dDif: 0, dAtt: 0 };
}

export const REGOLE_ATTUALI = {
  nome: "Attuale",
  descrizione: "Il motore così com'è: pavimento ⌈A/2⌉, contraccolpo pieno, pareggio mortale su Spada.",
  dado: (dif) => DADI[dif.archetipo] ?? DADI.Viandante,
  risolvi(simbolo, att, dif) {
    const A = att.attacco;
    if (simbolo === "C") return { dDif: A, dAtt: 0 };
    if (simbolo === "D") return { dDif: 0, dAtt: 0 };
    if (simbolo === "S") {
      if (A === dif.attacco) return { dDif: 0, dAtt: 0, pareggioMortale: true };
      return danneggiaSimmetrico(A, dif.attacco);
    }
    if (simbolo === "U") return danneggiaSimmetrico(A, dif.parata);
    return { dDif: 0, dAtt: 0 };
  },
};

// ═══════════════════════════════════════════════════════════════════════════════════════════
// CARICAMENTO DELLE PEDINE REALI
// ═══════════════════════════════════════════════════════════════════════════════════════════

export function caricaPedineReali({ escludiAttaccoZero = true } = {}) {
  const MAZZI = path.join(RADICE, "Mazzi");
  const out = [];
  for (const dir of fs.readdirSync(MAZZI, { withFileTypes: true })) {
    if (!dir.isDirectory()) continue;
    const f = path.join(MAZZI, dir.name, "cards.json");
    if (!fs.existsSync(f)) continue;
    const j = JSON.parse(fs.readFileSync(f, "utf8"));
    for (const c of j.carte ?? []) {
      if (c.tipoCarta !== "pedina" && c.tipoCarta !== "alieno") continue;
      if (escludiAttaccoZero && c.attacco <= 0) continue;
      out.push({
        nome: c.nome, mazzo: dir.name.split(" - ")[0],
        livello: c.livello, archetipo: c.archetipo, ruolo: c.ruolo,
        attacco: c.attacco, parata: c.parata, vita: c.vita, attacchi: c.attacchi,
      });
    }
  }
  return out;
}

export const istanza = (p) => ({
  ...p,
  hp: p.vita,
  parataResidua: p.parata,
  attaccoCorrente: p.attacco,
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// MISURE ANALITICHE — valore atteso su tutte le 8 facce, nessun campionamento
// ═══════════════════════════════════════════════════════════════════════════════════════════

// Danno atteso di un colpo di `att` contro `dif`, mediato sulle facce del dado del difensore.
export function attesa(att, dif, regole = REGOLE_ATTUALI) {
  const facce = regole.dado(dif);
  let dDif = 0, dAtt = 0, pMortale = 0, pZero = 0;
  const quotaPerFaccia = {};
  for (const f of facce) {
    // istanze fresche: attesa() è pura, non deve consumare stato (es. usura armatura)
    const a = istanza(att), d = istanza(dif);
    const r = regole.risolvi(f, a, d, {}) ?? { dDif: 0, dAtt: 0 };
    dDif += r.dDif; dAtt += r.dAtt;
    quotaPerFaccia[f] = (quotaPerFaccia[f] ?? 0) + r.dDif;
    if (r.pareggioMortale) pMortale += 1 / facce.length;
    else if (r.dDif === 0) pZero += 1 / facce.length;
  }
  const n = facce.length;
  return {
    dDif: dDif / n, dAtt: dAtt / n, pMortale, pZero,
    quotaPerFaccia: Object.fromEntries(Object.entries(quotaPerFaccia).map(([k, v]) => [k, v / n])),
  };
}

// Turni per uccidere: Vita / (danno atteso per colpo × attacchi per turno).
export function ttk(att, dif, regole = REGOLE_ATTUALI) {
  const perTurno = attesa(att, dif, regole).dDif * att.attacchi;
  return perTurno > 0 ? dif.vita / perTurno : Infinity;
}

// ═══════════════════════════════════════════════════════════════════════════════════════════
// SIMULAZIONE — scontro vero, turni alternati, morte vera
// ═══════════════════════════════════════════════════════════════════════════════════════════

export function colpo(A, D, regole, rand, stato = {}) {
  const facce = regole.dado(D);
  const simbolo = facce[Math.floor(rand() * facce.length)];
  const r = regole.risolvi(simbolo, A, D, stato) ?? { dDif: 0, dAtt: 0 };
  if (r.pareggioMortale) { A.hp = 0; D.hp = 0; return simbolo; }
  D.hp -= r.dDif;
  A.hp -= r.dAtt;
  return simbolo;
}

// Duello fra due squadre. Torna "A" | "B" | "stallo" e il numero di turni.
export function duello(squadraA, squadraB, regole, rand, maxTurni = 60) {
  const A = squadraA.map(istanza), B = squadraB.map(istanza);
  const stato = {};
  for (let t = 0; t < maxTurni; t++) {
    const lato = t % 2 === 0 ? A : B, altro = t % 2 === 0 ? B : A;
    for (const c of lato.filter((x) => x.hp > 0)) {
      for (let k = 0; k < c.attacchi; k++) {
        const vivi = altro.filter((x) => x.hp > 0);
        if (!vivi.length || c.hp <= 0) break;
        colpo(c, vivi[0], regole, rand, stato);
      }
    }
    if (!B.some((x) => x.hp > 0)) return { vince: "A", turni: Math.ceil((t + 1) / 2) };
    if (!A.some((x) => x.hp > 0)) return { vince: "B", turni: Math.ceil((t + 1) / 2) };
  }
  return { vince: "stallo", turni: maxTurni };
}

// Percentuale di vittorie della squadra A su N duelli, pescando a caso dai due pool.
export function tassoVittoria(poolA, nA, poolB, nB, regole, { N = 8000, seme = 7 } = {}) {
  const rand = rng(seme);
  let w = 0, stalli = 0;
  for (let i = 0; i < N; i++) {
    const A = Array.from({ length: nA }, () => poolA[Math.floor(rand() * poolA.length)]);
    const B = Array.from({ length: nB }, () => poolB[Math.floor(rand() * poolB.length)]);
    const r = duello(A, B, regole, rand);
    if (r.vince === "A") w++;
    else if (r.vince === "stallo") stalli++;
  }
  return { vittorie: w / N, stalli: stalli / N };
}

// ═══════════════════════════════════════════════════════════════════════════════════════════
// VALUTAZIONE COMPLETA DI UN ROSTER
// ═══════════════════════════════════════════════════════════════════════════════════════════

const mediana = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : NaN; };
const media = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : NaN);

export function valutaRoster(pedine, regole = REGOLE_ATTUALI, { N = 8000 } = {}) {
  const livelli = [...new Set(pedine.map((p) => p.livello))].sort();
  const perLv = (lv) => pedine.filter((p) => p.livello === lv);
  const rapporto = { regole: regole.nome, livelli: {}, economia: {}, ruota: {}, ruoli: {} };

  for (const lv of livelli) {
    const g = perLv(lv);
    const ts = [], zeri = [];
    let quotaCuore = 0, quotaTot = 0, oltre6 = 0, immortali = 0, coppie = 0;
    for (const A of g) for (const D of g) {
      if (A === D) continue;
      coppie++;
      const e = attesa(A, D, regole), t = ttk(A, D, regole);
      ts.push(t === Infinity ? 999 : t);
      zeri.push(e.pZero);
      if (t === Infinity) immortali++;
      if (t === Infinity || t > 6) oltre6++;
      for (const [f, v] of Object.entries(e.quotaPerFaccia)) {
        if (v > 0) { quotaTot += v; if (f === "C") quotaCuore += v; }
      }
    }
    const eco = tassoVittoria(perLv(1).length ? perLv(1) : g, lv, g, 1, regole, { N, seme: 100 + lv });
    rapporto.livelli[lv] = {
      pedine: g.length,
      attacco: { min: Math.min(...g.map((p) => p.attacco)), max: Math.max(...g.map((p) => p.attacco)), mediana: mediana(g.map((p) => p.attacco)) },
      parata:  { min: Math.min(...g.map((p) => p.parata)),  max: Math.max(...g.map((p) => p.parata)),  mediana: mediana(g.map((p) => p.parata)) },
      vita:    { min: Math.min(...g.map((p) => p.vita)),    max: Math.max(...g.map((p) => p.vita)),    mediana: mediana(g.map((p) => p.vita)) },
      ttkMediano: +mediana(ts).toFixed(2),
      oltre6Turni: +(oltre6 / coppie).toFixed(4),
      coppieImmortali: +(immortali / coppie).toFixed(4),
      tiriAVuoto: +media(zeri).toFixed(4),
      quotaCuore: +(quotaCuore / quotaTot).toFixed(4),
      economiaVsL1: +eco.vittorie.toFixed(4), // n×L1 contro 1×questo livello
    };
  }

  // Ruota: quota di matchup che attivano il diritto di ripetizione
  for (const lv of livelli) {
    const g = perLv(lv);
    const c = { eff: 0, ineff: 0, neutro: 0 };
    for (const A of g) for (const D of g) {
      if (A === D) continue;
      c[calcolaMatchup(A.archetipo, D.archetipo, A.ruolo, D.ruolo)]++;
    }
    const tot = c.eff + c.ineff + c.neutro || 1;
    const mix = {};
    g.forEach((p) => (mix[p.archetipo] = (mix[p.archetipo] ?? 0) + 1));
    rapporto.ruota[lv] = { neutro: +(c.neutro / tot).toFixed(4), archetipi: mix, concentrazione: +(Math.max(...Object.values(mix)) / g.length).toFixed(4) };
  }

  // Ruoli: ogni ruolo deve avere un profilo distinto E restare uccidibile.
  for (const lv of livelli) {
    const g = perLv(lv);
    const ruoli = [...new Set(g.map((p) => p.ruolo))];
    rapporto.ruoli[lv] = {};
    for (const r of ruoli) {
      const gr = g.filter((p) => p.ruolo === r);
      // quanto sopravvive questo ruolo (turni per essere ucciso da un attaccante medio del livello)
      const subiti = [];
      for (const D of gr) for (const A of g) { if (A === D) continue; subiti.push(ttk(A, D, regole)); }
      const finiti = subiti.filter((x) => x !== Infinity);
      rapporto.ruoli[lv][r] = {
        n: gr.length,
        attaccoMediano: mediana(gr.map((p) => p.attacco)),
        parataMediana: mediana(gr.map((p) => p.parata)),
        vitaMediana: mediana(gr.map((p) => p.vita)),
        turniPerCadere: finiti.length ? +mediana(finiti).toFixed(2) : Infinity,
        quotaAttaccantiCheNonLoScalfiscono: +(subiti.filter((x) => x === Infinity).length / subiti.length).toFixed(4),
      };
    }
  }

  return rapporto;
}

// ═══════════════════════════════════════════════════════════════════════════════════════════
// I CINQUE CANCELLI — un modello è accettabile solo se li passa tutti
// ═══════════════════════════════════════════════════════════════════════════════════════════

export const CANCELLI = [
  { id: "G1", nome: "Nessuna coppia immortale",
    desc: "Nessun attaccante deve essere matematicamente incapace di uccidere un difensore del suo livello.",
    test: (r) => Object.values(r.livelli).every((l) => l.coppieImmortali === 0) },
  { id: "G2", nome: "Ritmo uniforme",
    desc: "I turni per uccidere mediani devono stare fra 1,5 e 3 a OGNI livello (il L1 di oggi vale 1,9).",
    test: (r) => Object.values(r.livelli).every((l) => l.ttkMediano >= 1.5 && l.ttkMediano <= 3) },
  { id: "G3", nome: "Il dado non è una lotteria",
    desc: "Il Cuore non deve portare più del 60% del danno: Spada e Scudo devono contare.",
    test: (r) => Object.values(r.livelli).every((l) => l.quotaCuore <= 0.60) },
  { id: "G4", nome: "Economia dei tributi onesta",
    desc: "n Pedine di Livello 1 contro 1 di Livello n devono stare fra il 35% e il 65%.",
    test: (r) => Object.entries(r.livelli).filter(([lv]) => +lv > 1)
      .every(([, l]) => l.economiaVsL1 >= 0.35 && l.economiaVsL1 <= 0.65) },
  { id: "G5", nome: "La Ruota gira a ogni livello",
    desc: "Non più del 80% di matchup neutri, e nessun archetipo oltre il 45% di un livello.",
    test: (r) => Object.values(r.ruota).every((x) => x.neutro <= 0.80 && x.concentrazione <= 0.45) },
];

export function verificaCancelli(rapporto) {
  return CANCELLI.map((c) => ({ id: c.id, nome: c.nome, desc: c.desc, passa: !!c.test(rapporto) }));
}

// ═══════════════════════════════════════════════════════════════════════════════════════════
// CLI: node motore_bilanciamento.mjs  →  valuta il roster reale con le regole attuali
// ═══════════════════════════════════════════════════════════════════════════════════════════

if (process.argv[1] && process.argv[1].endsWith("motore_bilanciamento.mjs")) {
  const pedine = caricaPedineReali();
  const r = valutaRoster(pedine, REGOLE_ATTUALI);
  console.log(JSON.stringify(r, null, 2));
  console.log("\nCANCELLI:");
  for (const c of verificaCancelli(r)) console.log(`  ${c.passa ? "✅" : "❌"} ${c.id} ${c.nome}`);
}
