/* Pagina di accesso: valida le credenziali di prova e porta all'area personale.
   Ricordo che l'accesso è finto e non protegge nulla — vedi accesso.js. */

import { credenzialiValide, entra, sessione, esci, UTENTE_DI_PROVA } from "./accesso.js";

const modulo = document.querySelector("#modulo-accesso");
const esitoAccesso = document.querySelector("#esito-accesso");

/* Chi arriva qui rimbalzato dall'area personale merita di sapere perché. */
if (new URLSearchParams(location.search).get("accesso") === "richiesto" && esitoAccesso) {
  esitoAccesso.innerHTML =
    "Per vedere l'area personale serve prima entrare con le credenziali di prova qui sopra.";
  esitoAccesso.classList.add("visibile");
}

/* Se la finta sessione è già aperta, si propone di andare avanti invece di
   richiedere di nuovo le stesse credenziali. */
const gia = sessione();
if (gia && esitoAccesso) {
  esitoAccesso.innerHTML = `Sei già entrato come <strong>${gia.nome}</strong>.
    <a href="area-personale.html">Vai all'area personale</a> oppure
    <button type="button" class="come-collegamento" id="esci-qui">esci</button>.`;
  esitoAccesso.classList.add("visibile");
  const uscita = document.querySelector("#esci-qui");
  if (uscita) {
    uscita.addEventListener("click", () => {
      esci();
      location.reload();
    });
  }
}

if (modulo) {
  modulo.addEventListener("submit", (e) => {
    e.preventDefault();
    const nome = modulo.querySelector('[name="nome"]').value;
    const password = modulo.querySelector('[name="password"]').value;

    if (credenzialiValide(nome, password)) {
      entra(UTENTE_DI_PROVA.nome);
      location.href = "area-personale.html";
      return;
    }

    esitoAccesso.innerHTML = `Quelle credenziali non aprono l'accesso di prova.
      Usa <strong>${UTENTE_DI_PROVA.nome}</strong> come nome e come password.`;
    esitoAccesso.classList.add("visibile");
  });
}
