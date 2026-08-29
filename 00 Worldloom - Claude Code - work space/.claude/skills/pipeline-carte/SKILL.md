---
name: pipeline-carte
description: >-
  La pipeline dati delle carte Worldloom: Excel → genera_cards_json.py → cards.json →
  componi_carte.py → immagini Complete Card → sync-data → build. USA SEMPRE questa skill quando si
  tocca il contenuto delle carte: aggiungere/modificare una carta o un Imprevisto, cambiare
  statistiche/testo/codice effetto, rigenerare un cards.json, ricomporre le immagini delle carte,
  aggiungere una colonna Excel nuova, o quando l'utente dice "rigenera il cards.json di X",
  "aggiorna le carte dall'Excel", "ricomponi le Complete Card". REGOLA FERREA: cards.json non si
  modifica MAI a mano. Non usarla per implementare la LOGICA di un effetto nell'engine (quella è
  la skill effetti-carta) né per lavoro UI.
---

# Pipeline dati carte Worldloom

## Regola d'oro

`cards.json` e le immagini in `Complete cards/` sono **artefatti generati**. Non si toccano mai a
mano. Ogni modifica al contenuto di una carta parte dall'**Excel del mazzo**. Gli script
(`genera_cards_json.py`, `componi_carte.py`) **non si modificano** per aggiungere carte — solo per
supportare una colonna nuova (vedi sotto).

## Mappa dei file

| Cosa | Dove |
|---|---|
| Excel Frost Land | `Mazzi/Frost Land - Primitivi del ghiaccio/Excel/FrostLand_carte.xlsx` |
| Excel Kepler-452B | `Mazzi/Marbion - Kepler - 452 B - Manipolatrici d'aura/Excel/Kepler452B_carte.xlsx` |
| `cards.json` sorgente | `Mazzi/<mondo>/cards.json` (scritto da `genera_cards_json.py`) |
| Immagini illustrazione Alieni | `Mazzi/<mondo>/Images/<nome-carta>.png` (fornite a mano dall'utente) |
| Complete Card composte | `Mazzi/<mondo>/Complete cards/<nome-carta>.jpg` (scritte da `componi_carte.py`) |
| Copie bundlate (leggono l'app) | `App - HTML - Test/src/data/generated/mazzi/<id>/` (scritte da `sync-data.mjs`) |
| Script generatori | root del progetto: `genera_cards_json.py`, `componi_carte.py` |
| Script di copia nel bundle | `App - HTML - Test/scripts/sync-data.mjs` |

`id` mondo: `frost-land`, `kepler-452b`.

## Fogli Excel

- **`Carte`** — Alieni + Magie + Trappole (la colonna `Tipo Carta` distingue: `Alieno`/`Magia`/`Trappola`).
  Colonne lette dallo script: `Nome`, `Archetipo`, `Livello`, `Ruolo`, `Copie`, `Limite Copie`,
  `Vita`, `Attacco`, `Parata`, `Attacchi`, `Tipo Effetto`, `Testo Effetto`,
  `Codice Effetto (per Claude Code)`, `Tipo Carta`, `Sottotipo`.
- **`Imprevisti`** — mazzetto separato (cap. 15). Colonne lette: `Nome`, `Copie`, `Limite Copie`,
  `Testo Effetto`, `Codice Effetto (per Claude Code)`.
- **`Come compilare`** — foglio di documentazione (colonne `Colonna` / `Cosa scriverci`). Tienilo
  aggiornato quando cambi il significato di una colonna.

`Copie` = quante copie esistono nel set fisico (NON un limite di costruzione). `Limite Copie` =
limite di costruzione mazzo: **vuoto** = regola standard (max 3 Worldloom / max 2 Imprevisti, mai
più di `Copie`), un **numero** = eccezione esplicita, **0** = carta bandita.

## Sequenza standard (modifica al contenuto di una carta)

1. **Modifica l'Excel** del mazzo interessato. Per modifiche programmatiche (nuova colonna, valori
   in bulk) usa `openpyxl` in Python; se è una singola cella, va bene anche chiedere all'utente di
   farlo a mano. Se aggiungi una carta a un mondo, aggiungila all'altro Excel se è una
   Magia/Trappola/Imprevisto **condiviso** (dati e immagine devono restare identici).

2. **Rigenera `cards.json`**:
   ```bash
   python genera_cards_json.py "Mazzi/Frost Land - Primitivi del ghiaccio/Excel/FrostLand_carte.xlsx"
   ```
   (path root del progetto). Scrive `Mazzi/<mondo>/cards.json`. Rifallo per l'altro Excel se hai
   toccato entrambi.

3. **Ricomponi le Complete Card** — solo se hai cambiato qualcosa di **visibile in carta** (nome,
   testo, statistiche, archetipo, ruolo, `Limite Copie`) o aggiunto una carta / un'illustrazione:
   ```bash
   python componi_carte.py "Mazzi/Frost Land - Primitivi del ghiaccio"
   ```
   Gli Alieni senza illustrazione in `Images/` vengono **saltati** (lo script lo stampa) — non è un
   errore, l'illustrazione va fornita dall'utente. Magie/Trappole/Terreni/Imprevisti si compongono
   comunque con lo sfondo del tipo.

4. **Build** dentro `App - HTML - Test`:
   ```bash
   npm run build
   ```
   `prebuild` lancia `sync-data.mjs` da solo: copia `cards.json` + le Complete Card (`.jpg`) +
   `sfondo-campo/` in `src/data/generated/mazzi/<id>/`, poi Vite produce `GIOCA.html`. Non serve
   lanciare `sync-data` a mano.

5. **Verifica**: controlla l'output degli script (conteggi carte, carte saltate), e se rilevante
   apri il gioco nel browser per vedere la carta in mano/zoom.

## Aggiungere una colonna Excel nuova

Solo quando serve un concetto dati nuovo. Prima **controlla che non esista già** una colonna per
lo stesso scopo (vedi memoria `[[project_finitura_varianti_carte]]`). Poi:

1. Aggiungi la colonna a **entrambi** gli Excel (`Carte` e/o `Imprevisti`), via `openpyxl`.
2. Aggiorna la riga corrispondente nel foglio `Come compilare`.
3. Fai leggere la colonna a `genera_cards_json.py` (nuovo campo nel dict della carta). Usa
   `intero_o_none` se "vuoto" ha un significato diverso da 0.
4. Se il valore va mostrato in carta, gestiscilo in `componi_carte.py`.
5. Rigenera + ricomponi + build come sopra.

## Note

- Le Complete Card sono **JPEG** (non PNG) per tenere `GIOCA.html` leggero (~24MB).
- `WORLDLOOM_COMPLETE_CARDS_DIR=Complete cards compressed` è un opt-in per build leggere da
  condividere come link; il build normale non lo usa.
- `rules.json` (`Regolamento/rules.json`) è dato di riferimento per il game design, **non letto a
  runtime** dall'engine — `sync-data` lo copia comunque nel bundle.

## Riferimenti

- `genera_cards_json.py`, `componi_carte.py` — docstring in cima con esempi d'uso
- `App - HTML - Test/scripts/sync-data.mjs` — cosa viene copiato nel bundle
- `Regolamento/Worldloom_Regolamento_v2.1.html` — cap. 5 (anatomia carta), 14 (Magie/Trappole/Terreni), 15 (Imprevisti)
- memoria: `[[project_nuove_idee_carte_lavorazione]]`, `[[feedback_terminologia_pedina]]`, `[[project_finitura_varianti_carte]]`
