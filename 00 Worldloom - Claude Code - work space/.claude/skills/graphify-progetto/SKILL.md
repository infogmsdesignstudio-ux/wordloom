---
name: graphify-progetto
description: >-
  Uso e aggiornamento del grafo di conoscenza Graphify di Worldloom (grafo persistente in
  graphify-out/, ~709 nodi, include l'engine + il Vocabolario Effetti con archi `implements`).
  USA questa skill quando serve capire come sono collegate le parti del progetto (chi chiama cosa,
  dove vive un effetto, che impatto ha una modifica, "come funziona X nell'engine", "cosa dipende
  da Y"), e SOPRATTUTTO quando dopo un lavoro sul codice/documenti il grafo va risincronizzato —
  o quando l'utente dice "interroga il grafo", "aggiorna graphify", "risincronizza il grafo",
  "/graphify query". Spiega QUANDO interrogare e QUANDO/COME riaggiornare per questo progetto; la
  meccanica della pipeline è nella skill globale `graphify`.
---

# Graphify per Worldloom

## Cos'è e dove vive

Il grafo persistente del progetto è in `graphify-out/` **alla root** (`00 Worldloom - Claude Code -
work space/graphify-out/`). È **gitignorato** (locale a questa macchina, rigenerabile) — non
committarlo mai. Contiene tutto il progetto: engine, componenti React, dati carte, regolamento, e
`Engine/Worldloom_Engine_Vocabolario_Effetti.md` con archi `implements` reali verso le funzioni
engine (es. `applicaDannoConSopravvivenza --implements--> SOPRAVVIVENZA`).

La skill globale `graphify` (in `~/.claude/skills/graphify/`) contiene tutta la meccanica
(installazione interprete, pipeline di estrazione, query CLI). Questa skill dice solo **quando** e
**come** usarla nel contesto Worldloom.

## Interrogare il grafo

Il grafo esiste già → **fast path**: rispondi dalla domanda, non ricostruire.

```
/graphify query "<domanda>"
```

Oppure invoca la skill `graphify` con una domanda in linguaggio naturale — riconosce che
`graphify-out/graph.json` esiste e salta dritta alla query.

Buone domande per questo progetto:
- "Dove viene applicato il danno di combattimento e cosa lo modifica?"
- "Quali funzioni implementano la casella SIMBOLO del vocabolario effetti?"
- "Cosa dipende da `gameReducer.js` → `scegliBersaglio`?"
- "Come è collegata la catena di effetti al combattimento?"

Usa `/graphify path "A" "B"` per il percorso più breve tra due concetti, `/graphify explain "Nodo"`
per la spiegazione di un nodo.

## Quando RIAGGIORNARE il grafo

Risincronizza dopo un lavoro che **cambia la struttura o le relazioni** del codice/documenti:

- implementato un codice-effetto che prima era mancante (nuova funzione + nuovi archi `implements`)
- aggiunto/rimosso/rinominato un modulo, una funzione esportata, un componente
- refactoring che sposta responsabilità tra file (es. una funzione estratta in un modulo nuovo)
- modifiche sostanziali al Regolamento o al Vocabolario Effetti (sezioni nuove, non solo un ✅ in tabella)
- nuove carte / nuovo mondo (cambia il grafo dei dati)

**NON serve risincronizzare** per: cambiare solo lo stato "implementato" in una tabella, fix di
una riga dentro una funzione esistente, tweak CSS/UI, aggiornamenti di testo che non introducono
concetti nuovi. In questi casi i nodi/archi concettuali restano validi così come sono (precedente
esplicito: i 3 fix effetti del 2026-08-27 non hanno richiesto resync).

## Come riaggiornare

Aggiornamento incrementale (ri-estrae solo i file nuovi/cambiati), dalla **root del progetto**:

```
/graphify . --update
```

Oppure, per un giro rapido di solo codice (come annotato in `.gitignore`):

```
graphify . --update --code-only
```

Dopo l'update, se hai toccato le relazioni engine ↔ vocabolario, verifica con una query mirata che
i nuovi archi `implements` ci siano (es. `/graphify query "quali funzioni implementano MORTE_ALLEATO"`).

Se `graphify-out/` è stato cancellato, la skill globale `graphify` lo ricostruisce da zero con
`/graphify .` (più lento, ma stesso risultato).

## Riferimenti

- skill globale: `~/.claude/skills/graphify/SKILL.md` (meccanica completa)
- `graphify-out/GRAPH_REPORT.md` — report di audit dell'ultimo build (god nodes, connessioni sorprendenti)
- `Engine/Worldloom_Engine_Vocabolario_Effetti.md` — unito al grafo con archi `implements`
- memoria: `[[project_engine_effects_vocabulary]]`
- CLAUDE.md globale dell'utente: `/graphify` è già registrato come trigger
