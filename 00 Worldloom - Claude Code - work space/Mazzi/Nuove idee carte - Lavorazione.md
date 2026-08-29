# Nuove idee carte — Stato di lavorazione

Tracking della lavorazione delle idee da `Nuove idee carte.txt` (analizzate nel PDF
`Nuove idee carte - Analisi e prompt immagini.pdf`) + `Nuove idee carte v2.txt`.

> **STATO al 2026-08-29: LAVORAZIONE COMPLETA — tutte le 61 idee trattate e trascritte.**
> Imprevisti ora per-mondo (non condivisi) da qui in poi; gli 8 Imprevisti esistenti
> condivisi restano da separare come task a parte (non ancora fatto). Colonne aggiunte anche al
> foglio Imprevisti: `Rarita`, `Finitura`, `Prompt Immagine`, `Verificata`, `Varianti Illustrazione`.
> Prossimi passi possibili: task "separare gli 8 Imprevisti condivisi per mondo", generare le
> immagini con Higgsfield usando i prompt scritti, chiudere la Carta 55, poi far girare
> `genera_cards_json.py` + `componi_carte.py` quando le carte saranno pronte per entrare in gioco
> (serve prima implementarne gli effetti nell'engine — molte introducono meccaniche nuove, vedi
> sezione "Note per la fase engine" sotto).
> ⚠️ Molte altre sessioni (15 viste in parallelo) lavorano sullo stesso repo — committare spesso.

Regole di sessione:
- Si tratta **una carta alla volta**. Quando è definita si trascrive subito nel file ufficiale
  del mondo (`FrostLand_carte.xlsx` / `Kepler452B_carte.xlsx`) e si segna `Stato = verificata` qui.
- **Magie/Trappole/Terreni/Imprevisti NON sono condivise**: ogni carta va assegnata a **un solo mondo**
  (gli 8 Imprevisti esistenti restano condivisi per ora — separarli è un task a parte, non ancora fatto).
- **Recuperare/cercare una carta senza nominarla** (es. "una pedina di Livello 1") = **sempre una scelta
  del giocatore**, mai a caso. Solo se il testo nomina la carta specifica (es. "un'altra copia di questa
  carta") non c'è scelta.
- Nei testi **e nella colonna `Tipo Carta`**: *alieno / creatura / mostro* → **"Pedina"** (solo carte nuove). La parola "Alieno" non esiste più.
- *Urano* o simili → **Frost Land** · *Kepler-452B* o simili → **Marbion** (chiedere se ambiguo).
- **Dado nel testo**: se già specificato (o è chiaramente il dado Imprevisti) non si tocca; se non
  specificato, si decide caso per caso (spesso: dado di una tua pedina in prima linea a tua scelta).
- Per ogni carta si concordano anche: **Copie**, **Limite Copie** (ban list), **Rarità**, **Prompt immagine**.
- Colonne aggiunte a entrambi gli Excel (fogli *Carte* e *Imprevisti*): `Prompt Immagine`, `Verificata`, `Varianti Illustrazione` (es. "Normale", "Normale + Foil", "Variante 1", "Star Rail"…).

Gruppi: **A** = pulita (pochi numeri da fissare) · **B** = serve decisione di design · **C** = da riscrivere a voce.

**Archetipi** (dado di reazione): Viandante · Assalitore · Effimeri · Colosso · Tessitore
**Ruoli** (effetto sul combattimento): `aggressore` · `difensore` · `tank` · `bilanciato` · `evasivo` · `supporto`
**Rarità in uso**: Comune · Rara · Epica · Ultra Rara · Leggendaria

---

## Stile prompt immagini (canonico — da appendere a OGNI prompt)

Struttura di ogni prompt: **[SCENA specifica della carta]** + **[blocco STILE qui sotto, sempre identico]**.
Le figure protagoniste vanno sempre al centro e attirano lo sguardo con colori più vivi dello sfondo (più desaturato).
I colori dominanti della scena si specificano nella parte SCENA (blu / oro / rosa / verde / rosso… variano per carta).

```
STYLE: realistic fantasy illustration — not digital, not vector, not glossy. Extremely grainy, material
texture like dry pigment on a rough but clean surface, as if from chemical film emulsion. Very fine detail,
high micro-contrast, three-dimensional rendering with volumetric filtered light. Minimal brushwork, precise
and natural illustrative linework. Vivid saturated colors with warm, deep highlights and deep shadows;
ethereal yet natural atmosphere, strong contrast between warm light and deep shadow. The main subject sits
at the centre of the frame and pops with colours more vivid than the more desaturated background. Vertical
composition, full bleed, fixed 2:3 aspect ratio, no text, no border, no frame. Simulated camera/film look:
35mm film, ISO 3200-4000, Kodak T-Max P3200; a light noise/grain stippling over the whole image adding
extra materiality (simulated film-grain watermark).
```

---

## Frost Land — esclusive

| # | Nome | Tipo | Gr. | Stato |
|---|------|------|-----|-------|
| 1 | Temperatura Glaciale | Magia Terreno | B | **verificata** |
| 2 | Goblin Chiama Goblin | Magia Continua | A | **verificata** |
| 3 | Baraonda di Ghiaccio | Magia Terreno | B | **verificata** |
| 4 | Allarme Temperatura Bassa | Magia | B | **verificata** |

## Marbion — creature (pedine)

| # | Nome | Arch./Liv. (ipotesi) | Gr. | Stato |
|---|------|----------------------|-----|-------|
| 5 | Farfalla Inebriante di Marbion | Effimeri L1 | B | **verificata** |
| 6 | Pianta Carnivora | Assalitore L2 bilanciato | A | **verificata** |
| 7 | Lince Petalosa Protettiva | Assalitore L2 aggressore | A | **verificata** |
| 8 | Cucciolo di Lince Petalosa | Effimeri L1 evasivo (vanilla) | A | **verificata** |
| 9 | Verme del Riciclo (era "Vermi") | Effimeri L1 evasivo | B | **verificata** |
| 10 | Servitore di Marbion | Viandante L1 supporto | A | **verificata** |
| 11 | Pescatore dell'Oasi | Viandante L1 supporto | C | **verificata** |
| 12 | Ladro di Luce | Assalitore L1 aggressore | B | **verificata** |
| 13 | Amico di Marbion (era "del Paradiso") | Viandante L1 supporto | C | **verificata** |
| 14 | Guardiano di Marbion | Colosso L3 tank (0 Att) | B | **verificata** |
| 15 | Soldato dell'Esercito di Marbion | Viandante L1 bilanciato | A | **verificata** |
| 16 | Cavaliere dell'Esercito di Marbion | Assalitore L2 aggressore | C | **verificata** |

## Marbion — Magie / Trappole / Terreni esclusivi

| # | Nome | Tipo | Gr. | Stato |
|---|------|------|-----|-------|
| 17 | Simbiosi Nera | Magia Continua | B | **verificata** |
| 18 | Regina del Riciclo | Trappola Normale | A | **verificata** |
| 19 | Fusione Colori | Magia Continua | A | **verificata** |
| 20 | Marcia di Marbion | Magia Terreno | A | **verificata** |
| 21 | Distruggi Esercito | Magia Normale | B | **verificata** |

## Da assegnare a un mondo (PDF le dava "condivise")

| # | Nome | Tipo | Gr. | Stato |
|---|------|------|-----|-------|
| 22 | Blocco degli Eventi | Frost Land · Trappola Normale | B | **verificata** |
| 23 | Rifornimento Accompagnato Fortunato (Marbion, Cuore) + gemella **Fortuna del Gelo** (Frost Land, Schivata) | Magia Continua | A | **verificata** |
| 24 | Blocca Strategia | Marbion · Trappola Normale | B | **verificata** |
| 25 | Controattacco Disperato | Marbion · Trappola Continua (3 turni) | B | **verificata** |
| 26 | Impossibile | Frost Land · Magia Rapida | B | **verificata** |
| 27 | Intervento Superiore | Frost Land · Trappola Normale | B | **verificata** |
| 28 | Saccheggio | Marbion · Magia Rapida | B | **verificata** |
| 29 | Tutto Calcolato | Marbion · Trappola Normale | B | **verificata** |
| 30 | Prendi il Rischio? | Frost Land · Magia Normale | B | **verificata** |
| 31 | Trappole Veloci | Marbion · Trappola Continua (3 turni) | B | **verificata** |
| 32 | Distruggi Terreno | Frost Land · Magia Normale | A | **verificata** |
| 33 | Blocca Resuscita | Frost Land · Trappola Normale | B | **verificata** |
| 34 | L'Acqua è Vitale | Marbion · Magia Rapida (riga Comune + riga Ultra Rara/Foil) | A | **verificata** |
| 35 | Strategia dello Stratega | Marbion · Magia Normale | B | **verificata** |
| 36 | Blocca Magie per 3 turni | Frost Land · Trappola Normale | B | **verificata** |
| 37 | Destino Conquistato (era "Dado a Scelta") | Marbion · Magia Normale (Ultra Rara + Leggendaria/Foil) | B | **verificata** |
| 38 | Destino Obbligato (era "Dado Imposto") | Frost Land · Trappola Normale (Ultra Rara + Leggendaria/Foil) | B | **verificata** |
| 39 | Fatalista | Frost Land · Magia Rapida (tuo turno, non "avversario") | B | **verificata** |
| 40 | Il Destino nelle Tue Mani | Marbion · Magia Rapida (Ultra Rara/Foil + Comune/Normale) | B | **verificata** |
| 41 | Il Destino dell'Avversario è Segnato | Frost Land · Magia Rapida (Ultra Rara/Foil + Comune/Normale) | B | **verificata** |
| 42 | Rifornimento Guidato | Frost Land · Magia Normale | A | **verificata** |
| 43 | Antidolorifico | Frost Land · Magia Normale (durata "0" = mio prossimo turno, mia ipotesi) | B | **verificata** |
| 44 | Scudo Solenne | Marbion · Trappola Normale (Epica/Foil + Comune/Normale) | C | **verificata** |

## Imprevisti nuovi (mazzetto — condivisione da confermare)

| # | Effetto | Gr. | Stato |
|---|---------|-----|-------|
| 45 | Il Richiamo dei Caduti — Frost Land, Copie 2/LC 1 (Imprevisti ora per-mondo, non condivisi) | B | **verificata** |
| 46 | Blocca Supporto — Marbion, Copie 2/LC 2 | A | **verificata** |
| 47 | Ad Armi Pari — Marbion, Copie 2/LC 2 (Ruolo + vantaggio Archetipo ignorati) | B | **verificata** |
| 48 | Evocazione Rischiosa — Frost Land, Copie 1/LC 1 (Leggendaria/Foil + Comune/Normale) | A | **verificata** |
| 49 | Apocalisse degli Sfortunati — Marbion, Copie 1/LC 1 (Epica/Foil + Comune/Normale), soglia <+2 muore | B | **verificata** |

## Carte esempio confuse (cap. 6 — riscrivere a voce)

| # | Nome | Tipo | Gr. | Stato |
|---|------|------|-----|-------|
| 50 | Il Prescelto si è Elevato | Marbion · Colosso L3 aggressore (Ultra Rara, Normale+Foil) | C | **verificata** |
| 51 | Marchio del Sole | Marbion · **Imprevisto** (non Magia), Leggendaria/Foil, Copie 1/LC 1 | C | **verificata** |
| 52 | Il Sole Scotta | Marbion · Magia Normale→Continua se Scudo | C | **verificata** |
| 53 | L'Estate più Calda di Marbion | Marbion · Magia Terreno, +1 V/A/P a entrambi (Comune/Normale + Rara/Foil) | C | **verificata** |
| 54 | Per Giorno Celestiale | Marbion · Trappola Continua, Copie 2/LC 2, Comune | C | **verificata** |
| 55 | Ultima Chiamata dal Cero | Marbion · **Pedina** Tessitore L1 tank (era Magia), Copie 2/LC 2, Comune | C | **verificata** |

## Idee future (non ancora task, solo annotate)

- Pedine in grado di attaccare direttamente dalla retrovia (spunto emerso lavorando sulla carta 60).

## Note per la fase engine (nuove meccaniche introdotte dalle carte già verificate)

- **ZONA ESILIO** (nuova, dubbio 6.3): "bandisci / disintegra dall'esistenza" = carta rimossa in modo
  permanente, NON al cimitero, non recuperabile. Usata da: Carta 11 (Pescatore dell'Oasi), Carta 17
  (Simbiosi Nera). Serve un nuovo array di stato + decidere se mostrarla sul tabellone.
- **Carta 17 (Simbiosi Nera)**: Magia Continua che **sostituisce l'abilità attivata di un'altra
  pedina** in campo (Pianta Carnivora) finché una condizione di posizione regge. Meccanica nuova.

- **Carta 1 (Temperatura Glaciale)**: serve un controllo "questa pedina è di Frost Land?" (mondo
  d'origine della carta) — oggi nessun Terreno distingue le pedine per mondo. Codice `terr_gelo`,
  effetto = −4 Parata alle pedine non-Frost-Land su entrambi i lati.
- **Carta 2 (Goblin Chiama Goblin)**: Magia Continua con **trigger sull'evocazione** (nuovo: le Continue
  esistenti sono solo buff passivi). Serve anche un'azione "**rimescola una carta dalla mano nel
  Worldloom + shuffle**" (con animazione), oggi inesistente. Codice `goblinchiama`, `Tipo Effetto` =
  `continua` (marcatore nuovo).
- **Carta 59 (Blocca Postazione)**: una Magia che **occupa fisicamente uno slot di prima linea**
  come se fosse una pedina (impedendo evocazioni/spostamenti lì), ma non è tributabile né contata
  come pedina. Meccanica nuova: un non-pedina che occupa uno slot creatura.
- **Carta 52 (Il Sole Scotta)**: Magia che parte Normale ma **diventa Continua a runtime** (solo se
  esce Scudo) e resta in campo finché non para un attacco diretto. Sottotipo dinamico, mai visto
  prima — serve gestirlo come caso speciale nel motore.
- **Carta 9 (Verme del Riciclo)**: trigger su **conteggio nel cimitero a multipli di 3** (3, 6, 9...),
  effetto **ritardato al turno successivo** con scelta (evocazione speciale da cimitero / +50 PV Stratega).
  Nessun precedente per un trigger "conteggio cimitero". Codice `vermericiclo`.
- **Carta 5 (Farfalla Inebriante)**: pedina con **abilità attivata 1×/turno** (tira il dado, su
  Schivata applica `stordito` a un nemico dal suo prossimo turno). Nuovo `Tipo Effetto` = `attivata`
  (le pedine oggi hanno solo `summon`/`passive`/trigger di morte). Riusa lo stato `stordito` esistente.
  Stesso pattern servirà per la Carta 12 (Ladro di Luce).

---

## Da `Nuove idee carte v2.txt`

| # | Nome | Tipo | Gr. | Stato |
|---|------|------|-----|-------|
| 56 | Male Necessario | Marbion · Magia Normale, Copie 1/LC 2, Comune | A | **verificata** |
| 57 | Riparti da Zero | Frost Land · Magia Normale, board wipe totale, Copie 1/LC 1, Comune | B | **verificata** |
| 58 | Anticipo sul Futuro | Frost Land · Magia Normale, Copie 3/LC 3 (Comune/Normale + Rara/Foil) | B | **verificata** |
| 59 | Blocca Postazione | Frost Land · Magia Rapida, occupa fisicamente lo slot, Copie 2 (Rara/Foil LC2 + Comune/Normale LC2) | B | **verificata** |
| 60 | Grido di Battaglia | Frost Land · Magia Rapida, Copie 2/LC 2 (Ultra Rara/Foil + Comune/Normale) | A | **verificata** |
| 61 | Salta Rifornimento | Frost Land · Magia Normale, Copie 3/LC 3, Comune | B | **verificata** |
