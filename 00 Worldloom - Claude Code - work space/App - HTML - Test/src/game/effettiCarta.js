import { creaCreatura, viva, vitaAttuale } from "./mazzo.js";
import { campoDi, pesca } from "./giocatore.js";
import { tiraDadoArchetipo } from "./costanti.js";

// Effetti unici delle singole carte, identificati dal "codice" scritto nell'Excel del mazzo.
// Sono raggruppati per momento di attivazione, come nel prototipo v1.9.

/* ---- PASSIVI: ricalcolati al volo, non modificano lo stato ---- */

export function bonusAttaccoPassivo(creatura, giocatore) {
  const codice = creatura.effetto?.codice;
  let bonus = 0;
  const campo = campoDi(giocatore).filter(viva);

  if (codice === "rossa") bonus += 2 * campo.filter((c) => c !== creatura && c.nome.includes("Manipolatrice")).length;
  if (codice === "verde") bonus += 3;
  if (codice === "midollo") bonus += Math.min(6, Math.floor(giocatore.cimitero.length / 2));
  if (codice === "lupo" && giocatore.primaLinea.filter(viva).length === 1) bonus += 4;
  // Custode del Ghiaccio: tutti gli ALTRI tuoi Colosso +3 Attacco e +3 Parata
  if (creatura.archetipo === "Colosso" && campo.some((c) => c !== creatura && c.effetto?.codice === "custode")) bonus += 3;
  // Draghetto Arcobaleno: +4 Attacco/Parata se in campo insieme a una Manipolatrice
  if (codice === "draghetto" && campo.some((c) => c !== creatura && c.nome.includes("Manipolatrice"))) bonus += 4;
  // Potere Divino: +6 Attacco/Parata se in campo insieme a una Manipolatrice e un Draghetto Arcobaleno
  if (codice === "poteredivino" && campo.some((c) => c.nome.includes("Manipolatrice")) && campo.some((c) => c.effetto?.codice === "draghetto"))
    bonus += 6;

  return bonus;
}

export function bonusParataPassivo(creatura, giocatore) {
  const codice = creatura.effetto?.codice;
  let bonus = 0;
  const campo = campoDi(giocatore).filter(viva);

  if (codice === "guardiano" && giocatore.primaLinea.filter(viva).length === 1) bonus += 5;
  if (giocatore.retrovia.includes(creatura) && campo.some((c) => c.effetto?.codice === "crisbota")) bonus += 3;
  if (creatura.archetipo === "Colosso" && campo.some((c) => c !== creatura && c.effetto?.codice === "custode")) bonus += 3;
  if (codice === "draghetto" && campo.some((c) => c !== creatura && c.nome.includes("Manipolatrice"))) bonus += 4;
  if (codice === "poteredivino" && campo.some((c) => c.nome.includes("Manipolatrice")) && campo.some((c) => c.effetto?.codice === "draghetto"))
    bonus += 6;

  return bonus;
}

// Il Re Antico: 3 attacchi per turno invece di 2 (il valore è già negli Excel, questa è la garanzia).
export function attacchiPerTurno(creatura) {
  return creatura.effetto?.codice === "re" ? Math.max(3, creatura.attacchiTotali) : creatura.attacchiTotali;
}

/* ---- ALL'EVOCAZIONE ---- */

export function effettoEvocazione(creatura, giocatore, avversario, log) {
  const codice = creatura.effetto?.codice;
  if (!codice) return;

  if (codice === "viola") {
    campoDi(giocatore)
      .filter((c) => c.nome.includes("Manipolatrice"))
      .forEach((c) => (c.parataBase += 2));
    log(`✦ ${creatura.nome}: tutte le Manipolatrici +2 Parata`);
  }

  if (codice === "domatore" || codice === "esplor") {
    // Esploratore Gallerie pesca solo se hai un altro Effimeri in campo
    if (codice === "esplor" && !campoDi(giocatore).some((c) => c !== creatura && c.archetipo === "Effimeri")) return;
    pesca(giocatore, 1);
    log(`✦ ${creatura.nome}: peschi una carta`);
  }

  if (codice === "modell") {
    const target = campoDi(giocatore).find((c) => c !== creatura && c.archetipo === "Colosso");
    if (target) {
      target.parataBase += 4;
      log(`✦ ${creatura.nome}: ${target.nome} +4 Parata`);
    }
  }

  if (codice === "bianca") {
    const target = campoDi(avversario).filter(viva)[0];
    if (target) {
      target.tmpAttacco -= 4;
      log(`✦ ${creatura.nome}: ${target.nome} −4 Attacco`);
    }
  }

  if (codice === "gelo") {
    campoDi(avversario)
      .filter(viva)
      .forEach((c) => (c.tmpAttacco -= 4));
    log(`✦ ${creatura.nome}: tutte le Pedine nemiche −4 Attacco`);
  }

  if (codice === "corrutt") {
    const target = campoDi(avversario).filter((c) => viva(c) && c.livello === 1)[0];
    if (target) {
      target.danno += 8;
      log(`✦ ${creatura.nome}: 8 danni a ${target.nome}`);
    }
  }

  if (codice === "lame") {
    const liv1 = campoDi(avversario).filter((c) => viva(c) && c.livello === 1);
    if (liv1.length) {
      const target = liv1.reduce((min, c) => (vitaAttuale(c) < vitaAttuale(min) ? c : min), liv1[0]);
      target.danno = target.vitaMax;
      log(`✦ ${creatura.nome}: distrugge ${target.nome}`);
    }
  }

  if (codice === "evocatore") {
    if (giocatore.primaLinea.length < 3 || giocatore.retrovia.length < 2) {
      const pedina = creaCreatura({
        nome: "Pedina di Sangue",
        archetipo: "Colosso",
        livello: 1,
        ruolo: "tank",
        vita: 10,
        attacco: 2,
        parata: 6,
        attacchi: 2,
        effetto: { tipo: "none", testo: "Pedina evocata.", codice: null },
      });
      if (giocatore.primaLinea.length < 3) giocatore.primaLinea.push(pedina);
      else giocatore.retrovia.push(pedina);
      log(`✦ ${creatura.nome}: crea una Pedina di Sangue`);
    }
  }

  if (codice === "goblin") {
    const i = giocatore.mano.findIndex((c) => c.nome === "Piccolo Goblin");
    if (i >= 0 && (giocatore.primaLinea.length < 3 || giocatore.retrovia.length < 2)) {
      const gemello = creaCreatura(giocatore.mano.splice(i, 1)[0]);
      if (giocatore.primaLinea.length < 3) giocatore.primaLinea.push(gemello);
      else giocatore.retrovia.push(gemello);
      log(`✦ ${creatura.nome}: evoca gratis un altro Piccolo Goblin`);
    }
  }

  // La Base Alimentare: un'altra copia in mano si evoca gratis, altrimenti la si cerca nel mazzo.
  if (codice === "basealim") {
    const iMano = giocatore.mano.findIndex((c) => c.nome === creatura.nome);
    if (iMano >= 0 && (giocatore.primaLinea.length < 3 || giocatore.retrovia.length < 2)) {
      const gemella = creaCreatura(giocatore.mano.splice(iMano, 1)[0]);
      if (giocatore.primaLinea.length < 3) giocatore.primaLinea.push(gemella);
      else giocatore.retrovia.push(gemella);
      log(`✦ ${creatura.nome}: evoca gratis un'altra copia dalla mano`);
    } else {
      const iMazzo = giocatore.mazzo.findIndex((c) => c.nome === creatura.nome);
      if (iMazzo >= 0) {
        giocatore.mano.push(giocatore.mazzo.splice(iMazzo, 1)[0]);
        log(`✦ ${creatura.nome}: cerca un'altra copia nel Worldloom e la aggiunge alla mano`);
      }
    }
  }

  // Artigiano Potente: cerca nel mazzo una Magia di potenziamento e la aggiunge alla mano.
  if (codice === "artigiano") {
    const iMazzo = giocatore.mazzo.findIndex((c) => (c.effetto?.codice ?? "").startsWith("buff_"));
    if (iMazzo >= 0) {
      giocatore.mano.push(giocatore.mazzo.splice(iMazzo, 1)[0]);
      log(`✦ ${creatura.nome}: cerca una Magia di potenziamento e la aggiunge alla mano`);
    }
  }

  // Diplomatico Aureo: tira 1 dado all'ingresso (semplificato: il bonus va su se stesso).
  if (codice === "diplomatico") {
    const simbolo = tiraDadoArchetipo(creatura.archetipo);
    if (simbolo === "S") {
      creatura.tmpAttacco += 2;
      log(`✦ ${creatura.nome}: Spada — +2 Attacco`);
    } else if (simbolo === "U") {
      creatura.tmpParata += 2;
      log(`✦ ${creatura.nome}: Scudo — +2 Parata`);
    } else if (simbolo === "C") {
      creatura.vitaMax += 2;
      log(`✦ ${creatura.nome}: Cuore — +2 Vita`);
    } else {
      creatura.schivaAutomatiche = (creatura.schivaAutomatiche ?? 0) + 1;
      log(`✦ ${creatura.nome}: Schivata — il prossimo attacco subito verrà annullato`);
    }
  }

  // Manipolatrice Suprema: tutte le altre Manipolatrici +5 Attacco permanenti.
  if (codice === "suprema") {
    campoDi(giocatore)
      .filter((c) => c !== creatura && c.nome.includes("Manipolatrice"))
      .forEach((c) => (c.attaccoBase += 5));
    log(`✦ ${creatura.nome}: tutte le tue Manipolatrici +5 Attacco permanenti`);
  }

  // Manipolatore di Strumenti: tira il dado Archetipo della carta stessa. Spada → recupera 1 Magia dal
  // proprio cimitero; Scudo → recupera 1 Magia dal proprio Worldloom (mazzo); Cuore → ruba un
  // Potenziamento attivo (buff_, "coperta:false" + bersaglioId, cap. B6) da una creatura avversaria,
  // togliendole il bonus Attacco/Parata che dava, e lo aggiunge alla propria mano; Schivata → nessun
  // effetto. Confermato con l'utente: se il simbolo non trova un bersaglio valido non succede nulla
  // (nessun ripiego su un altro simbolo).
  if (codice === "manipstrum") {
    const simbolo = tiraDadoArchetipo(creatura.archetipo);
    if (simbolo === "S") {
      const i = giocatore.cimitero.findIndex((x) => x.tipoCarta === "magia");
      if (i >= 0) {
        const recuperata = giocatore.cimitero.splice(i, 1)[0];
        giocatore.mano.push(recuperata);
        log(`✦ ${creatura.nome}: Spada — recupera ${recuperata.nome} dal cimitero`);
      } else {
        log(`✦ ${creatura.nome}: Spada — nessuna Magia nel cimitero da recuperare`);
      }
    } else if (simbolo === "U") {
      const i = giocatore.mazzo.findIndex((x) => x.tipoCarta === "magia");
      if (i >= 0) {
        const recuperata = giocatore.mazzo.splice(i, 1)[0];
        giocatore.mano.push(recuperata);
        log(`✦ ${creatura.nome}: Scudo — recupera ${recuperata.nome} dal Worldloom`);
      } else {
        log(`✦ ${creatura.nome}: Scudo — nessuna Magia nel Worldloom da recuperare`);
      }
    } else if (simbolo === "C") {
      const attivo = avversario.magieTrappole.find((mt) => mt.coperta === false && mt.bersaglioId);
      if (attivo) {
        const bersaglio = campoDi(avversario).find((x) => x.id === attivo.bersaglioId);
        const [, atk, par] = (attivo.carta.effetto?.codice ?? "").split("_").map(Number);
        if (bersaglio && !Number.isNaN(atk)) {
          bersaglio.attaccoBase -= atk;
          bersaglio.parataBase -= par || 0;
        }
        avversario.magieTrappole = avversario.magieTrappole.filter((mt) => mt !== attivo);
        giocatore.mano.push(attivo.carta);
        log(`✦ ${creatura.nome}: Cuore — ruba ${attivo.carta.nome} da ${bersaglio?.nome ?? "una Pedina nemica"}, toglie il bonus`);
      } else {
        log(`✦ ${creatura.nome}: Cuore — nessun Potenziamento nemico attivo da rubare`);
      }
    }
    // Schivata: nessun effetto.
  }
}

/* ---- IN COMBATTIMENTO ---- */

// Troll Folle: +5 Attacco quando attacca un Alieno di Livello superiore al suo.
export function bonusAttaccoContro(attaccante, difensore) {
  if (attaccante.effetto?.codice === "troll" && difensore.livello > attaccante.livello) return 5;
  return 0;
}

// Effetti legati al simbolo uscito. Ritorna il danno extra da sommare a quello del difensore.
export function effettiSimbolo(simbolo, attaccante, difensore, difProprietario, dannoDifensore, log) {
  let extra = 0;
  const codiceAtt = attaccante.effetto?.codice;
  const codiceDif = difensore.effetto?.codice;

  if (codiceAtt === "araldo" && simbolo === "S" && dannoDifensore > 0) {
    extra += 4;
    log(`✦ ${attaccante.nome}: +4 danni extra (Spada)`);
  }
  if (codiceAtt === "braccio" && attaccante.ultimoSimbolo === simbolo && dannoDifensore > 0) {
    extra += dannoDifensore;
    log(`✦ ${attaccante.nome}: danno raddoppiato (stesso simbolo del colpo precedente)`);
  }
  attaccante.ultimoSimbolo = simbolo;

  // Drago Linfatico: se il difensore schiva, lo paralizza e infligge comunque danno diretto (ignora la Parata).
  if (codiceAtt === "dragolinf" && simbolo === "D") {
    extra += Math.max(0, attaccante.attaccoBase + attaccante.tmpAttacco);
    log(`✦ ${attaccante.nome}: paralizza ${difensore.nome}, danno diretto alla Vita ignorando la Parata`);
  }

  if (codiceDif === "blu" && simbolo === "U") {
    difProprietario.hp += 5;
    log(`✦ ${difensore.nome}: il tuo Stratega recupera 5 PV`);
  }
  if (codiceDif === "gialla" && simbolo === "D") {
    pesca(difProprietario, 1);
    log(`✦ ${difensore.nome}: peschi una carta (Schivata)`);
  }

  return extra;
}

// Mago Sorprendente: quando difende può ritirare il dado, una volta per turno.
export function magoPuoRitirare(difensore) {
  return difensore.effetto?.codice === "mago" && !difensore.magoUsatoQuestoTurno;
}

// Maestro del Patto Cremisi: prima di ogni suo combattimento tira 1 dado.
export function attivaEffettoPreAttacco(creatura, log) {
  if (creatura.effetto?.codice !== "cremisi") return;
  const simbolo = tiraDadoArchetipo(creatura.archetipo);
  if (simbolo === "S") {
    const vitaResidua = Math.max(0, creatura.vitaMax - creatura.danno);
    creatura.danno += Math.floor(vitaResidua / 2);
    creatura.tmpAttacco += creatura.attaccoBase;
    log(`✦ ${creatura.nome}: Spada — dimezza la propria Vita, raddoppia l'Attacco fino a fine turno`);
  } else {
    creatura.tmpAttacco -= 2;
    log(`✦ ${creatura.nome}: perde 2 Attacco fino a fine turno`);
  }
}

// Diplomatico Aureo / Cervo Luminoso: schivate automatiche bancate o rinnovate ogni turno.
export function consumaSchivataAutomatica(difensore) {
  if ((difensore.schivaAutomatiche ?? 0) > 0) {
    difensore.schivaAutomatiche -= 1;
    return true;
  }
  if (difensore.effetto?.codice === "cervo" && !difensore.schivaCervoUsataQuestoTurno) {
    difensore.schivaCervoUsataQuestoTurno = true;
    return true;
  }
  return false;
}

// Condottiero Fiero: la prima volta che subirebbe un colpo letale in un turno, sopravvive con 1 Vita.
export function applicaDannoConSopravvivenza(creatura, danno) {
  if (danno <= 0) return danno;
  if (creatura.effetto?.codice === "condottiero" && !creatura.sopravvivenzaUsataQuestoTurno) {
    const vitaResidua = creatura.vitaMax - creatura.danno;
    if (danno >= vitaResidua) {
      creatura.sopravvivenzaUsataQuestoTurno = true;
      return Math.max(0, vitaResidua - 1);
    }
  }
  return danno;
}

// Mammut Glaciale (MORTE_ALLEATO, cap. Vocabolario Effetti): quando un ALTRO tuo Alieno muore, se il
// Mammut è vivo ED è in prima linea in quel momento, guadagna +4 Vita permanenti — si SOMMA al +3
// generico di Ruolo Tank (giocatore.js → ripulisciCampo), non lo sostituisce: confermato con l'utente
// che i Ruoli si applicano sempre in automatico, un effetto di carta li sostituisce solo se li cita
// esplicitamente col termine "Ruolo" (il testo di Mammut non lo fa, quindi sono due bonus distinti che
// si sommano). Riceve primaLinea invece di 'giocatore' intero: il vincolo di posizione è specifico di
// questa carta, non serve esporlo a chi non ce l'ha.
export function effettoMorteAlleato(creaturaMorta, primaLinea, log) {
  primaLinea
    .filter((c) => c !== creaturaMorta && viva(c) && c.effetto?.codice === "mammut")
    .forEach((mammut) => {
      mammut.vitaMax += 4;
      log(`✦ ${mammut.nome}: +4 Vita permanenti (alleato morto, Mammut in prima linea)`);
    });
}

// Serpente Radiale: quando muore, trascina con sé l'Alieno avversario con Vita più bassa.
export function effettoMorteOffensivo(creatura, giocatore, avversario, log) {
  if (creatura.effetto?.codice !== "serpente") return;
  const nemici = campoDi(avversario).filter(viva);
  if (!nemici.length) return;
  const bersaglio = nemici.reduce((min, c) => (vitaAttuale(c) < vitaAttuale(min) ? c : min), nemici[0]);
  bersaglio.danno = bersaglio.vitaMax;
  log(`✦ ${creatura.nome}: trascina con sé ${bersaglio.nome}`);
}

/* ---- ALTRI MOMENTI ---- */

// Coleottero Prisma: +2 Attacco permanenti a ogni tuo turno in cui resta in campo.
export function effettiInizioTurno(giocatore, log) {
  campoDi(giocatore)
    .filter(viva)
    .forEach((c) => {
      if (c.effetto?.codice === "prisma") {
        c.attaccoBase += 2;
        log(`✦ ${c.nome}: +2 Attacco permanenti`);
      }
    });
}

// Manipolatrice Nera: alla morte tira il Dado Imprevisti, con +2 torna in campo.
export function effettoMorte(creatura, giocatore, tiroImprevisti, log) {
  if (creatura.effetto?.codice !== "nera") return false;
  const torna = tiroImprevisti === 2;
  log(`✦ ${creatura.nome}: tira il dado… ${torna ? "torna in campo!" : "resta nel cimitero"}`);
  if (!torna) return false;
  if (giocatore.primaLinea.length >= 3 && giocatore.retrovia.length >= 2) return false;
  creatura.danno = 0;
  creatura.attacchiUsati = 0;
  creatura.fresca = true;
  creatura.tmpAttacco = 0;
  creatura.tmpParata = 0;
  if (giocatore.primaLinea.length < 3) giocatore.primaLinea.push(creatura);
  else giocatore.retrovia.push(creatura);
  return true;
}
