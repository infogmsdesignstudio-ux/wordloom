# Idea 59 — Coda di step unica

> **Stato: REFACTOR COMPLETO — TUTTE E 5 LE FASI FATTE E BLINDATE (2026-08-29).**
>
> **FASE 5 (BANNER DI FASE) FATTA E BLINDATA (2026-08-29). Chiude P2.1, P2.2, P2.3, P2.4.**
>
> **Cosa è atterrato:** il quarto tipo di passo (§4) esiste — `{ tipo:"banner", nome:"bannerFase",
> dati:{ chiave, fase }, durataMs }`. `TitoloFase.jsx` non osserva più `s.fase` da sé: rende il passo
> in scena (nuovo selettore `bannerInScena`) e ne segnala la fine con `sequenza-passo-concluso`.
> RITIRATI da lì: l'`useEffect` che confrontava la fase precedente, il contatore di id locale, il
> `DURATA_MS` scritto a mano e la lettura di `stato.faseVisibile`.
>
> **I cinque punti d'aggancio** (uno per fase, scelti perché la fila garantisca da sola la cronologia):
>
> | Banner | Dove | Perché lì |
> |---|---|---|
> | 1 Rifornimento | `iniziaTurno`, dopo il check deck-out, PRIMA della pescata del turno 1 | prima si annuncia, poi le carte volano |
> | 2 **Vaticinio** | in cima a `completaRifornimento` | tutti e 3 i chiamanti hanno GIÀ accodato `anim:pesca` → il cartello ci finisce dietro (**P2.2 chiuso per costruzione**) |
> | 3 Schieramento | `applicaEventoVisivo`, ramo `imprevistoEsito` | dove il pin si rilascia = il primo istante in cui il dado Imprevisti è davvero finito |
> | 4 Alla Carica | `continuaFase` (`fase=4`) e `avanzaIA("evoca")` | un punto per lato, prima di `accodaPassoIa` |
> | 5 **Vespro** | `fineTurno`, **DOPO `flushSequenza`** | prima verrebbe svuotato dalla fila che si sta chiudendo |
>
> **Come `banner` si inserisce nello schema delle guardie di Fase 4** (la domanda aperta):
> `banner` entra in `filaBloccaCodaVisiva` insieme ad `anim`/`muta` — e **deve** entrarci, perché il
> Vaticinio va davanti al dado Imprevisti, che vive ancora in `codaVisiva`. Non riapre il deadlock
> della Fase 4 perché quella guardia era **bidirezionale** (il passo `ia` bloccava la coda *e*
> aspettava la coda); `banner` è unidirezionale come `anim`: nel `<Sequenziatore>` prende un timer
> semplice, non passa mai da `scenaLiberaPerIa`, quindi drena sempre. `scenaLiberaPerIa` NON è stata
> toccata: resta l'unica guardia bidirezionale, e il passo `ia` l'unica eccezione a "la coda visiva
> aspetta la fila".
>
> **L'invariante d'ordine di Fase 4 (il passo `ia` sempre in fondo) fa un lavoro vero qui.** Verificati
> tutti e cinque i punti d'aggancio: in quattro il respiro non è in fila (flushSequenza l'ha tolto, o
> `eseguiMuta` l'ha già shiftato, o `accodaPassoIa` viene dopo). Nel quinto —
> `applicaEventoVisivo("imprevistoEsito")` — **il respiro è già in fila** (accodato in fondo a
> `completaRifornimento`, fermo ad aspettare che la scena si liberi): il banner Schieramento gli
> finisce davanti, ed è esattamente quel che serve (si legge "Schieramento", *poi* l'avversario evoca).
> Nessun caso in cui il banner davanti al respiro sia sbagliato.
>
> **P2.4 (requisito esplicito dell'utente):** il banner si vede ANCHE nel turno dell'avversario. Prima
> `TitoloFase` ritornava `null` quando `!turnoUmano`, quindi le transizioni dell'IA erano invisibili.
> Ora il cartello è **identico** — stessa posizione, tipografia e durata — con **un'unica differenza**:
> una riga di attribuzione ("Il tuo turno" / "Turno avversario"; in 1v1 locale "Giocatore 1/2"). Il
> cartello **non si capovolge mai** per l'avversario: è un overlay a schermo intero letto da chi
> guarda, non una carta nella metà avversaria — vale anche in 1v1 locale, dove il campo si specchia
> già per intero verso il giocatore attivo. L'attribuzione viene da `passo.dati.chiave`, **congelata
> dal reducer**, non da `s.giocatoreAttivo`: durante il Vespro il turno nello stato è già girato.
>
> **P2.1 — il Vespro prima non esisteva affatto.** `NOMI_FASE[5]="Vespro"` c'era, ma `s.fase` non vale
> mai 5 (il turno passa da 4 a 0), quindi quel cartello non è mai comparso in vita sua. Ora è un passo
> come gli altri e la fase 5 vive **solo** come dato del passo (`s.fase` invariato, nessun valore 5
> introdotto nel motore). Non serve nessuna guardia "aspetta che il combattimento sia finito": tutti e
> tre i chiamanti di `fineTurno` arrivano già a fila vuota.
>
> **P2.3 — timer scaduto.** La guardia del case copriva solo la FILA; aggiunte
> `codaVisiva.length || dadoInCorso || morteInCorso`, i flussi non ancora migrati che venivano ancora
> troncati di netto. Nessun rischio di stallo: finiscono tutti da soli e `Campo.jsx` ridispatcha a ogni
> tick del secondo.
>
> **Durate — `TEMPI.banner = { fase: 1750, vespro: 2600 }`.** 1750 è il valore di sempre (ex
> `DURATA_MS`), le fasi 1-4 non cambiano ritmo. Il Vespro ha **+850ms di sola TENUTA**: entrata (500ms)
> e uscita (450ms) restano identiche in millisecondi assoluti, tramite un secondo set di `@keyframes`
> con le percentuali ricalcolate su 2600 — riscalare le stesse avrebbe rallentato l'entrata invece di
> tenere fermo il cartello. Le due durate sono iniettate come custom property
> (`--t-banner-fase`/`--t-banner-vespro`) da `iniettaTempiCss`: `tempi.js` resta sorgente unica anche
> per il CSS (§11 Q4).
>
> **DEVIAZIONE DICHIARATA dal §10 — `faseVisibile`/`imprevistoVisivo` NON sono stati ritirati.**
> La tabella §10 diceva "ritira il pinning", ma è stata scritta prima che le Fasi 3-4 stabilissero che
> la coda visiva sopravvive. Quei due campi non servono a fare il banner: fanno **ritardare due
> letture** (il numero di fase nella pillola del rail; la rotazione della carta Imprevisto) finché il
> dado Imprevisti — ancora un flusso di `codaVisiva`, non migrato — non ha finito. Ritirarli ora
> farebbe saltare la pillola a "3 SC" mentre il cartello dice "FASE 2 VATICINIO" e il dado rotola
> ancora: la regressione B16-round2 al contrario. Quello che cambia davvero è che `faseVisibile`
> **perde un consumatore** (`TitoloFase` non lo legge più) e si riduce al suo unico mestiere vero.
> Il ritiro completo appartiene a un eventuale giro "dado Imprevisti nella fila", fuori perimetro.
>
> **Limite dichiarato:** `fineTurno` + `iniziaTurno` girano nella stessa dispatch, quindi mentre il
> Vespro è a schermo la pillola/rail mostrano già il turno nuovo. Differire il cambio turno come `muta`
> toccherebbe ogni gate su `giocatoreAttivo` — molto più grosso e fuori perimetro. Il cartello porta
> con sé di chi era il Vespro ed è più lungo proprio per coprire il passaggio.
>
> **Nessun `sincronizzaPassoBanner` al `carica-stato`** (a differenza di catena/Fase 2 e respiro
> IA/Fase 4): un cartello perso nel ripristino è pura decorazione, niente lo aspetta e niente resta
> bloccato. Blindato esplicitamente.
>
> **Verifica Fase 5:** build pulita · `Engine/test-blindati/banner-fase.blindato.mjs` (**nuovo**, 45
> asserzioni in 7 casi) + `voli.blindato.mjs` aggiornato al pilotaggio nuovo **rafforzando** le
> asserzioni (l'ordine esatto `[Vespro, Rifornimento, 6×pesca]` al posto della sola conta; il drenaggio
> fino a fila del tutto vuota; `[pesca, Vaticinio]` con la fase del cartello verificata) +
> `tempi.blindato.mjs` (+`TEMPI.banner`) · gli altri 4 blindati verdi senza modifiche · sweep headless
> **200 partite vsIA complete** (frost+kepler, orchestratore che emula `<Sequenziatore>` + coda visiva)
> con 6 asserzioni d'ordine attive: **200/200 concluse, 0 crash, 0 stalli, 0 violazioni** su **17025
> banner** (8445 miei · 8580 IA · 3245 Vespro) — lo split ~50/50 è la prova statistica di P2.4 ·
> **verifica dal vivo** su partita vsIA reale (non stato iniettato), con poller DOM a 40ms:
> - custom property lette dal CSS: `--t-banner-fase: 1750ms`, `--t-banner-vespro: 2600ms`;
> - durate misurate: Rifornimento 1768/1755/1757ms · Vaticinio 1749/1759/1804ms · Schieramento
>   1752/1761/1765ms · Alla Carica 1753/1758/1796/1812ms · **Vespro 2595ms e 2635ms** (le altre 1750);
> - **catena cronologica misurata su un turno avversario intero** (P2.1+P2.2+P2.4 in una sola traccia):
>   `Vespro mio (2595ms) → Rifornimento avversario → volo-carta della pescata → Vaticinio → dado
>   Imprevisti → Schieramento → Alla Carica → prompt "Difendi"` — il Vaticinio parte **solo dopo** che
>   l'elemento `.carta-volante` è sparito dal DOM;
> - attribuzione corretta su tutti: "Il tuo turno" / "Turno avversario", `transform` senza rotazione
>   (`matrix(1,0,0,1,…)` = solo la traslazione di centratura), classe `titolo-fase-fascia-lungo` e
>   `animationDuration: 2.6s` solo sul Vespro;
> - **scontro IA-contro-mia-creatura osservato dal vivo** (il limite dichiarato della Fase 4, ora
>   chiuso): evocato Piccolo Goblin, l'IA ha attaccato 4 volte in due turni — il pop-up "Difendi o
>   lasci passare?" compare **dopo** il cartello "Alla Carica", mai sopra, e **nessun banner** si è
>   intromesso durante la scenografia di combattimento;
> - chiusura del turno avversario con l'ultimo scontro: `combattimento → Vespro (2635ms) → Rifornimento
>   mio` — il Vespro aspetta la fine del calcolo danni (**P2.1 verificato sul lato più difficile**);
> - **console del browser pulita** per l'intera sessione (solo i messaggi di connessione Vite e
>   l'avviso React DevTools).
>
> **Fase 5 = 🔒 BLINDATA. Idea 59 completa.**
>
> ---
>
> **FASE 4 — FATTA E BLINDATA (2026-08-29).**
>
> **Fase 4 — cosa è atterrato:** il turno dell'avversario non ha più un pacing suo. Il campo
> `s.iaInAttesa` ("evoca"/"attacca"), la dispatch `avanza-ia`, l'`useEffect` col timer fisso di 900ms
> in `App.jsx` e **tutto `iaBloccataDaPrompt`** (OR di 8 condizioni, usato solo da quell'useEffect)
> sono RITIRATI. Al loro posto: **un passo `muta` nome `"ia"`** con `dati:{ azione:"evoca"|"attacca" }`
> e `durataMs: TEMPI.ia.respiro` (900ms, ora in `tempi.js`). Quando arriva in cima e il respiro scade,
> `eseguiMuta` lo **toglie dalla fila PRIMA** di chiamare `avanzaIA(s, azione)` (stesso pattern di
> `catenaRisoluzione`), così tutte le guardie "non partire finché la fila non è vuota" dentro
> `prossimaAzioneAttaccoIA`/`avviaAttacco`/`proseguiSeIA` restano valide alla lettera senza riscriverle.
> `proseguiSeIA` perde il ramo `if (s.sequenza?.length) → iaInAttesa` e **accoda sempre** un respiro
> (helper `accodaPassoIa`, anti-doppione via `haPassoIa`). Nuovi selettori in `sequenza.js`:
> `passoIaInScena` (il testo "L'avversario evoca…"/"…sta per attaccare…" lo legge da lì),
> `haPassoIa`, `filaBloccaCodaVisiva`, `scenaLiberaPerIa`.
> `eseguiFaseEvocaIA` **non toccata** (decisione utente: Magia+Trappola+evocazione restano una sola
> mossa, un solo respiro — spezzarle è fuori dal perimetro dichiarato della Fase 4).
>
> **Limite noto CHIUSO — "campo vuoto = attacchi diretti senza pausa":** `risolviAttaccoDiretto` manda
> il danno su `s.codaVisiva` (non nella fila), quindi `proseguiSeIA` trovava la fila vuota e ricorreva
> **sincrona** su `prossimaAzioneAttaccoIA`: con 3 Pedine e il campo nemico sgombro i 3 attacchi si
> risolvevano tutti in una dispatch. Ora ogni attacco diretto ha il suo respiro. Misurato dal vivo:
> **~1800ms esatti fra un attacco e il successivo** (900 respiro + 300 margine direttore + 600
> `RITARDO_PRIMA_DI_MS.dannoDiretto` per il numero rosso), costante su 4 turni IA consecutivi.
>
> **Due INVARIANTI nuovi, entrambi nati da bug veri colti in verifica:**
> 1. **Il passo `ia` sta SEMPRE in fondo alla fila.** Applicato dentro `accodaPassi`, non lasciato ai
>    chiamanti: qualunque passo accodato dopo di lui gli finisce davanti. Senza, una funzione che
>    accoda dopo aver innescato `proseguiSeIA` nella stessa dispatch metteva il respiro davanti a una
>    decisione del giocatore (**colto da `catena.blindato.mjs`**: risolvendo il 1° frame di una catena
>    a 2 la fila usciva `[muta:ia, scelta:catena]` e l'IA sarebbe ripartita col giocatore ancora in
>    sospeso).
> 2. **Anti-deadlock delle due guardie di pacing.** Il passo `ia` è l'**unica eccezione** alla regola
>    di Fase 3 "la coda visiva aspetta la fila": è respiro, non scenografia, ed è esattamente il
>    momento in cui la coda deve mostrare quel che è appena successo (il numero rosso del danno
>    diretto). **Bug trovato DAL VIVO**: implementata solo metà dell'eccezione, il turno IA si è
>    fermato per sempre su "L'avversario evoca…" — la coda non scorreva perché la fila aveva un
>    `muta`, e il respiro non scadeva perché la coda non era vuota. Le due guardie ora vivono come
>    selettori veri in `sequenza.js` (`filaBloccaCodaVisiva` / `scenaLiberaPerIa`) proprio per poterle
>    blindare invece che duplicarle inline nei componenti.
>
> **Deviazione dichiarata dal §8** (che prevedeva `iaBloccataDaPrompt → s.sequenza.length > 0`): tre
> condizioni sparivano davvero (catena/combattimento/sequenza, garantite dall'ordine della fila), ma
> `notificaEffetto`/`morteInCorso` (Imboscata)/`dadoInCorso` (dado Imprevisti)/`codaVisiva` sono
> flussi **non ancora migrati** e restano — non più sparse in 3 punti, però: una riga sola
> (`scenaLiberaPerIa`) che si accorcerà da sé man mano che le fasi successive le assorbono.
>
> **Salvataggio:** `s.iaInAttesa` sopravviveva al salvataggio, `s.sequenza` viene **svuotata** al
> caricamento (`salvataggio.js`) → senza contromisura una partita ripresa a metà turno avversario
> restava ferma per sempre. Nuovo `sincronizzaPassoIa(s)` chiamato da `carica-stato` (stesso
> precedente di `sincronizzaPassoCatena`, Fase 2): ricostruisce il respiro se tocca all'IA e nessuna
> decisione umana è in sospeso; `evoca` se fase < 4, `attacca` altrimenti.
>
> **Verifica Fase 4:** build pulita · `Engine/test-blindati/turno-ia.blindato.mjs` (**nuovo**, 9 casi:
> taglio netto `iaInAttesa`/`avanza-ia`; forma del passo; un solo respiro alla volta su 2 scontri;
> Pedina con 2 attacchi; 3 attacchi diretti scanditi; invariante d'ordine; ripristino da salvataggio
> ×4; 1v1 locale; anti-deadlock delle due guardie) + `combattimento`/`catena`/`voli` **aggiornati al
> pilotaggio nuovo senza indebolire un'asserzione** (anzi: "fila vuota a scontro concluso" è diventato
> il più stretto "esattamente `[muta:ia]`, mai zero né due") + `tempi.blindato.mjs` (+`TEMPI.ia`) ·
> sweep headless **200 partite vsIA complete** (frost+kepler, orchestratore che emula `<Sequenziatore>`
> + coda visiva): 200/200 concluse, **0 crash, 0 stalli, 0 violazioni** su 8991 respiri, 3674 scontri
> IA, 1592 attacchi diretti — con 3 asserzioni d'ordine attive (mai 2 respiri insieme · respiro sempre
> in fondo · respiro mai scaduto a scena occupata) · verifica dal vivo (3 partite vsIA reali, non
> stato iniettato): 8+ turni IA scanditi, sequenza messaggi "evoca…" → (volo) → "sta per attaccare…"
> confermata, spaziatura degli attacchi diretti misurata a ~1800ms costanti, **console e log del
> server puliti**.
> **Limite della verifica dal vivo, dichiarato:** l'automazione non è riuscita a portare una mia
> creatura in prima linea, quindi lo scontro IA-contro-creatura (pop-up "Difendi" fra due respiri)
> **non è stato osservato dal vivo** — è coperto da `combattimento.blindato.mjs`, dai casi #3/#4 di
> `turno-ia.blindato.mjs` e dai 3674 scontri IA dello sweep.
> **Fase 4 = 🔒 BLINDATA.**
>
> **Il limite dichiarato qui sopra (scontro IA-contro-creatura mai osservato dal vivo) è stato CHIUSO
> durante la verifica della Fase 5** — vedi in cima.
>
> ---
>
> **FASE 3 — FATTA E BLINDATA (2026-08-29).**
>
> **Fase 3 — cosa è atterrato:** i tre voli diventano passi `anim` della fila (`nome: "pesca" |
> "evoca" | "sposta"`). Ritirati gli stati diretti `s.pescaInCorso` / `s.evocazioneInCorso` /
> `s.movimentiInCorso` e le dispatch `pesca-animazione-conclusa` / `evocazione-animazione-conclusa` /
> `movimento-animazione-conclusa` — i tre componenti (`AnimazionePescata/Evocazione/Posizionamento.jsx`)
> ora leggono da `sequenza.js` (`pescaInScena`/`evocaInScena`/`spostaInScena`/`uidInVoloPesca`) e
> segnalano la fine con `sequenza-passo-concluso`. `avviaVoloPescata` guadagna il parametro
> `unaAllaVolta`: la prima mano di chi inizia per secondo (turno 1, 5-6 carte) diventa **N passi da 1
> carta**, il direttore le fa atterrare una alla volta — chiude **F.2** (prima mano percepibile). Il
> Rifornimento normale (1-2 carte) resta un passo unico con lo stagger interno del componente.
> `tempi.js`: nuovo `TEMPI.pesca/evoca/sposta` (solo i **totali**, per il timeout di sicurezza del
> direttore — la coreografia interna resta nei componenti, decisione utente).
>
> **Decisione architetturale — `s.sequenza` master assoluto:** `legacyOccupato` **eliminato** dal
> `<Sequenziatore>` (Fase 1-2 lo usava per aspettare `codaVisiva`/`notificaEffetto`/i voli prima di
> avviare il timer di un passo). Ora: **niente aspetta la coda visiva, è la coda visiva ad aspettare
> la fila.** `App.jsx`: lo scorrimento di `s.codaVisiva` si ferma quando `s.sequenza` ha un passo
> `anim`/`muta` in QUALUNQUE posizione (non solo in testa) — un passo `scelta` da solo (es.
> `scelta:catena`) lascia invece scorrere la coda, così una notifica già in coda (es. l'effetto
> dell'evocazione appena atterrata) si vede PRIMA che la finestra catena si apra. Questo elimina
> l'unico modo per cui pesca/evoca/sposta potevano essere "scavalcati" dal dado Imprevisti o da una
> notifica accodati nella STESSA dispatch (es. `completaRifornimento` accoda il dado Imprevisti DOPO
> aver avviato il volo pesca). Verificato che Fase 1 (combattimento) non ha mai un caso in cui
> `codaVisiva` deve precedere un passo già in fila (l'unico evento diretto-Stratega, "incassa", non
> accoda mai passi). `iaBloccataDaPrompt`/`saltoFase`/`CatenaStriscia` non citano più i 3 campi
> ritirati.
>
> **Bug trovato scrivendo i test:** i blindati di Fase 1/2 costruivano scenari con
> `turniGiocati` non impostato (default 0) — un turno che finisce durante il test (es. "incassa" →
> `proseguiSeIA` → l'IA esaurita → `fineTurno`+`iniziaTurno`) faceva scattare la prima mano
> staggerata (6 passi pesca, ora visibili in `s.sequenza`), invisibile prima della Fase 3 perché finiva
> in `s.pescaInCorso`. Fix: gli scenari di `combattimento.blindato.mjs`/`catena.blindato.mjs` impostano
> ora `turniGiocati` a partita-in-corso (comportamento del gioco invariato, solo il test corretto).
>
> **Nota Fase 4:** il `<Sequenziatore>` ha guadagnato UNA eccezione a questa regola — il passo
> `muta:"ia"` (respiro del turno IA) non blocca la coda visiva e non è bloccato da lei nello stesso
> istante. Vedi in cima, "Due INVARIANTI nuovi".
>
> **Verifica Fase 3:** build pulita · `Engine/test-blindati/voli.blindato.mjs` (nuovo, 7 casi: prima
> mano chi-inizia-per-secondo → 6 passi `anim:pesca` da 1 carta, id crescenti, mai un dado nella fila;
> Rifornimento normale/doppio → 1 solo passo con 1/2 carte, dado Imprevisti resta in `codaVisiva`;
> evocazione lv1 → `[anim:evoca]` con la creatura già vera in campo; avanzata retrovia→prima linea →
> `[anim:sposta]` 1 movimento "avanzata"; scambio → `[anim:sposta]` 2 movimenti opposti; forma del
> passo con `durataMs`/`id`) + `combattimento.blindato.mjs`/`catena.blindato.mjs` aggiornati (scenari
> a partita-in-corso) · sweep headless **200 partite vsIA complete** (frost+kepler, orchestratore che
> emula App.jsx) con **asserzione d'ordine esplicita** (il dado Imprevisti non è mai `dadoInCorso`
> mentre un volo Fase 3 è ancora in fila): 0 crash, 0 stall, 0 violazioni d'ordine — pesca 4673 volte,
> evoca 2077, sposta 11 · verifica dal vivo nel browser (partita vsIA reale, non stato iniettato):
> prima mano di 5 carte una-alla-volta confermata, dado Imprevisti loggato SOLO dopo "Peschi 5 carte",
> salto di fase (chevron→Schieramento) aspetta correttamente la fila; evocazione (mia, con
> `sorgenteRect` reale) e dell'IA (senza, fallback DOM) entrambe atterrate senza classi "in volo"
> residue; **prima mano dell'IA "6 carte (5 iniziali + 1)" confermata nel log**; combattimento Fase 1
> ancora intatto attraverso il cambio (dado→balzo→danno→morte differita, "💀 Araldo Tempesta
> distrutto"); 4 cambi turno consecutivi, **console pulita per tutta la sessione** (solo i dialog
> `confirm()` soppressi dall'ambiente di automazione, non errori dell'app).
> **Fase 3 = 🔒 BLINDATA.**
>
> **Prossimo passo:** Fase 4 (turno IA, pacing scontro-per-scontro) — vedi §10.
>
> ---
>
> **FASE 2 — FATTA E BLINDATA (2026-08-29).**
>
> **Fase 2 — cosa è atterrato:** la scenografia di risoluzione di un frame è ora il passo
> `muta:catenaRisoluzione` di `s.sequenza` (non più lo stato diretto `s.catenaRisoluzioneInCorso`,
> RITIRATO), e la decisione del giocatore è il passo `scelta:catena` (`attende:"catena-passa"`,
> countdown "Risolvi" 15s in `CatenaStriscia`, keyed sull'id del passo). Nuovo helper
> `sincronizzaPassoCatena(s)` tiene `s.sequenza` allineata con `s.catena` (accoda `scelta:catena` per
> l'umano con priorità; riarma la scenografia al ripristino da salvataggio) — chiamato da `avanzaCatena`,
> dai due case `catena-*`, da `eseguiMuta`, e da `carica-stato`. Nuovo campo `s.catena.risolti = []`
> (cronaca dei frame risolti per la striscia, ex `storico` locale di `CatenaStriscia`). `catena.js`
> INVARIATO. Dispatch `catena-conferma-risoluzione` RIMOSSA (sostituita da `sequenza-passo-concluso`
> sul passo `catenaRisoluzione`). Nuovi selettori `sceltaCatenaInScena` / `catenaRisoluzioneInScena`
> in `sequenza.js`. `TEMPI.catena = { countdown: 15000, scenografia: 700 }`. `CatenaStriscia.jsx`
> riscritto: nessuna guardia di timing propria (solo `legacyOccupato` = un solo overlay alla volta),
> legge da `s.sequenza[0]`. `App.jsx`: `iaBloccataDaPrompt` collassa `catena?.turnoDiPriorita==="io"`
> + `catenaRisoluzioneInCorso` in `!!stato?.catena`. `Campo.jsx`: bersaglio catena da
> `catenaRisoluzioneInScena`. `salvataggio.js`: rimosso `catenaRisoluzioneInCorso` da CAMPI_TRANSITORI.
>
> **Bug trovato e corretto in Fase 2:** `applicaRisoluzioneFrameCatena` chiudeva la finestra con
> `catenaVuota(s.catena)` DOPO `risolviFrameCatena` → `proseguiSeIA` → `prossimaAzioneAttaccoIA`, che
> può aver aperto un'ALTRA catena riassegnando `s.catena` → si annullava la catena nuova. Fix: cattura
> il riferimento `const catena = s.catena` in cima e chiudi solo `if (s.catena === catena && catenaVuota(catena))`.
> (Latente anche nel vecchio `confermaRisoluzioneFrameCatena`.)
>
> **Verifica Fase 2:** build pulita · `Engine/test-blindati/catena.blindato.mjs` (nuovo, 5 casi:
> nessuna trappola → dritti a `scelta:difendi`; 1 trappola → `[scelta:catena]`; aggiunta → nuovo
> `scelta:catena` (id nuovo); risoluzione → `[muta:catenaRisoluzione]` con dati corretti; 2 frame →
> LIFO, ordine 1 poi 2; ripristino da salvataggio → passo ricostruito) + `tempi.blindato.mjs`
> aggiornato · sweep headless 250 partite vsIA complete (frost+kepler), 0 crash / 0 stalli, 188
> scenografie di risoluzione esercitate · verifica dal vivo (stato iniettato via localStorage):
> striscia + countdown + trappola eleggibile evidenziata + aggiunta frame + scenografia di risoluzione
> (`catena-risoluzione-carta`, elemento bersaglio trovato nel DOM) + chiusura finestra, console pulita.
> **Fase 2 = 🔒 BLINDATA.**
>
> **Prossimo passo:** Fase 3 (Pesca / evocazione / spostamento) — vedi §10.
>
> ---
>
> **FASE 1 — FATTA E VERIFICATA (2026-08-29).** Le 6 domande (§11) confermate; i 4 nodi emersi
> in implementazione (ordine balzo = "sequenza b"; `tempi.js` sorgente unica incl. `DURATA_TURNO_MS`;
> `eventoDanno`/`infliggiDanno` restano su coda visiva; patch chirurgica a `CatenaStriscia`)
> confermati dall'utente prima di scrivere.
> Obiettivo: **Livello B** (tutto). Fasi 2-5 ancora da fare (§10).
>
> **Fase 1 — cosa è atterrato:** `s.sequenza` + `src/game/tempi.js` + `src/game/sequenza.js` (selettori)
> + `<Sequenziatore>` (App.jsx) + migrazione combattimento (`passaAlRifiuto`→`decidiDifesa`→
> `decidiRipetizione`→`applicaSimbolo`→`risolviDannoCombattimento`, morte = passo `muta` differito).
> Dispatch nuova: `sequenza-passo-concluso` (id-guarded, gestisce anche `muta`). Ritirati:
> `s.esitoCombattimento`, `s.animazioneAttacco`, `s.esitoInCorso`, `comb.idBalzoRichiesto`,
> `comb.idDadoRichiesto`, `registraAnimazioneAttacco`, `case "esito-animazione-conclusa"`, il blocco
> "azzera campi ultimo evento" in `avviaAttacco`, il timer `esitoInCorso` in App.jsx.
> **Tenuti** (ancora usati fuori dal combattimento): `s.lancioDado`/`s.dadoInCorso` (dado Imprevisti),
> `s.morteInCorso`/`confermaMorteInCorso`/`case "morte-animazione-conclusa"`/`registraMorte`
> (Imboscata Trappola — flusso non ancora migrato), `s.eventoDanno`/`infliggiDanno` (danno diretto).
> **Deviazioni dal §4/§6 di questo doc:** per l'IA difensore non si crea il passo `scelta` difendi
> (auto-risolto inline, i passi visivi passano comunque dalla fila); il passo `muta` morte NON avanza
> "subito" ma aspetta il segnale di `AnimazioneMorte` (serviva la posizione DOM pre-rimozione).
>
> **Verifica Fase 1:** build pulita · `Engine/test-blindati/combattimento.blindato.mjs` +
> `tempi.blindato.mjs` (verdi) · sweep headless 200 partite vsIA complete (frost-land + kepler), zero
> crash/stalli · verifica dal vivo nel browser: sequenza `difendi → dado (~1,17s) → ripeti → balzo
> (~0,9s) → numero (~1,15s) → morte differita (~0,74s)`; §7 confermato (la creatura letale resta in
> `primaLinea` finché il passo `muta` non è in cima, poi rimozione + avanzamento automatico).
> **Fase 1 = 🔒 BLINDATA.**
>
> **Prossimo passo:** Fase 2 (Catena) — vedi §10.

---

## 1. Perché — il problema di oggi (con numeri)

Non esiste **una** fila di eventi. Ci sono **due meccanismi paralleli** + **guardie sparse che si
controllano a vicenda**:

**a) `s.codaVisiva`** — una vera coda `[{ evento, dati }]`, ma:
- viene **azzerata a ogni dispatch "vera"** (`continua-fase`, `avanza-ia`, `scegli-attaccante`…): se
  il giocatore agisce mentre la coda scorre, gli eventi rimasti spariscono (semplificazione accettata,
  ma fragile);
- i **pop-up non ci stanno dentro** — sono componenti React separati che si auto-nascondono;
- ha **9 eccezioni** documentate ("non azzerare in questa dispatch") — `avanza-coda-visiva`,
  `chiudi-notifica`, tutte le `*-animazione-conclusa`, i `catena-*`.

**b) ~10 campi "in corso" diretti** che NON passano dalla coda, ognuno col suo timer e la sua dispatch
di sblocco:
`pescaInCorso`, `evocazioneInCorso`, `movimentiInCorso`, `morteInCorso`, `dadoInCorso`, `esitoInCorso`,
`catenaRisoluzioneInCorso`, + i "pinnati" `faseVisibile` / `imprevistoVisivo`.

**c) le guardie** (fonte: `App.jsx`, `PromptCombattimento.jsx`, `CatenaStriscia.jsx`):
- `iaBloccataDaPrompt` = OR di **11 condizioni**;
- l'`useEffect` che scorre la coda: early-return su **6 condizioni**;
- `PromptCombattimento` / `CatenaStriscia` ritornano `null` finché non combaciano
  `idBalzoRichiesto` **e** `idDadoRichiesto` **e** `!dadoInCorso` **e** `!esitoInCorso` **e**
  `!codaVisiva.length`;
- l'`useEffect` del salto fase: altre **4 condizioni**.

Ogni bug di tempistica nuovo = **una guardia nuova in 3-4 punti**. N campi, ~N timer, ~N guardie che si
citano a vicenda → le combinazioni esplodono → ogni fix ne rompe un altro. È la causa radice esplicita
della famiglia **F.6 / P0.3-P0.5 / P2.1-P2.4** e del limite noto "la mia carta muore nello stesso
scontro in cui attacca e sparisce prima del balzo" (task 48, `Worldloom_Sequenze_Interazione.pdf`
"BUG NOTO priorità zero").

**Nota:** `Worldloom_Sequenze_Interazione.pdf` (ora in `Archivio/`) NON coordinava niente — era una
fotografia in sola lettura del 19-08. Nessun coordinatore esiste oggi nel codice.

---

## 2. Il concetto — `s.sequenza`

Un **unico array ordinato** `s.sequenza`. `s.sequenza[0]` è il passo **in scena** adesso.
**Niente prosegue finché `s.sequenza` non è vuota**: non l'IA, non l'avanzamento di fase, non un
pop-up diverso da quello del passo corrente.

Il reducer, quando risolve un'azione, invece di accendere 5 campi insieme **mette i momenti in fila
in ordine cronologico**. Un **solo "direttore"** lato UI guarda `s.sequenza[0]` e lo fa avanzare.

Sostituisce: `codaVisiva` + tutti i campi `*InCorso` + `lancioDado`/`animazioneAttacco`/
`esitoCombattimento`/`eventoDanno` + la maggior parte delle 25 guardie.

---

## 3. Schema di un passo

```js
{
  id: <int monotono>,        // da prossimoIdEventoVisivo(s) — chiavi React stabili
  tipo: "anim" | "scelta" | "muta" | "banner",
  nome: "<genere>",          // "dado" | "balzo" | "danno" | "morte" | "difendi" |
                             // "ripeti" | "catena" | "notifica" | "pesca" | "evoca" |
                             // "sposta" | "vfxMagia" | "bannerFase" | "imprevistoRuota" | ...
  dati: { ... },             // payload che la UI usa per rendere questo passo
  durataMs?: <int>,          // "anim"/"banner": timeout di sicurezza (la fine vera la
                             //  segnala il componente); default da tempi.js
  attende?: "<tipo-dispatch>" // "scelta": quale dispatch lo chiude
}
```

---

## 4. I quattro tipi di passo

### `anim` — un momento visivo a tempo
Dado che rotola, balzo della carta, numero di danno, volo pesca, volo evocazione, contraccolpo di
morte, orbe VFX Magia, rotazione carta Imprevisti.
- Il **componente che lo rende** segnala la fine con `dispatch({ type: "sequenza-passo-concluso", id })`.
- Il **direttore** ha comunque un timer di sicurezza (`durataMs` + margine): se il segnale si perde,
  avanza lo stesso. Nessuno stallo possibile.
- Alla fine: `s.sequenza.shift()`.

### `scelta` — una decisione bloccante
Difendi/incassa · Ritenti? (diritto di ripetizione) · striscia catena · scelta bersaglio ·
scelta di chi avanza in prima linea · tributo · notifica-effetto-da-chiudere.
- Il direttore rende il pop-up giusto in base a `nome`. **Nessun timer.**
- La scelta del giocatore dispatcha la sua azione normale (`decidi-difesa`, `catena-passa`…). La
  funzione di risoluzione nel reducer **infila** (prepend) gli eventuali nuovi passi in cima a
  `s.sequenza`, **poi** fa `shift()` del passo di scelta.
- **Per l'IA**: il passo `scelta` esiste comunque (pacing uniforme), ma non si mostra pop-up — la
  logica IA lo auto-risolve infilando l'esito. Così "IA decide" e "umano decide" percorrono la stessa
  fila.

### `muta` — una mutazione di stato differita
Il caso principale: **togliere dal campo una creatura morta**. Oggi `ripulisciCampo()` gira sincrono
dentro la dispatch (la creatura sparisce prima che balzo/dado si vedano).
- Nuovo: il reducer calcola i **numeri** subito (danno, chi muore), ma **rimanda la rimozione
  visibile** a un passo `muta`.
- Quando il passo `muta` arriva in cima, il gestore di `sequenza-avanti` applica la mutazione vera
  (`ripulisciCampo` + eventuale avanzamento obbligatorio), poi `shift()`.
- Vedi **§6** per lo scenario completo e **§11 Q1** per l'alternativa.

### `banner` — un cartello di transizione
Banner di fase "Vespro" (fine turno) / "Vaticinio" (pesca). Come `anim` ma senza un elemento che si
muove: solo il cartello a schermo per `durataMs`. Copre P2.1-P2.4.

---

## 5. Il direttore unico

Un solo punto in `App.jsx` (hook o componente `<Sequenziatore>`):

```
head = s.sequenza[0]
  ├─ head == null            → niente da fare, il gioco procede normalmente
  ├─ head.tipo == "anim"     → avvia timer(head.durataMs || tempi[head.nome] + respiro);
  │                            ascolta anche "sequenza-passo-concluso"; il primo che scatta
  │                            → dispatch("sequenza-avanti")
  ├─ head.tipo == "banner"   → come "anim"
  ├─ head.tipo == "scelta"   → rende il pop-up giusto (PromptCombattimento / CatenaStriscia /
  │                            NotificaEffetto / evidenziazione bersaglio). Nessun timer.
  │                            La dispatch dell'azione la chiude.
  └─ head.tipo == "muta"     → dispatch("sequenza-avanti") subito
```

`case "sequenza-avanti"`:
```
if head.tipo == "muta": applica head.dati.mutazione(s)   // ripulisciCampo, avanzamento, ...
s.sequenza.shift()
// se il nuovo head è ancora "muta", il direttore ri-scatta e lo processa: nessun loop nel reducer
```

`case "sequenza-passo-concluso"` (id): `if s.sequenza[0]?.id === id → s.sequenza.shift()`
(la guardia sull'id evita che una "conclusa" di un passo vecchio tolga quello nuovo — stesso schema
già usato oggi per `dado-animazione-conclusa`).

**Regola d'oro per il reducer:** `s.sequenza` si **azzera solo in `nuovaPartita` / `carica-stato` /
`abbandona-a-menu` / `timer-scaduto` / `fineTurno`**. Ogni altra dispatch o **prepend** (decisioni,
risoluzioni) o **non tocca** la fila. Sparisce l'attuale groviglio di "azzera / non azzerare".

---

## 6. Esempio completo — l'IA attacca la mia creatura

Oggi: `avviaAttacco → scegliBersaglio → decidiDifesa → applicaSimbolo → risolviDannoCombattimento
→ ripulisciCampo`, con dado/balzo/numero accodati e i pop-up che si auto-gestiscono.

Domani, `avviaAttacco` (IA) costruisce e mette in fila:

```
s.sequenza = [
  { anim,   nome:"balzo",     dati:{ attaccanteId, difensoreId }        durataMs: tempi.balzo }
  { scelta, nome:"difendi",   dati:{ confronto stat }   attende:"decidi-difesa" }
]
```

1. **balzo** → il direttore lo mostra 0,55s → `shift()`.
2. **difendi** → il direttore mostra il pop-up "Difendi o incassa?". Il bersaglio è già rosso
   (dato nel passo). **Nessun dado, nessun numero: la scelta viene prima di tutto** (bug F.6 / lista
   RIPRESA 2026-08-26: "difendi/incassa → dado → balzo → calcolo danni").
   - **Incassa** → `decidiDifesa("incassa")` infila `[{ anim danno }, { muta morte? }]` e `shift()`.
   - **Difendi** → `decidiDifesa("difendi")` infila:
     ```
     [ { anim, nome:"dado",  dati:{ archetipo, faccia }  durataMs: tempi.dado.totale }
       ( { scelta, nome:"ripeti", ... }  solo se il simbolo dà vantaggio/svantaggio )
       { anim, nome:"danno", dati:{ importo, bersaglioId }  durataMs: tempi.numeroDanno }
       ( { muta, nome:"morte", dati:{ mutazione: ripulisci+avanzamento }  durataMs: tempi.morte } ) ]
     ```
     e `shift()` del passo "difendi".
3. **dado** → rotola, si ferma sul risultato vero (già deciso dal reducer) → `shift()`.
4. **ripeti** (se presente) → pop-up "Ritenti?" **subito dopo aver visto il simbolo**, PRIMA del
   numero di danno (correzione esplicita dell'utente). "Ritenta" → prepend di un nuovo `{ anim dado }`.
   "Tieni" → `shift()`.
5. **danno** → numero fluttuante + lampeggio Vita, 1,15s → `shift()`.
6. **morte** (se letale) → `muta`: ora `ripulisciCampo` toglie davvero la creatura, parte il
   contraccolpo/volo, poi avanzamento obbligatorio → `shift()`.

Fila vuota → il turno IA prosegue (vedi §10 Fase 4: **il secondo attacco IA non viene nemmeno
calcolato finché questa fila non è vuota** — è così che si chiude F.6 / P0.3-5).

---

## 7. La morte come passo `muta` (dettaglio)

`risolviDannoCombattimento` oggi fa due cose in un colpo: (a) calcola `dannoDifensore` /
`dannoAttaccante` / `pareggioMortale`; (b) muta le creature + `ripulisciCampo`.

Domani: (a) resta sincrono (i numeri sono decisi subito, lo stato "vero" è coerente). (b) diventa un
passo `muta` in fondo alla sotto-sequenza dello scontro. Finché quel passo non arriva in cima:
- la creatura morta è **ancora in `primaLinea`/`retrovia`** (stato vero);
- ma **niente la interroga**, perché `s.sequenza` non è vuota → IA ferma, fasi ferme, nessun altro
  scontro parte;
- il direttore mostra balzo → dado → numero, poi il passo `muta` la rimuove e fa partire il
  contraccolpo.

Questo elimina strutturalmente il "BUG NOTO priorità zero": non serve più una guardia sul rendering
delle creature morte, perché non muoiono (nello stato) finché non è il loro momento.

---

## 8. Come collassano le guardie

| Oggi | Domani |
|---|---|
| `iaBloccataDaPrompt` = OR di 11 condizioni | `s.sequenza.length > 0 \|\| s.vincitore` |
| `useEffect` scorri-coda: 6 condizioni | il direttore (§5) |
| `PromptCombattimento`/`CatenaStriscia` self-gate (5 controlli each) | rendono sse `s.sequenza[0].nome` combacia — nessun controllo di timing |
| `saltoFase` useEffect: "aspetta coda/pesca/rifornimento" | `!s.sequenza.length` |
| `dadoInCorso` / `esitoInCorso` / `morteInCorso` / `pescaInCorso` / `evocazioneInCorso` / `movimentiInCorso` / `catenaRisoluzioneInCorso` | **eliminati** — sono passi della fila |
| `RITARDO_PRIMA_DI_MS` (6 valori a occhio) | `tempi.js` §9 |

---

## 9. `src/game/tempi.js` — sorgente unica dei tempi

Ogni durata di animazione e ogni "respiro" tra i passi in **un solo modulo**. Consumato da:
- il **direttore** (per `durataMs` di default);
- i **componenti** di animazione (`LancioDado.jsx`, `AnimazioneMorte.jsx`, `AnimazionePescata.jsx`,
  `AnimazioneEvocazione.jsx`, `VfxMagia.jsx`);
- il **CSS**, tramite custom property iniettate una volta (`:root { --t-balzo: 550ms; … }`), così le
  `@keyframes` leggono dallo stesso posto (vedi §11 Q4).

Bozza (i valori vanno letti dal codice reale prima di scrivere il file):
```js
export const TEMPI = {
  dado:        { roll: 720, facciaFerma: 700, totale: 2300 },
  balzo:       550,
  numeroDanno: 1150,       // .carta-esito / vita-flash-danno
  morte:       { contraccolpo: 300, volo: 550, impatto: 350 },
  pescaVolo:   500,
  worldloomPulsa: 600,
  evocazioneVolo: { salita: 600, sostaCentro: 650, discesa: 500, impatto: 350 },
  vfxMagia:    550,
  bannerFase:  1600,
  respiro:     200,        // gap di default tra un passo e il successivo
  turno:       180000,     // = DURATA_TURNO_MS (spostare qui da costanti.js)
};
```
**Blindato** da `Engine/test-blindati/tempi.blindato.mjs` che fa lo snapshot di `TEMPI`.

---

## 10. Piano di migrazione — un flusso alla volta, ognuno blindato

Ogni fase: build pulita + test headless `Engine/test-blindati/<nome>.blindato.mjs` + verifica dal
vivo + aggiornamento di `WORLDLOOM.md` / `Roadmap` / `UX Codex`. **Taglio netto per fase** (niente
adattatori che tengono in piedi il vecchio campo in parallelo — genererebbero proprio il tipo di
doppio-stato che stiamo eliminando).

| Fase | Cosa | Ritira | Sblocca |
|---|---|---|---|
| **1 ✅ FATTA 2026-08-29** | Infrastruttura + **combattimento**: `s.sequenza`, `sequenza-passo-concluso`, `<Sequenziatore>`, `tempi.js`, `sequenza.js` (selettori). Migrato `passaAlRifiuto`→`decidiDifesa`→`decidiRipetizione`→`applicaSimbolo`→`risolviDannoCombattimento`. Morte = `muta` differito. | `esitoCombattimento`, `animazioneAttacco`, `esitoInCorso`, `idBalzoRichiesto`, `idDadoRichiesto`, `registraAnimazioneAttacco`, `esito-animazione-conclusa`. **NON ritirati** (usati fuori dal combattimento): `lancioDado`/`dadoInCorso` (dado Imprevisti), `morteInCorso` + relativa filiera (Imboscata Trappola), `eventoDanno`/`infliggiDanno` (danno diretto) | F.6 (parte multi-attacco IA), P0.3-P0.5, sequenza "difendi→dado→balzo→danni" della lista RIPRESA 2026-08-26 |
| **2 ✅ FATTA 2026-08-29** | **Catena** (`catena.js` invariato nella logica): la decisione = passo `scelta:catena`, la scenografia di risoluzione di un frame = passo `muta:catenaRisoluzione`. `CatenaStriscia` legge da `s.sequenza`. Helper `sincronizzaPassoCatena`. Nuovo `s.catena.risolti`. | `s.catenaRisoluzioneInCorso`, dispatch `catena-conferma-risoluzione`, timer locali + `storico` di `CatenaStriscia`, le sue 5 guardie di timing, `catena?.turnoDiPriorita==="io"`/`catenaRisoluzioneInCorso` da `iaBloccataDaPrompt` | scenografia catena su fila unica (roadmap catena §7). P1.4 NON chiuso (diagnostica portata dietro invariata) |
| **3 ✅ FATTA 2026-08-29** | **Pesca / evocazione / spostamento** come passi `anim` (`pesca`/`evoca`/`sposta`). Prima mano di chi inizia per secondo = N passi da 1 carta. `legacyOccupato` eliminato dal `<Sequenziatore>`: `s.sequenza` è il master assoluto, la coda visiva aspetta la fila (non più il contrario). | `pescaInCorso`, `evocazioneInCorso`, `movimentiInCorso` (il campo `eventoPesca` della bozza originale non esisteva più nel codice reale, superato dal task 50) | F.2 (prima mano percepibile, chiusa) |
| **4 ✅ FATTA 2026-08-29** | **Turno IA**: il pacing dell'avversario è un passo `muta:"ia"` (`azione: "evoca"\|"attacca"`, `durataMs: TEMPI.ia.respiro`). `eseguiMuta` lo shifta prima di chiamare `avanzaIA`, così le guardie esistenti restano valide. `proseguiSeIA` accoda sempre un respiro (`accodaPassoIa` + `haPassoIa`). Nuovo invariante in `accodaPassi`: il passo `ia` sta **sempre in fondo**. `sincronizzaPassoIa` al `carica-stato`. Le 2 guardie di pacing diventano selettori veri (`filaBloccaCodaVisiva`/`scenaLiberaPerIa`). | `s.iaInAttesa`, dispatch `avanza-ia`, l'`useEffect` col timer 900ms in App.jsx, **tutto `iaBloccataDaPrompt`** (8 condizioni) | il resto di **F.6** (multi-attacco IA) · **limite "campo vuoto = attacchi diretti senza pausa" CHIUSO** (misurato: ~1800ms fra un diretto e il successivo) |
| **5 ✅ FATTA 2026-08-29** | **Banner di fase** come passi `banner` (`nome:"bannerFase"`, `dati:{chiave,fase}`, `durataMs`). 5 punti d'aggancio (iniziaTurno / completaRifornimento / applicaEventoVisivo·imprevistoEsito / continuaFase+avanzaIA / fineTurno-dopo-flushSequenza). `TitoloFase.jsx` riscritto: legge `bannerInScena`, segnala `sequenza-passo-concluso`. `banner` entra in `filaBloccaCodaVisiva`; `scenaLiberaPerIa` non toccata. `TEMPI.banner={fase:1750,vespro:2600}` + custom property CSS. Guardia `timer-scaduto` estesa a coda visiva/dado/morte. | l'`useEffect` di cambio-fase, il contatore di id locale e il `DURATA_MS` di `TitoloFase.jsx`. **NON** `faseVisibile`/`imprevistoVisivo`: deviazione dichiarata (vedi in cima) — pinnano due letture attraverso il dado Imprevisti, flusso non migrato | **P2.1** (Vespro: prima non esisteva affatto, ora aspetta il calcolo danni e dura 2600ms) · **P2.2** (Vaticinio dietro al volo della pescata) · **P2.3** (timer scaduto non taglia più di netto) · **P2.4** (banner anche nel turno IA, requisito esplicito dell'utente) |

---

## 11. Domande aperte — ✅ CHIUSE con l'utente il 2026-08-28

**Q1 — La morte → ✅ passo `muta` (rimozione differita).**
La creatura resta nello stato vero finché non è il suo momento nella fila, poi `ripulisciCampo` +
avanzamento obbligatorio girano nel gestore di `sequenza-avanti`. Elimina strutturalmente il "BUG NOTO
priorità zero". Vedi §7.

**Q2 — Turno IA → ✅ sequenziato, uno scontro alla volta.**
`avanzaIA` / `prossimaAzioneAttaccoIA` non calcolano il passo/scontro successivo finché `s.sequenza`
non è vuota. Il turno d'attacco IA dura di più in tempo reale, accettato: è l'unico modo di chiudere
F.6 / P0.3-5. Nessun accorpamento di scontri "a vuoto" — tutti scanditi.

**Q3 — Ordine di migrazione → ✅ quello naturale** (§10): combattimento → catena → pesca/evoc →
turno IA → banner fase. I banner per ultimi perché dipendono da tutto il resto.

**Q4 — `tempi.js` → ✅ sorgente unica anche per il CSS.**
All'avvio l'app inietta i valori come custom property su `:root` (`--t-balzo: 550ms`, …); le
`@keyframes` in `index.css` usano `var(--t-…)`. Impossibile disallineare JS e CSS. Accettato il costo
di toccare `index.css` nei ~15 punti con durate.

**Q5 — Pop-up → ✅ riscrittura piena.**
`PromptCombattimento.jsx` / `CatenaStriscia.jsx` / `NotificaEffetto.jsx` vengono riscritti: perdono
tutta la logica di auto-gating (`idBalzoRichiesto`/`idDadoRichiesto`/`dadoInCorso`/…), rendono sse
`s.sequenza[0].nome` combacia. Autorizzato a toccarli a fondo.

**Q6 — 1v1 locale → ✅ fila unica, verifica in Fase 1.**
`s.sequenza` è per-partita; il passo `scelta` usa `chiDecideOra(stato)` per mostrare il pop-up a chi
tocca; passaggio del telefono invariato. Da verificare esplicitamente durante la Fase 1 prima di
dichiararla a posto.

**→ Design chiuso. La prossima sessione parte con la Fase 1 (§10).**

---

## 12. Cosa NON cambia

- La **matematica del combattimento** (Ruota di efficacia, `attaccoTotale`/`parataTotale`, pareggio
  rosso su Spada / innocuo su Scudo).
- La **catena**: priorità stile Magic, risoluzione LIFO, `catena.js` intatto nella logica.
- Gli **effetti delle carte** (nessun aggancio nuovo — vedi Vocabolario Effetti).
- **Chi decide cosa** (`src/game/prospettiva.js` → `chiDecideOra`).
- Lo **stato di gioco vero** resta risolto subito "dietro le quinte" — la fila governa solo *quando lo
  vedi*. Unica eccezione deliberata: la rimozione della creatura morta (Q1/A).

---

## 13. Blindatura — cosa deve congelare ogni test

`Engine/test-blindati/` (nuova cartella). Ogni test è un `.mjs` usa-e-getta **che NON si cancella**,
importa `gameReducer.js` direttamente, e asserisce la **forma esatta di `s.sequenza`** dopo un'azione:

- **`combattimento.blindato.mjs`** — IA attacca, difendo: la fila esce
  `[balzo, difendi]`; dopo `decidi-difesa("difendi")` con diritto di ripetizione in sospeso →
  `[dado, ripeti, danno, morte?]`; dopo `decidi-difesa("incassa")` → `[danno, morte?]`, MAI un dado;
  "ritenta" → prepend di un nuovo `dado`; nessun passo `scelta` visibile mentre un `anim` è in cima.
- **`morte.blindato.mjs`** — la creatura morta è ancora in `primaLinea` finché il passo `muta` non
  arriva in cima; dopo `sequenza-avanti` sul `muta` → rimossa + avanzamento obbligatorio applicato.
- **`tempi.blindato.mjs`** — snapshot di `TEMPI`.
- **`catena.blindato.mjs`** (Fase 2, ✅ fatto) — nessuna trappola eleggibile → `[scelta:difendi]`,
  `s.catena` mai aperta; 1 trappola → `[scelta:catena]` (con `s.catena.risolti === []`); dopo
  `catena-aggiungi-trappola` → di nuovo `[scelta:catena]` con **id nuovo** (countdown da capo);
  dopo `catena-passa` (io + IA passano) → `[muta:catenaRisoluzione]` con `dati.proprietario/ordine/
  esito/bersaglio` corretti, MAI un dado; dopo `sequenza-passo-concluso` → frame fuori, effetto
  applicato, `s.catena` null; catena a 2 frame → 2 `catenaRisoluzione` in LIFO (ordine 1 poi 2);
  ripristino da salvataggio con catena aperta → passo ricostruito.
- **`guardie.blindato.mjs`** — `iaBloccataDaPrompt` equivalente = `s.sequenza.length > 0`; nessun
  `dadoInCorso`/`esitoInCorso`/`morteInCorso` residuo nello stato dopo Fase 1.
- **`voli.blindato.mjs`** (Fase 3, ✅ fatto) — prima mano di chi inizia per secondo → 6 passi
  `anim:pesca` da 1 carta ciascuno, id crescenti, mai un dado nella fila; drenati uno alla volta con
  `sequenza-passo-concluso`; Rifornimento normale/doppio → 1 solo passo pesca con 1/2 carte, il dado
  Imprevisti resta su `s.codaVisiva` (mai nella fila); evocazione lv1 → `[anim:evoca]` con
  `dati.creaturaId` già vero in `primaLinea`; avanzata retrovia→prima linea → `[anim:sposta]` 1
  movimento "avanzata"; scambio → `[anim:sposta]` 2 movimenti opposti; ogni passo porta `durataMs`/`id`.
- **`turno-ia.blindato.mjs`** (Fase 4, ✅ fatto) — `s.iaInAttesa` e la dispatch `avanza-ia` non
  esistono più (quest'ultima inerte); forma del passo `muta:"ia"` (`azione`, `durataMs = TEMPI.ia.respiro`,
  `id`); su 2 Pedine che attaccano c'è **esattamente 1** respiro in fila e **nessuno** pre-calcolato
  durante lo scontro; Pedina con 2 attacchi = un respiro per attacco, stesso attaccante; 3 attacchi
  diretti a campo sgombro = un respiro ciascuno, un solo `dannoDiretto` in coda alla volta;
  invariante d'ordine (il respiro è sempre l'ultimo, tutto ciò che si accoda dopo gli va davanti);
  `carica-stato` ricostruisce il respiro (fase ≥4 → "attacca", fase 3 → "evoca") ma **non** se c'è una
  decisione umana in sospeso, né nel mio turno, né in 1v1 locale; **anti-deadlock**: con solo il
  respiro in fila e la coda piena, `filaBloccaCodaVisiva` è falsa mentre `scenaLiberaPerIa` è falsa —
  mai entrambe bloccanti (un `anim` vero blocca ancora la coda, uno `scelta` da solo no: Fase 3 intatta).
- **`banner-fase.blindato.mjs`** (Fase 5, ✅ fatto) — forma del passo (`tipo:"banner"`,
  `nome:"bannerFase"`, `dati:{chiave,fase}`, `id`, `durataMs` da `TEMPI.banner`); **P2.1** il Vespro è
  in testa dopo `fineTurno` (accodato DOPO `flushSequenza`), attribuito a chi CHIUDE il turno (non a
  chi lo apre: lo stato ha già girato), `s.fase` non vale mai 5, `vespro > fase` come durata; ordine
  completo di un cambio turno `[Vespro, Rifornimento, pesca, Vaticinio, respiro]` con il respiro
  ancora in FONDO; **P2.2** dopo `rifornimento` la fila è `[anim:pesca, banner]` e il cartello è la
  fase 2 — mai davanti alla pescata — col dado Imprevisti ancora in coda visiva dietro; **il banner
  blocca `filaBloccaCodaVisiva`** anche da solo, e la sblocca appena drenato; il banner Schieramento
  accodato da `imprevistoEsito` **scavalca il respiro `muta:"ia"` già in fila** (invariante Fase 4);
  **P2.4** su un turno IA completo i banner coprono tutte e 5 le fasi con `chiave:"avversario"` (un
  solo Vespro, nessun doppione) e altrettanto sul mio turno; **P2.3** `timer-scaduto` non cambia turno
  con coda visiva piena / `dadoInCorso` / `morteInCorso` / fila piena, e quando la scena è libera il
  primo passo è il Vespro; **anti-deadlock** `scenaLiberaPerIa` ignora i banner (resta l'unica guardia
  bidirezionale) e uno `scelta` da solo continua a non bloccare; nessun banner a partita vinta;
  `carica-stato` non ricostruisce banner e non lascia la fila bloccata.

Più: **sweep headless** di ≥150 partite vsIA complete a fine di ogni fase, zero crash/stalli.

---

## 14. Riferimenti

- `Engine/Roadmap_Sessione_2026-08-27.md` — regola anti-regressione #4 (la descrizione originale del
  target), punti F.6 / P0.3-5 / P1.4 / P2.1-2.4.
- `UX/Worldloom_UX_Codex.html` — riquadro "Coda visiva" (il meccanismo attuale), da aggiornare a
  refactor fatto.
- `UX/Worldloom_Foglio_Maestro_UX.md` — §8 Combattimento, §7 Catena, Addendum A/B/C.
- `Archivio/Worldloom_Sequenze_Interazione.pdf` — le sequenze "as-is" al 19-08 (superate, ma utili
  come checklist di cosa deve continuare a funzionare).
- graphify: `/graphify query "sequenza di risoluzione del combattimento"` per il raggio d'impatto.
