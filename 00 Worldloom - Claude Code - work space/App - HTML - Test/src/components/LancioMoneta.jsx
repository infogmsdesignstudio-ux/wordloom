import { useState } from "react";
import pittogramma from "../assets/pittogramma.png";
import logoTesto from "../assets/logo-testo.png";

// Timing dal Foglio Maestro (cap. UX Addendum M, validato su demo_lancio_moneta.html): 7 giri completi
// con decelerazione, ~2.1s totali.
const DURATA_GIRO_MS = 2100;
const GIRI_BASE = 7;

// Lancio della moneta (cap. UX Addendum M): sostituisce la vecchia decisione istantanea/invisibile di
// "chi inizia" (Math.random() dentro nuovaPartita, solo una riga di log + un pop-up testuale) con una
// scelta vera del giocatore (Logo o Pittogramma, come testa/croce) seguita da un lancio 3D animato.
// Componente puramente locale (nessun dispatch finché non si conclude): il risultato del lancio decide
// chi sarà primoGiocatore, passato a "nuova-partita" come primoGiocatoreForzato — un'unica fonte di
// verità, non un secondo tiro a sorte indipendente nel reducer che potrebbe contraddire questo.
export default function LancioMoneta({ onFine }) {
  const [fase, setFase] = useState("scelta"); // "scelta" | "girando" | "esito"
  const [scelta, setScelta] = useState(null); // "logo" | "pittogramma"
  const [risultato, setRisultato] = useState(null);
  const [angoloFinale, setAngoloFinale] = useState(0);

  function lancia(sceltaGiocatore) {
    const esito = Math.random() < 0.5 ? "logo" : "pittogramma";
    const angolo = GIRI_BASE * 360 + (esito === "logo" ? 0 : 180);
    setScelta(sceltaGiocatore);
    setRisultato(esito);
    setAngoloFinale(angolo);
    setFase("girando");
    setTimeout(() => setFase("esito"), DURATA_GIRO_MS);
  }

  const vinto = scelta === risultato;
  const nomeRisultato = risultato === "logo" ? "Logo" : "Pittogramma";

  return (
    <div className="schermata-iniziale">
      <div className="lancio-moneta-stage">
        {fase === "scelta" && (
          <div className="lancio-moneta-scelta">
            <div className="lancio-moneta-titolo">Chi inizia? Scegli un lato</div>
            <div className="lancio-moneta-bottoni">
              <button type="button" className="lancio-moneta-btn" onClick={() => lancia("logo")} aria-label="Logo">
                <img src={logoTesto} alt="" className="lancio-moneta-btn-logo" />
              </button>
              <button type="button" className="lancio-moneta-btn" onClick={() => lancia("pittogramma")} aria-label="Pittogramma">
                <img src={pittogramma} alt="" className="lancio-moneta-btn-pittogramma" />
              </button>
            </div>
          </div>
        )}
        {fase !== "scelta" && (
          <div className="lancio-moneta-moneta-wrap">
            {/* La classe con l'animazione resta applicata anche in fase "esito" (non solo "girando"):
                animation-fill-mode:forwards tiene la rotazione finale sul VALORE dell'animazione, non
                sull'elemento — toglierla resetta la moneta a rotateY(0) (faccia Logo) a prescindere dal
                vero risultato, un bug trovato in verifica dal vivo (screenshot: mostrava sempre Logo a
                riposo anche quando l'esito era Pittogramma). */}
            <div
              className={`lancio-moneta-moneta ${fase !== "scelta" ? "lancio-moneta-girando" : ""}`}
              style={{ "--angolo-finale": `${angoloFinale}deg` }}
            >
              <div className="lancio-moneta-faccia lancio-moneta-faccia-logo">
                <img src={logoTesto} alt="" />
              </div>
              <div className="lancio-moneta-faccia lancio-moneta-faccia-pittogramma">
                <img src={pittogramma} alt="" />
              </div>
            </div>
            {fase === "esito" && (
              <div className={`lancio-moneta-esito ${vinto ? "lancio-moneta-esito-vinto" : "lancio-moneta-esito-perso"}`}>
                {vinto ? (
                  <>
                    Esce <b>{nomeRisultato}</b> — hai vinto il lancio, <b>inizi tu</b>
                  </>
                ) : (
                  <>
                    Esce <b>{nomeRisultato}</b> — hai perso il lancio, <b>inizia l'avversario</b> (pescherà 6 carte per compensare)
                  </>
                )}
                <button type="button" className="lancio-moneta-continua" onClick={() => onFine(vinto ? "io" : "avversario")}>
                  Continua
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
