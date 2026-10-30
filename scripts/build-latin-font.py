"""Build Instrument Sans Q, the Latin web font of apps/web and apps/finance.

Instrument Sans Q is Instrument Sans (SIL OFL 1.1) with these changes:
  - width fixed at wdth 96.5; weight stays variable;
  - stylistic set ss03 (the y with a curved tail) frozen on;
  - CSS weight 400 draws design weight 500 and 700 stays 700, linear between;
  - space and middle dot widened to ABC Diatype's advances, so that " · "
    separates words as clearly as it does there;
  - subset to Latin, as woff2.

Requires Python 3 with fonttools[woff]==4.68.0 and
opentype-feature-freezer==1.32.2. Run from the repository root:

    python3 scripts/build-latin-font.py
"""

import hashlib
import io
import os
import shutil
import subprocess
import sys
import tempfile
import urllib.request
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

SOURCE_COMMIT = "0b58fb370093f9a9f4ff785d94405710b79de67c"
SOURCE_BASE = (
    f"https://raw.githubusercontent.com/google/fonts/{SOURCE_COMMIT}/ofl/instrumentsans"
)
SOURCE_FONT_URL = f"{SOURCE_BASE}/InstrumentSans%5Bwdth,wght%5D.ttf"
SOURCE_FONT_SHA256 = "b24f1812584816958afcf22e22d08e44318c5e51651e25d2438efdde389b33b1"
SOURCE_LICENSE_URL = f"{SOURCE_BASE}/OFL.txt"
SOURCE_DATE_EPOCH = 1793320972

WIDTH = 96.5
DESIGN_WEIGHT_FOR_CSS_400 = 500
ADVANCES_AT_CSS_400 = {" ": 223, "·": 250}
UNICODES = (
    "U+0000,U+0020-007E,U+00A0-00AC,U+00AE-017F,U+02BB-02BC,U+02C6,U+02DA,"
    "U+02DC,U+2000-200B,U+2010-2027,U+202F-2055,U+2057,U+205F,U+2074,U+20AC,"
    "U+2122,U+2191,U+2193,U+2212,U+FEFF"
)
FEATURES = "kern,liga,calt,ccmp,locl,mark,mkmk,case,tnum,pnum"
NAME_IDS = "0,1,2,3,4,5,6,13,14"

OUTPUT_NAME = "InstrumentSansQ-Variable.woff2"
LICENSE_NAME = "InstrumentSansQ-OFL.txt"
OUTPUT_DIRS = [Path("apps/web/public"), Path("apps/finance/public")]


def fetch(url: str) -> bytes:
    with urllib.request.urlopen(url) as response:
        return response.read()


def shift_css_400_to_design_weight(font: TTFont, design_weight: float) -> None:
    axis = next(a for a in font["fvar"].axes if a.axisTag == "wght")
    assert axis.minValue == axis.defaultValue == 400, "expects wght 400 as min and default"
    instantiateVariableFont(
        font, {"wght": (design_weight, design_weight, axis.maxValue)}, inplace=True
    )
    axis.minValue = axis.defaultValue = 400
    font["OS/2"].usWeightClass = 400


def widen_evenly(font: TTFont, char: str, advance: int) -> None:
    glyph_name = font.getBestCmap()[ord(char)]
    old_advance, lsb = font["hmtx"][glyph_name]
    assert advance >= old_advance, f"{char!r} is already {old_advance} wide"
    glyph = font["glyf"][glyph_name]
    shift = 0
    if glyph.numberOfContours:
        shift = (advance - old_advance) // 2
        if glyph.isComposite():
            for component in glyph.components:
                component.x += shift
        else:
            glyph.coordinates.translate((shift, 0))
    # The gvar and HVAR deltas are relative, so the same change applies at all weights.
    font["hmtx"][glyph_name] = (advance, lsb + shift)


def freeze_ss03(source: Path, output: Path) -> None:
    subprocess.run(
        [
            sys.executable,
            "-m",
            "opentype_feature_freezer.cli",
            "--features=ss03",
            "--suffix",
            "--usesuffix=Q",
            str(source),
            str(output),
        ],
        check=True,
    )


def main() -> None:
    os.environ["SOURCE_DATE_EPOCH"] = str(SOURCE_DATE_EPOCH)
    source = fetch(SOURCE_FONT_URL)
    digest = hashlib.sha256(source).hexdigest()
    if digest != SOURCE_FONT_SHA256:
        sys.exit(f"Source font sha256 is {digest}, expected {SOURCE_FONT_SHA256}")
    license_text = fetch(SOURCE_LICENSE_URL)

    with tempfile.TemporaryDirectory() as tmp:
        work = Path(tmp)

        font = TTFont(io.BytesIO(source))
        instantiateVariableFont(font, {"wdth": WIDTH}, inplace=True)
        font.save(work / "width.ttf")
        freeze_ss03(work / "width.ttf", work / "frozen.ttf")

        font = TTFont(work / "frozen.ttf")
        shift_css_400_to_design_weight(font, DESIGN_WEIGHT_FOR_CSS_400)
        for char, advance in ADVANCES_AT_CSS_400.items():
            widen_evenly(font, char, advance)
        font.save(work / "weighted.ttf")

        subset.main(
            [
                str(work / "weighted.ttf"),
                f"--unicodes={UNICODES}",
                f"--layout-features={FEATURES}",
                f"--name-IDs={NAME_IDS}",
                "--flavor=woff2",
                f"--output-file={work / OUTPUT_NAME}",
            ]
        )

        for directory in OUTPUT_DIRS:
            shutil.copyfile(work / OUTPUT_NAME, directory / OUTPUT_NAME)
            (directory / LICENSE_NAME).write_bytes(license_text)
            print(f"Wrote {directory / OUTPUT_NAME}")


if __name__ == "__main__":
    main()
