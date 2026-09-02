# ⚖️ Bilanciamento — il quadro di riferimento

> **Leggi questo file PRIMA di ragionare su statistiche, ruoli, archetipi, dadi o economia dei
> tributi.** Contiene i fatti accertati sul motore, quelli che valgono e quelli che sono stati
> invalidati, il modello proposto e le decisioni ancora aperte.
> Aggiornalo ogni volta che una misura nuova conferma o smentisce qualcosa.
>
> Documenti collegati: `Engine/Analisi_Delta_Pedine.md` (diagnosi) ·
> `Engine/Modello_Scala_Ruoli.md` (il modello) ·
> `Engine/analisi-bilanciamento/` (banco di prova + Excel delle 63 Pedine)

Ultimo aggiornamento: **2026-09-02**

---

## ⚠️ 1. STATO DI VALIDITÀ DEI NUMERI — leggi prima di citare qualunque cifra

Il 2026-09-02 è emerso un fatto sul motore che **invalida una parte delle misure fatte**.

### Il fatto

In `gameReducer.js`, funzione `fineTurno` (righe ~1147-1155), **a ogni fine turno ogni creatura di
entrambi i giocatori guarisce completamente**:

```js
campoDi(g).forEach((c) => {
  if (c.danno > 0) log(`♻ ${c.nome} recupera ${c.danno} danni`);
  c.danno = 0;
  c.attacchiUsati = 0;
  c.tmpAttacco = 0;
  c.tmpParata = 0;
  ...
});
```

Nessuna guardia, nessuna condizione. **Il danno NON si accumula fra turni.** Una Pedina va uccisa
dentro un solo turno, con i 2-3 attacchi del suo attaccante, oppure il lavoro fatto si azzera.

### Cosa cade

Tutte le misure che assumevano il logoramento fra turni:

- I **«turni per uccidere» (TTK)**: 1,89 / 1,80 / 4,00 per livello
- Le **matrici dei duelli 1 vs 1** (compreso il 78% di doppi KO fra Re Antico e Potere Divino:
  il numero del pareggio mortale regge, la durata del duello no)
- Le simulazioni dell'**economia dei tributi** (0,9% per 3×L1 contro 1×L3)
- La verifica del **cancello G2** (ritmo uniforme) e la «scala dei ruoli» in turni

### Cosa resta valido

Tutto ciò che si misura **per singolo tiro** o **sulla struttura dei dati**, indipendente dall'accumulo:

| Fatto | Valore | Perché regge |
|---|---|---|
| Nessun Attacco di L1/L2 supera nessuna Parata di L3 | **0 casi su 686** | è un confronto fra numeri stampati |
| Colpi che fanno zero danni | 51% / 42% / **71%** | probabilità per tiro |
| Quota di danno dal Cuore | 60% / 59% / **74%** | probabilità per tiro |
| Dispersione del budget per ruolo | 21% / 11% / **5%** | struttura dei dati |
| Budget non uguali fra ruoli (L1) | aggressore **15,3** contro tank **8,8** | struttura dei dati |
| Margine di penetrazione | +2 / +0 / **−4** | confronto fra numeri stampati |
| Il dado sta sul ruolo sbagliato a L3 | 3 aggressori su 3 hanno il dado Colosso | struttura dei dati |
| Matchup neutri (Ruota spenta) | 75% / 99% / **100%** | struttura dei dati |
| Pareggio mortale | scatta a Attacco uguale | è istantaneo, non dipende dai turni |
| Valore marginale delle statistiche | Parata 0,08-0,33 · Vita 0,17-0,27 | misurato per tiro |

### E la diagnosi peggiora

Con la guarigione a fine turno, **al Livello 3 non servono 4 turni: non ci si riesce quasi mai.**
Se devi uccidere dentro un turno solo e il 71% dei tuoi colpi fa zero, quello che accumuli evapora.
L'osservazione originale dell'autore — *«mi servirebbero venti turni per tirarlo giù»* — era ancora
più vera di come l'avevo modellata.

### Da fare

Correggere `duello()` in `Engine/analisi-bilanciamento/motore_bilanciamento.mjs` perché azzeri
`hp` al valore pieno a fine di ogni turno, e **rifare tutte le misure marcate «cade» qui sopra**.
Finché non è fatto, quei numeri vanno citati come *da riverificare*.

---

## 2. Come funziona davvero il combattimento (fatti accertati sul motore)

### Le statistiche di una Pedina
`Attacco` · `Parata` · `Vita` · `attacchi` (attacchi per turno) · `Archetipo` · `Ruolo` · `Livello`

### La risoluzione di un attacco — `src/game/combattimento.js`
Il **difensore** tira il **proprio** dado da 8 facce, determinato dal suo Archetipo. Con A = Attacco
dell'attaccante:

| Faccia | Esito |
|---|---|
| **C** Cuore | danno = A alla Vita. Sempre. |
| **D** Schivata | 0 |
| **S** Spada | confronto A contro l'**Attacco** del difensore |
| **U** Scudo | confronto A contro la **Parata** del difensore |

Su S e U vale `danneggiaSimmetrico`:
- A > valore → danno = `max(A − valore, ⌈A/2⌉)` — il **pavimento**
- A < valore → **0 danni** al difensore e **contraccolpo** di `(valore − A)` sull'**attaccante**
- A == valore su Spada → **pareggio mortale**: muoiono entrambi

### I dadi per archetipo — `src/game/costanti.js`

| Archetipo | Spada | Scudo | Cuore | Schivata | Carattere |
|---|---|---|---|---|---|
| Viandante | 2 | 2 | 2 | 2 | equilibrato |
| Assalitore | **4** | 1 | 2 | 1 | offensivo |
| Effimeri | 2 | 1 | 2 | **3** | elusivo |
| **Colosso** | 1 | **3** | 1 | **3** | il più difensivo del gioco |
| Tessitore | **3** | 1 | 2 | 2 | offensivo |

**Il dado del difensore vale da solo 18 punti percentuali di sopravvivenza**: contro un difensore
Colosso una sonda vince il 50,9%, contro tutti gli altri archetipi il 68-71%.

### La Ruota degli Archetipi
Viandante → Assalitore → Effimeri → Colosso → Tessitore → Viandante.
Chi è «efficace» ottiene il **diritto di ripetizione** del dado.
⚠️ **Se uno dei due ha ruolo `bilanciato`, il matchup è forzato a neutro.**

### L'economia — `src/game/evocazione.js`
Livello 1 = gratis (una evocazione per turno). Livello 2 = tributi per valore 2. Livello 3 = valore 3.
`valoreTributi` somma i **livelli** delle Pedine sacrificate. Quindi **3 Pedine di Livello 1 costano
quanto 1 Pedina di Livello 3**.

### Altri fatti
- `PV_INIZIALI = 200` (Stratega) · `ATTACCHI_PRIMA_LINEA = 3` · `SLOT_RETROVIA = 2`
- **Il danno guarisce a fine di ogni turno** (vedi §1)
- Anche `tmpAttacco`, `tmpParata` e `attacchiUsati` si azzerano a fine turno

---

## 3. I quattro guasti strutturali (accertati, indipendenti dalla correzione)

### ① I ruoli collassano al salire del livello

Quota di budget spesa in ciascuna statistica, dalle carte vere:

| Ruolo | L1: Att / Par / Vita | L3: Att / Par / Vita |
|---|---|---|
| aggressore | **79%** / 3% / 18% | 58% / 16% / 26% |
| evasivo | 77% / 4% / 19% | *non esiste* |
| bilanciato | 65% / 11% / 24% | 65% / 14% / 22% |
| supporto | 53% / 18% / 29% | *non esiste* |
| difensore | 40% / 30% / 30% | 56% / 19% / 25% |
| tank | 23% / 26% / **51%** | 56% / 18% / 26% |

Al Livello 1 i ruoli sono nettamente separati. **Al Livello 3 ogni ruolo spende fra il 56% e il 65%
in Attacco: tank e aggressore sono la stessa carta con due nomi.** Due ruoli su sei non esistono.

Tre misure indipendenti confermano lo stesso collasso:
dispersione del budget **21% → 11% → 5%** · dispersione della forza vera **44% → 38% → 21%** ·
divario fra ruolo più forte e più debole **75 → 34 → 27** punti percentuali.

### ② I budget non sono uguali fra ruoli

Al Livello 1 l'aggressore ha **15,3** punti di budget e il tank **8,8**: il **74% in più**.
Non è solo *come* spendono, è *quanto* hanno da spendere. È la ragione per cui l'aggressore vince
il 94% dei duelli e il tank il 19%.

### ③ Il margine di penetrazione va sotto zero

`Attacco del miglior aggressore − Parata del miglior muro`, stesso livello:

| Livello | Att. aggressore | Par. muro | Margine |
|---|---|---|---|
| 2 | 19 | 17 | **+2** |
| 1 | 12 | 12 | **+0** |
| 3 | 26 | 30 | **−4** |

Attacco massimo L1 = 12 · Attacco massimo L2 = 19 · Parata minima L3 = 22 →
**nessuna delle 49 Pedine di L1 e L2 può superare la Parata di nessuna delle 14 Pedine di L3.
0 casi su 686.** Contro un L3, per loro, resta una sola faccia utile su otto: il Cuore.

E l'Attacco sta sulle carte sbagliate: al Livello 3 l'Attacco più alto (30 e 28) è sui `bilanciati`,
l'unico ruolo che per regola forza il matchup a neutro.

### ④ Il dado sta sul ruolo sbagliato

Al Livello 3 **tutti e tre gli aggressori hanno il dado Colosso** (1 Spada, 3 Scudi, 3 Schivate),
il più difensivo del gioco, mentre i bilanciati hanno il Tessitore, il più offensivo.
Al Livello 1 l'accoppiamento è invece corretto (aggressore→Assalitore, evasivo→Effimeri, tank→Colosso).

Le combinazioni ruolo×archetipo usate crollano: **40% a L1 → 30% a L2 → 20% a L3.**
Al Livello 3 ci sono solo 2 archetipi su 5 (10 Colosso, 4 Tessitore) e la Ruota è **neutra al 100%**.

---

## 4. Il modello proposto — «Scala dei Ruoli»

Dettaglio completo in `Engine/Modello_Scala_Ruoli.md` e nell'Excel
`Engine/analisi-bilanciamento/Worldloom_Bilanciamento_Pedine.xlsx` (63 Pedine ri-statate).

### I sei criteri

1. **Budget uguale e proporzionale al prezzo** — `Punti = Attacco + Parata/4 + Vita/4 + 3×(attacchi−2)`, con 12 / 24 / 36 (×1, ×2, ×3 come i tributi)
2. **Margine di penetrazione ≥ +4** — tetti di Parata 8 / 20 / 26
3. **Gli attacchi definiscono il ruolo** — 1 = muro · 2 = standard · 3 = evasivo
4. **Il dado segue il ruolo** — Colosso ai difensivi, Assalitore agli aggressori, Effimeri agli evasivi
5. **Attacchi distanziati** — nessun valore ripetuto più di 2 volte per livello
6. **Tutti e 5 gli archetipi a ogni livello**, nessuno oltre il 45%

### La scoperta più utile

**È il numero di attacchi a separare un muro da un boss.** A parità di budget, lo stesso profilo
difensivo con **1 attacco** vince il 15-46% dei duelli, con **2 attacchi** il 59-82%. Sempre, in
ogni variante provata. Non è la Parata a fare il muro, né la Vita.
*(Questo numero viene dai duelli, quindi è fra quelli da riverificare — ma la direzione è netta.)*

### Le tre leve

| Leva | Tocca | Effetto |
|---|---|---|
| Riallocare il budget per ruolo | **solo Excel** | margine −4 → +4 |
| **Colpo di striscio** `⌈A/4⌉` + niente contraccolpo | `danneggiaSimmetrico` | colpi a vuoto 71% → 29% |
| Budget = prezzo (12/24/36) | **solo Excel** | economia dei tributi |

---

## 5. Cosa insegnano gli altri giochi

### Doomtrooper (Mutant Chronicles CCG, 1995)
Statistiche: **Fight** (mischia) · **Shot** (distanza) · **Armour** (difesa) · **Value** (punti che
fai TU uccidendo questa carta). **Nessun punto ferita.** Attacco contro Armour: superi → il difensore
muore; pari o sotto → non succede nulla. Niente dadi. Tre azioni per turno, e puoi **spendere
un'azione in più su un attacco per avere +3**. Si vince accumulando i punti delle uccisioni.

**Le tre lezioni per Worldloom:**
1. **Il pareggio deve essere innocuo.** Da loro pari = niente. Da noi pari su Spada = muoiono
   entrambi, e scatta in ogni specchio.
2. **Il Value trasforma la difesa da lucchetto in scommessa.** Da noi un muro che nessuno uccide
   sta lì e basta: nessun rischio per chi lo gioca. Se ogni Pedina valesse punti da morta, il muro
   diventerebbe il bottino più grosso sul tavolo.
3. **Una risorsa per spingere l'attacco.** Oggi se il tuo Attacco è sotto la Parata nemica non
   puoi farci nulla: nessuna decisione, solo zero. Loro ti lasciano pagare per passare.

### Magic
**Forza / Costituzione**, dove la Costituzione è insieme soglia e riserva — **ma il danno si azzera
a fine turno**. Nessun logoramento. Worldloom fa già lo stesso (§1) pur avendo *anche* una soglia
separata (la Parata): è quella doppia stratificazione la cosa insolita.

---

## 6. Proposta aperta — il modello a confronto puro (senza Vita)

Proposta dell'autore, 2026-09-02. **Non è una modifica decisa: è una strada misurata e da valutare.**

### La regola proposta

Si **toglie la Vita** dalle Pedine. Ogni faccia del dado confronta la **stessa statistica** fra le due:

| Faccia | Confronto | Esito |
|---|---|---|
| **Spada** | Attacco vs Attacco | più alto → l'altro muore · più basso → **muoio io** · pari → **muoiono entrambi** |
| **Scudo** | Difesa vs Difesa | attaccante più alto → il difensore muore · altrimenti **niente** |
| **Schivata** | — | niente |
| **Cuore** | **da decidere** | vedi le domande aperte |

È il modello di **Doomtrooper** (nessun punto ferita, confronto secco) con una torsione: lì si
confronta l'attacco contro l'armatura, qui ogni faccia confronta la statistica omonima.

### Misurato sulle carte vere — esito di un singolo attacco

Con la lettura *«Cuore = il difensore muore»*:

| | niente | muore il difensore | muore l'attaccante | entrambi |
|---|---|---|---|---|
| Livello 1 | 41% | 41% | 15% | 3% |
| Livello 2 | **26%** | 48% | 21% | 5% |
| Livello 3 | **57%** | 30% | 12% | 2% |

Con la lettura *«Cuore = danno allo Stratega»*: a L3 diventa 57% niente · 14% muore il difensore ·
12% muore l'attaccante · 2% entrambi · **16% di colpi allo Stratega**.

**Verdetto: funziona meglio del sistema attuale.** Oggi a L3 il 71% dei colpi fa zero; qui il 57%,
e soprattutto **il 44% degli attacchi produce una morte** invece di limare. La partita si sblocca.

**MA non basta a sistemare il Livello 3.** Resta al 57% di niente contro il 26% del Livello 2. La
causa è sempre la stessa e non dipende dal sistema di danno: il **monopolio Colosso** (3 Schivate su
8 facce) più la **Difesa 30 che nessuno supera**. Il lavoro su ruoli e archetipi (§3, §4) serve
comunque.

### ⚠️ Il tranello: comprimere i numeri moltiplica i doppi KO

In un sistema di confronto **conta solo l'ordine, non la grandezza**: Attacco 24 contro 26 dà lo
stesso esito di 2 contro 3. Verrebbe quindi voglia di comprimere i numeri come Magic. Misurato:

| Scala | valori distinti (L3) | coppie in pareggio (L3) | doppi KO per attacco |
|---|---|---|---|
| 1–30 (oggi) | 7 | 11% | 2% |
| 1–12 | 6 | 13% | 2% |
| 1–10 | 5 | **22%** | 4% |
| 1–6 (Magic puro) | 4 | **31%** | 5% |

A scala 1–6 **un terzo degli scontri di Livello 3 finisce con la morte di entrambe**, perché ci sono
14 carte e solo 4 valori disponibili. E lo **specchio pareggia sempre**.

> **La regola che ne esce: o numeri larghi col pareggio mortale, o numeri stretti col pareggio
> innocuo. Non i due insieme.** Raccomandazione: numeri stretti (1–10) e pareggio innocuo, come
> Doomtrooper. Si guadagna la leggibilità di Magic e si toglie l'ultima fonte di doppi KO.

### Una conseguenza forte, da mettere a fuoco

Con *«Attacco più basso → muoio io»*, una Pedina con Attacco basso che attacca **muore ogni volta che
esce Spada**. Il muro (Attacco 3-4) diventa **puramente difensivo: non potrà mai attaccare in tutta
la partita**. È coerente col mestiere, ma è una scelta di design pesante.

### I riferimenti numerici di Magic

Le creature stanno quasi tutte fra **1/1 e 5/5**; una creatura «grossa» è 6/6; sopra il 10 è
eccezionale. **Numeri a una cifra sola.** E i punti vita del giocatore sono **20**, non 200 —
proprio perché i danni sono a una cifra. Worldloom oggi è a 2–30 di Attacco, 5–45 di Vita,
200 PV di Stratega: una scala dieci volte più larga con molto meno significato per punto.

### Tre buchi da riempire prima di poter simulare il pacchetto

1. **Cosa fa il Cuore?** Senza Vita sulle Pedine diventa probabilmente l'unica strada per vincere.
   La lettura «danno allo Stratega» sembra la più sensata, ma è da decidere.
2. **Sullo Scudo può morire anche l'attaccante?** La misura qui sopra assume di no (solo il difensore
   muore, altrimenti niente). Se fosse simmetrico come la Spada, gli esiti cambierebbero molto.
3. **Lo Stratega tiene i 200 PV?** Se l'Attacco scende a 1–10 servirebbero da 20 a 200 colpi.
   Vanno compressi anche quelli: indicativamente **20–25 PV**.

### Il pacchetto coerente, se si va in questa direzione

- Pedine: **Attacco 1–10 · Difesa 1–10 · niente Vita**
- Stratega: **~20 PV** invece di 200
- **Pareggio = non succede niente**, né su Spada né su Scudo
- **Cuore = danno allo Stratega** pari all'Attacco
- **Il lavoro su ruoli e archetipi (§3, §4) resta necessario**: il 57% di «niente» al Livello 3 non
  lo risolve il sistema di danno

**Impatto sul motore:** è una riscrittura di `risolviSimbolo` e `danneggiaSimmetrico` in
`combattimento.js`, più la rimozione di `vitaMax`/`danno` dalle creature e di `vitaAttuale` in
`mazzo.js`. Tocca anche l'interfaccia (la Vita è stampata in carta e mostrata in campo) e tutti gli
effetti che parlano di Vita. **È il cambiamento più invasivo fra quelli sul tavolo** — molto più del
colpo di striscio, che è una funzione sola.

---

## 7. Decisioni aperte

| # | Decisione | Stato |
|---|---|---|
| **D1** | Il **pareggio mortale** va tolto o ammorbidito («entrambi subiscono metà danno»)? Scatta in ogni specchio. | 🔴 aperta |
| **D2** | Introdurre un **valore-punti per Pedina** (il Value di Doomtrooper) per dare un motivo ad attaccare i muri? | 🔴 aperta |
| **D3** | `Guardiano di Marbion` ha **Attacco 0** — refuso o muro voluto? L'Excel propone 19. | 🟡 l'autore controlla l'Excel |
| **D4** | Applicare le tre leve del modello? Le prime due sono solo Excel. | 🔴 aperta |
| **D5** | Al Livello 3 **manca il ruolo evasivo**: nessuna carta esistente ha un effetto compatibile. Va creata. | 🔴 aperta |
| **D6** | **La Ruota non è mai stata modellata** nelle simulazioni. È l'unica leva che può trasformare l'ordine di dominanza fra i ruoli in vera morra cinese. | 🔴 aperta |
| **D7** | **Si toglie la Vita** e si passa al confronto puro (§6)? È il cambiamento più invasivo sul tavolo: tocca motore, interfaccia, carte stampate e tutti gli effetti che parlano di Vita. | 🔴 aperta · l'autore sta ragionando |
| **D8** | Se sì a D7: **cosa fa il Cuore**, **sullo Scudo può morire l'attaccante**, e **quanti PV ha lo Stratega**? Senza queste tre risposte il pacchetto non è simulabile. | 🔴 aperta |
| **D9** | **Si comprimono i numeri a 1–10** come Magic? Solo insieme al pareggio innocuo: altrimenti a L3 un terzo degli scontri diventa un doppio KO. | 🔴 aperta |

---

## 8. Come rifare le misure

```bash
node Engine/analisi-bilanciamento/motore_bilanciamento.mjs   # i 5 cancelli sul roster reale
node Engine/analisi-bilanciamento/analisi_delta.mjs          # la diagnosi completa
node Engine/analisi-bilanciamento/duelli_1v1.mjs 3           # matrice 1v1, Livello 3 di oggi
node Engine/analisi-bilanciamento/duelli_1v1.mjs modello     # matrice 1v1 del modello
```

Il banco di prova (`motore_bilanciamento.mjs`) è parametrico: si sostituisce la funzione di danno o
il roster e misura gli stessi indicatori, così due modelli si confrontano sugli stessi numeri.
**Prima di fidarsi dei numeri di durata, va applicata la correzione della guarigione a fine turno (§1).**

### Regole di metodo

- Le simulazioni sono **senza effetti carta, Magie, Trappole e senza il diritto di ripetizione**.
  Sono la base su cui poggiano gli effetti, non la partita completa.
- I dati veri stanno in `Mazzi/*/cards.json`. **`cards.json` non si modifica mai a mano**: si passa
  dagli Excel e da `genera_cards_json.py` (skill `pipeline-carte`).
- Quando una misura cambia, **aggiorna questo file** — soprattutto la §1.
