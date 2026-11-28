"""Generate the static link preview with Pillow and resvg-py."""

from io import BytesIO
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont
import resvg_py

HERE = Path(__file__).resolve().parent
GREEN = "#31765a"
INK = "#253e32"
MUTED = "#768078"
PAPER = "#f6f7f2"


def font(size, bold=False):
    for path in (
        Path("/System/Library/Fonts/Supplemental") / ("Arial Bold.ttf" if bold else "Arial.ttf"),
        Path("/usr/share/fonts/truetype/dejavu") / ("DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf"),
    ):
        if path.exists():
            return ImageFont.truetype(str(path), size)
    raise FileNotFoundError("Install Arial or DejaVu fonts to generate the preview.")


def generate(destination=HERE / "social-preview.png"):
    image = Image.new("RGB", (1200, 630), PAPER)
    draw = ImageDraw.Draw(image)
    icon = resvg_py.svg_to_bytes(svg_string=(HERE / "icon.svg").read_text(), width=56, height=56)
    with Image.open(BytesIO(icon)) as rendered:
        mark = rendered.convert("RGBA")
        image.paste(mark, (56, 48), mark)
    draw.text((128, 50), "Weight Tracker", font=font(28, True), fill=INK)
    draw.text((129, 85), "A little progress, every day.", font=font(14), fill=MUTED)
    draw.text((56, 164), "YOUR PERSONAL JOURNAL", font=font(14, True), fill=GREEN)
    draw.text((52, 212), "Small steps.", font=font(58, True), fill=INK)
    draw.text((52, 284), "A clearer picture.", font=font(50, True), fill=INK)
    draw.text((56, 388), "Daily check-ins. Meaningful averages.", font=font(22), fill=MUTED)
    draw.text((56, 425), "Private, encrypted, and on-device.", font=font(22), fill=MUTED)
    draw.rounded_rectangle((56, 510, 343, 562), radius=10, fill=GREEN)
    draw.text((78, 526), "One check-in at a time", font=font(20, True), fill="white")
    draw.text((56, 592), "ALPHADYN APPS", font=font(12, True), fill=MUTED)

    draw.rounded_rectangle((620, 48, 1144, 582), radius=20, fill="white", outline="#e4e8e0", width=2)
    draw.text((652, 79), "THE BIG PICTURE", font=font(13, True), fill=GREEN)
    draw.text((652, 116), "Weight over time", font=font(29, True), fill=INK)
    draw.rounded_rectangle((652, 180, 1112, 225), radius=9, fill="#f1f6ee")
    draw.text((673, 194), "Daily mean", font=font(16, True), fill=GREEN)
    draw.text((941, 194), "Pounds / kg", font=font(16), fill=MUTED)
    for y in (275, 330, 385, 440):
        draw.line((652, y, 1112, y), fill="#e8ede8", width=2)
    points = [(663, 285), (721, 312), (783, 301), (845, 354), (913, 342), (981, 390), (1096, 421)]
    draw.polygon([points[0], *points, (1096, 440), (663, 440)], fill="#edf4ea")
    for y in (330, 385, 440):
        draw.line((652, y, 1112, y), fill="#e8ede8", width=1)
    draw.line(points, fill=GREEN, width=4, joint="curve")
    for x, y in points:
        draw.ellipse((x - 5, y - 5, x + 5, y + 5), fill=GREEN, outline="white", width=2)
    draw.text((652, 464), "ILLUSTRATIVE DAILY AVERAGES", font=font(11), fill=MUTED)
    draw.line((652, 504, 1112, 504), fill="#e4e8e0", width=1)
    draw.text((652, 529), "Date filters", font=font(16), fill=INK)
    draw.text((876, 529), "JSON / PNG exports", font=font(16), fill=INK)
    image.save(destination, format="PNG", optimize=True)
    print(f"Wrote {destination} (1200x630)")


if __name__ == "__main__":
    generate()
