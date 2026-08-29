import { espandiListaMazzo, limiteCopieCarta, WORLDLOOM_MAX } from "./mazziSalvati.js";

let ultimoId = 0;

export function prossimoId() {
  return ++ultimoId;
}

// Cap. sistema di salvataggio: il contatore riparte da 0 ad ogni apertura dell'app. Dopo aver
// ripristinato una partita salvata (le cui carte portano id/_uid della sessione PRECEDENTE, anche
// alti), una nuova carta pescata dopo il ripristino otterrebbe altrimenti un id basso — potendo
// collidere con uno già presente nel salvataggio (es. id 3 riassegnato mentre una carta con id 3
// esiste già in mano). Va chiamata una sola volta, subito dopo aver letto lo stato salvato, con il
// massimo id/_uid trovato al suo interno: sposta in avanti il contatore, mai indietro.
export function garantisciContatoreIdAlmeno(minimo) {
  if (minimo > ultimoId) ultimoId = minimo;
}

// Espande ogni carta per il numero di copie e mescola. Ogni copia è un oggetto distinto con un
// _uid stabile (non condiviso tra le copie): serve a React per riconoscere "questa è una carta
// appena pescata" e animarla, invece di scambiarla per una già in mano che ha solo cambiato indice.
// listaWorldloom (opzionale, cap. editor mazzi): lista {nome, quantita} di un mazzo salvato — se
// assente, comportamento invariato di sempre ("mazzo intero", tutta la collezione dell'archetipo).
export function costruisciMazzo(cardsData, listaWorldloom) {
  const carte = listaWorldloom
    ? espandiListaMazzo(cardsData, listaWorldloom, "worldloom")
    : espandiCollezioneIntera(cardsData.carte);
  return mescola(carte.map((carta) => ({ ...carta, _uid: prossimoId() })));
}

// Mazzetto Imprevisti, separato dal Worldloom (cap. 15). Stesso principio: listaImprevisti
// opzionale, assente = mazzetto intero come sempre.
export function costruisciMazzettoImprevisti(cardsData, listaImprevisti) {
  const carte = listaImprevisti
    ? espandiListaMazzo(cardsData, listaImprevisti, "imprevisti")
    : espandiCollezioneIntera(cardsData.imprevisti ?? [], "imprevisti");
  return mescola(carte);
}

// Mazzo di default (nessun mazzo salvato scelto): prima era "tutta la collezione", cioè 125 copie su
// Frost Land e 155 su Marbion — due volte e mezzo il massimo di 60 che l'editor mazzi fa già
// rispettare. Segnalato dall'utente il 2026-08-29 ("ho 116 carte, il regolamento dice massimo 60").
// Ora pesca un mazzo LEGALE dalla collezione: stesse regole dell'editor (limite di copie per carta,
// eccezione della colonna "Limite Copie" inclusa) e tetto a WORLDLOOM_MAX. Le carte sono prese in
// ordine mescolato, così due partite di fila non hanno lo stesso identico mazzo.
// Il mazzetto Imprevisti resta intero: il cap. 15 gli dà un minimo (10), non un massimo.
function espandiCollezioneIntera(carte, tipoMazzetto = "worldloom") {
  const pool = [];
  carte.forEach((carta) => {
    const limite = tipoMazzetto === "worldloom" ? limiteCopieCarta(carta, tipoMazzetto) : carta.copie;
    for (let i = 0; i < limite; i++) pool.push(carta);
  });
  if (tipoMazzetto !== "worldloom") return pool;
  return mescola(pool).slice(0, WORLDLOOM_MAX);
}

function mescola(array) {
  const a = array.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Istanza in campo di una carta: alle statistiche di base si aggiunge lo stato di partita.
export function creaCreatura(carta) {
  return {
    id: prossimoId(),
    nome: carta.nome,
    archetipo: carta.archetipo,
    livello: carta.livello,
    ruolo: carta.ruolo,
    vitaMax: carta.vita,
    attaccoBase: carta.attacco,
    parataBase: carta.parata,
    attaccoOriginale: carta.attacco, // stampato in carta, per capire in UI se un Potenziamento l'ha alterato (cap. colori stat)
    parataOriginale: carta.parata,
    attacchiTotali: carta.attacchi,
    effetto: carta.effetto,
    danno: 0,
    attacchiUsati: 0,
    fresca: true,
    tmpAttacco: 0, // bonus temporanei (es. effetto di ruolo Aggressore), azzerati a fine turno
    tmpParata: 0,
    dirittoUsatoContro: {}, // { [idDifensore]: true } — diritto di ripetizione, per turno
    schivateSubite: {}, // { [idAttaccante]: numero } — per l'effetto di ruolo Evasivo
  };
}

export function vitaAttuale(creatura) {
  return creatura.vitaMax - creatura.danno;
}

export function attaccoEffettivo(creatura) {
  return Math.max(0, creatura.attaccoBase + creatura.tmpAttacco);
}

export function parataEffettiva(creatura) {
  return Math.max(0, creatura.parataBase + creatura.tmpParata);
}

export function viva(creatura) {
  return vitaAttuale(creatura) > 0;
}
