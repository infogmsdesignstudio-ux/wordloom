import { useEffect, useRef, useState } from "react";
import { useGame } from "../game/GameContext.jsx";
import { getImmagineCarta } from "../data/useMazzi.js";
import { chiDecideOra } from "../game/prospettiva.js";
import { sceltaCatenaInScena, catenaRisoluzioneInScena } from "../game/sequenza.js";
import { TEMPI } from "../game/tempi.js";

// Scenografia della catena di effetti (cap. catena.js, redesign 2026-08-13 su richiesta esplicita
// dell'utente dopo playtest dal vivo): sostituisce il vecchio pop-up con lista testuale. Le carte già
// in coda si mostrano con l'illustrazione vera in una striscia orizzontale che cresce verso destra —
// l'ultima aggiunta (quella in cima alla pila, che si risolverà per prima, LIFO) è quella "zoomata"
// grande a destra, le precedenti si rimpiccioliscono e restano in fila a sinistra nell'ordine in cui
// sono state aggiunte. Le carte ELEGGIBILI da aggiungere non si scelgono da una lista qui: si
// illuminano direttamente sul campo (FilaMagieTrappole in Campo.jsx) e si toccano lì.
//
// Idea 59 Fase 2 — coda di step unica: questo componente non ha più guardie di timing proprie
// (idBalzoRichiesto / dadoInCorso / esitoInCorso / codaVisiva / evocazioneInCorso / notificaEffetto) né
// timer locali (DURATA_RISOLVI_MS / DURATA_RISOLUZIONE_MS) né lo stato `storico` locale: legge dal
// passo in scena di s.sequenza. Renderizza SOLO quando in testa alla fila c'è un passo della catena —
// scelta:catena (la decisione del giocatore) o muta:catenaRisoluzione (la scenografia di un frame).
// Ogni altro passo (dado, balzo, numero di danno, morte, notifica) in testa → non tocca a noi.
export default function CatenaStriscia() {
  const { stato, dispatch, mazzoId, mazzoIdAvversario } = useGame();
  const catena = stato?.catena;
  // Prospettiva (cap. 1v1 locale): chi vedo ORA — chiDecideOra gestisce stato nullo/assente da sola.
  const prospettiva = chiDecideOra(stato);

  const sceltaCatena = sceltaCatenaInScena(stato);
  const risoluzione = catenaRisoluzioneInScena(stato);
  const puoiDecidere = !!sceltaCatena && sceltaCatena.proprietarioPriorita === prospettiva;

  // Countdown "Risolvi" (cap. UX Sezione 7, validata su demo_concatena_risolvi.html): tap esplicito o
  // scadenza del timer hanno lo stesso effetto (dispatch "catena-passa"). Gli hook vanno chiamati
  // incondizionatamente, prima di qualunque return anticipato. L'id del passo scelta:catena cambia ad
  // ogni nuova (ri)apertura di priorità → chiave di reset naturale: ogni concatenazione riavvia il timer,
  // e così anche il ritorno di priorità a questo giocatore dopo la risoluzione di un frame.
  const idScelta = sceltaCatena?.id ?? null;
  const [scadenza, setScadenza] = useState(0);
  const [msRestanti, setMsRestanti] = useState(TEMPI.catena.countdown);

  useEffect(() => {
    if (idScelta == null) return;
    setScadenza(Date.now() + TEMPI.catena.countdown);
    setMsRestanti(TEMPI.catena.countdown);
  }, [idScelta]);

  useEffect(() => {
    if (!puoiDecidere) return;
    const id = setInterval(() => setMsRestanti(Math.max(0, scadenza - Date.now())), 100);
    return () => clearInterval(id);
  }, [puoiDecidere, scadenza]);

  useEffect(() => {
    if (puoiDecidere && idScelta != null && msRestanti <= 0) dispatch({ type: "catena-passa" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [msRestanti, puoiDecidere, idScelta]);

  if (!catena || (!sceltaCatena && !risoluzione)) return null;

  // Un solo overlay alla volta, nell'ordine globale (stesso `legacyOccupato` del <Sequenziatore>): la
  // striscia e la scenografia di risoluzione aspettano che gli eventi "legacy" in scena finiscano
  // (coda visiva delle Fasi 3-5, notifica da leggere, volo di pesca/evocazione/spostamento, Imboscata)
  // — altrimenti comparirebbe sopra una carta ancora a mezz'aria o sopra un pop-up di notifica. Il
  // passo della catena resta in testa alla fila, si mostra appena il legacy si sblocca.
  // idea 59 Fase 3: pesca/evoca/sposta sono passi "anim" della fila; un passo "anim"/"muta" davanti
  // a scelta:catena tiene comunque nascosta la striscia perché la fila è il master (il passo catena
  // non è in scena finché quello davanti non è finito). Restano da attendere gli eventi ancora su
  // s.codaVisiva (una notifica da leggere, ecc.) e l'Imboscata.
  const legacyOccupato =
    !!stato?.codaVisiva?.length ||
    !!stato?.notificaEffetto ||
    !!stato?.morteInCorso;
  if (legacyOccupato) return null;

  const evento = catena.evento;
  const mazzoIdDi = (chiave) => (chiave === "io" ? mazzoId : mazzoIdAvversario);

  let titolo = "Attacco dichiarato: qualcuno può rispondere prima che si risolva.";
  if (evento?.tipo === "evocazione") {
    const evocatore = stato.giocatori[evento.evocatore];
    const creatura = [...evocatore.primaLinea, ...evocatore.retrovia].find((c) => c.id === evento.creaturaId);
    titolo = `${evento.evocatore === prospettiva ? "Hai evocato" : "L'avversario ha evocato"} ${creatura?.nome ?? "una Pedina"}.`;
  }

  // Anello SVG del countdown (cap. UX Sezione 7): raggio/circonferenza fissi, stroke-dashoffset
  // proporzionale al tempo restante — si svuota in tempo reale, aggiornato ogni 100ms dallo stato sopra.
  const RAGGIO = 18;
  const CIRCONFERENZA = 2 * Math.PI * RAGGIO;
  const progresso = Math.max(0, Math.min(1, msRestanti / TEMPI.catena.countdown));

  // Striscia da renderizzare: i frame ancora in pila (ordine di inserimento originale) seguiti da quelli
  // già risolti (s.catena.risolti è in ordine di RISOLUZIONE, cioè LIFO — invertirlo lo rimette in
  // ordine di inserimento, coerente con i frame ancora in pila che lo precedono). Ex `storico` locale.
  const vociStorico = [...(catena.risolti ?? [])].reverse();
  const vociStriscia = [
    ...catena.frames.map((f) => ({ frame: f, risolta: false })),
    ...vociStorico.map((v) => ({ frame: v, risolta: true })),
  ];

  return (
    <div className="catena-striscia-overlay">
      <div className="catena-striscia-titolo">{titolo}</div>
      {vociStriscia.length > 0 && (
        <div className="catena-striscia-carte">
          {vociStriscia.map(({ frame: f, risolta }, i) => {
            const ultima = !risolta && i === catena.frames.length - 1;
            const src = getImmagineCarta(mazzoIdDi(f.proprietario), f.cartaNome);
            const inAttesaAnnullata = !risolta && f.annullata;
            const bersaglioDiRisoluzione =
              risoluzione?.bersaglio?.tipo === "catena" && risoluzione.bersaglio.frameId === f.id;
            return (
              <div key={f.id} className="catena-striscia-carta-wrap" data-catena-frame-id={f.id}>
                <img
                  className={`catena-striscia-carta ${ultima ? "catena-striscia-carta-grande" : "catena-striscia-carta-piccola"} ${bersaglioDiRisoluzione ? "catena-striscia-carta-bersaglio" : ""}`}
                  src={src}
                  alt={f.cartaNome}
                  title={f.cartaNome}
                />
                {(risolta || inAttesaAnnullata) && (
                  <span className={`catena-striscia-esito ${(risolta ? f.esito : "annullata") === "annullata" ? "catena-striscia-esito-annullata" : "catena-striscia-esito-risolta"}`}>
                    {(risolta ? f.esito : "annullata") === "annullata" ? "✕" : "✓"}
                    {risolta && <span className="catena-striscia-ordine">#{f.ordine}</span>}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
      {puoiDecidere && !risoluzione && (
        <>
          <p className="catena-striscia-istruzioni">
            Tocca una tua carta eleggibile evidenziata sul campo per aggiungerla, oppure risolvi.
          </p>
          <button
            type="button"
            className="catena-risolvi-bottone"
            onClick={() => dispatch({ type: "catena-passa" })}
            title="Risolvi subito, senza aspettare il countdown"
          >
            <svg className="catena-risolvi-anello" viewBox="0 0 40 40">
              <circle className="catena-risolvi-anello-sfondo" cx="20" cy="20" r={RAGGIO} />
              <circle
                className="catena-risolvi-anello-progresso"
                cx="20"
                cy="20"
                r={RAGGIO}
                style={{ strokeDasharray: CIRCONFERENZA, strokeDashoffset: CIRCONFERENZA * (1 - progresso) }}
              />
            </svg>
            <span>Risolvi</span>
          </button>
        </>
      )}
      {risoluzione && <RisoluzioneFrame risoluzione={risoluzione} mazzoIdDi={mazzoIdDi} dispatch={dispatch} />}
    </div>
  );
}

// Scenografia di risoluzione di un singolo frame (cap. UX Sezione 7, validata su
// demo_catena_ordine.html): la carta si ingrandisce al centro (stesso stile di Sezione 6,
// .attivazione-zoom-*) con il numero d'ordine, più una linea tratteggiata dorata verso il bersaglio —
// un punto che vi "viaggia sopra" lungo il path reale (getPointAtLength, non un'interpolazione lineare
// approssimata). Idea 59 Fase 2: legge dal passo muta:catenaRisoluzione (dati identici all'ex
// s.catenaRisoluzioneInCorso) e segnala la fine con "sequenza-passo-concluso" come AnimazioneMorte /
// LancioDado; eseguiMuta nel reducer applica poi l'effetto reale del frame.
function RisoluzioneFrame({ risoluzione, mazzoIdDi, dispatch }) {
  const immagine = getImmagineCarta(mazzoIdDi(risoluzione.proprietario), risoluzione.cartaNome);
  const pathRef = useRef(null);
  const [punto, setPunto] = useState(null);
  const [bersaglioRect, setBersaglioRect] = useState(null);
  // Diagnostico P1.4 visibile a schermo (l'utente non riesce ad aprire la console): banner in alto
  // che dice cosa ha calcolato la linea. Da rimuovere a P1.4 chiuso.
  const [diag, setDiag] = useState("");

  // Fine scenografia → avanza la fila (il Sequenziatore ha comunque il timer di sicurezza).
  useEffect(() => {
    const id = setTimeout(() => dispatch({ type: "sequenza-passo-concluso", id: risoluzione.id }), TEMPI.catena.scenografia);
    return () => clearTimeout(id);
  }, [risoluzione.id, dispatch]);

  useEffect(() => {
    const b = risoluzione.bersaglio;
    if (!b) {
      setDiag(`P1.4: bersaglio NULLO per "${risoluzione.cartaNome}" — nessuna linea (non "a caso", proprio assente)`);
      setBersaglioRect(null);
      return;
    }
    const selettore = b.tipo === "campo" ? `[data-creatura-id="${b.creaturaId}"]` : `[data-catena-frame-id="${b.frameId}"]`;
    const el = document.querySelector(selettore);
    const r = el?.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const fuori = r ? r.left < 0 || r.top < 0 || r.left > vw || r.top > vh : false;
    setDiag(
      `P1.4: "${risoluzione.cartaNome}" → ${b.tipo === "campo" ? `campo ${b.nome ?? "?"} #${b.creaturaId}` : `catena #${b.frameId}`} · ` +
        `elemento nel DOM: ${el ? "SÌ" : "NO"} · ` +
        (r ? `pos ${Math.round(r.left)},${Math.round(r.top)} (viewport ${vw}×${vh})${fuori ? " ⚠ FUORI SCHERMO" : ""}` : "nessun rect")
    );
    try {
      console.log("[P1.4 VFX catena]", { selettore, elementoTrovato: !!el, rect: r, viewport: { vw, vh }, bersaglio: b });
    } catch {
      /* ignora */
    }
    setBersaglioRect(r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null);
  }, [risoluzione.id]);

  useEffect(() => {
    if (!bersaglioRect || !pathRef.current) return undefined;
    const path = pathRef.current;
    const lunghezza = path.getTotalLength();
    const durata = 350;
    const inizio = performance.now();
    let raf;
    const anima = (ora) => {
      const t = Math.min(1, (ora - inizio) / durata);
      const p = path.getPointAtLength(t * lunghezza);
      setPunto({ x: p.x, y: p.y });
      if (t < 1) raf = requestAnimationFrame(anima);
    };
    raf = requestAnimationFrame(anima);
    return () => cancelAnimationFrame(raf);
  }, [bersaglioRect]);

  const daX = window.innerWidth / 2;
  const daY = window.innerHeight / 2;
  const controlloX = bersaglioRect ? (daX + bersaglioRect.x) / 2 : daX;
  const controlloY = bersaglioRect ? Math.min(daY, bersaglioRect.y) - 60 : daY;

  return (
    <>
      {diag && (
        <div
          style={{
            position: "fixed",
            top: 4,
            left: 4,
            right: 4,
            zIndex: 9999,
            background: "rgba(120, 0, 0, 0.9)",
            color: "#fff",
            font: "11px/1.3 monospace",
            padding: "4px 6px",
            borderRadius: 4,
            pointerEvents: "none",
            whiteSpace: "pre-wrap",
          }}
        >
          {diag}
        </div>
      )}
      {bersaglioRect && (
        <svg className="catena-linea-overlay">
          <path
            ref={pathRef}
            d={`M ${daX} ${daY} Q ${controlloX} ${controlloY} ${bersaglioRect.x} ${bersaglioRect.y}`}
            className="catena-linea-path"
          />
          {punto && <circle cx={punto.x} cy={punto.y} r="4" className="catena-linea-punto" />}
        </svg>
      )}
      <div className="attivazione-zoom-overlay">
        <div className="attivazione-zoom-carta catena-risoluzione-carta">
          <span className="catena-risoluzione-ordine">#{risoluzione.ordine}</span>
          {immagine && <img className="attivazione-zoom-immagine" src={immagine} alt={risoluzione.cartaNome} />}
          {risoluzione.esito === "annullata" && <span className="catena-risoluzione-annullata">✕ Annullata</span>}
        </div>
      </div>
    </>
  );
}
