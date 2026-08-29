import { useEffect } from "react";
import { useGame } from "../game/GameContext.jsx";
import { bannerInScena } from "../game/sequenza.js";
import { TEMPI } from "../game/tempi.js";

const NOMI_FASE = { 1: "Rifornimento", 2: "Vaticinio", 3: "Schieramento", 4: "Alla Carica", 5: "Vespro" };
const TOTALE_FASI = 5;

// Fascia animata al centro del campo che annuncia il cambio di fase (cap. UX Sezione 2).
//
// Idea 59 Fase 5: NON osserva più s.fase da sé. È il passo "banner" della fila s.sequenza a dire
// quale cartello mostrare e quando — accodato dal reducer nel punto cronologicamente giusto
// (iniziaTurno, completaRifornimento DOPO il volo di pescata, applicaEventoVisivo DOPO il dado
// Imprevisti, continuaFase/avanzaIA, fineTurno). RITIRATI da qui: l'useEffect che confrontava la
// fase precedente, il contatore di id locale, il DURATA_MS scritto a mano (ora TEMPI.banner) e la
// lettura di stato.faseVisibile.
//
// Tre cose che cambiano rispetto a prima:
//  - **P2.4**: il banner si vede ANCHE nel turno dell'avversario. Prima faseEffettiva era null
//    quando non toccava a un umano, quindi le transizioni di fase dell'IA erano invisibili.
//  - **Vespro**: la fase 5 non esiste come valore di s.fase (il turno passa da 4 a 0), quindi questo
//    cartello prima non compariva MAI. Ora è un passo come gli altri, accodato da fineTurno.
//  - **attribuzione**: la riga in cima dice di chi è il turno. Viene da passo.chiave (congelata dal
//    reducer), non da stato.giocatoreAttivo: durante il Vespro il turno nello stato è già girato.
//
// Il cartello NON si capovolge mai per l'avversario (a differenza delle carte in campo): è un
// overlay a schermo intero letto da chi sta guardando, ruotarlo lo renderebbe illeggibile. Vale
// anche in 1v1 locale, dove il campo si specchia già per intero verso il giocatore attivo.
//
// Overlay non bloccante: pointer-events:none, il campo sotto resta cliccabile durante l'animazione.
// Timing ed easing presi 1:1 da demo_titolo_fase.html (fascia entra .5s / esce .45s con delay .1s
// sull'opacità, testo appare a +260ms) — vedi i due gruppi di @keyframes in index.css: quello base
// su TEMPI.banner.fase e la variante "-lungo" del Vespro su TEMPI.banner.vespro, che tiene fermo il
// cartello 850ms in più senza cambiare la velocità di entrata/uscita (P2.1).
export default function TitoloFase() {
  const { stato, dispatch } = useGame();
  const banner = bannerInScena(stato);
  const id = banner?.id ?? null;
  const fase = banner?.fase ?? null;

  // Fine del cartello: come gli altri componenti della fila (AnimazionePescata/Evocazione/…) è il
  // componente a segnalarla. Il <Sequenziatore> ha comunque il suo timer di sicurezza più largo, per
  // cui un segnale perso non blocca niente.
  useEffect(() => {
    if (id == null) return;
    const durata = fase === 5 ? TEMPI.banner.vespro : TEMPI.banner.fase;
    const timeout = setTimeout(() => dispatch({ type: "sequenza-passo-concluso", id }), durata);
    return () => clearTimeout(timeout);
  }, [id, fase, dispatch]);

  if (!banner) return null;

  const lungo = banner.fase === 5;
  const mio = banner.chiave === "io";
  const attribuzione =
    stato.modalitaGioco === "1v1locale" ? `Giocatore ${mio ? 1 : 2}` : mio ? "Il tuo turno" : "Turno avversario";

  return (
    <div className="titolo-fase-wrap">
      <div key={banner.id} className={`titolo-fase-fascia${lungo ? " titolo-fase-fascia-lungo" : ""}`} />
      <div key={`t${banner.id}`} className={`titolo-fase-testo${lungo ? " titolo-fase-testo-lungo" : ""}`}>
        <div className="titolo-fase-attribuzione">{attribuzione}</div>
        <div className="titolo-fase-numero">
          FASE {banner.fase} / {TOTALE_FASI}
        </div>
        <div className="titolo-fase-nome">{NOMI_FASE[banner.fase] ?? ""}</div>
      </div>
    </div>
  );
}
