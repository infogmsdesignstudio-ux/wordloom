import { useEffect, useState } from "react";
import { useGame } from "../game/GameContext.jsx";
import { getImmagineCarta } from "../data/useMazzi.js";

const DURATA_LETTURA_MS = 700;
const DURATA_PULIZIA_MS = 400;

// Coda di attivazioni (cap. UX Sezione 6, validata su demo_notifica_effetto.html): sostituisce il
// vecchio pop-up bloccante-a-click con una striscia in alto (riusa LO STESSO stile di
// CatenaStriscia.jsx: .catena-striscia-*, coerenza visiva totale) che mostra subito tutte le
// attivazioni in coda, più uno zoom centrale non bloccante per quella in corso di lettura — si
// risolve da sola dopo ~700ms, nessun click. Il campo sotto resta visibile e cliccabile per tutta la
// sequenza (z-index moderato, nessun backdrop opaco).
//
// Nota tecnica: il riuso è SOLO visivo. Queste attivazioni (Imprevisti/Magie dirette/effetti carta)
// restano sequenziali e non rispondibili — non diventano una vera catena a priorità come catena.js
// (cap. Sezione 7). Il meccanismo sotto (stato.notificaEffetto/stato.codaVisiva, dispatch
// "chiudi-notifica") è lo stesso già esistente: cambia solo CHI manda "chiudi-notifica" (un timer
// invece di un click) e la resa visiva (striscia+zoom invece di un modale).
export default function NotificaEffetto() {
  const { stato, dispatch, mazzoId, mazzoIdAvversario } = useGame();
  const notifica = stato?.notificaEffetto;
  const [lotto, setLotto] = useState([]); // [{ id, titolo, testo, chiave, nomeCarta, fase }]

  useEffect(() => {
    if (!notifica) return;
    setLotto((prev) => {
      const giaTracciata = prev.some((v) => v.id === notifica.id);
      if (giaTracciata) {
        // Avanzamento nella stessa sequenza: questa voce (già presente come "attesa" dallo snapshot
        // iniziale del lotto, vedi sotto) diventa quella attiva, la precedente attiva passa a risolta.
        return prev.map((v) =>
          v.id === notifica.id ? { ...v, fase: "attiva" } : v.fase === "attiva" ? { ...v, fase: "risolta" } : v
        );
      }
      // Id mai visto: è l'inizio di un nuovo lotto. Cattura in un colpo solo anche le eventuali altre
      // attivazioni già in coda in questo preciso istante (stato.codaVisiva non riceve nuove voci
      // finché questa sequenza è in corso, quindi lo snapshot è già completo — "mostra subito tutta
      // la coda", cap. UX Sezione 6).
      const inCoda = (stato.codaVisiva ?? [])
        .filter((e) => e.evento === "notifica")
        .map((e) => ({ ...e.dati, fase: "attesa" }));
      return [{ ...notifica, fase: "attiva" }, ...inCoda];
    });

    const id = setTimeout(() => dispatch({ type: "chiudi-notifica" }), DURATA_LETTURA_MS);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifica?.id]);

  // BUG trovato in verifica dal vivo: quando notifica diventa null (nessun'altra attivazione in coda,
  // batch davvero finito) l'effetto sopra non fa nulla (bail-out immediato) — senza questo effetto
  // separato, l'ultima voce restava per sempre a fase "attiva" e la striscia non spariva mai. Chiave
  // sul booleano (non sull'oggetto, che cambia identità ad ogni render) per non rieseguire ad ogni
  // render mentre notifica resta valorizzata.
  useEffect(() => {
    if (notifica) return;
    setLotto((prev) => (prev.some((v) => v.fase === "attiva") ? prev.map((v) => (v.fase === "attiva" ? { ...v, fase: "risolta" } : v)) : prev));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!notifica]);

  // La striscia sparisce solo dopo un margine senza nuovi arrivi (tutte le voci risolte e nessuna
  // nuova notifica.id nel frattempo) — distingue "il lotto è davvero finito" dalla breve pausa tra due
  // attivazioni consecutive della stessa sequenza.
  useEffect(() => {
    if (!lotto.length || !lotto.every((v) => v.fase === "risolta")) return;
    const id = setTimeout(() => setLotto([]), DURATA_PULIZIA_MS);
    return () => clearTimeout(id);
  }, [lotto]);

  if (!lotto.length) return null;

  const mazzoIdDi = (chiave) => (chiave === "io" ? mazzoId : mazzoIdAvversario);
  const attiva = lotto.find((v) => v.fase === "attiva");

  return (
    <>
      <div className="catena-striscia-overlay">
        <div className="catena-striscia-carte">
          {lotto.map((v) => {
            const src = v.nomeCarta && v.chiave ? getImmagineCarta(mazzoIdDi(v.chiave), v.nomeCarta) : null;
            return (
              <div
                key={v.id}
                className={`attivazione-mini-carta ${v.fase === "attiva" ? "attivazione-mini-carta-attiva" : ""} ${v.fase === "risolta" ? "attivazione-mini-carta-risolta" : ""}`}
                title={v.titolo}
              >
                {src && <img className="catena-striscia-carta catena-striscia-carta-piccola" src={src} alt={v.titolo} />}
                {v.fase === "risolta" && <span className="attivazione-mini-carta-spunta">✓</span>}
              </div>
            );
          })}
        </div>
      </div>
      {attiva && (
        <div className="attivazione-zoom-overlay">
          <div key={attiva.id} className="attivazione-zoom-carta">
            {attiva.nomeCarta && attiva.chiave && getImmagineCarta(mazzoIdDi(attiva.chiave), attiva.nomeCarta) ? (
              <img
                className="attivazione-zoom-immagine"
                src={getImmagineCarta(mazzoIdDi(attiva.chiave), attiva.nomeCarta)}
                alt={attiva.nomeCarta}
              />
            ) : (
              <>
                <div className="attivazione-zoom-titolo">{attiva.titolo}</div>
                {attiva.testo && <div className="attivazione-zoom-testo">{attiva.testo}</div>}
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
