import { useGame } from "../game/GameContext.jsx";

// Prompt obbligatorio a inizio Fase 1 (Rifornimento), prima di qualunque animazione di pescata (cap.
// UX Sezione 3, validato su demo_scelta_rifornimento.html): due riquadri grandi, nessuno zoom-carta
// (non c'è illustrazione da mostrare qui). Sostituisce i due bottoni inline che c'erano in App.jsx.
// Eccezione invariata: il primissimo turno (pesca fissa 5/6 carte, nessuna scelta) non passa mai da
// qui — primoTurnoInPausa, stessa condizione già usata altrove in App.jsx, ricalcolata qui apposta
// (piccolo derivato duplicato, stesso principio già in uso nel progetto — es. "prospettiva" in
// Mano.jsx — per non far attraversare stato a più componenti solo per un booleano).
export default function SceltaRifornimento() {
  const { stato, dispatch } = useGame();
  if (!stato || stato.vincitore || stato.notificaEffetto) return null;

  const turnoUmano = stato.giocatoreAttivo === "io" || stato.modalitaGioco === "1v1locale";
  const attivo = stato.giocatori[stato.giocatoreAttivo];
  const primoTurnoInPausa = turnoUmano && stato.fase === 1 && attivo?.turniGiocati === 1;
  const inRifornimento = turnoUmano && stato.fase === 1 && !primoTurnoInPausa;
  if (!inRifornimento) return null;

  const scegli = (doppio) => dispatch({ type: "rifornimento", doppio });

  return (
    <div className="modale-sfondo">
      <div className="scelta-rifornimento-box">
        <h3 className="scelta-rifornimento-titolo">Rifornimento</h3>
        <div className="scelta-rifornimento-riquadri">
          <button type="button" className="scelta-rifornimento-riquadro" onClick={() => scegli(false)}>
            <span className="scelta-rifornimento-numero">1</span>
            <span className="scelta-rifornimento-etichetta">carta</span>
            <span className="scelta-rifornimento-nota scelta-rifornimento-nota-buona">Puoi attaccare</span>
          </button>
          <button type="button" className="scelta-rifornimento-riquadro" onClick={() => scegli(true)}>
            <span className="scelta-rifornimento-numero">2</span>
            <span className="scelta-rifornimento-etichetta">carte</span>
            <span className="scelta-rifornimento-nota scelta-rifornimento-nota-cattiva">Niente attacco questo turno</span>
          </button>
        </div>
      </div>
    </div>
  );
}
