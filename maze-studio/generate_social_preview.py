"""Build the committed SMS/social preview: python3 maze-studio/generate_social_preview.py.

Requires Pillow. Static artwork lets link crawlers work without JavaScript.
"""

from pathlib import Path
import random

from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent
PAPER = "#f5f4ef"
INK = "#253b33"
GREEN = "#215a47"
MUTED = "#64736a"


def font(size, serif=False, bold=False):
    mac_name = "Georgia.ttf" if serif else ("Arial Bold.ttf" if bold else "Arial.ttf")
    linux_name = "DejaVuSerif.ttf" if serif else ("DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf")
    for path in (
        Path("/System/Library/Fonts/Supplemental") / mac_name,
        Path("/usr/share/fonts/truetype/dejavu") / linux_name,
    ):
        if path.exists():
            return ImageFont.truetype(str(path), size)
    raise FileNotFoundError("Install Georgia/Arial or DejaVu fonts to generate the preview.")


def generate(destination=HERE / "social-preview.png"):
    image = Image.new("RGB", (1200, 630), PAPER)
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle((56, 48, 100, 92), radius=10, fill=GREEN)
    draw.line(
        [(76, 58), (65, 58), (65, 82), (91, 82), (91, 58), (83, 58),
         (83, 74), (73, 74), (73, 66)],
        fill=PAPER, width=3,
    )
    draw.text((114, 55), "Maze Studio", font=font(27, bold=True), fill=INK)
    draw.text((56, 160), "A LITTLE LOST. BY DESIGN.", font=font(15, bold=True), fill=GREEN)
    draw.text((52, 209), "Many turns.", font=font(64, serif=True), fill=INK)
    draw.text((52, 287), "One way through.", font=font(57, serif=True), fill=INK)
    draw.text((56, 395), "Make a maze. Find your way out.", font=font(24), fill=MUTED)
    draw.text((56, 434), "Every maze has exactly one solution.", font=font(22), fill=MUTED)
    draw.rounded_rectangle((56, 512, 310, 564), radius=6, fill=GREEN)
    draw.text((79, 526), "Create your challenge", font=font(19, bold=True), fill=PAPER)

    draw.rounded_rectangle((640, 48, 1144, 582), radius=12, fill="#fffefa", outline="#dedfd6", width=2)
    draw.text((668, 68), "ONE MAZE. ONE SOLUTION.", font=font(15, bold=True), fill=MUTED)
    # A seeded spanning tree gives the illustration real, reproducible maze walls.
    width, height, size = 14, 14, 32
    cells = [15] * (width * height)
    visited = {0}
    stack = [0]
    rng = random.Random(42)
    directions = ((0, -1, 1, 4), (1, 0, 2, 8), (0, 1, 4, 1), (-1, 0, 8, 2))
    while stack:
        current = stack[-1]
        x, y = current % width, current // width
        candidates = [
            (dy * width + dx + current, wall, opposite)
            for dx, dy, wall, opposite in directions
            if 0 <= x + dx < width and 0 <= y + dy < height
            and dy * width + dx + current not in visited
        ]
        if not candidates:
            stack.pop()
            continue
        next_cell, wall, opposite = rng.choice(candidates)
        cells[current] &= ~wall
        cells[next_cell] &= ~opposite
        visited.add(next_cell)
        stack.append(next_cell)
    for index, cell in enumerate(cells):
        x, y = 668 + index % width * size, 106 + index // width * size
        if cell & 1 and index != 0:
            draw.line((x, y, x + size, y), fill=INK, width=3)
        if cell & 8:
            draw.line((x, y, x, y + size), fill=INK, width=3)
        if cell & 2 and index % width == width - 1:
            draw.line((x + size, y, x + size, y + size), fill=INK, width=3)
        if cell & 4 and index >= len(cells) - width and index != len(cells) - 1:
            draw.line((x, y + size, x + size, y + size), fill=INK, width=3)
    draw.ellipse((677, 115, 691, 129), outline=GREEN, width=3)
    draw.ellipse((1095, 533, 1105, 543), fill="#c17a3e")
    image.save(destination, optimize=True)


if __name__ == "__main__":
    generate()
