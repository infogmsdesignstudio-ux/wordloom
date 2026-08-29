import { useState } from "react";
import { HASH_PASSWORD, sha256Hex } from "../game/password.js";

const CHIAVE_SESSIONE = "wl_sbloccato";

export default function Cancello({ children }) {
  const [sbloccato, setSbloccato] = useState(() => sessionStorage.getItem(CHIAVE_SESSIONE) === "1");
  const [valore, setValore] = useState("");
  const [errore, setErrore] = useState("");

  if (sbloccato) return children;

  const verifica = async (e) => {
    e.preventDefault();
    const hash = await sha256Hex(valore);
    if (hash === HASH_PASSWORD) {
      sessionStorage.setItem(CHIAVE_SESSIONE, "1");
      setSbloccato(true);
    } else {
      setErrore("Password errata.");
    }
  };

  return (
    <div className="cancello">
      <form className="cancello-box" onSubmit={verifica}>
        <h1>WORLDLOOM</h1>
        <p>Accesso riservato — inserisci la password</p>
        <input
          type="password"
          value={valore}
          onChange={(e) => {
            setValore(e.target.value);
            setErrore("");
          }}
          placeholder="Password"
          autoFocus
        />
        <button type="submit">Entra</button>
        <div className="cancello-errore">{errore}</div>
      </form>
    </div>
  );
}
