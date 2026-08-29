---
name: effetti-carta
description: >-
  Come cablare gli effetti delle carte Worldloom nell'engine (Alieni, Magie, Trappole, Terreni,
  Imprevisti, Ruoli). USA SEMPRE questa skill prima di scrivere o riparare QUALUNQUE effetto di
  carta nell'engine — anche solo un +N Attacco, un "all'evocazione pesca", una Trappola nuova, un
  bugfix su un effetto esistente, o quando l'utente dice "implementa la carta X", "l'effetto di Y
  non funziona", "aggancia il codice Z". Serve a non reinventare un punto d'aggancio nuovo ogni
  volta: sceglie la casella canonica giusta tra le 19, il file/funzione/pattern corretto, e tiene
  aggiornata la tabella del vocabolario. Non usarla per lavoro puramente di dati/Excel (quella è
  la skill pipeline-carte) o per modifiche UI che non toccano la logica di un effetto.
---

# Effetti carta nell'engine Worldloom

## Passo 0 — SEMPRE: leggi il vocabolario

Prima di scrivere una riga, apri e leggi
`Engine/Worldloom_Engine_Vocabolario_Effetti.md` (nella root del progetto). È la fonte di verità:
elenca le **19 caselle canoniche** con file / funzione / pattern esatto per ciascuna, più una
tabella di **ogni codice-carta esistente** (implementato o mancante). Questa skill è solo la
procedura attorno a quel documento — i dettagli veri stanno lì.

Se il documento e questa skill divergono, vince il documento (è quello che si aggiorna ad ogni
lavoro sull'engine).

## Passo 1 — Leggi il testo VERO della carta

Apri `App - HTML - Test/src/data/generated/mazzi/{frost-land,kepler-452b}/cards.json` e leggi il
campo `effetto.testo` della carta. **Non fidarti del campo `effetto.tipo`**: è testo libero scelto
da chi compila l'Excel, non un enum, e spesso è fuorviante ("summon"/"passive"/"attack" usati in
modo incoerente). Il codice d'aggancio è `effetto.codice`.

## Passo 2 — Scegli la casella guardando IL MOMENTO in cui l'effetto scatta

Non la parola in `tipo` — il momento descritto nel testo. Indice rapido delle 19 caselle (dettaglio
completo + pattern nel vocabolario):

| Casella | Quando scatta | File principale |
|---|---|---|
| `PASSIVO` | bonus ricalcolato ad ogni uso, dipende dal campo attuale | `effettiCarta.js` → `bonusAttaccoPassivo`/`bonusParataPassivo` |
| `EVOCAZIONE` | "all'evocazione…" (incl. ricerca/pesca dal proprio mazzo) | `effettiCarta.js` → `effettoEvocazione` |
| `VINCOLO_EVOCAZIONE` | condizione che BLOCCA l'evocazione | `evocazione.js` → `puoEvocareNormale` |
| `BONUS_CONTRO` | bonus che dipende da chi si affronta | `effettiCarta.js` → `bonusAttaccoContro` |
| `SIMBOLO` | in base al simbolo del dado in combattimento | `effettiCarta.js` → `effettiSimbolo` |
| `DIFESA` | capacità speciale mentre difende | `effettiCarta.js` → `magoPuoRitirare`/`consumaSchivataAutomatica` |
| `PRE_ATTACCO` | prima di ogni attacco della creatura | `effettiCarta.js` → `attivaEffettoPreAttacco` |
| `SOPRAVVIVENZA` | modifica il danno finale prima di applicarlo | `effettiCarta.js` → `applicaDannoConSopravvivenza` |
| `MORTE_PROPRIA` | quando muore, può rinascere | `effettiCarta.js` → `effettoMorte` |
| `MORTE_OFFENSIVA` | quando muore, colpisce il campo nemico | `effettiCarta.js` → `effettoMorteOffensivo` |
| `MORTE_ALLEATO` | reagisce alla morte di un altro tuo Alieno | `effettiCarta.js` → `effettoMorteAlleato` |
| `INIZIO_TURNO` | ad ogni tuo turno finché resta in campo | `effettiCarta.js` → `effettiInizioTurno` |
| `MAGIA` | Magia normale, effetto immediato dalla mano | `magieTrappole.js` → `risolviMagia` (+ `magiaRichiedeBersaglio`, `numeroBersagliMagia`, `magiaGiocabile`) |
| `TERRENO` | Magia slot Terreno, passiva per entrambi | `magieTrappole.js` → ramo `terr_` + `modificaDannoDaTerreno`/`retrovieEsposteDaTerreno` |
| `TRAPPOLA` | coperta, reagisce a un evento | `magieTrappole.js` → `ELEGGIBILITA_RISPOSTA` + `gameReducer.js` → `applicaEffettoTrappola` |
| `TRAPPOLA_EVOCAZIONE` | Trappola che scatta sull'evocazione nemica | `magieTrappole.js` → `risolviTrappolaEvocazioneNemica` |
| `IMPREVISTO` | vale per entrambi, non annullabile | `imprevisti.js` → `risolviImprevisto` |
| `RUOLO` | Aggressore/Difensore/Tank/Evasivo generico | `combattimento.js` (+ Tank in `giocatore.js` → `ripulisciCampo`) |
| `VANILLA` | nessun effetto, solo statistiche | nessun hook — `codice` è `null`, già a posto |

Tutti i file sono in `App - HTML - Test/src/game/`.

## Passo 3 — Scrivi il codice seguendo il pattern della casella

- Segui **esattamente** il pattern indicato nel vocabolario per quella casella (di solito un
  `if (codice === "xyz") { ...; log(\`✦ ...\`); }` dentro la funzione giusta).
- Se la casella richiede modifiche in **due punti** (es. `TRAPPOLA`: predicato in
  `ELEGGIBILITA_RISPOSTA` + ramo in `applicaEffettoTrappola`), falle **entrambe nella stessa
  sessione**.
- Se un bonus dipende da un'ALTRA carta con un codice specifico, il check va scritto **lato
  beneficiario**, non lato sorgente (vedi `custode` come esempio nel vocabolario).
- Regola di processo del progetto: cambia SOLO l'effetto richiesto, niente refactoring "già che ci
  sono". Una casella alla volta.

## Passo 4 — Verifica con simulazione headless usa-e-getta

Crea un file `sim-<qualcosa>.mjs` nella **root di `App - HTML - Test`**, che importa direttamente i
moduli engine (`gameReducer.js` o il modulo specifico), costruisce lo scenario, e stampa
asserzioni pass/fail. Copri i casi limite (creatura in retrovia vs prima linea, effetto che non
trova bersaglio, la creatura muore nello stesso scontro, ecc.). Poi:

```bash
rm -f "App - HTML - Test/sim-<qualcosa>.mjs"
```

**Sempre `rm -f` dopo l'uso** — è convenzione consolidata, questi file non si committano mai.

Per forzare un tiro di dado specifico, mocka `Math.random` nel sim (vedi come è stato fatto per
`manipstrum` nel vocabolario).

Poi `npm run build` dentro `App - HTML - Test` e, se l'effetto è osservabile in partita, una
verifica veloce nel browser.

## Passo 5 — Aggiorna la tabella del vocabolario

In `Engine/Worldloom_Engine_Vocabolario_Effetti.md`, aggiorna la colonna "Stato" della riga di
quel codice a `✅ (AAAA-MM-GG)`. Se hai introdotto una casella/hook nuovo (raro — va discusso a
parole prima con l'utente), documentalo nella sezione delle 19 caselle.

## Riferimenti

- `Engine/Worldloom_Engine_Vocabolario_Effetti.md` — le 19 caselle + tabella completa (leggi SEMPRE)
- `Regolamento/Worldloom_Regolamento_v2.1.html` — regole di gioco, va tenuto sincronizzato con l'engine
- `App - HTML - Test/src/game/` — tutti i moduli engine
- memoria: `[[project_engine_effects_vocabulary]]`
