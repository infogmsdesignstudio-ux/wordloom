import { createContext, useContext, useReducer, useState } from "react";
import { gameReducer } from "./gameReducer.js";

const GameContext = createContext(null);

export function GameProvider({ mazzoId, mazzoIdAvversario, children }) {
  const [stato, dispatch] = useReducer(gameReducer, null);
  // Cap. sistema di salvataggio, pannello Opzioni unico: "Ricomincia" tocca localStorage
  // direttamente (cancellaPartitaSalvata), un side-effect che React non vede da solo — se in quel
  // momento stato è già null (sei sulla schermata iniziale, nessun dispatch reale da fare), nessun
  // fratello (Partita, che mostra "Riprendi partita" solo se esistePartitaSalvata()) si
  // ri-renderizzerebbe da sé. Questo contatore, incrementato da PannelloOpzioni dopo aver toccato il
  // salvataggio, dà ai consumer di useGame() un motivo per ri-renderizzarsi e rileggere localStorage.
  const [tickSalvataggio, setTickSalvataggio] = useState(0);
  const segnalaSalvataggioCambiato = () => setTickSalvataggio((t) => t + 1);
  // Apertura del pannello Opzioni condivisa (cap. redesign campo di battaglia): il rail dentro
  // Campo.jsx ha una sua icona ⚙ a fianco del campo — prima era solo decorativa (un secondo
  // ingranaggio visivo senza azione vera confondeva l'utente, che si aspettava funzionasse). Ora
  // entrambe le icone (questa e quella fissa in alto a destra di PannelloOpzioni) aprono lo STESSO
  // pannello: lo stato "aperto" vive qui, condiviso, invece che solo dentro PannelloOpzioni.
  const [opzioniAperte, setOpzioniAperte] = useState(false);
  // Editor Mazzi aperto: qui (non più uno stato locale di Partita) così anche PannelloOpzioni può
  // chiuderlo — voce "Torna alla schermata principale" del menu Opzioni anche dall'editor.
  const [editorAperto, setEditorAperto] = useState(false);
  return (
    <GameContext.Provider
      value={{
        stato,
        dispatch,
        mazzoId,
        mazzoIdAvversario,
        tickSalvataggio,
        segnalaSalvataggioCambiato,
        opzioniAperte,
        setOpzioniAperte,
        editorAperto,
        setEditorAperto,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame va usato dentro <GameProvider>");
  return ctx;
}
