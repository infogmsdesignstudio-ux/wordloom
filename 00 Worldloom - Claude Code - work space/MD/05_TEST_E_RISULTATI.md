# 5 · Test effettuati e risultati ottenuti

> Nel progetto **non c'è un framework di test**: niente Jest, niente Vitest, niente CI.
> C'è invece un metodo a **tre livelli**, costruito su misura, che ha retto e ha trovato bug veri.

---

## 5.1 I tre livelli di verifica

| Livello | Cosa è | Quando si usa | Destino |
|---|---|---|---|
| **1. Simulazione usa-e-getta** | uno script `sim-*.mjs` nella root di `App - HTML - Test/` che importa `gameReducer.js` e riproduce uno scenario preciso | per riprodurre un bug o provare un'ipotesi | **si cancella** dopo l'uso (`rm -f`) |
| **2. Sweep headless** | lo stesso meccanismo, ma su 80-250 partite complete vs IA, con asserzioni d'invariante a ogni dispatch | per dimostrare che una modifica non introduce crash/stalli/violazioni d'ordine | si cancella |
| **3. Test blindato** | uno script `.mjs` in `Engine/test-blindati/` che **congela la forma esatta** dello stato dopo un'azione | quando l'utente **conferma** che un comportamento è giusto | **non si cancella mai** |
| **4. Verifica dal vivo** | il gioco vero nel browser, spesso con un poller DOM che campiona a 40 ms, o leggendo i `computed style` / `getBoundingClientRect` | sempre, come ultima parola | — |

**Perché i blindati esistono:** la regola M4 del committente. Quando conferma che una cosa è
giusta, quel comportamento diventa un contratto. I code-path coperti sono **off-limits senza
rifare il test**.

**Cosa asserisce un blindato:** non "il gioco funziona", ma la **forma esatta di `s.sequenza`**
(l'array ordinato dei passi) dopo una sequenza di dispatch. È un test di *contratto*, non di
comportamento generico: è per questo che intercetta le regressioni di tempistica, che sono
invisibili a un test funzionale.

---

## 5.2 I 6 test blindati — eseguiti il 2026-08-29

```bash
node "Engine/test-blindati/tempi.blindato.mjs"
node "Engine/test-blindati/combattimento.blindato.mjs"
node "Engine/test-blindati/catena.blindato.mjs"
node "Engine/test-blindati/voli.blindato.mjs"
node "Engine/test-blindati/turno-ia.blindato.mjs"
node "Engine/test-blindati/banner-fase.blindato.mjs"
```

**Risultato dell'esecuzione al momento della stesura di questo documento: 6/6 verdi, exit code 0.**

| Test | Fase idea 59 | Asserzioni verdi | Cosa congela |
|---|---|---|---|
| `tempi.blindato.mjs` | 1 | snapshot | l'intero oggetto `TEMPI` byte per byte. Se cambi un tempo, il test fallisce finché non aggiorni lo snapshot **nella stessa sessione** (e l'UX Codex) |
| `combattimento.blindato.mjs` | 1 | **19** | la sequenza `[balzo, difendi]` → `decidi-difesa("difendi")` con diritto di ripetizione → `[dado, ripeti, danno, morte?]`; `"incassa"` → `[danno, morte?]` e **mai un dado**; "ritenta" → prepend di un nuovo `dado`; **nessun passo `scelta` mentre un `anim` è in cima** |
| `catena.blindato.mjs` | 2 | **31** | i frame della catena come passi `scelta:catena` / `muta:catenaRisoluzione`; nessuna trappola eleggibile → `[scelta:difendi]`; ricostruzione del passo al `carica-stato` con catena aperta |
| `voli.blindato.mjs` | 3 | **37** | pesca/evocazione/spostamento sono passi `anim` (`pesca`/`evoca`/`sposta`), **non** più `s.pescaInCorso`/`s.evocazioneInCorso`/`s.movimentiInCorso`; la prima mano di chi gioca per secondo = N passi da 1 carta; ogni passo porta `durataMs` esplicito e un `id` monotono |
| `turno-ia.blindato.mjs` | 4 | **36** | `s.iaInAttesa` e la dispatch `avanza-ia` **non esistono più**; il turno IA avanza da un passo `muta:"ia"`; **mai più di UNO in fila** (il passo successivo non è mai precalcolato); **l'invariante d'ordine "il passo ia sta sempre in fondo"**; multi-attacco = un respiro per scontro; attacchi diretti scanditi anch'essi; ripristino da salvataggio a metà turno IA |
| `banner-fase.blindato.mjs` | 5 | **45** | l'esistenza del quarto tipo di passo; **P2.1** (il Vespro accodato *dopo* `flushSequenza`, e più lungo); **P2.2** (il Vaticinio sempre dietro al volo di pescata); **P2.3** (`timer-scaduto` aspetta anche coda visiva / dado Imprevisti / morte da Imboscata); **P2.4** (gli stessi 5 cartelli per l'avversario, con l'attribuzione giusta); l'invariante d'ordine della Fase 4 che regge; l'anti-deadlock |

**Totale: 168 asserzioni** oltre allo snapshot dei tempi.

### Code-path dichiarati off-limits (non si toccano senza rifare il test)

- **Fase 1** — tutto il combattimento in `gameReducer.js`
- **Fase 2** — `avviaRisoluzioneFrameCatena`, `applicaRisoluzioneFrameCatena`,
  `sincronizzaPassoCatena`, `scelta:catena` / `muta:catenaRisoluzione`, `CatenaStriscia.jsx`
- **Fase 3** — `avviaVoloPescata` / `avviaVoloEvocazione` / `avviaVoloMovimento`, i selettori
  `pescaInScena` / `evocaInScena` / `spostaInScena` / `uidInVoloPesca`, i 3 componenti
  `AnimazionePescata/Evocazione/Posizionamento.jsx`
- **Fase 4** — `avanzaIA`, `proseguiSeIA`, `accodaPassoIa`, `sincronizzaPassoIa`, il ramo `"ia"` di
  `eseguiMuta`, l'invariante d'ordine in `accodaPassi`,
  `filaBloccaCodaVisiva` / `scenaLiberaPerIa`
- **Fase 5** — `accodaBannerFase`, i 5 punti d'aggancio, `bannerInScena`, `TitoloFase.jsx`, i due
  set di `@keyframes titolo-fase-*`, la guardia estesa del case `timer-scaduto`

---

## 5.3 Gli sweep headless — i numeri ottenuti

Ogni fase dell'idea 59 è stata chiusa con uno sweep di partite complete contro l'IA, con
asserzioni d'invariante attive.

| Fase | Sweep | Risultato |
|---|---|---|
| **2** (catena) | 250 partite vs IA | **0 crash, 0 stalli** |
| **3** (voli) | 200 partite vs IA con **asserzione d'ordine esplicita** | **0 violazioni** |
| **4** (turno IA) | 200 partite vs IA | **200/200 concluse**, 0 crash / 0 stalli / 0 violazioni su **8.991 respiri** e **3.674 scontri IA** |
| **5** (banner) | 200 partite vs IA | **200/200**, 0 crash / 0 stalli / 0 violazioni su **17.025 banner** — **8.445 miei e 8.580 dell'IA** |
| P0.3-5 (fix pop-up) | sweep 80 + 120 partite | 0 crash |
| P3.2 tappa A | 120 partite | 0 crash; 111 partite con Imprevisti scartati (max 3 per partita) |

> ⭐ **Lo split 8.445 / 8.580 dei banner è la prova statistica di P2.4.** Prima della Fase 5 i
> banner del turno avversario erano *strutturalmente* zero: `TitoloFase` calcolava
> `faseEffettiva = null` quando non era il turno umano. Un risultato ~50/50 dimostra che ora si
> vedono da entrambi i lati. Questo è il tipo di prova che vale più di uno screenshot.

---

## 5.4 Le misure dal vivo — cosa è stato cronometrato davvero

Molte conferme sono **misure**, non impressioni. Metodo tipico: poller DOM a 40 ms nel browser,
oppure `getBoundingClientRect` / `getComputedStyle` letti direttamente.

| Cosa | Misura ottenuta |
|---|---|
| **Banner di fase 1-4** | ~1750–1810 ms (atteso: `TEMPI.banner.fase = 1750`) |
| **Banner Vespro** | **2595 ms** e **2635 ms** (atteso 2600) — il secondo misurato subito dopo l'ultimo scontro di un turno IA, il caso più difficile |
| **Catena completa su un turno avversario** | `Vespro → Rifornimento → volo-carta → Vaticinio → dado → Schieramento`, osservata per intero |
| **Attacchi diretti IA allo Stratega** | **~1800 ms l'uno dall'altro**, col numero rosso del danno visibile in mezzo (prima si risolvevano tutti in una dispatch sola) |
| **Sequenza di combattimento** (dopo il fix di P0.3-5) | dado rotola → si ferma a **963 ms** → balzo a **1443 ms** (dado ancora visibile) → numero a **3015 ms** (dado sparito) |
| **Pop-up Trappola durante il dado** | prima del fix compariva a **244 ms** (dado ancora in rotazione); dopo il fix a **~1450 ms**, dado fermo sul risultato |
| **Scaling del tavolo (P0.6)** | 3000×1600 → k=1.22 · 2000×1000 → 0.72 · 1366×768 → 0.56 · 667×375 (iPhone SE) → 0.25. **Zero barre di scorrimento, nessun clipping** in nessuno dei ~10 casi provati |
| **Slot del campo avversario (P0.8b)** | riquadri **83×116** e **180×116** identici sui due lati: l'"impressione di disordine" non era un bug |
| **Gap retrovia (P0.9b)** | retrovia↔prima linea **0 px**, retrovia↔Magie **~16 px** su entrambi i lati: specchio perfetto |
| **Carte senza illustrazione (T.6)** | **117×157 tutte**, identiche alle Pedine |
| **Carta Imprevisto ruotata (F.1)** | slot 62 px, carta ruotata 86 px → sborda ~12 px per lato, `clippata: false` |
| **Rotazioni** | verificate leggendo la matrice: avversario `matrix(-1,0,0,-1,0,0)` = rotate(180deg), mio lato `none` |
| **Evocazione IA (P3.5)** | **48 frame catturati** di un'evocazione reale: tutti `matrix(-N,0,0,-N,…)`, cioè ruotati 180° a ogni scala del volo |
| **Font brand (X.5)** | `document.fonts` → entrambi "loaded"; `body` = Cormorant, `button` = Cinzel, `.carta` e `.carta *` = ancora `-apple-system, sans-serif` |

---

## 5.5 Il test più importante: quello che ha trovato bug *durante* la verifica

Due bug veri sono emersi **dentro** la verifica della Fase 4 — esattamente il tipo di regressione
che i blindati servono a fermare:

1. **Colto da `catena.blindato.mjs`** (non dall'occhio): con una catena a 2 frame la fila usciva
   `[muta:ia, scelta:catena]` — il respiro dell'IA davanti a una decisione ancora in sospeso del
   giocatore. → Fix: invariante "il passo `ia` sta sempre in fondo", applicato in `accodaPassi`,
   in un posto solo.
2. **Colto dal vivo** (nessun test lo avrebbe visto): il turno IA si è fermato **per sempre** su
   "L'avversario evoca…" — la coda visiva aspettava la fila (regola Fase 3) e il respiro aspettava
   la coda visiva. **Deadlock reale.** → Fix: il passo `ia` è l'unica eccezione. Le due guardie
   sono state **estratte in `sequenza.js`** apposta per poterle blindare invece di duplicarle nei
   componenti.

**Morale operativa:** i due livelli non sono ridondanti. Il blindato prende ciò che l'occhio non
vede (ordine dei passi), la verifica dal vivo prende ciò che il test non può simulare (il deadlock
fra due timer reali).

---

## 5.6 Altri test degni di nota

| Area | Test | Risultato |
|---|---|---|
| **Export/import mazzi (X.1)** | 17 test headless (esporta singolo/tutti, import con collisione nome → "(importato)"/"(importato 2)", import bundle, JSON malformati rifiutati) | **17/17** + round-trip dal vivo nel browser |
| **P0.1 (Piccolo Goblin)** | simulazione headless dello scenario esatto con carte vere (`nuovaPartita → seleziona-mano → seleziona-tributo → conferma-tributo`) | **non era un bug**: il posto liberato dal sacrificio viene ripreso sempre dalla carta appena evocata |
| **F.4 (evocazione bonus)** | sweep + test mirato (turno 4, fase 3, `evocazioneNormaleFatta=true`, Pedina lv1 in mano) | **non riprodotto**: l'evocazione bonus si apre correttamente |
| **Identità carta (T.3)** | `sim-identita.mjs` (presente nel working tree, non committato) | contatori indipendenti delle due stampe verificati dal vivo |
| **Validatore dati carte (V.1)** | prima esecuzione su tutti e quattro gli Excel | **0 errori, 199 avvisi**. `cards.json` rigenerato dopo le correzioni V.3/V.4 e verificato **byte-identico** a prima (le correzioni toccavano solo documentazione) |

---

## 5.7 Limiti dichiarati della verifica — cosa NON è coperto

Onestà intellettuale che il progetto pratica e che va mantenuta:

- **Nessun test di rendering React.** Tutto ciò che riguarda il DOM si verifica a mano nel
  browser. Non esiste una suite che possa girare in CI.
- **Nessun test automatico sull'editor mazzi** oltre ai 17 di import/export.
- **Nessun test sugli effetti delle singole carte**: sono coperti solo dalle simulazioni
  usa-e-getta, che vengono cancellate. Con 62 effetti da implementare, questo è un rischio noto
  — il piano prevede una simulazione per carta, ma **non prevede di salvarle**.
- **Il download su file vero non è testabile** nel browser pilotato (blocca i download): di X.1 è
  stato verificato il payload, non il salvataggio su disco.
- **Le 8 concatenazioni fra effetti** (doc 04, §4.5) non hanno ancora nessun test: diventeranno
  test propri quando l'utente confermerà il comportamento atteso.
- **Il limite dichiarato della Fase 4** ("lo scontro IA-contro-mia-creatura non osservato dal
  vivo") **è stato chiuso nella Fase 5**: evocato un Piccolo Goblin, l'IA ha attaccato 4 volte in
  due turni, il pop-up "Difendi o lasci passare?" compare dopo il cartello "Alla Carica", mai
  sopra.
- **Limite noto minore ancora aperto** (P0.6): le animazioni VFX calcolano la posizione dai rect
  scalati ma disegnano l'elemento volante a dimensione piena → lieve stacco di scala durante il
  volo.
