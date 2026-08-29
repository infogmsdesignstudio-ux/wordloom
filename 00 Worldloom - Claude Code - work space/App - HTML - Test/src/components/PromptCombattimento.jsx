import { useGame } from "../game/GameContext.jsx";
import { attaccoTotale, parataTotale } from "../game/combattimento.js";
import { vitaAttuale } from "../game/mazzo.js";
import { carteEleggibiliPerRisposta } from "../game/magieTrappole.js";
import { chiDecideOra } from "../game/prospettiva.js";
import { passoInScena, filaOccupata } from "../game/sequenza.js";
import { SIMBOLO_ICONA, COLORE_ARCHETIPO } from "./LancioDado.jsx";

const NOME_SIMBOLO = { S: "Spada", U: "Scudo", C: "Cuore", D: "Schivata" };

function trovaCreatura(giocatore, id) {
  return [...giocatore.primaLinea, ...giocatore.retrovia].find((c) => c.id === id);
}

// Statistiche di attaccante e difensore fianco a fianco (cap. task 55): aiuta a decidere se
// difendere/lasciar passare o far valere il diritto di ripetizione, senza dover riaprire lo zoom
// delle carte per ricontrollare i numeri. La TUA carta è sempre a sinistra (verde), quella
// avversaria sempre a destra (rossa) — indipendentemente da chi sta attaccando o difendendo in
// questo scontro (richiesta esplicita dell'utente, punto 12 originale): "attaccanteEIo" dice solo
// quale dei due dati (attaccante/difensore) corrisponde alla mia creatura.
function ConfrontoCombattimento({ attaccante, attP, difensore, difP, attaccanteEIo }) {
  if (!attaccante || !difensore) return null;
  const mia = attaccanteEIo ? attaccante : difensore;
  const miaProp = attaccanteEIo ? attP : difP;
  const avversaria = attaccanteEIo ? difensore : attaccante;
  const avversariaProp = attaccanteEIo ? difP : attP;
  return (
    <div className="prompt-confronto">
      <div className="prompt-confronto-creatura prompt-confronto-mia">
        <div className="prompt-confronto-nome">{mia.nome}</div>
        <div className="prompt-confronto-stats">
          <span title="Vita">❤ {vitaAttuale(mia)}</span>
          <span title="Parata">🛡 {parataTotale(mia, miaProp)}</span>
          <span title="Attacco">⚔ {attaccoTotale(mia, miaProp)}</span>
        </div>
      </div>
      <div className="prompt-confronto-vs">contro</div>
      <div className="prompt-confronto-creatura prompt-confronto-avversaria">
        <div className="prompt-confronto-nome">{avversaria.nome}</div>
        <div className="prompt-confronto-stats">
          <span title="Vita">❤ {vitaAttuale(avversaria)}</span>
          <span title="Parata">🛡 {parataTotale(avversaria, avversariaProp)}</span>
          <span title="Attacco">⚔ {attaccoTotale(avversaria, avversariaProp)}</span>
        </div>
      </div>
    </div>
  );
}

// Prompt interattivi che il regolamento riserva al difensore: rifiuto della difesa (cap. 13)
// e diritto di ripetizione (cap. 12). Compaiono solo quando la decisione spetta a te.
export default function PromptCombattimento() {
  const { stato, dispatch } = useGame();

  // Se c'è una notifica di attivazione (Imprevisto/Trappola) da chiudere, aspetta: niente altri
  // prompt sopra finché l'utente non l'ha vista e chiusa (vedi NotificaEffetto.jsx).
  if (stato?.notificaEffetto) return null;

  // Prospettiva (cap. 1v1 locale): chi deve vedere ORA i prompt qui sotto — vedi
  // src/game/prospettiva.js. Contro IA è sempre "io", come da sempre.
  const prospettiva = chiDecideOra(stato);

  // Uno slot di prima linea si è liberato e c'è più di un candidato in retrovia: scegli chi avanza
  // (cap. 4). Non più un modale con lista testuale (cap. UX Sezione 8, Step 8) — gli Alieni eleggibili
  // in retrovia si illuminano direttamente sul campo (Campo.jsx, stesso linguaggio oro pulsante già
  // usato per l'eleggibilità delle Trappole nella catena), si toccano lì.

  const comb = stato?.combattimento;

  // Idea 59 — coda di step unica: le vecchie 5 auto-guardie (idBalzoRichiesto/idDadoRichiesto/
  // dadoInCorso/esitoInCorso/codaVisiva) collassano in questo: se in scena c'è un passo che NON è
  // una "scelta" (dado che rotola, balzo, numero di danno, morte), nessun pop-up sopra di lui. I
  // pop-up "difendi"/"ripeti" qui sotto compaiono solo quando è il LORO passo "scelta" a essere in
  // testa alla fila.
  const head = passoInScena(stato);
  if (head && head.tipo !== "scelta") return null;
  // Eventi legacy ancora in coda (notifica, dado Imprevisti, ecc.): come prima, aspetta.
  if (comb && stato.codaVisiva?.length) return null;

  // Finestra a catena (cap. catena.js): niente più pop-up qui — sostituito da CatenaStriscia.jsx
  // (striscia orizzontale di carte vere + tocco diretto sulle carte eleggibili in campo, redesign
  // 2026-08-13 su richiesta esplicita dell'utente dopo playtest dal vivo). Questo componente si limita
  // a non mostrare nessun ALTRO prompt (rifiuto/ripetizione/trappola dopoTiro) mentre la catena è
  // aperta — non che serva, dato che comb.step non può essere "rifiuto"/"ripetizione" finché la
  // catena non si è già risolta, ma resta esplicito per chiarezza.
  if (stato.catena) return null;

  if (!comb) return null;

  // Finestra Trappole: scattano solo se già pronte (piazzate in un turno precedente, cap. 14).
  // Resta il vecchio flusso a scelta singola per "dopoTiro"/"attaccoDiretto" (non ancora agganciati
  // alla catena) — "attaccoDichiarato" passa sempre dal prompt sopra quando c'è qualcosa di eleggibile.
  // Idea 59: aspetta che l'eventuale dado (passo "anim" della fila) abbia finito di rotolare — il
  // check `head && head.tipo !== "scelta"` in cima già lo copre, filaOccupata è la rete di sicurezza.
  if (comb.step === "trappola" && comb.difProprietario === "io" && !stato.catena && !filaOccupata(stato)) {
    const slots = stato.giocatori.io.magieTrappole;
    const eleggibili = carteEleggibiliPerRisposta(stato.giocatori.io, "io", { tipo: comb.contestoTrappola, difProprietario: comb.difProprietario });
    const disponibili = slots.map((mt, indice) => ({ mt, indice })).filter(({ mt }) => eleggibili.includes(mt));

    return (
      <div className="modale-sfondo">
        <div className="modale-box modale-prompt">
          <h3>Trappola disponibile</h3>
          <p>Puoi attivare una delle tue Trappole coperte, oppure lasciar proseguire l'attacco.</p>
          <div className="modale-lista-trappole">
            {disponibili.map(({ mt, indice }) => (
              <button key={indice} className="modale-evoca" onClick={() => dispatch({ type: "attiva-trappola", indiceSlot: indice })}>
                {mt.carta.nome}
                <span className="modale-trappola-testo">{mt.carta.effetto?.testo}</span>
              </button>
            ))}
          </div>
          <div className="modale-azioni">
            <button className="modale-chiudi" onClick={() => dispatch({ type: "attiva-trappola", indiceSlot: -1 })}>
              Non attivare
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Idea 59: il pop-up "Difendi o incassa?" compare solo quando è il passo "scelta" difendi a essere
  // in testa alla fila (la scelta viene prima di dado/numero — sequenza b).
  if (comb.step === "rifiuto" && comb.difProprietario === prospettiva && head?.nome === "difendi") {
    const attP = stato.giocatori[comb.proprietario];
    const difP = stato.giocatori[comb.difProprietario];
    const attaccante = trovaCreatura(attP, comb.attaccanteId);
    const difensore = trovaCreatura(difP, comb.difensoreId);
    return (
      <div className="modale-sfondo">
        <div className="modale-box modale-prompt">
          <h3>Difendi o lasci passare?</h3>
          <ConfrontoCombattimento attaccante={attaccante} attP={attP} difensore={difensore} difP={difP} attaccanteEIo={false} />
          <p>
            Se <b>difendi</b>, la tua Pedina tira il dado di reazione: potresti schivare, parare o subire danno pieno.
            <br />
            Se <b>lasci passare</b>, il colpo va dritto al tuo Stratega per danno pieno, ma la tua Pedina resta illesa.
          </p>
          <div className="modale-azioni">
            <button className="modale-chiudi" onClick={() => dispatch({ type: "decidi-difesa", rifiuta: true })}>
              Lascia passare
            </button>
            <button className="modale-evoca" onClick={() => dispatch({ type: "decidi-difesa", rifiuta: false })}>
              Difendi
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Idea 59: "Diritto di ripetizione" compare solo quando è il suo passo "scelta" ripeti a essere in
  // testa (cioè dopo che il dado del tiro ha finito di rotolare).
  if (comb.step === "ripetizione" && head?.nome === "ripeti") {
    const proprietarioDecisore = comb.decisore === "attaccante" ? comb.proprietario : comb.difProprietario;
    if (proprietarioDecisore !== prospettiva) return null;
    // Il diritto di ripetizione spetta sempre a chi ha il vantaggio di matchup (cap. 12): se è
    // l'attaccante ad avere l'Archetipo efficace, può obbligare il difensore a ritirare; se è il
    // difensore ad avere l'Archetipo efficace (contro quello dell'attaccante), può ritirare il proprio.
    const testoRuolo =
      comb.decisore === "attaccante"
        ? "La tua Pedina è efficace contro quella avversaria: puoi obbligare il difensore a ritirare."
        : "La tua Pedina è efficace contro quella avversaria: puoi ritirare il dado.";
    const attP = stato.giocatori[comb.proprietario];
    const difP = stato.giocatori[comb.difProprietario];
    const attaccante = trovaCreatura(attP, comb.attaccanteId);
    const difensore = trovaCreatura(difP, comb.difensoreId);
    const coloreSimbolo = COLORE_ARCHETIPO[difensore?.archetipo] ?? COLORE_ARCHETIPO.Viandante;
    return (
      <div className="modale-sfondo">
        <div className="modale-box modale-prompt">
          <h3>Diritto di ripetizione</h3>
          <div className="prompt-simbolo-uscito" style={{ color: coloreSimbolo }}>
            <span className="prompt-simbolo-icona">{SIMBOLO_ICONA[comb.simboloTirato]}</span>
            È uscito <b>{NOME_SIMBOLO[comb.simboloTirato]}</b>
          </div>
          <ConfrontoCombattimento attaccante={attaccante} attP={attP} difensore={difensore} difP={difP} attaccanteEIo={comb.proprietario === prospettiva} />
          <p>
            {testoRuolo}
            <br />
            Vale una sola volta contro questa Pedina per turno.
          </p>
          <div className="modale-azioni">
            <button className="modale-chiudi" onClick={() => dispatch({ type: "decidi-ripetizione", usa: false })}>
              Tieni così
            </button>
            <button className="modale-evoca" onClick={() => dispatch({ type: "decidi-ripetizione", usa: true })}>
              Fai ritirare
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
