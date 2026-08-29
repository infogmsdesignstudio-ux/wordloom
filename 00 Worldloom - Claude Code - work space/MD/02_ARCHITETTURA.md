# 2 · Architettura tecnica

## 2.1 Stack e vincoli di progetto

| Cosa | Scelta | Perché (vincolo dichiarato) |
|---|---|---|
| UI | **React 18.3** | nessuna libreria di stato, nessun router |
| Build | **Vite 5.4** + `@vitejs/plugin-react` | |
| Bundling | **`vite-plugin-singlefile`** | il gioco deve aprirsi **a doppio clic**, senza server: JS, CSS, font e **tutte le illustrazioni** finiscono inline nell'HTML come data URI |
| Output | `dist/index.html` → copiato in **`GIOCA.html`** (~26 MB) | un file solo, condivisibile |
| Stato | **un `useReducer`** + Context | `src/game/gameReducer.js`, 2.708 righe |
| Persistenza | **`localStorage`** | nessun backend, mai |
| Stile | **un solo `src/index.css`** | tutte le animazioni sono CSS `@keyframes` |
| Test | **script `.mjs` headless in Node**, che importano il reducer | nessun framework di test installato |
| Dati carte | JSON generati da Excel, **bundlati a build time** (`import.meta.glob` eager) | un `fetch` a runtime fallirebbe su `file://` per CORS |

Conseguenze da tenere a mente:

- **niente `fetch`, niente API, niente variabili d'ambiente a runtime.** Tutto ciò che il gioco
  sa lo sa a build time.
- **il peso del file è un vincolo reale**: aggiungere font e immagini fa crescere `GIOCA.html`
  (i due font brand hanno aggiunto ~1,5 MB). Esiste una variante "compressed" delle immagini,
  attivabile con la variabile `WORLDLOOM_COMPLETE_CARDS_DIR`.
- `GIOCA.html` è protetto da un "cancello" con password (`src/components/Cancello.jsx` +
  `src/game/password.js`); la credenziale sta in `App - HTML - Test/password/password.md`.

## 2.2 Comandi

```bash
npm run build
```

La catena completa (definita in `package.json`):

| Script | Cosa fa |
|---|---|
| `sync-data` | `scripts/sync-data.mjs`: copia i `cards.json` di ogni mondo, le `Complete cards/*.jpg`, gli sfondi campo e `rules.json` dentro `src/data/generated/` |
| `predev` / `prebuild` | lanciano `sync-data` automaticamente |
| `dev` | server Vite di sviluppo |
| `build` | build Vite → `dist/index.html` (file singolo) |
| `postbuild` | `scripts/copy-play-file.mjs`: `dist/index.html` → `GIOCA.html` |

I test blindati si lanciano a mano, uno per uno:

```bash
node "Engine/test-blindati/combattimento.blindato.mjs"
```

---

## 2.3 Mappa dei moduli

`App - HTML - Test/src/` — ~9.980 righe fra `.js` e `.jsx`.

### Motore di gioco — `src/game/` (nessun React qui, moduli puri)

| File | Righe | Ruolo |
|---|---|---|
| **`gameReducer.js`** | **2.708** | il reducer unico: 28 tipi di dispatch, ~80 funzioni interne. È il cuore |
| `mazzo.js` | 105 | costruzione mazzo/mazzetto Imprevisti, `creaCreatura`, `viva`, `vitaAttuale`, contatore id |
| `giocatore.js` | 122 | stato di un giocatore, `pesca`, `campoDi`, `bersagliValidi`, `ripulisciCampo`, avanzamento in prima linea |
| `costanti.js` | 47 | Ruota degli Archetipi, dadi a 8 facce per Archetipo, dado Imprevisti, PV iniziali, slot |
| `combattimento.js` | 109 | risoluzione dei simboli del dado, matchup, diritto di ripetizione |
| `evocazione.js` | 73 | evocazione normale/bonus, tributi |
| `effettiCarta.js` | 380 | effetti delle Pedine per "momento" (evocazione, simbolo, morte, inizio turno, …) |
| `effetti/primitive.js` · `effetti/tipiMagia.js` | 137 + 26 | primitive riusabili, classificazione sottotipo Magia |
| `magieTrappole.js` | 349 | Magie, Trappole, Terreni, eleggibilità di risposta |
| `catena.js` | 80 | struttura dati della catena di effetti (LIFO, priorità) |
| `imprevisti.js` | 155 | avanzamento e attivazione degli Imprevisti |
| **`sequenza.js`** | 176 | **selettori read-only sulla coda di step** — vedi §2.5 |
| **`tempi.js`** | 74 | **sorgente unica di tutti i tempi** (JS + CSS) — vedi §2.6 |
| `salvataggio.js` | 105 | salva/carica partita su `localStorage` (uno slot solo, autosave a ogni mossa) |
| `mazziSalvati.js` | 266 | motore dell'editor mazzi: limiti, validazione, import/export `.json` |
| `statistiche.js` | 58 | statistiche vittorie/sconfitte per mazzo |
| `prospettiva.js` | 32 | chi vede il campo da che lato (1v1 locale) |
| `password.js` | 11 | cancello di GIOCA.html |
| `GameContext.jsx` | 49 | Context React: `stato`, `dispatch`, `mazzoId`, `editorAperto` |

### Interfaccia — `src/components/` e `src/App.jsx`

| File | Righe | Ruolo |
|---|---|---|
| `App.jsx` | 777 | schermata iniziale, selettore mazzi, **`Partita()`** (il contenitore con tutti gli `useEffect` di pacing), schermata vittoria |
| `Campo.jsx` | 1.056 | il campo: celle creatura, file Magie/Trappole, Terreno, pile, **rail comandi**, zone specchiate |
| `EditorMazzi.jsx` | 607 | editor mazzi completo (lista, filtri, icona, sfondo, import/export) |
| `CatenaStriscia.jsx` | 271 | la striscia della catena di effetti + risoluzione frame |
| `PromptCombattimento.jsx` | 198 | pop-up "Difendi o lasci passare?" e diritto di ripetizione |
| `Mano.jsx`, `Carta.jsx`, `DettaglioCarta.jsx` | 167+157+67 | mano, carta (3 rese: piena / compatta / mini), zoom sfogliabile |
| `AnimazionePescata/Evocazione/Posizionamento/Morte.jsx` | ~600 tot. | i quattro "voli" |
| **`Sequenziatore.jsx`** | 69 | **il direttore unico della coda di step** |
| `TitoloFase.jsx` | 70 | i banner di fase (Rifornimento…Vespro) |
| `LancioDado.jsx`, `Dado.jsx`, `LancioMoneta.jsx` | 82+76+90 | dado 3D e lancio della moneta |
| `NotificaEffetto.jsx`, `Log.jsx`, `PannelloOpzioni.jsx`, `SceltaRifornimento.jsx`, `VfxMagia.jsx`, `Cancello.jsx` | | pop-up, registro mosse, opzioni, VFX |

### Dati — `src/data/`

| File | Ruolo |
|---|---|
| `mazzi-registry.js` | elenco statico dei mondi: `frost-land`, `kepler-452b` |
| `useMazzi.js` | incorpora nel bundle i `cards.json`, le Complete cards e gli sfondi via `import.meta.glob` eager; risolve nome carta → immagine |
| `effettiRuolo.js` | descrizioni testuali dei 6 Ruoli |
| `generated/` | **cartella scritta da `sync-data.mjs`, mai a mano** |

---

## 2.4 La forma dello stato

Lo stato è **un oggetto JS semplice** — niente `Map`, `Set` o funzioni: si serializza diretto in
`localStorage`. Creato da `nuovaPartita()` (gameReducer.js:731).

```js
{
  giocatori: { io: {...}, avversario: {...} },   // vedi giocatore.js
  turno, fase,                    // fase 0..4  (⚠ la fase 5 "Vespro" NON esiste come valore)
  giocatoreAttivo, primoGiocatore,
  modalitaGioco: "vsIA" | "1v1locale",
  identitaMazzoIo / Avversario,   // quale mazzo salvato usa ciascun lato (statistiche)
  sfondoCampoIo / Avversario,     // URL già risolto: il reducer non sa nulla di immagini
  partitaAvviataAlle,             // id univoco per-partita
  turnoScadenza,                  // timestamp ASSOLUTO (Date.now() + TEMPI.turno)

  // --- selezione / decisioni in sospeso ---
  manoSelezionata, modalita, tributiSelezionati, movimentoSelezionato,
  candidatoScambio, bersaglioMagia, numeroBersagliMagia, bersagliMagiaSelezionati,
  magiaSlotSelezionata, combattimento, avanzamentoRichiesto,

  // --- messa in scena ---
  sequenza: [],        // ⭐ LA CODA DI STEP UNICA (§2.5)
  codaVisiva: [],      // la vecchia coda di eventi visivi, ancora usata dai flussi non migrati
  prossimoIdVisivo,    // contatore monotono condiviso
  lancioDado, dadoInCorso,   // dado IMPREVISTI (quello di combattimento è un passo della fila)
  morteInCorso,              // morte da Imboscata (Trappola): flusso non migrato
  eventoDanno, vfxMagia, notificaEffetto, avanzamentoAutomaticoRecente,
  faseVisibile, imprevistoVisivo,   // due "pin" attraverso il dado Imprevisti

  terreno, catena, ultimoTiroImprevisti,
  messaggio, log, vincitore
}
```

Per giocatore (`giocatore.js`): `hp`, `mazzo`, `mano`, `primaLinea[3]`, `retrovia[2]`, `cimitero`,
`mazzettoImprevisti`, `imprevistoInCorso`, `cimiteroImprevisti`, `magieTrappole`, `turniGiocati`,
`evocazioneNormaleFatta`, `evocazioneBonusFatta`, `aggressoriAttivatiQuestoTurno`,
`difensoriAttivatiQuestoTurno`.

### I 28 tipi di dispatch

**Di gioco** (azzerano `s.codaVisiva`): `nuova-partita` · `carica-stato` · `rifornimento` ·
`continua-fase` · `seleziona-mano` · `seleziona-tributo` · `conferma-tributo` · `piazza-magia` ·
`attiva-magia-piazzata` · `attiva-trappola` · `bersaglio-magia` · `scegli-bersaglio` ·
`muovi-creatura` · `conferma-scambio-retrovia` · `scegli-attaccante` · `scegli-avanzamento` ·
`decidi-difesa` · `decidi-ripetizione` · `annulla` · `timer-scaduto` · `abbandona-a-menu`

**Di servizio** (⚠️ **NON** azzerano `codaVisiva`, altrimenti perderebbero eventi in coda):
`avanza-coda-visiva` · `chiudi-notifica` · `sequenza-passo-concluso` ·
`dado-animazione-conclusa` · `morte-animazione-conclusa` · `catena-aggiungi-trappola` ·
`catena-passa`

---

## 2.5 ⭐ La "coda di step unica" (idea 59) — il cuore dell'architettura attuale

È il refactor più importante del progetto, progettato il 2026-08-28 e completato in 5 fasi il
2026-08-29. Documento di progetto: `Engine/Idea59_Coda_Step.md` (14 sezioni).

### Il problema che risolveva

Prima non esisteva un direttore unico dei tempi. C'erano **~10 campi-evento** nello stato,
**~10 timer** sparsi in `App.jsx` e **~25 guardie** che si controllavano a vicenda
(`dadoInCorso`, `esitoInCorso`, `pescaInCorso`, `morteInCorso`, `evocazioneInCorso`,
`idBalzoRichiesto`, `idDadoRichiesto`, `iaBloccataDaPrompt`, il pinning di `imprevistoVisivo`,
`codaVisiva.length`…). Ogni correzione di tempistica aggiungeva una guardia e le combinazioni
esplodevano: era la **causa radice** di un'intera famiglia di bug (P0.3–P0.5, P2.x, F.6).

### Il concetto

Il reducer produce **una sola fila ordinata** `s.sequenza`. `s.sequenza[0]` è il passo "in scena
adesso". **Niente avanza finché la fila non si svuota.**

```js
{ id, tipo: "anim" | "scelta" | "muta" | "banner", nome, dati, durataMs?, attende? }
```

| Tipo | Significato | Chi lo chiude |
|---|---|---|
| **`anim`** | un momento visivo a tempo (dado, balzo, numero di danno, volo di pescata/evocazione/spostamento) | il componente d'animazione con `dispatch("sequenza-passo-concluso")`, oppure il timer di sicurezza |
| **`scelta`** | una decisione bloccante (Difendi/incassa, diritto di ripetizione, finestra catena) | la dispatch dell'azione del giocatore |
| **`muta`** | una mutazione di stato **differita**: la scenografia si vede prima, lo stato cambia dopo (morte in combattimento, risoluzione frame catena, respiro IA) | il reducer, al momento dell'avanzamento |
| **`banner`** | un cartello di transizione di fase | `TitoloFase.jsx` a `durataMs` scaduti |

I nomi dei passi oggi in uso: `dado`, `balzo`, `danno`, `morte`, `catena`, `catenaRisoluzione`,
`pesca`, `evoca`, `sposta`, `ia`, `bannerFase`.

### Il direttore

`src/components/Sequenziatore.jsx` (69 righe) — guarda `s.sequenza[0]` e lo fa avanzare:
- `scelta` → nessun timer, aspetta il giocatore;
- tutti gli altri → **timer di sicurezza** (`durataMs` o il default per nome, + 300 ms). Il
  componente d'animazione normalmente segnala prima; se quel segnale si perde, il timer avanza
  lo stesso — **nessuno stallo possibile**.

### Le due guardie del pacing (vivono in `sequenza.js`, non inline nei componenti)

```js
filaBloccaCodaVisiva(s)  // App.jsx: la coda visiva si ferma finché la fila ha una SCENOGRAFIA
scenaLiberaPerIa(s)      // Sequenziatore: il respiro IA non scade finché la scena non è libera
```

Sono **l'una il rovescio dell'altra**. Vivono insieme in un file solo perché se bloccassero nello
stesso istante il turno IA si fermerebbe per sempre — **è successo davvero**, colto dal vivo nella
verifica della Fase 4 (vedi doc 06). Da qui due invarianti congelati dai test:

1. **il passo `muta:"ia"` sta SEMPRE in fondo alla fila** (applicato in `accodaPassi`, in un posto
   solo, non a carico dei chiamanti). Senza, con una catena a 2 frame il respiro dell'IA finiva
   davanti a una decisione ancora in sospeso del giocatore;
2. **il passo `ia` è l'unica eccezione** alla regola "la coda visiva aspetta la fila": è respiro,
   non scenografia — è proprio il momento in cui si deve poter vedere quello che è appena successo.

### Cosa è stato *ritirato* dal codice grazie a questo refactor

`s.pescaInCorso` · `s.evocazioneInCorso` · `s.movimentiInCorso` · `s.catenaRisoluzioneInCorso` ·
`s.iaInAttesa` · `legacyOccupato` · `iaBloccataDaPrompt` (un OR di 8 condizioni) · le dispatch
`avanza-ia`, `catena-conferma-risoluzione`, `*-animazione-conclusa` dei voli · l'`useEffect` con
il timer fisso di 900 ms in `App.jsx` · i timer locali e lo `storico` di `CatenaStriscia` ·
l'`useEffect` di cambio-fase, il contatore di id locale e il `DURATA_MS` a mano di `TitoloFase`.

### Deviazione dichiarata (non è un dimenticanza)

`faseVisibile` e `imprevistoVisivo` **non** sono stati ritirati, benché il piano lo prevedesse:
"pinnano" due letture attraverso il **dado Imprevisti**, che è un flusso ancora su `codaVisiva`.
Ritirarli ora riaprirebbe un bug vecchio. Appartengono a un eventuale giro "dado Imprevisti nella
fila".

### Cosa gira ancora su `codaVisiva` (la vecchia strada)

Dado **Imprevisti**, notifiche, `VfxMagia`, morte da **Imboscata** (Trappola), numero del danno
diretto. Girano **dopo** che `s.sequenza` è vuota.

---

## 2.6 `tempi.js` — sorgente unica dei tempi

Ogni durata di animazione e ogni "respiro" vive in `src/game/tempi.js`, e le `@keyframes` di
`index.css` leggono **gli stessi numeri** via custom property iniettate una volta all'avvio
(`iniettaTempiCss`). JS e CSS non possono disallinearsi.

```js
dado: { roll: 720, assesto: 450, totale: 1170 }
balzo: 550
numeroDanno: 1150
morte: { contraccolpo: 240, volo: 380, impatto: 120, totale: 740 }
catena: { countdown: 15000, scenografia: 700 }
pesca: { unaCarta: 1700, perCartaExtra: 340 }
evoca: 1970
sposta: 620
ia: { respiro: 900 }
banner: { fase: 1750, vespro: 2600 }
respiro: 200            // gap di default fra un passo e il successivo
turno: 180000           // 180 s di timer di turno
```

⚠️ `iniettaTempiCss()` **non** va chiamata a livello di modulo: `tempi.js` è importato anche dai
test headless in Node, dove `document` non esiste.

⚠️ Questo oggetto è **blindato** da `Engine/test-blindati/tempi.blindato.mjs`: cambiarlo fa
fallire il test finché non aggiorni lo snapshot **nella stessa sessione**, e l'UX Codex.

---

## 2.7 Gotcha del codice — trappole già pagate care

Copiate da `CLAUDE.md`, sono errori realmente commessi in passato:

1. **Ordine degli hook in `App.jsx → Partita()`**: gli `useEffect` in cima (autosave, statistiche,
   coda visiva, salto fase) vanno chiamati **prima** del return anticipato di `SchermataIniziale`,
   altrimenti l'ordine degli hook cambia fra "nessuna partita" e "partita in corso" e React esplode.
2. **Import circolare vietato**: `magieTrappole.js` ed `effettiCarta.js` **non** possono importare
   da `gameReducer.js`. Chi ha bisogno di roba del reducer o la duplica localmente, o la chiamata
   resta nei punti esterni in `gameReducer.js`. (`sequenza.js` è importabile: è di soli selettori
   read-only, senza import propri.)
3. **`s.codaVisiva` è azzerata a ogni dispatch "vera"**; le dispatch di servizio **non** la
   azzerano, altrimenti perdono eventi ancora in coda.
4. **Prospettiva vs identità del seme** (1v1 locale): il capovolgimento visivo va legato alla
   **posizione a schermo**, i gate di interattività/proprietà al **seme fisso** `"io"`/`"avversario"`.
   Confonderli = click sulla carta sbagliata. Usare `chiDecideOra(stato)` da `prospettiva.js`.
5. **Carte avversarie** (`.carta-capovolta`, ruotate 180°): ogni keyframe che anima `transform`
   deve includere `rotate(180deg)` in **ogni** fotogramma, o il rotate statico viene sovrascritto
   a metà animazione.
6. **`box-sizing: border-box`** sta sulla regola base `.campo-slot`: non toccarla senza
   ricontrollare tutti gli slot con padding/bordo proprio.
7. Gli array `primaLinea`/`retrovia` sono **densi** in partita reale. Test con stati costruiti a
   mano che contengono `null` fanno esplodere `.some(c => c.id === …)` in `CellaCreatura`.
8. **Tutti gli slot del campo** devono avere sempre la stessa dimensione e proporzione carta
   (~5:7). Mai uno slot "compatto" per le pile: l'utente ha fermato il lavoro **due volte** per
   questo.

---

## 2.8 Persistenza

| Chiave `localStorage` | Contenuto |
|---|---|
| `wl_partita_salvata` | **un solo slot**, autosalvato a ogni mossa, cancellato a partita finita |
| `wl_mazzi_salvati` | i mazzi personalizzati dell'editor |
| (statistiche) | vittorie/sconfitte per mazzo, `statistiche.js` |

Al **caricamento** (`caricaPartita`) si ripulisce, in un punto solo:
- i campi transitori di sola messa in scena tornano `null` (`CAMPI_TRANSITORI_A_NULL`);
- `codaVisiva` e **`sequenza` si svuotano** (i passi in sospeso aspettano timer che non
  arriveranno mai): lo stato di gioco vero è già risolto, si perde solo la scenografia a metà;
- `turnoScadenza` viene **ricalcolato** (`Date.now() + TEMPI.turno`) — è un timestamp assoluto, e
  senza questo il turno saltava all'istante alla ripresa (bug P0.10);
- il contatore di id di `mazzo.js` viene fatto ripartire oltre il massimo trovato nello stato.

Il case `carica-stato` del reducer chiama poi `sincronizzaPassoCatena` e `sincronizzaPassoIa`,
che **ricostruiscono** i passi mancanti: senza, una partita ripresa a metà turno IA o con una
catena aperta restava ferma per sempre.
