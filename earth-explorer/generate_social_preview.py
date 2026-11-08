"""Generate the Earth Explorer sharing card using Pillow."""

import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent
WIDTH, HEIGHT = 1200, 630
ACCENT = "#8abaff"


def font(size, bold=False):
    name = "Arial Bold.ttf" if bold else "Arial.ttf"
    candidates = [
        Path("/System/Library/Fonts/Supplemental") / name,
        Path("/usr/share/fonts/truetype/dejavu") /
        ("DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf"),
    ]
    for path in candidates:
        if path.exists():
            return ImageFont.truetype(str(path), size)
    raise RuntimeError("Install Arial or DejaVu Sans to generate the preview.")


def generate():
    image = Image.new("RGB", (WIDTH, HEIGHT), "#101419")
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle((22, 22, 1178, 608), 28, fill="#191e25", outline="#303842", width=2)
    draw.text((64, 62), "ALPHADYN  /  THE INTERACTIVE ATLAS", font=font(16, True), fill=ACCENT)
    draw.text((60, 170), "Earth", font=font(72, True), fill="#edf1f5")
    draw.text((60, 252), "Explorer", font=font(72, True), fill="#edf1f5")
    draw.text((64, 364), "Explore. Locate. Measure.", font=font(25), fill="#a1acba")
    for x, width, label in [(64, 135, "3D GLOBE"), (211, 176, "STREET MAPS"), (399, 127, "SEARCH")]:
        draw.rounded_rectangle((x, 432, x + width, 474), 8, fill="#233248", outline="#455b76")
        draw.text((x + 14, 444), label, font=font(14, True), fill="#dceaff")
    draw.text((64, 547), "alphadyn.github.io/apps/earth-explorer", font=font(16), fill="#a1acba")

    cx, cy, radius = 865, 315, 202
    draw.ellipse((cx - radius - 12, cy - radius - 12, cx + radius + 12, cy + radius + 12), fill="#202e40")
    draw.ellipse((cx - radius, cy - radius, cx + radius, cy + radius), fill="#213e5c", outline=ACCENT, width=3)
    draw.polygon([(705, 212), (754, 178), (812, 200), (831, 250), (786, 287),
                  (777, 331), (730, 313)], fill="#7896b1")
    draw.polygon([(791, 350), (830, 328), (875, 358), (865, 410),
                  (827, 487), (805, 444)], fill="#7896b1")
    draw.polygon([(919, 126), (989, 163), (1033, 223), (995, 253),
                  (948, 237), (920, 272), (872, 247), (893, 191)], fill="#7896b1")
    draw.ellipse((cx - 94, cy - radius, cx + 94, cy + radius), outline="#8aaccd", width=2)
    draw.line((cx - radius, cy, cx + radius, cy), fill="#8aaccd", width=2)
    for offset in [-100, 100]:
        half = math.sqrt(radius ** 2 - offset ** 2)
        draw.line((cx - half, cy + offset, cx + half, cy + offset), fill="#6489ad", width=2)
    draw.arc((625, 163, 1104, 474), 5, 155, fill=ACCENT, width=4)
    draw.polygon([(1050, 105), (1018, 260), (946, 181)], fill="#e1eeff", outline="#172637", width=3)
    draw.polygon([(1050, 105), (986, 213), (1018, 260)], fill="#8abaff")
    draw.ellipse((650, 407, 663, 420), fill="#edf1f5")
    image.save(ROOT / "social-preview.png", optimize=True)


if __name__ == "__main__":
    generate()
