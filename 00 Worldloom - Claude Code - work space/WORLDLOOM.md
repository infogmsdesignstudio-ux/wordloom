# 🧭 WORLDLOOM — Pannello di controllo

> **Parti da qui in ogni chat nuova.** Questo file è l'indice unico: stato corrente + dove vive ogni cosa.
> Aggiornalo alla fine di ogni sessione (stato sprint + eventuali documenti nuovi).
> Ultimo aggiornamento: **2026-08-29** (sessione "finiture": rinomina Pedina/Marbion · identità carta · mazzo legale)

---

## 📍 Dove siamo adesso

**Sessione 2026-08-29 pomeriggio — "reparto finiture".** Partita per il foil olografico, ha chiuso
prima tre cantieri che gli stavano davanti. Backup: `Versioni gioco/Worldloom_Gioco_v2.8_pre-foil_2026-08-29.html`
+ `Backup sorgente pre-foil 2026-08-29/` (src, test blindati, i due cards.json, i due Excel pre-rinomina).

- **Rinomina terminologica ✅** — `Alieno`/`Creatura` → **Pedina**, `Kepler` → **Marbion**. 89 celle
  Excel con la concordanza scritta a mano (femminile: "un tuo Alieno" → "una tua Pedina"), token
  `tipoCarta: "alieno"` → `"pedina"` in 12 punti del motore (il vecchio valore resta **accettato in
  lettura**, altrimenti le partite e i mazzi già salvati si rompono), `terr_kepler` → `terr_marbion`
  in Excel + `magieTrappole.js` + Vocabolario. Rinominate anche 3 carte (**Resuscita Pedina**,
  **Marea di Marbion**, **Pedina di Midollo**) con i loro 14 file immagine. Escluse di proposito le
  colonne `Nome` (fatte a parte) e `Prompt Immagine` (inglese per il generatore).
  **Bug chiuso:** 15 Pedine di Marbion erano marcate `Pedina` in Excel ma `genera_cards_json.py`
  conosceva solo `Alieno` → venivano **scartate in silenzio**. Marbion passa da 23 a 41 Pedine.
- **Identità carta ✅** — `id` = **Nome + Variante Illustrazione + Rarità + Finitura** (decisione
  dell'utente). Chiave di catalogo, editor mazzi e mazzi salvati; i mazzi salvati vecchi (solo nome)
  continuano a risolversi per nome. L'immagine dipende da **nome + variante**, mai da rarità o
  finitura. Le 8 carte foil esistono ora in **due stampe** (Normale + Rainbow), contatori indipendenti
  verificati dal vivo. Il controllo d'unicità ha scoperto **5 righe doppie identiche** negli Excel,
  rimosse.
- **Mazzo di default legale ✅** — la partita rapida usava *tutta la collezione* (125 e 155 copie);
  ora pesca **60 copie** rispettando il limite per carta, come già faceva l'editor.
- **Carte senza illustrazione ✅** — Magie/Trappole/Imprevisti usano lo stesso guscio 5:7 delle
  Pedine: misurate **117×157 tutte**, il testo lungo scorre invece di allungare la carta.
- **Foil 🟡 dati pronti, resa da fare** — colonna `Finitura` letta letterale in `cards.json`
  (Rainbow/Star Rail/Restricted… una classe CSS per valore). 8 carte Rainbow. Manca il CSS nel gioco.
- **🔴 65→62 codici effetto non implementati** — le carte nuove 32-61 entrano in mano e non fanno
  nulla. Audit completo in `Engine/Worldloom_Engine_Vocabolario_Effetti.md`, sezione "audit 2026-08-29".

**Prossimo:** B (i 62 effetti) → poi A (il foil).


**Branch git:** `editor-mazzi-salvataggi-bugfix` · working tree con lavoro non committato (incluso una
sessione parallela su Excel/grafiche in `Mazzi/`).

**Sprint corrente: ✅ CHIUSO — coda di step unica** (idea 59), tutte e 5 le fasi fatte e blindate il
2026-08-29. Il refactor ha sostituito i ~10 campi-evento + ~10 timer + ~25 guardie sparse con UNA fila
ordinata `s.sequenza` e un solo direttore UI (`<Sequenziatore>`). Era la causa radice della famiglia di
bug di tempistica (F.6, P0.3-5, P2.x). **Nessuno sprint nuovo aperto:** il prossimo lavoro si sceglie
dal backlog qui sotto o dai punti aperti della Roadmap.

- **Obiettivo di design:** Livello B (tutto: combattimento + catena + pesca + evocazione + turno IA + banner).
- **Fase 1 (infrastruttura + combattimento) — ✅ FATTA E BLINDATA (2026-08-29).** `s.sequenza`,
  `src/game/tempi.js` (sorgente unica dei tempi, `DURATA_TURNO_MS` incluso), `src/game/sequenza.js`
  (selettori read-only), `<Sequenziatore>`, dispatch `sequenza-passo-concluso`. Combattimento migrato:
  `difendi → dado → (ripeti?) → balzo → numero → morte differita (passo muta)`. Test:
  `Engine/test-blindati/combattimento.blindato.mjs` + `tempi.blindato.mjs`.
- **Fase 2 (catena) — ✅ FATTA E BLINDATA (2026-08-29).** La decisione = passo `scelta:catena`
  (countdown "Risolvi" 15s), la scenografia di risoluzione di un frame = passo `muta:catenaRisoluzione`.
  Ritirati: `s.catenaRisoluzioneInCorso`, dispatch `catena-conferma-risoluzione`, i timer locali +
  `storico` di `CatenaStriscia`. Nuovi: helper `sincronizzaPassoCatena`, campo `s.catena.risolti`,
  selettori `sceltaCatenaInScena`/`catenaRisoluzioneInScena`, `TEMPI.catena`. `catena.js` invariato.
  Test: `Engine/test-blindati/catena.blindato.mjs`. Sweep 250 partite vsIA OK, verifica dal vivo OK.
- **Fase 3 (pesca/evocazione/spostamento) — ✅ FATTA E BLINDATA (2026-08-29).** I tre voli sono
  passi `anim` della fila (`pesca`/`evoca`/`sposta`), ritirati `s.pescaInCorso`/`s.evocazioneInCorso`/
  `s.movimentiInCorso` e le loro dispatch `*-animazione-conclusa`. Prima mano di chi inizia per
  secondo = N passi da 1 carta (chiude **F.2**). **Decisione architetturale:** `legacyOccupato`
  eliminato dal `<Sequenziatore>` — `s.sequenza` è ora il master assoluto, è la coda visiva ad
  aspettare la fila (non più il contrario). `tempi.js`: `TEMPI.pesca/evoca/sposta` (solo i totali).
  Test: `Engine/test-blindati/voli.blindato.mjs` (nuovo, 7 casi). Sweep 200 partite vsIA con
  asserzione d'ordine esplicita (0 violazioni), verifica dal vivo OK (partita reale, non stato
  iniettato: prima mano una-alla-volta, evocazione mia+IA, combattimento Fase 1 intatto, 4 turni,
  console pulita).
- **Fase 4 (turno IA) — ✅ FATTA E BLINDATA (2026-08-29).** Il pacing dell'avversario è un passo
  `muta:"ia"` (`azione: "evoca"|"attacca"`, `durataMs: TEMPI.ia.respiro` = 900ms). **Ritirati**
  `s.iaInAttesa`, la dispatch `avanza-ia`, l'`useEffect` col timer fisso in App.jsx e **tutto
  `iaBloccataDaPrompt`** (OR di 8 condizioni). `eseguiMuta` shifta il passo PRIMA di chiamare
  `avanzaIA`, così le guardie esistenti restano valide senza riscriverle; `proseguiSeIA` accoda
  sempre un respiro (mai due). **Limite noto CHIUSO:** gli attacchi diretti allo Stratega a campo
  sgombro non si risolvono più tutti in una dispatch — misurati dal vivo a **~1800ms l'uno dall'altro**.
  **2 invarianti nuovi da bug veri:** (1) il passo `ia` sta sempre **in fondo** alla fila (applicato
  in `accodaPassi`; senza, con una catena a 2 frame il respiro finiva davanti alla decisione del
  giocatore — colto da `catena.blindato.mjs`); (2) **anti-deadlock**: il passo `ia` è l'unica
  eccezione a "la coda visiva aspetta la fila" — implementata a metà, il turno IA si è bloccato per
  sempre su "L'avversario evoca…" (**colto dal vivo**). Le due guardie sono ora selettori veri
  (`filaBloccaCodaVisiva`/`scenaLiberaPerIa`) per poterle blindare. `sincronizzaPassoIa` al
  `carica-stato` (senza, partita ripresa a metà turno IA = ferma per sempre).
  Test: `Engine/test-blindati/turno-ia.blindato.mjs` (nuovo, 9 casi). Sweep 200 partite vsIA:
  200/200 concluse, 0 crash/stalli/violazioni su 8991 respiri e 3674 scontri IA. Verifica dal vivo
  su 3 partite reali, console pulita.
- **Fase 5 (banner di fase) — ✅ FATTA E BLINDATA (2026-08-29). ULTIMA: l'idea 59 è COMPLETA.**
  Quarto tipo di passo `{ tipo:"banner", nome:"bannerFase", dati:{chiave,fase}, durataMs }`, accodato in
  5 punti: `iniziaTurno` (1 Rifornimento) · in cima a `completaRifornimento` (2 Vaticinio, dietro al
  volo della pescata) · ramo `imprevistoEsito` di `applicaEventoVisivo` (3 Schieramento, dopo il dado)
  · `continuaFase`+`avanzaIA` (4 Alla Carica) · `fineTurno` **dopo `flushSequenza`** (5 Vespro).
  `TitoloFase.jsx` riscritto (legge `bannerInScena`, segnala `sequenza-passo-concluso`); **ritirati**
  il suo `useEffect` di cambio-fase, il contatore di id locale, il `DURATA_MS` a mano e la lettura di
  `faseVisibile`. `banner` entra in `filaBloccaCodaVisiva` (serve: il Vaticinio va davanti al dado
  Imprevisti, che è in coda visiva) ma **non** in `scenaLiberaPerIa` — è unidirezionale come `anim`,
  quindi non riapre il deadlock di Fase 4. `TEMPI.banner = { fase: 1750, vespro: 2600 }` + custom
  property CSS. **Due dei quattro punti non erano "arriva presto" ma "non esiste":** il Vespro non è
  mai comparso in vita del gioco (`s.fase` non vale mai 5) e i banner del turno avversario erano
  soppressi in partenza (**P2.4**, requisito esplicito dell'utente). Ora il cartello è identico sui due
  lati, con una sola riga di attribuzione ("Il tuo turno"/"Turno avversario"), mai capovolto.
  **Deviazione dichiarata:** `faseVisibile`/`imprevistoVisivo` NON ritirati — pinnano due letture
  attraverso il dado Imprevisti, flusso non migrato. Test:
  `Engine/test-blindati/banner-fase.blindato.mjs` (nuovo, 45 asserzioni in 7 casi) + `voli.blindato.mjs`
  aggiornato **rafforzando** le asserzioni. Sweep 200 partite vsIA: 200/200, 0 crash/stalli/violazioni
  su 17025 banner (8445 miei · 8580 IA — lo split ~50/50 è la prova di P2.4). Verifica dal vivo con
  poller DOM a 40ms: durate misurate (fasi 1-4 ~1750-1810ms · **Vespro 2595 e 2635ms**), catena
  `Vespro → Rifornimento → volo-carta → Vaticinio → dado → Schieramento` su un turno avversario intero,
  **scontro IA-contro-mia-creatura finalmente osservato dal vivo** (chiude il limite dichiarato della
  Fase 4), console pulita.
- **Documento:** `Engine/Idea59_Coda_Step.md` — design chiuso 2026-08-28, **tutte e 5 le Fasi fatte
  2026-08-29**.
- **Costo di ritmo dichiarato:** mio turno +2,6s (il Vespro, che prima non c'era), turno IA +8,8s
  (5 cartelli dove non ce n'era nessuno). Manopola unica: `TEMPI.banner.fase` in `src/game/tempi.js`.
- **Prossima sessione:** l'idea 59 è finita — si riparte dal backlog (carte 32-61, foil, sito) o dai
  punti aperti della Roadmap.

**Audit dati carte + validatore (29-08 sera):** ✅ costruito `tools/validate_cards.py` (9 controlli,
agganciato al build) — prima esecuzione **0 errori, 199 avvisi**. Chiuse V.1–V.4; aperti **V.5–V.13**,
quasi tutti in attesa di una decisione tua (vocabolario `Tipo Effetto`, keyword "Volante", tre carte
con testo identico, 37 statistiche fuori range, quale renderer di carta è vivo, scala di rarità vs
limite copie, promozione delle proposte). Dettaglio in `Engine/Roadmap_Sessione_2026-08-27.md`,
sezione "Sessione 2026-08-29 (sera)".

**Backup pre-Fase 5:** ✅ 2026-08-29 — `App - HTML - Test/Versioni gioco/Worldloom_Gioco_v2.7_pre-fase5-banner_2026-08-29.html`
+ `Backup sorgente pre-fase5-banner 2026-08-29/` (root, gitignorata: `src/` + `test-blindati/`).

**Backup pre-Fase 4:** ✅ 2026-08-29 — `App - HTML - Test/Versioni gioco/Worldloom_Gioco_v2.6_pre-fase4-turno-ia_2026-08-29.html`
+ `Backup sorgente pre-fase4-turno-ia 2026-08-29/` (root, gitignorata).

**Backup pre-Fase 3:** ✅ 2026-08-29 — `App - HTML - Test/Versioni gioco/Worldloom_Gioco_v2.5_pre-fase3-voli_2026-08-29.html`
+ `Backup sorgente pre-fase3-voli 2026-08-29/` (root, gitignorata).

**Backup pre-Fase 2:** ✅ 2026-08-29 — `App - HTML - Test/Versioni gioco/Worldloom_Gioco_v2.4_pre-fase2-catena_2026-08-29.html`
+ `Backup sorgente pre-fase2-catena 2026-08-29/` (root, gitignorata).

**Backup pre-refactor:** ✅ fatto il 2026-08-28.
- Tag git: **`pre-coda-step-unica-2026-08-28`** (commit `9885e0d`, working tree completo).
- Copia giocabile: `App - HTML - Test/Versioni gioco/Worldloom_Gioco_v2.3_pre-coda-step-unica_2026-08-28.html`.
- Copia sorgente: `Backup sorgente pre-coda-step-unica 2026-08-28/` (root, gitignorata).

**Decisione utente su F.1 (retro carta):** NON si cambia l'immagine del retro. Va solo **blindato com'è
ora** con un test — parcheggiato, si fa dopo aver definito il metodo di blindatura.

---

## 🗂️ Documenti — indice e stato

| Documento | Stato | Note |
|---|---|---|
| `WORLDLOOM.md` (questo) | vivo | pannello unico |
| `CLAUDE.md` | vivo · **snellito 2026-08-28** | solo regole di processo + gotcha + mappa doc (era 166 KB) |
| `Engine/Roadmap_Sessione_2026-08-27.md` | vivo | lista bug/task, stato per punto, regole anti-regressione in cima |
| **`Engine/Bilanciamento.md`** | **vivo · creato 02-09** | **Quadro di riferimento del bilanciamento — da leggere PRIMA di toccare statistiche, ruoli, archetipi, dadi o tributi.** Contiene i fatti accertati sul motore, quali misure sono valide e quali invalidate dalla guarigione a fine turno, i 4 guasti strutturali, il modello «Scala dei Ruoli» e le 6 decisioni aperte |
| `Engine/Analisi_Delta_Pedine.md` | vivo · creato 01-09 | la diagnosi: perché il Livello 3 si inchioda. Strumenti in `Engine/analisi-bilanciamento/` |
| `Engine/Modello_Scala_Ruoli.md` | vivo · creato 02-09 | il modello proposto + la griglia per gli Excel + i duelli 1v1. Excel delle 63 Pedine ri-statate in `Engine/analisi-bilanciamento/Worldloom_Bilanciamento_Pedine.xlsx` |
| `tools/validate_cards.py` | vivo (creato 29-08) | validatore dei dati carte, 9 controlli sui quattro Excel. **Gate al build**: `genera_cards_json.py` non rigenera `cards.json` se ci sono ERRORI. `python tools/validate_cards.py` |
| `tools/vocabolari.json` · `tools/keywords.json` | vivi (creati 29-08) | vocabolari chiusi (ruoli, archetipi, rarità, sottotipi, tipo effetto congelato) e glossario keyword. **Autoritativi**: fuori lista = errore |
| `Engine/Effetti_Mancanti_Piano.md` | vivo (creato 29-08) | piano a blocchi per i 62 effetti mancanti + le 8 concatenazioni da testare |
| `Engine/Idea59_Coda_Step.md` | ✅ **COMPLETO — tutte e 5 le Fasi fatte (29-08)** | coda di step unica — combattimento + catena + voli + turno IA + banner di fase, tutti migrati e blindati |
| `Engine/Worldloom_Engine_Vocabolario_Effetti.md` | vivo | 19 caselle effetti + tabella carte; gaps noti: mammut/manipstrum/verde ✅ 27-08 |
| `Engine/Storico_Lavoro.md` | archivio vivo | log cronologico completo (ex-coda di CLAUDE.md) — consultare su richiesta |
| `Engine/test-blindati/` | vivo (creata 29-08) | **6 test:** `combattimento` + `tempi` (Fase 1) · `catena` (Fase 2) · `voli` (Fase 3) · `turno-ia` (Fase 4) · `banner-fase` (Fase 5). Non si cancellano; `node Engine/test-blindati/<x>.blindato.mjs` |
| `Regolamento/Worldloom_Regolamento_v2.1.html` | vivo | regole complete · sync engine 15-08 |
| `Regolamento/Worldloom_Regolamento_Giocatori.html` | vivo | versione giocatore (doppia manutenzione col v2.1) |
| `Regolamento/rules.json` | vivo | bilanciamento per game design, non letto a runtime |
| `UX/Worldloom_UX_Codex.html` | vivo · aggiornato 29-08 (idea 59 Fasi 1 e 4) | riferimento UI/animazioni "as-built" — riquadro "Coda di step" aggiornato; resto ancora da rinfrescare |
| `UX/Worldloom_Foglio_Maestro_UX.md` | vivo (brief) | intento/spec di design UX (Campo, Fasi, Pescata, Evocazione, Combattimento, Catena, Addendum A-M) |
| `Mazzi/Nuove idee carte - Lavorazione.md` | vivo | tracking trascrizione idee carte (sessione parallela) |
| `Sito web - Social/Ricerca_Sito_Design.md` | vivo (creato 29-08) | ricerca competitor + direzione di design + decisioni + cosa manca prima di pubblicare |
| `Sito web - Social/worldloomtcg/` | vivo (creato 29-08) | sito statico **10 pagine**, **non pubblicato** (`noindex` + `robots.txt`). Navigazione ad albero (menu a tutto schermo + indice di pagina). Account/store sono solo front-end: niente backend |
| `graphify-out/` | rigenerabile · gitignorato | grafo di conoscenza |
| `Archivio/` | congelato | ~60 file morti spostati il 2026-08-28 (vedi sotto) |
| `.claude/skills/avvio-sessione/` | vivo | rituale di avvio + disciplina di lavoro — caricare come prima cosa in ogni chat nuova |

---

## 🧩 Roadmap — sintesi (dettaglio in `Engine/Roadmap_Sessione_2026-08-27.md`)

**Chiusi e verificati:** P0.1, P0.2, P0.3-5, P0.6, P0.8, P0.9, P0.10, X.1-X.6, P3.1, P3.3, P3.4, P3.5,
**F.2** (29-08, dentro Fase 3 idea 59), **P2.1 · P2.2 · P2.3 · P2.4** (29-08, dentro Fase 5 idea 59).

**Aperti — priorità:**
- **F.6** 🟡 — la parte "morte differita" (creatura che doveva morire e non moriva, "BUG NOTO priorità
  zero") è chiusa strutturalmente dalla Fase 1 (morte = passo `muta`); la parte multi-attacco IA è
  chiusa dalla Fase 4 (un respiro per scontro, attacchi diretti compresi). **Resta solo da
  riverificare dal vivo col caso originale dell'utente** ("suscita male", segni di danno) prima di
  chiuderla del tutto.
- ~~**Idea 59**~~ ✅ **CHIUSA** — coda di step unica, tutte e 5 le Fasi fatte e blindate (29-08).
  La Fase 5 ha assorbito P2.1-P2.4.

**Aperti — altri:** F.1 (blindare retro com'è),
F.3 (Magia Terreno: zoom prima di posizionare), F.5 (etichetta stat: centrare + fascia più alta),
P0.7 (Intervento Divino — serve caso), P1.1-P1.3 (scelte automatiche carte — audit fatto, piano a 4 tappe),
**P2.5** (nuovo 29-08: avanzare di fase con la pillola mentre `imprevistoEsito` è ancora in coda visiva
perde l'evento — bug pre-esistente notato durante la Fase 5, segnalato e NON toccato),
P3.2 tappa B (animazione attivazione Imprevisto),
P4.1 (Eco del Gelo → "copia" dentro catena).

**Diagnostica temporanea da rimuovere a bug chiuso:** `[P1.4]` in `calcolaBersaglioFrameCatena` +
banner in `CatenaStriscia.jsx` + `console.log` in `VfxMagia.jsx`; messaggio diagnostico F.4 in `selezionaMano`.

**Da confermare a vista dall'utente:** P0.9 "si gira tutto", P3.3 etichetta stat, pacing combattimento,
P3.2 tappa A, F.1 carta Imprevisto.

---

## 📋 Backlog — lavori a sé (l'idea 59 è chiusa: da qui si sceglie il prossimo)

| Lavoro | Peso | Skill | Note |
|---|---|---|---|
| **Carte nuove 32-61** | lungo (~30 carte, una alla volta) | `pipeline-carte` | 31/~61 trascritte. Prossima: Carta 32 · Distruggi Terreno. Tracking in `Mazzi/Nuove idee carte - Lavorazione.md`. Riprendere come "sessione carte" dedicata. |
| **Foil olografico nel gioco** | piccolo (~1 sessione) | — (design + `Carta.jsx` + `index.css`) | Ricetta CSS confermata ma non integrata (solo demo in `Mazzi/00 Layout generico/`). Serve mini-design (foil in campo o solo zoom? performance mobile?). Nessuna dipendenza dall'idea 59 — anche prima. Dati: colonna Excel `Varianti Illustrazione` ("Normale + Foil") già a metà strada. |

| **Sito worldloomtcg.com** | 2ª stesura fatta (29-08) | — | 7 pagine statiche in `Sito web - Social/worldloomtcg/`, **non pubblicato**. Foil legato alla colonna `Finitura` degli Excel via `sync_carte.py`. Manca: schermata vera del gioco, colonne `Autore`/modello IA da compilare, nessuna stampa Rainbow ancora illustrata, tavole manga, modulo lista collegato, dominio. Dettaglio in `Sito web - Social/Ricerca_Sito_Design.md`. |

Ordine consigliato: idea 59 ✅ finita → ora foil e/o carte come sessioni separate.

## 🎯 Visione a lungo termine

Gioco → app → pubblicazione online → gioco da tavolo fisico.
Roadmap infrastruttura a 6 fasi: (1) git+hosting ✅ · (2) editor mazzi ✅ · (3) salvataggio ✅ ·
(4) menu principale + restyling · (5) PWA/APK · (6) i 17 bug dal vivo, intercalati.

---

## 📦 Archivio (2026-08-28)

Spostati in `Archivio/` perché morti / superati / non letti da nessuno:
- `Archivio/UX_estratto/`, `Archivio/UX_estratto2/` — due estrazioni della stessa consegna esterna (~50 file, demo HTML duplicate). Una copia di `Worldloom_Foglio_Maestro_UX.md` è stata recuperata in `UX/`.
- `Archivio/files.zip`, `Archivio/files2.zip` — gli zip già estratti sopra
- `Archivio/check.txt` — dump testuale del PDF Sequenze
- `Archivio/Worldloom_Sequenze_Interazione.pdf` — riferimento fermo al 19-08, superato dal UX Codex
- `Archivio/Programmazione_v0.1/` — design doc v0.1 del 7-8 agosto + un txt vuoto
