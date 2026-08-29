// Selettori di sola lettura sulla coda di step unica (idea 59, Fase 1).
//
// s.sequenza è UN array ordinato di passi; s.sequenza[0] è quello "in scena" adesso. Ogni passo:
//   { id, tipo: "anim" | "scelta" | "muta", nome, dati, durataMs? , attende? }
//
// Fase 1: il COMBATTIMENTO (dado, balzo, numero di danno, morte). Fase 2: la CATENA (scelta:catena,
// muta:catenaRisoluzione). Fase 3: i tre VOLI (anim:pesca, anim:evoca, anim:sposta). Il dado
// Imprevisti, le notifiche, VfxMagia, l'Imboscata e il danno diretto restano su s.codaVisiva e
// girano DOPO che s.sequenza è vuota. Questi selettori ricostruiscono la forma degli ex-campi
// (s.animazioneAttacco, s.esitoCombattimento, s.pescaInCorso, …) a partire dal passo in scena, così
// i componenti che li leggevano cambiano una riga sola.

export function passoInScena(s) {
  return s?.sequenza?.[0] ?? null;
}

// true finché la fila non è vuota — sostituisce le vecchie guardie sparse
// dadoInCorso/esitoInCorso/idBalzoRichiesto/idDadoRichiesto per il combattimento.
export function filaOccupata(s) {
  return (s?.sequenza?.length ?? 0) > 0;
}

// Passo "scelta" in scena (Difendi/incassa, Diritto di ripetizione): { id, nome, attende, dati }.
export function sceltaInScena(s) {
  const p = passoInScena(s);
  return p?.tipo === "scelta" ? p : null;
}

// Passo "scelta" nome:"catena" (idea 59 Fase 2): la finestra di decisione della catena — il
// giocatore con la priorità aggiunge una carta eleggibile (tap sul campo) o passa/risolve.
// Esiste in fila SOLO quando la priorità tocca a un umano (l'IA la risolve inline in avanzaCatena).
export function sceltaCatenaInScena(s) {
  const p = passoInScena(s);
  return p?.nome === "catena" ? { id: p.id, ...p.dati } : null;
}

// Passo "muta" nome:"catenaRisoluzione" (idea 59 Fase 2): scenografia di risoluzione di un frame
// (numero d'ordine LIFO + linea di connessione al bersaglio). Ex s.catenaRisoluzioneInCorso —
// stessa forma: { id, frameId, cartaNome, proprietario, ordine, bersaglio, esito }.
export function catenaRisoluzioneInScena(s) {
  const p = passoInScena(s);
  return p?.nome === "catenaRisoluzione" ? { id: p.id, ...p.dati } : null;
}

// --- Fase 3: i tre voli ------------------------------------------------------------------------

// Passo "anim" nome:"pesca" (idea 59 Fase 3): volo di una pescata. Ex s.pescaInCorso — stessa forma
// { id, chiave, carte: [{uid,nome,tipoCarta}] }. Solo il passo IN SCENA; per nascondere in mano le
// carte di TUTTI i passi pesca ancora in fila (prima mano turno 1 = N passi da 1 carta) usa
// uidInVoloPesca.
export function pescaInScena(s) {
  const p = passoInScena(s);
  return p?.nome === "pesca" ? { id: p.id, ...p.dati } : null;
}

// Insieme degli _uid di tutte le carte ancora in volo di pescata (qualunque passo nome:"pesca" in
// s.sequenza, non solo il primo) — filtrabile per seme. null se nessuna. Serve a Mano.jsx: durante
// la prima mano (N passi da 1 carta) le carte non ancora atterrate restano invisibili in mano.
export function uidInVoloPesca(s, chiave) {
  const set = new Set();
  for (const p of s?.sequenza ?? []) {
    if (p?.nome === "pesca" && (!chiave || p.dati?.chiave === chiave)) {
      for (const c of p.dati?.carte ?? []) set.add(c.uid);
    }
  }
  return set.size ? set : null;
}

// Passo "anim" nome:"evoca" (idea 59 Fase 3). Ex s.evocazioneInCorso —
// { id, chiave, creaturaId, nome, sorgenteRect }.
export function evocaInScena(s) {
  const p = passoInScena(s);
  return p?.nome === "evoca" ? { id: p.id, ...p.dati } : null;
}

// Passo "anim" nome:"sposta" (idea 59 Fase 3). Ex s.movimentiInCorso —
// { id, chiave, movimenti: [{creaturaId,nome,direzione,sorgenteRect}] }.
export function spostaInScena(s) {
  const p = passoInScena(s);
  return p?.nome === "sposta" ? { id: p.id, ...p.dati } : null;
}

// Ex s.lancioDado per il dado di COMBATTIMENTO (il dado Imprevisti resta su s.lancioDado via coda).
export function dadoInScena(s) {
  const p = passoInScena(s);
  return p?.nome === "dado" ? { id: p.id, tipo: "archetipo", ...p.dati } : null;
}

// Ex s.animazioneAttacco: { id, attaccanteId, difensoreId, proprietario }.
export function balzoInScena(s) {
  const p = passoInScena(s);
  return p?.nome === "balzo" ? { id: p.id, ...p.dati } : null;
}

// Ex s.esitoCombattimento: { id, eventi: [{ creaturaId, tipo, valore }] }.
export function esitoInScena(s) {
  const p = passoInScena(s);
  return p?.nome === "danno" ? { id: p.id, ...p.dati } : null;
}

// Ex s.morteInCorso per la morte in COMBATTIMENTO (l'Imboscata Trappola resta su s.morteInCorso):
// { id, attProprietario, difProprietario, morti: [{ creaturaId, nome, chiave }] }.
export function morteInScena(s) {
  const p = passoInScena(s);
  return p?.nome === "morte" ? { id: p.id, ...p.dati } : null;
}

// --- Fase 4: il turno IA -----------------------------------------------------------------------

// Passo "muta" nome:"ia" in scena (idea 59 Fase 4): il "respiro" prima della prossima mossa
// dell'avversario. Ex campo s.iaInAttesa ("evoca" | "attacca"), RITIRATO — stessa informazione,
// ora dentro la fila: { id, azione }. Lo legge App.jsx per il testo "L'avversario evoca…" /
// "L'avversario sta per attaccare…", e il <Sequenziatore> per il timeout del respiro.
export function passoIaInScena(s) {
  const p = passoInScena(s);
  return p?.nome === "ia" ? { id: p.id, ...p.dati } : null;
}

// --- Fase 5: i banner di fase -------------------------------------------------------------------

// Passo "banner" in scena (idea 59 Fase 5): il cartello che annuncia una fase al centro del campo.
// { id, chiave, fase } — chiave è il seme di CHI sta giocando quella fase (serve alla riga di
// attribuzione "IL TUO TURNO"/"TURNO AVVERSARIO"), fase è 1..5 dove 5 = Vespro, che non esiste come
// valore di s.fase (il turno passa da 4 a 0): il Vespro vive solo qui, come dato del passo.
// Il banner porta con sé di chi era la fase apposta: durante il Vespro lo stato ha GIÀ girato il
// turno (fineTurno e iniziaTurno girano nella stessa dispatch), quindi leggere s.giocatoreAttivo
// darebbe l'attribuzione sbagliata.
export function bannerInScena(s) {
  const p = passoInScena(s);
  return p?.tipo === "banner" ? { id: p.id, ...p.dati } : null;
}

// --- Le due guardie del pacing (idea 59 Fase 4) -------------------------------------------------
// Sono una il rovescio dell'altra e vivono qui, non inline nei componenti, proprio perché devono
// restare coerenti: se entrambe bloccassero nello stesso istante, il turno IA si fermerebbe per
// sempre (deadlock reale, trovato nella verifica dal vivo della Fase 4 e blindato in
// Engine/test-blindati/turno-ia.blindato.mjs).

// App.jsx — lo scorrimento di s.codaVisiva si ferma finché la fila ha una SCENOGRAFIA in ballo
// (anim/muta/banner) in qualunque posizione: s.sequenza è il master. ECCEZIONE: il passo muta:"ia"
// non è scenografia ma respiro, e non blocca — è il momento in cui la coda deve mostrare ciò che è
// appena successo (numero del danno diretto, notifiche). Un passo "scelta" da solo non blocca mai.
//
// Idea 59 Fase 5: il tipo "banner" entra qui come i primi due, e SERVE che ci entri — il banner
// "Vaticinio" deve stare davanti al dado Imprevisti, che vive ancora in codaVisiva. Non riapre il
// deadlock della Fase 4 perché quella guardia era BIdirezionale (il passo "ia" bloccava la coda E
// aspettava la coda): un "banner" blocca la coda ma non dipende mai da lei — nel <Sequenziatore>
// prende un timer semplice, non passa da scenaLiberaPerIa. Quindi drena sempre.
export function filaBloccaCodaVisiva(s) {
  return (s?.sequenza ?? []).some(
    (p) => (p?.tipo === "anim" || p?.tipo === "muta" || p?.tipo === "banner") && p?.nome !== "ia"
  );
}

// <Sequenziatore> — il respiro muta:"ia" non scade finché la scena non è libera: sono i flussi non
// ancora migrati alla fila (coda visiva, notifica, dado Imprevisti, Imboscata) più le due decisioni
// umane fuori fila. Sostituisce in UN posto solo l'ex `iaBloccataDaPrompt` di App.jsx (OR di 8
// condizioni) + il suo useEffect + il campo s.iaInAttesa + la dispatch "avanza-ia".
export function scenaLiberaPerIa(s) {
  return (
    !s?.notificaEffetto &&
    !s?.morteInCorso && // Imboscata (Trappola): flusso non ancora migrato alla fila
    !s?.dadoInCorso && // dado IMPREVISTI ancora in rotazione
    !(s?.codaVisiva?.length) &&
    !s?.combattimento && // uno scontro aspetta una dispatch del giocatore (bersaglio / Trappola)
    !s?.avanzamentoRichiesto
  );
}

// true se un passo del turno IA è già in fila (in QUALUNQUE posizione, non solo in testa).
// Guardia anti-doppione: proseguiSeIA può essere chiamata più volte nella risoluzione di un solo
// scontro (risolviDannoCombattimento, eseguiMortiCombattimento, risolviAvanzamento…) e non deve
// accodare due respiri per la stessa mossa. Ex idempotenza implicita di `s.iaInAttesa = "attacca"`.
export function haPassoIa(s) {
  return (s?.sequenza ?? []).some((p) => p?.nome === "ia");
}
