// Statistiche (cap. sistema di salvataggio): vittorie/sconfitte totali + per mazzo, per poter
// confrontare come vanno le combo che testi nell'editor. Scope volutamente minimo per iniziare
// (richiesto esplicitamente dall'utente): solo il risultato dal punto di vista di "io" (il mazzo che
// hai giocato tu), non anche quello dell'IA/avversario.

const CHIAVE_STORAGE = "wl_statistiche";

function vuote() {
  return { totali: { partite: 0, vittorie: 0, sconfitte: 0 }, perMazzo: {} };
}

export function leggiStatistiche() {
  try {
    const raw = localStorage.getItem(CHIAVE_STORAGE);
    if (!raw) return vuote();
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.totali || !parsed.perMazzo) return vuote();
    return parsed;
  } catch {
    return vuote();
  }
}

function scrivi(stat) {
  try {
    localStorage.setItem(CHIAVE_STORAGE, JSON.stringify(stat));
  } catch {
    // niente da fare: la partita resta comunque giocabile anche se le statistiche non si salvano
  }
}

// vinta: bool: chiaveMazzo/nomeMazzo: identità del mazzo usato da "io" in quella partita (vedi
// s.identitaMazzoIo, scritto da nuovaPartita in gameReducer.js — sopravvive a rinomina/eliminazione
// del mazzo salvato, perché è una copia presa al momento in cui la partita è iniziata, non un
// riferimento vivo). aggiornaNome: il nome mostrato per quella chiave si aggiorna sempre all'ultimo
// visto, così un mazzo rinominato dopo la partita non lascia il nome vecchio nelle statistiche.
export function registraEsitoPartita({ vinta, chiaveMazzo, nomeMazzo }) {
  const stat = leggiStatistiche();
  stat.totali.partite += 1;
  if (vinta) stat.totali.vittorie += 1;
  else stat.totali.sconfitte += 1;

  if (chiaveMazzo) {
    const voce = stat.perMazzo[chiaveMazzo] ?? { nome: nomeMazzo, partite: 0, vittorie: 0, sconfitte: 0 };
    voce.nome = nomeMazzo ?? voce.nome;
    voce.partite += 1;
    if (vinta) voce.vittorie += 1;
    else voce.sconfitte += 1;
    stat.perMazzo[chiaveMazzo] = voce;
  }

  scrivi(stat);
  return stat;
}

export function statisticheMazzo(chiaveMazzo) {
  return leggiStatistiche().perMazzo[chiaveMazzo] ?? null;
}
