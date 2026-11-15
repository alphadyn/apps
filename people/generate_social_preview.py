"""Generate People's static social preview. Requires Pillow."""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent


def font(size, serif=False, bold=False):
    candidates = [
        Path("/System/Library/Fonts/Supplemental")
        / ("Georgia Bold.ttf" if serif and bold else "Georgia.ttf" if serif else "Arial Bold.ttf" if bold else "Arial.ttf"),
        Path("/usr/share/fonts/truetype/dejavu")
        / ("DejaVuSerif-Bold.ttf" if serif and bold else "DejaVuSerif.ttf" if serif else "DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf"),
    ]
    for path in candidates:
        if path.exists():
            return ImageFont.truetype(str(path), size)
    raise FileNotFoundError("Install Georgia/Arial or DejaVu fonts to generate the preview.")


def generate(destination=HERE / "social-preview.png"):
    image = Image.new("RGB", (1200, 630), "#f6f8f3")
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle((50, 45, 114, 109), radius=18, fill="#294b3c")
    draw.ellipse((68, 63, 82, 77), fill="#ffffff")
    draw.ellipse((84, 63, 98, 77), fill="#d8e6bb")
    draw.pieslice((62, 78, 88, 104), 180, 360, fill="#ffffff")
    draw.pieslice((77, 78, 104, 104), 180, 360, fill="#d8e6bb")
    draw.text((130, 48), "People", font=font(40, serif=True), fill="#283c31")
    draw.text((132, 95), "GOOD WORK. GOOD PEOPLE.", font=font(12, bold=True), fill="#8b9b8c")

    draw.text((55, 183), "Your work,", font=font(70, serif=True), fill="#293d31")
    draw.text((55, 267), "your people.", font=font(70, serif=True), fill="#293d31")
    draw.text((59, 385), "A thoughtful home for your professional", font=font(22), fill="#748477")
    draw.text((59, 418), "story and the people behind it.", font=font(22), fill="#748477")
    draw.rounded_rectangle((58, 503, 285, 547), radius=10, fill="#e7f0df")
    draw.text((77, 516), "MAKE SPACE FOR CONNECTION", font=font(12, bold=True), fill="#58775b")

    draw.rounded_rectangle((738, 103, 1138, 544), radius=24, fill="#e6eee0")
    draw.rounded_rectangle((780, 150, 1098, 497), radius=18, fill="#ffffff")
    draw.rounded_rectangle((780, 150, 1098, 239), radius=18, fill="#bccfba")
    draw.rectangle((780, 220, 1098, 239), fill="#bccfba")
    draw.ellipse((807, 203, 883, 279), fill="#ffffff")
    draw.ellipse((813, 209, 877, 273), fill="#d6e5d0")
    for start, end in (((845, 225), (845, 257)), ((829, 241), (861, 241)),
                       ((834, 230), (856, 252)), ((834, 252), (856, 230))):
        draw.line((start, end), fill="#638268", width=3)
    draw.text((808, 300), "Your story.", font=font(30, serif=True), fill="#30483a")
    draw.text((808, 350), "PROFILES", font=font(13, bold=True), fill="#829685")
    draw.text((808, 380), "WORK & IDEAS", font=font(13, bold=True), fill="#829685")
    draw.text((808, 410), "REAL CONNECTIONS", font=font(13, bold=True), fill="#829685")
    draw.text((59, 584), "PEOPLE  /  YOUR PROFESSIONAL HOME", font=font(12, bold=True), fill="#9aa89a")
    image.save(destination, optimize=True)


if __name__ == "__main__":
    generate()
