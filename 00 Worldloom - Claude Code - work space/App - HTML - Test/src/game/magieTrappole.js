import { creaCreatura, viva, vitaAttuale, attaccoEffettivo } from "./mazzo.js";
import { campoDi, ripulisciCampo, avanzamentoAmbiguo } from "./giocatore.js";
import { classificaSottotipoMagia } from "./effetti/tipiMagia.js";

// Stessa regola di sistemaPrimaLinea in gameReducer.js (non importabile da qui: creerebbe un
// import circolare) — usata dopo le uccisioni causate da una Magia, per rispettare l'avanzamento
// obbligatorio in prima linea anche fuori dal combattimento diretto (cap. 4).
function sistemaPrimaLineaDopoMagia(stato, giocatore, log) {
  if (!avanzamentoAmbiguo(giocatore)) return;
  const chiave = giocatore === stato.giocatori.io ? "io" : "avversario";
  if (chiave === "io") {
    stato.avanzamentoRichiesto = "io";
    return;
  }
  let migliore = giocatore.retrovia[0];
  giocatore.retrovia.forEach((c) => {
    if (vitaAttuale(c) > vitaAttuale(migliore)) migliore = c;
  });
  const i = giocatore.retrovia.indexOf(migliore);
  giocatore.retrovia.splice(i, 1);
  giocatore.primaLinea.push(migliore);
  log(`↕ L'avversario fa avanzare ${migliore.nome} in prima linea`);
}

/* ===================== MAGIE (cap. 14) =====================
   Non hanno costo: il freno è nel testo. Le Normali si giocano solo in Fase 3
   del proprio turno; i Terreni occupano lo slot condiviso e sostituiscono il precedente. */

// Alcune magie chiedono un bersaglio prima di risolversi.
export function magiaRichiedeBersaglio(carta) {
  const c = carta.effetto?.codice ?? "";
  if (classificaSottotipoMagia(carta) === "potenziamento") return "alleato";
  if (c === "potestremo") return "alleato";
  if (c === "kill" || c === "stun" || c === "distrsoff") return "nemico";
  return null;
}

// Quante creature bisogna scegliere come bersaglio (cap. bug segnalato dall'utente: "Distruzione
// Sofferta" sceglieva da sola i 2 nemici invece di lasciarli scegliere). Di default 1 (tutte le altre
// Magie mirate); "distrsoff" è l'unica che ne richiede 2 — il proprio sacrificio resta invece sempre
// automatico (la propria creatura con Attacco più alto), l'utente ha confermato che va bene così.
export function numeroBersagliMagia(carta) {
  const c = carta.effetto?.codice ?? "";
  if (c === "distrsoff") return 2;
  return 1;
}

export function magiaGiocabile(carta, giocatore, avversario) {
  const c = carta.effetto?.codice ?? "";
  if (classificaSottotipoMagia(carta) === "potenziamento") return campoDi(giocatore).filter(viva).length > 0;
  if (c === "potestremo") return campoDi(giocatore).filter(viva).length > 0;
  if (c === "distrsoff") return campoDi(giocatore).filter(viva).length > 0 && campoDi(avversario).filter(viva).length > 0;
  if (c === "cullamondo") return giocatore.primaLinea.length < 3 || giocatore.retrovia.length < 2;
  if (c === "ecogelo") return !!giocatore.ultimaMagiaCodice;
  if (c === "mass_atk") return campoDi(giocatore).filter(viva).length > 0;
  // "alieno" e' il vecchio nome del tipo (rinominato in "pedina" il 2026-08-29): entrambi accettati,
  // i salvataggi gia' fatti contengono ancora il vecchio. Controllo duplicato qui invece di importarlo
  // da evocazione.js, come per sistemaPrimaLineaDopoMagia: questo file non tira dentro altri moduli.
  if (c === "revive") return giocatore.cimitero.some((x) => ["pedina", "alieno", undefined].includes(x.tipoCarta) || x.vitaMax);
  if (c === "kill") return campoDi(avversario).filter(viva).length > 0 && campoDi(giocatore).filter(viva).length > 0;
  if (c === "stun") return campoDi(avversario).filter(viva).length > 0;
  return true; // terreni e resto
}

// Stesso pop-up di attivazione già usato per Trappole/effetti creatura (registraNotificaEffetto in
// gameReducer.js, non importabile da qui: stesso motivo dell'import circolare di sopra) — duplicata
// qui la stessa identica logica di accodamento in coda visiva.
function registraNotificaEffettoMagia(stato, titolo, testo, chiave, nomeCarta) {
  const id = (stato.prossimoIdVisivo ?? 1) + 0;
  stato.prossimoIdVisivo = id + 1;
  stato.codaVisiva?.push({ evento: "notifica", dati: { id, titolo, testo: testo ?? "", chiave, nomeCarta } });
}

// Risolve la magia vera e propria. Avvolta dall'export giocaMagia sotto, che aggiunge la notifica di
// attivazione solo quando l'effetto si applica davvero (ritorna true) — tenerle separate evita di
// dover aggiungere la notifica ad ogni singolo "return true" sparso nei rami sotto.
function risolviMagia(carta, giocatore, avversario, bersaglio, stato, log, bersagli) {
  const codice = carta.effetto?.codice ?? "";
  if (codice && codice !== "ecogelo") {
    giocatore.ultimaMagiaCodice = codice;
    // Nome vero della carta ripetuta (cap. richiesta utente 2026-08-13, pop-up con illustrazione):
    // senza questo, "Eco del Gelo" costruiva un finto oggetto chiamato "Eco del Gelo (eco)" invece del
    // vero nome (es. "Culla del Mondo"), mostrando due volte lo stesso titolo/illustrazione invece di
    // rivelare QUALE effetto è stato ripetuto.
    giocatore.ultimaMagiaNome = carta.nome;
  }

  if (classificaSottotipoMagia(carta) === "potenziamento") {
    const [, atk, par] = codice.split("_").map(Number);
    if (!bersaglio) return false;
    bersaglio.attaccoBase += atk;
    bersaglio.parataBase += par;
    log(`✨ ${carta.nome} su ${bersaglio.nome}: +${atk}⚔${par ? ` +${par}🛡` : ""}`);
    return true;
  }

  if (codice === "mass_atk") {
    campoDi(giocatore)
      .filter(viva)
      .forEach((c) => (c.tmpAttacco += 3));
    log(`✨ ${carta.nome}: tutte le tue Pedine +3 Attacco fino a fine turno`);
    return true;
  }

  if (codice === "kill") {
    if (!bersaglio) return false;
    const mieAtk = campoDi(giocatore).filter(viva).map((c) => attaccoEffettivo(c));
    const soglia = Math.floor(Math.max(0, ...mieAtk) / 2);
    if (attaccoEffettivo(bersaglio) > soglia) {
      log(`✨ ${carta.nome}: bersaglio non valido (serve Attacco ≤ ${soglia})`);
      return false;
    }
    bersaglio.danno = bersaglio.vitaMax;
    log(`✨ ${carta.nome} distrugge ${bersaglio.nome}`);
    ripulisciCampo(avversario, log, giocatore);
    sistemaPrimaLineaDopoMagia(stato, avversario, log);
    return true;
  }

  if (codice === "stun") {
    if (!bersaglio) return false;
    bersaglio.stordito = 2; // salta il suo prossimo turno
    log(`✨ ${carta.nome}: ${bersaglio.nome} non potrà attaccare nel suo prossimo turno`);
    return true;
  }

  if (codice === "revive") {
    const i = giocatore.cimitero.findIndex((x) => x.vitaMax);
    if (i < 0) return false;
    const risorta = giocatore.cimitero.splice(i, 1)[0];
    if (giocatore.primaLinea.length >= 3 && giocatore.retrovia.length >= 2) {
      giocatore.cimitero.push(risorta);
      log(`✨ ${carta.nome}: campo pieno, impossibile rievocare`);
      return false;
    }
    risorta.danno = 0;
    risorta.attacchiUsati = 0;
    risorta.fresca = true;
    risorta.tmpAttacco = 0;
    risorta.tmpParata = 0;
    if (giocatore.primaLinea.length < 3) giocatore.primaLinea.push(risorta);
    else giocatore.retrovia.push(risorta);
    log(`✨ ${carta.nome}: ${risorta.nome} torna in campo`);
    return true;
  }

  if (codice === "cullamondo") {
    let creati = 0;
    for (let i = 0; i < 2 && (giocatore.primaLinea.length < 3 || giocatore.retrovia.length < 2); i++) {
      const pedina = creaCreatura({
        nome: "Pedina Goblin",
        archetipo: "Effimeri",
        livello: 1,
        ruolo: "bilanciato",
        vita: 5,
        attacco: 5,
        parata: 5,
        attacchi: 2,
        effetto: { tipo: "none", testo: "Pedina evocata.", codice: null },
      });
      if (giocatore.primaLinea.length < 3) giocatore.primaLinea.push(pedina);
      else giocatore.retrovia.push(pedina);
      creati += 1;
    }
    log(`✨ ${carta.nome}: evoca ${creati} pedina/e Goblin`);
    return creati > 0;
  }

  if (codice === "distrsoff") {
    const mie = campoDi(giocatore).filter(viva);
    if (!mie.length) return false;
    const sacrificio = mie.reduce((max, c) => (attaccoEffettivo(c) > attaccoEffettivo(max) ? c : max), mie[0]);
    sacrificio.danno = sacrificio.vitaMax;
    // I 2 bersagli nemici li sceglie chi gioca la carta (cap. bug segnalato dall'utente): "bersagli"
    // arriva già scelto da applicaBersaglioMagia in gameReducer.js. Il ripiego con Vita più bassa resta
    // solo per l'IA (eseguiFaseEvocaIA calcola un singolo bersaglio "di cortesia" che qui viene
    // ignorato — vedi nota lì — e passa sempre per questo ramo).
    const colpiti = bersagli && bersagli.length ? bersagli : campoDi(avversario).filter(viva).sort((a, b) => vitaAttuale(a) - vitaAttuale(b)).slice(0, 2);
    colpiti.forEach((c) => (c.danno = c.vitaMax));
    log(`✨ ${carta.nome}: sacrifica ${sacrificio.nome}, distrugge ${colpiti.map((c) => c.nome).join(", ") || "nessun bersaglio"}`);
    ripulisciCampo(giocatore, log, avversario);
    ripulisciCampo(avversario, log, giocatore);
    sistemaPrimaLineaDopoMagia(stato, giocatore, log);
    sistemaPrimaLineaDopoMagia(stato, avversario, log);
    return true;
  }

  if (codice === "ecogelo") {
    const ultimo = giocatore.ultimaMagiaCodice;
    if (!ultimo) {
      log(`✨ ${carta.nome}: nessun effetto da ripetere`);
      return false;
    }
    const finto = { nome: giocatore.ultimaMagiaNome ?? `${carta.nome} (eco)`, effetto: { codice: ultimo } };
    const ok = giocaMagia(finto, giocatore, avversario, null, stato, log);
    if (ok) log(`✨ ${carta.nome}: ripete l'ultimo effetto attivato`);
    return ok;
  }

  if (codice === "potestremo") {
    if (!bersaglio) return false;
    bersaglio.tmpAttacco += bersaglio.attaccoBase;
    bersaglio.tmpParata += bersaglio.parataBase;
    bersaglio.scartaAFineTurno = true;
    log(`✨ ${carta.nome}: ${bersaglio.nome} raddoppia Attacco e Parata fino a fine turno, poi va al cimitero`);
    return true;
  }

  if (codice.startsWith("terr_")) {
    // Slot Terreno personale (uno per giocatore, cap. 4): giocarne uno nuovo — tuo o
    // dell'avversario — distrugge quello attivo, da chiunque fosse stato piazzato.
    // L'effetto del Terreno attivo vale comunque per entrambi i giocatori.
    const proprietario = giocatore === stato.giocatori.io ? "io" : "avversario";
    stato.terreno = { nome: carta.nome, codice, testo: carta.effetto?.testo, proprietario, durata: carta.effetto?.durata ?? null };
    log(`🌍 TERRENO (${proprietario === "io" ? "tuo" : "avversario"}): ${carta.nome} — ${carta.effetto?.testo ?? ""}`);
    return true;
  }

  return false;
}

// Wrapper esportato: risolve la magia (risolviMagia sopra) e, solo se si è davvero attivata (true),
// accoda il pop-up di notifica con l'illustrazione — richiesta esplicita dell'utente 2026-08-13,
// "voglio vedere il pop-up anche quando attivo le mie carte". Copre anche "Eco del Gelo": essendo
// ricorsiva (risolviMagia chiama questo stesso export per il "finto" effetto ripetuto), l'utente vede
// prima la notifica dell'effetto ripetuto e poi quella di "Eco del Gelo" stessa che conferma la
// ripetizione — entrambe con la carta giusta, l'immagine dell'eco usa il nome ripulito del suffisso
// "(eco)" per trovare comunque l'illustrazione vera.
export function giocaMagia(carta, giocatore, avversario, bersaglio, stato, log, bersagli) {
  const ok = risolviMagia(carta, giocatore, avversario, bersaglio, stato, log, bersagli);
  if (ok) {
    const chiave = giocatore === stato.giocatori.io ? "io" : "avversario";
    const nomeImmagine = carta.nome.replace(/ \(eco\)$/, "");
    registraNotificaEffettoMagia(stato, `✨ ${carta.nome} attivata!`, carta.effetto?.testo, chiave, nomeImmagine);
  }
  return ok;
}

/* ===================== TERRENO: effetti sul combattimento ===================== */

// Nebbia di Marbion (Scudo -3) e Terreno Ribelle (Spada +3), validi per entrambi.
export function modificaDannoDaTerreno(terreno, simbolo, danno) {
  if (!terreno || danno <= 0) return danno;
  if (terreno.codice === "terr_scudo" && simbolo === "U") return Math.max(0, danno - 3);
  if (terreno.codice === "terr_spada" && simbolo === "S") return danno + 3;
  return danno;
}

// Marea di Marbion: annulla la protezione della retrovia per entrambi.
export function retrovieEsposteDaTerreno(terreno) {
  return terreno?.codice === "terr_marbion" || terreno?.codice === "terr_kepler";
}

/* ===================== TRAPPOLE (cap. 14) =====================
   Si piazzano coperte in Fase 3, diventano attivabili dal turno successivo,
   poi scattano in qualunque momento — anche nel turno avversario. */

// Eleggibilità generica per la catena di effetti (cap. catena.js): invece di una tabella fissa
// "contesto -> elenco di codici" (che andava riscritta a mano per ogni nuovo punto del gioco
// agganciato), ogni codice sa da solo a quale TIPO di evento risponde e a chi — controllato contro
// l'evento vero e proprio in cima alla pila, non contro un'etichetta di "momento". Questo permette a
// una Magia piazzata e a una Trappola di rispondersi a vicenda (condividono lo stesso spazio
// magieTrappole) e chiude strutturalmente la classe di bug già vista una volta (l'IA che si
// autodistruggeva con una propria Trappola "attaccoDichiarato" mentre attaccava): il controllo "chi
// può giocare questa carta" è dentro il predicato stesso, non affidato a un guard separato lato
// chiamante che si può dimenticare di ripetere in un nuovo punto.
const ELEGGIBILITA_RISPOSTA = {
  cancel: (evento, chiave) => evento?.tipo === "attaccoDichiarato" && chiave === evento.difProprietario,
  ambush: (evento, chiave) => evento?.tipo === "attaccoDichiarato" && chiave === evento.difProprietario,
  stopatk: (evento, chiave) => evento?.tipo === "attaccoDichiarato" && chiave === evento.difProprietario,
  cristallo: (evento, chiave) => evento?.tipo === "attaccoDichiarato" && chiave === evento.difProprietario,
  spezzavolonta: (evento, chiave) => evento?.tipo === "attaccoDichiarato" && chiave === evento.difProprietario,
  copiare: (evento, chiave) => evento?.tipo === "attaccoDichiarato" && chiave === evento.difProprietario,
  reroll: (evento, chiave) => evento?.tipo === "dopoTiro" && chiave === evento.difProprietario,
  mirror: (evento, chiave) => evento?.tipo === "dopoTiro" && chiave === evento.difProprietario,
  divine: (evento, chiave) => evento?.tipo === "attaccoDiretto" && chiave === evento.difProprietario,
  rifiutoterra: (evento, chiave) => evento?.tipo === "evocazione" && chiave !== evento.evocatore,
  ingannovinc: (evento, chiave) => evento?.tipo === "evocazione" && chiave !== evento.evocatore,
};

// Quali Magie/Trappole pronte di "giocatore" (chiave "io"/"avversario") sono una risposta legale
// all'evento corrente — sostituisce la vecchia trappoleDisponibili(giocatore, contesto).
export function carteEleggibiliPerRisposta(giocatore, chiave, evento) {
  return giocatore.magieTrappole.filter((mt) => {
    if (!mt.pronta) return false;
    const check = ELEGGIBILITA_RISPOSTA[mt.carta.effetto?.codice];
    return check ? check(evento, chiave) : false;
  });
}

export function scartaTrappola(giocatore, slot, log) {
  giocatore.magieTrappole = giocatore.magieTrappole.filter((x) => x !== slot);
  giocatore.cimitero.push(slot.carta);
  log(`🪤 ${slot.carta.nome} attivata!`);
}

// Risolve l'effetto di UNA trappola scattata sull'evocazione nemica, dopo che qualcuno ha
// scelto di attivarla (umano tramite prompt, IA tramite euristica) — Il Rifiuto della Terra
// e L'Inganno Vincente. Il piazzamento coperto/pronta è già stato tolto da scartaTrappola.
export function risolviTrappolaEvocazioneNemica(codice, nomeCarta, giocatoreConTrappole, avversarioCheHaEvocato, chiaveAvversario, creaturaEvocata, log) {
  if (codice === "rifiutoterra") {
    [...campoDi(giocatoreConTrappole), ...campoDi(avversarioCheHaEvocato)].filter(viva).forEach((c) => (c.danno = c.vitaMax));
    log(`🪤 ${nomeCarta}: distrugge tutte le Pedine sul terreno`);
    ripulisciCampo(giocatoreConTrappole, log, avversarioCheHaEvocato);
    ripulisciCampo(avversarioCheHaEvocato, log, giocatoreConTrappole);
    return;
  }

  // L'Inganno Vincente: controllo temporaneo per 2 turni, poi torna in automatico (vedi
  // restituisciControlloTemporaneo, chiamata a ogni fine turno in gameReducer.js).
  if (codice === "ingannovinc" && creaturaEvocata.livello === 1) {
    const iFront = avversarioCheHaEvocato.primaLinea.indexOf(creaturaEvocata);
    const iBack = avversarioCheHaEvocato.retrovia.indexOf(creaturaEvocata);
    const inCampo = iFront >= 0 || iBack >= 0;
    if (inCampo && (giocatoreConTrappole.primaLinea.length < 3 || giocatoreConTrappole.retrovia.length < 2)) {
      if (iFront >= 0) avversarioCheHaEvocato.primaLinea.splice(iFront, 1);
      else avversarioCheHaEvocato.retrovia.splice(iBack, 1);
      creaturaEvocata.controlloTemporaneo = { proprietarioOriginale: chiaveAvversario, turniRimanenti: 2 };
      if (giocatoreConTrappole.primaLinea.length < 3) giocatoreConTrappole.primaLinea.push(creaturaEvocata);
      else giocatoreConTrappole.retrovia.push(creaturaEvocata);
      log(`🪤 ${nomeCarta}: prende il controllo di ${creaturaEvocata.nome} per 2 turni`);
    }
  }
}

// A ogni fine turno (cap. 14): le creature sotto controllo temporaneo scontano un turno,
// e tornano dal proprietario originale quando arrivano a 0 (se trova posto in campo).
export function restituisciControlloTemporaneo(s, log) {
  ["io", "avversario"].forEach((chiave) => {
    const g = s.giocatori[chiave];
    campoDi(g)
      .filter((c) => c.controlloTemporaneo)
      .forEach((c) => {
        c.controlloTemporaneo.turniRimanenti -= 1;
        if (c.controlloTemporaneo.turniRimanenti > 0) return;
        const originale = s.giocatori[c.controlloTemporaneo.proprietarioOriginale];
        if (originale.primaLinea.length >= 3 && originale.retrovia.length >= 2) return; // niente posto: resta dov'è
        const iFront = g.primaLinea.indexOf(c);
        const iBack = g.retrovia.indexOf(c);
        if (iFront >= 0) g.primaLinea.splice(iFront, 1);
        else if (iBack >= 0) g.retrovia.splice(iBack, 1);
        else return;
        delete c.controlloTemporaneo;
        if (originale.primaLinea.length < 3) originale.primaLinea.push(c);
        else originale.retrovia.push(c);
        log(`🪤 ${c.nome}: il controllo temporaneo scade, torna al proprietario originale`);
      });
  });
}
