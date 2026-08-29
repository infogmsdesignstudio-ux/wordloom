import { useGame } from "../game/GameContext.jsx";

// Cronologia delle mosse. Per ora registra solo evocazioni/sacrifici (Pezzo 1);
// gli eventi di combattimento e fasi si aggiungeranno con i prossimi Pezzi.
export default function Log() {
  const { stato } = useGame();
  const voci = stato?.log ?? [];

  return (
    <div className="log">
      <div className="log-titolo">Registro mosse</div>
      <div className="log-voci">
        {voci.length === 0 && <p className="log-vuoto">Nessuna mossa ancora — inizia una partita.</p>}
        {voci.map((voce, i) => (
          <div key={i} className="log-voce">
            {voce}
          </div>
        ))}
      </div>
    </div>
  );
}
