/* Area personale: schermate del "dopo il login", su dati finti.
   Serve a sviluppare l'interfaccia, non a gestire una collezione vera. */

import { sessione, esci, richiediAccesso } from "./accesso.js";

if (richiediAccesso()) {
  const utente = sessione();

  document
    .querySelectorAll("#saluto, #saluto-2")
    .forEach((e) => (e.textContent = utente.nome));

  const uscita = document.querySelector("#esci");
  if (uscita) {
    uscita.addEventListener("click", () => {
      esci();
      location.href = "index.html";
    });
  }

  /* ── Collezione finta, tenuta in memoria per la durata della scheda ── */
  const collezione = [
    { nome: "Il Re Antico", mazzo: "Frost Land", copie: 1 },
    { nome: "Guardiano Glaciale", mazzo: "Frost Land", copie: 2 },
    { nome: "Cavaliere di Marbion", mazzo: "Kepler-452B", copie: 1 },
  ];

  const elenco = document.querySelector("#collezione");
  const contatore = document.querySelector("#contatore");

  function disegnaCollezione() {
    if (!elenco) return;
    elenco.innerHTML = collezione
      .map(
        (c) => `<li class="riga">
          <span class="riga-nome">${c.nome}</span>
          <span class="riga-meta">${c.mazzo}</span>
          <span class="riga-valore">×${c.copie}</span>
        </li>`
      )
      .join("");
    if (contatore) {
      const totale = collezione.reduce((n, c) => n + c.copie, 0);
      contatore.textContent = `${totale} carte · ${collezione.length} diverse`;
    }
  }

  disegnaCollezione();

  const aggiungi = document.querySelector("#aggiungi-carta");
  if (aggiungi) {
    aggiungi.addEventListener("submit", (e) => {
      e.preventDefault();
      const campo = aggiungi.querySelector("input");
      const nome = campo.value.trim();
      if (!nome) return;
      const gia = collezione.find((c) => c.nome.toLowerCase() === nome.toLowerCase());
      if (gia) gia.copie += 1;
      else collezione.push({ nome, mazzo: "Da riconoscere", copie: 1 });
      campo.value = "";
      disegnaCollezione();
      const esito = aggiungi.parentElement.querySelector(".esito");
      if (esito) esito.classList.add("visibile");
    });
  }
}
