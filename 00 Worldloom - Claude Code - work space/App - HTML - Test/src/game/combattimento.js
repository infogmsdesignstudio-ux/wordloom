import { attaccoEffettivo, parataEffettiva, viva } from "./mazzo.js";
import { campoDi } from "./giocatore.js";
import { calcolaMatchup } from "./costanti.js";
import { bonusAttaccoPassivo, bonusParataPassivo, bonusAttaccoContro } from "./effettiCarta.js";

export { calcolaMatchup };

// Attacco/Parata comprensivi dei passivi delle carte (che dipendono dal campo, quindi vanno ricalcolati).
export function attaccoTotale(creatura, giocatore) {
  return Math.max(0, attaccoEffettivo(creatura) + bonusAttaccoPassivo(creatura, giocatore));
}

export function parataTotale(creatura, giocatore) {
  return Math.max(0, parataEffettiva(creatura) + bonusParataPassivo(creatura, giocatore));
}

// Risolve un simbolo del dado di reazione contro l'Attacco/Parata effettivi (cap. 11).
// Ritorna { dannoDifensore, dannoAttaccante } — il contraccolpo (Spada/Scudo simmetrici).
//
// Spada/Scudo garantiscono almeno metà dell'Attacco dell'attaccante quando questo "vince" il
// confronto (prima era la pura differenza, che tra due Alieni di Livello 1 con statistiche vicine
// poteva essere quasi 0 — rendendo di fatto solo il Cuore in grado di uccidere in 2 colpi, cap. 8/11).
// Chi perde il confronto subisce ancora la differenza grezza come contraccolpo: non tocchiamo quel lato.
function danneggiaSimmetrico(A, valoreDifensore) {
  const diff = A - valoreDifensore;
  if (diff > 0) return { dannoDifensore: Math.max(diff, Math.ceil(A / 2)), dannoAttaccante: 0 };
  if (diff < 0) return { dannoDifensore: 0, dannoAttaccante: -diff };
  return { dannoDifensore: 0, dannoAttaccante: 0 };
}

// Pareggio esatto su Spada (Attacco attaccante === Attacco difensore, "pareggio rosso", cap. 11):
// entrambi gli Alieni si distruggono a vicenda, invece del normale 0 danni a entrambi. Su Scudo
// un pareggio esatto (Attacco === Parata) resta invece innocuo per entrambi, come sempre.
export function risolviSimbolo(simbolo, attaccante, difensore, attP, difP) {
  const A = attaccoTotale(attaccante, attP) + bonusAttaccoContro(attaccante, difensore);
  if (simbolo === "C") return { dannoDifensore: A, dannoAttaccante: 0 };
  if (simbolo === "D") return { dannoDifensore: 0, dannoAttaccante: 0 };
  if (simbolo === "S") {
    const attaccoDifensore = attaccoTotale(difensore, difP);
    if (A === attaccoDifensore) return { dannoDifensore: 0, dannoAttaccante: 0, pareggioMortale: true };
    return danneggiaSimmetrico(A, attaccoDifensore);
  }
  if (simbolo === "U") return danneggiaSimmetrico(A, parataTotale(difensore, difP));
  return { dannoDifensore: 0, dannoAttaccante: 0 };
}

// Quanto è "buono" un risultato per chi difende: meno danno subito è meglio, il contraccolpo aiuta.
// Il pareggio mortale su Spada equivale a perdere la propria creatura: va trattato come pessimo.
export function preferenzaDifensore(simbolo, attaccante, difensore, attP, difP) {
  const { dannoDifensore, dannoAttaccante, pareggioMortale } = risolviSimbolo(simbolo, attaccante, difensore, attP, difP);
  if (pareggioMortale) return -difensore.vitaMax + attaccante.vitaMax * 0.5;
  return -dannoDifensore + dannoAttaccante * 0.5;
}

// Effetto di ruolo Aggressore: se 3 Aggressori alleati attaccano nello stesso turno, +1 Attacco a tutti e 3.
export function attivaEffettoAggressore(attaccante, giocatore, log) {
  if (attaccante.ruolo !== "aggressore") return;
  if (!giocatore.aggressoriAttivatiQuestoTurno.includes(attaccante.id)) {
    giocatore.aggressoriAttivatiQuestoTurno.push(attaccante.id);
  }
  if (giocatore.aggressoriAttivatiQuestoTurno.length === 3) {
    giocatore.aggressoriAttivatiQuestoTurno.forEach((id) => {
      const c = campoDi(giocatore).find((x) => x.id === id);
      if (c) {
        c.tmpAttacco += 1;
        log(`✦ ${c.nome} (Aggressore): +1 Attacco fino a fine turno — 3 Aggressori hanno attaccato`);
      }
    });
  }
}

// Effetto di ruolo Difensore: se 2 Difensori alleati difendono nello stesso turno, il 2° guadagna +2 Parata.
export function attivaEffettoDifensore(difensore, giocatore, log) {
  if (difensore.ruolo !== "difensore") return;
  if (!giocatore.difensoriAttivatiQuestoTurno.includes(difensore.id)) {
    giocatore.difensoriAttivatiQuestoTurno.push(difensore.id);
  }
  if (giocatore.difensoriAttivatiQuestoTurno.length === 2) {
    const secondoId = giocatore.difensoriAttivatiQuestoTurno[1];
    const c = campoDi(giocatore).find((x) => x.id === secondoId);
    if (c) {
      c.tmpParata += 2;
      log(`✦ ${c.nome} (Difensore): +2 Parata fino a fine turno — 2° Difensore che si attiva`);
    }
  }
}

// Effetto di ruolo Evasivo (semplificato): alla 2ª Schivata nello stesso turno contro lo stesso attaccante,
// si scambia automaticamente con un alleato in retrovia (se disponibile).
export function attivaEffettoEvasivo(difensore, giocatore, attaccanteId, log) {
  if (difensore.ruolo !== "evasivo") return;
  difensore.schivateSubite[attaccanteId] = (difensore.schivateSubite[attaccanteId] ?? 0) + 1;
  if (difensore.schivateSubite[attaccanteId] !== 2) return;
  const sostituto = giocatore.retrovia.find(viva);
  if (!sostituto) return;
  const iFront = giocatore.primaLinea.findIndex((x) => x.id === difensore.id);
  const iBack = giocatore.retrovia.findIndex((x) => x.id === sostituto.id);
  if (iFront < 0 || iBack < 0) return;
  giocatore.primaLinea[iFront] = sostituto;
  giocatore.retrovia[iBack] = difensore;
  log(`✦ ${difensore.nome} (Evasivo): si scambia con ${sostituto.nome} dopo la 2ª schivata contro lo stesso attaccante`);
}

// Chi decide il diritto di ripetizione, in base al matchup. null se nessuno (matchup neutro).
export function decisoreDiritto(matchup) {
  if (matchup === "eff") return "attaccante";
  if (matchup === "ineff") return "difensore";
  return null;
}
