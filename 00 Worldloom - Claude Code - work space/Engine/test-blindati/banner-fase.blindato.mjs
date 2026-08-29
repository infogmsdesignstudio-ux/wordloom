// BLINDATO — idea 59 Fase 5: i banner di fase (Vespro / Vaticinio / …) sono passi della fila.
// NON cancellare. Congela il contratto della Fase 5 (Idea59_Coda_Step.md §10 Fase 5 + §4 tipo
// "banner") e i quattro punti di roadmap che chiude: P2.1, P2.2, P2.3, P2.4.
// Esegui: node Engine/test-blindati/banner-fase.blindato.mjs
//
// Cosa congela:
//  1. il quarto tipo di passo esiste: { tipo:"banner", nome:"bannerFase", dati:{chiave,fase}, durataMs };
//  2. **P2.1** — il "Vespro" (fase 5, che NON esiste come valore di s.fase) è accodato da fineTurno
//     DOPO flushSequenza, quindi non può essere svuotato dalla fila che si sta chiudendo; e dura di
//     più delle altre fasi;
//  3. **P2.2** — il "Vaticinio" (fase 2) sta sempre DIETRO al volo della carta pescata;
//  4. **P2.3** — "timer-scaduto" non taglia più di netto: aspetta anche coda visiva / dado Imprevisti /
//     morte da Imboscata, non solo la fila;
//  5. **P2.4** — gli STESSI cinque cartelli valgono per il turno dell'avversario, con l'attribuzione
//     giusta (dati.chiave), non solo per il mio;
//  6. l'invariante d'ordine della Fase 4 regge: un banner accodato mentre il respiro muta:"ia" è già
//     in fila gli finisce DAVANTI (si legge "Schieramento", poi l'avversario evoca);
//  7. anti-deadlock: "banner" blocca la coda visiva come anim/muta, ma NON è mai bloccato da lei —
//     scenaLiberaPerIa non lo guarda, quindi la coppia di guardie di Fase 4 resta sana.
import { gameReducer } from "../../App - HTML - Test/src/game/gameReducer.js";
import { TEMPI } from "../../App - HTML - Test/src/game/tempi.js";
import { filaBloccaCodaVisiva, scenaLiberaPerIa, bannerInScena } from "../../App - HTML - Test/src/game/sequenza.js";
import cards from "../../App - HTML - Test/src/data/generated/mazzi/frost-land/cards.json" with { type: "json" };

let falliti = 0;
function ok(cond, msg) {
  if (cond) console.log("  ok  " + msg);
  else {
    console.log("  XX  " + msg);
    falliti++;
  }
}
function eq(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}
function nomiFila(s) {
  return (s.sequenza ?? []).map((p) => `${p.tipo}:${p.nome}`);
}
function banner(s) {
  return (s.sequenza ?? []).filter((p) => p.tipo === "banner");
}

function nuova(primo) {
  return gameReducer(undefined, {
    type: "nuova-partita",
    cardsData: cards,
    cardsDataAvversario: cards,
    modalitaGioco: "vsIA",
    primoGiocatoreForzato: primo,
  });
}

// Orchestratore minimo: fa quello che fanno <Sequenziatore> + lo scorrimento della coda visiva in
// App.jsx, e prende le decisioni umane nel modo più neutro possibile (incassa, niente ripetizione,
// passa in catena). Registra OGNI banner che passa in scena. Si ferma quando il turno cambia o
// quando serve una decisione di fase del giocatore umano (che il chiamante prende da sé).
function gira(s, { registro, fermaSuTurnoUmano = true, max = 3000 } = {}) {
  const attivoIniziale = s.giocatoreAttivo;
  let giri = 0;
  while (giri++ < max && !s.vincitore) {
    const head = s.sequenza?.[0];
    if (head) {
      if (head.tipo === "banner") registro?.push({ chiave: head.dati.chiave, fase: head.dati.fase });
      if (head.tipo === "scelta") {
        if (head.nome === "difendi") s = gameReducer(s, { type: "decidi-difesa", rifiuta: true });
        else if (head.nome === "ripeti") s = gameReducer(s, { type: "decidi-ripetizione", usa: false });
        else if (head.nome === "catena") s = gameReducer(s, { type: "catena-passa" });
        else break;
        continue;
      }
      // "ia" incluso: il respiro scade solo a scena libera, come nel <Sequenziatore>.
      if (head.nome === "ia" && !scenaLiberaPerIa(s)) {
        if (s.notificaEffetto) s = gameReducer(s, { type: "chiudi-notifica" });
        else if (s.dadoInCorso) s = gameReducer(s, { type: "dado-animazione-conclusa", id: s.dadoInCorso });
        else if (s.morteInCorso) s = gameReducer(s, { type: "morte-animazione-conclusa" });
        else if (s.codaVisiva?.length) s = gameReducer(s, { type: "avanza-coda-visiva" });
        else if (s.avanzamentoRichiesto) s = gameReducer(s, { type: "scegli-avanzamento", creaturaId: null });
        else break;
        continue;
      }
      s = gameReducer(s, { type: "sequenza-passo-concluso", id: head.id });
      continue;
    }
    if (s.notificaEffetto) {
      s = gameReducer(s, { type: "chiudi-notifica" });
      continue;
    }
    if (s.dadoInCorso) {
      s = gameReducer(s, { type: "dado-animazione-conclusa", id: s.dadoInCorso });
      continue;
    }
    if (s.morteInCorso) {
      s = gameReducer(s, { type: "morte-animazione-conclusa" });
      continue;
    }
    if (s.codaVisiva?.length) {
      s = gameReducer(s, { type: "avanza-coda-visiva" });
      continue;
    }
    if (s.giocatoreAttivo !== attivoIniziale) break; // turno cambiato: il giro è finito
    if (fermaSuTurnoUmano && s.giocatoreAttivo === "io") break; // tocca al chiamante
    break;
  }
  return s;
}

// ---------------------------------------------------------------------------------------------------
console.log("\n# 1 — forma del passo + P2.1: il Vespro è accodato da fineTurno DOPO flushSequenza");
{
  let s = nuova("io");
  s = { ...s, sequenza: [], codaVisiva: [] };
  s.giocatoreAttivo = "io";
  s.giocatori.io.turniGiocati = 2;
  s.giocatori.avversario.turniGiocati = 2;
  s.turno = 3;
  s.fase = 4;
  s = gameReducer(s, { type: "continua-fase" }); // fase 4 → fineTurno + iniziaTurno("avversario")

  const testa = s.sequenza[0];
  ok(testa?.tipo === "banner" && testa?.nome === "bannerFase", `il primo passo è un banner → ${JSON.stringify(nomiFila(s))}`);
  ok(testa?.dati.fase === 5, "è il Vespro (fase 5)");
  ok(testa?.dati.chiave === "io", "attribuito a chi CHIUDE il turno, non a chi lo apre (lo stato ha già girato)");
  ok(typeof testa?.id === "number", "porta un id monotòno per la chiave React");
  ok(testa?.durataMs === TEMPI.banner.vespro, `durataMs = TEMPI.banner.vespro (${TEMPI.banner.vespro}ms)`);
  ok(TEMPI.banner.vespro > TEMPI.banner.fase, "il Vespro resta a schermo PIÙ A LUNGO delle altre fasi (P2.1)");
  ok(s.fase !== 5, "s.fase non vale mai 5: il Vespro vive solo come dato del passo");
  ok(bannerInScena(s)?.fase === 5, "il selettore bannerInScena lo espone al componente");

  // Il turno nuovo (avversario) accoda i suoi: Rifornimento, la pescata, poi il Vaticinio, poi il respiro.
  ok(
    eq(nomiFila(s), ["banner:bannerFase", "banner:bannerFase", "anim:pesca", "banner:bannerFase", "muta:ia"]),
    `ordine [Vespro, Rifornimento, pesca, Vaticinio, respiro] → ${JSON.stringify(nomiFila(s))}`
  );
  ok(
    eq(banner(s).map((p) => `${p.dati.chiave}/${p.dati.fase}`), ["io/5", "avversario/1", "avversario/2"]),
    "attribuzioni: Vespro a io, Rifornimento e Vaticinio all'avversario"
  );
  ok(s.sequenza[s.sequenza.length - 1].nome === "ia", "INVARIANTE Fase 4 intatto: il respiro resta in FONDO");
}

// ---------------------------------------------------------------------------------------------------
console.log("\n# 2 — P2.2: il Vaticinio sta sempre DIETRO al volo della carta pescata");
{
  let s = nuova("io");
  s = { ...s, sequenza: [], codaVisiva: [] };
  s.giocatoreAttivo = "io";
  s.giocatori.io.turniGiocati = 2;
  s.turno = 3;
  s.fase = 1;
  s = gameReducer(s, { type: "rifornimento", doppio: false });

  ok(eq(nomiFila(s), ["anim:pesca", "banner:bannerFase"]), `[pesca, Vaticinio] → ${JSON.stringify(nomiFila(s))}`);
  ok(s.sequenza[1].dati.fase === 2 && s.sequenza[1].dati.chiave === "io", "il banner dietro alla pescata è il Vaticinio, attribuito a me");
  ok(s.sequenza[1].durataMs === TEMPI.banner.fase, "durata standard (non è il Vespro)");
  ok((s.codaVisiva ?? []).some((e) => e.evento === "dado"), "il dado Imprevisti è ancora in coda visiva, dietro al banner");
  ok(filaBloccaCodaVisiva(s), "finché il banner è in fila la coda visiva NON scorre: pescata → cartello → dado");

  // atterrata la carta, resta il cartello; concluso il cartello, la fila si svuota e il dado può partire
  s = gameReducer(s, { type: "sequenza-passo-concluso", id: s.sequenza[0].id });
  ok(eq(nomiFila(s), ["banner:bannerFase"]), "atterrata la carta, in scena resta il solo Vaticinio");
  ok(filaBloccaCodaVisiva(s), "un banner DA SOLO blocca ancora la coda visiva");
  s = gameReducer(s, { type: "sequenza-passo-concluso", id: s.sequenza[0].id });
  ok(eq(nomiFila(s), []), "concluso il cartello la fila è vuota");
  ok(!filaBloccaCodaVisiva(s), "ora la coda visiva può scorrere (dado Imprevisti)");
}

// ---------------------------------------------------------------------------------------------------
console.log("\n# 3 — il banner 'Schieramento' passa DAVANTI al respiro muta:'ia' già in fila");
{
  let s = nuova("io");
  s = { ...s, sequenza: [], codaVisiva: [] };
  s.giocatoreAttivo = "io";
  s.giocatori.io.turniGiocati = 2;
  s.giocatori.avversario.turniGiocati = 2;
  s.turno = 3;
  s.fase = 4;
  s = gameReducer(s, { type: "continua-fase" }); // → turno avversario

  // il direttore drena i cartelli e la pescata: resta il solo respiro, con la coda visiva in attesa
  while (s.sequenza.length && s.sequenza[0].nome !== "ia") {
    s = gameReducer(s, { type: "sequenza-passo-concluso", id: s.sequenza[0].id });
  }
  ok(eq(nomiFila(s), ["muta:ia"]), "in fila resta il solo respiro dell'IA");
  ok(!filaBloccaCodaVisiva(s), "il respiro NON blocca la coda (eccezione di Fase 4, intatta)");

  // scorre la coda visiva fino a rivelare l'esito degli Imprevisti
  let giri = 0;
  while (s.codaVisiva?.length && giri++ < 30) {
    if (s.dadoInCorso) s = gameReducer(s, { type: "dado-animazione-conclusa", id: s.dadoInCorso });
    else if (s.notificaEffetto) s = gameReducer(s, { type: "chiudi-notifica" });
    else s = gameReducer(s, { type: "avanza-coda-visiva" });
  }
  ok(
    eq(nomiFila(s), ["banner:bannerFase", "muta:ia"]),
    `[Schieramento, respiro] — il banner ha scavalcato il respiro → ${JSON.stringify(nomiFila(s))}`
  );
  ok(s.sequenza[0].dati.fase === 3 && s.sequenza[0].dati.chiave === "avversario", "è lo Schieramento dell'avversario");
  ok(s.faseVisibile === null, "il pin della barra fasi è stato rilasciato nello stesso istante");
  ok(s.imprevistoVisivo !== null, "imprevistoVisivo resta valorizzato (NON ritirato in Fase 5: pinna la carta Imprevisto)");
}

// ---------------------------------------------------------------------------------------------------
console.log("\n# 4 — P2.4: le stesse cinque fasi hanno un banner ANCHE nel turno dell'avversario");
{
  let s = nuova("io");
  s = { ...s, sequenza: [], codaVisiva: [] };
  s.giocatoreAttivo = "io";
  s.giocatori.io.turniGiocati = 3;
  s.giocatori.avversario.turniGiocati = 3;
  s.turno = 7;
  s.fase = 4;

  const registro = [];
  // chiudo il mio turno → tutto il turno dell'avversario, dal Rifornimento al suo Vespro
  s = gameReducer(s, { type: "continua-fase" });
  s = gira(s, { registro });

  const fasiIA = [...new Set(registro.filter((b) => b.chiave === "avversario").map((b) => b.fase))].sort();
  ok(eq(fasiIA, [1, 2, 3, 4, 5]), `turno IA: banner per tutte e 5 le fasi → ${JSON.stringify(fasiIA)}`);
  ok(registro.some((b) => b.chiave === "io" && b.fase === 5), "il Vespro del MIO turno è attribuito a me");
  ok(
    registro.filter((b) => b.chiave === "avversario" && b.fase === 5).length === 1,
    "un solo Vespro per turno avversario (nessun doppione)"
  );

  // e ora il mio turno: stesse cinque fasi, attribuite a me
  const mio = [];
  s = gira(s, { registro: mio, fermaSuTurnoUmano: true });
  let giri = 0;
  while (s.giocatoreAttivo === "io" && !s.vincitore && giri++ < 20) {
    if (s.fase === 1 && s.giocatori.io.turniGiocati > 1) s = gameReducer(s, { type: "rifornimento", doppio: false });
    else s = gameReducer(s, { type: "continua-fase" });
    s = gira(s, { registro: mio, fermaSuTurnoUmano: true });
  }
  const fasiMie = [...new Set(mio.filter((b) => b.chiave === "io").map((b) => b.fase))].sort();
  ok(eq(fasiMie, [1, 2, 3, 4, 5]), `mio turno: banner per tutte e 5 le fasi → ${JSON.stringify(fasiMie)}`);
}

// ---------------------------------------------------------------------------------------------------
console.log("\n# 5 — P2.3: 'timer-scaduto' aspetta l'ultima animazione in corso, POI Vespro, POI cambio turno");
{
  const base = () => {
    let s = nuova("io");
    s = { ...s, sequenza: [], codaVisiva: [] };
    s.giocatoreAttivo = "io";
    s.giocatori.io.turniGiocati = 2;
    s.giocatori.avversario.turniGiocati = 2;
    s.turno = 3;
    s.fase = 4;
    return s;
  };

  // (a) coda visiva ancora piena → non taglia
  let s = base();
  s.codaVisiva = [{ evento: "dannoDiretto", dati: { chiave: "avversario", importo: 5, id: 9001 } }];
  let dopo = gameReducer(s, { type: "timer-scaduto" });
  ok(dopo.giocatoreAttivo === "io" && dopo === s, "coda visiva piena → il turno NON cambia (si riprova al tick dopo)");

  // (b) dado Imprevisti ancora in rotazione → non taglia
  s = base();
  s.dadoInCorso = 4242;
  dopo = gameReducer(s, { type: "timer-scaduto" });
  ok(dopo.giocatoreAttivo === "io", "dado Imprevisti in rotazione → il turno NON cambia");

  // (c) morte da Imboscata in scena → non taglia
  s = base();
  s.morteInCorso = { id: 7, morti: [] };
  dopo = gameReducer(s, { type: "timer-scaduto" });
  ok(dopo.giocatoreAttivo === "io", "morte (Imboscata) in scena → il turno NON cambia");

  // (d) fila ancora piena → non taglia (guardia già di Fase 1, non deve essersi indebolita)
  s = base();
  s.sequenza = [{ id: 1, tipo: "anim", nome: "danno", dati: {}, durataMs: 100 }];
  dopo = gameReducer(s, { type: "timer-scaduto" });
  ok(dopo.giocatoreAttivo === "io", "scenografia di combattimento in fila → il turno NON cambia");

  // (e) scena libera → chiude, e il PRIMO passo che si vede è il Vespro
  s = base();
  dopo = gameReducer(s, { type: "timer-scaduto" });
  ok(dopo.giocatoreAttivo === "avversario", "scena libera → il turno cambia davvero");
  ok(dopo.sequenza[0]?.dati.fase === 5 && dopo.sequenza[0]?.dati.chiave === "io", "e il primo passo è il Vespro di chi ha esaurito il tempo");
}

// ---------------------------------------------------------------------------------------------------
console.log("\n# 6 — anti-deadlock: 'banner' blocca la coda visiva ma non è MAI bloccato da lei");
{
  const conFila = (fila, extra = {}) => ({
    sequenza: fila,
    codaVisiva: [{ evento: "dannoDiretto", dati: { chiave: "io", importo: 3, id: 1 } }],
    ...extra,
  });
  const bannerPasso = { id: 1, tipo: "banner", nome: "bannerFase", dati: { chiave: "io", fase: 5 }, durataMs: 2600 };
  const respiro = { id: 2, tipo: "muta", nome: "ia", dati: { azione: "attacca" }, durataMs: 900 };

  ok(filaBloccaCodaVisiva(conFila([bannerPasso])), "un banner blocca la coda visiva (come anim/muta)");
  ok(!filaBloccaCodaVisiva(conFila([respiro])), "il respiro ia NON la blocca (eccezione di Fase 4, intatta)");
  ok(
    filaBloccaCodaVisiva(conFila([bannerPasso, respiro])),
    "banner + respiro: blocca (è il banner a farlo, e lui drena da sé — nessuno stallo)"
  );
  // La guardia gemella non guarda affatto la fila: un banner non può quindi impedire al respiro di
  // scadere per una via diversa dall'ordine della fila (che è l'unica voluta).
  ok(
    scenaLiberaPerIa({ sequenza: [bannerPasso], codaVisiva: [] }),
    "scenaLiberaPerIa ignora i banner: la coppia di guardie di Fase 4 resta l'unica bidirezionale"
  );
  ok(
    !filaBloccaCodaVisiva({ sequenza: [{ id: 3, tipo: "scelta", nome: "catena", dati: {} }] }),
    "un passo scelta da solo non blocca (regola di Fase 3 intatta)"
  );
}

// ---------------------------------------------------------------------------------------------------
console.log("\n# 7 — nessun cartello su una partita finita; e il ripristino non ne ricostruisce (non serve)");
{
  let s = nuova("io");
  s = { ...s, sequenza: [], codaVisiva: [] };
  s.giocatoreAttivo = "io";
  s.giocatori.io.turniGiocati = 2;
  s.giocatori.avversario.turniGiocati = 2;
  s.turno = 3;
  s.fase = 4;
  s.giocatori.avversario.hp = 0;
  s.vincitore = "io";
  const dopo = gameReducer(s, { type: "continua-fase" });
  ok(banner(dopo).length === 0, "partita già vinta → nessun banner accodato");

  // carica-stato: salvataggio.js svuota s.sequenza. A differenza di catena (Fase 2) e respiro IA
  // (Fase 4) NON serve un sincronizzaPassoBanner: un cartello perso è pura decorazione, niente lo
  // aspetta e niente resta bloccato.
  let viva = nuova("io");
  viva = { ...viva, sequenza: [], codaVisiva: [] };
  viva.giocatoreAttivo = "io";
  viva.giocatori.io.turniGiocati = 2;
  viva.turno = 3;
  viva.fase = 1;
  viva = gameReducer(viva, { type: "rifornimento", doppio: false });
  ok(banner(viva).length === 1, "prima del salvataggio c'è un cartello in fila");
  const ripreso = gameReducer(viva, { type: "carica-stato", stato: { ...viva, sequenza: [] } });
  ok(banner(ripreso).length === 0, "dopo carica-stato nessun banner ricostruito (nessun sincronizzaPassoBanner)");
  ok(!filaBloccaCodaVisiva(ripreso), "e la partita ripresa non resta bloccata da un cartello fantasma");
}

console.log(falliti === 0 ? "\nTUTTO BLINDATO ✅" : `\n${falliti} ASSERZIONI FALLITE ❌`);
process.exit(falliti === 0 ? 0 : 1);
