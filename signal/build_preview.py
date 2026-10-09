#!/usr/bin/env python3
"""Render the 1200x630 app-themed link preview used for texts and social shares."""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent
FONT_PATH = ROOT / "assets" / "fonts" / "Manrope.ttf"
OUTPUT = ROOT / "assets" / "social-preview.png"
SCALE = 2
BG, INK, GREEN, SAGE, GREY = (244, 245, 242), (32, 40, 32), (49, 90, 67), (141, 159, 98), (93, 103, 93)


def font(size: int, weight: bytes) -> ImageFont.FreeTypeFont:
    loaded = ImageFont.truetype(str(FONT_PATH), size * SCALE)
    loaded.set_variation_by_name(weight)
    return loaded


def render() -> Image.Image:
    image = Image.new("RGB", (1200 * SCALE, 630 * SCALE), BG)
    draw = ImageDraw.Draw(image)

    def rounded(box, radius, **kwargs):
        draw.rounded_rectangle([v * SCALE for v in box], radius * SCALE, **kwargs)

    def text(xy, value, face, fill, anchor="ls"):
        draw.text((xy[0] * SCALE, xy[1] * SCALE), value, font=face, fill=fill, anchor=anchor)

    def arrow_up_right(x, y, size, color):
        points = ((x, y + size), (x + size, y), (x + size * 0.38, y))
        draw.line([(px * SCALE, py * SCALE) for px, py in points], fill=color, width=2 * SCALE)
        draw.line((((x + size) * SCALE, y * SCALE), ((x + size) * SCALE, (y + size * 0.62) * SCALE)),
                  fill=color, width=2 * SCALE)

    # App header and wordmark
    for x, height in ((70, 12), (78, 20), (86, 15)):
        rounded((x, 47 + 20 - height, x + 5, 67), 3, fill=GREEN)
    wordmark = font(22, b"ExtraBold")
    text((100, 66), "signal", wordmark, INK, "ls")
    text((100 + draw.textlength("signal", font=wordmark) / SCALE, 66), ".", wordmark, SAGE, "ls")
    text((1128, 66), "GITHUB PAGES   /   GOOGLE NEWS", font(11, b"Medium"), GREY, "rs")
    draw.line((70 * SCALE, 91 * SCALE, 1130 * SCALE, 91 * SCALE), fill=(226, 229, 223), width=1 * SCALE)

    # Hero copy mirrors the live page.
    text((70, 145), "SIGNAL  /  YOUR DAILY BRIEFING", font(11, b"Medium"), GREY)
    title = font(70, b"ExtraBold")
    text((70, 243), "Headlines,", title, INK)
    text((70, 317), "in focus.", title, SAGE)
    body = font(19, b"Medium")
    text((72, 365), "A focused, searchable reading list of", body, GREY)
    text((72, 392), "today’s Google News headlines.", body, GREY)

    rounded((70, 423, 320, 469), 5, fill=GREEN)
    text((88, 451), "Capture today’s headlines", font(14, b"SemiBold"), BG, "lm")
    arrow_up_right(298, 441, 11, BG)
    text((72, 490), "✳  A little more signal. A little less scroll.", font(12, b"Medium"), GREY)

    # A compact mockup of the actual collection and trends UI.
    rounded((638, 116, 1130, 544), 7, fill=(233, 237, 230), outline=(225, 230, 220), width=1 * SCALE)
    text((664, 147), "YOUR COLLECTION", font(10, b"Medium"), GREY)
    text((664, 181), "Latest capture", font(25, b"Bold"), INK)
    rounded((1011, 132, 1104, 160), 4, fill=(244, 245, 242))
    text((1044, 146), "SEARCH", font(9, b"Medium"), GREY, "mm")
    draw.ellipse((1081 * SCALE, 139 * SCALE, 1090 * SCALE, 148 * SCALE), outline=GREY, width=1 * SCALE)
    draw.line((1088 * SCALE, 146 * SCALE, 1093 * SCALE, 151 * SCALE), fill=GREY, width=1 * SCALE)

    rounded((662, 197, 1106, 246), 5, fill=(244, 245, 242), outline=(229, 233, 225), width=1 * SCALE)
    rounded((676, 208, 700, 232), 12, fill=(221, 232, 220))
    draw.line((688 * SCALE, 213 * SCALE, 688 * SCALE, 227 * SCALE), fill=GREEN, width=1 * SCALE)
    draw.line((681 * SCALE, 220 * SCALE, 695 * SCALE, 220 * SCALE), fill=GREEN, width=1 * SCALE)
    draw.line((683 * SCALE, 215 * SCALE, 693 * SCALE, 225 * SCALE), fill=GREEN, width=1 * SCALE)
    draw.line((693 * SCALE, 215 * SCALE, 683 * SCALE, 225 * SCALE), fill=GREEN, width=1 * SCALE)
    text((713, 215), "12 stories in your briefing", font(12, b"SemiBold"), INK)
    text((713, 233), "Loaded across 8 of 9 Google News feeds", font(10, b"Regular"), GREY)
    text((1090, 221), "8 FEEDS", font(9, b"Medium"), GREY, "rm")

    text((664, 278), "TRENDING WORDS & PHRASES", font(10, b"Medium"), GREY)
    for box, label, active in (
        ((664, 292, 727, 320), "AI", True),
        ((735, 292, 823, 320), "Markets", False),
        ((831, 292, 916, 320), "Climate", False),
    ):
        rounded(box, 4, fill=GREEN if active else (244, 245, 242),
                outline=GREEN if active else (214, 221, 210), width=1 * SCALE)
        text(((box[0] + box[2]) / 2, (box[1] + box[3]) / 2), label,
             font(11, b"SemiBold"), BG if active else GREEN, "mm")

    for y, number, heading, section in (
        (338, "01", "New research points to a changing outlook", "SCIENCE"),
        (411, "02", "What markets are watching this week", "BUSINESS"),
    ):
        rounded((662, y, 1106, y + 61), 5, fill=(255, 255, 255), outline=(230, 233, 227), width=1 * SCALE)
        text((678, y + 22), number, font(10, b"Medium"), SAGE)
        text((708, y + 23), heading, font(12, b"SemiBold"), INK)
        rounded((708, y + 34, 770, y + 51), 3, fill=(237, 241, 233))
        text((739, y + 42), section, font(8, b"Medium"), GREY, "mm")
        arrow_up_right(1083, y + 14, 9, GREEN)

    # Domain footer
    draw.line((70 * SCALE, 567 * SCALE, 1130 * SCALE, 567 * SCALE), fill=(226, 229, 223), width=1 * SCALE)
    text((70, 599), "SIGNAL CAPTURE", font(10, b"Medium"), GREY, "lm")
    text((1130, 599), "ALPHADYN.GITHUB.IO/APPS/SIGNAL", font(10, b"Medium"), GREY, "rm")
    return image.resize((1200, 630), Image.Resampling.LANCZOS)


if __name__ == "__main__":
    render().save(OUTPUT, optimize=True)
    print(f"Wrote {OUTPUT}")
