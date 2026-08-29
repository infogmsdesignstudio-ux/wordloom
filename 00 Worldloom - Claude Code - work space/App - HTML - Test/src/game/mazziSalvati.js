// Motore dei mazzi personalizzati (editor mazzi): limiti di costruzione, validazione,
// salvataggio/lettura da localStorage. Nessun aggancio al motore di gioco vero (mazzo.js,
// costruisciMazzo) qui — arriva in un pezzo successivo. Modulo puro, senza dipendenze React,
// testabile in isolamento.

const CHIAVE_STORAGE = "wl_mazzi_salvati";

// Regole di costruzione (confermate con l'utente): il Worldloom sta tra 40 e 60 copie totali,
// max 3 copie per carta di default. Il mazzetto Imprevisti (cap. 15 del regolamento: "minimo 10
// carte, massimo 2 copie identiche") non ha un massimo totale, solo un minimo.
export const WORLDLOOM_MIN = 40;
export const WORLDLOOM_MAX = 60;
export const WORLDLOOM_LIMITE_BASE = 3;
export const IMPREVISTI_MIN = 10;
export const IMPREVISTI_LIMITE_BASE = 2;

// Limite reale di copie per una carta in un mazzo costruito: l'eccezione esplicita in Excel
// (colonna "Limite Copie" → carta.limiteCopie) vince sempre; altrimenti la regola standard, mai
// però più delle copie stampate (carta.copie) — non si può schierare una copia che non esiste.
export function limiteCopieCarta(carta, tipoMazzetto) {
  const base = tipoMazzetto === "imprevisti" ? IMPREVISTI_LIMITE_BASE : WORLDLOOM_LIMITE_BASE;
  if (carta.limiteCopie !== null && carta.limiteCopie !== undefined) {
    return Math.min(carta.limiteCopie, carta.copie);
  }
  return Math.min(base, carta.copie);
}

function contaTotale(lista) {
  return (lista ?? []).reduce((tot, r) => tot + (r.quantita || 0), 0);
}

// Verifica un mazzo salvato contro le carte reali dell'archetipo (cardsData): quantità nei
// limiti, nessun riferimento a carte non più esistenti, dimensione totale nel range richiesto.
// Una riga di mazzo salvato si risolve per IDENTITA' (nome + variante + rarita' + finitura), che e'
// cio' che distingue due stampe della stessa carta. I mazzi salvati prima dell'introduzione
// dell'identita' hanno solo `nome`: quelli si risolvono ancora per nome, cosi' non si svuotano.
function indice(carte) {
  const m = new Map();
  carte.forEach((c) => {
    if (c.id) m.set(c.id, c);
    if (!m.has(c.nome)) m.set(c.nome, c); // ripiego per i mazzi salvati vecchi
  });
  return m;
}

function etichetta(riga) {
  return riga.nome ?? riga.id;
}

export function validaMazzo(cardsData, mazzo) {
  const errori = [];
  const perNomeWorldloom = indice(cardsData.carte);
  const perNomeImprevisti = indice(cardsData.imprevisti ?? []);

  (mazzo.worldloom ?? []).forEach((riga) => {
    const { quantita } = riga;
    const nome = etichetta(riga);
    const carta = perNomeWorldloom.get(riga.id ?? riga.nome) ?? perNomeWorldloom.get(riga.nome);
    if (!carta) {
      errori.push(`"${nome}" non esiste più in questo archetipo`);
      return;
    }
    if (quantita < 0) errori.push(`"${nome}": quantità negativa`);
    const limite = limiteCopieCarta(carta, "worldloom");
    if (quantita > limite) errori.push(`"${nome}": ${quantita} copie, massimo ${limite}`);
  });

  (mazzo.imprevisti ?? []).forEach((riga) => {
    const { quantita } = riga;
    const nome = etichetta(riga);
    const carta = perNomeImprevisti.get(riga.id ?? riga.nome) ?? perNomeImprevisti.get(riga.nome);
    if (!carta) {
      errori.push(`Imprevisto "${nome}" non esiste più`);
      return;
    }
    if (quantita < 0) errori.push(`Imprevisto "${nome}": quantità negativa`);
    const limite = limiteCopieCarta(carta, "imprevisti");
    if (quantita > limite) errori.push(`Imprevisto "${nome}": ${quantita} copie, massimo ${limite}`);
  });

  const totaleWorldloom = contaTotale(mazzo.worldloom);
  const totaleImprevisti = contaTotale(mazzo.imprevisti);

  if (totaleWorldloom < WORLDLOOM_MIN || totaleWorldloom > WORLDLOOM_MAX) {
    errori.push(`Worldloom: ${totaleWorldloom} carte, servono tra ${WORLDLOOM_MIN} e ${WORLDLOOM_MAX}`);
  }
  if (totaleImprevisti < IMPREVISTI_MIN) {
    errori.push(`Imprevisti: ${totaleImprevisti} carte, minimo ${IMPREVISTI_MIN}`);
  }

  return { valido: errori.length === 0, errori, totaleWorldloom, totaleImprevisti };
}

// Espande la lista {nome, quantita} di un mazzo salvato in un pool di carte pronte per mazzo.js
// (una entry per copia, la carta vera presa da cardsData — mazzo.js ci aggiunge poi id/_uid).
// Le carte non più esistenti (mazzo salvato prima di una modifica all'Excel) vengono ignorate
// silenziosamente: la segnalazione esplicita all'utente è compito di validaMazzo, non di questa
// funzione, che deve poter essere chiamata anche su un mazzo "quasi" valido senza esplodere.
export function espandiListaMazzo(cardsData, lista, tipoMazzetto) {
  const perNome = indice(tipoMazzetto === "imprevisti" ? (cardsData.imprevisti ?? []) : cardsData.carte);
  const risultato = [];
  (lista ?? []).forEach((riga) => {
    const carta = perNome.get(riga.id ?? riga.nome) ?? perNome.get(riga.nome);
    if (!carta) return;
    for (let i = 0; i < riga.quantita; i++) risultato.push(carta);
  });
  return risultato;
}

// --- Salvataggio (localStorage) ---------------------------------------------------------

function leggiTutti() {
  try {
    const raw = localStorage.getItem(CHIAVE_STORAGE);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function scriviTutti(mazzi) {
  try {
    localStorage.setItem(CHIAVE_STORAGE, JSON.stringify(mazzi));
    return true;
  } catch {
    return false;
  }
}

// Un mazzo salvato NON è più legato a un solo mondo (cap. editor mazzi "lista unica", richiesta
// esplicita dell'utente: "i mazzi possono essere un misto di mondi e archetipi") — elenca sempre
// tutti i mazzi salvati, senza filtro. Un vecchio mazzo salvato prima di questo cambio poteva avere
// un campo `archetipoId`: resta nell'oggetto (innocuo, ignorato) invece di essere ripulito, per non
// perdere dati con una migrazione non richiesta.
export function elencaMazziSalvati() {
  return leggiTutti();
}

export function ottieniMazzo(id) {
  return leggiTutti().find((m) => m.id === id) ?? null;
}

function nuovoId() {
  return `mazzo-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

export function creaMazzoVuoto(nome) {
  return {
    id: nuovoId(),
    nome: nome || "Nuovo mazzo",
    worldloom: [],
    imprevisti: [],
    // Icona del mazzo (cap. richiesta utente 2026-08-28): nome di una carta del mazzo, la cui
    // miniatura si usa come icona nella lista editor e nel selettore di schermata iniziale. null =
    // nessuna scelta.
    icona: null,
    // Sfondo campo di battaglia (cap. editor mazzi, richiesta esplicita dell'utente): riferimento
    // {mazzoId, file} a un'immagine in Sfondo Campo/, o null = nessuno scelto (resta lo sfondo
    // stellato predefinito). Libero da qualunque mondo, non vincolato alle carte del mazzo — coerente
    // con i mazzi misti (cap. editor mazzi "lista unica").
    sfondoCampo: null,
    creatoIl: Date.now(),
    modificatoIl: Date.now(),
  };
}

export function salvaMazzo(mazzo) {
  const tutti = leggiTutti();
  const aggiornato = { ...mazzo, modificatoIl: Date.now() };
  const idx = tutti.findIndex((m) => m.id === mazzo.id);
  if (idx >= 0) tutti[idx] = aggiornato;
  else tutti.push(aggiornato);
  scriviTutti(tutti);
  return aggiornato;
}

export function eliminaMazzo(id) {
  scriviTutti(leggiTutti().filter((m) => m.id !== id));
}

export function duplicaMazzo(id, nuovoNome) {
  const originale = ottieniMazzo(id);
  if (!originale) return null;
  const copia = {
    ...originale,
    id: nuovoId(),
    nome: nuovoNome || `${originale.nome} (copia)`,
    creatoIl: Date.now(),
    modificatoIl: Date.now(),
  };
  const tutti = leggiTutti();
  tutti.push(copia);
  scriviTutti(tutti);
  return copia;
}

// --- Esporta / importa su file (cap. X.1) --------------------------------------------------
// I mazzi vivono solo in localStorage: esportarli in un .json permette di tenerne una copia su
// disco (l'utente li mette dove vuole, es. una cartella "Mazzi Personalizzati/") e di rimetterli
// su un altro browser/dispositivo. Nessun server: Blob download + <input type=file> lato UI.

const MARCATORE_MAZZO = "worldloom_mazzo"; // file "un mazzo"
const MARCATORE_BUNDLE = "worldloom_mazzi"; // file "tutti i mazzi"
const VERSIONE_EXPORT = 1;

// Solo i campi di CONTENUTO: id e date si rigenerano all'import (id nuovo => nessuna collisione).
function mazzoPortabile(m) {
  return {
    nome: m.nome,
    worldloom: Array.isArray(m.worldloom) ? m.worldloom : [],
    imprevisti: Array.isArray(m.imprevisti) ? m.imprevisti : [],
    sfondoCampo: m.sfondoCampo ?? null,
    icona: m.icona ?? null,
  };
}

export function esportaMazzo(id) {
  const m = ottieniMazzo(id);
  if (!m) return null;
  return { [MARCATORE_MAZZO]: VERSIONE_EXPORT, ...mazzoPortabile(m) };
}

export function esportaTuttiIMazzi() {
  return { [MARCATORE_BUNDLE]: VERSIONE_EXPORT, mazzi: leggiTutti().map(mazzoPortabile) };
}

// Se esiste già un mazzo con quel nome, appende " (importato)" (poi " (importato 2)", ...).
function nomeUnico(nome) {
  const esistenti = new Set(leggiTutti().map((m) => m.nome));
  if (!esistenti.has(nome)) return nome;
  let candidato = `${nome} (importato)`;
  let i = 2;
  while (esistenti.has(candidato)) candidato = `${nome} (importato ${i++})`;
  return candidato;
}

function importaUno(portabile) {
  if (!portabile || typeof portabile.nome !== "string") return null;
  return salvaMazzo({
    id: nuovoId(),
    nome: nomeUnico(portabile.nome),
    worldloom: Array.isArray(portabile.worldloom) ? portabile.worldloom : [],
    imprevisti: Array.isArray(portabile.imprevisti) ? portabile.imprevisti : [],
    sfondoCampo: portabile.sfondoCampo ?? null,
    icona: portabile.icona ?? null,
    creatoIl: Date.now(),
    modificatoIl: Date.now(),
  });
}

// Accetta sia il formato "un mazzo" sia il bundle "tutti i mazzi". null = file non riconosciuto.
export function importaMazzi(oggetto) {
  if (!oggetto || typeof oggetto !== "object") return null;
  let portabili;
  if (oggetto[MARCATORE_MAZZO]) portabili = [oggetto];
  else if (oggetto[MARCATORE_BUNDLE] && Array.isArray(oggetto.mazzi)) portabili = oggetto.mazzi;
  else return null;
  const nomi = [];
  for (const p of portabili) {
    const salvato = importaUno(p);
    if (salvato) nomi.push(salvato.nome);
  }
  return nomi.length ? { importati: nomi.length, nomi } : null;
}
