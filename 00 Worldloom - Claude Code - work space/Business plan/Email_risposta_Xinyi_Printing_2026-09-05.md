# Risposta a Xinyi Printing (Rose) — bozza del 2026-09-05

**Contesto.** Rose (Guangzhou Xinyi Printing Co., LTD) ha risposto alla nostra richiesta con 4 domande
(formato carta, tipo di scatola, quantità, carte per set) e un listino allegato. La bozza qui sotto
risponde punto per punto usando **solo** i dati dell'`RFQ_TCG_produzione_fisica_260825_224059.pdf`
(il business plan `business_plan_tcg_ip_260825_141122.pdf` è ancora uno scheletro: tutte le sezioni
sono "contenuti da sviluppare", compresa la 25 "Fornitori").

**Da confermare prima dell'invio** — vedi la sezione "Note e punti aperti" in fondo.

---

## Email (inglese) — pronta da incollare

**Subject:** Re: Custom TCG card decks – project details for quotation

Dear Rose,

Thank you for your reply and for the price list, which we will study carefully.

We are developing a new trading card game IP and are looking for a manufacturing partner for prototyping first and for industrial production afterwards. Below are the answers to your questions, followed by the technical details we would like your quotation to cover. Materials, paper weights and finishes are open to your recommendations: we are looking for the best solution for premium quality, with the related costs, MOQ and lead times.

**1. Card size**
59 × 86 mm.

**2. Products and packaging**
We need three products:
- Booster pack: 6 cards per pack, classic heat-sealed TCG foil wrapper with unique artwork, tamper-evident. Packs are randomized.
- Display box: 24 boosters per display, classic retail display box. Please propose options for materials, printing and finishing with the related costs.
- Starter Deck: 42 cards (fixed list, duplicates allowed) + 5 custom 8-sided dice (standard plastic, custom colour, custom faces/symbols to be defined) + a printed quick-start guide with a QR code to the online rulebook, in a simple cardboard box. To be delivered assembled as a finished product. An exclusive promo card may be added (to be defined).

**3. Quantities**
Please quote the following tiers, with unit cost, total cost and MOQ for each and, where possible, a breakdown of the main cost items:
- Boosters: 100 / 500 / 1,000 / 5,000 / 10,000 / 25,000 / 50,000
- Starter Decks: 100 / 200 / 500 / 1,000 / 5,000

We appreciate your flexibility on the MOQ for a first cooperation: for the prototyping and playtesting phase we would like the smallest run you can produce, so please tell us the minimum feasible quantity and its cost.

**4. Cards per set**
The first set has 200 unique cards/artworks: 150 Common, 40 Rare, 10 Ultra Rare. The same artwork will also exist in different finishes (Foil, Rainbow Foil, Glossy; combinations to be evaluated), plus limited numbered cards (e.g. 023/100, up to /999).

**Card specifications**
- Premium quality, comparable to the major international TCGs.
- Black core or an equivalent stock you recommend; please propose paper weight (gsm), coating and finish.
- Front slightly satin/matte; back matte and identical for all cards.
- Durable for play both with and without sleeves.

**Unique ID on each card**
Each physical copy should carry a unique, randomly generated 7-character alphanumeric code, visible but discreet, in the same position on all card layouts. Please tell us which technology you can offer, its feasibility and cost. The IDs must be linkable to card, variant and production batch through a database/list; we are also evaluating a future use for authentication through our app.

**Randomization and collation**
Boosters must be randomized; Ultra Rare, Foil and Rainbow Foil cards can replace a normal card. Please propose a collation structure and pull rates based on your experience. Randomization should also apply to the position of the packs within the display.

**Samples, proofs and quality control**
- Physical samples of stocks, weights and finishes before production, with information on abrasion, scratching, humidity, bending and print durability.
- Physical prototypes before production: standard card, Foil, Rainbow, any alternatives, booster, display and Starter Deck.
- Physical proof and pre-production approval, colour management, possibility to approve a pre-series.
- Your tolerances and policy for defects (printing, cutting, foil, edges, corners, damaged cards) and for defective/missing quantities (replacement, refund or other solution).
- Collation checks, possibility of third-party inspection, and production batch identification if technically possible.

**Files and prepress**
We would appreciate significant support in the initial prepress phase; afterwards our team will supply the files for your technical check. Please send your file specifications: accepted formats, bleed, safe area, cutting tolerances and margins, CMYK profiles, Pantone if applicable, black handling, and how the masks for Foil/Rainbow/other finishes should be prepared. We also ask that files and specifications are kept for reprints.

**Costs and lead times**
Please itemise: assembly; setup/prepress/dies; prototypes/proofs; quality control; packing/pallets; shipping to Italy (with the terms you offer); any other cost not listed here.
For lead times, please indicate: technical review, prototypes, proof/pre-series, production, packing/assembly, quality control and the total lead time to delivery.

**About your company**
It would help us to know: MOQ and production capacity; your experience with TCG products; materials and technologies available; finishes; randomization/collation methods; dice and assembly capabilities; ID/data handling; samples of similar work; and a technical contact person.

This is a preliminary request for a first technical and economic evaluation: some details on rarities, pull rates and special cards will be defined later.

Thank you again, we look forward to your proposal.

Best regards,
Giacomo

---

## Note e punti aperti (per Giacomo, non da inviare)

**Fonte di ogni numero della mail**

| Dato nella mail | Fonte |
|---|---|
| 59 × 86 mm | RFQ §2 |
| Booster 6 carte, termosaldato, grafica unica, anti-manomissione | RFQ §4 |
| Display 24 booster | RFQ §5 |
| Starter Deck 42 carte + 5 × D8 + guida rapida con QR + scatola in cartoncino + promo | RFQ §6 |
| Quantità booster e starter | RFQ §10 |
| Set 200 carte: 150 C / 40 R / 10 UR, finiture, numerazione /100 … /999 | RFQ §2 |
| Black Core, satinata/matte, retro matte, sleeve | RFQ §2 |
| ID 7 caratteri alfanumerici | RFQ §3 |
| Collation, campioni, proof, QC, prestampa, costi, tempi, info al produttore | RFQ §4, §7, §8, §9, §11, §12, §13 |

**Cose che NON tornano fra RFQ e regolamento — decidi tu, poi aggiorniamo l'RFQ**

1. **Dadi.** L'RFQ chiede solo *5 × D8*. Il Regolamento v2.1 (cap. 3) prevede *un D8 per ciascun
   Archetipo nel mazzo* (5 Archetipi in `rules.json`, ognuno con distribuzione di facce diversa:
   spada/scudo/cuore/schivata) **più un Dado Imprevisti a 6 facce**, e cita i **segnalini** per gli
   effetti a durata. Nella mail ho lasciato i 5 D8 come da RFQ. Se vuoi aggiungere il D6, frase pronta:
   > "…+ 5 custom 8-sided dice (each with a different distribution of 4 symbols on its faces) + 1 custom 6-sided die…"
2. **Carte nello Starter Deck.** L'RFQ dice 42; l'app e il regolamento lavorano con un Worldloom da
   massimo 60 carte + un mazzetto Imprevisti separato da minimo 10 (max 2 copie). Da chiarire se 42 è
   una scelta commerciale voluta (starter ridotto) o un numero da rivedere.
3. **Nome dell'IP.** L'RFQ non nomina mai "Worldloom" ("nuova proprietà intellettuale"): ho tenuto la
   stessa riservatezza. Se preferisci presentare il brand, si aggiunge una riga.
4. **Firma.** Solo "Giacomo": la società non è ancora costituita (business plan §28 vuoto). Aggiungi
   ragione sociale / sito quando ci sono.
5. **Spedizione in Italia.** L'RFQ elenca "spedizione" fra i costi senza destinazione: ho scritto
   *Italy* e chiesto i termini che offrono. Confermami se va bene.
6. **Listino di Rose.** Non l'ho visto (non è nel repository): nella mail lo ringrazio e basta, senza
   commentarlo.

**Prossimi passi proposti (non fatti)**

- Tradurre l'RFQ in inglese e allegarlo alla prossima mail (oggi è solo in italiano).
- Compilare la sezione 25 "Fornitori" del business plan con Xinyi Printing come primo contatto
  (data, referente, cosa hanno risposto).
