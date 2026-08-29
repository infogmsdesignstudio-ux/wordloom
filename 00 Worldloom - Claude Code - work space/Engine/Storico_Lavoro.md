# Worldloom — Storico del lavoro

> Log cronologico di tutto il lavoro svolto, spostato da CLAUDE.md il 2026-08-28 per alleggerire
> il contesto caricato ad ogni sessione. **Consultare su richiesta**, non caricato in automatico.
> Le regole di processo e i gotcha vivono in `CLAUDE.md`; lo stato corrente in `WORLDLOOM.md` e
> `Engine/Roadmap_Sessione_2026-08-27.md`.

---

LAVORO GIÀ COMPLETATO (task 1-52, 54-58 — tutto fatto e testato)
Riassunto per macro-aree, tutto verificato con simulazioni headless (centinaia di partite, zero crash) e nel browser:
- Motore: evocazione per tributo (ora richiede conferma esplicita, prima si auto-completava e "Annulla" non tornava indietro), regole di posizionamento/movimento (prima linea mai vuota, tributi da una sola fila), bilanciamento combattimento (Spada/Scudo garantiscono almeno metà Attacco quando vince l'attaccante), Potenziamenti che restano nella zona finché il bersaglio non muore, testo del "Diritto di ripetizione" corretto (era invertito), due mazzi diversi per io/avversario.
- UI/grafica: schermata iniziale con logo grande + scelta modalità, carte a piena illustrazione non ritagliate, campo riorganizzato in 2 righe per zona (più basso senza rimpicciolire nulla), cassetto per Registro/Dadi, numero rosso fluttuante sui PV, Imprevisti coperti finché non si attivano, Magie piazzabili coperte sul campo, campo dell'avversario davvero speculare (Worldloom a sinistra per lui, a destra per te) con carte/mano capovolte 180°, overflow orizzontale su telefono risolto, animazioni di pesca/piazzamento carte.
- File: GIOCA.html passato da 73MB a ~18MB convertendo le Complete Card da PNG a JPEG.
- Bug: il turno 1 non salta più dritto alla Fase 3, si ferma in Fase 1 come ogni altro turno.
- Task 46: Fase 3 rinominata "Preparati allo scontro" (App.jsx, array FASI) — regole invariate, corrispondevano già al nome.
- Task 47: rimosso il pop-up "Calcola i danni". Il danno si calcola e applica subito dopo il tiro, con numero fluttuante sulla carta: rosso = danno, verde "0" = schivata, arancione "0" = pareggio. Nuova regola (confermata dall'utente): pareggio esatto su Spada (Attacco==Attacco) = "pareggio rosso", entrambe le creature distrutte; pareggio esatto su Scudo (Attacco==Parata) = nessun danno a nessuno, come prima. Vedi combattimento.js (risolviSimbolo/preferenzaDifensore), gameReducer.js (risolviDannoCombattimento), regolamento cap. 11.
- Task 57: animazione di lancio dado. Nuovo componente LancioDado.jsx, montato su Campo.jsx, che mostra un dado (ottagono per Archetipo colorato per archetipo, esagono viola per Imprevisti) che cicla facce casuali per ~700ms e si ferma sul risultato vero già deciso dal reducer, poi sparisce da solo dopo ~2.3s totali — pura messa in scena lato UI, nessuna pausa nel reducer (coerente con l'approccio del task 47). Stato: s.lancioDado = { id, tipo, archetipo, faccia }, popolato in gameReducer.js a ogni tiro "visibile" (decidiDifesa, decidiRipetizione se si ritira, reroll da trappola, Mago Sorprendente, dado Imprevisti in completaRifornimento) tramite l'helper registraLancioDado. Semplificazione accettata: se più tiri avvengono nella stessa dispatch sincrona (es. IA che usa il diritto di ripetizione nello stesso turno del tiro iniziale), in UI si vede animato solo l'ultimo — è quello che conta per l'esito. Da rivedere eventualmente insieme al task 49 se si introduce una vera coda di animazioni step-by-step.
- Task 48: animazione di attacco. La carta attaccante balza avanti (translateY -38px + scale 1.12) e torna subito indietro (0.55s) quando il bersaglio viene scelto (scegliBersaglio in gameReducer.js, appena comb.difensoreId è impostato) tramite l'helper registraAnimazioneAttacco → s.animazioneAttacco = { id, attaccanteId, difensoreId, proprietario }. In Campo.jsx la carta attaccante riceve una key dinamica basata sull'id (forza il remount e riavvia l'animazione CSS) e una classe carta-attacca-io/-avversario. Per le carte avversarie (sempre ruotate 180° via .carta-capovolta) la keyframe include rotate(180deg) in ogni fotogramma, altrimenti il rotate statico verrebbe sovrascritto dall'animazione — verificato che il verso risultante è comunque "verso il basso" (verso il tuo campo) tramite composizione delle matrici di trasformazione. Limite noto (stessa famiglia del task 57): quando attacchi tu un bersaglio dell'IA, l'intero scontro si risolve in un'unica dispatch sincrona — se il tuo attaccante muore nello stesso scontro (contraccolpo o pareggio mortale), la sua carta sparisce dal campo prima che il balzo possa essere renderizzato. Nessun crash, solo l'animazione che in quel caso specifico non si vede.
- Task 49: il turno dell'IA ora si vede svolgere invece di risolversi invisibile in un'unica dispatch. Nuovo stato s.iaInAttesa = "evoca" | "attacca" | null: completaRifornimento (gameReducer.js) si ferma dopo pesca+Imprevisti invece di incatenare subito evocazione+attacco; la nuova funzione avanzaIA fa avanzare di un passo alla volta (prima "evoca" → eseguiFaseEvocaIA, poi "attacca" → prossimaAzioneAttaccoIA), richiamata dalla dispatch "avanza-ia". In App.jsx un useEffect in cima a Partita (va chiamato PRIMA del return anticipato di SchermataIniziale, altrimenti l'ordine degli hook cambia tra "nessuna partita" e "partita in corso" — attenzione se si tocca questo file) manda "avanza-ia" da solo dopo 900ms quando iaInAttesa è impostato, a meno che non ci sia un prompt che aspetta te (trappola sull'evocazione, scelta di chi avanza in prima linea, o un combattimento già in corso) — in quel caso si ferma da sola e riparte quando risolvi il prompt. Il bottone azione principale mostra anche "L'avversario evoca…"/"L'avversario sta per attaccare…" invece del generico "Turno avversario…". Gli attacchi successivi al primo restano scanditi dalle tue decisioni (Difendi/Trappola/Ripetizione), già naturalmente in pausa una alla volta — non serviva un altro passo esplicito lì. Testato con 400 partite headless, zero crash, zero stalli, e dal vivo (pacing confermato: "L'avversario evoca…" ~750ms → "L'avversario sta per attaccare…" ~900ms → prompt Difendi che aspetta correttamente senza auto-risolversi). Durante questo lavoro sono emersi e sono stati sistemati due bug preesistenti (non causati da questo task, ma resi più visibili dai test più a fondo che il nuovo step-by-step ha permesso di fare): (1) prossimaAzioneAttaccoIA restava bloccata per sempre se l'attaccante non trovava bersagli validi (prima linea nemica vuota + retrovia protetta) — ora lo segna esaurito e passa al prossimo; (2) proseguiSeIA continuava la cascata d'attacco dell'IA anche con una scelta "chi avanza in prima linea" ancora in sospeso per te, lasciando lo stato incoerente — ora aspetta che tu risolva prima di continuare. Limite noto residuo: se il tuo campo è completamente vuoto per più turni di fila, gli attacchi diretti allo Stratega si susseguono senza pausa all'interno della stessa dispatch "avanza-ia" (stessa famiglia dei limiti già noti dei task 48/57) — capita solo in questo scenario degenere, nessun crash né blocco, solo un ordine di log un po' bizzarro in quel caso specifico.

- Task 50: animazione di pesca potenziata. La carta che entra in mano ora "sale" con un movimento molto più marcato (translateY 56px, scale da 0.45 a 1, 0.5s, invece del vecchio piccolo scivolamento) e il Worldloom pulsa (nuovo elemento .campo-pila-pulsa, anello dorato che si espande e sfuma) nello stesso istante in cui la carta parte, per legare visivamente pila e mano — funziona già per entrambi i lati perché l'animazione della carta era già agganciata alla chiave React _uid stabile (Mano.jsx/ManoAvversaria), quindi bastava potenziare la keyframe esistente; il pulsare della pila è nuovo, stato s.eventoPesca = { id, chiave } popolato in gameReducer.js tramite l'helper registraEventoPesca ai due punti dove si pesca durante il Rifornimento (iniziaTurno per il turno 1, eseguiRifornimento per i turni successivi — le pesche "bonus" da effetti Imprevisti/carte in imprevisti.js/effettiCarta.js non pulsano la pila, solo la carta anima, scelta deliberata per non allargare lo stato oltre il flusso principale di gioco). Corretto anche un bug di sovrapposizione già presente prima di questo task: le carte dell'avversario sono sempre ruotate 180° (.carta-capovolta) e l'animazione di pesca sovrascriveva quel rotate durante il mezzo secondo di animazione, con uno "scatto" visivo alla fine — ora .carta-capovolta.carta-scivola-dentro usa una keyframe dedicata (carta-scivola-dentro-capovolta) con rotate(180deg) incluso in ogni fotogramma e il segno di translateY invertito, così il verso percepito ("sale da sotto") resta identico per entrambi i lati nonostante la rotazione — verificato anche numericamente ispezionando la matrice di trasformazione a metà animazione nel browser. Testato con 60 partite headless (zero crash) + dal vivo (pila e carte confermate per entrambi i lati).

- Task 51: la carta Imprevisti in corso ruota fisicamente di 90° per movimento accumulato invece della vecchia freccina "↑" separata. In Campo.jsx → PilaImprevisti, lo sfondo coperto (backgroundImage retroWorldloom) è ora un livello a parte (.imprevisto-carta-ruotata, position:absolute inset:0 sul .campo-slot che già aveva position:relative) con `transform: rotate(movimenti*90deg)` e una transition di 0.4s per vederla girare; il contatore "N/4" resta un elemento fratello separato, quindi non ruota e rimane sempre leggibile. Rimossi .imprevisto-in-corso e .imprevisto-rotazione (non più referenziati da nessuna parte). Verificato dal vivo: dopo 1 movimento la matrice di trasformazione è esattamente rotate(90deg) (matrix(0,1,-1,0,0,0)), badge "1/4" separato e dritto. Nota: questo componente non era mai stato dentro la rotazione 180° di zona (è nell'area campo-condiviso, non in campo-zona-specchiata), quindi qui non c'era conflitto di transform da gestire — vedi però il nuovo task 58 sotto per lo sfondo del mazzetto Imprevisti lato avversario, che è un problema diverso (capovolgimento 180° mancante, non collegato a questa rotazione a 90°).

- Task 52: il Cimitero mostra l'illustrazione intera, non più ritagliata/zoomata. PilaCimitero (Campo.jsx) non usa più un backgroundImage con background-size:160% sullo .campo-slot, ma un vero <img className="campo-slot-cimitero-img"> assoluto (position:absolute inset:0) con object-fit:contain, stesso trattamento delle creature in prima linea (.carta-mini-img). Il badge del conteggio, essendo l'immagine ora un elemento invece di uno sfondo, ha bisogno di uno stack esplicito per restare sopra (.campo-slot-cimitero .campo-pila-conteggio { position: relative; z-index: 1; }) — senza sarebbe finito coperto dall'immagine. Verificato dal vivo: entrambi i Cimiteri (mio e avversario) mostrano l'immagine a piena proporzione (750×1050 naturale → 92×133 nello slot, object-fit contain confermato via computed style) col badge visibile sopra.

- Task 53: (scartato — l'utente ha confermato che il layout attuale delle pile Imprevisti e della ruota degli archetipi va bene così, non spostare/ingrandire nulla. Numerazione storica, non riusare.)
- Task 54: frecce avanti/indietro nel pop-up di zoom del Cimitero, per scorrere tutta la cronologia degli scarti invece di vedere solo l'ultima carta. Lo stato zoom in Campo.jsx è ora { carta, mazzoId, lista?, indice? }: lista/indice sono valorizzati SOLO quando lo zoom parte da una pila con cronologia (PilaCimitero passa onZoom(ultima, cimitero) invece di onZoom(ultima)) — per mano/campo/Terreno onZoom(carta) resta a un argomento solo, lista è undefined e il popup si comporta come sempre, senza frecce. DettaglioCarta.jsx accetta i nuovi prop opzionali posizione/onPrecedente/onSuccessivo e mostra le frecce (con contatore "N / totale") solo se posizione è valorizzata; i bottoni si disabilitano da soli ai due estremi. navigaZoom(delta) in Campo.jsx clampa l'indice tra 0 e lista.length-1. Nota: la lista è uno snapshot preso al momento dell'apertura (via structuredClone di ogni dispatch, cimitero è un array nuovo a ogni azione) — se nel frattempo arrivano nuove carte al Cimitero mentre il popup è aperto non compaiono finché non lo si riapre; comportamento accettato, coerente con un popup che si aspetta resti aperto per pochi secondi. Verificato dal vivo con un Cimitero a 3 carte: apertura su 3/3 con freccia destra disabilitata, ← porta a 2/3 poi 1/3 con freccia sinistra che si disabilita correttamente, → torna indietro a 2/3 — nomi carta diversi confermati ad ogni passo.

- Task 58: sfondi delle carte coperte dell'avversario ora capovolti 180° come le sue carte vere — prima solo <Carta classiExtra="carta-capovolta"> ruotava, ma FilaMagieTrappole/PilaMazzo/PilaImprevisti disegnano il dorso via style backgroundImage direttamente sullo slot, che non era mai dentro nessuna rotazione ambientale (.campo-zona-specchiata esiste solo per riordinare le colonne, non ha alcuna regola CSS/transform). Sistemato in Campo.jsx: FilaMagieTrappole applica `transform: rotate(180deg)` inline direttamente sullo slot quando !mio (sicuro perché quello slot non ha figli lato avversario, l'iconcina ℹ compare solo per mio); PilaMazzo e PilaImprevisti (il mazzetto, non la carta "in corso" del task 51) hanno invece un nuovo layer separato .campo-pila-sfondo (position:absolute, dentro allo slot che ha già position:relative) che porta lui la rotazione con classe .campo-pila-sfondo-capovolta quando !mio, lasciando il conteggio (span fratello) dritto — serviva anche uno stack esplicito (.campo-pila .campo-pila-conteggio { position:relative; z-index:1 }) perché un elemento posizionato senza z-index si disegna comunque sopra un fratello statico. La carta Imprevisti "in corso" (già ruotata a 90°/movimento dal task 51) ora somma anche il capovolgimento base: `rotate((mio?0:180) + movimenti*90)`. Verificato dal vivo ispezionando le matrici di trasformazione: Worldloom avversario, mazzetto Imprevisti avversario e uno slot Trappola avversario tutti a matrix(-1,0,0,-1,0,0) = rotate(180deg); "io" a "none"; carta Imprevisti in corso dell'avversario con 1 movimento a matrix(0,-1,1,0,0,0) = rotate(270deg) = 180+90, come atteso.

- Task 55: pop-up "Difendi o lasci passare" e "Diritto di ripetizione" arricchiti. Nuovo componente ConfrontoCombattimento (PromptCombattimento.jsx) mostra attaccante vs difensore fianco a fianco (❤ Vita, 🛡 Parata effettiva, ⚔ Attacco effettivo — riusa attaccoTotale/parataTotale da combattimento.js e vitaAttuale da mazzo.js, gli stessi calcoli del reducer) in entrambi i pop-up. Nel pop-up "Diritto di ripetizione", il testo "È uscito Spada" ha ora anche l'icona del simbolo (⚔️🛡️❤️💨) colorata secondo l'Archetipo del difensore — SIMBOLO_ICONA e COLORE_ARCHETIPO sono stati resi export in LancioDado.jsx (prima locali) e importati qui invece di duplicarli, così l'icona è identica a quella del dado animato del task 57. Il pop-up "Difendi" non aveva un simbolo da mostrare (il tiro avviene dopo la decisione), quindi lì c'è solo il confronto statistiche, niente icona dado — coerente con l'ordine reale degli eventi. Verificato dal vivo: confronto stats corretto su entrambi i pop-up (es. "Draghetto Arcobaleno ❤9 🛡3 ⚔8 CONTRO Lupo Famelico ❤10 🛡2 ⚔16"), icona ⚔️ con colore rgb(224,138,114) = colore Assalitore confermato coerente con l'archetipo del difensore nel pop-up di ripetizione.

⚠️ REGOLA DI PROCESSO AGGIUNTIVA (2026-08-12): prima di scrivere qualunque codice, chiedere sempre
domande/spiegazioni per chiarire il concetto e la modifica esatta da fare — non presumere di aver capito
e partire a implementare. L'utente ha chiesto esplicitamente di progettare tutto a parole prima di toccare
codice, per la lista qui sotto in particolare.

🔴 BUG SEGNALATI DALL'UTENTE (2026-08-12, sessione 2 — con screenshot, priorità assoluta, NESSUN CODICE
SCRITTO ANCORA su questi, l'utente ha chiesto di progettare tutto a parole prima)
Prima tornata (senza screenshot, mai riprodotta nei miei test — potrebbe essere GIOCA.html non aggiornato,
o casi specifici non ancora individuati):
1. Carte che hanno perso le loro grafiche/sfondo non corretto (generico).
2. Carte Imprevisti che non si attivano (vedi punto 10 sotto: probabilmente si attivano ma senza notifica
   visibile abbastanza, non un bug funzionale — nei miei test il log mostra correttamente "IMPREVISTO ATTIVATO").
3. Spostamenti dalla prima linea bloccati quando dovrebbero essere validi.

Seconda tornata (con screenshot, molto più precisa — usare questa come riferimento primario):
1. Sfondo sbagliato sulle carte coperte di Magie/Trappole (mostrano un motivo a stelline invece del
   Worldloom) — viola la regola permanente "stesso sfondo per tutte le carte coperte".
2. Slot Magie/Trappole leggermente più grandi delle creature — viola la regola permanente "stessa
   dimensione per tutti gli slot".
3. Prima linea con slot vuoti mentre la retrovia ha ancora creature (screenshot con frecce colorate) —
   viola la regola "la prima linea non può restare vuota se hai alieni in retrovia" (avanzamento
   obbligatorio, cap. 4 del regolamento).
4. "Fontana di Marbion" non si risolve correttamente: dovrebbe andare subito al cimitero mantenendo
   l'effetto attivo fino a fine turno.
5. "Eco del Gelo" non si attiva dopo l'attivazione di "Potenziamento Estremo" (relazione trigger/contromossa
   tra le due carte non scatta).
6. Una Magia "Continua"/attiva legata a un bersaglio (es. "Spada Sacra di Ghiaccio") resta mostrata coperta
   nella zona Magie e Trappole invece che scoperta con illustrazione leggibile, una volta attiva.
7. Il Cimitero non mostrava le illustrazioni per un tratto di partita, poi ha ripreso a farlo — intermittente,
   causa non individuata.
8. Creature avversarie "possedute" temporaneamente/permanentemente da un effetto: quando muoiono devono
   tornare nel cimitero del proprietario ORIGINALE, non di chi le controllava al momento della morte.
9. Cimitero avversario mostrato "al contrario" (probabilmente manca la stessa rotazione 180° data alle
   altre carte/sfondi dell'avversario nel task 58 — il Cimitero mostra la faccia scoperta, quindi va
   capito se debba ruotare per coerenza visiva con tutto il resto della zona avversaria o no).
10. Attivazioni di Imprevisti/Trappole (es. "Rifiuto della Terra") senza notifica visibile abbastanza:
    l'utente non riesce a sapere con certezza se/quando sono scattate — vuole un pop-up esplicito con
    l'effetto, non solo una riga nel registro mosse.
11. Manca un contatore di turno visibile vicino a "Il tuo Stratega" / "Stratega avversario" (Turno: N,
    incrementa a ogni inizio turno) — richiesto per poter riferire in futuro un bug a un turno preciso.
12. [FATTO 2026-08-13] Nel pop-up di confronto statistiche (task 55): vuole sempre la propria carta a
    sinistra evidenziata di verde e quella avversaria a destra evidenziata di rosso (indipendentemente
    da chi è attaccante/difensore), con "CONTRO" centrato tra le due. ConfrontoCombattimento
    (PromptCombattimento.jsx) accetta ora un prop `attaccanteEIo` che dice solo quale dei due dati
    corrisponde alla mia creatura, e la ordina sempre mia-a-sinistra/avversaria-a-destra a prescindere
    dal ruolo nello scontro — passato `comb.proprietario === "io"` nel prompt di ripetizione, `false`
    fisso nel prompt "Difendi o lasci passare" (dove il difensore è sempre "io" per costruzione). Colori
    riusati da `.carta-stat-alterata-su/-giu` per coerenza. Verificato dal vivo iniettando un markup di
    prova con le classi CSS reali: "La Mia Creatura" verde a sinistra, "Creatura Avversaria" rossa a
    destra, "contro" al centro.

FEATURE GROSSA DA PROGETTARE INSIEME (non iniziare senza aver chiuso la discussione di design — l'utente
ha esplicitamente scelto "prima progettiamo tutto a parole" il 2026-08-12):
Uno "stack" di effetti a cascata in stile TCG vero, che assorbe/sostituisce il task 59 (coda di animazioni):
- Quando una carta si attiva, si ingrandisce e si illumina d'arancione (stessa messa in scena dello zoom
  icona ℹ), resta in attesa.
- Se l'avversario può rispondere con una contromossa, appare un pop-up alla DESTRA della carta attivata:
  "Vuoi usare una contromossa?" (sì/no). Se sì, sceglie la carta, che appare anch'essa ingrandita accanto
  alla prima (a destra), e il ciclo si ripete per eventuali contromosse alla contromossa.
- Il giocatore chiude la catena cliccando "Non attivare nient'altro".
- Le carte si risolvono in ordine LIFO (dall'ultima aggiunta alla prima): se una contromossa annulla
  l'effetto precedente ma viene a sua volta annullata da un'altra contromossa, l'effetto originale torna
  valido (esempio esplicito dell'utente).
- Colori durante la risoluzione: la carta che si attiva si illumina di giallo, il bersaglio di rosso.
- A risoluzione avvenuta, le carte esaurite vanno al cimitero in sequenza.
- Il turno dell'avversario deve svolgersi con sequenze molto più lente/scandite di adesso (oltre al
  pacing già introdotto nel task 49).
- Il pop-up di combattimento (Difendi/Diritto di ripetizione) non deve più sovrapporsi/nascondere
  l'animazione del dado e il numero di danno: l'utente vuole vedere PRIMA il dado animato con il suo
  risultato ingrandito, POI il pop-up (oggi a volte vede il numero di danno prima ancora del tiro,
  o il pop-up resta sopra e nasconde tutto).
- Redisegno della carta Imprevisti "in corso": deve ruotare fisicamente sopra il mazzetto e spostarsi
  nella posizione finale solo dopo essersi risolta, restando poi con l'illustrazione rivolta verso l'alto
  (scoperta) — vedi screenshot con le frecce colorate per il percorso esatto desiderato.
Questa è la stessa famiglia di limiti già annotati nei task 48/49/57 (animazioni che si accavallano nella
stessa dispatch sincrona).

DECISIONE PRESA CON L'UTENTE (2026-08-12, dopo discussione a parole, confermata esplicitamente):
Portata: TUTTO — combattimento, evocazione, Magie, Trappole, Imprevisti, effetti carta dei mostri (es.
"quando entra in campo pesca una carta") ed effetti di Ruolo (Aggressore/Difensore/Tank/Evasivo). Nessuna
riduzione di scopo: l'utente ha scelto esplicitamente "tutto insieme fin da subito" invece di partire solo
dal combattimento. Meccanismo esatto concordato (stile priorità di Magic: the Gathering):
- Quando una carta/effetto si attiva, invece di applicarsi subito diventa un "frame" in cima a una pila.
- Chi ha appena aggiunto un frame MANTIENE la priorità (può incatenare subito un'altra propria carta) —
  vale per ENTRAMBI i giocatori nei due versi: puoi incatenare le tue stesse carte, non solo rispondere
  all'avversario.
- Quando la passa ("no"/annulla), la priorità va all'altro giocatore.
- Quando ENTRAMBI passano di seguito senza aggiungere nulla, il frame in cima si risolve (si applica il
  suo effetto reale) e si toglie dalla pila — poi la priorità torna al proprietario del frame rimasto in
  cima (se c'è ancora una pila) o la catena finisce (pila vuota, si prosegue col gioco normale).
- Risoluzione LIFO: l'ultima carta aggiunta si risolve per prima. Se una contromossa annulla l'effetto
  sotto di lei ma viene a sua volta annullata da un'altra contromossa, l'effetto originale torna valido
  (verificato esplicitamente nel motore, vedi sotto).
- Carte disponibili come risposta: Trappole/Magie coperte già pronte in campo (come oggi), più le Magie di
  sottotipo "Rapida" anche dalla mano (nessuna regola nuova, riusa l'eleggibilità già esistente).
- Scenografia: la carta "in attesa di priorità" si ingrandisce e si illumina d'arancione (come lo zoom ℹ),
  col pop-up "Contromossa o catena?" alla sua destra. Durante la risoluzione vera: chi si attiva giallo,
  il bersaglio rosso. A effetto esaurito, cimitero.
- Ritmo: timer automatico, un po' più lento di oggi (non un clic manuale per ogni passo).

Prima di backup: salvate due copie di sicurezza prima di iniziare questo lavoro — copia giocabile in
"App - HTML - Test\Versioni gioco\Worldloom_Gioco_v2.0_pre-catena-effetti_2026-08-12.html", copia completa
del sorgente in "00 Worldloom - Claude Code - work space\Backup sorgente pre-catena-effetti 2026-08-12\".
Se qualcosa va storto durante questo lavoro esteso, si può ripartire da lì.

Piano di costruzione concordato (sezioni verificate una alla volta, anche se la portata finale è "tutto"):
1. [FATTO] Motore generico della catena, isolato, nessun aggancio al gioco — src/game/catena.js
   (nuovaCatena/aggiungiFrame/passa/rimuoviFrameInCima/catenaVuota, priorità stile Magic). Testato con
   25 asserzioni headless usa-e-getta: frame singolo si risolve dopo 2 "passa" consecutivi; contromossa
   in risposta si risolve LIFO prima dell'originale; aggiungiFrame rifiutato se non è il turno di
   priorità del chiamante; scenario "contromossa alla contromossa" (annullamento di un annullamento)
   verificato esplicitamente — l'effetto originale torna valido, esattamente come richiesto dall'utente.
   Tutti i 25 test passati. Il modulo è "puro": non sa nulla di carte/gameReducer, gestisce solo ordine e
   priorità; la logica di dominio (es. "annulla anche il frame sotto") la applica chi chiama, manipolando
   catena.frames dopo rimuoviFrameInCima.
2. [FATTO — solo finestra "attacco dichiarato", non ancora dopoTiro/attaccoDiretto] Agganciata la catena
   alla prima finestra di combattimento: quando l'attaccante sceglie il bersaglio (scegliBersaglio in
   gameReducer.js), se almeno uno dei due giocatori ha una Trappola eleggibile per "attaccoDichiarato"
   (cancel/ambush/stopatk/cristallo/spezzavolonta/copiare) si apre s.catena invece del vecchio prompt a
   scelta singola — l'attaccante riceve la priorità per primo (ha appena "attivato" l'attacco), poi passa
   all'altro; si risolve LIFO solo quando entrambi passano di seguito. Nuove funzioni:
   apriFinestraCatenaCombattimento/aggiungiTrappolaAllaCatena/passaCatenaCombattimento/
   decisioneCatenaCombattimentoIA/avanzaCatenaCombattimento in gameReducer.js, nuove dispatch
   "catena-aggiungi-trappola"/"catena-passa". La logica di dominio (cosa fa davvero ogni codice trappola)
   è stata estratta in applicaEffettoTrappola, condivisa col vecchio flusso a scelta singola
   (risolviTrappolaScelta, ancora usato invariato per dopoTiro/attaccoDiretto — non ancora agganciati alla
   catena, restano una sezione futura). UI: nuovo prompt minimo "Contromossa o catena?" in
   PromptCombattimento.jsx per stato.catena?.turnoDiPriorita === "io" (elenca solo le Trappole pronte
   eleggibili per il contesto corrente e non già in coda; bottone "Non aggiungere altro" per passare) — è
   uno stopgap funzionale, la scenografia vera (carta ingrandita arancione, pop-up laterale, giallo/rosso)
   è ancora da fare al passo 7. Il vecchio prompt "Trappola disponibile" ora ha una guardia `!stato.catena`
   per non comparire insieme al nuovo per lo stesso contesto.
   Verificato con simulazioni headless usa-e-getta (poi cancellate): scenario "io attacco, priorità
   all'attaccante"; scenario "contromossa alla contromossa" (io incateno la mia Trappola SOPRA quella già
   incatenata dall'avversario — Math.random mockato per forzare la sequenza — la mia si risolve per prima
   LIFO e annulla l'attacco, il frame dell'avversario sotto viene scartato senza mai risolversi, esattamente
   il comportamento richiesto dall'utente); scenario "nessuna trappola eleggibile" (la catena non si apre
   nemmeno, nessun prompt inutile, comportamento identico a prima della catena). Tutti passati. Verificato
   anche dal vivo nel browser (build pulita, nessun errore in console, partita giocabile fino in fondo).
   BUG PREESISTENTE TROVATO E CORRETTO (non causato da questo lavoro, confermato dall'utente e sistemato
   nella stessa sessione): la costante locale CONTESTI in PromptCombattimento.jsx elencava solo
   ["cancel","ambush","stopatk"] per "attaccoDichiarato", mentre magieTrappole.js (trappoleDisponibili, la
   fonte di verità usata dal reducer e anche dall'IA) ne elenca sei: mancavano "cristallo","spezzavolonta",
   "copiare". Risultato: un giocatore umano con una di queste tre Trappole pronta non la vedeva mai come
   opzione cliccabile (né nel vecchio prompt né nel nuovo, condividono la stessa costante), mentre l'IA
   poteva usarle normalmente (legge trappoleDisponibili direttamente). Corretto sincronizzando la lista a
   sei codici. Rebuild pulita, nessun errore in console dopo il fix.

   BUG INTRODOTTO DA QUESTO STESSO LAVORO, TROVATO DALL'UTENTE GIOCANDO DAL VIVO E CORRETTO: "l'IA si è
   distrutta una carta da sola" — causa: i sei codici eleggibili per "attaccoDichiarato"
   (cancel/ambush/stopatk/cristallo/spezzavolonta/copiare) sono TUTTI difensivi per testo di carta
   ("Annulla un attacco dichiarato CONTRO DI TE" / "...contro un tuo Alieno" — verificato leggendo il testo
   di tutti e sei in cards.json), quindi hanno senso solo in mano al DIFENSORE. La prima versione della
   Sezione 2 calcolava però anche eleggibiliAttaccante = trappoleDisponibili(attP, "attaccoDichiarato") e
   apriva la catena dando priorità all'attaccante per primo — quando l'IA attaccava e aveva per conto suo
   una "Imboscata Potente" (ambush) pronta sul proprio campo, l'euristica la aggiungeva come se fosse una
   propria carta valida da incatenare sul proprio attacco; risolvendola, applicaEffettoTrappola->ambush
   imposta danno=vitaMax sulla creatura ATTACCANTE, cioè quella dell'IA stessa. Questo rompeva l'invariante
   che il vecchio flusso a scelta singola rispettava correttamente da sempre (risolviTrappolaScelta operava
   SEMPRE solo su difP.magieTrappole, mai su attP). Corretto in tre punti di gameReducer.js: (1)
   scegliBersaglio ora calcola solo eleggibiliDifensore e apre la finestra con apriFinestraCatenaCombattimento(s,
   comb.difProprietario) invece di comb.proprietario; (2) aggiungiTrappolaAllaCatena rifiuta se
   chiave !== comb.difProprietario; (3) decisioneCatenaCombattimentoIA ritorna null (auto-passa) se
   comb.difProprietario !== "avversario" — necessario perché con la priorità bidirezionale la mano può
   comunque tornare all'attaccante dopo che il difensore ha incatenato e passato, quindi il controllo di
   ruolo va ripetuto ad ogni punto di decisione, non solo all'apertura. Sistemato anche il prompt "Contromossa
   o catena?" in PromptCombattimento.jsx: la lista di Trappole cliccabili resta vuota se comb.difProprietario
   !== "io" (evita di mostrare a "io" le proprie carte come opzione quando è lui l'attaccante e la priorità
   gli torna solo per lasciar risolvere la Trappola incatenata dal difensore). Verificato con test headless
   dedicati (poi cancellati): riprodotto esattamente lo scenario segnalato (IA attaccante con "ambush" pronta
   sul proprio campo — prima del fix la sua creatura si autodistruggeva, dopo il fix la catena non si apre
   nemmeno e la trappola resta intatta sul suo campo) + controllo simmetrico lato "io" + rieseguito lo
   scenario "contromossa alla contromossa" del passo precedente per confermare che il caso legittimo
   (difensore che incatena) continua a funzionare + sweep di 150 partite complete automatiche, zero crash.
   Rebuild pulita, nessun errore in console dopo il fix.
3. [FATTO — evocazione, e riprogettazione generica dell'eleggibilità che sostituisce l'approccio a
   silos dei passi 1-2] L'utente ha fermato il lavoro prima di agganciare l'evocazione per chiedere un
   cambio di rotta: invece di allargare ogni volta trappoleDisponibili(giocatore, contesto) — una
   tabella fissa "contesto -> elenco di codici", diversa per ogni punto del gioco agganciato — voleva
   un motore generico in cui una Magia possa rispondere a una Trappola (o un futuro effetto mostro a
   una Magia) senza bisogno di una voce dedicata per ogni nuovo contesto. Riprogettato così:
   - magieTrappole.js: trappoleDisponibili → carteEleggibiliPerRisposta(giocatore, chiave, evento).
     Ogni codice (cancel/ambush/.../rifiutoterra/ingannovinc) ha ora un proprio predicato in
     ELEGGIBILITA_RISPOSTA che controlla l'evento vero (es. { tipo: "attaccoDichiarato",
     difProprietario, attProprietario } o { tipo: "evocazione", evocatore, creaturaId }) invece di un
     contesto stringato — e il controllo "chi può giocare questa carta" (es. solo il difensore, solo
     chi NON ha appena evocato) è dentro il predicato stesso, non un guard separato lato chiamante:
     chiude strutturalmente la stessa classe del bug "IA si autodistrugge" del passo 2, per qualunque
     codice futuro, non solo per i sei di allora.
   - gameReducer.js: apriFinestraCatenaCombattimento/aggiungiTrappolaAllaCatena/
     passaCatenaCombattimento/decisioneCatenaCombattimentoIA/avanzaCatenaCombattimento rinominate e
     generalizzate (apriFinestraCatena/aggiungiTrappolaAllaCatena/passaCatena/decisioneCatenaIA/
     avanzaCatena): non leggono più s.combattimento/contestoTrappola, operano su s.catena.evento
     (impostato da chi apre la finestra). Nuovo risolviFrameCatena smista la risoluzione in base a
     evento.tipo: "evocazione" chiama risolviTrappolaEvocazioneNemica (già esistente in
     magieTrappole.js), tutto il resto riusa applicaEffettoTrappola invariato. Il vecchio flusso a
     scelta singola per l'evocazione (s.trappolaEvocazione, avviaFinestraTrappolaEvocazione,
     risolviSceltaTrappolaEvocazione, dispatch "attiva-trappola-evocazione") è stato rimosso per
     intero, sostituito da apriCatenaEvocazione (stesso schema di apriCatenaCombattimento) chiamato
     dai 5 punti dove un'evocazione può innescare Il Rifiuto della Terra/L'Inganno Vincente
     (evocazione normale/bonus di "io", stessi due casi per l'IA). dopoTiro/attaccoDiretto restano sul
     vecchio flusso a scelta singola (non ancora agganciati alla catena, sezione futura) ma ora
     chiamano anch'essi carteEleggibiliPerRisposta con un evento costruito al volo, non più
     trappoleDisponibili.
   - PromptCombattimento.jsx: il prompt "Contromossa o catena?" si è spostato prima del controllo
     `if (!comb) return null` (serve anche quando non c'è combattimento, es. evocazione) e legge
     stato.catena.evento invece di comb.contestoTrappola; la costante locale CONTESTI (quella già
     causa di un bug di disallineamento nel passo 2) è sparita, sostituita dalla stessa
     carteEleggibiliPerRisposta importata da magieTrappole.js — un'unica fonte di verità condivisa da
     reducer, IA e UI, impossibile da far disallineare di nuovo per costruzione. Il vecchio prompt
     "Trappola disponibile" (dopoTiro/attaccoDiretto) resta, aggiornato alla stessa funzione.
   - App.jsx: iaBloccataDaPrompt e puoAvanzareDiFase controllavano stato.trappolaEvocazione (campo
     ormai rimosso) — sostituito con stato.catena?.turnoDiPriorita === "io" / !stato.catena, che copre
     sia il combattimento sia l'evocazione (prima il combattimento era coperto solo implicitamente da
     !!stato.combattimento, restato invariato, l'aggiunta è additiva).
   Verificato con simulazioni headless usa-e-getta (poi cancellate): rieseguito lo scenario di
   regressione del passo 2 (un frame "cancel" si risolve dopo 2 passa consecutivi, combattimento
   terminato, trappola scartata, attacco consumato — identico a prima); rieseguito lo scenario del bug
   "IA si autodistrugge" (ambush pronta sul campo dell'attaccante IA: nessuna catena si apre, la sua
   creatura non subisce danno, la trappola resta intatta — bug non ripresentato); NUOVO — evocazione
   con "Il Rifiuto della Terra" pronto sul campo avversario: se l'IA decide di non attivarla la
   creatura evocata resta in campo; se la attiva, il frame si aggiunge, la priorità passa a "io" (che
   non ha nulla da aggiungere ma deve comunque passare per chiudere la finestra, stesso schema del
   combattimento), poi si risolve: entrambi i campi vengono distrutti, la trappola va al cimitero,
   notifica accodata; NUOVO — dimostrato che l'eleggibilità è davvero generica: una Trappola e una
   Magia piazzata con lo stesso codice/evento risultano eleggibili insieme nella stessa finestra
   (carteEleggibiliPerRisposta non guarda tipoCarta), la richiesta esplicita dell'utente. Sweep di 60
   partite complete automatiche (mazzi reali, evocazioni vere ad ogni turno) con
   `npm run build` pulita, zero crash.
4. [DA FARE] Agganciare a Magie/Trappole dirette (dopoTiro/attaccoDiretto), riusando lo stesso motore
   generico del passo 3 — non serve più una sezione a parte per l'infrastruttura, solo il punto di
   innesco e i predicati per reroll/mirror/divine (già esistono, vanno solo tolti dal vecchio flusso).
5. [DA FARE] Agganciare agli Imprevisti.
6. [DA FARE] Agganciare a effetti carta dei mostri ed effetti di Ruolo.
7. [DA FARE] Scenografia UI (carta ingrandita arancione, pop-up laterale, giallo/rosso in risoluzione).
8. [DA FARE] Ritmo/pacing più lento per il turno IA, integrato con la catena.

IDEE PER IL FUTURO (proposte non ancora confermate come task — l'utente ha chiesto di aggiungerle alla
lista dopo il completamento dei task 1-58, da confermare una alla volta prima di implementarle)
59. Coda di animazioni vera: oggi diverse animazioni (dado, balzo d'attacco, numero di danno, evocazione/attacco
    dell'IA) possono scattare contemporaneamente nella stessa dispatch sincrona invece di susseguirsi in ordine
    — l'utente chiede esplicitamente di vedere l'avversario pescare, poi evocare, poi scegliere il bersaglio,
    poi il dado e il risultato, tutto scandito uno alla volta senza sovrapposizioni. Richiede probabilmente
    un vero motore di coda/step lato UI (o reducer) invece delle singole pause ad-hoc già introdotte nei task
    48/49/50/57. FEATURE GROSSA: da progettare e spiegare a parole prima di toccare codice (vedi regola di
    processo sopra) — non partire a implementare senza conferma esplicita.
60. Audio (pesca, attacco, danno, vittoria/sconfitta) per dare peso alle animazioni.
61. Modalità "1 contro 1 sullo stesso dispositivo" (oggi disabilitata, "Presto disponibile" in schermata iniziale).
62. Deck builder — oggi i mazzi sono fissi (Frost Land / Kepler-452B).
63. Aggiornare il commento ormai superato in Dado.jsx ("il tiro vero arriva col combattimento" — i dadi sono
    collegati dal task 57).
64. Passata di accessibilità (contrasto colori Archetipi, leggibilità icone).

- Task B10 (2026-08-12): pop-up esplicito per ogni attivazione di Imprevisto o Trappola, al posto della
  sola riga nel registro/messaggio che spariva senza che l'utente avesse certezza se/quando fosse scattata.
  Nuovo stato s.notificaEffetto = { id, titolo, testo } | null in gameReducer.js, popolato dal nuovo helper
  registraNotificaEffetto in due punti: (1) applicaEffettoTrappola (condiviso da entrambi i flussi Trappole,
  quello a scelta singola per dopoTiro/attaccoDiretto e quello a catena per attaccoDichiarato — copre
  automaticamente qualunque codice trappola, non solo attaccoDichiarato); (2) risolviSceltaTrappolaEvocazione,
  per le Trappole sull'evocazione nemica (es. "Rifiuto della Terra", l'esempio esplicito dell'utente).
  imprevisti.js popola lo stesso campo direttamente in risolviImprevisto (riceveva già `stato` per il
  messaggio esistente). Nuovo componente NotificaEffetto.jsx: modale bloccante (stesse classi
  modale-sfondo/modale-box/modale-evoca già usate altrove) con titolo, testo dell'effetto e un solo bottone
  "Chiudi" che manda la dispatch "chiudi-notifica" (s.notificaEffetto = null). Montato in App.jsx sopra
  <PromptCombattimento />. Per evitare due modali sovrapposti, PromptCombattimento.jsx ora ritorna null in
  cima alla funzione se stato.notificaEffetto è valorizzato (aspetta che l'utente chiuda la notifica prima
  di mostrare qualunque altro prompt — difendi/ripetizione/catena/ecc.); il pacing automatico del turno IA
  (App.jsx, useEffect con "avanza-ia") ora include anche !!stato?.notificaEffetto tra le condizioni di
  iaBloccataDaPrompt, altrimenti il timer da 900ms avrebbe potuto far proseguire il turno avversario mentre
  la notifica era ancora visibile e non ancora chiusa dall'utente. Limite noto (stessa famiglia dei task
  48/49/57): se più attivazioni avvengono nella stessa dispatch sincrona, si vede solo l'ultima (l'id
  incrementale sovrascrive senza accodare) — semplificazione accettata, coerente con gli altri stati-evento
  dell'app. Verificato con simulazioni headless usa-e-getta (poi cancellate): notifica popolata correttamente
  con nome/testo della Trappola dopo una risoluzione via catena, "chiudi-notifica" la azzera, sweep di 100
  partite complete (con euristica "chiudi sempre appena appare") zero crash. Verificato anche dal vivo:
  build pulita, nessun errore in console al caricamento; non sono riuscito a catturare uno screenshot della
  notifica stessa durante una partita automatica dal vivo (il playthrough automatico terminava la partita
  troppo in fretta per fermarmi al momento giusto) — il componente riusa però esattamente le stesse classi
  CSS già verificate visivamente per gli altri pop-up di PromptCombattimento, quindi rischio visivo basso;
  da confermare a vista alla prossima sessione di gioco reale dell'utente.

- Task B1+B2 (2026-08-12): sistemati insieme (stesso file, index.css) i due bug "sfondo a stelline sulle
  Magie/Trappole coperte" e "slot Magie/Trappole leggermente più grandi delle creature".
  Causa B1: `.campo-slot-trappola` imposta `background: linear-gradient(...)` (shorthand) — questo azzera
  anche background-size/background-position ereditati dalla regola base `.campo-slot` (cover/center),
  riportandoli ad auto/0% 0%. Lo sfondo Worldloom vero (logo-worldloom.jpg, impostato inline per-istanza in
  Campo.jsx) veniva quindi mostrato alla sua dimensione naturale ancorato in alto a sinistra: in uno slot
  92×129 si vedeva solo il ritaglio dell'angolo in alto a sinistra dell'immagine, che è cielo stellato puro
  (il simbolo e la scritta "WORLDLOOM" sono al centro/in basso dell'immagine) — da cui "stelline invece del
  Worldloom". Fix: aggiunte `background-size: cover; background-position: center;` esplicite dentro
  `.campo-slot-trappola`, stessi valori della regola base, così si vede lo stesso ritaglio centrato di tutte
  le altre pile coperte (Worldloom/Imprevisti/Cimitero). Causa B2: nessuna regola `box-sizing: border-box`
  globale nel progetto (default browser: content-box) — `.campo-slot-trappola` (e anche `.campo-slot-terreno`)
  hanno `padding: 3px` che con content-box si SOMMA alla larghezza/altezza fissa di `.campo-slot`
  (--slot-w/--slot-h), rendendo quegli slot ~8px più grandi delle celle creatura (che hanno solo un bordo,
  nessun padding). Fix: aggiunto `box-sizing: border-box` alla regola base `.campo-slot` — corregge
  sistematicamente TUTTE le varianti con padding/bordo proprio (trappola, terreno, cimitero, pila), non solo
  quella segnalata, senza bisogno di toccare ciascuna singolarmente. Verificato: elemento di test iniettato
  dal vivo con le classi reali (campo-slot campo-slot-trappola) — computed style confermato background-size
  cover/background-position 50% 50%, dimensione identica (96.4×135.2px) a un .campo-slot creatura semplice;
  screenshot dal vivo del campo di gioco reale conferma il logo Worldloom centrato e leggibile sulle pile
  Worldloom/Imprevisti già esistenti (nessuna regressione lì). Rebuild pulita, nessun errore in console.

- Task B11 (2026-08-12): contatore di turno visibile vicino a "Il tuo Stratega" / "Stratega avversario".
  BarraPv (App.jsx) accetta ora un prop `turno` (passato come `stato.turno`, già esistente e incrementato
  in iniziaTurno in gameReducer.js — un unico contatore condiviso, non per giocatore, mostrato identico su
  entrambe le barre) e mostra un badge "Turno N" accanto al nome. Nuova classe CSS `.barra-pv-turno` in
  index.css. Verificato dal vivo: badge "Turno 1" leggibile su entrambe le barre a inizio partita,
  nessun errore in console, build pulita.

- Task B9 (2026-08-12): il Cimitero avversario ora ruota 180° come tutto il resto della sua zona (creature
  vere, mano, dorsi coperti — cap. task 58). Decisione presa senza fermarmi a chiedere (coerente con la
  richiesta di efficienza dell'utente su questo punto): anche se qui si vede la faccia SCOPERTA della carta
  (a differenza dei dorsi coperti), la coerenza visiva con tutto il resto della zona avversaria — che è
  sempre capovolta, comprese le sue creature vive che mostrano anch'esse la faccia scoperta — ha prevalso.
  PilaCimitero (Campo.jsx) accetta ora un prop `mio`; solo l'elemento `<img className="campo-slot-cimitero-img">`
  riceve la classe aggiuntiva `campo-slot-cimitero-img-capovolta` (`transform: rotate(180deg)` in index.css)
  quando `!mio` — badge del conteggio e iconcina ℹ sono elementi fratelli separati, non ruotano, restano
  dritti e leggibili (stesso pattern a livelli separati già usato per mazzetto/imprevisto-in-corso nel task
  58). Verificato dal vivo: computed style dell'elemento con la nuova classe = matrix(-1,0,0,-1,0,0) =
  rotate(180deg), variante "mio" = nessun transform. Nessun errore in console, build pulita.

- Task B6 (2026-08-12): un Potenziamento (Magia buff_, es. "Spada Sacra di Ghiaccio") una volta attivato e
  legato a un bersaglio ora resta SCOPERTO nella zona Magie e Trappole invece di restare mostrato coperto
  come un segreto. Causa: scartaOMantieniMagia (gameReducer.js) lo rimetteva in magieTrappole con
  `coperta: true` per design originale ("resta visibile coperta come tutto il resto, cap. 14") — ma
  FilaMagieTrappole (Campo.jsx) non guardava comunque mai il flag `coperta`, mostrava sempre il dorso
  Worldloom a prescindere. Fix: `coperta: false` per questi entry; FilaMagieTrappole ora mostra
  l'illustrazione vera (getImmagineCarta, stesso pattern di PilaCimitero) quando `mt.coperta === false`,
  con bordo dorato invece del viola "pronta" (nuova classe `.campo-slot-trappola-scoperta`) e NON è più
  "attivabile" al tocco (è un effetto già in corso, non c'è nulla da riattivare — prima restava cliccabile
  anche da attivo, un bug funzionale latente oltre a quello visivo). Verificato con test headless (poi
  cancellato) che segue il flusso reale (piazza-magia → attiva-magia-piazzata → bersaglio-magia): coperta
  passa correttamente da true a false solo dopo la scelta del bersaglio, bersaglioId corretto, bonus di
  Attacco applicato. Confermato funzionante anche dall'utente dal vivo.

BACKUP (2026-08-12, prima di iniziare l'idea 59/coda di animazioni — stessa cautela già usata prima della
catena di effetti): copia giocabile in
"App - HTML - Test\Versioni gioco\Worldloom_Gioco_v2.1_post-catena-sez1-2_bugfix-B1-B2-B6-B9-B11_2026-08-12.html"
(include Sezioni 1-2 della catena + fix B1/B2/B6/B9/B10/B11), copia completa del sorgente in
"00 Worldloom - Claude Code - work space\Backup sorgente pre-coda-animazioni 2026-08-12\".

- Task 16/idea 59, primo giro (2026-08-13): coda di animazioni vera — quando un'azione produce più eventi
  visivi nella stessa dispatch (es. l'IA attacca: balzo + dado + numero di danno tutti insieme), ora si
  vedono in sequenza uno alla volta (~1.3s ciascuno, "più lento per leggere meglio" come scelto con
  l'utente) invece che tutti sovrapposti. Scope confermato con l'utente PRIMA di scrivere codice (3 domande
  + 1 di scope): copre sia il turno IA sia le tue azioni; meccanismo "coda solo UI" (poi affinato: il
  reducer doveva comunque cambiare, ma solo nel COME/QUANDO scrive i campi di sola-UI, zero cambi alla
  logica di gioco — vedi sotto); ritmo più lento; scope LIMITATO alle animazioni per questo giro, ESCLUSO
  il caso "la mia carta muore nello stesso scontro in cui attacco e sparisce prima che il balzo si veda"
  (task 48) che richiederebbe ritardare anche la rimozione vera della carta dal campo — resta un limite
  noto, eventuale giro futuro.
  Meccanismo (gameReducer.js): nuovo stato s.codaVisiva = [] (array ordinato di { evento, dati }),
  azzerato in cima a OGNI dispatch (eccetto "chiudi-notifica" e la nuova "avanza-coda-visiva" stessa, che
  invece DEVONO lasciarla intatta — altrimenti si perderebbero gli eventi ancora in coda). I 6 helper che
  già producevano un evento visivo (registraAnimazioneAttacco, registraEventoPesca, registraLancioDado,
  registraNotificaEffetto, infliggiDanno per eventoDanno, il setter inline di esitoCombattimento) NON
  scrivono più subito il campo "ultimo evento" (es. s.lancioDado) — accodano solo `{ evento, dati }` con
  un id monotono condiviso (prossimoIdEventoVisivo, nuovo contatore s.prossimoIdVisivo, indipendente dal
  tipo: prima ogni campo aveva il proprio contatore locale, e se due eventi dello stesso tipo capitavano
  nella stessa dispatch il secondo sovrascriveva il primo prima ancora che la UI potesse mostrarlo). Nuova
  dispatch "avanza-coda-visiva" (+ funzione applicaEventoVisivo) toglie il primo evento dalla coda e scrive
  IL campo corrispondente — è l'UNICO punto che valorizza questi campi ora. Motivo del cambio rispetto al
  design originariamente ipotizzato ("coda solo UI, reducer invariato"): se i campi venissero scritti sia
  subito che poi rivelati di nuovo dalla coda, si vedrebbe prima il valore finale (scrittura immediata) e
  poi un salto indietro quando la coda arriva al primo evento più vecchio — scoperto ragionando a tavolino
  prima di scrivere codice, non durante un test fallito.
  UI (App.jsx): nuovo useEffect con dipendenza sulla LUNGHEZZA di codaVisiva (non un booleano — un booleano
  non cambierebbe valore tra un evento e il successivo e l'effetto non si ririschedulerebbe da solo) che
  manda "avanza-coda-visiva" ogni 1.3s finché la coda non è vuota; si ferma da sola quando l'evento appena
  rivelato è una notifica (stato.notificaEffetto valorizzato) aspettando "chiudi-notifica" prima di
  riprendere — stesso principio già usato per iaBloccataDaPrompt. iaBloccataDaPrompt (pacing turno IA,
  task 49) ora include anche `!!stato?.codaVisiva?.length`: il prossimo passo IA aspetta che la coda di
  animazioni della dispatch precedente sia finita di scorrere prima di partire, altrimenti si azzererebbe
  a metà e perderesti gli eventi rimasti.
  Semplificazione accettata (documentata, non un bug): se il giocatore clicca una nuova azione MENTRE la
  coda della dispatch precedente sta ancora scorrendo, quella dispatch la azzera (perde gli eventi residui
  non ancora rivelati) — lo stato di gioco è comunque già tutto risolto correttamente in background fin da
  subito (solo le animazioni di contorno vengono troncate in quel caso), stesso livello di tolleranza già
  accettato altrove nel progetto per casi limite simili.
  Verificato con simulazioni headless usa-e-getta (poi cancellate): un attacco reale produce 3 eventi
  (attacco→dado→esitoCombattimento) accodati nell'ordine cronologico corretto, non ancora rivelati prima
  del primo "avanza-coda-visiva"; "avanza-coda-visiva" rivela un evento alla volta, id sempre diverso,
  coda si svuota; "chiudi-notifica" verificato esplicitamente che NON azzera gli eventi rimasti in coda
  dopo la notifica; sweep di 100 partite complete col nuovo meccanismo attivo, zero crash. Verificato anche
  dal vivo: build pulita, nessun errore in console, 5 turni giocati in automatico senza stalli (contatore
  di turno progredisce normalmente, l'IA continua a evocare/attaccare/passare il turno).

- Task 16/idea 59, secondo giro (2026-08-13): tre richieste puntuali dell'utente su come sono ordinate le
  animazioni, più una feature nuova (colori sulle stat alterate). Punto "rallenta tutto di N secondi"
  esplicitamente scartato dall'utente in questo giro.
  (a) Sequenza Dado Imprevisti corretta: prima la carta Imprevisto girava SUBITO (istantaneo, dato che
  giocatore.imprevistoInCorso.movimenti non era mai stato messo in coda, solo il dado lo era) mentre il
  dado stava ancora animando — ora la barra fasi resta su "2 IMPREVISTI" e la carta Imprevisto resta
  ferma al valore precedente per TUTTA la durata dell'animazione del dado, e passano entrambe al nuovo
  valore solo quando la coda arriva all'ULTIMO evento della sequenza. Meccanismo: completaRifornimento
  (gameReducer.js) ora fa uno snapshot "prima" in due nuovi campi di stato — s.faseVisibile = {chiave,
  fase} e s.imprevistoVisivo = {chiave, esiste, movimenti} — PRIMA di calcolare il vero esito, poi accoda
  (dopo il dado, non prima) un evento "imprevistoEsito" coi valori "dopo"; applicaEventoVisivo scrive
  entrambi i campi solo quando questo evento viene rivelato da "avanza-coda-visiva". App.jsx (IndicatoreFasi)
  e PilaImprevisti (Campo.jsx) leggono questi due campi pinnati invece del valore live quando pertinenti
  al lato corrente, altrimenti ricadono sul valore vero. Verificato dal vivo ispezionando il badge "N/4"
  della carta: resta fermo al valore "prima" per ~2.4s (tutta la durata dado+roll+hold), poi salta al
  valore "dopo" in un colpo solo, mai una via di mezzo.
  (b) Pop-up di combattimento (Trappola/Difendi/Ripetizione/catena) ora aspettano che il balzo
  dell'attaccante sia stato rivelato dalla coda prima di comparire, ed evidenziano di ROSSO il bersaglio
  già scelto per tutta la durata dello scontro (prima l'evidenziazione rossa esisteva solo per i
  bersagli ELEGGIBILI prima della scelta, spariva subito dopo, e solo quando ero io l'attaccante — mai
  quando attaccava l'IA). Meccanismo: scegliBersaglio salva l'id dell'evento "attacco" appena accodato
  in comb.idBalzoRichiesto; PromptCombattimento.jsx ritorna null finché stato.animazioneAttacco?.id non
  coincide; CellaCreatura (Campo.jsx) evidenzia comb.difensoreId indipendentemente da chi è l'attaccante
  (riusa la classe .campo-slot-bersaglio già rossa, nessun CSS nuovo). Il timer per-tipo di evento in
  App.jsx (RITARDO_PRIMA_DI_MS, sostituisce l'unico valore fisso 1300ms del giro precedente) usa ora
  700ms prima di "attacco" (il bersaglio resta rosso da solo prima del pop-up), 200ms prima di "dado"
  (breve pausa dopo aver risolto un pop-up), 1400ms prima di "esitoCombattimento"/"dannoDiretto"/
  "imprevistoEsito" (copre il rotolare del dado, ~720ms interni a LancioDado.jsx, più i 700ms di "faccia
  ferma" richiesti). Verificato headless con un vero scenario "IA mi attacca" (via avanza-ia, non solo
  "io attacco" che si risolve sempre sincrono): comb.idBalzoRichiesto combacia con l'id in coda,
  animazioneAttacco resta null finché non rivelato, poi combacia.
  (c) Colori sulle stat alterate: Attacco/Parata di una creatura si colorano di verde se un Potenziamento
  le ha alzate, rosso se le ha abbassate, rispetto al valore STAMPATO in carta (non rispetto al turno
  prima — un buff resta verde per sempre finché è attivo, non solo un istante). creaCreatura (mazzo.js)
  salva ora attaccoOriginale/parataOriginale alla creazione (il valore stampato, mai più modificato);
  propsCarta (Campo.jsx) calcola attaccoAlterazione/parataAlterazione = valore-effettivo-attuale meno
  originale; Carta.jsx applica .carta-stat-alterata-su (verde) o -giu (rosso) su Attacco/Parata quando
  la differenza non è zero, sia nella vista compatta di campo sia in quella estesa. Non tocca Vita
  (cambia per danno normale, non per Potenziamenti, ha già il proprio sistema di numeri fluttuanti).
  Nato da un bug segnalato dall'utente ("pareggio impossibile" in uno scontro) non ancora diagnosticato
  con certezza — ipotesi dell'utente (stat alterate da una Magia attiva senza che si vedesse in UI) non
  ancora confermata sui numeri esatti, la richiesta di colorare le stat è comunque un miglioramento utile
  a prescindere e a verificare se risolve anche la percezione del bug in futuro.
  Verificato: headless (3 scenari + sweep di 150 partite, zero crash) e dal vivo (badge Imprevisti "N/4"
  pinnato poi scattante come atteso; colori verde/rosso confermati via computed style rgb(127,201,143) e
  rgb(224,138,138)). Nessun errore in console su una scheda pulita (una scheda del browser aveva errori
  "useGame va usato dentro GameProvider" ma erano voci di console STANTIE da interazioni precedenti nella
  stessa sessione, non riproducibili su una scheda nuova con lo stesso build — falso allarme, non un bug).

⚠️ BUG APERTO, NON ANCORA DIAGNOSTICATO (segnalato dall'utente 2026-08-13): "pareggio impossibile" in uno
scontro tra Modellatore Ghiaccio (mio) e una creatura avversaria — l'utente sostiene che numericamente un
pareggio non dovrebbe essere potuto uscire. Non diagnosticato con certezza per mancanza della riga esatta
del Registro Mosse per quello scontro specifico. Il punto (c) sopra (colori sulle stat alterate) è stato
implementato anche per aiutare a vedere ad occhio se una Magia attiva sta alterando le stat senza che
prima si notasse — da verificare con l'utente se il problema si ripresenta ora che le stat alterate sono
visibili a colpo d'occhio.

- Task 16/idea 59, terzo giro (2026-08-13): l'utente ha segnalato che in fase di Difendi/Diritto di
  ripetizione il pop-up si sovrapponeva ancora al dado — si vedeva il risultato scritto nel pop-up prima
  che il dado avesse finito di rotolare in animazione. Causa: il gate idBalzoRichiesto del giro
  precedente copriva SOLO il primissimo pop-up (subito dopo aver scelto il bersaglio); i pop-up
  SUCCESSIVI nella stessa catena di combattimento (Diritto di ripetizione dopo aver scelto "Difendi",
  Trappola dopoTiro dopo un ritiro) diventavano visibili appena comb.step cambiava, SINCRONO, senza
  aspettare che il dado corrispondente (tirato nello stesso momento) fosse stato rivelato dalla coda.
  Fix: stesso pattern, esteso — registraLancioDado ora ritorna l'id (come già faceva
  registraAnimazioneAttacco); i 4 punti che tirano un dado di combattimento (decidiDifesa,
  decidiRipetizione quando "usa", il ritiro di Mago Sorprendente dentro applicaSimbolo, il "reroll" da
  Trappola dentro applicaEffettoTrappola) salvano ora l'id in comb.idDadoRichiesto; PromptCombattimento.jsx
  ritorna null anche se stato.lancioDado?.id non combacia con comb.idDadoRichiesto, oltre al controllo
  già esistente su idBalzoRichiesto — quindi NESSUN pop-up di combattimento (Trappola/Difendi/Ripetizione/
  catena) può comparire finché sia il balzo iniziale SIA l'ultimo dado tirato non sono stati rivelati.
  Verificato headless con lo scenario esatto segnalato: l'IA mi attacca con un matchup che mi dà il
  Diritto di ripetizione (Effimeri vs Assalitore, cap. RUOTA in costanti.js) — confermato che
  comb.idDadoRichiesto viene impostato, che il pop-up aspetterebbe (stato.lancioDado?.id non ancora
  combaciante) e che dopo abbastanza avanzamenti della coda combacia e il pop-up può comparire. Verificato
  anche il verso simmetrico (io attacco, l'IA difende/decide): stessa coda, stesso meccanismo, nessuna
  differenza di trattamento tra i due lati — i pop-up esistono solo per "io" per costruzione (l'IA decide
  da sola senza mai vedere un pop-up), quindi non c'è un "equivalente avversario" del pop-up da tenere
  sincronizzato: il fix di per sé è già simmetrico. Sweep di 150 partite, zero crash. Nessun errore in
  console dopo il rebuild.

TASK ANCORA APERTI: i task 1-58 della lista originale sono completati; restano da investigare i bug
segnalati sopra (priorità) e da confermare/pianificare le idee 59-64 una alla volta.

BACKUP (2026-08-13, prima di affrontare il pacchetto di feedback dal vivo qui sotto — sessione con
catena Sezione 3 + lancio moneta + spostamento esplicito appena completati): copia giocabile in
"App - HTML - Test\Versioni gioco\Worldloom_Gioco_v2.2_post-catena-sez3-evocazione-moneta_2026-08-13.html",
copia completa del sorgente in "00 Worldloom - Claude Code - work space\Backup sorgente
pre-revisione-feedback-live 2026-08-13\".

⚠️ PACCHETTO FEEDBACK DAL VIVO (2026-08-13, sessione di gioco reale con screenshot — l'utente ha chiesto
esplicitamente "parliamo senza codice, facciamoci domande" prima di toccare qualunque cosa qui sotto).

GROSSO NODO CONCETTUALE DA CHIARIRE PRIMA DI TUTTO — UX della catena di effetti:
L'utente non si sente in controllo del flusso attuale: oggi il pop-up "Contromossa o catena?" compare
SOLO come reazione a un'attivazione dell'avversario (o alla propria), con una lista testuale delle
carte eleggibili + bottone "Non aggiungere altro" — lui lo descrive come "un assist" che non vuole:
vorrebbe poter toccare/selezionare le proprie carte disponibili direttamente sul campo per decidere se
e come rispondere, più vicino a come funzionava PRIMA della catena (task pre-catena: click sulla carta
per attivarla).

DIREZIONE SCELTA CON L'UTENTE (2026-08-13, dopo discussione a parole — NON ancora implementata):
- Il meccanismo di priorità/pila sottostante (LIFO, chi aggiunge mantiene la priorità) resta invariato:
  cambia solo la scenografia, non la logica di catena.js/gameReducer.js.
- Le carte in cima alla pila si mostrano con l'illustrazione vera (stile zoom ℹ), non più una lista
  testuale nome+testo. Layout proposto dall'utente: la carta appena aggiunta è quella "zoomata"
  (grande) più a destra; quando se ne aggiunge un'altra sopra, quella precedente si rimpicciolisce e
  si sposta a sinistra, e la nuova diventa quella zoomata a destra — una striscia orizzontale che
  cresce verso destra, in cui la carta più a destra è sempre quella in cima alla pila (quella che si
  risolverà per prima, coerente con LIFO).
- Le carte ELEGGIBILI da aggiungere si illuminano direttamente nella loro posizione reale sul proprio
  campo (bordo dorato/pulsante, gesto "fisico" pre-catena) — le tocchi lì, poi la carta entra nella
  striscia orizzontale in alto come nuova carta zoomata a destra.
- "Lascia proseguire" resta un bottone esplicito e sempre visibile (non un timeout né un tocco fuori
  dalle carte).
Restano dettagli implementativi da definire in corso d'opera (non bloccanti per iniziare):
comportamento con catene lunghe (4+ carte) su schermo stretto — scroll orizzontale o miniature sempre
più piccole.

[FATTO — 2026-08-13] Implementato. Nuovo componente CatenaStriscia.jsx (montato in App.jsx accanto a
PromptCombattimento): pannello fluttuante SENZA sfondo opaco (a differenza dei pop-up modali), striscia
orizzontale di immagini vere (getImmagineCarta) che cresce a destra, l'ultimo frame aggiunto è quello
grande con bordo dorato, i precedenti restano piccoli a sinistra; bottone "Lascia proseguire" (dispatch
"catena-passa", invariato) mostrato solo quando tocca a "io" decidere; stesse guardie di animazione
idBalzoRichiesto/idDadoRichiesto già usate da PromptCombattimento, replicate qui. Il vecchio pop-up
"Contromossa o catena?" con lista testuale è stato rimosso da PromptCombattimento.jsx (ora restituisce
null quando stato.catena è valorizzato, lasciando fare tutto a CatenaStriscia). In Campo.jsx,
FilaMagieTrappole calcola le carte eleggibili (carteEleggibiliPerRisposta, la stessa funzione generica
condivisa col reducer) quando tocca a "io" decidere e le evidenzia direttamente nella loro posizione
reale sul campo con un nuovo bordo dorato pulsante (.campo-slot-trappola-catena-eleggibile,
keyframe campo-slot-catena-pulsa) — cliccarle dispatcha "catena-aggiungi-trappola" con l'indice giusto,
esattamente come un tempo si toccava una Trappola per attivarla. Aggiunto anche `!stato.catena` alla
condizione "attivabile" delle Magie piazzate normali, per evitare che le due strade (attivazione libera
vs risposta alla catena) si accavallino quando entrambe sarebbero tecnicamente vere nello stesso istante.
Nessuna modifica alla logica sottostante (catena.js/gameReducer.js invariati): solo scenografia.
Verificato: build pulita; dal vivo nel browser, sfondo/backdrop del nuovo pannello confermato trasparente
rispetto al campo sottostante (iniettato temporaneamente un markup di prova con le stesse classi CSS reali
per controllare visivamente dimensioni/posizionamento/crescita della striscia, poi rimosso — non un test
del flusso reale). NON verificato dal vivo il trigger end-to-end reale (serve pescare/piazzare una
Trappola specifica lato IA o mio, evento raro da forzare in automatico in tempi ragionevoli) — da
confermare con l'utente alla prossima Trappola/evocazione eleggibile che gli capita in partita vera.

BUG SEGNALATI DAL VIVO (con screenshot, priorità alta — rompono la leggibilità/fiducia nel motore):
1. Sequenza dado/danno di nuovo rotta: l'esito (danno, morte, "diritto di ripetizione") compare PRIMA
   che il dado abbia finito l'animazione — sembra una regressione rispetto al fix già fatto (coda
   visiva idBalzoRichiesto/idDadoRichiesto, "idea 59 terzo giro"). Esempio concreto: turno 21,
   Manipolatrice Rossa morta prima che il dado mostrasse il simbolo Cuore che l'ha uccisa. Sospetto:
   può essere stato toccato indirettamente dal refactor della catena generica appena fatto (Sezione 3)
   — da controllare con priorità.
2. Barra delle fasi disallineata dalla fase reale in uno screenshot: "3 Preparati allo scontro"
   evidenziato ma il messaggio sotto è "Tocca una tua creatura per attaccare" (testo di Fase 4).
3. "Aura di Marbion" non si attiva anche essendo già in Fase 3 (il messaggio dice "si attiva solo nella
   tua Fase 3" mentre l'utente è già lì) — probabile bug nella condizione che controlla la fase.
4. [FATTO 2026-08-15] "Distruzione Sofferta" (codice distrsoff, magieTrappole.js) sceglieva in automatico
   le 2 creature nemiche da colpire (le due con Vita più bassa) invece di lasciarle scegliere all'utente
   — il proprio sacrificio automatico (la propria creatura con Attacco più alto) restava invariato, va
   bene così. Causa: `magiaRichiedeBersaglio` ritornava `null` per "distrsoff" (unica Magia nel gioco a
   colpire 2 bersagli — nessun'altra), quindi non passava mai dal sistema di scelta bersaglio e si
   risolveva subito dentro `risolviMagia`. Fix: `magiaRichiedeBersaglio` ora ritorna "nemico" anche per
   "distrsoff"; nuovo export `numeroBersagliMagia(carta)` (1 di default, 2 solo per "distrsoff"); nuovo
   stato `s.numeroBersagliMagia`/`s.bersagliMagiaSelezionati` (quest'ultimo accumula le scelte con lo
   STESSO schema già usato per il tributo: tocca per selezionare/deselezionare, si risolve da sola
   appena raggiunto il numero richiesto — l'utente ha scelto esplicitamente questa opzione invece di un
   bottone "Conferma bersagli" esplicito). Il numero richiesto è limitato dinamicamente a quanti
   bersagli validi esistono davvero (`Math.min(numeroBersagliMagia, disponibili)`), altrimenti con un
   solo nemico in campo la Magia non potrebbe mai risolversi. `risolviMagia`/`giocaMagia` accettano ora
   un nuovo parametro opzionale `bersagli` (array, in coda, non rompe nessuna chiamata esistente): il
   ramo "distrsoff" lo usa se presente, altrimenti ripiega sul vecchio pick euristico (Vita più bassa) —
   il ripiego serve solo all'IA, che continua a chiamare `giocaMagia` con un singolo `bersaglio` "di
   cortesia" mai realmente usato da questo ramo. Generalizzato lo stesso ingresso in modalità
   bersaglio-magia sia da mano (selezionaMano) sia da zona (attivaMagiaPiazzata, Magia già piazzata
   riattivata), con messaggio che si adatta ("Scegli 2 Alieni nemici" invece di "un Alieno nemico").
   Campo.jsx (CellaCreatura) evidenzia ora anche `bersagliMagiaSelezionati`, oltre ai già esistenti
   tributiSelezionati/movimentoSelezionato/candidatoScambio. Verificato con test headless mirati usando
   la carta VERA dal mazzo Frost Land (non un mock): la Magia ora apre la modalità invece di
   auto-risolversi; scegliendo apposta il nemico "sbagliato" (più forte, non il più debole) viene
   distrutto proprio quello — prova diretta che la scelta è dell'utente, non più dell'euristica; il
   toggle seleziona/deseleziona correttamente; con un solo nemico disponibile si risolve dopo un solo
   tocco senza restare bloccata; l'IA continua a funzionare invariata col ripiego automatico. Sweep di
   150 partite vsIA complete (incluso il nuovo flusso multi-bersaglio) zero crash. Verificato anche dal
   vivo: build pulita, nessun errore in console.
5. [CHIUSO — falso allarme, chiarito con l'utente il 2026-08-13] "Potenziamento Estremo attivato da
   solo, non lo trovo nel cimitero": alla fine non era stato attivato, il cimitero funziona
   correttamente. Non era un fraintendimento del punto 4 né un bug a parte — nessuna azione richiesta.
6. Nessun feedback visivo quando una creatura muore in combattimento: oggi sparisce e basta dal campo,
   l'utente non riesce a capire con certezza se/perché è stata sconfitta.
7. Nessuna spiegazione visibile quando le statistiche di una creatura cambiano per un motivo che non sia
   un Potenziamento (es. due creature con "statistiche in discesa" senza capire perché) — probabilmente
   risolto dal punto 9 qui sotto (colori su OGNI variazione, non solo Potenziamenti).

NUOVE REGOLE/FEATURE RICHIESTE ESPLICITAMENTE (nessun codice ancora, solo elencate):
8. Animazione di pesca dal Worldloom: oggi è solo "uno sfarfallamento di colore" — l'utente vuole una
   vera transizione fisica, la carta che si solleva dal mazzo e vola punto A → punto B fino alla mano
   (non un salto istantaneo tra due frame, che sembra un bug). Vale sia per la propria pesca sia per
   quella dell'avversario (stessa fisica, verso la propria mano di destinazione).
9. [FATTO 2026-08-15, scope ristretto al combattimento] Colori dinamici sulla Vita: prima solo Attacco/
   Parata avevano un colore persistente per alterazione (confronto col valore stampato in carta).
   La Vita cambia troppo di continuo (danno, poi guarigione a fine turno) perché un colore "persistente
   finché sotto al massimo" avesse senso — l'utente ha confermato di limitare lo scope al solo
   combattimento (dove esiste già un lampo transitorio, `esitoCombattimento`), scartando invece la
   copertura di guarigione a fine turno/Magie/Imprevisti/effetti carta (pezzo più grande, non richiesto
   ora). Implementato estendendo lo stesso evento `esito` già usato per il numero fluttuante
   (`.carta-esito`, cap. task 47/B16): ora colora anche il numero VERO della Vita
   (`Carta.jsx`, nuova classe `.carta-vita-danno`, nuova keyframe `vita-flash-danno` in index.css,
   stessa durata 1.15s del lampo esistente) quando `esito.tipo === "danno"`. Solo il caso rosso è
   collegato a un produttore reale: non esiste oggi un tipo di evento "cura"/aumento di Vita generato
   durante un combattimento, quindi la classe verde equivalente non è stata aggiunta (nessun codice
   morto per un caso che non può mai scattare) — se in futuro un effetto curasse in combattimento,
   andrebbe aggiunto un nuovo `tipo` all'evento esito prima che il verde abbia senso.
9b. [FATTO 2026-08-15, scope ristretto] Icona "bloccato" 🚫 — l'utente ha ridefinito lo scope rispetto
   alla richiesta originale (non riguarda la disponibilità generica di bottoni/azioni, già escluso):
   vuole il badge solo sulle creature colpite da un effetto di un'altra carta che le impedisce di fare
   qualcosa. Investigazione preliminare ha trovato 3 stati esistenti mai visualizzati (`stordito`,
   `fresca` in relazione al blocco movimento/tributo, `controlloTemporaneo` da "L'Inganno Vincente") —
   l'utente ha scelto di coprire SOLO `stordito` (l'unico causato da una vera Magia avversaria, "Aura
   di Marbion": non può attaccare per 1 turno). `Campo.jsx` (`propsCarta`) ora calcola
   `stordita: creatura.stordito > 0` e la passa a `<Carta>`; `Carta.jsx` mostra un badge 🚫
   (`.carta-mini-bloccata`, angolo in basso a sinistra, unico libero — in alto ci sono già livello e
   ℹ) con tooltip "Stordita: non può attaccare in questo turno", solo nel ramo compatto (creature in
   campo, dove avviene il combattimento — non nel ramo esteso di mano/zoom). `fresca` e
   `controlloTemporaneo` restano fuori scope, non implementati.
10. Colore di sfondo del dado di reazione secondo l'Archetipo di chi difende — verificare se è già
    corretto (LancioDado.jsx ha già COLORE_ARCHETIPO dal task 57) o se l'utente lo sta chiedendo di
    nuovo per un bug visivo non ancora individuato. Dado Imprevisti: colore NERO richiesto (oggi è
    viola secondo le note del task 57 — cambiare).
11. Il Worldloom (pila del mazzo) sembra restare "illuminato" in modo fisso invece di pulsare solo al
    momento della pesca (regressione rispetto al task 50?) — da verificare con lo screenshot allegato.
12. [FATTO 2026-08-13] Pop-up con l'illustrazione vera della carta (stesso stile dello zoom ℹ, non solo
    testo) per OGNI attivazione — Trappola, Magia, effetto creatura — comprese le proprie carte quando
    le attivo io stesso. Le Trappole avevano già la notifica (task B10) ma senza immagine: aggiunta
    (registraNotificaEffetto ora accetta chiave+nomeCarta, NotificaEffetto.jsx mostra
    getImmagineCarta(...) quando disponibile). Magie: nessuna notifica esisteva prima — giocaMagia
    (magieTrappole.js) è stata avvolta in un wrapper esportato che notifica automaticamente ogni
    attivazione riuscita (la vecchia funzione è ora risolviMagia, interna); copre anche "Eco del Gelo"
    (ricorsivo: prima mostra l'effetto ripetuto con nome/immagine VERI — corretto un difetto scoperto
    durante il test, l'oggetto sintetico si chiamava "Eco del Gelo (eco)" invece del vero nome, quindi
    aggiunto giocatore.ultimaMagiaNome accanto a ultimaMagiaCodice — poi Eco del Gelo stessa). Effetti
    creatura: nuovo helper notificaEffettoCreaturaSeCe in gameReducer.js, chiamato ai 5 punti di
    evocazione, MA SOLO se la carta ha davvero un codice/effetto (niente pop-up per i tantissimi Alieni
    senza abilità speciale, sarebbe stato spam ad ogni evocazione). Notifica Imprevisti (già esistente,
    task B10) aggiornata anch'essa con chiave/nomeCarta per coerenza. Nota tecnica: sia magieTrappole.js
    sia effettiCarta.js NON possono importare da gameReducer.js (creerebbe un import circolare, stesso
    vincolo già documentato per sistemaPrimaLineaDopoMagia) — la notifica delle Magie duplica quindi
    localmente la stessa identica logica di accodamento (registraNotificaEffettoMagia), mentre per gli
    effetti creatura la chiamata resta nei 5 punti esterni in gameReducer.js, che ha già tutto
    l'occorrente. Verificato con simulazioni headless (poi cancellate): Magia con bersaglio notificata
    con chiave/nomeCarta corretti; creatura con effetto notificata, creatura SENZA effetto non produce
    alcuna notifica; Eco del Gelo produce due notifiche in ordine corretto (Culla del Mondo, poi Eco del
    Gelo, coi nomi veri); Trappola in combattimento ancora corretta (nessuna regressione). Sweep di 60
    partite complete automatiche, zero crash. Build pulita.
13. [RIDEFINITO 2026-08-15, vedi punto 9b sopra] L'utente ha chiarito che non intendeva la disponibilità
    generica di bottoni/azioni (fase sbagliata, campo pieno, ecc.) come ipotizzato qui originariamente,
    ma solo le creature bloccate da un effetto subito da un'altra carta (es. stordimento) — implementato
    con quello scope più ristretto, vedi punto 9b.
14. Imprevisti che fanno scartare una carta: se il testo dice "ogni giocatore scarta una carta" → la
    scelta di QUALE scartare spetta al giocatore; se il testo specifica "un giocatore sceglie a caso
    dalla mano avversaria e gliela scarta" → nessuna scelta, casuale/imposta. Attenzione a rispettare
    questa distinzione carta per carta leggendo il testo esatto, non applicare sempre lo stesso
    comportamento.
15. Le evocazioni "speciali" (pedine/gemelli creati da un effetto carta, es. Pedina Goblin di Culla del
    Mondo, Pedina di Sangue, il gemello di Piccolo Goblin) devono poter essere sacrificate anche nel
    turno stesso in cui compaiono — ignorano la regola generale "appena evocata non sacrificabile
    subito" (oggi presumibilmente c.fresca=true anche per queste, da verificare dove vengono create in
    effettiCarta.js/magieTrappole.js).
16. [FATTO 2026-08-13] Spostare visivamente la barra "Il tuo Stratega · Turno N · PV" fuori dallo
    sfondo stellato del campo di gioco, in una fascia neutra tra il bordo inferiore del campo e la
    barra delle fasi. In realtà lo sfondo stellato (background-image radiale con "stelle", .campo in
    index.css) è sempre stato solo su .campo, mai sulla barra — il problema era di sola POSIZIONE: la
    barra "Il tuo Stratega" era renderizzata (App.jsx) dopo <Mano/>, molto più in basso, invece che
    subito sotto <Campo/>. Spostata la riga JSX per farla comparire subito dopo <Campo/> e prima di
    <IndicatoreFasi/>, rimossa la vecchia posizione. Verificato dal vivo: la barra ora appare
    esattamente tra il riquadro del campo e la barra delle fasi, sullo sfondo semplice della pagina.
17. Definire le Magie Rapide in modo più semplice/esplicito (probabilmente un marcatore più chiaro nei
    dati/Excel) per poterle agganciare più facilmente alla catena generica nelle prossime sezioni (4+).

CONFERMATO FUNZIONANTE (feedback positivo dal vivo):
18. "Eco del Gelo" ripete "Culla del Mondo" correttamente (evoca 2 Pedine Goblin) — concatenazione di
    effetti di carte confermata funzionante dall'utente ("pazzesco", "superfiga").

19. [FATTO 2026-08-13, con nota] "Guardiano Glaciale" (Frost Land) appariva in mano con un formato
    completamente diverso dalle altre carte (blocco di testo libero, molto più alto) invece del
    formato compatto illustrato. Causa: è l'UNICA carta di Frost Land (48/49) senza Complete Card —
    manca sia da `Mazzi/Frost Land.../Complete cards/` sia dalla sorgente grezza in `Images/`, quindi
    non è un bug di codice ma un asset mai fornito. **Non posso generare l'illustrazione mancante da
    solo** (nessuna capacità di sintesi immagine in questo ambiente) — va aggiunta da te in `Images/`
    (es. `guardiano-glaciale.png`) e poi rigenerata con `componi_carte.py`, come per le altre carte.
    Nel frattempo, corretto il formato: Carta.jsx, quando manca l'immagine, ora usa una nuova classe
    `carta-senza-immagine` con la STESSA proporzione 5:7 delle Complete Card vere (aspect-ratio
    750/1050, identica a `.carta-immagine`) e una struttura a fasce banner/corpo/piede che imita quella
    di una carta vera (banner colorato per Archetipo — riusa COLORE_ARCHETIPO già esportato da
    LancioDado.jsx — corpo con gli effetti, scrollabile se serve, piede con le statistiche) invece del
    vecchio blocco di testo che si allungava a piacere. Usata sia in Mano.jsx sia in DettaglioCarta.jsx
    (stesso componente Carta condiviso). Verificato dal vivo iniettando un confronto affiancato con una
    carta illustrata reale (Mago Sorprendente): stessa identica larghezza e altezza.

- Task colonna sonora (2026-08-15, richiesta esplicita dell'utente): musica di sottofondo in loop, in
  un pannello Opzioni disattivabile. Traccia sorgente
  "App - HTML - Test\Music_Theme\Traccia 1.mp3" (4.2MB) copiata in
  `src/assets/traccia-1.mp3` (rinominata, niente spazi, per l'import). Nuovo componente
  PannelloOpzioni.jsx: crea un unico `new Audio(traccia1)` (loop=true, volume 0.35) in un ref alla
  prima mount, non un `<audio>` nel JSX — così non ne esiste più di uno per remount. Bottone ingranaggio
  ⚙️ fisso in alto a destra (position:fixed, z-index sopra i pop-up di gioco), sempre visibile perché
  montato in ContenutoApp FUORI da GameProvider/Partita (quindi vale sia nella schermata iniziale sia
  durante la partita) — apre un pannello con l'interruttore "Musica di sottofondo" (Attiva/Disattivata).
  Preferenza persistita in localStorage (`wl_musica_attiva`), default ON.
  Nota importante sull'autoplay: i browser bloccano l'audio CON SUONO finché l'utente non ha interagito
  almeno una volta con la pagina — non è un bug, è una policy standard. "Parte quando apri l'app" è
  quindi rispettato nel limite del possibile: il primo tentativo di play() parte al mount (fallisce
  silenziosamente se il browser blocca), e un listener su tutta la pagina (pointerdown/keydown) ritenta
  play() al primissimo tocco/tasto in assoluto (tipicamente il click su "Entra" della password, o su
  "Gioca contro IA") — la musica parte lì, il prima possibile.
  Impatto dimensione: GIOCA.html passa da ~18.9MB a ~24.5MB (viteSingleFile inlinea l'mp3 in base64
  come già fa per le immagini — nessuna modifica a vite.config.js necessaria, il plugin forza già
  l'inlining di tutti gli asset indipendentemente dalla dimensione).
  Verificato: build pulita, nessun errore in console; dal vivo il bottone Opzioni compare in entrambe le
  schermate, il pannello si apre/chiude, l'interruttore cambia stato visivamente (verde "Attiva" ↔ grigio
  "Disattivata") e la preferenza risulta correttamente scritta/letta da localStorage. Limite della
  verifica: non ho un modo per "sentire" l'audio da questo ambiente — la riproduzione vera (l'oggetto
  `Audio` prodotto da `new Audio()` non è mai inserito nel DOM, quindi non ispezionabile con i normali
  strumenti di lettura pagina) va confermata dall'utente alla prossima apertura del gioco.

MODALITÀ "1 CONTRO 1 (STESSO DISPOSITIVO)" — IN COSTRUZIONE (avviata 2026-08-15, discussa a parole prima
di scrivere codice, cap. regola di processo). Decisione presa con l'utente: NON un fork del codice, una
nuova modalità nello stesso codebase (flag `s.modalitaGioco`, "vsIA" default invariato / "1v1locale"
nuovo), mazzi scelti insieme sulla stessa schermata iniziale (nessun passa-telefono per quello), nomi
generici "Giocatore 1"/"Giocatore 2". Piano a fasi: Fase 1 = solo infrastruttura/specchiatura visiva
(l'avversario resta ancora deciso dall'IA, serve solo a verificare che passaggio-telefono e specchiatura
funzionino), Fase 2 = sostituire le decisioni IA con prompt umani veri una alla volta, Fase 3 = rifiniture.
Il pulsante "📱 1 contro 1 (stesso dispositivo)" nella schermata iniziale resta disabilitato ("Presto
disponibile") fino alla fine della Fase 1.

- Fase 1, primo pezzo (2026-08-15): Campo.jsx — separata la POSIZIONE a schermo (alto/basso, che ora deve
  poter cambiare) dall'IDENTITÀ del seme "io"/"avversario" (fissa per sempre, usata per proprietà/logica),
  due concetti che finora coincidevano sempre (io sempre in basso) e che il codice confondeva in più punti
  usando la stessa variabile/prop `mio` per entrambi gli scopi. Aggiunto `s.modalitaGioco` ("vsIA" default
  / "1v1locale") e `s.partitaAvviataAlle` (id per-partita, per un futuro reset di stato UI locale) in
  nuovaPartita (gameReducer.js) — sola lettura per ora, nessuna differenza di regole. In Campo.jsx: nuova
  `prospettiva` calcolata in cima a `Campo()` (= "io" fissa se modalitaGioco non è "1v1locale", altrimenti
  segue `stato.giocatoreAttivo`) che decide chi va in basso/alto, con relativa mappatura di mazzoId per le
  immagini — comportamento 100% invariato quando modalitaGioco è "vsIA" perché prospettiva resta sempre
  "io" esattamente come prima. Corretti tre punti dove il codice derivava erroneamente l'identità del seme
  dalla posizione (`mio`) invece che dal seme vero: FilaMagieTrappole (nuovo `eSeatIo = giocatore ===
  stato.giocatori.io`, usato per `attivabile`/`inCatena` — critico perché il reducer, es.
  attivaMagiaPiazzata, opera sempre e solo su `s.giocatori.io`: lasciare il gate sulla sola posizione
  avrebbe permesso, in 1v1 locale, di cliccare la carta sbagliata quando il seme "avversario" occupa la
  posizione bassa), ZonaGiocatore (chiave per l'aggancio di `eventoPesca`, ora da `giocatore ===
  stato.giocatori.io` invece che da `mio`), PilaImprevisti (stessa cosa per `ultimoTiro`/`imprevistoVisivo`,
  qui risolta passando una prop `chiave` esplicita dal chiamante invece di derivarla). CellaCreatura ha
  invece bisogno del contrario: il capovolgimento visivo (classe `carta-capovolta`) va legato alla
  POSIZIONE (nuova prop `mio` esplicita, prima assente, propagata da FilaSlot), non più al vecchio `mia`
  (appartenenza al seme "io") — altrimenti in 1v1 locale le carte del seme attivo mostrato in basso
  apparirebbero capovolte. Tutti i gate di interattività/click (chi può muovere, attaccare, scegliere un
  bersaglio) restano invece intenzionalmente legati al seme fisso "io" ovunque, invariati: in Fase 1
  l'avversario è ancora IA, quindi non deve mai diventare cliccabile a prescindere da dove viene mostrato
  a schermo — la cliccabilità vera arriverà solo in Fase 2. Verificato con sweep headless di 80 partite
  complete (poi script cancellato) zero crash/regressioni, e dal vivo nel browser: campo identico in tutto
  e per tutto a prima del refactor (io in basso, avversario speculare in alto, zona attiva evidenziata),
  nessun errore in console.

- Fase 1, secondo pezzo (2026-08-15): Mano.jsx. Stessa `prospettiva` di Campo.jsx ricalcolata qui
  (duplicata, un solo `if` — stessa convenzione già usata altrove nel progetto per evitare dipendenze
  incrociate). `Mano()` (in basso, carte vere) ora mostra `stato.giocatori[prospettiva]` invece di
  `stato.giocatori.io` fisso, con `mazzoIdOverride` passato esplicitamente a `<Carta>` e
  `<DettaglioCarta>` in base a quale mazzo appartiene davvero al seme mostrato (prima funzionava per
  puro caso: "io" coincideva sempre col `mazzoId` di default preso dal contesto). `ManoAvversaria()` (in
  alto, dorsi coperti) mostra specularmente `stato.giocatori[altraProspettiva]`. Il bottone
  Evoca/Piazza-coperta (`puoGiocare`) resta intenzionalmente legato al seme fisso "io", non alla
  prospettiva — stessa scelta di Campo.jsx: in Fase 1 l'altro seme è ancora IA, quindi anche quando la
  sua mano compare in basso durante il suo turno resta a sola visualizzazione (si può aprire lo zoom
  della carta ma non evocarla), evitando un click umano in corsa con l'IA che gioca da sola quello
  stesso turno. Verificato dal vivo: build pulita, layout e zoom-carta identici a prima (illustrazione,
  statistiche, nessun bottone d'azione in Fase 1 Rifornimento come atteso), nessun errore in console.
  Prossimo pezzo: la schermata "Passa il telefono" in App.jsx, che è anche dove entra in gioco per la
  prima volta la differenza pratica (mostrare la mano giusta quando la prospettiva cambia davvero).

- Fase 1, terzo pezzo — completa (2026-08-15): App.jsx. Bottone "📱 1 contro 1 (stesso dispositivo)"
  nella schermata iniziale ora attivo (dispatcha nuova-partita con modalitaGioco: "1v1locale"), rimosso
  il badge "Presto disponibile". `Partita()` calcola la stessa `prospettiva` di Campo.jsx/Mano.jsx e
  aggiunge un nuovo stato locale `telefonoConfermatoPer` (resettato ad ogni nuova partita tramite
  l'id `partitaAvviataAlle` del reducer, cap. primo pezzo): finché non combacia con la prospettiva
  corrente, un nuovo return anticipato (dopo gli hook, stesso schema già usato per SchermataIniziale)
  mostra SOLO la schermata "📱 Passa il telefono — Passa il telefono a Giocatore N" con un bottone
  "Sono pronto" — niente campo/mano visibili sotto finché non viene confermato, per non rivelare la
  mano dell'altro nell'istante di passaggio. Le due `<BarraPv>` (sopra/sotto il campo) seguono ora
  `prospettiva`/`altraProspettiva` invece del seme fisso "io"/"avversario", con etichetta "Giocatore
  1"/"Giocatore 2" al posto di "Il tuo Stratega"/"Stratega avversario" solo quando modalitaGioco è
  "1v1locale" — BarraPv aveva lo stesso bug di derivare la chiave (per l'aggancio del numero rosso di
  danno) dalla posizione (`mio`) invece che dal seme vero, corretto passandola esplicitamente dal
  chiamante (stesso schema già usato per PilaImprevisti). "Nuova partita" da SchermataVittoria ora
  passa `modalitaGioco: stato.modalitaGioco` — senza, dopo una vittoria in 1v1 locale si sarebbe
  tornati silenziosamente a "vsIA" (comportamento di default del reducer quando il campo non arriva).
  Interattività reale (bottoni Evoca/Piazza coperta/Continua/Fine turno) resta intenzionalmente legata
  al seme fisso "io", INVARIATA: in questa Fase 1 l'altro seme è ancora giocato dall'IA, quindi anche
  quando il telefono passa e il suo campo/mano compaiono in basso, resta a sola visualizzazione — la
  vera interattività per l'altro giocatore è la Fase 2. Testo del pulsante principale ("L'avversario
  evoca…" ecc.) e l'etichetta "Turno di: te/avversario" non sono stati riscritti per la prospettiva
  (restano dal punto di vista del seme "io" anche quando si guarda il campo dell'altro seme durante il
  suo turno IA) — nitpick cosmetico noto, rimandato alla Fase 2 quando quel testo andrà comunque
  riscritto per riflettere turni umani veri. Verificato dal vivo con un playthrough reale in 1v1 locale:
  bottone attivo, "Passa il telefono a Giocatore 1" alla primissima rivelazione, barre "Giocatore
  1"/"Giocatore 2" corrette, dopo "Fine turno" del Giocatore 1 compare "Passa il telefono a Giocatore 2"
  automaticamente, confermando si vede il campo interamente specchiato (Giocatore 2 in basso non
  capovolto con le sue vere carte/Terreno, Giocatore 1 in alto capovolto con dorsi coperti in mano),
  l'IA continua a giocare/notificare normalmente (Terreno Ribelle, Draghetto Arcobaleno, Coleottero
  Prisma attivati con popup illustrati come sempre) e al turno successivo la schermata passa-telefono
  torna a chiedere "Giocatore 1" — nessun crash, nessun errore console. Verificato anche che la
  modalità contro IA resta bit-per-bit identica a prima (nessuna schermata passa-telefono, etichette
  "Stratega avversario"/"Il tuo Stratega" invariate). FASE 1 COMPLETA.

FASE 2 — combattimento umano per l'altro seme (2026-08-15, primo pezzo).
Prima di scrivere codice, scoperte due cose che hanno cambiato il piano rispetto a come era stato
descritto all'utente, entrambe verificate leggendo il reducer prima di agire (non presunte):
1. Non bastava sostituire le 7 funzioni "IA decide da sola" — quasi OGNI dispatch del reducer
   (continua-fase, scegli-attaccante, scegli-bersaglio, decidi-difesa, ecc.) ha un gate hardcoded
   `giocatoreAttivo/proprietario === "io"` all'INGRESSO, separato dalla logica di gioco vera che sta
   sotto — quella logica (avviaAttacco, scegliBersaglio, decidiDifesa, decidiRipetizione,
   applicaEffettoTrappola, passaCatena/aggiungiTrappolaAllaCatena) era già scritta in modo generico
   (parametrizzata su "proprietario"/chiave), perché è la STESSA usata dall'IA per le sue mosse. La
   fatica non è stata "riscrivere la logica di combattimento", ma solo allentare questi gate d'ingresso
   e disattivare le scorciatoie euristiche dell'IA quando modalitaGioco è "1v1locale".
2. La "prospettiva" della Fase 1 (chi vedo in basso = chi ha il turno) non basta per il combattimento:
   le decisioni più delicate (Difendi/Rifiuta, Diritto di ripetizione) spettano quasi sempre al
   DIFENSORE, che il più delle volte non è chi ha il turno. Confermato con l'utente (domanda esplicita,
   risposta "sì, passa anche a metà turno") che nel gioco fisico il telefono deve poter tornare indietro
   più volte nello stesso turno, non solo una volta a inizio turno.
Nuovo modulo condiviso `src/game/prospettiva.js`, `chiDecideOra(stato)`: sostituisce il calcolo
duplicato "prospettiva" di App.jsx/Campo.jsx/Mano.jsx della Fase 1 con una versione più ricca — priorità
nella catena, poi chi deve scegliere l'avanzamento in prima linea, poi (durante un combattimento) il
difensore per ogni step tranne "ripetizione" (dove segue il decisore vero, attaccante o difensore a
seconda del matchup) e "bersaglio" (dove l'attaccante sta ancora scegliendo), altrimenti chi ha il
turno — sempre "io" contro IA. Usata ora da tutti e 5 i componenti (App.jsx, Campo.jsx, Mano.jsx,
PromptCombattimento.jsx, CatenaStriscia.jsx) al posto del vecchio confronto duplicato inline.
Reducer (gameReducer.js), generalizzati SOLO per modalitaGioco === "1v1locale" (vsIA bit-per-bit
invariato per costruzione — ogni condizione aggiunta è un OR col comportamento di sempre):
scegliAttaccanteIo (agisce per giocatoreAttivo, non più fisso su "io"); avviaAttacco (la scelta
automatica del bersaglio scatta solo se davvero IA); passaAlRifiuto (l'euristica sul rifiuto scatta
solo se davvero IA); decidiDifesa (stesso per l'euristica sul diritto di ripetizione); avanzaCatena
(l'euristica catena scatta solo se davvero IA); sistemaPrimaLinea/risolviAvanzamento (generalizzata
la scelta di chi avanza in prima linea, prima hardcoded su "io"); i case "scegli-bersaglio"/
"decidi-difesa"/"decidi-ripetizione"/"catena-aggiungi-trappola"/"catena-passa"/"scegli-avanzamento"
nello switch (gate d'ingresso allentati per accettare anche "avversario" quando è un umano vero).
UI: Campo.jsx (CellaCreatura) — il click per dichiarare l'attaccante ora funziona anche per
"avversario" quando ha davvero il turno in 1v1 locale (tributo e spostamento in Fase 3 restano
INVARIATI, riservati al seme "io" — non ancora generalizzati, sezione futura); la scelta del bersaglio
già dichiarato confronta contro chiDecideOra invece di "io" fisso; FilaMagieTrappole — l'evidenziazione
delle carte eleggibili per la catena ora confronta stato.catena.turnoDiPriorita contro il seme vero del
giocatore mostrato (non più solo "io"), l'attivazione libera di una Magia (attivabile) resta invece
riservata al seme "io" (attivaMagiaPiazzata nel reducer non è stata toccata, resta hardcoded — sezione
evocazione futura). PromptCombattimento.jsx/CatenaStriscia.jsx — tutti i confronti "=== io" sostituiti
con "=== prospettiva" (avanzamentoRichiesto, step "rifiuto", step "ripetizione", turnoDiPriorita della
catena); ConfrontoCombattimento continua a mostrare sempre "chi guarda" a sinistra/verde perché
prospettiva combacia sempre con la propria posizione durante quei prompt, per costruzione.
Esplicitamente FUORI da questo pezzo (limite noto, non un bug): il vecchio flusso a scelta singola per
Trappole "dopoTiro"/"attaccoDiretto" (comb.step==="trappola" fuori dalla catena, quando il campo
avversario è del tutto vuoto) NON è stato generalizzato — se capita a un difensore "avversario" umano
in 1v1 locale, la Trappola eleggibile viene ancora scelta a caso dall'euristica IA invece di chiedere a
lui. È lo stesso pezzo già segnato "Sezione 4 — DA FARE" nella roadmap della catena, indipendente da
1v1 locale, non ampliato qui per restare nello scope del pezzo.
Verificato: sweep headless di 200 partite vsIA complete (con attacchi/rifiuti/ripetizioni/bersagli
VERI di "io", non solo "continua" a raffica) zero crash — comportamento vsIA confermato invariato. Test
mirato con stato costruito a mano (poi cancellato) per lo scenario che un playthrough realistico non
può ancora raggiungere in questo pezzo (vedi sotto): attaccante "avversario" + difensore "io" E
viceversa, entrambi verificati — l'attacco si ferma correttamente allo step "bersaglio"/"rifiuto" invece
di auto-risolversi con l'euristica IA, e la dispatch esplicita (come la manderebbe la UI per un umano)
ha effetto.
LIMITE IMPORTANTE SCOPERTO A FINE PEZZO (non ancora comunicato prima, verificato provando a testare
dal vivo): questo pezzo rende il combattimento generico nel motore, ma finché l'EVOCAZIONE non è a sua
volta generalizzata (sezione futura, "infine evocazione/attacco"), il seme "avversario" non può mettere
alcuna creatura in campo da solo — quindi in una partita 1v1 locale reale il suo campo resta vuoto per
sempre, e gli scenari appena costruiti (avversario attacca, o avversario difende una propria creatura)
non sono ancora raggiungibili giocando dal vivo, solo tramite test headless con stato costruito a mano.
Non è un bug: è la conseguenza diretta di aver scelto di costruire "combattimento" prima di
"evocazione" nel piano a fasi concordato.

FASE 2 — evocazione base per l'altro seme (2026-08-15, secondo pezzo). Prima di scrivere codice,
verificato che la situazione qui è DIVERSA da quella del combattimento: `completaRifornimento` era già
generica (usa s.giocatoreAttivo ovunque), ma `continuaFase`, `selezionaMano` (~100 righe: Alieni con/
senza tributo, evocazione bonus, Magie con/senza bersaglio, Trappole), `selezionaTributo`,
`confermaTributo` erano hardcoded su `s.giocatori.io` NEL CORPO della funzione, non solo in un gate
d'ingresso — a differenza del combattimento, l'IA per l'evocazione usa una funzione completamente
separata e semplificata (`eseguiFaseEvocaIA`, sue euristiche proprie), non esiste un "cuore condiviso"
da sbloccare con un OR. Generalizzare TUTTA l'evocazione (bonus/Magie/Trappole comprese) sarebbe stata
una riscrittura vera — la domanda esplicita all'utente ha ristretto lo scope a "Alieni, con tributo,
niente Magie/Trappole/bonus" (quelle restano riservate al seme "io", sezione futura). Scoperto anche,
verificando prima di proporre, che evocare da sola non basta: il bottone "Continua"/"Pesca" (che fa
avanzare le fasi) era anch'esso hardcoded su "io" in App.jsx e nel reducer — senza generalizzarlo,
l'altro giocatore potrebbe evocare ma restare bloccato, incapace di arrivare alla propria fase
d'attacco o finire il turno. Confermato con l'utente (nessuna vera alternativa possibile) di includerlo
nello stesso pezzo.
Reducer: `completaRifornimento` — il binario IA (`s.iaInAttesa = "evoca"`) scatta solo se
modalitaGioco non è "1v1locale". `continuaFase` — generalizzata su `s.giocatoreAttivo` invece di "io"
fisso (permesso anche per "avversario" umano). Case "rifornimento" — gate d'ingresso allentato
(eseguiRifornimento era già generica). `selezionaMano` — riscritta con `chiave = s.giocatoreAttivo`,
`attivo`/`altro` al posto di `io`/`av`; il percorso Alieno (livello 1 diretto + tributo) è ora generico;
scarto-bonus/Trappola/Magia restano riservati a `chiave === "io"`, con un messaggio esplicito
("Non ancora disponibile per l'altro giocatore in questa modalità") invece di un click morto silenzioso
quando l'altro giocatore prova a giocarne una. `selezionaTributo`/`confermaTributo` — generalizzate su
`s.giocatori[s.giocatoreAttivo]`: sicuro senza un campo di stato dedicato "chi sta evocando" perché
s.modalita/s.manoSelezionata/s.tributiSelezionati si azzerano sempre in fineTurno, quindi non possono
mai sopravvivere a un cambio di giocatoreAttivo.
UI: Mano.jsx — `puoGiocare` (bottone principale Evoca/Attiva subito) generalizzato, `puoPiazzareCoperta`
(bottone secondario "Posiziona coperta", solo Magie) resta invece riservato al seme "io" (piazzaMagiaCoperta
non è stata toccata). App.jsx — nuove `turnoUmano`/`attivoTurno` sostituiscono i confronti sparsi
`giocatoreAttivo === "io"`/`stato.giocatori.io` in testoAzione, primoTurnoInPausa, inRifornimento,
azioneDisabilitata, puoAvanzareDiFase, blocco tributo (cartaTributo/valoreTributoScelto), e
nell'IndicatoreFasi (pallini di fase e "Turno di: te/avversario", prima invisibili/fermi per l'altro
seme anche a turno loro). Campo.jsx (CellaCreatura) — il click per selezionare una creatura come
tributo ora funziona anche per "avversario" con turno vero (stessa logica già usata per l'attaccante nel
pezzo precedente); lo spostamento in Fase 3 (muovi-creatura) resta riservato al seme "io", non toccato.
Verificato: sweep headless di 150 partite vsIA complete (con evocazioni/tributi VERI di "io", non solo
"continua" a raffica) zero crash. Test mirato con stato costruito a mano (poi cancellato): l'avversario
umano evoca un Alieno livello 1 senza tributo, poi un secondo con tributo (selezionaTributo × N +
confermaTributo), poi "continua-fase" lo porta correttamente in Fase 4 — e verificato simmetricamente
che una Trappola in mano gli viene rifiutata con il messaggio esplicito invece di un click morto.
Verificato ANCHE dal vivo nel browser (a differenza del pezzo precedente, qui è stato possibile: ora
l'evocazione chiude il cerchio) — playthrough reale: Giocatore 1 gioca un turno vuoto e passa il
telefono, Giocatore 2 vede "Turno di: te" e il pallino "3 PREPARATI ALLO SCONTRO" correttamente
evidenziati (prima restavano fermi/invisibili), evoca "Lucertola Schiva" toccando la carta e poi
"Evoca" nello zoom — la creatura compare subito nella sua prima linea, messaggio "Lucertola Schiva
evocata" — avanza da solo a "4 ATTACCO" ("Tocca una tua creatura per attaccare", pallino corretto),
preme "Fine turno" e il gioco richiede di nuovo "Passa il telefono a Giocatore 1", chiudendo il ciclo
completo. Nessun errore in console. Verificata anche l'assenza di regressione contro IA (bottone e
lancio moneta identici a sempre).
Ancora fuori scope (limiti noti, non bug): Magie/Trappole/evocazione bonus per l'altro seme; spostamento
in Fase 3 (muovi-creatura) per l'altro seme; il vecchio flusso Trappole "dopoTiro"/"attaccoDiretto" (già
segnalato nel pezzo del combattimento). Prossimi pezzi naturali: Magie/Trappole per l'altro seme, poi
spostamento Fase 3, per chiudere completamente il ciclo di un turno 1v1 locale.

FASE 2 — Magie/Trappole per l'altro seme (2026-08-15, terzo pezzo). Prima di scrivere codice, verificato
che `giocaMagia`/`magiaGiocabile` erano già generiche (parametrizzate, le usa anche l'IA) — la parte
mancante era solo il gate d'ingresso in `selezionaMano` e la funzione `applicaBersaglioMagia` (per le
Magie con bersaglio). Trovata una sottigliezza delicata verificando PRIMA di scrivere codice:
`applicaBersaglioMagia` gestisce due percorsi — Magia appena giocata dalla mano (durante il proprio
turno) E Magia "Rapida" già piazzata e riattivata tramite `attivaMagiaPiazzata`, che oggi può scattare
in QUALSIASI momento, anche durante il turno dell'altro giocatore (un meccanismo di interruzione già
esistente in vsIA, indipendente da 1v1 locale, mai toccato). Derivare sempre "chi sta scegliendo" da
`s.giocatoreAttivo` avrebbe rotto silenziosamente questo secondo caso. Soluzione: `chiave = daZona ?
"io" : s.giocatoreAttivo` — "da zona" (Magia già piazzata) resta sempre "io" per costruzione (identico
a prima, `attivaMagiaPiazzata` non è stata toccata in questo pezzo), "dalla mano" segue davvero chi ha
il turno. Stessa distinzione applicata al gate di scelta bersaglio in Campo.jsx (CellaCreatura), dove
prima si usava sempre `mia` (seme "io" fisso) per decidere se una creatura è "alleata" — sbagliato
quando è "avversario" a scegliere il bersaglio della propria Magia.
Scope confermato con l'utente PRIMA di implementare (con motivazione, non solo "cosa"): Trappole
coperte + Magie a effetto immediato dalla mano (con o senza bersaglio) per l'altro seme. ESCLUSO
"piazza Magia coperta per attivarla quando vuoi" (il bottone secondario, `piazzaMagiaCoperta`/
`attivaMagiaPiazzata`) — si intreccia proprio con la temporizzazione Rapida/interruzione sopra, mai
generalizzata nemmeno concettualmente, merita un pezzo a parte.
Reducer: `selezionaMano` — rimossi trappola/magia dal blocco "non ancora disponibile" (restava solo
evocazione bonus, ancora riservata a "io"); il percorso Trappola (piazza coperta) e Magia (immediato,
con o senza bersaglio) sono ora generici, riusano `attivo`/`altro` già introdotti nel pezzo precedente.
`applicaBersaglioMagia` — generalizzata con la distinzione daZona/dalla-mano sopra. UI: Campo.jsx
(CellaCreatura) — gate di scelta bersaglio-magia corretto con la stessa distinzione (`chiaveCaster`).
Nessun'altra modifica UI necessaria: il bottone "Evoca"/"Attiva subito" in Mano.jsx era già generico dal
pezzo precedente (instrada tutto tramite `selezionaMano`), quindi Trappole e Magie ora vi passano
attraverso automaticamente.
Verificato: sweep headless di 150 partite vsIA complete (con Magie/Trappole/tributo reali di "io", non
solo "continua" a raffica) zero crash. Test mirati con stato costruito a mano (poi cancellati):
l'avversario umano piazza una Trappola vera (rimossa dalla mano, aggiunta a magieTrappole coperta);
l'avversario lancia una Magia vera con bersaglio presa dal mazzo caricato (non un mock) — "Anello
Forgiato", bersaglio "alleato" — risolta correttamente. Verificato ANCHE dal vivo nel browser: turno di
Giocatore 2 (la moneta ha dato a lui l'inizio partita in questa sessione), piazza "Mezzo Fato Avverso"
(Trappola) toccando la carta poi "Piazza coperta" — appare coperta nella sua zona Magie e Trappole, non
capovolta (posizione bassa corretta); prova "Resuscita Alieno" (Magia, bersaglio dal proprio cimitero,
vuoto in quel momento) — rifiutata correttamente con "Resuscita Alieno: non ci sono bersagli validi
ora", lo stesso messaggio che riceverebbe "io" nello stesso caso, nessun click morto. Nessun errore in
console.
Ancora fuori scope (limiti noti, non bug): evocazione bonus, "piazza Magia coperta"/Magie Rapide, e
spostamento in Fase 3 (muovi-creatura) per l'altro seme; il vecchio flusso Trappole "dopoTiro"/
"attaccoDiretto" (già segnalato). Prossimo pezzo naturale: spostamento Fase 3 (muovi-creatura), l'ultimo
tassello per chiudere completamente il ciclo di un turno 1v1 locale.

FASE 2 — spostamento Fase 3 per l'altro seme (2026-08-15, quarto pezzo — ULTIMO TASSELLO). Prima di
scrivere codice, verificato che `muoviCreatura`/`confermaScambioRetrovia` controllano da sole
`giocatoreAttivo !== "io"` (a differenza di selezionaTributo/confermaTributo, non si appoggiano a
`s.modalita`) — nessuna sottigliezza nascosta stile "Rapida/daZona" del pezzo Magie: `s.movimentoSelezionato`/
`s.candidatoScambio` sono usati SOLO dentro queste due funzioni e si azzerano sempre a ogni transizione
di fase/turno (completaRifornimento, continuaFase, fineTurno), quindi sicuro generalizzarli su
`s.giocatoreAttivo` con lo stesso schema già consolidato (permesso = chiave==="io" || modalitaGioco
1v1locale). Generalizzate entrambe le funzioni + il gate del click in Campo.jsx (CellaCreatura, stessa
condizione `giocatore === stato.giocatori[stato.giocatoreAttivo]` già usata per tributo/attaccante).
Verificato: sweep headless di 100 partite vsIA (con spostamenti reali di "io", scambio prima
linea/retrovia a raffica) zero crash. Test mirato con stato costruito a mano (poi cancellato):
l'avversario umano completa il flusso a 3 tocchi completo (seleziona P1 in prima linea → candidatoScambio
→ "conferma-scambio-retrovia" → movimentoSelezionato → tocca R1 in retrovia → scambio completato,
verificate le posizioni finali di entrambe le creature). Verificato anche dal vivo: evocata una creatura
per Giocatore 2, il tentativo di spostarla lo stesso turno mostra correttamente "Evocata in questo
turno: non può cambiare fila fino al prossimo" (stesso messaggio/percorso di "io"), confermando che il
gate lascia passare la dispatch e la funzione la elabora correttamente. Nessun errore in console.

🎉 FASE 2 COMPLETA — il ciclo di un turno 1v1 locale è ora chiuso: rifornimento/pesca, avanzamento fasi,
evocazione Alieni (con tributo), Magie a effetto immediato, Trappole coperte, spostamento tra prima
linea e retrovia, e l'intero combattimento (bersaglio, difendi/rifiuta, diritto di ripetizione, catena su
attacco dichiarato) funzionano per ENTRAMBI i giocatori umani in 1v1 locale, con passaggio del telefono
automatico ad ogni cambio di chi deve decidere (anche a metà turno durante il combattimento).
Fuori scope, lasciato per pezzi futuri se richiesti: evocazione bonus; "piazza Magia coperta"/Magie
Rapide (si legano alla temporizzazione di interruzione, mai generalizzata); il vecchio flusso Trappole
"dopoTiro"/"attaccoDiretto" (auto-deciso dall'euristica IA anche in 1v1 locale, stesso limite già in
"Sezione 4" della roadmap catena, indipendente da 1v1 locale); nomi personalizzati per i due giocatori
(restano "Giocatore 1"/"Giocatore 2" per scelta esplicita dell'utente); Fase 3 (scenografia della
catena) e Fase 8 (ritmo/pacing) della roadmap catena originale.

SINCRONIZZAZIONE REGOLAMENTO ↔ ENGINE (2026-08-15). Richiesta esplicita dell'utente: trovare le "falle"
dove il regolamento (`Regolamento/Worldloom_Regolamento_v2.1.html`, 611 righe) e il motore vero
divergono, e aggiornare il regolamento. Letto il documento per intero e incrociato i capitoli più
delicati con il codice sorgente (non presunto dalla memoria): `costanti.js` (dadi per Archetipo, Ruota
di efficacia, PV iniziali, slot prima linea/retrovia, dado Imprevisti), `combattimento.js` (simmetria
Spada/Scudo col minimo mezzo Attacco, pareggio rosso su Spada vs pareggio innocuo su Scudo, effetti di
Ruolo Aggressore/Difensore/Tank/Bilanciato/Evasivo), `gameReducer.js` (consumo del diritto di
ripetizione per coppia attaccante-difensore, azzeramento a fine turno, rifiuto della difesa senza
contraccolpo). La stragrande maggioranza combacia con precisione, verificata riga per riga — inclusi i
5 dadi di reazione (tutti e 4 i simboli per Archetipo confrontati uno per uno contro `DADI_ARCHETIPO`).
Trovate 3 falle reali:
1. Cap. 14 "Risposte a catena", nota di revisione ORMAI SUPERATA: diceva "attivo per ora solo
   nell'attacco dichiarato... nelle prossime revisioni si estenderà anche a evocazione..." — ma la
   catena è già stata estesa anche all'evocazione (Sezione 3 del lavoro sulla catena, per bloccare "Il
   Rifiuto della Terra"/"L'Inganno Vincente", completata prima di questa sessione). Aggiornata la nota
   per elencare entrambe le finestre attive oggi, lasciando esplicito che Magie dirette dopo il tiro,
   Imprevisti ed effetti carta restano ancora sulla vecchia regola a scelta singola.
2. Cap. 10, Ruolo Evasivo — DISCREPANZA DI COMPORTAMENTO: il regolamento diceva "prima del colpo
   successivo PUÒ scambiarsi" (scelta del giocatore); l'engine (`combattimento.js`,
   `attivaEffettoEvasivo`, commento originale "semplificato") lo fa SEMPRE automaticamente alla 2ª
   Schivata contro lo stesso attaccante, senza mai chiedere nulla — nessuna dispatch/prompt coinvolti,
   verificato leggendo il punto esatto in cui viene chiamato in `gameReducer.js` (dentro la risoluzione
   del danno, incondizionato quando simbolo === "D"). Chiesto esplicitamente all'utente se allineare il
   testo o riportare la vera scelta nel motore: ha scelto di aggiornare solo il testo per ora. Cambiata
   la riga della tabella ("si scambia automaticamente"), aggiunta una nota di revisione dedicata (stesso
   stile "warn" già usato per la catena) che chiarisce che è una semplificazione dell'app, non una
   modifica alla regola pensata per il gioco fisico, e corretto anche l'esempio sotto (da "scambi" a
   "si scambia", seconda persona → automatico).
3. `Regolamento/rules.json` (dati di bilanciamento per chi progetta le carte in Excel, copiato in
   `src/data/generated/rules.json` dal build ma NON letto da nessuna parte del motore — verificato con
   grep, è dato inerte) aveva `"assalitore": {"scudo": 0}`, in contraddizione sia con la tabella del
   regolamento (scudo:1) sia col vero motore (`costanti.js`, `DADI_ARCHETIPO.Assalitore` ha 1 faccia
   Scudo su 8) — violerebbe pure il "vincolo di progettazione" del regolamento stesso (minimo 1 faccia
   per simbolo). Corretto a scudo:1/schivata:1 (prima era scudo:0/schivata:2, sempre 8 facce totali) per
   allinearlo a entrambi. Non è un bug di partita (file mai letto a runtime), solo un riferimento
   sbagliato per il game design.
Verificato che l'HTML resta valido dopo le modifiche (struttura dei div controllata a mano) e che
`rules.json` resta JSON valido (`JSON.parse` in Node). Nessuna modifica al motore in questo pezzo — solo
al testo del regolamento e al file di dati, come richiesto.

INFRASTRUTTURA E ROADMAP (2026-08-26 in poi) — pivot di scope esplicito dell'utente: prima di
proseguire con la lista dei 17 bug segnalati dal vivo, priorità a git/hosting, editor mazzi, sistema
di salvataggio, menu/restyling, PWA/APK. Roadmap concordata a 6 fasi: (1) git init + hosting gratuito,
(2) editor mazzi + bannlist, (3) sistema di salvataggio generale, (4) menu principale + restyling,
(5) PWA/APK, (6) i 17 bug originali, intercalati.

- **Fase 1 — Git**: repository inizializzato alla radice del progetto (`00 Worldloom - Claude Code -
  work space`), non solo in "App - HTML - Test" — recuperata anche una storia git preesistente di 22
  commit trovata annidata dentro "App - HTML - Test\.git" (mai notata prima), fusa nella storia
  unificata invece di scartata. `.gitignore` alla radice esclude node_modules/dist/generated, le
  cartelle Images sorgente pesanti (829MB, non necessarie al gioco vero), il grafo Graphify e un video
  di riferimento da 68MB. `.git` finale ~25MB. Verificato che Graphify continua a funzionare dopo il
  setup (rispetta il nuovo .gitignore, 378 nodi/22 comunità). Hosting vero e dominio (già posseduto
  dall'utente) rimandati apposta a quando l'app sarà più matura da mostrare in giro — decisione presa
  a parole con l'utente: costruire ora solo su un sottodominio gratuito temporaneo, senza collegare
  ancora il dominio reale né la protezione Cloudflare Access (gratuita, proposta e approvata per quando
  arriverà il momento), per non dover gestire un login in più durante mesi di iterazione pesante.
  Incidentalmente sistemato in questo giro anche un bug preesistente slegato dal lavoro: `sync-data.mjs`
  aveva il nome della cartella Kepler hardcoded prima che l'utente la rinominasse in "Marbion - Kepler -
  452 B...", causando uno SKIP silenzioso su build pulita — corretto e verificato.

- **Fase 2 — Editor Mazzi (completa)**: prima dell'editor vero e proprio, chiarito con l'utente (a
  parole, prima di scrivere codice) che oggi non esiste alcun concetto di "mazzo scelto" — il motore
  usa sempre l'intera collezione di un archetipo (`costruisciMazzo` espande ogni carta per il campo
  `copie`, che si è verificato rappresentare "quante ne esistono nel set fisico", NON un limite di
  costruzione — valori reali molto vari, es. Frost Land ha carte a `Copie:1` e `Copie:2`, mai 3).
  Serviva quindi un limite di costruzione mazzo separato: nuova colonna Excel **`Limite Copie`**
  (proposta da Claude su richiesta esplicita dell'utente), aggiunta sia al foglio "Carte" sia al foglio
  "Imprevisti" di entrambi gli Excel (`FrostLand_carte.xlsx`, `Kepler452B_carte.xlsx`) via script
  openpyxl, lasciata vuota ovunque (nessuna eccezione ancora). Vuota = regola standard (max 3 per il
  Worldloom, max 2 per gli Imprevisti — cap. 15 del regolamento, "minimo 10 carte, massimo 2 copie
  identiche" — mai comunque più delle `copie` stampate); un numero = eccezione esplicita, 0 = carta
  bandita. `genera_cards_json.py` legge la colonna → campo `limiteCopie` (numero o `null`) su ogni
  carta del Worldloom e ogni Imprevisto. Corretta anche la riga ormai imprecisa su `Copie` nel foglio
  "Come compilare".
  Nuovo modulo puro `src/game/mazziSalvati.js`: `limiteCopieCarta`, `validaMazzo` (quantità nei limiti,
  nessuna carta fantasma, Worldloom 40-60 totali, Imprevisti minimo 10), `espandiListaMazzo`, CRUD
  completo su `localStorage` (chiave `wl_mazzi_salvati`) — `elencaMazziSalvati`, `ottieniMazzo`,
  `creaMazzoVuoto`, `salvaMazzo`, `eliminaMazzo`, `duplicaMazzo`. Agganciato al motore vero:
  `costruisciMazzo`/`costruisciMazzettoImprevisti` (mazzo.js) accettano ora una lista esplicita
  opzionale — assente = comportamento di sempre (mazzo intero); `nuovoGiocatore`/`nuovaPartita`
  inoltrano `listaMazzo`/`listaMazzoAvversario` (due nuovi campi opzionali e indipendenti nella dispatch
  "nuova-partita").
  UI: nuovo componente `src/components/EditorMazzi.jsx`, raggiungibile da un nuovo pulsante
  "🛠️ Editor Mazzi" nella schermata iniziale (provvisorio: la posizione definitiva sarà nel menu
  principale della Fase 4). Lista mazzi salvati per archetipo (Modifica/Duplica/Elimina/+Nuovo) →
  schermata di modifica con nome editabile, due tab (Worldloom/Imprevisti), contatori live
  verdi/rossi, stepper − / + per carta che si blocca da solo al limite, **filtri per Tipo
  (Alieno/Magia/Trappola), Archetipo (Viandante/Assalitore/Effimeri/Colosso/Tessitore — i cinque
  Archetipi di combattimento per il dado di reazione, non l'archetipo/fazione Frost Land vs Kepler) e
  Ruolo** (richiesti esplicitamente dall'utente) — le opzioni di entrambi i filtri si costruiscono da
  sole guardando le carte reali dell'archetipo, invece di essere hardcoded, così restano corrette anche
  aggiungendo nuovi valori in futuro; Magie/Trappole (che non hanno Archetipo/Ruolo) restano sempre
  visibili a prescindere dal filtro attivo, non scompaiono. Salvataggio bloccato con l'elenco preciso
  degli errori se il mazzo non è valido.
  Schermata iniziale: sotto ciascuno dei due dropdown archetipo ("Tuo mazzo"/"Mazzo avversario") un
  nuovo dropdown elenca i mazzi salvati per quell'archetipo (più "Mazzo intero", sempre disponibile,
  sempre prima opzione) — un mazzo salvato ma diventato invalido nel frattempo (carta rimossa
  dall'Excel dopo il salvataggio) resta visibile ma disabilitato, per non far sparire silenziosamente
  il lavoro fatto nell'editor. La scelta si azzera da sola su "Mazzo intero" quando cambia l'archetipo
  (un mazzo salvato appartiene a un solo archetipo). `risolviListaMazzo` (App.jsx) traduce la scelta in
  `{worldloom, imprevisti}` per la dispatch, ripiegando su "mazzo intero" se il mazzo scelto è diventato
  invalido — mai lasciare partire una partita con un mazzo rotto. Applicato a entrambi i punti che
  dispatchano "nuova-partita" (il flusso vero via LancioMoneta, e un secondo bottone "Nuova partita"
  ridondante trovato dentro la barra azioni — sistemato anche lui per coerenza, non toccato altrimenti).
  Verificato: test headless usa-e-getta (poi cancellati) su `mazziSalvati.js` in isolamento (31
  controlli) e sull'aggancio al reducer con dati veri (9 controlli + sweep di 30 partite, zero crash).
  Verificato ANCHE dal vivo nel browser end-to-end: editor aperto senza errori console, filtro "Magie"
  isola correttamente le Magie, stepper si ferma da solo al limite, salvataggio bloccato con gli errori
  giusti sotto i 40, "Annulla" non salva nulla, mazzo di prova valido (40 Worldloom + 10 Imprevisti)
  iniettato in `localStorage` e scelto dalla schermata iniziale → partita reale mostra "WORLDLOOM 34"
  (40 − 6 pescate, io gioco per secondo) contro "WORLDLOOM AVVERSARIO 69" (Kepler intero, 74 − 5, IA
  senza mazzo scelto) e "IMPREVISTI TUOI 10" — conferma numerica esatta che il mazzo scelto viene
  davvero usato, non solo mostrato nel menu.
  Fuori scope per questo giro (non richiesto, non implementato): rinominare un mazzo dalla lista senza
  aprirlo, un'anteprima "cosa contiene" prima di aprire l'editor, ricerca testuale per nome carta nei
  filtri.

- **Editor Mazzi — pivot "lista unica" (2026-08-26)**: subito dopo il completamento sopra, l'utente ha
  chiesto un cambio di modello: "i mazzi devo poterli comporre da una sola lista contenente tutte le
  carte, i mazzi possono essere un misto di mondi e archetipi" + filtro Mondo in più. Prima di scrivere
  codice, verificato (non presunto) che le carte "neutrali" duplicate tra i due Excel (17 Magie/Trappole
  + tutti gli 8 Imprevisti, es. "Aura di Marbion") hanno dati E immagine IDENTICI in entrambi i mondi
  (hash MD5 uguale) — quindi deduplicabili in sicurezza in un catalogo unico, senza perdere né alterare
  nulla.
  `src/data/useMazzi.js`: nuova `getCatalogoUniversale()` — unisce `carte`/`imprevisti` di TUTTI i mondi
  disponibili, deduplicati per nome, ogni carta annotata con `mondi: [id,...]` (per il filtro/badge
  Mondo). `getImmagineCarta(mazzoId, nomeCarta)` non richiede più un mazzoId esatto: prova prima quello
  passato (hint/preferenza), poi ricade sugli altri mondi se non trovata — nessuna modifica ai 12 punti
  dell'app che già la chiamano (Carta.jsx, Campo.jsx, Mano.jsx, le animazioni, ecc.), sicuro perché le
  carte condivise hanno la stessa immagine ovunque compaiano.
  `src/game/mazziSalvati.js`: rimosso il concetto "un mazzo = un archetipo" — `creaMazzoVuoto`/
  `elencaMazziSalvati` non prendono più un `archetipoId` (un vecchio mazzo con quel campo lo mantiene
  nell'oggetto, innocuo/ignorato). `validaMazzo`/`espandiListaMazzo` restano invariate nella firma (già
  generiche): ora si passa loro il catalogo universale invece della cardsData di un solo mondo.
  `EditorMazzi.jsx`: riscritto — nessuno scoping per mondo, `cardsData` è sempre
  `getCatalogoUniversale()`; nuovo filtro **Mondo** (Frost Land/Kepler-452B) accanto a Tipo/Archetipo/
  Ruolo, una carta soddisfa il filtro Mondo se compare in quel mondo (una condivisa soddisfa entrambi);
  ogni riga mostra ora anche un badge "Mondo" (es. "Frost Land + Kepler-452B" per le condivise).
  `App.jsx`: `SelettoreListaMazzo` elenca ora TUTTI i mazzi salvati (non più filtrati per l'archetipo
  scelto sopra, dato che un mazzo può mescolarli) — il dropdown archetipo resta comunque utile per
  l'opzione "Mazzo intero" (un solo mondo, comportamento di sempre). `risolviListaMazzo` valida sempre
  contro il catalogo universale; quando un mazzo salvato è scelto, anche il `cardsData` mandato alla
  dispatch "nuova-partita" diventa il catalogo universale (invece del singolo mondo), altrimenti
  `espandiListaMazzo` non troverebbe le carte dell'altro mondo nel mazzo misto.
  Verificato: build pulita. Dal vivo nel browser (via `javascript_tool`, il pannello non era
  compositato in questa sessione — screenshot/click reali non disponibili, verificato tutto via
  DOM/fetch diretti): lista unificata con entrambi i mondi e badge corretti; "Aura di Marbion" compare
  UNA sola volta con badge "Frost Land + Kepler-452B"; filtro Mondo=Kepler-452B mostra solo carte
  Kepler + condivise, esclude correttamente le Frost-Land-only; entrambi i dropdown pre-partita
  elencano lo stesso mazzo salvato indipendentemente dall'archetipo scelto sopra. Costruito e validato
  (con la logica REALE del motore, non un mock) un mazzo volutamente MISTO — Frost Land + Kepler +
  una condivisa — iniettato in `localStorage`: `validaMazzo` lo accetta, `espandiListaMazzo` trova
  tutte le 40 carte senza perderne nessuna; avviata una partita vera con quel mazzo per "io" (mazzoId
  "frost-land" scelto sopra) e l'IA con Kepler intero — "WORLDLOOM 40" (il mazzo misto, non la
  collezione intera) confermato in campo, "IMPREVISTI TUOI 10" corretto, le 6 carte pescate si sono
  tutte caricate correttamente (nessuna immagine rotta, nessun errore console). Confermato anche via
  `fetch` diretto che "manipolatrice-rossa.jpg" (una carta SOLO Kepler) esiste fisicamente solo nella
  cartella kepler-452b (Frost Land risponde con la pagina SPA di fallback, non l'immagine) — la
  premessa esatta su cui si basa il fallback cross-mondo di `getImmagineCarta`. Limite della verifica:
  non sono riuscito a catturare in questa sessione una carta SOLO-Kepler effettivamente pescata in mano
  mentre mazzoId="frost-land" (il pannello browser non compositava, niente click reali/screenshot, e le
  6 carte pescate in questo giro sono capitate tutte Frost-Land o condivise) — il codice del fallback è
  comunque semplice, letto riga per riga e già usato con successo per le carte condivise; rischio
  residuo basso, da confermare a colpo d'occhio alla prossima sessione con un pannello funzionante.

- **Sistema di salvataggio (2026-08-26)**: Fase 3 della roadmap infrastruttura. Decisioni confermate
  con l'utente prima di scrivere codice: UN solo slot di partita in sospeso (non stile videogioco a
  slot multipli); statistiche = totali vittorie/sconfitte + per mazzo/archetipo (non anche per
  modalità IA/1v1, non richiesto).
  **Salvataggio partita** (`src/game/salvataggio.js`): lo stato di gioco è già un oggetto JS semplice
  (nessuna funzione/Map/Set), si serializza diretto in `localStorage` (`wl_partita_salvata`).
  Autosalvataggio automatico ad ogni mossa (nessun bottone "Salva"), nessun filtro in scrittura — la
  pulizia avviene solo in lettura (`caricaPartita`), un unico punto invece che ad ogni salvataggio:
  i campi "in corso"/di sola messa in scena (dado che gira, carta che vola, coda di eventi visivi,
  notifica da chiudere, fase/imprevisto "pinnati" — 14 campi in tutto, elencati esplicitamente in
  `CAMPI_TRANSITORI_A_NULL`) tornano a riposo al ripristino, perché il timer/dispatch che li avrebbe
  sbloccati non esiste più nella nuova sessione; lo stato di gioco VERO (combattimento in corso,
  catena aperta, chi deve scegliere l'avanzamento) resta intatto, non è "di sola scena".
  **Bug potenziale trovato e prevenuto in fase di progettazione** (mai arrivato a runtime): il
  contatore id/`_uid` delle carte (`mazzo.js`, `prossimoId`) riparte da 0 ad ogni apertura dell'app —
  senza intervento, una carta pescata DOPO un ripristino avrebbe potuto ricevere lo stesso id di una
  carta già presente nel salvataggio (bersagli/scelte sbagliate in gioco, non solo un problema di
  key React). Fix: nuova `garantisciContatoreIdAlmeno(minimo)` in `mazzo.js`; `caricaPartita` scansiona
  ricorsivamente `stato.giocatori` per il massimo id/_uid presente e sposta in avanti il contatore
  prima di restituire lo stato ripristinato.
  **Reducer** (`gameReducer.js`): due nuovi case — `"carica-stato"` (sostituisce di netto lo stato con
  quello ricaricato, nessuna logica) e `"abbandona-a-menu"` (torna a `null` SENZA cancellare il
  salvataggio — l'autosave l'ha già scritto, uscire a metà partita non è distruttivo). `nuovaPartita`
  accetta due nuovi parametri opzionali `identitaMazzoIo`/`identitaMazzoAvversario` (`{chiave, nome}`),
  copiati dentro lo stato stesso invece di restare solo in App.jsx: le statistiche a fine partita
  leggono SOLO lo stato, così restano corrette anche se nel frattempo l'utente ha cambiato la
  selezione del dropdown per la prossima partita, o quel mazzo è stato rinominato/eliminato.
  **Statistiche** (`src/game/statistiche.js`, chiave `wl_statistiche`): `registraEsitoPartita`
  incrementa un totale globale + una voce per `chiaveMazzo` (l'id del mazzo salvato, o
  `intero:<archetipoId>` per un "Mazzo intero"). Il nome mostrato si aggiorna sempre all'ultimo
  visto (un mazzo rinominato dopo non lascia il nome vecchio in giro).
  **App.jsx**: nuovo `useEffect` di autosalvataggio (si cancella da solo a `stato.vincitore`, invece
  di salvare uno stato ormai concluso); nuovo `useEffect` di registrazione statistiche, con un `useRef`
  (non uno stato) per registrare l'esito UNA sola volta per partita — la chiave del "già fatto" è
  `partitaAvviataAlle` (id univoco per-partita già esistente dal cap. 1v1 locale), non `vincitore`
  stesso, perché due partite diverse potrebbero finire entrambe con "io" vincitore e la seconda
  andrebbe comunque contata. Nuovo bottone **"▶ Riprendi partita"** in `SchermataIniziale` (visibile
  solo se esiste un salvataggio), dispatcha `"carica-stato"` bypassando completamente `LancioMoneta`
  (non è una partita nuova). Nuovo bottone **"🏠 Menu"** in `Intestazione`, visibile durante una
  partita non ancora conclusa, dispatcha `"abbandona-a-menu"` senza chiedere conferma (non distruttivo,
  già salvata). Iniziare una partita NUOVA (Gioca IA / 1v1) mentre ce n'è una in sospeso è l'UNICO
  punto davvero distruttivo del sistema — `confirm()` prima di procedere.
  **UI statistiche**: badge "🏆 N vittorie · N sconfitte (N partite)" su ogni mazzo salvato in
  `EditorMazzi.jsx` (stessa chiave `m.id` scritta da `identitaMazzo()`); riga compatta con il totale
  complessivo in fondo a `SchermataIniziale` (visibile solo se `partite > 0`).
  Verificato con test headless usa-e-getta (poi cancellati): salva/ricarica con campi transitori
  popolati a mano → tutti azzerati al ripristino, `combattimento`/`catena` (stato reale) preservati;
  contatore id dopo il ripristino verificato SIA superiore al massimo esistente SIA non collidente con
  nessun id/_uid già presente; JSON corrotto o oggetto senza `giocatori` → `caricaPartita` ritorna
  `null` invece di esplodere; ciclo completo nuova-partita→salva→abbandona→carica-stato→la partita
  CONTINUA a funzionare normalmente (dispatch reali, non solo lettura) fino a fine turno multipli;
  `registraEsitoPartita` × 3 con mazzi diversi → totali e per-mazzo tutti corretti, nome aggiornato
  correttamente; sweep di 60 partite complete con `identitaMazzoIo` impostata, zero crash. Verificato
  ANCHE dal vivo nel browser: avviata una partita, confermato l'autosalvataggio scritto in
  `localStorage` e il bottone "🏠 Menu" presente; cliccato "Menu" → tornato alla schermata iniziale con
  "▶ Riprendi partita" visibile; cliccato "Riprendi partita" → partita ripresa ESATTAMENTE allo stesso
  punto (stesso turno, stessa mano, stesso conteggio Worldloom/Imprevisti), nessun errore console;
  intercettato `window.confirm` per verificare che "Gioca contro IA" con un salvataggio esistente lo
  chiami col messaggio giusto e, rifiutando, NON sovrascriva nulla (resta su "Riprendi partita").
  Non verificata dal vivo la registrazione statistiche a fine partita reale (richiederebbe portare una
  partita fino alla vittoria, lungo da automatizzare) — coperta con fiducia alta dal test headless
  sopra, che chiama la stessa identica funzione nello stesso modo in cui la chiamerebbe App.jsx.

RIPRESA LISTA BUG DAL VIVO (2026-08-26) — prima di riprendere in mano la vecchia lista di 17 punti
(scritta mesi prima, quando molto del motore era diverso), fatto un riaudit puntuale nel codice invece
di fidarsi della lista com'era: diversi punti risultano già superati dal lavoro fatto nel frattempo
(coda di animazioni, catena effetti, redesign dell'indicatore fasi), uno risultava già a posto
(icona ℹ sul Terreno avversario, mai stata condizionata al lato), altri restano confermati aperti.
Confermate anche due decisioni di design in sospeso da tempo: l'ordine del combattimento dev'essere
"difendi/incassa → dado → balzo animato → calcolo danni → se vantaggio/svantaggio: tieni o ritenta"
(non l'ordine attuale, dove l'animazione precede sempre il pop-up — da fare); Magie/Trappole vanno
attivate SOLO dopo lo zoom della carta, non più col tocco diretto della carta pronta sul campo che il
meccanismo della catena (cap. catena.js/CatenaStriscia.jsx) usa oggi — da fare, tocca anche la catena.

- **Menu a tendina delle fasi non si chiudeva cliccando fuori** [FATTO]: `IndicatoreFasi` (App.jsx) non
  aveva mai avuto un gestore "click fuori" — aggiunto un `useRef` sul contenitore pillola+menu e un
  `useEffect` che, quando il menu è aperto, ascolta `mousedown` a livello di documento e lo chiude se
  il click è fuori dal contenitore (`mousedown` invece di `click`, per non correre contro il toggle del
  bottone chevron stesso). Verificato dal vivo: apre, un click altrove lo chiude, cliccare una voce
  interna continua a funzionare come prima, nessun errore console.
- **Indicatore di fase mostrava quella attuale invece della successiva** [FATTO]: la pillola cliccabile
  (quella che avanza la fase) mostrava il nome della fase in cui sei ORA — richiesta confermata
  dall'utente tempo fa ("mostriamo la fase successiva") mai implementata nel frattempo, anche perché il
  componente è stato riscritto da zero da allora (task 16/pacing). Ora, quando è cliccabile (puoi
  davvero avanzare), il testo mostra "→ Nome prossima fase" invece del nome della fase attuale — il
  monogramma/colore restano quelli della fase attuale (ancora l'ancoraggio visivo di "dove sei"), il
  menu a tendina sotto continua a marcare la fase attuale con un pallino. Quando NON è cliccabile
  (non è il tuo turno, o sei già all'ultima fase) torna a mostrare quella attuale, come prima — non
  c'è una "prossima" verso cui invitare. Verificato dal vivo: saltato a Fase 3 (Schieramento), la
  pillola mostra correttamente "→ Alla Carica".
- **Tributo bloccato quando il campo è "pieno"** [FATTO] — root cause più profonda di quanto sembrasse
  a prima vista: non bastava spostare il controllo `campoPieno` nel chiamante (`selezionaMano` in
  gameReducer.js, comunque corretto e fatto), perché `puoEvocareNormale` (evocazione.js) aveva un
  proprio controllo INTERNO di `campoPieno` che bloccava a monte qualunque evocazione — livello 1
  diretto E tributo indistintamente — prima ancora di guardare `valoreTributi`. Corretto spostando il
  controllo campo-pieno dentro il solo ramo `carta.livello === 1`: un tributo (livello 2+) sacrifica
  sempre almeno una creatura del proprio campo prima di aggiungerne una nuova (`confermaTributo`
  richiede `tributiSelezionati` per un valore >= `carta.livello`, mai zero per un costo >= 2), quindi
  non può mai far salire il conteggio oltre il limite — non va bloccato solo perché il campo è pieno
  ORA. `puoEvocareBonus` (sempre livello 1, nessun sacrificio) resta invariato, giustamente bloccato da
  campo pieno. Effetto collaterale positivo: `puoEvocareNormale` è la stessa funzione usata da
  `eseguiFaseEvocaIA`, quindi anche l'IA ora può fare tributi a campo pieno, non solo "io" (non
  richiesto esplicitamente ma corretto/coerente, stesso motore per entrambi). Verificato con test
  headless dedicato (poi cancellato) costruendo uno stato con campo "io" pieno a 5 creature non fresche:
  selezionare una carta di tributo dalla mano ora apre la modalità tributo invece del messaggio "Campo
  pieno"; il flusso tributo completo (seleziona-tributo × N + conferma-tributo) evoca correttamente la
  creatura e il campo finale non supera mai 5; controllo di non-regressione esplicito che un'evocazione
  DIRETTA (livello 1) resta bloccata a campo pieno come prima. Sweep di 80 partite complete, zero crash.

- **Sequenza di combattimento riordinata** [FATTO] (bug 4 della lista, confermato dall'utente con la
  sequenza esatta a parole prima di scrivere codice, poi corretta una volta — vedi sotto). Sequenza
  finale implementata: attacco dichiarato (bersaglio si evidenzia di rosso) → finestra Trappole se
  c'è qualcosa da attivare → **Difendi o incassa, SUBITO, prima di qualunque dado/animazione** → se
  incassa: danno pieno, fine → se difende: **dado gira** → se il simbolo dà vantaggio/svantaggio:
  **"Vuoi ritentare?" SUBITO dopo aver visto il simbolo** (non dopo il danno — l'utente ha corretto
  esplicitamente questo punto rispetto alla mia prima proposta) → se ritenta, si torna al dado; se
  tiene, si procede → **balzo animato** → **calcolo danni** mostrato → finestra "al calcolo dei
  danni"/Magie Rapide (vedi sotto) → esito applicato per davvero.
  Cambio di prospettiva chiave scoperto leggendo il codice PRIMA di scrivere qualunque riga: la
  LOGICA del reducer chiedeva già "ritenta?" prima di applicare il danno (decidiDifesa non chiama mai
  risolviDannoCombattimento finché l'eventuale diritto di ripetizione non è stato deciso) — il
  problema era SOLO nella presentazione visiva: il balzo (registraAnimazioneAttacco) partiva troppo
  presto, dentro scegliBersaglio, PRIMA del pop-up Difendi. Niente "annulla e riapplica" rischioso sul
  danno: bastava spostare QUANDO il balzo viene messo in coda.
  `scegliBersaglio`: rimossa la registrazione del balzo (comb.idBalzoRichiesto = null esplicito) — il
  bersaglio resta comunque evidenziato di rosso subito (comb.difensoreId, invariato). `applicaSimbolo`:
  il balzo viene registrato qui, appena prima di risolviDannoCombattimento — è l'UNICO punto in cui il
  simbolo può dirsi davvero definitivo (dopo eventuali ritiri Mago Sorprendente/diritto di
  ripetizione/Trappole "dopoTiro"), coprendo per costruzione ogni percorso (nessun decisore, diritto
  tenuto, diritto usato con ritiro) perché tutti convergono qui. PromptCombattimento.jsx non ha
  richiesto modifiche alla guardia esistente (comb.idBalzoRichiesto != null && ...): semplicemente,
  non essendo più impostato per gli step "trappola"/"rifiuto", quella guardia non blocca più nulla lì
  — si sblocca da sola quando arriva al punto giusto.
  **Finestra "al calcolo dei danni"/Magie Rapide** — imbastita su richiesta esplicita ("le carte nei
  quali è menzionato nell'effetto quello che ti ho scritto faranno partire l'effetto della carta"):
  verificato PRIMA di scrivere codice che NESSUNA carta esistente oggi ha davvero bisogno di questo
  aggancio (letti tutti i testi che nominano "danno": sono tutti già gestiti da altri meccanismi —
  Terreni, Lo Specchio Travolgente — nessuno è una vera "reazione dell'ultimo istante"). `risolviDannoCombattimento`
  divisa in due fasi: calcolo dei numeri (dannoDifensore/dannoAttaccante/pareggioMortale, INVARIATO) e
  applicazione vera (mutazione delle creature, INVARIATA) — tra le due, un controllo di eleggibilità
  con `carteEleggibiliPerRisposta` su un nuovo tipo di evento `"calcoloDanni"` (mai riconosciuto da
  nessun predicato in ELEGGIBILITA_RISPOSTA oggi, quindi sempre vuoto) — se mai risultasse non vuoto in
  futuro, per ora si limita a scrivere un avviso nel log invece di aprire una vera finestra a catena:
  wireare un percorso a catena asincrono (apriFinestraCatena/avanzaCatena + un ramo dedicato in
  risolviFrameCatena) mai esercitato da nessuna carta vera è stato giudicato troppo rischioso da
  costruire alla cieca — un frame che nessuno sa risolvere bloccherebbe il turno silenziosamente.
  Quando arriverà la prima carta reale con questo effetto, il punto d'aggancio è già lì, commentato
  con lo schema esatto da seguire (stesso schema di attaccoDichiarato/evocazione).
  Verificato con test headless dedicato (poi cancellato, 17 controlli): scelto il bersaglio, nessun
  balzo ancora in coda (bersaglio comunque rosso); "difendi" mette in coda SOLO il dado quando c'è un
  diritto di ripetizione in sospeso (mai balzo/esito insieme); "tieni così" mette in coda balzo poi
  esito, MAI un nuovo dado; "ritenta" mette in coda un nuovo dado; senza diritto di ripetizione, la
  stessa dispatch "difendi" risolve dado→balzo→esito nell'ordine giusto nella stessa coda; "rifiuta la
  difesa" non mette in coda né dado né balzo. Sweep di 60 partite complete zero crash + controllo
  esplicito su 100 partite che l'avviso "calcoloDanni" non scatti mai con i dati reali attuali
  (confermato: mai scattato). Verificato anche dal vivo: build pulita, nessun errore console.

- **Zoom prima di attivare Magie/Trappole** [FATTO] (bug 14, richiesta esplicita: "richiedi lo zoom
  prima" invece del tocco diretto sulla carta pronta/eleggibile — sostituisce quel meccanismo, non lo
  affianca). `DettaglioCarta.jsx` aveva già tutto il necessario: lo stesso pattern `onEvoca`/
  `etichettaAzione` che Mano.jsx usa da tempo per giocare una carta dalla mano — riusato pari pari,
  nessun componente nuovo. In Campo.jsx: `onZoom` guadagna un terzo parametro opzionale `azione`
  ({etichetta, onConferma}); lo stato `zoom` di `Campo()` lo porta con sé, e il render di
  `<DettaglioCarta>` passa `onEvoca={() => { zoom.azione.onConferma(); setZoom(null) }}` solo quando
  presente. `FilaMagieTrappole`: le due situazioni che prima dispatchavano subito al tocco (carta
  eleggibile per la catena → "catena-aggiungi-trappola"; Magia piazzata liberamente attivabile →
  "attiva-magia-piazzata") ora calcolano invece un `azioneAttivazione` e chiamano `onZoom(mt.carta,
  undefined, azioneAttivazione)` — sia toccando la carta sia toccando l'icona ℹ, stesso zoom con lo
  stesso bottone "Attiva"/"Aggiungi alla catena", nessuna doppia esperienza a seconda di dove tocchi.
  Verificato dal vivo iniettando in `localStorage` (via il sistema di salvataggio appena costruito) una
  partita minimale con una Magia piazzata coperta e pronta: toccare la carta ha aperto lo zoom con il
  bottone "Attiva" — la carta NON si è attivata subito (verificato: restava ancora lì, non ancora
  scartata); toccando "Attiva" è partita davvero la dispatch reale ("Anello Forgiato: non ci sono
  bersagli validi ora" — rifiutata solo perché lo scenario di test non aveva un Alieno bersaglio in
  campo, comportamento atteso, prova diretta che il dispatch è arrivato al reducer). Non ripetuto lo
  stesso test end-to-end per il ramo "eleggibile per la catena" (stesso identico codice/pattern,
  rischio residuo basso). Build pulita, nessun errore console.

- **Animazione di evocazione — mancante per l'IA + redisegnata per entrambi** [FATTO] (bug 3 della
  lista + segnalazione dal vivo "vola dritto come un fulmine, confusionario"). Discusso a parole
  prima di scrivere codice: la vecchia sequenza (Sezione 4) volava dritta dalla mano allo slot in
  ~0,3s con solo un piccolo anello d'impatto — nessuna sosta per leggere cosa fosse stato evocato.
  Nuova sequenza, uguale per "io" e per l'avversario: solleva dalla mano → **vola al centro schermo
  ingrandendosi** (scala 3.2×, stesso linguaggio dello zoom ℹ) → **sosta 650ms leggibile** → vola
  verso lo slot finale rimpicciolendosi → **impatto più marcato** (0.35s invece di 0.25s, picco/bordo
  più intensi). Durata totale ~2s (prima ~0,8s).
  **Perché mancava per l'IA**: `avviaVoloEvocazione` (gameReducer.js) aveva un `if (!sorgenteRect)
  return;` esplicito — l'IA non ha mai un click reale da cui misurare una posizione di partenza, quindi
  l'evento non veniva mai creato e la creatura appariva di scatto. Rimossa quella guardia:
  `sorgenteRect` è ora opzionale nello stato (`?? null`); `AnimazioneEvocazione.jsx`
  (`CartaEvocata`), quando manca, calcola da sola una posizione di partenza di fallback interrogando
  il DOM per un nuovo `data-zona="mano-avversaria"`/`"mano-mia"` aggiunto su `ManoAvversaria`/`Mano`
  in Mano.jsx (sempre presenti, a differenza di un click che potrebbe non esserci) — la funzione nel
  reducer resta pura, nessun riferimento a `document` lì. Aggiunte le due chiamate mancanti a
  `avviaVoloEvocazione` in `eseguiFaseEvocaIA` (livello 1 diretto e livello 2+ con tributo — prima
  nessuna delle due la chiamava). **Bug di pacing trovato progettando**: `iaBloccataDaPrompt` (App.jsx,
  il timer che scandisce i passi del turno IA) non includeva `evocazioneInCorso` — con l'evocazione
  IA ora animata, l'attacco successivo avrebbe potuto partire mentre la carta stava ancora volando.
  Aggiunto alla lista di condizioni, stesso principio già usato per `pescaInCorso`/`morteInCorso`.
  Verificato con test headless dedicato (poi cancellato): fatto avanzare l'IA fino a farla evocare,
  confermato `evocazioneInCorso` popolato con `chiave: "avversario"` e `sorgenteRect: null`; sweep di
  80 partite complete zero crash. Verificato dal vivo iniettando uno stato con l'evocazione
  dell'avversario già in corso: screenshot a metà animazione conferma la carta ("Manipolatrice Rossa")
  visibilmente più grande delle altre carte sullo schermo mentre vola verso la prima linea avversaria
  — non più il balzo diretto istantaneo di prima. Build pulita, nessun errore console.

- **Consolidamento Pausa/Ricomincia/Opzioni in un pannello solo** [FATTO] (l'utente ha fermato il
  lavoro per chiedere conferma: non voleva un bottone "🏠 Menu" separato in testata PIÙ un pannello
  ⚙️ Opzioni a parte — un solo pannello per tutto). Rimosso il bottone "🏠 Menu" da Intestazione;
  spostato `<PannelloOpzioni />` da fratello di `<GameProvider>` a figlio suo (prima stava
  apposta fuori per non essere mai rimontato quando cambia l'archetipo scelto, dato che
  `GameProvider` ha `key={"{mazzoId}"}") — necessario perché "Pausa"/"Ricomincia" devono leggere/
  dispatchare lo stato di gioco vero (`useGame()`), disponibile solo dentro il Provider. Effetto
  collaterale accettato ed esplicitato nel commento: cambiare l'archetipo dal menu a tendina in
  testata ora rimonta anche `PannelloOpzioni` (quindi l'audio di sottofondo riparte da capo in quel
  momento) — non capitava prima, ma è un'azione rara e la preferenza (attiva/disattivata) resta
  comunque letta da `localStorage`, nessuna perdita di dati. Pannello Opzioni ora mostra, quando
  pertinenti: "⏸ Partita in corso / Pausa" (solo se una partita è aperta e non conclusa — stessa
  dispatch "abbandona-a-menu" di prima, non distruttiva), "🔄 Ricomincia" (se c'è una partita aperta O
  un salvataggio in sospeso — cancella il salvataggio e, se una partita è aperta, la abbandona pure;
  chiede conferma, unico punto distruttivo), "🎵 Musica di sottofondo" (invariata).
  **Bug trovato testando dal vivo, non a tavolino**: cliccando "Ricomincia" mentre si è GIÀ sulla
  schermata iniziale (nessuna partita aperta, solo un salvataggio in sospeso da scartare), il
  salvataggio veniva davvero cancellato ma il bottone "▶ Riprendi partita" restava visibile finché
  non succedeva qualcos'altro — perché `cancellaPartitaSalvata()` tocca `localStorage`, un side-effect
  che React non vede da solo, e in quel caso non scattava nessun dispatch reale (stato già null) che
  potesse far ri-renderizzare lo schermo. Corretto aggiungendo un piccolo contatore `tickSalvataggio`
  al GameContext (incrementato da un nuovo `segnalaSalvataggioCambiato()`, chiamato da PannelloOpzioni
  dopo aver toccato il salvataggio) — dato che tutti i consumer di `useGame()` sono già abbonati
  all'intero value del contesto, incrementarlo basta a far ri-renderizzare "Partita" e rileggere
  `esistePartitaSalvata()` senza bisogno di altre modifiche. Verificato dal vivo passo-passo: aperto
  il pannello durante una partita → viste insieme "Pausa" e "Ricomincia" nello stesso pannello →
  "Pausa" torna alla schermata iniziale col salvataggio intatto → riaperto il pannello da lì →
  "Ricomincia" (confirm() intercettato/accettato) cancella il salvataggio E il bottone "Riprendi
  partita" sparisce immediatamente, senza reload. Nessun errore console in tutto il percorso. Build
  pulita.

REDESIGN CAMPO DI BATTAGLIA — RAIL + 3 RIGHE PER ZONA (2026-08-27). Dopo molti giri di mockup (v1-v11,
pubblicati come Artifact durante la sessione) confermati dall'utente, integrazione completa nel codice
vero: ogni ZonaGiocatore (Campo.jsx) è ora `[rail, field]` (o `[field, rail]` per l'avversario) invece
della vecchia colonna di righe sciolte — il "rail" è la colonna di comandi a fianco del campo (anello
PV con percentuale/numero danno flottante, cerchio ⚙ Impostazioni, cerchio timer di turno, cerchio
fase con menu a tendina per saltarla), il "field" sono le 3 righe (prima linea+Imprevisti / retrovia+
Cimitero+Esilio / Magia-Trappola+Terreno+Worldloom+Extra) su una griglia condivisa a 5 colonne con
`grid-auto-flow: dense` (l'auto-placement sparso raddoppiava l'altezza della griglia con lo sfalsamento
prima-linea/retrovia). Tutto scalato proporzionalmente con una singola custom property `--campo-scale`
(`clamp(0.3, calc(100vh / 852px), 1)`, ridefinita dentro `@media (orientation: landscape) and
(max-height: 500px)`) così l'intero campo (rail+field) sta sempre in un solo schermo landscape senza
scroll, verificato sia su iPhone SE (667×375) sia su Samsung S25 (~915×412) — vincolo esplicito
dell'utente ("non voglio assolutamente uno scroll"). BarraPv/IndicatoreFasi (App.jsx) rimosse per
intero, sostituite dal Rail dentro Campo.jsx; Intestazione (logo+dropdown mazzo sopra la mano
avversaria) rimossa su richiesta esplicita ("informazioni che possiamo togliere"); il vecchio bottone
"📜 Registro & Dadi" e il relativo cassetto sono stati spostati dentro PannelloOpzioni.jsx (erano in
App.jsx, l'utente li voleva "nel menu impostazioni"). Bug di allineamento risolti durante
l'integrazione (misurati con `getBoundingClientRect()`, non a occhio): `.field` non riempiva la
larghezza disponibile (serviva `flex:1 1 auto; min-width:0`); `.app{max-width:1000px}` era il vero
collo di bottiglia per la riga Magia/Trappola (alzato a 1400px); le tre coppie di pile (Worldloom/
Imprevisti/Cimitero-Esilio) disallineate tra loro per un gap non aggiornato su `.campo-imprevisti-
coppia` + un overflow silenzioso della riga 3 oltre il proprio bordo destro (risolto con
`.field{overflow-x:auto}`, così tutte e 3 le righe scorrono insieme invece di sfalsarsi
indipendentemente).

- **Ventaglio della mano** (richiesta esplicita: "le carte devono essere sovrapposte tra loro
  leggermente per simulare la mano, guarda il mockup"): nuovo helper `transformVentaglio` in
  Mano.jsx, un solo margin-left negativo per card (non `translateX`, che si somma alla posizione di
  flusso invece di toglierla — prima tentata, dava carte più DISTANZIATE anziché sovrapposte) più una
  rotazione a ventaglio via `transform`, entrambi su un wrapper `.mano-ventaglio-carta` separato
  dall'elemento carta vero (necessario perché sia il transform del ventaglio sia le keyframe di
  ingresso `carta-scivola-dentro`/`-capovolta` animano la stessa proprietà `transform` sull'elemento
  interno: sullo stesso elemento l'una avrebbe sovrascritto l'altra). Bottone ⚙ del Rail: prima era
  un `<div>` puramente decorativo con un tooltip che rimandava all'icona vera in alto a destra —
  l'utente l'ha segnalato come "non funziona" — reso un `<button>` vero che apre lo stesso pannello
  tramite un nuovo stato condiviso `opzioniAperte`/`setOpzioniAperte` in GameContext (così sia il ⚙
  del Rail sia quello globale in alto a destra controllano lo stesso pannello, nessuno stato duplicato).

- **Tre rifiniture finali** (2026-08-27, stessa sessione): (1) **verso del ventaglio della mano
  avversaria invertito** — `transformVentaglio` guadagna un 4° parametro `capovolta`, che nega il
  segno dell'angolo di rotazione per la mano avversaria: la sua mano è già ruotata 180° carta per
  carta (`.carta-capovolta`), quindi lo stesso segno di rotazione del ventaglio usato per la mia mano
  vi si sommava e si vedeva sullo schermo con il verso ribaltato. (2) **icona ⚙ centrata nel suo
  cerchio** — verificato via canvas (rendering del glifo ⚙ a scala 10×, bounding box dei pixel non
  neri) che restava ~1.15px più in alto del centro geometrico del cerchio anche con `line-height:1`
  già applicato in un giro precedente: aggiunto un nudge `transform: translateY(0.08em)` (in em,
  scala con `--campo-scale` insieme al font-size) — rimisurato dopo il fix, offset residuo ~0.08px,
  sostanzialmente zero. (3) **timer di turno funzionante, 180s → 0** — nuova costante
  `DURATA_TURNO_MS` (costanti.js); `iniziaTurno` (gameReducer.js) scrive `s.turnoScadenza =
  Date.now() + DURATA_TURNO_MS`, un timestamp ASSOLUTO, non un contatore lato reducer — il countdown
  vero è calcolato lato UI dal tempo reale trascorso, così sopravvive anche a una scheda messa in
  background; nuovo case `"timer-scaduto"` (no-op se `vincitore`/`combattimento`/`catena`/`modalita`/
  `notificaEffetto` sono valorizzati, per non forzare la fine del turno in un momento non sicuro — il
  prossimo tick di UI, 1s dopo, ritenta da solo) che chiama `fineTurno`+`iniziaTurno` così com'è,
  nessuna conferma. Campo.jsx: nuovo stato `secondiRimasti` con un `useEffect`/`setInterval(1000)` che
  ricalcola `Math.ceil((turnoScadenza - Date.now())/1000)` e dispaccia `"timer-scaduto"` quando arriva
  a 0; il numero è passato solo al lato che ha davvero il turno (`secondiParaZona`, confronta contro
  `stato.giocatoreAttivo`, non contro la posizione a schermo) attraverso `ZonaGiocatore` fino a `Rail`,
  che lo mostra in un nuovo `<span className="timer-num">` sopra un `.fill` a conic-gradient ora
  dinamico (`--percento-timer`, prima un placeholder statico a 252deg) con un colore di allarme rosso
  (`.timer-basso`) sotto i 30s. Verificato dal vivo con una partita reale: numero visto scendere
  175→171→166 nell'arco di pochi secondi reali corrispondenti; forzato un quasi-scadere iniettando
  `turnoScadenza = Date.now()+3000` nel salvataggio e ripreso la partita — il countdown è arrivato a 0,
  `"timer-scaduto"` ha chiuso il mio turno, l'IA ha giocato l'intero turno successivo da sola con il
  suo stesso pacing automatico già esistente (task 49), poi il turno è tornato a me con un timer
  fresco a piena durata — nessun crash, nessun blocco, nessun errore in console. Build pulita
  (`npm run build`, 24.5MB, invariato).

AUDIT CARTE ↔ ENGINE + 3 EFFETTI MANCANTI IMPLEMENTATI (2026-08-27). Richiesta esplicita dell'utente:
incrociare TUTTE le carte stilate (99 righe, Frost Land + Kepler-452B, `cards.json` dei due mondi) con
l'engine reale per trovare effetti descritti in carta ma mai implementati, e costruire un vocabolario
di riferimento da consultare ad ogni lavoro futuro sull'engine per uniformare come vengono cablati gli
effetti. Creato **Engine/Worldloom_Engine_Vocabolario_Effetti.md** (regola permanente aggiunta a
inizio di questo file: consultarlo PRIMA di scrivere o riparare qualunque effetto) — 19 caselle
canoniche (PASSIVO, EVOCAZIONE, VINCOLO_EVOCAZIONE, BONUS_CONTRO, SIMBOLO, DIFESA, PRE_ATTACCO,
SOPRAVVIVENZA, MORTE_PROPRIA, MORTE_OFFENSIVA, MORTE_ALLEATO, INIZIO_TURNO, MAGIA, TERRENO, TRAPPOLA,
TRAPPOLA_EVOCAZIONE, IMPREVISTO, RUOLO, VANILLA) ciascuna con file/funzione/pattern esatto, più la
tabella completa di ogni codice-carta esistente. Agganciato anche a **graphify**: il documento è stato
unito al grafo persistente del progetto (709 nodi, 1516 archi) con edge `implements` reali verso le
funzioni engine citate (es. `applicaDannoConSopravvivenza() --implements--> SOPRAVVIVENZA`), quindi
interrogabile con `/graphify query`.
Dall'audit sono emersi 3 gap reali (su ~50 codici unici, tutto il resto — magie/trappole/imprevisti/
ruoli — già coperto): **mammut** (Mammut Glaciale, +4 Vita permanenti quando muore un alleato, zero
codice), **manipstrum** (Manipolatore di Strumenti, tira 1 dado all'ingresso e recupera una Magia,
zero codice), **verde** (Manipolatrice Verde, "deve attaccare ogni turno se può" — solo il bonus +3
Attacco esisteva, il vincolo comportamentale no). L'utente ha chiesto di essere interpellato UNA
domanda alla volta (non tutte insieme) per chiarire ciascuno prima di scrivere codice — dettagli
confermati e poi implementati nella stessa sessione:
- **mammut**: +4 dedicato che si SOMMA al +3 generico di Ruolo Tank (non lo sostituisce — confermato
  esplicitamente: i Ruoli si applicano sempre in automatico, un effetto di carta li sostituisce solo
  se cita esplicitamente "Ruolo", il testo di Mammut non lo fa), e scatta SOLO se Mammut è vivo ED è
  in prima linea al momento della morte dell'alleato (dettaglio di posizione confermato dall'utente,
  non presente nel testo attuale di `cards.json` — l'Excel andrebbe aggiornato di conseguenza, non
  ancora fatto). Nuovo hook generico `effettoMorteAlleato(creaturaMorta, primaLinea, log)` in
  `effettiCarta.js`, chiamato da `giocatore.js` → `ripulisciCampo` nello stesso punto del bonus Tank
  — pensato per restare il punto d'aggancio anche per un eventuale secondo codice MORTE_ALLEATO
  futuro. Verificato con 3 scenari headless (prima linea → +7 totali, retrovia → solo +3 Tank, muore
  lui stesso → nessun crash).
- **manipstrum**: tira il dado Archetipo della carta stessa all'evocazione (ramo nuovo in
  `effettoEvocazione`, `effettiCarta.js`) — Spada recupera 1 Magia dal proprio cimitero, Scudo dal
  proprio Worldloom (mazzo), Cuore ruba un Potenziamento (buff_) attualmente attivo/scoperto su una
  creatura avversaria (`magieTrappole` con `coperta:false` + `bersaglioId`, cap. task B6) togliendole
  il bonus Attacco/Parata dato e aggiungendolo alla propria mano, Schivata nessun effetto; se il
  simbolo non trova un bersaglio valido non succede nulla (nessun ripiego su un altro simbolo,
  confermato dall'utente). Verificato con 5 scenari headless, dado forzato mockando `Math.random`
  (tutti e 4 i simboli + il caso "Cuore senza Potenziamento nemico da rubare").
- **verde**: "Deve attaccare ogni turno se può" blocca `continuaFase` alla fase 4 ("Fine turno") se
  Verde è viva, in prima linea, ha ancora attacchi disponibili, non è stordita, ED esiste un bersaglio
  valido (anche solo l'attacco diretto). Nuova `verdeCheDeveAncoraAttaccare` in `gameReducer.js`.
  **Bug trovato scrivendo i test, non a tavolino**: la prima versione non controllava
  `puoAttaccareQuestoTurno` — al turno 1 (chi inizia la partita non può attaccare per regola generale,
  cap. 3) o con `rinunciaAttacco` (doppia pesca), Verde avrebbe bloccato "Fine turno" per sempre
  perché l'attacco è strutturalmente impossibile in quei casi, un softlock vero. Corretto aggiungendo
  lo stesso controllo già usato altrove per il gate generale. Non serve nulla lato IA (attacca già con
  ogni prima linea disponibile prima di chiudere il turno, Verde compresa, per costruzione); non
  applicato al timer di turno scaduto (`"timer-scaduto"`, task rail precedente) di proposito — quello
  è un limite di tempo assoluto, non deve mai bloccarsi su una scelta facoltativa del giocatore.
  Verificato con 8 scenari headless: blocca quando può attaccare, libera quando ha già attaccato / è
  stordita / la Verde è dell'avversario, più le 2 esenzioni (turno 1, rinunciaAttacco) trovate durante
  il test.
Tabella e TODO del Vocabolario Effetti aggiornati a "✅ (2026-08-27)" per tutti e 3. Build pulita dopo
ogni singolo fix (3 rebuild separate, come da regola di processo — una sezione alla volta). Note per
un giro futuro, non fatte ora: aggiornare il testo Excel di Mammut (menzionare la prima linea) e di
Manipolatore di Strumenti (menzionare Scudo/Cuore/Schivata, oggi il testo parla solo di Spada); non
risincronizzato graphify dopo questi 3 fix (solo lo stato "implementato" nella tabella del documento è
cambiato, i nodi/archi concettuali del grafo restano validi così come sono).

SFONDO CAMPO DI BATTAGLIA PER MAZZO (2026-08-27). Richiesta esplicita dell'utente: nell'Editor Mazzi,
poter caricare un'immagine ambientata nel mondo del proprio mazzo per rendere il campo più dinamico.
Chiarito a parole prima di scrivere codice (cap. regola di processo): il campo è diviso in DUE METÀ
(non un unico sfondo condiviso) — ogni metà mostra lo sfondo del mazzo di CHI la occupa, per identità
del seme (io/avversario), non per posizione a schermo. Le Magie Terreno (Nebbia di Marbion, Terreno
Ribelle, Marea di Kepler — valgono già per entrambi i giocatori, cap. 14) dovrebbero in futuro poter
sostituire lo sfondo di TUTTO il campo mentre sono attive — l'utente ha confermato di predisporre SOLO
l'aggancio ora (nessuna vera immagine/carta Terreno collegata, sezione futura a parte).
- **Cartelle sorgente**: nuova `Sfondo Campo/` dentro ciascuna cartella di mondo in `Mazzi/` (stesso
  livello di `Complete cards`/`Excel`/`Images`) — l'utente ci caricherà le immagini vere. Creati anche
  2 sfondi di default per testare subito il meccanismo (richiesti esplicitamente dall'utente): SVG
  disegnati a mano (nessuna capacità di sintesi immagine raster in questo ambiente, coerente con la
  nota già in CLAUDE.md su "Guardiano Glaciale") — `ghiaccio-e-neve.svg` (Frost Land) e
  `prato-e-montagne.svg` (Kepler-452B), stile piatto/vista dall'alto: campo colore pieno, ammassi
  rocciosi/montuosi raggruppati negli angoli (blob ellittici sovrapposti, non silhouette con cielo —
  coerente con "vista dall'alto"), centro sgombro apposta per non disturbare la leggibilità delle
  carte sopra. Verificati nel browser prima di procedere.
- **Pipeline**: `sync-data.mjs` copia `Sfondo Campo/*.{svg,jpg,jpeg,png,webp}` in
  `src/data/generated/mazzi/<id>/sfondo-campo/`, stesso meccanismo già usato per le Complete cards.
  `useMazzi.js`: nuovo `import.meta.glob` + `getSfondiCampoDisponibili()` (elenco per la galleria
  dell'editor) e `getSfondoCampoUrl({mazzoId, file})` (risoluzione puntuale, nessun fallback
  cross-mondo — a differenza delle Complete cards, qui uno sfondo scelto è sempre esattamente
  quell'immagine, mai cercata altrove).
- **Modello dati**: nuovo campo `sfondoCampo: {mazzoId, file} | null` sull'oggetto mazzo salvato
  (`mazziSalvati.js`) — libero, non vincolato al mondo delle carte del mazzo (coerente con i mazzi
  misti già esistenti, cap. editor mazzi "lista unica").
- **Editor Mazzi**: nuovo terzo tab "Sfondo Campo" (accanto a Worldloom/Imprevisti) —
  `SezioneSfondoCampo`, galleria di miniature cliccabili (da `getSfondiCampoDisponibili()`) +
  "Nessuno (predefinito)", salvata insieme al resto in `salvaMazzo`.
- **Threading nello stato di gioco**: `App.jsx` risolve l'URL reale (`risolviSfondoCampo`, usa
  `getSfondoCampoUrl`) al momento di dispatchare "nuova-partita" — nuovi parametri `sfondoCampoIo`/
  `sfondoCampoAvversario` passati a `nuovaPartita` (`gameReducer.js`), salvati sullo stato come
  stringhe URL già pronte (o null). Deliberato: il reducer porta solo l'URL opaco, non sa nulla di
  `import.meta.glob`/moduli bundlati — stessa separazione motore/UI già discussa con l'utente questa
  sessione (Scatola A non sa nulla di come si è trovata l'immagine, la riceve già pronta da Scatola B).
- **Campo.jsx**: `sfondoParaZona(chiaveZona)` (stesso principio di `secondiParaZona` già esistente,
  per identità del seme) — se `stato.terreno?.sfondoUrl` fosse valorizzato (mai oggi, predisposizione
  per il futuro) avrebbe precedenza su ENTRAMBE le zone; altrimenti ogni zona legge il proprio
  `sfondoCampoIo`/`sfondoCampoAvversario`. Nuovo layer `.campo-zona-sfondo` (figlio assoluto di
  `.campo-zona`, `z-index:-1` — dipinge sotto rail/field in-flow ma sopra lo sfondo stellato
  dell'antenato `.campo`, verificato con le regole di stacking CSS) renderizzato solo quando c'è un
  URL, altrimenti resta lo sfondo stellato di sempre visibile in quella metà.
Verificato dal vivo nel browser end-to-end: galleria nell'editor con le due miniature reali; mazzo di
prova (40 Worldloom + 10 Imprevisti, carte vere di Frost Land) con `sfondoCampo` iniettato in
localStorage e scelto come "Tuo mazzo" → partita reale mostra "prato e montagne" SOLO nella propria
metà del campo (rail, slot creature, Worldloom tutti leggibili sopra), la metà dell'avversario (nessun
mazzo salvato scelto) resta con lo sfondo stellato predefinito — esattamente il comportamento
richiesto. Nessun errore in console. Build pulita (`npm run build`, +13KB per i due SVG, trascurabile
essendo vettoriali). Non ancora fatto: le vere immagini definitive (l'utente le caricherà lui in
`Sfondo Campo/`), la modalità 1v1 locale non è stata testata esplicitamente con sfondi diversi per i
due lati umani (dovrebbe funzionare per costruzione, stessa identità-per-seme già usata ovunque nel
progetto per quella modalità, ma non verificata dal vivo in questo giro).

---

RIORDINO DOCUMENTI (2026-08-28). L'utente frustrato dalla dispersione dei documenti ("quanti documenti
inutili, non aggiornati ho nella cartella?"). Fatto:
- Creato `WORLDLOOM.md` (root) — pannello di controllo unico: stato sprint + indice documenti + sintesi
  roadmap. È il "parti da qui" di ogni chat nuova.
- `CLAUDE.md` snellito da 1641 righe (166 KB) a ~130: contesto + 8 regole di processo + gotcha nel
  codice + mappa documenti. Tutto il log cronologico spostato qui in `Engine/Storico_Lavoro.md`.
- `Archivio/` (root) — spostati ~60 file morti: `UX/_estratto` + `UX/_estratto2` (estrazioni duplicate
  di consegne esterne), `UX/files*.zip`, `check.txt`, `UX/Worldloom_Sequenze_Interazione.pdf` (fermo
  al 19-08, superato), `App - HTML - Test/Programmazione/` (design doc v0.1 del 7-8 agosto + txt vuoto).
- `UX/Worldloom_Foglio_Maestro_UX.md` recuperato dall'archivio in `UX/` come brief di design.
- Memoria: nuovo `[[project-pannello-worldloom]]`, aggiornato `[[project-roadmap-sessione-20260827]]`.
Nessun file di codice toccato.

BACKUP (2026-08-28, prima del refactor "coda di step unica" / idea 59):
- Tag git `pre-coda-step-unica-2026-08-28` (commit 9885e0d) — snapshot dell'intero working tree,
  lavoro parallelo Excel incluso.
- Copia giocabile: `App - HTML - Test/Versioni gioco/Worldloom_Gioco_v2.3_pre-coda-step-unica_2026-08-28.html`.
- Copia sorgente completa: `Backup sorgente pre-coda-step-unica 2026-08-28/` (src + config + i 4 doc chiave).
  `Versioni gioco/` e `Backup sorgente*` sono ora gitignorate (locali alla macchina).

IDEA 59 — DESIGN CHIUSO + SKILL DI AVVIO (2026-08-28, sera).
- Scritto `Engine/Idea59_Coda_Step.md` (progettazione completa della "coda di step unica": una fila
  `s.sequenza`, un direttore UI, 4 tipi di passo anim/scelta/muta/banner, `tempi.js` sorgente unica,
  migrazione a 5 fasi ognuna blindata). Nessun codice.
- 6 domande di design confermate con l'utente una alla volta: (1) morte = passo `muta` differito;
  (2) turno IA scandito uno scontro alla volta; (3) ordine migrazione combattimento→catena→pesca/evoc
  →IA→banner; (4) `tempi.js` guida anche il CSS via custom property; (5) i 3 componenti pop-up
  (`PromptCombattimento`/`CatenaStriscia`/`NotificaEffetto`) si riscrivono; (6) 1v1 locale con fila
  unica, verifica in Fase 1.
- Creata skill `.claude/skills/avvio-sessione/` — rituale di avvio di ogni chat nuova (parti da
  `WORLDLOOM.md`), mappa documenti autoritativi, regole di processo, playbook per lavorare una Fase
  del refactor idea 59, checklist di fine sessione.
- Sessione parallela Excel: fermata e chiusa dall'utente — il working tree è ora stabile.
- Prossima sessione: Fase 1 (infrastruttura + combattimento).

IDEA 59 — FASE 1 (INFRASTRUTTURA + COMBATTIMENTO) FATTA E BLINDATA (2026-08-29).
Prima di scrivere codice: letti WORLDLOOM.md + Idea59_Coda_Step.md, query graphify sul flusso
combattimento, piano spiegato a parole, 4 nodi emersi confermati dall'utente:
(1) ordine balzo = "sequenza b" (come oggi: difendi→dado→ripeti?→balzo→danno, niente balzo iniziale);
(2) tempi.js = sorgente unica anche per DURATA_TURNO_MS (spostato da costanti.js, 3 import aggiornati);
(3) eventoDanno/infliggiDanno restano su s.codaVisiva (condivisi con magie/imprevisti/attacco diretto);
(4) patch chirurgica alle ~5 righe di guardia di CatenaStriscia (Fase 2), non "taglio netto" totale.

FILE NUOVI:
- `src/game/tempi.js` — oggetto TEMPI (dado/balzo/numeroDanno/morte/respiro/turno), valori presi 1:1
  da come il gioco anima oggi. `iniettaTempiCss()` mette --t-balzo / --t-numero-danno su :root.
- `src/game/sequenza.js` — selettori read-only per i componenti (passoInScena, filaOccupata,
  dadoInScena, balzoInScena, esitoInScena, morteInScena, sceltaInScena).
- `src/components/Sequenziatore.jsx` — il direttore unico: timer di sicurezza sui passi anim/muta
  (il componente d'animazione segnala prima con "sequenza-passo-concluso"), niente timer sui passi
  scelta. Aspetta che gli eventi legacy (codaVisiva/notifica/voli/Imboscata) finiscano.
- `Engine/test-blindati/` (cartella nuova) — `combattimento.blindato.mjs` (forma esatta di s.sequenza
  dopo ogni azione chiave: [difendi] → [dado,ripeti] → [balzo,danno,morte?]; incassa → fila vuota +
  dannoDiretto su coda; "ritenta" → nuovo dado; §7: creatura letale ancora in campo finché il muta
  non è in cima) + `tempi.blindato.mjs` (snapshot TEMPI). NON si cancellano.

REDUCER (gameReducer.js):
- Nuovo campo `s.sequenza: []`. Azzerato SOLO in nuova-partita / carica-stato / abbandona-a-menu /
  timer-scaduto / fineTurno (flushSequenza: applica le mutazioni muta pendenti, poi svuota).
- Nuova dispatch `sequenza-passo-concluso` (id-guarded; se il passo è `muta` esegue eseguiMuta prima
  dello shift). Nessuna `sequenza-avanti` separata.
- Helper: passoAnim / passoScelta / passoMuta / accodaPassi (push in fondo) / scartaFinoAScelta.
- Migrazione combattimento: passaAlRifiuto accoda il passo `scelta: difendi` (solo per difensore
  umano; l'IA auto-risolve inline). decidiDifesa / decidiRipetizione / applicaSimbolo accodano i
  passi anim `dado` / `balzo` / `danno` (push). risolviDannoCombattimento riempie il passo `danno`
  con gli `eventi` e, se letale, accoda `muta: morte` (dati: attProprietario/difProprietario/morti).
- `confermaMorteInCorso` rifattorizzata: estratta `eseguiMortiCombattimento(s, att, dif)` (corpo
  comune), usata sia dal passo muta (idea 59) sia da s.morteInCorso (Imboscata Trappola, invariato).
- `proseguiSeIA`: se `s.sequenza.length` → `s.iaInAttesa = "attacca"` e return (il prossimo scontro
  IA non si calcola finché la fila non è vuota — l'useEffect iaInAttesa in App.jsx rimanda avanza-ia).
- `scegliAttaccanteIo` / `prossimaAzioneAttaccoIA`: guardia `!s.sequenza.length` (non iniziare un
  attacco nuovo mentre la scenografia del precedente scorre; s.combattimento è già null a quel punto).
- RITIRATI: `s.esitoCombattimento`, `s.animazioneAttacco`, `s.esitoInCorso`, `comb.idBalzoRichiesto`,
  `comb.idDadoRichiesto`, `registraAnimazioneAttacco`, `case "esito-animazione-conclusa"`, il blocco
  "azzera i campi ultimo evento" in avviaAttacco, i branch `attacco`/`esitoCombattimento` in
  applicaEventoVisivo. TENUTI (usati fuori dal combattimento): `s.lancioDado`/`s.dadoInCorso` (dado
  Imprevisti), `s.morteInCorso` + filiera (Imboscata), `s.eventoDanno`/`infliggiDanno` (danno diretto).

ALTRI FILE:
- `costanti.js` — rimosso `DURATA_TURNO_MS` (→ TEMPI.turno). `salvataggio.js`, `Campo.jsx` aggiornati.
  `salvataggio.js`: `stato.sequenza = []` al ripristino; rimossi 3 campi ritirati da CAMPI_TRANSITORI.
- `App.jsx` — `<Sequenziatore/>`, `useEffect(() => iniettaTempiCss(), [])` in App(), rimosso il timer
  esitoInCorso, `iaBloccataDaPrompt` (+ `s.sequenza.length`, − `esitoInCorso`), salto-fase e
  `puoAvanzareOra` (+ `s.sequenza.length`).
- `PromptCombattimento.jsx` — le 5 auto-guardie collassano: `if (head && head.tipo !== "scelta")
  return null`; i pop-up rifiuto/ripetizione compaiono solo quando il loro passo `scelta` è in testa.
- `CatenaStriscia.jsx` — rimosso il Set balzoVisti/dadoVisti + 4 guardie; ora `if (comb) { if
  (filaOccupata(stato)) return null; if (codaVisiva.length) return null; }`.
- `LancioDado.jsx` — dispatch di fine: `sequenza-passo-concluso` per il dado di combattimento,
  `dado-animazione-conclusa` (invariato) per il dado Imprevisti.
- `AnimazioneMorte.jsx` — legge `morteInScena(stato) ?? stato.morteInCorso`; dispatch di fine
  `sequenza-passo-concluso` (fila) o `morte-animazione-conclusa` (Imboscata).
- `index.css` — `.carta-attacca-io/avversario` → `var(--t-balzo, 0.55s)`; `.carta-esito-numero` e
  `.carta-vita-danno` → `var(--t-numero-danno, 1.15s)`. Le due keyframe barra-PV Stratega restano
  literali (danno diretto, non migrato).

DEVIAZIONI dal design doc: (a) per l'IA difensore non si crea il passo `scelta` difendi — auto-risolto
inline, i passi visivi passano comunque dalla fila; (b) il passo `muta` morte NON avanza "subito" ma
aspetta il segnale di AnimazioneMorte (serve la posizione DOM pre-rimozione della creatura).

VERIFICA: build vite pulita. Blindati verdi. Sweep headless 200 partite vsIA complete (frost-land +
kepler), 0 crash / stalli / passi malformati. Dal vivo nel browser (stato iniettato via localStorage):
- non letale + diritto di ripetizione: difendi (nessun dado/numero) → Difendi → dado → "Diritto di
  ripetizione" → Tieni → balzo (dt 69→940) → numero "-8" (dt 940) → clear (dt 2615). Sequenza b OK.
- letale + riserva: difendi → dado → balzo → "-20" → §7 (dif letale ANCORA in [data-creatura-id]
  mentre balzo/numero scorrono) → campo-slot-morte-in-volo → carta-volante-morte → rimozione +
  Riserva avanza in prima linea automaticamente → turno IA finito. Console pulita (solo un errore
  residuo da un import() di debug mio, non dal codice app).
- --t-balzo=550ms / --t-numero-danno=1150ms iniettati su :root, fresh game start OK.

graphify risincronizzato (`graphify . --update --code-only`): nascono tempi.js / sequenza.js /
Sequenziatore.jsx, cambiano responsabilità in gameReducer/App/PromptCombattimento/CatenaStriscia/
Campo/LancioDado/AnimazioneMorte.

BACKUP (2026-08-29, prima della Fase 2 "catena" dell'idea 59):
- Copia giocabile: `App - HTML - Test/Versioni gioco/Worldloom_Gioco_v2.4_pre-fase2-catena_2026-08-29.html`.
- Copia sorgente: `Backup sorgente pre-fase2-catena 2026-08-29/` (src + package.json). Locale, gitignorata.
- Base = Fase 1 committata e blindata (working tree con lavoro non committato di sessione parallela su Mazzi/).

Nessun commit (l'utente non l'ha chiesto). Prossima: Fase 2 (Catena).


IDEA 59 — FASE 2 (CATENA) FATTA E BLINDATA (2026-08-29).
Prima di scrivere codice: graphify sul flusso catena, piano spiegato a parole, 4 scelte confermate
dall'utente (tutte le opzioni consigliate): (1) storico dei frame risolti = campo `s.catena.risolti`
nel reducer (non stato React locale); (2) countdown 15s resta in CatenaStriscia, keyed sull'id del
passo; (3) nessun passo `scelta:catena` per l'IA (risolta inline da avanzaCatena, come la deviazione
già fatta in Fase 1 per `difendi`); (4) diagnostica P1.4 portata dietro invariata, P1.4 NON chiuso.

CONCETTO: la scenografia di risoluzione di un frame diventa il passo `muta:catenaRisoluzione` di
`s.sequenza` (ex stato diretto `s.catenaRisoluzioneInCorso`); la decisione del giocatore è il passo
`scelta:catena` (`attende:"catena-passa"`). `catena.js` (motore puro LIFO/priorità) INVARIATO.

REDUCER (gameReducer.js):
- `avviaRisoluzioneFrameCatena` non scrive più `s.catenaRisoluzioneInCorso`: accoda `passoMuta("catenaRisoluzione", {frameId,cartaNome,proprietario,ordine,bersaglio,esito}, TEMPI.catena.scenografia + TEMPI.respiro)`.
- `confermaRisoluzioneFrameCatena` → `applicaRisoluzioneFrameCatena(s, dati)` (chiamata da `eseguiMuta`
  ramo `catenaRisoluzione`): `rimuoviFrameInCima` + push su `s.catena.risolti` + `risolviFrameCatena` +
  chiudi se vuota. **BUG trovato e corretto**: chiudeva con `catenaVuota(s.catena)` DOPO che
  `risolviFrameCatena→proseguiSeIA→prossimaAzioneAttaccoIA` poteva aver aperto un'ALTRA catena
  (riassegnando `s.catena`) → annullava la catena nuova. Fix: `const catena = s.catena` in cima,
  chiudi solo `if (s.catena === catena && catenaVuota(catena))`. (Latente anche nel vecchio codice.)
- Nuovo helper `sincronizzaPassoCatena(s)`: se catena aperta + priorità a un umano e nessun passo
  catena in fila → accoda `passoScelta("catena","catena-passa",{evento,proprietarioPriorita})`; se
  priorità null + pila non vuota (ripristino a metà risoluzione) → riarma `avviaRisoluzioneFrameCatena`.
  Chiamato da `avanzaCatena` (prima dell'early-return), dai case `catena-aggiungi-trappola`/`catena-passa`
  (dopo `scartaFinoAScelta(s,"catena")`), da `eseguiMuta`, e da `carica-stato`.
- Case `catena-conferma-risoluzione` RIMOSSA. Case `sequenza-passo-concluso`: shift guardato
  (`if (s.sequenza?.[0]?.id === azione.id) s.sequenza.shift()`) perché il ramo `catenaRisoluzione` di
  `eseguiMuta` shifta già il passo da sé PRIMA di riaprire la finestra (così `sincronizzaPassoCatena`
  non lo conta come "passo catena già in fila").
- `apriFinestraCatena`: aggiunge `s.catena.risolti = []`. Init state: rimosso `catenaRisoluzioneInCorso`.

ALTRI FILE:
- `sequenza.js` — nuovi selettori `sceltaCatenaInScena` / `catenaRisoluzioneInScena`.
- `tempi.js` — `TEMPI.catena = { countdown: 15000, scenografia: 700 }` (ex DURATA_RISOLVI_MS /
  DURATA_RISOLUZIONE_MS di CatenaStriscia). `tempi.blindato.mjs` aggiornato.
- `CatenaStriscia.jsx` — RISCRITTO: niente più guardie di timing proprie (solo `legacyOccupato` = un
  solo overlay alla volta: codaVisiva/notifica/voli), niente timer locali, niente `storico` locale
  (→ `s.catena.risolti`). Legge `sceltaCatenaInScena`/`catenaRisoluzioneInScena`. Countdown keyed su
  `sceltaCatena.id`. `RisoluzioneFrame` segnala la fine con `sequenza-passo-concluso` dopo
  `TEMPI.catena.scenografia` (come AnimazioneMorte/LancioDado). Diagnostica P1.4 invariata.
- `Sequenziatore.jsx` — `durataDi("catenaRisoluzione")` per robustezza.
- `Campo.jsx` — bersaglio catena da `catenaRisoluzioneInScena(stato)?.bersaglio` (ex `stato.catenaRisoluzioneInCorso`).
- `App.jsx` — `iaBloccataDaPrompt`: `catena?.turnoDiPriorita==="io"` + `catenaRisoluzioneInCorso`
  collassano in `!!stato?.catena` (rete di sicurezza; a riposo la catena ha sempre un passo in fila).
- `salvataggio.js` — rimosso `catenaRisoluzioneInCorso` da CAMPI_TRANSITORI_A_NULL; commento sul
  ripristino via `carica-stato`→`sincronizzaPassoCatena`.

VERIFICA: build vite pulita. Blindati verdi (tempi + combattimento + catena). `catena.blindato.mjs`
(nuovo, non si cancella) — 5 casi: nessuna trappola → `[scelta:difendi]`; 1 trappola → `[scelta:catena]`
(risolti=[]); aggiunta → nuovo `[scelta:catena]` id nuovo; risoluzione → `[muta:catenaRisoluzione]` con
dati corretti, MAI un dado; 2 frame → LIFO ordine 1 poi 2; ripristino salvataggio → passo ricostruito.
Sweep headless 250 partite vsIA complete (frost+kepler), 0 crash / 0 stalli, 188 scenografie di
risoluzione esercitate (driver usa-e-getta cancellato). Dal vivo (stato iniettato via localStorage):
striscia + countdown ring (auto-pass a 15s verificato) + trappola eleggibile evidenziata (le altre no)
+ aggiunta frame ("FATO SPEZZATO in attesa di risoluzione") + scenografia di risoluzione
(`catena-risoluzione-carta` a schermo, elemento bersaglio trovato nel DOM — nessun sintomo P1.4 in
quell'istanza) + chiusura finestra + combattimento che prosegue. Console pulita per tutta la verifica.

graphify: da risincronizzare (`graphify . --update --code-only`) — nuovi selettori, `sincronizzaPassoCatena`,
`applicaRisoluzioneFrameCatena`, ritiro `catenaRisoluzioneInCorso`.

Nessun commit (l'utente non l'ha chiesto). Prossima: Fase 3 (pesca / evocazione / spostamento).

---

## 2026-08-29 — Idea 59 Fase 3 (pesca / evocazione / spostamento) — IN CORSO

BACKUP pre-Fase 3 (skill documenti-e-backup §C):
- Copia giocabile: `App - HTML - Test/Versioni gioco/Worldloom_Gioco_v2.5_pre-fase3-voli_2026-08-29.html`
  (build vite pulita, 26 MB).
- Copia sorgente: `Backup sorgente pre-fase3-voli 2026-08-29/` (root, gitignorata) — `src/` + `test-blindati/`.

Decisioni confermate con l'utente prima di scrivere codice:
1. `s.sequenza` master assoluto — `legacyOccupato` eliminato dal `<Sequenziatore>`.
2. Volo pesca: Rifornimento normale (1-2 carte) = 1 passo con stagger interno; prima mano di chi
   inizia per secondo (turno 1) = N passi `anim:pesca` da 1 carta (chiude F.2 dentro la Fase 3).
3. `tempi.js`: solo i totali dei 3 voli (per il timer di sicurezza del direttore); coreografia
   interna resta nei componenti.

**Implementazione:** i tre voli (pesca/evocazione/spostamento) sono ora passi `anim` di `s.sequenza`
(nomi `"pesca"`/`"evoca"`/`"sposta"`), ritirati gli stati diretti `s.pescaInCorso`/
`s.evocazioneInCorso`/`s.movimentiInCorso` e le dispatch `pesca-animazione-conclusa`/
`evocazione-animazione-conclusa`/`movimento-animazione-conclusa`. `avviaVoloPescata` guadagna
`unaAllaVolta`: la prima mano di chi inizia per secondo (turno 1, 5-6 carte) diventa N passi da 1
carta — chiude **F.2**. `sequenza.js`: nuovi selettori `pescaInScena`/`evocaInScena`/`spostaInScena`/
`uidInVoloPesca`. `AnimazionePescata/Evocazione/Posizionamento.jsx` leggono da lì e segnalano
`sequenza-passo-concluso`. `tempi.js`: `TEMPI.pesca/evoca/sposta` (solo i totali).

**Decisione architetturale (confermata con l'utente, opzione "raccomandata"):** `legacyOccupato`
eliminato dal `<Sequenziatore>` — `s.sequenza` diventa il master assoluto anche rispetto a
`s.codaVisiva`: prima il direttore aspettava che la coda visiva si svuotasse prima di avviare il
timer di un passo, ora è il contrario (`App.jsx`, la coda visiva si ferma quando la fila ha un passo
`anim`/`muta` in qualunque posizione; un passo `scelta` da solo — es. `scelta:catena` — lascia
scorrere la coda, così una notifica già in coda esce prima che il pop-up si apra). Necessario perché
`completaRifornimento` accoda il dado Imprevisti DOPO aver avviato il volo pesca nella stessa
dispatch: con la vecchia regola il volo avrebbe aspettato un dado che a sua volta aspettava il volo
(stallo). Verificato che il combattimento (Fase 1) non ha mai un caso in cui `codaVisiva` deve
precedere un passo già in fila (l'unico evento diretto-Stratega, "incassa", non accoda mai passi).
`iaBloccataDaPrompt`/`saltoFase`/`CatenaStriscia` non citano più i 3 campi ritirati.

**Bug trovato scrivendo i test (non introdotto da questa sessione, reso visibile da essa):** gli
scenari di `combattimento.blindato.mjs`/`catena.blindato.mjs` (Fase 1/2) non impostavano
`turniGiocati` — un turno che finisce durante il test (es. "incassa" → `proseguiSeIA` → IA esaurita →
`fineTurno`+`iniziaTurno`) faceva scattare la prima mano staggerata (6 passi pesca), invisibile prima
della Fase 3 perché finiva in `s.pescaInCorso` (non letto da `s.sequenza`). Fix: gli scenari ora
impostano `turniGiocati` a partita-in-corso — comportamento del gioco invariato, solo il test
corretto.

**VERIFICA:** build vite pulita. Blindati verdi: `tempi`/`combattimento`/`catena` (scenari aggiornati)
+ **`voli.blindato.mjs`** nuovo (7 casi, vedi `Idea59_Coda_Step.md` §13 per il dettaglio). Sweep
headless **200 partite vsIA complete** (frost+kepler, orchestratore che emula App.jsx) con
un'asserzione d'ordine esplicita (il dado Imprevisti non è mai `dadoInCorso` mentre un volo Fase 3 è
ancora in fila — prima versione dell'assert dava 5686 falsi positivi confrontando `lancioDado`, che
resta valorizzato tra un turno e l'altro e non è un flag "in corso": corretto usando solo
`dadoInCorso`): 0 crash, 0 stall, 0 violazioni d'ordine; pesca 4673 volte, evoca 2077, sposta 11.
Verifica dal vivo nel browser (partita vsIA reale, non stato iniettato — il pannello Browser non
componeva frame finché l'utente non l'ha reso visibile: pilotaggio via `computer`/`javascript_tool`
misto): prima mano di 5 carte una-alla-volta confermata (log "Peschi 5 carte"), dado Imprevisti
loggato SOLO dopo, salto di fase (chevron→Schieramento) ha aspettato correttamente la fila;
evocazione mia (con `sorgenteRect` reale) e dell'IA (fallback DOM, log "pesca 6 carte (5 iniziali + 1,
gioca per secondo)") entrambe atterrate senza classi "in volo" residue; combattimento Fase 1 ancora
intatto attraverso il cambio turno ("💀 Araldo Tempesta distrutto", morte differita); 4 cambi turno
consecutivi, console pulita per tutta la sessione (solo i dialog `confirm()` soppressi
dall'automazione, non errori dell'app). **Fase 3 = 🔒 BLINDATA.**

Documenti aggiornati nella stessa sessione: `Idea59_Coda_Step.md` (header Fase 3 + §10 + §13),
`WORLDLOOM.md` (sprint + backup + indice), `Roadmap_Sessione_2026-08-27.md` (header anti-regressione +
riga F.2 chiusa + nuovo blocco stato 29-08), `UX/Worldloom_UX_Codex.html` (card "Coda di step unica"
estesa a Fase 1-3, card "Coda visiva" aggiornata all'inversione dell'ordine, sezione 07 Pesca &
mazzo riscritta per il volo vero pesca/evoca/sposta — era ferma alla vecchia versione CSS-only
pre-esistente).

graphify: da risincronizzare (`graphify . --update --code-only`) — nuovi selettori Fase 3, funzioni
`avviaVoloPescata`/`avviaVoloEvocazione`/`avviaVoloMovimento` cambiate, campi/dispatch ritirati.

Nessun commit (l'utente non l'ha chiesto). Prossima: Fase 4 (turno IA, pacing scontro-per-scontro).

---

## 2026-08-29 — Idea 59, FASE 4: turno IA (pacing scontro-per-scontro)

**Backup pre-lavoro:** `App - HTML - Test/Versioni gioco/Worldloom_Gioco_v2.6_pre-fase4-turno-ia_2026-08-29.html`
+ `Backup sorgente pre-fase4-turno-ia 2026-08-29/` (src + test-blindati; root, gitignorata).

**graphify prima di partire:** query sul flusso del turno IA per confermare il raggio d'impatto —
`avanzaIA` (gameReducer.js:941), `proseguiSeIA` (:2465), `prossimaAzioneAttaccoIA` (:2556),
`eseguiFaseEvocaIA` (:2487), più `completaRifornimento`/`fineTurno`/`iniziaTurno`.

**Cosa c'era prima:** il pacing dell'avversario era l'ULTIMO meccanismo parallelo rimasto alla fila —
4 pezzi che si citavano a vicenda: il campo `s.iaInAttesa` ("evoca"/"attacca", scritto in 3 punti),
la dispatch `avanza-ia`, un `useEffect` in App.jsx con timer **fisso di 900ms scritto a mano** (non in
tempi.js), e `iaBloccataDaPrompt` (OR di **8** condizioni, usato solo da quell'useEffect).

**Cosa è atterrato.** Tutti e quattro RITIRATI, sostituiti da **un passo `muta` nome `"ia"`** con
`dati:{azione:"evoca"|"attacca"}` e `durataMs: TEMPI.ia.respiro` (900ms, stesso valore di prima, ora
in `tempi.js`). Nodo tecnico chiave: `eseguiMuta` **toglie il passo dalla fila PRIMA** di chiamare
`avanzaIA(s, azione)` — stesso pattern già usato da `catenaRisoluzione` in Fase 2 — così quando
`prossimaAzioneAttaccoIA`/`avviaAttacco`/`proseguiSeIA` girano vedono `s.sequenza` davvero vuota e
**tutte le loro guardie esistenti restano valide parola per parola**, senza riscrivere la logica IA.
`proseguiSeIA` perde il ramo `if (s.sequenza?.length) → iaInAttesa` e accoda **sempre** un respiro
(`accodaPassoIa`, anti-doppione via `haPassoIa`). Il passo successivo non è mai calcolato in anticipo.
Nuovi selettori in `sequenza.js`: `passoIaInScena` (da cui App.jsx legge i testi "L'avversario
evoca…"/"…sta per attaccare…"), `haPassoIa`, `filaBloccaCodaVisiva`, `scenaLiberaPerIa`.
`eseguiFaseEvocaIA` NON toccata (decisione utente: Magia+Trappola+evocazione restano una sola mossa).

**Limite noto CHIUSO — "campo vuoto = attacchi diretti senza pausa".** `risolviAttaccoDiretto` manda
il danno su `s.codaVisiva` (non nella fila), quindi `proseguiSeIA` trovava la fila vuota e ricorreva
**sincrona**: con 3 Pedine e il campo nemico sgombro i 3 attacchi si risolvevano tutti in una dispatch.
Ora ognuno ha il suo respiro — **misurato dal vivo a ~1800ms costanti** (900 respiro + 300 margine
direttore + 600 `RITARDO_PRIMA_DI_MS.dannoDiretto` per il numero rosso), su 4 turni IA consecutivi.

**DUE BUG VERI trovati DENTRO la verifica** (il motivo per cui i blindati esistono):
1. **Colto da `catena.blindato.mjs`**: con una catena a 2 frame, risolvendo il 1° la fila usciva
   `[muta:ia, scelta:catena]` — il respiro dell'IA **davanti** a una decisione ancora in sospeso del
   giocatore, che sarebbe ripartita sopra di lui. Fix strutturale: **invariante "il passo `ia` sta
   sempre in fondo"**, applicato dentro `accodaPassi` (un posto solo) e non a carico dei chiamanti —
   qualunque passo accodato dopo il respiro gli finisce davanti.
2. **Colto DAL VIVO nel browser**: turno IA fermo per sempre su "L'avversario evoca…". Avevo
   implementato solo METÀ dell'eccezione decisa a piano: il `<Sequenziatore>` aspettava la coda
   visiva, ma la coda visiva (regola Fase 3: si ferma se la fila ha un `anim`/`muta`) aspettava la
   fila — e il passo `ia` è un `muta`. **Deadlock.** Fix: il passo `ia` è l'**unica eccezione** a
   quella regola (è respiro, non scenografia, ed è proprio il momento in cui la coda deve mostrare
   quel che è appena successo). Le due guardie sono state **estratte in `sequenza.js`**
   (`filaBloccaCodaVisiva` / `scenaLiberaPerIa`) apposta per poterle blindare davvero invece di
   duplicarle inline nei due componenti.

**Salvataggio:** `s.iaInAttesa` sopravviveva al salvataggio; `s.sequenza` viene **svuotata** al
caricamento (`salvataggio.js:86`) → senza contromisura una partita ripresa a metà turno avversario
restava ferma per sempre. Nuovo `sincronizzaPassoIa(s)` chiamato da `carica-stato` (precedente:
`sincronizzaPassoCatena`, Fase 2): ricostruisce il respiro solo se tocca all'IA (vsIA) e nessuna
decisione umana è in sospeso — "evoca" se fase < 4, "attacca" altrimenti.

**Deviazione dichiarata dal §8 del doc** (che prevedeva `iaBloccataDaPrompt → s.sequenza.length > 0`):
3 condizioni sparivano davvero (catena/combattimento/sequenza, ora garantite dall'ordine della fila),
ma `notificaEffetto`/`morteInCorso` (Imboscata)/`dadoInCorso` (dado Imprevisti)/`codaVisiva` sono
flussi non ancora migrati e restano — non più sparse in 3 punti però: **una riga sola**
(`scenaLiberaPerIa`) che si accorcerà da sé quando le fasi successive le assorbiranno.

**Verifica.** Build pulita. **`Engine/test-blindati/turno-ia.blindato.mjs`** (nuovo, 9 casi: taglio
netto `iaInAttesa`/`avanza-ia`; forma del passo; un solo respiro alla volta su 2 scontri; Pedina con
2 attacchi; 3 attacchi diretti scanditi; invariante d'ordine; ripristino da salvataggio ×4; 1v1
locale; anti-deadlock). `combattimento`/`catena`/`voli` **migrati al pilotaggio nuovo senza indebolire
un'asserzione** — anzi, "fila vuota a scontro concluso" è diventato il più stretto "esattamente
`[muta:ia]`, mai zero né due". `tempi.blindato.mjs` +`TEMPI.ia`. Tutti e 5 verdi.
Sweep headless **200 partite vsIA complete** (frost+kepler, orchestratore che emula `<Sequenziatore>`
+ coda visiva) con 3 asserzioni d'ordine attive: **200/200 concluse, 0 crash, 0 stalli, 0 violazioni**
su 8991 respiri, 3674 scontri IA, 1592 attacchi diretti. Verifica dal vivo su **3 partite vsIA reali**
(non stato iniettato): 8+ turni IA scanditi, sequenza dei messaggi confermata, spaziatura degli
attacchi diretti misurata, console del browser e log del server puliti.
**Limite della verifica dal vivo, dichiarato:** lo scontro IA-contro-creatura (pop-up "Difendi" fra
due respiri) non è stato osservato dal vivo — l'automazione non è riuscita a portare una mia creatura
in prima linea. Coperto da `combattimento.blindato.mjs`, dai casi #3/#4 di `turno-ia.blindato.mjs` e
dai 3674 scontri IA dello sweep. **Fase 4 = 🔒 BLINDATA.**

Documenti aggiornati nella stessa sessione: `Idea59_Coda_Step.md` (header Fase 4 + §10 + §13),
`WORLDLOOM.md` (sprint + backup + indice + sintesi roadmap), `Roadmap_Sessione_2026-08-27.md`
(header anti-regressione + riga F.6 + nuovo blocco stato), `UX/Worldloom_UX_Codex.html` (card "Coda
di step unica" estesa a Fase 1-4 con i due invarianti e i tempi misurati, card "Coda visiva" e card
riepilogo idea 59 aggiornate). Simulazione usa-e-getta `sim-fase4-sweep.mjs` cancellata come da regola.

Nessun commit (l'utente non l'ha chiesto). Prossima: **Fase 5 (banner di fase Vespro/Vaticinio)**,
che chiude P2.1-P2.4.

---

## 2026-08-29 — Idea 59 Fase 5: banner di fase (ULTIMA — refactor completo)

Backup pre-lavoro: `App - HTML - Test/Versioni gioco/Worldloom_Gioco_v2.7_pre-fase5-banner_2026-08-29.html`
+ `Backup sorgente pre-fase5-banner 2026-08-29/` (`src/` + `test-blindati/`, root gitignorata).

**Punto di partenza, scoperto leggendo prima di scrivere:** il banner esisteva già come
`TitoloFase.jsx`, un `useEffect` locale che osservava il cambio di `faseEffettiva`. Due dei quattro
punti di roadmap non erano quindi "arriva troppo presto" ma **"non esiste"**: (a) `NOMI_FASE[5]="Vespro"`
c'era, ma `s.fase` non vale mai 5 (`fineTurno` va da 4 a 0), quindi quel cartello **non è mai comparso
in vita del gioco**; (b) `faseEffettiva = null` quando `!turnoUmano`, quindi le transizioni di fase
dell'IA erano **strutturalmente soppresse** — l'origine di P2.4, che la roadmap sperava "si risolvesse
da sola per simmetria di seme".

**Cosa è atterrato.** Quarto tipo di passo `{ tipo:"banner", nome:"bannerFase", dati:{chiave,fase},
durataMs }` (helper `accodaBannerFase`, selettore `bannerInScena`). Cinque punti d'aggancio, scelti
perché sia l'ordine della fila a garantire la cronologia invece di una guardia nuova:
`iniziaTurno` dopo il check deck-out (1 Rifornimento, prima della pescata) · in cima a
`completaRifornimento` (2 Vaticinio — tutti e 3 i chiamanti hanno già accodato `anim:pesca`, quindi il
cartello ci finisce dietro: **P2.2 chiuso per costruzione**) · ramo `imprevistoEsito` di
`applicaEventoVisivo` (3 Schieramento, dove il pin si rilascia = primo istante in cui il dado
Imprevisti è finito) · `continuaFase` e `avanzaIA("evoca")` (4 Alla Carica, un punto per lato, prima di
`accodaPassoIa`) · `fineTurno` **dopo `flushSequenza`** (5 Vespro — prima verrebbe svuotato dalla fila
che si sta chiudendo). `TitoloFase.jsx` riscritto: legge il passo in scena, segnala
`sequenza-passo-concluso`; ritirati il suo `useEffect` di cambio-fase, il contatore di id locale, il
`DURATA_MS` a mano e la lettura di `stato.faseVisibile`.

**Come `banner` si inserisce nello schema delle guardie di Fase 4** (la domanda posta dall'utente prima
di autorizzare): entra in `filaBloccaCodaVisiva` insieme ad `anim`/`muta` — e deve entrarci, perché il
Vaticinio va davanti al dado Imprevisti, che vive ancora in `codaVisiva`. Non riapre il deadlock perché
quella guardia era **bidirezionale** (il passo `ia` bloccava la coda *e* aspettava la coda); `banner` è
unidirezionale come `anim`: nel `<Sequenziatore>` prende un timer semplice, non passa mai da
`scenaLiberaPerIa`, quindi drena sempre. `scenaLiberaPerIa` non toccata.

**L'invariante d'ordine di Fase 4 fa un lavoro vero.** Verificati tutti e cinque i punti: in quattro il
respiro non è in fila. Nel quinto — `imprevistoEsito` — **c'è**, e il banner Schieramento gli finisce
davanti: esattamente quel che serve (si legge "Schieramento", *poi* l'avversario evoca).

**P2.3:** la guardia del case `"timer-scaduto"` copriva solo la fila; aggiunte
`codaVisiva.length || dadoInCorso || morteInCorso`.

**Durate:** `TEMPI.banner = { fase: 1750, vespro: 2600 }`. Il Vespro ha +850ms di **sola tenuta** —
entrata (500ms) e uscita (450ms) identiche in ms assoluti, tramite un secondo set di `@keyframes`
(`-lungo`) con le percentuali ricalcolate su 2600; riscalare le stesse avrebbe rallentato l'entrata
invece di tenere fermo il cartello. Iniettate come `--t-banner-fase`/`--t-banner-vespro`.

**P2.4:** cartello identico sui due lati — stessa posizione, tipografia, durata — con **un'unica
differenza**, la riga di attribuzione ("Il tuo turno"/"Turno avversario"; 1v1 locale "Giocatore 1/2").
**Mai capovolto**: è un overlay a schermo intero letto da chi guarda, non una carta nella metà
avversaria. L'attribuzione viene da `passo.dati.chiave`, congelata dal reducer — durante il Vespro il
turno nello stato è già girato.

**DEVIAZIONE DICHIARATA dal §10 e approvata prima di scrivere:** `faseVisibile`/`imprevistoVisivo`
**non** ritirati. Non servono a fare il banner: fanno ritardare due *letture* (numero di fase nella
pillola del rail, rotazione della carta Imprevisto) attraverso il dado Imprevisti, flusso non migrato.
Ritirarli farebbe saltare la pillola a "3 SC" mentre il cartello dice "FASE 2 VATICINIO". `faseVisibile`
perde però un consumatore. **Limite dichiarato:** `fineTurno`+`iniziaTurno` girano nella stessa
dispatch, quindi durante il Vespro la pillola mostra già il turno nuovo (differirlo toccherebbe ogni
gate su `giocatoreAttivo`). **Nessun `sincronizzaPassoBanner`** al `carica-stato`: un cartello perso è
pura decorazione, niente lo aspetta.

**Verifica.** Build pulita · nuovo `Engine/test-blindati/banner-fase.blindato.mjs` (45 asserzioni in 7
casi, verde al primo giro) · `voli.blindato.mjs` aggiornato al pilotaggio nuovo **rafforzando** le
asserzioni (ordine esatto `[Vespro, Rifornimento, 6×pesca]` al posto della sola conta; drenaggio fino a
fila vuota; `[pesca, Vaticinio]` con la fase del cartello verificata) · `tempi.blindato.mjs`
(+`TEMPI.banner`) · gli altri 4 blindati verdi senza modifiche · sweep headless **200 partite vsIA
complete** con 6 asserzioni d'ordine attive: **200/200 concluse, 0 crash, 0 stalli, 0 violazioni** su
**17025 banner** (8445 miei · 8580 IA · 3245 Vespro) — lo split ~50/50 è la prova statistica di P2.4.
*(I 5 stalli del primo giro erano un bug della politica umana del simulatore — ripescava all'infinito
un attaccante senza bersaglio valido mentre l'engine, correttamente, rifiutava di chiudere il turno per
via di Manipolatrice Verde. Corretto il simulatore, non il motore.)*

**Verifica dal vivo** (partita vsIA reale, poller DOM a 40ms — il metodo della skill `documenti-e-backup`
§B, niente "a occhio"): custom property lette dal CSS (`1750ms`/`2600ms`); durate misurate fasi 1-4
1749-1812ms e **Vespro 2595 e 2635ms**; **catena cronologica su un turno avversario intero**
`Vespro mio → Rifornimento avversario → volo-carta → Vaticinio → dado → Schieramento → Alla Carica →
prompt "Difendi"`, col Vaticinio che parte solo dopo che `.carta-volante` è sparita dal DOM;
attribuzione corretta e `transform` senza rotazione su tutti; classe `-lungo` e `animationDuration:
2.6s` solo sul Vespro; **console pulita** per l'intera sessione.
**Chiuso anche il limite dichiarato della Fase 4:** evocato un Piccolo Goblin dal vivo (il driver
precedente non ci era riuscito), l'IA ha attaccato 4 volte in due turni — il pop-up "Difendi o lasci
passare?" compare **dopo** il cartello "Alla Carica", mai sopra, e nessun banner si intromette durante
la scenografia di combattimento; il Vespro dell'avversario è partito solo a calcolo danni finito.

**Bug pre-esistente segnalato e NON toccato** (regola anti-regressione #1) → nuovo punto **P2.5** in
roadmap: avanzare di fase con la pillola mentre `imprevistoEsito` è ancora in `codaVisiva` perde
l'evento (la dispatch `continua-fase` azzera la coda), lasciando `faseVisibile` pinnato per il resto
del turno — e ora anche senza il banner Schieramento.

**Costo di ritmo dichiarato e accettato dall'utente:** mio turno +2,6s (il Vespro, che prima non
c'era), turno IA +8,8s (5 cartelli dove non ce n'era nessuno). Manopola unica: `TEMPI.banner.fase`.

Documenti aggiornati nella stessa sessione: `Idea59_Coda_Step.md` (nuovo header Fase 5 + §10 + §13 +
nota di chiusura sul limite di Fase 4), `WORLDLOOM.md` (sprint chiuso, backup v2.7, indice, sintesi
roadmap, backlog), `Roadmap_Sessione_2026-08-27.md` (header anti-regressione, righe P2.1-P2.4 chiuse,
nuovo P2.5, nuovo blocco di stato), `UX/Worldloom_UX_Codex.html` (nuova card "Banner di fase" nella
sezione 03, card "Coda di step unica" estesa alla Fase 5, card "Coda visiva" e "Turno IA passo-passo"
— quest'ultima citava ancora `s.iaInAttesa`/`avanza-ia`, ritirati in Fase 4 — e card riepilogo idea 59
aggiornate). Simulazione usa-e-getta `sim-fase5.mjs` cancellata come da regola; i 6 blindati restano.
Graphify risincronizzato sul solo codice toccato.

**Idea 59 = COMPLETA.** Nessun commit (l'utente non l'ha chiesto).


---

## 2026-08-29 (pomeriggio) — sessione "reparto finiture": rinomina, identità carta, mazzo legale

Sessione aperta per il **foil olografico**; il foil è finito ultimo perché davanti gli si sono messi
tre cantieri chiesti dall'utente lungo la strada. Backup pre-lavoro:
`App - HTML - Test/Versioni gioco/Worldloom_Gioco_v2.8_pre-foil_2026-08-29.html` +
`Backup sorgente pre-foil 2026-08-29/` (src, test blindati, i due cards.json, `genera_cards_json.py`,
e i due Excel nello stato pre-rinomina).

### Passo 0 — la premessa dell'utente era sbagliata, e andava detto

Era stato chiesto di confrontare `componi_carte.py` (Python/PIL) con la SPEC 1.6 del template HTML,
perché "componi_carte.py produce le immagini che il gioco mostra". **Non è così dal 19 agosto.** Le 99
Complete Card sono datate 2026-08-19 00:08, i PNG di `render.js` in `worldloom-cards/out/` sono delle
00:06, sono 744×1039 (il trim di `render.js --scale 1`, non i 750×1050 di PIL) e hanno visibilmente il
layout di `card.html`. La catena vera è `render.js` → `comprimi_out.py` → `Complete cards/`.
`componi_carte.py` non è toccato dall'11 agosto: **è codice morto**, ma `CLAUDE.md`, la skill
`pipeline-carte` e `Guida ai layout.html` lo indicano ancora come lo strumento che compone le carte.

Divergenza misurata fra le Complete Card in gioco (card.html al 19 agosto) e la SPEC 1.6 di oggi:
rarità fuori dalla riga tipo e sostituita dal Ruolo; 5° campo del piede da `×2 MAX` a 5 scintille;
colore del disco archetipo ricalcolato (Colosso **#6F9DD6 → #56A6BA**, campionato sui pixel); riga
efficacia ora calcolata dalla Ruota invece che scritta per carta. Geometria e tipografia invariate.
**Rigenerare era bloccato a monte, non da noi**: `data/cards-real.json` (rigenerato dalla sessione
parallela) ha tutte e 118 le carte su `flat_neutro.png`, rarità nulle, `pianeta: "[FROSTLAND]"`,
`autore: "DA COMPILARE"` e un `tipoCarta: "Pedina"` che `card.html` non conosce.

### Rinomina terminologica — Alieno/Creatura → Pedina, Kepler → Marbion

89 celle negli Excel, **con la concordanza scritta a mano frase per frase**: "Pedina" è femminile dove
"Alieno" era maschile, quindi articoli, possessivi, aggettivi e participi cambiano ("un tuo Alieno" →
"una tua Pedina"; "vengono distrutti" → "distrutte"; "restituiscilo" → "restituiscila"; "tuoi e
avversari" → "tue e avversarie"). Una find-replace avrebbe prodotto italiano sbagliato **stampato
sulle carte**. Escluse due colonne: `Nome` (i 3 nomi trattati a parte, sotto) e `Prompt Immagine`
(inglese per il generatore d'immagini, dove "alien" descrive il disegno).

**Bug vero chiuso dalla rinomina:** 15 righe di Marbion erano già marcate `Tipo Carta = Pedina`, ma
`genera_cards_json.py` conosceva solo `Alieno`/`Magia`/`Trappola` e le **scartava in silenzio**.
Marbion: da 23 a 41 Pedine.

Motore: token `"alieno"` → `"pedina"` in 12 punti (`Carta.jsx`, `Mano.jsx`, `EditorMazzi.jsx`,
`evocazione.js`, `gameReducer.js`, `magieTrappole.js`). Il vecchio valore **resta accettato in
lettura**: le partite e i mazzi già salvati in localStorage lo contengono. Una sola stringa era
visibile al giocatore. `terr_kepler` → `terr_marbion` in Excel + `magieTrappole.js` + Vocabolario.
Nome del mondo a schermo → "Marbion - Manipolatrici d'aura"; **l'id resta `kepler-452b`** apposta
(è scritto nei salvataggi e nella mappa cartelle di `sync-data.mjs`).

3 carte rinominate con i loro **14 file immagine** (`Images/`, `Complete cards/`,
`Complete cards compressed/`, in entrambi i mazzi): Resuscita Alieno → **Resuscita Pedina**, Marea di
Kepler → **Marea di Marbion**, Aliena di Midollo → **Pedina di Midollo**, più i riferimenti in
`giocatore.js`, `magieTrappole.js`, Vocabolario, Roadmap ed **entrambi i regolamenti**.

### Identità carta — Nome + Variante Illustrazione + Rarità + Finitura

Formula decisa dall'utente. `genera_cards_json.py` emette `id`, `variante`, `rarita`, `finitura` e
**verifica che le identità siano uniche**. Esempio: `condottiero-fiero__v1__comune__rainbow` e
`condottiero-fiero__v1__comune__normale` — due pezzi da collezione, **stessa illustrazione e stesso
effetto**: il foil è un trattamento di stampa, non cambia né disegno né regole. L'immagine si ricava
da **nome + variante**, mai da rarità o finitura.

Chiave adottata da `getCatalogoUniversale`, dall'editor mazzi e da `validaMazzo`/`espandiListaMazzo`.
**Nessuna migrazione distruttiva**: una riga di mazzo salvato senza `id` si risolve ancora per nome.

Il controllo d'unicità ha subito trovato **5 righe doppie identiche su tutte le colonne** (Impossibile,
Blocco degli Eventi, Intervento Superiore, Blocca Magie per 3 turni, Il Prescelto si è Elevato):
errori di trascrizione, non varianti — rimosse. Prima erano invisibili perché la chiave era il nome.

### Mazzo di default legale

`espandiCollezioneIntera` in `mazzo.js` restituiva *tutta la collezione* — 125 copie su Frost Land,
155 su Marbion, contro il massimo di 60 che `validaMazzo` faceva già rispettare nell'editor.
Comportamento pre-esistente, reso evidente dal recupero delle 15 Pedine; segnalato dall'utente
("ho 116 carte, il regolamento dice massimo 60"). Ora la partita rapida pesca **60 copie** applicando
`limiteCopieCarta` (eccezione della colonna `Limite Copie` compresa) e mescolando, così due partite di
fila non hanno lo stesso mazzo. Gli Imprevisti restano interi: il cap. 15 dà loro un minimo, non un
massimo.

### Carte senza illustrazione — stesso guscio delle altre

Il ramo Magia/Trappola senza Complete Card era un blocco di testo libero che si allungava quanto
serviva: con gli effetti lunghi delle carte nuove la carta diventava alta il doppio delle vicine e
sfondava la mano (screenshot dell'utente). Ora usa lo stesso guscio 5:7 banner/corpo/piede delle
Pedine, col testo che **scorre** dentro il corpo. Misurato in partita reale: **sei carte in mano,
illustrate e non, tutte 117×157 px**. Era anche una violazione della regola di progetto #6.

### Foil — dati pronti, resa non ancora fatta

`Finitura` letta **letterale** in `cards.json` (non un booleano): una classe CSS per valore, così
`Star Rail`/`Restricted` domani si aggiungono scrivendo nella cella. 8 carte Rainbow scelte
dall'utente, tutte con illustrazione e Complete Card, ciascuna ora anche in stampa Normale.
Rarità: riempite le 102 celle vuote con `Comune`, **lasciando intatte** le rarità già assegnate
(2 Leggendarie, 8 Epiche, 12 Ultra Rare, 12 Rare).

### Audit effetti — 62 codici non implementati

Segnalato dall'utente ("le carte nuove non sembrano funzionare") e misurato confrontando ogni
`effetto.codice` dei `cards.json` con i codici che i moduli di `src/game/` riconoscono davvero:
**69 implementati, 62 no** (30 Magie, 14 Pedine, 12 Trappole, 6 Imprevisti; 4 sono `terr_*` che
occupano lo slot Terreno senza fare nulla). I `buff_*` non sono nel conteggio: funzionano per
prefisso via `classificaSottotipoMagia`. Tabella completa con casella proposta per ciascuno in
`Engine/Worldloom_Engine_Vocabolario_Effetti.md`, sezione "audit 2026-08-29".

### Verifica

Build pulita ad ogni passo · **6 test blindati verdi** dopo ogni modifica (uno costruiva una carta
`tipoCarta: "alieno"`, aggiornato) · raffica di **200/200 partite vsIA** concluse senza crash né
stalli dopo la rinomina · test headless dell'identità (identità uniche, 8 coppie con stessa
illustrazione e stesso effetto, lista per `id` che prende la stampa giusta, lista vecchia per nome che
non si svuota) · dal vivo: editor con gruppo "Pedine" a 56 carte, **Condottiero Fiero due volte con
contatori indipendenti** (`1 / 2` e `0 / 2` dopo un solo `+`), partita reale con console pulita.

Nessun commit (non richiesto).

---

## 2026-08-29 (sera) — Audit dati carte + validatore `tools/validate_cards.py`

**Consegna.** Verificare punto per punto un'analisi esterna dei quattro Excel carte e costruire un
validatore agganciato al build. Regola data esplicitamente: non correggere nulla a fiducia, e nessuna
decisione di game design senza conferma.

**Primo risultato: l'analisi esterna era su uno stato vecchio dei file.** Otto rilievi su tredici
risultavano già chiusi o sbagliati. Verificati uno a uno prima di toccare qualsiasi cosa:
Manipolatrice Suprema già rimossa dalle proposte (`6237d77`); "Marea di Kepler" già rinominata
"Marea di Marbion" (T.1); `Rarita` compilata su tutte le righe ufficiali; le righe carta sono 268,
non 83; i testi identici sono tre e non quattro (Fato Spezzato ne ha uno diverso); l'effetto unico
di annullamento è già implementato in un solo ramo (`gameReducer.js:1951`); la spec grafica citata
come `claude/direzione-grafica-full-art.md` non esiste — è `worldloom-cards/SPEC.md`.

**Costruito.**
- `tools/validate_cards.py` — 9 controlli su `FrostLand_carte`, `FrostLand_proposte`,
  `Kepler452B_carte`, `Kepler452B_proposte` (fogli `Carte` + `Imprevisti`): vocabolario `Tipo Effetto`,
  `Ruolo`, `Archetipo`, range statistiche, coerenza codice↔testo effetto, campi di stampa, keyword
  orfane, doppia presenza carte/proposte, budget di testo. Esce con codice ≠ 0 solo sugli ERRORI.
  Flag: `--solo-errori`, `--range-strict`, `--json`.
- `tools/vocabolari.json` — vocabolari chiusi, ognuno con la sua fonte verificata dentro il progetto.
  `Tipo Effetto` è **congelato** all'insieme realmente presente (34 valori), più una proposta di lista
  chiusa a 11 valori con mappa di conversione, non applicata.
- `tools/keywords.json` — glossario delle parole chiave ammesse nei testi effetto.
- Gate al build in `genera_cards_json.py` (`cancello_validazione()`): errori → `cards.json` non si
  rigenera. Scappatoia dichiarata `--salta-validazione`.

**Scelte di progetto del validatore.**
1. **I range statistiche non sono scritti nel codice.** `leggi_range_regolamento()` fa il parsing
   della tabella del cap. 8 di `Worldloom_Regolamento_v2.1.html` a ogni esecuzione, e fallisce
   rumorosamente se la tabella cambia forma. Nessun secondo posto da tenere in sync.
2. **Il budget di testo è misurato, non stimato.** `costruisci_misuratore()` replica esattamente
   `componi_carte.py:testo_a_capo()` — stesso font Georgia, stessa larghezza, stessa logica di
   andata a capo — quindi il conteggio righe è quello vero, non un'approssimazione a caratteri.
3. **Le keyword orfane si riconoscono senza elencare i nomi di carta.** Una parola maiuscola a metà
   frase è ammessa se sta nel glossario **oppure** dentro il nome di una carta esistente. Con questa
   sola regola il controllo passa da 23 falsi positivi a 1 vero: **"Volante"**.
4. **Il vocabolario congelato invece che chiuso.** Verificato con grep che il motore non legge mai
   `effetto.tipo` (nessuna occorrenza in `src/`): la colonna è documentazione, non logica. La lista
   ammessa è quindi l'insieme attuale — serve a bloccare la deriva futura, non a bocciare il passato.

**Correzioni applicate** (le uniche che non richiedevano una decisione):
- Foglio `Come compilare`, riga **Ruolo**: aggiunto `supporto`, usato da 6 carte reali. Fonte
  incrociata su tre file (`effettiRuolo.js`, `componi_carte.py`, cap. 10 del regolamento, già
  intitolato "I sei Ruoli"): l'unico documento sbagliato era l'Excel.
- Foglio `Come compilare`, riga **Attacchi**: aggiunto Signore del Clan alle carte con 3 attacchi.
- Entrambe in tutti e due gli Excel ufficiali. `cards.json` rigenerato e verificato **byte-identico**
  a prima: le correzioni toccano solo il foglio di documentazione.

**Prima esecuzione: 0 errori, 199 avvisi.** Gli avvisi sono tutti punti in attesa di una decisione
dell'utente (V.5–V.13 nella Roadmap), non difetti da correggere subito.

**Contraddizioni fra file, segnalate e non risolte** (nessuna scelta presa da solo):
- **Quale renderer di carta è vivo.** `componi_carte.py` (3 righe Pedine / 6 Magie, tronca in silenzio
  con `…`) contro `worldloom-cards/render.js` + `SPEC.md §6` (~6 / ~9, con rilevatore di overflow
  proprio). La Roadmap T.9 dice che il primo è codice morto dall'11 agosto; `CLAUDE.md` e la skill
  `pipeline-carte` lo indicano come pipeline viva. Il controllo 9 misura il primo — l'unico
  riproducibile in modo esatto — e dichiara la contraddizione in un avviso a sé.
- **Statistiche delle proposte.** Il foglio `Leggimi` di entrambi i file proposte dichiara "tutte
  verificate contro i range del cap. 8"; 20 righe di quelle stesse proposte sono fuori range.
- **Limite copie.** `SPEC.md §3.4` lo fa dipendere dalla rarità; i cap. 3 e 17 del regolamento dicono
  ancora "stampato sulla carta, cambia da carta a carta" — ed è così che funzionano `Limite Copie` e
  il badge `×N max`.

**Trovato di passaggio, segnalato e non toccato (V.10):** la colonna `Sottotipo` degli Excel esiste e
contiene `Normale/Continua/Terreno/Rapida`, ma `genera_cards_json.py:158` la ignora e deduce il
sottotipo dal prefisso `terr_` del codice effetto. Le Magie Continue e Rapide arrivano nel gioco
marcate `"normale"`. Il commento nel codice ("nessuna colonna Excel dedicata esiste ancora") è
superato dai fatti.

**Graphify.** Risincronizzato in modo **parziale e dichiarato**: `detect_incremental` segnalava 309
file cambiati, ma 296 sono immagini di carte e documenti archiviati di sessioni parallele, la cui
estrazione semantica costa centinaia di subagent vision. Aggiornati solo i 10 file di codice (AST,
nessun LLM): grafo da 657 a **702 nodi / 1749 archi**, 45 nodi nuovi, community nuova "Validatore
Dati Carte" (36 nodi). Le 296 immagini/documenti **restano non timbrati nel manifest**, quindi un
`--update` futuro li ricoda automaticamente. `graph.html` e `GRAPH_REPORT.md` rigenerati.

**Documenti non toccati, e perché:** nessuna regola di gioco è cambiata, quindi i due regolamenti
restano invariati; nessuna interazione o animazione è cambiata, quindi UX Codex e Foglio Maestro UX
restano invariati. Le divergenze trovate nei regolamenti (cap. 8 range, cap. 3/17 limite copie) sono
segnalate come V.8 e V.12, non riscritte: cambiarle è una decisione di game design.
