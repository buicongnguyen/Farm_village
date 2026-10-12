"""A gloss pass for Farm Village's own rendered icons (goods, buildings, animals and found objects; not faces or UI
symbols): juicier colour, light from the upper left, a wet highlight, a warm bounce, a darker rim and a contact shadow.

  python art/blender/icon_gloss.py [id...]      gloss the listed icons, or every object icon that is not glossed yet

It rewrites public/assets/icons/<id>.webp and its 64 px variant in place and records the id in icon_gloss.done.json, so
an icon is never glossed twice. A fresh render from render_icons.py must be glossed again: remove its id from the list.
"""
import sys, os, glob, json, subprocess
from PIL import Image, ImageFilter, ImageEnhance, ImageChops, ImageDraw

def gloss(src):
    im = src.convert('RGBA'); w, h = im.size; a = im.getchannel('A')
    rgb = ImageEnhance.Color(im.convert('RGB')).enhance(1.42)          # juicier colour
    rgb = ImageEnhance.Contrast(rgb).enhance(1.12)
    white, deep = Image.new('RGB', (w, h), (255, 255, 255)), Image.new('RGB', (w, h), (52, 22, 40))
    box = a.getbbox() or (0, 0, w, h); x0, y0, x1, y1 = box; bw, bh = x1 - x0, y1 - y0
    # light from the upper left: the top lifts, the lower right sinks (volume the flat render lacks)
    ramp = Image.linear_gradient('L').resize((w, h))                    # 0 at the top, 255 at the foot
    ramp = ramp.rotate(-28, resample=Image.BICUBIC)
    rgb = Image.composite(white, rgb, ImageChops.multiply(ramp.point(lambda v: max(0, 150 - v)), a).point(lambda v: int(v * 0.34)))
    rgb = Image.composite(deep, rgb, ImageChops.multiply(ramp.point(lambda v: max(0, v - 120)), a).point(lambda v: int(v * 0.46)))
    # a wet highlight: one soft pool and one small bright spot, on the object only
    hi = Image.new('L', (w, h), 0); d = ImageDraw.Draw(hi)
    d.ellipse((x0 + bw * 0.14, y0 + bh * 0.10, x0 + bw * 0.60, y0 + bh * 0.44), fill=150)
    hi = hi.filter(ImageFilter.GaussianBlur(max(2, bw * 0.07)))
    spot = Image.new('L', (w, h), 0); d = ImageDraw.Draw(spot)
    d.ellipse((x0 + bw * 0.24, y0 + bh * 0.16, x0 + bw * 0.40, y0 + bh * 0.27), fill=255)
    spot = spot.filter(ImageFilter.GaussianBlur(max(1.5, bw * 0.018)))
    hi = ImageChops.multiply(ImageChops.lighter(hi, spot), a.filter(ImageFilter.MinFilter(9))).point(lambda v: int(v * 0.62))
    rgb = Image.composite(white, rgb, hi)
    # a warm bounce along the lower right edge, and a dark rim so the shape reads on any ground
    inner = a.filter(ImageFilter.MinFilter(9)); edge = ImageChops.subtract(a, inner)
    low = ImageChops.multiply(edge, ramp.point(lambda v: 255 if v > 150 else 0)).filter(ImageFilter.GaussianBlur(2)).point(lambda v: int(v * 0.5))
    rgb = Image.composite(Image.new('RGB', (w, h), (255, 205, 120)), rgb, low)
    rim = ImageChops.subtract(a, a.filter(ImageFilter.MinFilter(5))).filter(ImageFilter.GaussianBlur(0.8)).point(lambda v: int(v * 0.55))
    rgb = Image.composite(Image.new('RGB', (w, h), (64, 30, 16)), rgb, rim)
    out = Image.merge('RGBA', (*rgb.split(), a))
    # a contact shadow under it
    sa = ImageChops.offset(a, 0, int(h * 0.035)).filter(ImageFilter.GaussianBlur(w * 0.024)).point(lambda v: int(v * 0.36))
    sh = Image.merge('RGBA', (Image.new('L', (w, h), 36), Image.new('L', (w, h), 20), Image.new('L', (w, h), 10), sa))
    return Image.alpha_composite(sh, out)

if __name__ == '__main__':
    here = os.path.dirname(os.path.abspath(__file__)); root = os.path.abspath(os.path.join(here, '..', '..'))
    base = os.path.join(root, 'public', 'assets', 'icons') + os.sep; done_file = os.path.join(here, 'icon_gloss.done.json')
    done = set(json.load(open(done_file))) if os.path.exists(done_file) else set()
    # the object icons, as content/icons.mjs groups them
    groups = json.loads(subprocess.check_output(['node', '-e', "import('./src/content/icons.mjs').then(m=>console.log(JSON.stringify(m.ICON_IDS)))"], cwd=root))
    objects = [i for k in ['goods', 'buildings', 'animals', 'keepsakes', 'trail', 'upriver', 'fair'] for i in groups[k]]
    ids = sys.argv[1:] or [i for i in objects if i not in done]; n = 0
    for name in ids:
        f = base + name.replace(':', '-') + '.webp'
        if name in done or not os.path.exists(f): continue
        g = gloss(Image.open(f)); g.save(f, 'WEBP', quality=92)
        small = base + 'sm' + os.sep + name.replace(':', '-') + '.webp'
        if os.path.exists(small): g.resize((64, 64), Image.LANCZOS).save(small, 'WEBP', quality=90)
        done.add(name); n += 1
    json.dump(sorted(done), open(done_file, 'w'), indent=0)
    print('glossed', n, 'of', len(objects), 'object icons;', len(done), 'in all')
