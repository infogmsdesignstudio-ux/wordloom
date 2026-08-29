// BLINDATO — idea 59 Fase 1: forma esatta di s.sequenza durante uno scontro di combattimento.
// NON cancellare. Congela la sequenza di step concordata (Idea59_Coda_Step.md §6/§13, "sequenza b").
// Esegui: node Engine/test-blindati/combattimento.blindato.mjs
//
// Percorso engine relativo: i sorgenti vivono in "App - HTML - Test/src/game".
import { gameReducer } from "../../App - HTML - Test/src/game/gameReducer.js";
import { creaCreatura } from "../../App - HTML - Test/src/game/mazzo.js";
import cards from "../../App - HTML - Test/src/data/generated/mazzi/frost-land/cards.json" with { type: "json" };

let falliti = 0;
function ok(cond, msg) {
  if (cond) {
    console.log("  ok  " + msg);
  } else {
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
// helper riproducono esattamente quel percorso, così i test di Fase 1/2/3 continuano a pilotare
// l'IA senza cambiare NESSUNA delle loro asserzioni sulla forma della fila.
function accodaPassoIa(s, azione) {
  const id = s.prossimoIdVisivo ?? 1;
  s.prossimoIdVisivo = id + 1;
  (s.sequenza ??= []).push({ id, tipo: "muta", nome: "ia", dati: { azione }, durataMs: 900 });
}
function avanzaIaTest(s) {
  return gameReducer(s, { type: "sequenza-passo-concluso", id: s.sequenza[0].id });
}

// Stato base valido, poi lo forziamo in Fase 4 con uno scontro pulito.
function scenario({ attArch, attRuolo, difArch, difRuolo, difVita = 30 }) {
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
  const attaccante = creaCreatura(carta("Attaccante IA", attArch, attRuolo, 30, 12));
  const difensore = creaCreatura(carta("Difensore Mio", difArch, difRuolo, difVita, 4));
  attaccante.fresca = false;
  difensore.fresca = false;
  s.turno = 3;
  // Partita in corso, non turno 1: un'eventuale fine-turno innescata da proseguiSeIA porta a un
  // Rifornimento normale (per l'umano: si ferma in Fase 1 in attesa della scelta, nessuna pesca
  // automatica) e non alla prima mano staggerata — quella ha il suo test in voli.blindato.mjs.
  s.giocatori.io.turniGiocati = 2;
  s.giocatori.avversario.turniGiocati = 3;
  s.fase = 4;
  s.giocatoreAttivo = "avversario";
  s.giocatori.avversario.primaLinea = [attaccante];
  s.giocatori.avversario.retrovia = [];
  s.giocatori.io.primaLinea = [difensore];
  s.giocatori.io.retrovia = [];
  s.sequenza = [];
  s.codaVisiva = [];
  accodaPassoIa(s, "attacca"); // ex s.iaInAttesa = "attacca" (idea 59 Fase 4)
  return { s, attaccante, difensore };
}

// ---------------------------------------------------------------------------------------------------
console.log("\n# 1 — IA attacca, io difendo: la fila esce [scelta:difendi]");
{
  const rnd = Math.random;
  Math.random = () => 0; // dado → prima faccia ("S" per ogni archetipo); scelte IA deterministiche
  // difensore Viandante efficace CONTRO attaccante Assalitore → il diritto di ripetizione spetta a "io"
  let { s } = scenario({ attArch: "Assalitore", attRuolo: "aggressore", difArch: "Viandante", difRuolo: "tank" });

  s = avanzaIaTest(s);
  ok(eq(nomiFila(s), ["scelta:difendi"]), "dopo il passo ia (IA attacca) → " + JSON.stringify(nomiFila(s)));
  ok(s.combattimento?.step === "rifiuto" && s.combattimento?.difProprietario === "io", "combattimento step=rifiuto, difensore=io");

  const s2 = gameReducer(s, { type: "decidi-difesa", rifiuta: false });
  ok(eq(nomiFila(s2), ["anim:dado", "scelta:ripeti"]), "dopo decidi-difesa('difendi') con diritto a io → " + JSON.stringify(nomiFila(s2)));

  const s3 = gameReducer(s, { type: "decidi-difesa", rifiuta: true });
  // idea 59 Fase 4: il danno allo Stratega resta su coda visiva (nessun passo anim), ma lo scontro è
  // finito → proseguiSeIA accoda ESATTAMENTE UN respiro muta:"ia" per la prossima mossa dell'IA.
  ok(eq(nomiFila(s3), ["muta:ia"]), "dopo decidi-difesa('incassa') → [muta:ia] → " + JSON.stringify(nomiFila(s3)));
  ok(!nomiFila(s3).includes("anim:dado"), "incassa → MAI un dado nella fila");
  ok((s3.codaVisiva ?? []).some((e) => e.evento === "dannoDiretto"), "incassa → evento dannoDiretto in coda visiva");

  Math.random = rnd;
}

// ---------------------------------------------------------------------------------------------------
console.log("\n# 2 — difendo, tengo il dado: [dado, balzo, danno, morte?] (colpo letale)");
{
  const rnd = Math.random;
  Math.random = () => 0;
  let { s, difensore } = scenario({ attArch: "Assalitore", attRuolo: "aggressore", difArch: "Viandante", difRuolo: "tank", difVita: 1 });

  s = avanzaIaTest(s);
  s = gameReducer(s, { type: "decidi-difesa", rifiuta: false });
  ok(eq(nomiFila(s), ["anim:dado", "scelta:ripeti"]), "fila = [dado, ripeti]");

  s = gameReducer(s, { type: "decidi-ripetizione", usa: false });
  ok(eq(nomiFila(s), ["anim:balzo", "anim:danno", "muta:morte"]), "dopo 'tieni' (colpo letale) → " + JSON.stringify(nomiFila(s)));

  const difVivoOra = s.giocatori.io.primaLinea.some((c) => c.id === difensore.id);
  ok(difVivoOra, "§7: il difensore letale è ANCORA in primaLinea finché il passo 'muta' non è in cima");

  // drena la fila come farebbe il direttore
  s = gameReducer(s, { type: "sequenza-passo-concluso", id: s.sequenza[0].id }); // balzo
  s = gameReducer(s, { type: "sequenza-passo-concluso", id: s.sequenza[0].id }); // danno
  ok(nomiFila(s)[0] === "muta:morte", "in cima ora c'è muta:morte");
  ok(s.giocatori.io.primaLinea.some((c) => c.id === difensore.id), "difensore ancora in campo un istante prima del muta");
  s = gameReducer(s, { type: "sequenza-passo-concluso", id: s.sequenza[0].id }); // muta:morte
  // idea 59 Fase 4: a scontro concluso resta il respiro della prossima mossa IA, uno solo.
  ok(eq(nomiFila(s), ["muta:ia"]), "a scontro concluso → [muta:ia] → " + JSON.stringify(nomiFila(s)));
  ok(!s.giocatori.io.primaLinea.some((c) => c.id === difensore.id), "difensore rimosso dal campo dopo il passo 'muta'");
  ok(s.giocatori.io.cimitero.some((c) => c.id === difensore.id), "difensore nel cimitero");

  Math.random = rnd;
}

// ---------------------------------------------------------------------------------------------------
console.log("\n# 3 — 'ritenta' (diritto di ripetizione usato): prepend di un nuovo dado");
{
  const rnd = Math.random;
  Math.random = () => 0;
  let { s } = scenario({ attArch: "Assalitore", attRuolo: "aggressore", difArch: "Viandante", difRuolo: "tank", difVita: 40 });

  s = avanzaIaTest(s);
  s = gameReducer(s, { type: "decidi-difesa", rifiuta: false });
  ok(eq(nomiFila(s), ["anim:dado", "scelta:ripeti"]), "fila = [dado, ripeti]");
  // drena il primo dado prima di decidere
  s = gameReducer(s, { type: "sequenza-passo-concluso", id: s.sequenza[0].id });
  ok(eq(nomiFila(s), ["scelta:ripeti"]), "dopo il primo dado → [ripeti]");

  s = gameReducer(s, { type: "decidi-ripetizione", usa: true });
  ok(s.sequenza[0]?.nome === "dado" && s.sequenza[0]?.tipo === "anim", "'ritenta' → nuovo dado in cima");
  ok(
    eq(nomiFila(s), ["anim:dado", "anim:balzo", "anim:danno", "muta:ia"]),
    "fila = [dado, balzo, danno] + respiro ia in fondo (colpo non letale) → " + JSON.stringify(nomiFila(s))
  );

  Math.random = rnd;
}

// ---------------------------------------------------------------------------------------------------
console.log("\n# 4 — nessun passo 'scelta' mentre un 'anim' è in cima");
{
  const rnd = Math.random;
  Math.random = () => 0;
  let { s } = scenario({ attArch: "Assalitore", attRuolo: "aggressore", difArch: "Viandante", difRuolo: "tank", difVita: 40 });
  s = avanzaIaTest(s);
  s = gameReducer(s, { type: "decidi-difesa", rifiuta: false });
  // fila [dado, ripeti]: il dado (anim) è in cima, la scelta è DIETRO, mai in cima prima del suo turno
  ok(s.sequenza[0].tipo === "anim" && s.sequenza[1].tipo === "scelta", "ordine [anim, scelta] — la scelta non scavalca l'anim");
  Math.random = rnd;
}

console.log(`\n${falliti === 0 ? "TUTTO BLINDATO ✅" : falliti + " ASSERZIONI FALLITE ❌"}`);
process.exit(falliti === 0 ? 0 : 1);
