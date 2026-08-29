import { useEffect, useState } from "react";
import { useGame } from "../game/GameContext.jsx";

// Esportate: riusate anche da PromptCombattimento.jsx per l'icona del simbolo nei pop-up di
// combattimento (cap. task 55), invece di duplicare la stessa mappa in due file.
export const SIMBOLO_ICONA = { S: "⚔️", U: "🛡️", C: "❤️", D: "💨" };
const FACCE_ARCHETIPO = ["S", "U", "C", "D"];
const FACCE_IMPREVISTI = [0, 1, 2];

// Stessi colori del vassoio dadi di riferimento (Dado.jsx), per coerenza visiva.
export const COLORE_ARCHETIPO = {
  Viandante: "#e8c96f",
  Assalitore: "#e08a72",
  Effimeri: "#72c98f",
  Colosso: "#6f9ed6",
  Tessitore: "#b98fd6",
};
const COLORE_IMPREVISTI = "#a97fd6";

function etichettaImprevisti(valore) {
  return valore === 0 ? "○" : `+${valore}`;
}

// Il dado "rotola" ciclando facce casuali per un attimo (pura messa in scena — il risultato vero
// è già deciso dal reducer), poi si ferma sulla faccia reale e resta visibile un istante prima di
// sparire da solo: il gioco intanto è già proseguito nello stato sottostante (cap. 9/15).
export default function LancioDado({ evento }) {
  const eImprevisti = evento.tipo === "imprevisti";
  const facceCandidate = eImprevisti ? FACCE_IMPREVISTI : FACCE_ARCHETIPO;
  const colore = eImprevisti ? COLORE_IMPREVISTI : (COLORE_ARCHETIPO[evento.archetipo] ?? COLORE_ARCHETIPO.Viandante);
  const etichettaFinale = eImprevisti ? etichettaImprevisti(evento.faccia) : SIMBOLO_ICONA[evento.faccia];

  const { dispatch } = useGame();
  const [facciaMostrata, setFacciaMostrata] = useState(etichettaFinale);
  const [fermo, setFermo] = useState(false);

  useEffect(() => {
    let passo = 0;
    const totalePassi = 9;
    const id = setInterval(() => {
      passo += 1;
      if (passo >= totalePassi) {
        clearInterval(id);
        setFacciaMostrata(etichettaFinale);
        setFermo(true);
        return;
      }
      const casuale = facceCandidate[Math.floor(Math.random() * facceCandidate.length)];
      setFacciaMostrata(eImprevisti ? etichettaImprevisti(casuale) : SIMBOLO_ICONA[casuale]);
    }, 80);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Quando il dado ha finito di rotolare, resta un attimo sul risultato e poi segnala che è
  // "assestato". Il dado IMPREVISTI (tipo "imprevisti", via s.lancioDado/coda visiva) manda
  // "dado-animazione-conclusa" (sblocca lo scorrimento della coda); il dado di COMBATTIMENTO (passo
  // "anim" della fila, idea 59) manda "sequenza-passo-concluso" (avanza la fila al passo successivo:
  // balzo, numero di danno, ecc.).
  useEffect(() => {
    if (!fermo) return;
    const azione = eImprevisti
      ? { type: "dado-animazione-conclusa", id: evento.id }
      : { type: "sequenza-passo-concluso", id: evento.id };
    const id = setTimeout(() => dispatch(azione), 450);
    return () => clearTimeout(id);
  }, [fermo, evento.id, eImprevisti, dispatch]);

  return (
    <div className="lancio-dado-overlay">
      <div
        className={`lancio-dado-dado ${eImprevisti ? "lancio-dado-esagono" : "lancio-dado-ottagono"} ${fermo ? "lancio-dado-fermo" : "lancio-dado-rotola"}`}
        style={{ "--colore-dado": colore }}
      >
        <span className="lancio-dado-simbolo">{facciaMostrata}</span>
      </div>
      <div className="lancio-dado-etichetta" style={{ color: colore }}>
        {eImprevisti ? "Dado Imprevisti" : evento.archetipo}
      </div>
    </div>
  );
}
