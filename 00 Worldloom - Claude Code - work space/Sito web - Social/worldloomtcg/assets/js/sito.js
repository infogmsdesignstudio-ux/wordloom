/* Comportamenti comuni a tutte le pagine: testata, menu, comparsa allo scroll, foil.
   Niente framework: è un sito di contenuto. */

import { sessione } from "./accesso.js";

const motoRidotto = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ── Collegamento all'accesso nella testata ──────────────────────────
   A sessione di prova aperta cambia mestiere: porta all'area personale
   e mostra il nome, invece di richiedere di nuovo l'accesso. */
const collegamentoAccesso = document.querySelector(".accedi");
if (collegamentoAccesso) {
  const utente = sessione();
  if (utente) {
    collegamentoAccesso.href = "area-personale.html";
    collegamentoAccesso.textContent = utente.nome;
    collegamentoAccesso.classList.add("dentro");
    collegamentoAccesso.setAttribute("aria-label", `Area personale di ${utente.nome}`);
  }
}

/* ── Menu a tutto schermo ─────────────────────────────────────────────
   L'albero del sito vive QUI, in un posto solo: le dieci pagine non se lo
   duplicano addosso, così aggiungere una voce resta una modifica sola. */

const ALBERO = [
  {
    titolo: "Come si gioca",
    href: "come-si-gioca.html",
    voci: [
      ["Il turno", "come-si-gioca.html#turno"],
      ["Il campo", "come-si-gioca.html#campo"],
      ["Il dado", "come-si-gioca.html#dado"],
      ["Magie e Trappole", "come-si-gioca.html#catene"],
      ["Provarlo", "come-si-gioca.html#provarlo"],
    ],
  },
  {
    titolo: "Com'è nato",
    href: "come-e-nato.html",
    voci: [
      ["Il punto di partenza", "come-e-nato.html#partenza"],
      ["Strategia e fortuna", "come-e-nato.html#strategia"],
      ["Gli Imprevisti", "come-e-nato.html#imprevisti"],
      ["Uno scontro, molti esiti", "come-e-nato.html#scontro"],
      ["La scommessa", "come-e-nato.html#scommessa"],
      ["L'incrocio dei mondi", "come-e-nato.html#incrocio"],
    ],
  },
  {
    titolo: "Store",
    href: "store.html",
    voci: [
      ["Scatola base", "store.html#scatola"],
      ["Mazzi", "store.html#mazzi"],
      ["Bustine", "store.html#bustine"],
      ["Volumi", "store.html#volumi"],
      ["Accessori", "store.html#accessori"],
    ],
  },
  {
    titolo: "Carte",
    href: "carte.html",
    /* scorciatoie che aprono la galleria già filtrata */
    voci: [
      ["Frost Land", "carte.html?mazzo=frost-land"],
      ["Kepler-452B", "carte.html?mazzo=kepler-452b"],
      ["Stampe Rainbow", "carte.html?finitura=foil"],
    ],
  },
  {
    titolo: "Manga",
    href: "manga.html",
    voci: [
      ["L'idea", "manga.html#idea"],
      ["Capitolo 1", "manga.html#capitolo-1"],
      ["Prossimi capitoli", "manga.html#prossimi"],
    ],
  },
  {
    titolo: "Chi siamo",
    href: "chi-siamo.html",
    voci: [
      ["L'ambizione", "chi-siamo.html#ambizione"],
      ["La strada fatta", "chi-siamo.html#strada"],
      ["IA allo scoperto", "ia.html"],
      ["Seguici", "chi-siamo.html#seguici"],
      ["Contatti", "chi-siamo.html#contatti"],
    ],
  },
  { titolo: "Sostieni", href: "sostieni.html" },
];

const tasto = document.querySelector(".menu-tasto");

if (tasto) {
  const navigazione = document.createElement("div");
  navigazione.className = "navigazione";
  navigazione.id = "navigazione";
  navigazione.setAttribute("aria-hidden", "true");
  navigazione.innerHTML = `
    <div class="navigazione-interno">
      <div class="navigazione-testa">
        <a class="marchio" href="index.html" aria-label="Worldloom, vai alla home">
          <img class="marchio-pittogramma" src="assets/img/pittogramma.png" alt="">
          <img class="marchio-testo" src="assets/img/logo-testo.png" alt="Worldloom">
        </a>
        <button class="navigazione-chiudi" type="button">Chiudi &times;</button>
      </div>
      <nav class="nav-griglia" aria-label="Tutte le sezioni">
        ${ALBERO.map(
          (s) => `<div class="nav-sezione">
            <a href="${s.href}">${s.titolo}</a>
            ${
              s.voci
                ? `<ul>${s.voci.map(([t, h]) => `<li><a href="${h}">${t}</a></li>`).join("")}</ul>`
                : ""
            }
          </div>`
        ).join("")}
      </nav>
      <div class="navigazione-piede">
        <a href="ia.html">IA allo scoperto</a>
        <a href="account.html">Il tuo account</a>
        <a href="area-personale.html">Area personale</a>
        <a href="mailto:info@worldloomtcg.com">info@worldloomtcg.com</a>
      </div>
    </div>`;
  document.body.appendChild(navigazione);

  const chiudi = navigazione.querySelector(".navigazione-chiudi");
  let ultimoFocus = null;

  function apriMenu() {
    ultimoFocus = document.activeElement;
    navigazione.classList.add("aperta");
    navigazione.setAttribute("aria-hidden", "false");
    tasto.setAttribute("aria-expanded", "true");
    document.body.style.overflow = "hidden";
    chiudi.focus();
  }

  function chiudiMenu() {
    navigazione.classList.remove("aperta");
    navigazione.setAttribute("aria-hidden", "true");
    tasto.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
    if (ultimoFocus) ultimoFocus.focus();
  }

  tasto.setAttribute("aria-controls", "navigazione");
  tasto.addEventListener("click", () =>
    navigazione.classList.contains("aperta") ? chiudiMenu() : apriMenu()
  );
  chiudi.addEventListener("click", chiudiMenu);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && navigazione.classList.contains("aperta")) chiudiMenu();
  });
}

/* ── Indice della pagina: segna la sezione in cui ti trovi ─────────────
   Calcolato sullo scroll invece che con IntersectionObserver: è deterministico
   (l'ultima sezione il cui inizio è passato sotto la testata), si può verificare,
   e non dipende da quando il browser decide di consegnare le intersezioni. */
const indice = document.querySelector(".indice-pagina");
if (indice) {
  const voci = [...indice.querySelectorAll("a")];
  const bersagli = voci
    .map((a) => ({ voce: a, elemento: document.querySelector(a.getAttribute("href")) }))
    .filter((x) => x.elemento);

  if (bersagli.length) {
    const SOGLIA = 150; /* testata (74) + barra indice, con un margine */

    function segnaCorrente() {
      let attiva = null;
      for (const b of bersagli) {
        if (b.elemento.getBoundingClientRect().top <= SOGLIA) attiva = b.voce;
      }
      /* in fondo alla pagina vince sempre l'ultima sezione */
      if (window.innerHeight + window.scrollY >= document.body.scrollHeight - 4) {
        attiva = bersagli[bersagli.length - 1].voce;
      }
      voci.forEach((a) => a.classList.toggle("corrente", a === attiva));
    }

    /* Sono al massimo sei misure per evento: si può fare direttamente, senza
       rimandare a un frame che in una scheda in secondo piano potrebbe non arrivare. */
    addEventListener("scroll", segnaCorrente, { passive: true });
    addEventListener("resize", segnaCorrente, { passive: true });
    segnaCorrente();
  }
}

/* ── Comparsa allo scroll ────────────────────────────────────────────── */
const daRivelare = document.querySelectorAll(".appare");
if (daRivelare.length && !motoRidotto && "IntersectionObserver" in window) {
  const osservatore = new IntersectionObserver(
    (voci) => {
      voci.forEach((v) => {
        if (v.isIntersecting) {
          v.target.classList.add("dentro");
          osservatore.unobserve(v.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
  );
  daRivelare.forEach((e) => osservatore.observe(e));
} else {
  daRivelare.forEach((e) => e.classList.add("dentro"));
}

/* ── Foil ─────────────────────────────────────────────────────────────
   Ricetta confermata (foil-demo.html): il tilt e lo spostamento del gradiente.
   Qui il tilt segue il puntatore; su touch resta la "bascula" automatica, che
   mostra l'effetto anche a chi non ha un mouse. */

const MAX_TILT = 15;

export function attivaFoil(carta) {
  if (carta.dataset.foilAttivo === "1") return;
  carta.dataset.foilAttivo = "1";

  const arcobaleno = carta.querySelector(".foil-arcobaleno");
  const riflesso = carta.querySelector(".foil-riflesso");
  if (!arcobaleno || !riflesso) return;

  let inQuadro = false;

  const eFoil = carta.classList.contains("e-foil");

  function muovi(e) {
    if (motoRidotto || inQuadro) return;
    inQuadro = true;
    requestAnimationFrame(() => {
      inQuadro = false;
      const r = carta.getBoundingClientRect();
      /* posizione del puntatore normalizzata: -0.5 … +0.5 rispetto al centro */
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      carta.style.transform = `rotateX(${(-y * MAX_TILT).toFixed(2)}deg) rotateY(${(x * MAX_TILT).toFixed(2)}deg)`;
      /* il riflesso insegue il puntatore, l'arcobaleno si sposta al contrario:
         è quello che dà la sensazione di luce che scorre sulla superficie */
      const px = (50 + x * 90).toFixed(1);
      const py = (50 + y * 90).toFixed(1);
      riflesso.style.backgroundPosition = `${px}% ${py}%`;
      if (eFoil) arcobaleno.style.backgroundPosition = `${100 - px}% ${100 - py}%`;
    });
  }

  carta.addEventListener("pointerenter", (e) => {
    if (e.pointerType === "touch") return;
    carta.classList.add("in-movimento");
    muovi(e);
  });

  carta.addEventListener("pointermove", (e) => {
    if (e.pointerType === "touch") return;
    muovi(e);
  });

  carta.addEventListener("pointerleave", () => {
    carta.classList.remove("in-movimento");
    carta.style.transform = "";
    arcobaleno.style.backgroundPosition = "";
    riflesso.style.backgroundPosition = "";
  });
}

/* Una passata di "bascula" quando la carta entra in vista: fa capire che è
   interattiva senza che l'utente debba scoprirlo da solo. */
export function basculaAllIngresso(carta) {
  if (motoRidotto || !("IntersectionObserver" in window)) return;
  const osservatore = new IntersectionObserver(
    (voci) => {
      voci.forEach((v) => {
        if (!v.isIntersecting) return;
        osservatore.unobserve(v.target);
        setTimeout(() => {
          v.target.classList.add("bascula");
          setTimeout(() => v.target.classList.remove("bascula"), 1800);
        }, 350);
      });
    },
    { threshold: 0.55 }
  );
  osservatore.observe(carta);
}

/* Costruisce il markup di una carta (base + due livelli).
   `foil` decide se è una stampa speciale: solo in quel caso compare l'arcobaleno
   e il contrassegno della finitura. Le carte normali ricevono il solo riflesso. */
export function creaCartaFoil(src, alt, foil = false, etichettaFinitura = "") {
  const scena = document.createElement("div");
  scena.className = "scena";
  scena.innerHTML = `
    <div class="carta-foil${foil ? " e-foil" : ""}">
      ${foil && etichettaFinitura ? `<span class="bollo-finitura">${etichettaFinitura}</span>` : ""}
      <img class="carta-base" src="${src}" alt="${alt}" loading="lazy" decoding="async">
      <div class="foil-arcobaleno"></div>
      <div class="foil-riflesso"></div>
    </div>`;
  const carta = scena.querySelector(".carta-foil");
  attivaFoil(carta);
  return { scena, carta };
}

/* Avvio automatico per le carte già presenti nell'HTML */
document.querySelectorAll(".carta-foil").forEach((c) => {
  attivaFoil(c);
  if (c.dataset.bascula === "ingresso") basculaAllIngresso(c);
});

/* ── Anteprima dell'app: non è giocabile, per scelta ─────────────────── */
document.querySelectorAll(".vetrina-app").forEach((v) => {
  const etichetta = v.querySelector(".vetrina-etichetta");
  if (!etichetta) return;
  const testoIniziale = etichetta.textContent;
  v.addEventListener("click", () => {
    v.classList.add("svelata");
    etichetta.textContent = "Ci stiamo lavorando";
    clearTimeout(v._t);
    v._t = setTimeout(() => {
      v.classList.remove("svelata");
      etichetta.textContent = testoIniziale;
    }, 2600);
  });
});

/* ── Modulo lista d'attesa: per ora NON invia niente ─────────────────── */
document.querySelectorAll("form[data-finto]").forEach((f) => {
  f.addEventListener("submit", (e) => {
    e.preventDefault();
    const esito = f.parentElement.querySelector(".esito");
    if (esito) esito.classList.add("visibile");
    f.reset();
  });
});
