#!/usr/bin/env python3
"""1024×1024 PNG for `npx tauri icon` — matches public/echohaven-icon.svg geometry."""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "src-tauri" / "echohaven-icon-source.png"

W = 1024
# Scale from 512 design space
S = 2
cx, cy = 192 * S, 224 * S
R_OUTER, R_INNER = 152 * S, 72 * S
R_CORE = 52 * S
RX_BG = 108 * S
GOLD = (212, 175, 55, 255)
GOLD_LINE = (212, 175, 55, 95)
BG0 = (30, 27, 23, 255)
BG1 = (10, 9, 8, 255)


def main() -> None:
    img = Image.new("RGBA", (W, W), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    for y in range(W):
        t = y / max(W - 1, 1)
        r = int(BG0[0] * (1 - t) + BG1[0] * t)
        g = int(BG0[1] * (1 - t) + BG1[1] * t)
        b = int(BG0[2] * (1 - t) + BG1[2] * t)
        draw.line([(0, y), (W, y)], fill=(r, g, b, 255))

    mask = Image.new("L", (W, W), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, W - 1, W - 1), radius=RX_BG, fill=255)
    img.putalpha(mask)

    border = Image.new("RGBA", (W, W), (0, 0, 0, 0))
    bdr = ImageDraw.Draw(border)
    bdr.rounded_rectangle((0, 0, W - 1, W - 1), radius=RX_BG, outline=GOLD_LINE, width=6 * S)
    border.putalpha(mask)
    img = Image.alpha_composite(img, border)

    cut_x = 192 * S
    for r in (R_INNER, R_OUTER):
        ring = Image.new("RGBA", (W, W), (0, 0, 0, 0))
        ImageDraw.Draw(ring).ellipse(
            [cx - r, cy - r, cx + r, cy + r],
            outline=GOLD,
            width=28 * S,
        )
        px = ring.load()
        for yy in range(W):
            for xx in range(cut_x):
                px[xx, yy] = (0, 0, 0, 0)
        img = Image.alpha_composite(img, ring)

    layer = Image.new("RGBA", (W, W), (0, 0, 0, 0))
    ld = ImageDraw.Draw(layer)
    ld.ellipse([cx - R_CORE, cy - R_CORE, cx + R_CORE, cy + R_CORE], fill=GOLD)
    bx0, by0 = 128 * S, 284 * S
    bx1, by1 = bx0 + 128 * S, by0 + 152 * S
    ld.rounded_rectangle([bx0, by0, bx1, by1], radius=28 * S, fill=GOLD)
    img = Image.alpha_composite(img, layer)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    img.save(OUT, "PNG")
    print("Wrote", OUT)


if __name__ == "__main__":
    main()
