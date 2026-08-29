// Primitive generiche riutilizzabili per il testo delle carte (cap. 14 del regolamento — stesse parole
// chiave lì definite: Sacrifica, Annulla, Distruggi, Evoca speciale, Scarta, Bersaglio/Seleziona/Indica,
// Tira dado). Una nuova carta che usa uno di questi verbi richiama la funzione qui invece di riscrivere
// la logica da zero: un solo posto da correggere/estendere invece di N copie sparse tra effettiCarta.js,
// magieTrappole.js e gameReducer.js.
//
// Modulo "puro" nello stesso senso di catena.js: non importa nulla da gameReducer.js (lo importerebbe
// lui, creando un ciclo) — dove serve una funzione privata del reducer (es. registraLancioDado per
// l'animazione del dado) viene passata come parametro da chi chiama, non importata qui.

import { viva, creaCreatura } from "../mazzo.js";
import { ripulisciCampo } from "../giocatore.js";
import { ATTACCHI_PRIMA_LINEA, SLOT_RETROVIA } from "../costanti.js";

// SACRIFICA — distrugge un elemento del proprio campo per pagare il costo di un effetto (cap. 14).
// Diverso dal tributo di evocazione (cap. 7): qui l'elemento non "vale" nulla in cambio, è solo il
// prezzo da pagare. `elemento` è { tipoElemento: "creatura", creatura } oppure
// { tipoElemento: "magiaTrappola", slot }.
export function sacrifica(giocatore, avversario, elemento, log) {
  if (!elemento) return false;
  const scrivi = log ?? (() => {});
  if (elemento.tipoElemento === "creatura") {
    const c = elemento.creatura;
    if (!c || !viva(c)) return false;
    c.danno = c.vitaMax;
    scrivi(`🩸 ${c.nome} sacrificata`);
    ripulisciCampo(giocatore, scrivi, avversario);
    return true;
  }
  if (elemento.tipoElemento === "magiaTrappola") {
    const slot = elemento.slot;
    const i = giocatore.magieTrappole.indexOf(slot);
    if (i < 0) return false;
    giocatore.magieTrappole.splice(i, 1);
    giocatore.cimitero.push(slot.carta);
    scrivi(`🩸 ${slot.carta.nome} sacrificata`);
    return true;
  }
  return false;
}

// DISTRUGGI — rimuove fisicamente un elemento dal campo, proprio o avversario (cap. 14). Per una
// creatura riusa lo stesso pattern già in uso ovunque nel motore (danno = vitaMax, poi ripulisciCampo
// si occupa del resto: log, effetto di ruolo Tank, eventuale rinascita, e scarta in automatico anche un
// eventuale Potenziamento legato a lei — quella parte era già generica in giocatore.js, non serviva
// toccarla). Non prova a "disfare" un effetto persistente diverso da un Potenziamento legato a un
// bersaglio (es. annullare un bonus di una Magia Continua globale): nessuna carta reale lo richiede
// ancora, si estende qui quando arriva.
export function distruggi(giocatore, avversario, elemento, log) {
  if (!elemento) return false;
  const scrivi = log ?? (() => {});
  if (elemento.tipoElemento === "creatura") {
    const c = elemento.creatura;
    if (!c || !viva(c)) return false;
    c.danno = c.vitaMax;
    scrivi(`💥 ${c.nome} distrutta`);
    ripulisciCampo(giocatore, scrivi, avversario);
    return true;
  }
  if (elemento.tipoElemento === "magiaTrappola") {
    const slot = elemento.slot;
    const i = giocatore.magieTrappole.indexOf(slot);
    if (i < 0) return false;
    giocatore.magieTrappole.splice(i, 1);
    giocatore.cimitero.push(slot.carta);
    scrivi(`💥 ${slot.carta.nome} distrutta`);
    return true;
  }
  return false;
}

// ANNULLA — ferma un evento già dichiarato prima che si risolva (cap. 14). Il modo preciso dipende dal
// tipo di evento (evento.tipo): oggi copre "attaccoDichiarato" — stesso comportamento già in uso per
// "Fato Spezzato" e le Trappole equivalenti: l'attacco non colpisce nessuno, ma l'attaccante perde
// comunque l'attacco dichiarato. Nuovi tipi (dopoTiro, evocazione, attaccoDiretto) si aggiungono qui
// quando la prima carta reale li userà — oggi quei tre casi restano sul vecchio flusso a scelta
// singola (Sezione 4 della roadmap catena, non ancora agganciata).
export function annulla(stato, evento, attaccante) {
  if (evento?.tipo === "attaccoDichiarato" && attaccante) {
    attaccante.attacchiUsati += 1;
    stato.combattimento = null;
    return true;
  }
  return false;
}

// EVOCA SPECIALE — posiziona una creatura come conseguenza dell'effetto di un'altra carta, bypassando
// il costo/tributo normale (cap. 7/14). Sempre esente dalla regola "appena evocata non si tocca/sposta/
// sacrifica": fresca viene forzata a false, a differenza di creaCreatura da sola (che la mette sempre a
// true, pensata per l'evocazione normale). Ritorna la creatura creata, o null se il campo è pieno.
export function evocaSpeciale(giocatore, templateCarta, log) {
  if (giocatore.primaLinea.length >= ATTACCHI_PRIMA_LINEA && giocatore.retrovia.length >= SLOT_RETROVIA) {
    return null;
  }
  const creatura = creaCreatura(templateCarta);
  creatura.fresca = false;
  if (giocatore.primaLinea.length < ATTACCHI_PRIMA_LINEA) giocatore.primaLinea.push(creatura);
  else giocatore.retrovia.push(creatura);
  log?.(`${creatura.nome} evocata (evocazione speciale)`);
  return creatura;
}

// SCARTA — sposta una carta dalla mano al cimitero senza attivarne l'effetto (cap. 14).
export function scarta(giocatore, indiceMano, log) {
  const carta = giocatore.mano[indiceMano];
  if (!carta) return false;
  giocatore.mano.splice(indiceMano, 1);
  giocatore.cimitero.push(carta);
  log?.(`${carta.nome} scartata`);
  return true;
}

// TIRA DADO — lancia il dado indicato, fa partire l'animazione (delegata a chi chiama: `registrare` è
// la funzione privata del reducer che accoda l'evento visivo, cap. idea 59 — passata come parametro
// invece che importata, per non creare un ciclo con gameReducer.js), poi applica l'effetto giusto in
// base alla faccia uscita. `gestori` è una mappa faccia -> funzione; "default" copre le facce non
// elencate esplicitamente.
export function tiraDado(stato, { tipo, archetipo }, tirare, registrare, gestori) {
  const faccia = tirare(archetipo);
  registrare(stato, tipo, archetipo ?? null, faccia);
  const gestore = gestori?.[faccia] ?? gestori?.default;
  gestore?.(faccia);
  return faccia;
}

// SELEZIONA / BERSAGLIO / INDICA — generalizza il pattern "tocca per scegliere/togliere, si risolve da
// solo al numero richiesto" già in uso per i bersagli Magia e i tributi di evocazione (cap. 14). Pure
// funzioni di stato: chi chiama tiene il proprio array di id selezionati (es. un nuovo campo di stato
// dedicato, sullo stesso schema di s.bersagliMagiaSelezionati) e usa queste due per farlo avanzare.
export function selezionaElemento(selezionati, elementoId) {
  const i = selezionati.indexOf(elementoId);
  return i >= 0 ? selezionati.filter((x) => x !== elementoId) : [...selezionati, elementoId];
}

export function selezioneCompleta(selezionati, richiesti) {
  return selezionati.length >= richiesti;
}
