// BLINDATO — idea 59 Fase 3: forma esatta di s.sequenza per i tre voli (pesca / evocazione /
// spostamento fila). NON cancellare. Congela che pesca/evocazione/spostamento sono passi "anim"
// della fila unica s.sequenza (nomi "pesca" / "evoca" / "sposta"), non più gli stati diretti
// s.pescaInCorso / s.evocazioneInCorso / s.movimentiInCorso (RITIRATI).
// Esegui: node Engine/test-blindati/voli.blindato.mjs
import { gameReducer } from "../../App - HTML - Test/src/game/gameReducer.js";
import { creaCreatura } from "../../App - HTML - Test/src/game/mazzo.js";
import cards from "../../App - HTML - Test/src/data/generated/mazzi/frost-land/cards.json" with { type: "json" };

let falliti = 0;
function ok(cond, msg) {
  if (cond) console.log("  ok  " + msg);
  else {
    console.log("  XX  " + msg);
    falliti++;
  }
}
function nomiFila(s) {
  return (s.sequenza ?? []).map((p) => `${p.tipo}:${p.nome}`);
}
function eq(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

// Idea 59 Fase 4: il turno IA non ha più il campo s.iaInAttesa né la dispatch "avanza-ia" — avanza
// da un passo muta:"ia" della fila, che il <Sequenziatore> chiude a respiro scaduto. Questi due
// helper riproducono esattamente quel percorso, senza cambiare le asserzioni del test.
function accodaPassoIa(s, azione) {
  const id = s.prossimoIdVisivo ?? 1;
  s.prossimoIdVisivo = id + 1;
  (s.sequenza ??= []).push({ id, tipo: "muta", nome: "ia", dati: { azione }, durataMs: 900 });
  return s;
}
function avanzaIaTest(s) {
  return gameReducer(s, { type: "sequenza-passo-concluso", id: s.sequenza[0].id });
}
function nuova(primo = "io") {
  return gameReducer(undefined, {
    type: "nuova-partita",
    cardsData: cards,
    cardsDataAvversario: cards,
    modalitaGioco: "vsIA",
    primoGiocatoreForzato: primo,
  });
}

// ---------------------------------------------------------------------------------------------------
console.log("\n# 1 — prima mano: chi inizia per SECONDO pesca 6 carte → 6 passi anim:pesca da 1 carta (F.2)");
{
  // primoGiocatore = avversario ⇒ "io" gioca per secondo ⇒ 6 carte. Simuliamo il primo turno IA
  // fino a fondo: al turno 1 non si attacca ⇒ fineTurno + iniziaTurno("io"), che è il momento in cui
  // parte la prima mano di "io".
  let s = nuova("avversario");
  s.sequenza = [];
  s.codaVisiva = []; // scarta la scenografia della prima mano IA
  // Idea 59 Fase 4: il turno IA avanza dal passo muta:"ia" della fila (ex dispatch "avanza-ia",
  // RITIRATA). Svuotando la fila qui sopra si è tolto anche quello — lo si rimette com'è fatto dal
  // reducer e lo si conclude, che è ciò che fa il <Sequenziatore> a respiro scaduto.
  s = avanzaIaTest(accodaPassoIa(s, "evoca")); // fase evocazione IA
  s.sequenza = [];
  s.codaVisiva = [];
  s = avanzaIaTest(accodaPassoIa(s, "attacca")); // fase attacco: turno 1 non attacca → fineTurno → iniziaTurno("io")

  const soloPesca = nomiFila(s).filter((n) => n === "anim:pesca");
  ok(soloPesca.length === 6, `6 passi anim:pesca in fila → ${JSON.stringify(nomiFila(s))}`);
  ok(
    (s.sequenza ?? []).filter((p) => p.nome === "pesca").every((p) => p.dati.carte.length === 1),
    "ogni passo pesca porta ESATTAMENTE 1 carta (una alla volta)"
  );
  const ids = (s.sequenza ?? []).filter((p) => p.nome === "pesca").map((p) => p.id);
  ok(ids.every((v, i) => i === 0 || v > ids[i - 1]), "id dei passi crescenti (ordine di distribuzione)");
  ok(!nomiFila(s).includes("anim:dado"), "nessun dado nella fila mentre la prima mano vola");

  // Idea 59 Fase 5: davanti alle 6 pescate ci sono ora i due cartelli di transizione — il "Vespro"
  // del turno IA che si è appena chiuso (accodato da fineTurno DOPO flushSequenza) e il
  // "Rifornimento" del turno nuovo (accodato da iniziaTurno PRIMA della pescata: prima si annuncia
  // la fase, poi le carte volano). Asserzione d'ORDINE esatto, più stretta della sola conta.
  ok(
    eq(nomiFila(s), ["banner:bannerFase", "banner:bannerFase", ...Array(6).fill("anim:pesca")]),
    `ordine [Vespro, Rifornimento, 6×pesca] → ${JSON.stringify(nomiFila(s))}`
  );
  ok(s.sequenza[0].dati.fase === 5 && s.sequenza[0].dati.chiave === "avversario", "1° banner = Vespro attribuito a chi CHIUDE il turno (avversario)");
  ok(s.sequenza[1].dati.fase === 1 && s.sequenza[1].dati.chiave === "io", "2° banner = Rifornimento attribuito a chi APRE il turno (io)");

  // il direttore drena tutta la fila un passo alla volta
  for (let i = 0; i < 8; i++) s = gameReducer(s, { type: "sequenza-passo-concluso", id: s.sequenza[0].id });
  ok(nomiFila(s).filter((n) => n === "anim:pesca").length === 0, "dopo 6 sequenza-passo-concluso: nessun passo pesca residuo");
  ok(eq(nomiFila(s), []), "fila del tutto vuota una volta drenati banner + pescate");
  ok(s.pescaInCorso === undefined, "s.pescaInCorso non esiste più (campo ritirato)");
}

// ---------------------------------------------------------------------------------------------------
console.log("\n# 2 — Rifornimento normale (turno in corso): 1 carta = 1 passo unico; il dado Imprevisti resta in CODA");
{
  let s = nuova("io");
  s = { ...s, sequenza: [], codaVisiva: [] };
  s.giocatoreAttivo = "io";
  s.giocatori.io.turniGiocati = 2; // non è più il primo turno
  s.fase = 1;
  s.turno = 3;
  s = gameReducer(s, { type: "rifornimento", doppio: false });

  // Idea 59 Fase 5 (P2.2): dietro alla pescata c'è ora il banner "2 Vaticinio" — l'ORDINE è il punto
  // del test, il cartello non deve mai precedere il volo della carta appena pescata.
  ok(eq(nomiFila(s), ["anim:pesca", "banner:bannerFase"]), `1 solo passo pesca, poi il Vaticinio → ${JSON.stringify(nomiFila(s))}`);
  ok(s.sequenza[0].dati.carte.length === 1, "il passo porta 1 carta");
  ok(s.sequenza[1].dati.fase === 2, "il banner dietro alla pescata è il Vaticinio (fase 2)");
  ok((s.codaVisiva ?? []).some((e) => e.evento === "dado"), "il dado Imprevisti è su s.codaVisiva, NON nella fila");
  ok(!nomiFila(s).includes("anim:dado"), "la fila non contiene il dado");

  s = gameReducer(s, { type: "sequenza-passo-concluso", id: s.sequenza[0].id });
  ok(eq(nomiFila(s), ["banner:bannerFase"]), "atterrata la carta, resta il solo Vaticinio in scena");
  s = gameReducer(s, { type: "sequenza-passo-concluso", id: s.sequenza[0].id });
  ok(eq(nomiFila(s), []), "fila vuota dopo l'atterraggio della pescata (poi la coda visiva può scorrere)");
}

// ---------------------------------------------------------------------------------------------------
console.log("\n# 3 — Rifornimento doppio: 2 carte in UN passo unico");
{
  let s = nuova("io");
  s = { ...s, sequenza: [], codaVisiva: [] };
  s.giocatoreAttivo = "io";
  s.giocatori.io.turniGiocati = 2;
  s.fase = 1;
  s.turno = 3;
  s = gameReducer(s, { type: "rifornimento", doppio: true });
  ok(eq(nomiFila(s), ["anim:pesca", "banner:bannerFase"]), `un passo pesca, poi il Vaticinio → ${JSON.stringify(nomiFila(s))}`);
  ok(s.sequenza[0].dati.carte.length === 2, "il passo porta 2 carte (stagger interno del componente)");
}

// ---------------------------------------------------------------------------------------------------
console.log("\n# 4 — evocazione di una Pedina lv1: la fila esce [anim:evoca]; la creatura è già in campo");
{
  let s = nuova("io");
  s = { ...s, sequenza: [], codaVisiva: [] };
  s.giocatoreAttivo = "io";
  s.fase = 3;
  s.turno = 3;
  s.giocatori.io.turniGiocati = 2;
  s.giocatori.io.evocazioneNormaleFatta = false;
  s.giocatori.io.primaLinea = [];
  s.giocatori.io.retrovia = [];
  s.giocatori.avversario.magieTrappole = []; // nessuna Trappola → nessuna catena all'evocazione
  const cartaMano = { nome: "Pedina Prova", tipoCarta: "pedina", archetipo: "Colosso", livello: 1, ruolo: "tank", vita: 12, attacco: 3, parata: 3, attacchi: 1, effetto: null, _uid: 99001 };
  s.giocatori.io.mano = [cartaMano];

  s = gameReducer(s, { type: "seleziona-mano", indice: 0, sorgenteRect: { left: 10, top: 10, width: 60, height: 84 } });
  ok(eq(nomiFila(s), ["anim:evoca"]), `fila = [anim:evoca] → ${JSON.stringify(nomiFila(s))}`);
  ok(s.sequenza[0].dati.nome === "Pedina Prova", "dati.nome = carta evocata");
  const inCampo = s.giocatori.io.primaLinea.some((c) => c.id === s.sequenza[0].dati.creaturaId);
  ok(inCampo, "la creatura è GIÀ vera in prima linea (lo stato di gioco non aspetta il volo)");
  ok(s.giocatori.io.mano.length === 0, "la carta è uscita dalla mano");
  ok(s.evocazioneInCorso === undefined, "s.evocazioneInCorso non esiste più (campo ritirato)");

  s = gameReducer(s, { type: "sequenza-passo-concluso", id: s.sequenza[0].id });
  ok(eq(nomiFila(s), []), "fila vuota dopo l'atterraggio");
}

// ---------------------------------------------------------------------------------------------------
console.log("\n# 5 — spostamento: avanzata retrovia→prima linea = [anim:sposta] con 1 movimento 'avanzata'");
{
  let s = nuova("io");
  s = { ...s, sequenza: [], codaVisiva: [] };
  s.giocatoreAttivo = "io";
  s.fase = 3;
  s.turno = 3;
  const carta = (nome) => ({ nome, archetipo: "Colosso", livello: 1, ruolo: "tank", vita: 12, attacco: 3, parata: 3, attacchi: 1, effetto: null });
  const inPrima = creaCreatura(carta("Fronte"));
  const inRetro = creaCreatura(carta("Retro"));
  inPrima.fresca = false;
  inRetro.fresca = false;
  s.giocatori.io.primaLinea = [inPrima];
  s.giocatori.io.retrovia = [inRetro];

  s = gameReducer(s, {
    type: "muovi-creatura",
    creaturaId: inRetro.id,
    rectPropria: { left: 20, top: 200, width: 60, height: 84 },
  });
  ok(eq(nomiFila(s), ["anim:sposta"]), `fila = [anim:sposta] → ${JSON.stringify(nomiFila(s))}`);
  ok(s.sequenza[0].dati.movimenti.length === 1, "1 movimento");
  ok(s.sequenza[0].dati.movimenti[0].direzione === "avanzata", "direzione 'avanzata'");
  ok(s.giocatori.io.primaLinea.some((c) => c.id === inRetro.id), "la creatura è GIÀ in prima linea (stato vero)");
  ok(s.movimentiInCorso === undefined, "s.movimentiInCorso non esiste più (campo ritirato)");

  s = gameReducer(s, { type: "sequenza-passo-concluso", id: s.sequenza[0].id });
  ok(eq(nomiFila(s), []), "fila vuota dopo l'atterraggio");
}

// ---------------------------------------------------------------------------------------------------
console.log("\n# 6 — scambio prima linea/retrovia: [anim:sposta] con 2 movimenti in direzioni opposte");
{
  let s = nuova("io");
  s = { ...s, sequenza: [], codaVisiva: [] };
  s.giocatoreAttivo = "io";
  s.fase = 3;
  s.turno = 3;
  const carta = (nome) => ({ nome, archetipo: "Colosso", livello: 1, ruolo: "tank", vita: 12, attacco: 3, parata: 3, attacchi: 1, effetto: null });
  const a = creaCreatura(carta("A-fronte"));
  const b = creaCreatura(carta("B-fronte"));
  const c = creaCreatura(carta("C-retro"));
  [a, b, c].forEach((x) => (x.fresca = false));
  s.giocatori.io.primaLinea = [a, b];
  s.giocatori.io.retrovia = [c];

  // 1° tocco: seleziona la creatura di prima linea come candidata scambio
  s = gameReducer(s, { type: "muovi-creatura", creaturaId: a.id, rectPropria: { left: 20, top: 20, width: 60, height: 84 } });
  // promuove a modalità scambio
  s = gameReducer(s, { type: "conferma-scambio-retrovia" });
  // 2° tocco sulla creatura di retrovia → completa lo scambio
  s = gameReducer(s, {
    type: "muovi-creatura",
    creaturaId: c.id,
    rectPropria: { left: 20, top: 200, width: 60, height: 84 },
    rectAltra: { left: 20, top: 20, width: 60, height: 84 },
  });

  ok(eq(nomiFila(s), ["anim:sposta"]), `fila = [anim:sposta] → ${JSON.stringify(nomiFila(s))}`);
  const mv = s.sequenza[0]?.dati.movimenti ?? [];
  ok(mv.length === 2, `2 movimenti → ${mv.length}`);
  ok(mv.some((m) => m.direzione === "avanzata") && mv.some((m) => m.direzione === "ritirata"), "una avanzata + una ritirata");
}

// ---------------------------------------------------------------------------------------------------
console.log("\n# 7 — s.sequenza è il master: niente passo 'anim' pesca/evoca/sposta convive con un dado di combattimento");
{
  // Regola strutturale: pesca/evoca/sposta girano in Fase 3, il combattimento in Fase 4 — la fila
  // si svuota tra le due. Qui verifichiamo solo che i nomi di passo Fase 3 e i selettori esistano.
  let s = nuova("io");
  s = { ...s, sequenza: [], codaVisiva: [] };
  s.giocatoreAttivo = "io";
  s.giocatori.io.turniGiocati = 2;
  s.fase = 1;
  s.turno = 3;
  s = gameReducer(s, { type: "rifornimento", doppio: false });
  const passo = s.sequenza[0];
  ok(passo.tipo === "anim" && passo.nome === "pesca", "passo pesca = { tipo:'anim', nome:'pesca' }");
  ok(typeof passo.durataMs === "number" && passo.durataMs > 0, "porta un durataMs esplicito (timeout di sicurezza del direttore)");
  ok(typeof passo.id === "number", "porta un id monotòno per la chiave React");
}

console.log(`\n${falliti === 0 ? "TUTTO BLINDATO ✅" : falliti + " ASSERZIONI FALLITE ❌"}`);
process.exit(falliti === 0 ? 0 : 1);
