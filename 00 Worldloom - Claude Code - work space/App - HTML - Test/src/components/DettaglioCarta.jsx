import Carta from "./Carta.jsx";

// Popup di zoom per una carta in mano, sul campo, o nella cronologia di una pila (es. il
// Cimitero, cap. task 54): si apre toccando la carta (piccola), mostra la grafica ingrandita e,
// da qui, il pulsante per giocarla davvero. Le frecce avanti/indietro compaiono solo quando lo
// zoom arriva da una pila con cronologia (posizione/onPrecedente/onSuccessivo valorizzati) — per
// una carta singola (mano, campo, Terreno...) restano assenti, comportamento invariato.
export default function DettaglioCarta({
  carta,
  onChiudi,
  onEvoca,
  etichettaAzione = "Evoca",
  onSecondaria,
  etichettaSecondaria,
  mazzoIdOverride,
  posizione,
  onPrecedente,
  onSuccessivo,
}) {
  return (
    <div className="modale-sfondo" onClick={onChiudi}>
      <div className="modale-box" onClick={(e) => e.stopPropagation()}>
        {posizione && (
          <div className="modale-navigazione">
            <button
              type="button"
              className="modale-navigazione-freccia"
              onClick={onPrecedente}
              disabled={!onPrecedente}
              title="Carta precedente"
            >
              ←
            </button>
            <span className="modale-navigazione-conteggio">
              {posizione.indice + 1} / {posizione.totale}
            </span>
            <button
              type="button"
              className="modale-navigazione-freccia"
              onClick={onSuccessivo}
              disabled={!onSuccessivo}
              title="Carta successiva"
            >
              →
            </button>
          </div>
        )}
        <Carta carta={carta} mazzoIdOverride={mazzoIdOverride} />
        <div className="modale-azioni">
          {onEvoca && (
            <button className="modale-evoca" onClick={onEvoca}>
              {etichettaAzione}
            </button>
          )}
          {onSecondaria && (
            <button className="modale-evoca modale-secondaria" onClick={onSecondaria}>
              {etichettaSecondaria}
            </button>
          )}
          <button className="modale-chiudi" onClick={onChiudi}>
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
}
