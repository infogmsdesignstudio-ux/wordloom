import { creaCreatura } from "./mazzo.js";
import { campoDi, campoPieno } from "./giocatore.js";

export function valoreTributi(giocatore) {
  return campoDi(giocatore)
    .filter((c) => !c.fresca)
    .reduce((tot, c) => tot + c.livello, 0);
}

// Evocazione bonus: costo 1, si paga scartando una carta, non disponibile al primo turno del giocatore.
export function puoEvocareBonus(giocatore) {
  return !giocatore.evocazioneBonusFatta && giocatore.turniGiocati > 1 && giocatore.mano.length >= 2 && !campoPieno(giocatore);
}

// Il tipo carta si chiama "pedina" dal 2026-08-29 (prima "alieno"): rinomina terminologica
// applicata insieme agli Excel e a genera_cards_json.py. Il vecchio valore resta accettato perche'
// vive nei salvataggi gia' fatti (localStorage) e nei cards.json non rigenerati.
export function eUnAlieno(carta) {
  const tipo = carta?.tipoCarta ?? "pedina";
  return tipo === "pedina" || tipo === "alieno";
}

export function puoEvocareNormale(giocatore, carta) {
  if (!eUnAlieno(carta)) return false;
  if (giocatore.evocazioneNormaleFatta) return false;
  // Manipolatrice Suprema: evocabile solo se si controllano già almeno 3 Manipolatrici.
  if (carta.effetto?.codice === "suprema" && campoDi(giocatore).filter((c) => c.nome.includes("Manipolatrice")).length < 3) return false;
  // cap. bug "tributo bloccato a campo pieno": il campo pieno blocca solo l'evocazione DIRETTA
  // (livello 1, aggiunge una creatura senza toglierne nessuna) — un tributo (livello 2+) sacrifica
  // sempre almeno una creatura del proprio campo prima di aggiungerne una nuova (confermaTributo in
  // gameReducer.js richiede tributiSelezionati per un valore >= carta.livello, mai zero), quindi non
  // può mai far salire il conteggio oltre il limite: non va bloccato solo perché il campo è pieno ORA.
  if (carta.livello === 1) return !campoPieno(giocatore);
  return valoreTributi(giocatore) >= carta.livello;
}

// Esegue l'evocazione vera e propria (sacrifici + creazione + piazzamento). Muta 'giocatore', usa log().
export function eseguiEvocazione(giocatore, indiceMano, tributiIds, log) {
  const carta = giocatore.mano[indiceMano];
  if (!carta) return null;

  tributiIds.forEach((id) => {
    const inFront = giocatore.primaLinea.findIndex((c) => c.id === id);
    const inBack = giocatore.retrovia.findIndex((c) => c.id === id);
    const creatura = inFront >= 0 ? giocatore.primaLinea[inFront] : inBack >= 0 ? giocatore.retrovia[inBack] : null;
    if (!creatura) return;
    giocatore.cimitero.push(creatura);
    if (inFront >= 0) giocatore.primaLinea.splice(inFront, 1);
    else giocatore.retrovia.splice(inBack, 1);
    log(`⬆ Sacrifica ${creatura.nome}`);
  });

  giocatore.mano.splice(indiceMano, 1);
  const creatura = creaCreatura(carta);
  if (giocatore.primaLinea.length < 3) giocatore.primaLinea.push(creatura);
  else giocatore.retrovia.push(creatura);
  log(`✦ Evoca ${creatura.nome} (${creatura.archetipo} · ❤${creatura.vitaMax} 🛡${creatura.parataBase} ⚔${creatura.attaccoBase})`);
  return creatura;
}

// Evocazione bonus: scarta la carta a 'indiceScarto' per pagare l'evocazione della carta a 'indiceMano'.
export function eseguiEvocazioneBonus(giocatore, indiceMano, indiceScarto, log) {
  if (indiceScarto === indiceMano) return null;
  const scartata = giocatore.mano[indiceScarto];
  if (!scartata) return null;
  giocatore.cimitero.push({ ...scartata, id: `carta-${Date.now()}`, danno: 0 });
  const indiceMano2 = indiceScarto < indiceMano ? indiceMano - 1 : indiceMano;
  giocatore.mano.splice(indiceScarto, 1);
  log(`🗑 Scarti ${scartata.nome} per l'evocazione bonus`);
  const creatura = eseguiEvocazione(giocatore, indiceMano2, [], log);
  giocatore.evocazioneBonusFatta = true;
  return creatura;
}
