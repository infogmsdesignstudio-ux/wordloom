import { viva, vitaAttuale } from "./mazzo.js";
import { campoDi, pesca, ripulisciCampo, avanzamentoAmbiguo } from "./giocatore.js";
import { tiraDadoImprevisti } from "./costanti.js";

const MOVIMENTI_PER_ATTIVAZIONE = 4;

// Stessa regola di sistemaPrimaLinea in gameReducer.js (duplicata qui per evitare un import
// circolare) — usata dopo le uccisioni causate da un Imprevisto, per rispettare l'avanzamento
// obbligatorio in prima linea anche fuori dal combattimento diretto (cap. 4).
function sistemaPrimaLineaDopoImprevisto(stato, giocatore, log) {
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

// Fa avanzare il proprio Imprevisto in corso; quando arriva a 4 movimenti si risolve e si scarta,
// e i movimenti in eccesso passano alla carta successiva (cap. 15).
export function avanzaImprevisti(giocatore, avversario, movimenti, log, stato) {
  let residui = movimenti;
  let attivazioni = 0;

  while (residui > 0) {
    if (!giocatore.imprevistoInCorso) {
      const prossima = giocatore.mazzettoImprevisti.pop();
      if (!prossima) return attivazioni;
      giocatore.imprevistoInCorso = { carta: prossima, movimenti: 0 };
    }
    const inCorso = giocatore.imprevistoInCorso;
    const mancanti = MOVIMENTI_PER_ATTIVAZIONE - inCorso.movimenti;
    if (residui >= mancanti) {
      residui -= mancanti;
      log(`⚡ IMPREVISTO ATTIVATO: ${inCorso.carta.nome}`);
      log(`   ${inCorso.carta.effetto?.testo ?? ""}`);
      // Il nome non si legge finché non si attiva (cap. 15): solo ora, all'attivazione, si scopre.
      if (stato) {
        stato.messaggio = `⚡ Imprevisto attivato — ${inCorso.carta.nome}: ${inCorso.carta.effetto?.testo ?? ""}`;
        // Pop-up esplicito da chiudere a mano (non solo il messaggio/registro): prima l'utente non
        // aveva certezza su SE/QUANDO un Imprevisto fosse scattato.
        stato.notificaEffetto = {
          id: (stato.notificaEffetto?.id ?? 0) + 1,
          titolo: `⚡ Imprevisto attivato — ${inCorso.carta.nome}`,
          testo: inCorso.carta.effetto?.testo ?? "",
          chiave: giocatore === stato.giocatori.io ? "io" : "avversario",
          nomeCarta: inCorso.carta.nome,
        };
      }
      risolviImprevisto(inCorso.carta, giocatore, avversario, log, stato);
      // Cimitero del mazzetto Imprevisti (cap. 15 del regolamento, P3.2): la carta risolta si scopre e
      // va scartata qui invece di sparire — lo slot di avanzamento la mostra sotto la prossima carta.
      (giocatore.cimiteroImprevisti ??= []).push(inCorso.carta);
      giocatore.imprevistoInCorso = null;
      attivazioni++;
    } else {
      inCorso.movimenti += residui;
      residui = 0;
    }
  }
  return attivazioni;
}

// Gli Imprevisti valgono per ENTRAMBI i giocatori e non possono essere annullati (cap. 15).
function risolviImprevisto(carta, proprietario, avversario, log, stato) {
  const codice = carta.effetto?.codice;
  const entrambi = [proprietario, avversario];

  if (codice === "respiro") {
    entrambi.forEach((g) => (g.hp += 10));
    log("   ↑ Entrambi gli Strateghi +10 PV");
  }

  if (codice === "convergenza") {
    entrambi.forEach((g) => pesca(g, 1));
    log("   Entrambi pescano 1 carta");
  }

  if (codice === "riserve") {
    entrambi.forEach((g) => {
      while (g.mano.length < 6 && g.mazzo.length) pesca(g, 1);
    });
    log("   Entrambi pescano fino a 6 carte in mano");
  }

  if (codice === "effimeri") {
    entrambi.forEach((g) => {
      const altro = g === proprietario ? avversario : proprietario;
      campoDi(g)
        .filter((c) => c.archetipo === "Effimeri")
        .forEach((c) => (c.danno = c.vitaMax));
      ripulisciCampo(g, log, altro);
      if (stato) sistemaPrimaLineaDopoImprevisto(stato, g, log);
    });
    log("   Tutti gli Effimeri sono stati distrutti");
  }

  if (codice === "ombra") {
    entrambi.forEach((g) => {
      const tiro = tiraDadoImprevisti();
      if (tiro === 2 && g.mano.length) {
        const i = Math.floor(Math.random() * g.mano.length);
        const scartata = g.mano.splice(i, 1)[0];
        g.cimitero.push(scartata);
        log(`   tira +2 → scarta ${scartata.nome}`);
      }
    });
  }

  if (codice === "tempesta") {
    entrambi.forEach((g) => {
      const altro = g === proprietario ? avversario : proprietario;
      const campo = campoDi(g).filter(viva);
      if (!campo.length) return;
      const tiro = tiraDadoImprevisti();
      if (tiro === 1) {
        const t = campo.reduce((min, c) => (c.parataBase < min.parataBase ? c : min), campo[0]);
        t.parataBase += 3;
        log(`   tira +1 → ${t.nome} +3 Parata`);
      } else if (tiro === 2) {
        const t = campo.reduce((min, c) => (vitaAttuale(c) < vitaAttuale(min) ? c : min), campo[0]);
        t.danno = t.vitaMax;
        log(`   tira +2 → ${t.nome} distrutto`);
        ripulisciCampo(g, log, altro);
        if (stato) sistemaPrimaLineaDopoImprevisto(stato, g, log);
      }
    });
  }

  if (codice === "forte" || codice === "ribalta") {
    entrambi.forEach((g) => {
      const campo = campoDi(g).filter(viva);
      if (!campo.length) return;
      const alto = campo.reduce((max, c) => (c.attaccoBase > max.attaccoBase ? c : max), campo[0]);
      const basso = campo.reduce((min, c) => (c.attaccoBase < min.attaccoBase ? c : min), campo[0]);
      if (codice === "forte") {
        alto.tmpAttacco += 5;
        basso.tmpAttacco -= 5;
        log(`   ${alto.nome} +5⚔ / ${basso.nome} −5⚔`);
      } else {
        basso.tmpAttacco += 5;
        alto.tmpAttacco -= 5;
        log(`   ${basso.nome} +5⚔ / ${alto.nome} −5⚔`);
      }
    });
  }
}
