"""AR-012: write the 64 px chip-size variant of every icon (public/assets/icons/sm/<same name>.webp).
Run after render_icons.py:  python art/blender/icon_small.py"""
import os, glob
from PIL import Image, ImageFilter
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SRC, OUT = os.path.join(ROOT, 'public', 'assets', 'icons'), os.path.join(ROOT, 'public', 'assets', 'icons', 'sm')
os.makedirs(OUT, exist_ok=True)
for f in sorted(glob.glob(os.path.join(SRC, '*.webp'))):
    im = Image.open(f).convert('RGBA')
    sm = im.convert('RGBa').resize((64, 64), Image.LANCZOS).convert('RGBA').filter(ImageFilter.UnsharpMask(radius=.6, percent=80, threshold=1))
    sm.save(os.path.join(OUT, os.path.basename(f)), 'WEBP', quality=78, method=6)
print('small icons', len(os.listdir(OUT)))
