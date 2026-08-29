import { useState } from "react";
import { useGame } from "../game/GameContext.jsx";
import { chiDecideOra, altroSeme } from "../game/prospettiva.js";
import { uidInVoloPesca } from "../game/sequenza.js";
import Carta from "./Carta.jsx";
import DettaglioCarta from "./DettaglioCarta.jsx";
import retroCarta from "../assets/logo-worldloom.jpg";

// Ventaglio della mano (cap. redesign campo di battaglia, bozza confermata "v11" — richiesta
// esplicita dell'utente: "le carte devono essere sovrapposte tra loro leggermente"). Un solo
// helper, riusato identico da entrambe le mani (mia scoperta, avversaria coperta) così restano
// sempre coerenti tra loro.
// BUG corretto: la prima versione spostava le carte con translateX, che si SOMMA alla posizione
// già occupata nel flusso normale (le carte, senza gap, stanno già una accanto all'altra, distanti
// quanto sono larghe) — il risultato erano carte più DISTANZIATE, non sovrapposte. La sovrapposizione
// vera va tolta dal FLUSSO stesso con un margin-left negativo su ogni carta (tranne la prima), che
// "mangia" parte dello spazio della carta precedente — è quello, non un transform, a farle
// accavallare. Il transform ora fa solo la rotazione.
// capovolta (cap. bug "verso di apertura invertito per l'avversario"): la mano avversaria è già
// ruotata 180° carta per carta (.carta-capovolta) — la STESSA rotazione del ventaglio, sommata a
// quel rotate(180deg), si vede sullo schermo con il verso ribaltato rispetto alla mia mano (un
// angolo che "apre" verso destra in basso appare aprire verso sinistra in alto). Basta invertire il
// segno dell'angolo per farla aprire nello stesso verso percepito, coerente con la mia.
function transformVentaglio(indice, totale, cardW, capovolta = false) {
  const centro = (totale - 1) / 2;
  const scarto = indice - centro;
  const angoloStep = totale <= 1 ? 0 : Math.min(6, 48 / (totale - 1));
  const segno = capovolta ? -1 : 1;
  // Sovrapposizione minima ~45% della carta anche quando sono poche; se sono tante, si sovrappongono
  // di più (margine ancora più negativo) per restare comunque dentro una larghezza ragionevole invece
  // di sforare — mai sotto il 45%, la carta deve restare comunque riconoscibile.
  const larghezzaMassimaVentaglio = 560;
  const overlap = totale <= 1 ? 0 : Math.max(cardW * 0.45, cardW - larghezzaMassimaVentaglio / (totale - 1));
  return {
    marginLeft: indice === 0 ? 0 : `${-overlap}px`,
    transform: `rotate(${(segno * scarto * angoloStep).toFixed(1)}deg)`,
    zIndex: indice + 1,
  };
}

export function ManoAvversaria() {
  const { stato } = useGame();
  if (!stato) return null;

  // Prospettiva (cap. 1v1 locale): questa è sempre la mano "in alto" (dorsi coperti), cioè quella di
  // chi NON sto guardando ora — vedi src/game/prospettiva.js. Contro IA resta fissa su "avversario"
  // come sempre (prospettiva è sempre "io" lì).
  const prospettiva = chiDecideOra(stato);
  const altraProspettiva = altroSeme(prospettiva);
  const alto = stato.giocatori[altraProspettiva];
  // Volo vero della pescata (cap. UX Sezione 3): le carte ancora "in volo" restano nel mazzo di stato
  // (già pescate davvero) ma invisibili qui finché il loro passo anim:pesca non è atterrato — copre
  // TUTTI i passi pesca ancora in fila (prima mano = N passi da 1 carta), non solo quello in scena.
  const uidInVolo = uidInVoloPesca(stato, altraProspettiva);

  return (
    // data-zona: ancora di fallback per il volo dell'evocazione IA (cap. animazione evocazione
    // avversario), che non ha un click reale da cui misurare una posizione di partenza vera.
    <div className="mano" data-zona="mano-avversaria">
      <div className="mano-titolo">Mano avversaria ({alto.mano.length})</div>
      <div className="mano-carte mano-ventaglio">
        {alto.mano.map((carta, indice) => (
          // Wrapper per il transform del ventaglio, separato dall'animazione di ingresso sull'elemento
          // interno — stesso motivo del wrapper già usato per la mano scoperta più sotto (la keyframe
          // carta-scivola-dentro-capovolta usa "transform" anche lei, per il rotate(180deg) statico).
          <div className="mano-ventaglio-carta" key={carta._uid ?? indice} style={transformVentaglio(indice, alto.mano.length, 90, true)}>
            <div
              className={`carta-retro carta-scivola-dentro carta-capovolta ${uidInVolo?.has(carta._uid) ? "carta-in-volo" : ""}`}
              data-carta-uid={carta._uid ?? indice}
            >
              <img src={retroCarta} alt="Carta coperta" />
            </div>
          </div>
        ))}
        {alto.mano.length === 0 && <p className="mano-vuota">Mano vuota</p>}
      </div>
    </div>
  );
}

export default function Mano() {
  const { stato, dispatch, mazzoId, mazzoIdAvversario } = useGame();
  const [zoomIndice, setZoomIndice] = useState(null);
  if (!stato) return null;

  // Prospettiva (cap. 1v1 locale): questa è sempre la mano "in basso" (carte vere), cioè quella di chi
  // sto guardando ora — vedi src/game/prospettiva.js. Contro IA resta fissa su "io" come sempre.
  const prospettiva = chiDecideOra(stato);
  const basso = stato.giocatori[prospettiva];
  const mazzoIdBasso = prospettiva === "io" ? mazzoId : mazzoIdAvversario;
  // Volo vero della pescata (cap. UX Sezione 3): stesso principio di ManoAvversaria — la carta è già
  // vera in stato.mano, ma resta invisibile qui finché il suo passo anim:pesca non è atterrato.
  const uidInVolo = uidInVoloPesca(stato, prospettiva);
  const cartaZoom = zoomIndice !== null ? basso.mano[zoomIndice] : null;
  // Si gioca solo nella Fase 3 del proprio turno (cap. 6). Due varianti (cap. 1v1 locale, sezione
  // "evocazione base"): il bottone principale (Evoca/Attiva subito, dispatch "seleziona-mano") è ormai
  // generico — selezionaMano nel reducer gestisce già da sola Alieni/tributo per l'altro seme, e
  // rifiuta con un messaggio esplicito Magie/Trappole/bonus per lui (non ancora generalizzate). Il
  // bottone secondario "Posiziona coperta" (dispatch "piazza-magia", solo Magie) resta invece
  // riservato al seme "io": quella funzione non è stata toccata in questo pezzo.
  const puoGiocare = (stato.giocatoreAttivo === "io" || stato.modalitaGioco === "1v1locale") && stato.fase === 3 && !stato.combattimento;
  const puoPiazzareCoperta = stato.giocatoreAttivo === "io" && stato.fase === 3 && !stato.combattimento;
  const tipo = cartaZoom?.tipoCarta ?? "pedina";
  const etichettaAzione = tipo === "trappola" ? "Piazza coperta" : tipo === "magia" ? "Attiva subito" : "Evoca";

  const gioca = () => {
    // Volo vero dell'evocazione (cap. UX Sezione 4): la carta sorgente sparirà dalla mano nello stesso
    // giro di questo dispatch, quindi la sua posizione va letta ORA (stesso principio già usato per
    // VfxMagia.jsx) — innocuo per i tipi diversi da Alieno, il reducer legge sorgenteRect solo nel ramo
    // di evocazione.
    const uid = cartaZoom?._uid ?? zoomIndice;
    const el = document.querySelector(`[data-carta-uid="${uid}"]`);
    const r = el?.getBoundingClientRect();
    const sorgenteRect = r ? { left: r.left, top: r.top, width: r.width, height: r.height } : null;
    dispatch({ type: "seleziona-mano", indice: zoomIndice, sorgenteRect });
    setZoomIndice(null);
  };

  const piazzaCoperta = () => {
    dispatch({ type: "piazza-magia", indice: zoomIndice });
    setZoomIndice(null);
  };

  const titolo = stato.modalita === "scarto-bonus" ? "Evocazione bonus: tocca la carta da scartare" : "La tua mano";

  return (
    <div className="mano" data-zona="mano-mia">
      <div className="mano-titolo">{titolo}</div>
      <div className="mano-carte mano-carte-piccole mano-ventaglio">
        {basso.mano.map((carta, indice) => (
          // Wrapper separato per il transform del ventaglio (cap. redesign campo di battaglia): la
          // stessa proprietà CSS "transform" serve già all'animazione di ingresso carta-scivola-dentro
          // sull'elemento interno — mettere anche la posizione del ventaglio lì sopra li farebbe
          // scontrare (l'animazione sovrascriverebbe la posizione a ogni ripescata). Il wrapper tiene
          // ferma la posizione nel ventaglio, l'elemento interno resta libero di animare il suo arrivo.
          <div className="mano-ventaglio-carta" key={carta._uid ?? indice} style={transformVentaglio(indice, basso.mano.length, 100)}>
            <Carta
              carta={carta}
              classiExtra={`carta-scivola-dentro ${uidInVolo?.has(carta._uid) ? "carta-in-volo" : ""}`}
              selezionata={stato.manoSelezionata === indice}
              fonteMagia={stato.modalita === "bersaglio-magia" && stato.manoSelezionata === indice}
              mazzoIdOverride={mazzoIdBasso}
              dataUid={carta._uid ?? indice}
              onClick={
                stato.modalita === "scarto-bonus"
                  ? () => dispatch({ type: "seleziona-mano", indice })
                  : () => setZoomIndice(indice)
              }
            />
          </div>
        ))}
        {basso.mano.length === 0 && <p className="mano-vuota">Mano vuota</p>}
      </div>
      {cartaZoom && (
        <DettaglioCarta
          carta={cartaZoom}
          mazzoIdOverride={mazzoIdBasso}
          onChiudi={() => setZoomIndice(null)}
          onEvoca={puoGiocare ? gioca : undefined}
          etichettaAzione={etichettaAzione}
          onSecondaria={puoPiazzareCoperta && tipo === "magia" ? piazzaCoperta : undefined}
          etichettaSecondaria="Posiziona coperta"
        />
      )}
    </div>
  );
}
