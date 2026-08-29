/* Galleria carte: dati da assets/data/carte.json (generato da sync-carte.mjs).
   Click su una carta → gira e si apre la scheda con statistiche ed effetto. */

import { creaCartaFoil, attivaFoil } from "./sito.js";

const galleria = document.querySelector("#galleria");
const conteggio = document.querySelector("#conteggio");
const velo = document.querySelector("#velo");
const cerca = document.querySelector("#cerca");

let tutte = [];
const filtri = { mazzo: "tutti", tipo: "tutti", finitura: "tutte", testo: "" };

/* Scorciatoie dal menu: carte.html?mazzo=frost-land, ?finitura=foil … */
const parametri = new URLSearchParams(location.search);
for (const gruppo of ["mazzo", "tipo", "finitura"]) {
  const valore = parametri.get(gruppo);
  if (!valore) continue;
  const chip = document.querySelector(`.chip[data-gruppo="${gruppo}"][data-valore="${valore}"]`);
  if (chip) {
    filtri[gruppo] = valore;
    document
      .querySelectorAll(`.chip[data-gruppo="${gruppo}"]`)
      .forEach((c) => c.setAttribute("aria-pressed", String(c === chip)));
  }
}

const ETICHETTE_TIPO = {
  alieno: "Pedina",
  magia: "Magia",
  trappola: "Trappola",
  terreno: "Terreno",
  imprevisto: "Imprevisto",
};

function etichettaTipo(t) {
  return ETICHETTE_TIPO[t] ?? (t ? t[0].toUpperCase() + t.slice(1) : "—");
}

/* ── Filtro ──────────────────────────────────────────────────────────── */

function filtrate() {
  const q = filtri.testo.trim().toLowerCase();
  return tutte.filter((c) => {
    if (filtri.mazzo !== "tutti" && c.mazzo !== filtri.mazzo) return false;
    if (filtri.tipo !== "tutti" && c.tipoCarta !== filtri.tipo) return false;
    if (filtri.finitura === "foil" && !c.foil) return false;
    if (filtri.finitura === "normale" && c.foil) return false;
    if (q) {
      const cercabile = [c.nome, c.effetto, c.archetipo, c.ruolo].filter(Boolean).join(" ").toLowerCase();
      if (!cercabile.includes(q)) return false;
    }
    return true;
  });
}

function disegna() {
  const elenco = filtrate();
  galleria.innerHTML = "";

  if (!elenco.length) {
    /* Caso frequente e spiegabile: le stampe Rainbow segnate negli Excel sono carte
       la cui illustrazione non è ancora stata composta, quindi non entrano in galleria. */
    galleria.innerHTML =
      filtri.finitura === "foil"
        ? `<p class="vuoto">Le stampe Rainbow compariranno qui da sole appena le loro
             illustrazioni saranno pronte.</p>`
        : `<p class="vuoto">Prova con un'altra combinazione di filtri: qui si vedono
             le carte che corrispondono a tutti quelli attivi.</p>`;
    conteggio.textContent = "";
    return;
  }

  const foil = elenco.filter((c) => c.foil).length;
  conteggio.textContent =
    `${elenco.length} carte su ${tutte.length}` + (foil ? ` · ${foil} in Rainbow` : "");

  const frammento = document.createDocumentFragment();
  elenco.forEach((c) => {
    const cella = document.createElement("button");
    cella.className = "cella";
    cella.type = "button";
    cella.setAttribute("aria-label", `${c.nome} — apri la scheda`);

    if (c.immagine) {
      const { scena } = creaCartaFoil(c.immagine, c.nome, c.foil, c.finitura);
      cella.appendChild(scena);
    }

    const nome = document.createElement("div");
    nome.className = "cella-nome";
    nome.textContent = c.nome;

    const meta = document.createElement("div");
    meta.className = "cella-meta";
    meta.innerHTML = `<span class="pallino pallino-${c.mazzo}"></span>${etichettaTipo(c.tipoCarta)}${
      c.archetipo ? ` · ${c.archetipo}` : ""
    }${c.foil ? ` · <span style="color:var(--oro)">${c.finitura}</span>` : ""}`;

    cella.append(nome, meta);
    cella.addEventListener("click", () => apriScheda(c));
    frammento.appendChild(cella);
  });

  /* Chiude sempre la fila: il mazzo continua a crescere. */
  const altre = document.createElement("div");
  altre.className = "in-arrivo";
  altre.innerHTML = `<span class="in-arrivo-segno">+</span>
    <span class="in-arrivo-testo">Altre carte<br>in arrivo</span>`;
  frammento.appendChild(altre);

  galleria.appendChild(frammento);
}

/* ── Scheda ──────────────────────────────────────────────────────────── */

function statistica(valore, nome) {
  if (valore === null || valore === undefined) return "";
  return `<div class="stat"><div class="stat-valore">${valore}</div><div class="stat-nome">${nome}</div></div>`;
}

function apriScheda(c) {
  const stats = [
    statistica(c.vita, "Vita"),
    statistica(c.attacco, "Attacco"),
    statistica(c.parata, "Parata"),
    statistica(c.attacchi, "Attacchi"),
    statistica(c.livello, "Livello"),
  ]
    .filter(Boolean)
    .join("");

  /* i ruoli arrivano dall'Excel in minuscolo ("tank", "difensore"): si presentano
     con l'iniziale maiuscola senza toccare il dato di origine */
  const maiuscola = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);
  const sotto = [c.mazzoNome, etichettaTipo(c.tipoCarta), c.archetipo, maiuscola(c.ruolo), c.rarita]
    .filter(Boolean)
    .join(" · ");

  /* I crediti (autore + modello) compaiono solo se il dato esiste davvero nei
     file generati dagli Excel. Finché le colonne non ci sono, la riga non si
     stampa: non si inventa un'attribuzione. */
  const righeCredito = [
    c.autore ? `<dt>Illustrazione</dt><dd>${c.autore}</dd>` : "",
    c.finitura ? `<dt>Finitura</dt><dd>${c.finitura}</dd>` : "",
    c.variante && c.variante !== "1" ? `<dt>Variante</dt><dd>${c.variante}</dd>` : "",
  ].filter(Boolean);
  const crediti = righeCredito.length ? `<dl class="crediti">${righeCredito.join("")}</dl>` : "";

  velo.innerHTML = `
    <div class="scheda" role="dialog" aria-modal="true" aria-label="${c.nome}">
      <button class="chiudi" type="button" aria-label="Chiudi">&times;</button>
      <div class="scheda-immagine">
        ${
          c.immagine
            ? `<div class="scena"><div class="carta-foil${c.foil ? " e-foil" : ""}">
                 ${c.foil ? `<span class="bollo-finitura">${c.finitura}</span>` : ""}
                 <img class="carta-base" src="${c.immagine}" alt="${c.nome}">
                 <div class="foil-arcobaleno"></div>
                 <div class="foil-riflesso"></div>
               </div></div>`
            : ""
        }
      </div>
      <div class="scheda-testo">
        <h2>${c.nome}</h2>
        <p class="scheda-sottotitolo">${sotto}</p>
        ${stats ? `<div class="statistiche">${stats}</div>` : ""}
        ${c.effetto ? `<p class="effetto">${c.effetto}</p>` : ""}
        ${crediti}
      </div>
    </div>`;

  velo.classList.add("aperto");
  document.body.style.overflow = "hidden";

  const cartaGrande = velo.querySelector(".carta-foil");
  if (cartaGrande) {
    attivaFoil(cartaGrande);
    /* la carta "gira" appena si apre la scheda: è la risposta visiva al click */
    requestAnimationFrame(() => {
      cartaGrande.classList.add("bascula");
      setTimeout(() => cartaGrande.classList.remove("bascula"), 1800);
    });
  }

  velo.querySelector(".chiudi").focus();
}

function chiudiScheda() {
  velo.classList.remove("aperto");
  velo.innerHTML = "";
  document.body.style.overflow = "";
}

if (velo) {
  velo.addEventListener("click", (e) => {
    if (e.target === velo || e.target.closest(".chiudi")) chiudiScheda();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && velo.classList.contains("aperto")) chiudiScheda();
  });
}

/* ── Controlli ───────────────────────────────────────────────────────── */

document.querySelectorAll(".chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    const gruppo = chip.dataset.gruppo;
    filtri[gruppo] = chip.dataset.valore;
    document
      .querySelectorAll(`.chip[data-gruppo="${gruppo}"]`)
      .forEach((c) => c.setAttribute("aria-pressed", String(c === chip)));
    disegna();
  });
});

if (cerca) {
  cerca.addEventListener("input", () => {
    filtri.testo = cerca.value;
    disegna();
  });
}

/* ── Avvio ───────────────────────────────────────────────────────────── */

fetch("assets/data/carte.json")
  .then((r) => r.json())
  .then((d) => {
    /* L'Excel elenca anche stampe la cui illustrazione non è ancora stata composta:
       in galleria si mostrano solo quelle che un'immagine ce l'hanno davvero. */
    tutte = d.carte.filter((c) => c.immagine);
    disegna();
  })
  .catch(() => {
    galleria.innerHTML = `<p class="vuoto">Non riesco a caricare le carte. Se stai aprendo il file
      direttamente dal disco, servi la cartella con un server locale.</p>`;
  });
