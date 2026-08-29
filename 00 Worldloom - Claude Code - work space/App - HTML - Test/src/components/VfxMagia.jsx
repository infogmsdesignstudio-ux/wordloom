import { useEffect, useState } from "react";

// VFX source→target per le Magie con bersaglio: una particella viaggia dalla posizione (già fissa in
// pixel, catturata da Campo.jsx prima che la carta sorgente sparisse dal DOM) fino alla creatura
// bersaglio, letta dal vivo tramite data-creatura-id (lei di norma esiste ancora al momento della
// rivelazione — stesso limite noto già accettato per il balzo d'attacco, task 48). Stile neutro unico
// (dorato, lo stesso accento già usato per la catena), non varia per bersaglio alleato/nemico.
export default function VfxMagia({ evento }) {
  const [pos, setPos] = useState(null);
  const [impatto, setImpatto] = useState(false);

  useEffect(() => {
    setImpatto(false);
    const bersaglioEl = document.querySelector(`[data-creatura-id="${evento.bersaglioId}"]`);
    if (!evento.sorgenteRect || !bersaglioEl) {
      setPos(null);
      return;
    }
    const s = evento.sorgenteRect;
    const t = bersaglioEl.getBoundingClientRect();
    const da = { x: s.left + s.width / 2, y: s.top + s.height / 2 };
    const a = { x: t.left + t.width / 2, y: t.top + t.height / 2 };
    // Log diagnostico P1.4 (bug: VFX di risposta "va a caso fuori dal campo") — da rimuovere a P1.4 chiuso.
    try {
      console.log("[P1.4 VFX magia] orbe:", { da, a, sorgenteRect: s, bersaglioId: evento.bersaglioId, viewport: { w: window.innerWidth, h: window.innerHeight } });
    } catch {
      /* ignora */
    }

    setPos(da);
    // Doppio rAF: serve un frame in cui "da" sia già dipinto prima di cambiare a "a", altrimenti il
    // browser accorpa le due scritture e la transizione CSS non ha un punto di partenza da cui muoversi.
    const raf1 = requestAnimationFrame(() => {
      const raf2 = requestAnimationFrame(() => setPos(a));
      return () => cancelAnimationFrame(raf2);
    });
    const idImpatto = setTimeout(() => setImpatto(true), 550);
    return () => {
      cancelAnimationFrame(raf1);
      clearTimeout(idImpatto);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [evento.id]);

  if (!pos) return null;

  return (
    <div
      className={`vfx-magia-orbe ${impatto ? "vfx-magia-orbe-impatto" : ""}`}
      style={{ left: pos.x, top: pos.y }}
    />
  );
}
