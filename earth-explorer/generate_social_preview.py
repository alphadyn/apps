"""Generate Earth Explorer's realistic Earth icon and sharing card using Pillow."""

import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent
WIDTH, HEIGHT = 1200, 630
ACCENT = "#8bd3f4"
TEXTURE_PATH = ROOT / "assets" / "earth-blue-marble.jpg"


def render_earth(size):
    texture = Image.open(TEXTURE_PATH).convert("RGB")
    pixels = texture.load()
    texture_width, texture_height = texture.size
    earth = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    output = earth.load()
    center = (size - 1) / 2
    radius = size * 0.46
    light = (-0.42, 0.32, 0.85)
    light_length = math.sqrt(sum(component * component for component in light))
    light = tuple(component / light_length for component in light)

    for y in range(size):
        ny = (center - y) / radius
        if abs(ny) > 1:
            continue
        for x in range(size):
            nx = (x - center) / radius
            distance_squared = nx * nx + ny * ny
            if distance_squared > 1:
                continue
            nz = math.sqrt(1 - distance_squared)
            longitude = math.atan2(nx, nz)
            latitude = math.asin(ny)
            u = (0.5 + longitude / (2 * math.pi)) % 1
            v = 0.5 - latitude / math.pi
            color = pixels[
                min(texture_width - 1, int(u * texture_width)),
                min(texture_height - 1, int(v * texture_height)),
            ]
            illumination = 0.34 + 0.66 * max(
                0, nx * light[0] + ny * light[1] + nz * light[2]
            )
            limb = max(0, 1 - nz)
            glow = limb * 0.22
            output[x, y] = (
                min(255, int(color[0] * illumination + 72 * glow)),
                min(255, int(color[1] * illumination + 157 * glow)),
                min(255, int(color[2] * illumination + 220 * glow)),
                255,
            )
    return earth.resize((size, size), Image.Resampling.LANCZOS)


def draw_location_marker(image, center, size):
    scale = size / 100
    marker = Image.new("RGBA", (int(100 * scale * 2), int(110 * scale * 2)), (0, 0, 0, 0))
    draw = ImageDraw.Draw(marker)
    draw_scale = 2 * scale
    point = [(50, 100), (19, 57), (10, 43), (12, 27), (24, 14),
             (39, 8), (61, 8), (76, 14), (88, 27), (90, 43), (81, 57)]
    shape = [(round(x * draw_scale), round(y * draw_scale)) for x, y in point]
    draw.polygon(shape, fill="#102337")
    inner = [(round((x - 50) * draw_scale * 0.83 + 50 * draw_scale),
              round((y - 10) * draw_scale * 0.83 + 10 * draw_scale))
             for x, y in point]
    draw.polygon(inner, fill="#a5f0df")
    hole_radius = round(12 * draw_scale)
    draw.ellipse(
        (50 * draw_scale - hole_radius, 37 * draw_scale - hole_radius,
         50 * draw_scale + hole_radius, 37 * draw_scale + hole_radius),
        fill="#17344a",
    )
    marker = marker.resize((round(100 * scale), round(110 * scale)), Image.Resampling.LANCZOS)
    x = round(center[0] - marker.width / 2)
    y = round(center[1] - marker.height / 2)
    image.alpha_composite(marker, (x, y))


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

    cx, cy, radius = 865, 324, 190
    draw.ellipse(
        (cx - radius - 18, cy - radius - 18, cx + radius + 18, cy + radius + 18),
        fill="#20364d",
    )
    globe = render_earth(520)
    globe = globe.resize((radius * 2, radius * 2), Image.Resampling.LANCZOS)
    image_rgba = image.convert("RGBA")
    image_rgba.alpha_composite(globe, (cx - radius, cy - radius))
    draw_location_marker(image_rgba, (cx + 115, cy - 80), 58)
    image = image_rgba.convert("RGB")
    image.save(ROOT / "social-preview.png", optimize=True)

    icon_size = 512
    icon = Image.new("RGBA", (icon_size, icon_size), (0, 0, 0, 0))
    icon_draw = ImageDraw.Draw(icon)
    icon_draw.rounded_rectangle(
        (8, 8, 504, 504), 112, fill="#142336", outline="#48617a", width=8
    )
    icon_earth = render_earth(440)
    icon.alpha_composite(icon_earth, (36, 36))
    draw_location_marker(icon, (376, 150), 72)
    icon.save(ROOT / "app-icon.png", optimize=True)


if __name__ == "__main__":
    generate()
