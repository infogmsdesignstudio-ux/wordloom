# Vocabolario Effetti — reference per l'engine (Worldloom)

> **Scopo di questo file**: ogni volta che si tocca l'engine per un effetto di una carta (nuovo o
> esistente), consultare PRIMA questo documento per capire in quale "casella" (hook/funzione/file)
> quell'effetto deve entrare, seguendo lo stesso schema già usato da tutti gli altri effetti dello
> stesso tipo — invece di reinventare un punto d'aggancio nuovo ogni volta. Tenerlo aggiornato quando
> si aggiunge un hook nuovo o si implementa un codice mancante (vedi tabella in fondo).
>
> Creato il 2026-08-27 con un audit completo di tutte le carte stilate (Frost Land + Kepler-452B,
> `src/data/generated/mazzi/*/cards.json`) incrociate riga per riga con l'engine reale
> (`effettiCarta.js`, `magieTrappole.js`, `imprevisti.js`, `evocazione.js`, `combattimento.js`,
> `giocatore.js`, `gameReducer.js`) — non da graphify semantico, da lettura diretta del codice.

## Come si riconosce il "momento" giusto di una carta

Il campo `effetto.tipo` nell'Excel/cards.json è testo libero scelto da chi compila la carta — NON è
un enum a cui l'engine si aggancia direttamente (es. "summon", "passive", "attack" sono usati in modo
non sempre coerente). Il vero punto d'aggancio va scelto guardando **quando l'effetto deve scattare**,
non la parola scritta in `tipo`. Le 19 caselle canoniche sono queste:

### 1. `PASSIVO` — ricalcolato al volo, mai stato mutato in modo permanente
Bonus che dipende dal campo attuale (es. "+2 Attacco per ogni altra Manipolatrice") e va ricalcolato
ad ogni utilizzo, non scritto una volta e dimenticato.
- **Dove**: `effettiCarta.js` → `bonusAttaccoPassivo(creatura, giocatore)` / `bonusParataPassivo(...)`.
- **Chiamato da**: `combattimento.js` → `attaccoTotale`/`parataTotale` (quindi vale automaticamente
  ovunque queste due funzioni vengano usate: combattimento, UI stat comparate, ecc.).
- **Esempi già implementati**: rossa, verde (solo bonus, non il vincolo — vedi TODO), midollo, lupo,
  guardiano, custode, crisbota, draghetto, poteredivino.
- **Pattern**: `if (codice === "xyz") bonus += N;` dentro la funzione giusta (Attacco o Parata o
  entrambe). Se il bonus dipende da UN'ALTRA carta con un codice specifico (es. custode → tutti gli
  altri Colosso), il check va scritto lato beneficiario, non lato sorgente (guarda `custode` come
  esempio: nessun trigger proprio, sono gli altri Colosso a controllare `campo.some(c.effetto?.codice
  === "custode")`).

### 2. `EVOCAZIONE` — "All'evocazione: ..."
- **Dove**: `effettiCarta.js` → `effettoEvocazione(creatura, giocatore, avversario, log)`.
- **Chiamato da**: `gameReducer.js`, nei 5 punti in cui una creatura entra davvero in campo
  (evocazione normale/bonus di "io" e "avversario", + tributo).
- **Pattern**: `if (codice === "xyz") { ...muta stato...; log(\`✦ ${creatura.nome}: ...\`); }`.
- **Sotto-caso RICERCA** (pesca dal proprio mazzo/mano invece che un effetto su bersaglio): stesso
  hook, nessuna funzione a parte — vedi `basealim`, `artigiano`.

### 3. `VINCOLO_EVOCAZIONE` — condizioni che bloccano l'evocazione stessa (non un effetto A evocazione)
- **Dove**: `evocazione.js` → `puoEvocareNormale(giocatore, carta)`.
- **Esempio**: `suprema` ("Evocabile solo se controlli almeno 3 Manipolatrici").
- **Pattern**: `if (carta.effetto?.codice === "xyz" && <condizione non soddisfatta>) return false;`
  PRIMA del controllo generico su livello/tributi.

### 4. `BONUS_CONTRO` — bonus che dipende da CHI si sta affrontando (non dal campo in generale)
- **Dove**: `effettiCarta.js` → `bonusAttaccoContro(attaccante, difensore)`.
- **Chiamato da**: `combattimento.js` → `risolviSimbolo`.
- **Esempio**: `troll` (+5 Attacco contro un Alieno di Livello superiore).

### 5. `SIMBOLO` — scatta in base al simbolo del dado uscito in combattimento
- **Dove**: `effettiCarta.js` → `effettiSimbolo(simbolo, attaccante, difensore, difProprietario,
  dannoDifensore, log)`. Ritorna danno EXTRA da sommare.
- **Chiamato da**: `gameReducer.js`, durante la risoluzione del danno (dopo che il dado è stato tirato
  e il simbolo è noto).
- **Esempi**: araldo (Spada), braccio (stesso simbolo del turno prima), dragolinf (Schivata subita →
  danno diretto), blu (Scudo → cura Stratega), gialla (Schivata → pesca).

### 6. `DIFESA` — capacità speciali quando la creatura sta DIFENDENDO
- **Dove**: `effettiCarta.js` → `magoPuoRitirare(difensore)` (ritiro dado) /
  `consumaSchivataAutomatica(difensore)` (schivata gratuita bancata o ricorrente).
- **Chiamato da**: `gameReducer.js`, nel flusso di risoluzione della difesa.
- **Esempi**: mago (ritira 1 volta/turno), cervo (1ª schivata/turno automatica), diplomatico
  (schivata bancata dal tiro d'ingresso).

### 7. `PRE_ATTACCO` — scatta PRIMA che la creatura attacchi, ogni volta che attacca
- **Dove**: `effettiCarta.js` → `attivaEffettoPreAttacco(creatura, log)`.
- **Chiamato da**: `gameReducer.js`, appena prima di risolvere l'attacco.
- **Esempio**: cremisi (tira 1 dado, rischio/ricompensa).

### 8. `SOPRAVVIVENZA` — modifica il danno finale prima che venga applicato
- **Dove**: `effettiCarta.js` → `applicaDannoConSopravvivenza(creatura, danno)`.
- **Chiamato da**: `gameReducer.js`, al momento di applicare il danno vero (per entrambi i lati dello
  scontro, attaccante e difensore).
- **Esempio**: condottiero (sopravvive con 1 Vita alla prima botta letale del turno).

### 9. `MORTE_PROPRIA` — quando MUORE, può evitare di restare morta (es. rinascita)
- **Dove**: `effettiCarta.js` → `effettoMorte(creatura, giocatore, tiroImprevisti, log)` — ritorna
  `true` se è tornata in campo (e allora NON va al cimitero).
- **Chiamato da**: `giocatore.js` → `ripulisciCampo`.
- **Esempio**: nera (tira il Dado Imprevisti, con +2 torna in campo).

### 10. `MORTE_OFFENSIVA` — quando MUORE, colpisce il campo NEMICO
- **Dove**: `effettiCarta.js` → `effettoMorteOffensivo(creatura, giocatore, avversario, log)`.
- **Chiamato da**: `giocatore.js` → `ripulisciCampo` (solo per le morti definitive, dopo
  `effettoMorte`).
- **Esempio**: serpente (trascina con sé l'Alieno nemico con Vita più bassa).

### 11. `MORTE_ALLEATO` — quando un ALTRO tuo Alieno muore, questa carta reagisce
[FATTO 2026-08-27] Hook generico `effettoMorteAlleato(creaturaMorta, primaLinea, log)` in
`effettiCarta.js`, chiamato da `giocatore.js` → `ripulisciCampo` nello stesso punto del bonus Tank
(+3 Vita, cablato a parte, resta invariato). Primo (e finora unico) caso reale: **mammut** (Mammut
Glaciale) +4 Vita permanenti, SOLO se Mammut è vivo ED è in prima linea al momento della morte
dell'alleato — si SOMMA al +3 di Ruolo Tank (confermato con l'utente: i Ruoli sono sempre automatici,
un effetto di carta li sostituisce solo se cita esplicitamente "Ruolo", non è questo il caso). Un
secondo caso futuro va aggiunto come nuovo `if (creaturaMorta... )` dentro `effettoMorteAlleato`
stesso, non come un altro branch cablato a parte in `ripulisciCampo`.

### 12. `INIZIO_TURNO` — scatta ad ogni tuo turno in cui la creatura resta in campo
- **Dove**: `effettiCarta.js` → `effettiInizioTurno(giocatore, log)`.
- **Chiamato da**: `gameReducer.js`, dentro `iniziaTurno`.
- **Esempio**: prisma (+2 Attacco permanenti ogni turno).

### 13. `MAGIA` — Magia "Normale", effetto immediato quando giocata dalla mano
- **Dove**: `magieTrappole.js` → `risolviMagia`/`giocaMagia` (risoluzione), più
  `magiaRichiedeBersaglio` (se serve scegliere un bersaglio), `numeroBersagliMagia` (1 di default),
  `magiaGiocabile` (se è giocabile ora — bersagli validi disponibili, ecc.).
- **Pattern**: un `if (codice === "xyz") { ...; return true; }` dentro `risolviMagia` — `return true`
  SOLO se l'effetto si è applicato davvero (altrimenti niente notifica pop-up, niente scarto).
- Le Magie "di Potenziamento" (buff_A_B, split sul nome del codice) sono già generiche, non serve
  aggiungerne una a mano per ogni nuovo valore A/B.

### 14. `TERRENO` — Magia che occupa lo slot Terreno condiviso, effetto passivo per ENTRAMBI
- **Dove**: `magieTrappole.js` → ramo `codice.startsWith("terr_")` dentro `risolviMagia` (piazzamento)
  + `modificaDannoDaTerreno(terreno, simbolo, danno)` / `retrovieEsposteDaTerreno(terreno)` (effetto
  vero, letto da `combattimento.js`/`gameReducer.js` ad ogni scontro).

### 15. `TRAPPOLA` — coperta, si attiva in risposta a un evento (attacco dichiarato, dopo il tiro,
attacco diretto)
- **Dove**: eleggibilità in `magieTrappole.js` → `ELEGGIBILITA_RISPOSTA` (un predicato per codice,
  controlla l'evento vero E chi può giocarla — MAI un guard separato lato chiamante, per costruzione
  evita la classe di bug "l'IA si autodistrugge con una propria trappola difensiva", vedi commento in
  `magieTrappole.js`); risoluzione vera in `gameReducer.js` → `applicaEffettoTrappola` (agganciata alla
  catena, cap. attaccoDichiarato/evocazione) o `risolviTrappolaScelta` (vecchio flusso a scelta
  singola, ancora usato per dopoTiro/attaccoDiretto — Sezione 4 della roadmap catena, non ancora
  agganciata).
- **Pattern nuovo codice**: (1) aggiungere il predicato in `ELEGGIBILITA_RISPOSTA`; (2) aggiungere il
  ramo `if (codice === "xyz") { ...; return; }` dentro `applicaEffettoTrappola`.

### 16. `TRAPPOLA_EVOCAZIONE` — Trappola che scatta sull'EVOCAZIONE nemica, non su un attacco
- **Dove**: `magieTrappole.js` → `risolviTrappolaEvocazioneNemica(codice, ...)`.
- **Chiamato da**: stessi 5 punti di evocazione di `EVOCAZIONE`, tramite `apriCatenaEvocazione`.
- **Esempi**: rifiutoterra (boardwipe), ingannovinc (controllo temporaneo — occhio a
  `restituisciControlloTemporaneo`, chiamata a ogni fine turno per far scadere l'effetto).

### 17. `IMPREVISTO` — vale per ENTRAMBI i giocatori, non annullabile
- **Dove**: `imprevisti.js` → `risolviImprevisto(carta, proprietario, avversario, log, stato)`.
- **Chiamato da**: `avanzaImprevisti`, quando la carta in corso arriva a 4 movimenti.
- **Pattern**: `if (codice === "xyz") { entrambi.forEach(g => ...); log("..."); }`.

### 18. `RUOLO` — non è un codice-carta, è l'Archetipo/Ruolo generico (Aggressore/Difensore/Tank/
Evasivo) che si applica a TUTTE le carte con quel ruolo
- **Dove**: `combattimento.js` → `attivaEffettoAggressore`/`attivaEffettoDifensore`/
  `attivaEffettoEvasivo`; Tank dentro `giocatore.js` → `ripulisciCampo`.
- Non serve toccare questa casella per una nuova carta, a meno che non si stia introducendo un
  Ruolo nuovo (evento raro, va discusso a parole prima — cap. regola di processo in CLAUDE.md).

### 19. `VANILLA` — nessun effetto unico, solo statistiche
- **Dove**: nessun hook. `effetto.codice` è `null`, `effetto.tipo` è `"none"` o `"vanilla"`.
- Non serve fare nulla nell'engine: se una carta ha testo tipo "Nessun effetto unico", è già a posto
  così com'è.

---

## Procedura quando si aggiunge/ripara un effetto

1. Leggere il testo esatto della carta (`cards.json`, campo `effetto.testo`) — non fidarsi del campo
   `tipo` da solo, può essere fuorviante (vedi sopra).
2. Scegliere la casella giusta tra le 19 sopra guardando IL MOMENTO in cui l'effetto scatta nel testo,
   non la parola nel campo `tipo`.
3. Scrivere il codice nel file/funzione indicati per quella casella, seguendo il pattern indicato — se
   la casella richiede una modifica in due punti (es. TRAPPOLA: eleggibilità + risoluzione), farle
   entrambe nella stessa sessione.
4. Verificare con una simulazione headless usa-e-getta (`sim-*.mjs` nella root di "App - HTML - Test",
   importa `gameReducer.js`/i moduli engine direttamente, cancellata con `rm -f` dopo l'uso — convenzione
   già in CLAUDE.md) prima di considerarlo fatto.
5. Aggiornare la tabella qui sotto (colonna "Stato").

---

## Tabella completa — ogni codice-carta esistente oggi, dove vive, se è implementato

Generata dall'audit del 2026-08-27 su `src/data/generated/mazzi/{frost-land,kepler-452b}/cards.json`
incrociato con l'engine. "Condiviso" = presente identico in entrambi i mondi (Magie/Trappole/Imprevisti
neutrali).

### Alieni — Frost Land

| Codice | Carta | Casella | Stato |
|---|---|---|---|
| mammut | Mammut Glaciale | MORTE_ALLEATO | ✅ (2026-08-27) |
| guardiano | Guardiano Glaciale | PASSIVO | ✅ |
| troll | Troll Folle | BONUS_CONTRO | ✅ |
| modell | Modellatore Ghiaccio | EVOCAZIONE | ✅ |
| evocatore | Evocatore del Sangue | EVOCAZIONE | ✅ |
| gelo | Figlio del Gelo | EVOCAZIONE | ✅ |
| custode | Custode del Ghiaccio | PASSIVO (lato beneficiario) | ✅ |
| re | Il Re Antico | — | ✅ dato diretto (`attacchi:3` in cards.json); `attacchiPerTurno()` in effettiCarta.js esiste ma non è mai chiamata da nessuno — codice morto, vedi TODO |
| lupo | Lupo Famelico | PASSIVO | ✅ |
| goblin | Piccolo Goblin | EVOCAZIONE | ✅ |
| esplor | Esploratore Gallerie | EVOCAZIONE | ✅ |
| corrutt | Corruttore dei Deboli | EVOCAZIONE | ✅ |
| braccio | Il Braccio Destro | SIMBOLO | ✅ |
| lame | Maestro delle Lame | EVOCAZIONE | ✅ |
| araldo | Araldo Tempesta | SIMBOLO | ✅ |
| mago | Mago Sorprendente | DIFESA | ✅ |
| condottiero | Condottiero Fiero | SOPRAVVIVENZA | ✅ |
| cremisi | Maestro del Patto Cremisi | PRE_ATTACCO | ✅ |
| basealim | La Base Alimentare | EVOCAZIONE (ricerca) | ✅ |

### Alieni — Kepler-452B

| Codice | Carta | Casella | Stato |
|---|---|---|---|
| rossa | Manipolatrice Rossa | PASSIVO | ✅ |
| viola | Manipolatrice Viola | EVOCAZIONE | ✅ |
| verde | Manipolatrice Verde | PASSIVO + vincolo comportamentale | ✅ (2026-08-27) |
| nera | Manipolatrice Nera | MORTE_PROPRIA | ✅ |
| blu | Manipolatrice Blu | SIMBOLO | ✅ |
| gialla | Manipolatrice Gialla | SIMBOLO | ✅ |
| bianca | Manipolatrice Bianca | EVOCAZIONE | ✅ |
| midollo | Pedina di Midollo | PASSIVO | ✅ |
| crisbota | Crisbota Simbiotica | PASSIVO | ✅ |
| domatore | Vecchio Domatore | EVOCAZIONE | ✅ |
| prisma | Coleottero Prisma | INIZIO_TURNO | ✅ |
| suprema | Manipolatrice Suprema | EVOCAZIONE + VINCOLO_EVOCAZIONE | ✅ |
| artigiano | Artigiano Potente | EVOCAZIONE (ricerca) | ✅ |
| cervo | Cervo Luminoso | DIFESA | ✅ |
| diplomatico | Diplomatico Aureo | EVOCAZIONE + DIFESA (schivata bancata) | ✅ |
| draghetto | Draghetto Arcobaleno | PASSIVO | ✅ |
| dragolinf | Drago Linfatico | SIMBOLO | ✅ |
| manipstrum | Manipolatore di Strumenti | EVOCAZIONE | ✅ (2026-08-27) |
| poteredivino | Potere Divino | PASSIVO | ✅ |
| serpente | Serpente Radiale | MORTE_OFFENSIVA | ✅ |
| — | Cavaliere di Marbion, Lucertola Schiva, Lince Petalosa | VANILLA | ✅ (nessun codice, corretto così) |

### Magie/Trappole/Imprevisti — condivisi tra i due mondi

Tutti verificati ✅ implementati: buff_5_3, buff_3_2, buff_5_0 (MAGIA, generiche via split del
codice), mass_atk, kill, revive, stun (MAGIA), terr_scudo, terr_marbion, terr_spada (TERRENO), cancel,
ambush, reroll, mirror, stopatk, divine (TRAPPOLA), tempesta, ombra, forte, ribalta, riserve, respiro,
convergenza, effimeri (IMPREVISTO).

### Magie/Trappole solo Frost Land

cullamondo, distrsoff, ecogelo, potestremo (MAGIA) — ✅; copiare, ingannovinc, spezzavolonta (TRAPPOLA
/ TRAPPOLA_EVOCAZIONE) — ✅.

### Trappole solo Kepler-452B

cristallo (TRAPPOLA) — ✅; rifiutoterra (TRAPPOLA_EVOCAZIONE) — ✅.

---

## Codici NON implementati — audit 2026-08-29 (carte 32-61)

Le tabelle qui sopra fotografano l'engine al **2026-08-27** e a quella data erano complete. Da allora
sono state trascritte negli Excel le carte nuove (lavorazione "Nuove idee carte 32-61") e i loro
codici effetto **non sono mai stati cablati nel motore**: la carta entra in mano, si gioca, va al
cimitero, ma non fa nulla. Segnalato dall'utente il 2026-08-29 ("le carte nuove non sembrano
funzionare") e misurato confrontando ogni `effetto.codice` presente in `cards.json` con i codici che
i moduli di `src/game/` riconoscono davvero.

**Stato: 69 codici implementati, 62 no.** Non sono nel conteggio i `buff_*`, che funzionano senza
essere citati per nome (`classificaSottotipoMagia` li riconosce dal prefisso e ne ricava i valori
dallo split del codice).

I 4 codici `terr_*` sono un caso a parte: la carta **occupa correttamente lo slot Terreno** (il
sottotipo si deduce dal prefisso), ma il suo effetto passivo non esiste — quindi il Terreno c'e' e
non fa niente.

La colonna "Casella proposta" e' una **prima assegnazione automatica dal testo**, da confermare carta
per carta seguendo il Passo 2 della skill `effetti-carta`: e' un punto di partenza per il lavoro, non
una decisione presa.

#### Pedine — 14 codici

| Codice | Carta | Mondo | Casella proposta | Testo dell effetto |
|---|---|---|---|---|
| `amicomarbion` | Amico di Marbion | Marbion | PASSIVO | All'inizio del tuo turno, se controlli almeno 2 altre tue pedine con 'Manipolatrice' nel nome: il tuo Stratega recupera 10 PV. |
| `cavalieremarb` | Cavaliere dell'Esercito di Marbion | Marbion | MORTE_OFFENSIVA | Se evocata tramite 'Soldato dell'Esercito di Marbion': pesca 1 carta. Questa pedina deve attaccare ogni turno, se puo'. Quando viene distrutta in batt |
| `farfalla` | Farfalla Inebriante di Marbion | Marbion | SIMBOLO | 1 volta per turno, nel tuo turno: tira il dado Archetipo. Con Schivata, bersaglia una pedina nemica: nel suo prossimo turno non puo' attaccare (stordi |
| `guardianomarb` | Guardiano di Marbion | Marbion | EVOCAZIONE | All'evocazione tira il dado Archetipo. Spada: distruggi tutte le pedine nemiche. Cuore: questa pedina non puo' essere attaccata nel prossimo turno avv |
| `ladroluce` | Ladro di Luce | Marbion | SIMBOLO | 1 volta per turno: tira il dado Archetipo. Spada: ogni tua pedina puo' attaccare 1 volta in piu' in questo turno. Scudo: in questo turno nessuna tua p |
| `lince` | Lince Petalosa | Marbion | PASSIVO | Nessun effetto unico: predatrice elegante e devastante in combattimento puro. |
| `linceprotet` | Lince Petalosa Protettiva | Marbion | PASSIVO | +2 Attacco per ogni tua pedina 'Cucciolo di Lince Petalosa' schierata nel tuo campo (prima linea o retrovia). |
| `pescatoreoasi` | Pescatore dell'Oasi | Marbion | EVOCAZIONE | All'evocazione: pesca 1 carta. Pedina di Livello 1: bandisci il Pescatore. Magia o Trappola: puoi usarla subito (anche una Trappola, ignorando le norm |
| `piantacarn` | Pianta Carnivora | Marbion | PASSIVO | 1 volta per turno: divora una tua pedina (prima linea o retrovia, anche appena evocata, mai se stessa) - va al cimitero. Questa pedina guadagna perman |
| `prescelto` | Il Prescelto si e' Elevato | Marbion | DIFESA | Non evocabile tramite evocazione speciale. Questa pedina non puo' attaccare direttamente lo Stratega avversario, ma puo' attaccare e difendersi normal |
| `servitoremarb` | Servitore di Marbion | Marbion | SIMBOLO | 1 volta per turno puoi attivare: tira il dado Archetipo. Con Cuore o Spada: cerca una Magia o una Trappola nel tuo Worldloom, mettila in mano e rimesc |
| `soldatomarb` | Soldato dell'Esercito di Marbion | Marbion | PASSIVO | Nella tua fase di evocazione puoi tributare questa pedina per evocare specialmente un 'Cavaliere dell'Esercito di Marbion' dalla tua mano. |
| `ultimachiamata` | Ultima Chiamata dal Cero | Marbion | SIMBOLO | 1 volta per turno: tira il dado Archetipo di questa pedina. Con Spada o Scudo, scarta 1 carta dalla tua mano. Con Cuore o Schivata, pesca 1 carta. |
| `vermericiclo` | Verme del Riciclo | Marbion | PASSIVO | Ogni volta che il numero di pedine 'Verme del Riciclo' nel tuo cimitero raggiunge un multiplo di 3 (3, 6, 9...): nel tuo prossimo turno scegli - evoca |

#### Magie (Terreni compresi) — 30 codici

| Codice | Carta | Mondo | Casella proposta | Testo dell effetto |
|---|---|---|---|---|
| `acquavitale` | L'Acqua e' Vitale | Marbion | MAGIA | MAGIA RAPIDA - Una tua pedina recupera 10 Vita (fino al suo massimo stampato). |
| `allarmetemp` | Allarme Temperatura Bassa | Frost Land | MAGIA | Se l'avversario controlla piu' pedine di te: non puo' evocare (ne' evocazioni normali ne' bonus) nel suo prossimo turno. Se ne controllate lo stesso n |
| `anticipofuturo` | Anticipo sul Futuro | Frost Land | MAGIA | Pesca 2 carte. Salta la pesca del Rifornimento del tuo prossimo turno. Puoi attivare al massimo 1 copia di questa carta per turno, e nessuna nel turno |
| `antidolorifico` | Antidolorifico | Frost Land | MAGIA | Non attivabile al primo turno di nessuno dei due giocatori. Attivabile solo se non controlli pedine: tira il dado Imprevisti. 0: l'avversario non puo' |
| `bloccapostazione` | Blocca Postazione | Frost Land | MAGIA | MAGIA RAPIDA - Tira il dado Imprevisti e scegli una postazione VUOTA in prima linea dell'avversario: questa carta si posiziona fisicamente li', occupa |
| `destinoavvsegnato` | Il Destino dell'Avversario e' Segnato | Frost Land | MAGIA | MAGIA RAPIDA - Durante un tuo attacco: scegli il simbolo del tiro di reazione dell'avversario, senza farlo tirare. Il combattimento si risolve come se |
| `destinoconquistato` | Destino Conquistato | Marbion | MAGIA | Scegli una tua pedina in campo e un Archetipo. Fino a fine turno, quella pedina usa il dado di quell'Archetipo invece del suo in ogni tiro di reazione |
| `destinotuemani` | Il Destino nelle Tue Mani | Marbion | MAGIA | MAGIA RAPIDA - Attivala prima o dopo il tiro del dado di reazione: scegli il simbolo che preferisci. Il combattimento lo considera come se fosse uscit |
| `distruggiesercito` | Distruggi Esercito | Marbion | MAGIA | Attiva se controlli almeno 1 pedina Viandante: tira il dado Archetipo di un tuo Viandante (scegli tu se ne controlli piu' d'uno). Spada: scarti 1 cart |
| `distruggiterreno` | Distruggi Terreno | Frost Land | MAGIA | Distruggi la Magia Terreno attualmente in gioco. |
| `fatalista` | Fatalista | Frost Land | MAGIA | MAGIA RAPIDA - Attivala all'inizio del tuo turno, dopo gli Imprevisti. Per tutto questo turno, l'avversario non puo' scegliere 'Lascia passare': ogni  |
| `fortunagelo` | Fortuna del Gelo | Frost Land | MAGIA | CONTINUA - Ogni volta che evochi una pedina: scegli una tua pedina in prima linea e lancia il suo dado Archetipo. Con Schivata, pesca 1 carta. |
| `fusionecolori` | Fusione Colori | Marbion | MAGIA | CONTINUA - Tutte le tue pedine con 'Manipolatrice' nel nome guadagnano +2 a Vita, Attacco e Parata per ogni tua pedina 'Manipolatrice' in campo (se st |
| `goblinchiama` | Goblin Chiama Goblin | Frost Land | MAGIA | CONTINUA - Ogni volta che evochi una pedina con 'Goblin' nel nome: pesca 1 carta. Se ha 'Goblin' nel nome, la tieni. Altrimenti scegli: rimescolala ne |
| `gridodibattaglia` | Grido di Battaglia | Frost Land | MAGIA | MAGIA RAPIDA - Ogni tua pedina, sia in prima linea che in retrovia, ottiene +1 attacco disponibile in questo turno. |
| `impossibile` | Impossibile | Frost Land | MAGIA | MAGIA RAPIDA - Scegli il dado Archetipo di una delle tue pedine in campo e lancialo. Fino alla fine del turno in corso, ogni tiro del dado di reazione |
| `malenecessario` | Male Necessario | Marbion | MAGIA | Sacrifica 2 tue pedine: distruggi 1 carta a tua scelta dell'avversario (campo o mano). |
| `prendirischio` | Prendi il Rischio? | Frost Land | MAGIA | Attivabile solo se controlli almeno una pedina. Tira il dado Imprevisti. 0: distruggi una tua pedina a tua scelta. +1: distruggi 1 carta dell'avversar |
| `rifornfortuna` | Rifornimento Accompagnato Fortunato | Marbion | MAGIA | CONTINUA - Ogni volta che evochi una pedina: scegli una tua pedina in prima linea e lancia il suo dado Archetipo. Con Cuore, pesca 1 carta. |
| `rifornguidato` | Rifornimento Guidato | Frost Land | MAGIA | Pesca tante carte quante tue pedine hai in prima linea. |
| `ripartidazero` | Riparti da Zero | Frost Land | MAGIA | Scarta tutta la tua mano (devi averne almeno 1 carta): distruggi tutte le pedine, le Magie e le Trappole presenti sul campo, di entrambi i giocatori,  |
| `saccheggio` | Saccheggio | Marbion | MAGIA | MAGIA RAPIDA - Prendi un Potenziamento attaccato a una pedina avversaria e spostalo su una tua pedina: da ora vale per la tua. Se quella tua pedina mu |
| `saltariforn` | Salta Rifornimento | Frost Land | MAGIA | L'avversario salta la Fase di Rifornimento (niente pesca) nel suo prossimo turno. Per attivarla, in questo tuo turno non puoi ne' attaccare ne' evocar |
| `simbiosinera` | Simbiosi Nera | Marbion | MAGIA | CONTINUA - Finche' controlli Manipolatrice Nera in retrovia e Pianta Carnivora in prima linea, l'abilita' di Pianta Carnivora diventa: bandisci esatta |
| `solescotta` | Il Sole Scotta | Marbion | MAGIA | Attivabile solo se controlli almeno una pedina: scegli una tua pedina in campo e tira il suo dado Archetipo. Spada: guadagni 40 Vita e scarti a caso u |
| `strategiastratega` | Strategia dello Stratega | Marbion | MAGIA | Metti le prime 5 carte del tuo Worldloom nel tuo cimitero, poi pesca 1 carta. |
| `terr_baraonda` | Baraonda di Ghiaccio | Frost Land | TERRENO | TERRENO - Per entrambi, quando una pedina non di Frost Land ottiene Schivata: invece di schivare subisce 3 danni. |
| `terr_estatemarb` | L'Estate piu' Calda di Marbion | Marbion | TERRENO | TERRENO - Per entrambi, ogni pedina con 'Manipolatrice' nel nome guadagna +1 a Vita, Attacco e Parata. |
| `terr_gelo` | Temperatura Glaciale | Frost Land | TERRENO | TERRENO - Per entrambi, le pedine non di Frost Land: -4 Parata. |
| `terr_marcia` | Marcia di Marbion | Marbion | TERRENO | TERRENO - Una volta per turno puoi scartare 2 carte: fino a fine turno, tutte le pedine di mondo Marbion in campo (di entrambi i giocatori) hanno +1 A |

#### Trappole — 12 codici

| Codice | Carta | Mondo | Casella proposta | Testo dell effetto |
|---|---|---|---|---|
| `bloccamagie3` | Blocca Magie per 3 turni | Frost Land | TRAPPOLA | TRAPPOLA - Quando l'avversario attiva una Magia (Normale, Continua, Rapida o Terreno): annulla il suo effetto (va comunque al cimitero). Per i suoi pr |
| `bloccaresuscita` | Blocca Resuscita | Frost Land | TRAPPOLA_EVOCAZIONE | TRAPPOLA - Quando l'avversario sta per evocare una pedina dal suo cimitero: annulla l'evocazione e manda quella pedina in esilio (esce definitivamente |
| `bloccastrategia` | Blocca Strategia | Marbion | TRAPPOLA | TRAPPOLA - Quando l'avversario sta per attivare l'effetto di una carta (Magia, Trappola o abilita' di pedina): scarta 1 carta dalla tua mano per annul |
| `bloccoeventi` | Blocco degli Eventi | Frost Land | TRAPPOLA | TRAPPOLA - Fino alla fine del turno in corso, l'avversario non puo' attivare nuovi effetti di carte (Magie, Trappole, abilita' attivate). Gli effetti  |
| `controattacco` | Controattacco Disperato | Marbion | TRAPPOLA | TRAPPOLA CONTINUA - Quando una tua pedina viene attaccata e controlli almeno 2 pedine: l'avversario sceglie a caso una tra le tue pedine in prima line |
| `destinoobbligato` | Destino Obbligato | Frost Land | TRAPPOLA | TRAPPOLA - Quando l'avversario dichiara un attacco: scegli un Archetipo. L'attaccante usa il dado di quell'Archetipo invece del suo per questo scontro |
| `giornoceleste` | Per Giorno Celestiale | Marbion | TRAPPOLA | TRAPPOLA CONTINUA - Quando l'avversario dichiara un attacco: tira il dado Archetipo della pedina attaccante. Schivata: la pedina attaccante non puo' p |
| `intervsuperiore` | Intervento Superiore | Frost Land | TRAPPOLA | TRAPPOLA - Annulla l'attivazione dell'effetto di una carta qualsiasi, anche tua. Se era l'effetto di una pedina, la pedina resta in campo. Se era una  |
| `reginariciclo` | Regina del Riciclo | Marbion | TRAPPOLA_EVOCAZIONE | Quando la tua Manipolatrice Nera nel tuo campo viene distrutta: evoca specialmente 3 pedine token 'Verme del Riciclo' (Vita 1, Attacco 1, Parata 1, 1  |
| `scudosolenne` | Scudo Solenne | Marbion | TRAPPOLA_EVOCAZIONE | TRAPPOLA - Quando l'avversario ti attacca direttamente, tira il dado Archetipo della pedina attaccante: Spada: il danno si ritorce sulla pedina attacc |
| `trappoleveloci` | Trappole Veloci | Marbion | TRAPPOLA | TRAPPOLA CONTINUA - Finche' e' in campo, tutte le tue Trappole (comprese quelle gia' coperte) possono essere attivate, a tua scelta, gia' nello stesso |
| `tuttocalcolato` | Tutto Calcolato | Marbion | TRAPPOLA | TRAPPOLA - Quando un Imprevisto sta per attivarsi: annulla completamente il suo effetto. L'Imprevisto va comunque nel suo cimitero. |

#### Imprevisti — 6 codici

| Codice | Carta | Mondo | Casella proposta | Testo dell effetto |
|---|---|---|---|---|
| `imp_apocalissesfort` | Apocalisse degli Sfortunati | Marbion | IMPREVISTO | Tira il dado Imprevisti una volta per ogni pedina sul campo, di entrambi i giocatori. Ogni pedina il cui risultato e' 0 o +1 (cioe' sotto +2) viene di |
| `imp_armipari` | Ad Armi Pari | Marbion | IMPREVISTO | Per questo turno, i bonus/malus di Ruolo (Aggressore/Difensore/Tank/Bilanciato/Evasivo) sono ignorati, e i vantaggi/svantaggi di Archetipo (Diritto di |
| `imp_bloccasupporto` | Blocca Supporto | Marbion | IMPREVISTO | Ogni giocatore non puo' usare evocazioni bonus ne' pescate extra nel proprio prossimo turno. |
| `imp_evocrischiosa` | Evocazione Rischiosa | Frost Land | IMPREVISTO | Evoca specialmente una pedina di Livello 3 a tua scelta dal tuo Worldloom, se possibile. Se non e' possibile, distruggi una tua pedina. |
| `imp_marchiosole` | Marchio del Sole | Marbion | IMPREVISTO | Ogni giocatore tira il dado Imprevisti. Con +2: l'effetto si attiva gratis. Con +1: per attivarlo, scarta 1 carta. Con 0: non puoi attivarlo. Se lo at |
| `imp_richiamocaduti` | Il Richiamo dei Caduti | Frost Land | IMPREVISTO | Ogni giocatore recupera dal cimitero dell'AVVERSARIO una pedina di Livello 1 a sua scelta e la evoca sul proprio terreno in prima linea. Se occupata,  |

---

## TODO — tutti i 3 gap dell'audit 2026-08-27 sono stati implementati lo stesso giorno

1. **mammut** (Mammut Glaciale, Frost Land) — [FATTO] Confermato con l'utente: +4 Vita permanenti
   DEDICATO, si SOMMA al +3 generico di Ruolo Tank (non lo sostituisce — i Ruoli sono sempre
   automatici, un effetto di carta li sostituisce solo se cita esplicitamente "Ruolo"), e scatta SOLO
   se Mammut è in prima linea al momento della morte dell'alleato (dettaglio confermato dall'utente,
   non presente nel testo di `cards.json` così com'è oggi — **il testo Excel andrebbe aggiornato per
   menzionare la prima linea**, non ancora fatto in questo giro, solo l'engine). Vedi §11 sopra.
2. **manipstrum** (Manipolatore di Strumenti, Kepler-452B) — [FATTO] Tira il dado Archetipo della
   carta stessa all'evocazione: Spada → recupera 1 Magia dal proprio cimitero; Scudo → recupera 1
   Magia dal proprio Worldloom (mazzo); Cuore → ruba un Potenziamento (buff_) attualmente attivo/
   scoperto su una creatura avversaria, togliendole il bonus Attacco/Parata che dava, e lo aggiunge
   alla propria mano; Schivata → nessun effetto. Se il simbolo non trova un bersaglio valido (nessuna
   Magia nel cimitero/mazzo, nessun Potenziamento nemico attivo) non succede nulla, nessun ripiego su
   un altro simbolo. **Il testo su `cards.json` resta quello vecchio** (menziona solo la Spada) — da
   aggiornare in Excel se si vuole che corrisponda al comportamento reale ora implementato.
3. **verde** (Manipolatrice Verde, Kepler-452B) — [FATTO] "Deve attaccare ogni turno se può" blocca
   "Fine turno" (`continuaFase`, fase 4): se Verde è viva, in prima linea, ha ancora attacchi
   disponibili, non è stordita, ED esiste un bersaglio valido (anche il solo attacco diretto), il
   giocatore non può chiudere il turno finché non l'ha fatta attaccare. **Due esenzioni scoperte
   scrivendo i test, non ovvie a tavolino**: (a) al turno 1 chi inizia la partita non può attaccare per
   regola generale (cap. 3) — senza l'esenzione il gioco si sarebbe bloccato per sempre; (b)
   `rinunciaAttacco` (chi ha pescato doppio in Rifornimento) è nella stessa situazione. Non serve
   applicare nulla lato IA: `prossimaAzioneAttaccoIA` attacca già con OGNI prima linea disponibile
   prima di chiudere il turno, Verde compresa, per costruzione. Non applicato al timer di turno
   scaduto (`case "timer-scaduto"`) di proposito: quello è un limite di tempo assoluto, deve poter
   chiudere il turno comunque, mai bloccarsi su una scelta facoltativa.

Verificato con simulazioni headless usa-e-getta (poi cancellate, come da convenzione): mammut 3
scenari (prima linea → +7, retrovia → solo +3, muore lui stesso → nessun crash); manipstrum 5 scenari
(tutti e 4 i simboli col dado forzato via mock di Math.random + il caso "Cuore senza bersaglio
valido"); verde 8 scenari (blocca quando può attaccare, libera quando ha già attaccato/è stordita/
appartiene all'avversario, + le 2 esenzioni turno-1/rinunciaAttacco trovate durante il test). Build
pulita (`npm run build`) dopo ogni singolo fix.

Nota minore ancora aperta: `attacchiPerTurno()` in `effettiCarta.js` (codice "re") resta non
importata/chiamata da nessuna parte — non è un bug oggi (il valore `attacchi:3` è già corretto nei
dati), ma è codice morto. Non toccata in questo giro.
