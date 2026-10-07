"""Build SVG pointer regions from this map's colors (Pillow and NumPy).

The original artwork is never modified. Re-run after changing the source map.
"""
from collections import deque
from pathlib import Path
import re

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
image = Image.open(ROOT / "assets/images/2DWorldMapImage.png").convert("RGB")
width, height = image.size
hue, saturation, value = np.asarray(image.convert("HSV")).transpose(2, 0, 1)
y, x = np.indices((height, width))

regions = [
    ("north-america", "North America", (x < 720) & (y < 445) & (hue > 133) & (hue < 165) & (value > 100)),
    ("south-america", "South America", (hue > 50) & (hue < 115) & (saturation > 65) & (value > 45) & (x < 640) & (y > 360)),
    ("europe", "Europe", (hue > 22) & (hue < 48) & (saturation > 65) & (value > 70) & (x > 580) & (y < 330)),
    ("africa", "Africa", (hue < 23) & (saturation > 85) & (value > 65) & (x > 570) & (x < 1000) & (y > 285) & (y < 725)),
    ("asia", "Asia", (hue > 175) & (hue < 225) & (saturation > 45) & (value > 65) & (x > 865) & (y < 600)),
    ("oceania", "Oceania", (hue > 115) & (hue < 142) & (saturation > 90) & (value > 65) & (x > 1210) & (y > 470)),
    ("antarctica", "Antarctica", (y > 745) & (value > 105) & (saturation < 155)),
]


def clean(mask):
    """Remove isolated texture noise and fill enclosed label/shading holes."""
    seen = np.zeros(mask.shape, dtype=bool)
    result = np.zeros(mask.shape, dtype=bool)
    for row, col in zip(*np.where(mask)):
        if seen[row, col]:
            continue
        queue = deque([(row, col)])
        seen[row, col] = True
        component = []
        while queue:
            r, c = queue.popleft()
            component.append((r, c))
            for nr, nc in ((r - 1, c), (r + 1, c), (r, c - 1), (r, c + 1)):
                if 0 <= nr < height and 0 <= nc < width and mask[nr, nc] and not seen[nr, nc]:
                    seen[nr, nc] = True
                    queue.append((nr, nc))
        if len(component) >= 14:
            rows, cols = zip(*component)
            result[rows, cols] = True
    # Flood the exterior, leaving enclosed label pixels as part of the land.
    exterior = np.zeros((height + 2, width + 2), dtype=bool)
    land = np.pad(result, 1)
    queue = deque([(0, 0)])
    exterior[0, 0] = True
    while queue:
        r, c = queue.popleft()
        for nr, nc in ((r - 1, c), (r + 1, c), (r, c - 1), (r, c + 1)):
            if 0 <= nr < height + 2 and 0 <= nc < width + 2 and not land[nr, nc] and not exterior[nr, nc]:
                exterior[nr, nc] = True
                queue.append((nr, nc))
    return ~exterior[1:-1, 1:-1]


def simplify(points, tolerance=1.1):
    if len(points) < 3:
        return points
    a, b = np.array(points[0]), np.array(points[-1])
    points_array = np.array(points)
    delta = b - a
    if np.dot(delta, delta) == 0:
        distances = np.linalg.norm(points_array - a, axis=1)
    else:
        projection = np.clip((points_array - a) @ delta / np.dot(delta, delta), 0, 1)
        distances = np.linalg.norm(points_array - a - projection[:, None] * delta, axis=1)
    index = int(np.argmax(distances))
    if distances[index] <= tolerance:
        return [points[0], points[-1]]
    return simplify(points[:index + 1])[:-1] + simplify(points[index:])


def trace(mask):
    edges = {}
    padded = np.pad(mask, 1)
    sides = [
        (mask & ~padded[:-2, 1:-1], (0, 0), (1, 0)),
        (mask & ~padded[1:-1, 2:], (1, 0), (1, 1)),
        (mask & ~padded[2:, 1:-1], (1, 1), (0, 1)),
        (mask & ~padded[1:-1, :-2], (0, 1), (0, 0)),
    ]
    for boundary, start, end in sides:
        for r, c in zip(*np.where(boundary)):
            edges.setdefault((c + start[0], r + start[1]), []).append((c + end[0], r + end[1]))
    paths = []
    while edges:
        start = next(iter(edges))
        point = start
        points = [start]
        while True:
            following = edges[point].pop()
            if not edges[point]:
                del edges[point]
            points.append(following)
            point = following
            if point == start:
                break
        points = simplify(points)
        if len(points) >= 4:
            paths.append("M" + "L".join(f"{px},{py}" for px, py in points[:-1]) + "Z")
    return "".join(paths)


paths = []
for identifier, label, raw_mask in regions:
    mask = clean(raw_mask)
    path = trace(mask)
    paths.append(f'        <path class="continent" id="{identifier}" tabindex="0" role="img" aria-label="{label}" d="{path}" />')
    print(f"{label}: {int(mask.sum())} pixels, {len(path)} path characters")

svg = '\n'.join([
    '      <!-- BEGIN GENERATED CONTINENT REGIONS -->',
    f'      <svg class="world-map__regions" viewBox="0 0 {width} {height}" xmlns="http://www.w3.org/2000/svg" role="group" aria-label="대륙 탐색">',
    *paths,
    '      </svg>',
    '      <!-- END GENERATED CONTINENT REGIONS -->',
])
page_path = ROOT / "selectWorldMap.html"
page = page_path.read_text(encoding="utf-8")
page, count = re.subn(r'      <!-- BEGIN GENERATED CONTINENT REGIONS -->.*?      <!-- END GENERATED CONTINENT REGIONS -->', lambda _: svg, page, flags=re.S)
if count != 1:
    raise RuntimeError("Expected exactly one continent region placeholder")
page_path.write_text(page, encoding="utf-8")
