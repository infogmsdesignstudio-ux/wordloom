// BLINDATO — idea 59 Fase 1: snapshot della sorgente unica dei tempi (src/game/tempi.js).
// NON cancellare. Se un tempo cambia di proposito, aggiorna QUI il valore atteso nella stessa
// sessione in cui atterra (e l'UX Codex). Esegui: node Engine/test-blindati/tempi.blindato.mjs
import { TEMPI } from "../../App - HTML - Test/src/game/tempi.js";

const ATTESO = {
  dado: { roll: 720, assesto: 450, totale: 1170 },
  balzo: 550,
  numeroDanno: 1150,
  morte: { contraccolpo: 240, volo: 380, impatto: 120, totale: 740 },
  // Fase 2 (catena): countdown "Risolvi" 15s + scenografia di risoluzione di un frame 700ms.
  catena: { countdown: 15000, scenografia: 700 },
  // Fase 3 (voli): totali per il timeout di sicurezza del <Sequenziatore> (pesca / evoca / sposta).
  pesca: { unaCarta: 1700, perCartaExtra: 340 },
  evoca: 1970,
  sposta: 620,
  // Fase 4 (turno IA): il respiro tra una mossa dell'avversario e la successiva — ex timer fisso di
  // 900ms scritto a mano nell'useEffect iaInAttesa di App.jsx. Stesso valore, ora qui.
  ia: { respiro: 900 },
  // Fase 5 (banner di fase): 1750ms per le fasi 1-4 (il valore di sempre, ex DURATA_MS in
  // TitoloFase.jsx) e 2600ms per il Vespro — +850ms di sola TENUTA, entrata/uscita identiche in
  // millisecondi assoluti (P2.1: "restare a schermo più a lungo, segna il cambio turno").
  banner: { fase: 1750, vespro: 2600 },
  respiro: 200,
  turno: 180000,
};

if (JSON.stringify(TEMPI) === JSON.stringify(ATTESO)) {
  console.log("TEMPI invariato ✅");
  process.exit(0);
}
console.log("TEMPI CAMBIATO ❌");
console.log("  atteso :", JSON.stringify(ATTESO));
console.log("  attuale:", JSON.stringify(TEMPI));
console.log("Se il cambiamento è voluto, aggiorna ATTESO qui e l'UX Codex.");
process.exit(1);
