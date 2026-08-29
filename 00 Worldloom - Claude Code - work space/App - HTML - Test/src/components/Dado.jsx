import { useState } from "react";

// Dadi di reazione: 8 facce, colore e distribuzione dei simboli per Archetipo (cap. 9 del regolamento).
// Logica di tiro non ancora collegata al combattimento (arriva col Pezzo 2): qui c'è solo l'aspetto,
// pronto per l'animazione — "esce" dal vassoio quando serve, poi torna al suo posto.
const DADI_ARCHETIPO = [
  { nome: "Viandante", colore: "#e8c96f", facce: { "⚔️": 2, "🛡️": 2, "❤️": 2, "💨": 2 } },
  { nome: "Assalitore", colore: "#e08a72", facce: { "⚔️": 4, "🛡️": 1, "❤️": 2, "💨": 1 } },
  { nome: "Effimeri", colore: "#72c98f", facce: { "⚔️": 2, "🛡️": 1, "❤️": 2, "💨": 3 } },
  { nome: "Colosso", colore: "#6f9ed6", facce: { "⚔️": 1, "🛡️": 3, "❤️": 1, "💨": 3 } },
  { nome: "Tessitore", colore: "#b98fd6", facce: { "⚔️": 3, "🛡️": 1, "❤️": 2, "💨": 2 } },
];

// Dado Imprevisti: 6 facce (cap. 15) — Nulla 1, +1 tre volte, +2 due volte.
const DADO_IMPREVISTI = { nome: "Imprevisti", colore: "#a97fd6", facce: { "○": 1, "+1": 3, "+2": 2 } };

function FacciaMini({ simbolo, colore }) {
  return (
    <svg viewBox="0 0 40 40" className="dado-mini-svg">
      <polygon points="20,2 38,20 20,38 2,20" fill="none" stroke={colore} strokeWidth="1.5" opacity="0.7" />
      <text x="20" y="24" textAnchor="middle" fontSize="14">
        {simbolo}
      </text>
    </svg>
  );
}

function Vassoio({ dado }) {
  return (
    <div className="dado-vassoio" style={{ "--colore-dado": dado.colore }}>
      <div className="dado-vassoio-nome">{dado.nome}</div>
      <div className="dado-vassoio-facce">
        {Object.entries(dado.facce).map(([simbolo, n]) => (
          <FacciaMini key={simbolo} simbolo={simbolo} colore={dado.colore} conteggio={n} />
        ))}
      </div>
      <div className="dado-vassoio-conteggi">
        {Object.entries(dado.facce).map(([simbolo, n]) => (
          <span key={simbolo}>
            {simbolo}×{n}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function Dado() {
  // In attesa del combattimento vero: cliccando un dado si simula "esce dal vassoio, tira, torna al suo posto".
  const [attivo, setAttivo] = useState(null);

  const tutti = [...DADI_ARCHETIPO, DADO_IMPREVISTI];

  const prova = (dado) => {
    setAttivo(dado.nome);
    setTimeout(() => setAttivo(null), 900);
  };

  return (
    <div className="dado">
      <div className="dado-titolo">Dadi (di reazione per Archetipo + Imprevisti)</div>
      <div className="dado-tray">
        {tutti.map((d) => (
          <button key={d.nome} type="button" className="dado-slot" onClick={() => prova(d)}>
            <Vassoio dado={d} />
          </button>
        ))}
      </div>
      {attivo && (
        <div className="dado-in-uso">
          ✦ {attivo}: sta tirando… <span className="dado-in-uso-nota">(anteprima — il tiro vero arriva col combattimento)</span>
        </div>
      )}
    </div>
  );
}
