# 8 · Guida operativa per chi subentra

> Da tenere aperta mentre si lavora. Presuppone che tu abbia letto almeno i doc 01 e 02.

---

## 8.1 Setup in 5 minuti

```bash
cd "App - HTML - Test"
npm install
npm run build
```

Poi apri `App - HTML - Test/GIOCA.html` con un doppio clic (serve una password: la trovi in
`App - HTML - Test/password/password.md`).

Per lavorare con hot reload:

```bash
npm run dev
```

Serve anche **Python 3** con `openpyxl` per la pipeline dati:

```bash
python tools/validate_cards.py
```

---

## 8.2 Il rituale di avvio di ogni sessione

L'ordine è codificato in una skill (`avvio-sessione`) e non è negoziabile:

1. **`WORLDLOOM.md`** (root) — il pannello di controllo: stato dello sprint + indice dei documenti.
2. **`Engine/Roadmap_Sessione_2026-08-27.md`** — la lista bug/task con lo stato per punto.
3. **`CLAUDE.md`** — regole di processo e gotcha del codice.
4. La skill specifica del lavoro che stai per fare (§8.5).

Se stai per toccare **CSS, timing o funzioni condivise**: interroga prima il grafo
(`/graphify query …`) per vedere il raggio d'impatto.

---

## 8.3 Comandi che userai davvero

| Cosa | Comando |
|---|---|
| Build completo (sync-data + vite + GIOCA.html) | `npm run build` |
| Solo risincronizzare i dati nel bundle | `npm run sync-data` |
| Dev server | `npm run dev` |
| Un test blindato | `node "Engine/test-blindati/combattimento.blindato.mjs"` |
| Tutti i test blindati (bash) | `for f in Engine/test-blindati/*.mjs; do node "$f"; done` |
| Validare i dati carte | `python tools/validate_cards.py` |
| Rigenerare un `cards.json` | `python genera_cards_json.py "<percorso .xlsx>"` |

---

## 8.4 Le 8 regole che non si violano

1. **Tocca SOLO la cosa esatta chiesta.** Se noti un problema collegato, lo **scrivi nella
   roadmap**; non lo correggi. (L'utente ha fermato il lavoro per questo.)
2. **Prima di scrivere codice, chiedi.** Per feature grosse: spiega il piano a parole e aspetta
   conferma esplicita.
3. **Un punto alla volta**: discuti → fai → builda → verifica → aggiorna la roadmap → riproponi
   l'intera lista.
4. **Quando l'utente conferma che una cosa è giusta**, scrivi un test in `Engine/test-blindati/` e
   segna `🔒 BLINDATO` nella roadmap.
5. **Usa graphify** prima di toccare CSS / timing / funzioni condivise.
6. **Consulta il Vocabolario Effetti** prima di scrivere o riparare qualunque effetto di carta.
7. **Aggiorna i documenti nella stessa sessione** in cui la modifica atterra.
8. **Fai il backup** prima di lavoro grosso o architetturale.

E tre divieti tecnici:
- **`cards.json` mai a mano.**
- **Niente `confirm()` / `alert()` nativi** (il browser li disabilita dopo qualche uso e i tasti
  diventano inerti — è già successo due volte).
- **Nessuno slot del campo può essere più piccolo degli altri.**

---

## 8.5 Le skill installate (`.claude/skills/`)

| Skill | Quando si usa |
|---|---|
| **`avvio-sessione`** | come **prima cosa in ogni chat nuova**, e ogni volta che serve capire "da dove ripartiamo" |
| **`effetti-carta`** | prima di scrivere o riparare **qualunque** effetto di carta, anche un "+N Attacco" |
| **`pipeline-carte`** | quando si tocca il contenuto delle carte (Excel → json → immagini) ⚠️ contiene l'errore su `componi_carte.py`, vedi doc 07 |
| **`documenti-e-backup`** | quando una modifica va riflessa nei documenti; per **misurare o cambiare i tempi di un'animazione**; per fare i backup pre-lavoro-grosso |
| **`graphify-progetto`** | per interrogare il grafo di conoscenza e per risincronizzarlo dopo un lavoro |

---

## 8.6 Dove mettere le mani, per tipo di lavoro

| Voglio… | File da aprire |
|---|---|
| cambiare una **regola di gioco** | `src/game/gameReducer.js` + il capitolo corrispondente del regolamento (vanno sincronizzati) |
| implementare un **effetto di carta** | Vocabolario Effetti → poi `effettiCarta.js` / `magieTrappole.js` / `imprevisti.js` |
| cambiare un **tempo di animazione** | **solo** `src/game/tempi.js` (poi aggiorna `tempi.blindato.mjs` e l'UX Codex) |
| cambiare **l'ordine** di ciò che si vede | i punti che accodano passi in `gameReducer.js` (`accodaPassi`, `passoAnim`, `passoMuta`, `accodaBannerFase`) |
| toccare il **layout del campo** | `src/components/Campo.jsx` + `src/index.css` |
| toccare l'**editor mazzi** | `src/components/EditorMazzi.jsx` + `src/game/mazziSalvati.js` |
| aggiungere una **carta** | l'Excel del mondo, poi doc 07 §7.9 |
| toccare il **salvataggio** | `src/game/salvataggio.js` (attenzione a `CAMPI_TRANSITORI_A_NULL` e a `turnoScadenza`) |

---

## 8.7 Come si scrive un test blindato nuovo

Copia lo scheletro da uno esistente (`voli.blindato.mjs` è il più leggibile). Caratteristiche
obbligatorie:

```js
// BLINDATO — <cosa congela>. NON cancellare.
// Esegui: node Engine/test-blindati/<nome>.blindato.mjs
import { gameReducer } from "../../App - HTML - Test/src/game/gameReducer.js";
import cards from "../../App - HTML - Test/src/data/generated/mazzi/frost-land/cards.json"
  with { type: "json" };
```

- **importa il reducer direttamente** — nessun mock, nessun DOM;
- usa **carte vere** dal `cards.json` bundlato;
- asserisce la **forma esatta di `s.sequenza`** (`[tipo:nome, …]`), non "il gioco funziona";
- riproduce a mano ciò che farebbero `<Sequenziatore>` e lo scorrimento della coda visiva in
  `App.jsx` (gli helper sono già scritti nei test esistenti: copiali);
- stampa `  ok  <messaggio>` per ogni asserzione e chiude con `TUTTO BLINDATO ✅` / exit code ≠ 0;
- ha un **limite di giri** nei loop di drenaggio, per non mascherare un loop infinito come un test
  verde.

⚠️ **Attenzione a costruire stati a mano**: gli array `primaLinea`/`retrovia` sono **densi** in
partita reale. Metterci dentro dei `null` fa esplodere `CellaCreatura`.

---

## 8.8 Checklist di fine sessione

- [ ] `npm run build` pulito
- [ ] i **6 test blindati** verdi
- [ ] console del browser pulita in una partita reale
- [ ] `Engine/Roadmap_Sessione_2026-08-27.md` aggiornato (stato ✅/🟡/🔴 + note della modifica)
- [ ] `WORLDLOOM.md` aggiornato (sezione "Dove siamo adesso")
- [ ] `Engine/Storico_Lavoro.md`: voce cronologica di cosa è stato fatto e **perché**
- [ ] se hai toccato UI/animazioni → `UX/Worldloom_UX_Codex.html`
- [ ] se hai toccato una regola → il **Regolamento** (entrambe le versioni!), con nota di revisione
      se l'engine diverge
- [ ] se hai implementato un effetto → tabella del **Vocabolario Effetti** a ✅ con la data
- [ ] simulazioni usa-e-getta `sim-*.mjs` **cancellate**
- [ ] eventuale diagnostica temporanea rimossa (o annotata nella roadmap se resta)

---

## 8.9 Trappole in cui cadrai se non le conosci

Sintesi di doc 02 §2.7 e doc 06 §6.7 — le più costose:

| Trappola | Sintomo che vedrai |
|---|---|
| Hook chiamati dopo il return anticipato di `SchermataIniziale` in `Partita()` | React esplode passando da "nessuna partita" a "partita in corso" |
| Import da `gameReducer.js` dentro `magieTrappole.js` / `effettiCarta.js` | import circolare, build rotto |
| Aggiungere una dispatch "di servizio" che azzera `s.codaVisiva` | eventi visivi persi, animazioni che spariscono |
| Animare `transform` su una carta avversaria senza ripetere `rotate(180deg)` in ogni keyframe | la carta si raddrizza a metà animazione |
| Toccare `box-sizing` su `.campo-slot` | tutti gli slot con padding/bordo proprio si spostano |
| Confondere prospettiva a schermo e seme `"io"`/`"avversario"` in 1v1 locale | click sulla carta sbagliata |
| Cambiare un valore in `tempi.js` e basta | `tempi.blindato.mjs` fallisce (è voluto: aggiorna lo snapshot **nella stessa sessione**) |
| Accodare un passo `muta:"ia"` non in fondo alla fila | il respiro dell'IA scavalca una decisione del giocatore |
| Rendere il passo `ia` bloccato dalla coda visiva | **deadlock**: il turno IA si ferma per sempre |
| Togliere il ripiego "mazzo salvato senza id → risolvi per nome" | i mazzi salvati degli utenti si svuotano |
| Cambiare l'id del mondo `kepler-452b` | salvataggi e mappa cartelle invalidati |

---

## 8.10 Glossario dei termini di progetto

| Termine | Significato |
|---|---|
| **Pedina** | la creatura giocabile (ex "Alieno") |
| **Stratega** | il giocatore, con i suoi 200 PV |
| **Worldloom** | il mazzo principale (40-60 copie) |
| **Imprevisti** | mazzetto separato; la carta avanza a ogni Vaticinio e si attiva a 4 movimenti |
| **Marbion** | il mondo ex "Kepler-452B" (id tecnico ancora `kepler-452b`) |
| **Ruota** | il ciclo di efficacia dei 5 Archetipi |
| **la fila / `s.sequenza`** | la coda di step unica: l'ordine di tutto ciò che si vede |
| **la coda visiva / `s.codaVisiva`** | il vecchio meccanismo, ancora usato dai flussi non migrati |
| **passo** | un elemento della fila: `anim` / `scelta` / `muta` / `banner` |
| **respiro** | il passo `muta:"ia"` da 900 ms fra due mosse dell'avversario |
| **blindato / blindatura** | code-path congelato da un test in `Engine/test-blindati/` |
| **catena** | la finestra di risposta a cascata (priorità stile Magic, risoluzione LIFO) |
| **Complete Card** | l'illustrazione finita della carta, già impaginata |
| **il tavolo** | il wrapper scalato che contiene mano + campo + azioni (P0.6) |
| **rail** | la colonna comandi laterale di ogni giocatore (anello PV, timer, fase) |
| **usa-e-getta** | simulazione `sim-*.mjs` da cancellare dopo l'uso |

---

## 8.11 Se hai un solo pomeriggio per capire il progetto

1. Leggi `WORLDLOOM.md`, poi i doc **01**, **02** e **04** di questa cartella (~40 min).
2. `npm run build`, apri `GIOCA.html`, **gioca una partita intera vs IA** guardando le
   tempistiche: dado → balzo → numero → morte, e i 5 cartelli di fase (~20 min).
3. Apri `src/game/sequenza.js` (176 righe, tutte commentate) e `src/components/Sequenziatore.jsx`
   (69 righe): capito quello, hai capito l'80% dell'architettura attuale (~20 min).
4. Lancia i 6 test blindati e leggi l'output: ti raccontano il contratto del sistema meglio di
   qualunque descrizione (~15 min).
5. Leggi il doc **06** (correzioni): capirai perché il codice ha la forma che ha (~30 min).
