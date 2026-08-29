// Elenco statico dei mazzi conosciuti (id + nome + percorso del cards.json sorgente).
// I dati delle carte NON stanno qui: arrivano da src/data/generated/, scritto da scripts/sync-data.mjs.
export const MAZZI = [
  { id: "frost-land", nome: "Frost Land - Primitivi del ghiaccio" },
  // Il mondo si chiama Marbion (2026-08-29: "Kepler" non e' piu' un nome del gioco). L'id resta
  // "kepler-452b" apposta: e' scritto dentro i mazzi salvati e le partite salvate dell'utente
  // (localStorage) e nella mappa cartelle di scripts/sync-data.mjs — cambiarlo li invaliderebbe.
  { id: "kepler-452b", nome: "Marbion - Manipolatrici d'aura" },
];
