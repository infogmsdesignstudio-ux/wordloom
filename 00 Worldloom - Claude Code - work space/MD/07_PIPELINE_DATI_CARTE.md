# 7 · La pipeline dei dati carta

> ⚠️ **Regola d'oro del progetto: `cards.json` non si modifica MAI a mano.**
> Le carte si aggiungono e si correggono **solo nell'Excel**. Gli script leggono, non inventano.

---

## 7.1 Il flusso completo

```
        ┌──────────────────────────────────────────────────────────────┐
DATI    │  Mazzi/<Mondo>/Excel/<Mondo>_carte.xlsx     ← ⭐ LA FONTE     │
        │  Mazzi/<Mondo>/Excel/<Mondo>_proposte.xlsx  ← non promosse   │
        └───────────────┬──────────────────────────────────────────────┘
                        │  tools/validate_cards.py   (GATE: errori ⇒ stop)
                        ▼
        ┌──────────────────────────────────────────────────────────────┐
        │  genera_cards_json.py  →  Mazzi/<Mondo>/cards.json           │
        └───────────────┬──────────────────────────────────────────────┘
                        │
IMMAGINI ───────────────┼──────────────────────────────────────────────
        Mazzi/00 Layout generico/worldloom-cards/
          xlsx_to_cards.py → cards-real.json
          render.js + template/card.html → out/*.png
          comprimi_out.py → Mazzi/<Mondo>/Complete cards/*.jpg
                        │
                        ▼
        ┌──────────────────────────────────────────────────────────────┐
BUILD   │  App - HTML - Test/scripts/sync-data.mjs                     │
        │    copia cards.json + Complete cards + sfondi + rules.json   │
        │    dentro src/data/generated/                                │
        │  vite build (singlefile)  →  dist/index.html  →  GIOCA.html  │
        └──────────────────────────────────────────────────────────────┘
```

Un solo comando fa la parte finale (`sync-data` gira in automatico come `prebuild`):

```bash
npm run build
```

---

## 7.2 Gli Excel — struttura reale

Quattro file, due per mondo:

| File | Righe carta | Ruolo |
|---|---|---|
| `FrostLand_carte.xlsx` | 73 | **ufficiale** |
| `Kepler452B_carte.xlsx` | 84 | **ufficiale** |
| `FrostLand_proposte.xlsx` + `Kepler452B_proposte.xlsx` | 111 in totale | proposte non promosse |

Ogni file ha 3 fogli: **`Carte`**, **`Come compilare`** (documentazione, letta dagli umani ma
**corretta dal validatore**), **`Imprevisti`**.

### Colonne del foglio `Carte`

`Nome` · `Archetipo` · `Livello` · `Ruolo` · `Copie` · `Limite Copie` · `Vita` · `Attacco` ·
`Parata` · `Attacchi` · `Tipo Effetto` · `Testo Effetto` · **`Codice Effetto (per Claude Code)`** ·
`Tipo Carta` · `Rarita` · `Pianeta` · `Sottotipo` · `Autore` · `Numero` · `Anno` · `ID Carta` ·
`Prompt Immagine` · `Verificata` · `Varianti Illustrazione` · `Finitura`

Il foglio `Imprevisti` ha un sottoinsieme (niente statistiche né Archetipo).

**Colonne che contano davvero per il motore:**

| Colonna | Cosa ne fa il gioco |
|---|---|
| `Codice Effetto (per Claude Code)` | ⭐ è la chiave con cui il motore aggancia l'effetto (`mammut`, `terr_marbion`, `revive`…). È il ponte fra i dati e `effettiCarta.js`/`magieTrappole.js` |
| `Tipo Carta` | `Pedina` / `Magia` / `Trappola` → `tipoCarta` |
| `Limite Copie` | vuoto ≠ 0: vuoto = regola standard, 0 = carta bandita |
| `Finitura` | passata **letterale** (`Normale`, `Rainbow`, …) → una classe CSS per valore |
| `Varianti Illustrazione` | concorre all'identità carta e determina l'immagine |
| `Rarita` | concorre all'identità carta |
| `Tipo Effetto` | ⚠️ **il motore non la legge mai** (verificato: nessun `effetto.tipo`/`tipoEffetto` in `src/`) |
| `Sottotipo` | ⚠️ **ignorata dalla pipeline** — vedi V.10 più sotto |

### Forma di una carta in `cards.json`

```json
{
  "id": "mammut-glaciale__v1__comune__normale",
  "nome": "Mammut Glaciale",
  "variante": 1, "rarita": "Comune", "copie": 2, "limiteCopie": null,
  "finitura": "Normale",
  "effetto": { "tipo": "ally_death",
               "testo": "Quando una tua Pedina muore: +4 Vita permanenti.",
               "codice": "mammut" },
  "tipoCarta": "pedina",
  "archetipo": "Colosso", "livello": 1, "ruolo": "tank",
  "vita": 18, "attacco": 2, "parata": 9, "attacchi": 2,
  "immagine": "mammut-glaciale.png"
}
```

**L'identità (`id`) = nome + variante + rarità + finitura** (decisione dell'utente, T.3).
Serve a distinguere due **stampe** della stessa carta — è ciò che rende possibile il foil.
L'**immagine** dipende però solo da **nome + variante**: due stampe condividono l'illustrazione.

---

## 7.3 `tools/validate_cards.py` — il validatore (creato il 2026-08-29)

```bash
python tools/validate_cards.py
```

**È un gate al build**: `genera_cards_json.py` lo lancia prima di scrivere, e se ci sono **ERRORI**
non rigenera `cards.json`. Gli **AVVISI** non bloccano. Scappatoia dichiarata:
`--salta-validazione`. Flag `--range-strict` per promuovere il controllo 4 a errore.

### I 9 controlli

| # | Controllo | Cosa verifica |
|---|---|---|
| 1 | `tipo-effetto` | valore presente e dentro il vocabolario chiuso (**congelato** allo stato del 29-08) |
| 2 | `ruolo` | uno dei 6 Ruoli ammessi (solo sulle Pedine) |
| 3 | `archetipo` | uno dei 5 Archetipi della Ruota |
| 4 | `range` | statistiche dentro i range **letti dal cap. 8 del regolamento a ogni esecuzione** |
| 5 | `codici-effetto` | coerenza testo ↔ codice: stesso testo con codici diversi, o stesso codice con testi diversi |
| 6 | `campi-stampa` | i campi obbligatori per la stampa compilati (solo sulle righe ufficiali) |
| 7 | `keyword-orfane` | ogni termine "da regolamento" nel testo esiste nel glossario (escludendo le parole che compaiono nei nomi delle carte) |
| 8 | `doppia-presenza` | una carta presente sia negli ufficiali sia nelle proposte |
| 9 | `budget-testo` | il testo effetto sta nello spazio del renderer, misurando l'andata a capo **reale** |

**Prima esecuzione: 0 errori, 199 avvisi.**

### La scelta di design più importante del validatore

> **I range statistiche non sono scritti nel codice.** Vengono letti dal **cap. 8 del regolamento**
> a ogni esecuzione, e il parser **fallisce rumorosamente** se la tabella cambia forma.

Motivo: non deve esistere un secondo posto da tenere in sync. Se cambia il regolamento, cambia il
controllo. Stessa logica per cui `tempi.js` è sorgente unica anche per il CSS.

### I vocabolari sono autoritativi

`tools/vocabolari.json` (ruoli, archetipi, rarità, sottotipi, tipo carta, tipo effetto, campi di
stampa, budget testo) e `tools/keywords.json` (glossario keyword).

> Un valore fuori lista è un **errore**, non un avviso. **Aggiungere un valore lì è una decisione,
> non una formalità.**

Ogni sezione porta il campo `fonte`: le liste sono verificate, non inventate.

---

## 7.4 `genera_cards_json.py`

```bash
python genera_cards_json.py "Mazzi/Frost Land - Primitivi del ghiaccio/Excel/FrostLand_carte.xlsx"
```

- legge il foglio `Carte` (la colonna `Tipo Carta` distingue Pedine / Magie / Trappole) e il foglio
  `Imprevisti`;
- **non si modifica per aggiungere carte**: le carte si aggiungono solo nell'Excel;
- accetta `Pedina` **e** `Alieno` (dopo il fix di T.2);
- deduce il sottotipo Magia dal prefisso `terr_` del codice effetto e scrive `"normale"` per tutto
  il resto — ⚠️ è il buco V.10;
- lancia il validatore prima di scrivere.

---

## 7.5 La pipeline delle immagini — ⚠️ zona con documentazione contraddittoria

### Qual è la pipeline VIVA

```
Excel → xlsx_to_cards.py → cards-real.json
      → render.js + template/card.html  → out/*.png   (744×1039)
      → comprimi_out.py                 → Mazzi/<Mondo>/Complete cards/*.jpg
      → sync-data.mjs                   → nel bundle
```

Tutto dentro `Mazzi/00 Layout generico/worldloom-cards/`. La specifica del layout è il file
**`SPEC.md`** della stessa cartella (attualmente alla **versione 1.6**).

### ⚠️ `componi_carte.py` è CODICE MORTO dall'11 agosto 2026

Verificato il 29-08 incrociando date, dimensioni (**744×1039 di `render.js` contro 750×1050 di
PIL**) e layout: le Complete Card che il gioco mostra **le produce `render.js`**, non lui.

**Ma `CLAUDE.md`, la skill `pipeline-carte` e `Guida ai layout.html` lo indicano ancora come
pipeline viva** (punto T.9). Se lavori sulle immagini, **non fidarti di quei documenti**: vanno
corretti.

### Rigenerare le immagini è bloccato a monte (T.10)

Le Complete Card nel gioco sono ferme al **19 agosto**; la SPEC è alla 1.6 (rarità → scintille nel
piede, Ruolo nella riga tipo, disco archetipo ricalcolato). Rigenerare non si può perché
`cards-real.json` ha:
- tutte le carte su `flat_neutro.png`,
- rarità nulle,
- `tipoCarta: "Pedina"` che `card.html` **non conosce**.

Conseguenza collaterale: **Nebbia di Marbion** ha la Complete Card ma è **nera** — renderizzata il
19 agosto senza illustrazione (T.11).

### Nomenclatura dei file immagine

`nome carta` → minuscolo, spazi → `-`, apostrofi rimossi, estensione `.jpg`.
Esempi reali: `mammut-glaciale.jpg`, `linganno-vincente.jpg`, `copiare-è-vantaggioso.jpg`.
`useMazzi.js` risolve nome carta → URL bundlato, con un ripiego cross-mondo per le carte condivise.

---

## 7.6 `sync-data.mjs` — cosa copia

| Sorgente | Destinazione |
|---|---|
| `Mazzi/<Mondo>/cards.json` | `src/data/generated/mazzi/<id>/cards.json` |
| `Mazzi/<Mondo>/Complete cards/*.jpg` | `…/<id>/complete-cards/` |
| `Mazzi/<Mondo>/Sfondo Campo/*.{svg,jpg,png,webp}` | `…/<id>/sfondo-campo/` |
| `Regolamento/rules.json` | `src/data/generated/rules.json` |

- **non scrive mai nei file sorgente**;
- la mappa `id → cartella` è **hardcoded** in `sync-data.mjs`: `frost-land` e `kepler-452b`
  (⚠️ l'id `kepler-452b` non si cambia, vedi doc 06 §6.7);
- variabile d'ambiente opt-in **`WORLDLOOM_COMPLETE_CARDS_DIR`**: se impostata legge da
  `Complete cards compressed` invece che da `Complete cards` — serve per build leggere da
  condividere come link. Il build normale resta a qualità piena.

---

## 7.7 Il ponte fra dati e motore: i codici effetto

Il campo `Codice Effetto (per Claude Code)` è l'unico aggancio fra una carta e la sua logica.
Il documento che governa questo ponte è
**`Engine/Worldloom_Engine_Vocabolario_Effetti.md`**, che definisce **19 "caselle"** — cioè i
*momenti* in cui un effetto può scattare:

`PASSIVO` · `EVOCAZIONE` · `VINCOLO_EVOCAZIONE` · `BONUS_CONTRO` · `SIMBOLO` · `DIFESA` ·
`PRE_ATTACCO` · `SOPRAVVIVENZA` · `MORTE_PROPRIA` · `MORTE_OFFENSIVA` · `MORTE_ALLEATO` ·
`INIZIO_TURNO` · `MAGIA` · `TERRENO` · `TRAPPOLA` · `TRAPPOLA_EVOCAZIONE` · `IMPREVISTO` ·
`RUOLO` · `VANILLA`

Più una **tabella di ogni codice esistente**: dove vive, se è implementato.

> **Regola M6 del committente: si consulta il Vocabolario prima di scrivere o riparare QUALUNQUE
> effetto, anche solo un "+N Attacco". E si aggiorna la sua tabella** quando si implementa un
> codice che risultava mancante. Esiste una skill dedicata (`effetti-carta`) che descrive la
> procedura.

**Stato attuale: 62 codici non implementati** (30 Magie, 14 Pedine, 12 Trappole, 6 Imprevisti) —
sezione "audit 2026-08-29" del Vocabolario, piano in `Engine/Effetti_Mancanti_Piano.md`, riassunto
nel doc 04 §4.5.

---

## 7.8 I problemi dati aperti — riepilogo operativo

| # | Problema | Cosa serve per chiuderlo |
|---|---|---|
| **V.5** | 34 valori distinti di `Tipo Effetto`; 6 ambigui (`sopravvivenza`, `rischio`, `schivata`, `paralisi`, `fusione`, `onkill`) | **ok dell'utente** sulla lista chiusa già scritta in `vocabolari.json`. Rischio zero: il motore non legge quella colonna |
| **V.6** | keyword orfana **"Volante"** (Il Rifiuto della Terra) | definirla nel regolamento, o riscrivere il testo della carta |
| **V.7** | 3 carte con testo identico parola per parola | scelta dell'utente su quali tenere |
| **V.8** | 37 statistiche fuori range (17 ufficiali, 20 proposte); il foglio `Leggimi` delle proposte afferma il contrario | decisione: ribilanciare ora o dopo |
| **V.9** | due renderer con budget testo diversi; i documenti si contraddicono su quale sia vivo | chiudere T.9 (correggere i documenti) |
| **V.10** | colonna `Sottotipo` ignorata: **Magie Continue e Rapide arrivano nel gioco come normali** | lavoro tecnico su `genera_cards_json.py` + motore. **Segnalato e non toccato** |
| **V.11** | campi di stampa vuoti su tutte e 157 le righe ufficiali | l'utente li compila; il controllo passa da avviso a errore |
| **V.12** | scala di rarità (SPEC) vs limite copie per carta (regolamento cap. 3 e 17): **due regole diverse** | sceglierne una e riscrivere l'altro documento |
| **V.13** | 111 righe di proposte con effetti non implementati | decidere **prima** di produrre le illustrazioni |

---

## 7.9 Ricette rapide

**Aggiungere/modificare una carta**
1. modifica **solo** l'Excel del mondo giusto;
2. `python tools/validate_cards.py` → deve dare 0 errori;
3. `python genera_cards_json.py "<percorso xlsx>"`;
4. se serve l'illustrazione: pipeline `worldloom-cards` (§7.5);
5. `npm run build` dentro `App - HTML - Test`;
6. se hai aggiunto un **codice effetto nuovo**: implementalo seguendo la skill `effetti-carta` e
   **aggiorna la tabella del Vocabolario**.

**Aggiungere una colonna Excel**
1. controlla prima che non esista già una colonna per lo stesso concetto (è già successo con
   Finitura / Varianti Illustrazione);
2. documentala nel foglio `Come compilare`;
3. se deve arrivare al gioco, leggila in `genera_cards_json.py`;
4. valuta se aggiungerla a `tools/vocabolari.json` (ricorda: aggiungere un valore lì è una
   decisione).
