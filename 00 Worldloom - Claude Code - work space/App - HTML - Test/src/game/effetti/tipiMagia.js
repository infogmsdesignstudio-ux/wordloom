// Framework generico per i 5 sottotipi di Magia (cap. 14 del regolamento): Normale, Potenziamento,
// Continua, Terreno, Rapida. Sostituisce il controllo "codice.startsWith('buff_')" ripetuto a mano in
// più punti (magiaRichiedeBersaglio, magiaGiocabile, scartaOMantieniMagia) con un unico classificatore.
//
// Deriva il sottotipo dalla convenzione già esistente sul `codice` (buff_ = Potenziamento, terr_ =
// Terreno) — nessun nuovo campo in cards.json: l'estensione a Excel/genera_cards_json.py resta un passo
// successivo, deciso a parte con l'utente. Quando arriverà un campo esplicito, basterà cambiare SOLO
// questa funzione, non i punti che la chiamano.

export function classificaSottotipoMagia(carta) {
  const c = carta.effetto?.codice ?? "";
  if (c.startsWith("buff_")) return "potenziamento";
  if (c.startsWith("terr_")) return "terreno";
  return "normale"; // Continua e Rapida non hanno ancora carte reali: si aggiungono qui alla prima
}

// Cosa succede alla carta DOPO che il suo effetto si è risolto. Un Potenziamento resta scoperto nella
// zona Magie e Trappole, legato al bersaglio, finché non muore — la parte "si scarta quando il
// bersaglio muore" è già generica (bersaglioId, letta da ripulisciCampo in giocatore.js), non serviva
// toccarla qui. Tutto il resto va subito al cimitero, come sempre.
export function esitoDopoRisoluzioneMagia(sottotipo, { giocatore, bersaglio }) {
  if (sottotipo === "potenziamento" && bersaglio && giocatore.magieTrappole.length < 5) {
    return { restaInCampo: true, bersaglioId: bersaglio.id };
  }
  return { restaInCampo: false };
}
