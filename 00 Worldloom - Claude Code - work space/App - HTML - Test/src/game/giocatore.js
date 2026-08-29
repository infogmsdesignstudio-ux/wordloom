import { costruisciMazzo, costruisciMazzettoImprevisti } from "./mazzo.js";
import { viva } from "./mazzo.js";
import { PV_INIZIALI, ATTACCHI_PRIMA_LINEA, SLOT_RETROVIA, tiraDadoImprevisti } from "./costanti.js";
import { effettoMorte, effettoMorteOffensivo, effettoMorteAlleato } from "./effettiCarta.js";

// listaMazzo (opzionale, cap. editor mazzi): { worldloom, imprevisti } di un mazzo salvato scelto
// dal giocatore — assente = comportamento di sempre ("mazzo intero", tutta la collezione).
export function nuovoGiocatore(cardsData, listaMazzo) {
  return {
    hp: PV_INIZIALI,
    mazzo: costruisciMazzo(cardsData, listaMazzo?.worldloom),
    mano: [],
    primaLinea: [],
    retrovia: [],
    cimitero: [],
    // Ogni giocatore ha il proprio mazzetto Imprevisti, con la carta in corso di avanzamento davanti.
    mazzettoImprevisti: costruisciMazzettoImprevisti(cardsData, listaMazzo?.imprevisti),
    imprevistoInCorso: null, // { carta, movimenti }
    // Cimitero del mazzetto Imprevisti (cap. 15 del regolamento, P3.2): gli Imprevisti risolti finivano
    // nel nulla — ora si accumulano qui, scoperti, e lo slot di avanzamento li mostra sotto la carta
    // in corso (che sta sopra, coperta) come se girassero nello stesso mazzetto.
    cimiteroImprevisti: [],
    magieTrappole: [], // { carta, coperta, pronta }
    turniGiocati: 0,
    evocazioneNormaleFatta: false,
    evocazioneBonusFatta: false,
    aggressoriAttivatiQuestoTurno: [],
    difensoriAttivatiQuestoTurno: [],
  };
}

export function pesca(giocatore, quante = 1) {
  for (let i = 0; i < quante; i++) {
    const carta = giocatore.mazzo.pop();
    if (carta) giocatore.mano.push(carta);
  }
}

export function campoDi(giocatore) {
  return [...giocatore.primaLinea, ...giocatore.retrovia];
}

export function campoPieno(giocatore) {
  return giocatore.primaLinea.length >= ATTACCHI_PRIMA_LINEA && giocatore.retrovia.length >= SLOT_RETROVIA;
}

// La retrovia è protetta finché il proprietario ha almeno un Alieno vivo in prima linea (cap. 4).
export function retroviaProtetta(giocatore) {
  return giocatore.primaLinea.some(viva);
}

// Vero se resta uno slot di prima linea libero con più di un candidato in retrovia: serve
// scegliere chi avanza (cap. 4). Se il numero di candidati non supera gli slot liberi non c'è
// ambiguità: avanzano tutti comunque, la scelta non cambia il risultato.
export function avanzamentoAmbiguo(giocatore) {
  const slotLiberi = ATTACCHI_PRIMA_LINEA - giocatore.primaLinea.length;
  return slotLiberi > 0 && giocatore.retrovia.length > slotLiberi;
}

// Bersagli attaccabili sul campo di un giocatore: prima linea se presente, altrimenti la retrovia se sguarnita.
// 'retrovieEsposte' = true quando il Terreno Marea di Marbion annulla la protezione (cap. 14).
export function bersagliValidi(difensore, retrovieEsposte = false) {
  const primaViva = difensore.primaLinea.filter(viva);
  const retroviaViva = difensore.retrovia.filter(viva);
  if (retrovieEsposte) return [...primaViva, ...retroviaViva];
  if (primaViva.length > 0) return primaViva;
  if (!retroviaProtetta(difensore)) return retroviaViva;
  return [];
}

export function campoCompletamenteVuoto(giocatore) {
  return campoDi(giocatore).filter(viva).length === 0;
}

// Rimuove le creature morte, le manda al cimitero, richiude gli spazi vuoti in prima linea.
export function ripulisciCampo(giocatore, log, avversario) {
  const morte = [...giocatore.primaLinea, ...giocatore.retrovia].filter((c) => !viva(c));
  morte.forEach((c) => {
    log(`💀 ${c.nome} distrutto`);
    // Effetto di ruolo Tank: alla morte di un alleato, gli altri Tank guadagnano +3 Vita permanenti.
    [...giocatore.primaLinea, ...giocatore.retrovia]
      .filter((x) => x !== c && x.ruolo === "tank" && viva(x))
      .forEach((tank) => {
        tank.vitaMax += 3;
        log(`✦ ${tank.nome} (Tank): +3 Vita permanenti`);
      });
    effettoMorteAlleato(c, giocatore.primaLinea, log);
  });

  giocatore.primaLinea = giocatore.primaLinea.filter(viva);
  giocatore.retrovia = giocatore.retrovia.filter(viva);

  // Effetto carta alla morte (es. Manipolatrice Nera): può riportare la creatura in campo.
  const definitivamenteMorte = morte.filter((c) => !effettoMorte(c, giocatore, tiraDadoImprevisti(), log));
  giocatore.cimitero.push(...definitivamenteMorte);
  if (avversario) definitivamenteMorte.forEach((c) => effettoMorteOffensivo(c, giocatore, avversario, log));

  // I Potenziamenti "finché resta in campo" restano nella zona Magie e Trappole legati al bersaglio
  // (cap. 14): quando quello muore per davvero (non se torna in campo per un effetto di rinascita),
  // la carta li segue al cimitero.
  if (definitivamenteMorte.length) {
    const idMorti = new Set(definitivamenteMorte.map((c) => c.id));
    const daScartare = giocatore.magieTrappole.filter((mt) => mt.bersaglioId && idMorti.has(mt.bersaglioId));
    if (daScartare.length) {
      giocatore.magieTrappole = giocatore.magieTrappole.filter((mt) => !daScartare.includes(mt));
      daScartare.forEach((mt) => {
        giocatore.cimitero.push(mt.carta);
        log(`✨ ${mt.carta.nome} va al cimitero: il bersaglio è stato distrutto`);
      });
    }
  }

  // Avanzamento automatico solo quando non c'è scelta da fare (candidati <= slot liberi):
  // se restano più Alieni in retrovia degli slot che si aprono, è il giocatore a scegliere chi
  // avanza (vedi avanzamentoAmbiguo / sistemaPrimaLinea nel reducer) — lo slot resta libero fino ad allora.
  if (!avanzamentoAmbiguo(giocatore)) {
    while (giocatore.primaLinea.length < ATTACCHI_PRIMA_LINEA && giocatore.retrovia.length > 0) {
      giocatore.primaLinea.push(giocatore.retrovia.shift());
    }
  }
  return definitivamenteMorte;
}
