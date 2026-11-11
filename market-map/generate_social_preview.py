"""Generate static, illustrative SMS/social artwork without snapshot dependencies.

Run from any directory: python3 market-map/generate_social_preview.py
Requires Pillow. The generated PNG is committed so crawlers need no JavaScript.
"""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent
BACKGROUND = "#0c1118"
TEXT = "#eef2f6"
MUTED = "#9eacbd"
COLORS = ("#26734e", "#389265", "#64c398", "#973a35", "#bd5149", "#d68178")


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
        ((64, 50, 82, 68), "#64c398"), ((64, 72, 82, 82), "#26734e"),
        ((86, 50, 96, 60), "#d68178"), ((86, 64, 96, 82), "#973a35"),
    ):
        draw.rectangle(box, fill=color)
    draw.text((120, 55), "ALPHADYN / MARKETS", font=font(19, True), fill=MUTED)
    draw.text((56, 112), "The S&P 500 at a glance.", font=font(58, True), fill=TEXT)
    draw.text((58, 191), "Market-cap sized. Colored by implied DCF upside.", font=font(26), fill=MUTED)

    def tiles(x, y, width, height, depth, seed):
        if depth == 0:
            draw.rectangle(
                (x + 1, y + 1, x + width - 1, y + height - 1),
                fill=COLORS[seed % len(COLORS)],
            )
            return
        ratio = (0.48, 0.57, 0.39)[seed % 3]
        if width >= height:
            cut = round(width * ratio)
            tiles(x, y, cut, height, depth - 1, seed * 2 + 1)
            tiles(x + cut, y, width - cut, height, depth - 1, seed * 2 + 2)
        else:
            cut = round(height * ratio)
            tiles(x, y, width, cut, depth - 1, seed * 2 + 1)
            tiles(x, y + cut, width, height - cut, depth - 1, seed * 2 + 2)

    # Abstract tiles communicate the app without presenting stale stock valuations.
    for x, width, depth, seed in ((56, 300, 2, 1), (356, 250, 3, 5), (606, 538, 6, 9)):
        tiles(x, 256, width, 284, depth, seed)
    draw.text((58, 568), "Market Map", font=font(24, True), fill=TEXT)
    draw.text((238, 572), "Explore every company. See the bigger picture.", font=font(18), fill=MUTED)
    draw.text((1144, 578), "Illustrative map", font=font(14), fill=MUTED, anchor="ra")
    image.save(destination, optimize=True)


if __name__ == "__main__":
    generate()
