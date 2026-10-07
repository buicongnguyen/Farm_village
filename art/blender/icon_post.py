"""Post-process icon renders (system Python + PIL), ported from Starline's art/blender/icon_post.py: premultiplied
downsample, a light unsharp mask, a thin dark outline so icons read at 48 px, lossless WebP output, and review sheets.

python art/blender/icon_post.py <job.json>   (written by render_icons.py)
Icon ids with ':' (tool:build, person:ada) are saved as tool-build.webp, person-ada.webp.
"""
import json, os, sys
from PIL import Image, ImageFilter, ImageDraw, ImageFont

job = json.load(open(sys.argv[1]))
size = job['size']
OUTLINE = (52, 32, 20)          # warm dark brown, matching the UI's outlines
done = []
for name, path in job['raw'].items():
    im = Image.open(path).convert('RGBA')
    small = im.convert('RGBa').resize((size, size), Image.LANCZOS).convert('RGBA')
    small = small.filter(ImageFilter.UnsharpMask(radius=1.0, percent=55, threshold=2))
    alpha = small.split()[3]
    ring = alpha.filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.GaussianBlur(.7)).point(lambda v: int(min(255, v * 1.1)))
    base = Image.new('RGBA', (size, size), OUTLINE + (0,))
    base.putalpha(ring)
    icon = Image.alpha_composite(base, small)
    out = os.path.join(job['out'], name.replace(':', '-') + '.webp')
    icon.save(out, 'WEBP', quality=88, method=6)
    done.append((name, icon))
    print('ICON', out, os.path.getsize(out) // 1024, 'KB')

if done:
    cell, cols, pad = 128, 10, 10
    rows = (len(done) + cols - 1) // cols
    sheet = Image.new('RGBA', (cols * (cell + pad) + pad, rows * (cell + 22 + pad) + pad + 70), (255, 244, 222, 255))
    d = ImageDraw.Draw(sheet)
    try:
        font = ImageFont.truetype('arial.ttf', 12)
    except OSError:
        font = ImageFont.load_default()
    for i, (n, ic) in enumerate(done):
        x = pad + (i % cols) * (cell + pad); y = pad + (i // cols) * (cell + 22 + pad)
        d.rounded_rectangle([x, y, x + cell, y + cell], 14, fill=(255, 251, 240, 255), outline=(122, 78, 46, 255), width=3)
        sheet.alpha_composite(ic.resize((cell - 12, cell - 12), Image.LANCZOS), (x + 6, y + 6))
        d.text((x + 4, y + cell + 4), n, fill=(90, 56, 30, 255), font=font)
    y0 = sheet.size[1] - 62
    for i, (n, ic) in enumerate(done[:cols * 3]):
        x = pad + i * 52
        if x + 48 > sheet.size[0]:
            break
        d.rounded_rectangle([x - 2, y0 - 2, x + 50, y0 + 50], 8, fill=(58, 66, 82, 255))
        sheet.alpha_composite(ic.resize((48, 48), Image.LANCZOS), (x, y0))
    prev = os.path.join(job['preview'], 'art-icons.png')
    sheet.save(prev)
    print('SHEET', prev)
