// Prospettiva (cap. 1v1 locale): quale seme "io"/"avversario" deve vedere lo schermo ORA — usata da
// tutti i componenti UI (Campo, Mano, App, PromptCombattimento, CatenaStriscia) per decidere chi vede
// il proprio campo/mano in basso e a chi è rivolto un prompt. Centralizzata qui invece che duplicata
// in ogni file (come nel primo giro della Fase 1) perché da qui in poi la logica è più che un singolo
// confronto: durante il combattimento la decisione spetta spesso al DIFENSORE, non a chi ha il turno.
//
// Contro IA resta sempre "io" (comportamento invariato dall'inizio del progetto). In 1v1 locale segue
// di norma il turno (giocatoreAttivo), ma quando è aperta una finestra che richiede la risposta di un
// giocatore specifico — priorità nella catena, scelta di chi avanza in prima linea, e soprattutto le
// decisioni del difensore durante un attacco (rifiuto/ripetizione) — passa a lui finché quella
// decisione non è risolta. Nel gioco fisico corrisponde a passare il telefono anche a metà turno
// (confermato con l'utente prima di costruire questo pezzo).
export function chiDecideOra(stato) {
  if (!stato || stato.modalitaGioco !== "1v1locale") return "io";
  if (stato.catena?.turnoDiPriorita) return stato.catena.turnoDiPriorita;
  if (stato.avanzamentoRichiesto) return stato.avanzamentoRichiesto;
  const comb = stato.combattimento;
  if (comb) {
    if (comb.step === "ripetizione") {
      return comb.decisore === "attaccante" ? comb.proprietario : comb.difProprietario;
    }
    // "trappola"/"rifiuto"/"tiro": il difensore resta al centro dell'attenzione (deve reagire, o ha
    // appena reagito e il dado sta rotolando) finché non serve esplicitamente l'attaccante
    // (ripetizione sopra) — evita di rimbalzare il passaggio del telefono ad ogni singolo sotto-passo.
    if (comb.step !== "bersaglio") return comb.difProprietario;
  }
  return stato.giocatoreAttivo;
}

export function altroSeme(chiave) {
  return chiave === "io" ? "avversario" : "io";
}
