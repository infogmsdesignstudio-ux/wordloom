import { useMemo, useRef, useState } from "react";
import { getMazziIndex, getCatalogoUniversale, getSfondiCampoDisponibili, getImmagineCarta } from "../data/useMazzi.js";
import { COLORE_ARCHETIPO } from "./LancioDado.jsx";
import {
  elencaMazziSalvati,
  ottieniMazzo,
  creaMazzoVuoto,
  salvaMazzo,
  eliminaMazzo,
  duplicaMazzo,
  validaMazzo,
  limiteCopieCarta,
  esportaMazzo,
  esportaTuttiIMazzi,
  importaMazzi,
  WORLDLOOM_MIN,
  WORLDLOOM_MAX,
  IMPREVISTI_MIN,
} from "../game/mazziSalvati.js";
import { statisticheMazzo } from "../game/statistiche.js";

const mazzi = getMazziIndex().filter((m) => m.disponibile);
// Etichetta breve per il badge "Mondo" sulla riga di una carta — il nome completo (es. "Frost Land
// - Primitivi del ghiaccio") è troppo lungo per un badge, si usa solo la parte prima del trattino.
const NOME_MONDO_BREVE = Object.fromEntries(mazzi.map((m) => [m.id, m.nome.split(" - ")[0]]));

const NOME_TIPO = { pedina: "Pedine", magia: "Magie", trappola: "Trappole" };

function contaTotale(mappa) {
  return Object.values(mappa).reduce((tot, q) => tot + (q || 0), 0);
}

// Ogni riga porta SIA l'identita' (chiave vera, distingue Normale da Rainbow) SIA il nome: il nome
// serve ai messaggi di errore leggibili e all'icona del mazzo, che e' scelta per nome carta.
function listaDaMappa(mappa, carte) {
  const perChiave = new Map((carte ?? []).map((c) => [c.id ?? c.nome, c]));
  return Object.entries(mappa)
    .filter(([, q]) => q > 0)
    .map(([id, quantita]) => ({ id, nome: perChiave.get(id)?.nome ?? id, quantita }));
}

// Le righe di un mazzo salvato sono indicizzate per IDENTITA' della carta (nome + variante +
// rarita' + finitura). I mazzi salvati PRIMA di questa modifica hanno solo `nome`: si continua ad
// accettarli come chiave, cosi' nessun mazzo gia' costruito si svuota.
function mappaDaLista(lista) {
  const m = {};
  (lista ?? []).forEach((r) => {
    m[r.id ?? r.nome] = r.quantita;
  });
  return m;
}
function chiaveCarta(carta) {
  return carta.id ?? carta.nome;
}

// Stepper di quantità riusato sia per il Worldloom sia per gli Imprevisti.
function Stepper({ quantita, limite, onCambia }) {
  return (
    <div className="editor-mazzi-stepper">
      <button type="button" disabled={quantita <= 0} onClick={() => onCambia(quantita - 1)}>
        −
      </button>
      <span>
        {quantita} / {limite}
      </span>
      <button type="button" disabled={quantita >= limite} onClick={() => onCambia(quantita + 1)}>
        +
      </button>
    </div>
  );
}

function RigaCarta({ carta, tipoMazzetto, quantita, onCambia }) {
  const limite = limiteCopieCarta(carta, tipoMazzetto);
  const coloreArchetipo = carta.archetipo ? COLORE_ARCHETIPO[carta.archetipo] : null;
  // "Comune" quando la carta esiste identica in più mondi (cap. editor mazzi "lista unica") — vedi
  // getCatalogoUniversale, che deduplica per nome verificando che i dati coincidano davvero.
  const etichettaMondo = (carta.mondi ?? []).map((id) => NOME_MONDO_BREVE[id] ?? id).join(" + ");
  // Miniatura della Complete card prima del nome (cap. richiesta utente 2026-08-28): getImmagineCarta
  // non richiede più il mazzoId esatto (fallback cross-mondo, cap. editor mazzi "lista unica").
  const immagine = getImmagineCarta(carta.mondi?.[0], carta.nome);
  return (
    <div className={`editor-mazzi-riga ${limite <= 0 ? "editor-mazzi-riga-bandita" : ""}`}>
      <div className="editor-mazzi-riga-sx">
        {immagine && <img className="editor-mazzi-riga-mini" src={immagine} alt="" />}
        <div className="editor-mazzi-riga-info">
          <span className="editor-mazzi-riga-nome">{carta.nome}</span>
          <div className="editor-mazzi-riga-badge">
          {etichettaMondo && <span className="editor-mazzi-badge editor-mazzi-badge-mondo">{etichettaMondo}</span>}
          {carta.archetipo && (
            <span className="editor-mazzi-badge" style={{ borderColor: coloreArchetipo, color: coloreArchetipo }}>
              {carta.archetipo}
            </span>
          )}
          {carta.ruolo && <span className="editor-mazzi-badge">{carta.ruolo}</span>}
          {carta.livello && <span className="editor-mazzi-badge">Lv.{carta.livello}</span>}
            {tipoMazzetto === "worldloom" && carta.vita != null && (
              <span className="editor-mazzi-stat">❤{carta.vita} ⚔{carta.attacco} 🛡{carta.parata}</span>
            )}
          </div>
        </div>
      </div>
      {limite <= 0 ? (
        <span className="editor-mazzi-bandita-label">Bandita</span>
      ) : (
        <Stepper quantita={quantita || 0} limite={limite} onCambia={onCambia} />
      )}
    </div>
  );
}

// Filtri richiesti esplicitamente dall'utente: Mondo (Frost Land/Kepler-452B — quale mazzo fisico
// contiene la carta), Archetipo (Viandante/Assalitore/Effimeri/Colosso/Tessitore — i cinque
// Archetipi di combattimento, indipendenti dal Mondo), Ruolo, Tipo. Una carta "Comune" (presente in
// più mondi) soddisfa il filtro Mondo per ciascuno dei mondi in cui compare.
function SezioneWorldloom({ cardsData, quantitaWorldloom, setQuantitaWorldloom }) {
  const [filtroTipo, setFiltroTipo] = useState("tutti");
  const [filtroMondo, setFiltroMondo] = useState("tutti");
  const [filtroArchetipo, setFiltroArchetipo] = useState("tutti");
  const [filtroRuolo, setFiltroRuolo] = useState("tutti");

  const archetipiPresenti = useMemo(
    () => Object.keys(COLORE_ARCHETIPO).filter((a) => cardsData.carte.some((c) => c.archetipo === a)),
    [cardsData]
  );
  const ruoliPresenti = useMemo(
    () => [...new Set(cardsData.carte.filter((c) => c.ruolo).map((c) => c.ruolo))].sort(),
    [cardsData]
  );

  function passaFiltri(carta) {
    if (filtroTipo !== "tutti" && carta.tipoCarta !== filtroTipo) return false;
    if (filtroMondo !== "tutti" && !(carta.mondi ?? []).includes(filtroMondo)) return false;
    if (filtroArchetipo !== "tutti" && carta.tipoCarta === "pedina" && carta.archetipo !== filtroArchetipo) return false;
    if (filtroRuolo !== "tutti" && carta.tipoCarta === "pedina" && carta.ruolo !== filtroRuolo) return false;
    return true;
  }

  const carteFiltrate = cardsData.carte.filter(passaFiltri);
  const gruppi = ["pedina", "magia", "trappola"]
    .map((tipo) => ({ tipo, carte: carteFiltrate.filter((c) => c.tipoCarta === tipo) }))
    .filter((g) => g.carte.length > 0);

  function cambiaQuantita(chiave, valore) {
    setQuantitaWorldloom((prev) => ({ ...prev, [chiave]: valore }));
  }

  return (
    <div>
      <div className="editor-mazzi-filtri">
        <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}>
          <option value="tutti">Tutti i tipi</option>
          <option value="pedina">Pedine</option>
          <option value="magia">Magie</option>
          <option value="trappola">Trappole</option>
        </select>
        <select value={filtroMondo} onChange={(e) => setFiltroMondo(e.target.value)}>
          <option value="tutti">Tutti i Mondi</option>
          {mazzi.map((m) => (
            <option key={m.id} value={m.id}>
              {NOME_MONDO_BREVE[m.id]}
            </option>
          ))}
        </select>
        <select value={filtroArchetipo} onChange={(e) => setFiltroArchetipo(e.target.value)}>
          <option value="tutti">Tutti gli Archetipi</option>
          {archetipiPresenti.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <select value={filtroRuolo} onChange={(e) => setFiltroRuolo(e.target.value)}>
          <option value="tutti">Tutti i Ruoli</option>
          {ruoliPresenti.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>
      {gruppi.map((g) => (
        <div key={g.tipo} className="editor-mazzi-gruppo">
          <h4>{NOME_TIPO[g.tipo]}</h4>
          {g.carte.map((carta) => (
            <RigaCarta
              key={carta.nome}
              carta={carta}
              tipoMazzetto="worldloom"
              quantita={quantitaWorldloom[chiaveCarta(carta)]}
              onCambia={(v) => cambiaQuantita(chiaveCarta(carta), v)}
            />
          ))}
        </div>
      ))}
      {gruppi.length === 0 && <p className="editor-mazzi-vuoto">Nessuna carta corrisponde ai filtri scelti.</p>}
    </div>
  );
}

function SezioneImprevisti({ cardsData, quantitaImprevisti, setQuantitaImprevisti }) {
  function cambiaQuantita(chiave, valore) {
    setQuantitaImprevisti((prev) => ({ ...prev, [chiave]: valore }));
  }
  return (
    <div className="editor-mazzi-gruppo">
      {(cardsData.imprevisti ?? []).map((carta) => (
        <RigaCarta
          key={carta.nome}
          carta={carta}
          tipoMazzetto="imprevisti"
          quantita={quantitaImprevisti[chiaveCarta(carta)]}
          onCambia={(v) => cambiaQuantita(chiaveCarta(carta), v)}
        />
      ))}
    </div>
  );
}

// Galleria di sfondi campo di battaglia (cap. editor mazzi, richiesta esplicita dell'utente): scelta
// libera, non vincolata al mondo delle carte del mazzo (coerente con i mazzi misti). "Nessuno" lascia
// lo sfondo stellato predefinito di oggi. Il campo di battaglia in partita è diviso in due metà — ogni
// metà mostra lo sfondo del mazzo di chi la occupa (confermato dall'utente), non un unico sfondo
// condiviso.
function SezioneSfondoCampo({ sfondoCampo, setSfondoCampo }) {
  const disponibili = useMemo(() => getSfondiCampoDisponibili(), []);

  return (
    <div className="editor-mazzi-sfondi">
      <p className="editor-mazzi-sfondi-nota">
        Sfondo mostrato nella tua metà del campo di battaglia quando giochi con questo mazzo. Libero, non deve
        corrispondere al mondo delle carte scelte.
      </p>
      <div className="editor-mazzi-sfondi-griglia">
        <button
          type="button"
          className={`editor-mazzi-sfondo-miniatura ${!sfondoCampo ? "selezionata" : ""}`}
          onClick={() => setSfondoCampo(null)}
        >
          <div className="editor-mazzi-sfondo-nessuno">—</div>
          <span>Nessuno (predefinito)</span>
        </button>
        {disponibili.map((s) => {
          const selezionata = sfondoCampo?.mazzoId === s.mazzoId && sfondoCampo?.file === s.file;
          return (
            <button
              key={`${s.mazzoId}/${s.file}`}
              type="button"
              className={`editor-mazzi-sfondo-miniatura ${selezionata ? "selezionata" : ""}`}
              onClick={() => setSfondoCampo({ mazzoId: s.mazzoId, file: s.file })}
              title={`${s.nomeMondo} — ${s.file}`}
            >
              <img src={s.url} alt={s.file} />
              <span>{s.file.replace(/\.[^.]+$/, "").replaceAll("-", " ")}</span>
            </button>
          );
        })}
        {disponibili.length === 0 && (
          <p className="editor-mazzi-sfondi-vuoto">
            Nessuna immagine disponibile ancora — aggiungine dentro "Mazzi/&lt;Mondo&gt;/Sfondo Campo/" e rilancia il
            build.
          </p>
        )}
      </div>
    </div>
  );
}

// Scegli icona mazzo (cap. richiesta utente 2026-08-28): una carta TRA QUELLE nel Worldloom del
// mazzo — la sua miniatura diventa l'icona (lista editor + selettore schermata iniziale).
function SezioneIcona({ cardsData, quantitaWorldloom, icona, setIcona }) {
  const carteNelMazzo = (cardsData.carte ?? []).filter((c) => (quantitaWorldloom[chiaveCarta(c)] ?? 0) > 0);
  return (
    <div className="editor-mazzi-icone">
      <p className="editor-mazzi-sfondi-nota">Scegli una carta del Worldloom: la sua miniatura è l'icona del mazzo.</p>
      {carteNelMazzo.length === 0 ? (
        <p className="editor-mazzi-sfondi-vuoto">Aggiungi prima delle carte al Worldloom.</p>
      ) : (
        <div className="editor-mazzi-icone-griglia">
          <button
            type="button"
            className={`editor-mazzi-icona-scelta ${!icona ? "selezionata" : ""}`}
            onClick={() => setIcona(null)}
          >
            <div className="editor-mazzi-sfondo-nessuno">—</div>
            <span>Nessuna</span>
          </button>
          {carteNelMazzo.map((c) => {
            const img = getImmagineCarta(c.mondi?.[0], c.nome);
            return (
              <button
                key={c.nome}
                type="button"
                className={`editor-mazzi-icona-scelta ${icona === c.nome ? "selezionata" : ""}`}
                onClick={() => setIcona(c.nome)}
                title={c.nome}
              >
                {img ? <img src={img} alt={c.nome} /> : <span>{c.nome}</span>}
                <span>{c.nome}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Editor di un singolo mazzo salvato (o nuovo): filtri + stepper di quantità, cap. richiesta utente
// "una sola lista con tutte le carte, i mazzi possono mescolare mondi e Archetipi liberamente" —
// cardsData è sempre il catalogo universale (tutte le carte di tutti i mondi), non più un solo mondo.
function EditorMazzoSingolo({ mazzoId, onChiudi }) {
  const cardsData = useMemo(() => getCatalogoUniversale(), []);
  const mazzoIniziale = mazzoId ? ottieniMazzo(mazzoId) : creaMazzoVuoto();
  const [nome, setNome] = useState(mazzoIniziale.nome);
  const [tab, setTab] = useState("worldloom"); // "worldloom" | "imprevisti" | "sfondo" | "icona"
  const [quantitaWorldloom, setQuantitaWorldloom] = useState(() => mappaDaLista(mazzoIniziale.worldloom));
  const [quantitaImprevisti, setQuantitaImprevisti] = useState(() => mappaDaLista(mazzoIniziale.imprevisti));
  const [sfondoCampo, setSfondoCampo] = useState(mazzoIniziale.sfondoCampo ?? null);
  const [icona, setIcona] = useState(mazzoIniziale.icona ?? null);
  const [erroriSalvataggio, setErroriSalvataggio] = useState([]);

  // Persistenza immediata dell'icona (richiesta esplicita utente 2026-08-28): appena scelta, l'icona
  // si salva da sola sul mazzo in archivio senza aspettare il bottone "Salva mazzo". Scrivo SOLO il
  // campo icona, senza toccare worldloom/imprevisti (che possono avere modifiche non ancora validate).
  // Un mazzo nuovo non ancora salvato non ha mazzoId: lì l'icona parte insieme al resto al primo salva.
  function applicaIcona(nuovaIcona) {
    setIcona(nuovaIcona);
    if (!mazzoId) return;
    const salvato = ottieniMazzo(mazzoId);
    if (salvato) salvaMazzo({ ...salvato, icona: nuovaIcona });
  }

  const totaleWorldloom = contaTotale(quantitaWorldloom);
  const totaleImprevisti = contaTotale(quantitaImprevisti);
  const worldloomOk = totaleWorldloom >= WORLDLOOM_MIN && totaleWorldloom <= WORLDLOOM_MAX;
  const imprevistiOk = totaleImprevisti >= IMPREVISTI_MIN;

  function salva() {
    const worldloom = listaDaMappa(quantitaWorldloom, cardsData.carte);
    const imprevisti = listaDaMappa(quantitaImprevisti, cardsData.imprevisti);
    const risultato = validaMazzo(cardsData, { worldloom, imprevisti });
    if (!risultato.valido) {
      setErroriSalvataggio(risultato.errori);
      return;
    }
    // Se l'icona scelta non è più nel Worldloom (carta rimossa dopo la scelta), la scarto.
    const iconaValida = icona && worldloom.some((v) => v.nome === icona) ? icona : null;
    salvaMazzo({ ...mazzoIniziale, nome: nome.trim() || "Mazzo senza nome", worldloom, imprevisti, sfondoCampo, icona: iconaValida });
    onChiudi();
  }

  return (
    <div className="editor-mazzi-schermo">
      <div className="editor-mazzi-header">
        <input
          className="editor-mazzi-nome-input"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Nome del mazzo"
        />
        <div className="editor-mazzi-contatori">
          <span className={worldloomOk ? "editor-mazzi-ok" : "editor-mazzi-no"}>
            Worldloom: {totaleWorldloom} / {WORLDLOOM_MIN}-{WORLDLOOM_MAX}
          </span>
          <span className={imprevistiOk ? "editor-mazzi-ok" : "editor-mazzi-no"}>
            Imprevisti: {totaleImprevisti} (min {IMPREVISTI_MIN})
          </span>
        </div>
      </div>

      <div className="editor-mazzi-tabs">
        <button type="button" className={tab === "worldloom" ? "attiva" : ""} onClick={() => setTab("worldloom")}>
          Worldloom
        </button>
        <button type="button" className={tab === "imprevisti" ? "attiva" : ""} onClick={() => setTab("imprevisti")}>
          Imprevisti
        </button>
        <button type="button" className={tab === "sfondo" ? "attiva" : ""} onClick={() => setTab("sfondo")}>
          Sfondo Campo
        </button>
        <button type="button" className={tab === "icona" ? "attiva" : ""} onClick={() => setTab("icona")}>
          Icona
        </button>
      </div>

      <div className="editor-mazzi-corpo">
        {tab === "worldloom" && (
          <SezioneWorldloom cardsData={cardsData} quantitaWorldloom={quantitaWorldloom} setQuantitaWorldloom={setQuantitaWorldloom} />
        )}
        {tab === "imprevisti" && (
          <SezioneImprevisti cardsData={cardsData} quantitaImprevisti={quantitaImprevisti} setQuantitaImprevisti={setQuantitaImprevisti} />
        )}
        {tab === "sfondo" && <SezioneSfondoCampo sfondoCampo={sfondoCampo} setSfondoCampo={setSfondoCampo} />}
        {tab === "icona" && <SezioneIcona cardsData={cardsData} quantitaWorldloom={quantitaWorldloom} icona={icona} setIcona={applicaIcona} />}
      </div>

      {erroriSalvataggio.length > 0 && (
        <div className="editor-mazzi-errori">
          {erroriSalvataggio.map((e, i) => (
            <div key={i}>{e}</div>
          ))}
        </div>
      )}

      <div className="editor-mazzi-azioni">
        <button type="button" onClick={onChiudi}>
          Annulla
        </button>
        <button type="button" className="editor-mazzi-btn-salva" onClick={salva}>
          Salva mazzo
        </button>
      </div>
    </div>
  );
}

// Cap. X.1 — scarica un oggetto come file .json (Blob, nessun server; funziona anche in GIOCA.html).
function scaricaJson(nomeFile, oggetto) {
  const blob = new Blob([JSON.stringify(oggetto, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nomeFile;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function slugFile(s) {
  return (
    (s || "mazzo")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "mazzo"
  );
}

// Elenco di TUTTI i mazzi salvati (non più diviso per mondo) — punto d'ingresso dell'editor.
export default function EditorMazzi({ onChiudi }) {
  const [mazzoInModifica, setMazzoInModifica] = useState(undefined); // undefined = lista, null = nuovo, id = modifica
  const [, forzaRilettura] = useState(0);
  const inputFileRef = useRef(null);
  // Conferma eliminazione in-linea (per riga): niente più confirm() nativo — dopo qualche alert()
  // il browser offre "impedisci a questo sito altre finestre di dialogo" e da lì confirm() torna
  // sempre false => "il tasto Elimina non fa niente" (bug segnalato dal vivo 2026-08-28).
  const [confermaElimina, setConfermaElimina] = useState(null); // id del mazzo in attesa di conferma
  const [messaggio, setMessaggio] = useState(null); // avviso in-linea (import) al posto di alert()

  const gestisciImport = (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // permette di re-importare lo stesso file di seguito
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      let oggetto = null;
      try {
        oggetto = JSON.parse(reader.result);
      } catch {
        oggetto = null;
      }
      const esito = importaMazzi(oggetto);
      if (!esito) {
        setMessaggio("File non valido: non è un mazzo Worldloom esportato da qui.");
        return;
      }
      forzaRilettura((n) => n + 1);
      setMessaggio(
        esito.importati === 1 ? `Mazzo importato: "${esito.nomi[0]}".` : `${esito.importati} mazzi importati.`
      );
    };
    reader.readAsText(file);
  };

  if (mazzoInModifica !== undefined) {
    return (
      <EditorMazzoSingolo
        mazzoId={mazzoInModifica}
        onChiudi={() => {
          setMazzoInModifica(undefined);
          forzaRilettura((n) => n + 1);
        }}
      />
    );
  }

  const cardsData = getCatalogoUniversale();
  const mazziSalvati = elencaMazziSalvati();

  return (
    <div className="editor-mazzi-schermo">
      <div className="editor-mazzi-header">
        <h2>Editor Mazzi</h2>
      </div>

      {messaggio && (
        <p className="editor-mazzi-messaggio" onClick={() => setMessaggio(null)}>
          {messaggio}
        </p>
      )}

      <div className="editor-mazzi-lista">
        {mazziSalvati.length === 0 && <p className="editor-mazzi-vuoto">Nessun mazzo personalizzato ancora.</p>}
        {mazziSalvati.map((m) => {
          const risultato = validaMazzo(cardsData, m);
          // Cap. sistema di salvataggio: chiave statistiche = id del mazzo, stessa identica
          // chiave scritta da identitaMazzo() in App.jsx al momento di iniziare una partita.
          const stat = statisticheMazzo(m.id);
          const iconaImg = m.icona ? getImmagineCarta(undefined, m.icona) : null;
          return (
            <div key={m.id} className="editor-mazzi-riga-mazzo">
              <div className="editor-mazzi-riga-sx">
                {iconaImg && <img className="editor-mazzi-riga-mazzo-icona" src={iconaImg} alt="" />}
                <div>
                  <span className="editor-mazzi-riga-nome">{m.nome}</span>{" "}
                  <span className={risultato.valido ? "editor-mazzi-ok" : "editor-mazzi-no"}>
                    {risultato.valido ? "valido" : "da correggere"}
                  </span>
                  <div className="editor-mazzi-riga-mazzo-totali">
                    Worldloom {risultato.totaleWorldloom} · Imprevisti {risultato.totaleImprevisti}
                  </div>
                  {stat && (
                    <div className="editor-mazzi-riga-mazzo-stat">
                      {stat.vittorie} vittorie · {stat.sconfitte} sconfitte ({stat.partite} partite)
                    </div>
                  )}
                </div>
              </div>
              <div className="editor-mazzi-riga-mazzo-azioni">
                <button type="button" onClick={() => setMazzoInModifica(m.id)}>
                  Modifica
                </button>
                <button
                  type="button"
                  onClick={() => {
                    duplicaMazzo(m.id);
                    forzaRilettura((n) => n + 1);
                  }}
                >
                  Duplica
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const dati = esportaMazzo(m.id);
                    if (dati) scaricaJson(`${slugFile(m.nome)}.json`, dati);
                  }}
                >
                  Esporta
                </button>
                {confermaElimina === m.id ? (
                  <>
                    <button
                      type="button"
                      className="editor-mazzi-btn-elimina-conferma"
                      onClick={() => {
                        eliminaMazzo(m.id);
                        setConfermaElimina(null);
                        forzaRilettura((n) => n + 1);
                      }}
                    >
                      Conferma
                    </button>
                    <button type="button" onClick={() => setConfermaElimina(null)}>
                      Annulla
                    </button>
                  </>
                ) : (
                  <button type="button" onClick={() => setConfermaElimina(m.id)}>
                    Elimina
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="editor-mazzi-azioni">
        <button type="button" onClick={onChiudi}>
          Torna al menu
        </button>
        {/* Cap. X.1: importa/esporta su file .json — un backup su disco dei mazzi (che altrimenti
            vivono solo in localStorage). Funziona anche in GIOCA.html, nessun server. */}
        <input
          ref={inputFileRef}
          type="file"
          accept="application/json,.json"
          style={{ display: "none" }}
          onChange={gestisciImport}
        />
        <button type="button" onClick={() => inputFileRef.current?.click()}>
          Importa mazzo
        </button>
        {mazziSalvati.length > 0 && (
          <button type="button" onClick={() => scaricaJson("worldloom-mazzi.json", esportaTuttiIMazzi())}>
            Esporta tutti
          </button>
        )}
        <button type="button" className="editor-mazzi-btn-salva" onClick={() => setMazzoInModifica(null)}>
          Nuovo mazzo
        </button>
      </div>
    </div>
  );
}
