// BLINDATO — idea 59 Fase 4: il turno IA è scandito dalla fila, uno scontro alla volta.
// NON cancellare. Congela il contratto della Fase 4 (Idea59_Coda_Step.md §10 Fase 4 + §11 Q2).
// Esegui: node Engine/test-blindati/turno-ia.blindato.mjs
//
// Cosa congela:
//  1. il campo s.iaInAttesa e la dispatch "avanza-ia" NON esistono più (taglio netto, §10);
//  2. il turno IA avanza da un passo muta:"ia" { azione: "evoca" | "attacca" } della fila;
//  3. il passo successivo non è MAI calcolato in anticipo: ce n'è sempre al più UNO in fila;
//  4. INVARIANTE d'ordine: il passo "ia" sta sempre in FONDO — mai davanti a una scelta del
//     giocatore ancora in sospeso (catena, difendi) o a una scenografia già in programma;
//  5. multi-attacco: 2 Pedine che attaccano (o 1 con 2 attacchi) = un respiro per ciascuno scontro;
//  6. attacchi DIRETTI allo Stratega a campo sgombro: scanditi anch'essi (ex limite noto — prima
//     si risolvevano tutti sincroni in una dispatch perché il danno diretto non passa dalla fila);
//  7. ripristino da salvataggio a metà turno IA: il passo si ricostruisce (senza, la partita
//     resterebbe ferma per sempre — s.sequenza viene svuotata al caricamento).
import { gameReducer } from "../../App - HTML - Test/src/game/gameReducer.js";
import { creaCreatura } from "../../App - HTML - Test/src/game/mazzo.js";
import { TEMPI } from "../../App - HTML - Test/src/game/tempi.js";
import { filaBloccaCodaVisiva, scenaLiberaPerIa } from "../../App - HTML - Test/src/game/sequenza.js";
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
function passiIa(s) {
  return (s.sequenza ?? []).filter((p) => p.nome === "ia");
}
// Quello che fa il <Sequenziatore> quando il respiro del passo in cima è scaduto.
function concludiTesta(s) {
  return gameReducer(s, { type: "sequenza-passo-concluso", id: s.sequenza[0].id });
}
// Drena la fila come farebbe il direttore, fermandosi su un passo "scelta" (aspetta il giocatore)
// OPPURE sul respiro muta:"ia" — che è il confine di una scena: lì il turno IA è in pausa ed è il
// punto in cui questo test vuole guardare la fila. Per superarlo si usa concludiTesta esplicitamente.
// Limite di giri per non mascherare un loop infinito come un test verde.
function drena(s, max = 40) {
  let giri = 0;
  while (s.sequenza?.length && s.sequenza[0].tipo !== "scelta" && s.sequenza[0].nome !== "ia" && giri++ < max) {
    s = concludiTesta(s);
  }
  return s;
}

const carta = (nome, arch, ruolo, vita, atk, attacchi = 1) => ({
  nome, archetipo: arch, livello: 3, ruolo, vita, attacco: atk, parata: 2, attacchi, effetto: null,
});

// Turno dell'IA in fase 4 (attacco), partita in corso. `mieCreature` vuoto = campo mio sgombro
// (attacco diretto allo Stratega).
function scenario({ attaccantiIA = [{}], mieCreature = [{ vita: 30 }] } = {}) {
  let s = gameReducer(undefined, {
    type: "nuova-partita",
    cardsData: cards,
    cardsDataAvversario: cards,
    modalitaGioco: "vsIA",
    primoGiocatoreForzato: "avversario",
  });
  s.turno = 3;
  s.giocatori.io.turniGiocati = 2;
  s.giocatori.avversario.turniGiocati = 3;
  s.fase = 4;
  s.giocatoreAttivo = "avversario";
  s.giocatori.avversario.primaLinea = attaccantiIA.map((a, i) => {
    const c = creaCreatura(carta(`Attaccante IA ${i + 1}`, "Assalitore", "aggressore", 30, a.attacco ?? 12, a.attacchi ?? 1));
    c.fresca = false;
    return c;
  });
  s.giocatori.avversario.retrovia = [];
  s.giocatori.io.primaLinea = mieCreature.map((m, i) => {
    const c = creaCreatura(carta(`Difensore Mio ${i + 1}`, "Viandante", "tank", m.vita ?? 30, 4));
    c.fresca = false;
    return c;
  });
  s.giocatori.io.retrovia = [];
  s.sequenza = [];
  s.codaVisiva = [];
  return s;
}

// Accoda il respiro come fa il reducer (l'unico modo per innescare il turno IA dall'esterno ora).
function accodaPassoIa(s, azione) {
  const id = s.prossimoIdVisivo ?? 1;
  s.prossimoIdVisivo = id + 1;
  (s.sequenza ??= []).push({ id, tipo: "muta", nome: "ia", dati: { azione }, durataMs: TEMPI.ia.respiro });
  return s;
}

// ---------------------------------------------------------------------------------------------------
console.log("\n# 1 — taglio netto: s.iaInAttesa e la dispatch 'avanza-ia' non esistono più");
{
  let s = scenario();
  ok(s.iaInAttesa === undefined, "il campo s.iaInAttesa non esiste nello stato (RITIRATO)");

  // Una dispatch sconosciuta deve essere inerte, non far avanzare l'IA di nascosto.
  const prima = JSON.stringify(s);
  const dopo = gameReducer(s, { type: "avanza-ia" });
  ok(JSON.stringify(dopo) === prima, "la dispatch 'avanza-ia' è inerte (case RITIRATO)");
}

// ---------------------------------------------------------------------------------------------------
console.log("\n# 2 — forma del passo: muta:'ia' con azione e il respiro di tempi.js");
{
  let s = scenario();
  s = accodaPassoIa(s, "attacca");
  const p = s.sequenza[0];
  ok(p.tipo === "muta" && p.nome === "ia", "tipo/nome = muta:ia");
  ok(p.dati?.azione === "attacca", "dati.azione = 'attacca'");
  ok(p.durataMs === TEMPI.ia.respiro && TEMPI.ia.respiro === 900, `durataMs = TEMPI.ia.respiro (${TEMPI.ia.respiro}ms)`);
  ok(typeof p.id === "number", "porta un id per la guardia di 'sequenza-passo-concluso'");
}

// ---------------------------------------------------------------------------------------------------
console.log("\n# 3 — un solo respiro alla volta: il passo successivo non si calcola in anticipo");
{
  const rnd = Math.random;
  Math.random = () => 0;
  // 2 Pedine IA in prima linea, 1 mia creatura: due scontri distinti nello stesso turno.
  let s = scenario({ attaccantiIA: [{}, {}], mieCreature: [{ vita: 300 }] });
  s = accodaPassoIa(s, "attacca");

  ok(passiIa(s).length === 1, "prima del 1° scontro: esattamente 1 passo ia in fila");

  s = concludiTesta(s); // respiro scaduto → l'IA attacca
  ok(nomiFila(s)[0] === "scelta:difendi", "1° scontro avviato → in cima [scelta:difendi] → " + JSON.stringify(nomiFila(s)));
  ok(passiIa(s).length === 0, "durante lo scontro NON c'è nessun respiro ia pre-calcolato in fila");

  s = gameReducer(s, { type: "decidi-difesa", rifiuta: false }); // difendo
  s = drena(s); // dado → (ripeti?) → balzo → danno …
  // se resta una scelta (diritto di ripetizione) la risolvo e continuo a drenare
  if (s.sequenza?.[0]?.nome === "ripeti") {
    s = gameReducer(s, { type: "decidi-ripetizione", usa: false });
    s = drena(s);
  }
  ok(passiIa(s).length === 1, "a 1° scontro concluso: ESATTAMENTE 1 respiro ia accodato (mai 2) → " + JSON.stringify(nomiFila(s)));
  ok(nomiFila(s).at(-1) === "muta:ia", "INVARIANTE: il respiro ia è in FONDO alla fila");

  s = concludiTesta(s); // secondo respiro → 2° scontro
  ok(nomiFila(s)[0] === "scelta:difendi", "2° scontro avviato dal secondo respiro → " + JSON.stringify(nomiFila(s)));
  ok(passiIa(s).length === 0, "di nuovo nessun respiro pre-calcolato durante il 2° scontro");

  Math.random = rnd;
}

// ---------------------------------------------------------------------------------------------------
console.log("\n# 4 — una Pedina con 2 attacchi: un respiro per ciascun attacco");
{
  const rnd = Math.random;
  Math.random = () => 0;
  let s = scenario({ attaccantiIA: [{ attacchi: 2 }], mieCreature: [{ vita: 300 }] });
  s = accodaPassoIa(s, "attacca");

  s = concludiTesta(s);
  const attaccante = s.giocatori.avversario.primaLinea[0];
  ok(attaccante.attacchiTotali === 2, "l'attaccante ha davvero 2 attacchi");
  ok(nomiFila(s)[0] === "scelta:difendi", "1° attacco avviato");

  s = gameReducer(s, { type: "decidi-difesa", rifiuta: true }); // incasso: niente dado
  ok(passiIa(s).length === 1, "dopo il 1° attacco: 1 respiro accodato per il 2° → " + JSON.stringify(nomiFila(s)));

  s = drena(s); // si ferma sul respiro
  s = concludiTesta(s); // respiro scaduto → parte il 2° attacco della stessa Pedina
  // attacchiUsati si incrementa a scontro RISOLTO, non all'avvio: qui è 1 (il primo consumato) e il
  // secondo è in volo. Ciò che conta è che a ripartire sia la STESSA Pedina, con un respiro in mezzo.
  ok(
    nomiFila(s)[0] === "scelta:difendi" && s.combattimento?.attaccanteId === attaccante.id,
    "il 2° attacco della STESSA Pedina è partito dal respiro successivo → " + JSON.stringify(nomiFila(s))
  );
  ok(s.giocatori.avversario.primaLinea[0].attacchiUsati === 1, "1 attacco consumato, il 2° è quello in corso");

  Math.random = rnd;
}

// ---------------------------------------------------------------------------------------------------
console.log("\n# 5 — attacchi DIRETTI allo Stratega (campo mio sgombro): scanditi, non tutti insieme");
{
  const rnd = Math.random;
  Math.random = () => 0;
  // 3 Pedine IA, campo mio VUOTO ⇒ 3 attacchi diretti. Ex limite noto: si risolvevano tutti in una
  // sola dispatch, perché infliggiDanno passa da s.codaVisiva e lasciava la fila vuota → la
  // ricorsione sincrona di prossimaAzioneAttaccoIA proseguiva senza pausa.
  let s = scenario({ attaccantiIA: [{ attacco: 3 }, { attacco: 3 }, { attacco: 3 }], mieCreature: [] });
  const hpIniziali = s.giocatori.io.hp;
  s = accodaPassoIa(s, "attacca");

  s = concludiTesta(s); // 1° attacco diretto
  const dopoPrimo = s.giocatori.io.hp;
  ok(dopoPrimo < hpIniziali, `il 1° attacco diretto ha tolto PV (${hpIniziali} → ${dopoPrimo})`);
  ok(passiIa(s).length === 1, "e ha accodato UN respiro per il successivo → " + JSON.stringify(nomiFila(s)));
  ok(
    (s.codaVisiva ?? []).filter((e) => e.evento === "dannoDiretto").length === 1,
    "UN SOLO danno diretto risolto finora: gli altri 2 NON sono stati calcolati in anticipo"
  );

  s = concludiTesta(s); // 2° attacco diretto
  const dopoSecondo = s.giocatori.io.hp;
  ok(dopoSecondo < dopoPrimo, `il 2° attacco è arrivato solo col respiro successivo (${dopoPrimo} → ${dopoSecondo})`);

  Math.random = rnd;
}

// ---------------------------------------------------------------------------------------------------
console.log("\n# 6 — INVARIANTE d'ordine: il respiro ia non scavalca mai una decisione in sospeso");
{
  const rnd = Math.random;
  Math.random = () => 0;
  // Un passo "ia" già in fila + una scenografia accodata dopo: la scenografia va PRIMA del respiro.
  let s = scenario({ attaccantiIA: [{}, {}], mieCreature: [{ vita: 300 }] });
  s = accodaPassoIa(s, "attacca");
  s = concludiTesta(s);
  s = gameReducer(s, { type: "decidi-difesa", rifiuta: false });
  s = drena(s);
  if (s.sequenza?.[0]?.nome === "ripeti") {
    s = gameReducer(s, { type: "decidi-ripetizione", usa: false });
    s = drena(s);
  }
  // ora c'è [muta:ia]. Il 2° scontro accoda dado/balzo/danno: devono finire DAVANTI al respiro.
  ok(eq(nomiFila(s), ["muta:ia"]), "situazione di partenza: [muta:ia] → " + JSON.stringify(nomiFila(s)));
  s = concludiTesta(s);
  s = gameReducer(s, { type: "decidi-difesa", rifiuta: false });
  const fila = nomiFila(s);
  const iRespiro = fila.indexOf("muta:ia");
  ok(
    iRespiro === -1 || iRespiro === fila.length - 1,
    "ogni passo accodato dopo il respiro gli finisce DAVANTI → " + JSON.stringify(fila)
  );

  Math.random = rnd;
}

// ---------------------------------------------------------------------------------------------------
console.log("\n# 7 — ripristino da salvataggio a metà turno IA: il passo si ricostruisce");
{
  // salvataggio.js svuota s.sequenza al caricamento (i passi aspettano timer che non arriveranno).
  // Prima della Fase 4 il turno IA viveva in s.iaInAttesa, che sopravviveva al salvataggio: senza
  // sincronizzaPassoIa la partita ripresa resterebbe ferma per sempre.
  let s = scenario();
  s.sequenza = []; // <- come dopo caricaPartita()
  let ripreso = gameReducer(s, { type: "carica-stato", stato: s });
  ok(passiIa(ripreso).length === 1, "fase 4 (attacco): passo ia ricostruito → " + JSON.stringify(nomiFila(ripreso)));
  ok(ripreso.sequenza[0].dati.azione === "attacca", "azione ricostruita = 'attacca' (fase >= 4)");

  let s2 = scenario();
  s2.fase = 3;
  s2.sequenza = [];
  const ripreso2 = gameReducer(s2, { type: "carica-stato", stato: s2 });
  ok(ripreso2.sequenza[0]?.dati?.azione === "evoca", "fase 3: azione ricostruita = 'evoca'");

  // Se una decisione umana è in sospeso NON si ricostruisce nulla: muove il giocatore, non l'IA.
  let s3 = scenario();
  s3.sequenza = [];
  s3.avanzamentoRichiesto = "io";
  const ripreso3 = gameReducer(s3, { type: "carica-stato", stato: s3 });
  ok(passiIa(ripreso3).length === 0, "avanzamento in sospeso → nessun respiro ricostruito");

  // Turno mio: mai un passo IA.
  let s4 = scenario();
  s4.giocatoreAttivo = "io";
  s4.sequenza = [];
  const ripreso4 = gameReducer(s4, { type: "carica-stato", stato: s4 });
  ok(passiIa(ripreso4).length === 0, "turno mio → nessun respiro ia");
}

// ---------------------------------------------------------------------------------------------------
console.log("\n# 8 — 1v1 locale: nessun pacing IA (l'avversario è un umano)");
{
  let s = scenario();
  s.modalitaGioco = "1v1locale";
  s.sequenza = [];
  const ripreso = gameReducer(s, { type: "carica-stato", stato: s });
  ok(passiIa(ripreso).length === 0, "1v1 locale → nessun passo ia ricostruito");
}

// ---------------------------------------------------------------------------------------------------
console.log("\n# 9 — anti-deadlock delle due guardie di pacing (REGRESSIONE TROVATA DAL VIVO)");
{
  // Bug reale della verifica dal vivo della Fase 4: il turno IA si è fermato per sempre su
  // "L'avversario evoca…". Causa: le due guardie si aspettavano a vicenda —
  //   · la coda visiva (App.jsx) non scorreva perché la fila aveva un passo "muta" (il respiro ia);
  //   · il respiro ia (<Sequenziatore>) non scadeva perché la coda visiva non era vuota.
  // Fix: il passo muta:"ia" è l'unica eccezione — è respiro, non scenografia, e NON blocca la coda.
  // Le due guardie vivono in sequenza.js apposta, per poterle testare davvero (non una loro copia).
  const passoIa = { id: 1, tipo: "muta", nome: "ia", dati: { azione: "attacca" }, durataMs: TEMPI.ia.respiro };
  const conCoda = { sequenza: [passoIa], codaVisiva: [{ evento: "dannoDiretto", dati: {} }] };

  ok(!filaBloccaCodaVisiva(conCoda), "il respiro ia da solo NON blocca la coda visiva");
  ok(!scenaLiberaPerIa(conCoda), "…e simmetricamente la coda piena tiene fermo il respiro");
  ok(
    !(filaBloccaCodaVisiva(conCoda) && !scenaLiberaPerIa(conCoda) && conCoda.codaVisiva.length),
    "ANTI-DEADLOCK: mai entrambe bloccanti con la coda piena e solo il respiro in fila"
  );

  // Drenata la coda, il respiro può scadere.
  const codaVuota = { sequenza: [passoIa], codaVisiva: [] };
  ok(scenaLiberaPerIa(codaVuota), "coda drenata → la scena è libera, il respiro scade");

  // Una scenografia vera invece blocca la coda, come da Fase 3 (s.sequenza è il master).
  const conAnim = { sequenza: [{ id: 2, tipo: "anim", nome: "dado" }], codaVisiva: [{ evento: "x", dati: {} }] };
  ok(filaBloccaCodaVisiva(conAnim), "un passo anim vero blocca ancora la coda visiva (regola Fase 3 intatta)");

  // Un passo "scelta" da solo non blocca la coda (regola Fase 3: la notifica si vede prima del pop-up).
  const conScelta = { sequenza: [{ id: 3, tipo: "scelta", nome: "catena" }], codaVisiva: [{ evento: "x", dati: {} }] };
  ok(!filaBloccaCodaVisiva(conScelta), "un passo scelta da solo non blocca la coda (regola Fase 3 intatta)");
}

console.log(falliti === 0 ? "\nTUTTO BLINDATO ✅\n" : `\n${falliti} ASSERZIONI FALLITE ❌\n`);
process.exit(falliti === 0 ? 0 : 1);
