CONTESTO PROGETTO — Worldloom (gioco di carte fisico + app compagna React)

Percorso: C:\Users\giaco\Desktop\Lavoro\Worldoom\00 Worldloom - Claude Code - work space
App: "App - HTML - Test" (React + Vite, build a file singolo → GIOCA.html)
Regolamento: Regolamento\Worldloom_Regolamento_v2.1.html (va tenuto sincronizzato con l'engine)
Pipeline dati: Excel → genera_cards_json.py → cards.json → sync-data.mjs → bundle
Pipeline immagini: Excel → `Mazzi/00 Layout generico/worldloom-cards/` (`xlsx_to_cards.py` → `render.js`
+ `template/card.html`) → `out/*.png` → `comprimi_out.py` → `Complete cards/*.jpg` → sync-data
⚠️ `componi_carte.py` (root, Python/PIL) è **codice morto dall'11 agosto 2026**: le Complete Card che
il gioco mostra le produce `render.js`, non lui. Verificato il 29-08 su date, dimensioni (744×1039 di
render.js, non 750×1050 di PIL) e layout. Non usarlo.
Password di GIOCA.html: Worldloom2026! (vedi App - HTML - Test\password\password.md)

FILE CHIAVE
- src/game/gameReducer.js — logica/reducer principale
- src/game/combattimento.js — risoluzione simboli dado
- src/game/evocazione.js, magieTrappole.js, giocatore.js, mazzo.js
- src/game/GameContext.jsx — contesto React (mazzoId, mazzoIdAvversario)
- src/components/Campo.jsx, Carta.jsx, Mano.jsx, App.jsx
- src/index.css — tutto lo stile

COME LAVORARE (convenzioni consolidate)
- Build: `npm run build` dentro "App - HTML - Test" → genera GIOCA.html
- Test: simulazioni headless usa-e-getta (sim-*.mjs nella root di "App - HTML - Test", importano gameReducer.js direttamente, SEMPRE cancellate con `rm -f` dopo l'uso) + verifica dal vivo nel browser
- cards.json non si modifica MAI a mano: solo tramite Excel + genera_cards_json.py

═══════════════════════════════════════════════════════════════════════════════════════
MAPPA DEI DOCUMENTI — parti sempre da qui
═══════════════════════════════════════════════════════════════════════════════════════

| File | Cosa | Quando aprirlo |
|---|---|---|
| **`WORLDLOOM.md`** (root) | Pannello di controllo: stato dello sprint corrente + indice di tutti i documenti + link | **PRIMA COSA in ogni chat nuova** |
| `Engine/Roadmap_Sessione_2026-08-27.md` | Lista bug/task in corso, con stato ✅/🟡/🔴 e regole anti-regressione | per sapere cosa si sta facendo e cosa manca |
| `Engine/Idea59_Coda_Step.md` | Progettazione della "coda di step unica" (refactor animazioni/pacing) | prima di toccare timing/animazioni/pop-up di combattimento |
| `Engine/Worldloom_Engine_Vocabolario_Effetti.md` | Le 19 caselle effetti + tabella di ogni codice-carta | **prima di scrivere/riparare QUALUNQUE effetto** (vedi skill `effetti-carta`) |
| `Engine/Storico_Lavoro.md` | Log cronologico di tutto il lavoro fatto (ex-coda di CLAUDE.md) | su richiesta, per ricostruire il "perché" di una scelta passata |
| `Regolamento/Worldloom_Regolamento_v2.1.html` | Regole complete del gioco fisico | quando una regola cambia nel motore o l'engine diverge dal testo |
| `Regolamento/Worldloom_Regolamento_Giocatori.html` | Regole versione giocatore (derivata dal v2.1, doppia manutenzione) | tenere in sync col v2.1 |
| `Regolamento/rules.json` | Dati di bilanciamento per il game design (NON letto a runtime) | quando cambiano dadi/Ruota/PV/slot |
| `UX/Worldloom_UX_Codex.html` | Riferimento vivo di UI e animazioni "as-built" — un riquadro per aspetto | ogni volta che un lavoro UI/animazione atterra (vedi skill `documenti-e-backup`) |
| `UX/Worldloom_Foglio_Maestro_UX.md` | Brief di design UX (intento/spec): Campo, Fasi, Pescata, Evocazione, Combattimento, Catena + Addendum A-M | per capire "cosa volevamo" da un'interazione |
| `graphify-out/` (gitignorato) | Grafo di conoscenza del progetto | prima di toccare CSS/timing/funzioni condivise (skill `graphify-progetto`) |
| `Mazzi/Nuove idee carte - Lavorazione.md` | Tracking trascrizione ~61 idee carte negli Excel | lavoro sui dati carte |
| `Archivio/` | File morti/superati messi da parte il 2026-08-28 | mai, se non richiesto |

**Skill installate:** `avvio-sessione` (**rituale di avvio + disciplina di lavoro — carica come prima cosa
in ogni chat nuova**), `graphify` / `graphify-progetto` (grafo), `effetti-carta` (implementare effetti
carta), `pipeline-carte` (dati carte Excel→json→immagini), `documenti-e-backup` (sincronizzare doc +
misurare/registrare animazioni + backup pre-lavoro-grosso).

═══════════════════════════════════════════════════════════════════════════════════════
REGOLE DI PROCESSO — non negoziabili
═══════════════════════════════════════════════════════════════════════════════════════

⚠️ **1. Toccare SOLO la cosa esatta chiesta.** Lo stato attuale dell'app è la base stabile ("blindata"):
NON ricostruire/riscrivere pezzi oltre a quello richiesto, niente rifattorizzazioni o "già che ci sono".
Se noti un problema collegato → lo SEGNALI nella Roadmap, NON lo tocchi. Lavorare per sezioni piccole e
mirate, buildare e dire esplicitamente cosa è stato cambiato ad ogni passo, non accumulare modifiche
multiple prima di riportare.

⚠️ **2. Prima di scrivere codice: chiedere sempre.** Fare domande per chiarire il concetto e la modifica
esatta — non presumere di aver capito e partire. Per feature grosse o architetturali (es. la coda di
step), spiegare prima il piano a parole e aspettare conferma esplicita.

⚠️ **3. Quando l'utente conferma che una cosa è giusta**: (a) scrivere un test headless usa-e-getta che
ne blocca la sequenza/il layout esatto e SALVARLO (non cancellarlo) in `Engine/test-blindati/`;
(b) segnare `🔒 BLINDATO` nella Roadmap. Quei code-path diventano off-limits senza rifare il test.

⚠️ **4. Prima di toccare CSS / timing / funzioni condivise: usare graphify** (`/graphify query …`) per
vedere il raggio d'impatto.

⚠️ **5. Consultare il Vocabolario Effetti** (`Engine/Worldloom_Engine_Vocabolario_Effetti.md`) prima di
scrivere o riparare QUALUNQUE effetto di carta — anche solo un "+N Attacco". Aggiornare la sua tabella
quando si implementa un codice che risultava mancante.

⚠️ **6. Tutti gli slot del campo** (creature, Terreno, Magie/Trappole coperte, Cimitero, Worldloom,
Imprevisti) devono avere SEMPRE la stessa dimensione e proporzione carta (~5:7). Mai uno slot
"compatto"/più piccolo per le pile. L'utente ha fermato il lavoro due volte per questo.

⚠️ **7. Aggiornare i documenti nella stessa sessione** in cui la modifica atterra (Regolamento, UX Codex,
Vocabolario, Roadmap, `Engine/Storico_Lavoro.md`, `WORLDLOOM.md`). Se l'engine "semplifica" una regola,
dirlo nel testo del regolamento con una nota di revisione — non fingere che coincidano.

⚠️ **8. Backup prima di lavoro grosso/architetturale** (skill `documenti-e-backup`): copia giocabile in
`App - HTML - Test/Versioni gioco/` + copia sorgente in `Backup sorgente …/`, annotata in `Engine/Storico_Lavoro.md`.

═══════════════════════════════════════════════════════════════════════════════════════
GOTCHA NEL CODICE — trappole già pagate care (dettaglio in Engine/Storico_Lavoro.md)
═══════════════════════════════════════════════════════════════════════════════════════

- **Ordine degli hook in `App.jsx` → `Partita()`**: gli `useEffect` in cima (pacing IA, coda visiva,
  salto fase) vanno chiamati PRIMA del return anticipato di `SchermataIniziale`, altrimenti l'ordine
  degli hook cambia tra "nessuna partita" e "partita in corso" → React esplode.
- **Import circolare vietato**: `magieTrappole.js` ed `effettiCarta.js` NON possono importare da
  `gameReducer.js`. Chi ha bisogno di roba del reducer (notifiche, `sistemaPrimaLineaDopoMagia`) o la
  duplica localmente o la chiamata resta nei punti esterni in gameReducer.js.
- **`s.codaVisiva` azzerata ad OGNI dispatch "vera"**; le dispatch "di servizio"
  (`avanza-coda-visiva`, `chiudi-notifica`, tutte le `*-animazione-conclusa`, `catena-*`) NON la
  azzerano, altrimenti perdono eventi ancora in coda.
- **Prospettiva vs identità del seme** (1v1 locale): il capovolgimento visivo va legato alla POSIZIONE
  a schermo; i gate di interattività/proprietà al SEME fisso "io"/"avversario". Confonderli = click sulla
  carta sbagliata. Usare `chiDecideOra(stato)` da `src/game/prospettiva.js`.
- **Carte avversarie** (`.carta-capovolta`, rotate 180°): ogni keyframe che anima `transform` deve
  includere `rotate(180deg)` in OGNI fotogramma, o il rotate statico viene sovrascritto a metà animazione.
- **`box-sizing: border-box`** è sulla regola base `.campo-slot` — non toccarla senza ricontrollare
  tutti gli slot con padding/bordo proprio.
- Array `primaLinea`/`retrovia` sono densi in partita reale; test con stati costruiti a mano che
  contengono `null` fanno esplodere `.some(c => c.id === …)` in `CellaCreatura`.

═══════════════════════════════════════════════════════════════════════════════════════

Contents of C:\Users\giaco\.claude\CLAUDE.md e la memoria auto-caricata restano la fonte per le
preferenze globali dell'utente. Il resto della storia del progetto è in `Engine/Storico_Lavoro.md`.
