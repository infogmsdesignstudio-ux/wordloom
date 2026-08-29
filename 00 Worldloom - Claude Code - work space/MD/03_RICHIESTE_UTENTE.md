# 3 · Catalogo delle richieste del committente

> Questo è il documento che spiega **perché** il codice è com'è. Ogni riga qui è una richiesta
> reale, con i *particolari* espressi dal committente — spesso è il particolare, non la richiesta
> generica, a determinare l'implementazione.
>
> Legenda stato: ✅ fatto e verificato · 🔒 blindato da test · 🟡 in corso / serve chiarimento ·
> 🔴 non iniziato o in attesa di decisione.

---

## A. Richieste di *metodo* — le regole di processo non negoziabili

Sono le più importanti: nascono da frustrazioni esplicite ("*correggiamo qualcosa e si ripropone,
è un lavorare all'infinito*", 2026-08-28) e valgono più di qualunque richiesta di funzionalità.

| # | Richiesta | Dettagli espressi |
|---|---|---|
| **M1** | **Toccare SOLO la cosa esatta chiesta** | Mai "già che ci sono". Niente rifattorizzazioni non richieste. Se noti un problema collegato → lo **segnali nella roadmap**, non lo tocchi. Violata il 2026-08-28 (chiesta la carta Imprevisto, toccati anche `.campo-slot-trappola` e `.campo-pila-sfondo`): da lì la regola è scritta |
| **M2** | **Prima di scrivere codice: chiedere** | Fare domande per chiarire concetto e modifica esatta, non presumere. Per feature grosse o architetturali: **spiegare il piano a parole e aspettare conferma esplicita** |
| **M3** | **Un punto alla volta** | Si discute a parole come procedere, si calcolano le conseguenze, si fa, si builda, si verifica, si aggiorna la roadmap, e **si ripropone l'INTERA lista** prima di passare al successivo |
| **M4** | **Blindare ciò che è confermato** | Quando l'utente conferma che una cosa è giusta: (a) scrivere un test headless che ne congela la sequenza/il layout esatto e **salvarlo** in `Engine/test-blindati/`; (b) segnare `🔒 BLINDATO` nella roadmap. Quei code-path diventano off-limits senza rifare il test |
| **M5** | **Usare graphify prima di toccare CSS/timing/funzioni condivise** | per vedere il raggio d'impatto. Non è stato usato per gran parte del 2026-08-28, e si è visto |
| **M6** | **Consultare il Vocabolario Effetti prima di QUALUNQUE effetto** | anche solo un "+N Attacco". E aggiornarne la tabella quando si implementa un codice mancante |
| **M7** | **Aggiornare i documenti nella stessa sessione** | Regolamento, UX Codex, Vocabolario, Roadmap, Storico, `WORLDLOOM.md`. Se l'engine "semplifica" una regola, **dirlo nel testo del regolamento** con una nota di revisione — non fingere che coincidano |
| **M8** | **Backup prima di lavoro grosso** | copia giocabile in `Versioni gioco/` + copia sorgente in `Backup sorgente …/`, annotata nello Storico |
| **M9** | **`cards.json` non si modifica MAI a mano** | solo Excel + `genera_cards_json.py` |
| **M10** | **Test usa-e-getta cancellati, test blindati salvati** | le simulazioni `sim-*.mjs` si cancellano dopo l'uso; i blindati no, mai |
| **M11** | **Linguaggio positivo nei testi pubblici** | esprimere sempre i concetti in positivo, mai per negazione: "le parole pesano anche a livello inconscio" |
| **M12** | **Privacy dei dati** | Claude che legge i file direttamente va bene; evitare API di terze parti; i dati sensibili restano nella cartella di progetto |

---

## B. Richieste di prodotto, per area

### B.1 Uniformità del campo — richiesta ripetuta due volte

> Tutti gli slot del campo (creature, Terreno, Magie/Trappole coperte, Cimitero, Worldloom,
> Imprevisti) devono avere **sempre la stessa dimensione e proporzione carta (~5:7)**.
> Mai uno slot "compatto" o più piccolo per le pile.

L'utente ha **fermato il lavoro due volte** per questo. È diventata una regola di `CLAUDE.md`.

### B.2 Nessuna barra di scorrimento nel campo — mai

> "Solo scaling uniforme, il campo si adatta da solo alla finestra" + "**deve occupare sempre più
> spazio possibile**" (il tavolo si **ingrandisce** su schermi grandi, non resta piccolo al centro).

Ha comportato lo scarto in corsa di un primo piano (Piano A) e l'adozione di un `transform: scale(k)`
su un wrapper a larghezza di progetto fissa (`--tavolo-w: 1400px`), **senza tetto a 1**.

### B.3 Terminologia

- **"Alieno"/"creatura" → "Pedina"** in tutto il testo visibile (richiesta esplicita 2026-08-28,
  poi estesa ai dati il 2026-08-29).
- **"Kepler" → "Marbion"**: "Kepler non è più un nome del gioco".
- Nella rinomina Excel, **la concordanza va scritta a mano**: "un tuo Alieno" → "una tua Pedina"
  (femminile). 89 celle riviste una per una.
- Escluse di proposito dalla rinomina: la colonna `Nome` (fatta a parte) e `Prompt Immagine`
  (resta in inglese, serve al generatore di immagini).

### B.4 Interfaccia: niente emoji nei menu

> Togliere **tutte** le emoji/icone dai menu e dalla schermata principale.

Ma **lasciare** l'iconografia *di gioco sul campo* (❤⚔🛡, 🎲, 🌍, 🚫, ✓/✕ della catena, ←/→ dello
zoom, ✨/🪤 dei badge tipo carta): la richiesta riguardava i menu, non il tavolo.

### B.5 Font del brand

> "Le scritte con lo stesso font del logo WORLDLOOM".

Chiarito che un font non si "estrae" da un'immagine. L'utente ha scaricato **Cinzel** e
**Cormorant Garamond** (Google Fonts, licenza OFL) e li ha messi in `src/assets/fonts/`.
Vincolo aggiunto: **le carte restano col font di prima** (reset esplicito su `.carta`).

### B.6 Identità di una carta — decisione dell'utente

> L'`id` di una carta = **Nome + Variante Illustrazione + Rarità + Finitura**.

Con i corollari, che sono diventati regole anti-regressione:
- l'**immagine** dipende da **nome + variante**, mai da rarità o finitura (due stampe della stessa
  carta condividono l'illustrazione: è il senso stesso del foil);
- i mazzi salvati **vecchi** (che hanno solo il nome) devono continuare a risolversi per nome;
- `Finitura` si passa al gioco **letterale**, non come booleano: una classe CSS per valore.

### B.7 Effetto foil olografico

Ricetta CSS (color-dodge a bande + tilt 3D) confermata dall'utente nella demo
`Mazzi/00 Layout generico/worldloom-cards/foil-demo.html`. **Non ancora integrata** in nessuna
parte del codice vero: manca il mini-design (foil in campo o solo nello zoom? performance su
mobile?).

---

## C. La roadmap, punto per punto

Fonte completa: `Engine/Roadmap_Sessione_2026-08-27.md`. Qui c'è **cosa è stato chiesto**; il
*come è stato risolto* sta nel doc 06.

### Priorità 0 — possibili regressioni del motore/rendering

| # | Richiesta dell'utente | Stato |
|---|---|---|
| **P0.1** | "Piccolo Goblin rimasto in retrovia dopo un tributo che sacrificava una creatura di prima linea" | ✅ **non era un bug** — il motore segue il regolamento alla lettera |
| **P0.2** | "Zona avversario al contrario": prima linea/retrovia e riga Magia-Trappola non invertite per la prospettiva speculare | ✅ era un bug vero |
| **P0.3·4·5** | "I numeri di danno non compaiono" / "il pop-up Difendi resta appeso" / "il combattimento non funziona" — tre facce dello stesso problema | ✅ |
| **P0.6** | **Niente scroll nel campo**: solo scaling uniforme; il tavolo deve riempire lo spazio | ✅ |
| **P0.7** | "Intervento Divino attivata dall'IA direttamente dalla mano" (è una Trappola: deve restare coperta un turno) | 🟡 **serve un caso preciso**: nel codice la regola sembra intatta |
| **P0.8** | Zona avversario: le etichette restano dritte mentre le carte sono capovolte; allineamento della colonna pile | ✅ (la parte allineamento non era un bug) |
| **P0.9** | Rail comandi avversario non specchiato; retrovia troppo vicina alle Magie; poi: **"si gira TUTTO"** — anche i contatori tenuti dritti finora | ✅ (rovescia un precedente: prima i numeri restavano dritti per leggibilità) |
| **P0.10** | "Partita ripresa dal menu → il turno saltava da solo" | ✅ |

### Priorità 1 — scelte automatiche delle carte

| # | Richiesta | Stato |
|---|---|---|
| **P1.1** | **Resuscita Pedina** rievoca in automatico il primo trovato nel cimitero: deve far scegliere il giocatore | 🔴 |
| **P1.2** | **Corruttore dei Deboli** sceglie da solo il bersaglio Livello 1 nemico; nessuna animazione/notifica vista | 🔴 |
| **P1.3** | **Regola generale confermata**: un effetto può scegliere automaticamente **solo** se il testo della carta nomina esplicitamente il bersaglio (es. "pesca la prima carta della pila X"); altrimenti la scelta è **sempre** del giocatore | 🔴 audit fatto: `revive`, `corrutt`, `bianca`, `modell` violano la regola. Piano a 4 tappe concordato |
| **P1.4** | L'animazione di risposta della catena "non colpisce mai la carta giusta, si muove a caso fuori dal campo" | 🟡 non riprodotta. **L'utente non riesce ad aprire la console del browser** → diagnostica resa *visibile* (banner rosso a schermo + riga nel Registro Mosse) |

### Priorità 2 — sequenza e tempistica delle animazioni

| # | Richiesta | Stato |
|---|---|---|
| **P2.1** | Il banner **"Vespro"** deve aspettare che il calcolo danni sia finito, e **restare a schermo più a lungo** (segna il cambio turno) | ✅ 🔒 |
| **P2.2** | Il banner **"Vaticinio"** deve aspettare che la carta pescata sia arrivata | ✅ 🔒 |
| **P2.3** | Timer di turno scaduto: aspettare che l'ultima animazione finisca, **poi** Vespro, **poi** cambio turno — "non tagliare di netto" | ✅ 🔒 |
| **P2.4** | Le stesse pause/banner **anche quando tocca all'avversario** ("oggi sembra visto solo dal lato proprio") | ✅ 🔒 |
| **P2.5** | *(segnalato da Claude, non chiesto)* avanzare di fase con la pillola mentre `imprevistoEsito` è ancora in coda visiva perde l'evento | 🔴 bug pre-esistente, **segnalato e NON toccato** per la regola M1 |

### Priorità 3 — rifiniture visive

| # | Richiesta | Stato |
|---|---|---|
| **P3.1** | Anello Vita: gradiente continuo verde→rosso lungo l'arco (verde pieno al 100%, rosso pieno a 0) | ✅ |
| **P3.2** | **Cimitero degli Imprevisti**: la carta attivata deve zoomare e finire in una pila visibile dedicata, con la carta in arrivo sopra quella scartata, "come se girassero nello stesso mazzetto" | 🟡 tappa A fatta, **tappa B (animazione) da fare**. Design confermato: nessuno slot nuovo, il cimitero sta *nello stesso slot* di avanzamento, come layer sotto |
| **P3.3** | Carta creatura **a tutto frame** + etichetta statistiche separata a fianco dello slot | ✅ (da confermare a vista) |
| **P3.4** | Bordo degli slot vuoti più visibile, "in tono giallognolo" | ✅ |
| **P3.5** | Animazione di evocazione dell'avversario: la carta la vuole **già ruotata per tutto il volo**, non che scatti a 180° all'atterraggio | ✅ |

### Priorità 4 — redesign di meccaniche (da discutere prima di scrivere codice)

| # | Richiesta | Stato |
|---|---|---|
| **P4.1** | **Eco del Gelo** cambia effetto: da "ripete l'ultima Magia/Trappola che HO attivato questo turno, risolta subito e fuori dalla catena" → diventa **"copia"**, e deve attivarsi come vera risposta **dentro la catena**, risolvendosi subito dopo quella copiata. Ambito invariato: **solo le mie** carte, mai quelle dell'avversario | 🔴 scope confermato, da progettare a parole |

### Feedback dal vivo del 2026-08-28 (serie F)

| # | Richiesta | Stato |
|---|---|---|
| **F.1** | Centrare i numeri sopra gli slot Imprevisti/Worldloom/Cimitero. + **la carta Imprevisto coperta viene tagliata dai bordi ruotando** ("deve stare sopra come se stessi girando fisicamente la carta") e **il simbolo non è centrato** | 🟡 carta integra ✅ (2 iterazioni), **ma il simbolo si è ri-scentrato**: causa trovata (serve un retro carta *simmetrico*, l'attuale è un poster asimmetrico). F.1a (badge numerici) non iniziato |
| **F.2** | Prima mano di chi inizia per secondo (6 carte): "oggi pesca 5 veloci + 1 lenta tutte insieme, non capisco se devo cliccare Rifornimento" → renderla una **fase percepibile**, una pescata alla volta | ✅ 🔒 chiusa dentro la Fase 3 dell'idea 59 |
| **F.3** | **Magia Terreno: zoom PRIMA di posizionare** (oggi si posiziona e poi compare lo zoom). Deve essere zoom → conferma → posiziona | 🔴 |
| **F.4** | "Evocazione bonus non disponibile al turno 6" | 🟡 **non riprodotto**: il meccanismo funziona. Sospetto messaggio fuorviante → messo un messaggio diagnostico specifico |
| **F.5** | Etichetta statistiche: **centrare icone e punti Attacco** e **aumentare l'altezza** della fascia | 🔴 |
| **F.6** | "Sequenza d'attacco sbagliata: suscita male, i segni di danno non funzionano, **una creatura che sarebbe dovuta morire non è morta**" | 🟡 chiusa **strutturalmente** dalle Fasi 1 e 4 dell'idea 59; **resta da riverificare dal vivo col caso originale** |

### Richieste emerse durante le sessioni (serie X)

| # | Richiesta | Stato |
|---|---|---|
| **X.1** | Persistenza dei mazzi personalizzati su disco, via **esporta/importa file `.json`** | ✅ |
| **X.2** | Voce "Torna alla schermata principale" nel menu Opzioni | ✅ |
| **X.3** | Editor mazzi: (a) il tasto **Elimina non fa niente**; (b) miniatura carta prima del nome; (c) **un solo menu per lato** nella schermata iniziale; (d) "scegli icona mazzo" | ✅ |
| **X.4** | 5 rifiniture UI: (1) l'icona mazzo si applica **subito al clic**, senza aspettare Salva; (2) icone di default per le due collezioni; (3) Alieno→Pedina nell'UI; (4) "Torna alla schermata principale" **anche dall'Editor**; (5) **togliere tutte le emoji** dai menu | ✅ + follow-up: il tasto "Ricomincia" non funzionava |
| **X.5** | Fix logo (sbordava dal riquadro nel lancio moneta) + **font del brand** nell'interfaccia | ✅ |
| **X.6** | "Sostituisci tutte le volte che leggi la parola alieno o creatura con **pedina**" | 🟡→✅ testo app fatto il 28-08; dati e token fatti il 29-08 (T.1) |

### Sessione "reparto finiture" del 2026-08-29 (serie T)

Ordine deciso dall'utente: **C (identità) → B (effetti) → A (foil)**.

| # | Richiesta / scoperta | Stato |
|---|---|---|
| **T.1** | Rinomina completa Alieno→Pedina, Kepler→Marbion (89 celle Excel, 12 punti del motore, 3 nomi di carta, 14 file immagine, entrambi i regolamenti) | ✅ |
| **T.2** | *(scoperto)* 15 Pedine di Marbion **scartate in silenzio** dal generatore | ✅ |
| **T.3** | Identità carta = Nome + Variante + Rarità + Finitura | ✅ |
| **T.4** | *(scoperto dal controllo d'unicità)* 5 righe doppie identiche negli Excel | ✅ rimosse |
| **T.5** | *(scoperto)* mazzo di default **illegale**: la partita rapida usava tutta la collezione (125 e 155 copie) contro il massimo di 60 | ✅ |
| **T.6** | Magie/Trappole/Imprevisti **senza illustrazione** sfondavano la mano: devono usare lo stesso guscio 5:7 delle Pedine | ✅ misurate 117×157 tutte |
| **T.7** | **Foil**: dati pronti (colonna `Finitura`, 8 carte Rainbow), manca la resa CSS nel gioco | 🟡 |
| **T.8** | **62 codici effetto non implementati** (30 Magie, 14 Pedine, 12 Trappole, 6 Imprevisti): le carte nuove 32-61 entrano in mano e non fanno nulla | 🔴 **il lavoro grosso aperto** |
| **T.9** | `componi_carte.py` è codice morto dall'11 agosto ma i documenti lo indicano ancora come pipeline viva | 🔴 documenti da correggere |
| **T.10** | Le Complete Card nel gioco sono ferme al 19 agosto; la SPEC è alla 1.6. **Rigenerare è bloccato a monte** (`cards-real.json` ha tutte le carte su `flat_neutro.png`, rarità nulle, `tipoCarta: "Pedina"` che `card.html` non conosce) | 🔴 |
| **T.11** | **Nebbia di Marbion** ha la Complete Card ma è nera (renderizzata senza illustrazione) | 🔴 dipende da T.10 |

### Sessione "audit dati carte" del 2026-08-29 sera (serie V)

Consegna: *verificare un'analisi esterna dei quattro Excel e costruire un validatore*.
⚠️ **L'analisi esterna era basata su uno stato precedente dei file: metà dei rilievi era già
chiusa.** Ogni punto è stato ricontrollato sui file reali prima di toccare qualcosa — è un
precedente utile: le analisi ricevute da fuori si verificano, non si applicano.

| # | Cosa | Stato |
|---|---|---|
| **V.1** | `tools/validate_cards.py`: 9 controlli sui quattro Excel, vocabolari chiusi, **range statistiche letti dal cap. 8 del regolamento a ogni esecuzione** (mai scritti nel codice) | ✅ |
| **V.2** | **Gate al build**: `genera_cards_json.py` non rigenera `cards.json` se ci sono errori. Scappatoia dichiarata: `--salta-validazione` | ✅ |
| **V.3** | Foglio "Come compilare": mancava il Ruolo `supporto`, usato da 6 carte | ✅ |
| **V.4** | Foglio "Come compilare": "solo Il Re Antico ha 3 attacchi" era falso (anche Signore del Clan) | ✅ |
| **V.5** | Vocabolario `Tipo Effetto`: 34 valori distinti, **il motore non legge mai quella colonna** → riordinarla è a rischio zero. 6 valori restano ambigui | 🔴 **serve ok utente** |
| **V.6** | Keyword orfana **"Volante"** (Il Rifiuto della Terra): non esiste nel regolamento | 🔴 serve scelta |
| **V.7** | **Tre** carte con testo identico parola per parola (Cristallo Riflesso · Spezza Volontà · Copiare È Vantaggioso) | 🔴 serve scelta |
| **V.8** | **37 statistiche fuori dai range del cap. 8**. Contraddizione da segnalare: il foglio "Leggimi" dei file proposte afferma che sono tutte verificate | 🔴 serve decisione |
| **V.9** | **Due renderer con budget di testo diversi**, e i documenti si contraddicono su quale sia vivo (collegato a T.9) | 🔴 |
| **V.10** | Colonna `Sottotipo` **ignorata dalla pipeline**: Magie Continue e Rapide arrivano nel gioco come normali | 🔴 segnalato, non toccato |
| **V.11** | Campi di stampa vuoti su tutte e 157 le righe (`Pianeta`, `Autore`, `Numero`, `Anno`, `ID Carta`) | 🟡 warning per scelta esplicita |
| **V.12** | **Scala di rarità vs limite copie**: la SPEC grafica e i cap. 3/17 del regolamento dicono due cose diverse. Va scelta una e riscritto l'altro documento | 🔴 serve decisione |
| **V.13** | **Promozione delle proposte**: 111 righe con effetti non implementati. Decisione da prendere **prima** di produrre le illustrazioni | 🔴 serve decisione |

---

## D. L'idea 59 — le decisioni prese a parole prima di scrivere codice

Esempio-modello di come si lavora una feature grossa qui: progetto scritto (`Idea59_Coda_Step.md`),
domande poste, risposte dell'utente congelate, **poi** codice.

**Obiettivo scelto: Livello B** — tutto passa dalla fila (combattimento + catena + pesca +
evocazione + turno IA + banner).

| Domanda | Risposta dell'utente |
|---|---|
| **Q1 — la morte** | ✅ passo `muta`, **rimozione differita**: la creatura resta nello stato finché non è il suo momento. Elimina alla radice il "BUG NOTO priorità zero" |
| **Q2 — turno IA** | ✅ **sequenziato, uno scontro alla volta**. Il turno IA dura di più in tempo reale: **accettato**, è l'unico modo di chiudere F.6/P0.3-5. Nessuno scontro accorpato |
| **Q3 — ordine di migrazione** | ✅ quello naturale: combattimento → catena → voli → turno IA → banner (i banner per ultimi perché dipendono da tutto) |
| **Q4 — `tempi.js`** | ✅ sorgente unica **anche per il CSS**, via custom property. Accettato il costo di toccare `index.css` in ~15 punti |
| **Q5 — pop-up** | ✅ **riscrittura piena** autorizzata di `PromptCombattimento`, `CatenaStriscia`, `NotificaEffetto` |
| **Q6 — 1v1 locale** | ✅ fila unica per-partita, `chiDecideOra` per sapere a chi mostrare il pop-up; da verificare in Fase 1 |

**Costo di ritmo dichiarato e accettato:** il mio turno guadagna ~2,6 s (il Vespro, che prima non
esisteva) e il turno IA ~8,8 s (5 cartelli dove non ce n'era nessuno) — è il prezzo di P2.4. La
manopola unica per ammorbidirlo è `TEMPI.banner.fase`.

**Cosa NON cambia** (dichiarato): la matematica del combattimento, la catena (priorità stile Magic,
LIFO), gli effetti delle carte, chi decide cosa, e il fatto che lo stato di gioco vero resti
risolto subito dietro le quinte — la fila governa **solo quando lo vedi**. Unica eccezione
deliberata: la rimozione della creatura morta.

---

## E. Backlog — i lavori a sé

| Lavoro | Peso | Note |
|---|---|---|
| **I 62 effetti mancanti** (carte 32-61) | grosso | piano a blocchi in `Engine/Effetti_Mancanti_Piano.md`. **È il prossimo lavoro deciso** |
| **Carte nuove 32-61 (dati)** | lungo, una alla volta | 31/~61 trascritte negli Excel. Prossima: Carta 32 · Distruggi Terreno |
| **Foil olografico nel gioco** | ~1 sessione | ricetta CSS confermata, non integrata. Nessuna dipendenza dall'idea 59 |
| **Sito worldloomtcg.com** | 2ª stesura fatta | 10 pagine statiche, non pubblicato. Mancano: schermata vera del gioco, colonne Autore/modello IA, stampe Rainbow illustrate, tavole manga, modulo lista collegato, dominio |
| **Menu principale + restyling** | fase 4 della roadmap infrastruttura | non iniziato |
| **PWA / APK** | fase 5 | non iniziato |

---

## F. Decisioni esplicite di *non fare*

Vale la pena conoscerle, per non riproporle:

- **F.1 — il retro della carta non si cambia.** Va solo **blindato com'è ora** con un test.
  Parcheggiato in attesa di definire il metodo di blindatura. *(Nota: il fix del simbolo storto
  richiederebbe comunque un retro simmetrico — è una tensione aperta fra le due cose.)*
- **Gli identificatori di codice non si rinominano** con la rinomina Pedina: refactor interno non
  richiesto.
- **`tipoCarta: "alieno"` resta accettato in lettura** per sempre: è dentro le partite e i mazzi
  già salvati dagli utenti.
- **L'id del mondo resta `kepler-452b`** anche se il mondo si chiama Marbion.
- **Niente slot nuovo per il cimitero Imprevisti**: sta nello stesso slot di avanzamento.
