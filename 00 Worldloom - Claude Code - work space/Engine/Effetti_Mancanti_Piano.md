# Piano per i 62 effetti mancanti (carte 32-61)

> Creato il 2026-08-29. Lavoro **B** della sessione "reparto finiture".
> La tabella completa codice-per-codice, con la casella proposta, sta in
> `Engine/Worldloom_Engine_Vocabolario_Effetti.md` → sezione "Codici NON implementati — audit 2026-08-29".
> La procedura per ogni singolo effetto è la skill `effetti-carta` (leggi il testo vero, scegli la
> casella dal MOMENTO in cui scatta, segui il pattern, simulazione headless, aggiorna il Vocabolario).

## Perché a blocchi e non carta per carta

I 62 effetti non sono 62 problemi diversi: **si ripetono poche meccaniche**, e conviene costruire la
primitiva una volta sola e poi cablarci sopra le carte. Conteggio sui testi reali:

| Meccanica citata | Effetti che la usano |
|---|---|
| evocazione (condizioni, effetti all'evocazione, evocazioni extra) | 19 |
| **tira il dado Archetipo** e ramifica sul simbolo | 18 |
| cimitero (recupera, rievoca, ricicla) | 17 |
| blocco / stordimento ("non può attaccare", "salta", "blocca") | 16 |
| distruzione mirata | 13 |
| pesca / Rifornimento | 12 |
| Terreno | 8 |
| copia di un altro effetto | 8 |
| PV dello Stratega | 5 |
| attacchi extra nel turno | 2 |

## I blocchi, in ordine

**Blocco 1 — Terreni (4 codici).** `terr_gelo`, `terr_baraonda`, `terr_marcia`, `terr_estatemarb`.
Oggi la carta **occupa correttamente lo slot** (il sottotipo si deduce dal prefisso `terr_`) ma non fa
nulla. Casella `TERRENO`, punto d'aggancio già esistente (`modificaDannoDaTerreno`,
`retrovieEsposteDaTerreno`). Il più contenuto: buono per validare il giro completo
(codice → simulazione → Vocabolario) prima dei blocchi grossi.

**Blocco 2 — dado Archetipo (18 codici).** La primitiva più riusata. Esiste già un precedente da
seguire: `manipstrum` tira il dado Archetipo della carta e ramifica sui 4 simboli. Serve estrarne un
helper riusabile invece di riscrivere il tiro 18 volte. ⚠️ Il tiro è **scenografia** (LancioDado) oltre
che logica: va deciso se questi tiri passano dalla fila `s.sequenza` come il dado di combattimento, o
se si risolvono in silenzio. **Questa è una decisione da prendere con l'utente prima di scrivere.**

**Blocco 3 — cimitero (17 codici).** Recupera / rievoca / ricicla. Primitiva: "scegli una carta dal
cimitero che soddisfa un filtro". Esistono già `revive` (rievoca una Pedina) e il ramo Scudo/Spada di
`manipstrum` (recupera una Magia): si generalizza da lì.

**Blocco 4 — blocco e stordimento (16 codici).** Il campo `stordito` esiste già (`stun` lo mette a 2).
Qui servono varianti: non poter attaccare, non poter evocare, non poter giocare Magie per N turni,
saltare il Rifornimento. ⚠️ **Rischio deadlock noto**: `verde` ("deve attaccare ogni turno") ha già
richiesto due esenzioni scoperte solo scrivendo i test (turno 1 di chi inizia, e `rinunciaAttacco`).
Un effetto che blocca l'attacco mentre un altro lo obbliga va testato insieme, non separatamente.

**Blocco 5 — pesca e PV Stratega (17 codici).** Primitive semplici, poco rischio.

**Blocco 6 — il resto**: distruzione mirata, copia, attacchi extra.

---

## Concatenazioni da testare — i punti dove due effetti si incastrano

Non sono ipotesi: ognuna nasce da un meccanismo che nel motore esiste già ed è delicato.

1. **Blocco che vieta l'attacco + effetto che lo obbliga.** `verde` e `cavalieremarb` dicono "deve
   attaccare ogni turno se può"; diversi codici nuovi dicono "non può attaccare". Se si incontrano, il
   turno può non chiudersi più. Precedente: `verde` ha richiesto 2 esenzioni per non bloccare il gioco.
   **Da testare anche lato IA**: la Fase 4 dell'idea 59 si è già bloccata per sempre una volta su una
   guardia implementata a metà.

2. **Rievoca dal cimitero + morte differita.** Dall'idea 59 Fase 1 la morte è un passo `muta` della
   fila: la creatura muore *dopo* la scenografia. Un effetto che pesca dal cimitero risolto **prima**
   che quel passo si concluda non trova la carta appena morta. Da decidere e congelare: il cimitero
   letto da un effetto è quello *logico* (già aggiornato) o quello *visibile*?

3. **Tiro del dado Archetipo mentre una catena è aperta.** La Fase 2 ha introdotto `scelta:catena`, e
   la Fase 4 l'invariante "il passo `ia` sta sempre in fondo". Un nuovo tiro di dado accodato nel mezzo
   può finire davanti a una decisione del giocatore ancora in sospeso — è esattamente il bug che
   `catena.blindato.mjs` ha colto la prima volta.

4. **Copia di un effetto non implementato.** `ecogelo` e `copiare` ripetono l'ultima Magia giocata. Se
   quella Magia è una delle 62 non cablate, oggi copiano il nulla senza dirlo. Serve almeno un log.

5. **Terreno che modifica il danno + SOPRAVVIVENZA + Tank.** Tre modificatori sullo stesso danno, con
   ordine di applicazione non documentato. `terr_gelo` e `terr_estatemarb` entrano qui.

6. **Salta Rifornimento + prima mano una-alla-volta.** La Fase 3 ha reso la prima mano N passi da 1
   carta. `saltariforn` interviene sulla stessa fase: va verificato che non lasci la fila a metà.

7. **Blocca Magie per 3 turni + Trappole.** `bloccamagie3` deve passare da `magiaGiocabile`, ma le
   Trappole hanno un percorso diverso (`ELEGGIBILITA_RISPOSTA`): il blocco vale per entrambe? Il testo
   dice "solo Magie e Trappole" — da leggere con attenzione carta per carta.

8. **Due Terreni nuovi in sequenza.** Il Terreno sostituisce il precedente: un effetto "continuo" del
   Terreno uscente va annullato, non lasciato attaccato allo stato.

## Regola di lavoro per questo cantiere

Un blocco alla volta, e **dentro il blocco una carta alla volta**: codice → simulazione headless
usa-e-getta → `npm run build` → riga del Vocabolario a ✅ con la data. I 6 test blindati esistenti
devono restare verdi ad ogni passo; le concatenazioni qui sopra diventano test propri quando l'utente
conferma il comportamento.
