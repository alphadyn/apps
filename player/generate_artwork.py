"""Generate Player app icons and social-preview artwork."""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent
NAVY = "#122137"
NAVY_LIGHT = "#1c3551"
INK = "#17263c"
MUTED = "#64748b"
CYAN = "#5ed7d0"
BLUE = "#7399ff"
MINT = "#a9f0cf"
WHITE = "#ffffff"
FONT_DIRS = (
    Path("/System/Library/Fonts/Supplemental"),
    Path("/Library/Fonts"),
    Path("/usr/share/fonts/truetype/dejavu"),
)


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    names = ("Arial Bold.ttf", "DejaVuSans-Bold.ttf") if bold else ("Arial.ttf", "DejaVuSans.ttf")
    for directory in FONT_DIRS:
        for name in names:
            path = directory / name
            if path.exists():
                return ImageFont.truetype(str(path), size)
    return ImageFont.load_default()


def rounded(draw: ImageDraw.ImageDraw, box, radius: int, fill, outline=None, width=1) -> None:
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def icon(size: int) -> Image.Image:
    scale = 2
    canvas_size = 512 * scale
    image = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    s = lambda value: round(value * scale)

    rounded(draw, (0, 0, canvas_size - 1, canvas_size - 1), s(112), NAVY)
    rounded(draw, (s(13), s(13), s(499), s(499)), s(100), NAVY_LIGHT, "#294562", s(2))

    glow = Image.new("RGBA", image.size, (0, 0, 0, 0))
    ImageDraw.Draw(glow).ellipse((s(110), s(95), s(402), s(387)), fill=(94, 215, 208, 76))
    image.alpha_composite(glow.filter(ImageFilter.GaussianBlur(s(48))))
    draw = ImageDraw.Draw(image)

    draw.ellipse((s(91), s(91), s(421), s(421)), outline="#355470", width=s(3))
    draw.ellipse((s(117), s(117), s(395), s(395)), outline="#426b7c", width=s(3))
    draw.ellipse((s(148), s(148), s(364), s(364)), fill=CYAN)
    draw.ellipse((s(160), s(160), s(352), s(352)), fill=MINT)
    draw.ellipse((s(171), s(171), s(341), s(341)), fill=WHITE)
    draw.polygon(
        [(s(222), s(204)), (s(222), s(308)), (s(310), s(256))],
        fill=NAVY,
    )

    for x, top, bottom, color in (
        (72, 218, 294, BLUE),
        (440, 202, 310, CYAN),
    ):
        rounded(draw, (s(x), s(top), s(x + 18), s(bottom)), s(9), color)

    return image.resize((size, size), Image.Resampling.LANCZOS)


def social_preview() -> Image.Image:
    width, height = 1200, 630
    image = Image.new("RGBA", (width, height), "#f3f6fa")

    glow = Image.new("RGBA", image.size, (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    glow_draw.ellipse((780, -310, 1420, 330), fill=(94, 215, 208, 50))
    glow_draw.ellipse((-260, 440, 380, 1080), fill=(115, 153, 255, 38))
    image.alpha_composite(glow.filter(ImageFilter.GaussianBlur(105)))
    draw = ImageDraw.Draw(image)

    mark = icon(54)
    image.alpha_composite(mark, (64, 54))
    draw = ImageDraw.Draw(image)
    draw.text((132, 81), "PLAYER", font=font(18, True), fill=INK, anchor="lm")
    draw.text((64, 167), "PERSONAL MEDIA PLAYER", font=font(14, True), fill="#477e91")
    draw.text((60, 208), "Your library.", font=font(55, True), fill=INK)
    draw.text((60, 275), "Your rules.", font=font(55, True), fill=INK)
    draw.text((64, 366), "Audio and video, ready wherever you are.", font=font(20), fill=MUTED)
    draw.text((64, 397), "Private by design. Saved on your device.", font=font(18), fill=MUTED)

    pill_y = 500
    x = 64
    for label, color in (("AUDIO", "#e7f7f4"), ("VIDEO", "#edf1ff"), ("OFFLINE", "#eef4f1")):
        text_font = font(12, True)
        text_width = draw.textbbox((0, 0), label, font=text_font)[2]
        pill_width = text_width + 30
        rounded(draw, (x, pill_y, x + pill_width, pill_y + 36), 18, WHITE, "#dce5ed", 1)
        draw.ellipse((x + 12, pill_y + 14, x + 20, pill_y + 22), fill=color)
        draw.text((x + 26, pill_y + 18), label, font=text_font, fill="#34445a", anchor="lm")
        x += pill_width + 10

    # A compact, illustrative view of the Player interface.
    card = (627, 56, 1140, 574)
    shadow = Image.new("RGBA", image.size, (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow)
    rounded(shadow_draw, (card[0] + 6, card[1] + 14, card[2] + 6, card[3] + 14), 28, (18, 33, 55, 42))
    image.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(18)))
    draw = ImageDraw.Draw(image)
    rounded(draw, card, 28, WHITE, "#dce5ed", 1)

    draw.text((660, 89), "NOW PLAYING", font=font(11, True), fill="#6c7d91")
    draw.text((1106, 89), "•••", font=font(18, True), fill="#8290a1", anchor="rm")

    art_box = (660, 116, 1107, 270)
    rounded(draw, art_box, 18, NAVY)
    # Album-inspired abstract artwork.
    draw.ellipse((946, 99, 1140, 293), fill="#244761")
    draw.ellipse((980, 132, 1105, 257), outline="#3e7183", width=2)
    draw.ellipse((1001, 153, 1084, 236), fill=CYAN)
    draw.polygon([(1032, 174), (1032, 215), (1066, 194)], fill=NAVY)
    draw.text((684, 168), "STILL", font=font(31, True), fill=WHITE)
    draw.text((684, 204), "IN MOTION", font=font(18, True), fill=MINT)

    draw.text((660, 297), "A quieter kind of focus", font=font(19, True), fill=INK)
    draw.text((660, 324), "Ambient collection  ·  24 tracks", font=font(13), fill=MUTED)

    rounded(draw, (660, 359, 1107, 363), 2, "#e4eaf0")
    rounded(draw, (660, 359, 834, 363), 2, "#5274d5")
    draw.ellipse((829, 355, 839, 365), fill="#5274d5")
    draw.text((660, 379), "1:42", font=font(11), fill=MUTED)
    draw.text((1107, 379), "4:18", font=font(11), fill=MUTED, anchor="ra")

    draw.text((817, 431), "‹", font=font(35), fill="#506078", anchor="mm")
    draw.ellipse((858, 400, 918, 460), fill=NAVY)
    draw.polygon([(881, 416), (881, 444), (903, 430)], fill=WHITE)
    draw.text((958, 431), "›", font=font(35), fill="#506078", anchor="mm")

    draw.line((660, 477, 1107, 477), fill="#edf1f5", width=1)
    for index, (title, artist, active) in enumerate((
        ("A quieter kind of focus", "Ambient collection", True),
        ("Open horizon", "North Shore", False),
        ("Blue hour", "Field Notes", False),
    )):
        y = 499 + index * 23
        dot_color = "#5274d5" if active else "#bac4d0"
        draw.ellipse((662, y + 3, 670, y + 11), fill=dot_color)
        draw.text((682, y), title, font=font(11, active), fill=INK if active else "#43536a")
        draw.text((1107, y), artist, font=font(10), fill=MUTED, anchor="ra")

    return image.convert("RGB")


def main() -> None:
    icon(512).save(ROOT / "icon-512.png", optimize=True)
    icon(192).save(ROOT / "icon-192.png", optimize=True)
    icon(180).save(ROOT / "apple-touch-icon.png", optimize=True)
    icon(64).save(ROOT / "favicon.ico", format="ICO", sizes=[(16, 16), (32, 32), (48, 48)])
    social_preview().save(ROOT / "social-preview.png", optimize=True)
    print("Generated Player icons and social-preview.png.")


if __name__ == "__main__":
    main()
