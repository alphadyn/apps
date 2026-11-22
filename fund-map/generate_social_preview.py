"""Generate illustrative Fund Map sharing artwork. Requires Pillow."""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent
BACKGROUND = "#0c1118"
TEXT = "#eef2f6"
MUTED = "#9eacbd"


def font(size, bold=False):
    names = (
        Path("/System/Library/Fonts/Supplemental") / ("Arial Bold.ttf" if bold else "Arial.ttf"),
        Path("/usr/share/fonts/truetype/dejavu") / ("DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf"),
    )
    for path in names:
        if path.exists():
            return ImageFont.truetype(str(path), size)
    raise FileNotFoundError("Install Arial or DejaVu Sans to generate the preview artwork.")


def generate(destination=HERE / "social-preview.png"):
    image = Image.new("RGB", (1200, 630), BACKGROUND)
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle((56, 42, 104, 90), radius=10, fill="#17212d")
    for box, color in (
        ((64, 50, 82, 68), "#77c591"), ((64, 72, 82, 82), "#0b8e37"),
        ((86, 50, 96, 60), "#c57e77"), ((86, 64, 96, 82), "#8e160b"),
    ):
        draw.rectangle(box, fill=color)
    draw.text((120, 55), "ALPHADYN / MARKETS", font=font(19, True), fill=MUTED)
    draw.text((56, 112), "Funds at a glance.", font=font(58, True), fill=TEXT)
    draw.text((58, 191), "Net-asset sized. Illustrative DCF estimates.", font=font(26), fill=MUTED)

    for box, color in (
        ((56, 256, 364, 540), "#a6352a"),
        ((366, 256, 602, 398), "#454d5c"),
        ((366, 400, 602, 540), "#454d5c"),
        ((604, 256, 876, 430), "#388753"),
        ((878, 256, 1144, 430), "#454d5c"),
        ((604, 432, 784, 540), "#c57e77"),
        ((786, 432, 964, 540), "#454d5c"),
        ((966, 432, 1144, 540), "#77c591"),
    ):
        draw.rectangle(box, fill=color)
    draw.text((58, 568), "Fund Map", font=font(24, True), fill=TEXT)
    draw.text((210, 572), "Index funds, mutual funds, and ETFs.", font=font(18), fill=MUTED)
    draw.text((1144, 578), "Illustrative map", font=font(14), fill=MUTED, anchor="ra")
    image.save(destination, optimize=True)


if __name__ == "__main__":
    generate()
