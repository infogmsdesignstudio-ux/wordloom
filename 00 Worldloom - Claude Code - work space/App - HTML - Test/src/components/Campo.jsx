import { useEffect, useRef, useState } from "react";
import { useGame } from "../game/GameContext.jsx";
import { getImmagineCarta } from "../data/useMazzi.js";
import { attaccoTotale, parataTotale } from "../game/combattimento.js";
import { carteEleggibiliPerRisposta } from "../game/magieTrappole.js";
import { chiDecideOra, altroSeme } from "../game/prospettiva.js";
import { PV_INIZIALI } from "../game/costanti.js";
import { TEMPI } from "../game/tempi.js";
import { balzoInScena, esitoInScena, morteInScena, dadoInScena, catenaRisoluzioneInScena, evocaInScena, spostaInScena, pescaInScena } from "../game/sequenza.js";
import Carta from "./Carta.jsx";
import DettaglioCarta from "./DettaglioCarta.jsx";
import LancioDado from "./LancioDado.jsx";
import TitoloFase from "./TitoloFase.jsx";
import retroWorldloom from "../assets/logo-worldloom.jpg";

// Adatta il Terreno attivo (che non e' salvato come "carta" completa) alla forma che DettaglioCarta si aspetta.
function terrenoComeCartaPerZoom(terreno) {
  return { nome: terreno.nome, tipoCarta: "magia", sottotipo: "terreno", effetto: { testo: terreno.testo } };
}

// Adatta una creatura in campo (con danno, ecc.) alla forma che Carta si aspetta.
// giocatore è il proprietario della creatura: serve per i bonus passivi da campo (es. "Custode del
// Ghiaccio": +3/+3 agli altri Colosso alleati), che senza questo restavano invisibili in UI — stesso
// calcolo (attaccoTotale/parataTotale) già usato dal motore per il combattimento vero, così il numero
// mostrato a riposo coincide sempre con quello usato in uno scontro reale (a parte i bonus contestuali
// contro un bersaglio specifico, es. "troll", che hanno senso solo durante il confronto).
function propsCarta(creatura, giocatore) {
  const attacco = attaccoTotale(creatura, giocatore);
  const parata = parataTotale(creatura, giocatore);
  return {
    nome: creatura.nome,
    archetipo: creatura.archetipo,
    livello: creatura.livello,
    ruolo: creatura.ruolo,
    vita: creatura.vitaMax - creatura.danno,
    attacco,
    parata,
    // Verde se alterata in positivo, rosso se in negativo rispetto al valore stampato in carta (es.
    // un Potenziamento come "Spada Sacra di Ghiaccio", +5 Attacco, o un passivo da campo) — 0/assente
    // = colore normale. creatura.attaccoOriginale/parataOriginale sono il valore stampato, fissato
    // alla creazione.
    attaccoAlterazione: attacco - creatura.attaccoOriginale,
    parataAlterazione: parata - creatura.parataOriginale,
    attacchi: creatura.attacchiTotali,
    effetto: creatura.effetto,
    // Icona "bloccato" 🚫 (richiesta esplicita dell'utente): solo lo stordimento per ora — l'unico
    // impedimento causato da una Magia avversaria ("Aura di Marbion", codice "stun" in
    // magieTrappole.js) verificato prima con l'utente. stordito conta i turni residui (impostato a 2,
    // decrementato a ogni inizio turno del proprietario in gameReducer.js: blocca l'attacco per
    // esattamente 1 turno).
    stordita: creatura.stordito > 0,
  };
}

// Etichetta stat a fianco dello slot (cap. P3.3): fascia larga quanto lo slot, alta pochi px —
// ❤ vita · ⚔ attacco · 🛡 parata · [stato]. Sta SOTTO per la prima linea, SOPRA per la retrovia
// (posizione assoluta, non tocca la griglia). Sul lato avversario ruota 180° e l'ancora si inverte
// (CSS, .campo-zona-specchiata). Ferma: non segue il balzo/la morte della carta — si accende
// (fade-in) quando la creatura è a posto dopo l'evocazione, resta spenta mentre la carta è "in volo".
function SlotEtichetta({ dati, fila, visibile }) {
  const classeAlt = (d) => (d > 0 ? "slot-etichetta-su" : d < 0 ? "slot-etichetta-giu" : "");
  return (
    <div className={`slot-etichetta slot-etichetta-${fila} ${visibile ? "" : "slot-etichetta-spenta"}`}>
      <span title="Vita">❤{dati.vita}</span>
      <span className={classeAlt(dati.attaccoAlterazione)} title="Attacco">
        ⚔{dati.attacco}
      </span>
      <span className={classeAlt(dati.parataAlterazione)} title="Parata">
        🛡{dati.parata}
      </span>
      <span className="slot-etichetta-stato">{dati.stordita ? "🚫" : ""}</span>
    </div>
  );
}

function CellaCreatura({ creatura, stato, dispatch, onZoom, mazzoIdCarta, mio, fila }) {
  if (!creatura) return <div className="campo-slot campo-slot-vuoto" />;

  const comb = stato.combattimento;
  // "mia" = appartiene al seme fisso "io" (proprietà/logica: bonus passivi, chi può cliccare — mai
  // legata alla posizione a schermo). "mio" (prop, cap. 1v1 locale) = posizione fisica bassa/alta,
  // usata SOLO per il capovolgimento visivo qui sotto: nella modalità contro IA le due cose
  // coincidono sempre (io è sempre in basso), in 1v1 locale possono differire quando la prospettiva
  // segue il turno invece di restare fissa.
  const mia = stato.giocatori.io.primaLinea.concat(stato.giocatori.io.retrovia).some((c) => c.id === creatura.id);
  const giocatore = mia ? stato.giocatori.io : stato.giocatori.avversario;

  let onClick;
  let evidenzia = false;
  let eleggibileAvanzamento = false;

  // Bersaglio di una Magia: può essere una tua creatura o una nemica, a seconda della carta. "mia"
  // (seme "io" fisso) NON basta più qui: chi sta scegliendo il bersaglio può essere "avversario" in
  // 1v1 locale — stessa distinzione zona/mano di applicaBersaglioMagia (gameReducer.js): da zona
  // (Magia già piazzata, riattivata) resta sempre "io" per costruzione, non toccata in questo pezzo;
  // dalla mano è chi ha davvero il turno.
  if (stato.modalita === "bersaglio-magia" && !comb) {
    const chiaveCaster = stato.magiaSlotSelezionata !== null ? "io" : stato.giocatoreAttivo;
    const eMiaPerIlCaster = giocatore === stato.giocatori[chiaveCaster];
    const cercaAlleato = stato.bersaglioMagia === "alleato";
    if ((cercaAlleato && eMiaPerIlCaster) || (!cercaAlleato && !eMiaPerIlCaster)) {
      onClick = () => {
        // VFX source→target (VfxMagia.jsx): la carta sorgente sparirà dal DOM appena questo dispatch
        // parte (rimossa da mano/zona nello stesso giro), quindi la sua posizione va letta ORA, non
        // dopo — il reducer non ha accesso al DOM e la coda visiva rivela l'evento più tardi.
        const elFonte = document.querySelector('[data-fonte-magia="true"]');
        const r = elFonte?.getBoundingClientRect();
        const sorgenteRect = r ? { left: r.left, top: r.top, width: r.width, height: r.height } : null;
        dispatch({ type: "bersaglio-magia", creaturaId: creatura.id, sorgenteRect });
      };
      evidenzia = true;
    }
  } else if (
    // cap. 1v1 locale: il tributo è già generico nel reducer (selezionaTributo legge s.giocatoreAttivo)
    // — qui basta permettere il click anche quando la creatura appartiene al seme "avversario" con
    // davvero il turno, purché sia un umano vero (1v1 locale) o il consueto "io".
    !comb &&
    stato.modalita === "tributo" &&
    giocatore === stato.giocatori[stato.giocatoreAttivo] &&
    (stato.giocatoreAttivo === "io" || stato.modalitaGioco === "1v1locale")
  ) {
    onClick = () => dispatch({ type: "seleziona-tributo", creaturaId: creatura.id });
  } else if (
    // cap. 1v1 locale: lo spostamento è già generico nel reducer (muoviCreatura legge s.giocatoreAttivo)
    // — stessa condizione già usata sopra per il tributo e più sotto per l'attaccante.
    !comb &&
    stato.fase === 3 &&
    giocatore === stato.giocatori[stato.giocatoreAttivo] &&
    (stato.giocatoreAttivo === "io" || stato.modalitaGioco === "1v1locale")
  ) {
    onClick = () => {
      // Volo vero dello spostamento fila (cap. UX Sezione 5): la posizione ATTUALE di questa carta
      // (rectPropria) va letta ORA, prima che il dispatch la sposti in un'altra fila/array — stesso
      // principio di VfxMagia.jsx/AnimazioneEvocazione.jsx. Se questo click completa uno scambio
      // (stato.movimentoSelezionato già impostato su un'altra creatura), catturiamo anche la SUA
      // posizione attuale (rectAltra): il reducer non ha accesso al DOM, e dopo il dispatch entrambe
      // le carte avranno già cambiato fila.
      const leggiRect = (el) => {
        const r = el?.getBoundingClientRect();
        return r ? { left: r.left, top: r.top, width: r.width, height: r.height } : null;
      };
      const rectPropria = leggiRect(document.querySelector(`[data-creatura-id="${creatura.id}"]`));
      const altraId = stato.movimentoSelezionato && stato.movimentoSelezionato !== creatura.id ? stato.movimentoSelezionato : null;
      const rectAltra = altraId ? leggiRect(document.querySelector(`[data-creatura-id="${altraId}"]`)) : null;
      dispatch({ type: "muovi-creatura", creaturaId: creatura.id, rectPropria, rectAltra });
    };
  } else if (
    // cap. 1v1 locale: dichiarare l'attaccante è già generico nel reducer (scegliAttaccanteIo accetta
    // qualunque giocatoreAttivo) — qui basta permettere il click anche quando il proprietario è
    // "avversario" e ha davvero il turno, purché sia un umano vero (1v1 locale) o il consueto "io".
    !comb &&
    stato.fase === 4 &&
    giocatore === stato.giocatori[stato.giocatoreAttivo] &&
    (stato.giocatoreAttivo === "io" || stato.modalitaGioco === "1v1locale") &&
    creatura.attacchiUsati < creatura.attacchiTotali
  ) {
    onClick = () => dispatch({ type: "scegli-attaccante", creaturaId: creatura.id });
  } else if (
    // cap. UX Sezione 8, Step 8: uno slot di prima linea si è liberato con più di un candidato in
    // retrovia (avanzamentoAmbiguo) — l'Alieno eleggibile si illumina qui direttamente sul campo
    // invece del vecchio modale con lista testuale (PromptCombattimento.jsx). cap. 1v1 locale: stessa
    // condizione già usata sopra per tributo/spostamento/attaccante.
    !comb &&
    stato.avanzamentoRichiesto &&
    giocatore === stato.giocatori[stato.avanzamentoRichiesto] &&
    (stato.avanzamentoRichiesto === "io" || stato.modalitaGioco === "1v1locale") &&
    giocatore.retrovia.some((c) => c.id === creatura.id)
  ) {
    onClick = () => {
      // Volo vero (cap. UX Sezione 5, riusato identico): la posizione ATTUALE va letta ORA, prima che
      // il dispatch la sposti in prima linea — stesso principio già usato per lo spostamento manuale.
      const r = document.querySelector(`[data-creatura-id="${creatura.id}"]`)?.getBoundingClientRect();
      const sorgenteRect = r ? { left: r.left, top: r.top, width: r.width, height: r.height } : null;
      dispatch({ type: "scegli-avanzamento", creaturaId: creatura.id, sorgenteRect });
    };
    eleggibileAvanzamento = true;
  }

  // cap. 1v1 locale: scegliere il bersaglio spetta a chi ha dichiarato l'attacco (comb.proprietario),
  // che in 1v1 locale può essere anche "avversario" quando è un umano vero — chiDecideOra risolve
  // esattamente a comb.proprietario durante lo step "bersaglio" (vedi prospettiva.js), quindi questo
  // confronto resta corretto senza bisogno di un controllo separato su modalitaGioco.
  if (comb?.step === "bersaglio" && comb.proprietario === chiDecideOra(stato) && comb.bersagli.includes(creatura.id)) {
    onClick = () => dispatch({ type: "scegli-bersaglio", creaturaId: creatura.id });
    evidenzia = true;
  }

  // Bersaglio già scelto (mio o dell'IA, cap. B-animazioni): resta evidenziato di rosso finché il
  // pop-up di reazione non compare — l'utente vuole vederlo per un attimo prima che si apra qualunque
  // pop-up, sia quando scelgo io sia quando sceglie l'IA (prima si vedeva solo nel mio caso, e solo
  // per l'istante prima che lo step cambiasse).
  if (comb?.difensoreId === creatura.id) evidenzia = true;

  // Bersaglio di un frame della catena in fase di risoluzione (cap. UX Sezione 7): si illumina di
  // rosso mentre CatenaStriscia.jsx anima la linea di connessione verso di lui, fino alla conferma.
  // Idea 59 Fase 2: dal passo muta:catenaRisoluzione in scena, non più da s.catenaRisoluzioneInCorso.
  const bersaglioCatena = catenaRisoluzioneInScena(stato)?.bersaglio;
  if (bersaglioCatena?.tipo === "campo" && bersaglioCatena.creaturaId === creatura.id) evidenzia = true;

  const selezionata =
    stato.tributiSelezionati?.includes(creatura.id) ||
    stato.bersagliMagiaSelezionati?.includes(creatura.id) ||
    stato.movimentoSelezionato === creatura.id ||
    stato.candidatoScambio === creatura.id ||
    comb?.attaccanteId === creatura.id ||
    evidenzia;

  const esaurita = stato.fase === 4 && mia && creatura.attacchiUsati >= creatura.attacchiTotali;

  // Idea 59 — coda di step unica: il numero fluttuante (esito) e il balzo d'attacco ora vengono dal
  // passo di combattimento in scena (s.sequenza[0]) invece che da s.esitoCombattimento/
  // s.animazioneAttacco. Forma identica a prima, così il resto del render non cambia.
  const esitoScena = esitoInScena(stato);
  const esitoEvento = esitoScena?.eventi?.find((e) => e.creaturaId === creatura.id);
  const esito = esitoEvento ? { ...esitoEvento, key: esitoScena.id } : null;

  // Attacco appena dichiarato (cap. 11): la carta attaccante balza avanti e torna subito indietro.
  // La chiave dinamica forza React a rimontare solo questa carta quando l'id cambia, riavviando
  // l'animazione CSS anche se la stessa creatura attacca più volte di fila nello stesso turno.
  const balzoScena = balzoInScena(stato);
  const inAttacco = balzoScena?.attaccanteId === creatura.id ? balzoScena : null;
  const classiCarta = [!mio ? "carta-capovolta" : "", inAttacco ? `carta-attacca-${inAttacco.proprietario}` : ""]
    .filter(Boolean)
    .join(" ");

  // Volo vero dell'evocazione (cap. UX Sezione 4): la creatura è già vera in campo (stato di gioco), ma
  // resta invisibile qui finché AnimazioneEvocazione.jsx non atterra — lo slot (con data-creatura-id)
  // resta comunque nel DOM, serve come bersaglio reale da misurare per il volo.
  const inVoloEvocazione = evocaInScena(stato)?.creaturaId === creatura.id;
  // Volo vero dello spostamento fila (cap. UX Sezione 5): stesso principio di inVoloEvocazione — la
  // creatura è già nella sua nuova fila/array, ma resta invisibile qui finché
  // AnimazionePosizionamento.jsx non atterra.
  const inVoloMovimento = !!spostaInScena(stato)?.movimenti?.some((m) => m.creaturaId === creatura.id);
  // Morte in combattimento in corso (cap. UX Sezione 8): la creatura resta vera nell'array (0 Vita,
  // ancora rimossa) finché AnimazioneMorte.jsx non conferma — resta invisibile qui, il contraccolpo+
  // volo+impatto li gioca lei con un clone, letto dalla stessa posizione via data-creatura-id.
  // Idea 59: la morte in combattimento è un passo "muta" della fila; l'Imboscata (Trappola) usa
  // ancora s.morteInCorso (flusso Trappole non ancora migrato). Copri entrambi.
  const morteScena = morteInScena(stato) ?? stato.morteInCorso;
  const inVoloMorte = !!morteScena?.morti?.some((m) => m.creaturaId === creatura.id);
  // Avanzamento automatico appena avvenuto senza scelta (cap. UX Sezione 8, Step 8, caso non
  // ambiguo): nessun volo vero possibile (nessun click da cui misurare la partenza), solo un'entrata
  // breve — stessa tecnica di remount a chiave dinamica già usata per il balzo d'attacco.
  const avanzoAuto = stato.avanzamentoAutomaticoRecente?.creature.some((c) => c.creaturaId === creatura.id)
    ? stato.avanzamentoAutomaticoRecente
    : null;

  return (
    <div
      className={`campo-slot ${evidenzia ? "campo-slot-bersaglio" : ""} ${eleggibileAvanzamento ? "campo-slot-trappola-catena-eleggibile" : ""} ${esaurita ? "campo-slot-esaurito" : ""} ${inVoloEvocazione ? "campo-slot-evocazione-in-volo" : ""} ${inVoloMovimento ? "campo-slot-movimento-in-volo" : ""} ${inVoloMorte ? "campo-slot-morte-in-volo" : ""}`}
      data-creatura-id={creatura.id}
    >
      <Carta
        key={inAttacco ? `attacco-${inAttacco.id}` : avanzoAuto ? `avanzo-auto-${avanzoAuto.id}` : "quieta"}
        compatta
        carta={propsCarta(creatura, giocatore)}
        selezionata={selezionata}
        onClick={onClick}
        classiExtra={[classiCarta, avanzoAuto ? "carta-avanzata-auto" : ""].filter(Boolean).join(" ") || undefined}
        onZoom={() => onZoom(propsCarta(creatura, giocatore))}
        mazzoIdOverride={mazzoIdCarta}
        esito={esito}
      />
      {/* Etichetta stat (cap. P3.3): key sull'id creatura => fade-in daccapo ad ogni nuova creatura
          nello slot ("si accendono all'evocazione"). Spenta mentre la carta è "in volo" (evocazione/
          spostamento/morte): la carta non è a posto, l'etichetta resta ferma e buia. */}
      <SlotEtichetta
        key={`et-${creatura.id}`}
        dati={propsCarta(creatura, giocatore)}
        fila={fila}
        visibile={!inVoloEvocazione && !inVoloMovimento && !inVoloMorte}
      />
    </div>
  );
}

// 5 slot Magie e Trappole: normalmente coperte con lo sfondo Worldloom, proprie e avversarie (cap. 14)
// — come in un vero TCG non si legge il nome finché non tocchi l'iconcina ℹ per rivedertela. I
// Potenziamenti già attivi e legati a un bersaglio (mt.coperta === false, cap. B6) fanno eccezione:
// non sono più un segreto, quindi mostrano l'illustrazione vera invece del dorso, e non sono più
// "attivabili" toccandoli (l'effetto è già in corso, non c'è nulla da (ri)attivare).
// Le Magie coperte (a differenza delle Trappole) si possono anche attivare toccando la carta.
function FilaMagieTrappole({ titolo, giocatore, mio, onZoom, stato, dispatch, mazzoIdCarta }) {
  // "mio" qui è la posizione a schermo (basso/alto), usata solo per titolo/capovolgimento sfondo.
  // Chi può davvero attivare/incatenare una carta dipende dal seme fisso (seatKey), non dalla
  // posizione — in modalità contro IA le due cose coincidono sempre, in 1v1 locale no (cap. 1v1).
  const seatKey = giocatore === stato.giocatori.io ? "io" : "avversario";
  const eSeatIo = seatKey === "io";
  // Catena di effetti (cap. catena.js, redesign 2026-08-13; generalizzata cap. 1v1 locale): mentre
  // tocca a QUESTO seme decidere (turnoDiPriorita combacia), le sue carte eleggibili per l'evento
  // corrente si illuminano direttamente qui — le tocca per aggiungerle, niente più lista in un pop-up
  // separato (vedi CatenaStriscia.jsx, che mostra solo la pila e il bottone "Lascia proseguire"). In
  // modalità contro IA solo il seme "io" può mai avere qualcosa da toccare (l'IA decide da sola senza
  // UI); in 1v1 locale anche "avversario" può, quando è un umano vero con la priorità.
  const inCatena = stato.catena?.turnoDiPriorita === seatKey;
  let eleggibiliCatena = [];
  if (inCatena) {
    const giaInCoda = new Set(stato.catena.frames.map((f) => f.datiRisoluzione?.slot));
    eleggibiliCatena = carteEleggibiliPerRisposta(giocatore, seatKey, stato.catena.evento).filter((mt) => !giaInCoda.has(mt));
  }

  const slot = [];
  for (let i = 0; i < 5; i++) {
    const mt = giocatore.magieTrappole[i];
    if (!mt) {
      slot.push(<div className="campo-slot campo-slot-vuoto" key={`vuoto-${i}`} />);
      continue;
    }
    const scoperta = mt.coperta === false;
    const eMagia = mt.carta.tipoCarta === "magia";
    const eleggibilePerCatena = eleggibiliCatena.includes(mt);
    // stato.catena esclude l'attivazione "normale" mentre una decisione di catena è in sospeso, così
    // le due strade (attivazione libera vs risposta alla catena) non si accavallano mai. Gate su
    // eSeatIo (seme fisso), non su mio (posizione): il reducer (attivaMagiaPiazzata) opera sempre e
    // solo su s.giocatori.io, quindi cliccare qui deve restare possibile solo quando il giocatore
    // mostrato è davvero il seme "io" — altrimenti in 1v1 locale, quando il seme "avversario" occupa
    // la posizione bassa, si rischierebbe di attivare la carta sbagliata.
    const attivabile = !scoperta && eSeatIo && eMagia && !stato.modalita && !stato.combattimento && !stato.catena && !stato.vincitore;
    const immagineScoperta = scoperta ? getImmagineCarta(mazzoIdCarta, mt.carta.nome) : null;
    // VFX source→target (VfxMagia.jsx): questa Magia piazzata è la sorgente attualmente in attesa di
    // bersaglio (magiaSlotSelezionata combacia) — magiaSlotSelezionata è sempre e solo del seme "io"
    // per costruzione (vedi commento su eSeatIo sopra), quindi il marcatore va aggiunto solo lì.
    const eFonteMagia = eSeatIo && stato.modalita === "bersaglio-magia" && stato.magiaSlotSelezionata === i;
    // cap. bug "zoom prima di attivare" (richiesta esplicita dell'utente, sostituisce il vecchio
    // tocco diretto che attivava subito): toccare la carta ora apre lo zoom con un bottone di
    // conferma, invece di dispatchare all'istante — stesso schema onEvoca/etichettaAzione già usato
    // da Mano.jsx per giocare una carta dalla mano.
    const azioneAttivazione = eleggibilePerCatena
      ? { etichetta: "Aggiungi alla catena", onConferma: () => dispatch({ type: "catena-aggiungi-trappola", indiceSlot: i }) }
      : attivabile
      ? { etichetta: "Attiva", onConferma: () => dispatch({ type: "attiva-magia-piazzata", indiceSlot: i }) }
      : null;
    slot.push(
      <div
        className={`campo-slot campo-slot-trappola ${mt.pronta && !scoperta ? "campo-slot-trappola-pronta" : ""} ${attivabile ? "campo-slot-attivabile" : ""} ${scoperta ? "campo-slot-trappola-scoperta" : ""} ${eleggibilePerCatena ? "campo-slot-trappola-catena-eleggibile" : ""}`}
        key={mt.carta._uid ?? i}
        data-fonte-magia={eFonteMagia ? "true" : undefined}
        // Carta coperta dell'avversario: anche lo sfondo va capovolto 180° come le sue carte vere
        // (cap. task 58) — questo slot non ha figli quando è dell'avversario (l'iconcina ℹ compare
        // solo per mio), quindi si può ruotare l'intero div senza bisogno di un livello separato.
        style={{
          backgroundImage: `url(${scoperta ? immagineScoperta : retroWorldloom})`,
          transform: mio ? undefined : "rotate(180deg)",
        }}
        title={
          eleggibilePerCatena
            ? `${mt.carta.nome} — tocca per rivederla e aggiungerla alla catena`
            : scoperta
            ? `${mt.carta.nome}${mt.carta.effetto?.testo ? ` — ${mt.carta.effetto.testo}` : ""}`
            : mio
            ? `Carta coperta — tocca ℹ per rivedertela${attivabile ? " (o tocca la carta per rivederla e attivarla)" : ""}`
            : "Carta coperta"
        }
        onClick={azioneAttivazione ? () => onZoom(mt.carta, undefined, azioneAttivazione) : undefined}
      >
        {mio && (
          <button
            type="button"
            className="carta-mini-zoom"
            title="Rivedi la carta"
            onClick={(e) => {
              e.stopPropagation();
              onZoom(mt.carta, undefined, azioneAttivazione ?? undefined);
            }}
          >
            ℹ
          </button>
        )}
      </div>
    );
  }
  return (
    // Landscape-only (cap. redesign 2026-08-27): niente più titolo sopra come riga a parte (costava
    // spazio verticale prezioso) — il nome resta comunque disponibile al tocco/hover come title=
    // sull'intero gruppo. Stessa griglia a 5 colonne di prima linea/retrovia
    // (.campo-creature-griglia): le 5 corsie di Magia/Trappola si allineano davvero con quelle di
    // prima linea (1-3-5) e retrovia (2-4).
    <div className="campo-gruppo" title={titolo}>
      <div className="campo-creature-griglia">{slot}</div>
    </div>
  );
}

// Slot Terreno: unico e condiviso, mostrato su entrambi i lati.
function SlotTerreno({ titolo, terreno, onZoom, mio }) {
  return (
    <div className="campo-gruppo">
      <div
        className={`campo-slot ${terreno ? "campo-slot-terreno" : "campo-slot-vuoto"}`}
        title={terreno?.testo ?? `${titolo} — nessun Terreno attivo`}
        key={terreno ? `${terreno.proprietario}-${terreno.nome}` : "vuoto"}
      >
        {terreno && (
          <button
            type="button"
            className="carta-mini-zoom"
            title="Rivedi la carta"
            onClick={(e) => {
              e.stopPropagation();
              onZoom(terrenoComeCartaPerZoom(terreno));
            }}
          >
            ℹ
          </button>
        )}
        {/* cap. bug segnalato dal vivo (2026-08-27): le scritte descrittive dell'avversario devono
            capovolgersi come le sue carte, non restare dritte — solo i CONTATORI numerici restano
            dritti per leggibilità (precedente già stabilito, cap. task 58), le etichette testuali no. */}
        {terreno && <div className={`terreno-etichetta ${!mio ? "terreno-etichetta-capovolta" : ""}`}>🌍 {terreno.nome}</div>}
      </div>
    </div>
  );
}

// Pulsa nel momento in cui parte una pesca (cap. 6) e fa anche da sorgente reale per il volo vero
// della carta (cap. UX Sezione 3, AnimazionePescata.jsx legge [data-mazzo-pila] via
// getBoundingClientRect) — chiave è il seme vero ("io"/"avversario"), non la posizione a schermo.
function PilaMazzo({ titolo, conteggio, pescaInCorso, mio, chiave }) {
  return (
    <div className="campo-gruppo">
      <div
        className="campo-slot campo-pila"
        data-mazzo-pila={chiave}
        title={`${titolo} — ${conteggio} carte`}
        key={pescaInCorso ? `pesca-${pescaInCorso.id}` : "quieta"}
      >
        {/* Sfondo separato dal conteggio (cap. task 58): il dorso dell'avversario va capovolto
            180° come le sue carte vere, ma il numero sopra deve restare dritto e leggibile. */}
        <div
          className={`campo-pila-sfondo ${!mio ? "campo-pila-sfondo-capovolta" : ""}`}
          style={{ backgroundImage: `url(${retroWorldloom})` }}
        />
        {pescaInCorso && <div className="campo-pila-pulsa" />}
        <span className="campo-pila-conteggio">{conteggio}</span>
      </div>
    </div>
  );
}

function PilaCimitero({ titolo, cimitero, onZoom, mazzoIdCarta, mio, chiave }) {
  const ultima = cimitero[cimitero.length - 1];
  const immagine = ultima ? getImmagineCarta(mazzoIdCarta, ultima.nome) : null;
  return (
    <div className="campo-gruppo">
      <div
        className={`campo-slot ${ultima ? "campo-slot-cimitero" : "campo-slot-vuoto"}`}
        title={ultima ? `${titolo} — ultima: ${ultima.nome}` : `${titolo} — vuoto`}
        data-cimitero-pila={chiave}
      >
        {/* Illustrazione intera, non ritagliata (object-fit: contain) — come le creature in prima
            linea, invece del vecchio background-size:160% che zoomava/tagliava la carta. Il Cimitero
            avversario ruota 180° come tutto il resto della sua zona (creature, mano, dorsi coperti —
            cap. task 58): a differenza delle carte coperte qui si vede la faccia scoperta, ma la
            coerenza visiva vince (stesso motivo per cui le sue creature vere sono già capovolte). Solo
            l'immagine ruota, non il badge del conteggio né l'iconcina ℹ (elementi fratelli separati,
            restano dritti e leggibili). */}
        {immagine && (
          <img
            className={`campo-slot-cimitero-img ${!mio ? "campo-slot-cimitero-img-capovolta" : ""}`}
            src={immagine}
            alt={ultima.nome}
          />
        )}
        {ultima && onZoom && (
          <button
            type="button"
            className="carta-mini-zoom"
            title="Rivedi la carta"
            onClick={(e) => {
              e.stopPropagation();
              onZoom(ultima, cimitero);
            }}
          >
            ℹ
          </button>
        )}
        {cimitero.length > 0 && <span className="campo-pila-conteggio">{cimitero.length}</span>}
      </div>
    </div>
  );
}

// Slot placeholder puro, senza alcun collegamento allo stato di gioco (Esilio/Extra Worldloom, cap.
// redesign campo di battaglia 2026-08-27): "solo spazio riservato, nessuna funzione ora" — confermato
// esplicitamente con l'utente. Nessun onClick, nessun dato reale: quando in futuro queste zone
// avranno una funzione vera, prenderanno un componente a sé come Cimitero/Worldloom.
function SlotRiservato({ titolo, etichetta, mio }) {
  // cap. bug segnalato dal vivo (2026-08-27): l'etichetta testuale (Esilio/Extra) restava dritta
  // mentre le carte/sfondi dell'avversario sono capovolti 180° — incoerente, dava un'impressione di
  // disallineamento anche se le dimensioni dei riquadri sono identiche (verificato via DOM).
  return (
    <div className="campo-gruppo" title={titolo}>
      <div className={`campo-slot campo-slot-riservato ${!mio ? "campo-slot-riservato-capovolta" : ""}`}>{etichetta}</div>
    </div>
  );
}

// Monogramma a 2 lettere per fase e elenco fasi — stessa fonte di verità che prima viveva solo in
// App.jsx (IndicatoreFasi): spostati qui perché il cerchio fase ora fa parte del rail dentro
// Campo.jsx, non più una barra separata sotto il campo. App.jsx non li usa più.
const FASI = [
  { n: 1, nome: "Rifornimento" },
  { n: 2, nome: "Vaticinio" },
  { n: 3, nome: "Schieramento" },
  { n: 4, nome: "Alla Carica" },
  { n: 5, nome: "Vespro" },
];
const MONOGRAMMA_FASE = { 1: "RI", 2: "VA", 3: "SC", 4: "AC", 5: "VE" };
const FASE_ALLA_CARICA = 4;

// Rail comandi (anello PV + cerchio fase + ⚙ + timer): cap. redesign campo di battaglia, bozza
// confermata "v11" (vedi mockup pubblicato in sessione) — sostituisce le vecchie BarraPv/
// IndicatoreFasi di App.jsx, ora dentro Campo.jsx a fianco del campo invece che sopra/sotto di
// esso. Stessa logica di IndicatoreFasi (fase corrente/prossima, menu a tendina per saltare fase,
// click fuori per chiudere) e di BarraPv (percentuale PV, numero di danno flottante), solo vestita
// da cerchi invece che da barra+pillola rettangolare.
function Rail({ nome, giocatore, chiave, eventoDanno, turno, fase, puoAvanzare, onAvanti, onSalta, rinunciaAttacco, secondiRimasti }) {
  // cap. bug "il pulsante impostazioni non funziona": questa icona era solo decorativa (rimandava
  // con un tooltip all'icona vera in alto a destra) — confondeva l'utente, che si aspettava
  // funzionasse. Ora apre davvero lo stesso pannello, condividendo opzioniAperte con
  // PannelloOpzioni.jsx tramite GameContext.
  const { setOpzioniAperte } = useGame();
  const [menuAperto, setMenuAperto] = useState(false);
  const gruppoRef = useRef(null);
  useEffect(() => {
    if (!menuAperto) return;
    function chiudiSeFuori(e) {
      if (gruppoRef.current && !gruppoRef.current.contains(e.target)) setMenuAperto(false);
    }
    document.addEventListener("mousedown", chiudiSeFuori);
    return () => document.removeEventListener("mousedown", chiudiSeFuori);
  }, [menuAperto]);

  const percento = Math.max(0, Math.min(100, (giocatore.hp / PV_INIZIALI) * 100));
  const danno = eventoDanno && eventoDanno.chiave === chiave ? eventoDanno : null;

  const faseCorrente = fase != null ? FASI.find((f) => f.n === fase) : null;
  const cliccabile = puoAvanzare && !!faseCorrente && faseCorrente.n < FASI.length;
  const pillolaSmorzata = rinunciaAttacco && faseCorrente?.n === FASE_ALLA_CARICA;
  // Timer di turno (cap. "voglio vedere i numeri che vanno da 180 in giù"): secondiRimasti è null
  // per il lato che non ha il turno (Campo.jsx, secondiParaZona) — il cerchio resta vuoto/statico
  // in quel caso, nessun numero mostrato, non è lui a dover contare.
  const percentoTimer = secondiRimasti != null ? Math.max(0, Math.min(360, (secondiRimasti / (TEMPI.turno / 1000)) * 360)) : 0;
  const timerBasso = secondiRimasti != null && secondiRimasti <= 30;

  return (
    <div className="rail" title={nome}>
      <div className="rail-anchor">
        <div className="hp-ring" style={{ "--percento": `${percento}%` }}>
          <div className="crack" />
          <div className="hp-num">
            {giocatore.hp}
            <small>/ {PV_INIZIALI} PV</small>
          </div>
          {danno && (
            <span key={danno.id} className="rail-danno-flottante">
              −{danno.importo}
            </span>
          )}
        </div>
        <div className="rail-mid">
          <button type="button" className="gear" title="Impostazioni" onClick={() => setOpzioniAperte(true)}>
            ⚙
          </button>
          <div className={`timer ${timerBasso ? "timer-basso" : ""}`} title="Tempo rimasto in questo turno">
            <div className="fill" style={{ "--percento-timer": `${percentoTimer}deg` }} />
            {secondiRimasti != null && <span className="timer-num">{secondiRimasti}</span>}
          </div>
        </div>
        {faseCorrente ? (
          <div className="fasi-pillola-gruppo" ref={gruppoRef}>
            <div
              className={`phase-badge ${cliccabile ? "phase-badge-cliccabile" : ""} ${pillolaSmorzata ? "phase-badge-smorzata" : ""}`}
              onClick={cliccabile ? onAvanti : undefined}
              title={cliccabile ? "Avanza alla fase successiva" : faseCorrente.nome}
            >
              <div className="code">{MONOGRAMMA_FASE[faseCorrente.n]}</div>
              <div className="turno">{turno != null ? `T${turno}` : ""}</div>
              {pillolaSmorzata && <span className="fasi-badge-no-atk">NO ATK</span>}
            </div>
            {puoAvanzare && (
              <button
                type="button"
                className="chevron"
                onClick={() => setMenuAperto((v) => !v)}
                title="Salta a un'altra fase"
                aria-label="Apri menu fasi"
              >
                {menuAperto ? "▴" : "▾"}
              </button>
            )}
            {menuAperto && (
              <div className="fasi-menu">
                {FASI.map((f) => {
                  const passata = f.n < faseCorrente.n;
                  const attuale = f.n === faseCorrente.n;
                  const futura = f.n > faseCorrente.n;
                  const smorzata = rinunciaAttacco && f.n === FASE_ALLA_CARICA;
                  return (
                    <div
                      key={f.n}
                      className={`fasi-menu-voce ${attuale ? "fasi-menu-voce-attuale" : ""} ${passata ? "fasi-menu-voce-passata" : ""} ${futura ? "fasi-menu-voce-futura" : ""} ${smorzata ? "fasi-menu-voce-smorzata" : ""}`}
                      onClick={
                        futura
                          ? () => {
                              onSalta(f.n);
                              setMenuAperto(false);
                            }
                          : undefined
                      }
                    >
                      {attuale && <span className="fasi-menu-pallino" />}
                      <span className="fasi-menu-monogramma">{MONOGRAMMA_FASE[f.n]}</span>
                      {f.nome}
                      {smorzata && <span className="fasi-badge-no-atk">NO ATK</span>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="phase-badge phase-badge-inerte" />
        )}
      </div>
    </div>
  );
}

// Griglia a 5 colonne condivisa da prima linea (3, colonne 1-3-5), retrovia (2, colonne 2-4,
// sfalsata nei varchi tra le creature davanti) e Magia/Trappola (5, tutte le colonne) — cap.
// redesign campo di battaglia 2026-08-27, confermato in bozza dopo i giri v1-v11 (vedi mockup
// pubblicato in sessione, "Metà campo del giocatore") e integrato invariato, solo scalato
// proporzionalmente per stare in uno schermo landscape senza scroll (--campo-scale, index.css).
// Tre righe per zona: prima linea+Imprevisti, retrovia+Cimitero/Esilio, Magia/Trappola+Terreno+
// Worldloom/Extra Worldloom — più il rail comandi a fianco (sinistra per me, destra per l'avversario).
function ZonaGiocatore({ giocatore, mio, attiva, stato, dispatch, terreno, onZoom, mazzoIdCarta, nome, fase, puoAvanzare, onAvanti, onSalta, secondiRimasti, sfondo }) {
  // Chiave del SEME (proprietà reale), non della posizione — vedi commenti analoghi più sotto
  // (pescaInCorso/ultimoTiroImprevisti/imprevistoVisivo sono tutti scritti dal reducer con il seme
  // vero, mai con "mio" che in 1v1 locale può differire dalla posizione a schermo).
  const chiave = giocatore === stato.giocatori.io ? "io" : "avversario";

  const prima = (
    <div className="campo-creature-griglia" key="prima">
      {[0, 1, 2].map((i) => (
        <div key={giocatore.primaLinea[i]?.id ?? `pl-vuoto-${i}`} style={{ gridColumn: i * 2 + 1 }}>
          <CellaCreatura
            creatura={giocatore.primaLinea[i]}
            stato={stato}
            dispatch={dispatch}
            onZoom={onZoom}
            mazzoIdCarta={mazzoIdCarta}
            mio={mio}
            fila="prima"
          />
        </div>
      ))}
    </div>
  );
  const retrovia = (
    <div
      className={`campo-creature-griglia campo-creature-griglia-retro ${mio ? "" : "campo-creature-griglia-retro-specchiata"}`}
      key="retrovia"
    >
      {[0, 1].map((i) => (
        <div key={giocatore.retrovia[i]?.id ?? `re-vuoto-${i}`} style={{ gridColumn: i * 2 + 2 }}>
          <CellaCreatura
            creatura={giocatore.retrovia[i]}
            stato={stato}
            dispatch={dispatch}
            onZoom={onZoom}
            mazzoIdCarta={mazzoIdCarta}
            mio={mio}
            fila="retro"
          />
        </div>
      ))}
    </div>
  );
  const magieTrappole = (
    <FilaMagieTrappole
      key="magie"
      titolo={mio ? "Le tue Magie e Trappole" : "Magie e Trappole avversarie"}
      giocatore={giocatore}
      mio={mio}
      onZoom={onZoom}
      stato={stato}
      dispatch={dispatch}
      mazzoIdCarta={mazzoIdCarta}
    />
  );
  const slotTerreno = <SlotTerreno key="terreno" titolo={mio ? "Terreno" : "Terreno avversario"} terreno={terreno} onZoom={onZoom} mio={mio} />;

  const imprevisti = (
    <PilaImprevisti
      key="imprevisti"
      mio={mio}
      giocatore={giocatore}
      chiave={chiave}
      ultimoTiro={stato.ultimoTiroImprevisti}
      imprevistoVisivo={stato.imprevistoVisivo}
      onZoom={onZoom}
      mazzoIdCarta={mazzoIdCarta}
    />
  );
  const cimitero = (
    <PilaCimitero
      key="cimitero"
      titolo={mio ? "Cimitero" : "Cimitero avversario"}
      cimitero={giocatore.cimitero}
      onZoom={onZoom}
      mazzoIdCarta={mazzoIdCarta}
      mio={mio}
      chiave={chiave}
    />
  );
  const esilio = <SlotRiservato key="esilio" titolo={mio ? "Esilio" : "Esilio avversario"} etichetta="Esilio" mio={mio} />;
  // Il Worldloom pulsa mentre il passo pesca in scena è di questo seme (una pulsazione per carta
  // durante la prima mano, che sono N passi da 1 carta — idea 59 Fase 3).
  const pescaScena = pescaInScena(stato);
  const pescaScenaMia = pescaScena?.chiave === chiave ? pescaScena : null;
  const mazzo = (
    <PilaMazzo
      key="mazzo"
      titolo={mio ? "Worldloom" : "Worldloom avversario"}
      conteggio={giocatore.mazzo.length}
      pescaInCorso={pescaScenaMia}
      mio={mio}
      chiave={chiave}
    />
  );
  const extraWorldloom = (
    <SlotRiservato key="extra-worldloom" titolo={mio ? "Extra Worldloom" : "Extra Worldloom avversario"} etichetta="Extra" mio={mio} />
  );

  // Il campo dell'avversario è speculare al tuo (come seduti l'uno di fronte all'altro su un
  // tavolo vero): l'ordine orizzontale si inverte, le sue pile finiscono a sinistra, le tue a destra.
  const rigaPrima = (
    <div className="row" key="riga-prima">
      {mio ? [prima, imprevisti] : [imprevisti, prima]}
    </div>
  );
  const rigaRetrovia = (
    <div className="row" key="riga-retrovia">
      {mio
        ? [retrovia, <div className="campo-pila-coppia" key="pile">{[cimitero, esilio]}</div>]
        : [<div className="campo-pila-coppia" key="pile">{[esilio, cimitero]}</div>, retrovia]}
    </div>
  );
  const rigaRisorse = (
    <div className="row" key="riga-risorse">
      {mio
        ? [magieTrappole, slotTerreno, <div className="campo-pila-coppia" key="pile">{[mazzo, extraWorldloom]}</div>]
        : [<div className="campo-pila-coppia" key="pile">{[extraWorldloom, mazzo]}</div>, slotTerreno, magieTrappole]}
    </div>
  );

  // cap. bug segnalato dal vivo (2026-08-27): lo specchio orizzontale (sopra) c'era già, mancava
  // quello VERTICALE — le 3 righe (prima linea/retrovia/risorse) si rendevano sempre nello stesso
  // ordine dall'alto in basso per entrambi i lati. Per l'avversario (zona in alto sullo schermo)
  // questo lasciava la sua prima linea al bordo ESTERNO invece che al centro, accanto alla mia — il
  // contrario di "seduti l'uno di fronte all'altro". Ora l'ordine si inverte anche verticalmente per
  // !mio, così le due prime linee restano sempre adiacenti al confine condiviso tra le due zone.
  const campo = (
    <div className="field" key="field">
      {mio ? [rigaPrima, rigaRetrovia, rigaRisorse] : [rigaRisorse, rigaRetrovia, rigaPrima]}
    </div>
  );
  const rail = (
    <Rail
      key="rail"
      nome={nome}
      giocatore={giocatore}
      chiave={chiave}
      eventoDanno={stato.eventoDanno}
      turno={stato.turno}
      fase={fase}
      puoAvanzare={puoAvanzare}
      onAvanti={onAvanti}
      onSalta={onSalta}
      rinunciaAttacco={!!giocatore.rinunciaAttacco}
      secondiRimasti={secondiRimasti}
    />
  );

  return (
    <div className={`campo-zona ${attiva ? "campo-attivo" : ""} ${!mio ? "campo-zona-specchiata" : ""}`}>
      {/* Sfondo campo di battaglia (cap. editor mazzi): layer separato, dietro rail+field (z-index
          negativo, cap. .campo-zona-sfondo in index.css) — sostituisce lo sfondo stellato di .campo
          solo in QUESTA metà, quando il mazzo di questo seme ne ha scelto uno. Nessun elemento se
          sfondo è null: lo sfondo stellato dell'antenato .campo resta visibile normalmente. */}
      {sfondo && <div className="campo-zona-sfondo" style={{ backgroundImage: `url(${sfondo})` }} />}
      {mio ? [rail, campo] : [campo, rail]}
    </div>
  );
}

// Il mazzetto sta sempre sul bordo esterno del campo, lo slot di attivazione verso la ruota al centro.
function PilaImprevisti({ mio, giocatore, ultimoTiro, imprevistoVisivo, chiave, onZoom, mazzoIdCarta }) {
  // chiave è il seme reale ("io"/"avversario", passato esplicitamente dal chiamante) — NON derivato
  // da "mio" (posizione a schermo): ultimoTiro/imprevistoVisivo sono scritti dal reducer con il seme
  // vero, e in 1v1 locale posizione e seme possono differire (cap. 1v1).
  // Pinnato (cap. B16-round2): finché la coda non ha ancora rivelato l'esito del Dado Imprevisti per
  // questo lato, la carta resta ferma al valore "di prima" invece di ruotare/sparire subito — non deve
  // muoversi prima che il dado abbia finito di rotolare e restare fermo sul risultato.
  const pinnato = imprevistoVisivo?.chiave === chiave ? imprevistoVisivo : null;
  const inCorso = pinnato ? (pinnato.esiste ? { movimenti: pinnato.movimenti } : null) : giocatore.imprevistoInCorso;
  const mostraTiro = ultimoTiro && ultimoTiro.chiave === chiave;
  // Cimitero del mazzetto Imprevisti (cap. 15, P3.2): l'ultimo Imprevisto risolto resta scoperto
  // SOTTO la carta in corso (che sta sopra, coperta) — "come se girassero nello stesso mazzetto".
  const scartiImprevisti = giocatore.cimiteroImprevisti ?? [];
  const ultimoScarto = scartiImprevisti[scartiImprevisti.length - 1];
  const immagineScarto = ultimoScarto ? getImmagineCarta(mazzoIdCarta, ultimoScarto.nome) : null;
  const mazzo = (
    <div className="campo-slot campo-pila campo-pila-imprevisti" title="Mazzetto Imprevisti coperto" key="mazzo">
      {/* Sfondo separato dal conteggio (cap. task 58): il dorso dell'avversario va capovolto 180°
          come le sue carte vere, ma il numero sopra deve restare dritto e leggibile. */}
      <div
        className={`campo-pila-sfondo ${!mio ? "campo-pila-sfondo-capovolta" : ""}`}
        style={{ backgroundImage: `url(${retroWorldloom})` }}
      />
      <span className="campo-pila-conteggio">{giocatore.mazzettoImprevisti?.length ?? 0}</span>
    </div>
  );
  // La carta in corso resta coperta (nessun nome leggibile) finché non si attiva: si vede solo che
  // "ha girato", ruotando fisicamente di 90° per movimento accumulato la carta stessa (cap. 15),
  // non più una freccina separata. Il testo si scopre solo al momento dell'attivazione, nel
  // messaggio e nel registro mosse. La carta e il contatore N/4 sono due livelli separati apposta:
  // solo la carta (lo sfondo) ruota, il contatore resta sempre dritto e leggibile. Per l'avversario
  // si somma anche il capovolgimento base di 180° (cap. task 58), come per ogni sua carta coperta.
  const attivazione = (
    <div
      className={`campo-slot ${inCorso ? "campo-slot-imprevisto-attivo" : ultimoScarto ? "campo-slot-imprevisto-cimitero" : "campo-slot-vuoto"}`}
      title={
        inCorso
          ? `Imprevisto in corso — ${inCorso.movimenti}/4 movimenti (coperto finché non si attiva)`
          : ultimoScarto
          ? `Cimitero Imprevisti — ultimo: ${ultimoScarto.nome}`
          : "Qui avanza la carta Imprevisto"
      }
      key="attivazione"
    >
      {/* Livello 0: l'ultimo Imprevisto risolto, scoperto. Resta sotto la carta in corso. */}
      {immagineScarto && (
        <img
          className={`campo-slot-cimitero-img ${!mio ? "campo-slot-cimitero-img-capovolta" : ""}`}
          src={immagineScarto}
          alt={ultimoScarto.nome}
        />
      )}
      {/* Livello 1: la carta in corso, coperta, a piena dimensione dello slot, che ruota di 90° per
          movimento (cap. 15 + F.1: "deve stare sopra come se stessi girando fisicamente la carta").
          Lo slot è overflow:visible, quindi ruotando gli angoli sbucano dai bordi come una carta vera
          e in landscape si vede l'Imprevisto risolto scoperto sopra/sotto. */}
      {inCorso && (
        <>
          <div
            className="imprevisto-carta-ruotata"
            style={{ backgroundImage: `url(${retroWorldloom})`, transform: `rotate(${(mio ? 0 : 180) + inCorso.movimenti * 90}deg)` }}
          />
          <div className="imprevisto-avanzamento">{inCorso.movimenti}/4</div>
        </>
      )}
      {/* ℹ + conteggio del cimitero Imprevisti: sfogliabile come il Cimitero creature (task 54). */}
      {ultimoScarto && onZoom && (
        <button
          type="button"
          className="carta-mini-zoom"
          title="Rivedi gli Imprevisti risolti"
          onClick={(e) => {
            e.stopPropagation();
            onZoom(ultimoScarto, scartiImprevisti);
          }}
        >
          ℹ
        </button>
      )}
      {scartiImprevisti.length > 0 && <span className="campo-pila-conteggio">{scartiImprevisti.length}</span>}
      {mostraTiro && (
        <div className="imprevisto-tiro-badge" title="Ultimo risultato del Dado Imprevisti">
          🎲 {ultimoTiro.valore === 0 ? "nessun movimento" : `+${ultimoTiro.valore}`}
        </div>
      )}
    </div>
  );

  return (
    <div className="campo-gruppo" title={mio ? "Imprevisti tuoi" : "Imprevisti avversario"}>
      <div className="campo-imprevisti-coppia">{mio ? [attivazione, mazzo] : [mazzo, attivazione]}</div>
    </div>
  );
}

export default function Campo({ onSaltaFase }) {
  const { stato, dispatch, mazzoId, mazzoIdAvversario } = useGame();
  // { carta, mazzoId, lista?, indice? } — lista/indice solo quando lo zoom viene aperto da una
  // pila con cronologia (il Cimitero, cap. task 54): abilitano le frecce avanti/indietro nel
  // popup. Per tutte le altre carte (mano, campo, Terreno...) lista resta undefined e il
  // popup si comporta come sempre, senza frecce.
  const [zoom, setZoom] = useState(null);
  // Timer di turno (cap. rail, richiesta esplicita dell'utente: "voglio vedere i numeri che vanno
  // da 180 in giù"): s.turnoScadenza (gameReducer.js) è un timestamp assoluto, non un contatore —
  // il countdown vero si calcola qui dal tempo reale trascorso, un tick al secondo, così resta
  // corretto anche se la scheda resta in background per un po' (si ricalcola dal timestamp assoluto,
  // non da un decremento che si sarebbe fermato). Allo scadere manda "timer-scaduto": il reducer
  // stesso decide se è sicuro agire ora (vedi il case dedicato) — qui ci si limita a ridispatchare
  // ad ogni tick finché il turno non cambia per davvero (turnoScadenza si aggiorna da solo allora).
  const [secondiRimasti, setSecondiRimasti] = useState(null);
  useEffect(() => {
    if (!stato?.turnoScadenza) {
      setSecondiRimasti(null);
      return;
    }
    const aggiorna = () => {
      const rimasti = Math.max(0, Math.ceil((stato.turnoScadenza - Date.now()) / 1000));
      setSecondiRimasti(rimasti);
      if (rimasti <= 0) dispatch({ type: "timer-scaduto" });
    };
    aggiorna();
    const id = setInterval(aggiorna, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stato?.turnoScadenza]);
  if (!stato) return null;

  // Rail comandi (cap. redesign campo di battaglia): la stessa logica che prima viveva in
  // App.jsx/Partita per BarraPv+IndicatoreFasi, ora calcolata qui perché il rail è dentro
  // ciascuna ZonaGiocatore. onSaltaFase è l'unico pezzo che deve restare fuori (guida uno stato
  // locale + un useEffect in App.jsx/Partita che scandisce il salto un passo alla volta).
  const modalita1v1 = stato.modalitaGioco === "1v1locale";
  const turnoUmano = stato.giocatoreAttivo === "io" || modalita1v1;
  const attivoTurno = stato.giocatori[stato.giocatoreAttivo];
  const primoTurnoInPausa = !stato.vincitore && turnoUmano && stato.fase === 1 && attivoTurno.turniGiocati === 1;
  const puoAvanzareDiFase = !stato.vincitore && turnoUmano && !stato.combattimento && !stato.modalita && !stato.catena;
  const avanzaDiFase = () => {
    if (stato.fase === 1 && !primoTurnoInPausa) dispatch({ type: "rifornimento", doppio: false });
    else dispatch({ type: "continua-fase" });
  };
  const onSalta = (target) => onSaltaFase?.({ target, giocatoreAttivo: stato.giocatoreAttivo });
  // La fase/il "puoi avanzare" si vedono solo nel rail di CHI ha davvero il turno — l'altra zona
  // mostra un cerchio fase spento (nessuna sigla), stesso comportamento della vecchia pillola che
  // spariva del tutto (fase=null) quando non era il tuo turno.
  const faseParaZona = (chiaveZona) => {
    if (chiaveZona !== stato.giocatoreAttivo || !turnoUmano) return null;
    return stato.faseVisibile?.chiave === stato.giocatoreAttivo ? stato.faseVisibile.fase : stato.fase;
  };
  const puoAvanzareParaZona = (chiaveZona) => chiaveZona === stato.giocatoreAttivo && puoAvanzareDiFase;
  const nomeZona = (chiaveZona, mio) => (modalita1v1 ? `Giocatore ${chiaveZona === "io" ? 1 : 2}` : mio ? "Il tuo Stratega" : "Stratega avversario");
  // Il countdown si vede solo nel rail di chi ha davvero il turno — stesso principio di
  // faseParaZona sopra (l'altra zona mostra il timer "spento", nessun numero).
  const secondiParaZona = (chiaveZona) => (chiaveZona === stato.giocatoreAttivo ? secondiRimasti : null);
  // Sfondo campo di battaglia (cap. editor mazzi, richiesta esplicita dell'utente): per identità del
  // seme, non per posizione — stesso principio di secondiParaZona sopra. Un Terreno attivo con una
  // propria immagine avrebbe la precedenza su ENTRAMBE le zone (vale per entrambi i giocatori, cap.
  // 14) — predisposizione per un giro futuro: `stato.terreno?.sfondoUrl` è oggi sempre undefined,
  // nessuna carta Terreno lo valorizza ancora, quindi questo resta un no-op finché non lo fa.
  const sfondoTerrenoAttivo = stato.terreno?.sfondoUrl ?? null;
  const sfondoParaZona = (chiaveZona) =>
    sfondoTerrenoAttivo ?? (chiaveZona === "io" ? stato.sfondoCampoIo : stato.sfondoCampoAvversario);

  // Prospettiva (cap. 1v1 locale): chi vedo "in basso" (interattivo, mano scoperta) — vedi
  // src/game/prospettiva.js per la logica completa (segue il turno, ma passa al difensore durante le
  // sue decisioni di combattimento). Contro IA resta sempre fissa su "io", comportamento identico a
  // sempre. DOPO che il telefono è stato passato (gestito in App.jsx), il campo si specchia per intero.
  const prospettiva = chiDecideOra(stato);
  const altraProspettiva = altroSeme(prospettiva);
  const bassoGiocatore = stato.giocatori[prospettiva];
  const altoGiocatore = stato.giocatori[altraProspettiva];
  const mazzoIdBasso = prospettiva === "io" ? mazzoId : mazzoIdAvversario;
  const mazzoIdAlto = altraProspettiva === "io" ? mazzoId : mazzoIdAvversario;
  const turnoBasso = stato.giocatoreAttivo === prospettiva;
  // Il Terreno è uno slot personale (cap. 4): ne è attivo al massimo uno in totale, e compare solo
  // nello slot di chi l'ha piazzato per ultimo — confrontato col seme reale, non con la posizione.
  const terrenoBasso = stato.terreno?.proprietario === prospettiva ? stato.terreno : null;
  const terrenoAlto = stato.terreno?.proprietario === altraProspettiva ? stato.terreno : null;

  const navigaZoom = (delta) => {
    setZoom((z) => {
      if (!z?.lista?.length) return z;
      const nuovoIndice = Math.max(0, Math.min(z.lista.length - 1, z.indice + delta));
      return { ...z, carta: z.lista[nuovoIndice], indice: nuovoIndice };
    });
  };

  return (
    <div className="campo">
      <ZonaGiocatore
        giocatore={altoGiocatore}
        mio={false}
        attiva={!turnoBasso}
        stato={stato}
        dispatch={dispatch}
        terreno={terrenoAlto}
        onZoom={(carta, lista, azione) => setZoom({ carta, mazzoId: mazzoIdAlto, lista, indice: lista ? lista.indexOf(carta) : undefined, azione })}
        mazzoIdCarta={mazzoIdAlto}
        nome={nomeZona(altraProspettiva, false)}
        fase={faseParaZona(altraProspettiva)}
        puoAvanzare={puoAvanzareParaZona(altraProspettiva)}
        onAvanti={avanzaDiFase}
        onSalta={onSalta}
        secondiRimasti={secondiParaZona(altraProspettiva)}
        sfondo={sfondoParaZona(altraProspettiva)}
      />

      <ZonaGiocatore
        giocatore={bassoGiocatore}
        mio
        attiva={turnoBasso}
        stato={stato}
        dispatch={dispatch}
        terreno={terrenoBasso}
        onZoom={(carta, lista, azione) => setZoom({ carta, mazzoId: mazzoIdBasso, lista, indice: lista ? lista.indexOf(carta) : undefined, azione })}
        mazzoIdCarta={mazzoIdBasso}
        nome={nomeZona(prospettiva, true)}
        fase={faseParaZona(prospettiva)}
        puoAvanzare={puoAvanzareParaZona(prospettiva)}
        onAvanti={avanzaDiFase}
        onSalta={onSalta}
        secondiRimasti={secondiParaZona(prospettiva)}
        sfondo={sfondoParaZona(prospettiva)}
      />

      {(() => {
        // Idea 59: il dado di COMBATTIMENTO viene dal passo in scena; il dado IMPREVISTI resta su
        // s.lancioDado (coda visiva, non ancora migrato).
        const dado = dadoInScena(stato) ?? stato.lancioDado;
        return dado ? <LancioDado key={dado.id} evento={dado} /> : null;
      })()}
      <TitoloFase />

      {zoom && (
        <DettaglioCarta
          carta={zoom.carta}
          mazzoIdOverride={zoom.mazzoId}
          onChiudi={() => setZoom(null)}
          posizione={zoom.lista ? { indice: zoom.indice, totale: zoom.lista.length } : null}
          onPrecedente={zoom.lista && zoom.indice > 0 ? () => navigaZoom(-1) : null}
          onSuccessivo={zoom.lista && zoom.indice < zoom.lista.length - 1 ? () => navigaZoom(1) : null}
          // cap. bug "zoom prima di attivare" (richiesta esplicita dell'utente, sostituisce il
          // vecchio tocco diretto sulla carta pronta/eleggibile sul campo): zoom.azione, quando
          // presente, porta l'etichetta e cosa dispatchare — stesso pattern onEvoca/etichettaAzione
          // già usato da Mano.jsx per giocare una carta dalla mano.
          onEvoca={
            zoom.azione
              ? () => {
                  zoom.azione.onConferma();
                  setZoom(null);
                }
              : undefined
          }
          etichettaAzione={zoom.azione?.etichetta}
        />
      )}
    </div>
  );
}
