/* ═══════════════════════════════════════════════════════════════════════════
   ACCESSO FINTO — banco di prova per sviluppare l'interfaccia dell'area personale.

   ⚠️  QUESTO NON È UN SISTEMA DI SICUREZZA E NON PROTEGGE NULLA.
   Le credenziali stanno scritte qui sotto in chiaro: chiunque apra questo file
   dal browser le legge. Serve solo a poter costruire e provare le schermate del
   "dopo il login" mentre il sito è in locale. Prima di pubblicare va sostituito
   da un'autenticazione vera lato server.
   ═══════════════════════════════════════════════════════════════════════════ */

/* Credenziali di prova. Per cambiarle basta questa riga.
   "giaocomo" è accettato perché è la scrittura arrivata nella richiesta: se era
   un refuso, va bene lo stesso; se era voluta, funziona. */
export const UTENTE_DI_PROVA = {
  nome: "giacomo",
  password: ["giacomo", "giaocomo"],
};

const CHIAVE = "worldloom-accesso-finto";

export function credenzialiValide(nome, password) {
  return (
    String(nome).trim().toLowerCase() === UTENTE_DI_PROVA.nome &&
    UTENTE_DI_PROVA.password.includes(String(password).trim().toLowerCase())
  );
}

/* sessionStorage e non localStorage: la finta sessione muore chiudendo la scheda,
   che per un banco di prova è il comportamento più comodo. */
export function entra(nome) {
  try {
    sessionStorage.setItem(CHIAVE, JSON.stringify({ nome, dal: Date.now() }));
  } catch {
    /* finestra anonima o storage negato: si prosegue lo stesso, la prova serve
       a vedere le schermate, non a ricordarsi chi sei */
  }
}

export function sessione() {
  try {
    return JSON.parse(sessionStorage.getItem(CHIAVE) || "null");
  } catch {
    return null;
  }
}

export function esci() {
  try {
    sessionStorage.removeItem(CHIAVE);
  } catch {
    /* niente da rimuovere */
  }
}

/* Manda alla pagina di accesso chi arriva sull'area personale senza sessione. */
export function richiediAccesso() {
  if (!sessione()) {
    location.replace("account.html?accesso=richiesto");
    return false;
  }
  return true;
}
