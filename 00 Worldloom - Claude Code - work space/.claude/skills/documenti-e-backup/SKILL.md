---
name: documenti-e-backup
description: >-
  Manutenzione dei documenti vivi di Worldloom e disciplina dei backup. USA questa skill: (1) ogni
  volta che una modifica atterra e va riflessa nei documenti — Regolamento, UX Codex, Vocabolario
  Effetti, Roadmap/CLAUDE.md ("aggiorna il regolamento", "sincronizza i documenti", task chiuso);
  (2) per QUALUNQUE lavoro su animazioni e loro tempi — verificare quanto dura un'animazione,
  misurarla nel browser, cambiarne il timing, registrarla nel foglio UX ("verifica questa
  animazione", "quanto dura il dado", "il balzo è troppo lento"); (3) PRIMA di iniziare un lavoro
  grosso o architetturale, per fare le copie di sicurezza ("fai un backup", "sto per toccare la
  catena di effetti"). I backup NON si consultano mai se non esplicitamente richiesto.
---

# Documenti vivi + backup — Worldloom

## A. Documenti vivi da tenere sincronizzati

Ogni modifica sostanziale va riflessa nel documento corrispondente **nella stessa sessione**, non
"dopo". Non è burocrazia: questi file sono l'unico modo per riferire un bug a un punto preciso e
per non riprogettare due volte la stessa cosa.

| Documento | Copre | Quando aggiornarlo |
|---|---|---|
| `Regolamento/Worldloom_Regolamento_v2.1.html` | le regole di gioco per il gioco fisico | ogni volta che una regola cambia nel motore, o l'engine diverge dal testo. Se l'engine "semplifica" una regola, dillo nel testo con una nota di revisione (stile "warn"), non fingere che coincidano |
| `Regolamento/rules.json` | dati di bilanciamento per il game design (NON letto a runtime) | quando cambiano dadi per Archetipo, Ruota di efficacia, PV, slot |
| `UX/Worldloom_UX_Codex.html` | riferimento vivo di UI e animazioni — un riquadro per aspetto, col file dove vive, i tag classi/keyframe/stato, e un chip di stato | ogni volta che un lavoro UI/animazione atterra (vedi sezione B) |
| `Engine/Worldloom_Engine_Vocabolario_Effetti.md` | le 19 caselle effetti + tabella di ogni codice-carta | gestito dalla skill `effetti-carta` — aggiornare la colonna "Stato" quando si implementa un codice |
| `Engine/Roadmap_Sessione_2026-08-27.md` | la lista bug/task in corso della sessione | quando un task si chiude o cambia stato (leggerla per prima in una chat nuova — memoria `[[project_roadmap_sessione_20260827]]`) |
| `CLAUDE.md` (root progetto) | log cronologico di tutto il lavoro fatto + regole di processo | alla fine di ogni pezzo di lavoro, con cosa è stato cambiato e come è stato verificato |

Regola: "aggiornare SEMPRE il regolamento e tutto" — se dopo una modifica non sai in quale
documento va riflessa, è probabile che vada in più di uno.

## B. Come si verificano le animazioni e i loro tempi

Questa è la parte fondamentale. Le animazioni Worldloom sono **pura messa in scena lato UI**: la
logica di gioco (PV, carte che muoiono) resta istantanea. I tempi non devono "coprire a occhio" la
durata di un'altra animazione — si usano gate di stato espliciti.

### Dove vivono i tempi

| Cosa | Dove |
|---|---|
| Ritardo prima di rivelare ogni evento in coda | `App - HTML - Test/src/App.jsx` → `RITARDO_PRIMA_DI_MS` (`attacco:150`, `dado:200`, `esitoCombattimento:600`, `dannoDiretto:600`, `imprevistoEsito:300`, `morte:1200`) + `RITARDO_DEFAULT_MS:900` |
| Coda degli eventi visivi | `s.codaVisiva` (gameReducer.js), dispatch `avanza-coda-visiva`, `useEffect` in App.jsx che dipende dalla **lunghezza** della coda |
| Gate che fermano lo scorrimento | `dadoInCorso`, `pescaInCorso`, `morteInCorso`, `notificaEffetto`, `vincitore` |
| Durata del turno | `App - HTML - Test/src/game/costanti.js` → `DURATA_TURNO_MS` |
| Durate/curve delle singole animazioni | `App - HTML - Test/src/index.css` → `@keyframes …` + le rispettive `animation:` / `transition:` |

### Metodo di misura nel browser

1. `preview_start` del dev server; se serve uno scenario raro (dado quasi scaduto, evocazione IA in
   corso, catena aperta, Cimitero a N carte), **inietta lo stato via `localStorage`** col sistema
   di salvataggio (`wl_partita_salvata`) e "Riprendi partita".
2. **Posizioni e spostamenti**: `element.getBoundingClientRect()` prima/dopo, non a occhio.
3. **Rotazioni e scale a metà animazione**: leggi `getComputedStyle(el).transform` → interpreta la
   `matrix(...)` (es. `matrix(-1,0,0,-1,0,0)` = `rotate(180deg)`). È così che si è verificato che
   le carte capovolte dell'avversario sommano correttamente rotazione ambientale + keyframe.
4. **Durate e colori**: `getComputedStyle(el).animationDuration` / `.transitionDuration` / colori
   RGB calcolati.
5. **Console e rete**: `read_console_messages`, `preview_logs` per errori; nessun errore in console
   su una scheda pulita è parte della prova.
6. **Prova finale**: `screenshot` a metà animazione per il cambiamento visivo.

### Come registrarlo nel UX Codex

Nel riquadro dell'aspetto (o creane uno nuovo se non c'è):
- descrizione in una frase di cosa si vede
- `card-file` = il file dove vive
- `tag-row` = classi CSS / `@keyframes` / campi di stato del reducer coinvolti
- il **valore reale misurato** del tempo (es. "~700ms di roll + 700ms di faccia ferma")
- chip di stato: `chip-ok` "Fatto e verificato" solo se l'hai misurato dal vivo;
  `chip-limit` "Fatto, con un limite noto" + descrizione del limite; `chip-pending` "Da fare"

Aggiorna in place, non riscrivere il Codex da zero.

## C. Backup prima di lavoro grosso

PRIMA di iniziare un lavoro **grosso o architetturale** (catena di effetti, coda di animazioni,
redesign del campo, una modalità nuova, refactoring esteso), salva **due copie**:

1. **Copia giocabile** — fai `npm run build` dentro `App - HTML - Test`, poi copia `GIOCA.html` in:
   ```
   App - HTML - Test/Versioni gioco/Worldloom_Gioco_vX.Y_<motivo>_AAAA-MM-GG.html
   ```
2. **Copia completa del sorgente** in:
   ```
   00 Worldloom - Claude Code - work space/Backup sorgente <motivo> AAAA-MM-GG/
   ```

Poi **annota il backup in `CLAUDE.md`** (path esatto + cosa include), così è ritrovabile.

I backup sono una **rete di sicurezza per rivedere concetti** se qualcosa va storto durante il
lavoro esteso. **Non guardarli mai** — non aprirli, non citarli, non confrontarli — a meno che
l'utente non lo chieda esplicitamente. Sono locali alla macchina (le cartelle `Versioni gioco/` e
`Backup sorgente …/` non sono necessariamente in git).

## Riferimenti

- memoria: `[[project_ux_codex]]`, `[[project_roadmap_sessione_20260827]]`
- `App - HTML - Test/src/App.jsx` — `RITARDO_PRIMA_DI_MS`, `useEffect` della coda visiva
- regola di processo in `CLAUDE.md`: una sezione alla volta, build e riporta cosa è cambiato
