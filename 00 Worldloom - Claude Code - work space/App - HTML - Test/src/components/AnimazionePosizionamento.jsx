import { useEffect, useRef, useState } from "react";
import { useGame } from "../game/GameContext.jsx";
import { getImmagineCarta } from "../data/useMazzi.js";
import { spostaInScena } from "../game/sequenza.js";

// Timing dal Foglio Maestro (cap. UX Sezione 5): due linguaggi di movimento deliberatamente asimmetrici
// — l'asimmetria (scia solo in avanzata, scatto-poi-freno solo in ritirata) rinforza la lettura emotiva
// del movimento senza bisogno di testo a schermo.
const AVANZATA_MS = 380;
const AVANZATA_ASSESTA_MS = 150;
const RITIRATA_MS = 320;
const RITIRATA_ASSESTA_MS = 120;
const DUST_INTERVAL_MS = 55;
const DUST_FADE_MS = 350;
const DURATA_TOTALE_MS = Math.max(AVANZATA_MS + AVANZATA_ASSESTA_MS, RITIRATA_MS + RITIRATA_ASSESTA_MS) + 40;

// Volo vero dello spostamento fila (cap. UX Sezione 5). Legge il passo "anim" nome:"sposta" in scena
// (avviaVoloMovimento in gameReducer.js — idea 59 Fase 3, ex stato diretto s.movimentiInCorso). Un
// solo movimento per un'avanzata singola (retrovia→prima linea, tap diretto), due per uno scambio
// (entrambe le creature si muovono in contemporanea, direzioni opposte). A fine volo manda
// "sequenza-passo-concluso" (l'id del passo).
export default function AnimazionePosizionamento() {
  const { stato, dispatch, mazzoId, mazzoIdAvversario } = useGame();
  const spostaScena = spostaInScena(stato);
  const idAttivo = useRef(null);
  const [evento, setEvento] = useState(null);

  useEffect(() => {
    if (!spostaScena || spostaScena.id === idAttivo.current) return;
    idAttivo.current = spostaScena.id;
    setEvento(spostaScena);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spostaScena?.id]);

  useEffect(() => {
    if (!evento) return;
    const idPasso = evento.id;
    const id = setTimeout(() => {
      dispatch({ type: "sequenza-passo-concluso", id: idPasso });
      setEvento(null);
    }, DURATA_TOTALE_MS);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [evento]);

  if (!evento) return null;

  const mazzoIdCarta = evento.chiave === "io" ? mazzoId : mazzoIdAvversario;
  return (
    <>
      {evento.movimenti.map((m) => (
        <CartaMovimento key={m.creaturaId} movimento={m} mazzoIdCarta={mazzoIdCarta} />
      ))}
    </>
  );
}

function CartaMovimento({ movimento, mazzoIdCarta }) {
  const [vol, setVol] = useState(null);
  const [scia, setScia] = useState([]); // [{ id, x, y, w, h }]
  const nodoRef = useRef(null);
  const timers = useRef([]);
  const prossimoSciaId = useRef(1);
  const avanzata = movimento.direzione === "avanzata";

  useEffect(() => {
    const bersaglioEl = document.querySelector(`[data-creatura-id="${movimento.creaturaId}"]`);
    const b = bersaglioEl?.getBoundingClientRect();
    const s = movimento.sorgenteRect;
    // Bersaglio non trovato (caso limite, non dovrebbe capitare per costruzione: la creatura è già
    // nella sua nuova fila nello stesso dispatch che ha creato questo evento): nessuna animazione.
    if (!s || !b) return undefined;
    const da = { x: s.left + s.width / 2, y: s.top + s.height / 2 };
    const a = { x: b.left + b.width / 2, y: b.top + b.height / 2 };

    const durataVolo = avanzata ? AVANZATA_MS : RITIRATA_MS;
    const durataAssesta = avanzata ? AVANZATA_ASSESTA_MS : RITIRATA_ASSESTA_MS;
    // Avanzata: accelera dolcemente, tilt in avanti fino a 6°, piccolo overshoot di scala all'arrivo.
    // Ritirata: scatto rapido poi frena, tilt fino a 4° in direzione opposta, leggera contrazione.
    const tiltPicco = avanzata ? 6 : -4;
    const scalaPicco = avanzata ? 1 : 0.97;
    const scalaFinale = avanzata ? 1.06 : 1;
    const easingVolo = avanzata ? "cubic-bezier(.33,1,.68,1)" : "cubic-bezier(.1,.7,.15,1)";

    const schedula = (fn, ms) => timers.current.push(setTimeout(fn, ms));

    // 0. appare ferma sulla posizione di partenza, nessuna transizione (posizione di mount).
    schedula(() => setVol({ x: da.x, y: da.y, scala: 1, tilt: 0, transizione: "none" }), 0);

    // 1. vola verso la nuova fila
    schedula(() => {
      setVol({
        x: a.x,
        y: a.y,
        scala: scalaPicco,
        tilt: tiltPicco,
        transizione: `left ${durataVolo}ms ${easingVolo}, top ${durataVolo}ms ${easingVolo}, transform ${durataVolo}ms ${easingVolo}`,
      });
    }, 20);

    // 2. assestamento all'arrivo — overshoot per l'avanzata, ritorno pulito per la ritirata.
    schedula(() => {
      setVol((p) => ({ ...p, scala: scalaFinale, tilt: 0, transizione: `transform ${durataAssesta}ms ease-out` }));
    }, 20 + durataVolo);

    // Scia di polvere, solo in avanzata (cap. UX Sezione 5): campiona la posizione reale del clone
    // ogni ~55ms mentre vola, ogni campione svanisce da solo in 0.35s.
    let dustInterval;
    if (avanzata) {
      let campionamenti = 0;
      const maxCampionamenti = Math.floor(durataVolo / DUST_INTERVAL_MS);
      dustInterval = setInterval(() => {
        campionamenti += 1;
        if (campionamenti > maxCampionamenti || !nodoRef.current) {
          clearInterval(dustInterval);
          return;
        }
        const r = nodoRef.current.getBoundingClientRect();
        const id = prossimoSciaId.current++;
        setScia((prev) => [...prev, { id, x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height }]);
        setTimeout(() => setScia((prev) => prev.filter((g) => g.id !== id)), DUST_FADE_MS);
      }, DUST_INTERVAL_MS);
    }

    return () => {
      timers.current.forEach(clearTimeout);
      if (dustInterval) clearInterval(dustInterval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!vol) return null;

  const immagine = getImmagineCarta(mazzoIdCarta, movimento.nome);

  return (
    <>
      {scia.map((g) => (
        <div key={g.id} className="movimento-scia" style={{ left: g.x, top: g.y, width: g.w, height: g.h }} />
      ))}
      <div
        ref={nodoRef}
        className="carta-volante-movimento"
        style={{
          left: vol.x,
          top: vol.y,
          transition: vol.transizione,
          transform: `translate(-50%, -50%) rotate(${vol.tilt}deg) scale(${vol.scala})`,
        }}
      >
        {immagine && <img src={immagine} alt={movimento.nome} />}
      </div>
    </>
  );
}
