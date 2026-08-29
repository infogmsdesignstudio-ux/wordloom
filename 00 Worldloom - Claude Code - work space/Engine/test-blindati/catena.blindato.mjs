// BLINDATO — idea 59 Fase 2: forma esatta di s.sequenza durante una catena di effetti.
// NON cancellare. Congela come i frame della catena diventano passi scelta:catena / muta:catenaRisoluzione
// nell'unica fila s.sequenza (Idea59_Coda_Step.md §10 Fase 2, §4/§13).
// Esegui: node Engine/test-blindati/catena.blindato.mjs
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
}
function avanzaIaTest(s) {
  return gameReducer(s, { type: "sequenza-passo-concluso", id: s.sequenza[0].id });
}

function trappola(nome, codice) {
  return { carta: { nome, tipoCarta: "trappola", effetto: { codice, testo: nome } }, coperta: true, pronta: true };
}

// IA attacca la mia creatura; io ho N Trappole "pronta" eleggibili per "attaccoDichiarato".
function scenario({ trappoleIo = [] } = {}) {
  let s = gameReducer(undefined, {
    type: "nuova-partita",
    cardsData: cards,
    cardsDataAvversario: cards,
    modalitaGioco: "vsIA",
    primoGiocatoreForzato: "avversario",
  });
  const carta = (nome, arch, ruolo, vita, atk) => ({
    nome, archetipo: arch, livello: 3, ruolo, vita, attacco: atk, parata: 2, attacchi: 1, effetto: null,
  });
  const attaccante = creaCreatura(carta("Attaccante IA", "Assalitore", "aggressore", 30, 12));
  const difensore = creaCreatura(carta("Difensore Mio", "Viandante", "tank", 30, 4));
  attaccante.fresca = false;
  difensore.fresca = false;
  s.turno = 3;
  // Partita in corso, non turno 1 (vedi nota in combattimento.blindato.mjs): niente prima mano
  // staggerata nella fila se proseguiSeIA innesca un cambio turno durante la risoluzione.
  s.giocatori.io.turniGiocati = 2;
  s.giocatori.avversario.turniGiocati = 3;
  s.fase = 4;
  s.giocatoreAttivo = "avversario";
  s.giocatori.avversario.primaLinea = [attaccante];
  s.giocatori.avversario.retrovia = [];
  s.giocatori.io.primaLinea = [difensore];
  s.giocatori.io.retrovia = [];
  s.giocatori.io.magieTrappole = trappoleIo;
  s.sequenza = [];
  s.codaVisiva = [];
  accodaPassoIa(s, "attacca"); // ex s.iaInAttesa = "attacca" (idea 59 Fase 4)
  return { s, attaccante, difensore };
}

// ---------------------------------------------------------------------------------------------------
console.log("\n# 1 — nessuna Trappola eleggibile: nessuna catena, dritti a scelta:difendi (parità Fase 1)");
{
  const rnd = Math.random;
  Math.random = () => 0;
  let { s } = scenario({ trappoleIo: [] });
  s = avanzaIaTest(s);
  ok(eq(nomiFila(s), ["scelta:difendi"]), "fila = [scelta:difendi] → " + JSON.stringify(nomiFila(s)));
  ok(s.catena == null, "s.catena resta null (finestra mai aperta)");
  Math.random = rnd;
}

// ---------------------------------------------------------------------------------------------------
console.log("\n# 2 — ho 1 Trappola eleggibile: la finestra apre come passo scelta:catena");
{
  const rnd = Math.random;
  Math.random = () => 0;
  let { s } = scenario({ trappoleIo: [trappola("Annulla Colpo", "cancel")] });
  s = avanzaIaTest(s);
  ok(eq(nomiFila(s), ["scelta:catena"]), "dopo il passo ia → " + JSON.stringify(nomiFila(s)));
  ok(s.catena && s.catena.turnoDiPriorita === "io", "s.catena aperta, priorità a io");
  ok(Array.isArray(s.catena.risolti) && s.catena.risolti.length === 0, "s.catena.risolti = [] (cronaca vuota)");
  ok(s.sequenza[0].attende === "catena-passa", "il passo scelta:catena attende 'catena-passa'");

  // passo il turno: catena a 1 frame vuota → si chiude, prosegue verso scelta:difendi
  const sPassa = gameReducer(s, { type: "catena-passa" });
  ok(eq(nomiFila(sPassa), ["scelta:difendi"]), "catena-passa (nessun frame) → [scelta:difendi] → " + JSON.stringify(nomiFila(sPassa)));
  ok(sPassa.catena == null, "catena chiusa");
  Math.random = rnd;
}

// ---------------------------------------------------------------------------------------------------
console.log("\n# 3 — aggiungo la Trappola: nuovo passo scelta:catena (id nuovo = countdown da capo), poi risoluzione");
{
  const rnd = Math.random;
  Math.random = () => 0.99; // IA in catena: NON aggiunge mai (0.99 >= 0.4), passa sempre
  let { s, attaccante } = scenario({ trappoleIo: [trappola("Annulla Colpo", "cancel")] });
  s = avanzaIaTest(s);
  const idSceltaPrima = s.sequenza[0].id;

  s = gameReducer(s, { type: "catena-aggiungi-trappola", indiceSlot: 0 });
  ok(eq(nomiFila(s), ["scelta:catena"]), "dopo aggiungi → di nuovo [scelta:catena] → " + JSON.stringify(nomiFila(s)));
  ok(s.sequenza[0].id !== idSceltaPrima, "id del passo scelta:catena cambiato (il countdown Risolvi riparte)");
  ok(s.catena.frames.length === 1 && s.catena.turnoDiPriorita === "io", "1 frame in pila, priorità torna a io");

  s = gameReducer(s, { type: "catena-passa" });
  ok(eq(nomiFila(s), ["muta:catenaRisoluzione"]), "io passo + IA passa → [muta:catenaRisoluzione] → " + JSON.stringify(nomiFila(s)));
  const p = s.sequenza[0];
  ok(p.dati.proprietario === "io" && p.dati.ordine === 1 && p.dati.esito === "risolta", "dati passo: proprietario io, ordine 1, esito risolta");
  ok(p.dati.bersaglio?.tipo === "campo" && p.dati.bersaglio.creaturaId === attaccante.id, "bersaglio = attaccante sul campo");
  ok(s.catena.turnoDiPriorita == null, "priorità azzerata durante la scenografia");
  ok(!nomiFila(s).includes("anim:dado"), "MAI un dado: la Trappola cancel non tira dadi");

  // fine scenografia → il frame esce, l'effetto reale si applica, la finestra si chiude
  s = gameReducer(s, { type: "sequenza-passo-concluso", id: s.sequenza[0].id });
  ok(!nomiFila(s).some((n) => n.startsWith("scelta:catena") || n.includes("catenaRisoluzione")), "nessun passo di catena residuo nella fila");
  ok(s.catena == null, "catena chiusa per davvero");
  ok(s.combattimento == null, "combattimento annullato dalla Trappola cancel");
  Math.random = rnd;
}

// ---------------------------------------------------------------------------------------------------
console.log("\n# 4 — catena a 2 frame: risoluzione LIFO, un passo catenaRisoluzione per frame");
{
  const rnd = Math.random;
  Math.random = () => 0.99;
  let { s } = scenario({ trappoleIo: [trappola("Ferma Assalto", "stopatk"), trappola("Annulla Colpo", "cancel")] });
  s = avanzaIaTest(s);

  s = gameReducer(s, { type: "catena-aggiungi-trappola", indiceSlot: 0 }); // frame #1 = stopatk
  s = gameReducer(s, { type: "catena-aggiungi-trappola", indiceSlot: 1 }); // frame #2 = cancel (in cima)
  ok(s.catena.frames.length === 2, "2 frame in pila");
  ok(eq(nomiFila(s), ["scelta:catena"]), "ancora [scelta:catena] (priorità sempre a io dopo ogni aggiunta)");

  s = gameReducer(s, { type: "catena-passa" }); // io passo, IA passa → risolve il frame in CIMA (cancel)
  ok(eq(nomiFila(s), ["muta:catenaRisoluzione"]), "→ [muta:catenaRisoluzione] per il frame in cima");
  ok(s.sequenza[0].dati.cartaNome === "Annulla Colpo" && s.sequenza[0].dati.ordine === 1, "LIFO: risolve 'Annulla Colpo' per prima, ordine 1");

  s = gameReducer(s, { type: "sequenza-passo-concluso", id: s.sequenza[0].id });
  ok(s.catena && s.catena.frames.length === 1, "resta 1 frame in pila");
  // idea 59 Fase 4: la Trappola "cancel" del 1° frame ha annullato il combattimento → proseguiSeIA
  // ha accodato il respiro della prossima mossa IA. INVARIANTE: sta in FONDO, mai davanti alla mia
  // decisione di catena ancora in sospeso (regressione reale colta da questo test).
  ok(
    eq(nomiFila(s), ["scelta:catena", "muta:ia"]),
    "priorità torna a io → [scelta:catena] davanti al respiro ia → " + JSON.stringify(nomiFila(s))
  );
  ok(s.catena.risolti.length === 1 && s.catena.risolti[0].cartaNome === "Annulla Colpo", "cronaca: 'Annulla Colpo' risolta");

  s = gameReducer(s, { type: "catena-passa" });
  ok(s.sequenza[0]?.dati.cartaNome === "Ferma Assalto" && s.sequenza[0]?.dati.ordine === 2, "secondo frame: 'Ferma Assalto', ordine 2");
  s = gameReducer(s, { type: "sequenza-passo-concluso", id: s.sequenza[0].id });
  ok(eq(nomiFila(s), ["muta:ia"]), "a catena conclusa resta solo il respiro ia → " + JSON.stringify(nomiFila(s)));
  ok(s.catena == null, "catena chiusa");
  Math.random = rnd;
}

// ---------------------------------------------------------------------------------------------------
console.log("\n# 5 — ripristino da salvataggio a metà catena: il passo scelta:catena si ricostruisce");
{
  const rnd = Math.random;
  Math.random = () => 0.99;
  let { s } = scenario({ trappoleIo: [trappola("Annulla Colpo", "cancel")] });
  s = avanzaIaTest(s);
  s = gameReducer(s, { type: "catena-aggiungi-trappola", indiceSlot: 0 });
  // simula salvataggio.js: svuota la fila, la catena resta
  const salvato = JSON.parse(JSON.stringify({ ...s, sequenza: [] }));
  const ripreso = gameReducer(s, { type: "carica-stato", stato: salvato });
  ok(eq(nomiFila(ripreso), ["scelta:catena"]), "carica-stato con catena aperta (priorità io) → [scelta:catena] ricostruito → " + JSON.stringify(nomiFila(ripreso)));
  ok(ripreso.catena && ripreso.catena.frames.length === 1, "il frame in pila è sopravvissuto");
  Math.random = rnd;
}

console.log(`\n${falliti === 0 ? "TUTTO BLINDATO ✅" : falliti + " ASSERZIONI FALLITE ❌"}`);
process.exit(falliti === 0 ? 0 : 1);
