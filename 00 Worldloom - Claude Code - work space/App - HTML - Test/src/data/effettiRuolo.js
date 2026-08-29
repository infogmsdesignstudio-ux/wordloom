// Effetto fisso di ogni Ruolo (cap. 10 del regolamento) — si applica a OGNI carta di quel ruolo,
// in aggiunta all'eventuale effetto unico scritto sulla singola carta.
export const EFFETTO_RUOLO = {
  aggressore: "Se 3 Aggressori alleati attaccano nello stesso turno, tutti e 3 guadagnano +1 Attacco fino a fine turno.",
  difensore: "Se 2 Difensori alleati difendono nello stesso turno, il secondo che si attiva guadagna +2 Parata fino a fine turno.",
  tank: "Quando una Pedina alleata viene distrutta, questa Pedina guadagna +3 Vita permanenti finché resta in campo.",
  evasivo:
    "Se subisce Schivata per la 2ª volta nello stesso turno dallo stesso attaccante, prima del colpo successivo può scambiarsi con una Pedina in retrovia: i colpi restanti colpiscono la nuova Pedina in prima linea.",
  bilanciato: "Ignora sempre vantaggio e svantaggio della Ruota: ogni suo combattimento è trattato come neutro, in attacco e in difesa.",
  supporto:
    "Se un alleato in prima linea sta per essere distrutto da Spada o Scudo, un Supporto in retrovia può dargli +2 alla statistica in gioco per quello scontro. Entrambi restano bloccati nella loro fila per 2 turni.",
};
