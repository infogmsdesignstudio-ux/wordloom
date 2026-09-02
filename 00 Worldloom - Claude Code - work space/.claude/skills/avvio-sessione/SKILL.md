---
name: avvio-sessione
description: >-
  Rituale di avvio e disciplina di lavoro per OGNI sessione su Worldloom. USA questa skill come
  PRIMA COSA all'inizio di una chat nuova sul progetto, e ogni volta che l'utente chiede "da dove
  ripartiamo", "cosa c'è da fare", "qual è lo stato", "cosa facciamo oggi", oppure prima di
  iniziare qualunque lavoro su codice/documenti quando non è chiaro il quadro. Dice: da quale file
  partire (WORLDLOOM.md), la mappa dei documenti e cosa è autoritativo, le regole di processo
  anti-regressione, come è organizzato il refactor "coda di step unica" (idea 59) in corso e come
  si lavora una sua Fase, e cosa aggiornare a fine sessione. Non sostituisce le skill specifiche
  (effetti-carta, pipeline-carte, graphify-progetto, documenti-e-backup) — le richiama al momento
  giusto.
---

# Avvio sessione — Worldloom

## 0. Rituale di avvio (in questo ordine, sempre)

1. **Apri `WORLDLOOM.md`** alla radice del progetto — è il pannello di controllo unico: stato dello
   sprint corrente, indice di ogni documento vivo con il suo stato, sintesi della roadmap, visione
   lungo termine. Da qui capisci in 30 secondi dove siamo.
2. Se `WORLDLOOM.md` rimanda a un documento per il dettaglio (`Engine/Roadmap_Sessione_2026-08-27.md`,
   `Engine/Idea59_Coda_Step.md`, ecc.), aprilo **solo se il lavoro di oggi lo tocca**.
2-bis. **Se il lavoro di oggi tocca statistiche, ruoli, archetipi, dadi, danno o economia dei tributi,
   apri SUBITO `Engine/Bilanciamento.md`.** Contiene come funziona davvero il combattimento, quali
   misure sono valide e quali sono state invalidate, e le decisioni aperte. Non ragionare a memoria
   sul bilanciamento: i numeri sono già stati misurati una volta, e una parte è già stata corretta.
3. `CLAUDE.md` è già in contesto (auto-caricato) — contiene le regole di processo + i gotcha nel
   codice + la mappa documenti. Non serve rileggerlo, serve **applicarlo**.
4. **NON** aprire `Engine/Storico_Lavoro.md` né `Archivio/` se non serve davvero ricostruire il
   "perché" di una scelta passata. Sono archivio, non contesto di lavoro.
5. Chiedi all'utente cosa si fa oggi. Se è un lavoro grosso/architetturale o un effetto carta o dati
   carte, **carica la skill giusta** (vedi §4) prima di toccare qualunque cosa.

## 1. Mappa dei documenti — chi è autoritativo

| File | Autorità | Regola |
|---|---|---|
| `WORLDLOOM.md` | indice + stato sprint | aggiornalo a fine sessione |
| `Engine/Roadmap_Sessione_2026-08-27.md` | dettaglio per-punto dei bug/task (P0.x…F.x…X.x) | stato ✅/🟡/🔴 + note; ri-proponi la lista dopo ogni punto chiuso |
| `Engine/Idea59_Coda_Step.md` | design del refactor coda di step | segui le sue Fasi (§10 del doc) |
| **`Engine/Bilanciamento.md`** | **fatti accertati sul combattimento + validità delle misure + modello + decisioni aperte** | **PRIMA di ragionare su statistiche, ruoli, archetipi, dadi, tributi** |
| `Engine/Worldloom_Engine_Vocabolario_Effetti.md` | le 19 caselle effetti + tabella carte | consulta PRIMA di ogni effetto (skill `effetti-carta`) |
| `Regolamento/Worldloom_Regolamento_v2.1.html` | regole del gioco fisico | sync quando l'engine cambia una regola; nota "warn" se l'engine semplifica |
| `Regolamento/Worldloom_Regolamento_Giocatori.html` | versione giocatore | tenere in sync col v2.1 |
| `UX/Worldloom_UX_Codex.html` | riferimento UI/animazioni "as-built" | aggiorna quando un lavoro UI/animazione atterra (skill `documenti-e-backup`) |
| `UX/Worldloom_Foglio_Maestro_UX.md` | brief di design UX (intento) | riferimento, non si "aggiorna" |
| `Engine/Storico_Lavoro.md` | log cronologico completo | solo lettura su richiesta |
| `Archivio/` | file morti | mai, se non richiesto |

## 2. Regole di processo — non negoziabili (dettaglio in `CLAUDE.md`)

1. **Toccare SOLO la cosa esatta chiesta.** Mai "già che ci sono". Problema collegato → SEGNALALO
   nella Roadmap, non toccarlo.
2. **Prima di scrivere codice: chiedere.** Feature grossa/architetturale → piano a parole + conferma
   esplicita prima di una riga.
3. **Quando l'utente conferma che una cosa è giusta** → test headless che ne congela sequenza/layout,
   SALVATO (non cancellato) in `Engine/test-blindati/`, `🔒 BLINDATO` nella Roadmap.
4. **Prima di toccare CSS / timing / funzioni condivise → graphify** (`/graphify query …`, skill
   `graphify-progetto`).
5. **Consultare il Vocabolario Effetti** prima di ogni effetto carta.
6. **Slot del campo tutti della stessa dimensione** (~5:7). L'utente ha fermato il lavoro due volte.
7. **Aggiornare i documenti nella stessa sessione** in cui la modifica atterra.
8. **Backup prima di lavoro grosso** (skill `documenti-e-backup`).

## 3. Il refactor in corso — "coda di step unica" (idea 59)

**Cos'è:** sostituire i ~10 campi-evento + ~10 timer + ~25 guardie sparse (causa radice dei bug di
tempistica: F.6, P0.3-5, P2.x) con **UNA fila ordinata `s.sequenza`** + un solo "direttore" UI.
Design completo e chiuso in **`Engine/Idea59_Coda_Step.md`**. Livello B (tutto).

**Decisioni già prese** (non riaprirle senza l'utente): morte creatura = passo `muta` differito ·
turno IA scandito uno scontro alla volta · `tempi.js` sorgente unica dei tempi (JS + CSS via custom
property) · i 3 componenti pop-up si riscrivono · 1v1 locale verificato in Fase 1.

**Le 5 Fasi** (§10 del doc), una alla volta, taglio netto per fase:
1. Infrastruttura (`s.sequenza`, `sequenza-avanti`, `sequenza-passo-concluso`, `<Sequenziatore>`,
   `tempi.js`) + **combattimento**.
2. Catena di effetti.
3. Pesca / evocazione / spostamento.
4. Turno IA (pacing scontro-per-scontro).
5. Banner di fase (Vespro/Vaticinio).

**Come si lavora una Fase:**
- rileggi la sezione della Fase nel doc + i suoi passi in §6/§7;
- `graphify` sul flusso che stai per toccare (raggio d'impatto);
- implementa **solo quella Fase**, ritira i campi vecchi elencati nella tabella §10;
- `npm run build` in `App - HTML - Test` → deve essere pulita;
- scrivi il test blindato della Fase in `Engine/test-blindati/<nome>.blindato.mjs` (NON cancellarlo):
  asserisce la **forma esatta di `s.sequenza`** dopo le azioni chiave (vedi §13 del doc per la lista);
- sweep headless ≥150 partite vsIA complete, zero crash/stalli;
- verifica dal vivo nel browser (skill `documenti-e-backup` §B per il metodo di misura);
- aggiorna `Engine/Idea59_Coda_Step.md` (stato Fase), `WORLDLOOM.md`, la Roadmap, l'UX Codex;
- risincronizza graphify se la Fase ha spostato responsabilità tra file (skill `graphify-progetto`);
- riporta all'utente **cosa esattamente è cambiato** e fermati.

## 4. Quando caricare un'altra skill

| Situazione | Skill |
|---|---|
| implementare/riparare un effetto di carta (anche solo "+N Attacco") | `effetti-carta` |
| toccare dati carte (Excel, cards.json, immagini Complete Card) | `pipeline-carte` |
| capire come sono collegate le parti / risincronizzare il grafo | `graphify-progetto` |
| aggiornare i documenti vivi · misurare un'animazione · fare un backup | `documenti-e-backup` |

## 5. Fine sessione — checklist

- [ ] `WORLDLOOM.md` aggiornato (stato sprint, eventuali documenti nuovi/di stato cambiato)
- [ ] Roadmap aggiornata (stato dei punti toccati, lista ri-proposta se un punto è chiuso)
- [ ] Documenti di dominio aggiornati (Regolamento / UX Codex / Vocabolario, secondo cosa è cambiato)
- [ ] `Engine/Storico_Lavoro.md` — riga cronologica su cosa è stato fatto e come è stato verificato
- [ ] test blindati salvati in `Engine/test-blindati/` per ciò che l'utente ha confermato
- [ ] graphify risincronizzato se sono cambiate strutture/relazioni di codice
- [ ] simulazioni headless `sim-*.mjs` usa-e-getta cancellate (`rm -f`) — i **blindati** invece restano
- [ ] build finale pulita (`npm run build`), console pulita nel browser
- [ ] riportato all'utente cosa è cambiato; **niente commit/push se non richiesto**

## Riferimenti

- `WORLDLOOM.md` (root) — pannello
- `CLAUDE.md` — regole + gotcha + mappa
- `Engine/Idea59_Coda_Step.md` — il refactor in corso
- memoria: `[[project-pannello-worldloom]]`, `[[project-roadmap-sessione-20260827]]`
