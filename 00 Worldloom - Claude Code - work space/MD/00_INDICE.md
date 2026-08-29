# 📚 MD — Documentazione di consegna del progetto Worldloom

> **A chi serve questa cartella.** A una persona che non ha mai visto il progetto e deve
> capirlo *interamente* — cos'è, com'è costruito, a che punto è, cosa è stato chiesto,
> cosa è stato testato, cosa è stato corretto e cosa manca — per poi lavorarci con
> Claude Code senza rompere nulla.
>
> Generata il **2026-08-29**, a fotografia dello stato del branch `editor-mazzi-salvataggi-bugfix`.

---

## Come leggere: ordine consigliato

| # | File | Cosa ci trovi | Quando leggerlo |
|---|---|---|---|
| 1 | [01_PANORAMICA_PROGETTO.md](01_PANORAMICA_PROGETTO.md) | Cos'è Worldloom (gioco fisico + app), i deliverable, la mappa completa delle cartelle del repository, la visione a lungo termine | **Per primo, sempre** |
| 2 | [02_ARCHITETTURA.md](02_ARCHITETTURA.md) | Architettura tecnica dell'app: React+Vite a file singolo, il reducer unico, la forma dello stato, i 28 tipi di dispatch, la "coda di step unica", le trappole del codice | Prima di toccare una riga di codice |
| 3 | [03_RICHIESTE_UTENTE.md](03_RICHIESTE_UTENTE.md) | **Catalogo completo delle richieste** del committente: le regole di processo non negoziabili, ogni punto della roadmap (P0–P4, F.1–F.6, X.1–X.6, T.1–T.11, V.1–V.13), i requisiti dell'idea 59 e il backlog | Per capire *perché* il codice è così |
| 4 | [04_STATO_E_AVANZAMENTO.md](04_STATO_E_AVANZAMENTO.md) | Stato del progetto punto per punto: chiuso / in corso / aperto, con date; l'avanzamento della roadmap infrastruttura a 6 fasi; cosa si fa dopo | Per sapere da dove ripartire |
| 5 | [05_TEST_E_RISULTATI.md](05_TEST_E_RISULTATI.md) | Il metodo di test (blindati + sweep headless + verifica dal vivo nel browser), i 6 test blindati uno per uno, **tutti i numeri misurati** | Prima di modificare un code-path blindato |
| 6 | [06_CORREZIONI_E_BUGFIX.md](06_CORREZIONI_E_BUGFIX.md) | Le correzioni effettuate: sintomo → causa vera → fix → verifica, bug per bug. Include i bug trovati *dentro* le verifiche | Quando un comportamento sembra strano: probabilmente è già scritto qui |
| 7 | [07_PIPELINE_DATI_CARTE.md](07_PIPELINE_DATI_CARTE.md) | La pipeline dati Excel → `cards.json` → immagini → bundle, il validatore a 9 controlli, i vocabolari autoritativi, i problemi dati aperti | Prima di toccare qualunque dato di carta |
| 8 | [08_GUIDA_PER_IL_COLLEGA.md](08_GUIDA_PER_IL_COLLEGA.md) | Guida operativa: comandi di build/test, convenzioni di lavoro, le skill installate, cosa **non** si tocca, checklist di fine sessione | Da tenere aperta mentre si lavora |

---

## Le 6 cose da sapere subito (se hai 2 minuti)

1. **Worldloom è un gioco di carte fisico**; l'app React è la *compagna digitale* per giocarci
   e per testare le regole. Il regolamento HTML è la fonte di verità delle regole, il motore
   deve restargli allineato.
2. **L'app si compila in un unico file** `GIOCA.html` (~26 MB, immagini incluse come data URI):
   si apre a doppio clic, senza server. È una scelta di progetto, non un caso.
3. **Tutta la logica di gioco sta in un reducer solo**, `src/game/gameReducer.js` (2.708 righe),
   circondato da moduli puri. Nessuna libreria di stato, nessun backend.
4. **C'è una regola di processo ferrea**: si tocca *solo* la cosa esatta chiesta. Se noti un
   problema collegato lo **segnali** nella roadmap, non lo correggi di iniziativa. Il committente
   ha fermato il lavoro più volte per violazioni di questa regola.
5. **Alcuni code-path sono "blindati"**: congelati da test in `Engine/test-blindati/`. Modificarli
   senza rifare il test è vietato. Sono 6 test, tutti sul refactor "coda di step unica".
6. **I dati delle carte non si modificano mai a mano.** Si modificano gli Excel, poi si rigenera
   `cards.json` con lo script Python — che dal 2026-08-29 passa da un validatore che blocca il build.

---

## Rapporto con la documentazione già esistente nel repository

Questa cartella `MD/` **non sostituisce** i documenti vivi del progetto: li riassume e li spiega
per chi arriva da fuori. I documenti autoritativi restano quelli, e sono loro che vanno
aggiornati quando si lavora:

| Documento originale | Ruolo | Riassunto qui in |
|---|---|---|
| `WORLDLOOM.md` (root) | Pannello di controllo, si apre per primo in ogni chat | 04 |
| `CLAUDE.md` (root) | Istruzioni operative per Claude Code + gotcha del codice | 02, 08 |
| `Engine/Roadmap_Sessione_2026-08-27.md` | Lista bug/task per punto, con stato | 03, 04, 06 |
| `Engine/Idea59_Coda_Step.md` | Progetto del refactor coda di step (14 sezioni) | 02, 05 |
| `Engine/Worldloom_Engine_Vocabolario_Effetti.md` | Le 19 "caselle" degli effetti carta + tabella codici | 02, 07 |
| `Engine/Effetti_Mancanti_Piano.md` | Piano a blocchi per i 62 effetti non implementati | 04, 07 |
| `Engine/Storico_Lavoro.md` | Log cronologico completo (215 KB) | 06 |
| `Regolamento/Worldloom_Regolamento_v2.1.html` | Regole complete del gioco fisico | 01 |
| `UX/Worldloom_UX_Codex.html` | Riferimento UI/animazioni "as-built" | 05 |
| `UX/Worldloom_Foglio_Maestro_UX.md` | Brief di design UX (intento) | 01 |
| `tools/validate_cards.py` + `tools/vocabolari.json` | Validatore dati carte, gate al build | 07 |

⚠️ **Regola:** se cambi il codice, aggiorna i documenti originali nella **stessa sessione**.
Questa cartella `MD/` è una fotografia datata: se diverge, hanno ragione i documenti originali.
