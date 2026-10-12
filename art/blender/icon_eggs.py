"""Draw the Black egg and the Rainbow egg: one egg each, outlined like our other icons, then the gloss pass."""
import sys, math, colorsys, importlib.util
from PIL import Image, ImageDraw, ImageFilter
S = sys.argv[1] if len(sys.argv) > 1 else __import__('tempfile').gettempdir(); __import__('os').makedirs(S + '/rev', exist_ok=True)
spec = importlib.util.spec_from_file_location('g', 'C:/Users/n/source/repos/Farm_village-claude/art/blender/icon_gloss.py'); g = importlib.util.module_from_spec(spec); spec.loader.exec_module(g)
base = 'C:/Users/n/source/repos/Farm_village-claude/public/assets/icons/'
N = 1024                                              # drawn large, then reduced: smooth edges
def egg_points(cx, cy, rx, ry, grow=0):
    pts = []
    for i in range(240):
        t = i / 240 * math.tau; s, c = math.sin(t), math.cos(t)
        k = 1 - 0.20 * c                              # narrower at the top (c = 1 at the top)
        pts.append((cx + (rx + grow) * s * k, cy - (ry + grow) * c))
    return pts
def make(name, colour):
    big = Image.new('RGBA', (N, N), (0, 0, 0, 0)); cx, cy, rx, ry = N * 0.5, N * 0.52, N * 0.30, N * 0.38
    mask = Image.new('L', (N, N), 0); ImageDraw.Draw(mask).polygon(egg_points(cx, cy, rx, ry), fill=255)
    fill = Image.new('RGB', (N, N)); px = fill.load()
    for y in range(N):
        for x in range(0, N):
            px[x, y] = colour((x - cx) / rx, (y - cy) / ry)
    outline = Image.new('L', (N, N), 0); ImageDraw.Draw(outline).polygon(egg_points(cx, cy, rx, ry, grow=N * 0.022), fill=255)
    big.paste((62, 30, 18, 255), (0, 0, N, N), outline); big.paste(fill, (0, 0), mask)
    small = big.resize((256, 256), Image.LANCZOS); small = small.rotate(-14, resample=Image.BICUBIC)   # a little tilt, as it lies
    out = g.gloss(small); out.save(base + name + '.webp', 'WEBP', quality=92); out.resize((64, 64), Image.LANCZOS).save(base + 'sm/' + name + '.webp', 'WEBP', quality=90)
    out.save(S + '/rev/' + name + '.png')
def black(u, v):
    l = 0.20 + 0.10 * (-u - v) * 0.5; r, gg, b = colorsys.hsv_to_rgb(0.70, 0.30, max(0.08, min(0.42, l))); return (int(r * 255), int(gg * 255), int(b * 255))
def rainbow(u, v):
    h = (0.03 + 0.42 * (u * 0.55 + v * 0.85)) % 1; r, gg, b = colorsys.hsv_to_rgb(h, 0.62, 0.97); return (int(r * 255), int(gg * 255), int(b * 255))
make('black_egg', black); make('rainbow_egg', rainbow)
sheet = Image.new('RGBA', (520, 260), (255, 246, 222, 255)); sheet.alpha_composite(Image.open(S + '/rev/black_egg.png'), (0, 0)); sheet.alpha_composite(Image.open(S + '/rev/rainbow_egg.png'), (260, 0)); sheet.save(S + '/rev/eggs2.png')
