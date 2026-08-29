# 4 · Stato del progetto e avanzamento

> Fotografia al **2026-08-29**, branch `editor-mazzi-salvataggi-bugfix`.
> La fonte viva di questo quadro è `WORLDLOOM.md` (root) + `Engine/Roadmap_Sessione_2026-08-27.md`.

---

## 4.1 Dove siamo, in una riga

Il gioco **è giocabile e completo nelle meccaniche di base** (vs IA e 1v1 locale, con editor mazzi,
salvataggio, statistiche). Il grande refactor delle tempistiche è **chiuso e blindato**. Il lavoro
aperto è di due tipi: **62 effetti carta da cablare** e una **coda di rifiniture UI** già
identificate.

---

## 4.2 Cronologia degli sprint

| Periodo | Sprint | Esito |
|---|---|---|
| ~luglio – 26 ago 2026 | mesi di lavoro mai committati (catena di effetti, animazioni UX, 1v1 locale, lancio moneta, combattimento) | messi sotto git il 26-08 (commit `d77fd75`) |
| 26-08 | Repository unificato, editor mazzi, salvataggio | ✅ |
| 27-08 | Redesign campo, sequenza combattimento, feedback dal vivo → **nasce la roadmap** | ✅ |
| 28-08 | Batch di rifiniture (X.1-X.6, P3.x), riordino documenti, **progetto dell'idea 59** | ✅ |
| 29-08 mattina/primo pom. | **Idea 59, Fasi 1→5** — refactor completo | ✅ 🔒 |
| 29-08 pomeriggio | Sessione "reparto finiture": rinomina, identità carta, mazzo legale (T.1-T.11) | ✅/🟡 |
| 29-08 sera | Audit dati carte + validatore (V.1-V.13) | ✅/🔴 |
| 29-08 sera | Prima stesura del sito worldloomtcg.com | commit `65ab99f` |

---

## 4.3 ✅ Il refactor "coda di step unica" (idea 59) — CHIUSO

Tutte e 5 le fasi fatte e blindate il **2026-08-29**. È l'unica cosa nel progetto che sia stata
portata a termine per intero con test a ogni passo, ed è il modello da imitare.

| Fase | Cosa ha migrato | Test blindato | Chiude |
|---|---|---|---|
| **1** | infrastruttura (`s.sequenza`, `tempi.js`, `sequenza.js`, `<Sequenziatore>`) + **combattimento**: `difendi → dado → (ripeti?) → balzo → numero → morte differita` | `combattimento` + `tempi` | metà di F.6 |
| **2** | **catena di effetti**: decisione = `scelta:catena` (countdown 15 s), risoluzione di un frame = `muta:catenaRisoluzione` | `catena` | — |
| **3** | i tre **voli**: pesca / evocazione / spostamento. Prima mano una-alla-volta | `voli` | **F.2** |
| **4** | **turno IA**: il respiro dell'avversario è un passo `muta:"ia"` da 900 ms | `turno-ia` | resto di F.6 |
| **5** | **banner di fase**: quarto tipo di passo, accodato in 5 punti | `banner-fase` | **P2.1 · P2.2 · P2.3 · P2.4** |

**Decisione architetturale della Fase 3** (importante da conoscere): `legacyOccupato` è stato
eliminato dal `<Sequenziatore>`. **`s.sequenza` è ora il master assoluto**: è la coda visiva ad
aspettare la fila, non più il contrario.

**Due dei quattro punti P2 non erano "arriva troppo presto" ma "non esiste"**: il cartello
**Vespro** non è mai comparso in vita del gioco (`s.fase` non vale mai 5), e i banner del **turno
avversario** erano strutturalmente soppressi (`faseEffettiva = null` quando `!turnoUmano`).

---

## 4.4 Quadro sinottico dei punti

### ✅ Chiusi e verificati

`P0.1` · `P0.2` · `P0.3-4-5` · `P0.6` · `P0.8` · `P0.9` · `P0.10` ·
`P2.1` 🔒 · `P2.2` 🔒 · `P2.3` 🔒 · `P2.4` 🔒 ·
`P3.1` · `P3.3` · `P3.4` · `P3.5` ·
`F.2` 🔒 ·
`X.1` · `X.2` · `X.3` · `X.4` · `X.5` ·
`T.1` · `T.2` · `T.3` · `T.4` · `T.5` · `T.6` ·
`V.1` · `V.2` · `V.3` · `V.4` ·
**idea 59 Fasi 1-5** 🔒

### 🟡 Parziali — con coda aperta

| Punto | Cosa manca esattamente |
|---|---|
| **F.6** | chiusa strutturalmente dalle Fasi 1+4; **resta da riverificare dal vivo col caso originale dell'utente** ("suscita male", segni di danno) prima di dichiararla chiusa |
| **F.1** | carta Imprevisto integra ✅, ma **il simbolo si è ri-scentrato**: `background-position: 38%` funziona solo a 0°/180°. Serve un **retro carta simmetrico** (solo emblema centrato, niente scritta). F.1a (badge numerici) non iniziato |
| **F.4** | non riprodotto; messaggio diagnostico specifico in attesa della prossima occorrenza dal vivo |
| **P0.7** | serve un caso preciso dall'utente (che turno, cosa ha visto) |
| **P1.4** | non riprodotta; diagnostica visibile in attesa di uno screenshot dell'utente |
| **P3.2** | tappa A fatta (dato + layer + zoom sfogliabile); **tappa B (animazione all'attivazione) da fare** |
| **T.7** | dati foil pronti; **manca la resa CSS nel gioco** |
| **X.6** | testo app ✅ e dati ✅; resta solo la coerenza con i testi carta man mano che si rigenerano |
| **V.11** | campi di stampa vuoti: warning per scelta esplicita, diventa errore quando l'utente li compila |

### 🔴 Aperti

| Punto | Blocco |
|---|---|
| **T.8 — i 62 effetti mancanti** | è il **prossimo lavoro deciso**. Piano a blocchi pronto |
| **P1.1 · P1.2 · P1.3** | audit fatto, piano a 4 tappe concordato, non iniziato |
| **P2.5** | bug pre-esistente segnalato e non toccato (regola M1) |
| **P4.1** | Eco del Gelo → "copia" dentro catena: da progettare a parole |
| **F.3** | Magia Terreno: zoom prima di posizionare |
| **F.5** | etichetta stat: centrare + fascia più alta |
| **T.9 · T.10 · T.11** | pipeline immagini: documenti da correggere + rigenerazione bloccata a monte |
| **V.5 – V.10 · V.12 · V.13** | **aspettano una decisione dell'utente**, non del lavoro tecnico |

### 👀 Da confermare a vista dall'utente

`P0.9` ("si gira tutto") · `P3.3` (etichetta stat) · pacing del combattimento ·
`P3.2` tappa A · `F.1` carta Imprevisto.

### 🧪 Diagnostica temporanea da rimuovere a bug chiuso

- `[P1.4]` in `calcolaBersaglioFrameCatena` (scrive nel Registro Mosse)
- il banner rosso in `CatenaStriscia.jsx` (`RisoluzioneFrame`, stato `diag`)
- `console.log` in `VfxMagia.jsx`
- il messaggio diagnostico di F.4 in `selezionaMano`

---

## 4.5 I 62 effetti mancanti — il prossimo cantiere

Le carte 32-61 entrano in mano e **non fanno nulla**: 30 Magie, 14 Pedine, 12 Trappole, 6 Imprevisti.
Audit completo nel Vocabolario Effetti, sezione "audit 2026-08-29".

Il piano (`Engine/Effetti_Mancanti_Piano.md`) è **a blocchi, non carta per carta**, perché le
meccaniche si ripetono:

| Meccanica citata nei testi | Effetti che la usano |
|---|---|
| evocazione (condizioni, effetti, evocazioni extra) | 19 |
| **tira il dado Archetipo** e ramifica sul simbolo | 18 |
| cimitero (recupera / rievoca / ricicla) | 17 |
| blocco / stordimento | 16 |
| distruzione mirata | 13 |
| pesca / Rifornimento | 12 |
| Terreno | 8 |
| copia di un altro effetto | 8 |
| PV dello Stratega | 5 |
| attacchi extra nel turno | 2 |

**Ordine dei blocchi:** 1) Terreni (4 codici, il più contenuto — buono per validare il giro
completo) → 2) dado Archetipo (18) → 3) cimitero (17) → 4) blocco/stordimento (16) →
5) pesca e PV (17) → 6) il resto.

⚠️ **Decisione da prendere con l'utente prima di scrivere il Blocco 2**: i tiri di dado Archetipo
degli effetti carta passano dalla fila `s.sequenza` come il dado di combattimento (scenografia),
o si risolvono in silenzio?

### Le 8 concatenazioni da testare (non ipotesi: nascono da meccanismi già delicati)

1. **Blocco che vieta l'attacco + effetto che lo obbliga** (`verde`, `cavalieremarb` dicono "deve
   attaccare ogni turno"): il turno può non chiudersi più. `verde` ha già richiesto **2 esenzioni**.
2. **Rievoca dal cimitero + morte differita**: dalla Fase 1 la creatura muore *dopo* la
   scenografia. Da decidere e congelare: il cimitero letto da un effetto è quello **logico** o
   quello **visibile**?
3. **Tiro di dado mentre una catena è aperta**: può finire davanti a una decisione in sospeso — è
   esattamente il bug che `catena.blindato.mjs` ha già colto una volta.
4. **Copia di un effetto non implementato**: `ecogelo`/`copiare` oggi copierebbero il nulla senza
   dirlo. Serve almeno un log.
5. **Terreno che modifica il danno + SOPRAVVIVENZA + Tank**: tre modificatori sullo stesso danno,
   con ordine di applicazione non documentato.
6. **Salta Rifornimento + prima mano una-alla-volta** (Fase 3): non deve lasciare la fila a metà.
7. **Blocca Magie 3 turni + Trappole**: le Trappole hanno un percorso diverso
   (`ELEGGIBILITA_RISPOSTA`). Il blocco vale per entrambe? Da leggere carta per carta.
8. **Due Terreni nuovi in sequenza**: l'effetto continuo del Terreno uscente va **annullato**.

**Regola di lavoro del cantiere:** un blocco alla volta, e dentro il blocco **una carta alla
volta**: codice → simulazione headless usa-e-getta → `npm run build` → riga del Vocabolario a ✅
con la data. I 6 blindati devono restare verdi a ogni passo.

---

## 4.6 Backup e paracadute disponibili

| Tipo | Dove |
|---|---|
| Tag git | `pre-coda-step-unica-2026-08-28` (commit `9885e0d`, working tree completo) |
| Copie giocabili | `App - HTML - Test/Versioni gioco/` — **v2.3** pre-coda-step · **v2.4** pre-fase2 · **v2.5** pre-fase3 · **v2.6** pre-fase4 · **v2.7** pre-fase5 · **v2.8** pre-foil |
| Copie sorgente | `Backup sorgente …/` nella root (gitignorate): `src/` + `test-blindati/` |

---

## 4.7 Stato del repository git

**Branch corrente:** `editor-mazzi-salvataggi-bugfix` (il branch principale è `main`).

⚠️ **Il working tree ha molto lavoro non committato** al momento di questa fotografia: le
modifiche delle sessioni del 29-08 (rinomina Pedina/Marbion, identità carta, validatore, `tools/`,
`Business plan/`, le immagini rinominate). Chi subentra dovrebbe **decidere con l'utente cosa
committare** prima di iniziare, per non lavorare sopra a modifiche non salvate.

Ultimi commit significativi:

```
65ab99f  Sito worldloomtcg.com: prima versione, non pubblicata
042bcad  Idea 59: Fasi 3-5 — la coda di step unica è completa
e1df055  Nuova carta 55 — TUTTE le 61 idee completate
1794d8c  Idea 59: design "coda di step unica" chiuso + skill avvio-sessione
9885e0d  Checkpoint pre-refactor "coda di step unica" + riordino documenti
```

---

## 4.8 Cosa farei io per primo, al posto del collega

1. Leggere `WORLDLOOM.md` e la roadmap (in quest'ordine), poi questa cartella `MD/`.
2. Lanciare i 6 test blindati e verificare che siano **tutti verdi** — è il termometro dello stato.
3. Fare `npm run build` e aprire `GIOCA.html`: giocare una partita intera vs IA.
4. Chiedere all'utente cosa fare del working tree non committato.
5. Solo allora scegliere il cantiere: **T.8 (i 62 effetti)** è quello deciso, ma prima serve la
   risposta alla domanda del Blocco 2 (dado in fila o in silenzio).
