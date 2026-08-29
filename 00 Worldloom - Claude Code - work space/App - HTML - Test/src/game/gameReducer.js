import { viva, vitaAttuale } from "./mazzo.js";
import {
  nuovoGiocatore,
  pesca,
  campoDi,
  campoPieno,
  bersagliValidi,
  campoCompletamenteVuoto,
  ripulisciCampo,
  avanzamentoAmbiguo,
} from "./giocatore.js";
import { puoEvocareBonus, puoEvocareNormale, eseguiEvocazione, eseguiEvocazioneBonus, eUnAlieno } from "./evocazione.js";
import {
  risolviSimbolo,
  preferenzaDifensore,
  attaccoTotale,
  attivaEffettoAggressore,
  attivaEffettoDifensore,
  attivaEffettoEvasivo,
  decisoreDiritto,
  calcolaMatchup,
} from "./combattimento.js";
import { tiraDadoArchetipo, tiraDadoImprevisti, NOME_SIMBOLO } from "./costanti.js";
import { TEMPI } from "./tempi.js";
// sequenza.js è un modulo di soli selettori read-only senza import propri: nessun rischio di ciclo.
import { haPassoIa } from "./sequenza.js";
import {
  effettoEvocazione,
  effettiSimbolo,
  effettiInizioTurno,
  effettoMorte,
  magoPuoRitirare,
  attivaEffettoPreAttacco,
  consumaSchivataAutomatica,
  applicaDannoConSopravvivenza,
} from "./effettiCarta.js";
import { avanzaImprevisti } from "./imprevisti.js";
import { nuovaCatena, apriPriorita, aggiungiFrame, passa, rimuoviFrameInCima, catenaVuota } from "./catena.js";
import { annulla as annullaEvento } from "./effetti/primitive.js";
import { classificaSottotipoMagia, esitoDopoRisoluzioneMagia } from "./effetti/tipiMagia.js";
import {
  magiaGiocabile,
  magiaRichiedeBersaglio,
  numeroBersagliMagia,
  giocaMagia,
  modificaDannoDaTerreno,
  retrovieEsposteDaTerreno,
  carteEleggibiliPerRisposta,
  scartaTrappola,
  risolviTrappolaEvocazioneNemica,
  restituisciControlloTemporaneo,
} from "./magieTrappole.js";

export function gameReducer(stato, azione) {
  switch (azione.type) {
    case "nuova-partita":
      return nuovaPartita(
        azione.cardsData,
        azione.cardsDataAvversario ?? azione.cardsData,
        azione.modalitaGioco,
        azione.primoGiocatoreForzato,
        azione.listaMazzo,
        azione.listaMazzoAvversario,
        azione.identitaMazzoIo,
        azione.identitaMazzoAvversario,
        azione.sfondoCampoIo,
        azione.sfondoCampoAvversario
      );

    // Cap. sistema di salvataggio: sostituisce di netto lo stato con quello appena ricaricato da
    // salvataggio.js (già sanificato dei campi transitori) — nessuna logica di gioco qui, è solo il
    // punto d'ingresso per "Riprendi partita".
    case "carica-stato": {
      const s = azione.stato;
      // Idea 59 Fase 2: salvataggio.js ha svuotato s.sequenza. Se una catena era aperta, il suo passo
      // scelta:catena / catenaRisoluzione è andato perso — ricostruiscilo dallo stato di s.catena
      // (ancora vero e persistito), altrimenti la finestra resterebbe a schermo senza modo di andare
      // avanti.
      sincronizzaPassoCatena(s);
      // Idea 59 Fase 4: stesso motivo per il turno IA. Il passo muta:"ia" (ex campo s.iaInAttesa,
      // che sopravviveva al salvataggio) è andato perso con lo svuotamento della fila — senza
      // ricostruirlo, una partita ripresa a metà turno avversario resterebbe ferma per sempre.
      sincronizzaPassoIa(s);
      return s;
    }

    // Cap. sistema di salvataggio: "torna al menu" a partita in corso — non cancella il salvataggio
    // (l'autosave l'ha già scritto ad ogni mossa), semplicemente smette di mostrarla finché non la
    // riprendi. Sicuro anche a metà turno IA o di un prompt aperto: si ricomincia da lì al ripristino.
    case "abbandona-a-menu":
      return null;

    case "continua-fase": {
      const s = structuredClone(stato);
      // Coda di animazioni (cap. idea 59/B16): azzerata a ogni dispatch, si riempie SOLO con gli
      // eventi visivi prodotti da QUESTA azione — la dispatch "avanza-coda-visiva" li rivela uno alla
      // volta (scrive lancioDado/animazioneAttacco/ecc.) invece di mostrarli tutti insieme. Nessuna
      // logica di gioco cambia, solo il modo/tempo in cui questi campi di sola-UI vengono valorizzati.
      s.codaVisiva = [];
      continuaFase(s);
      return s;
    }

    // Timer di turno scaduto (cap. rail, richiesta esplicita dell'utente): passa il turno così com'è,
    // senza chiedere conferma né scegliere nulla al posto del giocatore — semplicemente smette di
    // aspettare. La UI (Campo.jsx/Rail) manda questa dispatch solo quando il tempo reale è scaduto
    // davvero (calcolato da s.turnoScadenza), ma qui si ricontrolla comunque lato reducer prima di
    // agire — mai forzare la fine di un turno a metà di un combattimento/catena/scelta in sospeso,
    // lascerebbe lo stato incoerente. Se non è sicuro in questo preciso istante, non succede nulla:
    // turnoScadenza resta nel passato, la UI ridispatcherà allo stesso modo al giro successivo,
    // finché la situazione pendente non si risolve da sola.
    case "timer-scaduto": {
      // Idea 59: mai troncare una scenografia di combattimento a metà (la fila di step contiene una
      // morte differita ancora da applicare) — si riprova al giro dopo.
      if (stato.vincitore || stato.combattimento || stato.catena || stato.modalita || stato.notificaEffetto || stato.sequenza?.length) return stato;
      // Idea 59 Fase 5 (P2.3, "aspettare che l'ultima azione/animazione in corso finisca, POI Vespro,
      // POI cambio turno — non tagliare di netto"): la guardia sopra copriva solo la FILA, ma i flussi
      // non ancora migrati vivono in coda visiva — un dado Imprevisti che rotola, il numero rosso di un
      // danno diretto, la morte da Imboscata venivano ancora troncati di netto. Nessun rischio di
      // stallo: sono tutti flussi che finiscono da soli, e Campo.jsx ridispatcha ad ogni tick del
      // secondo finché il turno non cambia davvero.
      if (stato.codaVisiva?.length || stato.dadoInCorso || stato.morteInCorso) return stato;
      const s = structuredClone(stato);
      s.codaVisiva = [];
      fineTurno(s);
      if (!s.vincitore) iniziaTurno(s);
      return s;
    }
    case "rifornimento": {
      const s = structuredClone(stato);
      // Coda di animazioni (cap. idea 59/B16): azzerata a ogni dispatch, si riempie SOLO con gli
      // eventi visivi prodotti da QUESTA azione — la dispatch "avanza-coda-visiva" li rivela uno alla
      // volta (scrive lancioDado/animazioneAttacco/ecc.) invece di mostrarli tutti insieme. Nessuna
      // logica di gioco cambia, solo il modo/tempo in cui questi campi di sola-UI vengono valorizzati.
      s.codaVisiva = [];
      // cap. 1v1 locale: giocatoreAttivo può essere "avversario" quando è un umano vero (eseguiRifornimento è già generica, usa s.giocatoreAttivo internamente).
      if (s.giocatoreAttivo === "io" || s.modalitaGioco === "1v1locale") eseguiRifornimento(s, azione.doppio);
      return s;
    }
    case "muovi-creatura": {
      const s = structuredClone(stato);
      // Coda di animazioni (cap. idea 59/B16): azzerata a ogni dispatch, si riempie SOLO con gli
      // eventi visivi prodotti da QUESTA azione — la dispatch "avanza-coda-visiva" li rivela uno alla
      // volta (scrive lancioDado/animazioneAttacco/ecc.) invece di mostrarli tutti insieme. Nessuna
      // logica di gioco cambia, solo il modo/tempo in cui questi campi di sola-UI vengono valorizzati.
      s.codaVisiva = [];
      muoviCreatura(s, azione.creaturaId, azione.rectPropria ?? null, azione.rectAltra ?? null);
      return s;
    }
    case "conferma-scambio-retrovia": {
      const s = structuredClone(stato);
      s.codaVisiva = [];
      confermaScambioRetrovia(s);
      return s;
    }
    case "seleziona-mano": {
      const s = structuredClone(stato);
      // Coda di animazioni (cap. idea 59/B16): azzerata a ogni dispatch, si riempie SOLO con gli
      // eventi visivi prodotti da QUESTA azione — la dispatch "avanza-coda-visiva" li rivela uno alla
      // volta (scrive lancioDado/animazioneAttacco/ecc.) invece di mostrarli tutti insieme. Nessuna
      // logica di gioco cambia, solo il modo/tempo in cui questi campi di sola-UI vengono valorizzati.
      s.codaVisiva = [];
      selezionaMano(s, azione.indice, azione.sorgenteRect ?? null);
      return s;
    }
    case "piazza-magia": {
      const s = structuredClone(stato);
      // Coda di animazioni (cap. idea 59/B16): azzerata a ogni dispatch, si riempie SOLO con gli
      // eventi visivi prodotti da QUESTA azione — la dispatch "avanza-coda-visiva" li rivela uno alla
      // volta (scrive lancioDado/animazioneAttacco/ecc.) invece di mostrarli tutti insieme. Nessuna
      // logica di gioco cambia, solo il modo/tempo in cui questi campi di sola-UI vengono valorizzati.
      s.codaVisiva = [];
      piazzaMagiaCoperta(s, azione.indice);
      return s;
    }
    case "attiva-magia-piazzata": {
      const s = structuredClone(stato);
      // Coda di animazioni (cap. idea 59/B16): azzerata a ogni dispatch, si riempie SOLO con gli
      // eventi visivi prodotti da QUESTA azione — la dispatch "avanza-coda-visiva" li rivela uno alla
      // volta (scrive lancioDado/animazioneAttacco/ecc.) invece di mostrarli tutti insieme. Nessuna
      // logica di gioco cambia, solo il modo/tempo in cui questi campi di sola-UI vengono valorizzati.
      s.codaVisiva = [];
      attivaMagiaPiazzata(s, azione.indiceSlot);
      return s;
    }
    case "seleziona-tributo": {
      const s = structuredClone(stato);
      // Coda di animazioni (cap. idea 59/B16): azzerata a ogni dispatch, si riempie SOLO con gli
      // eventi visivi prodotti da QUESTA azione — la dispatch "avanza-coda-visiva" li rivela uno alla
      // volta (scrive lancioDado/animazioneAttacco/ecc.) invece di mostrarli tutti insieme. Nessuna
      // logica di gioco cambia, solo il modo/tempo in cui questi campi di sola-UI vengono valorizzati.
      s.codaVisiva = [];
      selezionaTributo(s, azione.creaturaId);
      return s;
    }
    case "conferma-tributo": {
      const s = structuredClone(stato);
      // Coda di animazioni (cap. idea 59/B16): azzerata a ogni dispatch, si riempie SOLO con gli
      // eventi visivi prodotti da QUESTA azione — la dispatch "avanza-coda-visiva" li rivela uno alla
      // volta (scrive lancioDado/animazioneAttacco/ecc.) invece di mostrarli tutti insieme. Nessuna
      // logica di gioco cambia, solo il modo/tempo in cui questi campi di sola-UI vengono valorizzati.
      s.codaVisiva = [];
      confermaTributo(s, azione.sorgenteRect ?? null);
      return s;
    }
    case "bersaglio-magia": {
      const s = structuredClone(stato);
      // Coda di animazioni (cap. idea 59/B16): azzerata a ogni dispatch, si riempie SOLO con gli
      // eventi visivi prodotti da QUESTA azione — la dispatch "avanza-coda-visiva" li rivela uno alla
      // volta (scrive lancioDado/animazioneAttacco/ecc.) invece di mostrarli tutti insieme. Nessuna
      // logica di gioco cambia, solo il modo/tempo in cui questi campi di sola-UI vengono valorizzati.
      s.codaVisiva = [];
      applicaBersaglioMagia(s, azione.creaturaId, azione.sorgenteRect ?? null);
      return s;
    }
    case "attiva-trappola": {
      const s = structuredClone(stato);
      // Coda di animazioni (cap. idea 59/B16): azzerata a ogni dispatch, si riempie SOLO con gli
      // eventi visivi prodotti da QUESTA azione — la dispatch "avanza-coda-visiva" li rivela uno alla
      // volta (scrive lancioDado/animazioneAttacco/ecc.) invece di mostrarli tutti insieme. Nessuna
      // logica di gioco cambia, solo il modo/tempo in cui questi campi di sola-UI vengono valorizzati.
      s.codaVisiva = [];
      risolviTrappolaScelta(s, azione.indiceSlot);
      return s;
    }
    case "catena-aggiungi-trappola": {
      const s = structuredClone(stato);
      // ECCEZIONE alla regola generale "codaVisiva azzerata ad ogni dispatch" (cap. idea 59/B16, stesso
      // principio delle "-animazione-conclusa"): questa dispatch è una decisione di
      // negoziazione, non una nuova azione di gioco — la coda può ancora contenere il balzo dell'attacco
      // dichiarato (registrato dalla dispatch "scegli-bersaglio" che ha aperto questa finestra) non
      // ancora rivelato. Bug trovato in verifica dal vivo (cap. UX Sezione 7 Pezzo 2): azzerare qui
      // cancellava quell'evento per sempre — comb.idBalzoRichiesto restava punta a un id mai rivelato,
      // nascondendo CatenaStriscia.jsx (e con lei la scenografia di risoluzione) per tutto il resto del
      // combattimento in qualunque negoziazione più veloce del tempo di reveal del balzo (~700ms).
      // cap. 1v1 locale: turnoDiPriorita può essere "avversario" quando è un umano vero (non IA) ad
      // avere la priorità — in quel caso questa stessa dispatch deve valere anche per lui, non solo
      // per "io". In vsIA turnoDiPriorita non è mai "avversario" quando arriva qui (l'IA decide da
      // sola tramite avanzaCatena, mai via dispatch), quindi il comportamento resta invariato.
      if (s.catena?.turnoDiPriorita === "io" || (s.modalitaGioco === "1v1locale" && s.catena?.turnoDiPriorita === "avversario")) {
        // Idea 59 Fase 2: la decisione è presa — togli il passo scelta:catena dalla fila PRIMA di
        // risolvere, così l'eventuale nuova finestra (aggiungere una carta lascia la priorità a te)
        // riparte da un passo nuovo (id nuovo → countdown "Risolvi" da capo).
        scartaFinoAScelta(s, "catena");
        if (aggiungiTrappolaAllaCatena(s, s.catena.turnoDiPriorita, azione.indiceSlot)) avanzaCatena(s);
        sincronizzaPassoCatena(s);
      }
      return s;
    }
    case "catena-passa": {
      const s = structuredClone(stato);
      // ECCEZIONE alla regola generale, stesso motivo di "catena-aggiungi-trappola" sopra: non azzerare
      // qui, altrimenti si rischia di cancellare il balzo dell'attacco non ancora rivelato.
      // cap. 1v1 locale: stesso motivo del case sopra.
      if (s.catena?.turnoDiPriorita === "io" || (s.modalitaGioco === "1v1locale" && s.catena?.turnoDiPriorita === "avversario")) {
        scartaFinoAScelta(s, "catena");
        passaCatena(s, s.catena.turnoDiPriorita);
        avanzaCatena(s);
        sincronizzaPassoCatena(s);
      }
      return s;
    }
    case "chiudi-notifica": {
      const s = structuredClone(stato);
      // ECCEZIONE alla regola generale: NON azzera s.codaVisiva. Chiudere la notifica sblocca solo il
      // proseguimento della coda (cap. idea 59/B16) — gli eventuali eventi ancora in coda dopo questa
      // notifica devono restare lì, pronti per "avanza-coda-visiva", non sparire.
      s.notificaEffetto = null;
      return s;
    }
    // Idea 59 Fase 3: pesca / evocazione / spostamento fila sono ora passi "anim" della fila
    // s.sequenza (nomi "pesca" / "evoca" / "sposta"). La loro fine la segnala il componente con
    // "sequenza-passo-concluso" (come il dado di combattimento / la scenografia catena) — le vecchie
    // dispatch "pesca-animazione-conclusa" / "evocazione-animazione-conclusa" /
    // "movimento-animazione-conclusa" e gli stati diretti s.pescaInCorso / s.evocazioneInCorso /
    // s.movimentiInCorso sono RITIRATI.
    case "morte-animazione-conclusa": {
      const s = structuredClone(stato);
      // ECCEZIONE alla regola generale (stesso principio delle altre "-animazione-conclusa"): NON
      // azzera s.codaVisiva — questa dispatch arriva da AnimazioneMorte.jsx dopo aver mostrato
      // contraccolpo+volo+impatto (cap. UX Sezione 8), non è un'azione di gioco a sé. Solo ora la
      // rimozione vera dal campo (ripulisciCampo) e l'eventuale avanzamento obbligatorio si applicano.
      confermaMorteInCorso(s);
      return s;
    }
    // Rivela il prossimo evento visivo in coda (cap. idea 59/B16): scrive il campo "ultimo evento"
    // corrispondente (lancioDado/animazioneAttacco/eventoDanno/esitoCombattimento/
    // notificaEffetto) da s.codaVisiva[0] e lo toglie dalla coda. ECCEZIONE alla regola generale: non
    // azzera codaVisiva (dispatch "di servizio" per lo scorrimento, non un'azione di gioco). La UI
    // (App.jsx) la richiama a intervalli finché la coda non è vuota, mettendo in pausa quando l'evento
    // rivelato è una notifica (aspetta "chiudi-notifica" prima di continuare).
    case "avanza-coda-visiva": {
      const s = structuredClone(stato);
      const prossimo = s.codaVisiva?.shift();
      if (prossimo) applicaEventoVisivo(s, prossimo);
      return s;
    }
    // Coda di step unica (idea 59): il direttore <Sequenziatore> (App.jsx) o il componente
    // d'animazione (LancioDado/AnimazioneMorte) segnala che il passo in scena ha finito. La guardia
    // sull'id evita che una "conclusa" di un passo vecchio tolga quello nuovo. Se il passo è "muta",
    // la sua mutazione di stato differita (morte in combattimento) si applica proprio ora — dopo che
    // la scenografia è stata mostrata, non prima. ECCEZIONE alla regola generale: NON azzera codaVisiva.
    case "sequenza-passo-concluso": {
      const s = structuredClone(stato);
      if (s.sequenza?.[0]?.id === azione.id) {
        const head = s.sequenza[0];
        if (head.tipo === "muta") eseguiMuta(s, head);
        // eseguiMuta può aver già tolto il passo da sé (catenaRisoluzione: lo shifta PRIMA di
        // riaprire la finestra, così sincronizzaPassoCatena non lo vede ancora in fila) — non
        // shiftare due volte.
        if (s.sequenza?.[0]?.id === azione.id) s.sequenza.shift();
      }
      return s;
    }
    case "dado-animazione-conclusa": {
      const s = structuredClone(stato);
      // ECCEZIONE alla regola generale (come le altre "-animazione-conclusa"): NON azzera
      // s.codaVisiva. Arriva da LancioDado.jsx quando il dado ha finito di rotolare e si è assestato
      // sul risultato — sblocca solo i pop-up di combattimento e lo scorrimento della coda (balzo,
      // numero di danno), che aspettano stato.dadoInCorso. La guardia sull'id evita che una
      // "conclusa" di un dado vecchio azzeri quello nuovo.
      if (s.dadoInCorso === azione.id) s.dadoInCorso = null;
      return s;
    }
    case "scegli-avanzamento": {
      const s = structuredClone(stato);
      // Coda di animazioni (cap. idea 59/B16): azzerata a ogni dispatch, si riempie SOLO con gli
      // eventi visivi prodotti da QUESTA azione — la dispatch "avanza-coda-visiva" li rivela uno alla
      // volta (scrive lancioDado/animazioneAttacco/ecc.) invece di mostrarli tutti insieme. Nessuna
      // logica di gioco cambia, solo il modo/tempo in cui questi campi di sola-UI vengono valorizzati.
      s.codaVisiva = [];
      // cap. 1v1 locale: stesso motivo dei case catena- sopra — l'avanzamento può essere richiesto al
      // seme "avversario" quando è un umano vero.
      if (s.avanzamentoRichiesto === "io" || (s.modalitaGioco === "1v1locale" && s.avanzamentoRichiesto === "avversario")) {
        risolviAvanzamento(s, azione.creaturaId, azione.sorgenteRect ?? null);
      }
      return s;
    }
    case "annulla": {
      const s = structuredClone(stato);
      // Coda di animazioni (cap. idea 59/B16): azzerata a ogni dispatch, si riempie SOLO con gli
      // eventi visivi prodotti da QUESTA azione — la dispatch "avanza-coda-visiva" li rivela uno alla
      // volta (scrive lancioDado/animazioneAttacco/ecc.) invece di mostrarli tutti insieme. Nessuna
      // logica di gioco cambia, solo il modo/tempo in cui questi campi di sola-UI vengono valorizzati.
      s.codaVisiva = [];
      annulla(s);
      return s;
    }
    // La dispatch "avanza-ia" è RITIRATA (idea 59 Fase 4): il turno dell'avversario avanza dalla
    // fila come tutto il resto — passo muta:"ia" → "sequenza-passo-concluso" → eseguiMuta → avanzaIA.
    case "scegli-attaccante": {
      const s = structuredClone(stato);
      // Coda di animazioni (cap. idea 59/B16): azzerata a ogni dispatch, si riempie SOLO con gli
      // eventi visivi prodotti da QUESTA azione — la dispatch "avanza-coda-visiva" li rivela uno alla
      // volta (scrive lancioDado/animazioneAttacco/ecc.) invece di mostrarli tutti insieme. Nessuna
      // logica di gioco cambia, solo il modo/tempo in cui questi campi di sola-UI vengono valorizzati.
      s.codaVisiva = [];
      scegliAttaccanteIo(s, azione.creaturaId);
      return s;
    }
    case "scegli-bersaglio": {
      const s = structuredClone(stato);
      // Coda di animazioni (cap. idea 59/B16): azzerata a ogni dispatch, si riempie SOLO con gli
      // eventi visivi prodotti da QUESTA azione — la dispatch "avanza-coda-visiva" li rivela uno alla
      // volta (scrive lancioDado/animazioneAttacco/ecc.) invece di mostrarli tutti insieme. Nessuna
      // logica di gioco cambia, solo il modo/tempo in cui questi campi di sola-UI vengono valorizzati.
      s.codaVisiva = [];
      // cap. 1v1 locale: l'attaccante che sceglie il bersaglio può essere il seme "avversario" quando
      // è un umano vero (giocatoreAttivo lo determina già a monte in avviaAttacco).
      if (
        s.combattimento?.step === "bersaglio" &&
        (s.combattimento?.proprietario === "io" || (s.modalitaGioco === "1v1locale" && s.combattimento?.proprietario === "avversario"))
      ) {
        scegliBersaglio(s, azione.creaturaId);
      }
      return s;
    }
    case "decidi-difesa": {
      const s = structuredClone(stato);
      s.codaVisiva = [];
      // Idea 59: il passo "scelta" difendi è stato risolto dal giocatore — toglilo dalla fila (con
      // tutto ciò che eventualmente lo precede) PRIMA di risolvere, così i nuovi passi (dado, balzo,
      // danno, morte…) si accodano in una fila che riparte pulita, nell'ordine causale giusto.
      scartaFinoAScelta(s, "difendi");
      // cap. 1v1 locale: il difensore può essere il seme "avversario" quando è un umano vero.
      if (
        s.combattimento?.step === "rifiuto" &&
        (s.combattimento?.difProprietario === "io" || (s.modalitaGioco === "1v1locale" && s.combattimento?.difProprietario === "avversario"))
      ) {
        decidiDifesa(s, azione.rifiuta);
      }
      return s;
    }
    case "decidi-ripetizione": {
      const s = structuredClone(stato);
      s.codaVisiva = [];
      // Idea 59: come "decidi-difesa" — togli il passo "scelta" ripeti risolto (e un eventuale dado
      // non ancora scorso davanti a lui) prima di accodare i passi seguenti.
      scartaFinoAScelta(s, "ripeti");
      const comb = s.combattimento;
      if (comb?.step === "ripetizione") {
        const proprietarioDecisore = comb.decisore === "attaccante" ? comb.proprietario : comb.difProprietario;
        // cap. 1v1 locale: chi ha il diritto può essere il seme "avversario" quando è un umano vero.
        if (proprietarioDecisore === "io" || (s.modalitaGioco === "1v1locale" && proprietarioDecisore === "avversario")) {
          decidiRipetizione(s, azione.usa, null);
        }
      }
      return s;
    }
    default:
      return stato;
  }
}

function aggiungiLog(s, testo) {
  s.log = [...(s.log ?? []), testo];
}

// Id univoco e monotòno per ogni evento visivo (cap. idea 59/B16), indipendente dal tipo: garantisce
// che ogni voce della coda sia distinguibile anche se due eventi dello stesso tipo si susseguono nella
// stessa dispatch (prima invece l'id ripartiva da un contatore per-campo e un evento intermedio poteva
// restare "invisibile" perché il campo veniva sovrascritto prima che la UI lo mostrasse).
function prossimoIdEventoVisivo(s) {
  const id = s.prossimoIdVisivo ?? 1;
  s.prossimoIdVisivo = id + 1;
  return id;
}

/* ===================== CODA DI STEP UNICA (idea 59, Fase 1) ===================== */
// UNA fila ordinata `s.sequenza` di passi; s.sequenza[0] è quello in scena adesso. Niente prosegue
// (né l'IA, né l'avanzamento di fase) finché la fila non è vuota. In Fase 1 la usa SOLO il
// combattimento (dado, balzo, numero di danno, morte differita). Il direttore lato UI è
// <Sequenziatore> in App.jsx; i tempi vengono da src/game/tempi.js. Vedi Engine/Idea59_Coda_Step.md.
//
// I passi del combattimento si ACCODANO in fondo (push): quando una funzione di risoluzione gira, la
// fila è vuota o contiene solo passi precedenti dello STESSO scontro — il passo "scelta" che l'ha
// innescata è già stato tolto dal case handler prima di chiamarla.

function passoAnim(s, nome, dati, durataMs) {
  return { id: prossimoIdEventoVisivo(s), tipo: "anim", nome, dati, durataMs };
}
function passoScelta(s, nome, attende, dati) {
  return { id: prossimoIdEventoVisivo(s), tipo: "scelta", nome, attende, dati };
}
function passoMuta(s, nome, dati, durataMs) {
  return { id: prossimoIdEventoVisivo(s), tipo: "muta", nome, dati, durataMs };
}
// Banner di fase (idea 59 Fase 5): il cartello al centro del campo che annuncia una fase. Quarto
// tipo di passo (§4 del doc) — come "anim" ma senza un elemento che si muove: solo il cartello per
// durataMs. TitoloFase.jsx lo rende e segnala la fine con "sequenza-passo-concluso".
// `chiave` è il seme di chi sta giocando quella fase, NON s.giocatoreAttivo letto al momento del
// render: durante il Vespro il turno è già girato nello stato (fineTurno + iniziaTurno nella stessa
// dispatch), quindi l'attribuzione va congelata qui.
// fase 5 = Vespro, che non esiste come valore di s.fase (il turno va da 4 a 0) — vive solo nel passo.
function accodaBannerFase(s, chiave, fase) {
  if (s.vincitore) return;
  const durata = fase === 5 ? TEMPI.banner.vespro : TEMPI.banner.fase;
  accodaPassi(s, { id: prossimoIdEventoVisivo(s), tipo: "banner", nome: "bannerFase", dati: { chiave, fase }, durataMs: durata });
}
function accodaPassi(s, ...passi) {
  if (!s.sequenza) s.sequenza = [];
  const nuovi = passi.filter(Boolean);
  if (!nuovi.length) return;
  // Idea 59 Fase 4 — INVARIANTE: il passo muta:"ia" (il respiro prima della prossima mossa
  // dell'avversario) sta SEMPRE in fondo. Significa "l'IA riprende dopo tutto ciò che è già in
  // programma": qualunque passo accodato dopo di lui va comunque PRIMA. Senza questo, una funzione
  // che accoda dopo aver innescato proseguiSeIA nella stessa dispatch metterebbe il respiro davanti
  // (caso reale trovato dal test della catena: risolvendo il 1° frame di una catena a 2, la fila
  // usciva [muta:ia, scelta:catena] e l'IA sarebbe ripartita mentre il giocatore aveva ancora una
  // decisione in sospeso). Vale a livello di accodaPassi, così nessun chiamante deve ricordarsene.
  const i = s.sequenza.findIndex((p) => p?.nome === "ia");
  if (i >= 0 && nuovi.every((p) => p.nome !== "ia")) s.sequenza.splice(i, 0, ...nuovi);
  else s.sequenza.push(...nuovi);
}
// Toglie dalla fila il passo "scelta" col nome dato e tutto ciò che lo precede (di norma niente, al
// più un dado non ancora scorso): la decisione è presa, quei passi sono ormai obsoleti.
function scartaFinoAScelta(s, nome) {
  const i = (s.sequenza ?? []).findIndex((p) => p.tipo === "scelta" && p.nome === nome);
  if (i >= 0) s.sequenza.splice(0, i + 1);
}

// Applica la mutazione di stato differita di un passo "muta" (in Fase 1: solo la rimozione dal campo
// di chi è morto in combattimento). Chiamata dal direttore via "sequenza-passo-concluso" quando la
// scenografia di morte ha finito — così la posizione di partenza (DOM) era ancora leggibile mentre
// l'animazione girava (§7 del doc). Idempotente: il case guarda l'id prima di chiamarla.
function eseguiMuta(s, passo) {
  if (passo?.nome === "morte") {
    eseguiMortiCombattimento(s, passo.dati.attProprietario, passo.dati.difProprietario);
  } else if (passo?.nome === "catenaRisoluzione") {
    // Idea 59 Fase 2: la scenografia di risoluzione del frame è stata mostrata — ora l'effetto reale
    // (o il "salta silenziosamente" se annullata) e il frame esce davvero dalla pila. Poi si riprende
    // la finestra (priorità al frame sotto) o si chiude, e si riaccoda l'eventuale passo scelta:catena.
    // Togli QUESTO passo dalla fila prima di riaprire la finestra, così sincronizzaPassoCatena non lo
    // conta come "passo catena già in fila" e riaccoda davvero lo scelta:catena del frame sotto.
    if (s.sequenza?.[0]?.id === passo.id) s.sequenza.shift();
    applicaRisoluzioneFrameCatena(s, passo.dati);
    avanzaCatena(s);
    sincronizzaPassoCatena(s);
  } else if (passo?.nome === "ia") {
    // Idea 59 Fase 4: il "respiro" del turno IA è scaduto — ora l'avversario fa la sua mossa.
    // Toglie QUESTO passo dalla fila PRIMA di agire (stesso pattern di catenaRisoluzione qui sopra):
    // avanzaIA e tutta la cascata sotto di lui (prossimaAzioneAttaccoIA, avviaAttacco, proseguiSeIA)
    // contengono guardie del tipo "non partire se la fila non è vuota" — devono vedere la fila
    // davvero vuota, non il proprio stesso respiro ancora in testa.
    if (s.sequenza?.[0]?.id === passo.id) s.sequenza.shift();
    avanzaIA(s, passo.dati?.azione);
  }
}

// Svuota la fila applicando SUBITO le mutazioni ancora in sospeso — rete di sicurezza a fine turno:
// una creatura a 0 Vita non deve restare sul campo se il turno finisce durante la scenografia di
// morte. In pratica non fa mai nulla: tutti e 3 i chiamanti di fineTurno (continuaFase fase 4,
// case "timer-scaduto", prossimaAzioneAttaccoIA) arrivano con la fila GIÀ vuota (guardie su
// s.sequenza.length). Svuota la fila PRIMA di eseguire, così un'eventuale eseguiMuta→proseguiSeIA
// non ri-entra vedendo passi ancora in coda.
function flushSequenza(s) {
  const passi = s.sequenza ?? [];
  s.sequenza = [];
  passi.filter((p) => p.tipo === "muta").forEach((p) => eseguiMuta(s, p));
}

// Applica danno diretto ai PV di uno Stratega e accoda l'evento per il numero rosso fluttuante in UI.
// NB: da qui in poi i vari registraX NON scrivono più subito il campo "ultimo evento" (es. s.eventoDanno)
// — accodano solo in s.codaVisiva. È la dispatch "avanza-coda-visiva" (più sotto) a scrivere il campo,
// un evento alla volta, quando tocca al suo turno: così più eventi nella stessa dispatch restano
// visibili in sequenza invece di schiacciarsi sull'ultimo soltanto.
function infliggiDanno(s, chiave, importo) {
  if (importo <= 0) return;
  s.giocatori[chiave].hp -= importo;
  const dati = { chiave, importo, id: prossimoIdEventoVisivo(s) };
  s.codaVisiva?.push({ evento: "dannoDiretto", dati });
}

function controllaVittoria(s) {
  if (s.giocatori.io.hp <= 0) s.vincitore = "avversario";
  else if (s.giocatori.avversario.hp <= 0) s.vincitore = "io";
}

// Il balzo d'attacco (cap. 11) è ora un passo "anim" nome:"balzo" della fila (idea 59), accodato da
// applicaSimbolo quando il simbolo è definitivo — vedi lì. Niente più s.animazioneAttacco/evento
// "attacco" in coda.

// Avvia il volo vero della pescata (cap. UX Sezione 3). Idea 59 Fase 3: è un passo "anim" nome:"pesca"
// della fila s.sequenza (prima era lo stato diretto s.pescaInCorso). Le carte pescate restano
// invisibili in mano finché il loro passo non è atterrato (Mano.jsx confronta carta._uid con
// uidInVoloPesca(s)). AnimazionePescata.jsx segnala la fine con "sequenza-passo-concluso"; niente
// prosegue (coda visiva col dado Imprevisti/Vaticinio, IA, fasi) finché la fila non è vuota.
// unaAllaVolta = prima mano di chi inizia per secondo (turno 1, 5-6 carte): N passi da 1 carta, il
// direttore le fa atterrare una per una — si legge come una distribuzione a mano a mano (F.2).
// Il Rifornimento normale (1-2 carte) resta UN passo unico con lo stagger interno del componente.
function avviaVoloPescata(s, chiave, attivo, quante, unaAllaVolta = false) {
  const carte = attivo.mano.slice(-quante).map((c) => ({ uid: c._uid, nome: c.nome, tipoCarta: c.tipoCarta ?? "pedina" }));
  if (!carte.length) return;
  if (unaAllaVolta) {
    carte.forEach((c) => accodaPassi(s, passoAnim(s, "pesca", { chiave, carte: [c] }, TEMPI.pesca.unaCarta)));
    return;
  }
  const durata = TEMPI.pesca.unaCarta + TEMPI.pesca.perCartaExtra * (carte.length - 1);
  accodaPassi(s, passoAnim(s, "pesca", { chiave, carte }, durata));
}

// Avvia il volo vero dell'evocazione (cap. UX Sezione 4). Idea 59 Fase 3: passo "anim" nome:"evoca"
// della fila (ex s.evocazioneInCorso). sorgenteRect è catturato in UI (Mano.jsx/App.jsx, tasto
// "Evoca"/"Conferma tributo") PRIMA del dispatch, perché la carta sparisce dalla mano nello stesso
// giro. sorgenteRect è opzionale (cap. animazione evocazione avversario): l'IA non ha un click reale
// da cui misurarlo — AnimazioneEvocazione.jsx, quando manca, usa da sola una posizione di partenza di
// fallback (l'area "mano avversaria"/"mano mia" in DOM, query fatta lì perché solo lì c'è accesso al
// DOM — questa funzione resta pura, nessun riferimento a document qui). La creatura è già vera in
// campo ma resta invisibile lì (Campo.jsx, evocaInScena) finché il passo non è atterrato.
function avviaVoloEvocazione(s, chiave, creatura, sorgenteRect) {
  accodaPassi(
    s,
    passoAnim(s, "evoca", { chiave, creaturaId: creatura.id, nome: creatura.nome, sorgenteRect: sorgenteRect ?? null }, TEMPI.evoca)
  );
}

// Avvia il volo vero dello spostamento fila (cap. UX Sezione 5). Idea 59 Fase 3: passo "anim"
// nome:"sposta" della fila (ex s.movimentiInCorso). sorgenteRect catturato in Campo.jsx PRIMA del
// dispatch (il creaturaId non cambia, ma la sua posizione sì: cambia fila/array). 'movimenti' ha 1
// elemento per un'avanzata singola, 2 per uno scambio (entrambe le creature si muovono, direzioni
// opposte per costruzione). Movimenti senza sorgenteRect valido vengono scartati; se restano zero
// movimenti validi non si accoda nulla, la creatura si vede subito nella nuova posizione.
function avviaVoloMovimento(s, chiave, movimenti) {
  const validi = movimenti.filter((m) => m.sorgenteRect);
  if (!validi.length) return;
  accodaPassi(s, passoAnim(s, "sposta", { chiave, movimenti: validi }, TEMPI.sposta));
}

// Registra una morte tramite il vecchio meccanismo s.morteInCorso (evento "morte" in coda visiva →
// applicaEventoVisivo → confermaMorteInCorso su "morte-animazione-conclusa). Dopo idea 59 Fase 1 la
// morte in COMBATTIMENTO è invece un passo "muta" della fila (vedi risolviDannoCombattimento) — qui
// resta solo il percorso dell'Imboscata Potente (Trappola "ambush"), non ancora migrato.
function registraMorte(s, attProprietario, difProprietario, morti) {
  s.codaVisiva?.push({
    evento: "morte",
    dati: { id: prossimoIdEventoVisivo(s), attProprietario, difProprietario, morti },
  });
}

// Applica per davvero la rimozione dal campo di chi è morto in combattimento, e l'eventuale
// avanzamento obbligatorio in prima linea (cap. 4/Sezione 8, Step 8) — solo ora, dopo che
// AnimazioneMorte.jsx ha finito di mostrare contraccolpo+volo+impatto.
// Due punti d'ingresso: il passo "muta" della fila (idea 59, combattimento) tramite eseguiMuta, e
// il vecchio s.morteInCorso (Imboscata Trappola, flusso non ancora migrato) tramite
// confermaMorteInCorso qui sotto.
function confermaMorteInCorso(s) {
  if (!s.morteInCorso) return;
  const { attProprietario, difProprietario } = s.morteInCorso;
  s.morteInCorso = null;
  eseguiMortiCombattimento(s, attProprietario, difProprietario);
}

function eseguiMortiCombattimento(s, attProprietario, difProprietario) {
  const log = (t) => aggiungiLog(s, t);
  const attP = s.giocatori[attProprietario];
  const difP = s.giocatori[difProprietario];
  const stessoGiocatore = attProprietario === difProprietario;

  // Step 8, caso NON ambiguo (un solo candidato in retrovia): ripulisciCampo lo fa avanzare da sola,
  // istantaneamente — cattura chi era in prima linea prima/dopo per dare comunque un minimo feedback
  // visivo (cap. Campo.jsx, .carta-avanzata-auto). Nessun sorgenteRect disponibile qui (nessun click
  // reale da cui misurare la posizione di partenza), quindi non si riusa il volo vero — quello resta
  // per il caso CON scelta, gestito da sistemaPrimaLinea/risolviAvanzamento più sotto.
  const primaLineaPrimaAtt = new Set(attP.primaLinea.map((c) => c.id));
  const primaLineaPrimaDif = stessoGiocatore ? null : new Set(difP.primaLinea.map((c) => c.id));

  ripulisciCampo(attP, log, difP);
  if (!stessoGiocatore) ripulisciCampo(difP, log, attP);

  const avanzatiAuto = attP.primaLinea
    .filter((c) => !primaLineaPrimaAtt.has(c.id))
    .map((c) => ({ creaturaId: c.id, chiave: attProprietario }));
  if (primaLineaPrimaDif) {
    avanzatiAuto.push(
      ...difP.primaLinea.filter((c) => !primaLineaPrimaDif.has(c.id)).map((c) => ({ creaturaId: c.id, chiave: difProprietario }))
    );
  }
  if (avanzatiAuto.length) s.avanzamentoAutomaticoRecente = { id: prossimoIdEventoVisivo(s), creature: avanzatiAuto };

  sistemaPrimaLinea(s, attProprietario, log);
  if (!stessoGiocatore) sistemaPrimaLinea(s, difProprietario, log);
  controllaVittoria(s);
  proseguiSeIA(s);
}

// Registra un tiro di dado per l'animazione in UI (il dado rotola sul campo fino a fermarsi sul
// risultato, cap. 9/15): 'archetipo' per il dado di reazione (8 facce, colore per Archetipo),
// 'imprevisti' per il dado Imprevisti (6 facce).
function registraLancioDado(s, tipo, archetipo, faccia) {
  const dati = { id: prossimoIdEventoVisivo(s), tipo, archetipo: archetipo ?? null, faccia };
  s.codaVisiva?.push({ evento: "dado", dati });
  return dati.id;
}

// Registra il VFX source→target di una Magia con bersaglio (VfxMagia.jsx): sorgenteRect è già una
// posizione fissa in pixel (catturata in Campo.jsx PRIMA del dispatch, quando la carta sorgente era
// ancora nel DOM) perché a differenza del bersaglio la carta sorgente sparisce da mano/zona nello
// stesso giro in cui questo evento viene creato — al momento in cui la coda visiva lo rivelerà più
// tardi non ci sarebbe più nulla da misurare. Nessun evento se sorgenteRect non è stato catturato
// (es. il selettore non ha trovato nulla): meglio nessun VFX che uno che parte dal punto sbagliato.
function registraVfxMagia(s, sorgenteRect, bersaglioId, chiave) {
  if (!sorgenteRect) return;
  const dati = { id: prossimoIdEventoVisivo(s), sorgenteRect, bersaglioId, chiave };
  s.codaVisiva?.push({ evento: "vfxMagia", dati });
}

// Pop-up esplicito e da chiudere a mano (non un banner che sparisce da solo) per ogni attivazione di
// Imprevisto/Trappola/Magia/effetto creatura: prima l'utente non aveva certezza su SE/QUANDO fossero
// scattate (solo una riga nel registro). Va chiuso con la dispatch "chiudi-notifica" prima che
// qualunque altro prompt possa comparire (vedi guardia in PromptCombattimento.jsx) e prima che il
// pacing IA/coda visiva prosegua (vedi `scenaLibera` in Sequenziatore.jsx). "chiave"/"nomeCarta" (opzionali,
// cap. richiesta utente 2026-08-13) permettono a NotificaEffetto.jsx di mostrare l'illustrazione vera
// della carta — omessi per notifiche non legate a una carta specifica (es. il lancio della moneta).
function registraNotificaEffetto(s, titolo, testo, chiave, nomeCarta) {
  const dati = { id: prossimoIdEventoVisivo(s), titolo, testo: testo ?? "", chiave, nomeCarta };
  s.codaVisiva?.push({ evento: "notifica", dati });
}

// Notifica l'attivazione di un effetto "all'evocazione" (cap. effettoEvocazione in effettiCarta.js),
// SOLO se la carta ne ha davvero uno (codice valorizzato) — la maggior parte degli Alieni non ha
// nessun effetto speciale ed evocarli non deve produrre un pop-up inutile ad ogni turno.
function notificaEffettoCreaturaSeCe(s, creatura, chiave) {
  if (!creatura.effetto?.codice) return;
  registraNotificaEffetto(s, `✦ ${creatura.nome} attivata!`, creatura.effetto.testo, chiave, creatura.nome);
}

// Scrive il campo "ultimo evento" giusto a partire da una voce della coda (cap. idea 59/B16),
// richiamata dalla dispatch "avanza-coda-visiva" un evento alla volta.
function applicaEventoVisivo(s, { evento, dati }) {
  if (evento === "dado") {
    // Solo il dado IMPREVISTI passa ancora di qui (idea 59: il dado di combattimento è un passo
    // "anim" della fila). Finché non si è assestato, la coda visiva non avanza il prossimo evento
    // (guardia s.dadoInCorso in App.jsx). LancioDado.jsx manda "dado-animazione-conclusa" a fine roll.
    s.lancioDado = dati;
    s.dadoInCorso = dati.id;
  }
  else if (evento === "dannoDiretto") s.eventoDanno = dati;
  else if (evento === "notifica") s.notificaEffetto = dati;
  else if (evento === "vfxMagia") s.vfxMagia = dati;
  else if (evento === "morte") s.morteInCorso = dati;
  else if (evento === "imprevistoEsito") {
    // Bug segnalato dal vivo 2026-08-13: la barra delle fasi restava bloccata sulla fase "pinnata"
    // (es. "3 Preparati allo scontro") per il resto del turno, anche dopo essere avanzati a Fase 4/5 —
    // scrivere qui un faseVisibile ancora valorizzato (invece di rilasciarlo) faceva sì che
    // IndicatoreFasi (App.jsx) continuasse a leggere questo valore congelato invece della vera
    // stato.fase corrente. Il valore "dopo" coincide comunque con stato.fase in questo preciso istante
    // (vedi completaRifornimento), quindi azzerare qui non cambia nulla visivamente ORA, ma lascia che
    // i cambi di fase successivi tornino a leggere stato.fase dal vivo invece di restare congelati.
    s.faseVisibile = null;
    s.imprevistoVisivo = { chiave: dati.chiave, esiste: dati.esiste, movimenti: dati.movimenti };
    // Idea 59 Fase 5 — banner "3 Schieramento", accodato esattamente dove il pin si rilascia: è il
    // primo istante in cui il Vaticinio è davvero finito (dado fermo, carta Imprevisto girata).
    // s.fase vale già 3 da completaRifornimento; qui si sceglie solo QUANDO annunciarlo.
    // Nel turno IA il respiro muta:"ia" è già in fila a questo punto (accodato in fondo a
    // completaRifornimento, fermo in attesa che la scena si liberi): l'invariante d'ordine della
    // Fase 4 in accodaPassi fa passare il banner DAVANTI al respiro — che è quel che serve, si legge
    // "Schieramento" e poi l'avversario evoca.
    accodaBannerFase(s, dati.chiave, 3);
  }
}

/* ===================== PARTITA E TURNI ===================== */

// listaMazzo/listaMazzoAvversario (opzionali, cap. editor mazzi): { worldloom, imprevisti } del
// mazzo salvato scelto per "io"/"avversario" — assenti = comportamento di sempre (mazzo intero).
// identitaMazzoIo/identitaMazzoAvversario (opzionali, cap. sistema di salvataggio): { chiave, nome }
// — copiati dentro lo stato (non solo tenuti in App.jsx) apposta: le statistiche si registrano a
// fine partita leggendo SOLO lo stato, così restano corrette anche se nel frattempo l'utente ha
// cambiato la selezione del dropdown mazzo per la prossima partita, o quel mazzo è stato rinominato/
// eliminato dall'editor mentre la partita era in corso.
function nuovaPartita(
  cardsData,
  cardsDataAvversario,
  modalitaGioco,
  primoGiocatoreForzato,
  listaMazzo,
  listaMazzoAvversario,
  identitaMazzoIo,
  identitaMazzoAvversario,
  sfondoCampoIo,
  sfondoCampoAvversario
) {
  // Lancio della moneta (punto 10, poi Addendum M cap. UX): chi inizia non è più fisso su "io", è
  // deciso a caso a ogni nuova partita. primoGiocatore resta salvato per tutta la partita (mai
  // azzerato a fine turno, come "turno") — serve più sotto in iniziaTurno per capire chi ha diritto
  // alle 5 carte iniziali contro le 6 di chi gioca per secondo: quella logica prima assumeva "io" ==
  // chi inizia, ora deve confrontarsi con primoGiocatore invece che con "io".
  // primoGiocatoreForzato (Addendum M): il vero lancio (scelta Logo/Pittogramma + esito) avviene ora
  // in LancioMoneta.jsx PRIMA di questa dispatch — l'esito viene passato qui invece di tirare a sorte
  // una seconda volta, indipendente, che potrebbe contraddire quello appena mostrato all'utente.
  const primoGiocatore = primoGiocatoreForzato ?? (Math.random() < 0.5 ? "io" : "avversario");
  const s = {
    giocatori: {
      io: nuovoGiocatore(cardsData, listaMazzo),
      avversario: nuovoGiocatore(cardsDataAvversario ?? cardsData, listaMazzoAvversario),
    },
    turno: 0,
    fase: 0,
    giocatoreAttivo: primoGiocatore,
    primoGiocatore,
    // { chiave, nome } | null — quale mazzo salvato (o "mazzo intero") ha usato ciascun lato in
    // QUESTA partita, per le statistiche a fine partita (cap. sistema di salvataggio).
    identitaMazzoIo: identitaMazzoIo ?? null,
    identitaMazzoAvversario: identitaMazzoAvversario ?? null,
    // URL dell'immagine scelta nell'editor mazzi per lo sfondo della PROPRIA metà del campo di
    // battaglia (cap. editor mazzi, richiesta esplicita dell'utente) — null = nessuna scelta, resta
    // lo sfondo stellato predefinito (Campo.jsx). Risolto una volta sola da App.jsx al momento di
    // questa dispatch: il reducer porta solo la stringa URL già pronta, opaca, non sa nulla di come
    // sia stata trovata (stessa separazione motore/UI di sorgenteRect per le animazioni di volo).
    sfondoCampoIo: sfondoCampoIo ?? null,
    sfondoCampoAvversario: sfondoCampoAvversario ?? null,
    // "vsIA" (default, invariato) | "1v1locale" (cap. 1v1 locale, in costruzione): sola lettura per
    // ora, la UI la usa solo per decidere la prospettiva a schermo (Campo.jsx) — nessuna differenza
    // di regole/logica finché il resto della modalità non è costruito.
    modalitaGioco: modalitaGioco ?? "vsIA",
    partitaAvviataAlle: Date.now(), // id univoco per-partita, solo per reset di stato UI locale (es. passa-il-telefono)
    manoSelezionata: null,
    modalita: null, // "tributo" | "scarto-bonus"
    tributiSelezionati: [],
    movimentoSelezionato: null,
    candidatoScambio: null, // creatura di prima linea selezionata (1° tocco), in attesa del bottone "Scambia con retrovia"
    bersaglioMagia: null,
    numeroBersagliMagia: null, // quanti bersagli richiede la Magia in corso di selezione (1 di norma, 2 per "distrsoff")
    bersagliMagiaSelezionati: [], // id delle creature già scelte come bersaglio, quando numeroBersagliMagia > 1
    magiaSlotSelezionata: null, // indice in magieTrappole quando il bersaglio-magia parte da una magia piazzata, non dalla mano
    combattimento: null,
    avanzamentoRichiesto: null, // "io" | "avversario" | null — chiave del giocatore in attesa di scegliere chi avanza in prima linea (cap. 4)
    ultimoTiroImprevisti: null, // { chiave, valore } - ultimo risultato del Dado Imprevisti, per mostrarlo in campo
    terreno: null, // slot Terreno unico e condiviso (cap. 14)
    eventoDanno: null, // { chiave, importo, id } - ultimo danno subito da uno Stratega, per il numero rosso fluttuante in UI
    lancioDado: null, // { id, tipo, archetipo, faccia } - ultimo tiro del dado IMPREVISTI (il dado di combattimento è un passo della fila, idea 59)
    dadoInCorso: null, // id del dado Imprevisti che sta ancora rotolando: blocca lo scorrimento della coda finché LancioDado.jsx non manda "dado-animazione-conclusa"
    // Coda di step unica (idea 59): array ordinato di passi di messa in scena, s.sequenza[0] è quello
    // in scena adesso. Niente prosegue (coda visiva, IA, avanzamento di fase, catena) finché non è
    // vuota. Fase 1: combattimento (dado, balzo, numero di danno, morte differita). Fase 2: catena
    // (scelta:catena, muta:catenaRisoluzione). Fase 3: i tre voli (anim:pesca, anim:evoca,
    // anim:sposta — ex s.pescaInCorso / s.evocazioneInCorso / s.movimentiInCorso, RITIRATI).
    // Direttore: <Sequenziatore> in App.jsx. Vedi Engine/Idea59_Coda_Step.md.
    sequenza: [],
    // s.iaInAttesa RITIRATO (idea 59 Fase 4): il passo in sospeso del turno IA è ora un passo
    // muta:"ia" dentro s.sequenza, con il suo "respiro" come durataMs (TEMPI.ia.respiro).
    vfxMagia: null, // { id, sorgenteRect, bersaglioId, chiave } - ultima Magia con bersaglio, per la particella che viaggia sorgente→bersaglio in UI
    // { frames, turnoDiPriorita, passatiConsecutivi, prossimoId, evento, prossimoOrdine, risolti } | null
    // - finestra di reazione a cascata aperta (cap. catena.js), null se nessuna in corso. Idea 59
    // Fase 2: la scenografia di risoluzione di un frame è ora il passo muta:catenaRisoluzione della
    // fila s.sequenza (non più s.catenaRisoluzioneInCorso), e la decisione del giocatore è il passo
    // scelta:catena. s.catena.risolti = [] è la cronaca dei frame già risolti (per la striscia).
    catena: null,
    // { id, attProprietario, difProprietario, morti: [{creaturaId,nome,chiave}] } | null - morte in
    // combattimento in corso (cap. UX Sezione 8): stato diretto valorizzato
    // dalla coda visiva (evento "morte", così parte solo dopo che il numero di danno/lampeggio Vita hanno
    // avuto il loro tempo — vedi RITARDO_PRIMA_DI_MS.morte in App.jsx) — la rimozione vera dal campo resta
    // sospesa finché AnimazioneMorte.jsx non conferma di aver giocato contraccolpo+volo+impatto (dispatch
    // "morte-animazione-conclusa", vedi confermaMorteInCorso).
    morteInCorso: null,
    // { id, creature: [{creaturaId, chiave}] } | null - avanzamento automatico in prima linea appena
    // avvenuto senza bisogno di scelta (cap. UX Sezione 8, Step 8, caso non ambiguo): puramente
    // decorativo, mai azzerato esplicitamente — Campo.jsx lo consuma con un remount a chiave dinamica
    // (stesso principio di animazioneAttacco), la nuova istanza sovrascrive la precedente da sola.
    avanzamentoAutomaticoRecente: null,
    notificaEffetto: null, // { id, titolo, testo } | null - pop-up esplicito per un'attivazione di Imprevisto/Trappola appena risolta, va chiuso a mano
    codaVisiva: [], // [{ evento, dati }] - eventi visivi prodotti dall'ultima azione, in ordine: la UI li scandisce
    // uno alla volta con "avanza-coda-visiva" invece di mostrarli tutti insieme (cap. idea 59/B16).
    prossimoIdVisivo: 1, // contatore monotono condiviso da tutti gli eventi visivi (cap. prossimoIdEventoVisivo)
    faseVisibile: null, // { chiave, fase } | null - fase "pinnata" durante il Dado Imprevisti, finché la coda non rivela l'esito (cap. B16-round2)
    imprevistoVisivo: null, // { chiave, esiste, movimenti } | null - stessa idea, per la rotazione della carta Imprevisto in corso
    messaggio: "",
    log: [],
    vincitore: null,
  };
  aggiungiLog(s, "Partita iniziata — 200 PV a testa");
  aggiungiLog(s, `🪙 Lancio della moneta: ${primoGiocatore === "io" ? "inizi tu" : "inizia l'avversario"}`);
  aggiungiLog(s, "ℹ Primo turno: niente evocazione bonus; chi inizia non attacca");
  // Niente più registraNotificaEffetto qui (Addendum M): l'esito del lancio lo mostra già
  // LancioMoneta.jsx PRIMA che questa dispatch parta — un secondo pop-up qui sarebbe ridondante.
  iniziaTurno(s);
  return s;
}

function iniziaTurno(s) {
  if (s.vincitore) return;
  const chiave = s.giocatoreAttivo;
  const attivo = s.giocatori[chiave];
  const log = (t) => aggiungiLog(s, t);

  s.turno += 1;
  attivo.turniGiocati += 1;
  log(`— Turno ${s.turno} · ${chiave === "io" ? "tuo" : "avversario"} —`);
  // Timer di turno (cap. rail, richiesta esplicita dell'utente): timestamp assoluto di scadenza, non
  // un contatore — la UI calcola il countdown dal tempo reale, il reducer riceve solo "timer-scaduto"
  // quando arriva davvero (vedi case dedicato più sotto).
  s.turnoScadenza = Date.now() + TEMPI.turno;

  attivo.evocazioneNormaleFatta = false;
  attivo.evocazioneBonusFatta = false;
  attivo.rinunciaAttacco = false;
  attivo.aggressoriAttivatiQuestoTurno = [];
  attivo.difensoriAttivatiQuestoTurno = [];
  campoDi(attivo).forEach((c) => {
    c.fresca = false;
    c.dirittoUsatoContro = {};
    c.magoUsatoQuestoTurno = false;
    c.ultimoSimbolo = null;
    c.sopravvivenzaUsataQuestoTurno = false;
    c.schivaCervoUsataQuestoTurno = false;
    if (c.stordito > 0) c.stordito -= 1;
  });
  // Le Trappole piazzate nel turno precedente diventano attivabili ora (cap. 14)
  attivo.magieTrappole.forEach((mt) => (mt.pronta = true));
  effettiInizioTurno(attivo, log);

  // Fase 1 — Rifornimento
  s.fase = 1;
  if (attivo.mazzo.length === 0) {
    log(`${chiave === "io" ? "Il tuo Worldloom è vuoto" : "Il Worldloom avversario è vuoto"}: deck-out`);
    s.vincitore = chiave === "io" ? "avversario" : "io";
    return;
  }

  // Idea 59 Fase 5: il banner "1 Rifornimento". Va accodato QUI, dopo il controllo di deck-out
  // (niente cartello su una partita appena finita) e PRIMA della pescata del primo turno: prima si
  // annuncia la fase, poi le carte volano.
  accodaBannerFase(s, chiave, 1);

  // Al primo turno si pesca e non c'è scelta: chi inizia la partita (s.primoGiocatore, deciso dal
  // lancio della moneta) pesca 5 carte, chi gioca per secondo ne pesca 6 (5 iniziali + 1, a
  // compensare il turno di svantaggio). Dal turno successivo il Rifornimento è uguale per entrambi
  // (1 carta, o 2 rinunciando all'attacco). "chiInizia" (quante carte) e "chiave === 'io'" (il
  // pronome nel log) sono due cose distinte ora che chi parte non è più sempre "io".
  if (attivo.turniGiocati === 1) {
    const chiInizia = chiave === s.primoGiocatore;
    const quante = chiInizia ? 5 : 6;
    pesca(attivo, quante);
    // Prima mano (5-6 carte, nessuna scelta): una alla volta — F.2, ogni carta è un passo che il
    // direttore fa atterrare prima di iniziare la successiva (idea 59 Fase 3).
    avviaVoloPescata(s, chiave, attivo, quante, true);
    log(`🃏 ${chiave === "io" ? "Peschi" : "L'avversario pesca"} ${quante} carte${chiInizia ? "" : " (5 iniziali + 1, gioca per secondo)"}`);
    if (chiave === "avversario") {
      completaRifornimento(s);
      return;
    }
    // Il tuo primo turno si ferma in Fase 1 come ogni altro turno, così vedi la pesca prima di
    // proseguire — non salta più dritto alla Fase 3 senza che tu veda nulla.
    s.messaggio = `Hai pescato ${quante} carte`;
    return;
  }

  if (chiave === "avversario") {
    eseguiRifornimento(s, decisioneRifornimentoIA(attivo));
    return;
  }

  s.messaggio = "Rifornimento: pesca 1 carta, oppure 2 rinunciando ad attaccare in questo turno";
}

// Scelta del Rifornimento (Fase 1): 1 carta, oppure 2 senza poter attaccare in questo turno.
function eseguiRifornimento(s, doppio) {
  if (s.fase !== 1 || s.vincitore) return;
  const chiave = s.giocatoreAttivo;
  const attivo = s.giocatori[chiave];
  const log = (t) => aggiungiLog(s, t);
  const soggetto = chiave === "io" ? "Peschi" : "L'avversario pesca";

  const quante = doppio ? 2 : 1;
  pesca(attivo, quante);
  avviaVoloPescata(s, chiave, attivo, quante);
  attivo.rinunciaAttacco = doppio;
  log(doppio ? `🃏 ${soggetto} 2 carte e rinuncia all'attacco di questo turno` : `🃏 ${soggetto} una carta`);
  completaRifornimento(s);
}

// Fase 2 (Imprevisti) è automatica: si tira il dado, si avanza, e si arriva alla Fase 3.
function completaRifornimento(s) {
  const chiave = s.giocatoreAttivo;
  const attivo = s.giocatori[chiave];
  const log = (t) => aggiungiLog(s, t);

  // Idea 59 Fase 5 — banner "2 Vaticinio" (P2.2: "deve aspettare che la carta pescata sia ARRIVATA
  // prima di partire"). Chiuso per costruzione dall'ordine della fila: TUTTI e tre i chiamanti di
  // questa funzione (iniziaTurno primo turno, eseguiRifornimento, continuaFase) hanno già accodato
  // il passo anim:"pesca" prima di arrivare qui, quindi il banner ci finisce dietro e il direttore
  // lo mostra solo a volo concluso. Il dado Imprevisti registrato più sotto vive invece ancora in
  // s.codaVisiva, che non scorre finché la fila ha un passo "banner" (filaBloccaCodaVisiva):
  // pescata → cartello → dado, mai sovrapposti.
  accodaBannerFase(s, chiave, 2);

  // Pin "prima" (cap. B16-round2): finché la coda non rivela l'esito del Dado Imprevisti, la barra
  // fasi resta su "2 IMPREVISTI" e la carta Imprevisto in corso resta ferma al valore di ORA — non
  // devono saltare avanti prima che il dado abbia finito di rotolare e restare fermo sul risultato
  // (prima la carta girava subito, mentre il dado stava ancora animando). Vedi applicaEventoVisivo,
  // evento "imprevistoEsito", per il momento in cui questi due valori vengono davvero aggiornati.
  s.faseVisibile = { chiave, fase: 2 };
  s.imprevistoVisivo = { chiave, esiste: !!attivo.imprevistoInCorso, movimenti: attivo.imprevistoInCorso?.movimenti ?? 0 };

  s.fase = 2;
  const tiro = tiraDadoImprevisti();
  registraLancioDado(s, "imprevisti", null, tiro);
  log(`🎲 Dado Imprevisti: ${tiro === 0 ? "nessun movimento" : "+" + tiro}`);
  s.ultimoTiroImprevisti = { chiave, valore: tiro };
  if (tiro > 0) {
    const avversarioDi = s.giocatori[chiave === "io" ? "avversario" : "io"];
    avanzaImprevisti(attivo, avversarioDi, tiro, log, s);
    controllaVittoria(s);
    if (s.vincitore) return;
  }
  s.movimentoSelezionato = null;
  s.candidatoScambio = null;

  s.fase = 3;

  // Rivela (in coda, DOPO il dado) i valori "dopo": vedi applicaEventoVisivo.
  s.codaVisiva?.push({
    evento: "imprevistoEsito",
    dati: {
      id: prossimoIdEventoVisivo(s),
      chiave,
      esiste: !!attivo.imprevistoInCorso,
      movimenti: attivo.imprevistoInCorso?.movimenti ?? 0,
    },
  });

  // cap. 1v1 locale: il binario IA scatta solo quando "avversario" è davvero IA (vsIA) — in 1v1
  // locale prosegue come per "io", aspettando le stesse dispatch umane (seleziona-mano, ecc.).
  if (chiave === "avversario" && s.modalitaGioco !== "1v1locale") {
    // Il turno dell'IA si ferma qui invece di risolversi tutto in un colpo solo (cap. UX): si accoda
    // il "respiro" (passo muta:"ia" della fila, idea 59 Fase 4) che va in coda ai passi di pesca
    // appena accodati — così vedi atterrare le carte, poi l'avversario evoca. Ex s.iaInAttesa.
    accodaPassoIa(s, "evoca");
    return;
  }

  s.messaggio = "Evoca, sposta le Pedine, gioca Magie e Trappole";
}

// Fa avanzare di un passo il turno dell'IA: prima l'evocazione (Magie/Trappole/Alieno), poi UN
// attacco alla volta. Idea 59 Fase 4: ogni passo è preceduto da un "respiro" che è un passo
// muta:"ia" della fila s.sequenza (ex campo s.iaInAttesa + dispatch "avanza-ia" + useEffect con
// timer fisso di 900ms in App.jsx, tutti RITIRATI). Chi chiama: eseguiMuta, quando quel passo arriva
// in cima e il suo tempo è scaduto — e lo ha già tolto dalla fila, così qui s.sequenza è vuota e
// tutte le guardie "niente parte finché la fila non è vuota" restano valide alla lettera.
// Il passo successivo NON viene mai calcolato in anticipo: lo accoda chi finisce quello corrente
// (qui per "evoca", proseguiSeIA per ogni scontro).
function avanzaIA(s, azione) {
  if (s.vincitore || s.giocatoreAttivo !== "avversario") return;
  if (azione === "evoca") {
    eseguiFaseEvocaIA(s);
    s.fase = 4;
    // Idea 59 Fase 5 (P2.4) — banner "4 Alla Carica", lato IA: stesso cartello e stessa durata del
    // lato umano, l'unica differenza è la riga di attribuzione che TitoloFase.jsx ricava da `chiave`.
    // Accodato PRIMA di accodaPassoIa apposta: così finisce dietro all'eventuale volo di evocazione
    // appena innescato da eseguiFaseEvocaIA e davanti al respiro del primo attacco.
    accodaBannerFase(s, "avversario", 4);
    accodaPassoIa(s, "attacca");
    return;
  }
  if (azione === "attacca") {
    prossimaAzioneAttaccoIA(s);
  }
}

// Accoda il "respiro" prima della prossima mossa dell'avversario (idea 59 Fase 4). Va in FONDO alla
// fila: l'IA riparte solo dopo che tutta la scenografia già in coda (balzo, dado, numero di danno,
// morte differita, volo di evocazione…) è stata mostrata — è la fila stessa a garantire l'ordine,
// non più un OR di guardie in App.jsx. Mai due respiri insieme: proseguiSeIA può essere chiamata
// più volte nella risoluzione di un solo scontro.
function accodaPassoIa(s, azione) {
  if (s.vincitore || s.giocatoreAttivo !== "avversario" || s.modalitaGioco === "1v1locale") return;
  if (haPassoIa(s)) return;
  accodaPassi(s, passoMuta(s, "ia", { azione }, TEMPI.ia.respiro));
}

// Ricostruisce il passo del turno IA dopo un "carica-stato" (idea 59 Fase 4). s.sequenza viene
// azzerata al ripristino (salvataggio.js) perché i passi in sospeso aspettano timer/dispatch che non
// arriveranno mai — ma il turno dell'IA era proprio lì dentro (prima viveva in s.iaInAttesa, che
// sopravviveva al salvataggio). Senza questo, una partita ripresa a metà turno avversario resterebbe
// ferma per sempre. Stesso identico precedente di sincronizzaPassoCatena (Fase 2).
// Non ricostruisce nulla se una decisione umana è ancora in sospeso (catena aperta, combattimento a
// metà, scelta di avanzamento): in quei casi è il giocatore a dover muovere, e la ripresa del turno
// IA arriverà da sé quando avrà risolto.
function sincronizzaPassoIa(s) {
  if (s.vincitore || s.giocatoreAttivo !== "avversario" || s.modalitaGioco === "1v1locale") return;
  if (s.catena || s.combattimento || s.avanzamentoRichiesto) return;
  if (haPassoIa(s)) return;
  // fase 1/2 = Rifornimento/Imprevisti: quel tratto è già passato (era sincrono dentro iniziaTurno),
  // al ripristino si riprende da dove il turno IA si ferma davvero, cioè evocazione o attacco.
  accodaPassoIa(s, s.fase >= 4 ? "attacca" : "evoca");
}

// Manipolatrice Verde (PASSIVO + vincolo comportamentale, cap. Vocabolario Effetti): "Deve attaccare
// ogni turno se può" — blocca la fine del turno (continuaFase, sotto) finché non ha attaccato almeno
// una volta, SE è viva, in prima linea, ha ancora attacchi disponibili, non è stordita, ED esiste un
// bersaglio valido (anche il solo attacco diretto, se il campo nemico è del tutto vuoto). Confermato
// con l'utente: blocca "Fine turno", non un attacco automatico al posto del giocatore. Non serve
// applicarlo al turno dell'IA: prossimaAzioneAttaccoIA (sotto) attacca già con OGNI prima linea
// disponibile prima di chiudere il turno, Verde compresa, per costruzione — e NON va applicato al
// timer di turno scaduto (case "timer-scaduto"): quello è un limite di tempo assoluto, deve sempre
// poter chiudere il turno così com'è, mai bloccarsi su una scelta facoltativa del giocatore.
function verdeCheDeveAncoraAttaccare(s, chiave) {
  // Se il giocatore non può proprio attaccare questo turno (chi inizia la partita al 1° turno, o chi
  // ha rinunciato pescando doppio), "deve attaccare se può" non si applica a nessuno — bug trovato
  // scrivendo i test: senza questo controllo Verde avrebbe bloccato "Fine turno" per sempre proprio
  // nei turni in cui attaccare è strutturalmente impossibile per l'intero campo, non solo per lei.
  if (!puoAttaccareQuestoTurno(s, chiave)) return null;
  const attivo = s.giocatori[chiave];
  const difChiave = chiave === "io" ? "avversario" : "io";
  const difP = s.giocatori[difChiave];
  const bersaglioEsiste = campoCompletamenteVuoto(difP) || bersagliValidi(difP, retrovieEsposteDaTerreno(s.terreno)).length > 0;
  if (!bersaglioEsiste) return null;
  return (
    attivo.primaLinea.find(
      (c) => viva(c) && c.effetto?.codice === "verde" && c.attacchiUsati < c.attacchiTotali && !(c.stordito > 0)
    ) ?? null
  );
}

function continuaFase(s) {
  // cap. 1v1 locale: chi ha davvero il turno (giocatoreAttivo) può essere anche il seme "avversario",
  // ora un umano vero — in vsIA il comportamento resta invariato (permesso solo per "io").
  const chiave = s.giocatoreAttivo;
  const permesso = chiave === "io" || s.modalitaGioco === "1v1locale";
  if (!permesso || s.vincitore) return;
  const attivo = s.giocatori[chiave];
  if (s.fase === 1) {
    // Solo il tuo primo turno arriva qui: la pesca fissa (5 carte) è già avvenuta in iniziaTurno,
    // qui si passa alla Fase 2/3 senza pescare di nuovo (a differenza di "rifornimento").
    completaRifornimento(s);
    return;
  }
  if (s.fase === 3) {
    s.fase = 4;
    accodaBannerFase(s, chiave, 4); // idea 59 Fase 5 — banner "4 Alla Carica", lato umano
    s.movimentoSelezionato = null;
    s.candidatoScambio = null;
    if (attivo.rinunciaAttacco) s.messaggio = "Hai pescato 2 carte: in questo turno non puoi attaccare";
    else if (!puoAttaccareQuestoTurno(s, chiave)) s.messaggio = "Primo turno: chi inizia la partita non può attaccare";
    else s.messaggio = "Tocca una tua Pedina per attaccare";
  } else if (s.fase === 4) {
    // Idea 59: non chiudere il turno mentre una scenografia di combattimento è ancora in corso (la
    // fila contiene una morte differita da applicare) — si riproverà appena la fila si svuota.
    if (s.sequenza?.length) return;
    const verdeInAttesa = verdeCheDeveAncoraAttaccare(s, chiave);
    if (verdeInAttesa) {
      s.messaggio = `${verdeInAttesa.nome} deve attaccare ogni turno se può: falla attaccare prima di finire il turno`;
      return;
    }
    fineTurno(s);
    if (!s.vincitore) iniziaTurno(s);
  }
}

// Chi gioca per primo non attacca nel suo primo turno (cap. 3); chi ha pescato doppio rinuncia all'attacco.
function puoAttaccareQuestoTurno(s, chiave) {
  const g = s.giocatori[chiave];
  if (g.rinunciaAttacco) return false;
  if (s.turno === 1) return false;
  return true;
}

function fineTurno(s) {
  const log = (t) => aggiungiLog(s, t);
  // Idea 59: applica subito le mutazioni ancora in coda (morte differita) e svuota la fila di step —
  // una creatura a 0 Vita non deve restare sul campo se il turno finisce durante la scenografia di
  // morte. È uno dei 5 soli punti in cui s.sequenza si azzera (§5 del doc).
  flushSequenza(s);
  // Idea 59 Fase 5 — banner "5 Vespro" (P2.1). DOPO flushSequenza, mai prima: quella svuota la fila
  // e si porterebbe via il cartello appena accodato. Non serve nessuna guardia "aspetta che il
  // combattimento sia finito": tutti e tre i chiamanti di fineTurno arrivano già a fila vuota
  // (continuaFase e case "timer-scaduto" rinunciano se s.sequenza.length; prossimaAzioneAttaccoIA è
  // chiamata da eseguiMuta, che ha appena drenato) — è la fila stessa a garantire l'ordine.
  // Il Vespro è l'unica fase che non esiste come valore di s.fase: il turno passa da 4 a 0 e il
  // cartello vive solo come passo. Attribuito a chi il turno lo sta CHIUDENDO (s.giocatoreAttivo di
  // adesso, prima dello scambio qui sotto) — lo stato girerà il turno in questa stessa dispatch.
  accodaBannerFase(s, s.giocatoreAttivo, 5);
  restituisciControlloTemporaneo(s, log);
  ["io", "avversario"].forEach((k) => {
    const g = s.giocatori[k];
    // Potenziamento Estremo: la creatura potenziata va al cimitero a fine turno.
    const daScartare = campoDi(g).filter((c) => c.scartaAFineTurno);
    if (daScartare.length) {
      g.primaLinea = g.primaLinea.filter((c) => !c.scartaAFineTurno);
      g.retrovia = g.retrovia.filter((c) => !c.scartaAFineTurno);
      daScartare.forEach((c) => {
        g.cimitero.push(c);
        log(`✨ ${c.nome}: fine del potenziamento, va al cimitero`);
      });
    }
    campoDi(g).forEach((c) => {
      if (c.danno > 0) log(`♻ ${c.nome} recupera ${c.danno} danni`);
      c.danno = 0;
      c.attacchiUsati = 0;
      c.tmpAttacco = 0;
      c.tmpParata = 0;
      c.dirittoUsatoContro = {};
      c.schivateSubite = {};
    });
  });
  // Terreno a durata (facoltativa, cap. 14): scade dopo N turni di gioco totali, poi lo slot si libera.
  if (s.terreno?.durata != null) {
    s.terreno.durata -= 1;
    if (s.terreno.durata <= 0) {
      log(`🌍 ${s.terreno.nome}: il Terreno esaurisce la sua durata`);
      s.terreno = null;
    }
  }
  s.combattimento = null;
  s.manoSelezionata = null;
  s.modalita = null;
  s.tributiSelezionati = [];
  s.movimentoSelezionato = null;
  s.candidatoScambio = null;
  // Idea 59 Fase 4: il vecchio azzeramento difensivo di s.iaInAttesa non serve più — il passo
  // muta:"ia" vive in s.sequenza, già svuotata da flushSequenza in cima a fineTurno.
  s.giocatoreAttivo = s.giocatoreAttivo === "io" ? "avversario" : "io";
  s.fase = 0;
}

/* ===================== SPOSTAMENTI (Fase 3) ===================== */

function muoviCreatura(s, creaturaId, rectPropria, rectAltra) {
  // cap. 1v1 locale: chi ha davvero il turno (giocatoreAttivo) può essere anche il seme "avversario",
  // ora un umano vero — in vsIA il comportamento resta invariato (permesso solo per "io").
  const chiave = s.giocatoreAttivo;
  const permesso = chiave === "io" || s.modalitaGioco === "1v1locale";
  if (s.fase !== 3 || !permesso || s.vincitore) return;
  const io = s.giocatori[chiave];
  const log = (t) => aggiungiLog(s, t);
  const inF = io.primaLinea.findIndex((c) => c.id === creaturaId);
  const inB = io.retrovia.findIndex((c) => c.id === creaturaId);
  const creatura = inF >= 0 ? io.primaLinea[inF] : inB >= 0 ? io.retrovia[inB] : null;
  if (!creatura) return;
  if (creatura.fresca) {
    s.messaggio = "Evocata in questo turno: non può cambiare fila fino al prossimo";
    return;
  }

  if (s.movimentoSelezionato && s.movimentoSelezionato !== creaturaId) {
    const s1 = io.primaLinea.findIndex((c) => c.id === s.movimentoSelezionato);
    const s2 = io.retrovia.findIndex((c) => c.id === s.movimentoSelezionato);
    const altro = s1 >= 0 ? io.primaLinea[s1] : s2 >= 0 ? io.retrovia[s2] : null;
    if (altro && ((s1 >= 0 && inB >= 0) || (s2 >= 0 && inF >= 0))) {
      // creaturaVaAvanti: la carta appena cliccata (creatura) va verso la prima linea (s1>=0, cioè
      // stava in retrovia) — "altro" fa il movimento opposto. Serve per la direzione dell'animazione
      // (cap. UX Sezione 5, avanzata vs ritirata), null impatto sulle regole già invariate sopra.
      const creaturaVaAvanti = s1 >= 0;
      if (s1 >= 0) {
        io.primaLinea[s1] = creatura;
        io.retrovia[inB] = altro;
      } else {
        io.retrovia[s2] = creatura;
        io.primaLinea[inF] = altro;
      }
      log(`↕ ${altro.nome} e ${creatura.nome} si scambiano di fila`);
      avviaVoloMovimento(s, chiave, [
        { creaturaId: creatura.id, nome: creatura.nome, direzione: creaturaVaAvanti ? "avanzata" : "ritirata", sorgenteRect: rectPropria },
        { creaturaId: altro.id, nome: altro.nome, direzione: creaturaVaAvanti ? "ritirata" : "avanzata", sorgenteRect: rectAltra },
      ]);
      s.movimentoSelezionato = null;
      s.candidatoScambio = null;
      s.messaggio = `${altro.nome} e ${creatura.nome} si sono scambiate di fila`;
      return;
    }
  }

  // La prima linea deve restare sempre occupata quando possibile (cap. 4): non puoi svuotarla
  // spostando in retrovia la tua ultima creatura in prima linea.
  if (inF >= 0 && io.primaLinea.length <= 1) {
    s.messaggio = "La prima linea deve restare occupata: non puoi spostare la tua ultima Pedina in retrovia";
    return;
  }
  // La prima linea va tenuta piena quando possibile (cap. 4): un movimento verso la retrovia non
  // avviene mai da solo, sempre tramite scelta esplicita in 3 passi — decisione dell'utente ("se
  // lo voglio fare lo decido io", niente scambi automatici): 1) tocchi la carta, che si seleziona
  // come candidata (s.candidatoScambio) senza ancora entrare in modalità scambio; 2) tocchi il
  // bottone "Scambia con retrovia →" nel pannello azioni (dispatch "conferma-scambio-retrovia",
  // vedi confermaScambioRetrovia sotto), che promuove il candidato a s.movimentoSelezionato; 3)
  // tocchi la creatura di retrovia bersaglio, che completa lo scambio nel blocco sopra. Si blocca
  // subito solo se la retrovia è vuota: lì non c'è proprio nessun bersaglio da scegliere.
  if (inF >= 0) {
    if (io.retrovia.length === 0) {
      s.messaggio = "La prima linea deve restare piena: non hai nessuna Pedina in retrovia pronta ad avanzare";
      return;
    }
    s.candidatoScambio = s.candidatoScambio === creaturaId ? null : creaturaId;
    s.messaggio = s.candidatoScambio ? `${creatura.nome} selezionata — tocca "Scambia con retrovia" per completare` : "";
    return;
  }
  if (inB >= 0 && io.primaLinea.length < 3) {
    io.retrovia.splice(inB, 1);
    io.primaLinea.push(creatura);
    log(`↕ ${creatura.nome} passa in prima linea`);
    avviaVoloMovimento(s, chiave, [{ creaturaId: creatura.id, nome: creatura.nome, direzione: "avanzata", sorgenteRect: rectPropria }]);
    s.movimentoSelezionato = null;
    s.candidatoScambio = null;
    s.messaggio = `${creatura.nome} è passata in prima linea`;
    return;
  }

  s.movimentoSelezionato = s.movimentoSelezionato === creaturaId ? null : creaturaId;
  s.candidatoScambio = null;
  s.messaggio = s.movimentoSelezionato ? "Ora tocca una Pedina dell'altra fila per scambiarle" : "";
}

// Passo 2 del flusso a 3 tocchi (cap. 4, decisione utente): promuove la creatura selezionata come
// candidata (s.candidatoScambio, primo tocco) a effettiva modalità scambio (s.movimentoSelezionato),
// riusando poi lo stesso blocco di completamento scambio già usato per gli altri casi. Rivalida che
// il candidato esista ancora e sia ancora in prima linea, nel caso lo stato sia cambiato nel
// frattempo (es. morto in un altro modo prima del click sul bottone).
function confermaScambioRetrovia(s) {
  // cap. 1v1 locale: stesso motivo di muoviCreatura sopra.
  const chiave = s.giocatoreAttivo;
  const permesso = chiave === "io" || s.modalitaGioco === "1v1locale";
  if (s.fase !== 3 || !permesso || s.vincitore) return;
  const io = s.giocatori[chiave];
  if (!s.candidatoScambio) return;
  const creatura = io.primaLinea.find((c) => c.id === s.candidatoScambio);
  if (!creatura || io.retrovia.length === 0) {
    s.candidatoScambio = null;
    return;
  }
  s.movimentoSelezionato = s.candidatoScambio;
  s.candidatoScambio = null;
  s.messaggio = "Ora tocca una Pedina di retrovia per scambiarla";
}

/* ===================== EVOCAZIONE (Fase 3) ===================== */

function selezionaMano(s, indice, sorgenteRect) {
  // cap. 1v1 locale: chi ha davvero il turno (giocatoreAttivo) può essere anche il seme "avversario",
  // ora un umano vero — in vsIA il comportamento resta invariato (permesso solo per "io").
  const chiave = s.giocatoreAttivo;
  const permesso = chiave === "io" || s.modalitaGioco === "1v1locale";
  if (s.fase !== 3 || !permesso || s.vincitore) return;
  const attivo = s.giocatori[chiave];
  const altro = s.giocatori[chiave === "io" ? "avversario" : "io"];
  const carta = attivo.mano[indice];
  if (!carta) return;
  const log = (t) => aggiungiLog(s, t);

  if (s.manoSelezionata === indice) {
    s.manoSelezionata = null;
    s.modalita = null;
    s.tributiSelezionati = [];
    s.messaggio = "";
    return;
  }

  // Evocazione bonus resta riservata al seme "io" per questo pezzo (cap. 1v1 locale, sezione
  // "Magie/Trappole"): non ancora generalizzata — vedi il controllo dedicato più sotto, dove si entra
  // nella modalità. Trappole e Magie a effetto immediato dalla mano sono invece generiche da qui.
  if (chiave !== "io" && s.modalita === "scarto-bonus") {
    s.messaggio = "Non ancora disponibile per l'altro giocatore in questa modalità";
    return;
  }

  if (s.modalita === "scarto-bonus" && s.manoSelezionata !== null) {
    const evocataBonus = eseguiEvocazioneBonus(attivo, s.manoSelezionata, indice, log);
    if (evocataBonus) {
      effettoEvocazione(evocataBonus, attivo, altro, log);
      notificaEffettoCreaturaSeCe(s, evocataBonus, chiave);
      apriCatenaEvocazione(s, chiave === "io" ? "avversario" : "io", chiave, evocataBonus);
    }
    s.manoSelezionata = null;
    s.modalita = null;
    s.messaggio = evocataBonus ? `${evocataBonus.nome} evocata (bonus)` : "Evocazione bonus non riuscita";
    return;
  }

  // Trappola: si piazza coperta, diventa attivabile dal turno successivo (cap. 14)
  if (carta.tipoCarta === "trappola") {
    if (attivo.magieTrappole.length >= 5) {
      s.messaggio = "Zona Magie e Trappole piena (5 slot)";
      return;
    }
    attivo.magieTrappole.push({ carta, coperta: true, pronta: false });
    attivo.mano.splice(indice, 1);
    log(`🪤 Piazzi ${carta.nome} coperta (attivabile dal prossimo turno)`);
    s.manoSelezionata = null;
    s.messaggio = `${carta.nome} piazzata coperta (attivabile dal prossimo turno)`;
    return;
  }

  // Magia: effetto immediato; i Terreni occupano lo slot condiviso
  if (carta.tipoCarta === "magia") {
    if (!magiaGiocabile(carta, attivo, altro)) {
      s.messaggio = `${carta.nome}: non ci sono bersagli validi ora`;
      return;
    }
    const tipoBersaglio = magiaRichiedeBersaglio(carta);
    if (tipoBersaglio) {
      s.manoSelezionata = indice;
      s.modalita = "bersaglio-magia";
      s.bersaglioMagia = tipoBersaglio;
      // cap. bug "Distruzione Sofferta sceglie da sola i bersagli": la maggior parte delle Magie
      // mirate ne richiede 1, ma "distrsoff" ne richiede 2 — s.bersagliMagiaSelezionati accumula le
      // scelte (stesso schema del tributo) finché non raggiunge questo numero (vedi applicaBersaglioMagia).
      s.numeroBersagliMagia = numeroBersagliMagia(carta);
      s.bersagliMagiaSelezionati = [];
      const n = s.numeroBersagliMagia;
      s.messaggio =
        tipoBersaglio === "alleato"
          ? n > 1
            ? `Scegli ${n} tue Pedine`
            : "Scegli una tua Pedina"
          : n > 1
          ? `Scegli ${n} Pedine nemiche`
          : "Scegli una Pedina nemica";
      return;
    }
    if (giocaMagia(carta, attivo, altro, null, s, log)) {
      attivo.mano.splice(indice, 1);
      attivo.cimitero.push(carta);
      s.manoSelezionata = null;
      s.messaggio = `${carta.nome} attivata`;
    } else {
      s.messaggio = `${carta.nome}: non è stato possibile attivarla`;
    }
    return;
  }

  // cap. bug "tributo bloccato a campo pieno": il controllo campo-pieno vale solo per
  // un'evocazione DIRETTA (livello 1, normale o bonus) — quella aggiunge una creatura senza
  // toglierne nessuna, quindi va bloccata se non c'è spazio. Un'evocazione con TRIBUTO (livello 2+)
  // sacrifica sempre almeno una creatura del proprio campo prima di aggiungerne una nuova
  // (confermaTributo richiede tributiSelezionati per un valore >= carta.livello, quindi mai zero
  // creature tolte per un tributo >= 2): non può mai far salire il conteggio oltre il limite, quindi
  // non deve mai essere bloccata solo perché il campo è pieno ORA — è anzi il caso più comune in cui
  // serve un tributo (rimpiazzare una creatura debole con una più forte).
  if (carta.livello === 1 && campoPieno(attivo)) {
    s.messaggio = "Campo pieno: non puoi evocare altro (5 Pedine tra prima linea e retrovia)";
    return;
  }

  if (puoEvocareNormale(attivo, carta)) {
    s.tributiSelezionati = [];
    if (carta.livello === 1) {
      const evocata = eseguiEvocazione(attivo, indice, [], log);
      if (evocata) {
        avviaVoloEvocazione(s, chiave, evocata, sorgenteRect);
        effettoEvocazione(evocata, attivo, altro, log);
        notificaEffettoCreaturaSeCe(s, evocata, chiave);
        apriCatenaEvocazione(s, chiave === "io" ? "avversario" : "io", chiave, evocata);
      }
      attivo.evocazioneNormaleFatta = true;
      s.manoSelezionata = null;
      s.messaggio = evocata ? `${evocata.nome} evocata` : "Evocazione non riuscita";
      return;
    }
    s.manoSelezionata = indice;
    s.modalita = "tributo";
    s.messaggio = `Sacrifica ${carta.livello} livelli di tributo dal tuo campo`;
    return;
  }

  if (chiave === "io" && eUnAlieno(carta) && carta.livello === 1 && puoEvocareBonus(attivo)) {
    s.manoSelezionata = indice;
    s.modalita = "scarto-bonus";
    s.messaggio = "Evocazione bonus: tocca un'altra carta in mano da scartare";
    return;
  }

  // Messaggio diagnostico (F.4, bug segnalato "al turno 6 non mi fa fare la bonus"): il vecchio testo
  // catch-all diceva SEMPRE "disponibile dal 2° turno" anche quando il vero motivo era un altro
  // (bonus già usata, mano troppo corta, ecc.), rendendo impossibile capire cosa manca.
  if (eUnAlieno(carta) && carta.livello === 1 && attivo.evocazioneNormaleFatta) {
    if (attivo.evocazioneBonusFatta) s.messaggio = "Hai già usato l'evocazione bonus questo turno";
    else if (attivo.turniGiocati <= 1) s.messaggio = "L'evocazione bonus è disponibile dal tuo 2° turno";
    else if (attivo.mano.length < 2) s.messaggio = "Ti serve un'altra carta in mano da scartare per pagare l'evocazione bonus";
    else if (campoPieno(attivo)) s.messaggio = "Campo pieno: non puoi evocare altro (5 Pedine)";
    else s.messaggio = "Evocazione bonus non disponibile ora";
    return;
  }
  s.messaggio = attivo.evocazioneNormaleFatta
    ? "Hai già evocato questo turno (bonus solo per una Pedina di costo 1)"
    : "Non puoi evocare questa carta ora";
}

// Piazza una Magia coperta nella zona Magie e Trappole invece di attivarla subito dalla mano:
// resta lì finché il proprietario non sceglie di attivarla (cap. 14).
function piazzaMagiaCoperta(s, indice) {
  if (s.fase !== 3 || s.giocatoreAttivo !== "io" || s.vincitore) return;
  const io = s.giocatori.io;
  const carta = io.mano[indice];
  if (!carta || carta.tipoCarta !== "magia") return;
  if (io.magieTrappole.length >= 5) {
    s.messaggio = "Zona Magie e Trappole piena (5 slot)";
    return;
  }
  const log = (t) => aggiungiLog(s, t);
  io.magieTrappole.push({ carta, coperta: true, pronta: true });
  io.mano.splice(indice, 1);
  log(`✨ Piazzi ${carta.nome} coperta (attivabile quando vuoi dalla tua Fase 3)`);
  s.manoSelezionata = null;
  s.messaggio = `${carta.nome} piazzata coperta`;
}

// Attiva una Magia già piazzata coperta sul proprio campo (cap. 14). Le Normali si attivano solo
// nella propria Fase 3 fuori dal combattimento; le Rapide (sottotipo "rapida") in qualsiasi momento.
function attivaMagiaPiazzata(s, indiceSlot) {
  if (s.vincitore || s.modalita || s.combattimento) return;
  const io = s.giocatori.io;
  const slot = io.magieTrappole[indiceSlot];
  if (!slot || slot.carta.tipoCarta !== "magia") return;
  const rapida = slot.carta.sottotipo === "rapida";
  if (!rapida && (s.fase !== 3 || s.giocatoreAttivo !== "io" || s.combattimento)) {
    s.messaggio = `${slot.carta.nome}: si attiva solo nella tua Fase 3`;
    return;
  }
  const av = s.giocatori.avversario;
  const log = (t) => aggiungiLog(s, t);
  if (!magiaGiocabile(slot.carta, io, av)) {
    s.messaggio = `${slot.carta.nome}: non ci sono bersagli validi ora`;
    return;
  }
  const tipoBersaglio = magiaRichiedeBersaglio(slot.carta);
  if (tipoBersaglio) {
    s.magiaSlotSelezionata = indiceSlot;
    s.modalita = "bersaglio-magia";
    s.bersaglioMagia = tipoBersaglio;
    // cap. bug "Distruzione Sofferta sceglie da sola i bersagli": vedi la stessa nota in selezionaMano.
    s.numeroBersagliMagia = numeroBersagliMagia(slot.carta);
    s.bersagliMagiaSelezionati = [];
    const n = s.numeroBersagliMagia;
    s.messaggio =
      tipoBersaglio === "alleato"
        ? n > 1
          ? `Scegli ${n} tue Pedine`
          : "Scegli una tua Pedina"
        : n > 1
        ? `Scegli ${n} Pedine nemiche`
        : "Scegli una Pedina nemica";
    return;
  }
  if (giocaMagia(slot.carta, io, av, null, s, log)) {
    io.magieTrappole.splice(indiceSlot, 1);
    io.cimitero.push(slot.carta);
    s.messaggio = `${slot.carta.nome} attivata`;
  } else {
    s.messaggio = `${slot.carta.nome}: non è stato possibile attivarla`;
  }
}

// Tocca/togli una creatura come tributo: non evoca subito, solo seleziona. Serve un tocco esplicito
// su "Conferma tributo" per completare — così annullare a metà selezione non sacrifica nulla (prima
// il completamento era automatico al raggiungimento del valore, e "Annulla" non poteva più tornare
// indietro perché la creatura era già stata sacrificata).
// chiave qui è sempre s.giocatoreAttivo: s.modalita === "tributo" può essere impostato solo dal
// giocatore che sta davvero giocando la propria Fase 3 (selezionaMano), e si azzera sempre a fine
// turno (fineTurno) — non può mai sopravvivere a un cambio di giocatoreAttivo, quindi è sicuro usarlo
// come riferimento implicito di "chi sta scegliendo" senza un campo di stato dedicato.
function selezionaTributo(s, creaturaId) {
  if (s.modalita !== "tributo" || s.manoSelezionata === null || s.vincitore) return;
  const attivo = s.giocatori[s.giocatoreAttivo];
  const carta = attivo.mano[s.manoSelezionata];
  const creatura = campoDi(attivo).find((c) => c.id === creaturaId);
  if (!creatura) return;
  if (creatura.fresca) {
    s.messaggio = "Evocata ora: non sacrificabile questo turno";
    return;
  }

  const zonaDellaCreatura = attivo.primaLinea.some((c) => c.id === creaturaId) ? "primaLinea" : "retrovia";
  const zonaGiaScelta = s.tributiSelezionati
    .map((id) => (attivo.primaLinea.some((c) => c.id === id) ? "primaLinea" : "retrovia"))
    .find(() => true);

  const i = s.tributiSelezionati.indexOf(creaturaId);
  if (i >= 0) {
    s.tributiSelezionati.splice(i, 1);
  } else {
    // I tributi vengono tutti dalla stessa fila: non si può mischiare prima linea e retrovia (cap. 4).
    if (zonaGiaScelta && zonaGiaScelta !== zonaDellaCreatura) {
      s.messaggio = "I tributi devono venire tutti dalla stessa fila (prima linea o retrovia, non entrambe)";
      return;
    }
    s.tributiSelezionati.push(creaturaId);
  }

  const valore = s.tributiSelezionati.reduce((tot, id) => {
    const c = campoDi(attivo).find((x) => x.id === id);
    return tot + (c ? c.livello : 0);
  }, 0);

  s.messaggio =
    valore >= carta.livello
      ? `Tributi ${valore}/${carta.livello} — tocca "Conferma tributo" per evocare ${carta.nome}`
      : `Tributi ${valore}/${carta.livello}`;
}

// Completa l'evocazione per tributo: solo qui i sacrifici diventano reali. Finché non tocchi questo
// pulsante puoi selezionare/deselezionare liberamente, o annullare senza perdere nessuna creatura.
function confermaTributo(s, sorgenteRect) {
  if (s.modalita !== "tributo" || s.manoSelezionata === null || s.vincitore) return;
  const chiave = s.giocatoreAttivo;
  const attivo = s.giocatori[chiave];
  const altro = s.giocatori[chiave === "io" ? "avversario" : "io"];
  const carta = attivo.mano[s.manoSelezionata];
  const log = (t) => aggiungiLog(s, t);
  const valore = s.tributiSelezionati.reduce((tot, id) => {
    const c = campoDi(attivo).find((x) => x.id === id);
    return tot + (c ? c.livello : 0);
  }, 0);
  if (!carta || valore < carta.livello) {
    s.messaggio = `Tributi insufficienti: ${valore}/${carta?.livello ?? "?"}`;
    return;
  }

  const evocata = eseguiEvocazione(attivo, s.manoSelezionata, s.tributiSelezionati, log);
  if (evocata) {
    avviaVoloEvocazione(s, chiave, evocata, sorgenteRect);
    effettoEvocazione(evocata, attivo, altro, log);
    notificaEffettoCreaturaSeCe(s, evocata, chiave);
    apriCatenaEvocazione(s, chiave === "io" ? "avversario" : "io", chiave, evocata);
  }
  attivo.evocazioneNormaleFatta = true;
  s.manoSelezionata = null;
  s.modalita = null;
  s.tributiSelezionati = [];
  s.messaggio = evocata ? `${evocata.nome} evocata` : "Evocazione non riuscita";
}

function annulla(s) {
  s.manoSelezionata = null;
  s.modalita = null;
  s.tributiSelezionati = [];
  s.movimentoSelezionato = null;
  s.candidatoScambio = null;
  s.bersaglioMagia = null;
  s.numeroBersagliMagia = null;
  s.bersagliMagiaSelezionati = [];
  s.magiaSlotSelezionata = null;
  s.messaggio = "";
}

// I Potenziamenti (buff_) durano "finché resta in campo" il bersaglio (testo della carta): la carta
// non va al cimitero subito, resta visibile (SCOPERTA — non è più un segreto, è un effetto attivo e
// noto, cap. 14/B6) nella zona Magie e Trappole a promemoria, legata all'id del bersaglio — e si
// scarta da sola quando quello muore (vedi ripulisciCampo in giocatore.js). Le altre Magie (mass_atk,
// potestremo, ecc.) durano solo il turno e si scartano subito come sempre.
function scartaOMantieniMagia(giocatore, carta, bersaglio, log) {
  const sottotipo = classificaSottotipoMagia(carta);
  const esito = esitoDopoRisoluzioneMagia(sottotipo, { giocatore, bersaglio });
  if (esito.restaInCampo) {
    giocatore.magieTrappole.push({ carta, coperta: false, pronta: true, bersaglioId: esito.bersaglioId });
    log(`✨ ${carta.nome} resta legata a ${bersaglio.nome} finché è in campo`);
    return;
  }
  giocatore.cimitero.push(carta);
}

function applicaBersaglioMagia(s, creaturaId, sorgenteRect = null) {
  if (s.modalita !== "bersaglio-magia" || s.vincitore) return;
  const daZona = s.magiaSlotSelezionata !== null;
  if (!daZona && s.manoSelezionata === null) return;
  const log = (t) => aggiungiLog(s, t);
  // cap. 1v1 locale: due percorsi diversi per "chi sta scegliendo il bersaglio". Da zona (Magia già
  // piazzata, riattivata tramite attivaMagiaPiazzata — non toccata in questo pezzo, resta SEMPRE e
  // solo "io": è lei a decidere quando entrare in questa modalità, anche una Rapida durante il turno
  // dell'altro, e non va mai confusa con giocatoreAttivo in quel caso). Dalla mano (selezionaMano, ora
  // generica): è sempre chi ha davvero il turno, "io" o "avversario" in 1v1 locale.
  const chiave = daZona ? "io" : s.giocatoreAttivo;
  const attivo = s.giocatori[chiave];
  const altro = s.giocatori[chiave === "io" ? "avversario" : "io"];
  const carta = daZona ? attivo.magieTrappole[s.magiaSlotSelezionata]?.carta : attivo.mano[s.manoSelezionata];
  if (!carta) return;
  const cercaIn = s.bersaglioMagia === "alleato" ? attivo : altro;
  const bersaglio = campoDi(cercaIn).find((c) => c.id === creaturaId && viva(c));
  if (!bersaglio) return;

  // cap. bug "Distruzione Sofferta sceglie da sola i bersagli": alcune Magie (oggi solo "distrsoff")
  // richiedono più di un bersaglio — si accumulano i tocchi (stesso schema del tributo: tocca per
  // scegliere/togliere) finché non se ne raggiunge il numero richiesto, poi si risolve con l'elenco
  // completo. Il numero richiesto è limitato a quanti bersagli validi esistono davvero (es. l'avversario
  // ha una sola creatura in campo): senza questo limite non si potrebbe mai raggiungere la soglia.
  const richiesti = Math.min(s.numeroBersagliMagia ?? 1, campoDi(cercaIn).filter(viva).length);
  if (richiesti > 1) {
    const i = s.bersagliMagiaSelezionati.indexOf(creaturaId);
    if (i >= 0) s.bersagliMagiaSelezionati.splice(i, 1);
    else s.bersagliMagiaSelezionati.push(creaturaId);
    if (s.bersagliMagiaSelezionati.length < richiesti) {
      s.messaggio = `Bersagli scelti: ${s.bersagliMagiaSelezionati.length}/${richiesti}`;
      return;
    }
  }

  const bersagli = richiesti > 1 ? s.bersagliMagiaSelezionati.map((id) => campoDi(cercaIn).find((c) => c.id === id)).filter(Boolean) : null;
  const nomiBersagli = bersagli ? bersagli.map((c) => c.nome).join(", ") : bersaglio.nome;

  // VFX source→target (VfxMagia.jsx): un evento per bersaglio, PRIMA di risolvere l'effetto vero, così
  // in coda visiva la particella viaggia e colpisce prima che compaia il pop-up di notifica dell'effetto
  // (registrato dentro giocaMagia stesso, accodato subito dopo questi).
  for (const b of bersagli ?? [bersaglio]) registraVfxMagia(s, sorgenteRect, b.id, chiave);

  if (giocaMagia(carta, attivo, altro, bersaglio, s, log, bersagli)) {
    if (daZona) attivo.magieTrappole.splice(s.magiaSlotSelezionata, 1);
    else attivo.mano.splice(s.manoSelezionata, 1);
    scartaOMantieniMagia(attivo, carta, bersaglio, log);
    s.messaggio = `${carta.nome} attivata su ${nomiBersagli}`;
  } else {
    s.messaggio = `${carta.nome}: non è stato possibile attivarla su ${nomiBersagli}`;
  }
  s.manoSelezionata = null;
  s.magiaSlotSelezionata = null;
  s.modalita = null;
  s.bersaglioMagia = null;
  s.numeroBersagliMagia = null;
  s.bersagliMagiaSelezionati = [];
}

/* ===================== COMBATTIMENTO (Fase 4) ===================== */

function scegliAttaccanteIo(s, creaturaId) {
  // cap. 1v1 locale: in vsIA solo "io" può mai arrivare qui (comportamento invariato). In 1v1 locale
  // chi ha davvero il turno (giocatoreAttivo) può essere anche il seme "avversario", ora un umano vero.
  const chiave = s.giocatoreAttivo;
  const permesso = chiave === "io" || s.modalitaGioco === "1v1locale";
  // Idea 59: non iniziare un attacco nuovo mentre la scenografia del precedente (balzo/numero/morte)
  // sta ancora scorrendo — s.combattimento è già null a quel punto, ma la fila no.
  if (!permesso || s.fase !== 4 || s.vincitore || s.combattimento || s.sequenza?.length) return;
  if (!puoAttaccareQuestoTurno(s, chiave)) {
    s.messaggio = s.giocatori[chiave].rinunciaAttacco
      ? "Hai pescato 2 carte in Rifornimento: tu non puoi attaccare in questo turno (l'avversario può comunque attaccarti normalmente)"
      : "Primo turno: chi inizia la partita non può attaccare";
    return;
  }
  avviaAttacco(s, chiave, creaturaId);
}

// Generico: usato sia dal click del giocatore sia dall'IA.
function avviaAttacco(s, proprietario, creaturaId) {
  const log = (t) => aggiungiLog(s, t);
  const attP = s.giocatori[proprietario];
  const difChiave = proprietario === "io" ? "avversario" : "io";
  const difP = s.giocatori[difChiave];
  const creatura = attP.primaLinea.find((c) => c.id === creaturaId);
  if (!creatura || creatura.attacchiUsati >= creatura.attacchiTotali) return;
  if (creatura.stordito > 0) {
    if (proprietario === "io") s.messaggio = `${creatura.nome} non può attaccare in questo turno`;
    else creatura.attacchiUsati = creatura.attacchiTotali; // l'IA salta e prosegue
    if (proprietario === "avversario") proseguiSeIA(s);
    return;
  }

  attivaEffettoPreAttacco(creatura, log);

  // Idea 59: non serve più azzerare a mano i campi "ultimo evento" del combattimento precedente
  // (dado/balzo/numero di danno). Dado, balzo e numero sono passi della fila `s.sequenza`, e un
  // attacco nuovo non può nemmeno cominciare finché la fila del precedente non è vuota (guardie in
  // scegliAttaccanteIo / prossimaAzioneAttaccoIA / proseguiSeIA).

  if (campoCompletamenteVuoto(difP)) {
    // Finestra trappole sull'attacco diretto (Intervento Divino)
    const trappoleDirette = carteEleggibiliPerRisposta(difP, difChiave, { tipo: "attaccoDiretto", difProprietario: difChiave });
    if (trappoleDirette.length > 0) {
      s.combattimento = {
        attaccanteId: creaturaId,
        proprietario,
        difProprietario: difChiave,
        bersagli: [],
        step: "trappola",
        contestoTrappola: "attaccoDiretto",
        difensoreId: null,
        matchup: null,
        attaccoDiretto: true,
      };
      if (difChiave === "io") {
        s.messaggio = "Attacco diretto in arrivo: puoi attivare una Trappola";
        return;
      }
      const slot = Math.random() < 0.5 ? difP.magieTrappole.indexOf(trappoleDirette[0]) : -1;
      risolviTrappolaScelta(s, slot);
      return;
    }
    risolviAttaccoDiretto(s, proprietario, creatura, log);
    return;
  }

  const bersagli = bersagliValidi(difP, retrovieEsposteDaTerreno(s.terreno));
  if (bersagli.length === 0) return;

  s.combattimento = {
    attaccanteId: creaturaId,
    proprietario,
    difProprietario: difChiave,
    bersagli: bersagli.map((b) => b.id),
    step: "bersaglio",
    difensoreId: null,
    matchup: null,
  };
  // cap. 1v1 locale: la scelta automatica del bersaglio è un'euristica IA, non deve scattare quando
  // "avversario" è un umano vero — in quel caso si aspetta la stessa dispatch "scegli-bersaglio" già
  // usata per "io".
  if (proprietario === "io" || s.modalitaGioco === "1v1locale") s.messaggio = "Scegli il bersaglio";

  if (proprietario === "avversario" && s.modalitaGioco !== "1v1locale") {
    const scelto = bersagli.reduce((migliore, c) => (attaccoTotale(c, difP) > attaccoTotale(migliore, difP) ? c : migliore), bersagli[0]);
    scegliBersaglio(s, scelto.id);
  }
}

function risolviAttaccoDiretto(s, proprietario, creatura, log) {
  const difChiave = proprietario === "io" ? "avversario" : "io";
  const difP = s.giocatori[difChiave];
  const A = attaccoTotale(creatura, s.giocatori[proprietario]);
  const colpi = creatura.attacchiTotali - creatura.attacchiUsati;
  const danno = A * colpi;
  infliggiDanno(s, difChiave, danno);
  creatura.attacchiUsati = creatura.attacchiTotali;
  log(`⚡ ${creatura.nome} attacca direttamente ${difChiave === "io" ? "il tuo Stratega" : "lo Stratega avversario"}: ${colpi}×${A} = ${danno} danni`);
  s.messaggio = `${creatura.nome}: attacco diretto, -${danno} PV`;
  s.combattimento = null;
  controllaVittoria(s);
  proseguiSeIA(s);
}

function scegliBersaglio(s, creaturaId) {
  const comb = s.combattimento;
  if (!comb || comb.step !== "bersaglio" || !comb.bersagli.includes(creaturaId)) return;
  const attP = s.giocatori[comb.proprietario];
  const difP = s.giocatori[comb.difProprietario];
  const attaccante = campoDi(attP).find((x) => x.id === comb.attaccanteId);
  const difensore = campoDi(difP).find((x) => x.id === creaturaId);
  if (!attaccante || !difensore) {
    s.combattimento = null;
    return;
  }

  const matchup = calcolaMatchup(attaccante.archetipo, difensore.archetipo, attaccante.ruolo, difensore.ruolo);
  comb.difensoreId = creaturaId;
  comb.matchup = matchup;
  // cap. sequenza combattimento (confermata dall'utente 2026-08-26, "sequenza b"): il balzo NON parte
  // qui. È un passo "anim" della fila (idea 59) accodato da applicaSimbolo solo quando il simbolo è
  // definitivo (dopo ritiri Mago Sorprendente / diritto di ripetizione / Trappole "dopoTiro"), appena
  // prima del calcolo del danno. Il bersaglio resta comunque evidenziato di rosso da subito
  // (comb.difensoreId sopra, letto da Campo.jsx).

  // Finestra di reazione: il difensore può incatenare una propria Trappola eleggibile per questo
  // evento prima che l'attacco prosegua (cap. catena.js, eleggibilità generica in magieTrappole.js).
  // I sei codici eleggibili per "attaccoDichiarato" sono tutti testualmente difensivi ("annulla un
  // attacco dichiarato CONTRO DI TE" / "contro un tuo Alieno"): non hanno senso in mano all'attaccante
  // contro il proprio stesso attacco, quindi la priorità va direttamente al difensore, mai
  // all'attaccante — lo garantisce il predicato stesso (chiave === evento.difProprietario), non un
  // guard separato qui. Se il difensore non ha nulla di eleggibile in questo momento, si salta dritti
  // alla decisione di difesa (nessun prompt inutile).
  comb.step = "trappola";
  comb.contestoTrappola = "attaccoDichiarato";
  // attaccanteId/difensoreId salvati qui (cap. bug multi-frame trovato in verifica dal vivo, Sezione 8):
  // servono a chi risolve un frame più in basso nello stack DOPO che un frame più in alto (es. una
  // Trappola "cancel") ha già azzerato s.combattimento — senza questi, applicaEffettoTrappola non
  // avrebbe più modo di ritrovare l'attaccante quando tocca a lui, e leggere comb.proprietario da un
  // s.combattimento ormai null va in crash (vedi applicaEffettoTrappola sotto).
  const evento = {
    tipo: "attaccoDichiarato",
    difProprietario: comb.difProprietario,
    attProprietario: comb.proprietario,
    attaccanteId: comb.attaccanteId,
    difensoreId: creaturaId,
  };
  const eleggibiliDifensore = carteEleggibiliPerRisposta(difP, comb.difProprietario, evento);
  if (eleggibiliDifensore.length === 0) {
    passaAlRifiuto(s);
    return;
  }
  apriFinestraCatena(s, evento, comb.difProprietario);
  avanzaCatena(s);
}

// Dopo l'eventuale finestra trappole, si passa alla decisione del difensore (cap. 13).
function passaAlRifiuto(s) {
  const comb = s.combattimento;
  if (!comb) return;
  const attP = s.giocatori[comb.proprietario];
  const difP = s.giocatori[comb.difProprietario];
  const attaccante = campoDi(attP).find((x) => x.id === comb.attaccanteId);
  const difensore = campoDi(difP).find((x) => x.id === comb.difensoreId);
  if (!attaccante || !difensore) {
    s.combattimento = null;
    return;
  }
  comb.step = "rifiuto";
  // cap. 1v1 locale: l'euristica IA decide solo quando "avversario" è davvero IA (vsIA) — in 1v1
  // locale il difensore, chiunque sia, aspetta la stessa dispatch "decidi-difesa" già usata per "io".
  if (comb.difProprietario === "io" || s.modalitaGioco === "1v1locale") {
    s.messaggio = "Difendi o lasci passare il colpo?";
    // Idea 59: la decisione di difesa è un passo "scelta" della fila. Niente dado/numero ancora — la
    // scelta viene prima di tutto (sequenza b). Per l'IA (ramo sotto) il passo non serve: si
    // auto-risolve inline, i passi visivi (dado, balzo, danno) partono comunque dalla fila.
    accodaPassi(
      s,
      passoScelta(s, "difendi", "decidi-difesa", {
        attaccanteId: comb.attaccanteId,
        difensoreId: comb.difensoreId,
        proprietario: comb.proprietario,
        difProprietario: comb.difProprietario,
        matchup: comb.matchup,
      })
    );
    return;
  }
  decidiDifesa(s, decisioneRifiutoIA(attaccante, difensore, difP, attP));
}

// Apre la finestra a catena sull'evocazione avversaria (Sezione 3, agganciata alla catena generica —
// cap. catena.js/magieTrappole.js): Il Rifiuto della Terra e L'Inganno Vincente. Chi ha appena
// evocato non ha mai nulla di eleggibile qui (entrambi i codici hanno senso solo contro l'evocatore),
// quindi la priorità va direttamente a chi possiede la Trappola, senza il giro inutile.
function apriCatenaEvocazione(s, chiaveConTrappole, chiaveEvocatore, creaturaEvocata) {
  if (!creaturaEvocata) return;
  const giocatoreConTrappole = s.giocatori[chiaveConTrappole];
  const evento = { tipo: "evocazione", evocatore: chiaveEvocatore, creaturaId: creaturaEvocata.id };
  const eleggibili = carteEleggibiliPerRisposta(giocatoreConTrappole, chiaveConTrappole, evento);
  if (eleggibili.length === 0) return;
  apriFinestraCatena(s, evento, chiaveConTrappole);
  avanzaCatena(s);
}

// Dopo ripulisciCampo: se resta uno slot di prima linea libero con più di un candidato in
// retrovia, qualcuno deve scegliere chi avanza (cap. 4). L'IA sceglie subito (Vita più alta);
// per "io" si apre un'attesa (s.avanzamentoRichiesto) finché non arriva "scegli-avanzamento".
function sistemaPrimaLinea(s, chiave, log) {
  const g = s.giocatori[chiave];
  if (!avanzamentoAmbiguo(g)) return;
  // cap. 1v1 locale: il seme "avversario" può essere un umano vero, che deve scegliere lui stesso
  // (stessa attesa già usata per "io") invece di far scegliere l'euristica IA sotto.
  if (chiave === "io" || s.modalitaGioco === "1v1locale") {
    s.avanzamentoRichiesto = chiave;
    return;
  }
  let migliore = g.retrovia[0];
  g.retrovia.forEach((c) => {
    if (vitaAttuale(c) > vitaAttuale(migliore)) migliore = c;
  });
  const i = g.retrovia.indexOf(migliore);
  g.retrovia.splice(i, 1);
  g.primaLinea.push(migliore);
  log(`↕ L'avversario fa avanzare ${migliore.nome} in prima linea`);
}

// Generico: il seme in attesa è sempre s.avanzamentoRichiesto stesso (può essere "io" o, in 1v1
// locale, "avversario" quando è un umano vero — cap. sistemaPrimaLinea sopra).
function risolviAvanzamento(s, creaturaId, sorgenteRect) {
  const chiave = s.avanzamentoRichiesto;
  if (!chiave) return;
  const g = s.giocatori[chiave];
  const i = g.retrovia.findIndex((c) => c.id === creaturaId);
  if (i < 0) return;
  const log = (t) => aggiungiLog(s, t);
  const [creatura] = g.retrovia.splice(i, 1);
  g.primaLinea.push(creatura);
  s.avanzamentoRichiesto = null;
  log(`↕ ${creatura.nome} avanza in prima linea`);
  s.messaggio = `${creatura.nome} è avanzata in prima linea`;
  // cap. UX Sezione 8, Step 8: riusa esattamente l'animazione "Avanzata" già scritta per Sezione 5
  // (avviaVoloMovimento/AnimazionePosizionamento.jsx) — nessun nuovo componente. sorgenteRect è
  // catturato in Campo.jsx PRIMA del dispatch, stesso principio di muoviCreatura.
  avviaVoloMovimento(s, chiave, [{ creaturaId: creatura.id, nome: creatura.nome, direzione: "avanzata", sorgenteRect }]);
  proseguiSeIA(s);
}

// Applica l'effetto reale di UNA trappola già scelta (già rimossa dallo slot coperto da chi chiama).
// Condivisa dal vecchio flusso a scelta singola (risolviTrappolaScelta, per dopoTiro/attaccoDiretto,
// non ancora agganciati alla catena) e dal nuovo flusso a catena (per attaccoDichiarato).
// 'eventoEsplicito' (cap. bug multi-frame trovato in verifica dal vivo, Sezione 8): quando questa
// funzione viene chiamata per risolvere un frame di catena, s.combattimento può essere GIÀ null se un
// frame più in alto nello stack (risolto prima, LIFO — es. una Trappola "cancel") lo ha già annullato.
// Per i sei codici eleggibili per "attaccoDichiarato" (cancel/ambush/stopatk/cristallo/spezzavolonta/
// copiare, gli unici che possono arrivare qui via catena) i dati necessari (chi attacca/difende, quale
// creatura) vengono quindi letti da eventoEsplicito (salvato in s.catena.evento fin da quando la
// finestra si è aperta, sopravvive alla nullificazione) invece che da s.combattimento. Il vecchio
// flusso a scelta singola (risolviTrappolaScelta, dopoTiro/attaccoDiretto) non passa eventoEsplicito:
// lì s.combattimento è sempre garantito valido (nessuna catena/nessun frame sotto), quindi i codici
// reroll/mirror/divine e il ramo finale (mai raggiunti dalla catena, solo da questo vecchio flusso)
// possono continuare a leggerlo direttamente senza modifiche.
function applicaEffettoTrappola(s, slot, contesto, eventoEsplicito) {
  const comb = s.combattimento;
  const log = (t) => aggiungiLog(s, t);
  const attProprietario = eventoEsplicito?.attProprietario ?? comb?.proprietario;
  const difProprietario = eventoEsplicito?.difProprietario ?? comb?.difProprietario;
  const attaccanteId = eventoEsplicito?.attaccanteId ?? comb?.attaccanteId;
  const attP = s.giocatori[attProprietario];
  const difP = s.giocatori[difProprietario];
  const attaccante = campoDi(attP).find((x) => x.id === attaccanteId);
  const codice = slot.carta.effetto?.codice;
  registraNotificaEffetto(s, `🪤 ${slot.carta.nome} attivata!`, slot.carta.effetto?.testo, difProprietario, slot.carta.nome);

  if (codice === "cancel") {
    if (attaccante) annullaEvento(s, { tipo: "attaccoDichiarato" }, attaccante);
    s.messaggio = `${slot.carta.nome}: attacco annullato`;
    proseguiSeIA(s);
    return;
  }
  if (codice === "cristallo" || codice === "spezzavolonta" || codice === "copiare") {
    if (attaccante) attaccante.attacchiUsati += 1;
    s.messaggio = `${slot.carta.nome}: attacco annullato`;
    s.combattimento = null;
    proseguiSeIA(s);
    return;
  }
  if (codice === "ambush") {
    if (attaccante) {
      attaccante.danno = attaccante.vitaMax;
      log(`🪤 ${attaccante.nome} distrutto dall'imboscata`);
    }
    s.combattimento = null;
    // cap. UX Sezione 8: stessa scenografia di morte del combattimento normale (contraccolpo+volo+
    // impatto) invece della rimozione istantanea — registraNotificaEffetto è già stata chiamata in
    // cima a questa funzione, quindi AnimazioneMorte.jsx aspetterà che quella notifica sia chiusa
    // prima di partire (stessa guardia già usata altrove per stato.notificaEffetto). Se l'attaccante
    // non c'è più (già rimosso da un frame precedente), non c'è nessuno da mandare al cimitero qui.
    if (attaccante) {
      registraMorte(s, attProprietario, difProprietario, [{ creaturaId: attaccante.id, nome: attaccante.nome, chiave: attProprietario }]);
    }
    return;
  }
  if (codice === "stopatk") {
    if (attaccante) attaccante.attacchiUsati = attaccante.attacchiTotali;
    s.messaggio = attaccante ? `${slot.carta.nome}: ${attaccante.nome} perde gli attacchi rimanenti` : `${slot.carta.nome} attivata`;
    s.combattimento = null;
    proseguiSeIA(s);
    return;
  }
  if (codice === "reroll") {
    const difensore = campoDi(difP).find((x) => x.id === comb.difensoreId);
    const nuovo = tiraDadoArchetipo(difensore.archetipo);
    // Idea 59: il ritiro da Trappola è un dado di combattimento → passo "anim" della fila (come gli
    // altri tiri). applicaSimbolo qui sotto accoda poi balzo + numero di danno.
    accodaPassi(s, passoAnim(s, "dado", { archetipo: difensore.archetipo, faccia: nuovo }, TEMPI.dado.totale + TEMPI.respiro));
    log(`🪤 Ritiro da trappola: ${NOME_SIMBOLO[comb.simboloTirato]} → ${NOME_SIMBOLO[nuovo]}`);
    applicaSimbolo(s, nuovo, true);
    return;
  }
  if (codice === "mirror") {
    applicaSimbolo(s, comb.simboloTirato, true, true);
    return;
  }
  if (codice === "divine") {
    const A = attaccoTotale(attaccante, attP);
    infliggiDanno(s, comb.proprietario, A);
    attaccante.attacchiUsati = attaccante.attacchiTotali;
    log(`🪤 Intervento Divino: Stratega attaccante −${A} PV`);
    s.combattimento = null;
    controllaVittoria(s);
    proseguiSeIA(s);
    return;
  }

  if (contesto === "attaccoDiretto") {
    s.combattimento = null;
    risolviAttaccoDiretto(s, comb.proprietario, attaccante, log);
  } else if (contesto === "attaccoDichiarato") passaAlRifiuto(s);
  else applicaSimbolo(s, comb.simboloTirato, true);
}

// indiceSlot < 0 = rinuncia ad attivare. Vecchio flusso a scelta singola: ancora usato per dopoTiro
// e attaccoDiretto (non ancora agganciati alla catena, restano come prima).
function risolviTrappolaScelta(s, indiceSlot) {
  const comb = s.combattimento;
  if (!comb || comb.step !== "trappola") return;
  const log = (t) => aggiungiLog(s, t);
  const attP = s.giocatori[comb.proprietario];
  const difP = s.giocatori[comb.difProprietario];
  const attaccante = campoDi(attP).find((x) => x.id === comb.attaccanteId);

  if (indiceSlot < 0 || !difP.magieTrappole[indiceSlot]) {
    if (comb.contestoTrappola === "attaccoDiretto") {
      s.combattimento = null;
      risolviAttaccoDiretto(s, comb.proprietario, attaccante, log);
    } else if (comb.contestoTrappola === "attaccoDichiarato") passaAlRifiuto(s);
    else applicaSimbolo(s, comb.simboloTirato, true);
    return;
  }

  const slot = difP.magieTrappole[indiceSlot];
  scartaTrappola(difP, slot, log);
  applicaEffettoTrappola(s, slot, comb.contestoTrappola);
}

// ===== Catena di effetti a cascata (cap. catena.js) — motore generico =====
// Chi ha la priorità può aggiungere una Magia/Trappola eleggibile per l'evento corrente (dal proprio
// campo) come nuovo frame in cima, oppure passare. Quando entrambi passano di seguito: se nessuno ha
// aggiunto nulla, l'azione originale prosegue normalmente; altrimenti si risolve il frame in cima
// (l'ultimo aggiunto, LIFO) e la priorità torna a chi possiede il frame rimasto sotto. A differenza
// della prima versione (solo combattimento), questa non dipende più da s.combattimento: l'evento a
// cui si sta rispondendo (s.catena.evento, es. { tipo: "attaccoDichiarato", ... } o
// { tipo: "evocazione", ... }) è quello che decide l'eleggibilità (carteEleggibiliPerRisposta in
// magieTrappole.js), non un "contesto" fisso letto dal combattimento in corso — così ogni nuovo punto
// del gioco agganciato in futuro (Magie/Trappole dirette, Imprevisti, effetti carta) riusa lo stesso
// meccanismo senza bisogno di una funzione/tabella dedicata.

// Apre la finestra di reazione per l'evento indicato: "primoAChiedere" riceve la priorità per primo.
function apriFinestraCatena(s, evento, primoAChiedere) {
  s.catena = nuovaCatena();
  s.catena.evento = evento;
  // Idea 59 Fase 2: cronaca dei frame già risolti in QUESTA catena (ex `storico` locale di
  // CatenaStriscia.jsx) — la striscia la usa per mostrare le mini-carte con ✓#ordine. Muore con
  // s.catena. catena.js resta puro: questo campo lo scrive solo il reducer.
  s.catena.risolti = [];
  apriPriorita(s.catena, primoAChiedere);
}

// Ritorna true se accettato: era il turno di priorità di "chiave", lo slot esiste, è una Magia/Trappola
// pronta ed eleggibile per l'evento corrente (il predicato del suo codice include già "chi può
// giocarla" — non serve un guard separato qui, a differenza della prima versione), e non è già in
// coda come frame pendente.
function aggiungiTrappolaAllaCatena(s, chiave, indiceSlot) {
  if (!s.catena) return false;
  const giocatore = s.giocatori[chiave];
  const slot = giocatore.magieTrappole[indiceSlot];
  if (!slot) return false;
  const eleggibili = carteEleggibiliPerRisposta(giocatore, chiave, s.catena.evento);
  if (!eleggibili.includes(slot)) return false;
  const giaInCoda = s.catena.frames.some((f) => f.datiRisoluzione?.slot === slot);
  if (giaInCoda) return false;
  const frame = aggiungiFrame(s.catena, {
    tipo: "trappola",
    proprietario: chiave,
    cartaNome: slot.carta.nome,
    // annullata (cap. UX Sezione 7): nessun codice Trappola oggi la imposta mai a true (i 6 codici
    // eleggibili per attaccoDichiarato colpiscono tutti l'attacco/l'attaccante, non un'altra carta
    // della catena) — il campo esiste comunque, pronto per una futura carta che annulli un frame
    // sottostante tramite annullaFrameCatena qui sotto, così la scenografia (✕ invece di ✓ nella
    // striscia) ha già dove attaccarsi senza bisogno di un altro giro di modifiche.
    annullata: false,
    datiRisoluzione: { slot, evento: s.catena.evento },
  });
  if (frame) s.messaggio = `${slot.carta.nome}: in attesa di risoluzione`;
  return frame !== null;
}

// Marca un ALTRO frame ancora in pila come annullato (cap. UX Sezione 7): quando arriverà il suo turno
// di risoluzione LIFO, risolviRisoluzioneFrameCatena non ne applicherà l'effetto — solo la scenografia
// (✕ rossa invece di ✓, "salta silenziosamente"). Nessun codice Trappola esistente la chiama oggi
// (nessuno dei 6 eleggibili per attaccoDichiarato annulla un'altra carta, solo l'attacco stesso) — è
// qui pronta per quando disegnerai una carta che lo fa, così il motore non va ritoccato.
function annullaFrameCatena(s, frameId) {
  if (!s.catena) return false;
  const frame = s.catena.frames.find((f) => f.id === frameId);
  if (!frame) return false;
  frame.annullata = true;
  return true;
}

// Determina cosa mostrare come bersaglio visivo della risoluzione (cap. UX Sezione 7): un'altra carta
// della catena stessa se il frame porta un bersaglioFrameId esplicito (nessun codice lo imposta oggi,
// vedi annullaFrameCatena sopra), altrimenti la creatura sul campo coinvolta nell'evento a cui il frame
// risponde — l'attaccante per l'attacco dichiarato (i 6 codici Trappola colpiscono quasi sempre lui,
// non il difensore), la creatura evocata per l'evocazione.
function calcolaBersaglioFrameCatena(s, frame) {
  const b = calcolaBersaglioFrameCatenaImpl(s, frame);
  // Log diagnostico P1.4 (bug segnalato: la linea/puntino della risoluzione catena "va a caso fuori
  // dal campo"). Zero impatto sul gioco — serve solo a capire QUALE ramo scatta e con che bersaglio la
  // prossima volta che succede dal vivo. Da rimuovere quando P1.4 è chiuso.
  const riga = `[P1.4] frame "${frame?.cartaNome}" (di ${frame?.proprietario}) · evento ${frame?.datiRisoluzione?.evento?.tipo ?? "?"} · comb=${s.combattimento ? `att ${s.combattimento.proprietario}#${s.combattimento.attaccanteId}` : "assente"} · bersaglio=${b ? (b.tipo === "campo" ? `campo#${b.creaturaId} (${b.nome ?? "?"})` : `catena#${b.frameId}`) : "NULLO"}`;
  // Diagnostico P1.4 (bug: la linea di risoluzione catena "va a caso fuori dal campo"). Lo scrivo
  // ANCHE nel Registro Mosse, non solo in console: così basta aprire Opzioni → Registro & Dadi e fare
  // uno screenshot, senza dover aprire la console del browser. Da rimuovere quando P1.4 è chiuso.
  try {
    aggiungiLog(s, riga);
  } catch {
    /* ignora */
  }
  try {
    console.log("[P1.4 VFX catena]", riga);
  } catch {
    /* console non disponibile */
  }
  return b;
}

function calcolaBersaglioFrameCatenaImpl(s, frame) {
  const bersaglioFrameId = frame.datiRisoluzione?.bersaglioFrameId;
  if (bersaglioFrameId != null) {
    const altro = s.catena.frames.find((f) => f.id === bersaglioFrameId);
    return altro ? { tipo: "catena", frameId: altro.id, cartaNome: altro.cartaNome } : null;
  }
  const evento = frame.datiRisoluzione?.evento;
  if (evento?.tipo === "evocazione") {
    const evocatore = s.giocatori[evento.evocatore];
    const creatura = campoDi(evocatore).find((c) => c.id === evento.creaturaId);
    return creatura ? { tipo: "campo", creaturaId: creatura.id, nome: creatura.nome, chiave: evento.evocatore } : null;
  }
  if (evento?.tipo === "attaccoDichiarato" && s.combattimento) {
    const attP = s.giocatori[s.combattimento.proprietario];
    const attaccante = campoDi(attP).find((c) => c.id === s.combattimento.attaccanteId);
    return attaccante
      ? { tipo: "campo", creaturaId: attaccante.id, nome: attaccante.nome, chiave: s.combattimento.proprietario }
      : null;
  }
  return null;
}

// Applica l'effetto reale di UN frame appena tolto dalla cima della pila: smista in base al TIPO
// dell'evento a cui rispondeva, non a un contesto di combattimento fisso — il combattimento riusa
// applicaEffettoTrappola già esistente (che a sua volta legge s.combattimento), l'evocazione risolve
// direttamente contro l'evento salvato nel frame (non serve più s.trappolaEvocazione).
function risolviFrameCatena(s, frame) {
  const { slot, evento } = frame.datiRisoluzione;
  const log = (t) => aggiungiLog(s, t);
  const giocatore = s.giocatori[frame.proprietario];
  scartaTrappola(giocatore, slot, log);
  if (evento.tipo === "evocazione") {
    const codice = slot.carta.effetto?.codice;
    const nomeCarta = slot.carta.nome;
    registraNotificaEffetto(s, `🪤 ${nomeCarta} attivata!`, slot.carta.effetto?.testo, frame.proprietario, nomeCarta);
    const avversarioCheHaEvocato = s.giocatori[evento.evocatore];
    const creatura = campoDi(avversarioCheHaEvocato).find((c) => c.id === evento.creaturaId);
    if (creatura) risolviTrappolaEvocazioneNemica(codice, nomeCarta, giocatore, avversarioCheHaEvocato, evento.evocatore, creatura, log);
  } else {
    // evento esplicito (cap. bug multi-frame): s.combattimento potrebbe essere già null a questo punto
    // se un frame più in alto nello stack (risolto prima, LIFO) lo ha già annullato — vedi
    // applicaEffettoTrappola, che per questo non legge più s.combattimento direttamente.
    applicaEffettoTrappola(s, slot, evento.tipo, evento);
  }
}

// Quando la finestra si chiude senza che nessuno abbia aggiunto nulla, l'azione originale prosegue
// come se la catena non ci fosse mai stata: per il combattimento vuol dire passare alla decisione di
// difesa (riusa il vecchio ramo già corretto); per l'evocazione non c'è nulla da fare, la creatura è
// già in campo e resta lì.
function nessunoHaRispostoAllaCatena(s, evento) {
  if (evento?.tipo === "attaccoDichiarato") passaAlRifiuto(s);
}

// Il giocatore con la priorità passa (non aggiunge altro). Se la finestra è pronta a chiudersi
// (entrambi hanno passato di seguito): pila vuota → si chiude e l'azione originale prosegue; pila
// piena → si accoda il passo muta:catenaRisoluzione (la scenografia del frame in cima), che quando
// arriva in scena applica l'effetto reale — vedi avviaRisoluzioneFrameCatena / applicaRisoluzioneFrameCatena.
function passaCatena(s, chiave) {
  if (!s.catena) return;
  const pronto = passa(s.catena, chiave);
  if (!pronto) return;

  if (catenaVuota(s.catena)) {
    const evento = s.catena.evento;
    s.catena = null;
    nessunoHaRispostoAllaCatena(s, evento);
    return;
  }

  avviaRisoluzioneFrameCatena(s);
}

// Avvia la risoluzione del frame in cima (cap. UX Sezione 7): NON lo toglie ancora dalla pila e non ne
// applica l'effetto — accoda il passo muta:catenaRisoluzione con quello che la UI deve mostrare
// (numero d'ordine LIFO, bersaglio per la linea di connessione, se "risolta" o "annullata"). Azzera la
// priorità mentre la scenografia è in fila: nessuno (né IA né umano) può aggiungere/passare finché il
// passo non è concluso (idea 59 Fase 2: prima era lo stato diretto s.catenaRisoluzioneInCorso).
function avviaRisoluzioneFrameCatena(s) {
  const frame = s.catena.frames[s.catena.frames.length - 1];
  const ordine = s.catena.prossimoOrdine ?? 1;
  s.catena.prossimoOrdine = ordine + 1;
  s.catena.turnoDiPriorita = null;
  accodaPassi(
    s,
    passoMuta(
      s,
      "catenaRisoluzione",
      {
        frameId: frame.id,
        cartaNome: frame.cartaNome,
        proprietario: frame.proprietario,
        ordine,
        bersaglio: calcolaBersaglioFrameCatena(s, frame),
        esito: frame.annullata ? "annullata" : "risolta",
      },
      TEMPI.catena.scenografia + TEMPI.respiro
    )
  );
}

// Applica per davvero la risoluzione del frame in cima, chiamata da eseguiMuta quando il passo
// muta:catenaRisoluzione è concluso (la scenografia è stata mostrata): registra il frame nella cronaca
// s.catena.risolti, lo toglie dalla pila, ne applica l'effetto reale (se non "annullata" — in quel caso
// salta silenziosamente), e chiude la finestra se non resta più nulla in pila. Ex
// confermaRisoluzioneFrameCatena (dispatch "catena-conferma-risoluzione", rimossa in Fase 2).
function applicaRisoluzioneFrameCatena(s, dati) {
  const catena = s.catena;
  if (!catena || !catena.frames.length) return;
  const frame = rimuoviFrameInCima(catena);
  catena.risolti = [
    ...(catena.risolti ?? []),
    { id: dati.frameId, cartaNome: dati.cartaNome, proprietario: dati.proprietario, ordine: dati.ordine, esito: dati.esito },
  ];
  if (!frame.annullata) risolviFrameCatena(s, frame);

  // Chiudi la finestra solo se è ANCORA la stessa (risolviFrameCatena → proseguiSeIA →
  // prossimaAzioneAttaccoIA può aver già aperto un'ALTRA catena in questa stessa dispatch,
  // riassegnando s.catena) e non resta più nulla nella sua pila. catenaVuota è il segnale generico:
  // vale sia per il combattimento sia per l'evocazione (che non ha un s.combattimento da controllare).
  if (s.catena === catena && catenaVuota(catena)) s.catena = null;
}

// Idea 59 Fase 2: tiene s.sequenza allineata con lo stato della catena. Se una finestra è aperta e la
// priorità tocca a un umano, ci deve essere in fila UN passo scelta:catena (il pop-up di decisione); se
// la priorità è azzerata (risoluzione a metà, tipico di un salvataggio ripreso) e la pila non è vuota,
// riarma la scenografia. Idempotente: se il passo giusto c'è già, non fa nulla. Chiamata dopo ogni
// mutazione della catena (avanzaCatena, i due case catena-*, eseguiMuta) e al ripristino da salvataggio.
function sincronizzaPassoCatena(s) {
  if (!s.catena) return;
  const giaInFila = (s.sequenza ?? []).some((p) => p.nome === "catena" || p.nome === "catenaRisoluzione");
  if (giaInFila) return;
  const pri = s.catena.turnoDiPriorita;
  const umano = pri === "io" || (s.modalitaGioco === "1v1locale" && pri === "avversario");
  if (umano) {
    accodaPassi(s, passoScelta(s, "catena", "catena-passa", { evento: s.catena.evento, proprietarioPriorita: pri }));
  } else if (pri == null && !catenaVuota(s.catena)) {
    // Ripristino a metà scenografia di risoluzione: il passo era andato perso con la fila svuotata.
    avviaRisoluzioneFrameCatena(s);
  }
}

// Euristica IA per QUALUNQUE finestra a catena aperta (combattimento o evocazione): quasi sempre
// passa; ogni tanto aggiunge la prima carta eleggibile e non già in coda, se ne ha una — stessa
// aggressività del vecchio flusso a scelta singola (50% circa), leggermente ridotta per non
// incatenare all'infinito inutilmente.
function decisioneCatenaIA(s) {
  if (!s.catena) return null;
  const av = s.giocatori.avversario;
  const eleggibili = carteEleggibiliPerRisposta(av, "avversario", s.catena.evento).filter(
    (slot) => !s.catena.frames.some((f) => f.datiRisoluzione?.slot === slot)
  );
  if (eleggibili.length > 0 && Math.random() < 0.4) {
    return av.magieTrappole.indexOf(eleggibili[0]);
  }
  return null; // passa
}

// Fa avanzare la finestra di reazione finché tocca all'IA decidere: decide da sola (euristica) e si
// richiama finché non tocca a "io" o la finestra si chiude. "io" la richiama dopo ogni sua decisione
// tramite le dispatch "catena-aggiungi-trappola"/"catena-passa".
function avanzaCatena(s) {
  if (!s.catena) return;
  // cap. 1v1 locale: l'euristica IA decide solo quando "avversario" è davvero IA (vsIA) — in 1v1
  // locale si ferma qui e aspetta la stessa dispatch "catena-aggiungi-trappola"/"catena-passa" già
  // usata per "io", ora accettata anche per "avversario" (vedi i due case sopra).
  if (s.catena.turnoDiPriorita !== "avversario" || s.modalitaGioco === "1v1locale") {
    // Idea 59 Fase 2: la priorità è di un umano (o la finestra sta per risolversi) — assicura il
    // passo scelta:catena in fila così CatenaStriscia.jsx sa cosa mostrare.
    sincronizzaPassoCatena(s);
    return;
  }
  const indiceSlot = decisioneCatenaIA(s);
  if (indiceSlot != null) aggiungiTrappolaAllaCatena(s, "avversario", indiceSlot);
  else passaCatena(s, "avversario");
  avanzaCatena(s);
}

function decidiDifesa(s, rifiuta) {
  const comb = s.combattimento;
  if (!comb || comb.step !== "rifiuto") return;
  const log = (t) => aggiungiLog(s, t);
  const attP = s.giocatori[comb.proprietario];
  const difP = s.giocatori[comb.difProprietario];
  const attaccante = campoDi(attP).find((x) => x.id === comb.attaccanteId);
  const difensore = campoDi(difP).find((x) => x.id === comb.difensoreId);
  if (!attaccante || !difensore) {
    s.combattimento = null;
    return;
  }

  if (rifiuta) {
    const A = attaccoTotale(attaccante, attP);
    infliggiDanno(s, comb.difProprietario, A);
    attaccante.attacchiUsati += 1;
    log(`🚫 ${comb.difProprietario === "io" ? "Rifiuti" : "L'avversario rifiuta"} la difesa: Stratega -${A} PV, ${difensore.nome} illeso`);
    s.messaggio = "Difesa rifiutata: danno pieno allo Stratega";
    s.combattimento = null;
    controllaVittoria(s);
    proseguiSeIA(s);
    return;
  }

  attivaEffettoDifensore(difensore, difP, log);
  attivaEffettoAggressore(attaccante, attP, log);

  const simbolo = tiraDadoArchetipo(difensore.archetipo);
  comb.simboloTirato = simbolo;
  comb.step = "tiro";
  // Idea 59: il tiro del dado di reazione è un passo "anim" della fila. Il pop-up seguente (Diritto
  // di ripetizione / Trappola dopoTiro) è a sua volta gestito dalla fila, quindi non può comparire
  // finché questo dado non ha finito di rotolare.
  const passoDado = passoAnim(s, "dado", { archetipo: difensore.archetipo, faccia: simbolo }, TEMPI.dado.totale + TEMPI.respiro);

  const decisore = decisoreDiritto(comb.matchup);
  const giaUsato = attaccante.dirittoUsatoContro[difensore.id];

  if (!decisore || giaUsato) {
    accodaPassi(s, passoDado);
    applicaSimbolo(s, simbolo);
    return;
  }

  comb.step = "ripetizione";
  comb.decisore = decisore;
  const proprietarioDecisore = decisore === "attaccante" ? comb.proprietario : comb.difProprietario;

  // cap. 1v1 locale: l'euristica IA decide solo quando "avversario" è davvero IA (vsIA) — in 1v1
  // locale chi ha il diritto, chiunque sia, aspetta la stessa dispatch "decidi-ripetizione" già usata
  // per "io" (il messaggio più sotto vale invariato per entrambi).
  if (proprietarioDecisore === "avversario" && s.modalitaGioco !== "1v1locale") {
    accodaPassi(s, passoDado);
    const alternativo = tiraDadoArchetipo(difensore.archetipo);
    const usa = decisioneRipetizioneIA(decisore, simbolo, alternativo, attaccante, difensore, attP, difP);
    decidiRipetizione(s, usa, alternativo);
    return;
  }

  // Umano: dopo il dado, il passo "scelta" ripeti (correzione utente: pop-up "Ritenti?" DOPO aver
  // visto il simbolo, prima del numero di danno).
  accodaPassi(
    s,
    passoDado,
    passoScelta(s, "ripeti", "decidi-ripetizione", {
      simboloTirato: simbolo,
      decisore,
      proprietario: comb.proprietario,
      difProprietario: comb.difProprietario,
      attaccanteId: comb.attaccanteId,
      difensoreId: comb.difensoreId,
    })
  );
  s.messaggio = `È uscito ${NOME_SIMBOLO[simbolo]}. Vuoi far valere il diritto di ripetizione?`;
}

function decidiRipetizione(s, usa, alternativoPrecalcolato) {
  const comb = s.combattimento;
  if (!comb || comb.step !== "ripetizione") return;
  const log = (t) => aggiungiLog(s, t);
  const attP = s.giocatori[comb.proprietario];
  const difP = s.giocatori[comb.difProprietario];
  const attaccante = campoDi(attP).find((x) => x.id === comb.attaccanteId);
  const difensore = campoDi(difP).find((x) => x.id === comb.difensoreId);

  let simboloFinale = comb.simboloTirato;
  if (usa) {
    attaccante.dirittoUsatoContro[difensore.id] = true;
    simboloFinale = alternativoPrecalcolato ?? tiraDadoArchetipo(difensore.archetipo);
    // Idea 59: il ritiro è un nuovo dado in fila (prepend di un nuovo passo, come da §6 del doc).
    accodaPassi(s, passoAnim(s, "dado", { archetipo: difensore.archetipo, faccia: simboloFinale }, TEMPI.dado.totale + TEMPI.respiro));
    log(`🔄 Diritto di ripetizione: ${NOME_SIMBOLO[comb.simboloTirato]} → ${NOME_SIMBOLO[simboloFinale]}`);
  }
  applicaSimbolo(s, simboloFinale);
}

function applicaSimbolo(s, simbolo, saltaTrappole = false, specchio = false) {
  const comb = s.combattimento;
  const log = (t) => aggiungiLog(s, t);
  const attP = s.giocatori[comb.proprietario];
  const difP = s.giocatori[comb.difProprietario];
  const attaccante = campoDi(attP).find((x) => x.id === comb.attaccanteId);
  const difensore = campoDi(difP).find((x) => x.id === comb.difensoreId);

  // Diplomatico Aureo / Cervo Luminoso: schivata automatica bancata o rinnovata ogni turno.
  if (simbolo !== "D" && consumaSchivataAutomatica(difensore)) {
    log(`✦ ${difensore.nome}: schivata automatica, il colpo non lo tocca`);
    simbolo = "D";
  }

  // Mago Sorprendente: quando difende, può ritirare il dado una volta per turno se il risultato lo penalizza.
  if (magoPuoRitirare(difensore) && preferenzaDifensore(simbolo, attaccante, difensore, attP, difP) < 0) {
    difensore.magoUsatoQuestoTurno = true;
    const nuovo = tiraDadoArchetipo(difensore.archetipo);
    // Idea 59: anche il ritiro del Mago è un dado in fila.
    accodaPassi(s, passoAnim(s, "dado", { archetipo: difensore.archetipo, faccia: nuovo }, TEMPI.dado.totale + TEMPI.respiro));
    log(`✦ ${difensore.nome} ritira il dado: ${NOME_SIMBOLO[simbolo]} → ${NOME_SIMBOLO[nuovo]}`);
    simbolo = nuovo;
  }

  // Finestra trappole dopo il tiro (ritiro / specchio)
  if (!saltaTrappole) {
    const trappole = carteEleggibiliPerRisposta(difP, comb.difProprietario, { tipo: "dopoTiro", difProprietario: comb.difProprietario });
    if (trappole.length > 0) {
      comb.step = "trappola";
      comb.contestoTrappola = "dopoTiro";
      comb.simboloTirato = simbolo;
      if (comb.difProprietario === "io") {
        s.messaggio = `È uscito ${NOME_SIMBOLO[simbolo]}: puoi attivare una Trappola`;
        return;
      }
      const slot = Math.random() < 0.5 ? difP.magieTrappole.indexOf(trappole[0]) : -1;
      risolviTrappolaScelta(s, slot);
      return;
    }
  }

  // cap. sequenza combattimento (sequenza b): il simbolo è ORA definitivo (nessun ritiro Mago /
  // diritto di ripetizione / Trappola "dopoTiro" in sospeso) — accoda il balzo, poi il numero di
  // danno. risolviDannoCombattimento riempie il passo "danno" coi numeri e, se letale, aggiunge il
  // passo "muta" morte in fondo.
  accodaPassi(
    s,
    passoAnim(s, "balzo", { attaccanteId: comb.attaccanteId, difensoreId: comb.difensoreId, proprietario: comb.proprietario }, TEMPI.balzo + 50),
    passoAnim(s, "danno", { eventi: [] }, TEMPI.numeroDanno + TEMPI.respiro)
  );
  s.messaggio = `È uscito ${NOME_SIMBOLO[simbolo]}!`;
  risolviDannoCombattimento(s, simbolo, specchio);
}

// Seconda metà di applicaSimbolo: calcola e applica il danno non appena il simbolo è definitivo
// (nessuna pausa per il giocatore, cap. 11) e registra l'esito per l'animazione in UI — numero
// fluttuante sopra la/le carte coinvolte: rosso = danno, verde "0" = schivata, arancione "0" =
// pareggio (Scudo: nessuno subisce nulla; Spada: pareggio "mortale", entrambi gli Alieni distrutti).
function risolviDannoCombattimento(s, simbolo, specchio) {
  const comb = s.combattimento;
  const log = (t) => aggiungiLog(s, t);
  const attP = s.giocatori[comb.proprietario];
  const difP = s.giocatori[comb.difProprietario];
  const attaccante = campoDi(attP).find((x) => x.id === comb.attaccanteId);
  const difensore = campoDi(difP).find((x) => x.id === comb.difensoreId);

  let { dannoDifensore, dannoAttaccante, pareggioMortale } = risolviSimbolo(simbolo, attaccante, difensore, attP, difP);

  if (pareggioMortale) {
    dannoDifensore = difensore.vitaMax;
    dannoAttaccante = attaccante.vitaMax;
  } else {
    dannoDifensore += effettiSimbolo(simbolo, attaccante, difensore, difP, dannoDifensore, log);
    dannoDifensore = modificaDannoDaTerreno(s.terreno, simbolo, dannoDifensore);
    dannoAttaccante = modificaDannoDaTerreno(s.terreno, simbolo, dannoAttaccante);

    // Lo Specchio Travolgente: il danno rimbalza sull'attaccante
    if (specchio && dannoDifensore > 0) {
      dannoAttaccante += dannoDifensore;
      dannoDifensore = 0;
      log("🪤 Lo Specchio Travolgente: il danno rimbalza sull'attaccante");
    }
  }

  // cap. finestra "al calcolo dei danni"/Magie Rapide (sequenza combattimento confermata
  // dall'utente 2026-08-26): il danno è ORA calcolato (i numeri sopra sono definitivi) ma non
  // ancora applicato alle carte vere — punto giusto per una reazione dell'ultimo istante, PRIMA
  // che diventi reale. Nessuna carta oggi ha un codice/effetto per questo evento (verificato
  // leggendo tutti i testi esistenti: chi parla di "danno" è già gestito da altri meccanismi —
  // Terreni, Specchio — quindi carteEleggibiliPerRisposta con questo tipo di evento, mai
  // riconosciuto da nessun predicato in ELEGGIBILITA_RISPOSTA, ritorna sempre vuoto). Lasciato
  // come semplice controllo (non come finestra a catena completa: apriFinestraCatena/avanzaCatena
  // + un ramo dedicato in risolviFrameCatena) apposta — wireare un percorso asincrono mai
  // esercitato da nessuna carta vera rischierebbe di lasciarlo silenziosamente rotto (un frame che
  // nessuno sa risolvere blocca il turno). Quando arriverà la prima carta reale con un simile
  // effetto, questo è il punto esatto dove aprire la finestra vera, sullo stesso schema già usato
  // per "attaccoDichiarato"/"evocazione".
  const eventoCalcoloDanni = { tipo: "calcoloDanni", attProprietario: comb.proprietario, difProprietario: comb.difProprietario };
  const eleggibiliCalcoloDanni = [
    ...carteEleggibiliPerRisposta(attP, comb.proprietario, eventoCalcoloDanni),
    ...carteEleggibiliPerRisposta(difP, comb.difProprietario, eventoCalcoloDanni),
  ];
  if (eleggibiliCalcoloDanni.length > 0) {
    log("⚠️ Una carta risulta eleggibile per 'calcoloDanni' ma la finestra vera non è ancora costruita — procedo comunque, verificare in CLAUDE.md");
  }

  const dannoDifensoreReale = applicaDannoConSopravvivenza(difensore, dannoDifensore);
  const dannoAttaccanteReale = applicaDannoConSopravvivenza(attaccante, dannoAttaccante);
  difensore.danno += dannoDifensoreReale;
  attaccante.danno += dannoAttaccanteReale;
  attaccante.attacchiUsati += 1;

  if (simbolo === "D") attivaEffettoEvasivo(difensore, difP, attaccante.id, log);

  const eventi = [];
  if (pareggioMortale) {
    eventi.push({ creaturaId: difensore.id, tipo: "pareggio" }, { creaturaId: attaccante.id, tipo: "pareggio" });
  } else if (simbolo === "D") {
    eventi.push({ creaturaId: difensore.id, tipo: "schivata" });
  } else if (dannoDifensoreReale > 0) {
    eventi.push({ creaturaId: difensore.id, tipo: "danno", valore: dannoDifensoreReale });
  } else if (dannoAttaccanteReale > 0) {
    eventi.push({ creaturaId: attaccante.id, tipo: "danno", valore: dannoAttaccanteReale });
  } else {
    eventi.push({ creaturaId: difensore.id, tipo: "pareggio" }, { creaturaId: attaccante.id, tipo: "pareggio" });
  }
  // Idea 59: riempi il passo "danno" già accodato da applicaSimbolo (numeri fluttuanti sulle carte).
  // Ce n'è sempre esattamente uno in fila quando si arriva qui.
  const passoDanno = (s.sequenza ?? []).find((p) => p.nome === "danno");
  if (passoDanno) passoDanno.dati.eventi = eventi;

  let dettaglio;
  if (pareggioMortale) dettaglio = `pareggio: ${attaccante.nome} e ${difensore.nome} si distruggono a vicenda`;
  else if (dannoDifensore) dettaglio = `-${dannoDifensore} a ${difensore.nome}`;
  else if (dannoAttaccante) dettaglio = `contraccolpo -${dannoAttaccante} a ${attaccante.nome}`;
  else dettaglio = "nessun danno";
  log(`${NOME_SIMBOLO[simbolo]}: ${attaccante.nome} → ${difensore.nome} — ${dettaglio}`);
  s.messaggio = `${NOME_SIMBOLO[simbolo]}! ${dettaglio}`;
  s.combattimento = null;

  // Idea 59 §7: se qualcuno muore, la rimozione vera dal campo è DIFFERITA a un passo "muta" in fondo
  // alla fila — la creatura resta in primaLinea/retrovia (0 Vita) finché non è il suo momento. Così
  // niente la interroga mentre balzo/dado/numero si vedono, e sparisce strutturalmente il "BUG NOTO
  // priorità zero" (carta che muore nello stesso scontro in cui attacca). eseguiMortiCombattimento
  // (ripulisciCampo + avanzamento obbligatorio + vittoria + proseguiSeIA) gira nel gestore di
  // "sequenza-passo-concluso" quando AnimazioneMorte.jsx ha finito la scenografia.
  const morti = [attaccante, difensore]
    .filter((c) => !viva(c))
    .map((c) => ({ creaturaId: c.id, nome: c.nome, chiave: c === attaccante ? comb.proprietario : comb.difProprietario }));
  if (morti.length) {
    accodaPassi(
      s,
      passoMuta(s, "morte", { attProprietario: comb.proprietario, difProprietario: comb.difProprietario, morti }, TEMPI.morte.totale + TEMPI.respiro)
    );
    return;
  }

  ripulisciCampo(attP, log, difP);
  ripulisciCampo(difP, log, attP);
  sistemaPrimaLinea(s, comb.proprietario, log);
  sistemaPrimaLinea(s, comb.difProprietario, log);
  controllaVittoria(s);
  proseguiSeIA(s);
}

function proseguiSeIA(s) {
  if (s.vincitore) return;
  // Se c'è ancora da scegliere chi avanza in prima linea (cap. 4), la cascata dell'IA deve aspettare:
  // altrimenti l'IA continuerebbe ad attaccare mentre la tua scelta resta bloccata in sospeso, e il
  // turno può arrivare a finire senza che tu l'abbia mai risolta. risolviAvanzamento richiama questa
  // stessa funzione una volta fatta la scelta, per riprendere da dove si era fermata.
  if (s.avanzamentoRichiesto) return;
  if (s.giocatoreAttivo !== "avversario") return;
  // Idea 59 Fase 4: il prossimo scontro IA non si calcola MAI qui. Si accoda un passo muta:"ia" in
  // fondo alla fila e si esce: quando arriverà in cima (cioè quando tutta la scenografia davanti a
  // lui sarà stata mostrata) sarà eseguiMuta a chiamare avanzaIA("attacca") → prossimaAzioneAttaccoIA.
  // Così ogni scontro successivo è scandito uno alla volta (chiude la parte multi-attacco di F.6 /
  // P0.3-5) e, non essendoci più la ricorsione sincrona del ramo "fila vuota", lo sono anche gli
  // ATTACCHI DIRETTI allo Stratega a campo nemico sgombro (ex limite noto: si risolvevano tutti in
  // un colpo perché il danno diretto passa da s.codaVisiva e lasciava la fila vuota).
  accodaPassoIa(s, "attacca");
}

/* ===================== IA AVVERSARIO (semplice, nessuna magia/trappola) ===================== */

function eseguiFaseEvocaIA(s) {
  const log = (t) => aggiungiLog(s, t);
  const av = s.giocatori.avversario;
  const io = s.giocatori.io;

  // Magie: gioca la prima utile (buff su un proprio Alieno, potenziamento di massa, terreno)
  const iMagia = av.mano.findIndex((c) => c.tipoCarta === "magia" && magiaGiocabile(c, av, io));
  if (iMagia >= 0) {
    const carta = av.mano[iMagia];
    const tipoBersaglio = magiaRichiedeBersaglio(carta);
    let bersaglio = null;
    if (tipoBersaglio === "alleato") bersaglio = campoDi(av).filter(viva)[0];
    else if (tipoBersaglio === "nemico") bersaglio = campoDi(io).filter(viva)[0];
    if (!tipoBersaglio || bersaglio) {
      if (giocaMagia(carta, av, io, bersaglio, s, log)) {
        av.mano.splice(iMagia, 1);
        if (bersaglio) scartaOMantieniMagia(av, carta, bersaglio, log);
        else av.cimitero.push(carta);
      }
    }
  }

  // Trappole: ne piazza una coperta se ha spazio
  const iTrappola = av.mano.findIndex((c) => c.tipoCarta === "trappola");
  if (iTrappola >= 0 && av.magieTrappole.length < 5) {
    const carta = av.mano.splice(iTrappola, 1)[0];
    av.magieTrappole.push({ carta, coperta: true, pronta: false });
    log("🪤 L'avversario piazza una Trappola coperta");
  }

  if (campoPieno(av)) return;
  for (const lv of [3, 2, 1]) {
    const indice = av.mano.findIndex((c) => eUnAlieno(c) && c.livello === lv);
    if (indice < 0) continue;
    const carta = av.mano[indice];
    if (!puoEvocareNormale(av, carta)) continue;
    if (lv === 1) {
      const ev1 = eseguiEvocazione(av, indice, [], log);
      if (ev1) {
        avviaVoloEvocazione(s, "avversario", ev1); // cap. animazione evocazione avversario, niente sorgenteRect
        effettoEvocazione(ev1, av, s.giocatori.io, log);
        notificaEffettoCreaturaSeCe(s, ev1, "avversario");
        apriCatenaEvocazione(s, "io", "avversario", ev1);
      }
      av.evocazioneNormaleFatta = true;
      return;
    }
    const tributabili = campoDi(av)
      .filter((c) => !c.fresca)
      .sort((a, b) => a.livello - b.livello);
    let pagato = 0;
    const usati = [];
    for (const c of tributabili) {
      if (pagato >= lv) break;
      usati.push(c.id);
      pagato += c.livello;
    }
    const ev2 = eseguiEvocazione(av, indice, usati, log);
    if (ev2) {
      avviaVoloEvocazione(s, "avversario", ev2); // cap. animazione evocazione avversario, niente sorgenteRect
      effettoEvocazione(ev2, av, s.giocatori.io, log);
      notificaEffettoCreaturaSeCe(s, ev2, "avversario");
      apriCatenaEvocazione(s, "io", "avversario", ev2);
    }
    av.evocazioneNormaleFatta = true;
    return;
  }
}

function prossimaAzioneAttaccoIA(s) {
  const av = s.giocatori.avversario;
  if (!puoAttaccareQuestoTurno(s, "avversario")) {
    fineTurno(s);
    if (!s.vincitore) iniziaTurno(s);
    return;
  }
  const attaccante = av.primaLinea.find((c) => viva(c) && c.attacchiUsati < c.attacchiTotali);
  if (!attaccante) {
    fineTurno(s);
    if (!s.vincitore) iniziaTurno(s);
    return;
  }
  avviaAttacco(s, "avversario", attaccante.id);
  // Nessun bersaglio valido in questo momento per questo attaccante (prima linea nemica vuota e
  // retrovia protetta, cap. 4): avviaAttacco non ha fatto nulla (né avviato un combattimento, né
  // segnato l'attacco come usato). Senza questo controllo il turno resterebbe bloccato per sempre,
  // ritentando all'infinito con lo stesso Alieno — si passa invece al prossimo attaccante.
  // Idea 59 Fase 4: se invece avviaAttacco ha prodotto QUALCOSA (uno scontro da mostrare, un attacco
  // diretto, o anche solo il respiro accodato da proseguiSeIA su una Pedina stordita), la fila non è
  // più vuota — NON ricorrere qui (si salterebbero gli attacchi rimanenti di una Pedina
  // multi-attacco): ci penserà il passo muta:"ia" quando arriverà in cima. La ricorsione resta solo
  // per il caso "nessun bersaglio valido", che non produce niente di visivo da scandire.
  if (!s.combattimento && !s.vincitore && !s.sequenza?.length && attaccante.attacchiUsati < attaccante.attacchiTotali) {
    attaccante.attacchiUsati = attaccante.attacchiTotali;
    prossimaAzioneAttaccoIA(s);
  }
}

// Rifornimento IA: pesca doppio solo se non ha nulla con cui attaccare (campo sguarnito) e la mano è povera.
function decisioneRifornimentoIA(av) {
  const puoAttaccare = av.primaLinea.some((c) => viva(c) && !(c.stordito > 0));
  return !puoAttaccare && av.mano.length <= 3 && av.mazzo.length > 2;
}

// Euristica di difesa (dal prototipo): lascia passare solo se la creatura rischia di morire
// e lo Stratega può assorbire comodamente il colpo pieno.
function decisioneRifiutoIA(attaccante, difensore, difP, attP) {
  const A = attaccoTotale(attaccante, attP);
  const rischioMorte = A >= vitaAttuale(difensore);
  return rischioMorte && difP.hp > A * 3;
}

// Euristica sul diritto di ripetizione: confronta l'esito attuale con quello alternativo già tirato
// e decide se conviene, dal punto di vista di chi difende.
function decisioneRipetizioneIA(decisore, simbolo, alternativo, attaccante, difensore, attP, difP) {
  const attuale = preferenzaDifensore(simbolo, attaccante, difensore, attP, difP);
  const alt = preferenzaDifensore(alternativo, attaccante, difensore, attP, difP);
  if (decisore === "attaccante") return alt < attuale;
  return alt > attuale;
}
