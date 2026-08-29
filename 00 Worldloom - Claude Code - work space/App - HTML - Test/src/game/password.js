// L'hash qui sotto corrisponde alla password scritta in "password/password.md"
// (cartella esclusa da Git). Per cambiare la password: chiedi a Claude Code,
// aggiorna sia questo hash sia il documento di riferimento.
export const HASH_PASSWORD = "2d52eb977276f36f3b92adae3862ee6e6534110ab70c5c497534766b9bfe5646";

export async function sha256Hex(testo) {
  const buffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(testo));
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
