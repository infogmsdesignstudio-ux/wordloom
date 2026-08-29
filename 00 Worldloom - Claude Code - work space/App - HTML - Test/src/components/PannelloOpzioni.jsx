import { useEffect, useRef, useState } from "react";
import traccia1 from "../assets/traccia-1.mp3";
import { useGame } from "../game/GameContext.jsx";
import { cancellaPartitaSalvata, esistePartitaSalvata } from "../game/salvataggio.js";
import Log from "./Log.jsx";
import Dado from "./Dado.jsx";

const CHIAVE_MUSICA = "wl_musica_attiva";

// Colonna sonora di sottofondo (richiesta esplicita dell'utente 2026-08-15): parte quando si entra
// nell'app e va in loop finché non la chiudi o la disattivi dal pannello Opzioni. Montato una volta
// sola dentro ContenutoApp (dopo il Cancello/password), quindi vale sia nella schermata iniziale sia
// durante la partita — un solo elemento Audio persistente, non uno per componente.
export default function PannelloOpzioni() {
  const [musicaAttiva, setMusicaAttiva] = useState(() => {
    const salvato = localStorage.getItem(CHIAVE_MUSICA);
    return salvato === null ? true : salvato === "1";
  });
  const audioRef = useRef(null);

  // Crea l'elemento audio una sola volta (loop attivo, volume moderato per non coprire gli effetti
  // sonori futuri/il parlato) — un ref invece che nello stato, non deve mai causare un re-render.
  useEffect(() => {
    const audio = new Audio(traccia1);
    audio.loop = true;
    audio.volume = 0.35;
    audioRef.current = audio;
    return () => {
      audio.pause();
      audioRef.current = null;
    };
  }, []);

  // Riflette musicaAttiva sull'audio vero. I browser bloccano l'autoplay CON audio finché l'utente
  // non ha interagito almeno una volta con la pagina (politica standard, non un bug): il primo
  // tentativo qui può fallire silenziosamente (.catch), risolto dal listener qui sotto.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (musicaAttiva) audio.play().catch(() => {});
    else audio.pause();
  }, [musicaAttiva]);

  // Sblocco autoplay: riprova a far partire la musica al primissimo tocco/tasto in assoluto sulla
  // pagina (es. il click su "Entra" della password, o su "Gioca contro IA") — è quanto di più vicino
  // a "parte quando apri l'app" concesso dai browser moderni.
  useEffect(() => {
    if (!musicaAttiva) return;
    const sblocca = () => {
      const audio = audioRef.current;
      if (audio && audio.paused) audio.play().catch(() => {});
    };
    document.addEventListener("pointerdown", sblocca);
    document.addEventListener("keydown", sblocca);
    return () => {
      document.removeEventListener("pointerdown", sblocca);
      document.removeEventListener("keydown", sblocca);
    };
  }, [musicaAttiva]);

  const cambiaMusica = (attiva) => {
    setMusicaAttiva(attiva);
    localStorage.setItem(CHIAVE_MUSICA, attiva ? "1" : "0");
  };

  // Cap. sistema di salvataggio, "un pannello solo" (richiesta esplicita dell'utente: niente bottone
  // separato in testata, tutto qui). Pausa/Ricomincia leggono/dispatchano lo stato di gioco vero —
  // PannelloOpzioni ora sta dentro GameProvider apposta per poterlo fare (vedi App.jsx).
  // opzioniAperte/setOpzioniAperte vivono in GameContext (non più uno stato locale): il rail dentro
  // Campo.jsx ha una sua icona ⚙ a fianco del campo che deve aprire QUESTO STESSO pannello — prima
  // era decorativa (un secondo ingranaggio senza azione vera, l'utente si aspettava funzionasse) e
  // ora apre davvero, condividendo lo stato con l'icona fissa qui sotto.
  const {
    stato,
    dispatch,
    segnalaSalvataggioCambiato,
    opzioniAperte: aperto,
    setOpzioniAperte: setAperto,
    editorAperto,
    setEditorAperto,
  } = useGame();
  const partitaInCorso = !!stato && !stato.vincitore;
  const puoRicominciare = partitaInCorso || esistePartitaSalvata();
  // Registro & Dadi (richiesta esplicita dell'utente): non più un bottone/cassetto agganciato alla
  // barra azioni del campo — vive qui, dentro Opzioni, "già la scritta da togliere" dallo schermo di
  // gioco principale. Log.jsx/Dado.jsx sono già autonomi (leggono stato da useGame() o non ne hanno
  // affatto bisogno), quindi si spostano di peso senza bisogno di props aggiuntive.
  const [registroAperto, setRegistroAperto] = useState(false);
  // Conferma "Ricomincia" in-linea invece di confirm() nativo: dopo qualche dialogo il browser offre
  // "impedisci a questo sito altre finestre di dialogo" e da lì confirm() torna sempre false → il
  // bottone sembrava non fare niente (stesso bug già corretto per "Elimina" nell'Editor Mazzi).
  const [confermaRicomincia, setConfermaRicomincia] = useState(false);

  // "Torna alla schermata principale" (richiesta esplicita dell'utente 2026-08-27): NON è distruttivo
  // — l'autosalvataggio ha già scritto lo stato ad ogni mossa, quindi "▶ Riprendi partita" comparirà
  // nella schermata iniziale per ritornare esattamente da qui. Stessa dispatch di prima ("Pausa"),
  // solo l'etichetta è più chiara.
  const tornaAllaSchermataPrincipale = () => {
    if (editorAperto) setEditorAperto(false);
    if (partitaInCorso) dispatch({ type: "abbandona-a-menu" });
    setAperto(false);
  };

  const ricomincia = () => {
    cancellaPartitaSalvata();
    if (stato) dispatch({ type: "abbandona-a-menu" });
    // Se stato era già null (sei sulla schermata iniziale), il dispatch sopra non scatta e nessun
    // fratello si ri-renderizzerebbe da solo per accorgersi che il salvataggio non c'è più — vedi
    // GameContext.jsx.
    segnalaSalvataggioCambiato();
    setConfermaRicomincia(false);
    setAperto(false);
  };

  const chiudiPannello = () => {
    setConfermaRicomincia(false);
    setAperto(false);
  };

  return (
    <>
      <button type="button" className="opzioni-bottone" title="Opzioni" onClick={() => setAperto(true)}>
        Opzioni
      </button>
      {aperto && (
        <div className="modale-sfondo" onClick={chiudiPannello}>
          <div className="modale-box modale-prompt" onClick={(e) => e.stopPropagation()}>
            <h3>Opzioni</h3>
            {(partitaInCorso || editorAperto) && (
              <div className="opzioni-riga">
                <span>Schermata principale</span>
                <button type="button" className="opzioni-switch" onClick={tornaAllaSchermataPrincipale}>
                  Torna
                </button>
              </div>
            )}
            {puoRicominciare && (
              <div className="opzioni-riga">
                <span>{confermaRicomincia ? "La partita andrà persa. Sicuro?" : "Ricomincia"}</span>
                {confermaRicomincia ? (
                  <span className="opzioni-conferma">
                    <button type="button" className="opzioni-switch opzioni-switch-pericolo" onClick={ricomincia}>
                      Conferma
                    </button>
                    <button type="button" className="opzioni-switch" onClick={() => setConfermaRicomincia(false)}>
                      Annulla
                    </button>
                  </span>
                ) : (
                  <button type="button" className="opzioni-switch" onClick={() => setConfermaRicomincia(true)}>
                    Ricomincia
                  </button>
                )}
              </div>
            )}
            <div className="opzioni-riga">
              <span>Musica di sottofondo</span>
              <button
                type="button"
                className={`opzioni-switch ${musicaAttiva ? "opzioni-switch-attivo" : ""}`}
                onClick={() => cambiaMusica(!musicaAttiva)}
              >
                {musicaAttiva ? "Attiva" : "Disattivata"}
              </button>
            </div>
            {partitaInCorso && (
              <div className="opzioni-riga">
                <span>Registro &amp; Dadi</span>
                <button
                  type="button"
                  className="opzioni-switch"
                  onClick={() => {
                    setRegistroAperto(true);
                    setAperto(false);
                  }}
                >
                  Apri
                </button>
              </div>
            )}
            <div className="modale-azioni">
              <button className="modale-chiudi" onClick={chiudiPannello}>
                Chiudi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cassetto Registro & Dadi (spostato qui di peso da App.jsx, stesso markup/classi CSS di
          prima — solo il trigger è cambiato, dal bottone nella barra azioni a questa riga sopra). */}
      <div className={`scaffolding-drawer-sfondo ${registroAperto ? "aperto" : ""}`} onClick={() => setRegistroAperto(false)} />
      <div className={`scaffolding-drawer ${registroAperto ? "aperto" : ""}`}>
        <div className="scaffolding-drawer-testa">
          <span>Registro &amp; Dadi</span>
          <button type="button" onClick={() => setRegistroAperto(false)}>
            Chiudi
          </button>
        </div>
        <section className="scaffolding">
          <Log />
          <Dado />
        </section>
      </div>
    </>
  );
}
