#!/usr/bin/env bash
# Regenerates the embedded @font-face base64 block inside theme.css.
# Re-run any time a file under fonts/ changes; only the marker-delimited
# block is touched, so this is safe to run repeatedly.
set -euo pipefail
cd "$(dirname "$0")/.."

encode() { base64 -i "$1" | tr -d '\n'; }

INTER_LATIN=$(encode fonts/inter-latin.woff2)
INTER_CYRILLIC=$(encode fonts/inter-cyrillic.woff2)
MONO_LATIN=$(encode fonts/jetbrains-mono-latin.woff2)
MONO_CYRILLIC=$(encode fonts/jetbrains-mono-cyrillic.woff2)

python3 - "$INTER_LATIN" "$INTER_CYRILLIC" "$MONO_LATIN" "$MONO_CYRILLIC" <<'PYEOF'
import re, sys, pathlib

inter_latin, inter_cyr, mono_latin, mono_cyr = sys.argv[1:5]
css_path = pathlib.Path("theme.css")
css = css_path.read_text()

LATIN_RANGE = ("U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+2000-206F,U+2074,"
               "U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD")
CYRILLIC_RANGE = ("U+0301,U+0400-052F,U+1C80-1C88,U+2DE0-2DFF,U+A640-A69F,U+FE2E-FE2F")

block = f"""/* FONTS:GENERATED:START — produced by scripts/embed-fonts.sh, do not hand-edit */
@font-face {{
  font-family: Inter;
  src: url("data:font/woff2;base64,{inter_latin}") format("woff2");
  font-weight: 400 600;
  font-style: normal;
  font-display: swap;
  unicode-range: {LATIN_RANGE};
}}

@font-face {{
  font-family: Inter;
  src: url("data:font/woff2;base64,{inter_cyr}") format("woff2");
  font-weight: 400 600;
  font-style: normal;
  font-display: swap;
  unicode-range: {CYRILLIC_RANGE};
}}

@font-face {{
  font-family: "JetBrains Mono";
  src: url("data:font/woff2;base64,{mono_latin}") format("woff2");
  font-weight: 400 600;
  font-style: normal;
  font-display: swap;
  unicode-range: {LATIN_RANGE};
}}

@font-face {{
  font-family: "JetBrains Mono";
  src: url("data:font/woff2;base64,{mono_cyr}") format("woff2");
  font-weight: 400 600;
  font-style: normal;
  font-display: swap;
  unicode-range: {CYRILLIC_RANGE};
}}

/* FONTS:GENERATED:END */"""

pattern = re.compile(r"/\* FONTS:GENERATED:START.*?FONTS:GENERATED:END \*/", re.DOTALL)
if not pattern.search(css):
    print("ERROR: marker block not found in theme.css", file=sys.stderr)
    sys.exit(1)
css = pattern.sub(lambda _: block, css)
css_path.write_text(css)
print("theme.css font block regenerated.")
PYEOF
