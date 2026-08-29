import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Campo from "./components/Campo.jsx";
import Mano, { ManoAvversaria } from "./components/Mano.jsx";
import PromptCombattimento from "./components/PromptCombattimento.jsx";
import CatenaStriscia from "./components/CatenaStriscia.jsx";
import NotificaEffetto from "./components/NotificaEffetto.jsx";
import SceltaRifornimento from "./components/SceltaRifornimento.jsx";
import VfxMagia from "./components/VfxMagia.jsx";
import AnimazionePescata from "./components/AnimazionePescata.jsx";
import AnimazioneEvocazione from "./components/AnimazioneEvocazione.jsx";
import AnimazionePosizionamento from "./components/AnimazionePosizionamento.jsx";
import AnimazioneMorte from "./components/AnimazioneMorte.jsx";
import LancioMoneta from "./components/LancioMoneta.jsx";
import EditorMazzi from "./components/EditorMazzi.jsx";
import PannelloOpzioni from "./components/PannelloOpzioni.jsx";
import { getMazziIndex, getMazzo, getCatalogoUniversale, getSfondoCampoUrl, getImmagineCarta } from "./data/useMazzi.js";
import { elencaMazziSalvati, ottieniMazzo, validaMazzo } from "./game/mazziSalvati.js";
import { salvaPartita, caricaPartita, cancellaPartitaSalvata, esistePartitaSalvata } from "./game/salvataggio.js";
import { registraEsitoPartita, leggiStatistiche } from "./game/statistiche.js";
import { GameProvider, useGame } from "./game/GameContext.jsx";
import { chiDecideOra } from "./game/prospettiva.js";
import { iniettaTempiCss } from "./game/tempi.js";
import { passoIaInScena, filaBloccaCodaVisiva } from "./game/sequenza.js";
import Sequenziatore from "./components/Sequenziatore.jsx";
import Cancello from "./components/Cancello.jsx";
import pittogramma from "./assets/pittogramma.png";
import logoTesto from "./assets/logo-testo.png";

const mazzi = getMazziIndex();

// Quanto aspettare PRIMA di rivelare ciascun tipo di evento in coda (cap. idea 59/B16-round2).
// Da 2026-08-27 la "copertura" della durata del dado NON è più affidata a questi numeri a occhio: la
// coda si ferma da sola finché stato.dadoInCorso è valorizzato (LancioDado.jsx lo azzera quando il
// dado ha finito di rotolare e si è assestato sul risultato). Quindi questi ritardi ora sono solo il
// "respiro" tra un evento e il successivo, non devono più coprire i ~2,3s del dado.
// - "attacco" (balzo della carta): breve pausa dopo che il dado è sparito, prima che la carta balzi.
// - "esitoCombattimento" (numero di danno): 600ms = il balzo dura 0,55s (index.css attacco-balzo-*)
//   + ~50ms di stacco (richiesta esplicita dell'utente 2026-08-27: "il numero rosso distanzialo di
//   50ms dall'animazione della movimentazione attacco della carta").
// - "morte" (cap. UX Sezione 8): aspetta che il numero di danno fluttuante + il lampeggio Vita
//   (durata 1,15s) abbiano finito, altrimenti il contraccolpo/volo partirebbe mentre il numero anima.
const RITARDO_PRIMA_DI_MS = {
  attacco: 150,
  dado: 200,
  esitoCombattimento: 600,
  dannoDiretto: 600,
  imprevistoEsito: 300,
  morte: 1200,
};
const RITARDO_DEFAULT_MS = 900;

// Prima schermata: solo il logo grande e il popup di scelta modalità (cap. UX) — niente
// configurazione dadi/archetipi qui, quella si vede solo a partita in corso.
// Un SOLO menu per lato (cap. richiesta utente 2026-08-28: "un solo menu dalla quale scegliere i
// mazzi disponibili") — al posto dei due <select> (Mondo + mazzo salvato). Dropdown custom (non
// <select> nativo) perché deve mostrare la MINIATURA-icona dei mazzi salvati. Le "collezioni intere"
// (un mondo, comportamento di sempre) e i mazzi salvati stanno nello stesso elenco.
// Icona di default per le due collezioni intere (richiesta esplicita utente 2026-08-28): la
// miniatura di una carta emblematica del mondo. Nome carta → risolto con getImmagineCarta.
const ICONA_COLLEZIONE = { "frost-land": "Il Re Antico", "kepler-452b": "Potere Divino" };

function iconaMondo(mazzoId) {
  const nome = ICONA_COLLEZIONE[mazzoId];
  return nome ? getImmagineCarta(mazzoId, nome) : null;
}

function SelettoreMazzo({ mazzoId, setMazzoId, deckId, setDeckId }) {
  const [aperto, setAperto] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!aperto) return;
    const chiudi = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setAperto(false);
    };
    document.addEventListener("mousedown", chiudi);
    return () => document.removeEventListener("mousedown", chiudi);
  }, [aperto]);

  const catalogo = getCatalogoUniversale();
  const mazziSalvati = elencaMazziSalvati();
  const deckScelto = deckId ? mazziSalvati.find((m) => m.id === deckId) : null;
  const mondoScelto = mazzi.find((m) => m.id === mazzoId);

  const etichettaCorrente = deckScelto ? deckScelto.nome : `${mondoScelto?.nome ?? "—"} (collezione intera)`;
  const iconaCorrente = deckScelto
    ? deckScelto.icona
      ? getImmagineCarta(undefined, deckScelto.icona)
      : null
    : iconaMondo(mazzoId);

  const scegliMondo = (id) => {
    setMazzoId(id);
    setDeckId("");
    setAperto(false);
  };
  const scegliDeck = (id) => {
    setDeckId(id);
    setAperto(false);
  };

  return (
    <div className="app-selettore-mazzo" ref={ref}>
      <button type="button" className="app-selettore-mazzo-bottone" onClick={() => setAperto((v) => !v)}>
        {iconaCorrente && <img src={iconaCorrente} alt="" className="app-selettore-mazzo-icona" />}
        <span>{etichettaCorrente}</span>
        <span className="app-selettore-mazzo-freccia">{aperto ? "▴" : "▾"}</span>
      </button>
      {aperto && (
        <div className="app-selettore-mazzo-pannello">
          <div className="app-selettore-mazzo-gruppo">Collezioni intere</div>
          {mazzi.map((m) => {
            const imgMondo = iconaMondo(m.id);
            return (
              <button
                key={m.id}
                type="button"
                className="app-selettore-mazzo-voce"
                disabled={!m.disponibile}
                onClick={() => scegliMondo(m.id)}
              >
                {imgMondo && <img src={imgMondo} alt="" className="app-selettore-mazzo-icona" />}
                {m.nome} (collezione intera)
                {!m.disponibile ? " — non disponibile" : ""}
              </button>
            );
          })}
          {mazziSalvati.length > 0 && (
            <>
              <div className="app-selettore-mazzo-gruppo">I tuoi mazzi</div>
              {mazziSalvati.map((m) => {
                const valido = validaMazzo(catalogo, m).valido;
                const img = m.icona ? getImmagineCarta(undefined, m.icona) : null;
                return (
                  <button
                    key={m.id}
                    type="button"
                    className="app-selettore-mazzo-voce"
                    disabled={!valido}
                    onClick={() => scegliDeck(m.id)}
                  >
                    {img && <img src={img} alt="" className="app-selettore-mazzo-icona" />}
                    {m.nome}
                    {!valido ? " — da correggere nell'editor" : ""}
                  </button>
                );
              })}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function SchermataIniziale({
  onGiocaIA,
  onGioca1v1,
  onEditorMazzi,
  onRiprendiPartita,
  haPartitaSalvata,
  mazzoId,
  setMazzoId,
  mazzoIdAvversario,
  setMazzoIdAvversario,
  deckId,
  setDeckId,
  deckIdAvversario,
  setDeckIdAvversario,
}) {
  const statistiche = leggiStatistiche();
  return (
    <div className="schermata-iniziale">
      <img src={pittogramma} alt="" className="schermata-iniziale-pittogramma" />
      <img src={logoTesto} alt="Worldloom" className="schermata-iniziale-logo" />
      <div className="schermata-iniziale-pop">
        {haPartitaSalvata && (
          <button type="button" className="schermata-iniziale-btn schermata-iniziale-btn-ia" onClick={onRiprendiPartita}>
            Riprendi partita
          </button>
        )}
        <button type="button" className="schermata-iniziale-btn schermata-iniziale-btn-ia" onClick={onGiocaIA}>
          Gioca contro IA
        </button>
        <button type="button" className="schermata-iniziale-btn" onClick={onGioca1v1}>
          1 contro 1 (stesso dispositivo)
        </button>
        <button type="button" className="schermata-iniziale-btn" onClick={onEditorMazzi}>
          Editor Mazzi
        </button>
      </div>
      <div className="schermata-iniziale-mazzo">
        Tuo mazzo:
        <SelettoreMazzo mazzoId={mazzoId} setMazzoId={setMazzoId} deckId={deckId} setDeckId={setDeckId} />
      </div>
      <div className="schermata-iniziale-mazzo">
        Mazzo avversario:
        <SelettoreMazzo
          mazzoId={mazzoIdAvversario}
          setMazzoId={setMazzoIdAvversario}
          deckId={deckIdAvversario}
          setDeckId={setDeckIdAvversario}
        />
      </div>
      {/* Cap. sistema di salvataggio: solo il totale complessivo qui — il dettaglio per mazzo si
          vede nell'Editor Mazzi, accanto al mazzo a cui appartiene. */}
      {statistiche.totali.partite > 0 && (
        <div className="schermata-iniziale-statistiche">
          {statistiche.totali.vittorie} vittorie · {statistiche.totali.sconfitte} sconfitte su {statistiche.totali.partite} partite
        </div>
      )}
    </div>
  );
}

function SchermataVittoria({ vincitore, onNuovaPartita }) {
  return (
    <div className="modale-sfondo">
      <div className="modale-box modale-prompt">
        <h3>{vincitore === "io" ? "Hai vinto!" : "Hai perso"}</h3>
        <p>{vincitore === "io" ? "Lo Stratega avversario è caduto." : "Il tuo Stratega è caduto."}</p>
        <div className="modale-azioni">
          <button className="modale-evoca" onClick={onNuovaPartita}>
            Nuova partita
          </button>
        </div>
      </div>
    </div>
  );
}

// Traduce il mazzo salvato scelto (cap. editor mazzi "lista unica") in { worldloom, imprevisti }
// pronto per la dispatch "nuova-partita" — "" (Mazzo intero) o un mazzo diventato invalido nel
// frattempo (es. una carta rimossa dopo il salvataggio) ripiegano su undefined, che il reducer
// legge come "mazzo intero", comportamento di sempre: mai lasciare partire una partita con un
// mazzo rotto. Un mazzo salvato può mescolare mondi/Archetipi liberamente, quindi si valida sempre
// contro il catalogo universale (tutte le carte di tutti i mondi), non contro un singolo mondo.
function risolviListaMazzo(deckId) {
  if (!deckId) return undefined;
  const mazzo = ottieniMazzo(deckId);
  if (!mazzo || !validaMazzo(getCatalogoUniversale(), mazzo).valido) return undefined;
  return { worldloom: mazzo.worldloom, imprevisti: mazzo.imprevisti };
}

// Sfondo campo di battaglia (cap. editor mazzi, richiesta esplicita dell'utente): risolve la scelta
// del mazzo salvato (se c'è) nell'URL reale dell'immagine — null se nessun mazzo salvato è stato
// scelto ("Mazzo intero") o se non ha uno sfondo impostato, in entrambi i casi resta lo sfondo
// stellato predefinito di Campo.jsx. Risolto UNA volta qui, al momento di dispatchare
// "nuova-partita" — lo stato di gioco porta l'URL già pronto, non un riferimento da ririsolvere
// (getSfondoCampoUrl dipende dai moduli bundlati, che gameReducer.js non deve conoscere).
function risolviSfondoCampo(deckId) {
  if (!deckId) return null;
  const mazzo = ottieniMazzo(deckId);
  return mazzo?.sfondoCampo ? getSfondoCampoUrl(mazzo.sfondoCampo) : null;
}

// { chiave, nome } di QUALE mazzo è stato scelto (cap. sistema di salvataggio, statistiche per
// mazzo) — copiato dentro lo stato di gioco da nuovaPartita, non tenuto solo qui, per restare
// corretto anche se il mazzo salvato viene rinominato/eliminato mentre la partita è in corso.
function identitaMazzo(deckId, mazzoIdArchetipo) {
  if (deckId) {
    const mazzo = ottieniMazzo(deckId);
    return { chiave: deckId, nome: mazzo?.nome ?? "Mazzo eliminato" };
  }
  const mondo = mazzi.find((m) => m.id === mazzoIdArchetipo);
  return { chiave: `intero:${mazzoIdArchetipo}`, nome: `${mondo?.nome ?? mazzoIdArchetipo} (mazzo intero)` };
}

function Partita({ mazzoId, setMazzoId, mazzoIdAvversario, setMazzoIdAvversario }) {
  const { stato, dispatch, editorAperto, setEditorAperto } = useGame();
  const dati = getMazzo(mazzoId);
  const datiAvversario = getMazzo(mazzoIdAvversario);
  // Mazzo salvato scelto (cap. editor mazzi "lista unica"): "" = Mazzo intero di UN mondo (il
  // dropdown archetipo sopra, comportamento di sempre). Un mazzo salvato può mescolare mondi/
  // Archetipi liberamente, quindi — a differenza di prima — NON dipende più dal dropdown
  // archetipo: i due controlli sono ora indipendenti (l'archetipo conta solo per "Mazzo intero").
  const [deckId, setDeckId] = useState("");
  const [deckIdAvversario, setDeckIdAvversario] = useState("");
  // Traduzione della scelta in ciò che serve alla dispatch "nuova-partita": se è stato scelto un
  // mazzo salvato, sia la lista sia il "catalogo" da cui pescare le carte devono coprire TUTTI i
  // mondi (potrebbe mescolarli) — altrimenti si resta sul singolo mondo scelto sopra, come sempre.
  const listaMazzoIo = risolviListaMazzo(deckId);
  const listaMazzoAv = risolviListaMazzo(deckIdAvversario);
  const catalogoSeServe = listaMazzoIo || listaMazzoAv ? getCatalogoUniversale() : null;
  const cardsDataNuovaPartita = listaMazzoIo ? catalogoSeServe : dati;
  const cardsDataAvversarioNuovaPartita = listaMazzoAv ? catalogoSeServe : datiAvversario;
  // Cap. sistema di salvataggio: quale mazzo useranno "io"/"avversario" in una prossima partita —
  // ricalcolato ad ogni render, usato solo al momento di dispatchare "nuova-partita".
  const identitaMazzoIo = identitaMazzo(deckId, mazzoId);
  const identitaMazzoAv = identitaMazzo(deckIdAvversario, mazzoIdAvversario);
  // Sfondo campo di battaglia (cap. editor mazzi): null se non è stato scelto un mazzo salvato con
  // uno sfondo impostato — Campo.jsx ripiega sullo sfondo stellato predefinito in quel caso.
  const sfondoCampoIo = risolviSfondoCampo(deckId);
  const sfondoCampoAv = risolviSfondoCampo(deckIdAvversario);
  // Cap. sistema di salvataggio: autosalvataggio ad ogni mossa (nessun bottone "Salva" da premere).
  // A partita conclusa non ha più senso restare "riprendibile" — si cancella da sola invece di
  // salvare lo stato finale. L'hook va chiamato incondizionatamente, prima del return anticipato di
  // SchermataIniziale più sotto (stessa regola già seguita dagli altri hook di questo componente).
  useEffect(() => {
    if (!stato) return;
    if (stato.vincitore) {
      cancellaPartitaSalvata();
      return;
    }
    salvaPartita(stato);
  }, [stato]);
  // Cap. sistema di salvataggio: registra vittoria/sconfitta nelle statistiche UNA sola volta per
  // partita, quando vincitore passa da assente a valorizzato — il ref (non uno stato) evita di
  // rifarlo ad ogni re-render successivo finché resta lo stesso vincitore. partitaAvviataAlle (id
  // univoco per-partita già esistente, cap. 1v1 locale) è la chiave giusta per "già registrata",
  // non vincitore stesso: due partite diverse potrebbero finire entrambe con "io" vincitore.
  const partitaGiaRegistrata = useRef(null);
  useEffect(() => {
    if (!stato?.vincitore || partitaGiaRegistrata.current === stato.partitaAvviataAlle) return;
    partitaGiaRegistrata.current = stato.partitaAvviataAlle;
    if (stato.identitaMazzoIo) {
      registraEsitoPartita({
        vinta: stato.vincitore === "io",
        chiaveMazzo: stato.identitaMazzoIo.chiave,
        nomeMazzo: stato.identitaMazzoIo.nome,
      });
    }
  }, [stato?.vincitore, stato?.partitaAvviataAlle, stato?.identitaMazzoIo]);
  // registroAperto si è spostato in PannelloOpzioni.jsx (cap. "Registro & Dadi dentro Opzioni",
  // richiesta esplicita dell'utente) — non più uno stato qui.
  // Passa il telefono (cap. 1v1 locale): prospettiva per cui il telefono è già stato confermato
  // "pronto" — finché non combacia con la prospettiva corrente, la mano/campo restano nascosti dietro
  // la schermata di passaggio. Resettato ad ogni nuova partita (vedi effetto più sotto).
  const [telefonoConfermatoPer, setTelefonoConfermatoPer] = useState(null);
  // Lancio della moneta (cap. UX Addendum M): { modalitaGioco } | null — valorizzato PRIMA di
  // dispatchare "nuova-partita" (sia dalla schermata iniziale sia da "Nuova partita" dopo una
  // vittoria), per mostrare la scelta Logo/Pittogramma + il lancio 3D come primissimo evento assoluto.
  const [lancioMoneta, setLancioMoneta] = useState(null);
  // Editor Mazzi (cap. editor mazzi): raggiungibile solo dalla schermata iniziale per ora — vera
  // posizione definitiva nel menu principale quando arriverà (Fase 4).
  // editorAperto è ora in GameContext (così anche PannelloOpzioni può chiuderlo).

  // Il turno dell'IA avanza da solo un passo alla volta (cap. UX) invece di risolversi tutto in
  // un'unica dispatch sincrona. Idea 59 Fase 4: qui non c'è più NIENTE. Il pacing dell'avversario è
  // un passo muta:"ia" della fila s.sequenza come ogni altra cosa — il <Sequenziatore> gli fa
  // scadere il respiro (TEMPI.ia.respiro) e il reducer esegue la mossa. RITIRATI da questo punto:
  // l'useEffect con il timer fisso di 900ms, la dispatch "avanza-ia", il campo s.iaInAttesa e
  // `iaBloccataDaPrompt` (OR di 8 condizioni, usato solo da quell'useEffect) — le poche condizioni
  // ancora necessarie vivono ora come `scenaLibera` dentro <Sequenziatore>, in un posto solo.

  // Coda di animazioni (cap. idea 59/B16): quando un'azione produce più eventi visivi insieme (es. un
  // intero scontro dell'IA — dado, balzo, danno), invece di vederli tutti insieme si rivelano uno alla
  // volta, con un tempo di attesa specifico per tipo (RITARDO_PRIMA_DI_MS sopra) invece di un tempo
  // fisso uguale per tutti. Si ferma da sola quando l'evento appena rivelato è una notifica (aspetta
  // "chiudi-notifica" prima di riprendere) — stesso principio di `scenaLibera` nel <Sequenziatore>,
  // qui applicato allo scorrimento della coda invece che al pacing IA. Lo stato di gioco vero (PV, carte
  // che muoiono) resta invariato/istantaneo come sempre: solo dado/balzo/numeri di danno/pesca/notifica
  // vengono scanditi nel tempo (limite noto: se muori nello stesso scontro in cui attacchi, la tua
  // carta sparisce dal campo prima che il balzo si veda — non risolto in questo giro, vedi CLAUDE.md).
  // Dipende dalla LUNGHEZZA (non da un booleano) apposta: deve rischedularsi a ogni singolo evento
  // rivelato, non solo quando la coda passa da vuota a piena — altrimenti dopo il primo "avanza-coda-visiva"
  // lo stesso identico effetto (stessa combinazione booleana codaInCorso/notifica/vincitore) non
  // ripartirebbe da solo per gli eventi successivi.
  const lunghezzaCoda = stato?.codaVisiva?.length ?? 0;
  const prossimoEventoTipo = stato?.codaVisiva?.[0]?.evento;
  useEffect(() => {
    // cap. UX Sezione 8: si ferma anche mentre la morte da Imboscata (Trappola) sta giocando
    // contraccolpo+volo+impatto (stato.morteInCorso) — si sblocca da sola quando AnimazioneMorte.jsx
    // manda "morte-animazione-conclusa".
    // cap. dado (2026-08-27): si ferma anche mentre il dado sta ancora rotolando (stato.dadoInCorso,
    // azzerato da LancioDado.jsx a rotazione finita) — così il prossimo evento in coda (balzo
    // d'attacco, numero di danno) non si rivela sopra il dado che gira. Sostituisce il vecchio
    // affidarsi ai soli RITARDO_PRIMA_DI_MS per "coprire" a occhio la durata del dado.
    // idea 59: la coda visiva non scorre mentre la fila di step ha un passo "anim"/"muta" in ballo
    // (dado/balzo/danno/morte di combattimento, scenografia catena, volo pesca/evoca/sposta della
    // Fase 3) — s.sequenza è il master, la coda gira solo dopo. Un passo "scelta" da solo in fila
    // (es. la finestra della catena in attesa di una decisione) NON blocca: lì gli eventi legacy
    // ancora in coda (una notifica da leggere) devono finire prima che il pop-up compaia.
    // idea 59 Fase 4: il passo muta:"ia" è l'unica eccezione — è respiro, non scenografia, e non
    // blocca la coda. Vedi filaBloccaCodaVisiva in sequenza.js (dove vive insieme alla sua guardia
    // gemella scenaLiberaPerIa, perché le due non devono mai bloccare nello stesso istante).
    const filaBloccaCoda = filaBloccaCodaVisiva(stato);
    if (!lunghezzaCoda || stato.vincitore || stato?.notificaEffetto || filaBloccaCoda || stato?.morteInCorso || stato?.dadoInCorso) return;
    const ritardo = RITARDO_PRIMA_DI_MS[prossimoEventoTipo] ?? RITARDO_DEFAULT_MS;
    const id = setTimeout(() => dispatch({ type: "avanza-coda-visiva" }), ritardo);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lunghezzaCoda, prossimoEventoTipo, stato?.notificaEffetto, stato?.sequenza?.length, stato?.morteInCorso, stato?.dadoInCorso, stato?.vincitore]);

  // (idea 59) Il numero di danno fluttuante non ha più un timer dedicato qui: è il passo "danno"
  // della fila `s.sequenza`, il cui timeout di sicurezza lo gestisce <Sequenziatore>.

  // Passa il telefono (cap. 1v1 locale): azzera la conferma ad ogni nuova partita, usando
  // partitaAvviataAlle (un id univoco scritto dal reducer in nuovaPartita) come chiave — senza,
  // "Nuova partita" dopo una vittoria riutilizzerebbe lo stato locale della partita precedente e
  // salterebbe la primissima schermata di passaggio.
  useEffect(() => {
    setTelefonoConfermatoPer(null);
  }, [stato?.partitaAvviataAlle]);

  // Salto di fase (cap. UX Sezione 2, chevron/menu a tendina): { target, giocatoreAttivo } | null —
  // giocatoreAttivo è catturato al momento del salto per capire quando il turno è davvero cambiato
  // (fase 5/Vespro non esiste come stato fermo nel motore, vedi sotto: "salta a Vespro" equivale a
  // concludere il turno corrente, non a un valore di s.fase mai raggiunto). L'hook va chiamato
  // incondizionatamente prima del return anticipato di SchermataIniziale, come gli altri due sopra —
  // quindi i valori da cui dipende sono ricalcolati qui con optional chaining invece di riusare le
  // costanti equivalenti più in basso nel render (turnoUmano/inRifornimento/puoAvanzareDiFase), che
  // lì presumono stato già definito.
  const [saltoFase, setSaltoFase] = useState(null);
  const turnoUmanoOra = stato?.giocatoreAttivo === "io" || stato?.modalitaGioco === "1v1locale";
  const primoTurnoInPausaOra =
    !stato?.vincitore && turnoUmanoOra && stato?.fase === 1 && stato?.giocatori?.[stato?.giocatoreAttivo]?.turniGiocati === 1;
  const inRifornimentoOra = !stato?.vincitore && turnoUmanoOra && stato?.fase === 1 && !primoTurnoInPausaOra;
  const puoAvanzareOra =
    !stato?.vincitore && turnoUmanoOra && !stato?.combattimento && !stato?.modalita && !stato?.catena && !stato?.sequenza?.length;
  useEffect(() => {
    if (!saltoFase) return;
    // Turno cambiato (fine turno raggiunta, incluso il caso "salta a Vespro") o condizioni non più
    // valide: il salto è concluso, si ferma da solo.
    if (stato?.vincitore || stato?.giocatoreAttivo !== saltoFase.giocatoreAttivo || !turnoUmanoOra) {
      setSaltoFase(null);
      return;
    }
    if (stato?.fase >= saltoFase.target) {
      setSaltoFase(null);
      return;
    }
    // Aspetta che la coda visiva della dispatch precedente finisca di scorrere prima del prossimo
    // passo (stesso principio di iaBloccataDaPrompt sopra) — un salto resta una sequenza di "tap
    // pillola" automatici, non un teletrasporto che tronca le animazioni in corso. Si ferma da solo
    // in Rifornimento invece di scegliere "1 carta" al posto tuo: quella è una decisione vera del
    // giocatore (cap. UX Sezione 3), il salto aspetta che la risolvi tu con i bottoni già esistenti.
    if (!puoAvanzareOra || stato?.codaVisiva?.length || stato?.sequenza?.length || inRifornimentoOra) return;
    const id = setTimeout(() => dispatch({ type: "continua-fase" }), 500);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    saltoFase,
    stato?.fase,
    stato?.giocatoreAttivo,
    stato?.vincitore,
    turnoUmanoOra,
    puoAvanzareOra,
    stato?.codaVisiva?.length,
    stato?.sequenza?.length,
    inRifornimentoOra,
  ]);

  // P0.6 — il tavolo si scala in modo UNIFORME per occupare SEMPRE più spazio possibile nella
  // finestra, senza MAI una barra di scorrimento (richiesta esplicita dell'utente 2026-08-27).
  // Un vero transform:scale(k) su .tavolo, che ha una larghezza di progetto FISSA (--tavolo-w) così
  // il layout interno (le .row con space-between) resta identico a qualunque dimensione di finestra:
  //   k = min(larghezzaFinestra / --tavolo-w, altezzaDisp / altezzaNaturale)
  // SENZA tetto a 1 — su schermi grandi k > 1 e il tavolo si INGRANDISce per riempire lo spazio
  // (prima restava piccolo al centro). .tavolo-fit è a tutta larghezza viewport (esce dal max-width
  // di .app) e ritaglia con overflow:hidden lo spazio riservato ma vuoto sotto il tavolo scalato;
  // la sua altezza la mette adatta() a naturale*k. Gli overlay/pop-up restano FUORI, non scalati.
  // Scelto il transform (piano B) invece di --campo-scale (piano A): ~290px di "cornice" (mano,
  // titoli, bottoni) non passano da quella variabile. useLayoutEffect + sincrono: nessun lampo.
  // Dipende da [stato] per rimisurare quando la mano cresce / entrano creature / compare un banner,
  // oltre che al resize della finestra e a un ResizeObserver sul contenuto.
  useLayoutEffect(() => {
    const fit = document.querySelector(".tavolo-fit");
    const tavolo = document.querySelector(".tavolo");
    const campo = document.querySelector(".campo");
    if (!fit || !tavolo) return;
    // Il piano B non usa più --campo-scale: azzera qualunque valore inline residuo su <html> così le
    // regole calc(... * var(--campo-scale, 1)) tornano a moltiplicare per 1 (il transform fa tutto).
    document.documentElement.style.removeProperty("--campo-scale");
    let inMisura = false;
    function adatta() {
      if (inMisura) return;
      inMisura = true;
      try {
        const MARGINE = 6;
        tavolo.style.transform = "none";
        fit.style.height = "";
        const natW = tavolo.offsetWidth; // = --tavolo-w, larghezza di progetto fissa
        const natH = tavolo.scrollHeight; // altezza naturale del contenuto a quella larghezza
        if (!natW || !natH) return;
        // Altezza disponibile = finestra − tutto ciò che sta SOPRA .tavolo-fit (il suo top assoluto)
        // − ciò che sta SOTTO dentro .app (il suo padding-bottom: gli overlay sono position:fixed).
        const appEl = fit.closest(".app");
        const sottoApp = appEl ? parseFloat(getComputedStyle(appEl).paddingBottom) || 0 : 0;
        const dispW = window.innerWidth - MARGINE;
        const dispH = window.innerHeight - fit.getBoundingClientRect().top - sottoApp - MARGINE;
        // Nessun tetto a 1 (cresce oltre la dimensione naturale su schermi grandi). 0.2 è solo un
        // limite di sanità in basso.
        const k = Math.max(0.2, Math.min(dispW / natW, dispH / natH));
        tavolo.style.transform = `scale(${k.toFixed(4)})`;
        fit.style.height = Math.ceil(natH * k) + "px";
      } finally {
        inMisura = false;
      }
    }
    adatta();
    window.addEventListener("resize", adatta);
    const ro = new ResizeObserver(adatta);
    ro.observe(tavolo);
    return () => {
      window.removeEventListener("resize", adatta);
      ro.disconnect();
    };
  }, [stato]);

  // Lancio della moneta (cap. UX Addendum M): primissimo evento assoluto prima di ogni nuova partita
  // (sia dalla schermata iniziale sia da "Nuova partita" dopo una vittoria) — controllato PRIMA di
  // "!stato" apposta, così copre anche il caso "una partita è appena finita, se ne sta per iniziare
  // un'altra" (stato non è ancora null in quel momento).
  if (editorAperto) {
    return <EditorMazzi onChiudi={() => setEditorAperto(false)} />;
  }

  if (lancioMoneta) {
    return (
      <LancioMoneta
        onFine={(vincitore) => {
          dispatch({
            type: "nuova-partita",
            cardsData: cardsDataNuovaPartita,
            cardsDataAvversario: cardsDataAvversarioNuovaPartita,
            modalitaGioco: lancioMoneta.modalitaGioco,
            primoGiocatoreForzato: vincitore,
            listaMazzo: listaMazzoIo,
            listaMazzoAvversario: listaMazzoAv,
            identitaMazzoIo,
            identitaMazzoAvversario: identitaMazzoAv,
            sfondoCampoIo,
            sfondoCampoAvversario: sfondoCampoAv,
          });
          setLancioMoneta(null);
        }}
      />
    );
  }

  if (!stato) {
    // Cap. sistema di salvataggio: iniziare una partita nuova mentre ce n'è una in sospeso la
    // sostituisce (l'autosave scrive un solo slot) — chiede conferma prima, è l'unico punto
    // davvero distruttivo di tutto il sistema di salvataggio (leggere/riprendere/uscire al menu
    // non lo sono mai).
    const iniziaNuovaPartita = (modalitaGioco) => {
      if (esistePartitaSalvata() && !confirm("Hai una partita in sospeso: iniziarne una nuova la sostituirà. Continuare?")) {
        return;
      }
      setLancioMoneta({ modalitaGioco });
    };
    return (
      <SchermataIniziale
        onGiocaIA={() => iniziaNuovaPartita(undefined)}
        onGioca1v1={() => iniziaNuovaPartita("1v1locale")}
        onEditorMazzi={() => setEditorAperto(true)}
        onRiprendiPartita={() => {
          const ripristinato = caricaPartita();
          if (ripristinato) dispatch({ type: "carica-stato", stato: ripristinato });
        }}
        haPartitaSalvata={esistePartitaSalvata()}
        mazzoId={mazzoId}
        setMazzoId={setMazzoId}
        mazzoIdAvversario={mazzoIdAvversario}
        setMazzoIdAvversario={setMazzoIdAvversario}
        deckId={deckId}
        setDeckId={setDeckId}
        deckIdAvversario={deckIdAvversario}
        setDeckIdAvversario={setDeckIdAvversario}
      />
    );
  }

  // Prospettiva (cap. 1v1 locale): chi vedo in basso — vedi src/game/prospettiva.js. Durante il
  // combattimento può essere il difensore anche a metà turno, non solo chi ha il turno: quando questo
  // valore cambia, la guardia "passa il telefono" più sotto scatta di nuovo da sola.
  const modalita1v1 = stato.modalitaGioco === "1v1locale";
  const prospettiva = chiDecideOra(stato);
  const altraProspettiva = prospettiva === "io" ? "avversario" : "io";

  // Finché il telefono non è stato confermato "pronto" per la prospettiva corrente, si vede solo
  // questa schermata a copertura totale — niente campo/mano sotto, per non rivelare per sbaglio la
  // mano dell'altro giocatore nell'istante in cui il turno/dispositivo passa di mano. Solo in 1v1
  // locale: contro IA prospettiva è sempre "io", quindi questa condizione non scatta mai.
  if (modalita1v1 && !stato.vincitore && telefonoConfermatoPer !== prospettiva) {
    const numeroGiocatore = prospettiva === "io" ? 1 : 2;
    return (
      <div className="modale-sfondo">
        <div className="modale-box modale-prompt">
          <h3>Passa il telefono</h3>
          <p>Passa il telefono a Giocatore {numeroGiocatore}.</p>
          <div className="modale-azioni">
            <button className="modale-evoca" onClick={() => setTelefonoConfermatoPer(prospettiva)}>
              Sono pronto
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Testo di sola informazione per il turno dell'IA (cap. UX Sezione 2 — il bottone "Continua →" è
  // stato rimosso, il tap sulla pillola dell'indicatore fasi lo sostituisce quando è il tuo turno;
  // questo testo resta solo per far vedere a che punto è l'IA mentre gioca il suo, vsIA — in 1v1
  // locale turnoUmano è sempre vero, quindi questo ramo non scatta mai lì).
  // Idea 59 Fase 4: legge il passo muta:"ia" in scena (ex campo stato.iaInAttesa). Stessi tre testi
  // di prima; il fallback "Turno avversario…" copre ora anche i momenti in cui l'avversario sta già
  // agendo (uno scontro in corso: la fila ha in testa dado/balzo/danno, non il respiro).
  const testoStatoIA = () => {
    const passoIa = passoIaInScena(stato);
    if (passoIa?.azione === "evoca") return "L'avversario evoca…";
    if (passoIa?.azione === "attacca") return "L'avversario sta per attaccare…";
    return "Turno avversario…";
  };

  // cap. 1v1 locale: chi ha davvero il turno (giocatoreAttivo) può essere anche il seme "avversario",
  // ora un umano vero — in vsIA il comportamento resta invariato (permesso solo per "io").
  // primoTurnoInPausa/puoAvanzareDiFase/avanzaDiFase si sono spostati dentro Campo.jsx (cap. redesign
  // campo di battaglia): il tap che avanza la fase è ora sul cerchio fase nel rail, non più qui.
  const turnoUmano = stato.giocatoreAttivo === "io" || modalita1v1;
  const attivoTurno = stato.giocatori[stato.giocatoreAttivo];

  // Il tributo si conferma esplicitamente: finché non tocchi il pulsante non sacrifichi nulla,
  // così puoi cambiare idea e Annullare senza perdere creature già selezionate.
  const inTributo = stato.modalita === "tributo";
  const cartaTributo = inTributo ? attivoTurno.mano[stato.manoSelezionata] : null;
  const valoreTributoScelto = inTributo
    ? stato.tributiSelezionati.reduce((tot, id) => {
        const c = [...attivoTurno.primaLinea, ...attivoTurno.retrovia].find((x) => x.id === id);
        return tot + (c ? c.livello : 0);
      }, 0)
    : 0;
  const tributoPronto = inTributo && cartaTributo && valoreTributoScelto >= cartaTributo.livello;

  return (
    <>
      {/* Mano avversaria sopra il campo, come prima. Barra PV/nome, cerchio fase, ⚙ e timer sono ora
          DENTRO Campo.jsx (rail a fianco di ciascuna zona, cap. redesign campo di battaglia 2026-08-27,
          bozza confermata "v11") — non più BarraPv/IndicatoreFasi qui. onSaltaFase resta qui perché
          guida saltoFase, uno stato locale con un useEffect che scandisce il salto un passo alla volta. */}
      {/* P0.6 — il tavolo (mano avversaria + campo + azioni + messaggio + mano) si scala in modo
          UNIFORME per entrare sempre nella finestra, senza barre di scorrimento. .tavolo-fit ritaglia
          lo spazio riservato (ma vuoto) sotto il tavolo scalato; .tavolo porta il transform:scale(k)
          calcolato da adatta(). I pop-up/overlay restano FUORI, a dimensione piena e centrati sulla
          finestra come sempre. */}
      <div className="tavolo-fit">
      <div className="tavolo">
        <ManoAvversaria />
        <Campo onSaltaFase={(s) => setSaltoFase(s)} />

      <div className="azioni">
        {/* cap. UX Sezione 3: la scelta 1/2 carte del Rifornimento non è più qui inline — è un prompt
            obbligatorio a schermo intero (SceltaRifornimento.jsx, montato più sotto) che compare prima
            di qualunque animazione di pescata. inRifornimento non produce più nulla in questo blocco. */}
        {stato.vincitore ? (
          <button
            onClick={() =>
              dispatch({
                type: "nuova-partita",
                cardsData: cardsDataNuovaPartita,
                cardsDataAvversario: cardsDataAvversarioNuovaPartita,
                listaMazzo: listaMazzoIo,
                listaMazzoAvversario: listaMazzoAv,
                identitaMazzoIo,
                identitaMazzoAvversario: identitaMazzoAv,
                sfondoCampoIo,
                sfondoCampoAvversario: sfondoCampoAv,
              })
            }
          >
            Nuova partita
          </button>
        ) : (
          // cap. UX Sezione 2: il bottone "Continua →" è rimosso quando è il tuo turno — il tap sulla
          // pillola dell'indicatore fasi (IndicatoreFasi/avanzaDiFase) lo sostituisce, stessa dispatch.
          // Qui resta solo il testo di stato durante il turno dell'IA (vsIA), niente da toccare.
          !turnoUmano && <button disabled>{testoStatoIA()}</button>
        )}
        {tributoPronto && (
          <button
            className="btn-conferma-tributo"
            onClick={() => {
              // Volo vero dell'evocazione (cap. UX Sezione 4): stesso principio del bottone "Evoca" in
              // Mano.jsx — la carta sorgente sparisce dalla mano nello stesso giro di questo dispatch.
              const el = document.querySelector(`[data-carta-uid="${cartaTributo?._uid ?? stato.manoSelezionata}"]`);
              const r = el?.getBoundingClientRect();
              const sorgenteRect = r ? { left: r.left, top: r.top, width: r.width, height: r.height } : null;
              dispatch({ type: "conferma-tributo", sorgenteRect });
            }}
          >
            Conferma tributo
          </button>
        )}
        {/* Passo 2 del flusso a 3 tocchi per spostare una creatura in retrovia (cap. 4): tocchi la
            carta di prima linea (candidatoScambio, non si muove ancora), poi questo bottone, poi la
            creatura di retrovia bersaglio — niente scambi automatici, decide sempre l'utente. */}
        {stato.candidatoScambio && (
          <button className="btn-conferma-tributo" onClick={() => dispatch({ type: "conferma-scambio-retrovia" })}>
            Scambia con retrovia
          </button>
        )}
        {stato.modalita && <button onClick={() => dispatch({ type: "annulla" })}>Annulla</button>}
      </div>

      {stato.messaggio && <p className="messaggio">{stato.messaggio}</p>}

        <Mano />
      </div>
      </div>

      <NotificaEffetto />
      <SceltaRifornimento />
      <Sequenziatore />
      <PromptCombattimento />
      <CatenaStriscia />
      {stato.vfxMagia && <VfxMagia key={stato.vfxMagia.id} evento={stato.vfxMagia} />}
      <AnimazionePescata />
      <AnimazioneEvocazione />
      <AnimazionePosizionamento />
      <AnimazioneMorte />
      {stato.vincitore && (
        <SchermataVittoria
          vincitore={stato.vincitore}
          // Preserva la modalità (cap. 1v1 locale): senza, "Nuova partita" dopo una vittoria in 1v1
          // locale tornerebbe silenziosamente a "vsIA" (default del reducer quando il campo non è
          // passato) — vedi lancioMoneta più sopra, che ora fa da tramite verso "nuova-partita".
          onNuovaPartita={() => setLancioMoneta({ modalitaGioco: stato.modalitaGioco })}
        />
      )}
    </>
  );
}

export default function App() {
  // Idea 59 — sorgente unica dei tempi: inietta --t-balzo / --t-numero-danno su :root una volta, così
  // le @keyframes di index.css leggono le stesse durate di tempi.js. Le regole CSS hanno comunque un
  // fallback, quindi il primo paint prima di questo effetto è già corretto.
  useEffect(() => {
    iniettaTempiCss();
  }, []);

  const [mazzoId, setMazzoId] = useState(() => (mazzi.find((m) => m.disponibile) ?? mazzi[0])?.id ?? null);
  // Di default l'avversario usa un mazzo diverso dal tuo, se ne esiste un secondo disponibile.
  const [mazzoIdAvversario, setMazzoIdAvversario] = useState(() => {
    const disponibili = mazzi.filter((m) => m.disponibile);
    const altro = disponibili.find((m) => m.id !== mazzoId);
    return (altro ?? disponibili[0] ?? mazzi[0])?.id ?? null;
  });

  return (
    <Cancello>
      <ContenutoApp
        mazzoId={mazzoId}
        setMazzoId={setMazzoId}
        mazzoIdAvversario={mazzoIdAvversario}
        setMazzoIdAvversario={setMazzoIdAvversario}
      />
    </Cancello>
  );
}

function ContenutoApp({ mazzoId, setMazzoId, mazzoIdAvversario, setMazzoIdAvversario }) {
  return (
    <div className="app">
      <GameProvider key={mazzoId} mazzoId={mazzoId} mazzoIdAvversario={mazzoIdAvversario}>
        {/* Cap. "un pannello solo" (richiesta esplicita dell'utente): Pausa/Ricomincia servono
            useGame(), quindi il pannello Opzioni ora sta dentro GameProvider invece che fuori come
            prima — resta comunque sempre visibile (schermata iniziale compresa, dove stato è null
            e quelle due righe restano nascoste). Unico effetto collaterale accettato: cambiare
            l'archetipo dal menu a tendina qui sotto rimonta GameProvider (key={"{mazzoId}"}), quindi
            anche l'audio di sottofondo riparte da capo in quel momento — non capitava prima, ma è
            un'azione rara (cambio mazzo a metà sessione) e il costo è solo un piccolo scatto della
            musica, non una perdita di preferenze (musicaAttiva resta letta da localStorage). */}
        {/* Intestazione (logo grande + dropdown mazzo) rimossa a partita in corso — richiesta
            esplicita dell'utente ("info che possiamo togliere, non ha senso tenerle" sopra
            MANO AVVERSARIA). Restano solo su SchermataIniziale, un componente separato. */}
        <PannelloOpzioni />
        <Partita
          mazzoId={mazzoId}
          setMazzoId={setMazzoId}
          mazzoIdAvversario={mazzoIdAvversario}
          setMazzoIdAvversario={setMazzoIdAvversario}
        />
      </GameProvider>
    </div>
  );
}
