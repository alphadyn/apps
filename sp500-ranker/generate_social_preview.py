"""Render the S&P 500 Ranker link-preview images.

Writes social-preview.png (1200x630, used by og:image / twitter:image for
iMessage, SMS/RCS, WhatsApp, Slack, etc.) and apple-touch-icon.png (180x180).
The artwork is illustrative and contains no market data, so it never goes stale.

Usage: python3 sp500-ranker/generate_social_preview.py
"""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = Path(__file__).resolve().parent
FONT_DIR = Path("/System/Library/Fonts/Supplemental")

BG = (244, 247, 251)
SURFACE = (255, 255, 255)
SURFACE_2 = (247, 249, 252)
BORDER = (220, 228, 238)
TEXT = (23, 35, 51)
TEXT_2 = (69, 85, 106)
MUTED = (104, 120, 141)
ACCENT = (8, 127, 140)
ACCENT_2 = (53, 102, 214)
UP = (22, 134, 91)
DOWN = (196, 61, 88)
BRAND_BG = (19, 27, 48)


def font(name, size):
    for candidate in (FONT_DIR / name, Path("/Library/Fonts") / name):
        if candidate.exists():
            return ImageFont.truetype(str(candidate), size)
    return ImageFont.load_default()


def brand_mark(draw, x, y, size):
    scale = size / 64
    draw.rounded_rectangle((x, y, x + size, y + size), radius=14 * scale, fill=BRAND_BG)
    for bx, by, color in ((12, 34, ACCENT_2), (27, 22, ACCENT), (42, 12, ACCENT_2)):
        draw.rounded_rectangle(
            (x + bx * scale, y + by * scale, x + (bx + 10) * scale, y + 52 * scale),
            radius=2 * scale,
            fill=color,
        )


def glow(image, center, radius, color, alpha):
    layer = Image.new("RGBA", image.size, (0, 0, 0, 0))
    cx, cy = center
    ImageDraw.Draw(layer).ellipse((cx - radius, cy - radius, cx + radius, cy + radius), fill=(*color, alpha))
    image.alpha_composite(layer.filter(ImageFilter.GaussianBlur(radius / 2)))


def pill(draw, xy, text, fnt, fill, outline, color):
    x, y = xy
    width = draw.textlength(text, font=fnt)
    draw.rounded_rectangle((x, y, x + width + 28, y + 38), radius=10, fill=fill, outline=outline, width=2)
    draw.text((x + 14, y + 19), text, font=fnt, fill=color, anchor="lm")
    return x + width + 28


def social_preview():
    width, height = 1200, 630
    image = Image.new("RGBA", (width, height), (*BG, 255))
    glow(image, (1050, 40), 260, ACCENT, 46)
    glow(image, (120, 640), 240, ACCENT_2, 40)
    draw = ImageDraw.Draw(image)

    bold = lambda s: font("Arial Bold.ttf", s)
    regular = lambda s: font("Arial.ttf", s)

    brand_mark(draw, 64, 60, 56)
    draw.text((136, 88), "S&P 500 ", font=bold(30), fill=TEXT, anchor="lm")
    draw.text((136 + draw.textlength("S&P 500 ", font=bold(30)), 88), "Ranker", font=bold(30), fill=ACCENT, anchor="lm")

    draw.text((64, 178), "EQUITY SCREENER", font=bold(20), fill=ACCENT)
    draw.text((64, 212), "Rank the", font=bold(66), fill=TEXT)
    draw.text((64, 286), "S&P 500", font=bold(66), fill=TEXT)
    draw.text((64, 360), "your way", font=bold(66), fill=ACCENT)
    draw.text(
        (64, 456),
        "Sort by market cap, net income, growth\nand momentum. Explore 10 years of prices.",
        font=regular(25),
        fill=TEXT_2,
        spacing=10,
    )
    x = 64
    for label in ("Market cap", "Net income", "1Y growth"):
        x = pill(draw, (x, 548), label, bold(18), SURFACE_2, BORDER, TEXT_2) + 10

    # Mock ranked table (illustrative only).
    px, py, pw, ph = 640, 120, 500, 420
    draw.rounded_rectangle((px, py, px + pw, py + ph), radius=22, fill=SURFACE, outline=BORDER, width=2)
    draw.text((px + 28, py + 34), "#", font=bold(15), fill=MUTED, anchor="lm")
    draw.text((px + 64, py + 34), "SECURITY", font=bold(15), fill=MUTED, anchor="lm")
    draw.text((px + pw - 28, py + 34), "1Y", font=bold(15), fill=ACCENT, anchor="rm")
    draw.line((px, py + 62, px + pw, py + 62), fill=BORDER, width=2)
    rows = [
        ("1", (190, 70, 62), 0.92, True),
        ("2", (200, 70, 62), 0.78, True),
        ("3", (280, 60, 66), 0.64, True),
        ("4", (330, 70, 66), 0.47, True),
        ("5", (150, 60, 55), 0.30, False),
    ]
    row_h = 70
    for index, (rank, _, strength, up) in enumerate(rows):
        top = py + 62 + index * row_h
        mid = top + row_h / 2
        if index:
            draw.line((px + 20, top, px + pw - 20, top), fill=BORDER, width=1)
        draw.text((px + 28, mid), rank, font=bold(20), fill=MUTED, anchor="lm")
        hue = [ACCENT_2, ACCENT, (192, 132, 252), (244, 114, 182), (251, 191, 36)][index]
        draw.rounded_rectangle((px + 64, mid - 16, px + 64 + 110, mid - 4), radius=5, fill=TEXT_2)
        draw.rounded_rectangle((px + 64, mid + 6, px + 74, mid + 16), radius=2, fill=hue)
        draw.rounded_rectangle((px + 82, mid + 7, px + 82 + 120, mid + 15), radius=4, fill=BORDER)
        bar_w = 170 * strength
        bar_x = px + pw - 120 - bar_w
        draw.rounded_rectangle((bar_x, mid - 6, px + pw - 120, mid + 6), radius=6, fill=BORDER)
        draw.rounded_rectangle((bar_x, mid - 6, bar_x + bar_w * 0.9, mid + 6), radius=6, fill=ACCENT_2 if index % 2 else ACCENT)
        color = UP if up else DOWN
        tint = (229, 244, 237) if up else (250, 235, 238)
        draw.rounded_rectangle((px + pw - 100, mid - 15, px + pw - 28, mid + 15), radius=8, fill=tint)
        draw.polygon(
            [(px + pw - 64, mid - 7), (px + pw - 73, mid + 6), (px + pw - 55, mid + 6)]
            if up
            else [(px + pw - 64, mid + 7), (px + pw - 73, mid - 6), (px + pw - 55, mid - 6)],
            fill=color,
        )

    # Sparkline badge overlapping the table.
    cx, cy, cw, chh = 820, 470, 340, 120
    shadow = Image.new("RGBA", image.size, (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle((cx, cy + 10, cx + cw, cy + chh + 10), radius=18, fill=(35, 55, 80, 45))
    image.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(14)))
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle((cx, cy, cx + cw, cy + chh), radius=18, fill=SURFACE_2, outline=BORDER, width=2)
    for i, label in enumerate(("1M", "1Y", "5Y", "ALL")):
        lx = cx + 22 + i * 52
        active = label == "5Y"
        if active:
            draw.rounded_rectangle((lx - 8, cy + 14, lx + 36, cy + 38), radius=7, fill=(234, 240, 247))
        draw.text((lx + 14, cy + 26), label, font=bold(13), fill=TEXT if active else MUTED, anchor="mm")
    points = [0.10, 0.14, 0.12, 0.2, 0.18, 0.28, 0.25, 0.36, 0.44, 0.40, 0.55, 0.52, 0.66, 0.62, 0.78, 0.74, 0.9]
    left, right, bottom, top = cx + 22, cx + cw - 22, cy + chh - 16, cy + 50
    coords = [
        (left + (right - left) * i / (len(points) - 1), bottom - (bottom - top) * value)
        for i, value in enumerate(points)
    ]
    fill = Image.new("RGBA", image.size, (0, 0, 0, 0))
    ImageDraw.Draw(fill).polygon(coords + [(right, bottom), (left, bottom)], fill=(*UP, 46))
    image.alpha_composite(fill)
    draw = ImageDraw.Draw(image)
    draw.line(coords, fill=UP, width=4, joint="curve")
    draw.ellipse((coords[-1][0] - 6, coords[-1][1] - 6, coords[-1][0] + 6, coords[-1][1] + 6), fill=TEXT, outline=UP, width=3)

    image.convert("RGB").save(HERE / "social-preview.png", optimize=True)


def touch_icon():
    size = 180
    image = Image.new("RGB", (size, size), BRAND_BG)
    draw = ImageDraw.Draw(image)
    scale = size / 64
    for bx, by, color in ((12, 34, ACCENT_2), (27, 22, ACCENT), (42, 12, ACCENT_2)):
        draw.rounded_rectangle(
            (bx * scale, by * scale, (bx + 10) * scale, 52 * scale), radius=2 * scale, fill=color
        )
    image.save(HERE / "apple-touch-icon.png", optimize=True)


if __name__ == "__main__":
    social_preview()
    touch_icon()
    print("Wrote social-preview.png and apple-touch-icon.png")
