// Salvataggio partita (cap. sistema di salvataggio): un solo slot, sempre — non uno stile "slot
// multipli" da videogioco, una sola partita in sospeso alla volta, coerente con come funziona una
// partita fisica vera. Salvataggio automatico ad ogni mossa (nessun bottone "Salva" da premere):
// lo stato di gioco è già un oggetto JS semplice (nessuna funzione/Map/Set), si serializza diretto.
import { garantisciContatoreIdAlmeno } from "./mazzo.js";
import { TEMPI } from "./tempi.js";

const CHIAVE_STORAGE = "wl_partita_salvata";

// Campi "in corso"/di sola messa in scena (cap. UX Sezioni 3-8, coda visiva): valorizzati solo per
// la durata di un'animazione UI che al momento del ripristino non esiste più — nessuno di questi fa
// parte dello stato di gioco vero (PV, carte, turno, ciò che sta aspettando una decisione), quindi
// riportarli a "riposo" al caricamento è sicuro e necessario (altrimenti la UI resterebbe bloccata
// ad aspettare un timer/dispatch di conferma che non arriverà mai). Il salvataggio stesso NON filtra
// nulla — salva lo stato così com'è in quel momento, anche a metà di un'animazione — la pulizia
// avviene solo in lettura, un unico punto invece di doverci pensare ad ogni singolo salvataggio.
const CAMPI_TRANSITORI_A_NULL = [
  "eventoDanno",
  "lancioDado",
  "dadoInCorso",
  // pescaInCorso / evocazioneInCorso / movimentiInCorso RITIRATI (idea 59 Fase 3): i tre voli sono
  // passi "anim" di s.sequenza, che viene già svuotata al ripristino (vedi sotto). La carta/creatura
  // è già nello stato vero — si perde solo l'eventuale volo a metà.
  "vfxMagia",
  "morteInCorso",
  "avanzamentoAutomaticoRecente",
  "notificaEffetto",
  "faseVisibile",
  "imprevistoVisivo",
];

// Trova il massimo id/_uid presente nello stato salvato (creature in campo, carte in mano/mazzo/
// cimitero, ecc.) — serve a far ripartire il contatore di mazzo.js da un punto sicuro dopo il
// ripristino (vedi garantisciContatoreIdAlmeno). Scansione ricorsiva generica invece di elencare a
// mano ogni array (mano/mazzo/primaLinea/retrovia/cimitero/magieTrappole/...): più lenta ma non
// rischia di dimenticare un punto se in futuro se ne aggiunge uno nuovo.
function trovaIdMassimo(valore, massimoCorrente = 0) {
  if (Array.isArray(valore)) {
    return valore.reduce((m, v) => trovaIdMassimo(v, m), massimoCorrente);
  }
  if (valore && typeof valore === "object") {
    let m = massimoCorrente;
    if (typeof valore.id === "number") m = Math.max(m, valore.id);
    if (typeof valore._uid === "number") m = Math.max(m, valore._uid);
    for (const chiave in valore) m = trovaIdMassimo(valore[chiave], m);
    return m;
  }
  return massimoCorrente;
}

export function salvaPartita(stato) {
  try {
    localStorage.setItem(CHIAVE_STORAGE, JSON.stringify(stato));
    return true;
  } catch {
    return false;
  }
}

export function esistePartitaSalvata() {
  try {
    return localStorage.getItem(CHIAVE_STORAGE) !== null;
  } catch {
    return false;
  }
}

// Rilegge la partita salvata, ripristinandola a uno stato "di riposo" pronto per continuare a
// giocare — null se non esiste nulla o se il dato è corrotto/incompatibile (mai far esplodere
// l'app per un salvataggio illeggibile, semplicemente si ricomincia da capo).
export function caricaPartita() {
  try {
    const raw = localStorage.getItem(CHIAVE_STORAGE);
    if (!raw) return null;
    const stato = JSON.parse(raw);
    if (!stato || typeof stato !== "object" || !stato.giocatori) return null;
    CAMPI_TRANSITORI_A_NULL.forEach((campo) => {
      stato[campo] = null;
    });
    stato.codaVisiva = [];
    // Idea 59 — coda di step unica: si riparte a fila vuota (i passi di combattimento in sospeso
    // aspettano timer/dispatch che al ripristino non arriveranno mai). Lo stato di gioco vero è già
    // stato risolto dietro le quinte, si perde solo l'eventuale scenografia a metà. Fase 2: se una
    // catena era aperta, s.catena è ancora vero e persistito — il case "carica-stato" del reducer
    // (sincronizzaPassoCatena) ricostruisce il passo scelta:catena / catenaRisoluzione mancante.
    stato.sequenza = [];
    // Il timer di turno è un timestamp ASSOLUTO (gameReducer.js, iniziaTurno): un salvataggio
    // ripreso anche solo qualche minuto dopo avrebbe turnoScadenza nel passato → Campo.jsx
    // dispatcherebbe "timer-scaduto" all'istante, facendo saltare il turno di chi riprende (e a
    // cascata anche i successivi). Al ripristino si riparte con un turno pieno.
    if (stato.turnoScadenza) stato.turnoScadenza = Date.now() + TEMPI.turno;
    garantisciContatoreIdAlmeno(trovaIdMassimo(stato.giocatori) + 1);
    return stato;
  } catch {
    return null;
  }
}

export function cancellaPartitaSalvata() {
  try {
    localStorage.removeItem(CHIAVE_STORAGE);
  } catch {
    // niente da fare: se localStorage non è disponibile, non c'era comunque nulla da cancellare
  }
}
