// Sorgente unica dei tempi di messa in scena (idea 59 — "coda di step unica", Fase 1).
//
// Ogni durata di animazione e ogni "respiro" tra un passo e il successivo vive qui, così JS e CSS
// non possono disallinearsi: il direttore della coda (<Sequenziatore> in App.jsx) legge questi
// valori per i timeout di sicurezza, e le @keyframes in index.css leggono gli stessi numeri via
// custom property (`var(--t-balzo, …)`) iniettate una volta all'avvio da iniettaTempiCss().
//
// I valori sono presi 1:1 da come il gioco anima OGGI:
// - dado: LancioDado.jsx — 9 passi × 80ms di roll, poi 450ms fermo sul risultato prima di segnalare
// - balzo: index.css .carta-attacca-* — animation 0.55s
// - numeroDanno: index.css .carta-esito-numero / vita-flash-danno — animation 1.15s
// - morte: AnimazioneMorte.jsx — 240 contraccolpo + 380 volo + 120 impatto
// - catena: CatenaStriscia.jsx — countdown "Risolvi" 15s (ex DURATA_RISOLVI_MS), scenografia di
//   risoluzione di un frame 700ms (ex DURATA_RISOLUZIONE_MS) — vedi Fase 2 dell'idea 59
// - respiro: ex RITARDO_PRIMA_DI_MS in App.jsx (gap di default tra un evento e il successivo)
// - turno: ex DURATA_TURNO_MS di costanti.js (spostato qui: unica sorgente anche per questo)
//
// Blindato da Engine/test-blindati/tempi.blindato.mjs (snapshot dell'oggetto).

export const TEMPI = {
  dado: { roll: 720, assesto: 450, totale: 1170 },
  balzo: 550,
  numeroDanno: 1150,
  morte: { contraccolpo: 240, volo: 380, impatto: 120, totale: 740 },
  // Catena di effetti (idea 59, Fase 2): countdown della decisione "aggiungi carta / Risolvi" e
  // durata della scenografia di risoluzione di un singolo frame (numero d'ordine + linea di
  // connessione) prima che l'effetto reale venga applicato.
  catena: { countdown: 15000, scenografia: 700 },
  // Voli della Fase 3 (idea 59): pesca, evocazione, spostamento fila. Qui vivono SOLO i totali,
  // usati dal <Sequenziatore> come timeout di sicurezza del passo "anim" — la fine vera la segnala
  // il componente con "sequenza-passo-concluso". La coreografia interna (solleva/centro/sosta/volo)
  // resta nei rispettivi componenti (decisione utente 2026-08-29). Valori 1:1 da come animano oggi:
  // - pesca: AnimazionePescata.jsx — SINGOLA ~1,6s; multipla staggerata (perCartaExtra per carta oltre la prima)
  // - evoca: AnimazioneEvocazione.jsx — DURATA_TOTALE_MS (solleva+centro+sosta+volo+impatto+assesto)
  // - sposta: AnimazionePosizionamento.jsx — DURATA_TOTALE_MS (max avanzata/ritirata + margine)
  pesca: { unaCarta: 1700, perCartaExtra: 340 },
  evoca: 1970,
  sposta: 620,
  // Turno IA (idea 59, Fase 4): il "respiro" tra un passo dell'avversario e il successivo — evoca,
  // poi ogni singolo scontro. È il durataMs del passo muta:"ia" della fila (ex timer fisso di 900ms
  // scritto a mano nell'useEffect iaInAttesa di App.jsx, RITIRATO insieme al campo s.iaInAttesa).
  // Stesso valore di prima: la sensazione del turno IA non cambia, cambia solo chi lo scandisce.
  ia: { respiro: 900 },
  // Banner di fase (idea 59, Fase 5): il cartello che annuncia la fase al centro del campo
  // (TitoloFase.jsx), ora passo "banner" della fila invece di un useEffect che osservava s.fase.
  // - fase: 1750ms = il valore di sempre (ex DURATA_MS in TitoloFase.jsx), per le fasi 1-4.
  // - vespro: 2600ms = +850ms di sola TENUTA per il cartello di fine turno (P2.1, "restare a schermo
  //   più a lungo, segna il cambio turno"). Entrata (500ms) e uscita (450ms) restano identiche in
  //   millisecondi assoluti: in index.css c'è un secondo set di @keyframes con le percentuali
  //   ricalcolate su 2600, NON le stesse riscalate (riscalarle rallenterebbe l'entrata invece di
  //   tenere fermo il cartello più a lungo).
  banner: { fase: 1750, vespro: 2600 },
  // Gap di default tra un passo "anim"/"muta" e il successivo, quando il passo non porta un
  // durataMs esplicito. Il direttore somma questo a TEMPI[nome] per il timeout di sicurezza.
  respiro: 200,
  // Durata del turno (timestamp assoluto di scadenza calcolato in gameReducer.js/iniziaTurno).
  turno: 180000,
};

// Inietta i tempi come custom property su :root, così le @keyframes di index.css li leggono dallo
// stesso posto (var(--t-…, fallback)). Chiamata una volta da App.jsx in un useEffect — mai a livello
// di modulo, perché tempi.js è importato anche dai test headless (Node) dove `document` non esiste.
// Il fallback nelle regole CSS copre comunque il primo paint prima che questo effetto giri.
export function iniettaTempiCss(doc = (typeof document !== "undefined" ? document : null)) {
  const root = doc?.documentElement;
  if (!root) return;
  root.style.setProperty("--t-balzo", TEMPI.balzo + "ms");
  root.style.setProperty("--t-numero-danno", TEMPI.numeroDanno + "ms");
  // Idea 59 Fase 5: le due durate del banner di fase. Le @keyframes in index.css restano due set
  // distinti (le percentuali non sono le stesse), ma la DURATA la leggono da qui — così il passo
  // della fila e l'animazione CSS non possono disallinearsi.
  root.style.setProperty("--t-banner-fase", TEMPI.banner.fase + "ms");
  root.style.setProperty("--t-banner-vespro", TEMPI.banner.vespro + "ms");
}
