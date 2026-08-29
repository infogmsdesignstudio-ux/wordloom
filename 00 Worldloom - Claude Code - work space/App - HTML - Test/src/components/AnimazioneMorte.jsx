import { useEffect, useRef, useState } from "react";
import { useGame } from "../game/GameContext.jsx";
import { getImmagineCarta } from "../data/useMazzi.js";
import { morteInScena } from "../game/sequenza.js";

// Timing dal Foglio Maestro (cap. UX Sezione 8, "~740ms totali"): contraccolpo in posizione, poi volo
// vero verso il Cimitero, poi un piccolo impatto sulla pila.
const CONTRACCOLPO_MS = 240;
const VOLO_MS = 380;
const IMPATTO_MS = 120;
const DURATA_TOTALE_MS = CONTRACCOLPO_MS + VOLO_MS + IMPATTO_MS;

// Morte in combattimento (cap. UX Sezione 8): legge stato.morteInCorso, valorizzato dalla coda visiva
// (evento "morte" in gameReducer.js, RITARDO_PRIMA_DI_MS.morte in App.jsx) — parte quindi solo DOPO che
// il numero di danno fluttuante + il lampeggio Vita (Step 5-6, già rivelati da "esitoCombattimento")
// hanno avuto il loro tempo, non appena il danno viene applicato. Stesso principio "stato diretto" di
// evocazioneInCorso/movimentiInCorso: la rimozione vera dal campo resta sospesa (gameReducer.js,
// confermaMorteInCorso) finché questo componente non conferma con "morte-animazione-conclusa".
export default function AnimazioneMorte() {
  const { stato, dispatch, mazzoId, mazzoIdAvversario } = useGame();
  // Idea 59: la morte in COMBATTIMENTO è il passo "muta" nome:"morte" della fila; l'Imboscata
  // (Trappola "ambush") usa ancora s.morteInCorso. La scenografia è identica; cambia solo la dispatch
  // di fine (avanza la fila vs sblocca s.morteInCorso).
  const passoMorte = morteInScena(stato);
  const morte = passoMorte ?? stato?.morteInCorso ?? null;
  const daFila = !!passoMorte;
  const idAttivo = useRef(null);
  const [evento, setEvento] = useState(null);

  useEffect(() => {
    // Aspetta che un'eventuale notifica (es. "Imboscata Potente" attivata) sia stata chiusa prima di
    // iniziare — stesso principio già usato altrove per stato.notificaEffetto.
    if (!morte || stato?.notificaEffetto || morte.id === idAttivo.current) return;
    idAttivo.current = morte.id;
    setEvento({ ...morte, daFila });
  }, [morte?.id, stato?.notificaEffetto, daFila]);

  useEffect(() => {
    if (!evento) return;
    const id = setTimeout(() => {
      dispatch(
        evento.daFila
          ? { type: "sequenza-passo-concluso", id: evento.id }
          : { type: "morte-animazione-conclusa" }
      );
      setEvento(null);
    }, DURATA_TOTALE_MS);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [evento]);

  if (!evento) return null;

  const mazzoIdDi = (chiave) => (chiave === "io" ? mazzoId : mazzoIdAvversario);
  return (
    <>
      {evento.morti.map((m) => (
        <CartaMorte key={m.creaturaId} morto={m} immagine={getImmagineCarta(mazzoIdDi(m.chiave), m.nome)} />
      ))}
    </>
  );
}

function CartaMorte({ morto, immagine }) {
  const [vol, setVol] = useState(null);
  const [impatto, setImpatto] = useState(null);
  const timers = useRef([]);

  useEffect(() => {
    const sorgenteEl = document.querySelector(`[data-creatura-id="${morto.creaturaId}"]`);
    const cimiteroEl = document.querySelector(`[data-cimitero-pila="${morto.chiave}"]`);
    const s = sorgenteEl?.getBoundingClientRect();
    const c = cimiteroEl?.getBoundingClientRect();
    // Caso limite (non dovrebbe capitare per costruzione: la creatura è ancora vera in campo, il
    // Cimitero è sempre renderizzato): nessuna animazione, nessun blocco — il timer sopra conferma
    // comunque la rimozione allo scadere del tempo previsto.
    if (!s || !c) return undefined;
    const da = { x: s.left + s.width / 2, y: s.top + s.height / 2 };
    const a = { x: c.left + c.width / 2, y: c.top + c.height / 2 };

    const schedula = (fn, ms) => timers.current.push(setTimeout(fn, ms));

    // 0. appare ferma sulla posizione di combattimento, nessuna transizione (posizione di mount).
    schedula(() => setVol({ x: da.x, y: da.y, scala: 1, tilt: 0, opacita: 1, transizione: "none" }), 0);

    // 1. contraccolpo: due scatti laterali rapidi (60ms ciascuno) poi ritorno al centro (120ms) — "accusa il colpo".
    schedula(() => setVol((p) => ({ ...p, x: da.x - 6, tilt: -4, transizione: "left 60ms ease-out, transform 60ms ease-out" })), 20);
    schedula(() => setVol((p) => ({ ...p, x: da.x + 6, tilt: 4, transizione: "left 60ms ease-out, transform 60ms ease-out" })), 80);
    schedula(() => setVol((p) => ({ ...p, x: da.x, tilt: 0, transizione: "left 120ms ease-out, transform 120ms ease-out" })), 140);

    // 2. volo vero verso il Cimitero: scala fino a -40%, rotazione fino a 180°, opacità -30%.
    schedula(() => {
      setVol({
        x: a.x,
        y: a.y,
        scala: 0.6,
        tilt: 180,
        opacita: 0.7,
        transizione: `left ${VOLO_MS}ms cubic-bezier(.4,0,.7,1), top ${VOLO_MS}ms cubic-bezier(.4,0,.7,1), transform ${VOLO_MS}ms cubic-bezier(.4,0,.7,1), opacity ${VOLO_MS}ms ease-out`,
      });
    }, CONTRACCOLPO_MS);

    // 3. impatto sulla pila: il clone sparisce, un breve bagliore (riuso di .evocazione-impatto) segna l'arrivo.
    schedula(() => {
      setVol(null);
      setImpatto({ x: a.x, y: a.y });
    }, CONTRACCOLPO_MS + VOLO_MS);

    return () => timers.current.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      {vol && (
        <div
          className="carta-volante-morte"
          style={{
            left: vol.x,
            top: vol.y,
            opacity: vol.opacita,
            transition: vol.transizione,
            transform: `translate(-50%, -50%) rotate(${vol.tilt}deg) scale(${vol.scala})`,
          }}
        >
          {immagine && <img src={immagine} alt={morto.nome} />}
        </div>
      )}
      {impatto && <div className="evocazione-impatto" style={{ left: impatto.x, top: impatto.y }} />}
    </>
  );
}
