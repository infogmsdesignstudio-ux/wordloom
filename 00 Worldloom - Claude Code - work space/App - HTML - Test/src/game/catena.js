// Motore generico della "catena di effetti a cascata": ogni carta che si attiva entra come "frame"
// in cima a una pila invece di applicare subito il suo effetto reale. Funziona come la priorità di
// una pila in stile TCG: chi ha appena aggiunto un frame la mantiene (può incatenare un'altra
// propria carta subito); quando la passa, tocca all'altro giocatore. Quando ENTRAMBI passano di
// seguito senza aggiungere nulla, il frame in cima si risolve (il chiamante ne applica l'effetto
// reale) e si toglie dalla pila — poi la priorità torna al proprietario del frame rimasto in cima
// (se la pila non è vuota) o la "finestra" si chiude (pila vuota: nessuno ha aggiunto nulla, si
// prosegue con l'azione originale come se la catena non ci fosse mai stata).
//
// Questo modulo è deliberatamente "puro" (nessuna dipendenza da gameReducer.js, nessuna conoscenza
// di cosa sia una carta o un effetto): gestisce solo l'ORDINE di risoluzione e la priorità. La
// logica di dominio (cosa fa realmente un frame quando si risolve, es. un annullamento che toglie
// anche il frame sottostante) resta a chi chiama, agendo su catena.frames dopo rimuoviFrameInCima.
//
// Uso tipico da chi chiama (es. un punto di attivazione nel combattimento):
//   apriPriorita(catena, "avversario")       // si apre la finestra, tocca prima a chi ha agito
//   ...poi ripetutamente, finché passa(...) non ritorna true:
//   aggiungiFrame(catena, {...})             // se il giocatore con priorità sceglie di aggiungere
//   passa(catena, chiave)                    // se il giocatore con priorità sceglie di non aggiungere
//   ...quando passa(...) ritorna true:
//   if (catenaVuota(catena)) { /* nessuno ha aggiunto nulla: prosegui l'azione originale */ }
//   else { const frame = rimuoviFrameInCima(catena); /* applica l'effetto reale di frame */ }
//
// Forma di un frame (documentazione, non un tipo imposto da questo modulo):
// { id, tipo, proprietario: "io" | "avversario", cartaNome, datiRisoluzione: {...} }

function altroGiocatore(chiave) {
  return chiave === "io" ? "avversario" : "io";
}

export function nuovaCatena() {
  return { frames: [], turnoDiPriorita: null, passatiConsecutivi: 0, prossimoId: 1 };
}

export function catenaVuota(catena) {
  return catena.frames.length === 0;
}

// Apre (o riapre) la priorità per una finestra: chi la riceve per primo può aggiungere una carta o
// passare. Va chiamata prima di qualunque aggiungiFrame/passa, anche se la pila è ancora vuota.
export function apriPriorita(catena, chiave) {
  catena.turnoDiPriorita = chiave;
  catena.passatiConsecutivi = 0;
}

// Aggiunge un frame in cima alla pila: il suo proprietario mantiene la priorità (può ancora
// incatenare). Permesso solo se tocca già a lui la priorità (richiede apriPriorita prima, anche a
// pila vuota). Ritorna il frame con l'id assegnato, oppure null se l'aggiunta non è permessa ora.
export function aggiungiFrame(catena, frame) {
  if (catena.turnoDiPriorita !== frame.proprietario) return null;
  const frameConId = { ...frame, id: catena.prossimoId };
  catena.prossimoId += 1;
  catena.frames.push(frameConId);
  catena.turnoDiPriorita = frameConId.proprietario;
  catena.passatiConsecutivi = 0;
  return frameConId;
}

// Il giocatore con la priorità decide di non aggiungere altro: passa la mano. Funziona anche a pila
// vuota (fase di apertura finestra). Ritorna true se dopo questo "passa" bisogna decidere cosa fare:
// pila vuota → la finestra si chiude, prosegui l'azione originale; pila piena → il frame in cima è
// pronto per essere risolto con rimuoviFrameInCima.
export function passa(catena, chiave) {
  if (catena.turnoDiPriorita !== chiave) return false;
  catena.passatiConsecutivi += 1;
  catena.turnoDiPriorita = altroGiocatore(chiave);
  return catena.passatiConsecutivi >= 2;
}

// Toglie e ritorna il frame in cima, pronto perché il chiamante ne applichi l'effetto reale. Dopo
// la risoluzione, se resta ancora una pila, il proprietario del NUOVO frame in cima riprende la
// priorità (può decidere se lasciarlo risolvere o incatenare ancora); altrimenti la priorità si
// azzera (la finestra è chiusa per davvero, tutto risolto).
export function rimuoviFrameInCima(catena) {
  const frame = catena.frames.pop();
  catena.passatiConsecutivi = 0;
  const prossimo = catena.frames[catena.frames.length - 1];
  catena.turnoDiPriorita = prossimo ? prossimo.proprietario : null;
  return frame;
}
