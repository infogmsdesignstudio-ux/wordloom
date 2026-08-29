import { EFFETTO_RUOLO } from "../data/effettiRuolo.js";
import { useGame } from "../game/GameContext.jsx";
import { getImmagineCarta } from "../data/useMazzi.js";
import { COLORE_ARCHETIPO } from "./LancioDado.jsx";

export default function Carta({ carta, selezionata = false, onClick, compatta = false, onZoom, classiExtra, mazzoIdOverride, esito, fonteMagia = false, dataUid }) {
  const { nome, archetipo, livello, ruolo, vita, attacco, parata, attacchi, effetto, attaccoAlterazione, parataAlterazione } = carta;
  // Verde se un Potenziamento alza la stat, rosso se la abbassa, colore normale se invariata (usato
  // solo dal ramo "carta senza illustrazione" più sotto — nel ramo compatto le stat sono nell'etichetta
  // a fianco dello slot, cap. P3.3, gestita da Campo.jsx/SlotEtichetta).
  const classeAlterazione = (delta) => (delta > 0 ? "carta-stat-alterata-su" : delta < 0 ? "carta-stat-alterata-giu" : "");
  const effettoRuolo = EFFETTO_RUOLO[ruolo];
  // "alieno" e' il vecchio nome del tipo (rinomina a "pedina" del 2026-08-29): normalizzato qui una
  // volta sola, cosi' i rami sotto confrontano un valore solo. Serve per le partite gia' salvate.
  const tipoGrezzo = carta.tipoCarta ?? "pedina";
  const tipo = tipoGrezzo === "alieno" ? "pedina" : tipoGrezzo;
  const { mazzoId } = useGame();
  const immagine = getImmagineCarta(mazzoIdOverride ?? mazzoId, nome);

  const classi = [compatta ? "carta-mini" : "carta"];
  if (selezionata) classi.push("carta-selezionata");
  if (onClick) classi.push("carta-cliccabile");
  if (tipo !== "pedina") classi.push(`carta-${tipo}`);
  if (classiExtra) classi.push(classiExtra);
  // Marcatore per il VFX source→target delle Magie con bersaglio (VfxMagia.jsx): identifica la carta
  // sorgente mentre è ancora ferma in mano, PRIMA che il click sul bersaglio la rimuova dal DOM — va
  // letto (getBoundingClientRect) nel gestore di click del bersaglio, non dopo.
  const attrFonteMagia = fonteMagia ? { "data-fonte-magia": "true" } : {};
  // Marcatore per il bersaglio del volo vero della pescata (cap. UX Sezione 3, AnimazionePescata.jsx):
  // identifica lo slot reale in mano su cui la carta volante deve atterrare, letto via
  // getBoundingClientRect quando serve — stesso principio di attrFonteMagia sopra.
  const attrDataUid = dataUid != null ? { "data-carta-uid": dataUid } : {};

  // Riquadri compatti del campo: la Complete card si vede a TUTTO IL FRAME (illustrazione piena, come
  // Magia/Trappola/Cimitero — cap. P3.3, richiesta esplicita dell'utente). Le statistiche e i simboli
  // di stato (🚫) NON stanno più sopra la carta: sono in una fascia-etichetta separata a fianco dello
  // slot (Campo.jsx, SlotEtichetta — sotto per la prima linea, sopra per la retrovia). Qui restano
  // solo l'icona ℹ (zoom), il numero di danno fluttuante e — se manca la Complete card — il livello.
  if (compatta) {
    const titolo = [`${nome} — ${archetipo} · ${ruolo} · Lv.${livello}`, effettoRuolo, effetto?.testo].filter(Boolean).join("\n");
    return (
      <div className={classi.join(" ")} onClick={onClick} title={titolo}>
        {esito && (
          <div className="carta-esito" key={esito.key}>
            <div className={`carta-esito-numero carta-esito-${esito.tipo}`}>
              {esito.tipo === "danno" ? `-${esito.valore}` : "0"}
            </div>
          </div>
        )}
        {onZoom && (
          <button
            type="button"
            className="carta-mini-zoom"
            title="Rivedi la carta"
            onClick={(e) => {
              e.stopPropagation();
              onZoom(carta);
            }}
          >
            ℹ
          </button>
        )}
        {immagine ? (
          <img className="carta-mini-img" src={immagine} alt={nome} />
        ) : (
          <>
            <div className="carta-mini-liv">{livello}</div>
            <div className="carta-mini-nome">{nome}</div>
          </>
        )}
      </div>
    );
  }

  // Fuori dai riquadri compatti, se esiste la Complete card (illustrazione + nome + statistiche
  // gia' impaginati) la mostriamo cosi' com'e' al posto della resa HTML.
  if (immagine) {
    classi.push("carta-immagine");
    return (
      <div className={classi.join(" ")} onClick={onClick} title={nome} {...attrFonteMagia} {...attrDataUid}>
        <img src={immagine} alt={nome} />
      </div>
    );
  }

  // Magie, Trappole e Imprevisti senza Complete Card. Prima erano un blocco di testo libero che si
  // allungava quanto serviva: con le carte nuove (effetti lunghi, illustrazione non ancora fatta) la
  // carta diventava alta il doppio delle vicine e sfondava la mano — segnalato dall'utente con uno
  // screenshot il 2026-08-29. Ora usano lo STESSO guscio neutro 5:7 delle Pedine senza illustrazione
  // (banner/corpo/piede, `carta-senza-immagine`), così tutte le carte in mano occupano lo stesso
  // spazio; il testo lungo scorre dentro il corpo invece di allargare la carta.
  if (tipo !== "pedina") {
    const coloreTipo = tipo === "magia" ? "#6b9ede" : tipo === "trappola" ? "#a97fd6" : "#c9a24b";
    const nomeTipo = tipo === "magia" ? "Magia" : tipo === "trappola" ? "Trappola" : "Imprevisto";
    const sottotipo = carta.sottotipo && carta.sottotipo !== "normale" ? ` · ${carta.sottotipo}` : "";
    classi.push("carta-senza-immagine");
    return (
      <div className={classi.join(" ")} onClick={onClick} title={`${nome} — ${effetto?.testo ?? ""}`} {...attrFonteMagia} {...attrDataUid}>
        <div className="carta-senza-immagine-banner" style={{ background: coloreTipo }}>
          {nome}
        </div>
        <div className="carta-senza-immagine-corpo">
          <div className="carta-arch">
            {nomeTipo}
            {sottotipo}
          </div>
          {effetto?.testo && <div className="carta-fx carta-fx-carta">{effetto.testo}</div>}
        </div>
        <div className="carta-senza-immagine-piede">
          <div className="carta-tipo-badge">{tipo === "magia" ? "✨ Magia" : tipo === "trappola" ? "🪤 Trappola" : "☄ Imprevisto"}</div>
        </div>
      </div>
    );
  }

  // Nessuna Complete Card disponibile per questa carta (illustrazione non ancora fornita): invece del
  // vecchio blocco di testo libero (che si allungava quanto serviva, rompendo la coerenza visiva con
  // le carte illustrate accanto), stessa proporzione 5:7 delle Complete Card vere e una struttura a
  // fasce banner/corpo/statistiche che le imita — così anche senza illustrazione la carta occupa
  // esattamente lo stesso spazio delle altre in mano (richiesta esplicita dell'utente 2026-08-13).
  const coloreArchetipo = COLORE_ARCHETIPO[archetipo] ?? COLORE_ARCHETIPO.Viandante;
  classi.push("carta-senza-immagine");
  return (
    <div className={classi.join(" ")} onClick={onClick} title={nome} {...attrFonteMagia} {...attrDataUid}>
      <div className="carta-senza-immagine-banner" style={{ background: coloreArchetipo }}>
        {nome}
      </div>
      <div className="carta-senza-immagine-corpo">
        <div className="carta-arch">
          {archetipo} · {ruolo} · Livello {livello}
        </div>
        {effettoRuolo && (
          <div className="carta-fx carta-fx-ruolo">
            <span className="carta-fx-etichetta">Effetto di Ruolo</span> {effettoRuolo}
          </div>
        )}
        {effetto?.testo && (
          <div className="carta-fx carta-fx-carta">
            <span className="carta-fx-etichetta">Effetto Carta</span> {effetto.testo}
          </div>
        )}
      </div>
      <div className="carta-senza-immagine-piede">
        <div className="carta-stats">
          <span title="Vita">❤️ {vita}</span>
          <span title="Parata" className={classeAlterazione(parataAlterazione)}>
            🛡 {parata}
          </span>
          <span title="Attacco" className={classeAlterazione(attaccoAlterazione)}>
            ⚔ {attacco}
          </span>
        </div>
        <div className="carta-attacchi">{attacchi} attacchi/turno</div>
      </div>
    </div>
  );
}
