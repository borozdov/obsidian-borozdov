#!/usr/bin/env python3
"""Slim the embedded fonts: fonts/source/*.woff2 -> fonts/*.woff2.

The sources are the Google Fonts latin and cyrillic subsets of the Inter and
JetBrains Mono variable fonts. They are base64-embedded in theme.css, which the
community directory flags once it passes 100 KiB, so they are cut to what the
theme uses:

- the weight axis runs 400–600: body, labels and the brand's 600 for headings
  and bold (Obsidian's **bold** is 400 + 200); a request for 700 renders at 600;
- no automatic ligatures (`calt`): JetBrains Mono's code ligatures (`=>`, `!=`)
  are half the font, Inter's arrows (`->`) go with them — text reads as typed;
- no fraction glyphs, no `pnum` (Inter's figures are proportional by default).

Kerning, marks, localized forms and tabular figures stay. Latin and Cyrillic
coverage is untouched.

Usage: python3 scripts/slim-fonts.py   (needs fontTools and brotli:
pip install fonttools brotli), then scripts/embed-fonts.sh.
"""
import io
import pathlib

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

ROOT = pathlib.Path(__file__).resolve().parent.parent
WEIGHTS = (400, 600)
FEATURES = {
    "inter-latin": ["ccmp", "locl", "tnum", "kern", "mark", "mkmk"],
    "inter-cyrillic": ["ccmp", "tnum", "kern", "mark", "mkmk"],
    "jetbrains-mono-latin": ["ccmp", "locl", "mark"],
    "jetbrains-mono-cyrillic": ["ccmp", "mark"],
}


def slim(name, features):
    font = TTFont(ROOT / "fonts/source" / f"{name}.woff2")
    options = subset.Options()
    options.layout_features = features
    options.name_IDs = ["*"]  # keep the copyright and license records the OFL asks for
    options.name_languages = ["*"]
    options.notdef_outline = True
    options.hinting = False
    subsetter = subset.Subsetter(options)
    subsetter.populate(unicodes=font.getBestCmap().keys())
    subsetter.subset(font)
    # instancer needs a plain, fully loaded font: round-trip through bytes first
    buf = io.BytesIO()
    font.flavor = None
    font.save(buf)
    buf.seek(0)
    font = instancer.instantiateVariableFont(TTFont(buf), {"wght": WEIGHTS}, updateFontNames=False)
    font.flavor = "woff2"
    out = ROOT / "fonts" / f"{name}.woff2"
    font.save(out)
    return out.stat().st_size


if __name__ == "__main__":
    for name, features in FEATURES.items():
        before = (ROOT / "fonts/source" / f"{name}.woff2").stat().st_size
        print(f"{name:26s} {before:7,d} -> {slim(name, features):7,d} B")
