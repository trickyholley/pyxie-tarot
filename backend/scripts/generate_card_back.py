# SPDX-License-Identifier: AGPL-3.0-or-later
# /// script
# dependencies = ["pillow"]
# ///
# Regenerates app/static/card_back.png from the Pyxie logo. Run with: uv run backend/scripts/generate_card_back.py
from pathlib import Path

from PIL import Image, ImageDraw

REPO_ROOT = Path(__file__).resolve().parents[2]
SRC = REPO_ROOT / ".github/assets/logo.png"
OUT = REPO_ROOT / "backend/app/static/card_back.png"

CARD_W, CARD_H = 500, 800

# Colors sampled from the logo: muted mauve ring, deep purple outline, dull taupe pentacle lines.
RING_PURPLE = (125, 88, 128)
DEEP_PURPLE = (58, 40, 62)
GOLD = (168, 145, 170)


def lerp(a, b, t):
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))


def make_background():
    bg = Image.new("RGB", (CARD_W, CARD_H))
    px = bg.load()
    cx, cy = CARD_W / 2, CARD_H / 2
    max_dist = ((CARD_W / 2) ** 2 + (CARD_H / 2) ** 2) ** 0.5
    for y in range(CARD_H):
        for x in range(CARD_W):
            dist = ((x - cx) ** 2 + (y - cy) ** 2) ** 0.5
            t = min(1.0, dist / max_dist)
            px[x, y] = lerp(RING_PURPLE, DEEP_PURPLE, t)
    return bg


def main():
    logo = Image.open(SRC).convert("RGBA")
    bg = make_background()
    draw = ImageDraw.Draw(bg)

    margin = 24
    draw.rectangle([margin, margin, CARD_W - margin, CARD_H - margin], outline=GOLD, width=4)
    inner = margin + 12
    draw.rectangle([inner, inner, CARD_W - inner, CARD_H - inner], outline=GOLD, width=1)

    logo_w = int(CARD_W * 0.62)
    logo_h = int(logo_w * logo.height / logo.width)
    logo_resized = logo.resize((logo_w, logo_h), Image.LANCZOS)

    pos = ((CARD_W - logo_w) // 2, (CARD_H - logo_h) // 2)
    bg.paste(logo_resized, pos, logo_resized)

    bg.save(OUT)
    print(f"wrote {OUT} ({CARD_W}x{CARD_H})")


if __name__ == "__main__":
    main()
