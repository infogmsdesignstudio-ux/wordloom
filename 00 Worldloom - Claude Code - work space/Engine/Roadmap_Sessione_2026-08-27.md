# Roadmap sessione 2026-08-27 (feedback dal vivo, lista lunga)

> **In una chat nuova, apri prima `WORLDLOOM.md` (root) — il pannello di controllo.** Questo file resta
> il dettaglio per-punto della lista bug/task; `WORLDLOOM.md` ne dà la sintesi + lo stato dello sprint.
> (Riordino documenti 2026-08-28: CLAUDE.md snellito, storico in `Engine/Storico_Lavoro.md`, peso morto in `Archivio/`.)


> **Regola di lavoro per questo documento** (richiesta esplicita dell'utente): un punto alla volta.
> Prima di iniziare un punto: si discute a parole come procedere, si fanno domande se qualcosa non è
> chiaro, si calcolano le conseguenze. Finito un punto: si builda, si verifica, si aggiorna questo
> file (stato ✅ + note), e si ripropone l'INTERA lista prima di passare al successivo. Niente lavoro
> ripetuto 10 volte: ogni modifica mirata e circoscritta. Questo file è la fonte di verità tra una
> sessione/chat e l'altra — se si apre una chat nuova, ripartire da qui.
>
> **⚠️ REGOLE ANTI-REGRESSIONE (concordate 2026-08-28 dopo frustrazione esplicita dell'utente: "correggiamo
> qualcosa e si ripropone, è un lavorare all'infinito"):**
> 1. **Toccare SOLO la cosa esatta chiesta.** Mai "già che ci sono". Se noti un problema collegato →
>    lo SEGNALI nella roadmap, NON lo tocchi. (Violato il 2026-08-28: chiesta la carta Imprevisto, toccati
>    anche `.campo-slot-trappola` e `.campo-pila-sfondo` → possibili regressioni. Non rifarlo.)
> 2. **Quando l'utente conferma che una cosa è giusta**: (a) scrivere un test headless usa-e-getta che
>    ne blocca la sequenza/il layout esatto e SALVARLO (non cancellarlo) in `Engine/test-blindati/`,
>    (b) segnare qui `🔒 BLINDATO`. Quei code-path diventano off-limits senza rifare il test.
> 3. **Prima di toccare CSS/timing/funzioni condivise: usare graphify** (`/graphify query`) per vedere
>    il raggio d'impatto. (Non è stato usato per gran parte del 2026-08-28.)
> 4. **Cause note di regressione tempistiche**: NON c'è una coda di step unica — ci sono ~10 campi-evento
>    + ~10 timer in App.jsx + ~10 guardie (`dadoInCorso`/`esitoInCorso`/`pescaInCorso`/`morteInCorso`/
>    `evocazioneInCorso`/`imprevistoVisivo` pinning/`codaVisiva.length`/`idBalzoRichiesto`/`idDadoRichiesto`/
>    `iaBloccataDaPrompt`…) che si controllano a vicenda. Ogni fix aggiunge una guardia → le combinazioni
>    esplodono. **Cura vera = refactor "coda di step unica" (idea 59)**: il reducer produce una lista
>    ordinata di passi, un solo driver UI mostra `coda[0]` e niente avanza finché non finisce, i pop-up
>    sono passi anch'essi. **✅ Design CHIUSO (2026-08-28) · ✅ FASI 1-2 FATTE E BLINDATE (2026-08-29)**
>    in `Engine/Idea59_Coda_Step.md`. Fase 1 = infrastruttura + combattimento. Fase 2 = **catena**:
>    decisione = passo `scelta:catena` (countdown "Risolvi" 15s), scenografia di risoluzione di un
>    frame = passo `muta:catenaRisoluzione`; ritirati `s.catenaRisoluzioneInCorso` + dispatch
>    `catena-conferma-risoluzione` + i timer locali/`storico`/le 5 guardie di `CatenaStriscia`; nuovi
>    `sincronizzaPassoCatena`, `s.catena.risolti`, `TEMPI.catena`; `catena.js` invariato. Blindato:
>    `Engine/test-blindati/catena.blindato.mjs`. **I code-path della catena** (`avviaRisoluzioneFrameCatena`,
>    `applicaRisoluzioneFrameCatena`, `sincronizzaPassoCatena`, `scelta:catena`/`muta:catenaRisoluzione`,
>    `CatenaStriscia.jsx`) **sono off-limits senza rifare il test.**
>    **✅ FASE 3 FATTA E BLINDATA (2026-08-29): pesca/evocazione/spostamento** come passi `anim`
>    (`pesca`/`evoca`/`sposta`); ritirati `s.pescaInCorso`/`s.evocazioneInCorso`/`s.movimentiInCorso`;
>    prima mano di chi inizia per secondo = N passi da 1 carta (chiude **F.2**); `legacyOccupato`
>    eliminato dal `<Sequenziatore>` (`s.sequenza` è ora il master assoluto, la coda visiva aspetta la
>    fila). Blindato: `Engine/test-blindati/voli.blindato.mjs`. **I code-path dei voli**
>    (`avviaVoloPescata`/`avviaVoloEvocazione`/`avviaVoloMovimento`, i selettori `pescaInScena`/
>    `evocaInScena`/`spostaInScena`, i 3 componenti `AnimazionePescata/Evocazione/Posizionamento.jsx`)
>    **sono off-limits senza rifare il test.**
>    **✅ FASE 4 FATTA E BLINDATA (2026-08-29): turno IA.** Il pacing dell'avversario è un passo
>    `muta:"ia"` (`azione:"evoca"|"attacca"`, `durataMs: TEMPI.ia.respiro` = 900ms). **Ritirati**
>    `s.iaInAttesa`, la dispatch `avanza-ia`, l'`useEffect` col timer fisso di 900ms in App.jsx e
>    **tutto `iaBloccataDaPrompt`** (OR di 8 condizioni). Nuovi: `accodaPassoIa`, `sincronizzaPassoIa`
>    (ricostruisce il passo al `carica-stato` — senza, una partita ripresa a metà turno IA restava
>    ferma per sempre), `TEMPI.ia`, i selettori `passoIaInScena`/`haPassoIa`/`filaBloccaCodaVisiva`/
>    `scenaLiberaPerIa`. **Limite noto CHIUSO**: gli attacchi diretti allo Stratega a campo sgombro
>    non si risolvono più tutti in una dispatch (misurati ~1800ms l'uno dall'altro dal vivo, col
>    numero rosso del danno visibile in mezzo). **Due invarianti nuovi, entrambi da bug veri colti in
>    verifica**: (1) il passo `ia` sta SEMPRE in fondo alla fila (applicato in `accodaPassi`, non a
>    carico dei chiamanti); (2) anti-deadlock fra le due guardie di pacing — il passo `ia` è l'unica
>    eccezione alla regola di Fase 3 "la coda visiva aspetta la fila". Blindato:
>    `Engine/test-blindati/turno-ia.blindato.mjs` (9 casi). **I code-path del turno IA** (`avanzaIA`,
>    `proseguiSeIA`, `accodaPassoIa`, `sincronizzaPassoIa`, il ramo `"ia"` di `eseguiMuta`,
>    l'invariante d'ordine in `accodaPassi`, `filaBloccaCodaVisiva`/`scenaLiberaPerIa`)
>    **sono off-limits senza rifare il test.**
>    **✅ FASE 5 FATTA E BLINDATA (2026-08-29) — IDEA 59 COMPLETA: banner di fase.** Quarto tipo di
>    passo `{ tipo:"banner", nome:"bannerFase", dati:{chiave,fase}, durataMs }`, accodato in 5 punti
>    (`iniziaTurno` · in cima a `completaRifornimento` · ramo `imprevistoEsito` di
>    `applicaEventoVisivo` · `continuaFase`+`avanzaIA` · `fineTurno` **dopo** `flushSequenza`).
>    `TitoloFase.jsx` riscritto: legge il nuovo selettore `bannerInScena`, segnala
>    `sequenza-passo-concluso`; **ritirati** il suo `useEffect` di cambio-fase, il contatore di id
>    locale, il `DURATA_MS` a mano e la lettura di `stato.faseVisibile`. `banner` entra in
>    `filaBloccaCodaVisiva` (serve: il Vaticinio va davanti al dado Imprevisti, che è in coda visiva) ma
>    **non** in `scenaLiberaPerIa` — è unidirezionale come `anim`, quindi non riapre il deadlock di
>    Fase 4. `TEMPI.banner = { fase: 1750, vespro: 2600 }` + custom property `--t-banner-*`.
>    **DEVIAZIONE DICHIARATA:** `faseVisibile`/`imprevistoVisivo` **non** sono stati ritirati (§10 lo
>    prevedeva) — pinnano due letture attraverso il dado Imprevisti, che è un flusso non ancora
>    migrato; `faseVisibile` perde però un consumatore. Blindato:
>    `Engine/test-blindati/banner-fase.blindato.mjs` (45 asserzioni, 7 casi) + `voli.blindato.mjs`
>    aggiornato **rafforzando** le asserzioni. **I code-path dei banner** (`accodaBannerFase`, i 5
>    punti d'aggancio, `bannerInScena`, `TitoloFase.jsx`, i due set di `@keyframes titolo-fase-*`,
>    la guardia estesa del case `timer-scaduto`) **sono off-limits senza rifare il test.**
>    **Chiude P2.1, P2.2, P2.3, P2.4. Idea 59: tutte e 5 le fasi fatte.**

Stato legenda: 🔴 non iniziato · 🟡 in corso / servono chiarimenti · ✅ fatto e verificato

## Priorità 0 — possibili regressioni del motore/rendering (indagare per prime)

| # | Punto | Stato | Note |
|---|---|---|---|
| P0.1 | **Piccolo Goblin rimasto in retrovia** dopo un tributo che sacrificava 1 creatura di prima linea. | ✅ | **Non è un bug.** Riprodotto esattamente lo scenario descritto con una simulazione headless reale (nuovaPartita → seleziona-mano → seleziona-tributo → conferma-tributo, carte vere): il posto liberato dal sacrificio viene ripreso SEMPRE dalla carta appena evocata, mai da una creatura in attesa in retrovia. Confermato anche nel regolamento fisico (`Regolamento/Worldloom_Regolamento_v2.1.html`, cap. 7 "Vincoli": *"Un Alieno evocato entra in prima linea se c'è spazio, altrimenti in retrovia"*, valutato DOPO il sacrificio) — il motore segue la regola scritta alla lettera. La regola "avanzamento obbligatorio" (cap. 4) si applica solo quando un Alieno di prima linea MUORE, non a un posto liberato da un tributo. |
| P0.2 | **Zona avversario "al contrario"**: prima linea/retrovia e riga Magia-Trappola non erano invertite correttamente per la sua prospettiva speculare. | ✅ | **Era un bug vero, trovato e corretto.** Il redesign campo (rail+3 righe) invertiva solo l'ordine ORIZZONTALE (sinistra/destra) per l'avversario, non quello VERTICALE: le 3 righe (prima linea/retrovia/risorse) si rendevano sempre nello stesso ordine dall'alto in basso per entrambi i lati, lasciando la prima linea avversaria al bordo esterno dello schermo invece che vicino al confine condiviso con la mia. Fix in `Campo.jsx` (`ZonaGiocatore`, variabile `campo`): ordine righe invertito anche verticalmente per `!mio`. Verificato via DOM (non a occhio): zona avversario ora `[Risorse, Retrovia, Prima]`, la mia `[Prima, Retrovia, Risorse]` — le due prime linee sono entrambe adiacenti al confine condiviso. Nessun errore console, build pulita. |
| P0.3 · P0.4 · P0.5 | **Numeri di danno non compaiono / pop-up "Difendi" rimasto appeso / "il combattimento non funziona"** — tre facce dello stesso bug (confermato riproducendolo). | ✅ | **Non era una regressione della coda visiva.** Verificato: (a) il reducer accoda `esitoCombattimento` correttamente (sim headless — `codaVisiva` = [dado, attacco, esitoCombattimento(, morte)]); (b) `applicaEventoVisivo` scrive `s.esitoCombattimento`; (c) dal vivo, in TUTTI gli scontri singoli il numero (`-18`, `-10`, `0` schivata) compare a piena opacità e sfuma come da progetto. **Il bug si vede SOLO quando l'IA incatena un SECONDO attacco nello stesso turno** (creatura con 2 attacchi, o più creature): `proseguiSeIA` → `prossimaAzioneAttaccoIA` apre il combattimento nuovo (step "rifiuto") SINCRONO dentro la stessa dispatch che ha appena risolto il primo, mentre dado/balzo/numero del PRIMO scontro sono ancora in coda visiva. Il prompt "Difendi" del secondo attacco compariva subito, coprendo il numero del primo (→ "il numero sparisce") e sembrando lo stesso pop-up "rimasto appeso" (→ "bloccato"); il dado del primo attacco veniva coperto/saltato (→ "nessun dado visto"). Le guardie `idBalzoRichiesto`/`idDadoRichiesto` non bastavano: per il combattimento NUOVO quei campi sono ancora nulli. **Fix:** `PromptCombattimento.jsx` e `CatenaStriscia.jsx` ora ritornano `null` (attendono) finché `stato.codaVisiva` ha eventi in sospeso e c'è un combattimento — App.jsx scorre la coda da sola su timer, poi il prompt del secondo attacco compare. Verificato dal vivo lo scenario esatto (IA attacca, difendo, IA incatena): PRIMA del fix il pop-up restava fisso a coprire tutto; DOPO il fix il pop-up sparisce mentre dado + `-20` si vedono per intero, poi ricompare per il secondo attacco. **Seguito (feedback dal vivo 2026-08-27, stesso giro):** (1) **il balzo della carta attaccante partiva prima che il dado finisse di rotolare** — `RITARDO_PRIMA_DI_MS.attacco` 700→**1200ms** (il dado rotola ~720ms; ora il balzo parte ~480ms dopo che si è fermato, col risultato ancora ben visibile), e `esitoCombattimento` 2400→1500ms (il dado è già stato mostrato a lungo, evitata la pausa morta). Verificato dal vivo la sequenza: dado rotola→si ferma (963ms)→balzo (1443ms, dado ancora visibile)→numero (3015ms, dado sparito). (2) **numero di danno "sballato" e sulla carta di uno scontro precedente** dopo aver attaccato con un'altra creatura — `avviaAttacco` (`gameReducer.js`) ora azzera `s.esitoCombattimento`/`s.animazioneAttacco`/`s.lancioDado` all'inizio di ogni nuovo attacco: se il giocatore incatena un secondo attacco prima che la coda visiva del primo finisca di scorrere, la dispatch azzerava `s.codaVisiva` (perdendo gli eventi ancora in coda) ma non questi campi, lasciando mostrato il numero del primo scontro ora incoerente col dado del secondo. Verificato headless: rivelato solo il dado del 1° scontro, poi `scegli-attaccante` per la 2ª creatura → i 3 campi tornano `null`. Graphify consultato per confermare la superficie di codice (registraAnimazioneAttacco / applicaSimbolo / avviaAttacco / CAMPI_TRANSITORI_A_NULL). **Seguito 2 (feedback dal vivo 2026-08-27):** (3) **il pop-up "Trappola disponibile" (e "Diritto di ripetizione") compariva mentre il dado stava ancora rotolando** — nuovo stato `s.dadoInCorso` (id), valorizzato da `applicaEventoVisivo` quando rivela un evento "dado", azzerato da `LancioDado.jsx` con la nuova dispatch `"dado-animazione-conclusa"` ~450ms dopo che il dado si è fermato. `PromptCombattimento`/`CatenaStriscia` ritornano `null` finché `dadoInCorso` è valorizzato; anche lo scorrimento della coda visiva (App.jsx) e `iaBloccataDaPrompt` si fermano. I `RITARDO_PRIMA_DI_MS` non devono più "coprire a occhio" i 2,3s del dado: `attacco` 1200→150, `esitoCombattimento` 1500→**600** (= balzo 0,55s + **50ms** di stacco, richiesta esplicita), `dannoDiretto` 2400→600, `imprevistoEsito` 2400→300. (4) **il numero di danno fluttuante si sovrapponeva al pop-up successivo** (es. "Difendi" di un 2° attacco IA) — nuovo stato `s.esitoInCorso` (id), stesso schema: valorizzato quando la coda rivela `esitoCombattimento`, azzerato da App.jsx con `"esito-animazione-conclusa"` dopo 1,2s (durata animazione `.carta-esito` 1,15s); i pop-up di combattimento aspettano anche questo. Verificato dal vivo lo scenario del dado (IA attacca, difendo, ho una Trappola dopoTiro): PRIMA il pop-up compariva a 244ms col dado ancora in rotazione; DOPO compare a ~1450ms, col dado fermo sul risultato. Sweep headless 80+120 partite, 0 crash. Build pulita, console pulita. |
| P0.10 | **Partita ripresa dal menu → il turno saltava da solo** (scoperto durante i test 2026-08-27): `turnoScadenza` è un timestamp assoluto e `caricaPartita` non lo aggiornava — un salvataggio ripreso anche pochi minuti dopo aveva la scadenza nel passato, quindi Campo.jsx mandava subito `"timer-scaduto"` facendo saltare il turno di chi riprendeva (e a cascata i successivi finché non toccava a un giocatore con timer fresco). | ✅ | `caricaPartita` (`salvataggio.js`) ora rimette `stato.turnoScadenza = Date.now() + DURATA_TURNO_MS` al ripristino: si riprende sempre con un turno pieno. Verificato dal vivo: prima la partita iniettata avanzava da sola di 3 turni all'apertura, dopo il fix resta ferma esattamente dove salvata. |
| P0.6 | **Scroll nel campo non voluto** (screenshot: barra verticale in mezzo al campo): l'utente vuole SOLO scaling uniforme, mai una barra di scorrimento — il campo si adatta da solo alla finestra. | ✅ | Causa doppia: (1) `.field{overflow-x:auto}` forzava anche `overflow-y:auto` → barra verticale sui ~9px di sfioramento; (2) `--campo-scale` si attivava solo sotto `max-height:500px` e guardava solo l'altezza. **Piano A scartato in corsa** (provato e misurato): ~290px di "cornice" (mano, titoli, bottoni) non passano da `var(--campo-scale)`, quindi su finestre basse restava scroll comunque. **Piano B (concordato):** vero `transform: scale(k)` su un wrapper `.tavolo` (mano avv. + campo + azioni + mano) con **larghezza di progetto FISSA** (`--tavolo-w: 1400px`, così il layout interno non cambia mai al variare della finestra). `adatta()` in `App.jsx` (useLayoutEffect + resize + ResizeObserver): `k = min(largh.finestra / --tavolo-w, alt.disp / alt.naturale)` — **SENZA tetto a 1**: su schermi grandi k>1 e il tavolo si INGRANDISCE per riempire lo spazio (feedback esplicito "deve occupare sempre più spazio possibile" — prima restava piccolo al centro). `.tavolo-fit` è full-bleed (`width:100vw; margin-left:calc(50% - 50vw)`) per uscire dal `max-width` di `.app`, con `overflow:hidden` + altezza = naturale·k, `align-items:flex-start` (senza, il flex stirava `.tavolo` e il contenuto veniva ritagliato). Pop-up/overlay FUORI dal wrapper. Rimossi `.field{overflow-x:auto}` e `@media (max-height:500px)`; `--campo-scale` resta a 1. Verificato dal vivo a ~10 dimensioni (3000×1600 → k 1.22 riempie l'altezza · 2000×1000 → 0.72 · 1366×768 → 0.56 · 667×375 iPhone SE → 0.25): **zero barre di scorrimento, niente clipping di mano/campo in nessun caso**, il tavolo sempre grande quanto lo consente la dimensione vincolante. P0.9 (rail avversario) verificato ancora integro dopo. Limite noto minore: le animazioni VFX (volo evocazione/pescata) calcolano la posizione dai rect scalati ma disegnano l'elemento volante a dimensione piena → lieve stacco di scala durante il volo, da rifinire se dà fastidio. Build pulita, console pulita. |
| P0.7 | **Intervento Divino attivata dalla IA direttamente dalla mano** (è una Trappola, dovrebbe restare coperta un turno prima di poter essere attivata). | 🟡 | Controllato: sia il percorso umano (`selezionaMano`) sia quello IA piazzano le Trappole con `pronta: false` — la regola "un turno di attesa" sembra intatta nel codice. Serve un caso preciso (che turno, cosa hai visto esattamente) per capire se è un vero bypass o un fraintendimento di cosa hai visto. |
| P0.8 | **Zona avversario, seguito diretto di P0.2** (screenshot): (a) le SCRITTE/etichette (Extra, Esilio, ecc.) restano dritte/leggibili mentre le immagini delle carte sono capovolte 180° — incoerente, vanno capovolte anche loro; (b) allineamento e spaziatura della colonna pile (Worldloom/Esilio/Extra) del lato avversario non corrispondono a quelli del mio lato, che è quello corretto. | ✅ | **(b) non era un bug**: misurato ogni riquadro via DOM (`getBoundingClientRect`) su entrambi i lati — dimensioni identiche ovunque (83×116 / 180×116), struttura perfettamente specchiata sia in orizzontale sia in verticale. L'impressione di disordine era quasi certamente un effetto collaterale di (a). **(a) era un bug vero, corretto**: `SlotRiservato` (etichette Esilio/Extra) e `SlotTerreno` (nome del Terreno attivo) ora ricevono `mio` e si capovolgono 180° per l'avversario (nuove classi `.campo-slot-riservato-capovolta`/`.terreno-etichetta-capovolta`) — i CONTATORI numerici restano dritti per leggibilità, coerente col precedente già stabilito (task 58). Corretto anche il nome del Terreno (stesso bug, non ancora segnalato ma stessa causa, evitato di doverci tornare). Verificato via computed style: avversario `matrix(-1,0,0,-1,0,0)` = rotate(180deg), mio `none`. Nessun errore console, build pulita. |
| P0.9 | **Zona avversario, seguito di P0.2/P0.8** (feedback dal vivo 2026-08-27): (a) il **rail comandi** (anello PV, ⚙, timer, cerchio fase) dell'avversario non era specchiato; (b) la **retrovia dell'avversario** era troppo vicina alla sua riga Magie/Trappole; (c) l'utente ha poi chiesto esplicitamente **"si gira tutto"**: anche i contatori minori tenuti dritti finora (numeri pile Worldloom/Cimitero/Imprevisti, badge "N/4", "🎲 +N", iconcina ℹ, numero di danno flottante) vanno orientati verso l'avversario. | ✅ | **(a)** `.campo-zona-specchiata .rail { transform: rotate(180deg) }`. **(b)** Nuova classe `campo-creature-griglia-retro-specchiata` (in `Campo.jsx`, retrovia quando `!mio`): annulla `margin-top:-8px`, usa `transform: translateY(+8px)` per mordere verso la prima linea avversaria (che sta SOTTO nel suo ordine di righe). Verificato via DOM: gap retrovia↔prima 0px e retrovia↔Magie ~16px su ENTRAMBI i lati (specchio perfetto). **(c)** Rovesciato il precedente di task 58/B9 (contatori dritti per leggibilità): nuove regole CSS scoped a `.campo-zona-specchiata` — `.campo-pila-conteggio` ruota 180°; `.imprevisto-avanzamento`/`.imprevisto-tiro-badge` → `translateX(-50%) rotate(180deg)`; `.carta-capovolta .carta-mini-zoom` e `.carta-capovolta .carta-esito` → `transform: none` (annulla la contro-rotazione, così girano con la carta). Scoped a `.campo-zona-specchiata` apposta: la mano avversaria (`.carta-capovolta` fuori dalla zona) e tutto il mio lato restano invariati. Verificato via computed style: opponent rail/conteggio/badge tutti `matrix(-1,0,0,-1,...)`, ℹ `none` (eredita la rotazione della carta), mio lato tutto `none`. Nessuno scroll. Build pulita, console pulita. |

## Priorità 1 — bug di comportamento su carte specifiche (scelta del giocatore mancante)

| # | Punto | Stato | Note |
|---|---|---|---|
| P1.1 | **Resuscita Pedina** rievoca automaticamente il primo Alieno trovato nel cimitero — deve farlo scegliere al giocatore. | 🔴 | Stesso identico difetto già sistemato per "Distruzione Sofferta" in un giro precedente (stesso pattern di soluzione: `bersaglio`/modalità di scelta). |
| P1.2 | **Corruttore dei Deboli**: sceglie da solo il bersaglio Livello 1 nemico, nessuna animazione/notifica vista. | 🔴 | Stesso difetto di scelta automatica di P1.1, PIÙ una notifica/animazione mancante da verificare a parte (dovrebbe già esserci per costruzione, `notificaEffettoCreaturaSeCe` — va capito perché non si è vista in questo caso). |
| P1.3 | **Regola generale confermata dall'utente**: un effetto può scegliere automaticamente SOLO se il testo della carta nomina esplicitamente quale carta/bersaglio (es. "pesca la prima carta della pila X") — altrimenti la scelta è SEMPRE del giocatore. | 🔴 | Non è un bug singolo: è un principio da applicare sistematicamente. Vale la pena, prima di sistemare P1.1/P1.2, fare un giro di controllo su TUTTI i codici che oggi scelgono in automatico (es. "lame", "modell", "bianca" nell'evocazione) per vedere quali violano questa regola — da confermare come approccio prima di partire. |
| P1.4 | **Animazione di risposta della catena** (Magia/Trappola attivata in risposta) non colpisce mai la carta giusta, si muove a caso fuori dal campo. | 🟡 | **L'utente non ricorda il caso esatto → messi log diagnostici** (opzione B concordata). L'analisi statica trova: la linea/puntino di `RisoluzioneFrame` (`CatenaStriscia.jsx`) parte dal centro schermo fisso (`window.innerWidth/2`) e mira a `getBoundingClientRect` della creatura da `calcolaBersaglioFrameCatena` (gameReducer.js) — matematica plausibile; sospetto principale la **regressione P0.6** (overlay VFX fuori dal wrapper `.tavolo` scalato) oppure `calcolaBersaglioFrameCatena` che torna `null` per un 2° frame LIFO quando `s.combattimento` è già stato annullato. Aggiunti `console.log("[P1.4 VFX ...]")` in 3 punti: `calcolaBersaglioFrameCatena` (quale ramo + bersaglio calcolato), `RisoluzioneFrame` (selettore, elemento trovato sì/no, rect, sorgente, viewport), `VfxMagia.jsx` (da/a/rect). **L'utente non riesce ad aprire la console del browser** → diagnostica resa VISIBILE in 2 modi: (1) `calcolaBersaglioFrameCatena` scrive una riga `[P1.4] frame "X" · evento … · comb=… · bersaglio=…` nel **Registro Mosse** (Opzioni → Registro & Dadi — accessibile e screenshottabile); (2) `RisoluzioneFrame` (`CatenaStriscia.jsx`) mostra un **banner rosso fisso in alto** durante la scenografia di risoluzione: `P1.4: "carta" → campo/catena #id · elemento nel DOM: SÌ/NO · pos X,Y (viewport W×H) [⚠ FUORI SCHERMO]`. **Prossimo passo**: alla prossima occorrenza dal vivo l'utente fa uno screenshot del banner (o del Registro) → si vede se l'elemento bersaglio non è nel DOM, se le coordinate sono fuori schermo, o quale ramo ha scelto. Tutto da rimuovere a P1.4 chiuso. Build + console pulite. |

## Priorità 2 — sequenza/tempistica animazioni (pacing)

| # | Punto | Stato | Note |
|---|---|---|---|
| P2.1 | Banner di fase **"Vespro"** deve aspettare che il calcolo danni/combattimento sia finito prima di partire, e restare a schermo più a lungo (segna il cambio turno). | ✅ 🔒 BLINDATO | **Il Vespro non esisteva affatto**: `NOMI_FASE[5]` c'era, ma `s.fase` non vale mai 5 (il turno passa da 4 a 0), quindi quel cartello non è mai comparso. Ora è un passo `banner` accodato da `fineTurno` **dopo** `flushSequenza` (prima verrebbe svuotato dalla fila che si sta chiudendo) — la fase 5 vive solo come dato del passo, `s.fase` invariato. Non serve nessuna guardia "aspetta il combattimento": tutti e 3 i chiamanti di `fineTurno` arrivano già a fila vuota. Durata **2600ms** contro 1750 delle altre fasi: +850ms di sola TENUTA, entrata (500ms) e uscita (450ms) identiche in ms assoluti tramite un secondo set di `@keyframes` con le percentuali ricalcolate. Misurato dal vivo: **2595ms** e **2635ms**, quest'ultimo subito dopo l'ultimo scontro di un turno IA (il caso più difficile). Attribuito a chi CHIUDE il turno, non a chi lo apre — l'attribuzione è congelata nel passo perché `fineTurno`+`iniziaTurno` girano nella stessa dispatch. |
| P2.2 | Banner di fase **"Vaticinio"** deve aspettare che la carta pescata sia arrivata prima di partire. | ✅ 🔒 BLINDATO | Chiuso **per costruzione** dall'ordine della fila: il banner è accodato in cima a `completaRifornimento`, e tutti e 3 i suoi chiamanti hanno già accodato `anim:pesca` — quindi ci finisce dietro. Il dado Imprevisti, che vive ancora in `codaVisiva`, resta a sua volta dietro al cartello perché `banner` blocca `filaBloccaCodaVisiva`: **pescata → cartello → dado**, mai sovrapposti. Misurato dal vivo con poller DOM a 40ms: il Vaticinio parte solo dopo che `.carta-volante` è sparita. |
| P2.3 | Timer di turno scaduto: aspettare che l'ultima azione/animazione in corso finisca, POI banner Vespro, POI cambio turno — non tagliare di netto. | ✅ 🔒 BLINDATO | La guardia del case `"timer-scaduto"` copriva solo la FILA (`s.sequenza.length`, da Fase 1): aggiunte `codaVisiva.length \|\| dadoInCorso \|\| morteInCorso`, cioè i flussi non ancora migrati (dado Imprevisti che rotola, numero rosso del danno diretto, morte da Imboscata) che venivano ancora troncati di netto. Poi `fineTurno` accoda il Vespro, poi `iniziaTurno`. Nessun rischio di stallo: sono tutti flussi che finiscono da soli e `Campo.jsx` ridispatcha a ogni tick del secondo. |
| P2.4 | Le stesse pause/banner di transizione devono valere ANCHE quando tocca all'avversario (oggi sembra visto solo dal lato proprio). | ✅ 🔒 BLINDATO | **Non si risolveva da sola**: `TitoloFase` calcolava `faseEffettiva = null` quando `!turnoUmano`, quindi le transizioni di fase dell'IA erano strutturalmente invisibili. Ora il cartello passa dalla fila come ogni altro passo e si vede **identico** — stessa posizione, tipografia e durata — con **un'unica differenza**: una riga di attribuzione ("Il tuo turno" / "Turno avversario"; in 1v1 locale "Giocatore 1/2"). **Mai capovolto** per l'avversario: è un overlay a schermo intero letto da chi guarda, non una carta nella metà avversaria (in 1v1 locale il campo si specchia già per intero verso il giocatore attivo). Prova statistica sullo sweep: 17025 banner, **8445 miei / 8580 IA**. Prova dal vivo: turno avversario completo con tutti e 5 i cartelli misurati. |

| P2.5 | **Avanzare di fase con la pillola mentre `imprevistoEsito` è ancora in coda visiva perde l'evento.** La dispatch `continua-fase` azzera `s.codaVisiva` (regola generale): se l'esito degli Imprevisti non era ancora stato rivelato, `applicaEventoVisivo` non gira mai. | 🔴 | **Bug PRE-ESISTENTE, notato durante la Fase 5 e NON toccato** (regola anti-regressione #1). Conseguenza vecchia: `faseVisibile` resta pinnato su "2" per il resto di quel turno, quindi la pillola del rail mostra "2 VA" fino a fine turno (si autocorregge al cambio turno, perché `faseParaZona` confronta la `chiave` col `giocatoreAttivo`). Conseguenza **nuova** aggiunta dalla Fase 5: si perde anche il banner "3 Schieramento", accodato proprio da quel ramo. Fix probabile: rilasciare il pin (e accodare il banner) anche in `continuaFase`, o rendere `imprevistoEsito` non-cancellabile come le dispatch di servizio. Da valutare a parte — tocca la regola "codaVisiva azzerata ad ogni dispatch vera", che è delicata. |

## Priorità 3 — rifiniture visive

| # | Punto | Stato | Note |
|---|---|---|---|
| P3.1 | **Anello Vita (HP ring)**: gradiente continuo verde→rosso lungo l'arco (verde pieno al 100%, rosso pieno a Vita 0). | ✅ | Solo CSS (`.hp-ring` / `::before`, `index.css`): nuova var `--hp-punta = color-mix(in oklab, #7fc98f, #e06868 calc(100% - var(--percento)))` — il colore della PUNTA dell'arco dipende dai PV rimasti. Il `conic-gradient` dell'arco pieno va da `#7fc98f` (verde) a 0deg fino a `var(--hp-punta)` a `var(--percento)`, poi fondo scuro. Rimosso `--hp-full` (non era mai valorizzato da JS). Verificato: punta oklab verde a 100% → tan a 50% → rosso-arancio a 8%. `color-mix`/`oklab` ok su Chrome moderno (target build). Console pulita. |
| P3.2 | Cimitero degli Imprevisti: la carta appena attivata dovrebbe zoomare (stessa meccanica delle altre notifiche) e poi finire in una pila/cimitero VISIBILE dedicata agli Imprevisti (oggi sparisce e basta), con la carta "in arrivo" sopra quella appena scartata, come se girassero nello stesso mazzetto. | 🟡 | **In realtà è allineare il motore al regolamento** (cap. 15, riga 514: *"la carta va scartata nel cimitero del mazzetto Imprevisti"* — oggi il codice faceva `imprevistoInCorso = null` e la carta spariva). **Design confermato con l'utente**: nessuno slot nuovo — il cimitero Imprevisti sta NELLO STESSO slot di avanzamento (quello dove la carta gira a 90°), come layer sotto: l'Imprevisto risolto resta scoperto sul fondo, la carta in corso ci sta sopra coperta. Sfogliabile come il Cimitero creature (task 54). **Tappa A [FATTA 2026-08-28]**: `giocatore.cimiteroImprevisti = []` (`giocatore.js`); `avanzaImprevisti` (`imprevisti.js`) fa `cimiteroImprevisti.push(inCorso.carta)` all'attivazione invece di scartarla nel nulla. `PilaImprevisti` (`Campo.jsx`): lo slot "attivazione" ora ha 3 livelli — (0) `<img class="campo-slot-cimitero-img">` dell'ultimo scarto scoperto, (1) `.imprevisto-carta-ruotata` con nuova classe `-su-scarto` (`inset:4px`, così il bordo dello scarto sotto "sbuca" e si legge lo stack), (2) badge `N/4` + ℹ + conteggio (nuovo `z-index:3`). ℹ → `onZoom(ultimoScarto, scartiImprevisti)` = zoom sfogliabile ◀▶ identico al Cimitero. Nuove classi CSS `.campo-slot-imprevisto-cimitero` (bordo pieno quando c'è solo lo scarto, nessuna carta in corso), `.imprevisto-carta-ruotata-su-scarto`, `overflow:hidden` sullo slot per ritagliare pulito la carta ruotata. La rotazione somma sempre il capovolgimento base avversario (`(mio?0:180)+movimenti*90`), verificato via matrici DOM (mio 1 mov = 90°, avversario 2 mov = 360°). Verificato dal vivo (stato iniettato: 2 scarti miei + 1 avversario + carta in corso — layer, stack, zoom sfogliabile 1/2↔2/2 tutti ok) + sweep headless 120 partite, 0 crash, 111 con Imprevisti scartati (max 3/partita). Build + console pulite. **Tappa B [DA FARE]**: animazione all'attivazione — dopo il pop-up di zoom al centro (già esistente), la carta "va sotto" volando dal centro nello slot; la carta Imprevisto successiva si posiziona sopra solo DOPO che si è visto il risultato del Dado (il meccanismo `imprevistoVisivo`/pinnato copre già gran parte del ritardo). |
| P3.3 | Carta creature a tutto frame + etichetta stat separata a fianco dello slot. | ✅ | **Progettato a parole con l'utente, poi implementato (2026-08-28).** `Carta.jsx` ramo `compatta` (usato SOLO dal campo — verificato): via la barra `.carta-mini-stats` e il badge 🚫 dalla carta → resta solo illustrazione piena (come Magia/Trappola/Cimitero), + ℹ + numero danno. Nuovo `SlotEtichetta` in `Campo.jsx`: fascia `position:absolute` larga quanto lo slot (~66px scalati), alta ~11px — **❤ vita · ⚔ attacco · 🛡 parata · [stato 🚫]**. `slot-etichetta-prima` → `top: calc(100% + 2px)` (SOTTO); `slot-etichetta-retro` → `bottom: calc(100% + 2px)` (SOPRA). Assoluta ⇒ zero impatto sulla griglia: si infila nel varco diagonale libero (prima linea colonne 1/3/5, retrovia 2/4, sfalsate). Lato avversario (`.campo-zona-specchiata`): `rotate(180deg)` + ancora invertita (il suo "sotto" = il mio "sopra"). Colori alterazione ⚔/🛡 riusano `.carta-stat-alterata-su/-giu` (verde/rosso). Livello: resta sulla carta (nell'illustrazione Complete Card). Slot vuoto → nessuna etichetta. `visibile={!inVolo*}` → l'etichetta è "spenta" (opacity 0) mentre la carta è in volo (evocazione/spostamento/morte), si "accende" (fade-in `slot-etichetta-accendi` 0.45s, key sull'id creatura) quando la creatura è a posto. Verificato via DOM: posizioni SOTTO/SOPRA corrette su entrambi i lati, avversario `matrix(-1,0,0,-1,0,0)`, ⚔ verde su buff / 🛡 rosso su debuff, 🚫 nell'etichetta, nessuna sovrapposizione con le carte vicine, nessun clipping da `.campo`, illustrazione ora al 96% dell'altezza slot. Build pulita, gioco nuovo parte senza errori console. **DA CONFERMARE A VISTA** dall'utente (screenshot non disponibili in sessione). Nota: la riga `mia` in `CellaCreatura` (`.concat(...).some(c => c.id === ...)`) esplode se gli array primaLinea/retrovia contengono `null` — non capita in partita reale (array densi), ma attenzione a costruire stati di test densi. |
| P3.4 | Bordo degli slot vuoti più visibile, in tono giallognolo. | ✅ | `CellaCreatura` (Campo.jsx): lo slot creatura vuoto ora ha anche la classe `campo-slot-vuoto` (prima solo `.campo-slot`, bordo blu scuro a piena opacità). CSS `.campo-slot-vuoto`: `border-color: rgba(201, 162, 75, 0.45)` (l'oro del progetto, tenue) + `opacity: 0.7` (da 0.55). Uniforme su tutti gli slot vuoti (creature / Magia-Trappola / Terreno / Cimitero / Imprevisti). Verificato dal vivo: 26 slot vuoti, tutti col bordo oro tratteggiato. Console pulita. |
| P3.5 | Animazione di evocazione dell'avversario: la carta volava "rivolta verso di me" e scattava a 180° solo all'atterraggio — l'utente la vuole già ruotata per tutto il volo. | ✅ | `AnimazioneEvocazione.jsx`: `transform` della `.carta-volante-evocazione` ora include `rotate(${evento.chiave === "avversario" ? 180 : 0}deg)` — coerente con `.carta-capovolta` della zona avversaria e con lo snap d'atterraggio (che usa lo stesso `evento.chiave`). Verificato dal vivo catturando 48 frame di un'evocazione IA reale: tutti `matrix(-N,0,0,-N,...)` (ruotato 180°) a ogni scala del volo. Console pulita. |

## Priorità 4 — redesign di meccaniche (da discutere prima di scrivere codice, non semplici bug)

| # | Punto | Stato | Note |
|---|---|---|---|
| P4.1 | **Eco del Gelo**: cambiare l'effetto. Oggi "ripete l'ultima Magia/Trappola che HO attivato questo turno" e si risolve subito, fuori dalla catena. **Confermato dall'utente**: diventa "copia" — copia l'ultima Magia/Trappola attivata **da ME SOLO** (mai quelle dell'avversario, ambito invariato rispetto ad oggi), ma deve attivarsi come vera risposta dentro la meccanica della catena (`catena.js`), risolvendosi subito dopo quella copiata nello stesso turno, non più come effetto istantaneo standalone. | 🔴 | Scope confermato, pronto per essere progettato a parole nel dettaglio quando arriva il suo turno nella lista (tocca `catena.js`, `magieTrappole.js` risolviMagia/ecogelo, l'apertura della finestra catena su Magie dirette — Sezione 4 della roadmap catena, mai completata: buona occasione per chiuderla insieme a questo). |

## Feedback dal vivo 2026-08-28 (secondo batch — dopo P3.2 tappa A, X.4/X.5/X.6)

| # | Punto | Stato | Note |
|---|---|---|---|
| F.1 | **Centrare i numeri** sopra lo slot Imprevisti (`N/4`, ℹ, conteggio scarti — appena aggiunti in P3.2 A) e sopra Worldloom e Cimitero. Screenshot: badge sbilenchi / sovrapposti alla carta. **+ (2° screenshot)** la **carta Imprevisto coperta viene tagliata dai bordi** ruotando, deve restare integra sempre; **il simbolo non è centrato**. | 🟡 | **Fatto "carta integra + simbolo centrato"** (2 iterazioni). 1ª: rimpicciolita al 62% e centrata — l'utente ha corretto: *"deve stare sopra come se stessi girando fisicamente la carta"* → **2ª (finale)**: la carta torna a **piena dimensione** dello slot (`inset:0`), e lo slot `.campo-slot-imprevisto-attivo` passa a `overflow:visible` — ruotando di 90°/movimento gli **angoli sbucano dai bordi** come giri una carta vera sul tavolo (verificato via DOM: slot 62px, carta ruotata 86px → sborda ~12px/lato, `clippata:false`), e in landscape lascia intravedere sopra/sotto l'Imprevisto risolto scoperto. `background-position` da `center` → `center 38%` su `.imprevisto-carta-ruotata` + `.campo-pila-sfondo` (mazzetti Worldloom/Imprevisti) + `.campo-slot-trappola` (Magie/Trappole coperte) — l'emblema nell'arte (`logo-worldloom.jpg`, 480×720) sta a ~44% dell'altezza, 38% lo porta al centro del riquadro. Rimossa la classe `-su-scarto` (non serve più). Build + console pulite. **⚠️ IL SIMBOLO CENTRATO SI È RI-SCENTRATO (segnalato dall'utente poche ore dopo) — CAUSA TROVATA, NON ANCORA RISOLTA**: `background-position: 38%` centra l'emblema SOLO quando la carta è dritta (0°/180°). Appena la carta ruota di 90°/270° (1 o 3 movimenti), "38% dall'alto" diventa "38% da un lato" → emblema storto. **Il fix vero**: `logo-worldloom.jpg` è un *poster* asimmetrico (emblema a ~44% + scritta WORLDLOOM + composizione) — non un retro carta. Serve un **retro dedicato SIMMETRICO** (solo l'emblema centrato su sfondo stellato, niente scritta) così `background-position: center center` (invariante per rotazione) funziona a ogni angolo. Da fare + BLINDARE con test/nota. **Ancora da fare (F.1a)**: il posizionamento assoluto coerente dei badge numerici (`.campo-pila-conteggio` / ℹ / `N/4`) su Imprevisti + Worldloom + Cimitero — oggi `.campo-pila-conteggio` non ha posizione propria, dipende dall'`align-items` dello slot. |
| F.2 | **Prima mano di chi inizia per SECONDO (6 carte)**: oggi pesca 5 veloci + 1 con animazione lenta, tutte insieme in automatico. L'utente non capisce se deve cliccare "Rifornimento" per avanzare. Va reso una fase percepibile (una pescata alla volta, o comunque uno step che si fa avanzare a mano). | ✅ | **Chiusa dentro Fase 3 dell'idea 59 (2026-08-29).** `avviaVoloPescata` (gameReducer.js) guadagna il parametro `unaAllaVolta`: la prima mano (turno 1, 5-6 carte) diventa N passi `anim:pesca` da 1 carta in `s.sequenza`, il direttore (`<Sequenziatore>`) le fa atterrare una alla volta prima di proseguire. Il Rifornimento normale (1-2 carte) resta un passo unico. Verificato dal vivo (partita vsIA reale): le 5 carte del mio turno 1 arrivano una alla volta; il log dell'IA conferma "pesca 6 carte (5 iniziali + 1, gioca per secondo)" con lo stesso meccanismo. Blindato in `Engine/test-blindati/voli.blindato.mjs`. |
| F.3 | **Magia Terreno: zoom PRIMA di posizionare**. Piazzata dalla mano, si è posizionata subito e POI è comparso lo zoom. Deve essere: zoom → conferma → posiziona. | 🔴 | Estensione di X.4/bug 14 (zoom-before-activate) che copriva Magie/Trappole piazzate sul campo, ma NON le Magie Terreno giocate dalla mano. Da agganciare allo stesso pattern `onEvoca`/`DettaglioCarta`. |
| F.4 | **Evocazione bonus non disponibile al turno 6** (messaggio: "Evocazione normale già usata questo turno; bonus disponibile solo dal 2° turno, costo 1"). Dovrebbe essere disponibile dal turno 2 in poi. | 🟡 | **Non riprodotto — il meccanismo funziona**: sweep headless + test mirato (turno 4, io, fase 3, `evocazioneNormaleFatta=true`, alieno lv1 in mano) → l'evocazione bonus si apre correttamente ("tocca un'altra carta da scartare"). Il regolamento (riga 270) conferma: 1 normale + 1 bonus (costo 1) per turno, bonus non al 1° turno. **Causa probabile: messaggio fuorviante.** Il vecchio testo catch-all diceva SEMPRE "disponibile dal 2° turno" anche quando il vero motivo era altro (bonus GIÀ usata questo turno, mano < 2 carte per lo scarto, campo pieno). **Fatto**: `selezionaMano` (`gameReducer.js`) ora dà un messaggio diagnostico specifico ("Hai già usato l'evocazione bonus questo turno" / "…dal tuo 2° turno" / "Ti serve un'altra carta in mano da scartare" / "Campo pieno"). Verificato headless i due rami principali. **Prossimo passo**: alla prossima occorrenza dal vivo l'utente legge il messaggio nuovo → si capisce se era "bonus già usata" (nessun bug) o altro (bug vero da inseguire). |
| F.5 | **Etichetta stat (P3.3)**: centrare icone e punti Attacco, e **aumentare l'altezza** della fascia per renderli più leggibili. | 🔴 | Rifinitura di P3.3 (`.slot-etichetta` in `index.css`, `SlotEtichetta` in `Campo.jsx`). Oggi ~11px alta, font 0.46rem. |
| F.6 | **Sequenza d'attacco sbagliata**: "suscita male", i segni di danno non funzionano correttamente, e **una creatura che sarebbe dovuta morire non è morta**. | 🟡 (idea 59 Fasi 1+4, 29-08) | La parte "creatura letale non muore" / "la mia carta muore prima del balzo" è chiusa **strutturalmente** dalla Fase 1: la morte in combattimento è un passo `muta` differito, la creatura resta nello stato (0 Vita) finché non è il suo momento — niente più guardie sul rendering di creature morte. La parte multi-attacco IA (numeri incoerenti tra scontro N e N+1) è chiusa perché `proseguiSeIA` non calcola lo scontro successivo finché `s.sequenza` non è vuota. **Il pacing IA completo e' ora chiuso dalla Fase 4 (29-08)**: ogni mossa dell'avversario — evocazione, ogni singolo scontro, e ANCHE ogni attacco diretto allo Stratega — e' preceduta da un respiro di 900ms che e' un passo della fila, mai calcolata in anticipo. Cade anche il limite noto "campo vuoto = attacchi diretti senza pausa". **Resta da verificare dal vivo col caso originale dell'utente** ("suscita male", segni di danno) prima di chiudere il punto. |

## Fuori dalla lista originale, aggiunto durante la sessione

| # | Punto | Stato | Note |
|---|---|---|---|
| X.6 | **"Alieno"/"creatura" → "Pedina" in TUTTO il testo visibile** (richiesta esplicita 2026-08-28: "sostituisci tutte le volte che leggi la parola alieno o creatura con pedina"). | 🟡 | **Fatto — testo scritto dall'app**: `effettiRuolo.js` (tank, evasivo), `PromptCombattimento.jsx` (3 stringhe "la tua creatura"), `gameReducer.js` (messaggi: "sposta le Pedine", "Tocca una tua Pedina per attaccare", "la tua ultima Pedina in retrovia", "tocca una Pedina dell'altra/di retrovia fila"), `effettiCarta.js` + `magieTrappole.js` (log: "le Pedine nemiche", "le tue Pedine", "tutte le Pedine sul terreno", fallback "una Pedina nemica"). Build + console pulite, partita vsIA avviata. **NON toccato (serve decisione)**: (1) i `testo` delle carte in `cards.json` — generati da Excel, e una sessione parallela sta editando proprio quei `.xlsx` ora; (2) il **valore-dato** `tipoCarta: "alieno"` e la colonna Excel "Tipo Carta = Alieno" — rinominarli è un cambio coordinato Excel + `genera_cards_json.py` + tutti i `carta.tipoCarta === "alieno"` nel codice + classi CSS: da fare in un giro dedicato, non di straforo. Identificatori di codice / variabili `creatura` / attributi `data-creatura-id` / classi CSS: **lasciati** (refactor interno non richiesto, regola "blindata"). |
| X.5 | **Fix logo + font del brand nell'interfaccia** — (logo) la scritta WORLDLOOM sbordava dal riquadro "Logo" nel lancio moneta (`width:auto` su immagine larga); ora `width:100%`+`object-fit:contain`, riquadri 150px, e **rimosse le didascalie** "LOGO"/"PITTOGRAMMA" sotto le due immagini (`LancioMoneta.jsx`, `aria-label` per l'accessibilità). (font) (richiesta esplicita 2026-08-28: "le scritte con lo stesso font del logo WORLDLOOM"). Chiarito che non si può "estrarre" un font da un'immagine (il logo ha solo 8 lettere diverse) né crearlo qui. L'utente ha scaricato **Cinzel + Cormorant Garamond** da Google Fonts (OFL) e li ha messi in `src/assets/fonts/`. | ✅ | `src/assets/fonts/cinzel.ttf` (variable 400-900, 126 KB) + `cormorant-garamond.ttf` (variable 300-700, 1 MB) + i rispettivi `OFL.txt`. `index.css`: due `@font-face` (bundlati come data URI nel GIOCA.html a file singolo, +1,5 MB → 24,8 MB); nuove var `--wl-display` (Cinzel — titoli, `<button>`, `h1–h6`, `.app-mazzo-select`, `.app-selettore-mazzo-bottone`, `.cancello-box h1`, rail: `.hp-num`/`.timer-num`/`.phase-badge .code`) e `--wl-body` (Cormorant — `body` e tutto ciò che eredita: messaggi, log, prompt, `.editor-mazzi-nome-input`). **Carte escluse** come richiesto: reset esplicito `.carta, .carta *, .carta-mini, .carta-mini * { font-family: var(--wl-carta) }` (= `-apple-system, sans-serif`, il font di prima). I vecchi `font-family: Georgia` sparsi (placeholder "serif generico") sostituiti dalle var. Verificato dal vivo: `document.fonts` → entrambi "loaded"; computed style — `body` Cormorant, `button` Cinzel, `.carta`/`.carta *` ancora `-apple-system, sans-serif`. Build pulita (gli `ERR_CONNECTION_REFUSED` in console sono il client HMR di Vite che non si riaggancia quando il pannello browser perde focus — artefatto solo-dev, assente in GIOCA.html). Nota: Cinzel è solo-maiuscolo → tutti i bottoni/titoli rendono in capitali (coerente col logo); il numerale "1" ha forma classica simile a "I" ("1 CONTRO 1" → "I CONTRO I") — caratteristica del font, da valutare con l'utente se dà fastidio. |
| X.4 | **Rifiniture UI 2026-08-28** (5 richieste con screenshot): (1) l'icona mazzo si applica/persiste **subito al clic**, senza aspettare "Salva mazzo"; (2) icone di default per le due collezioni intere: Frost Land → "Il Re Antico", Kepler-452B → "Potere Divino"; (3) "Alieno"/"Alieni" → "Pedina"/"Pedine" nell'UI; (4) voce "Torna alla schermata principale" nel menu Opzioni **anche dall'Editor Mazzi**; (5) togliere **tutte le emoji/icone** dai menu e dalla schermata principale. | ✅ | **(1)** `EditorMazzoSingolo.applicaIcona` (`EditorMazzi.jsx`): oltre a `setIcona`, se il mazzo è già salvato (`mazzoId`) riscrive **solo** il campo `icona` sul mazzo in archivio (`ottieniMazzo`+`salvaMazzo`), senza toccare worldloom/imprevisti. Verificato dal vivo: clic su "Il Re Antico" → `localStorage` aggiornato senza premere Salva, sopravvive ad "Annulla". **(2)** `ICONA_COLLEZIONE`/`iconaMondo` (`App.jsx`) → miniatura via `getImmagineCarta` sul bottone e sulle voci "collezione intera" del `SelettoreMazzo`. Verificato dal vivo (icone visibili in entrambi i selettori). **(3)** `EditorMazzi.jsx` (`NOME_TIPO`, `<option>`), `gameReducer.js` (messaggi "Scegli una tua Pedina" ×2 blocchi, "Campo pieno … 5 Pedine", "nessuna Pedina in retrovia"), `PromptCombattimento.jsx` ("La tua Pedina è efficace…"), `CatenaStriscia.jsx` ("una Pedina"). **NON toccati**: i `testo` delle carte in `cards.json` (generati da Excel, si aggiornano lì) e `effettiRuolo.js` (descrizioni in stile testo-carta, restano allineate al testo carta non ancora rigenerato). **(4)** `GameContext.jsx` espone `editorAperto`/`setEditorAperto`; `PannelloOpzioni.jsx` mostra la riga "Schermata principale / Torna" quando `partitaInCorso || editorAperto` (editor → `setEditorAperto(false)`). Verificato dal vivo: "Torna" dall'Opzioni dell'editor riporta alla schermata iniziale. **(5)** Rimosse: `⚙️`→"Opzioni" (bottone fisso, `.opzioni-bottone` reso pill con testo), `🏠 🔄 🎵 📜 ✕` (righe Opzioni + testa cassetto Registro), `▶ 🤖 📱 🛠️ 🏆` (schermata iniziale + statistiche), `👤 ✨ 🪤` (filtri/intestazioni Editor), `🏆` (stat mazzo), `⬆ ⬇ ← +` (barra Editor), `✕`→"—" ("Nessuno"/"Nessuna"), `⚠️ ✓ ⚠`→testo (avvisi/validità Editor), `🏆/💀`→testo (schermata vittoria), `→` sui bottoni "Conferma tributo"/"Scambia con retrovia"/"Continua" (moneta). **Lasciate di proposito** (iconografia di gioco sul campo, non "menu/schermata principale"): `❤⚔🛡` (stat), `🎲` dado registro, `🌍` Terreno, `🚫` stordita, `✓/✕` risoluzione catena, `←/→` navigazione zoom carta, `✨/🪤` badge tipo carta, e il `⚙` minuscolo del rail (cerchio 29px, non ci sta il testo — da decidere con l'utente). Build pulita, console pulita, partita vsIA avviata senza errori. **Follow-up (stesso giorno)**: il tasto **"Ricomincia" non funzionava** (stesso bug `confirm()` di X.3a — dopo un dialogo bloccato dal browser torna sempre `false`). `PannelloOpzioni.jsx`: `confirm()` sostituito da conferma **in-linea** (riga "La partita andrà persa. Sicuro?" → "Conferma" rosso / "Annulla"), stato `confermaRicomincia` che si azzera alla chiusura del pannello. Nuove classi `.opzioni-conferma`/`.opzioni-switch-pericolo`. Verificato dal vivo: "Ricomincia" → "Conferma" cancella il salvataggio e "Riprendi partita" sparisce subito dalla schermata iniziale; console pulita. |
| X.3 | **Editor Mazzi — feedback dal vivo 2026-08-28** (dopo aver testato X.1): (a) tasto **Elimina non fa niente**; (b) miniatura carta prima del nome nella lista carte; (c) un solo menu per lato in schermata iniziale (via "Mazzo intero"); (d) "scegli icona mazzo". | ✅ | **(a)**: `confirm()` nativo — dopo qualche `alert()` (import) il browser offre "impedisci a questo sito altre finestre di dialogo" e da lì `confirm()` torna sempre `false` → Elimina inerte. Sostituito con conferma **in-linea** (Elimina → "Conferma"/"Annulla" sulla riga); gli `alert()` dell'import → avviso in-linea (`.editor-mazzi-messaggio`). **(b)**: `RigaCarta` — `<img className="editor-mazzi-riga-mini">` (h 60px) prima del nome, dentro `.editor-mazzi-riga-sx`. 67 miniature verificate. **(c)**: i due `<select>` per lato (Mondo + mazzo salvato) sostituiti da UN dropdown custom `SelettoreMazzo` (App.jsx): elenco unico con "Collezioni intere" (i due mondi) + "I tuoi mazzi" (i salvati). Niente più voce "Mazzo intero (tutta la collezione)". Custom e non `<select>` perché deve mostrare le icone. Click-outside chiude. `SelettoreListaMazzo` rimosso. Verificato dal vivo: scelta mondo e scelta mazzo salvato entrambe funzionano, `identitaMazzoIo` corretta, deck da 40 carte usato (non la collezione intera). **(d)**: nuovo campo `icona` sul mazzo salvato (nome di una carta) — `creaMazzoVuoto`/`mazzoPortabile`/`importaUno` in `mazziSalvati.js`. Nuovo tab "Icona" in `EditorMazzoSingolo` → `SezioneIcona` (griglia delle SOLE carte nel Worldloom del mazzo, clic per scegliere; "Nessuna" per togliere; l'icona si scarta al salvataggio se la carta non è più nel mazzo). Miniatura mostrata **sia** nella lista editor (`.editor-mazzi-riga-mazzo-icona`) **sia** nel dropdown della schermata iniziale (voce + bottone). Verificato dal vivo: scelta "Troll Folle" → salvata in localStorage, miniatura nella lista + nel selettore. Console pulita, build pulita. |
| X.2 | **"Torna alla schermata principale" nel menu Opzioni** (richiesta esplicita 2026-08-27). | ✅ | La riga esisteva già come "⏸ Partita in corso / Pausa" (dispatch `abbandona-a-menu`, non distruttiva — l'autosave tiene la partita, "▶ Riprendi partita" la ripristina). Rinominata in `PannelloOpzioni.jsx`: `🏠 Schermata principale` / bottone `Torna`. Verificato dal vivo: torna alla schermata iniziale, "Riprendi partita" presente, nessun errore console. |
| X.1 | **Persistenza dei mazzi personalizzati su disco** via esporta/importa file `.json`. | ✅ | `mazziSalvati.js`: nuove `esportaMazzo(id)` (`{ worldloom_mazzo: 1, nome, worldloom, imprevisti, sfondoCampo }` — niente id/date, si rigenerano), `esportaTuttiIMazzi()` (`{ worldloom_mazzi: 1, mazzi: [...] }`), `importaMazzi(oggetto)` (accetta ENTRAMBI i formati; per ogni mazzo genera id nuovo e — se il nome collide — appende " (importato)" / " (importato 2)"; **aggiunge sempre, mai sovrascrive**; ritorna `{importati, nomi}` o `null` se il file non è riconosciuto). Nessuna modifica alla logica esistente. `EditorMazzi.jsx`: bottone **"Esporta"** su ogni riga mazzo (accanto a Duplica/Elimina), **"⬆ Importa mazzo"** + **"⬇ Esporta tutti"** nella barra in basso. Download via `Blob`/`URL.createObjectURL` + `<a download>` (nessun server; funziona anche in `GIOCA.html`). Import via `<input type=file>` nascosto + `FileReader`; file non valido → `alert`. Verificato: 17/17 test headless (esporta singolo/tutti, import con collisione nome → "(importato)"/"(importato 2)", import bundle, JSON malformati rifiutati); dal vivo nel browser round-trip completo (i bottoni compaiono, export cattura il payload giusto, import da file simulato aggiunge il mazzo e aggiorna la lista + alert). Nota: il salvataggio-su-disco vero non è testabile nel browser MCP (blocca i download) — payload verificato, il meccanismo `<a download>` è standard. Console pulita. |

---

## Stato al 2026-08-28 sera (cambio chat — HANDOFF)

**Chiusi e verificati:** P0.1, P0.2, P0.3+P0.4+P0.5, P0.6, P0.8, P0.9, P0.10, X.1, X.2, X.3 (a-d),
X.4 (1-5 + follow-up "Ricomincia"), X.5 (logo + font brand Cinzel/Cormorant), P3.1, P3.3, P3.4, P3.5.

**Fatti parzialmente / con code aperte:**
- **X.6** 🟡 — "Alieno/creatura → Pedina": fatto tutto il testo scritto dall'app. **Restano**: testi carta
  in `cards.json` (via Excel, c'è sessione parallela) + il dato `tipoCarta:"alieno"` / colonna "Tipo Carta"
  (cambio coordinato Excel+pipeline+codice, giro dedicato).
- **P3.2** 🟡 — Tappa A FATTA (dato `cimiteroImprevisti` + layer scoperto sotto la carta in corso +
  zoom sfogliabile). Tappa B (animazione "va sotto" all'attivazione) DA FARE.
- **F.1** 🟡 — carta Imprevisto non più tagliata (full-size + `overflow:visible` sullo slot, "come giri
  una carta vera"). **MA il simbolo centrato si è ri-scentrato**: `background-position:38%` si rompe
  quando la carta ruota di 90°/270°. **Fix vero non fatto**: serve un retro carta SIMMETRICO (solo
  emblema centrato, niente scritta "WORLDLOOM") così `center center` funziona a ogni rotazione. F.1a
  (posizionamento badge numerici) non iniziato.
- **F.4** 🟡 — evocazione bonus: non riprodotta (il meccanismo funziona). Messo messaggio diagnostico
  specifico. L'utente al prossimo caso legge il messaggio nuovo → si capisce se è bug vero o no.
- **P1.4** 🟡 — VFX risposta catena "va a caso". Non riprodotta. **Diagnostica resa visibile**:
  banner rosso in alto durante la risoluzione catena + riga nel Registro Mosse (l'utente non riesce ad
  aprire la console). Al prossimo caso l'utente screenshotta il banner → causa. Da rimuovere a chiuso.

**Aperti non iniziati:**
- **F.6** 🟡 — chiusa strutturalmente dalla idea 59 Fase 1 (morte differita + pacing multi-attacco IA).
  Da riverificare dal vivo col caso originale; pacing IA completo = Fase 4. Vedi la riga F.6 in tabella.
- **F.2** 🔴 — prima mano di chi inizia 2° (6 carte): renderla una fase percepibile, non 5+1 auto.
- **F.3** 🔴 — Magia Terreno: zoom PRIMA di posizionare (estende X.4/bug 14).
- **F.5** 🔴 — etichetta stat P3.3: centrare + fascia più alta.
- **P0.7** 🟡 — Intervento Divino: serve caso preciso.
- **P1.1–P1.3** 🔴 — scelte automatiche carte (audit fatto: revive/corrutt/bianca/modell violano;
  piano a 4 tappe concordato — vedi P1.4 riga per il dettaglio del motore "scegli").
- ~~**P2.1–P2.4**~~ ✅ 🔒 — banner Vespro/Vaticinio, chiusi dalla Fase 5 dell'idea 59 (29-08).
- **P4.1** 🔴 — Eco del Gelo → "copia" dentro catena.

**Diagnostica temporanea da rimuovere quando si chiudono i rispettivi bug:**
`[P1.4]` in `calcolaBersaglioFrameCatena` (gameReducer.js — scrive nel Registro) + banner in
`CatenaStriscia.jsx` (`RisoluzioneFrame`, stato `diag`) + `console.log` in `VfxMagia.jsx`.

**Da confermare a vista dall'utente:** P0.9 "si gira tutto", P3.3 etichetta stat, pacing combattimento,
P3.2 tappa A, F.1 carta Imprevisto.

**FEATURE GROSSA (causa radice delle regressioni di tempistica):** refactor "coda di step unica"
(idea 59). Design chiuso 28-08. **🔒 Fasi 1-2 FATTE E BLINDATE 29-08** (`Engine/Idea59_Coda_Step.md`,
`Engine/test-blindati/combattimento.blindato.mjs` + `tempi.blindato.mjs` + `catena.blindato.mjs`).
Off-limits senza rifare il test: i code-path del combattimento (Fase 1) e della catena (Fase 2:
`avviaRisoluzioneFrameCatena`, `applicaRisoluzioneFrameCatena`, `sincronizzaPassoCatena`,
`scelta:catena`/`muta:catenaRisoluzione`, `CatenaStriscia.jsx`). Prossimo: Fase 3
(pesca / evocazione / spostamento).

**P1.4 (VFX risposta catena):** NON chiuso in Fase 2. `RisoluzioneFrame` è stato riscritto per
leggere dal passo `muta:catenaRisoluzione`, ma la diagnostica temporanea (banner rosso + riga nel
Registro + `console.log`) è stata portata dietro invariata. Verifica dal vivo Fase 2: in quell'istanza
l'elemento bersaglio era trovato nel DOM (nessun sintomo "va a caso"), ma un solo caso — resta 🟡.

## Stato al 2026-08-29 (dopo Fase 3 idea 59)

**Chiuso in più: F.2** (prima mano percepibile — assorbita dentro Fase 3, vedi la sua riga sopra).

**FEATURE GROSSA:** refactor "coda di step unica" (idea 59). **🔒 Fasi 1-3 FATTE E BLINDATE 29-08**
(`Engine/Idea59_Coda_Step.md`, `Engine/test-blindati/combattimento.blindato.mjs` +
`tempi.blindato.mjs` + `catena.blindato.mjs` + `voli.blindato.mjs`). Off-limits senza rifare il test:
i code-path del combattimento (Fase 1), della catena (Fase 2) e dei tre voli pesca/evocazione/
spostamento (Fase 3: `avviaVoloPescata`/`avviaVoloEvocazione`/`avviaVoloMovimento`, i selettori
`pescaInScena`/`evocaInScena`/`spostaInScena`/`uidInVoloPesca`, i 3 componenti
`AnimazionePescata/Evocazione/Posizionamento.jsx`). **Decisione architetturale della Fase 3:**
`legacyOccupato` eliminato dal `<Sequenziatore>` — `s.sequenza` è ora il master assoluto anche
rispetto a `s.codaVisiva` (prima il combattimento aspettava la coda; ora è la coda ad aspettare la
fila). Prossimo: **Fase 4 (turno IA)**.

## Domande aperte prima di iniziare

Prossima chat: Fase 4 della coda di step (turno IA, pacing scontro-per-scontro) — vedi
`Engine/Idea59_Coda_Step.md` §10.

## Stato al 2026-08-29 (dopo Fase 4 idea 59)

**FEATURE GROSSA:** refactor "coda di step unica" (idea 59). **🔒 Fasi 1-4 FATTE E BLINDATE 29-08**
(`Engine/Idea59_Coda_Step.md` + i 5 test in `Engine/test-blindati/`: `tempi` · `combattimento` ·
`catena` · `voli` · `turno-ia`). Con la Fase 4 il turno dell'avversario non ha più un pacing suo:
è la fila a scandirlo, un passo alla volta, mai pre-calcolato.

**Due bug veri trovati e corretti DENTRO la verifica della Fase 4** — esattamente il tipo di
regressione che i blindati servono a fermare:
1. con una catena a 2 frame la fila usciva `[muta:ia, scelta:catena]`: il respiro dell'IA davanti a
   una decisione ancora in sospeso del giocatore. **Colto da `catena.blindato.mjs`.** Fix: invariante
   "il passo `ia` sta sempre in fondo", applicato in `accodaPassi` (un posto solo);
2. **deadlock colto DAL VIVO**: il turno IA si è fermato per sempre su "L'avversario evoca…" perché
   la coda visiva aspettava la fila (regola Fase 3) e il respiro aspettava la coda visiva. Fix: il
   passo `ia` è l'unica eccezione a quella regola — è respiro, non scenografia. Le due guardie sono
   state estratte in `sequenza.js` apposta per poterle blindare invece di duplicarle nei componenti.

**Limite della verifica dal vivo, dichiarato:** lo scontro IA-contro-creatura (pop-up "Difendi" fra
due respiri) non è stato osservato dal vivo — l'automazione non è riuscita a portare una creatura mia
in prima linea. È coperto da `combattimento.blindato.mjs`, dai casi #3/#4 di `turno-ia.blindato.mjs`
e dai 3674 scontri IA dello sweep di 200 partite.
**→ CHIUSO nella verifica della Fase 5 (29-08):** evocato un Piccolo Goblin dal vivo, l'IA ha
attaccato 4 volte in due turni — il pop-up "Difendi o lasci passare?" compare dopo il cartello
"Alla Carica", mai sopra, e nessun banner si intromette durante la scenografia di combattimento.

## Stato al 2026-08-29 (dopo Fase 5 idea 59 — REFACTOR COMPLETO)

**FEATURE GROSSA CHIUSA:** refactor "coda di step unica" (idea 59). **🔒 Tutte e 5 le fasi FATTE E
BLINDATE 29-08** (`Engine/Idea59_Coda_Step.md` + i 6 test in `Engine/test-blindati/`: `tempi` ·
`combattimento` · `catena` · `voli` · `turno-ia` · `banner-fase`). Con la Fase 5 anche le transizioni
di fase passano dalla fila: `s.sequenza` è l'unico direttore di tutto ciò che si vede.

**Chiusi in più: P2.1, P2.2, P2.3, P2.4.** Due dei quattro non erano "arriva troppo presto" ma
"non esiste": il cartello **Vespro** non è mai comparso in vita del gioco (`s.fase` non vale mai 5) e
i banner del **turno avversario** erano strutturalmente soppressi (`faseEffettiva = null` quando
`!turnoUmano`).

**Deviazione dichiarata:** `faseVisibile`/`imprevistoVisivo` NON ritirati (il §10 lo prevedeva) —
pinnano due letture attraverso il dado Imprevisti, flusso ancora in `codaVisiva`. Ritirarli ora
riaprirebbe B16-round2 al contrario. Appartengono a un eventuale giro "dado Imprevisti nella fila".

**Costo di ritmo, dichiarato e accettato:** il mio turno guadagna ~2,6s (il Vespro, che prima non
c'era) e il turno IA ~8,8s (5 cartelli dove non ce n'era nessuno) — è il prezzo di P2.4. La manopola
unica per ammorbidirlo è `TEMPI.banner.fase` in `src/game/tempi.js`.

**Nuovo punto segnalato e NON toccato (regola 1):** vedi P2.5 in tabella — avanzare di fase con la
pillola mentre `imprevistoEsito` è ancora in coda visiva perde l'evento (bug pre-esistente, ora con
un sintomo in più).

**Prossimo:** l'idea 59 è finita. I lavori a sé restano nel backlog di `WORLDLOOM.md` (carte 32-61,
foil, sito) e i punti aperti della roadmap qui sopra (F.1, F.3, F.5, F.6 da riverificare, P0.7,
P1.1-P1.3, P3.2 tappa B, P4.1).


---

## Sessione 2026-08-29 (pomeriggio) — "reparto finiture"

Aperta per il foil; il foil è l'ultimo dei tre cantieri emersi. Ordine deciso dall'utente:
**C (identità) → B (effetti) → A (foil)**.

| Punto | Cosa | Stato |
|---|---|---|
| **T.1** | Rinomina `Alieno`/`Creatura` → **Pedina**, `Kepler` → **Marbion**: 89 celle Excel con concordanza scritta a mano, token `tipoCarta` in 12 punti del motore, `terr_kepler` → `terr_marbion`, 3 nomi di carta + 14 file immagine, entrambi i regolamenti | ✅ (29-08) |
| **T.2** | **15 Pedine di Marbion scartate in silenzio** da `genera_cards_json.py` (conosceva solo `Alieno`). Marbion da 23 a 41 Pedine | ✅ (29-08) |
| **T.3** | **Identità carta** = Nome + Variante Illustrazione + Rarità + Finitura. Chiave di catalogo, editor, mazzi salvati; mazzi vecchi (solo nome) ancora risolti per nome | ✅ (29-08) |
| **T.4** | **5 righe doppie identiche** negli Excel, trovate dal controllo d'unicità di T.3 — rimosse | ✅ (29-08) |
| **T.5** | **Mazzo di default illegale**: la partita rapida usava tutta la collezione (125 e 155 copie) contro il massimo di 60. Ora pesca 60 copie coi limiti per carta | ✅ (29-08) |
| **T.6** | Magie/Trappole/Imprevisti **senza illustrazione** disegnate come blocco di testo libero: sfondavano la mano. Ora stesso guscio 5:7 delle Pedine, misurate 117×157 tutte | ✅ (29-08) |
| **T.7** | **Foil**: colonna `Finitura` letta letterale in `cards.json`, 8 carte Rainbow, ognuna anche in stampa Normale. **Manca la resa CSS nel gioco** | 🟡 dati pronti |
| **T.8** | **62 codici effetto non implementati** (30 Magie, 14 Pedine, 12 Trappole, 6 Imprevisti). Le carte 32-61 entrano in mano e non fanno nulla. Tabella con casella proposta nel Vocabolario, sezione "audit 2026-08-29" | 🔴 aperto |
| **T.9** | `componi_carte.py` è **codice morto dall'11 agosto** (le Complete Card le fa `render.js`), ma `CLAUDE.md`, la skill `pipeline-carte` e `Guida ai layout.html` lo indicano ancora come pipeline viva | 🔴 documenti da correggere |
| **T.10** | Le Complete Card nel gioco sono `card.html` al 19 agosto; la SPEC è alla 1.6 (rarità → scintille nel piede, Ruolo in riga tipo, disco archetipo ricalcolato). **Rigenerare è bloccato a monte**: `cards-real.json` ha tutte le carte su `flat_neutro.png`, rarità nulle, `tipoCarta: "Pedina"` che `card.html` non conosce | 🔴 aperto, dipende dalla pipeline immagini |
| **T.11** | **Nebbia di Marbion** ha la Complete Card ma è nera: renderizzata il 19 agosto senza illustrazione. Si risolve solo rigenerando l'immagine (dipende da T.10) | 🔴 aperto |

**Regole anti-regressione nuove di questa sessione:**

1. Il token `tipoCarta` accetta **sia `"pedina"` sia `"alieno"`** in lettura. Non togliere il vecchio:
   è dentro le partite e i mazzi già salvati dall'utente in localStorage.
2. L'id del mondo resta **`kepler-452b`** anche se il mondo si chiama Marbion. È scritto nei
   salvataggi e nella mappa cartelle di `sync-data.mjs`.
3. Una riga di mazzo salvato **senza `id`** si risolve per nome. Non rimuovere il ripiego.
4. L'immagine di una carta dipende da **nome + variante**, mai da rarità o finitura: due stampe della
   stessa carta condividono l'illustrazione, è il senso stesso del foil.
5. `Finitura` si passa **letterale** al gioco, non come booleano: una classe CSS per valore.

---

## Sessione 2026-08-29 (sera) — audit dati carte + validatore

Consegna: verificare un'analisi esterna dei quattro Excel e costruire un validatore. **L'analisi
esterna era basata su uno stato precedente dei file**: metà dei rilievi risultava già chiusa. Ogni
punto è stato ricontrollato sui file reali prima di toccare qualcosa.

### Cosa è stato costruito

| Punto | Cosa | Stato |
|---|---|---|
| **V.1** | `tools/validate_cards.py` — 9 controlli su tutti e quattro gli Excel, esce con codice ≠ 0 sui soli ERRORI. Vocabolari chiusi in `tools/vocabolari.json`, glossario keyword in `tools/keywords.json`. I range statistiche NON sono scritti nel codice: vengono **letti dal cap. 8** del regolamento a ogni esecuzione, e il parser fallisce rumorosamente se la tabella cambia forma | ✅ (29-08) |
| **V.2** | **Gate al build**: `genera_cards_json.py` lancia il validatore prima di scrivere. Errori → `cards.json` NON viene rigenerato. Scappatoia dichiarata: `--salta-validazione` | ✅ (29-08) |
| **V.3** | Foglio `Come compilare`, riga **Ruolo**: mancava `supporto`, usato da 6 carte. Corretta in entrambi gli Excel ufficiali (fonte incrociata: `src/data/effettiRuolo.js`, `componi_carte.py`, regolamento cap. 10 — che è già intitolato "I sei Ruoli") | ✅ (29-08) |
| **V.4** | Foglio `Come compilare`, riga **Attacchi**: diceva "solo Il Re Antico ne ha 3"; anche **Signore del Clan** (FrostLand_proposte) ne ha 3. Corretta in entrambi | ✅ (29-08) |

Prima esecuzione: **0 errori, 199 avvisi**. `cards.json` di entrambi i mazzi rigenerato dopo le
correzioni e verificato **byte-identico** a prima (le due correzioni toccano solo documentazione).

### Rilievi dell'analisi esterna risultati SUPERATI (verificati, nessuna azione)

- «Manipolatrice Suprema è doppia fra `_carte` e `_proposte`» → già rimossa dalle proposte (commit `6237d77`). Il controllo 8 non trova **nessuna** doppia presenza.
- «Marea di Kepler nel mazzo FrostLand» → la carta si chiama ora **Marea di Marbion** in entrambi i set (rinomina T.1).
- «Rarità vuota su tutte le righe» → `Rarita` è **compilata su tutte** le righe ufficiali. Restano vuote `Pianeta`, `Autore`, `Numero`, `Anno`, `ID Carta`.
- «Finché quei campi sono vuoti non è stampabile nessuna carta» → falso sulla pipeline attuale: `componi_carte.py` non legge quelle colonne (autore costante, numero progressivo, ID = hash del nome).
- «83 righe» → le righe carta reali sono **268** in tutto (157 ufficiali + 111 proposte).
- «Quattro carte con testo identico» → i testi identici sono **tre** (Cristallo Riflesso · Spezza Volontà · Copiare È Vantaggioso). **Fato Spezzato ha un testo diverso** ("contro di te", non "contro una tua Pedina") e un effetto diverso nel motore.
- «Implementa un solo effetto di annullamento» → **già così**: `gameReducer.js:1951` gestisce `cristallo`/`spezzavolonta`/`copiare` in un unico ramo.
- «La spec grafica è `claude/direzione-grafica-full-art.md`» → quel file **non esiste**. Il documento con quelle sezioni (§2.4 Riga tipo, §2.7 Piede, §3.4 Rarità) è `Mazzi/00 Layout generico/worldloom-cards/SPEC.md`.

### Punti nuovi aperti — richiedono una decisione dell'utente

| Punto | Cosa | Stato |
|---|---|---|
| **V.5** | **Vocabolario `Tipo Effetto`**: 34 valori distinti. Il motore **non legge mai** questa colonna (verificato: nessun `effetto.tipo`/`tipoEffetto` in `src/`), quindi riordinarla è a rischio zero. Proposta di lista chiusa + mappa di conversione già scritta in `tools/vocabolari.json`; 6 valori restano ambigui (`sopravvivenza`, `rischio`, `schivata`, `paralisi`, `fusione`, `onkill`) | 🔴 serve ok utente |
| **V.6** | **Keyword orfana "Volante"** (Il Rifiuto della Terra): non esiste nel regolamento né altrove. O si definisce, o si riscrive il testo | 🔴 serve scelta utente |
| **V.7** | **Tre carte con testo identico parola per parola**: Cristallo Riflesso · Spezza Volontà · Copiare È Vantaggioso. Quali tenere, quali ridisegnare. Inoltre `Copiare È Vantaggioso` ha `Tipo Effetto = copy` ma non copia niente (dipende da V.5) | 🔴 serve scelta utente |
| **V.8** | **37 statistiche fuori dai range del cap. 8** (17 carte ufficiali, 20 proposte). Il cap. 8 dichiara già "i profili numerici delle carte esistenti andranno ribilanciati in un passo successivo", quindi il controllo è un AVVISO. `--range-strict` lo promuove a errore. **Contraddizione da segnalare:** il foglio `Leggimi` di entrambi i file proposte afferma "Statistiche: tutte verificate contro i range del cap. 8" — 20 righe dicono il contrario | 🔴 serve decisione |
| **V.9** | **Due renderer con budget di testo diversi**: `componi_carte.py` (3 righe Pedine / 6 Magie, tronca in silenzio con `…`) vs `worldloom-cards/render.js` + `SPEC.md §6` (~6 / ~9, con rilevatore di overflow proprio). **I documenti si contraddicono su quale sia vivo**: T.9 dice che `componi_carte.py` è morto dall'11 agosto, `CLAUDE.md` e la skill `pipeline-carte` lo indicano come pipeline viva. 12 carte sforano il budget di `componi_carte.py` | 🔴 collegato a T.9 |
| **V.10** | **Colonna `Sottotipo` ignorata dalla pipeline**: l'Excel ha `Normale/Continua/Terreno/Rapida`, ma `genera_cards_json.py:158` deduce il sottotipo dal prefisso `terr_` del codice e scrive `"normale"` per tutto il resto. Le Magie Continue e Rapide arrivano nel gioco come normali. Il commento nel codice dice "nessuna colonna Excel dedicata esiste ancora": non è più vero | 🔴 segnalato, non toccato |
| **V.11** | **Campi di stampa vuoti** su tutte e 157 le righe ufficiali: `Pianeta`, `Autore`, `Numero`, `Anno`, `ID Carta`. Warning per scelta esplicita; si promuove a errore quando l'utente li compila | 🟡 in attesa |
| **V.12** | **Scala di rarità vs limite copie**: `SPEC.md §3.4` propone Comune 4 / Rara 3 / Ultra Rara 2 / Epica 1 / Leggendaria 1; i **cap. 3 e 17** del regolamento dicono ancora "limite stampato sulla carta, cambia da carta a carta" (ed è così che funzionano la colonna `Limite Copie` e il badge `×N max`). Sono due regole diverse: va scelta una e riscritto l'altro documento | 🔴 serve decisione |
| **V.13** | **Promozione delle proposte**: 111 righe nei due file proposte, con effetti non implementati. Decisione da prendere **prima** di produrre le illustrazioni | 🔴 serve decisione |

### Regole nuove di questa sessione

1. `tools/vocabolari.json` e `tools/keywords.json` sono **autoritativi**: un valore fuori lista è un
   errore, non un avviso. Aggiungere un valore lì è una decisione, non una formalità.
2. Il vocabolario `Tipo Effetto` è **congelato** allo stato del 29-08: serve a impedire nuova deriva
   mentre si decide la lista definitiva. Un valore mai visto prima fa fallire il build.
3. I range statistiche **non si scrivono mai nel validatore**: si leggono dal cap. 8 del regolamento.
   Se cambia la tabella, cambia il controllo — non c'è un secondo posto da tenere in sync.
