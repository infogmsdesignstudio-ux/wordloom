# Strumenti esterni

Strumenti di terze parti scaricati dalle fonti ufficiali. Stanno **fuori** dal workspace del progetto
(`00 Worldloom - Claude Code - work space/`) di proposito: così non finiscono nel grafo graphify né
nelle ricerche sul codice del gioco.

## SkillSpector 2.12.0 — NVIDIA

- **Cosa:** scanner di sicurezza per skill di agenti IA (Claude Code, Codex, MCP). Licenza Apache-2.0.
- **Fonte:** https://github.com/NVIDIA/SkillSpector — tag `v2.12.0`, commit `c7958a3`
  ("release: SkillSpector 2.12.0 (#550)"). Scaricato il 2026-10-20 con `git clone --branch v2.12.0`
  e copiato con `git archive`, quindi contenuto identico al tag.
- **Esclusa la cartella `tests/`** (175 file, ~3,5 MB): sono fixture di skill volutamente malevole usate
  dai test automatici di SkillSpector. Non servono per usare lo strumento e non hanno senso dentro il
  repo del gioco. Tutto il resto (`src/`, `docs/`, `skills/`, `uv.lock`, licenze) è completo.
- **Requisiti:** Python ≥ 3.12 (< 3.15) e `uv`.
- **Installazione sul PC**, dalla copia locale:
  ```
  uv tool install "C:\Users\giaco\Desktop\Lavoro\Worldoom\Strumenti esterni\SkillSpector-2.12.0"
  ```
  oppure dal repository ufficiale, stessa versione:
  ```
  uv tool install git+https://github.com/NVIDIA/skillspector.git@v2.12.0
  ```
  In entrambi i casi `uv` scarica le dipendenze Python da PyPI. Verifica: `skillspector --version`.
- **Uso base:** `skillspector scan <cartella-skill> --no-llm` (solo analisi statica, nessuna chiave API).
  Riferimento completo in `SkillSpector-2.12.0/README.md`.
- **Stato:** nella sessione cloud del 2026-10-20 l'installazione **non** è stata verificata, perché da
  lì PyPI non è raggiungibile. Da verificare sul PC.

## Skill `skill-inspector` — NVIDIA

- **Installata in** `00 Worldloom - Claude Code - work space/.claude/skills/skill-inspector/SKILL.md`,
  copia byte-identica di `SkillSpector-2.12.0/skills/skill-inspector/SKILL.md` (stesso tag;
  sha256 `89ab1550…aa84`).
- **Cosa fa:** procedura per Claude per valutare una skill prima di installarla: lancia
  `skillspector scan … --no-llm`, legge il report, revisiona il sorgente e dà un verdetto
  `APPROVE` / `CAUTION` / `REJECT`. Se il CLI `skillspector` manca, lo dichiara e procede con la sola
  revisione manuale.
- Testo originale in inglese, lasciato invariato. Si aggiorna sostituendolo con la versione del tag nuovo.
