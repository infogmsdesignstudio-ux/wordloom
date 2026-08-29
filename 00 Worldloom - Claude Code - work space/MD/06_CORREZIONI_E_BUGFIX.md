# 6 · Correzioni effettuate — sintomo, causa vera, fix, verifica

> Ogni voce segue lo stesso schema. Il valore di questo documento non è l'elenco, ma le **cause
> vere**: quasi mai coincidono col sintomo riportato, e diverse volte il "bug" non era un bug.

---

## 6.1 Il caso più istruttivo — P0.3 · P0.4 · P0.5

**Sintomi riportati (tre, separati):** "i numeri di danno non compaiono" · "il pop-up *Difendi*
resta appeso" · "il combattimento non funziona".

**Causa vera — una sola, e nessuno dei tre sintomi la descriveva.** Il reducer accodava tutto
correttamente (verificato headless: `codaVisiva = [dado, attacco, esitoCombattimento, morte?]`), e
in tutti gli scontri **singoli** il numero compariva a piena opacità. Il bug si vedeva **solo
quando l'IA incatenava un SECONDO attacco nello stesso turno**: `proseguiSeIA` →
`prossimaAzioneAttaccoIA` apriva il combattimento nuovo **sincrono, dentro la stessa dispatch** che
aveva appena risolto il primo, mentre dado/balzo/numero del primo erano ancora in coda visiva.
Il pop-up "Difendi" del secondo attacco compariva subito, coprendo il numero del primo (→ "il
numero sparisce"), sembrando lo stesso pop-up rimasto appeso (→ "bloccato"), e coprendo il dado del
primo (→ "nessun dado visto"). Le guardie `idBalzoRichiesto`/`idDadoRichiesto` non bastavano:
per un combattimento *nuovo* quei campi sono ancora nulli.

**Fix (a tappe, ognuna da feedback dal vivo successivo):**
1. `PromptCombattimento.jsx` e `CatenaStriscia.jsx` ritornano `null` finché `codaVisiva` ha eventi
   in sospeso e c'è un combattimento.
2. Il balzo partiva prima che il dado finisse di rotolare → ritardi ricalibrati.
3. Numero di danno "sballato" e sulla carta di uno scontro precedente: `avviaAttacco` ora azzera
   `esitoCombattimento` / `animazioneAttacco` / `lancioDado` all'inizio di ogni nuovo attacco.
4. Il pop-up "Trappola disponibile" compariva col dado ancora in rotazione → nuovo stato
   `s.dadoInCorso`, azzerato da `LancioDado.jsx` con la dispatch `dado-animazione-conclusa`.
5. Il numero fluttuante si sovrapponeva al pop-up successivo → stesso schema con `s.esitoInCorso`.

**Verifica:** riprodotto lo scenario esatto dal vivo prima e dopo; misurato che il pop-up passa da
comparire a 244 ms (dado in rotazione) a ~1450 ms (dado fermo sul risultato). Sweep 80+120 partite,
0 crash.

**Il seguito che conta:** ognuno di questi 5 fix ha aggiunto **una guardia**. È esattamente la
dinamica che ha reso necessario il refactor "coda di step unica" — e infatti tutte e cinque quelle
guardie oggi **non esistono più**.

---

## 6.2 Bug che non erano bug (verificati, chiusi senza toccare codice)

Meritano di stare in un documento di consegna: evitano di rifare il lavoro.

| Punto | Sintomo | Cosa si è scoperto |
|---|---|---|
| **P0.1** | "Piccolo Goblin rimasto in retrovia dopo un tributo" | Riprodotto lo scenario esatto con carte vere: il posto liberato dal sacrificio viene ripreso **sempre** dalla carta appena evocata. Confermato dal regolamento (cap. 7): la Pedina evocata entra in prima linea se c'è spazio, valutato **dopo** il sacrificio. La regola "avanzamento obbligatorio" (cap. 4) vale solo quando una Pedina di prima linea **muore** |
| **P0.8 (b)** | "Allineamento e spaziatura della colonna pile avversaria non corrispondono al mio lato" | Misurato ogni riquadro via DOM: **dimensioni identiche ovunque** (83×116 / 180×116), struttura perfettamente specchiata. L'impressione di disordine era un effetto collaterale di P0.8 (a), che invece era un bug vero |
| **F.4** | "Evocazione bonus non disponibile al turno 6" | Non riprodotto: sweep + test mirato mostrano che si apre correttamente. **Causa probabile: un messaggio fuorviante** — il vecchio testo catch-all diceva sempre "disponibile dal 2° turno" anche quando il motivo vero era altro. Sostituito con 4 messaggi specifici, in attesa della prossima occorrenza |
| **P0.7** | "Intervento Divino attivata dall'IA dalla mano" | Controllato: sia il percorso umano (`selezionaMano`) sia quello IA piazzano le Trappole con `pronta: false`. Serve un caso preciso per capire se è un bypass vero o un fraintendimento |

---

## 6.3 Correzioni del motore e del rendering

### P0.2 — Zona avversario "al contrario"

**Causa:** il redesign campo (rail + 3 righe) invertiva solo l'ordine **orizzontale** per
l'avversario, non quello **verticale**: le 3 righe si rendevano sempre nello stesso ordine
dall'alto in basso, lasciando la prima linea avversaria al bordo esterno dello schermo invece che
vicino al confine condiviso.
**Fix:** in `Campo.jsx` (`ZonaGiocatore`) ordine righe invertito anche verticalmente per `!mio`.
**Verifica via DOM, non a occhio:** zona avversario `[Risorse, Retrovia, Prima]`, la mia
`[Prima, Retrovia, Risorse]` — le due prime linee entrambe adiacenti al confine.

### P0.6 — Scroll nel campo

**Causa doppia:** (1) `.field { overflow-x: auto }` forzava anche `overflow-y: auto` → barra
verticale sui ~9 px di sfioramento; (2) `--campo-scale` si attivava solo sotto `max-height: 500px`
e guardava solo l'altezza.
**Piano A scartato in corsa** (provato e misurato): ~290 px di "cornice" (mano, titoli, bottoni)
non passavano da `var(--campo-scale)`, quindi su finestre basse restava scroll comunque.
**Piano B adottato:** vero `transform: scale(k)` su un wrapper `.tavolo` a **larghezza di progetto
fissa** (`--tavolo-w: 1400px`, così il layout interno non cambia mai), con
`k = min(largh.finestra / --tavolo-w, alt.disponibile / alt.naturale)` **senza tetto a 1** — su
schermi grandi il tavolo si ingrandisce (richiesta esplicita). `.tavolo-fit` è full-bleed per
uscire dal `max-width` di `.app`; pop-up e overlay stanno **fuori** dal wrapper.
**Verifica:** ~10 dimensioni di finestra, da 3000×1600 a iPhone SE: zero barre, zero clipping.
**Limite noto aperto:** i VFX di volo calcolano la posizione dai rect scalati ma disegnano
l'elemento a dimensione piena → lieve stacco di scala durante il volo.

### P0.10 — Il turno saltava da solo alla ripresa

**Causa:** `turnoScadenza` è un **timestamp assoluto** e `caricaPartita` non lo aggiornava. Un
salvataggio ripreso anche pochi minuti dopo aveva la scadenza nel passato → `Campo.jsx` mandava
subito `timer-scaduto`, facendo saltare il turno di chi riprendeva, e a cascata i successivi.
**Fix:** `caricaPartita` rimette `turnoScadenza = Date.now() + TEMPI.turno`.
**Verifica dal vivo:** prima la partita ripresa avanzava da sola di 3 turni all'apertura; dopo
resta ferma esattamente dove salvata.

### X.3a / X.4 follow-up — i tasti "Elimina" e "Ricomincia" inerti

**Causa (la stessa per entrambi):** `confirm()` nativo. Dopo qualche `alert()` il browser offre
"impedisci a questo sito altre finestre di dialogo", e da quel momento `confirm()` ritorna
**sempre `false`** → il tasto sembra rotto.
**Fix:** conferme **in-linea** nell'interfaccia (riga "Conferma / Annulla") al posto dei dialoghi
nativi; gli `alert()` dell'import diventano avvisi in-linea.
**Da ricordare:** in questo progetto **non si usano `confirm()`/`alert()` nativi**.

---

## 6.4 Le correzioni dentro il refactor idea 59

### F.6 — "una creatura che sarebbe dovuta morire non è morta"

Non corretta con una patch: **eliminata strutturalmente**. Dalla Fase 1 la morte in combattimento è
un passo `muta` **differito**: la creatura resta nello stato (0 Vita) finché non è il suo momento
nella fila, poi `ripulisciCampo` + avanzamento obbligatorio girano nel gestore del passo. Niente
più guardie sul rendering di creature morte. La parte "numeri incoerenti fra scontro N e N+1" cade
perché `proseguiSeIA` non calcola lo scontro successivo finché `s.sequenza` non è vuota.
**Resta da riverificare dal vivo col caso originale dell'utente.**

### I due bug trovati *dentro* la verifica della Fase 4

1. **`[muta:ia, scelta:catena]`** — il respiro dell'IA davanti a una decisione ancora in sospeso
   del giocatore. **Colto da `catena.blindato.mjs`**, non dall'occhio. → Invariante nuovo: il passo
   `ia` sta **sempre in fondo**, applicato in `accodaPassi` (un posto solo, non a carico dei
   chiamanti).
2. **Deadlock** — il turno IA fermo per sempre su "L'avversario evoca…": la coda visiva aspettava
   la fila e il respiro aspettava la coda visiva. **Colto dal vivo.** → Il passo `ia` è l'unica
   eccezione alla regola "la coda visiva aspetta la fila"; le due guardie estratte in `sequenza.js`
   per poterle blindare.

### Il limite noto della Fase 4, chiuso

"Gli attacchi diretti allo Stratega a campo sgombro si risolvono tutti in una dispatch": ora sono
scanditi, **misurati ~1800 ms l'uno dall'altro** col numero rosso del danno visibile in mezzo.

### `sincronizzaPassoIa` e `sincronizzaPassoCatena` al `carica-stato`

Senza, una partita ripresa a metà turno IA (o con una catena aperta) restava **ferma per sempre**:
`s.sequenza` viene svuotata al caricamento, e il passo che avrebbe fatto proseguire il gioco non
sarebbe mai stato ricreato.

---

## 6.5 Correzioni ai dati e alla pipeline (2026-08-29)

### T.2 — 15 Pedine scartate in silenzio

**Sintomo:** nessuno. Il bug è emerso solo facendo i conti dopo la rinomina.
**Causa:** dopo la rinomina, 15 righe di Marbion erano marcate `Pedina` in Excel, ma
`genera_cards_json.py` conosceva **solo `Alieno`** → le scartava **senza dire nulla**.
**Effetto:** Marbion passa da **23 a 41 Pedine**.
**Lezione:** uno scarto silenzioso è peggio di un errore. È una delle ragioni per cui è nato il
validatore.

### T.5 — Il mazzo di default era illegale

La partita rapida usava **tutta la collezione** (125 e 155 copie) contro il massimo di 60 imposto
dall'editor. Ora pesca 60 copie rispettando il limite per carta, come già faceva l'editor.

### T.4 — 5 righe doppie identiche negli Excel

Trovate dal controllo d'unicità introdotto con l'identità carta (T.3). Rimosse.

### T.6 — Le carte senza illustrazione sfondavano la mano

Magie/Trappole/Imprevisti privi di Complete Card erano disegnati come blocco di testo libero.
Ora usano lo stesso guscio 5:7 delle Pedine — **misurate 117×157 tutte** — e il testo lungo
**scorre** invece di allungare la carta.

### V.3 / V.4 — Documentazione Excel sbagliata

Il foglio "Come compilare" ometteva il Ruolo `supporto` (usato da 6 carte) e affermava che solo
"Il Re Antico" ha 3 attacchi (ne ha 3 anche "Signore del Clan"). Corretti in entrambi gli Excel.
`cards.json` rigenerato dopo e verificato **byte-identico**: le correzioni toccavano solo
documentazione.

---

## 6.6 Correzioni rimaste a metà — e perché

| Punto | Cosa è stato fatto | Cosa manca e perché |
|---|---|---|
| **F.1 · simbolo centrato** | 2 iterazioni: la carta Imprevisto torna a piena dimensione dello slot e sborda ruotando ("come giri una carta vera"). `background-position: center 38%` per centrare l'emblema | **Il simbolo si è ri-scentrato.** `38%` centra l'emblema **solo** a 0°/180°: a 90°/270° "38% dall'alto" diventa "38% da un lato". Il fix vero richiede un **retro carta simmetrico** (solo emblema centrato, niente scritta WORLDLOOM) — cioè un asset nuovo, non una riga di CSS. In tensione con la decisione "il retro non si cambia, si blinda com'è" |
| **P3.2 tappa B** | tappa A: `cimiteroImprevisti` nello stato, layer scoperto sotto la carta in corso, zoom sfogliabile | manca l'animazione "va sotto" all'attivazione |
| **P2.5** | **niente, di proposito** | bug pre-esistente notato durante la Fase 5. La regola M1 dice: si segnala, non si tocca. Il fix probabile (rilasciare il pin anche in `continuaFase`, o rendere `imprevistoEsito` non-cancellabile) tocca la regola delicata "`codaVisiva` azzerata a ogni dispatch vera" |
| **P1.4** | diagnostica **visibile** (banner rosso + riga nel Registro Mosse) perché l'utente non riesce ad aprire la console | aspetta uno screenshot alla prossima occorrenza |

---

## 6.7 Le regole anti-regressione nate dalle correzioni

Non sono teoria: ognuna nasce da un danno reale.

1. **Toccare solo la cosa esatta chiesta** — nata dal 2026-08-28, quando è stata chiesta la carta
   Imprevisto e sono stati toccati anche `.campo-slot-trappola` e `.campo-pila-sfondo`.
2. **Il token `tipoCarta` accetta sia `"pedina"` sia `"alieno"` in lettura** — togliere il vecchio
   romperebbe le partite e i mazzi già salvati nel `localStorage` degli utenti.
3. **L'id del mondo resta `kepler-452b`** — è scritto nei salvataggi e nella mappa cartelle di
   `sync-data.mjs`.
4. **Una riga di mazzo salvato senza `id` si risolve per nome** — non rimuovere il ripiego, o i
   mazzi vecchi si svuotano.
5. **L'immagine di una carta dipende da nome + variante**, mai da rarità o finitura.
6. **`Finitura` si passa letterale**, non come booleano.
7. **`s.codaVisiva` è azzerata a ogni dispatch "vera"**; le dispatch di servizio non la azzerano.
8. **Il passo `ia` sta sempre in fondo alla fila**, e **è l'unica eccezione** alla regola "la coda
   visiva aspetta la fila".
9. **Niente `confirm()`/`alert()` nativi.**
10. **I vocabolari `tools/vocabolari.json` e `tools/keywords.json` sono autoritativi**: un valore
    fuori lista è un **errore**, non un avviso. Aggiungerne uno è una decisione, non una formalità.
11. **I range statistiche non si scrivono mai nel validatore**: si leggono dal cap. 8 del
    regolamento a ogni esecuzione. Se cambia la tabella, cambia il controllo — non c'è un secondo
    posto da tenere in sync.
