# Analisi dei delta fra Pedine — perché il Livello 3 si inchioda

> **Stato: analisi chiusa, decisioni APERTE.** Nessun file di gioco è stato modificato:
> né gli Excel, né i `cards.json`, né `rules.json`, né il motore.
> Documento sfogliabile: <https://claude.ai/code/artifact/b9443ca7-0605-4334-8f8a-e2b144003404>
> Strumento riproducibile: `node Engine/analisi-bilanciamento/analisi_delta.mjs`

**Origine.** L'utente ha notato giocando che le Pedine di Livello 1 hanno delta fra loro che
rendono la partita giocabile (ci si attacca, si muore), mentre al Livello 3 i delta non
lasciano giocare: non riesci a tirare giù la Pedina avversaria.

**Verdetto: l'osservazione è corretta, e i numeri veri sono peggiori dell'esempio ricordato.**
Nell'esempio riferito a voce (Attacco 50 contro Parata 30) il pavimento `⌈A/2⌉` del motore darebbe
25 danni a colpo — due colpi e la Pedina cade, quindi sarebbe giocabile. Le carte vere di Livello 3
hanno Attacco mediano 24 contro Parata mediana 28: su Scudo il danno è **zero**, più contraccolpo.

---

## 1. Metodo

Analisi svolta sui dati reali dei due mazzi (`Mazzi/*/cards.json`, 63 Pedine) applicando
**esattamente** la matematica del motore:

| Sorgente | Cosa fornisce |
|---|---|
| `src/game/combattimento.js` | `risolviSimbolo`, `danneggiaSimmetrico`, pavimento `⌈A/2⌉`, pareggio mortale su Spada |
| `src/game/costanti.js` | `DADI_ARCHETIPO` (8 facce per archetipo), `calcolaMatchup` (Ruota) |
| `src/game/evocazione.js` | `valoreTributi` — un L2 costa 2 tributi, un L3 ne costa 3 |
| `Regolamento/rules.json` | i range dichiarati per livello |

Due misure affiancate: **analitica** (valore atteso su tutte le 8 facce, tutte le coppie) e
**Monte Carlo** (20.000 duelli con turni alternati e morte vera).

⚠️ **Baseline volutamente nuda:** niente effetti carta, niente Magie/Trappole, niente diritto di
ripetizione, niente effetti di ruolo. Misura le **statistiche**, non la partita intera. Gli effetti
tendono a favorire lo sciame, quindi nella realtà le percentuali del gruppo saranno un po' più alte.

Il `Guardiano di Marbion` (Attacco 0) è escluso dai calcoli di combattimento — falserebbe le medie —
ma è segnalato a parte. Vedi decisione **D3**.

---

## 2. Il sintomo, misurato

| Misura | Livello 1 | Livello 2 | Livello 3 |
|---|---|---|---|
| Colpi che fanno zero danni | 51% | 42% | **71%** |
| Danno che arriva dal Cuore | 60% | 59% | **74%** |
| Turni per uccidere (mediana) | 1,89 | 1,80 | **4,00** |
| Coppie oltre 6 turni | 12,5% | 0,6% | **23,1%** |
| Rapporto **Attacco / Parata** | 1,56 | 1,53 | **0,91** |
| Rapporto Vita / Attacco | 1,45 | 1,32 | **1,66** |

L'ultima riga in grassetto è la spia. A Livello 1 e 2 l'Attacco tipico supera di una volta e mezza
la Parata tipica, quindi le facce Spada e Scudo funzionano. **A Livello 3 il rapporto si inverte** e
quelle due facce si spengono: resta solo il Cuore, che sul dado del Colosso è 1 faccia su 8.

---

## 3. La radice — una sola causa

**Le finestre di Attacco e Parata dei livelli non si sovrappongono.**

| Livello | Attacco | Parata | Vita |
|---|---|---|---|
| 1 (36 Pedine) | 2 – 12 | 2 – 12 | 5 – 18 |
| 2 (13 Pedine) | 8 – 19 | 6 – 17 | 16 – 30 |
| 3 (14 Pedine) | 20 – 30 | **22 – 30** | 33 – 45 |

Quota di matchup in cui l'attaccante supera la Parata del difensore (cioè: il colpo su Scudo fa danno):

|  | → Parata L1 | → Parata L2 | → Parata L3 |
|---|---|---|---|
| **Attacco L1** | 70% | 28% | **0%** |
| **Attacco L2** | 98% | 85% | **0%** |
| **Attacco L3** | 100% | 100% | 22% |

> Attacco massimo di Livello 1 = **12**. Attacco massimo di Livello 2 = **19**. Parata minima di
> Livello 3 = **22**.
> ⇒ **Nessuna** delle 49 Pedine di Livello 1 e 2 può superare la Parata di **nessuna** delle 14
> Pedine di Livello 3 — 0 casi su 686.
> ⇒ Contro un L3 resta una sola faccia utile su otto: il Cuore.

E il muro vale **anche contro sé stesso**: dentro il Livello 3, con Attacco mediano 24 contro Parata
mediana 28, la Parata regge nel **78%** dei matchup.

### Perché è strutturale e non un incidente di trascrizione

`rules.json` dichiara **Attacco e Parata con lo stesso identico intervallo a ogni livello**:
`[1,12]`/`[1,12]`, poi `[10,18]`/`[10,18]`, poi `[16,30]`/`[16,30]`.

L'asimmetria che fa funzionare il Livello 1 **non è progettata**: è successa, perché chi ha scritto
quelle carte ha messo parate basse. A Livello 3 ha messo parate alte, e la fortuna è finita.

### Esempio lavorato

`Il Re Antico` (Att 24 · Par 26 · Vita 43 · 3 attacchi · Colosso) attacca
`Potere Divino` (Att 24 · Par 30 · Vita 45 · Colosso):

| Faccia | Prob. | Esito |
|---|---|---|
| Spada | 1/8 | **Pareggio mortale** — 24 contro 24: si distruggono entrambe |
| Scudo | 3/8 | **0 danni**, e 6 di contraccolpo sull'attaccante |
| Cuore | 1/8 | **24 danni** — l'unica faccia che funziona |
| Schivata | 3/8 | 0 danni |

Danno atteso 3,0 a colpo · contraccolpo atteso 2,25. Con 3 attacchi: **9 danni a turno contro 45 di
Vita = 5 turni**, subendone 6,8. È esattamente la sensazione riferita dall'utente.

---

## 4. La conseguenza non ancora nominata — l'economia dei tributi è rotta

Un L2 costa 2 tributi, un L3 ne costa 3. A parità di prezzo il risultato giusto sarebbe ~50%.
Monte Carlo, 20.000 duelli per riga:

| Scontro | Prezzo | Vince il gruppo | Vince il livello alto |
|---|---|---|---|
| 2× L1 contro 1× L1 | 2 vs 1 | 88% | 12% |
| 2× L1 contro 1× L2 | pari | **19%** | 81% |
| 3× L1 contro 1× L3 | pari | **0,9%** | **99,1%** |
| 1× L2 contro 1× L3 | 2 vs 3 | 0,9% | 99,1% |
| 3× L2 contro 2× L3 | pari | 0,6% | 99,4% |

Il vantaggio numerico funziona **dentro** il livello (88%). Ma a parità di tributi spesi il livello
alto vince il 99% delle volte. **Livello 1 e Livello 2 non sono scelte di gioco: sono carburante.**

---

## 5. Effetto collaterale — al Livello 3 la Ruota non gira mai

| Livello | Matchup | Efficace | Inefficace | Neutro (Ruota spenta) |
|---|---|---|---|---|
| 1 | 1.260 | 12,3% | 12,3% | 75,4% |
| 2 | 156 | 0,6% | 0,6% | **98,7%** |
| 3 | 182 | 0,0% | 0,0% | **100,0%** |

Delle 14 Pedine di Livello 3, **10 sono Colosso e 4 sono Tessitore** — e tutti e quattro i Tessitori
hanno ruolo `bilanciato`, che per regola forza il matchup a neutro. Colosso contro Colosso è neutro
di suo. Risultato: **il diritto di ripetizione al Livello 3 non si attiva mai.**

Il Colosso è anche il difensore più duro del gioco (1 Cuore e 3 Schivate su 8 facce). Concentrando
lì il Livello 3 gli è stato dato insieme **il dado più lento e la Parata più alta**. Le due cose si
moltiplicano: è per questo che il Livello 3 è l'unico che si inchioda.

---

## 6. Curve candidate — misurate, non ipotizzate

Ogni curva è stata fatta girare contro le regole vere del motore. La domanda che le separa è una
sola: **quanto deve crescere la Parata quando sale il livello?**

| Curva | L3 Attacco | L3 Parata | L3 Vita | L3 att. | Scontro | A vuoto | Cuore | 2×L1 vs L2 | 3×L1 vs L3 |
|---|---|---|---|---|---|---|---|---|---|
| **Oggi** | 20–30 | 22–30 | 33–45 | 2 | 2 t | 57% | 66% | 25% | **1%** |
| **A** — rapporti fissi, crescita ×1,7 | 18–40 | 10–26 | 27–56 | 2 | 2 t | 45% | 55% | 34% | 8% |
| **E** — Parata ×1,2 · Vita ×1,35 | 15–30 | 4–13 | 18–33 | 2 | 1 t | 43% | 52% | **54%** | 41% |
| **F** — come E, il livello sta negli attacchi | 13–24 | 4–13 | 18–33 | **3** | 1 t | 44% | 53% | **58%** | 41% |

(Le righe "Oggi" sono ricampionate uniformemente sugli intervalli, per essere confrontabili con le
candidate. Per L1 e L2 le curve E ed F usano Att 6–13 / Par 2–9 / Vita 9–17 e Att 10–20 / Par 3–11 /
Vita 13–24.)

- **Curva A** tiene i rapporti fissi (Attacco ≈ 1,5 × Parata) e fa crescere tutto di ×1,7 a livello.
  Sistema il ritmo, **non** l'economia: l'Attacco di L1 resta troppo indietro rispetto alla Parata di L3.
- **Curva E** frena la Parata (×1,2 a livello contro ×1,5 dell'Attacco) e frena la Vita (×1,35).
  È l'unica che porta l'economia vicino al giusto. **È quella consigliata.**
- **Curva F** è la stessa idea, ma il salto di livello si sente **negli attacchi** (3 invece di 2)
  invece che nella potenza del colpo singolo. Scelta di sapore, cambia molto la sensazione al tavolo.

### Il limite onesto

**Nessuna curva arriva al 50% su "3× L1 contro 1× L3"**, e non ci arriverà mai coi soli numeri.
Il motivo è strutturale: un L3 **uccide un L1 con un colpo solo**, quindi il gruppo perde un
attaccante per turno e il vantaggio numerico evapora prima di contare. Con la curva migliore servono
**5 Pedine di Livello 1** per pareggiare un Livello 3, non 3.

Sistemarlo richiede una scelta di **regole** — il prezzo in tributi, oppure un tetto al danno in
eccesso — non un ritocco alle statistiche. È una conversazione a parte.

---

## 7. Decisioni aperte — servono dall'utente prima di toccare qualunque cosa

| # | Decisione | Opzioni | Stato |
|---|---|---|---|
| **D1** | **La Parata deve crescere col livello?** È la domanda che decide tutto il resto. | cresce ×1,2 (curva E, consigliata) · banda comune 2–14 a tutti i livelli · resta com'è | 🔴 aperta |
| **D2** | **Dove si deve *sentire* il livello?** Nella potenza del colpo (E) o nel numero di attacchi (F)? | Attacco e Vita · numero di attacchi · un misto | 🔴 aperta |
| **D3** | **`Guardiano di Marbion` ha Attacco 0** (Par 30, Vita 44, 1 attacco). Non può fare danno su nessuna faccia, nemmeno sul Cuore. | refuso da correggere · muro voluto, da annotare come caso speciale | 🟡 l'utente controlla l'Excel |
| **D4** | **Il Livello 3 resta un monopolio Colosso?** Ridistribuire 3–4 Pedine riaccenderebbe la Ruota **senza toccare una sola statistica** — la correzione più economica dell'analisi. | ridistribuire 3–4 Pedine · lasciare com'è | 🔴 aperta |
| **D5** | **I range di `rules.json`.** 20 Pedine su 63 sono fuori range (8 L3 con Vita 43–45 contro un massimo dichiarato di 40). | non è una decisione a sé: i range corretti cadono da soli una volta scelta la curva | ⏸ dopo D1–D2 |

Quando D1 e D2 sono decise, la modifica passa dalla skill **`pipeline-carte`**: si tocca l'**Excel**,
mai i `cards.json` a mano, poi si rigenera e si rilancia
`node Engine/analisi-bilanciamento/analisi_delta.mjs` per verificare che la curva sia atterrata.

---

## Riferimenti

- Strumento riproducibile: `Engine/analisi-bilanciamento/analisi_delta.mjs`
- Dati: `Mazzi/Frost Land - Primitivi del ghiaccio/cards.json`, `Mazzi/Marbion - Kepler - 452 B - Manipolatrici d'aura/cards.json`
- Motore: `App - HTML - Test/src/game/combattimento.js`, `costanti.js`, `evocazione.js`
- Range dichiarati: `Regolamento/rules.json`
- Correlato: audit dati carte V.5–V.13 in `Engine/Roadmap_Sessione_2026-08-27.md` (le "37 statistiche
  fuori range" segnalate il 29-08 sono lo stesso fenomeno visto dal lato del validatore)
