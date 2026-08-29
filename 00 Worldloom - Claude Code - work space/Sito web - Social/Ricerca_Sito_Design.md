# Sito worldloomtcg.com — Ricerca e direzione di design

> Dossier di ricerca preliminare. Nessuna riga di codice del sito è ancora stata scritta.
> Data: 2026-08-29 · Fonti: siti competitor analizzati dal vivo + stampa di settore.

---

## 1. Metodo

Non ho letto classifiche: ho aperto i siti dei competitor e ne ho **estratto direttamente
palette, tipografia e struttura di navigazione** dal CSS calcolato in pagina. Più due filoni di
ricerca di settore: le policy IA delle piattaforme di crowdfunding e i casi reali di reazione
della community all'IA nei giochi da tavolo.

---

## 2. Cosa fanno i competitor

| Gioco | Sfondo / base | Accento | Tipografia | Registro |
|---|---|---|---|---|
| **Sorcery: Contested Realm** | nero puro, testo `#E1E1E1` | rosso `#FC293D`, arancio `#FF7B00` | **Cinzel** (display) + Enriqueta (slab, lettura) | Premium, artigianale, arte al centro |
| **Riftbound** (League of Legends) | teal profondo `#013951` | arancio `#EF7D00` | TT Norms Pro **Compact**, maiuscoletto spaziato (letter-spacing 1.0–1.3px) | Esports, energico, "gaming UI" |
| **Disney Lorcana** | chiaro/pergamena, testo bruno `#43280B` | oro `#AE904C`, blu `#163D6F` | Barlow Condensed | Family-friendly, prodotto, vetrina |
| **Altered** (ora *Archive*) | pergamena `#F5F5F1`, testo `#534B40` | oro `#AA8C2C` / `#D4AF37` | Tiller (serif) | Editoriale, caldo, illustrativo |

### Il dato che conta di più

**Sorcery usa Cinzel come font display.** È esattamente il font che hai già scelto per il brand
Worldloom (`src/index.css`, scelta esplicita del 2026-08-28). Non è un problema di copia: è la
conferma che la tua intuizione tipografica ti colloca già nella fascia *premium / artigianale /
arte-al-centro*, che è la fascia giusta per un progetto d'autore — non in quella
corporate-vetrina di Lorcana.

### Costanti che si ripetono su tutti e quattro

1. **"Card Gallery" / "Cards" è una voce di menu di primo livello. Su tutti.** La galleria carte
   consultabile non è un extra: è una delle due o tre ragioni per cui la gente torna sul sito.
   La tua richiesta è centrata.
2. **Nav corta, 5–6 voci.** Riftbound: `START HERE / HOW TO PLAY / CARD GALLERY / NEWS / FIND A
   STORE / EVENTS`. Altered: `Home / News / Cards / Lore / Resources`. Nessuno mette dieci voci.
3. **"How to play" è sempre in alto**, spesso come primissima voce ("Start here"). Il TCG ha una
   barriera d'ingresso e i siti che funzionano la aggrediscono subito.
4. **Un solo accento caldo su base fredda o neutra.** Nessuno usa cinque colori. Il colore lo
   portano le illustrazioni delle carte.
5. **Maiuscoletto spaziato per etichette e bottoni.** Dettaglio piccolo, effetto grosso: è quello
   che fa sembrare "prodotto vero" invece che "template".

---

## 3. La pagina sull'IA — qui c'è il vero rischio e la vera opportunità

Questa è la parte su cui ho scavato di più, perché è quella dove puoi guadagnare o perdere molto.

### Il contesto reale (non ipotesi)

- **Kickstarter obbliga alla disclosure dal 2023.** In fase di invio del progetto ti chiedono se
  usi IA generativa, per cosa, e **se hai il consenso dei titolari delle opere usate per produrre
  gli output**. Sulla pagina compare una sezione "Use of AI". Non dichiarare = sospensione del
  progetto; dichiarare il falso = ban permanente. Richiedono inoltre di dimostrare **apporto
  creativo umano significativo**: "solo IA" non è accettabile.
- **La community dei giochi da tavolo ha già fatto vittime.** Awaken Realms ha dovuto rimuovere
  arte IA dall'edizione deluxe di *Puerto Rico* dopo le proteste. Wise Wizard Games (*Star
  Realms*) è finita sotto accusa per *Draconis 8*. C'è stato un caso di editore minacciato di
  boicottaggio solo per aver *ipotizzato* l'uso di IA.
- **Ma il pattern osservato è preciso:** ciò che la community punisce **non è l'uso degli
  strumenti, è la disonestà**. I giocatori oggi riconoscono gli asset IA in poche ore, e sono
  molto più indulgenti con chi comunica in modo trasparente.

### Cosa significa per te

La tua idea — "non lo nascondo, lo rendo un punto di forza" — **è la strategia corretta**, ed è
anche già obbligatoria su Kickstarter. Ma funziona solo a una condizione, e questa è la mia
raccomandazione più importante di tutto il dossier:

> **La pagina deve essere specifica, non filosofica.**

Le pagine "abbracciamo l'innovazione IA" generiche vengono punite. Quelle che reggono dicono
esattamente: *quale strumento, per quale pezzo, cosa ho fatto io a mano, cosa NON è IA*. La
difesa di Wise Wizard è stata letteralmente "abbiamo elencato gli strumenti usati" — l'elenco è
la sostanza.

**Struttura consigliata per la pagina:**

1. **Dichiarazione in una riga, sopra tutto.** Cosa è fatto con IA, cosa no. Senza giri.
2. **Tabella "chi ha fatto cosa"** — riga per riga: illustrazioni, regolamento, motore di gioco,
   bilanciamento, testi delle carte, codice dell'app. Per ognuna: *umano / IA assistita / IA
   generata*. Questa tabella è la pagina. Il resto è contorno.
3. **Il perché, corto e onesto.** Un autore singolo, un gioco che con la pipeline classica non
   sarebbe mai esistito. Non serve difendersi: serve raccontare.
4. **Cosa resta irriducibilmente tuo.** Il design del gioco, le regole, il bilanciamento, le
   ~61 carte, il motore. È questo il lavoro, e va detto perché è il tuo vero argomento.
5. **La posizione sugli artisti.** Qui devi decidere tu una linea e scriverla (vedi domande in
   fondo). È la domanda che ti faranno per prima.

Vantaggio competitivo concreto: gli altri questa pagina la scrivono **dopo** essere stati
scoperti, in difesa. Tu la pubblichi **prima**, in attacco. È una differenza che si vede.

---

## 4. Crowdfunding — la lezione più importante è appena successa

Mentre analizzavo i siti ho trovato che **`altered.gg` oggi non è più il sito del gioco: è un
"Altered Archive"**, con in home "End of the Altered adventure — A chapter closes".

Altered era **il più grande crowdfunding TCG di sempre**: oltre **7 milioni di dollari** su
Kickstarter nel 2024. È morto nel marzo 2026. Motivo: la campagna per l'espansione *Roots of
Corruption* ha raccolto ~420k€ (su un obiettivo dichiarato di 50k€, quindi un "successo"
formale), più 680k€ di preordini negozi = 1,1M€ — ma all'editore ne servivano **2 milioni per
garantire il futuro del gioco**. "The numbers simply aren't there". A questo si è aggiunto lo
storefront digitale arrivato con forte ritardo e un mercato TCG saturo.

### Cosa devo dirti chiaramente

Il modello "TCG come ecosistema che vive di espansioni continue" ha appena ucciso chi aveva
7 milioni in cassa. Costruire la pagina crowdfunding promettendo *"il prossimo grande TCG, set
dopo set"* significa promettere la cosa che è appena fallita, con una frazione delle risorse.

**Impostazione che consiglio invece:**

- Vendere un **oggetto finito e completo**: una scatola che si può consegnare e che è già un
  gioco intero. Non un abbonamento a un futuro.
- Usare l'**app gratuita come imbuto**: "provalo adesso nel browser, gratis, poi sostieni la
  versione fisica". È un vantaggio enorme che quasi nessun progetto in campagna ha — tu il gioco
  ce l'hai già giocabile. Va messo al centro, non in fondo.
- **Obiettivo onesto e piccolo**, con i costi spiegati. La ricerca sulle campagne 2026 dice che
  ciò che finanzia è la **community costruita prima**, non la pagina in sé (il caso citato: un
  gioco finanziato in due minuti perché l'autore aveva coinvolto i fan in ogni passo).
- Quindi: prima della campagna, il sito deve fare **una cosa sola** — raccogliere persone
  interessate. Non "dona ora": *"entra nella lista, ti avviso quando parte"*.
- **Tendenza materiali 2026:** i backer comprano "oggetti d'arte" — carte con texture, finiture
  speciali. La tua colonna Excel `Varianti Illustrazione` (Normale/Foil) e la ricetta foil già
  confermata sono esattamente merce da campagna. Il foil sul sito **è** un argomento di vendita.

---

## 5. Direzione di design proposta per Worldloom

Registro: **notturno, sobrio, artigianale.** Vicino a Sorcery, lontano da Lorcana. Il sito è una
teca: fondo scuro e silenzioso, le carte sono l'unica cosa che brilla.

### Palette (derivata dall'app, non inventata)

| Token | Valore | Uso |
|---|---|---|
| `--notte` | `#0B0F1A` | fondo base — **già il `body` dell'app** |
| `--notte-2` | `#121826` | superfici, schede |
| `--nebbia` | `#1C2436` | bordi, separatori |
| `--ghiaccio` | `#E8ECF5` | testo principale — **già l'app** |
| `--ghiaccio-tenue` | `#A6B0C4` | testo secondario |
| `--oro` | `#D8B14A` | **unico** accento: bottoni, filetti, numeri |
| Arcobaleno foil | gradiente della demo | **riservato al solo effetto foil** |

Regola: il rainbow non si usa mai come decorazione. Se compare ovunque smette di significare
"carta speciale". Compare solo quando una carta gira.

Accenti di sezione derivati dal contenuto vero: **Frost Land** = azzurro ghiaccio, **Kepler-452B**
= viola aura. Usati solo nella galleria, come codice colore dei due mazzi.

### Tipografia — quella che hai già

- **Cinzel** per titoli, bottoni, etichette. Maiuscoletto con `letter-spacing` ~0.08em sulle
  etichette piccole (il trucco di Riftbound).
- **Cormorant Garamond** per il testo di lettura, corpo generoso (19–21px): è un font da editoria,
  regge paragrafi lunghi — utile proprio nella pagina IA, che è testuale.

### Interazione — il cuore, ed è già in casa

La galleria carte usa **la ricetta foil che hai già approvato** (`foil-demo.html`): tilt 3D su
`perspective`, gradiente arcobaleno in `mix-blend-mode: color-dodge` a opacità 0.5, riflesso
radiale in `soft-light` a 0.4, più l'animazione `bascula` (1.7s) che mostra il foil da sola,
senza mouse — indispensabile su mobile e per chi arriva la prima volta.

Sul sito aggiungo solo: **il tilt segue il mouse** (sui competitor non lo fa quasi nessuno bene),
e **click = la carta gira** e mostra il retro / il dettaglio con statistiche ed effetto presi da
`cards.json`.

### Materiali già disponibili — niente da produrre da zero

- **99 immagini carta** pronte in JPEG (50 Frost Land + 49 Kepler-452B, cartelle *Complete cards
  compressed*).
- **`cards.json`** per entrambi i mazzi: nome, tipo, archetipo, livello, ruolo, vita, attacco,
  parata, testo dell'effetto. Tutto ciò che serve a filtri, schede e ricerca — a costo zero.
- **Regolamento** già scritto in due versioni (completa e giocatori).
- **Il gioco giocabile** (`GIOCA.html`).

---

## 6. Struttura del sito proposta (5 voci, come i competitor)

| Pagina | Scopo | Contenuto |
|---|---|---|
| **Home** | capire in 5 secondi cos'è e provarlo | Hero con carta foil animata, una frase, due bottoni: *Gioca ora* / *Sostieni*. Tre pilastri. |
| **Il gioco** | abbattere la barriera d'ingresso | Come si gioca in 4 passi, il campo di battaglia, link al regolamento |
| **Carte** | la teca — la pagina che fa tornare | Galleria filtrabile (mazzo, tipo, ruolo), click → giro + foil + scheda |
| **IA allo scoperto** | la posizione, in attacco | Dichiarazione + tabella "chi ha fatto cosa" + il perché |
| **Sostieni** | costruire la lista prima della campagna | Cosa sarà la scatola, a che punto è, iscrizione alla lista |

---

## 7. Impostazione tecnica proposta

- **Sito statico**: HTML + CSS + JS puro, nessun framework, nessuna build. Motivo: sono 5 pagine
  di contenuto, React qui non aggiunge nulla e complica la pubblicazione. L'app di gioco resta
  un progetto separato (React/Vite) e il sito ci si collega.
- **Cartella**: `Sito web - Social/worldloomtcg/` (oggi vuota).
- **Non visibile**, come chiedi: si sviluppa e si guarda in locale. Alla pubblicazione,
  `robots.txt` con `Disallow: /` + meta `noindex` finché non decidi tu.
- **Carte**: `cards.json` e le immagini compresse copiate in `assets/` da uno script di sync, sul
  modello di quello che già esiste per l'app. Mai a mano.

---

## 8. Decisioni prese (2026-08-29)

1. **Lingua:** solo italiano per ora. L'inglese si valuta quando la campagna si avvicina.
2. **Il gioco giocabile:** **non** collegato in nessun modo. Sul sito c'è solo un riquadro di
   anteprima; cliccandolo compare "Ci stiamo lavorando". Nessun link a `GIOCA.html`.
3. **Lista d'attesa:** finta, solo grafica. Il modulo dichiara esplicitamente all'utente che non
   sta raccogliendo niente. Da collegare a un servizio vero prima di pubblicare.
4. **Linea sull'IA** (parole dell'autore, tradotte in pagina):
   - l'IA è uno **strumento**; sembra facile, ma ottenere **coerenza visiva** e la giusta palette
     su un mazzo intero non lo è;
   - **su ogni carta comparirà il nome dell'autore e il modello IA usato** — è questo il "nuovo
     concetto" da promuovere: il credito al posto della scusa;
   - il lavoro è costato **anni**, non cinque minuti;
   - l'IA è **un compagno di lavoro**, come le iterazioni di editing di qualsiasi software;
   - **non è un male né una rinuncia alla creatività**.
   - *Non deciso, quindi non scritto in pagina:* se ci saranno illustratori umani per la versione
     fisica. Va deciso prima della campagna, perché è la prima domanda che farà la community.

---

## 9. Cosa è stato costruito

Cartella `Sito web - Social/worldloomtcg/` — sito statico, 5 pagine, nessun framework.

| File | Contenuto |
|---|---|
| `index.html` | Home: hero con carta foil, tre pilastri, riquadro app, richiamo alla pagina IA |
| `il-gioco.html` | Le cinque fasi del turno, le due linee, i quattro simboli del dado, le catene |
| `carte.html` | Galleria: 83 carte, filtri mazzo/tipo, ricerca, click → scheda con statistiche |
| `ia.html` | Dichiarazione + tabella "chi ha fatto cosa" + il punto + l'impegno sul credito |
| `sostieni.html` | Scatola finita (non abbonamento), pietre miliari, modulo lista (finto) |
| `assets/css/sito.css` | Sistema di design completo |
| `assets/js/sito.js` | Menu, comparsa allo scroll, foil col tilt che segue il mouse |
| `assets/js/carte.js` | Galleria, filtri, scheda carta |
| `sync-carte.mjs` | Rigenera dati e immagini dagli Excel/cards.json — **mai a mano** |
| `robots.txt` | `Disallow: /` — più `noindex` su tutte e 5 le pagine |

**Contenuti presi dalle fonti vere, non inventati:** le cinque fasi e i quattro simboli dal
`Regolamento_v2.1.html`; le 83 carte con statistiche ed effetti dai `cards.json`; il nome file
delle immagini con la stessa regola di `componi_carte.py` (`nome_file_output`, riga 288).

**Verificato dal vivo** su server locale: 83 carte renderizzate, nessuna immagine rotta, font
Cinzel caricato, filtri/ricerca/scheda/Esc funzionanti, nessun errore in console, nessuno scroll
orizzontale, menu e galleria a due colonne su mobile (375px).

---

## 10. Secondo giro — revisione dell'autore (2026-08-29)

**Foil.** Il problema segnalato: se brillano tutte le carte, il foil non significa più niente.
Risolto legandolo al dato vero: il sito legge la colonna **`Finitura`** degli Excel, dove ogni
carta ha una riga per stampa (Normale, e dove previsto Rainbow, su righe adiacenti). Solo le
stampe Rainbow ricevono l'arcobaleno e il contrassegno; le Normali hanno un riflesso sobrio.
Aggiunto il filtro Finitura in galleria.

> ⚠️ **Le 12 righe Rainbow presenti oggi (8 Frost + 4 Kepler) sono tutte carte la cui Complete
> Card non è ancora stata composta.** Quindi in galleria compaiono 0 foil. Non è un difetto del
> sito: è lo stato dei dati. Appena una carta illustrata avrà una riga Rainbow, comparirà da sola.
> Sul sito il foil resta visibile dove è onesto: la carta della vetrina in home e il confronto
> Normale/Rainbow, dichiarato come esempio della finitura.

**Marchio.** Il pittogramma dell'app è un **nodo intrecciato dentro un anello arcobaleno**: è
letteralmente l'intreccio di mondi, e giustifica il foil come elemento di marca. Ora è il logo
del sito (con `logo-testo.png`), la favicon, e il motivo del fregio di separazione fra sezioni.

**Claim.** Uniti i due concetti come chiesto: *"Mondi che si intrecciano, una carta alla volta"*,
più una sezione "Il telaio dei mondi" che spiega il nome (ogni mazzo è un mondo; *loom* = telaio).

**Pagina IA.** Riga "Testi delle carte" portata a **Umano** (sono dell'autore; l'IA ha solo
aiutato a riformulare). Riga "Motore di gioco e app" **resta "IA assistita"** su indicazione
dell'autore: è la riga che rende credibili tutte le altre.

**Nuove pagine.** `manga.html` (progetto manga/anime, con il legame "un capitolo = una bustina")
e `chi-siamo.html` (con i contatti). Navigazione riportata a 5 voci — Il gioco · Carte · Manga ·
IA allo scoperto · Sostieni — con Chi siamo e contatti nel piede.

**Contatti.** `info@worldloomtcg.com`, nel piede di ogni pagina e nella pagina Chi siamo.

**Design.** Aggiunti i dettagli lavorati richiesti: filetto con rombo sotto i titoli, fregio col
pittogramma fra le sezioni, angoli a cornice sui riquadri, pittogramma che ruota al passaggio sul
logo. Palette blu/oro confermata.

**Pipeline.** `sync-carte.mjs` (Node) sostituito da **`sync_carte.py`**, che legge direttamente
gli Excel — unica fonte per Finitura, Rarità, Autore e Varianti — e li unisce alle statistiche dei
`cards.json` e alle immagini. Copia anche logo, pittogramma e font dall'app.

---

## 11. Terzo giro — revisione dell'autore (2026-08-29)

**Logo.** Il pittogramma non ruota più: sta fermo. È il marchio, non un elemento decorativo.

**Sezione finiture rifatta.** Via *"Non tutte le carte brillano"* (non diceva niente del gioco).
Al suo posto **"Una carta, più edizioni"**: la rarità è stampata sulla carta stessa, e ogni carta
può uscire in **Normale**, **illustrazione alternativa** e **Rainbow**. Tre carte affiancate per
mostrare la differenza, più la scala delle rarità (Comune → Leggendaria) presa dai valori veri
della colonna `Rarita`.
*Nota:* il riquadro "alternativa" è un segnaposto dichiarato — nel progetto non esiste nessuna
illustrazione alternativa di una carta esistente (le "grafiche vergini" sono immagini sciolte,
non alt-art). Non ne ho riusata un'altra fingendo.

**`perche.html` — pagina nuova, il cuore dell'argomentazione.** Costruita sulle parole
dell'autore: nei TCG classici vince chi ha comprato di più; le partite finiscono in due turni e
non sono più un gioco da tavolo; Worldloom dosa **strategia + fortuna** perché la sconfitta possa
arrivare anche da un colpo di sfortuna, ma con una strategia sbagliata non si vince comunque; gli
**Imprevisti** come esempio di caso visibile; i **quattro esiti di uno scontro** (schivi / pari e
paghi il contraccolpo / vi colpite / ti prende in pieno) come radice realistica del dado; la
**scommessa** ("lo faccio o non lo faccio?"); l'**incrocio dei mondi** — prendi carte di mondi
diversi e costruisci una strategia che l'autore non aveva previsto.
*L'ispirazione che l'autore ha citato a voce è stata volutamente omessa, come richiesto.*

**`store.html` e `account.html` — pagine nuove, non funzionanti per scelta.** Lo store mostra
catalogo (scatola base, i due mazzi, bustina legata al capitolo, volume manga, accessori) con
avviso in chiaro che **niente è in vendita e i prezzi sono ipotesi**. L'account mostra
registrazione, accesso, cosa potrai fare (mazzi → app → sfide) e la **registrazione delle carte
fisiche**, dichiarata come *funzione in valutazione*. I moduli non inviano e non salvano nulla, e
lo dicono; nel campo password c'è scritto di non inserirne una vera.

> ⚠️ Account, login e store **veri** richiedono un backend (autenticazione, database, pagamenti):
> è un progetto a sé, non un'aggiunta al sito statico. Qui c'è solo il front-end che ne mostra la
> forma.

**Chi siamo riscritta.** Da "una persona, un progetto lungo" a **"un progetto lungo e un obiettivo
grande"**: l'ambizione di costruire uno studio, i mondi/manga/anime come lo stesso progetto visto
da lati diversi, e la terza convinzione cambiata da "provarlo davvero" ad **"aprirlo agli altri"**.
Registro emotivo, non artigianale-solitario.

**Design.** Bottone d'oro rifatto come **stampa a caldo** (gradiente diagonale, bordo più scuro,
riflesso che lo attraversa al passaggio) invece del rettangolo giallo pieno. I riquadri hanno un
verso di luce dall'alto e un filetto d'oro in testa. Rimossi `.cornice` e `.confronto-finiture`,
rimasti inutilizzati.

**Navigazione** portata a 6 voci: Perché · Il gioco · Carte · Manga · Store · Sostieni. Nel piede:
Chi siamo, IA allo scoperto, Il tuo account, contatti.

---

## 12. Quarto giro — revisione dell'autore (2026-08-29)

**⚠️ Regola di scrittura, vale per tutto il sito e per la comunicazione futura:**
i concetti si esprimono **sempre in positivo, mai per negazione**. Motivo dato dall'autore: le
parole hanno un peso e vengono recepite anche a livello inconscio. Esempio suo: invece di
*"per dire che qualcosa non torna"* → *"per darci la tua opinione, un feedback, quello che ti va"*.
Fatta una passata su tutte le pagine (≈40 riformulazioni). **Unica eccezione consapevole:** gli
avvisi di trasparenza (store in anteprima, moduli dimostrativi, campo password) restano
inequivocabili — lì la protezione di chi legge viene prima dello stile, ma sono stati comunque
riscritti nella forma meno cupa possibile (*"anteprima"*, *"apriranno con la campagna"*,
*"usa un testo qualsiasi"*).

**Menu riordinato e rinominato:** `perche.html` → **`come-e-nato.html`**, voce "Com'è nato".
Ordine: **Il gioco · Com'è nato · Store · Carte · Manga · Chi siamo · Sostieni**. Chi siamo è
salita in testata su richiesta.

**Sezione home "Com'è nato" riscritta** con un taglio diverso: parte da una domanda
(*"cosa serve perché due persone si siedano, giochino fino all'ultimo turno e si alzino con
qualcosa da raccontare?"*) invece che dalla polemica sui TCG classici.

**Bottone d'oro:** tolto l'alone giallo che sbordava. Ora le ombre sono solo **interne** (luce in
alto, ombra in basso) e il bottone si stacca dal fondo per contrasto invece che per bagliore.

**Caselle "in arrivo":** aggiunta in fondo alla galleria carte (*"Altre carte in arrivo"*,
inserita da `carte.js` dopo ogni disegno, quindi resta anche con i filtri attivi) e in fondo al
catalogo dello store (*"Nuove espansioni e mazzi in arrivo"*).

---

## 13. Quinto giro — navigazione ad albero (2026-08-29)

**La barra di scorrimento sotto la tabella del dado** (segnalata con uno screenshot) è sparita:
quei quattro simboli erano una `<table>` con `min-width: 560px` dentro una colonna più stretta,
quindi sbordavano. Ora sono una lista (`.simboli`) che si adatta e su schermo stretto impila
nome e descrizione. Verificato: zero elementi con scorrimento orizzontale, a 1440px e a 375px.

**`il-gioco.html` → `come-si-gioca.html`.** Un nome solo ovunque — menu, titolo, piede — perché
prima il menu diceva "Il gioco" e il piede "Come si gioca". Vince "Come si gioca": è la domanda
che ha in testa chi arriva, ed è la voce che usano tutti i competitor.

**Navigazione a due livelli.** Scelta fra quattro opzioni: **menu a tutto schermo**, invece della
colonna fissa a sinistra. Motivo: la colonna fissa è un pattern da documentazione (nessuno dei
competitor la usa sul sito principale) e ruba larghezza in permanenza — proprio alla galleria
carte, che la vuole tutta.
- **Testata:** logo · sette voci in linea (Sostieni compresa) · pulsante **Menu**.
  Sotto i **1250px** le voci in linea spariscono e resta il solo pulsante.

  > ⚠️ **Correzione (stesso giorno).** In una prima versione avevo aggiunto di mia iniziativa un
  > bottone **Sostieni in oro** dentro la testata: **non era stato chiesto**, ed era anche la causa
  > del "sembra tutto attaccato" segnalato dall'utente. Misurato: logo 201 + menu 634 + blocco
  > azioni 206 = 1041px su 1100 utili, cioè **29px di respiro per lato**. Tolto il bottone e
  > rimessa Sostieni fra le voci normali, il respiro è tornato a **49-52px per lato**, e la soglia
  > è passata da 1100 a 1250px così i link spariscono invece di comprimersi.
  > **Lezione:** niente aggiunte non richieste alla struttura — anche quando sembrano migliorie.
- **Menu a tutto schermo:** 7 sezioni e 26 sottovoci, il pittogramma in filigrana sullo sfondo,
  chiusura con Esc. **L'albero vive in un posto solo** — la costante `ALBERO` in `sito.js` — così
  le dieci pagine non se lo duplicano addosso.
- **Indice di pagina:** barra appiccicata sotto la testata con le sezioni della pagina corrente,
  su Come si gioca, Com'è nato, Chi siamo, Manga e Store. La voce corrente si accende scorrendo.
- **Scorciatoie carte:** dal menu, `carte.html?mazzo=frost-land`, `?mazzo=kepler-452b`,
  `?finitura=foil` aprono la galleria già filtrata.

**Store:** ogni prodotto ha il suo ancoraggio (scatola, mazzi, bustine, volumi, accessori) e
l'indice li elenca. La voce "Manga" del catalogo si chiama **Volumi**, per distinguerla dalla
pagina Manga (il progetto).

**Due scelte tecniche prese durante il lavoro:**
1. L'indice di pagina calcola la sezione corrente **sullo scroll**, non con
   `IntersectionObserver`: è deterministico e verificabile.
2. `.appare` parte nascosto **solo se il JavaScript è vivo** (classe `js` messa da uno script in
   testa). Senza questa condizione un errore di caricamento avrebbe lasciato mezzo sito
   invisibile; ora il caso peggiore è il contenuto che compare senza animazione.

> **Non verificato dal vivo:** la comparsa allo scroll (`.appare`) dipende da
> `IntersectionObserver`, che nel pannello del browser di questa sessione non gira perché la
> scheda non disegna (`visibilityState: hidden`). L'evidenziazione dell'indice invece è stata
> verificata forzando l'evento, e risponde correttamente.

---

## 14. Accesso di prova e area personale (2026-08-29)

Aggiunto un **accesso finto** per poter costruire e provare le schermate del "dopo il login".

- Credenziali: **giacomo / giacomo** (accettato anche `giaocomo`, la scrittura arrivata nella
  richiesta). Stanno in **un punto solo**: la costante `UTENTE_DI_PROVA` in `assets/js/accesso.js`.
- `account.html` — il pannello "Accesso di prova" ora valida davvero e porta all'area personale.
  La registrazione resta un'anteprima non collegata.
- `area-personale.html` (nuova) — i tuoi mazzi, la collezione (con aggiunta carte funzionante:
  se la carta c'è già incrementa le copie invece di duplicare la riga), il profilo, e "Esci".
- Chi apre l'area personale senza sessione viene rimandato a `account.html?accesso=richiesto`,
  con la spiegazione del perché.
- La sessione sta in `sessionStorage`: muore chiudendo la scheda.

> 🔓 **Questo accesso non protegge nulla.** Le credenziali sono scritte in chiaro nel JavaScript:
> chiunque apra il sito pubblicato le legge. Serve solo a sviluppare l'interfaccia in locale, ed è
> dichiarato sia nel commento in testa ad `accesso.js` sia in un riquadro visibile sulla pagina.
> **Prima di pubblicare va sostituito da un'autenticazione vera lato server**, insieme al backend
> già segnalato al §12.

Verificato dal vivo: rimbalzo senza sessione, credenziali sbagliate (resta sulla pagina col
messaggio), accesso riuscito con entrambe le scritture, saluto col nome, aggiunta carta
(4→5 carte), aggiunta di un doppione (5→6 carte ma sempre 4 righe), uscita che azzera la sessione
e rimanda in home. Console pulita, 11 pagine tutte valide.

**Accesso nella testata (richiesto dall'autore).** Aggiunto **Accedi** come collegamento di testo
accanto al pulsante Menu — testo, non un bottone, per non ripetere l'errore del bottone d'oro. A
sessione di prova aperta diventa il **nome dell'utente** e porta all'area personale invece che
alla pagina d'accesso.

Per farci stare l'ottavo elemento senza tornare al "tutto attaccato", la **sola testata** usa ora
`max-width: 1320px` invece dei 1180 della colonna di contenuto, e la soglia a cui i link in linea
si ritirano è salita a **1320px**. Misurato: respiro passato da 49 a **68px per lato**.
*Costo dichiarato:* il logo resta **30px più a sinistra** della colonna di contenuto, e su un
portatile da 1280px i link in linea non compaiono (restano Accedi + Menu, che portano ovunque).
Un nome lungo viene accorciato con i puntini invece di spingere fuori la testata.

**Sezione "Seguici" in Chi siamo** (`chi-siamo.html#seguici`), con **Instagram** e **YouTube**:
due riquadri con icona disegnata in SVG inline (nessun file esterno da caricare), che si aprono in
una scheda nuova con `rel="noopener"`. Aggiunta all'indice della pagina e all'albero del menu.
Gli indirizzi stanno **solo lì**, in un blocco commentato.

> ⚠️ **Handle da confermare.** `@worldloomtcg` su entrambe le piattaforme è un'ipotesi coerente
> col dominio: **non è stato verificato che quegli account esistano e siano dell'autore.** Vanno
> confermati o corretti prima di pubblicare — altrimenti il sito manda i visitatori sul profilo di
> qualcun altro.

**Sezione "Dal tavolo" in home** (`index.html#dal-tavolo`): tre caselle per le recensioni di chi
ha giocato, più l'invito a fare da playtester (che porta alla lista — lo stesso imbuto che la
ricerca al §4 indica come primo fattore di riuscita di una campagna).

> ⚠️ **Le caselle restano "in attesa" finché non ci sono frasi vere.** Riempirle con recensioni
> inventate su un sito che porta a una campagna di crowdfinanziamento sarebbe pubblicità
> ingannevole, e la community dei giochi da tavolo le riconosce in poche ore (vedi i casi al §3).
> L'avvertenza è ripetuta in un commento nel CSS e uno nell'HTML, accanto alle caselle.

### Da fare prima di pubblicare

- **Schermata del gioco**: nel progetto non esiste nessuno screenshot. I due riquadri "anteprima
  dell'app" usano provvisoriamente un'immagine di carta. Serve una schermata vera del tavolo.
- **Colonna `Autore` vuota** in entrambi gli Excel (la colonna *esiste già*, nessuno l'ha
  compilata) e **non esiste una colonna per il modello IA**. Il sito mostra la riga di credito da
  solo appena il dato c'è. Lavoro da fare con la skill `pipeline-carte`.
- **Colonna `Rarita` vuota** per tutte le 83 carte illustrate (è compilata solo sulle carte
  nuove non ancora illustrate). La scheda la mostra quando c'è.
- **Nessuna stampa Rainbow illustrata** — vedi il riquadro al §10.
- **Tavole del manga**: la pagina ha i riquadri pronti, i disegni no.
- **Illustrazione alternativa**: non ne esiste nessuna: il terzo riquadro delle edizioni è un
  segnaposto finché non c'è un'alt-art vera di una carta esistente.
- **Backend** per account/login/store/registrazione carte: da progettare a parte, è l'unico pezzo
  che il sito statico non può coprire.
- **Terminologia**: il sito dice "Pedina", ma il testo degli effetti dentro `cards.json` dice
  ancora "Alieno" (es. *"Quando un tuo Alieno muore…"*). Va allineato negli Excel, non a mano.
- **Modulo lista**: collegare un servizio reale.
- **Dominio**: `worldloomtcg.com` va registrato/puntato, e va tolto il `noindex` solo quando si
  decide di essere visibili.

---

## Fonti

- Analisi diretta di `sorcerytcg.com`, `playriftbound.com`, `disneylorcana.com`, `altered.gg`
- [Kickstarter — Introducing Our AI Policy](https://updates.kickstarter.com/introducing-our-new-ai-policy/)
- [TechCrunch — Kickstarter requires generative AI projects to disclose additional info](https://techcrunch.com/2023/08/01/kickstarter-requires-generative-ai-projects-to-disclose-additional-info/)
- [AAGC — Kickstarter's New AI Policy: What Board Game Publishers Need to Know](https://aagc.games/blog/kickstarters-new-ai-policy-what-board-game-publishers-need-to-know)
- [Wargamer — Awaken Realms addresses yet another AI art scandal](https://www.wargamer.com/board-games/concordia-ai-art)
- [BoardGameWire — Wise Wizard Games defends using AI art](https://boardgamewire.com/index.php/2024/11/07/star-realms-maker-wise-wizard-games-defends-using-ai-art-in-new-projects-board-game-artists-call-out-ethics-of-decision/)
- [BoardGameWire — "The numbers simply aren't there": Equinox to end Altered TCG](https://boardgamewire.com/index.php/2026/03/19/the-numbers-simply-arent-there-equinox-to-end-record-breaking-altered-tcg-after-new-crowdfund-falls-well-short-of-goals/)
- [TechRaptor — Equinox Announces Cancellation of Roots of Corruption](https://techraptor.net/tabletop/news/equinox-announces-cancellation-of-altered-tcg-roots-of-corruption-campaign-and-end-of)
- [StraySpark — The 2026 Kickstarter Indie Game Playbook](https://www.strayspark.studio/blog/kickstarter-indie-game-campaign-playbook-2026)
- [VNK — Top 5 Card Game Trends of Early 2026 for Indie Designers](https://www.vnkplayingcard.com/top-5-card-game-trends-of-early-2026-for-indie-designers)
- [Figma — Top Web Design Trends for 2026](https://www.figma.com/resource-library/web-design-trends/)
