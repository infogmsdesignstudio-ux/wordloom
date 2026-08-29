import { useEffect } from "react";
import { useGame } from "../game/GameContext.jsx";
import { TEMPI } from "../game/tempi.js";
import { scenaLiberaPerIa } from "../game/sequenza.js";

// Il "direttore" unico della coda di step (idea 59, Fase 1). Guarda s.sequenza[0] e lo fa avanzare:
//
//  - tipo "scelta"  → non fa nulla. Il pop-up (PromptCombattimento) e la dispatch dell'azione del
//                     giocatore chiudono il passo (il case handler fa lo shift()).
//  - tipo "anim"    → timer di SICUREZZA. Il componente d'animazione (LancioDado) normalmente
//    tipo "muta"      segnala prima con dispatch("sequenza-passo-concluso", {id}); se quel segnale si
//    tipo "banner"    perde, il timer avanza lo stesso — nessuno stallo possibile. Per "muta" la
//                     mutazione di stato differita (morte in combattimento) gira nel reducer al
//                     momento dell'avanzamento, dopo che la scenografia è stata mostrata. "banner"
//                     (idea 59 Fase 5) si comporta esattamente come "anim": lo rende TitoloFase.jsx,
//                     che segnala la fine a durataMs scaduti.
//
// Idea 59: s.sequenza è il MASTER assoluto. Finché non è vuota non scorre nient'altro (coda visiva,
// IA, avanzamento di fase, catena — tutti gated su s.sequenza.length). Di conseguenza il direttore
// NON aspetta gli eventi "legacy": quando un passo è in scena, la coda visiva è vuota o congelata in
// attesa che la fila si svuoti — se il direttore aspettasse la coda si avrebbe uno stallo. La coda
// visiva (dado Imprevisti, notifiche, VfxMagia, Imboscata, danno diretto) gira DOPO, a fila vuota.
export default function Sequenziatore() {
  const { stato, dispatch } = useGame();

  const head = stato?.sequenza?.[0] ?? null;
  const headId = head?.id ?? null;
  const headTipo = head?.tipo ?? null;
  const headNome = head?.nome ?? null;
  const headDurata = head?.durataMs ?? null;

  // Idea 59 Fase 4 — la sola eccezione alla regola "s.sequenza è il master assoluto", e per un
  // motivo preciso: il passo muta:"ia" non è scenografia, è il RESPIRO prima della prossima mossa
  // dell'avversario. È esattamente il momento in cui deve potersi vedere quello che è appena
  // successo — a partire dal numero rosso del danno diretto, che passa ancora da s.codaVisiva.
  // Quindi il suo timer non parte finché la scena non è libera. Vive in sequenza.js insieme alla
  // sua guardia gemella filaBloccaCodaVisiva (usata da App.jsx): le due sono l'una il rovescio
  // dell'altra e non devono mai bloccare nello stesso istante, o il turno IA si ferma per sempre.
  const scenaLibera = scenaLiberaPerIa(stato);

  useEffect(() => {
    if (headId == null || stato?.vincitore) return;
    // "scelta": nessun timer — la decisione del giocatore (o l'auto-risoluzione IA nel reducer) chiude.
    if (headTipo === "scelta") return;
    if (headNome === "ia" && !scenaLibera) return; // riparte da sé: scenaLibera è nelle dipendenze

    const base = headDurata ?? (durataDi(headNome) + TEMPI.respiro);
    const id = setTimeout(() => dispatch({ type: "sequenza-passo-concluso", id: headId }), base + 300);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [headId, headTipo, headNome, headDurata, scenaLibera, stato?.vincitore]);

  return null;
}

// Durata "di default" per nome di passo, quando il passo non porta un durataMs esplicito.
function durataDi(nome) {
  if (nome === "dado") return TEMPI.dado.totale;
  if (nome === "balzo") return TEMPI.balzo;
  if (nome === "danno") return TEMPI.numeroDanno;
  if (nome === "morte") return TEMPI.morte.totale;
  if (nome === "catenaRisoluzione") return TEMPI.catena.scenografia; // idea 59 Fase 2 (di norma porta durataMs esplicito)
  if (nome === "pesca") return TEMPI.pesca.unaCarta; // idea 59 Fase 3 (di norma porta durataMs esplicito)
  if (nome === "evoca") return TEMPI.evoca;
  if (nome === "sposta") return TEMPI.sposta;
  if (nome === "ia") return TEMPI.ia.respiro; // idea 59 Fase 4 (di norma porta durataMs esplicito)
  if (nome === "bannerFase") return TEMPI.banner.fase; // idea 59 Fase 5 (di norma porta durataMs esplicito: il Vespro è più lungo)
  return 0;
}
