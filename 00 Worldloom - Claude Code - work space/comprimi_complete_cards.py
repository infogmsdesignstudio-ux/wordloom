import os
from PIL import Image

QUALITA = 65
CARTELLE = [
    "Mazzi/Frost Land - Primitivi del ghiaccio",
    "Mazzi/Kepler - 452 B - Manipolatrici d'aura",
]

totale_prima = 0
totale_dopo = 0

for cartella in CARTELLE:
    src = os.path.join(cartella, "Complete cards")
    dst = os.path.join(cartella, "Complete cards compressed")
    os.makedirs(dst, exist_ok=True)
    for nome in os.listdir(src):
        if not nome.endswith(".jpg"):
            continue
        percorso_src = os.path.join(src, nome)
        percorso_dst = os.path.join(dst, nome)
        img = Image.open(percorso_src)
        img.save(percorso_dst, "JPEG", quality=QUALITA)
        prima = os.path.getsize(percorso_src)
        dopo = os.path.getsize(percorso_dst)
        totale_prima += prima
        totale_dopo += dopo
    print(f"OK {cartella} -> Complete cards compressed")

print(f"\nTotale prima: {totale_prima/1024/1024:.2f} MB")
print(f"Totale dopo:  {totale_dopo/1024/1024:.2f} MB")
print(f"Riduzione:    {(1 - totale_dopo/totale_prima)*100:.1f}%")
