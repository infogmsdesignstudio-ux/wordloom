// Costanti di regolamento condivise dal motore di gioco (cap. 8, 9, 11, 15).

export const RUOTA = ["Viandante", "Assalitore", "Effimeri", "Colosso", "Tessitore"];

const EFFICACE_CONTRO = {};
RUOTA.forEach((a, i) => (EFFICACE_CONTRO[a] = RUOTA[(i + 1) % RUOTA.length]));

// "eff" = attaccante efficace contro difensore, "ineff" = attaccante inefficace, "neutro" = nessun vantaggio.
export function calcolaMatchup(archetipoAttaccante, archetipoDifensore, ruoloAttaccante, ruoloDifensore) {
  if (ruoloAttaccante === "bilanciato" || ruoloDifensore === "bilanciato") return "neutro";
  if (EFFICACE_CONTRO[archetipoAttaccante] === archetipoDifensore) return "eff";
  if (EFFICACE_CONTRO[archetipoDifensore] === archetipoAttaccante) return "ineff";
  return "neutro";
}

// Dado di reazione, 8 facce (cap. 9). S=Spada, U=Scudo, C=Cuore, D=Schivata.
// Ogni Archetipo ha almeno 1 faccia Scudo, altrimenti la statistica Parata non avrebbe senso.
export const DADI_ARCHETIPO = {
  Viandante: ["S", "S", "U", "U", "C", "C", "D", "D"],
  Assalitore: ["S", "S", "S", "S", "U", "C", "C", "D"],
  Effimeri: ["S", "S", "U", "C", "C", "D", "D", "D"],
  Colosso: ["S", "U", "U", "U", "C", "D", "D", "D"],
  Tessitore: ["S", "S", "S", "U", "C", "C", "D", "D"],
};

export function tiraDadoArchetipo(archetipo) {
  const facce = DADI_ARCHETIPO[archetipo] ?? DADI_ARCHETIPO.Viandante;
  return facce[Math.floor(Math.random() * facce.length)];
}

// Dado Imprevisti, 6 facce (cap. 15): 0 = nulla, 1 facce ×3, 2 facce ×2.
const FACCE_IMPREVISTI = [0, 1, 1, 1, 2, 2];
export function tiraDadoImprevisti() {
  return FACCE_IMPREVISTI[Math.floor(Math.random() * FACCE_IMPREVISTI.length)];
}

export const NOME_SIMBOLO = { S: "Spada", U: "Scudo", C: "Cuore", D: "Schivata" };

export const PV_INIZIALI = 200;
export const ATTACCHI_PRIMA_LINEA = 3;
export const SLOT_RETROVIA = 2;

// Timer di turno: spostato in src/game/tempi.js come TEMPI.turno (idea 59 — sorgente unica dei tempi
// di gioco/messa in scena). Ogni turno ha 180s, mostrati nel cerchio timer del rail (Campo.jsx/Rail).
// Allo scadere, il turno passa automaticamente così com'è. s.turnoScadenza (gameReducer.js,
// iniziaTurno) è un timestamp assoluto (Date.now() + TEMPI.turno), il countdown vero è calcolato lato
// UI dal tempo reale trascorso.
