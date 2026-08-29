import { MAZZI } from "./mazzi-registry.js";

// Incorpora nel bundle tutti i cards.json presenti in src/data/generated/mazzi/*
// (scritti da scripts/sync-data.mjs). Bundlato a build time: nessun fetch a runtime,
// cosi' il gioco funziona anche aperto come file singolo, senza server.
const moduliCarte = import.meta.glob("./generated/mazzi/*/cards.json", { eager: true });

// Le Complete cards (JPEG gia' impaginati con illustrazione, nome e statistiche — JPEG e non PNG
// perche' sono foto/illustrazioni: pesano una frazione e tengono il file di gioco leggero anche
// su mobile) sono bundlate allo stesso modo e incorporate come data URI dal build a file singolo.
const moduliImmagini = import.meta.glob("./generated/mazzi/*/complete-cards/*.jpg", {
  eager: true,
  import: "default",
});

// Sfondi campo di battaglia (cap. editor mazzi, richiesta esplicita dell'utente): immagini
// ambientate nel mondo del mazzo, caricate a mano da "Sfondo Campo/" dentro la cartella del mondo
// (sync-data.mjs le copia qui). A differenza delle Complete cards, qui NON serve un fallback
// cross-mondo: uno sfondo scelto è sempre "<mazzoId>/<nomeFile>" esatto, mai cercato altrove.
const moduliSfondi = import.meta.glob("./generated/mazzi/*/sfondo-campo/*.{svg,jpg,jpeg,png,webp}", {
  eager: true,
  import: "default",
});

// Elenco di tutti gli sfondi disponibili, per la galleria dell'editor mazzi — {mazzoId, nomeMondo,
// file, url}. L'ordine segue MAZZI (Frost Land poi Kepler), poi il nome del file.
export function getSfondiCampoDisponibili() {
  const risultato = [];
  for (const m of MAZZI) {
    const prefisso = `./generated/mazzi/${m.id}/sfondo-campo/`;
    const file = Object.keys(moduliSfondi)
      .filter((k) => k.startsWith(prefisso))
      .map((k) => k.slice(prefisso.length))
      .sort();
    file.forEach((f) => risultato.push({ mazzoId: m.id, nomeMondo: m.nome, file: f, url: moduliSfondi[`${prefisso}${f}`] }));
  }
  return risultato;
}

// Risolve {mazzoId, file} nell'url reale (data URI nel build a file singolo), o null se non trovato
// (es. l'immagine scelta è stata rimossa dalla cartella sorgente dopo il salvataggio del mazzo).
export function getSfondoCampoUrl(rif) {
  if (!rif?.mazzoId || !rif?.file) return null;
  return moduliSfondi[`./generated/mazzi/${rif.mazzoId}/sfondo-campo/${rif.file}`] ?? null;
}

function nomeFileCarta(nomeCarta) {
  return nomeCarta.toLowerCase().replaceAll(" ", "-").replaceAll("'", "") + ".jpg";
}

function cartePerMazzo(mazzoId) {
  const modulo = moduliCarte[`./generated/mazzi/${mazzoId}/cards.json`];
  return modulo?.default ?? null;
}

export function getMazziIndex() {
  return MAZZI.map((m) => ({ ...m, disponibile: cartePerMazzo(m.id) !== null }));
}

export function getMazzo(mazzoId) {
  return mazzoId ? cartePerMazzo(mazzoId) : null;
}

// Restituisce l'URL (data URI nel build a file singolo) della Complete card di una carta, oppure
// null se per quella carta non esiste ancora un'illustrazione. mazzoId (opzionale) è solo una
// PREFERENZA di ricerca, non un vincolo: se la carta non si trova lì, si cerca negli altri mondi
// disponibili — necessario per i mazzi misti (cap. editor mazzi "lista unica"), dove una carta di
// un giocatore può provenire da un mondo diverso da quello mostrato in UI per lui. Sicuro perché
// verificato che le carte condivise tra mondi (es. "Aura di Marbion") hanno la STESSA immagine
// (hash identico) in ogni cartella dove compaiono — nessuna ambiguità su quale mostrare.
export function getImmagineCarta(mazzoId, nomeCarta) {
  if (!nomeCarta) return null;
  const nomeFile = nomeFileCarta(nomeCarta);
  if (mazzoId) {
    const trovata = moduliImmagini[`./generated/mazzi/${mazzoId}/complete-cards/${nomeFile}`];
    if (trovata) return trovata;
  }
  for (const m of MAZZI) {
    if (m.id === mazzoId) continue; // già provato sopra
    const trovata = moduliImmagini[`./generated/mazzi/${m.id}/complete-cards/${nomeFile}`];
    if (trovata) return trovata;
  }
  return null;
}

// Catalogo universale (cap. editor mazzi "lista unica"): unisce le carte di TUTTI i mondi
// disponibili in un'unica lista, deduplicata per nome — verificato che le carte condivise tra
// mondi (Magie/Trappole/Imprevisti "neutrali", presenti in entrambi gli Excel) hanno dati
// identici (copie, effetto, ecc.), quindi diventare una sola voce non perde né altera nulla.
// Ogni carta porta anche `mondi`: l'elenco degli id-mondo in cui compare, per il filtro "Mondo"
// dell'editor. Un mazzo composto da questo catalogo può quindi mescolare mondi e Archetipi liberamente.
export function getCatalogoUniversale() {
  const mondiDisponibili = getMazziIndex().filter((m) => m.disponibile);
  const carte = new Map();
  const imprevisti = new Map();
  for (const m of mondiDisponibili) {
    const dati = cartePerMazzo(m.id);
    if (!dati) continue;
    // Chiave = identita' della carta (nome + variante illustrazione + rarita' + finitura), non piu'
    // il solo nome: la stampa Normale e la Rainbow della stessa carta sono due pezzi distinti e
    // devono restare due voci separate nel catalogo. Le carte generate prima di questa modifica non
    // hanno `id`: si ricade sul nome, cosi' un cards.json non rigenerato continua a funzionare.
    dati.carte.forEach((c) => {
      const chiave = c.id ?? c.nome;
      const esistente = carte.get(chiave);
      if (esistente) esistente.mondi.push(m.id);
      else carte.set(chiave, { ...c, mondi: [m.id] });
    });
    (dati.imprevisti ?? []).forEach((c) => {
      const chiave = c.id ?? c.nome;
      const esistente = imprevisti.get(chiave);
      if (esistente) esistente.mondi.push(m.id);
      else imprevisti.set(chiave, { ...c, mondi: [m.id] });
    });
  }
  return { carte: [...carte.values()], imprevisti: [...imprevisti.values()] };
}
