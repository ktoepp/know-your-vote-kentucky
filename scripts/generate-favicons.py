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

The full mark (two `ky` words, the state outline, the check) has too much detail
to survive a 16px favicon frame — it turns to mush. So the `.ico`'s 16px frame
drops to a **check-only** glyph, the brand's signature "vote" element, which
stays crisp that small; 32px and up keep the full mark. Browsers pick the 16px
frame for non-retina tabs and the 32px frame for retina, so the full mark still
shows wherever the pixels allow.

Re-run after any change to the source mark, then commit the outputs.
"""

from __future__ import annotations

import io
import os
import struct
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


def _blue_disc(big: int) -> Image.Image:
    canvas = Image.new("RGBA", (big, big), (0, 0, 0, 0))
    ImageDraw.Draw(canvas).ellipse((0, 0, big - 1, big - 1), fill=(*BRAND_BLUE, 255))
    return canvas


def render_check(size: int) -> Image.Image:
    """Check-only glyph on the blue disc — the legible fallback at tiny sizes.

    A bold white check with rounded caps/joins, matching the sweep of the check
    in the full mark. Drawn on a supersampled canvas so the strokes stay smooth.
    """
    big = size * SS
    canvas = _blue_disc(big)
    draw = ImageDraw.Draw(canvas)

    # Check vertices as fractions of the canvas, and a stroke thick enough to read
    # at 16px without the two arms merging.
    pts = [(0.26, 0.52), (0.43, 0.68), (0.75, 0.31)]
    xy = [(x * big, y * big) for x, y in pts]
    width = round(0.15 * big)
    draw.line(xy, fill=(255, 255, 255, 255), width=width, joint="curve")
    # `joint="curve"` rounds the interior corner; round the two open ends too.
    r = width / 2
    for cx, cy in (xy[0], xy[-1]):
        draw.ellipse((cx - r, cy - r, cx + r, cy + r), fill=(255, 255, 255, 255))

    return canvas.resize((size, size), Image.LANCZOS)


def render(size: int, *, circle: bool, mark: Image.Image) -> Image.Image:
    big = size * SS
    canvas = _blue_disc(big) if circle else Image.new("RGBA", (big, big), (*BRAND_BLUE, 255))

    target_w = int(big * MARK_SCALE)
    scaled = mark.resize(
        (target_w, max(1, round(mark.height * target_w / mark.width))),
        Image.LANCZOS,
    )
    canvas.alpha_composite(
        scaled, ((big - scaled.width) // 2, (big - scaled.height) // 2)
    )
    return canvas.resize((size, size), Image.LANCZOS)


def write_ico(path: str, frames: list[Image.Image]) -> None:
    """Pack distinct per-size PNG frames into one .ico container.

    Pillow's own ICO save filters frames by the base image's size, so it can't
    hold a 16px image that differs from the 32px one. Assembling the container by
    hand keeps each frame's own artwork (PNG-encoded, which every current browser
    reads). ICO stores 256 as a 0 byte, but all our frames are ≤64.
    """
    payloads = []
    for f in frames:
        buf = io.BytesIO()
        f.save(buf, format="PNG", optimize=True)
        payloads.append((f.width, f.height, buf.getvalue()))

    header = struct.pack("<HHH", 0, 1, len(payloads))
    offset = len(header) + 16 * len(payloads)
    entries, blobs = b"", b""
    for w, h, data in payloads:
        entries += struct.pack(
            "<BBBBHHII", w & 0xFF, h & 0xFF, 0, 0, 1, 32, len(data), offset
        )
        offset += len(data)
        blobs += data

    with open(path, "wb") as fh:
        fh.write(header + entries + blobs)


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
    #
    # Each frame is its own image (ICO stores them verbatim, no downscaling): the
    # 16px frame is the check-only fallback, 32/48/64 the full mark.
    ico = "src/app/favicon.ico"
    frames = [render_check(16)] + [render(s, circle=True, mark=mark) for s in (32, 48, 64)]
    write_ico(os.path.join(ROOT, ico), frames)
    print(f"{ico}  16 (check) / 32 / 48 / 64  circle")


if __name__ == "__main__":
    main()
