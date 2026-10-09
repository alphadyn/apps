#!/usr/bin/env python3
"""Render assets/social-preview.png, the 1200x630 link preview used for texts and social shares."""

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

    # Brand tile on the right
    rounded((790, 115, 1110, 435), 64, fill=GREEN)
    for x, top, color in [(842, 290, BG), (922, 195, BG), (1002, 245, SAGE)]:
        rounded((x, top, x + 56, 385), 28, fill=color)

    # Small wordmark
    wordmark = font(40, b"ExtraBold")
    text((96, 112), "signal", wordmark, INK)
    text((96 + draw.textlength("signal", font=wordmark) / SCALE, 112), ".", wordmark, SAGE)

    # Title and description
    title = font(100, b"ExtraBold")
    text((96, 290), "Headlines,", title, INK)
    text((96, 394), "in focus.", title, SAGE)
    body = font(34, b"Medium")
    text((96, 468), "Today’s Google News headlines, ranked by", body, GREY)
    text((96, 514), "trending words and phrases.", body, GREY)

    # Domain footer
    rounded((0, 590, 1200, 630), 0, fill=GREEN)
    text((96, 611), "alphadyn.github.io/apps/signal", font(22, b"SemiBold"), BG, "lm")
    return image.resize((1200, 630), Image.LANCZOS)


if __name__ == "__main__":
    render().save(OUTPUT, optimize=True)
    print(f"Wrote {OUTPUT}")
