import { useEffect, useRef, useState } from "react";
import { useGame } from "../game/GameContext.jsx";
import { getImmagineCarta } from "../data/useMazzi.js";
import { pescaInScena } from "../game/sequenza.js";
import retroCarta from "../assets/logo-worldloom.jpg";

// Timing 1:1 da demo_pescata.html (cap. UX Sezione 3): solleva → vola al centro ingrandendosi → gira
// (reveal) → pausa di lettura → vola in mano rimpicciolendo. Semplificazione rispetto alla demo: il
// tragitto è in linea retta in entrambe le tappe (stessa tecnica già usata da VfxMagia.jsx in questo
// progetto — transition CSS su left/top), non la vera curva quadratica con punto di controllo della
// demo — la sensazione di "volo con reveal" resta identica, solo il percorso non si incurva.
const SINGOLA = { solleva: 140, centro: 350, flip: 300, pausa: 420, mano: 390, scalaCentro: 1.8 };
const MULTIPLA = { solleva: 50, centro: 120, flip: 90, pausa: 70, mano: 130, scalaCentro: 1.4 };
// Stagger = somma delle 4 tappe intermedie della variante multipla: la carta successiva non parte
// finché quella precedente non ha già lasciato il centro — mai due carte al centro insieme.
const STAGGER_MULTIPLA = MULTIPLA.solleva + MULTIPLA.centro + MULTIPLA.flip + MULTIPLA.pausa;

// Volo vero della pescata (cap. UX Sezione 3): legge il passo "anim" nome:"pesca" in scena
// (avviaVoloPescata in gameReducer.js — idea 59 Fase 3, ex stato diretto s.pescaInCorso). A fine
// volo manda "sequenza-passo-concluso" (l'id del passo), che fa avanzare la fila: solo dopo che
// s.sequenza è vuota scorre la coda visiva (dado del Vaticinio) e riparte l'IA. Le carte vere in
// mano restano invisibili (Mano.jsx, uidInVoloPesca) finché tutti i passi pesca non sono atterrati.
export default function AnimazionePescata() {
  const { stato, dispatch, mazzoId, mazzoIdAvversario } = useGame();
  const pescaScena = pescaInScena(stato);
  const idAttivo = useRef(null);
  const [lotto, setLotto] = useState(null); // { id, chiave, carte, multipla } | null

  useEffect(() => {
    if (!pescaScena || pescaScena.id === idAttivo.current) return;
    idAttivo.current = pescaScena.id;
    setLotto({ ...pescaScena, multipla: pescaScena.carte.length > 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pescaScena?.id]);

  useEffect(() => {
    if (!lotto) return;
    const t = lotto.multipla ? MULTIPLA : SINGOLA;
    const durataUnaCarta = t.solleva + t.centro + t.flip + t.pausa + t.mano;
    const stagger = lotto.multipla ? STAGGER_MULTIPLA : 0;
    const durataTotale = stagger * (lotto.carte.length - 1) + durataUnaCarta + 40; // margine di sicurezza
    const idPasso = lotto.id;
    const id = setTimeout(() => {
      dispatch({ type: "sequenza-passo-concluso", id: idPasso });
      setLotto(null);
    }, durataTotale);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lotto]);

  if (!lotto) return null;

  const mazzoIdCarta = lotto.chiave === "io" ? mazzoId : mazzoIdAvversario;
  // Il flip mostra l'illustrazione solo al giocatore che pesca (cap. UX Sezione 3) — l'avversario
  // (mano coperta) fa la stessa coreografia ma non si gira mai, resta dorso per tutto il volo.
  const rivela = lotto.chiave === "io";

  return (
    <>
      {lotto.carte.map((carta, indice) => (
        <CartaVolante
          key={carta.uid}
          carta={carta}
          chiave={lotto.chiave}
          mazzoIdCarta={mazzoIdCarta}
          rivela={rivela}
          multipla={lotto.multipla}
          ritardo={lotto.multipla ? indice * STAGGER_MULTIPLA : 0}
        />
      ))}
    </>
  );
}

function CartaVolante({ carta, chiave, mazzoIdCarta, rivela, multipla, ritardo }) {
  const [vol, setVol] = useState(null); // { x, y, scala, girata, transizione } | null
  const timers = useRef([]);

  useEffect(() => {
    const t = multipla ? MULTIPLA : SINGOLA;
    const sorgenteEl = document.querySelector(`[data-mazzo-pila="${chiave}"]`);
    if (!sorgenteEl) return undefined;
    const r = sorgenteEl.getBoundingClientRect();
    const partenza = { x: r.left + r.width / 2, y: r.top + r.height / 2 };

    const schedula = (fn, ms) => timers.current.push(setTimeout(fn, ritardo + ms));

    // 0. appare ferma sul mazzo (dorso, scala 1) — nessuna transizione, è la posizione di mount.
    schedula(() => setVol({ x: partenza.x, y: partenza.y, scala: 1, girata: false, transizione: "none" }), 0);

    // 1. solleva
    schedula(() => {
      setVol((p) => ({ ...p, scala: 1.05, transizione: `transform ${t.solleva}ms ease-out` }));
    }, 20);

    // 2. vola al centro, ingrandendosi (ancora dorso)
    schedula(() => {
      setVol((p) => ({
        ...p,
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
        scala: t.scalaCentro,
        transizione: `left ${t.centro}ms ease-out, top ${t.centro}ms ease-out, transform ${t.centro}ms ease-out`,
      }));
    }, t.solleva);

    // 3. gira — reveal (solo per chi pesca davvero)
    if (rivela) {
      schedula(() => {
        setVol((p) => ({ ...p, girata: true, transizione: `transform ${t.flip}ms cubic-bezier(.4,0,.2,1)` }));
      }, t.solleva + t.centro);
    }

    // 4. pausa di lettura — nessun nuovo stato, la carta resta ferma al centro.

    // 5. vola in mano, rimpicciolendo (bersaglio letto dal vivo: la mano può aver fatto reflow nel frattempo)
    schedula(() => {
      const bersaglioEl = document.querySelector(`[data-carta-uid="${carta.uid}"]`);
      const b = bersaglioEl ? bersaglioEl.getBoundingClientRect() : null;
      const arrivo = b ? { x: b.left + b.width / 2, y: b.top + b.height / 2 } : partenza;
      setVol((p) => ({
        ...p,
        x: arrivo.x,
        y: arrivo.y,
        scala: 1,
        transizione: `left ${t.mano}ms ease-in, top ${t.mano}ms ease-in, transform ${t.mano}ms ease-in`,
      }));
    }, t.solleva + t.centro + (rivela ? t.flip : 0) + t.pausa);

    return () => timers.current.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!vol) return null;

  const immagine = rivela ? getImmagineCarta(mazzoIdCarta, carta.nome) : null;
  // Il dorso dell'avversario è sempre capovolto 180° come tutto il resto della sua zona (cap. task 58)
  // — la carta volante segue la stessa convenzione visiva anche a mezz'aria.
  const rotataAvversario = chiave === "avversario" ? "rotate(180deg) " : "";

  return (
    <div
      className="carta-volante"
      style={{
        left: vol.x,
        top: vol.y,
        transition: vol.transizione,
        transform: `translate(-50%, -50%) ${rotataAvversario}scale(${vol.scala}) rotateY(${vol.girata ? 180 : 0}deg)`,
      }}
    >
      <div className="carta-volante-faccia carta-volante-dorso">
        <img src={retroCarta} alt="Carta coperta" />
      </div>
      {rivela && (
        <div className="carta-volante-faccia carta-volante-fronte">
          {immagine ? <img src={immagine} alt={carta.nome} /> : <div className="carta-volante-senza-immagine">{carta.nome}</div>}
        </div>
      )}
    </div>
  );
}
