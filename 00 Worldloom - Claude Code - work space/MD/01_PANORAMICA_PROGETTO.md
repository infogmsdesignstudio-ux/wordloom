# 1 · Panoramica del progetto Worldloom

## 1.1 Cos'è

**Worldloom** è un **gioco di carte collezionabili fisico** (TCG) in sviluppo, con attorno un
ecosistema di supporto:

| Deliverable | Stato | Dove vive |
|---|---|---|
| **Il gioco fisico** (regole, carte, bilanciamento) | in progettazione avanzata | `Regolamento/`, `Mazzi/` |
| **L'app compagna** — partita giocabile React, vs IA e 1v1 locale | funzionante, in raffinamento | `App - HTML - Test/` |
| **I dati carte** — 2 mondi, 157 righe ufficiali + 111 proposte | in lavorazione | `Mazzi/*/Excel/`, `cards.json` |
| **Le illustrazioni "Complete Card"** | pipeline in ricostruzione | `Mazzi/00 Layout generico/worldloom-cards/` |
| **Il sito worldloomtcg.com** | 10 pagine statiche, **non pubblicato** | `Sito web - Social/worldloomtcg/` |
| **Business plan / RFQ produzione** | PDF esterni | `Business plan/` |
| **Storyboard manga** | materiale grezzo | `Story board - Manga/` |

L'app **non è il prodotto finale**: è insieme un banco di prova delle regole (si può giocare
migliaia di partite headless per bilanciare) e una vetrina. Il gioco da tavolo fisico resta
l'obiettivo.

### Visione a lungo termine (dichiarata dal committente)

> Gioco → app → pubblicazione online → gioco da tavolo fisico.

Roadmap infrastruttura in 6 fasi:
1. git + hosting ✅
2. editor mazzi ✅
3. sistema di salvataggio ✅
4. menu principale + restyling 🔴
5. PWA / APK 🔴
6. i 17 bug dal vivo, intercalati 🟡 (in corso, è la roadmap `Engine/Roadmap_Sessione_2026-08-27.md`)

---

## 1.2 Le regole del gioco in due minuti

Servono per leggere il codice: i nomi delle funzioni del motore ricalcano il regolamento.

- **Sei uno Stratega**, comandante di un mondo alieno. Duello 1 contro 1.
- **Si vince** portando a 0 i **200 Punti Vita** dell'avversario, oppure per **deck-out**
  (chi deve pescare a mazzo vuoto perde).
- **Filosofia di design dichiarata:** un mazzo più debole deve poter vincere con abilità e
  tempismo. *Ogni meccanica che premia troppo chi è già in vantaggio va corretta* — questo
  principio ha priorità sull'eleganza tecnica.
- **Il mazzo** si chiama **Worldloom** (40–60 copie nell'editor); il **mazzetto Imprevisti** è
  separato (minimo 10 carte, max 2 copie identiche).
- **Il campo**: 3 slot di **prima linea** (attaccano e sono attaccabili), 2 di **retrovia**
  (protetta finché c'è almeno una Pedina viva in prima linea), una fila **Magie/Trappole**,
  uno slot **Terreno** personale il cui effetto vale per entrambi, le pile Worldloom / Cimitero /
  Imprevisti / Esilio / Extra.
- **Le 5 fasi del turno** (i nomi contano: sono i banner a schermo):
  1. **Rifornimento** — pesca 1 carta, oppure 2 rinunciando all'attacco
  2. **Vaticinio** — Dado Imprevisti, avanzamento delle carte Imprevisto
  3. **Schieramento** — evocazioni, spostamenti, Magie/Trappole
  4. **Alla Carica** — combattimento
  5. **Vespro** — chiusura del turno
- **Primo turno**: chi inizia pesca 5 carte e **non può attaccare**; chi gioca per secondo pesca 6.
  Nessuno può fare l'evocazione bonus al primo turno.
- **Combattimento**: si tira il **dado di reazione a 8 facce dell'Archetipo** dell'attaccante
  (facce: Spada / Scudo / Cuore / Schivata) e il simbolo determina cosa succede. Ci sono il
  **diritto di ripetizione** (cap. 12) e il **rifiuto della difesa** (cap. 13).
- **5 Archetipi in Ruota** (Viandante → Assalitore → Effimeri → Colosso → Tessitore → Viandante):
  ognuno è *efficace* contro il successivo. **6 Ruoli** (aggressore, difensore, tank, evasivo,
  supporto, bilanciato) con effetti propri.
- **Imprevisti**: una carta scoperta davanti al mazzetto che avanza di 0/1/2 movimenti a ogni
  Vaticinio (dado a 6 facce) e si attiva a **4 movimenti**; vale per **entrambi** i giocatori e
  non è annullabile.

Fonte completa: `Regolamento/Worldloom_Regolamento_v2.1.html` (19 capitoli). Esiste anche una
versione "giocatori" (`Worldloom_Regolamento_Giocatori.html`) da tenere in sync a mano — è
**doppia manutenzione**, attenzione.

### ⚠️ Terminologia: "Pedina", non "Alieno"

Rinomina decisa e applicata il **2026-08-29**: nel testo visibile e nei dati si dice **Pedina**
(mai "Alieno" né "creatura"), e il mondo Kepler-452B si chiama **Marbion**. Restano volutamente
indietro:
- il **valore-dato** `tipoCarta` accetta *sia* `"pedina"` *sia* `"alieno"` in lettura (i
  salvataggi già su disco degli utenti contengono il vecchio valore);
- l'**id del mondo** resta `kepler-452b` (è scritto nei salvataggi e nella mappa cartelle);
- gli **identificatori di codice** interni (`creatura`, `primaLinea`, `eUnAlieno`, …) non sono
  stati rinominati: refactor non richiesto, e la regola "toccare solo ciò che è chiesto" vale
  anche qui.

---

## 1.3 Mappa del repository

Radice: `C:\Users\giaco\Desktop\Lavoro\Worldoom\00 Worldloom - Claude Code - work space`

```
├── WORLDLOOM.md                  ← PANNELLO DI CONTROLLO: si apre per primo, sempre
├── CLAUDE.md                     ← istruzioni per Claude Code: regole di processo + gotcha
├── MD/                           ← QUESTA cartella (documentazione di consegna)
│
├── App - HTML - Test/            ← l'applicazione React
│   ├── src/                      ← sorgenti (~10.000 righe JS/JSX)
│   ├── scripts/                  ← sync-data.mjs, copy-play-file.mjs
│   ├── dist/                     ← output Vite (index.html a file singolo)
│   ├── GIOCA.html                ← ⭐ il gioco compilato, ~26 MB, doppio clic e si gioca
│   ├── Versioni gioco/           ← backup giocabili datati (v2.3 → v2.8)
│   ├── password/password.md      ← credenziale del "cancello" di GIOCA.html
│   ├── Music_Theme/, Risorse grafiche/, Esempi per ispirazione/
│   └── package.json, vite.config.js
│
├── Engine/                       ← documentazione tecnica del motore
│   ├── Roadmap_Sessione_2026-08-27.md      ← lista bug/task, stato per punto (fonte di verità)
│   ├── Idea59_Coda_Step.md                 ← progetto del refactor "coda di step unica"
│   ├── Worldloom_Engine_Vocabolario_Effetti.md  ← le 19 caselle effetti + tabella codici
│   ├── Effetti_Mancanti_Piano.md           ← piano per i 62 effetti non implementati
│   ├── Storico_Lavoro.md                   ← log cronologico completo (215 KB)
│   └── test-blindati/                      ← 6 test che congelano i code-path approvati
│
├── Regolamento/
│   ├── Worldloom_Regolamento_v2.1.html     ← regole complete (19 capitoli)
│   ├── Worldloom_Regolamento_Giocatori.html← versione giocatore (doppia manutenzione)
│   └── rules.json                          ← dati di bilanciamento (NON letto a runtime)
│
├── Mazzi/
│   ├── Frost Land - Primitivi del ghiaccio/
│   │   ├── Excel/FrostLand_carte.xlsx      ← ⭐ FONTE dei dati carta
│   │   ├── Excel/FrostLand_proposte.xlsx   ← carte proposte, non promosse
│   │   ├── cards.json                      ← generato, MAI a mano
│   │   ├── Complete cards/ (+ compressed/) ← illustrazioni finite
│   │   └── Sfondo Campo/
│   ├── Marbion - Kepler - 452 B - Manipolatrici d'aura/   (stessa struttura)
│   ├── 00 Layout generico/worldloom-cards/ ← pipeline immagini: xlsx_to_cards.py + render.js
│   └── Nuove idee carte - Lavorazione.md   ← tracking delle ~61 idee carte
│
├── tools/                        ← creata il 2026-08-29
│   ├── validate_cards.py         ← validatore dati carte (9 controlli), GATE al build
│   ├── vocabolari.json           ← vocabolari chiusi: autoritativi
│   ├── keywords.json             ← glossario keyword ammesse
│   └── report_prima_esecuzione_2026-08-29.txt
│
├── UX/
│   ├── Worldloom_UX_Codex.html   ← riferimento UI/animazioni "as-built"
│   └── Worldloom_Foglio_Maestro_UX.md  ← brief di design (intento)
│
├── Sito web - Social/
│   ├── worldloomtcg/             ← sito statico 10 pagine, noindex, NON pubblicato
│   ├── Ricerca_Sito_Design.md    ← ricerca competitor + decisioni di design
│   └── Instagram/, Strategie Marketing/, Video - foto - flayer/
│
├── Business plan/                ← business plan + RFQ produzione fisica (PDF)
├── Story board - Manga/
├── Archivio/                     ← ~60 file morti/superati, congelati il 2026-08-28
├── graphify-out/                 ← grafo di conoscenza, rigenerabile, gitignorato
├── genera_cards_json.py          ← ⭐ Excel → cards.json
├── comprimi_complete_cards.py
└── componi_carte.py              ← ⚠️ CODICE MORTO dall'11 agosto 2026 (vedi doc 07)
```

### Cartelle e file da NON usare

- **`componi_carte.py`** — vecchio compositore di carte in Python/PIL. Le Complete Card che il
  gioco mostra le produce `render.js`, non lui. Verificato il 2026-08-29 su date, dimensioni
  (744×1039 di `render.js` contro 750×1050 di PIL) e layout. `CLAUDE.md` e la skill
  `pipeline-carte` lo indicano ancora come vivo: **è un errore documentale noto e tracciato**
  (punto T.9).
- **`Archivio/`** — non si consulta se non richiesto esplicitamente.
- **`Versioni gioco/` e i `Backup sorgente …/`** — sono paracadute, non riferimenti.

---

## 1.4 I due mondi e i numeri dei dati (al 2026-08-29)

| Mondo | id tecnico | Carte uniche | Copie totali | Pedine | Magie | Trappole | Imprevisti | Rainbow |
|---|---|---|---|---|---|---|---|---|
| **Frost Land — Primitivi del ghiaccio** | `frost-land` | 73 | 122 | 22 | 35 | 16 | 11 | 4 |
| **Marbion (Kepler-452B) — Manipolatrici d'aura** | `kepler-452b` | 84 | 159 | 41 | 27 | 16 | 13 | 4 |

> Le 41 Pedine di Marbion erano **23** fino al 2026-08-29: 15 righe marcate `Pedina` in Excel
> venivano **scartate in silenzio** dal generatore, che conosceva solo `Alieno`. Vedi doc 06, bug T.2.

Oltre a questi ci sono **111 righe "proposte"** nei due file `*_proposte.xlsx`, non promosse:
la decisione se e come promuoverle è aperta (punto V.13).

---

## 1.5 Chi decide cosa

Il progetto è di **una sola persona** (il committente, `Giacomo`), che scrive le regole, disegna
le carte, prova il gioco dal vivo e detta le priorità. Claude Code è l'esecutore.

Conseguenze pratiche, importanti per chi subentra:

1. **Le decisioni di design non si prendono da soli.** Per feature grosse o architetturali si
   spiega il piano *a parole* e si aspetta conferma esplicita.
2. Molte righe della roadmap sono ferme non perché siano difficili, ma perché **aspettano una
   decisione** (V.5–V.13 sono quasi tutte così).
3. La verifica finale è quasi sempre **dal vivo, a occhio, dall'utente**. Esiste una lista
   esplicita "Da confermare a vista dall'utente" in `WORLDLOOM.md`.
