# Modello "Scala dei Ruoli" — bilanciamento a tre livelli con i muri intatti

> **Stato: modello progettato e verificato, NON applicato.** Nessun file di gioco modificato:
> né Excel, né `cards.json`, né `rules.json`, né il motore.
> Documento sfogliabile: <https://claude.ai/code/artifact/8a3d6daa-d80d-4366-815b-ff96804d8150>
> Banco di prova: `node Engine/analisi-bilanciamento/motore_bilanciamento.mjs`
> Diagnosi che lo precede: `Engine/Analisi_Delta_Pedine.md`

**Vincolo posto dall'autore:** *«devo fare differenze tra archetipi e ruoli anche al lv 3, qui
creature muro lv3 ci devono essere»*. Il modello lo rispetta: il muro di Livello 3 tiene
**Parata 26** (contro i 30 di oggi), sale a **Vita 82**, e resiste **×4,0** più a lungo di un
aggressore. È più muro di adesso — ma cade in 5,8 turni invece che mai.

**Esito: 5 cancelli su 5** (oggi 1 su 5).

---

## 1. La rettifica alla prima analisi

`Analisi_Delta_Pedine.md` concludeva «abbassa la Parata del Livello 3». Con il vincolo dei muri
quella risposta è sbagliata — e i dati danno ragione all'autore:

**Il guasto non è che la Parata sia alta. È che i ruoli hanno smesso di essere diversi.**

---

## 2. La prova — i ruoli collassano al salire del livello

Il valore marginale di ogni statistica è stato misurato facendo variare una sonda contro il pool
del suo livello (30.000 duelli per punto):

| Livello | Attacco | Parata | Vita | Un attacco in più |
|---|---|---|---|---|
| 1 | 1,00 | 0,15 | 0,27 | 1,35 |
| 2 | 1,00 | 0,08 | 0,17 | 1,56 |
| 3 | 1,00 | 0,33 | 0,24 | 3,04 |

Ne cade un budget calcolabile a mente:

```
Punti = Attacco + Parata/4 + Vita/4 + 3 × (attacchi − 2)
```

Applicato alle carte vere il budget è **già coerente**: mediana 12,3 / 24,0 / 43,8 con dispersione
21% / 10% / **5%**. Non è il budget a essere sbagliato: è come viene **speso**.

### Quota di budget spesa per statistica (carte reali)

| Livello 1 | Attacco | Parata | Vita | | Livello 3 | Attacco | Parata | Vita |
|---|---|---|---|---|---|---|---|---|
| aggressore | **79%** | 3% | 18% | | aggressore | 58% | 16% | 26% |
| evasivo | 77% | 4% | 19% | | *evasivo* | — | — | — |
| bilanciato | 65% | 11% | 24% | | bilanciato | 65% | 14% | 22% |
| supporto | 53% | 18% | 29% | | *supporto* | — | — | — |
| difensore | 40% | 30% | 30% | | difensore | 56% | 19% | 25% |
| tank | 23% | 26% | **51%** | | tank | 56% | 18% | 26% |

Al Livello 1 i ruoli sono nettamente separati. **Al Livello 3 ogni ruolo spende fra il 56% e il 65%
in Attacco: tank e aggressore sono la stessa carta con due nomi.** E due ruoli su sei non esistono.

---

## 3. La regola che mancava — il margine di penetrazione

```
Parata massima di un livello  ≤  Attacco dell'aggressore di quel livello − 4
```

| Livello | Att. miglior aggressore | Par. miglior muro | Margine | Coppie in stallo | TTK |
|---|---|---|---|---|---|
| 2 | 19 | 17 | **+2** | 0,6% | 1,80 |
| 1 | 12 | 12 | **+0** | 12,5% | 1,89 |
| 3 | 26 | 30 | **−4** | 23,1% | 4,00 |

Tre livelli, tre margini, tre esiti in ordine perfetto. E il motivo è che **l'Attacco sta sulle carte
sbagliate**: al Livello 3 l'Attacco più alto (30 e 28) è sui `bilanciati`, l'unico ruolo che per
regola forza il matchup a neutro — cioè l'unico che non può usare la Ruota.

---

## 4. Il modello — tre leve

| # | Leva | Tocca | Effetto misurato |
|---|---|---|---|
| 1 | **Riallocare il budget per ruolo** (quote del Livello 1 a tutti i livelli, Parata tagliata dal tetto) | solo Excel | margine da −4 a +4; scala dei ruoli raddrizzata |
| 2 | **Il colpo di striscio**: chi non supera la statistica fa comunque `⌈Attacco/4⌉`, e il contraccolpo sparisce | `danneggiaSimmetrico` in `combattimento.js` | colpi a vuoto 71% → 29%; Cuore 74% → 59% |
| 3 | **Budget = prezzo**: 12 / 24 / 36 invece di 12 / 24 / 44 (×1, ×2, ×3 come i tributi) | solo Excel | economia 1% → 51% |

---

## 5. Il risultato misurato

| Indicatore | L1 oggi → mod. | L2 oggi → mod. | L3 oggi → mod. |
|---|---|---|---|
| Turni per uccidere | 1,89 → 2,40 | 1,80 → 2,33 | **4,00 → 2,41** |
| Colpi a vuoto | 51% → 29% | 42% → 29% | **71% → 29%** |
| Danno dal Cuore | 59% → 56% | 59% → 58% | **74% → 59%** |
| Economia dei tributi | 58% → 69% | **17% → 52%** | **1% → 51%** |
| Matchup neutri | 75% → 74% | **99% → 74%** | **100% → 74%** |
| Archetipo dominante | 31% → 33% | **69% → 33%** | **69% → 33%** |

### I cinque cancelli

| Cancello | Soglia | Oggi | Modello |
|---|---|---|---|
| G1 · Nessuna coppia immortale | 0 coppie | ✅ | ✅ |
| G2 · Ritmo uniforme | TTK 1,5–3 ovunque | ❌ 4,00 a L3 | ✅ 2,33–2,41 |
| G3 · Il dado non è una lotteria | Cuore ≤ 60% | ❌ 74% a L3 | ✅ 56–59% |
| G4 · Economia onesta | 35–65% | ❌ 1% a L3 | ✅ 51–69% |
| G5 · La Ruota gira | ≤80% neutri, ≤45% archetipo | ❌ 100% a L3 | ✅ 74% · 33% |

### La scala dei ruoli al Livello 3 (turni per essere abbattuti)

| Oggi | | Modello | |
|---|---|---|---|
| aggressore | **7,17** ← il più duro?! | tank · il muro | **5,75** |
| tank | 5,00 | difensore | 2,97 |
| difensore | 4,19 | supporto | 2,63 |
| bilanciato | 2,29 | bilanciato | 2,41 |
| *supporto* | non esiste | aggressore | 1,42 |
| *evasivo* | non esiste | evasivo | 1,08 |

Oggi la scala è **capovolta**. Col modello il muro torna in cima e i sei ruoli sono tutti presenti
e tutti distinti, con un divario di ×5,1 dal più duro al più fragile.

---

## 6. La griglia da copiare negli Excel

Valori centrali; ogni carta può scostarsi di **±15%** per avere personalità, purché resti dentro
il budget del livello e sotto il tetto di Parata.

**Budget 12 / 24 / 36 · tetto Parata 8 / 20 / 26**

| Ruolo | L1 Att/Par/Vita/att | L2 Att/Par/Vita/att | L3 Att/Par/Vita/att | Archetipi |
|---|---|---|---|---|
| aggressore | 12 / 1 / 9 / 2 | 24 / 3 / 17 / 2 | **30** / 4 / 26 / 2 | Assalitore · Tessitore |
| evasivo | 7 / 2 / 7 / 3 | 15 / 4 / 13 / 3 | 22 / 6 / 20 / 3 | Effimeri · Viandante |
| bilanciato | 8 / 5 / 12 / 2 | 16 / 11 / 23 / 2 | 23 / 16 / 35 / 2 | Viandante · Tessitore |
| supporto | 6 / 8 / 14 / 2 | 13 / 17 / 28 / 2 | 19 / 26 / 42 / 2 | Viandante · Effimeri |
| difensore | 5 / 8 / 14 / 2 | 10 / 20 / 29 / 2 | 14 / 26 / 43 / 2 | Colosso · Viandante |
| **tank · il muro** | 4 / 8 / 28 / 1 | 8 / 20 / 56 / 1 | **12 / 26 / 82 / 1** | Colosso · Effimeri |

Il muro di Livello 3: Parata 26, Vita 82, **un solo attacco per turno**. Quell'ultimo numero è ciò
che separa un muro da un boss (vedi §8). L'aggressore con Attacco 30 buca la sua Parata: margine **+4**.

Ogni ruolo prende **due archetipi diversi**, scelti perché il dado sia coerente col mestiere: il
Colosso (3 Scudi, 3 Schivate) ai difensivi, l'Assalitore (4 Spade) agli aggressori, gli Effimeri
(3 Schivate) agli evasivi. Così ogni livello contiene tutti e cinque gli archetipi.

---

## 7. Percorso di applicazione

| Tappa | Cosa | Tocca | Effetto |
|---|---|---|---|
| 1 | Ridistribuire gli archetipi a L2 e L3 | solo Excel | Ruota da 100% neutri a 74%. Nessuna statistica cambia. |
| 2 | Riallocare le statistiche per ruolo | solo Excel | Margine da −4 a +4. Scala raddrizzata. |
| 3 | Budget L3 da 44 a 36 | solo Excel | Economia da 1% a 51%. |
| 4 | Il colpo di striscio `⌈A/4⌉` | motore (`danneggiaSimmetrico`) | Colpi a vuoto 71% → 29%. |
| 5 | Scrivere le due regole in `rules.json` e nel regolamento | documenti | Impedisce che il guasto torni. |

Le prime tre tappe **non toccano una riga di codice**. Da sole portano a 3 cancelli su 5. La quarta
è una funzione sola e chiude gli altri due. Le modifiche ai dati passano dalla skill `pipeline-carte`
(Excel → `genera_cards_json.py`, mai `cards.json` a mano).

---

## 8. Duelli 1 vs 1 — la verifica concreta

Strumento: `node Engine/analisi-bilanciamento/duelli_1v1.mjs [1|2|3|modello]`
20.000 duelli per casella, turni alternati, metà delle volte inizia l'uno metà l'altro.

### Livello 3 di oggi — probabilità che la riga batta la colonna

| | Mago | Manip. | Presc. | ReAnt. | Potere | Drago | Figlio | Custode | Guard. |
|---|---|---|---|---|---|---|---|---|---|
| Mago Sorprendente `30·22·33` | — | 74% | 63% | 49% | 38% | 60% | 62% | 63% | 100% |
| Manipolatrice Suprema `28·25·40` | 26% | — | 36% | 61% | 47% | 59% | 58% | 60% | 100% |
| Il Prescelto `26·28·45` | 37% | 64% | — | 65% | 70% | 80% | 84% | 84% | 100% |
| Il Re Antico `24·26·43` | 51% | 39% | 34% | — | **12%** | 70% | 71% | 71% | 99% |
| Potere Divino `24·30·45` | 62% | 53% | 30% | 10% | — | 76% | 79% | 81% | 100% |
| Drago Linfatico `22·30·40` | 40% | 41% | 20% | 30% | 24% | — | 62% | 64% | 96% |
| Figlio del Gelo `20·30·45` | 38% | 42% | 16% | 29% | 21% | 38% | — | 13% | 94% |
| Custode del Ghiaccio `20·30·44` | 37% | 40% | 16% | 29% | 19% | 36% | 13% | — | 94% |
| Guardiano di Marbion `0·30·44` | **0%** | 0% | 0% | 1% | 0% | 4% | 6% | 6% | — |

### Tre duelli che raccontano tre guasti

**1 · Il Re Antico contro Potere Divino — il 78% delle volte muoiono ENTRAMBI.**
Stesso Attacco (24), quindi sulla faccia Spada scatta il pareggio mortale. Su 20.000 duelli:
vince Il Re Antico 11,5%, vince Potere Divino 10,5%, **doppio KO 78%**, durata mediana 1 turno.
Non è un duello, è una monetina che uccide tutti e due. Al Livello 3 ci sono **quattro carte con
Attacco 24** e il 17,3% degli accoppiamenti condivide lo stesso valore; negli *specchi* (stessa
carta contro sé stessa, frequenti con 2-3 copie per carta) il pareggio è garantito.

**2 · Mago Sorprendente contro Potere Divino — l'Attacco più alto del gioco perde.**
Il Mago ha Attacco 30, il massimo esistente, infligge 11,3 danni a turno e non subisce contraccolpo.
Vince **Potere Divino il 61,7%**, perché il muro gliene restituisce 15 (il Mago ha Vita 33, Parata 22,
e il dado Tessitore ha 2 Cuori su 8). **Il muro fa più male dell'aggressore**: l'inversione della
scala in un numero solo.

**3 · Guardiano di Marbion (Attacco 0) vince comunque il 6%.**
Non può fare danno su nessuna faccia. Vince quando l'avversario **si uccide da solo col contraccolpo**:
Figlio del Gelo incassa 10 per ogni Scudo, due volte per turno, mentre il Guardiano attacca una volta
sola e ne incassa meno. È la prova più netta che oggi **attaccare un muro è un'autopunizione** — ciò
che la leva 2, togliendo il contraccolpo, elimina.

### Livello 3 del modello

| | Aggr. | Evas. | Bilan. | Supp. | Difen. | Muro |
|---|---|---|---|---|---|---|
| Aggressore `30·4·26·2` | — | 44% | 45% | 39% | 32% | 50% |
| Evasivo `22·6·20·3` | 56% | — | 34% | 44% | 35% | 53% |
| Bilanciato `23·16·35·2` | 55% | 66% | — | 50% | 44% | 66% |
| Supporto `19·26·42·2` | 61% | 56% | 50% | — | 39% | 61% |
| Difensore `14·26·43·2` | 68% | 65% | 56% | 61% | — | 77% |
| **Muro · tank** `12·26·82·1` | 50% | 47% | 34% | 39% | 23% | — |

Tutte le caselle fra **23% e 77%**. Doppi KO: **zero**. Stalli: **zero**. Nessuna casella a 0% o 100%.

### La regola scoperta qui — da scrivere nel regolamento

**È il numero di attacchi a decidere se una carta è un muro o un boss.** A parità di budget, lo
stesso profilo difensivo con *un* attacco per turno vince il 15-46% dei duelli; con *due* ne vince
il **59-82%**. Sempre, in ogni variante provata. Non è la Parata a fare il muro, non è la Vita: è il
fatto che colpisce una volta sola.

**Correzione al modello prodotta da questa verifica:** la prima versione dava al muro `8 / 26 / 89 / 1`
e il muro sopravviveva a tutti senza mai vincere (11%) — un bersaglio inerte. Portato a
`12 / 26 / 82 / 1` vince il 39%, resta il più duro del livello, e i 5 cancelli restano passati.
La griglia in §6 contiene già la versione corretta.


---

## 9. Limiti dichiarati

- **Il ritmo a L1 rallenta**: da 1,89 a 2,40 turni. Dentro la soglia sana, ma si sente. Nasce dal
  colpo di striscio. Manopola: `⌈A/3⌉` invece di `⌈A/4⌉` accelera tutto.
- **Le coppie lente restano il 20-23%** a ogni livello, ma ora sono le coppie *giuste*: un tank che
  attacca un altro tank è lento per costruzione, ed è corretto. Oggi erano lente le coppie sbagliate
  (aggressore contro muro).
- **Tutto misurato senza effetti carta**, Magie, Trappole, diritto di ripetizione, effetti di ruolo.
  È la base su cui poggiano gli effetti, non la partita completa. Da riverificare col banco di prova
  dopo l'implementazione dei 62 effetti mancanti.
- **Non c'è morra cinese fra i ruoli, ma un ordine di dominanza.** Nella matrice del modello il
  Difensore batte tutti (56-77%) e l'Aggressore perde quasi con tutti nell'uno-contro-uno (32-50%).
  La forbice 23-77% non è degenere per un TCG, ma non è ancora un gioco di scelte. Il rimedio esiste
  già nel regolamento e in questa simulazione **non è acceso**: la **Ruota degli Archetipi** col
  diritto di ripetizione. È lì che deve nascere il "porta lo strumento giusto" — da modellare e
  misurare in un passo successivo.
- Le decisioni **D3** (`Guardiano di Marbion` con Attacco 0) e **D5** (range di `rules.json`) di
  `Analisi_Delta_Pedine.md` restano aperte; D5 si chiude da sé adottando questa griglia.

---

## Riferimenti

- Banco di prova parametrico: `Engine/analisi-bilanciamento/motore_bilanciamento.mjs`
- Diagnosi: `Engine/Analisi_Delta_Pedine.md`
- Motore: `App - HTML - Test/src/game/combattimento.js`, `costanti.js`, `evocazione.js`
