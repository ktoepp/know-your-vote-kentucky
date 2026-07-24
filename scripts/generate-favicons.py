#!/usr/bin/env python3
"""Generate the KYvKY favicon / app-icon set: white knockout mark on a blue disc.

    python3 scripts/generate-favicons.py

Shape is a **circle** (not a rounded square) and the blue is BRAND_BLUE below —
a slightly darker step off the logo's #1C5BAA so the white mark holds contrast at
16px. The white knockout is derived from the alpha channel of the color mark in
`public/branding/mark-color-512.png`, so it always traces the real artwork rather
than a hand-redrawn approximation. That source is an input only — never an output —
which keeps re-runs idempotent.

`apple-touch-icon` / `src/app/apple-icon.png` are deliberately full-bleed squares:
iOS applies its own squircle mask and composites transparent corners over black,
so a pre-cut circle renders badly there.

Re-run after any change to the source mark, then commit the outputs.
"""

from __future__ import annotations

import os
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Logo blue is #1C5BAA; this is the same hue a few points darker in lightness.
BRAND_BLUE = (0x18, 0x4D, 0x8F)
# Fraction of the canvas width the mark spans. The inscribed square of a circle is
# ~0.707d, so staying under that keeps the mark clear of the curve.
MARK_SCALE = 0.72
# Supersample factor — draw big, downsample once, so the disc edge stays smooth.
SS = 4

SOURCE_MARK = os.path.join(ROOT, "public/branding/mark-color-512.png")


def white_mark() -> Image.Image:
    """The color mark's silhouette, painted solid white, cropped to its bounds."""
    src = Image.open(SOURCE_MARK).convert("RGBA")
    alpha = src.split()[3]
    mark = Image.new("RGBA", src.size, (255, 255, 255, 0))
    mark.putalpha(alpha)
    return mark.crop(alpha.getbbox())


def render(size: int, *, circle: bool, mark: Image.Image) -> Image.Image:
    big = size * SS
    if circle:
        canvas = Image.new("RGBA", (big, big), (0, 0, 0, 0))
        ImageDraw.Draw(canvas).ellipse((0, 0, big - 1, big - 1), fill=(*BRAND_BLUE, 255))
    else:
        canvas = Image.new("RGBA", (big, big), (*BRAND_BLUE, 255))

    target_w = int(big * MARK_SCALE)
    scaled = mark.resize(
        (target_w, max(1, round(mark.height * target_w / mark.width))),
        Image.LANCZOS,
    )
    canvas.alpha_composite(
        scaled, ((big - scaled.width) // 2, (big - scaled.height) // 2)
    )
    return canvas.resize((size, size), Image.LANCZOS)


def main() -> None:
    mark = white_mark()

    circular = {
        "public/branding/favicon.png": 512,
        "public/branding/icon-192.png": 192,
        "public/branding/icon-512.png": 512,
        "src/app/icon.png": 512,
    }
    square = {
        "public/branding/apple-touch-icon.png": 180,
        "src/app/apple-icon.png": 180,
    }

    for path, size in circular.items():
        img = render(size, circle=True, mark=mark)
        img.save(os.path.join(ROOT, path), "PNG", optimize=True)
        print(f"{path}  {img.width}x{img.height}  circle")

    for path, size in square.items():
        img = render(size, circle=False, mark=mark)
        img.save(os.path.join(ROOT, path), "PNG", optimize=True)
        print(f"{path}  {img.width}x{img.height}  full-bleed")

    # Multi-resolution .ico for legacy tab/bookmark surfaces. This lives ONLY in
    # `src/app/` — App Router serves it at /favicon.ico, and a second copy in
    # `public/` makes Next fail that route with "conflicting public file and page
    # file" (a 500 on every request for it).
    ico = "src/app/favicon.ico"
    render(64, circle=True, mark=mark).save(
        os.path.join(ROOT, ico), "ICO", sizes=[(16, 16), (32, 32), (48, 48), (64, 64)]
    )
    print(f"{ico}  16/32/48/64  circle")


if __name__ == "__main__":
    main()
