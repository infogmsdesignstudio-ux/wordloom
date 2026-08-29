import { useEffect, useRef, useState } from "react";
import { useGame } from "../game/GameContext.jsx";
import { getImmagineCarta } from "../data/useMazzi.js";
import { evocaInScena } from "../game/sequenza.js";

// Sequenza riprogettata (segnalazione utente 2026-08-27: "vola dritto come un fulmine, confusionario"
// — il volo diretto precedente non dava mai il tempo di leggere cosa fosse stato evocato). Sequenza
// confermata a parole prima di scrivere codice: solleva dalla mano → vola al CENTRO schermo
// ingrandendosi (stesso linguaggio dello zoom ℹ) → sosta leggibile → vola verso lo slot finale
// rimpicciolendosi → impatto più marcato di prima. Vale sia per le tue evocazioni sia per quelle
// dell'avversario (vedi sotto, SORGENTE_FALLBACK).
const SOLLEVA_MS = 90;
const CENTRO_MS = 350; // vola dalla sorgente al centro, ingrandendosi
const SOSTA_MS = 650; // ferma al centro, ingrandita — il tempo di leggerla
const VOLO_MS = 350; // vola dal centro allo slot finale, rimpicciolendosi
const IMPATTO_MS = 350; // anello dorato, più marcato di prima (era 250ms)
const ASSESTA_MS = 120;
const DURATA_TOTALE_MS = SOLLEVA_MS + CENTRO_MS + SOSTA_MS + VOLO_MS + IMPATTO_MS + ASSESTA_MS + 60; // margine di sicurezza

// Quanto si ingrandisce la carta al centro, rispetto alla sua dimensione base (--slot-w/--slot-h) —
// tarata per avvicinarsi alla dimensione dello zoom ℹ (DettaglioCarta), non identica (qui è solo
// un'illustrazione volante, non il popup completo con statistiche).
const SCALA_CENTRO = 3.2;

// Volo vero dell'evocazione (cap. UX Sezione 4, esteso all'avversario): legge il passo "anim"
// nome:"evoca" in scena (avviaVoloEvocazione in gameReducer.js — idea 59 Fase 3, ex stato diretto
// s.evocazioneInCorso). Per le tue evocazioni sorgenteRect è la posizione vera della carta in mano
// (catturata al click, prima del dispatch); per quelle dell'avversario non esiste un click reale da
// cui misurarla — CartaEvocata usa allora una posizione di fallback (l'area "mano avversaria"/"mano
// mia" in DOM), sufficiente perché il momento che conta è la sosta ingrandita al centro. A fine volo
// manda "sequenza-passo-concluso" (l'id del passo): la notifica dell'effetto e la finestra catena
// compaiono solo DOPO l'atterraggio.
export default function AnimazioneEvocazione() {
  const { stato, dispatch, mazzoId, mazzoIdAvversario } = useGame();
  const evocaScena = evocaInScena(stato);
  const idAttivo = useRef(null);
  const [evento, setEvento] = useState(null);

  useEffect(() => {
    if (!evocaScena || evocaScena.id === idAttivo.current) return;
    idAttivo.current = evocaScena.id;
    setEvento(evocaScena);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [evocaScena?.id]);

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
  return <CartaEvocata evento={evento} mazzoIdCarta={mazzoIdCarta} />;
}

function CartaEvocata({ evento, mazzoIdCarta }) {
  const [fase, setFase] = useState("parte"); // parte | centro | sosta | volo | impatto
  const [vol, setVol] = useState(null);
  const timers = useRef([]);

  useEffect(() => {
    const bersaglioEl = document.querySelector(`[data-creatura-id="${evento.creaturaId}"]`);
    const b = bersaglioEl?.getBoundingClientRect();
    // sorgenteRect vero (click reale) se c'è; altrimenti l'area mano corrispondente al seme che ha
    // evocato — sempre presente in DOM, sia per "io" (di norma non serve, ha sempre un rect vero) sia
    // per "avversario" (il caso che serve davvero: l'IA non clicca mai nulla).
    const sorgenteFallbackEl = document.querySelector(`[data-zona="${evento.chiave === "io" ? "mano-mia" : "mano-avversaria"}"]`);
    const s = evento.sorgenteRect ?? sorgenteFallbackEl?.getBoundingClientRect();
    // Bersaglio non trovato (caso limite, non dovrebbe capitare per costruzione: la creatura è già
    // stata piazzata nello stesso dispatch che ha creato questo evento) o nessuna sorgente/fallback
    // disponibile: nessuna animazione, la creatura si vede subito com'era prima di questa sezione.
    if (!s || !b) return undefined;
    const da = { x: s.left + s.width / 2, y: s.top + s.height / 2 };
    const centro = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const a = { x: b.left + b.width / 2, y: b.top + b.height / 2 };

    const schedula = (fn, ms) => timers.current.push(setTimeout(fn, ms));

    // 0. appare ferma sulla carta sorgente (o sul fallback), nessuna transizione (posizione di mount).
    schedula(() => setVol({ x: da.x, y: da.y, scala: 1, transizione: "none" }), 0);

    // 1. solleva leggermente, ancora sul posto.
    schedula(() => {
      setVol((p) => ({ ...p, scala: 1.1, transizione: `transform ${SOLLEVA_MS}ms ease-out` }));
    }, 20);

    // 2. vola al centro schermo, ingrandendosi molto — il momento in cui si legge davvero la carta.
    schedula(() => {
      setVol({
        x: centro.x,
        y: centro.y,
        scala: SCALA_CENTRO,
        transizione: `left ${CENTRO_MS}ms ease-out, top ${CENTRO_MS}ms ease-out, transform ${CENTRO_MS}ms ease-out`,
      });
      setFase("centro");
    }, 20 + SOLLEVA_MS);

    // 3. sosta ferma al centro, ingrandita (nessuna transizione: resta esattamente dov'è arrivata).
    schedula(() => setFase("sosta"), 20 + SOLLEVA_MS + CENTRO_MS);

    // 4. vola verso lo slot finale, rimpicciolendosi.
    schedula(() => {
      setVol({
        x: a.x,
        y: a.y,
        scala: 1,
        transizione: `left ${VOLO_MS}ms ease-out, top ${VOLO_MS}ms ease-out, transform ${VOLO_MS}ms ease-out`,
      });
      setFase("volo");
    }, 20 + SOLLEVA_MS + CENTRO_MS + SOSTA_MS);

    // 5. impatto — la carta volante sparisce, l'anello dorato prende il suo posto (stesso istante).
    schedula(() => setFase("impatto"), 20 + SOLLEVA_MS + CENTRO_MS + SOSTA_MS + VOLO_MS);

    return () => timers.current.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!vol) return null;

  const immagine = getImmagineCarta(mazzoIdCarta, evento.nome);
  // La carta dell'avversario è già orientata verso di lui (180°) per TUTTO il volo, non solo
  // all'atterraggio (P3.5, richiesta esplicita) — coerente con .carta-capovolta della sua zona.
  const capovolta = evento.chiave === "avversario";

  return (
    <>
      {fase !== "impatto" && (
        <div
          className="carta-volante-evocazione"
          style={{
            left: vol.x,
            top: vol.y,
            transition: vol.transizione,
            transform: `translate(-50%, -50%) rotate(${capovolta ? 180 : 0}deg) scale(${vol.scala})`,
          }}
        >
          {immagine && <img src={immagine} alt={evento.nome} />}
        </div>
      )}
      {fase === "impatto" && <div className="evocazione-impatto" style={{ left: vol.x, top: vol.y }} />}
    </>
  );
}
