"""
componi_carte.py

Legge cards.json di UN mazzo e compone l'immagine finale di OGNI carta
(Alieni, Magie, Trappole, Terreni e Imprevisti), salvandola in "Complete cards/".

Uso da terminale:
    python componi_carte.py "Mazzi/Frost Land - Primitivi del ghiaccio"

Gli Alieni prendono l'illustrazione da Images/ e vengono saltati se manca.
Magie, Trappole, Terreni e Imprevisti non hanno illustrazione obbligatoria:
se il file c'e' viene usato, altrimenti si compone comunque con lo sfondo del tipo.

I layout seguono i template in "Mazzi/00 Layout generico/" e il Regolamento v2.1
(cap. 5 anatomia, cap. 14 Magie/Trappole/Terreni, cap. 15 Imprevisti).

Regola d'oro: questo script NON si modifica per aggiungere carte.
Le carte si scrivono SOLO nell'Excel del mazzo.
"""
import hashlib
import json
import os
import sys

from PIL import Image, ImageDraw, ImageFont

# --- Dati di stampa, uguali per tutte le carte (vedi footer in basso a sinistra) ---
AUTORE = "TANAKA HIROSHI"
TIRATURA = 999  # il "su quanti" del numero di collezione, come nel set stampato

ARCH_COLORI = {
    "Viandante": (232, 201, 111),
    "Assalitore": (224, 138, 114),
    "Effimeri": (114, 201, 143),
    "Colosso": (111, 158, 214),
    "Tessitore": (185, 143, 214),
}

ARCH_SFONDI = {
    "Viandante": ((61, 52, 24), (26, 22, 8)),
    "Assalitore": ((61, 32, 24), (26, 12, 8)),
    "Effimeri": ((21, 61, 36), (8, 26, 14)),
    "Colosso": ((21, 42, 61), (8, 19, 26)),
    "Tessitore": ((46, 26, 61), (20, 8, 26)),
}

# tipo -> (colore barra, sfondo illustrazione, etichetta, promemoria di regola)
TIPI_SPECIALI = {
    "magia": (
        (107, 158, 222),
        ((22, 48, 77), (8, 20, 32)),
        "MAGIA",
        ["Si attiva nella Fase 3 del tuo turno", "Nessun costo in risorse"],
    ),
    "trappola": (
        (169, 127, 214),
        ((42, 29, 69), (18, 10, 30)),
        "TRAPPOLA",
        ["Si piazza coperta, attivabile dal turno successivo", "Poi scatta in qualunque momento"],
    ),
    "terreno": (
        (95, 174, 144),
        ((18, 61, 53), (7, 23, 26)),
        "MAGIA · TERRENO",
        ["Slot unico condiviso · vale per ENTRAMBI", "Sostituisce il Terreno precedente"],
    ),
    "imprevisto": (
        (201, 162, 75),
        ((58, 47, 24), (22, 16, 10)),
        "IMPREVISTO",
        ["Mazzetto separato · avanza col Dado Imprevisti", "Vale per ENTRAMBI · non annullabile"],
    ),
}

EFFETTO_RUOLO = {
    "aggressore": "Se 3 Aggressori alleati attaccano nello stesso turno, tutti e 3 guadagnano +1 Attacco fino a fine turno.",
    "difensore": "Se 2 Difensori alleati difendono nello stesso turno, il secondo che si attiva guadagna +2 Parata fino a fine turno.",
    "tank": "Quando un Alieno alleato viene distrutto, questo Alieno guadagna +3 Vita permanenti finché resta in campo.",
    "evasivo": "Se subisce Schivata per la 2ª volta nello stesso turno dallo stesso attaccante, prima del colpo successivo può scambiarsi con un Alieno in retrovia.",
    "bilanciato": "Ignora sempre vantaggio e svantaggio della Ruota: ogni suo combattimento è trattato come neutro.",
    "supporto": "Se un alleato in prima linea sta per essere distrutto da Spada o Scudo, un Supporto in retrovia può dargli +2 alla statistica in gioco.",
}

W, H = 750, 1050
FONT_DIR = "C:/Windows/Fonts"
F_BOLD = os.path.join(FONT_DIR, "georgiab.ttf")
F_REG = os.path.join(FONT_DIR, "georgia.ttf")


def carica_font(percorso, size):
    try:
        return ImageFont.truetype(percorso, size)
    except OSError:
        return ImageFont.load_default()


def sfumatura(dimensioni, colore_alto, colore_basso):
    larghezza, altezza = dimensioni
    base = Image.new("RGB", (1, altezza))
    for y in range(altezza):
        t = y / max(1, altezza - 1)
        base.putpixel((0, y), tuple(int(colore_alto[i] + (colore_basso[i] - colore_alto[i]) * t) for i in range(3)))
    return base.resize((larghezza, altezza))


def testo_a_capo(draw, testo, font_obj, x, y, larghezza_max, fill, interlinea, max_righe=None):
    """Scrive il testo andando a capo. Ritorna la y finale."""
    if not testo:
        return y
    righe, riga = [], ""
    for parola in testo.split():
        prova = (riga + " " + parola).strip()
        if draw.textlength(prova, font=font_obj) > larghezza_max and riga:
            righe.append(riga)
            riga = parola
        else:
            riga = prova
    if riga:
        righe.append(riga)
    if max_righe and len(righe) > max_righe:
        righe = righe[:max_righe]
        righe[-1] = righe[-1][: max(0, len(righe[-1]) - 1)] + "…"
    for r in righe:
        draw.text((x, y), r, font=font_obj, fill=fill)
        y += interlinea
    return y


def codice_carta(sigla_mazzo, numero, nome):
    """Codice stampato sulla carta: stabile nel tempo perche' derivato dal nome."""
    impronta = hashlib.md5(nome.encode("utf-8")).hexdigest()[:8].upper()
    return f"{sigla_mazzo}{numero:03d}{impronta}"


def disegna_illustrazione(img, draw, box, percorso_immagine, colore, sfondo):
    x0, y0, x1, y1 = box
    larghezza, altezza = x1 - x0, y1 - y0
    if percorso_immagine and os.path.exists(percorso_immagine):
        art = Image.open(percorso_immagine).convert("RGB")
        rapporto_art, rapporto_box = art.width / art.height, larghezza / altezza
        if rapporto_art > rapporto_box:
            nuova_h, nuova_w = altezza, int(altezza * rapporto_art)
        else:
            nuova_w, nuova_h = larghezza, int(larghezza / rapporto_art)
        art = art.resize((nuova_w, nuova_h), Image.LANCZOS)
        sx, sy = (nuova_w - larghezza) // 2, (nuova_h - altezza) // 2
        img.paste(art.crop((sx, sy, sx + larghezza, sy + altezza)), (x0, y0))
    else:
        img.paste(sfumatura((larghezza, altezza), *sfondo), (x0, y0))
    draw.rectangle(box, outline=colore, width=3)


def disegna_footer(draw, numero, totale, codice, limite_copie, colore):
    """In basso a sinistra: numero di collezione, autore e codice carta.
    In basso a destra: quante copie puoi mettere nel Worldloom."""
    f_piccolo = carica_font(F_REG, 16)
    draw.text((30, 1005), f"{numero:03d}/{totale} {AUTORE}", font=f_piccolo, fill=(150, 158, 178))
    draw.text((30, 1025), f"DK: {codice}", font=f_piccolo, fill=(150, 158, 178))

    # Badge del limite copie
    bx0, by0, bx1, by1 = W - 118, 1000, W - 26, 1038
    draw.rounded_rectangle([bx0, by0, bx1, by1], radius=8, fill=(15, 18, 28), outline=colore, width=2)
    f_num = carica_font(F_BOLD, 22)
    f_lbl = carica_font(F_REG, 13)
    draw.text(((bx0 + bx1) / 2 - 12, (by0 + by1) / 2), f"×{limite_copie}", font=f_num, fill=colore, anchor="mm")
    draw.text(((bx0 + bx1) / 2 + 20, (by0 + by1) / 2), "max", font=f_lbl, fill=(150, 158, 178), anchor="mm")


def componi_alieno(carta, percorso_immagine, percorso_output, numero, totale, sigla):
    colore = ARCH_COLORI.get(carta["archetipo"], (150, 150, 150))
    sfondo = ARCH_SFONDI.get(carta["archetipo"], ((30, 30, 40), (10, 10, 16)))
    img = Image.new("RGB", (W, H), (10, 14, 24))
    draw = ImageDraw.Draw(img)
    draw.rectangle([0, 0, W - 1, H - 1], outline=colore, width=6)

    # Barra nome + quadratini del costo di evocazione (uno per Livello)
    draw.rectangle([12, 12, W - 12, 98], fill=colore)
    draw.text((32, 30), carta["nome"], font=carica_font(F_BOLD, 38), fill=(15, 15, 20))
    for i in range(carta["livello"]):
        x = W - 46 - (i * 32)
        draw.rectangle([x, 43, x + 24, 67], fill=(15, 15, 20))

    disegna_illustrazione(img, draw, (26, 112, W - 26, 660), percorso_immagine, colore, sfondo)

    draw.text(
        (28, 674),
        f'{carta["archetipo"]} · {carta["ruolo"].capitalize()}',
        font=carica_font(F_REG, 24),
        fill=colore,
    )

    # Riquadro effetti: Ruolo (fisso) + Carta (unico)
    draw.rounded_rectangle([26, 706, W - 26, 906], radius=8, fill=(13, 18, 32), outline=(60, 70, 100), width=2)
    f_fx = carica_font(F_REG, 19)
    f_lb = carica_font(F_BOLD, 18)
    y = 720
    testo_ruolo = EFFETTO_RUOLO.get(carta["ruolo"], "")
    if testo_ruolo:
        draw.text((42, y), "EFFETTO DI RUOLO", font=f_lb, fill=colore)
        y = testo_a_capo(draw, testo_ruolo, f_fx, 42, y + 24, W - 100, (200, 208, 224), 23, max_righe=3)
        y += 6
    testo_carta = (carta.get("effetto") or {}).get("testo")
    if testo_carta:
        draw.text((42, y), "EFFETTO CARTA", font=f_lb, fill=colore)
        testo_a_capo(draw, testo_carta, f_fx, 42, y + 24, W - 100, (232, 220, 180), 23, max_righe=3)

    # Statistiche (la Schivata non e' una statistica: cap. 5)
    f_num = carica_font(F_BOLD, 34)
    f_lbl = carica_font(F_REG, 15)
    for i, (etichetta, valore, col) in enumerate(
        [("VITA", carta["vita"], (127, 216, 155)), ("PARATA", carta["parata"], (127, 176, 232)), ("ATTACCO", carta["attacco"], (232, 144, 144))]
    ):
        cx = 150 + i * 215
        draw.text((cx, 932), etichetta, font=f_lbl, fill=(140, 150, 180), anchor="mm")
        draw.text((cx, 962), str(valore), font=f_num, fill=col, anchor="mm")

    # Pallini dorati con etichetta: attacchi disponibili per turno (centrati sotto ATTACCO)
    n_attacchi = carta.get("attacchi", 2)
    f_att = carica_font(F_REG, 15)
    etichetta_att = "ATTACCHI/TURNO"
    bbox_att = draw.textbbox((0, 0), etichetta_att, font=f_att)
    larghezza_etichetta = bbox_att[2] - bbox_att[0]
    larghezza_pallini = n_attacchi * 24
    x_att = 590 - (larghezza_etichetta + 16 + larghezza_pallini) / 2
    draw.text((x_att, 993), etichetta_att, font=f_att, fill=(150, 158, 178), anchor="lm")
    x_pallino = x_att + larghezza_etichetta + 22
    for i in range(n_attacchi):
        cx = x_pallino + i * 24
        draw.ellipse([cx - 8, 985, cx + 8, 1001], fill=(201, 162, 75), outline=(255, 232, 184), width=1)

    disegna_footer(draw, numero, totale, codice_carta(sigla, numero, carta["nome"]), carta.get("copie", 1), colore)
    img.save(percorso_output, "JPEG", quality=88)


def componi_carta_effetto(carta, tipo, percorso_immagine, percorso_output, numero, totale, sigla):
    colore, sfondo, etichetta, promemoria = TIPI_SPECIALI[tipo]
    img = Image.new("RGB", (W, H), (10, 14, 24))
    draw = ImageDraw.Draw(img)
    draw.rectangle([0, 0, W - 1, H - 1], outline=colore, width=6)

    draw.rectangle([12, 12, W - 12, 98], fill=colore)
    draw.text((32, 30), carta["nome"], font=carica_font(F_BOLD, 38), fill=(15, 15, 20))

    fondo_arte = 660
    disegna_illustrazione(img, draw, (26, 112, W - 26, fondo_arte), percorso_immagine, colore, sfondo)

    sottotipo = carta.get("sottotipo")
    testa = f"{etichetta} · {sottotipo.upper()}" if (tipo == "magia" and sottotipo and sottotipo != "normale") else etichetta
    draw.text((28, fondo_arte + 14), testa, font=carica_font(F_REG, 24), fill=colore)

    y_riquadro = fondo_arte + 46
    altezza_riquadro = 920 - y_riquadro
    draw.rounded_rectangle([26, y_riquadro, W - 26, y_riquadro + altezza_riquadro], radius=8, fill=(13, 18, 32), outline=(60, 70, 100), width=2)
    intestazione = "EFFETTO — VALE PER ENTRAMBI" if tipo in ("terreno", "imprevisto") else "EFFETTO"
    draw.text((42, y_riquadro + 14), intestazione, font=carica_font(F_BOLD, 18), fill=colore)
    testo_a_capo(
        draw,
        (carta.get("effetto") or {}).get("testo") or "",
        carica_font(F_REG, 20),
        42,
        y_riquadro + 44,
        W - 100,
        (232, 220, 180),
        25,
        max_righe=max(2, int((altezza_riquadro - 60) / 25)),
    )

    f_prom = carica_font(F_REG, 16)
    for i, riga in enumerate(promemoria):
        draw.text((W / 2, 938 + i * 21), riga, font=f_prom, fill=(150, 158, 178), anchor="mm")

    disegna_footer(draw, numero, totale, codice_carta(sigla, numero, carta["nome"]), carta.get("copie", 1), colore)
    img.save(percorso_output, "JPEG", quality=88)


def sigla_mazzo(nome_cartella):
    parole = [p for p in nome_cartella.replace("-", " ").split() if p[:1].isalpha()]
    return (parole[0][:2] if parole else "WL").upper()


def nome_file(nome_carta):
    return nome_carta.lower().replace(" ", "-").replace("'", "") + ".png"


# Le Complete card composte si salvano in JPEG (foto/illustrazioni, niente trasparenza): pesano
# una frazione del PNG e tengono il file di gioco a file singolo leggero anche su mobile.
def nome_file_output(nome_carta):
    return nome_carta.lower().replace(" ", "-").replace("'", "") + ".jpg"


def main():
    if len(sys.argv) != 2:
        print('Uso: python componi_carte.py "Mazzi/NomeMazzo"')
        sys.exit(1)

    cartella_mazzo = sys.argv[1]
    cards_path = os.path.join(cartella_mazzo, "cards.json")
    images_dir = os.path.join(cartella_mazzo, "Images")
    out_dir = os.path.join(cartella_mazzo, "Complete cards")

    if not os.path.exists(cards_path):
        print(f"Non trovo {cards_path}. Rigenera prima cards.json dall'Excel.")
        sys.exit(1)

    with open(cards_path, encoding="utf-8") as f:
        dati = json.load(f)

    os.makedirs(out_dir, exist_ok=True)
    sigla = sigla_mazzo(os.path.basename(os.path.normpath(cartella_mazzo)))

    tutte = list(dati.get("carte", [])) + list(dati.get("imprevisti", []))
    totale = len(tutte)
    fatte, saltate = [], []

    for indice, carta in enumerate(tutte, start=1):
        tipo = carta.get("tipoCarta", "alieno")
        percorso_output = os.path.join(out_dir, nome_file_output(carta["nome"]))
        percorso_immagine = os.path.join(images_dir, nome_file(carta["nome"]))

        if tipo == "alieno":
            if not os.path.exists(percorso_immagine):
                saltate.append(carta["nome"])
                continue
            componi_alieno(carta, percorso_immagine, percorso_output, indice, totale, sigla)
        else:
            # I Terreni sono Magie col sottotipo "terreno": hanno un layout dedicato
            if tipo == "magia" and (carta.get("sottotipo") == "terreno" or (carta.get("effetto") or {}).get("codice", "").startswith("terr_")):
                tipo = "terreno"
            componi_carta_effetto(
                carta, tipo, percorso_immagine if os.path.exists(percorso_immagine) else None, percorso_output, indice, totale, sigla
            )
        fatte.append(f'{carta["nome"]} [{tipo}]')

    print(f"{len(fatte)} carte composte in: {out_dir}")
    for n in fatte:
        print(f"  OK  {n}")
    if saltate:
        print(f"\n{len(saltate)} Alieni saltati (manca l'illustrazione in Images/): {', '.join(saltate)}")


if __name__ == "__main__":
    main()
