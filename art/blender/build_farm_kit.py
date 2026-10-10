"""Farm Village farm kit: crops in three growth stages, the production buildings, bed rims, the picket fence set and
the small charm pieces (TECH-PLAN 5, AAA pass).

Run:  blender --background --factory-startup --python art/blender/build_farm_kit.py
Writes public/assets/models/farm-kit.glb (first wave: crops, buildings, rims, fences) and decor.glb (loaded after
the first frame: bridge, fountain, bunting, banner, For-sale sign, scaffold, cottage dressing, obstacles) and
discovery-props.glb (the lucky-find keepsakes, loaded only when a discovery shows one), prints
each piece's triangles and size, and writes art/blender/anchors-farm-kit.json for art/blender/anchors.mjs.

Contract (glTF, Y up, front faces +Z, origin = ground centre, metres, scale 1). Every root is one mesh with vertex
colours (COLOR_0) and the single white material 'VC'. Crops are authored at their real size (a bed is a 2 m cell;
ripe crops stay inside 1.8 m). Nodes named <piece>_mid are the authored middle level of detail.
Anchors are empties named <piece>.<label>[.<n>] (chimney, sails, door, window, light).
"""
import sys, os, math, random, json
sys.path.insert(0, os.path.dirname(__file__))
from style import *
from mathutils import Matrix

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUT = os.path.join(ROOT, 'public', 'assets', 'models', 'farm-kit.glb')
OUT_DECOR = os.path.join(ROOT, 'public', 'assets', 'models', 'decor.glb')
OUT_DISCOVERY = os.path.join(ROOT, 'public', 'assets', 'models', 'discovery-props.glb')
OUT_EXPLORATION = os.path.join(ROOT, 'public', 'assets', 'models', 'exploration-props.glb')
ANCHOR_JSON = os.path.join(os.path.dirname(__file__), 'anchors-farm-kit.json')
reset_scene()
C = {}
for n, c in {
        # buildings
        'cream': '#FFEBC4', 'plaster': '#FFF4DC', 'white': '#FFFDF6', 'red': '#EF3B3B', 'redd': '#C22F2A', 'roof': '#E8573F',
        'roofl': '#F57A55', 'roofd': '#B83E2E', 'teal': '#1FB5B0', 'teald': '#14857F', 'barn': '#D9443A', 'barnd': '#A8302A',
        'wood': '#C77A3A', 'woodl': '#E3A05A', 'woodd': '#8A4B25', 'wooddd': '#6A3A1E', 'stone': '#C3C9D4', 'stonel': '#E1E5EC',
        'stoned': '#8C95A5', 'brick': '#C9583C', 'brickd': '#9E412C', 'iron': '#5B6477', 'charcoal': '#3A3D4A', 'glass': '#7FE3FF',
        'glassd': '#3FAFE0', 'sack': '#EBD3A3', 'sackd': '#C9AE7E', 'bread': '#D98B3A', 'breadl': '#F2B460', 'cork': '#C98F55',
        'paper': '#FFF6D8', 'pink': '#FF7FB5', 'sky': '#35B6F2', 'mint': '#5EDFB0', 'sun': '#FFC83A', 'gold': '#F5B21E',
        'hay': '#F2C14E', 'hayd': '#D99A2B', 'lampglow': '#FFE08A', 'violet': '#9B6BFF', 'water': '#3FB7F0', 'waterl': '#8FDBFF',
        # crops
        'wheat': '#FFC93C', 'wheatl': '#FFE680', 'wheatd': '#EDB13A', 'wheatg': '#F0A020', 'wstalk': '#EFC85A', 'wgreen': '#8EDB5A', 'wgreenl': '#B6EC7A',
        'leaf': '#4FBF3A', 'leafw': '#4fab45', 'leafwl': '#8fd04c', 'leafwd': '#3a8444', 'blossom': '#FFB6D4', 'blossomd': '#FF8CBD', 'blossoml': '#FFD6E6', 'fruitred': '#FF3B3B', 'fruitpeach': '#FF9A72', 'pinew': '#2f8a50', 'pinewl': '#58b45e', 'leafl': '#7BDB4F', 'leafd': '#2F9A3A', 'leafdd': '#237A2E', 'sprout': '#8BE35A', 'carrot': '#FF7A1A',
        'carrotd': '#E35E10', 'corn': '#FFD23F', 'cornl': '#FFE680', 'husk': '#A5DB57', 'tassel': '#E8C46A', 'cstalk': '#7DC94A',
        'pumpkin': '#FF7A1A', 'pumpkind': '#E85F10', 'pumpkinl': '#FF9A3D', 'pgreen': '#9CCB3B', 'stem': '#6E8F2A', 'flower': '#FFD23F',
        'berry': '#E8335A', 'berryl': '#FF5C7A', 'bloom': '#FFFDF6', 'soil': '#7A4A2A', 'soill': '#93603A', 'soild': '#5E3720',
        'rim': '#9C6236', 'riml': '#B87A45', 'orange': '#FF9A1F',
        # premium crops (village growth plan, stage 2)
        'herb': '#6FA86A', 'herbl': '#9CCB8A', 'herbd': '#4E7E4A', 'root': '#F2D9A8',
        # keepsakes (AR-009)
        'cloth': '#6F9FD8', 'clothd': '#5281BE', 'clothl': '#9DC2EC', 'pebble': '#7D8BA6',
        # tree pack 2 (later trees, one or two per chapter)
        'maple': '#F0502A', 'maplel': '#FF9A2E', 'mapled': '#C8322A', 'birch': '#F4F1E6', 'birchm': '#3A3D4A', 'birchleaf': '#B8E04A',
        'birchleafl': '#DCF07A', 'cypress': '#2E7A4A', 'cypressl': '#4E9E5A', 'fir': '#1F6E58', 'firl': '#36907A', 'oak': '#5C9E3A',
        'oakl': '#86C24A', 'oakd': '#3E7A30', 'lemon': '#FFE23A', 'plum': '#7A3AA8', 'pluml': '#A45ED0', 'mango': '#FFB22E',
        'mangor': '#FF6A3A', 'grape': '#6A3AA8', 'grapel': '#9A62D8', 'longan': '#D8B070', 'lychee': '#F0425E', 'rope': '#E8C88A',
        # farmhouse interior (AR-015)
        'plank': '#D8935A', 'plankd': '#B87445', 'seam': '#8A5230', 'wallin': '#FFF1D6', 'wainscot': '#7FC4B4', 'wainscotd': '#4E9E8E',
        'rug': '#E0563B', 'rugl': '#F6B04A', 'sofa': '#3E8FD0', 'sofal': '#7DB8EA', 'sofad': '#2B6CA8', 'pillow': '#FFC83A',
        'quilt': '#FF7FB5', 'tile': '#F3F6FA', 'tiled': '#C9D3DE', 'copper': '#D9773A',
        }.items():
    C[n] = mat('FK ' + n, c, .55)

# Plan helpers: (x, y) on the plan with y toward the FRONT (Blender -Y), z up.
def bx(name, w, d, h, x, y, z, mt, bev=.03, seg=1, rot=0.):
    """Box: width w (x), depth d (toward the front), height h; z = bottom."""
    return box(name, (w, d, h), (x, -y, z + h / 2), C[mt], bev=bev, seg=seg, rot=(0, 0, rot))
def cl(name, r, h, x, y, z, mt, verts=10, rt=None, bev=0., rot=(0, 0, 0)):
    return cyl(name, r, h, (x, -y, z + h / 2), C[mt], verts=verts, bev=bev, seg=1, radius_top=rt, rot=rot)
def ball(name, r, x, y, z, mt, sub=1, sc=None):
    return ico(name, r, (x, -y, z), C[mt], subdiv=sub, scale=sc)
def lf(base, angle, length, width, mt, lift=.25, droop=.1, tilt=0.):
    return leaf('leaf', (base[0], -base[1], base[2]), -angle, length, width, C[mt], lift=lift, droop=droop, tilt=tilt)
def sp(r, h, x, y, z, mt, sides=4, lean=(0, 0), mid=(.3, .7), twist=0.):
    return spindle('sp', r, h, (x, -y, z), C[mt], sides=sides, lean=(lean[0], -lean[1]), mid=mid, twist=twist)
def st(a, b, r, mt, sides=3, rt=None):
    return stalk('st', (a[0], -a[1], a[2]), (b[0], -b[1], b[2]), r, C[mt], sides=sides, rt=rt)
def gable(name, w, d, h, x, y, z, mt, over=.18, bev=.02):
    """A pitched roof: ridge along x, w wide, d deep, h tall, sitting on z."""
    hd = d / 2 + over
    return extrude_outline(name, [(-hd, 0), (hd, 0), (0, h)], w + 2 * over, (x, -y, z), C[mt], rot=(0, 0, math.pi / 2), bev=bev)
def roof_rows(w, d, h, x, y, z, mt, mt2, rows=5, over=.22, thick=.09):
    """A shingled pitched roof: rows of slabs on both slopes and a round ridge (ridge along x)."""
    p = []
    hd = d / 2 + over
    slope = math.atan2(h, hd)
    L = math.hypot(h, hd)
    for side in (-1, 1):
        for i in range(rows):
            f = (i + .5) / rows
            seg = L / rows + .07
            o = box('shingle', (w + 2 * over - .03 * i, seg, thick), (x, -(y + side * hd * (1 - f)), z + h * f + thick * .45),
                    C[mt if i % 2 == 0 else mt2], bev=.025, seg=1, rot=(side * slope, 0, 0))
            p.append(o)
    p.append(cl('ridge', .09, w + 2 * over + .1, x - (w + 2 * over + .1) / 2, y, z + h + .02, mt2, verts=6, rot=(0, math.pi / 2, 0)))
    p[-1].location = (x, -y, z + h + .03)
    return p

pieces, decor, discovery, exploration, anchors = [], [], [], [], {}
def piece(name, parts, into=None, tint=None):
    (into if into is not None else pieces).append((name, parts, tint))

# =================================================================== crops
# Each crop: sprout (< 33 % grown), mid (up to 90 %), ripe. lod 0 = near, 1 = the authored _mid level of detail.
GRID5 = [(-.64 + .32 * i, -.64 + .32 * j) for j in range(5) for i in range(5)]

def wheat(stage, lod=0):
    """A dense stand of wheat (fixer pass, after the review: 'sparse ochre stalks with soil between them').
    A low many-sided mound of ears fills the bed edge to edge, and fat ears rise from it, bending outward under their
    weight, in two golds; the green stage is the same stand, shorter and green. Sprouts are big bright tufts.
    Near: about 250 triangles (was 752); _mid: about 90 (was 162)."""
    rnd = random.Random(11 + lod); p = []
    if stage == 'sprout':
        grid = [(-.52 + .52 * i, -.52 + .52 * j) for j in range(3) for i in range(3)]
        if lod: grid = grid[::2]
        for k, (gx, gy) in enumerate(grid):
            x, y = gx + rnd.uniform(-.06, .06), gy + rnd.uniform(-.06, .06)
            for i in range(2 if lod == 0 else 1):
                h = .34 + rnd.uniform(0, .1)
                p.append(lf((x, y, 0), k * 1.7 + i * math.pi, h * .95, .16, 'leafl' if i % 2 else 'sprout', lift=h, droop=.05))
        return p
    ripe = stage == 'ripe'
    top = .34 if ripe else .22
    # the mound: the mass of the stand, so no soil shows between the ears
    p.append(cl('mound', .82, top, 0, 0, 0, 'wheatd' if ripe else 'wgreen', verts=6 if lod == 0 else 5, rt=.6))
    spots = [(-.5 + .33 * i, -.5 + .33 * j) for j in range(4) for i in range(4)] if lod == 0 else             [(-.36, -.36), (.36, -.36), (0, 0), (-.36, .36), (.36, .36), (0, -.5)]
    for k, (gx, gy) in enumerate(spots):
        x, y = gx + rnd.uniform(-.06, .06), gy + rnd.uniform(-.06, .06)
        d = math.hypot(x, y) or 1
        bend = (.32 if ripe else .18) * (.5 + d)             # outer ears lean out further: the stand bows under its grain
        h = top + (.52 if ripe else .3) + rnd.uniform(-.06, .08)
        mt = ('wheatl' if k % 3 == 0 else 'wheatg' if k % 3 == 1 else 'wheat') if ripe else ('wgreenl' if k % 2 else 'wgreen')
        p.append(sp((.13 if ripe else .08) * (1 if lod == 0 else 1.3), .44 if ripe else .26, x, y, h - .36,
                    mt, sides=3, lean=(x / d * bend, y / d * bend), twist=k))
    if lod == 0:
        for i in range(4):                                  # a few blades at the foot, for life at close zoom
            a = i / 4 * math.tau + .5
            p.append(lf((math.cos(a) * .62, math.sin(a) * .62, 0), a, .4, .14, 'wheatd' if ripe else 'leaf', lift=.16, droop=.08))
    return p

def carrot(stage, lod=0):
    rnd = random.Random(21 + lod); p = []
    grid = [(-.5 + .5 * i, -.5 + .5 * j) for j in range(3) for i in range(3)]
    if lod: grid = grid[1::2]
    for k, (gx, gy) in enumerate(grid):
        x, y = gx + rnd.uniform(-.06, .06), gy + rnd.uniform(-.06, .06)
        if stage == 'sprout':
            for a in (0, math.pi * .9)[:2 if lod == 0 else 1]:
                p.append(lf((x, y, 0), a + k, .24, .1, 'sprout' if a else 'leafl', lift=.16, droop=.0))
            continue
        ripe = stage == 'ripe'
        n = 3 if lod == 0 else 2
        L = .44 if ripe else .32
        for i in range(n):
            a = i / n * math.tau + k
            p.append(lf((x, y, .02), a, L, .14, 'leaf' if i % 2 else 'leafl', lift=L * .9, droop=.08))
        if ripe:
            p.append(cone('shoulder', .14, .3, (x, -y, .04), C['carrot'], verts=6 if lod == 0 else 4, rot=(math.pi, 0, 0)))
    return p

def corn(stage, lod=0):
    rnd = random.Random(31 + lod); p = []
    spots = [(-.42, -.42), (.42, -.42), (0, 0), (-.42, .42), (.42, .42)]
    if lod: spots = [(-.35, -.3), (.35, -.3), (0, .35)]
    for k, (x, y) in enumerate(spots):
        x += rnd.uniform(-.05, .05); y += rnd.uniform(-.05, .05)
        if stage == 'sprout':
            for i in range(3 if lod == 0 else 2):
                p.append(lf((x, y, 0), i * 2.1 + k, .3, .11, 'sprout' if i % 2 else 'leafl', lift=.26, droop=.05))
            continue
        ripe = stage == 'ripe'
        h = (1.45 if ripe else .8) + rnd.uniform(-.08, .08)
        p.append(st((x, y, 0), (x, y, h), .05 if ripe else .04, 'cstalk', sides=5 if lod == 0 else 3, rt=.025))
        nl = (3 if ripe else 3) if lod == 0 else (1 if ripe else 2)
        for i in range(nl):
            z = h * (.2 + .6 * i / max(1, nl - 1)) * .9
            L = (.55 if ripe else .4) * (1 - .3 * i / nl)
            p.append(lf((x, y, z), i * 2.4 + k, L, .12, 'leaf' if i % 2 else 'leafl', lift=.18, droop=.28))
        if ripe:
            for j, a in enumerate((k * 1.7, k * 1.7 + 3.1)[:1 + (lod == 0 and k % 2 == 0)]):
                cx, cy = x + math.cos(a) * .08, y + math.sin(a) * .08
                p.append(sp(.08, .34, cx, cy, h * .45, 'corn', sides=5 if lod == 0 else 4, lean=(math.cos(a) * .35, math.sin(a) * .35)))
                if lod == 0: p.append(lf((cx, cy, h * .42), a, .3, .12, 'husk', lift=.26, droop=.0))
            if lod == 0:
                for i in range(2):
                    a = i * 3.1 + k
                    p.append(st((x, y, h), (x + math.cos(a) * .14, y + math.sin(a) * .14, h + .22), .018, 'tassel'))
    return p

def pumpkin_body(x, y, r, mt, lod=0, squash=.72):
    """A ribbed pumpkin: a lathe pushed in along its lobes, with a stem."""
    seg = 16 if lod == 0 else 8
    rings = 6 if lod == 0 else 3
    prof = []
    for i in range(rings + 1):
        a = -math.pi / 2 + math.pi * i / rings
        prof.append((0 if i in (0, rings) else max(1e-4, math.cos(a) * r), (math.sin(a) + 1) * r * squash))
    o = lathe('pumpkin', prof, (x, -y, 0), C[mt], segments=seg, smooth_angle=70)
    for v in o.data.vertices:
        ang = math.atan2(v.co.y, v.co.x)
        k = .5 + .5 * math.cos(ang * seg / 2)
        f = 1 - .1 * k
        v.co.x *= f; v.co.y *= f
    return [o, cl('stem', .05, .16, x, y, 2 * r * squash - .03, 'stem', verts=5, rt=.035)]

def pumpkin(stage, lod=0):
    p = []
    if stage == 'sprout':
        for (x, y) in ([(-.35, -.3), (.35, -.2), (0, .38)] if lod == 0 else [(0, 0)]):
            for a in (0, math.pi):
                p.append(lf((x, y, 0), a + x * 3, .22, .19, 'sprout', lift=.15, droop=-.02))
            if lod == 0: p.append(lf((x, y, 0), 1.6 + y * 3, .2, .1, 'leaf', lift=.16, droop=.02))
        return p
    ripe = stage == 'ripe'
    nl = 7 if lod == 0 else 3
    for i in range(nl):
        a = i / nl * math.tau + .4
        r0 = .25 if ripe else .12
        p.append(lf((math.cos(a) * r0, math.sin(a) * r0, 0), a, .55 if ripe else .45, .42, 'leafl' if i % 2 else 'leaf', lift=.24, droop=.16))
    if ripe:
        p += pumpkin_body(.05, .02, .42, 'pumpkin', lod)
        if lod == 0:
            p += pumpkin_body(-.55, .45, .17, 'pumpkinl', 1)
            p.append(st((-.1, -.4, .05), (.4, -.6, .08), .025, 'stem'))
    else:
        p += pumpkin_body(.1, .05, .17, 'pgreen', 1 if lod else 0)
        if lod == 0:
            for (x, y) in ((-.4, -.25), (.35, .45)):
                p.append(cl('bloom', .09, .1, x, y, .2, 'flower', verts=5, rt=.02))
    return p

def strawberry(stage, lod=0):
    rnd = random.Random(51 + lod); p = []
    spots = [(-.42, -.42), (.42, -.42), (-.42, .42), (.42, .42)] if lod == 0 else [(-.35, 0), (.35, 0)]
    for k, (x, y) in enumerate(spots):
        x += rnd.uniform(-.05, .05); y += rnd.uniform(-.05, .05)
        if stage == 'sprout':
            for i in range(3 if lod == 0 else 2):
                p.append(lf((x, y, 0), i * 2.1 + k, .22, .15, 'sprout' if i % 2 else 'leafl', lift=.13, droop=-.01))
            continue
        ripe = stage == 'ripe'
        for i in range(5 if lod == 0 else 3):
            a = i / 5 * math.tau + k
            p.append(lf((x, y, 0), a, .34, .2, 'leaf' if i % 2 else 'leafl', lift=.2, droop=.07))
        if ripe:
            for j in range(3 if lod == 0 else 2):
                a = j * 2.1 + k + .5
                p.append(sp(.08, -.17, x + math.cos(a) * .24, y + math.sin(a) * .24, .3, 'berry' if j else 'berryl', sides=5 if lod == 0 else 4, mid=(.25, .6)))
        elif lod == 0:
            p.append(cl('bloom', .07, .05, x + .15, y, .24, 'bloom', verts=5, rt=.05))
            p.append(cl('eye', .03, .06, x + .15, y, .25, 'flower', verts=4))
    return p


def herb(stage, lod=0):
    """Healing herb (village growth stage 2): bushy clumps of soft sage-green leaves; ripe, tall violet flower spikes."""
    rnd = random.Random(71 + lod); p = []
    spots = [(-.4, -.38), (.4, -.38), (-.4, .4), (.4, .4)] if lod == 0 else [(-.3, 0), (.3, 0)]
    for k, (x, y) in enumerate(spots):
        n = {'sprout': 3, 'mid': 6, 'ripe': 7}[stage] if lod == 0 else 3
        for i in range(n):
            a = i / n * math.tau + k
            ln = {'sprout': .18, 'mid': .3, 'ripe': .34}[stage]
            p.append(lf((x, y, 0), a, ln, ln * .5, 'herbl' if i % 2 else 'herb', lift=ln * .9, droop=.04))
        if stage == 'ripe':
            for j in range(2 if lod == 0 else 1):
                dx, dy = rnd.uniform(-.08, .08), rnd.uniform(-.08, .08)
                p.append(st((x + dx, y + dy, 0), (x + dx, y + dy, .55), .02, 'herbd', sides=3))
                p.append(sp(.07, .26, x + dx, y + dy, .5, 'violet', sides=5 if lod == 0 else 4, mid=(.3, .7)))
    return p

def ginseng(stage, lod=0):
    """Ginseng (village growth stage 2): a five-leaflet plant on a slim stem; ripe, a cluster of red berries on top and
    pale forked roots showing at the soil."""
    p = []
    spots = [(-.35, -.3), (.35, -.25), (0, .4)] if lod == 0 else [(0, 0)]
    for k, (x, y) in enumerate(spots):
        h = {'sprout': .18, 'mid': .42, 'ripe': .55}[stage]
        p.append(st((x, y, 0), (x, y, h), .025, 'stem', sides=4))
        nl = 3 if stage == 'sprout' else 5
        for i in range(nl if lod == 0 else 3):
            a = i / nl * math.tau + k
            p.append(lf((x, y, h), a, .28 if stage != 'sprout' else .15, .13, 'leaf' if i % 2 else 'leafl', lift=.05, droop=.08))
        if stage == 'ripe':
            for j in range(5 if lod == 0 else 3):
                a = j * 1.3
                p.append(ball('berry', .045, x + math.cos(a) * .05, y + math.sin(a) * .05, h + .08 + (j % 2) * .03, 'fruitred', sub=1))
            if lod == 0:
                p.append(sp(.06, -.22, x + .08, y - .05, .06, 'root', sides=5, lean=(.08, 0)))
                p.append(sp(.045, -.18, x - .06, y + .04, .05, 'root', sides=5, lean=(-.06, 0)))
    return p

CROPS = {'wheat': wheat, 'carrot': carrot, 'corn': corn, 'pumpkin': pumpkin, 'strawberry': strawberry, 'herb': herb, 'ginseng': ginseng}
for crop, gen in CROPS.items():
    for stage in ('sprout', 'mid', 'ripe'):
        piece(f'crop_{crop}_{stage}', gen(stage, 0))
        piece(f'crop_{crop}_{stage}_mid', gen(stage, 1))

# =================================================================== bed rim with furrows (one per crop bed, 2 m cell)
def bed_rim():
    p = []
    o, w, h = .93, .15, .12             # outer half-size, rim width, rim height
    for (x, y, ww, dd) in ((0, -o + w / 2, 2 * o, w), (0, o - w / 2, 2 * o, w), (-o + w / 2, 0, w, 2 * o - 2 * w), (o - w / 2, 0, w, 2 * o - 2 * w)):
        p.append(bx('rim', ww, dd, h, x, y, 0, 'rim', bev=0))
    for i in range(5):
        p.append(bx('furrow', 2 * o - 2 * w - .04, .13, .06, 0, -.64 + .32 * i, 0, 'soill', bev=0))
    return p
piece('bed_rim', bed_rim())

# =================================================================== production buildings
def timber_wall(w, h, x, y, z, face, frame, posts=3):
    """Dark timber framing on the outer side of a plastered wall. face: 'front' | 'left' | 'right'."""
    p = []
    out = .04
    for i in range(posts + 1):
        u = -w / 2 + w * i / posts
        if face == 'front':
            p.append(bx('post', .12, .06, h, x + u, y + out, z, frame, bev=.015))
        else:
            p.append(bx('post', .06, .12, h, x + (out if face == 'right' else -out), y + u, z, frame, bev=.015))
    for zz in (z + .02, z + h - .1):
        if face == 'front':
            p.append(bx('beam', w + .12, .07, .1, x, y + out, zz, frame, bev=.015))
        else:
            p.append(bx('beam', .07, w + .12, .1, x + (out if face == 'right' else -out), y, zz, frame, bev=.015))
    return p

def window(x, y, z, w, h, face='front', shutters='teal', box=None):
    """A framed window with a cross and shutters on a front (+y) or side wall. Returns parts and its centre."""
    p = []
    if face == 'front':
        p += [bx('wframe', w + .14, .08, h + .14, x, y + .02, z - .07, 'white', bev=.02), bx('glass', w, .06, h, x, y + .05, z, 'glass', bev=.01),
              bx('mull', .05, .05, h, x, y + .08, z, 'white', bev=0), bx('mull', w, .05, .05, x, y + .08, z + h / 2 - .025, 'white', bev=0)]
        if shutters:
            for s in (-1, 1):
                p.append(bx('shutter', w * .48, .05, h + .04, x + s * (w / 2 + w * .26 + .05), y + .04, z - .02, shutters, bev=.015))
        if box:
            p.append(bx('box', w + .12, .2, .14, x, y + .14, z - .2, 'woodd', bev=.02))
            for i in range(4):
                p.append(ball('fl', .07, x - w / 2 + .05 + i * w / 3, y + .16, z - .02, box[i % len(box)], sub=0))
            p.append(ball('fll', .1, x, y + .16, z - .05, 'leaf', sub=0, sc=(2.2, .8, .6)))
        return p, (x, y + .09, z + h / 2, 0, 1)
    side = 1 if face == 'right' else -1
    p += [bx('wframe', .08, w + .14, h + .14, x + side * .02, y, z - .07, 'white', bev=.02), bx('glass', .06, w, h, x + side * .05, y, z, 'glass', bev=.01),
          bx('mull', .05, .05, h, x + side * .08, y, z, 'white', bev=0)]
    return p, (x + side * .09, y, z + h / 2, side, 0)

def feed_mill():
    """2 x 2 cells: a two-storey timber mill house with sails on the front gable, a grain hopper and feed sacks."""
    p, A = [], {'window': []}
    W, D = 2.3, 2.1
    p.append(bx('base', W + .3, D + .3, .32, 0, 0, 0, 'stone', bev=.06, seg=2))
    for i in range(9):
        p.append(ball('stone', .13, -W / 2 - .05 + i * (W + .1) / 8, D / 2 + .17, .16, 'stonel' if i % 2 else 'stoned', sub=1, sc=(1.3, .5, .9)))
    p.append(bx('walls', W, D, 2.3, 0, 0, .32, 'plaster', bev=.05, seg=2))
    p += timber_wall(W, 2.3, 0, D / 2, .32, 'front', 'woodd', posts=4)
    p += timber_wall(D, 2.3, W / 2, 0, .32, 'right', 'woodd', posts=3)
    p += timber_wall(D, 2.3, -W / 2, 0, .32, 'left', 'woodd', posts=3)
    p.append(bx('floorband', W + .12, D + .12, .14, 0, 0, 1.45, 'woodd', bev=.02))
    hR = 1.35
    p.append(extrude_outline('gablewall', [(-W / 2, 0), (W / 2, 0), (0, hR)], D, (0, 0, 2.62), C['plaster'], bev=.02))
    roof = join(roof_rows(D, W, hR, 0, 0, 2.62, 'roof', 'roofd', rows=5, over=.24), 'roof')
    roof.rotation_euler = (0, 0, math.pi / 2)
    p.append(roof)
    p += [bx('doorframe', 1.0, .1, 1.45, 0, D / 2 + .02, .32, 'woodd', bev=.03), bx('door', .82, .1, 1.3, 0, D / 2 + .06, .32, 'wood', bev=.02),
          bx('brace', .08, .06, 1.35, 0, D / 2 + .12, .33, 'woodd', bev=0, rot=0)]
    for s in (-1, 1):
        p.append(bx('plank', .06, .05, 1.28, s * .22, D / 2 + .11, .33, 'woodl', bev=0))
    A['door'] = [(0, D / 2 + .12, .32)]
    for x in (-.75, .75):
        wp, c = window(x, D / 2 + .02, 1.75, .44, .55, 'front', shutters='teal'); p += wp; A['window'].append(c)
    wp, c = window(-W / 2 - .02, .2, 1.7, .5, .5, 'left'); p += wp; A['window'].append(c)
    p += [cl('loft', .26, .08, 0, D / 2 + .04, 3.05, 'white', verts=12, rot=(math.pi / 2, 0, 0)),
          cl('loftg', .2, .1, 0, D / 2 + .06, 3.05, 'glass', verts=12, rot=(math.pi / 2, 0, 0))]
    A['window'].append((0, D / 2 + .1, 3.05, 0, 1))
    p.append(cl('axle', .09, .5, 0, D / 2 + .25, 3.3, 'iron', verts=8, rot=(math.pi / 2, 0, 0)))
    A['sails'] = [(0, D / 2 + .55, 3.3)]
    hx, hy = W / 2 + .42, -.35
    p += [cl('hopper', .24, .62, hx, hy, 1.55, 'woodl', verts=8, rt=.44), cl('hoprim', .46, .1, hx, hy, 2.15, 'woodd', verts=8),
          cl('hopgrain', .41, .06, hx, hy, 2.13, 'hay', verts=8)]
    for a in range(4):
        ang = a * math.pi / 2 + math.pi / 4
        p.append(st((hx + math.cos(ang) * .34, hy + math.sin(ang) * .34, 0), (hx + math.cos(ang) * .2, hy + math.sin(ang) * .2, 1.6), .05, 'woodd', sides=4))
    p.append(bx('chute', .45, .2, .15, hx - .3, hy, 1.4, 'wood'))
    for i, (x, y, mt) in enumerate([(-1.0, 1.45, 'sack'), (-.62, 1.52, 'sackd'), (-.82, 1.45, 'sack')]):
        z = .0 if i < 2 else .42
        p += [ball('sack', .26, x, y, z + .26, mt, sub=2, sc=(1, .85, 1.05)), cl('tie', .1, .1, x, y, z + .48, 'sackd', verts=6, rt=.06)]
    p += [cl('barrel', .24, .55, 1.0, 1.4, 0, 'wood', verts=10, bev=.03), cl('hoop', .25, .05, 1.0, 1.4, .12, 'iron', verts=10),
          cl('hoop', .25, .05, 1.0, 1.4, .4, 'iron', verts=10), cl('grain', .2, .04, 1.0, 1.4, .54, 'hay', verts=10)]
    p += [bx('chimney', .38, .38, 1.1, -.65, -.65, 2.9, 'brick', bev=.03), bx('chtop', .5, .5, .12, -.65, -.65, 4.0, 'charcoal', bev=.02)]
    A['chimney'] = [(-.65, -.65, 4.15)]
    return p, A

def sails():
    """The feed mill's four sails around the hub at the origin, facing the front (spun about the z axis in three.js)."""
    hub = cyl('hub', .17, .16, (0, 0, 0), C['woodd'], verts=10, bev=0, rot=(math.pi / 2, 0, 0))
    cap = cyl('cap', .1, .08, (0, -.11, 0), C['red'], verts=8, bev=0, rot=(math.pi / 2, 0, 0))
    p = [hub, cap]
    for i in range(4):   # blades in the vertical x/z plane, facing the front (-Y in Blender)
        o = [bx('arm', .08, .06, 1.2, 0, .02, .1, 'woodd', bev=.01), bx('sail', .38, .03, .9, .22, .04, .35, 'white' if i % 2 else 'cream', bev=.01)]
        for k in range(4):
            o.append(bx('lat', .4, .04, .03, .22, .07, .4 + k * .21, 'wood', bev=0))
        j = join(o, 'blade'); j.rotation_euler = (0, i * math.pi / 2 + .3, 0); p.append(j)
    return p

def bakery():
    """3 x 2 cells: a warm brick-and-plaster bakery with a striped awning, a display window, bread sign and chimney."""
    p, A = [], {'window': []}
    W, D = 4.5, 2.6
    p.append(bx('base', W + .3, D + .3, .3, 0, 0, 0, 'stone', bev=.06, seg=2))
    p.append(bx('walls', W, D, 2.2, 0, 0, .3, 'plaster', bev=.05, seg=2))
    p.append(bx('brickband', W + .06, D + .06, .7, 0, 0, .3, 'brick', bev=.03))
    for x in (-W / 2, W / 2):
        for k in range(4):
            p.append(bx('quoin', .2, .2, .22, x, D / 2, 1.05 + k * .36, 'stonel' if k % 2 else 'stone', bev=.02))
    p += roof_rows(W, D, 1.3, 0, 0, 2.5, 'teal', 'teald', rows=5, over=.22)
    for s in (-1, 1):
        p.append(extrude_outline('gend', [(-D / 2, 0), (D / 2, 0), (0, 1.3)], .1, (s * (W / 2 - .05), 0, 2.5), C['plaster'], rot=(0, 0, math.pi / 2), bev=.01))
    p += [bx('doorframe', 1.0, .1, 1.6, -.2, D / 2 + .02, .3, 'woodd', bev=.03), bx('door', .8, .1, 1.45, -.2, D / 2 + .06, .3, 'teal', bev=.02),
          cl('knob', .04, .05, .05, D / 2 + .13, 1.0, 'gold', verts=6, rot=(math.pi / 2, 0, 0)), bx('doorwin', .44, .05, .38, -.2, D / 2 + .1, 1.25, 'glass', bev=.01)]
    A['door'] = [(-.2, D / 2 + .12, .3)]
    p += [bx('dframe', 1.5, .1, 1.05, 1.25, D / 2 + .02, .75, 'white', bev=.03), bx('dglass', 1.32, .07, .88, 1.25, D / 2 + .05, .83, 'glass', bev=.01),
          bx('dshelf', 1.36, .3, .06, 1.25, D / 2 + .15, .82, 'woodl', bev=.01)]
    for i in range(4):
        p.append(ball('loaf', .13, .82 + i * .29, D / 2 + .16, .95, 'bread' if i % 2 else 'breadl', sub=1, sc=(1.4, .8, .7)))
    A['window'].append((1.25, D / 2 + .1, 1.25, 0, 1))
    wp, c = window(-1.55, D / 2 + .02, 1.05, .55, .6, 'front', shutters='teal', box=['pink', 'sun', 'violet']); p += wp; A['window'].append(c)
    for s in (-1, 1):
        wp, c = window(s * (W / 2 + .02), 0, 1.2, .5, .5, 'right' if s > 0 else 'left'); p += wp; A['window'].append(c)
    n = 9
    for i in range(n):
        x = -.75 + i * .36 + .18
        p.append(box('awn', (.36, .95, .05), (x, -(D / 2 + .5), 2.0), C['red' if i % 2 else 'white'], bev=.01, seg=1, rot=(-.35, 0, 0)))
        p.append(cl('scal', .18, .05, x, D / 2 + .97, 1.78, 'red' if i % 2 else 'white', verts=8, rot=(math.pi / 2, 0, 0)))
    p.append(bx('awnbar', 3.3, .06, .08, .87, D / 2 + .94, 1.8, 'woodd', bev=0))
    p += [bx('signarm', .06, .6, .06, -1.25, D / 2 + .3, 2.05, 'iron', bev=0), bx('signboard', .06, .55, .42, -1.25, D / 2 + .5, 1.55, 'woodl', bev=.02),
          ball('signloaf', .17, -1.2, D / 2 + .5, 1.77, 'bread', sub=1, sc=(.5, 1.6, .8))]
    p += [bx('chimney', .55, .55, 1.6, 1.5, -.5, 2.7, 'brick', bev=.03), bx('chband', .65, .65, .1, 1.5, -.5, 3.9, 'brickd', bev=.02),
          bx('chtop', .7, .7, .12, 1.5, -.5, 4.3, 'charcoal', bev=.02)]
    A['chimney'] = [(1.5, -.5, 4.45)]
    p += [bx('bkbench', .9, .3, .06, -1.6, D / 2 + .45, .38, 'wood', bev=.01), bx('bl', .06, .28, .38, -1.98, D / 2 + .45, 0, 'woodd', bev=0),
          bx('br', .06, .28, .38, -1.22, D / 2 + .45, 0, 'woodd', bev=0), cl('basket', .2, .16, -1.75, D / 2 + .45, .44, 'woodl', verts=8, rt=.24),
          ball('bb', .1, -1.8, D / 2 + .45, .62, 'breadl', sub=0, sc=(1.4, .8, .7)), ball('bb', .1, -1.68, D / 2 + .42, .62, 'bread', sub=0, sc=(1.4, .8, .7)),
          ball('flour', .24, 1.95, D / 2 + .45, .24, 'paper', sub=2, sc=(1, .85, 1.1))]
    return p, A

def coop():
    """2 x 2 cells: a red henhouse on legs at the back with a ramp, nest boxes and a fenced yard in front."""
    p, A = [], {'window': []}
    HW, HD, z0 = 2.3, 1.45, .45
    y0 = -.85
    for x in (-HW / 2 + .15, HW / 2 - .15):
        for y in (y0 - HD / 2 + .15, y0 + HD / 2 - .15):
            p.append(bx('leg', .14, .14, z0, x, y, 0, 'woodd', bev=.02))
    p.append(bx('floor', HW + .1, HD + .1, .1, 0, y0, z0, 'woodd', bev=.02))
    p.append(bx('walls', HW, HD, 1.15, 0, y0, z0 + .1, 'barn', bev=.04, seg=2))
    for i in range(7):
        p.append(bx('board', .05, .04, 1.1, -HW / 2 + .15 + i * (HW - .3) / 6, y0 + HD / 2 + .02, z0 + .12, 'barnd', bev=0))
    p.append(bx('trim', HW + .08, HD + .08, .08, 0, y0, z0 + 1.2, 'white', bev=.02))
    for x in (-HW / 2, HW / 2):
        p.append(bx('corner', .1, HD + .06, 1.15, x, y0, z0 + .1, 'white', bev=.02))
    p += roof_rows(HW, HD, .75, 0, y0, z0 + 1.25, 'roof', 'roofd', rows=4, over=.2, thick=.08)
    for s in (-1, 1):
        p.append(extrude_outline('gend', [(-HD / 2, 0), (HD / 2, 0), (0, .75)], .08, (s * (HW / 2 - .04), -y0, z0 + 1.25), C['barn'], rot=(0, 0, math.pi / 2), bev=.01))
    p += [bx('hole', .42, .06, .5, 0, y0 + HD / 2 + .03, z0 + .14, 'charcoal', bev=.02), bx('holeframe', .52, .05, .58, 0, y0 + HD / 2 + .02, z0 + .12, 'white', bev=.02)]
    p.append(box('ramp', (.42, .95, .05), (0, -(y0 + HD / 2 + .42), z0 / 2 + .02), C['woodl'], bev=.01, seg=1, rot=(-.48, 0, 0)))
    A['door'] = [(0, y0 + HD / 2 + .9, 0)]
    wp, c = window(.72, y0 + HD / 2 + .02, z0 + .55, .36, .34, 'front', shutters=None); p += wp; A['window'].append(c)
    p += [bx('nest', .4, 1.0, .5, -HW / 2 - .2, y0, z0 + .2, 'barn', bev=.03), bx('nestlid', .5, 1.1, .06, -HW / 2 - .22, y0, z0 + .72, 'roofd', bev=.02)]
    for k in range(2):
        p.append(ball('straw', .14, -HW / 2 - .2, y0 - .25 + k * .5, z0 + .68, 'hay', sub=0, sc=(1.2, 1.2, .4)))
    def pickets(x0, y0_, x1, y1, n):
        q = []
        for i in range(n + 1):
            t = i / n; x = x0 + (x1 - x0) * t; y = y0_ + (y1 - y0_) * t
            q.append(bx('pk', .08, .08, .48, x, y, 0, 'white', bev=.015))
            q.append(cone('pkt', .065, .12, (x, -y, .54), C['white'], verts=4, rot=(0, 0, math.pi / 4)))
        L = math.hypot(x1 - x0, y1 - y0_); ang = math.atan2(y1 - y0_, x1 - x0)
        for zz in (.14, .34):
            q.append(box('rail', (L, .05, .06), ((x0 + x1) / 2, -((y0_ + y1) / 2), zz), C['white'], bev=.01, seg=1, rot=(0, 0, -ang)))
        return q
    e = 1.72
    p += pickets(-e, -.1, -e, e, 5) + pickets(e, -.1, e, e, 5) + pickets(-e, e, -.5, e, 3) + pickets(.5, e, e, e, 3)
    p += [cl('feeder', .2, .16, -.9, .9, 0, 'iron', verts=8, rt=.24), cl('feedg', .18, .03, -.9, .9, .15, 'hay', verts=8),
          cl('dish', .24, .08, .95, .75, 0, 'stoned', verts=10, rt=.27), cl('dishw', .21, .02, .95, .75, .07, 'water', verts=10)]
    for i in range(6):
        p.append(ball('grain', .05, -.4 + i * .17, .45 + (i % 2) * .2, .01, 'hay', sub=0, sc=(1, 1, .4)))
    return p, A

def cow_barn():
    """3 x 2 cells: a red gambrel-roofed barn with white trim, X-braced doors, a hay loft and a trough."""
    p, A = [], {'window': []}
    W, D, H = 4.4, 2.9, 1.9
    p.append(bx('base', W + .24, D + .24, .2, 0, 0, 0, 'stone', bev=.05, seg=2))
    p.append(bx('walls', W, D, H, 0, 0, .2, 'barn', bev=.05, seg=2))
    for i in range(11):   # vertical boards on the front
        p.append(bx('board', .05, .04, H - .1, -W / 2 + .2 + i * (W - .4) / 10, D / 2 + .02, .25, 'barnd', bev=0))
    for x in (-W / 2, W / 2):
        p.append(bx('corner', .14, D + .08, H, x, 0, .2, 'white', bev=.03))
    p.append(bx('eave', W + .1, D + .1, .1, 0, 0, H + .15, 'white', bev=.02))
    # gambrel roof: steep lower slopes and a shallow upper pair, ridge along x
    z0, hd = H + .25, D / 2 + .25
    for side in (-1, 1):
        lo = box('roofl', (W + .5, 1.15, .12), (0, -side * (hd - .38), z0 + .52), C['roofd'], bev=.03, seg=1, rot=(side * 1.05, 0, 0))
        up = box('roofu', (W + .5, 1.05, .12), (0, -side * .45, z0 + 1.2), C['roof'], bev=.03, seg=1, rot=(side * .42, 0, 0))
        p += [lo, up]
    p.append(cl('ridge', .08, W + .6, 0, 0, 0, 'white', verts=6, rot=(0, math.pi / 2, 0)))
    p[-1].location = (0, 0, z0 + 1.4)
    gable = [(-hd + .2, 0), (hd - .2, 0), (hd - .62, .95), (0, 1.38), (-hd + .62, .95)]
    for s_ in (-1, 1):
        p.append(extrude_outline('gend', gable, .1, (s_ * (W / 2 - .02), 0, z0 - .05), C['barn'], rot=(0, 0, math.pi / 2), bev=.01))
    # front gable trim and hay loft (the front is +y on the plan; the gable faces the sides, so the loft sits on the long front wall's dormer)
    p += [bx('dormer', 1.2, .8, 1.0, 0, D / 2 - .1, H + .1, 'barn', bev=.03), bx('dormtrim', 1.3, .85, .08, 0, D / 2 - .1, H + 1.1, 'white', bev=.02),
          extrude_outline('dormroof', [(-.8, 0), (.8, 0), (0, .55)], 1.0, (0, -(D / 2 - .2), H + 1.15), C['roof'], bev=.02),
          bx('loft', .7, .06, .62, 0, D / 2 + .3, H + .28, 'wooddd', bev=.02), bx('loftframe', .84, .05, .76, 0, D / 2 + .29, H + .21, 'white', bev=.02)]
    for k in range(3):
        p.append(ball('hay', .16, -.18 + k * .18, D / 2 + .36, H + .3 + (k % 2) * .06, 'hay', sub=1, sc=(1.2, .7, .8)))
    p.append(bx('pulley', .08, .5, .08, 0, D / 2 + .5, H + 1.02, 'woodd', bev=0))
    # double doors with white X braces
    for s_ in (-1, 1):
        x = s_ * .55
        p += [bx('door', 1.05, .08, 1.5, x, D / 2 + .05, .2, 'barnd', bev=.02), bx('dtrim', 1.1, .06, .1, x, D / 2 + .1, 1.65, 'white', bev=.01),
              bx('dtrim', 1.1, .06, .1, x, D / 2 + .1, .2, 'white', bev=.01), bx('dtrimv', .1, .06, 1.5, x + s_ * .5, D / 2 + .1, .2, 'white', bev=.01)]
        for r in (.95, -.95):
            o = box('brace', (.08, .05, 1.65), (x, -(D / 2 + .11), .95), C['white'], bev=.01, seg=1, rot=(0, r * .58, 0)); p.append(o)
    A['door'] = [(0, D / 2 + .12, .2)]
    for x in (-1.65, 1.65):
        wp, c = window(x, D / 2 + .02, 1.05, .5, .45, 'front', shutters='white'); p += wp; A['window'].append(c)
    # cupola with a weather vane
    p += [bx('cup', .5, .5, .45, 1.1, 0, z0 + 1.38, 'white', bev=.03), extrude_outline('cuproof', [(-.36, 0), (.36, 0), (0, .3)], .66, (1.1, 0, z0 + 1.83), C['roof'], bev=.02),
          cl('vane', .02, .5, 1.1, 0, z0 + 2.1, 'iron', verts=4), bx('arrow', .45, .03, .08, 1.1, 0, z0 + 2.45, 'iron', bev=0)]
    # the back and the gable ends are seen from the default camera too (review: 'a red box with white stripes'): boards,
    # a stable door with a white X, shuttered windows and a hay-loft hatch on the back, a window in each gable wall
    by = -D / 2
    for i in range(11):
        p.append(bx('bboard', .05, .04, H - .1, -W / 2 + .2 + i * (W - .4) / 10, by - .02, .25, 'barnd', bev=0))
    p += [bx('bdoor', .9, .08, 1.35, .9, by - .05, .2, 'barnd', bev=.02), bx('bdtrim', 1.0, .06, .1, .9, by - .1, 1.55, 'white', bev=.01),
          bx('bdtrimv', .1, .06, 1.35, .45, by - .1, .2, 'white', bev=.01), bx('bdtrimv', .1, .06, 1.35, 1.35, by - .1, .2, 'white', bev=.01)]
    for r in (.95, -.95):
        p.append(box('bbrace', (.08, .05, 1.45), (.9, -(by - .11), .9), C['white'], bev=.01, seg=1, rot=(0, r * .6, 0)))
    for x in (-1.5, -.45):
        p += [bx('bwframe', .64, .08, .59, x, by - .02, .98, 'white', bev=.02), bx('bglass', .5, .06, .45, x, by - .05, 1.05, 'glass', bev=.01),
              bx('bmull', .05, .05, .45, x, by - .08, 1.05, 'white', bev=0)]
        for s_ in (-1, 1):
            p.append(bx('bshutter', .24, .05, .49, x + s_ * .42, by - .04, 1.03, 'white', bev=.015))
        A['window'].append((x, by - .09, 1.28, 0, -1))
    p += [bx('bloft', .8, .06, .6, 0, by - .03, H + .45, 'wooddd', bev=.02), bx('bloftframe', .94, .05, .74, 0, by - .02, H + .38, 'white', bev=.02)]
    for s_, face in ((-1, 'left'), (1, 'right')):
        wp, c = window(s_ * (W / 2 + .07), 0, 1.0, .55, .5, face); p += wp; A['window'].append(c)
    # trough and a round bale beside it
    p += [bx('trough', 1.1, .45, .35, -1.45, D / 2 + .55, 0, 'wood', bev=.04), bx('water', 1.0, .36, .04, -1.45, D / 2 + .55, .3, 'water', bev=0),
          cl('bale', .38, .55, 1.75, D / 2 + .55, .38, 'hay', verts=14, rot=(0, math.pi / 2, 0)), ]
    p[-1].location = (1.75, -(D / 2 + .55), .38)
    p.append(cl('baleband', .39, .06, 0, 0, 0, 'twine' if 'twine' in C else 'redd', verts=14, rot=(0, math.pi / 2, 0))); p[-1].location = (1.75, -(D / 2 + .55), .38)
    return p, A

for name, gen in (('feed_mill', feed_mill), ('bakery', bakery), ('coop', coop), ('cow_barn', cow_barn)):
    parts, A = gen()
    piece(name, parts)
    anchors[name] = A
piece('feed_mill_sails', sails())
anchors['feed_mill_sails'] = {'hub': [(0, 0, 0)]}

# =================================================================== charm pieces kept from v0.1 (now vertex-coloured)
piece('bench', [bx('seat', 1.4, .45, .08, 0, 0, .42, 'wood'), bx('back', 1.4, .08, .4, 0, -.22, .58, 'wood'),
                bx('legl', .08, .45, .42, -.6, 0, 0, 'iron', bev=.01), bx('legr', .08, .45, .42, .6, 0, 0, 'iron', bev=.01),
                bx('armr', .08, .45, .2, .66, 0, .5, 'woodd'), bx('arml', .08, .45, .2, -.66, 0, .5, 'woodd')])
piece('lamp', [cl('foot', .22, .18, 0, 0, 0, 'charcoal', verts=8, rt=.15), cl('pole', .06, 2.0, 0, 0, .18, 'iron', verts=6),
               bx('arm', .1, .1, .1, 0, 0, 2.15, 'iron'), cl('cap', .26, .14, 0, 0, 2.48, 'charcoal', verts=6, rt=.08),
               cl('glass', .18, .3, 0, 0, 2.18, 'lampglow', verts=6)])
anchors['lamp'] = {'light': [(0, 0, 2.33)]}

# =================================================================== the delivery truck (PLAN-v0.3 P3): a little red pickup, front toward +y
def truck(body='red', roof='redd', cargo=(('hay', 'sack', 'hayd'), 'sackd')):
    """The pickup; body/roof colours and cargo (three crates and a sack) vary for the fleet's extra trucks."""
    p = [bx('chassis', 1.5, 4.0, .34, 0, 0, .36, 'charcoal', bev=.04),
         bx('cab', 1.55, 1.45, 1.0, 0, 1.2, .62, body, bev=.07), bx('cabroof', 1.6, 1.3, .12, 0, 1.15, 1.58, roof, bev=.04),
         bx('hood', 1.5, .9, .5, 0, 1.95, .62, body, bev=.06),
         bx('windshield', 1.3, .08, .55, 0, 1.58, 1.0, 'glass', bev=.02), bx('sidewinl', .06, .8, .5, -.79, 1.2, 1.0, 'glass', bev=.01), bx('sidewinr', .06, .8, .5, .79, 1.2, 1.0, 'glass', bev=.01),
         bx('grille', 1.0, .08, .3, 0, 2.42, .72, 'iron', bev=.02), bx('bumper', 1.6, .18, .16, 0, 2.45, .42, 'iron', bev=.03),
         bx('lampl', .22, .08, .16, -.55, 2.44, .9, 'sun', bev=.02), bx('lampr', .22, .08, .16, .55, 2.44, .9, 'sun', bev=.02),
         bx('bedfloor', 1.6, 2.2, .1, 0, -1.0, .62, 'woodd', bev=.02),
         bx('sidel', .1, 2.2, .45, -.78, -1.0, .72, 'wood', bev=.02), bx('sider', .1, 2.2, .45, .78, -1.0, .72, 'wood', bev=.02),
         bx('tail', 1.6, .1, .45, 0, -2.1, .72, 'wood', bev=.02), bx('front', 1.6, .1, .55, 0, -.05, .72, 'wood', bev=.02)]
    for (x, y), c in zip([(-.45, -1.2), (.4, -1.5), (-.1, -.55)], cargo[0]):
        p.append(bx('crate', .62, .62, .5, x, y, .72, c, bev=.04))
    p.append(ball('sackball', .26, .45, -.65, 1.05, cargo[1], sc=(1, 1, 1.1)))
    for x, y in [(-.86, 1.45), (.86, 1.45), (-.86, -1.35), (.86, -1.35)]:
        p.append(cl('tyre', .42, .3, x, y, .42, 'charcoal', verts=12, rot=(0, math.pi / 2, 0)))
        p.append(cl('hub', .2, .34, x, y, .42, 'iron', verts=8, rot=(0, math.pi / 2, 0)))
    return p
piece('truck', truck())
anchors['truck'] = {'light': [(-.55, 2.44, .98), (.55, 2.44, .98)]}

# =================================================================== the fish pond (v0.3b): a stone-ringed pond with reeds and a little plank dock, 4 x 3 cells (8 x 6 m)
def pond():
    p = [cl('bank', 3.5, .16, 0, 0, 0, 'stoned', verts=22, rt=3.5), cl('bank2', 2.4, .16, -.2, 1.5, 0, 'stoned', verts=18), cl('bank3', 2.3, .16, .5, -1.5, 0, 'stoned', verts=18),
         # the three water discs a few millimetres apart: coincident tops shadow each other to black in Cycles (icon renders)
         cl('water', 3.3, .12, 0, 0, .12, 'water', verts=22), cl('water2', 2.2, .12, -.2, 1.5, .124, 'water', verts=18), cl('water3', 2.1, .12, .5, -1.5, .128, 'water', verts=18)]
    for i in range(14):
        a = i / 14 * math.tau; r = 3.5 + .2 * math.sin(i * 2.3)
        p.append(ball('rock', .3 + .08 * (i % 3), math.cos(a) * r, math.sin(a) * (r * .82), .22, 'stone' if i % 2 else 'stonel', sc=(1, 1, .7)))
    for x, y in [(-3.0, 1.6), (-2.7, 1.9), (3.1, -1.2), (2.8, -1.5), (-2.2, -2.2)]:
        for k in range(3):
            p.append(cl('reed', .05, 1.2 + .25 * k, x + .16 * k, y - .1 * k, 0, 'leaf', verts=5))
            p.append(cl('cattail', .08, .3, x + .16 * k, y - .1 * k, 1.1 + .25 * k, 'wooddd', verts=6))
    p.append(bx('dock', 1.1, 2.8, .14, 3.4, 0, .34, 'wood', bev=.02))
    for i in range(6): p.append(bx('plank', 1.1, .06, .02, 3.4, -1.2 + i * .48, .5, 'woodd', bev=.01))
    for x, y in [(2.9, -1.3), (3.9, -1.3), (2.9, 1.3), (3.9, 1.3)]: p.append(cl('post', .08, .55, x, y, 0, 'wooddd', verts=6))
    return p
piece('pond', pond())

# =================================================================== cute trees (v0.3e): fat bubbly canopies, short trunks, bright warm greens
CANOPY = [(0, 0, 3.0, 1.5, 0), (1.15, .3, 2.7, 1.1, 1), (-1.1, .4, 2.65, 1.1, 2), (.2, -1.1, 2.7, 1.1, 3), (.1, .1, 3.9, 1.0, 4)]
def cute(name, base, light, dark, fruit=None, nfruit=7, fr=.2, out=1.0):
    p = [cl('trunk', .4, 2.4, 0, 0, 0, 'wood', verts=8, rt=.28), cl('root', .58, .25, 0, 0, 0, 'woodd', verts=8, rt=.4)]
    for i, (x, y, z, r, k) in enumerate(CANOPY):
        p.append(ball('puff', r, x, y, z, [base, light, dark, base, light][k % 5] if i else base, sub=2, sc=(1, 1, .92)))
    if fruit:
        for i in range(nfruit):
            a = i / nfruit * math.tau + .4; r = (1.55 + .25 * (i % 2)) * out; z = 2.4 + .8 * ((i * 3) % 4) / 3
            p.append(ball('fruit', fr, math.cos(a) * r * .8, math.sin(a) * r * .8, z, fruit, sub=0))
    return p
piece('cute_round', cute('r', 'leafw', 'leafwl', 'leafwd'))
piece('cute_apple', cute('a', 'leafw', 'leafwl', 'leafwd', 'fruitred', nfruit=10, fr=.27, out=1.3))   # fruit on the canopy, not inside it
piece('cute_apple_bare', cute('ab', 'leafw', 'leafwl', 'leafwd'))
piece('cute_peach', cute('p', 'leafwl', 'leafw', 'leafwd', 'fruitpeach', nfruit=10, fr=.27, out=1.3))
piece('cute_peach_bare', cute('pb', 'leafwl', 'leafw', 'leafwd'))
piece('cute_blossom', cute('b', 'blossom', 'blossoml', 'blossomd'))
# tree pack (2026-10-08): an orange tree and a coconut palm (fruit), a weeping willow (charm, by the pond)
piece('cute_orange', cute('o', 'leafwd', 'leafw', 'pinew', 'orange', nfruit=9, fr=.28, out=1.3))
piece('cute_orange_bare', cute('ob', 'leafwd', 'leafw', 'pinew'))
def palm(fruit=True):
    """A coconut palm: a curved, ringed trunk, six drooping fronds and a cluster of coconuts under them."""
    p = []
    pts = [(0, 0, 0), (.15, 0, 1.2), (.45, 0, 2.4), (.85, 0, 3.5), (1.1, 0, 4.3)]
    for k in range(len(pts) - 1):
        r0 = .32 - k * .05
        p.append(st(pts[k], pts[k + 1], r0, 'wood' if k % 2 else 'woodl', sides=7, rt=r0 - .05))
    top = pts[-1]
    for i in range(7):
        a = i / 7 * math.tau
        p.append(lf(top, a, 2.2, .75, 'leafw' if i % 2 else 'leafwl', lift=.25, droop=.9))
    if fruit:
        for j in range(4):
            a = j * 1.6
            p.append(ball('coco', .2, top[0] + math.cos(a) * .22, top[1] + math.sin(a) * .22, top[2] - .25, 'woodd', sub=1))
    return p
piece('cute_palm', palm())
piece('cute_palm_bare', palm(False))
def willow():
    """A weeping willow: a stout trunk, a dome of soft green, and long hanging curtains of leaves to the ground."""
    p = [cl('trunk', .45, 2.6, 0, 0, 0, 'woodd', verts=8, rt=.3), cl('root', .65, .3, 0, 0, 0, 'wooddd', verts=8, rt=.45)]
    p.append(ball('dome', 1.7, 0, 0, 3.2, 'leafw', sub=2, sc=(1.15, 1.15, .7)))
    p.append(ball('dome2', 1.1, .3, -.2, 3.9, 'leafwl', sub=2, sc=(1, 1, .7)))
    for i in range(14):
        a = i / 14 * math.tau; r = 1.65 + .15 * (i % 2)
        x, y = math.cos(a) * r, math.sin(a) * r
        p.append(sp(.28, -2.3 + .3 * (i % 3), x, y, 3.0, 'leafwl' if i % 3 == 0 else 'leafw', sides=4, mid=(.2, .6)))
    return p
piece('cute_willow', willow())
def cute_pine():
    p = [cl('trunk', .34, 1.2, 0, 0, 0, 'wood', verts=8, rt=.26)]
    for i, (r, z, mt) in enumerate([(1.7, 1.0, 'pinew'), (1.35, 2.2, 'pinewl'), (.95, 3.3, 'pinew'), (.55, 4.2, 'pinewl')]):
        p.append(cl('tier', r, 1.35, 0, 0, z, mt, verts=12, rt=r * .28, bev=.3))
    p.append(ball('tip', .32, 0, 0, 5.5, 'pinewl', sub=1))
    return p
piece('cute_pine', cute_pine())
def board():
    p = [bx('postl', .12, .12, 1.9, -.75, 0, 0, 'woodd'), bx('postr', .12, .12, 1.9, .75, 0, 0, 'woodd'),
         bx('board', 1.5, .08, .95, 0, .02, .8, 'cork', bev=.02), bx('frame', 1.62, .06, 1.05, 0, -.02, .75, 'wood', bev=.02),
         gable('roof', 1.8, .5, .3, 0, 0, 1.9, 'roof', over=.08)]
    for i, (x, z, c) in enumerate([(-.45, 1.3, 'paper'), (0, 1.25, 'mint'), (.45, 1.32, 'paper'), (-.22, .95, 'sun'), (.28, .95, 'paper')]):
        p.append(bx('note', .3, .03, .28, x, .08, z - .14, c, bev=0, rot=((i % 3) - 1) * .06))
    return p
piece('order_board', board())

# =================================================================== chunky white picket fence set (on 2 m cell edges)
def picket_span(lod=0):
    """A 2 m span between joints (the posts come from picket_post / _corner / _t at the joints)."""
    p = []
    for i in range(5):
        x = -.72 + i * .36
        p.append(bx('pk', .14, .07, .62, x, 0, 0, 'white', bev=.03 if lod == 0 else 0, seg=1))
        p.append(cone('pkt', .11, .16, (x, 0, .7), C['white'], verts=4, rot=(0, 0, math.pi / 4)))
    for z in (.16, .44):
        p.append(bx('rail', 2.0, .06, .09, 0, -.06, z, 'white', bev=.02 if lod == 0 else 0, seg=1))
    return p
def picket_post(kind='post'):
    p = [bx('post', .2, .2, .86, 0, 0, 0, 'white', bev=.04, seg=1), bx('cap', .26, .26, .06, 0, 0, .86, 'white', bev=.02, seg=1)]
    if kind == 'corner':
        p.append(ball('ball', .1, 0, 0, .98, 'white', sub=1))
    elif kind == 't':
        p.append(cone('top', .15, .14, (0, 0, .99), C['white'], verts=4, rot=(0, 0, math.pi / 4)))
    return p
def picket_gate():
    p = [bx('postl', .22, .22, 1.1, -.92, 0, 0, 'white', bev=.04), bx('postr', .22, .22, 1.1, .92, 0, 0, 'white', bev=.04),
         ball('bl', .12, -.92, 0, 1.2, 'white', sub=1), ball('br', .12, .92, 0, 1.2, 'white', sub=1)]
    for s in (-1, 1):
        for i in range(3):
            p.append(bx('pk', .12, .06, .55 + .06 * i, s * (.2 + (2 - i) * .23), 0, .06, 'white', bev=.02))
        p += [bx('rail', .78, .05, .08, s * .43, -.05, .2, 'white', bev=.01), bx('rail', .78, .05, .08, s * .43, -.05, .46, 'white', bev=.01),
              bx('brace', .06, .04, .7, s * .43, -.08, .14, 'white', bev=0)]
    p.append(cl('latch', .03, .1, 0, .06, .4, 'iron', verts=5))
    return p
piece('picket_straight', picket_span())
piece('picket_straight_mid', picket_span(1))
piece('picket_post', picket_post())
piece('picket_corner', picket_post('corner'))
piece('picket_t', picket_post('t'))
piece('picket_gate', picket_gate())

# =================================================================== decor.glb: loaded after the first frame
def plank_bridge():
    """A 4 m wide plank bridge (span along the plan's y, 6 m) with rails and posts, for the road over the brook."""
    p = []
    arch = lambda y: .5 + .18 * math.sin((y + 2.8) / 5.6 * math.pi)
    for i in range(14):
        y = -2.6 + i * .4
        p.append(bx('plank', 4.2, .36, .12, 0, y, arch(y) - .12, 'woodl' if i % 3 else 'wood', bev=.03))
    for x in (-1.9, 1.9):
        p.append(bx('beam', .22, 6.0, .22, x, 0, .2, 'woodd', bev=.03))
        ys = (-2.7, -.9, .9, 2.7)
        for y in ys:
            p.append(bx('post', .2, .2, .9, x * 1.06, y, arch(y) - .2, 'woodd', bev=.03))
            p.append(ball('postcap', .12, x * 1.06, y, arch(y) + .72, 'wood', sub=1))
        for y0, y1 in zip(ys, ys[1:]):
            p.append(st((x * 1.06, y0, arch(y0) + .52), (x * 1.06, y1, arch(y1) + .52), .07, 'wood', sides=4, rt=.07))
    for x in (-2.2, 2.2):
        for y in (-3.0, 3.0):
            p.append(ball('stone', .3, x, y, .1, 'stone', sub=1, sc=(1.2, 1, .6)))
    return p
piece('plank_bridge', plank_bridge(), decor)

def fountain():
    p = [lathe('basin', [(0, 0), (1.3, 0), (1.35, .1), (1.3, .5), (1.15, .5), (1.1, .2), (0, .2)], (0, 0, 0), C['stonel'], segments=20, smooth_angle=40),
         cl('water', 1.12, .06, 0, 0, .34, 'water', verts=20), cl('pillar', .18, 1.0, 0, 0, .3, 'stone', verts=10),
         lathe('bowl', [(0, 0), (.6, .05), (.7, .2), (.6, .22), (0, .12)], (0, 0, 1.15), C['stonel'], segments=16, smooth_angle=40),
         cl('water2', .58, .04, 0, 0, 1.33, 'waterl', verts=16), cl('spout', .07, .45, 0, 0, 1.3, 'stone', verts=8, rt=.04),
         ball('splash', .14, 0, 0, 1.8, 'waterl', sub=1, sc=(1, 1, 1.4))]
    for i in range(10):
        a = i / 10 * math.tau
        p.append(ball('drop', .06, math.cos(a) * .55, math.sin(a) * .55, 1.0 - .1 * (i % 2), 'waterl', sub=0, sc=(.8, .8, 1.6)))
    for i in range(8):
        a = i / 8 * math.tau + .2
        p.append(ball('fl', .12, math.cos(a) * 1.45, math.sin(a) * 1.45, .12, ('pink', 'sun', 'violet', 'red')[i % 4], sub=0))
        p.append(ball('lf', .16, math.cos(a + .35) * 1.48, math.sin(a + .35) * 1.48, .1, 'leaf', sub=0, sc=(1, 1, .6)))
    return p
piece('fountain', fountain(), decor)

def bunting(span=4.0):
    """Two poles with a sagging string of bright flags between them."""
    p = []
    for x in (-span / 2, span / 2):
        p += [cl('pole', .06, 2.6, x, 0, 0, 'woodd', verts=6), ball('knob', .09, x, 0, 2.65, 'gold', sub=1)]
    cols = ('red', 'sun', 'sky', 'mint', 'pink', 'violet')
    n = 11
    pts = [(-span / 2 + span * i / n, 2.45 - .45 * math.sin(i / n * math.pi)) for i in range(n + 1)]
    for i in range(n):
        (x0, z0), (x1, z1) = pts[i], pts[i + 1]
        p.append(st((x0, 0, z0), (x1, 0, z1), .012, 'charcoal', sides=3, rt=.012))
        p.append(extrude_outline('flag', [(-.15, 0), (.15, 0), (0, -.34)], .02, ((x0 + x1) / 2, 0, (z0 + z1) / 2), C[cols[i % len(cols)]], bev=0))
    return p
piece('bunting', bunting(), decor)

def banner():
    """A village banner on a tall pole: a red cloth with a golden wheat sheaf."""
    p = [cl('pole', .07, 3.6, 0, 0, 0, 'woodd', verts=8), ball('finial', .12, 0, 0, 3.66, 'gold', sub=1),
         bx('bar', 1.2, .06, .06, .55, 0, 3.3, 'woodd', bev=0), bx('cloth', 1.0, .04, 1.4, .58, 0, 1.85, 'red', bev=.01, seg=1),
         extrude_outline('tail', [(-.5, 0), (.5, 0), (0, -.3)], .04, (.58, 0, 1.85), C['red'], bev=0),
         bx('border', 1.04, .05, .08, .58, .01, 3.18, 'gold', bev=0)]
    for k in range(5):
        p.append(sp(.04, .3, .45 + k * .065, .04, 2.5 - abs(k - 2) * .04, 'wheatl', sides=4, lean=((k - 2) * .25, 0)))
        p.append(st((.58, .04, 2.2), (.45 + k * .065, .04, 2.5 - abs(k - 2) * .04), .012, 'gold'))
    p.append(bx('tie', .3, .05, .06, .58, .05, 2.36, 'gold', bev=0))
    return p
piece('banner', banner(), decor)

def sale_sign():
    """A For-sale sign for a locked parcel: a post with a white board, a coin and a red ribbon."""
    p = [bx('post', .12, .12, 1.5, 0, 0, 0, 'woodd', bev=.02), bx('board', 1.1, .08, .62, 0, .08, .8, 'white', bev=.03),
         bx('frame', 1.2, .06, .7, 0, .04, .76, 'wood', bev=.02), cl('coin', .19, .05, -.28, .14, 1.11, 'gold', verts=12, rot=(math.pi / 2, 0, 0)),
         cl('coinin', .13, .06, -.28, .15, 1.11, 'sun', verts=12, rot=(math.pi / 2, 0, 0))]
    for k in range(3):
        p.append(bx('line', .4, .03, .06, .18, .13, 1.2 - k * .14, 'charcoal' if k == 0 else 'stoned', bev=0))
    p.append(bx('ribbon', .5, .04, .1, .3, .13, .86, 'red', bev=0, rot=-.4))
    p.append(ball('tuft', .2, .15, -.1, .05, 'leaf', sub=1, sc=(1.4, 1, .6)))
    return p
piece('sale_sign', sale_sign(), decor)

def scaffold(w=4.0, d=3.0, h=3.2):
    """Wooden scaffolding with decks, a ladder, stacked timber and a crate of tools for a building project."""
    p = []
    for x in (-w / 2, 0, w / 2):
        for y in (-d / 2, d / 2):
            p.append(bx('pole', .1, .1, h, x, y, 0, 'woodl', bev=.01))
    for z in (1.1, 2.2):
        for y in (-d / 2, d / 2):
            p.append(bx('ledger', w + .2, .08, .08, 0, y, z, 'wood', bev=0))
            p.append(bx('deck', w, .5, .06, 0, y + (.25 if y > 0 else -.25), z + .08, 'woodl' if z < 2 else 'wood', bev=.01))
        for x in (-w / 2, w / 2):
            p.append(bx('side', .08, d + .2, .08, x, 0, z, 'wood', bev=0))
    for x in (-w / 4, w / 4):
        p.append(st((x - w / 4, d / 2 + .06, .1), (x + w / 4, d / 2 + .06, 1.1), .04, 'wood', sides=4, rt=.04))
    for s in (-.2, .2):
        p.append(st((1.2 + s, d / 2 + .8, 0), (1.2 + s, d / 2 + .1, 2.3), .04, 'woodd', sides=4, rt=.04))
    for k in range(6):
        t = (k + .5) / 6
        p.append(bx('rung', .44, .05, .05, 1.2, d / 2 + .8 - .7 * t, 2.3 * t, 'woodd', bev=0))
    for k in range(3):
        for j in range(3 - k):
            p.append(bx('timber', 1.6, .2, .2, -1.0, d / 2 + .9 + (j - (2 - k) / 2) * .22, k * .2, 'woodl' if (j + k) % 2 else 'wood', bev=.02))
    p += [bx('crate', .6, .5, .45, .2, d / 2 + .9, 0, 'wood', bev=.03), bx('crateband', .62, .52, .06, .2, d / 2 + .9, .3, 'woodd', bev=0),
          bx('hammerh', .22, .08, .08, .15, d / 2 + .9, .5, 'iron', bev=0), cl('bucket', .16, .28, .7, d / 2 + .8, 0, 'iron', verts=8, rt=.19)]
    p += [cl('flagpole', .03, .7, w / 2, -d / 2, h, 'woodd', verts=5),
          extrude_outline('flag', [(0, 0), (.4, -.1), (0, -.25)], .02, (w / 2, d / 2, h + .68), C['red'], bev=0)]
    return p
piece('scaffold', scaffold(), decor)

# the second and third delivery trucks (core/market.mjs fleet): the same pickup in teal and in sunny yellow, with other cargo
piece('truck_teal', truck('teal', 'teald', (('woodl', 'cream', 'wood'), 'sack')), decor)
piece('truck_sun', truck('sun', 'hayd', (('pumpkin', 'woodl', 'berry'), 'sackd')), decor)

# cottage dressing (placed by land-view at a cottage's door and windows, by furnish level)
def window_box():
    p = [bx('box', .9, .24, .2, 0, 0, 0, 'woodd', bev=.03), bx('soil', .84, .2, .04, 0, 0, .18, 'soil', bev=0)]
    for i in range(5):
        x = -.34 + i * .17
        p.append(ball('fl', .08, x, .02, .3 + (i % 2) * .04, ('pink', 'sun', 'red', 'violet', 'white')[i], sub=1))
        p.append(ball('lf', .09, x + .08, -.02, .22, 'leaf', sub=0, sc=(1.2, 1, .7)))
    return p
piece('window_box', window_box(), decor)
piece('door_lantern', [bx('bracket', .06, .3, .06, 0, .15, .5, 'iron', bev=0), cl('cap', .14, .1, 0, .3, .5, 'charcoal', verts=6, rt=.04),
                       cl('glass', .1, .22, 0, .3, .28, 'lampglow', verts=6), cl('base', .12, .05, 0, .3, .24, 'charcoal', verts=6)], decor)
anchors['door_lantern'] = {'light': [(0, .3, .39)]}
def flowerpots():
    p = []
    for x, c in ((-.25, 'pink'), (.25, 'sun')):
        p += [cl('pot', .16, .28, x, 0, 0, 'brick', verts=10, rt=.2), cl('potrim', .21, .05, x, 0, .26, 'brickd', verts=10)]
        p.append(ball('bush', .2, x, 0, .42, 'leaf', sub=1, sc=(1, 1, .9)))
        for k in range(4):
            a = k * 1.6 + x
            p.append(ball('fl', .07, x + math.cos(a) * .13, math.sin(a) * .13, .55, c, sub=0))
    return p
piece('flowerpots', flowerpots(), decor)
piece('doormat', [bx('mat', .8, .5, .03, 0, 0, 0, 'red', bev=.01), bx('stripe', .7, .08, .035, 0, 0, 0, 'cream', bev=0)], decor)
piece('path_stones', [ball('st', .2, x + (i - 1) * .03, 0, .04, 'stonel' if i % 2 else 'stone', sub=1, sc=(1.5, .9, .5))
                      for i, x in enumerate((-.62, 0, .62))], decor)

# obstacles on unowned land (larger than the v0.1 weeds and rocks)
def obstacle_bush():
    p = [blob('b', r, (x, -y, r * .8), C['leafd' if i % 2 else 'leaf'], scale=(1, 1, .85), subdiv=1, wobble=.12, seed=i)
         for i, (x, y, r) in enumerate([(0, 0, .6), (.45, .2, .45), (-.4, .25, .42), (.1, -.4, .4), (-.25, -.25, .38)])]
    for i in range(5):
        a = i * 1.3
        p.append(ball('berry', .06, math.cos(a) * .55, math.sin(a) * .5, .6 + (i % 2) * .25, 'berry', sub=0))
    return p
piece('obstacle_bush', obstacle_bush(), decor)
def obstacle_stump():
    p = [cl('stump', .45, .5, 0, 0, 0, 'woodd', verts=12, rt=.4, bev=.03), cl('ring', .4, .04, 0, 0, .5, 'woodl', verts=12),
         cl('core', .22, .045, 0, 0, .5, 'wood', verts=10)]
    for i in range(4):
        a = i * math.pi / 2 + .4
        p.append(st((math.cos(a) * .3, math.sin(a) * .3, .15), (math.cos(a) * .75, math.sin(a) * .75, 0), .12, 'woodd', sides=5, rt=.05))
    p += [cl('mush', .05, .14, .38, .25, 0, 'cream', verts=5), ball('cap', .1, .38, .25, .16, 'red', sub=1, sc=(1, 1, .55))]
    return p
piece('obstacle_stump', obstacle_stump(), decor)
def obstacle_log():
    p = [cl('log', .3, 1.7, 0, 0, .3 - .85, 'woodd', verts=10, rot=(0, math.pi / 2, 0), bev=.03)]
    p[0].location = (0, 0, .3)
    for s in (-1, 1):
        e1 = cl('end', .27, .04, 0, 0, 0, 'woodl', verts=10, rot=(0, math.pi / 2, 0)); e1.location = (s * .86, 0, .3)
        e2 = cl('endc', .14, .045, 0, 0, 0, 'wood', verts=8, rot=(0, math.pi / 2, 0)); e2.location = (s * .87, 0, .3)
        p += [e1, e2]
    p += [ball('moss', .2, -.3, 0, .55, 'leaf', sub=1, sc=(1.8, 1, .4)), ball('moss', .15, .4, .05, .55, 'leafl', sub=1, sc=(1.4, 1, .4))]
    for x in (-.5, .55):
        p.append(ball('fern', .22, x, .4, .1, 'leaf', sub=0, sc=(1.2, 1, .7)))
    return p
piece('obstacle_log', obstacle_log(), decor)



# small lakeside shops (user idea): a kiosk with a striped awning, a counter of goods and a little plank deck in front
# where people stand to buy; front +z (the deck side faces the water)
def kiosk(awn, goods):
    p = [bx('deck', 2.4, 1.2, .12, 0, .9, 0, 'woodl', bev=.02), bx('base', 2.0, 1.4, .2, 0, -.2, 0, 'stone', bev=.03),
         bx('body', 1.8, 1.2, 1.1, 0, -.25, .2, 'cream', bev=.04), bx('counter', 2.0, .4, .12, 0, .38, 1.0, 'wood', bev=.02),
         bx('back', 1.8, .12, 1.2, 0, -.85, 1.3, 'wood', bev=.02)]
    for x in (-.88, .88):
        p.append(bx('post', .1, .1, 1.5, x, .5, .2, 'woodd'))
    for i in range(6):
        p.append(bx('awning', .36, 1.5, .1, -.9 + .36 * i + .18, -.05, 2.05, awn if i % 2 == 0 else 'white', rot=0))
    for i in range(5):
        p.append(ball('good', .11, -.6 + i * .3, .38, 1.18, goods[i % len(goods)], sub=1))
    p.append(bx('sign', 1.0, .06, .32, 0, .62, 1.7, awn, bev=.02))
    return p
piece('lake_kiosk_fish', kiosk('teal', ['water', 'sky', 'waterl']), decor)
piece('lake_kiosk_flowers', kiosk('pink', ['pink', 'sun', 'violet', 'red']), decor)
piece('lake_kiosk_snacks', kiosk('sun', ['bread', 'breadl', 'pumpkin', 'fruitred']), decor)


# =================================================================== rental cottages: three shapes, one per furnish level
# A cottage you let: every level is a different, better building, and each has the hanging ROOMS sign (a board with a
# golden key) by its door, so it reads as a place to stay. 3 x 3 cells (6 x 6 m); everything stays inside +-2.8 m; the
# door faces the front (+y on the plan). Cottages face the lane, so the default camera looks at the BACK: it gets
# windows, a garden bench and (on the best one) a balcony. Origin at the footprint centre, on the ground.
def back_window(x, y, z, w, h, shutters='teal'):
    """A window on the back wall (the wall at plan y, facing -y)."""
    p = [bx('wframe', w + .14, .08, h + .14, x, y - .02, z - .07, 'white', bev=.02), bx('glass', w, .06, h, x, y - .05, z, 'glass', bev=.01),
         bx('mull', .05, .05, h, x, y - .08, z, 'white', bev=0), bx('mull', w, .05, .05, x, y - .08, z + h / 2 - .025, 'white', bev=0)]
    if shutters:
        for sd in (-1, 1):
            p.append(bx('shutter', w * .48, .05, h + .04, x + sd * (w / 2 + w * .26 + .05), y - .04, z - .02, shutters, bev=.015))
    return p, (x, y - .09, z + h / 2, 0, -1)

def rooms_sign(x, y):
    """The sign of a house that lets rooms: a post, an iron arm and a hanging board with a golden key."""
    p = [bx('signpost', .1, .1, 2.0, x, y, 0, 'woodd', bev=.02), bx('signarm', .62, .06, .06, x + .3, y, 1.86, 'iron', bev=0),
         bx('signboard', .54, .07, .44, x + .34, y, 1.34, 'woodl', bev=.03), bx('signface', .44, .09, .34, x + .34, y, 1.39, 'paper', bev=.02)]
    for sx in (.14, .54):
        p.append(bx('chain', .03, .03, .1, x + sx, y, 1.78, 'iron', bev=0))
    for side in (-1, 1):   # the key shows on both faces of the board
        p += [cl('keyring', .075, .03, x + .22, y + side * .05, 1.56, 'gold', verts=10, rot=(math.pi / 2, 0, 0)),
              bx('keyshaft', .22, .03, .04, x + .38, y + side * .05, 1.54, 'gold', bev=0), bx('keybit', .04, .03, .09, x + .46, y + side * .05, 1.46, 'gold', bev=0)]
    p.append(ball('signtuft', .16, x, y, .05, 'leaf', sub=1, sc=(1.4, 1.4, .6)))
    return p

def rental(tier):
    p, A = [], {'window': []}
    W, D, H = ((3.7, 3.1, 2.0), (4.0, 3.3, 2.2), (4.0, 3.4, 2.2))[tier]
    roof, roof2 = (('hay', 'hayd'), ('roof', 'roofd'), ('teal', 'teald'))[tier]
    shut = ('teal', 'sky', 'red')[tier]
    cx = -.75 if tier else 0          # the main block sits a little left once there is a wing on the right
    p.append(bx('plinth', W + .3, D + .3, .25, cx, 0, 0, 'stone', bev=.06, seg=2))
    p.append(bx('walls', W, D, H, cx, 0, .25, 'plaster', bev=.05, seg=2))
    p.append(bx('skirt', W + .06, D + .06, .45, cx, 0, .25, 'stonel' if tier else 'cream', bev=.03))
    p += timber_wall(W, H - .5, cx, D / 2, .7, 'front', 'woodd', posts=4)
    for sd, face in ((-1, 'left'), (1, 'right')):
        p += timber_wall(D, H - .5, cx + sd * W / 2, 0, .7, face, 'woodd', posts=3)
    for i in range(5):   # the back wall's frame
        p.append(bx('bpost', .12, .06, H - .5, cx - W / 2 + W * i / 4, -D / 2 - .04, .7, 'woodd', bev=.015))
    top = .25 + H
    if tier == 2:   # an upper floor, jettied out a little, with its own frame
        U = 1.9
        p.append(bx('jetty', W + .3, D + .3, .16, cx, 0, top, 'woodd', bev=.03))
        p.append(bx('upper', W + .2, D + .2, U, cx, 0, top + .16, 'cream', bev=.05, seg=2))
        p += timber_wall(W + .2, U - .2, cx, D / 2 + .1, top + .2, 'front', 'woodd', posts=4)
        for i in range(5):
            p.append(bx('upost', .12, .06, U - .2, cx - (W + .2) / 2 + (W + .2) * i / 4, -D / 2 - .14, top + .2, 'woodd', bev=.015))
        for sd, face in ((-1, 'left'), (1, 'right')):
            p += timber_wall(D + .2, U - .2, cx + sd * (W + .2) / 2, 0, top + .2, face, 'woodd', posts=3)
        for x in (-1.0, 1.0):
            wp, c = window(cx + x, D / 2 + .12, top + .7, .6, .7, 'front', shutters=shut, box=['pink', 'sun', 'white']); p += wp; A['window'].append(c)
            wp, c = back_window(cx + x, -D / 2 - .12, top + .7, .6, .7, shutters=shut); p += wp; A['window'].append(c)
        # the balcony on the back, where the camera looks: a deck on brackets, a rail and a door
        p += [bx('deck', 1.9, .8, .1, cx, -D / 2 - .5, top + .1, 'wood', bev=.02), bx('bdoor', .7, .08, 1.5, cx, -D / 2 - .13, top + .2, shut, bev=.02),
              bx('bdoorwin', .4, .05, .5, cx, -D / 2 - .17, top + 1.0, 'glass', bev=.01), bx('rail', 1.9, .06, .07, cx, -D / 2 - .87, top + .85, 'woodd', bev=.01)]
        for i in range(6):
            p.append(bx('baluster', .06, .06, .7, cx - .9 + i * .36, -D / 2 - .87, top + .18, 'white', bev=0))
        for x in (-.9, .9):
            p += [bx('railside', .06, .75, .07, cx + x, -D / 2 - .5, top + .85, 'woodd', bev=.01), bx('bracket', .08, .6, .12, cx + x * .8, -D / 2 - .4, top - .06, 'woodd', bev=.01)]
        top += .16 + U; W += .2; D += .2
    rh = (1.55, 1.5, 1.55)[tier]
    p += roof_rows(W, D, rh, cx, 0, top, roof, roof2, rows=(4, 5, 5)[tier], over=.3 if tier == 0 else .26, thick=.16 if tier == 0 else .09)
    for sd in (-1, 1):
        p.append(extrude_outline('gend', [(-D / 2, 0), (D / 2, 0), (0, rh)], .1, (cx + sd * (W / 2 - .05), 0, top), C['plaster' if tier < 2 else 'cream'], rot=(0, 0, math.pi / 2), bev=.01))
        p.append(bx('gwin', .06, .4, .4, cx + sd * (W / 2 + .02), 0, top + .35, 'glassd', bev=.01))
    if tier == 2: W -= .2; D -= .2
    # door and front windows
    dx = cx + (-.9 if tier == 0 else -.6)
    p += [bx('doorframe', 1.0, .1, 1.65, dx, D / 2 + .02, .25, 'woodd', bev=.03), bx('door', .8, .1, 1.5, dx, D / 2 + .06, .25, shut, bev=.02),
          cl('knob', .04, .05, dx + .26, D / 2 + .13, .95, 'gold', verts=6, rot=(math.pi / 2, 0, 0)), bx('doorwin', .36, .05, .36, dx, D / 2 + .1, 1.25, 'glass', bev=.01),
          bx('step', 1.2, .5, .14, dx, D / 2 + .3, 0, 'stonel', bev=.03)]
    A['door'] = [(dx, D / 2 + .12, .25)]
    wp, c = window(cx + (.8 if tier == 0 else 1.0), D / 2 + .02, 1.0, .7, .7, 'front', shutters=shut, box=['pink', 'sun', 'violet']); p += wp; A['window'].append(c)
    for sd in (-1, 1):
        if tier and sd > 0: continue   # the wing covers the right wall
        wp, c = window(cx + sd * (W / 2 + .02), 0, 1.05, .6, .65, 'right' if sd > 0 else 'left'); p += wp; A['window'].append(c)
    for x in ((-.9, .9) if tier else (0,)):
        wp, c = back_window(cx + x, -D / 2 - .02, 1.0, .65, .7, shutters=shut); p += wp; A['window'].append(c)
    if tier:   # a lean-to wing on the right with its own window, and a porch over the door
        wx, ww, wd, wh = cx + W / 2 + .65, 1.3, D - .7, 1.75
        p += [bx('wingbase', ww + .2, wd + .2, .25, wx, -.1, 0, 'stone', bev=.05), bx('wing', ww, wd, wh, wx, -.1, .25, 'cream', bev=.05, seg=2),
              box('wingroof', (ww + .5, wd + .5, .12), (wx + .05, .1, .25 + wh + .32), C[roof], bev=.03, seg=1, rot=(0, .42, 0)),
              box('wingroof2', (ww + .56, .14, .14), (wx + .05, -(-.1 + wd / 2 + .25), .25 + wh + .32), C[roof2], bev=.02, seg=1, rot=(0, .42, 0))]
        wp, c = window(wx, -.1 + wd / 2 + .02, 1.0, .6, .6, 'front', shutters=shut, box=['red', 'white', 'sun']); p += wp; A['window'].append(c)
        wp, c = window(wx + ww / 2 + .02, -.1, 1.0, .55, .6, 'right'); p += wp; A['window'].append(c)
        wp, c = back_window(wx, -.1 - wd / 2 - .02, 1.0, .55, .6, shutters=shut); p += wp; A['window'].append(c)
        p += [box('porch', (1.5, .95, .1), (dx, -(D / 2 + .5), 2.12), C[roof], bev=.02, seg=1, rot=(-.3, 0, 0)), bx('porchtrim', 1.5, .06, .1, dx, D / 2 + .96, 1.93, roof2, bev=.01)]
        for x in (-.65, .65):
            p.append(bx('porchpost', .09, .09, 1.75, dx + x, D / 2 + .9, .14, 'white', bev=.01))
    # chimneys
    for i, (x, y) in enumerate(((cx + W / 2 - .7, -.5),) + (((cx - W / 2 + .7, .4),) if tier == 2 else ())):
        ch = top + rh * .55
        p += [bx('chimney', .5, .5, ch - top + .9, x, y, top - .1, 'brick', bev=.03), bx('chband', .6, .6, .1, x, y, ch + .7, 'brickd', bev=.02), bx('chtop', .4, .4, .14, x, y, ch + .8, 'charcoal', bev=.02)]
        if i == 0: A['chimney'] = [(x, y, ch + .95)]
    # what makes it a place to stay: the ROOMS sign by the door; a garden bench and flowers at the back
    p += rooms_sign(cx - W / 2 - .15 if tier == 0 else dx - 1.35, D / 2 + .75)
    bxx = cx - .2
    p += [bx('bench', 1.1, .32, .07, bxx, -D / 2 - .5, .4, 'wood', bev=.01), bx('benchback', 1.1, .06, .4, bxx, -D / 2 - .36, .5, 'wood', bev=.01)]
    for x in (-.48, .48):
        p.append(bx('benchleg', .07, .3, .4, bxx + x, -D / 2 - .5, 0, 'woodd', bev=0))
    for k in range(3 + tier * 2):
        fx = cx - W / 2 + .3 + k * .42
        p += [ball('bedleaf', .16, fx, -D / 2 - .28, .12, 'leaf', sub=1, sc=(1.2, 1, .7)), ball('bedflower', .09, fx, -D / 2 - .3, .3, ('pink', 'sun', 'white', 'red', 'violet')[k % 5], sub=0)]
    if tier == 0:   # a little woodpile and a barrel: a humble first let
        p += [cl('barrel', .26, .6, cx + W / 2 + .45, .9, 0, 'wood', verts=10, rt=.22), cl('hoop', .275, .06, cx + W / 2 + .45, .9, .28, 'iron', verts=10)]
        for k in range(3):
            p.append(cl('log', .11, .7, 0, 0, 0, 'woodl' if k % 2 else 'wood', verts=7, rot=(0, math.pi / 2, 0))); p[-1].location = (cx + W / 2 + .5, .2 - k * .0, .12 + k * .2)
    return p, A

for tier in range(3):
    parts, A = rental(tier)
    piece(f'cottage_t{tier}', parts, decor)
    anchors[f'cottage_t{tier}'] = A

# =================================================================== meadow and dairy (v0.5): goat barn and dairy
# Both are 3 x 2 cells (6 x 4 m): everything inside x +-2.9, y +-1.9; origin at the base centre; a clear doorway at the
# front centre (+y on the plan). See docs/MEADOW-DAIRY-SCOPE.md.
def goat_barn():
    """A low honey-coloured goat shelter with a mossy green roof, a wide open doorway, a hay rack, a climbing box and a trough."""
    p, A = [], {'window': []}
    W, D, H = 4.2, 2.6, 1.6
    p.append(bx('base', W + .24, D + .24, .2, 0, 0, 0, 'stone', bev=.05, seg=2))
    p.append(bx('walls', W, D, H, 0, 0, .2, 'woodl', bev=.05, seg=2))
    for i in range(12):
        p.append(bx('board', .05, .04, H - .1, -W / 2 + .18 + i * (W - .36) / 11, D / 2 + .02, .25, 'wood', bev=0))
        p.append(bx('boardb', .05, .04, H - .1, -W / 2 + .18 + i * (W - .36) / 11, -D / 2 - .02, .25, 'wood', bev=0))
    for x in (-W / 2, W / 2):
        p.append(bx('corner', .14, D + .08, H, x, 0, .2, 'woodd', bev=.03))
    p += roof_rows(W, D, 1.05, 0, 0, H + .2, 'leafw', 'leafwd', rows=4, over=.26, thick=.11)
    for sd in (-1, 1):
        p.append(extrude_outline('gend', [(-D / 2, 0), (D / 2, 0), (0, 1.05)], .1, (sd * (W / 2 - .05), 0, H + .2), C['woodl'], rot=(0, 0, math.pi / 2), bev=.01))
        p.append(bx('vent', .06, .36, .3, sd * (W / 2 + .02), 0, H + .45, 'woodd', bev=.01))
    # the wide doorway at the front centre, dark inside, with a half door standing open
    p += [bx('doorway', 1.3, .08, 1.25, 0, D / 2 + .01, .2, 'wooddd', bev=.02), bx('lintel', 1.5, .1, .12, 0, D / 2 + .03, 1.45, 'woodd', bev=.02),
          bx('halfdoor', .62, .06, .7, -.98, D / 2 + .3, .2, 'leafwd', bev=.02, rot=.9), bx('ramp', 1.3, .5, .08, 0, D / 2 + .32, .12, 'wood', bev=.01)]
    A['door'] = [(0, D / 2 + .12, .2)]
    wp, c = window(1.45, D / 2 + .02, .95, .5, .45, 'front', shutters='leafwd'); p += wp; A['window'].append(c)
    wp, c = window(W / 2 + .02, 0, .95, .5, .45, 'right'); p += wp; A['window'].append(c)
    # hay rack on the left wall, a climbing box and a trough in front, a salt lick, hay on the roof edge
    p += [bx('rack', .9, .26, .5, -1.45, D / 2 + .16, .75, 'woodd', bev=.02), ball('hay', .3, -1.45, D / 2 + .2, 1.2, 'hay', sub=1, sc=(1.5, .7, .7)),
          bx('trough', .9, .32, .22, 1.5, D / 2 + .42, .02, 'woodd', bev=.03), bx('troughin', .78, .22, .08, 1.5, D / 2 + .42, .2, 'water', bev=.01),
          bx('climb', .6, .5, .42, -1.5, D / 2 + .5, 0, 'wood', bev=.03), bx('climb2', .4, .34, .3, -1.5, D / 2 + .5, .42, 'woodl', bev=.03)]
    for k in range(4):
        p.append(ball('moss', .16, -1.5 + k * 1.0, -.2 + (k % 2) * .5, H + .9 - abs(-.2 + (k % 2) * .5) * .7, 'leafwl', sub=1, sc=(1.6, 1, .5)))
    return p, A

def dairy():
    """The dairy: a whitewashed creamery with a blue roof, a cheese-wheel sign over the door, milk churns, a cooling
    shelf with cheeses in the window and a small chimney."""
    p, A = [], {'window': []}
    W, D, H = 4.3, 2.7, 2.1
    p.append(bx('base', W + .3, D + .3, .28, 0, 0, 0, 'stonel', bev=.06, seg=2))
    p.append(bx('walls', W, D, H, 0, 0, .28, 'white', bev=.05, seg=2))
    p.append(bx('band', W + .06, D + .06, .55, 0, 0, .28, 'sky', bev=.03))
    p += roof_rows(W, D, 1.25, 0, 0, H + .28, 'sky', 'glassd', rows=5, over=.24)
    for sd in (-1, 1):
        p.append(extrude_outline('gend', [(-D / 2, 0), (D / 2, 0), (0, 1.25)], .1, (sd * (W / 2 - .05), 0, H + .28), C['white'], rot=(0, 0, math.pi / 2), bev=.01))
    # door at the front centre under a round cheese sign
    p += [bx('doorframe', 1.0, .1, 1.62, 0, D / 2 + .02, .28, 'woodd', bev=.03), bx('door', .8, .1, 1.48, 0, D / 2 + .06, .28, 'sky', bev=.02),
          bx('doorwin', .4, .05, .4, 0, D / 2 + .1, 1.22, 'glass', bev=.01), cl('knob', .04, .05, .26, D / 2 + .13, .98, 'gold', verts=6, rot=(math.pi / 2, 0, 0)),
          bx('step', 1.2, .45, .14, 0, D / 2 + .28, .1, 'stone', bev=.03),
          cl('sign', .34, .1, 0, D / 2 + .08, 2.06, 'sun', verts=14, rot=(math.pi / 2, 0, 0)), cl('signrim', .37, .06, 0, D / 2 + .06, 2.06, 'orange', verts=14, rot=(math.pi / 2, 0, 0))]
    for (x, z, r) in ((-.12, 2.14, .06), (.1, 2.0, .08), (.14, 2.2, .045)):
        p.append(ball('signhole', r, x, D / 2 + .15, z, 'hayd', sub=0, sc=(1, .4, 1)))
    A['door'] = [(0, D / 2 + .12, .28)]
    # a shop window with cheeses on a shelf (left), a shuttered window (right), side windows
    p += [bx('dframe', 1.2, .1, .95, -1.4, D / 2 + .02, .8, 'woodd', bev=.03), bx('dglass', 1.04, .07, .8, -1.4, D / 2 + .05, .87, 'glass', bev=.01),
          bx('dshelf', 1.1, .3, .06, -1.4, D / 2 + .15, .86, 'woodl', bev=.01)]
    for i in range(3):
        p.append(cl('wheel', .15, .12, -1.75 + i * .35, D / 2 + .16, .92, 'sun' if i % 2 else 'hay', verts=10))
    A['window'].append((-1.4, D / 2 + .1, 1.27, 0, 1))
    wp, c = window(1.4, D / 2 + .02, 1.0, .6, .65, 'front', shutters='sky', box=['white', 'sun', 'pink']); p += wp; A['window'].append(c)
    for sd in (-1, 1):
        wp, c = window(sd * (W / 2 + .02), 0, 1.15, .5, .5, 'right' if sd > 0 else 'left'); p += wp; A['window'].append(c)
    # milk churns by the door, a crate, the chimney
    for (x, y, h) in ((.95, D / 2 + .3, .62), (1.3, D / 2 + .36, .5)):
        p += [cl('churn', .17, h, x, y, .02, 'stonel', verts=10, rt=.15), cl('churnneck', .1, .14, x, y, h + .02, 'stonel', verts=8), cl('churnlid', .13, .05, x, y, h + .16, 'stoned', verts=8)]
    p += [bx('crate', .5, .36, .32, -.95, D / 2 + .32, .02, 'wood', bev=.02), bx('crateslat', .52, .38, .05, -.95, D / 2 + .32, .16, 'woodd', bev=0),
          bx('chimney', .5, .5, 1.5, -1.4, -.5, H + .4, 'brick', bev=.03), bx('chband', .6, .6, .1, -1.4, -.5, H + 1.55, 'brickd', bev=.02), bx('chtop', .4, .4, .12, -1.4, -.5, H + 1.65, 'charcoal', bev=.02)]
    A['chimney'] = [(-1.4, -.5, H + 1.8)]
    return p, A

for name, gen in (('goat_barn', goat_barn), ('dairy', dairy)):
    parts, A = gen()
    piece(name, parts, decor)
    anchors[name] = A

# =================================================================== the hospital (AR-011): the clinic's upgrade, 4 x 3 cells
def hospital():
    """The village hospital (the clinic's upgrade): a two-storey cream building with a teal roof and a big red-cross sign,
    a covered entrance at the front centre (the clinic's doorway), an ambulance bay on the right and flower beds along
    the front. Everything stays inside the 8 x 6 m (4 x 3 cell) footprint; the base fills it, so the origin is its centre."""
    p = [bx('plinth', 7.8, 5.8, .2, 0, 0, 0, 'stonel', bev=.04),
         bx('ground', 5.6, 3.8, 2.6, -.9, -.8, .2, 'plaster', bev=.06), bx('band', 5.7, 3.9, .2, -.9, -.8, 2.8, 'teal', bev=.03),
         bx('upper', 5.0, 3.2, 2.1, -.9, -.95, 3.0, 'cream', bev=.06), bx('roofslab', 5.3, 3.5, .25, -.9, -.95, 5.1, 'teald', bev=.06),
         bx('roofcap', 4.0, 2.2, .45, -.9, -.95, 5.35, 'teal', bev=.12)]
    # the red cross sign on the upper front, over the entrance
    p += [bx('signbg', 1.3, .12, 1.3, 0, .68, 3.4, 'white', bev=.06), bx('crossv', .28, .16, .95, 0, .72, 3.57, 'red', bev=.03),
          bx('crossh', .95, .16, .28, 0, .72, 3.9, 'red', bev=.03)]
    # entrance at the front centre: glass doors, a teal canopy on two white pillars
    p += [bx('door', 1.4, .1, 2.0, 0, 1.12, .2, 'glass', bev=.03), bx('doorframe', 1.6, .12, .15, 0, 1.13, 2.2, 'white', bev=.02),
          bx('canopy', 2.6, 1.3, .16, 0, 1.75, 2.45, 'teal', bev=.04), bx('step', 2.0, .6, .08, 0, 1.5, .2, 'stone', bev=.02)]
    for x in (-1.1, 1.1):
        p.append(cl('pillar', .09, 2.25, x, 2.25, .2, 'white', verts=8))
    for x in (-3.0, -2.1, -1.2):
        p.append(bx('win', .55, .1, .85, x, 1.12, 1.1, 'glass', bev=.03))
    for x in (-3.0, -2.1, 1.1):
        p.append(bx('win2', .55, .1, .75, x, .67, 3.6, 'glassd', bev=.03))
    # ambulance bay on the right: painted bay lines and a small white van with a red stripe
    p += [bx('bayl', .08, 2.6, .02, 2.25, -.5, .2, 'white', bev=0), bx('bayr', .08, 2.6, .02, 3.65, -.5, .2, 'white', bev=0),
          bx('van', 1.05, 1.9, .85, 2.95, -.7, .22, 'white', bev=.12), bx('vancab', .98, .65, .55, 2.95, -.05, 1.0, 'white', bev=.1),
          bx('vanstripe', 1.07, 1.92, .13, 2.95, -.7, .62, 'red', bev=.02), bx('vanwin', .9, .05, .32, 2.95, .3, 1.1, 'glass', bev=.02)]
    for x in (-2.9, 2.9):
        p.append(bx('bed', 1.4, .5, .22, x, 2.5, .2, 'soil', bev=.04))
        for k in range(4):
            p.append(ball('fl', .11, x - .5 + k * .33, 2.5, .5, ('pink', 'sun', 'red', 'white')[k], sub=1))
    return p
piece('hospital', hospital(), decor)


# =================================================================== the old potting bench (AR-013): three stages
# Fixed optional project by the farmhouse (src/content/learning-site.mjs). About 2.4 x 1.4 m, origin at the base centre,
# front +z. Stage 0 overgrown, stage 1 uncovered and mended (the faded strawberry label lies on it), stage 2 finished.
def potting_bench(stage):
    W, D = 2.2, 1.0
    old = stage == 0
    wood, dark = ('woodd', 'wooddd') if old else ('wood', 'woodd')
    p = []
    for x in (-W / 2 + .08, W / 2 - .08):
        for y in (-D / 2 + .08, D / 2 - .08):
            tilt = .12 if old and x > 0 and y > 0 else 0
            p.append(bx('leg', .1, .1, .9 - tilt, x, y, 0, dark, bev=.01))
    p.append(bx('top', W, D, .08, 0, 0, .9 if not old else .86, wood, bev=.02, rot=.04 if old else 0))
    p.append(bx('shelf', W - .2, D - .2, .05, 0, 0, .3, dark, bev=.01))
    p.append(bx('backboard', W, .08, .55, 0, -D / 2 + .04, .98, wood, bev=.02))
    if not old:
        p.append(bx('rail', W - .3, .05, .05, 0, -D / 2 + .1, 1.35, 'iron', bev=0))
        for x in (-.6, -.2, .3):
            p.append(cl('hook', .02, .08, x, -D / 2 + .1, 1.25, 'iron', verts=4))
        p.append(bx('trowel', .05, .25, .04, -.6, -D / 2 + .13, 1.05, 'iron', bev=.01))
    if stage == 0:   # weeds and long grass over the frame, a broken plank on the ground
        for k in range(14):
            a = k * 2.4; r = .2 + (k % 4) * .22
            x, y = math.cos(a) * r, math.sin(a) * r * .3
            up = math.pi / 2 if k % 2 else -math.pi / 2   # blades lean along the bench, not out of its envelope
            p.append(lf((x, y, 0), (0 if x < 0 else math.pi) + (k % 3 - 1) * .3, .32 + (k % 3) * .08, .13, 'leaf' if k % 2 else 'leafwd', lift=.55, droop=.05))
        for x in (-.7, .5):
            p.append(ball('clump', .26, x, .3, .1, 'leafwd', sub=1, sc=(1.2, .9, .7)))
        p.append(bx('plank', .8, .16, .05, .5, .5, 0, 'woodd', bev=.01, rot=.25))
        p.append(cl('oldpot', .14, .2, -.6, 0, .34, 'brickd', verts=8, rt=.17))
    if stage >= 1:   # mended: clean pots on the shelf
        for i, x in enumerate((-.7, -.35, 0, .35)):
            p.append(cl('pot', .11, .16, x, .05, .35, 'brick', verts=8, rt=.14))
    if stage == 1:   # the saved old strawberry label lies on the top
        p += [bx('label', .2, .06, .02, .3, .2, .94, 'paper', bev=.005, rot=.4), bx('labelberry', .06, .03, .022, .26, .21, .945, 'berry', bev=0, rot=.4),
              bx('stake', .03, .22, .02, .38, .2, .94, 'woodl', bev=0, rot=.4)]
        p.append(ball('leafbits', .1, -.8, .5, .02, 'leafwd', sub=1, sc=(1.5, 1, .3)))
    if stage == 2:   # finished: seed trays of seedlings, a strawberry plant in a pot, a watering can
        for i, x in enumerate((-.55, .15)):
            p.append(bx('tray', .6, .4, .08, x, .1, .98, 'charcoal', bev=.01))
            for k in range(6):
                p.append(lf((x - .2 + (k % 3) * .2, .02 + (k // 3) * .18, 1.06), k * 1.3, .1, .06, 'leafl', lift=.08, droop=.0))
        p += [cl('bigpot', .16, .22, .7, .1, .98, 'brick', verts=10, rt=.2), ball('plant', .18, .7, .1, 1.3, 'leaf', sub=1, sc=(1, 1, .7)),
              ball('berry1', .05, .78, .22, 1.24, 'berry', sub=1), ball('berry2', .045, .62, .2, 1.22, 'berryl', sub=1)]
        p += [cl('can', .13, .22, -.75, .35, 0, 'teal', verts=10), st((-.62, .35, .16), (-.45, .35, .26), .02, 'teal', sides=4)]
    return p
piece('potting_bench_overgrown', potting_bench(0), decor)
piece('potting_bench_repaired', potting_bench(1), decor)
piece('potting_bench_done', potting_bench(2), decor)

# =================================================================== tree pack 2: the later trees (one or two per chapter)
# Charm: maple (meadow), birch (river), cypress (village), fir (hills), great oak (valley landmark, 2 x 2 cells).
# Fruit (each with a _bare twin after picking): lemon, plum, mango, grape arbour, longan, lychee.
# Origin at the trunk base, front +z. Late decor.glb, so nothing here adds to the first load.
def hang(x, y, z, mt, n=5, r=.09, mt2=None):
    """A hanging bunch of small round fruit (longan, lychee, grapes): rows that narrow toward the bottom."""
    p, k = [], 0
    for row, m in enumerate((3, 2, 1) if n <= 6 else (4, 3, 2, 1)):
        for j in range(m):
            a = j / m * math.tau + row * .7; rr = r * .9 * (m > 1)
            p.append(ball('fr', r, x + math.cos(a) * rr, y + math.sin(a) * rr, z - row * r * 1.5, mt if (k % 3 or not mt2) else mt2, sub=0)); k += 1
    return p
def fruit_on(n, mt, r, out, z0=2.4, dz=.8, mt2=None, sc=None, start=.4):
    """Fruit dotted round the outside of a cute canopy (on it, never inside it)."""
    p = []
    for i in range(n):
        a = i / n * math.tau + start; rr = (1.55 + .25 * (i % 2)) * out; z = z0 + dz * ((i * 3) % 4) / 3
        p.append(ball('fruit', r, math.cos(a) * rr * .8, math.sin(a) * rr * .8, z, mt2 if mt2 and i % 3 == 0 else mt, sub=1, sc=sc))
    return p

def maple():
    """Maple (charm, the meadow chapter): a cute round tree in fiery red, orange and gold, a few leaves on the grass."""
    p = cute('m', 'maple', 'maplel', 'mapled')
    for i in range(5):
        a = i * 1.3; r = 1.0 + .3 * (i % 3)
        p.append(lf((math.cos(a) * r, math.sin(a) * r, .02), a * 2, .22, .16, 'maplel' if i % 2 else 'maple', lift=0, droop=0))
    return p
piece('tree2_maple', maple(), decor)

def birch():
    """Birch (charm, by the river): a slim white trunk with dark marks, a tall light lime-gold canopy."""
    p = [cl('trunk', .24, 3.4, 0, 0, 0, 'birch', verts=8, rt=.17)]
    for i, z in enumerate((.6, 1.1, 1.7, 2.3, 2.9)):
        p.append(bx('mark', .2, .05, .06, .02 * (i % 2), .2 - .02 * i, z, 'birchm', bev=0, rot=i * 1.7))
    p.append(st((0, 0, 2.6), (.6, .1, 3.2), .07, 'birch', sides=5))
    for x, y, z, r, mt in ((0, 0, 4.0, 1.1, 'birchleaf'), (.4, .2, 3.3, .85, 'birchleafl'), (-.35, -.15, 3.4, .85, 'birchleaf'),
                           (.05, .05, 4.8, .75, 'birchleafl')):
        p.append(ball('puff', r, x, y, z, mt, sub=2, sc=(1, 1, 1.15)))
    return p
piece('tree2_birch', birch(), decor)

def cypress():
    """Cypress (charm, the village chapter): a tall narrow column of deep green, for lining lanes and the square."""
    p = [cl('trunk', .18, .6, 0, 0, 0, 'woodd', verts=6, rt=.14)]
    for i, (r, z) in enumerate(((.62, 1.2), (.7, 2.0), (.62, 2.9), (.48, 3.7), (.3, 4.4))):
        p.append(ball('col', r, 0, 0, z, 'cypress' if i % 2 == 0 else 'cypressl', sub=2, sc=(1, 1, 1.5)))
    return p
piece('tree2_cypress', cypress(), decor)

def fir():
    """Fir (charm, over the hills to Pine Ridge): taller and bluer than the round pine, six drooping tiers."""
    p = [cl('trunk', .32, 1.0, 0, 0, 0, 'woodd', verts=8, rt=.26)]
    for i in range(6):
        r = 1.75 - i * .26; z = .8 + i * .95
        p.append(cl('tier', r, 1.25, 0, 0, z, 'fir' if i % 2 == 0 else 'firl', verts=12, rt=r * .22, bev=.25))
    p.append(cone_tip())
    return p
def cone_tip():
    return ball('tip', .28, 0, 0, 7.1, 'firl', sub=1, sc=(1, 1, 1.6))
piece('tree2_fir', fir(), decor)

def great_oak():
    """The great oak (the valley landmark, 2 x 2 cells, one per farm): a thick flared trunk, a wide layered canopy and
    a rope swing on the front branch."""
    p = [cl('trunk', .75, 3.0, 0, 0, 0, 'woodd', verts=10, rt=.55), cl('flare', 1.05, .4, 0, 0, 0, 'wooddd', verts=10, rt=.75)]
    for a in (0, 2.1, 4.2):
        p.append(st((math.cos(a) * .7, math.sin(a) * .7, .15), (math.cos(a) * 1.3, math.sin(a) * 1.3, 0), .2, 'woodd', sides=5, rt=.08))
    p += [st((0, 0, 2.6), (1.6, .4, 3.6), .22, 'woodd', sides=6, rt=.14), st((0, 0, 2.6), (-1.5, -.3, 3.7), .22, 'woodd', sides=6, rt=.14),
          st((.1, .1, 2.6), (.2, 1.6, 3.2), .2, 'woodd', sides=6, rt=.13)]
    for x, y, z, r, mt in ((0, 0, 4.6, 2.0, 'oak'), (1.8, .4, 4.0, 1.5, 'oakl'), (-1.8, -.3, 4.1, 1.5, 'oak'), (.2, -1.6, 4.2, 1.4, 'oakd'),
                           (.1, 1.5, 4.0, 1.3, 'oakl'), (.3, .2, 5.7, 1.4, 'oakl')):
        p.append(ball('puff', r, x, y, z, mt, sub=2, sc=(1, 1, .85)))
    for x in (-.35, .35):   # the swing hangs from the front branch
        p.append(st((x, 1.45, 3.1), (x, 1.45, .55), .025, 'rope', sides=3))
    p.append(bx('seat', .9, .3, .07, 0, 1.45, .5, 'wood', bev=.02))
    return p
piece('tree2_oak', great_oak(), decor)

def lemon(ripe=True):
    """Lemon tree (fruit): a compact glossy dark tree with bright oval lemons, a little smaller than the orange."""
    p = cute('l', 'leafwd', 'leafw', 'leafdd')
    if ripe: p += fruit_on(10, 'lemon', .22, 1.3, sc=(1, 1, 1.35))
    return p
piece('tree2_lemon', lemon(), decor)
piece('tree2_lemon_bare', lemon(False), decor)

def plum(ripe=True):
    """Plum tree (fruit; Granny Ada's terrible jam): a fresh green canopy hung with deep purple plums."""
    p = cute('pl', 'leafwl', 'leafw', 'leafwd')
    if ripe: p += fruit_on(11, 'plum', .23, 1.3, mt2='pluml')
    return p
piece('tree2_plum', plum(), decor)
piece('tree2_plum_bare', plum(False), decor)

def mango(ripe=True):
    """Mango tree (fruit): a big dense dark dome, long mangoes blushing orange-red hanging on short stalks."""
    p = [cl('trunk', .45, 2.2, 0, 0, 0, 'wood', verts=8, rt=.32), cl('root', .65, .25, 0, 0, 0, 'woodd', verts=8, rt=.45)]
    for x, y, z, r, mt in ((0, 0, 3.4, 1.9, 'leafwd'), (1.1, .3, 2.9, 1.2, 'leafw'), (-1.1, .2, 2.9, 1.2, 'leafwd'), (.1, 1.0, 2.8, 1.1, 'leafw'),
                           (0, -.1, 4.4, 1.1, 'leafw')):
        p.append(ball('puff', r, x, y, z, mt, sub=2, sc=(1.1, 1.1, .8)))
    if ripe:
        for i in range(8):
            a = i / 8 * math.tau + .2; rr = 2.25 + .15 * (i % 2); z = 1.95 + .3 * (i % 3)
            x, y = math.cos(a) * rr, math.sin(a) * rr
            p.append(st((x * .95, y * .95, z + .35), (x, y, z + .12), .02, 'stem', sides=3))
            p.append(ball('mango', .2, x, y, z, 'mango' if i % 2 else 'mangor', sub=1, sc=(.85, .85, 1.4)))
    return p
piece('tree2_mango', mango(), decor)
piece('tree2_mango_bare', mango(False), decor)

def grape_arbor(ripe=True):
    """Grape arbour (fruit vine, 1 cell): a little wooden pergola roofed with vine leaves, purple bunches hanging inside."""
    p = []
    for x in (-.8, .8):
        for y in (-.8, .8):
            p.append(bx('post', .18, .18, 2.3, x, y, 0, 'wood', bev=.02))
    for y in (-.8, .8):
        p.append(bx('beam', 2.0, .12, .14, 0, y, 2.3, 'woodd', bev=.02))
    for i in range(5):
        p.append(bx('slat', .1, 2.0, .08, -.8 + i * .4, 0, 2.44, 'wood', bev=.01))
    for i, (x, y) in enumerate(((-.5, -.5), (.4, -.6), (-.6, .4), (.5, .5), (0, 0), (0, -.8), (0, .8), (-.85, 0), (.85, 0))):
        p.append(ball('vine', .55, x, y, 2.6, 'leafw' if i % 2 else 'leafwl', sub=1, sc=(1, 1, .45)))
    for x in (-.8, .8):   # the vine climbs the front posts
        for k, z in enumerate((.7, 1.3, 1.9)):
            p.append(ball('climb', .2, x + (.06 if k % 2 else -.06), .85, z, 'leafw' if k % 2 else 'leafwl', sub=1))
    if ripe:
        for x, y in ((-.45, 1.0), (.4, 1.0), (-1.0, .2), (1.0, -.1)):   # on the outer edges, where the camera sees them
            p += hang(x, y, 2.3, 'grape', n=6, r=.11, mt2='grapel')
    return p
piece('tree2_grape', grape_arbor(), decor)
piece('tree2_grape_bare', grape_arbor(False), decor)

def longan(ripe=True):
    """Longan tree (fruit, the hills chapter): a wide dark canopy with tan bunches of small round longans."""
    p = cute('lg', 'leafdd', 'leafwd', 'pinew')
    if ripe:
        for i in range(4):
            a = i / 4 * math.tau + .3; rr = 2.05
            p += [st((math.cos(a) * 1.8, math.sin(a) * 1.8, 2.5), (math.cos(a) * rr, math.sin(a) * rr, 2.25), .025, 'woodd', sides=3)]
            p += hang(math.cos(a) * rr, math.sin(a) * rr, 2.2, 'longan', n=6, r=.13)
    return p
piece('tree2_longan', longan(), decor)
piece('tree2_longan_bare', longan(False), decor)

def lychee(ripe=True):
    """Lychee tree (fruit, the hills chapter): a bright green canopy with clusters of rosy-red lychees."""
    p = cute('ly', 'leafw', 'leafwl', 'leafdd')
    if ripe:
        for i in range(4):
            a = i / 4 * math.tau + .8; rr = 2.05
            p += [st((math.cos(a) * 1.8, math.sin(a) * 1.8, 2.5), (math.cos(a) * rr, math.sin(a) * rr, 2.25), .025, 'woodd', sides=3)]
            p += hang(math.cos(a) * rr, math.sin(a) * rr, 2.2, 'lychee', n=6, r=.13, mt2='berry')
    return p
piece('tree2_lychee', lychee(), decor)
piece('tree2_lychee_bare', lychee(False), decor)

# =================================================================== food factories (village growth plan, stage 3b)
def juice_press():
    """Juice press (2 x 2 cells): an open timber shed with an orange awning, a big wooden screw press, barrels and fruit
    crates, a row of filled bottles on a shelf."""
    p = [bx('floor', 3.8, 3.6, .15, 0, 0, 0, 'stonel', bev=.04)]
    for x in (-1.7, 1.7):
        for y in (-1.5, 1.5):
            p.append(bx('post', .2, .2, 2.6, x, y, .15, 'woodd', bev=.03))
    p.append(bx('back', 3.6, .15, 2.2, 0, -1.6, .15, 'wood', bev=.03))
    for i in range(8):
        p.append(bx('awning', .48, 3.8, .14, -1.68 + i * .48, 0, 2.75, 'cream' if i % 2 else 'pumpkin' if 'pumpkin' in C else 'red'))
    p.append(gable('roof', 3.8, 3.4, .7, 0, 0, 2.88, 'roof'))
    # the screw press
    p += [cl('vat', .55, .5, -.6, .3, .15, 'woodl', verts=12), cl('vatband', .57, .08, -.6, .3, .45, 'iron', verts=12),
          bx('frame', .12, .12, 1.5, -1.15, .3, .15, 'woodd'), bx('frame2', .12, .12, 1.5, -.05, .3, .15, 'woodd'),
          bx('beam', 1.25, .16, .16, -.6, .3, 1.6, 'woodd'), cl('screw', .07, .9, -.6, .3, .75, 'iron', verts=6),
          bx('bar', .9, .06, .06, -.6, .3, 1.5, 'wood')]
    for x, c in ((.7, 'fruitred'), (1.2, 'orange' if 'orange' in C else 'fruitpeach')):
        p.append(bx('crate', .45, .4, .3, x, .9, .15, 'wood', bev=.02))
        for k in range(4):
            p.append(ball('fruit', .1, x - .1 + (k % 2) * .2, .82 + (k // 2) * .16, .5, c, sub=0))
    p.append(cl('barrel', .32, .7, 1.1, -.6, .15, 'wood', verts=10, rt=.3))
    p.append(cl('hoop', .34, .06, 1.1, -.6, .45, 'iron', verts=10))
    p.append(bx('shelf', 1.6, .3, .06, .6, -1.35, 1.2, 'woodl'))
    for i, c in enumerate(('fruitred', 'orange' if 'orange' in C else 'sun', 'pumpkin' if 'pumpkin' in C else 'sun', 'fruitred')):
        p.append(cl('bottle', .09, .32, .05 + i * .38, -1.35, 1.26, 'glass', verts=6))
        p.append(cl('juice', .085, .2, .05 + i * .38, -1.35, 1.27, c, verts=6))
    return p
piece('juice_press', juice_press(), decor)

def noodle_factory():
    """Noodle factory (3 x 2 cells): a cheerful brick workshop with a teal roof and a chimney, a big round window, and
    racks of drying noodles outside."""
    p = [bx('floor', 5.8, 3.8, .15, 0, 0, 0, 'stoned', bev=.04), bx('walls', 4.0, 3.0, 2.4, -.7, -.2, .15, 'brick', bev=.05),
         bx('trim', 4.1, 3.1, .15, -.7, -.2, 2.5, 'cream', bev=.03), gable('roof', 4.2, 3.2, 1.1, -.7, -.2, 2.62, 'teal'),
         cl('chimney', .3, 1.3, -2.0, -.8, 3.0, 'brickd', verts=8), cl('chimtop', .36, .15, -2.0, -.8, 4.3, 'charcoal', verts=8),
         bx('door', .9, .1, 1.5, -.3, 1.32, .15, 'woodd', bev=.03), bx('sign', 1.6, .08, .5, -.7, 1.34, 1.9, 'sun', bev=.03),
         cl('window', .4, .08, -1.8, 1.31, 1.25, 'glass', verts=12, rot=(math.pi / 2, 0, 0)),
         cl('wframe', .46, .07, -1.8, 1.3, 1.25, 'cream', verts=12, rot=(math.pi / 2, 0, 0))]
    # the sign's little noodle bowl
    p += [cl('bowl', .14, .1, -.7, 1.4, 2.0, 'red', verts=8, rt=.18), ball('steam', .07, -.7, 1.42, 2.25, 'white', sub=0)]
    # drying racks with hanging noodles
    for rx in (1.8, 2.6):
        p += [bx('rackpost', .08, .08, 1.6, rx, -1.2, .15, 'woodd'), bx('rackpost', .08, .08, 1.6, rx, 1.2, .15, 'woodd'),
              bx('rackbar', .06, 2.5, .06, rx, 0, 1.7, 'wood')]
        for k in range(9):
            p.append(bx('noodle', .05, .05, 1.0, rx, -1.0 + k * .25, .7, 'wheatl' if k % 2 else 'cream', bev=0))
    p.append(bx('sacks', .6, .5, .5, 1.0, 1.2, .15, 'sack', bev=.12))
    return p
piece('noodle_factory', noodle_factory(), decor)

# =================================================================== lucky finds (AR-009)
# One-time keepsakes from the pond and a cleared rock, in their own kit, discovery-props.glb, which nothing loads
# until the logic lane shows one (no world placement, no footprint). Modelled at about 0.5 m for comfortable numbers,
# then scaled to a small handheld size (HANDHELD) when the kit is written; icons frame them either way. Warm painted
# colours; brass and gold only on rims, the button, one clasp and two coins in the tin (the story's coins are counted
# in the card, not piled on the props), plus one small four-point glint on each subject: keepsakes, not treasure.
def glint(x, y, z, r=.07, mt='lampglow'):
    """A small upright four-point sparkle facing the front."""
    pts = [(math.cos(k * math.pi / 4 + math.pi / 2) * (r if k % 2 == 0 else r * .28),
            math.sin(k * math.pi / 4 + math.pi / 2) * (r if k % 2 == 0 else r * .28)) for k in range(8)]
    return extrude_outline('glint', pts, .012, (x, -y, z), C[mt], bev=0)
def coin(x, y, z, tilt=0., r=.075):
    return [cl('coin', r, .024, x, y, z, 'gold', verts=12, rot=(tilt, 0, 0)), cl('coinface', r * .7, .028, x, y, z - .002, 'sun', verts=12, rot=(tilt, 0, 0))]
def tilted(tilt, y0, z0, dy, dz):
    """Plan (y, z) of a point on a face tilted back by `tilt` about x through (y0, z0): dy along the face's depth, dz up it."""
    return y0 + dy * math.cos(tilt) - dz * math.sin(tilt), z0 + dy * math.sin(tilt) + dz * math.cos(tilt)

def lucky_tin():
    """A little round tin the pond gave up: teal paint, a wide cream label with a red fish, brass rims, the lid leaning
    on its back, two of its coins showing, a puddle and a notched lily pad beside it and two drops of pond water on its rim."""
    p = [cl('tin', .22, .15, 0, 0, 0, 'teal', verts=18),
         cl('label', .224, .08, 0, 0, .035, 'cream', verts=18),
         cl('rim', .228, .022, 0, 0, .135, 'hayd', verts=18),
         cl('inside', .205, .012, 0, 0, .152, 'teald', verts=18),
         cl('foot', .215, .02, 0, 0, 0, 'teald', verts=18)]
    fish = [(.055, 0), (.02, .024), (-.025, .017), (-.055, .032), (-.044, 0), (-.055, -.032), (-.025, -.017), (.02, -.024)]
    p.append(extrude_outline('labelfish', fish, .01, (0, -.226, .075), C['red'], bev=0))   # on the front of the label
    p += coin(-.04, .01, .158, tilt=.12, r=.065) + coin(.05, -.03, .17, tilt=-.15, r=.065)
    # the lid, standing almost upright against the back of the tin; a little red fish painted on its cream boss
    t, ly, lz = 1.25, .3, .23   # Blender coords of the lid's centre; its face looks along (0, -sin t, cos t)
    ax = lambda d: (0, ly - math.sin(t) * d, lz + math.cos(t) * d)
    for name, r, h, mt, verts, out in (('lid', .235, .05, 'teal', 18, 0), ('lidrim', .242, .02, 'hayd', 18, 0), ('lidboss', .11, .016, 'cream', 14, .03)):
        p.append(cyl(name, r, h, ax(out), C[mt], verts=verts, bev=0, seg=1, rot=(t, 0, 0)))
    p.append(extrude_outline('lidfish', fish, .008, ax(.04), C['red'], rot=(t + math.pi / 2, 0, 0), bev=0))
    # pond water: a flat puddle and a lily pad at the front left, two smooth drops on the rim
    p.append(ball('puddle', .08, -.24, .16, .004, 'waterl', sub=2, sc=(1.7, 1.2, .08)))
    pad = [(0, 0)] + [(math.cos(a) * .085, math.sin(a) * .085) for a in (.45 + k * (math.tau - .9) / 11 for k in range(12))]
    p.append(extrude_outline('lilypad', pad, .014, (-.29, -.2, .015), C['leaf'], rot=(math.pi / 2, 0, 0), bev=0))   # notch cut in
    for x, y in ((-.15, .1), (.14, .12)):
        p.append(ball('drop', .016, x, y, .166, 'waterl', sub=2, sc=(1, 1, 1.25)))
    p.append(glint(-.17, .1, .36))
    return p
piece('lucky_tin', lucky_tin(), discovery)

def fish_outline(L=.17, H=.1, n=12):
    """A plump fish in profile, head toward +x: an elliptical body and a notched tail."""
    pts = [(math.cos(math.radians(-145 + 290 * k / n)) * L, math.sin(math.radians(-145 + 290 * k / n)) * H) for k in range(n + 1)]
    return pts + [(-L * 1.55, H * 1.05), (-L * 1.25, 0), (-L * 1.55, -H * 1.05)]

def lucky_button():
    """A brass button shaped like a fish, propped against the soft blue cloth pouch it came in, the pouch's red
    drawstring loose. The button has a bright rim, a darker brass face, an eye and a
    four-hole centre, so it reads as a button and not as a coin or a biscuit; a tiny pond is engraved on its back."""
    p = [ball('pouch', .2, 0, -.05, .17, 'cloth', sub=2, sc=(1.05, 1, .85)),
         cl('neck', .085, .08, 0, -.05, .29, 'clothd', verts=10, rt=.06),
         cl('ruffle', .1, .07, 0, -.05, .36, 'clothl', verts=10, rt=.13),
         cl('tie', .09, .03, 0, -.05, .31, 'red', verts=10),
         st((.07, .03, .32), (.21, .09, .25), .012, 'red', sides=4),
         st((.21, .09, .25), (.25, .13, .12), .012, 'red', sides=4),
         st((.25, .13, .12), (.31, .10, .01), .012, 'red', sides=4),
         st((.04, .03, .32), (-.08, .1, .23), .012, 'red', sides=4),
         ball('knot', .026, .06, .03, .32, 'redd', sub=1)]
    for k in range(5):   # cloth folds
        a = k * math.tau / 5 + .4
        p.append(ball('fold', .07, math.cos(a) * .17, -.05 + math.sin(a) * .17, .14, 'clothd', sub=1, sc=(.5, .5, 1.4)))
    p.append(cl('mouth', .09, .01, 0, -.05, .43, 'clothd', verts=10))   # the open neck of the pouch
    # The button leans against the front of the pouch, lying on its side (head toward +x), tilted back 0.35 rad.
    t, y0, z0 = .35, .2, .09
    body = fish_outline(L=.14, H=.085)
    p.append(extrude_outline('button', body, .035, (0, -y0, z0), C['gold'], rot=(-t, 0, 0), bev=.008))
    p.append(extrude_outline('buttonface', [(x * .84, z * .8) for x, z in body], .045, (0, -y0, z0), C['hayd'], rot=(-t, 0, 0), bev=0))
    def on(x, z, out=.025):   # plan point on the button's front face
        y, zz = tilted(t, y0, z0, out, z)
        return (x, y, zz)
    face = (math.pi / 2 - t, 0, 0)   # a cylinder lying on the button's face
    x, y, z = on(.09, .03); p.append(ball('eye', .016, x, y, z, 'wooddd', sub=1))
    # a classic four-hole button centre: a pale raised ring with four dark thread holes, so it reads as a button
    x, y, z = on(-.03, -.004, .024); p.append(cyl('holering', .046, .008, (x, -y, z), C['sun'], verts=12, bev=0, seg=1, rot=face))
    x, y, z = on(-.03, -.004, .027); p.append(cyl('holeface', .036, .006, (x, -y, z), C['hayd'], verts=12, bev=0, seg=1, rot=face))
    for hx, hz in ((-.016, .014), (.016, .014), (-.016, -.018), (.016, -.018)):
        x, y, z = on(-.03 + hx, -.004 + hz * .9, .03); p.append(cyl('hole', .009, .006, (x, -y, z), C['wooddd'], verts=6, bev=0, seg=1, rot=face))
    # the back: a tiny pond engraved in the brass (a dark ring, a brass pool and a two-stroke ripple)
    back = lambda x, z, out: on(x, z, -out)
    x, y, z = back(-.01, 0, .021); p.append(cyl('pondmarkring', .045, .006, (x, -y, z), C['woodd'], verts=12, bev=0, seg=1, rot=face))
    x, y, z = back(-.01, 0, .025); p.append(cyl('pondmark', .036, .006, (x, -y, z), C['hayd'], verts=12, bev=0, seg=1, rot=face))
    for dx, dz in ((-.022, .008), (.004, -.01)):
        x, y, z = back(-.01 + dx, dz, .029); p.append(box('ripple', (.026, .004, .006), (x, -y, z), C['woodd'], bev=0, seg=1, rot=(-t, 0, 0)))
    p.append(glint(.17, .28, .24))   # on the button, the subject
    return p
piece('lucky_button', lucky_button(), discovery)

def lucky_box():
    """A small trinket box from under a cleared rock: warm wood with darker wooden corners and one brass clasp, a teal
    lining, the lid open on its back hinge, a smooth slate pebble on a cream cloth tied with a red ribbon, and a crumb of
    earth beside it."""
    W, D, H = .38, .3, .17
    p = [bx('base', W, D, H, 0, 0, 0, 'wood', bev=.015),
         bx('lining', W - .05, D - .05, .012, 0, 0, H - .006, 'teal', bev=0),
         bx('trim', W + .012, D + .012, .025, 0, 0, H - .03, 'woodd', bev=.006),
         bx('skirt', W + .02, D + .02, .025, 0, 0, 0, 'woodd', bev=.006)]
    for sx in (-1, 1):
        for sy in (-1, 1):
            p.append(bx('corner', .045, .045, .05, sx * (W / 2 - .012), sy * (D / 2 - .012), .006, 'wooddd', bev=.008))
    p.append(bx('clasp', .06, .02, .06, 0, D / 2 + .005, H - .08, 'gold', bev=.006))
    p.append(ball('claspnub', .013, 0, D / 2 + .018, H - .05, 'hayd', sub=1))
    # The lid: hinged along the back top edge, swung open just past upright (leaning back by 0.2 rad).
    t, hy, hz = .2, -D / 2, H
    def lid(dy, dz):   # plan (y, z): dy from the hinge up the open lid, dz out of its inner face (toward the viewer)
        return tilted(t, hy, hz, dz, dy)
    y, z = lid(D / 2 + .01, -.025); p.append(box('lid', (W + .02, .05, D + .02), (0, -y, z), C['woodl'], bev=.012, seg=1, rot=(-t, 0, 0)))
    y, z = lid(D / 2, .002); p.append(box('lidlining', (W - .04, .006, D - .04), (0, -y, z), C['teald'], bev=0, seg=1, rot=(-t, 0, 0)))
    # the cloth, tied with a red ribbon, and the pebble resting on it
    p.append(ball('cloth', .12, -.03, .02, H, 'cream', sub=2, sc=(1.3, 1.05, .4)))
    for k in range(3):
        p.append(lf((-.03, .02, H + .02), .9 + k * 2.1, .15, .13, 'cream', lift=.03, droop=-.01))
    p.append(bx('ribbon', .03, .26, .05, -.03, .02, H - .01, 'red', bev=.005))
    p.append(ball('bow', .022, -.03, .15, H + .03, 'redd', sub=1, sc=(1.6, .8, 1)))
    p.append(ball('pebble', .085, -.03, .03, H + .065, 'pebble', sub=2, sc=(1.4, 1, .5)))
    p.append(ball('pebblesheen', .022, -.065, .055, H + .1, 'stonel', sub=1, sc=(1.6, 1, .4)))
    p.append(ball('soil', .05, -.36, .02, .004, 'soill', sub=2, sc=(1.8, 1.4, .3)))   # a crumb of earth from under the rock
    p.append(glint(-.12, .06, .34))   # on the pebble, the subject
    return p
piece('lucky_box', lucky_box(), discovery)


# =================================================================== discovery trail (AR-010)
# An optional old-object trail (docs/CLAUDE-DISCOVERY-TRAIL-HANDOFF.md): an old box by the forecourt bench, a little cache
# beside the pond dock, a faded picnic ribbon. World size (they stand on the ground by the bench and the dock), origin at
# the base centre, front +z; one state of each is shown at a time (closed / open). Kit: exploration-props.glb.
def porch_box(open_):
    """An old, friendly wooden box: weathered planks, rope handles, iron corners; open, a folded note inside."""
    W, D, H = .62, .42, .3
    p = [bx('body', W, D, H, 0, 0, 0, 'woodl', bev=.02), bx('band', W + .01, D + .01, .05, 0, 0, .06, 'woodd', bev=.01),
         bx('base', W + .03, D + .03, .03, 0, 0, 0, 'wooddd', bev=.01)]
    for sx in (-1, 1):
        for sy in (-1, 1):
            p.append(bx('corner', .05, .05, .06, sx * (W / 2 - .01), sy * (D / 2 - .01), H - .06, 'iron', bev=.008))
        p.append(st((sx * (W / 2 + .01), -.08, H * .6), (sx * (W / 2 + .05), 0, H * .45), .018, 'sack', sides=4))
        p.append(st((sx * (W / 2 + .05), 0, H * .45), (sx * (W / 2 + .01), .08, H * .6), .018, 'sack', sides=4))
    if open_:
        t, hy, hz = .25, -D / 2, H
        y, z = tilted(t, hy, hz, -.022, D / 2); p.append(box('lid', (W + .02, .045, D + .02), (0, -y, z), C['wood'], bev=.015, seg=1, rot=(-t, 0, 0)))
        p.append(bx('inside', W - .05, D - .05, .01, 0, 0, H - .02, 'wooddd', bev=0))
        p.append(bx('note', .16, .11, .015, .06, .04, H - .01, 'paper', bev=.004, rot=.3))
        p.append(bx('notefold', .16, .02, .016, .06, -.01, H - .006, 'cream', bev=0, rot=.3))
    else:
        p.append(bx('lid', W + .02, D + .02, .05, 0, 0, H, 'wood', bev=.015))
        p.append(bx('clasp', .07, .02, .07, 0, D / 2 + .01, H - .05, 'iron', bev=.006))
    return p
piece('trail_porch_box_closed', porch_box(False), exploration)
piece('trail_porch_box_open', porch_box(True), exploration)

def pond_cache(open_):
    """A little weathered tin on dry ground, a tuft of reeds and ivy at its side; open, the ribbon peeks out."""
    p = [cl('tin', .17, .16, 0, 0, 0, 'teald', verts=14), cl('band', .172, .04, 0, 0, .06, 'rim', verts=14),
         cl('rust', .175, .02, 0, 0, 0, 'woodd', verts=14), ball('earth', .3, 0, 0, 0, 'soill', sub=2, sc=(1.4, 1.2, .12))]
    for k, (x, y) in enumerate(((-.2, -.1), (-.24, .05), (-.17, .12))):
        p.append(st((x, y, 0), (x - .04, y + .02, .32 + k * .06), .014, 'leaf', sides=3))
    p.append(lf((.15, .1, .02), .4, .16, .1, 'leafwd', lift=.05, droop=.02))
    p.append(lf((.18, -.05, .02), -.5, .14, .09, 'leaf', lift=.04, droop=.02))
    if open_:
        p.append(cl('lid', .18, .03, .26, .02, .0, 'teal', verts=14, rot=(.2, -.3, 0)))
        p.append(bx('ribbon', .05, .26, .012, 0, -.02, .17, 'pink', bev=.004, rot=.4))
        p.append(st((.05, .1, .17), (.12, .2, .03), .012, 'pink', sides=3))
    else:
        p.append(cl('lid', .18, .04, 0, 0, .16, 'teal', verts=14))
        p.append(cl('knob', .04, .03, 0, 0, .2, 'rim', verts=8))
    return p
piece('trail_pond_cache_closed', pond_cache(False), exploration)
piece('trail_pond_cache_open', pond_cache(True), exploration)

def picnic_ribbon():
    """A faded picnic ribbon: a soft pink bow with two tails and a little checked tag, worn but cared for (no lettering)."""
    p = []
    for sx in (-1, 1):
        p.append(ball('loop', .09, sx * .1, 0, .12, 'pink', sub=2, sc=(1.3, .45, .9)))
        p.append(st((sx * .02, 0, .1), (sx * .12, -.03, -.08), .022, 'pink', sides=4))
        p.append(st((sx * .12, -.03, -.08), (sx * .14, -.04, -.16), .02, 'blossomd', sides=4))
    p.append(ball('knot', .045, 0, -.02, .11, 'blossomd', sub=2, sc=(1, .7, 1)))
    p.append(bx('tag', .07, .015, .07, .03, -.05, -.02, 'cream', bev=.006, rot=.2))
    p.append(bx('check', .03, .016, .03, .02, -.055, -.005, 'red', bev=0, rot=.2))
    for o in p: o.location.z += .2   # the tails' tips rest on the ground (base pivot)
    return p
piece('trail_picnic_ribbon', picnic_ribbon(), exploration)
# =================================================================== orchard (v0.4)
def cherry_tree(ripe=True):
    p = cute('cherry', 'leafw', 'blossoml', 'leafwd')
    # Paired cherries on thin green stems, below the bubbly canopy.
    if ripe:
        for i in range(7):
            a = i * math.tau / 7 + .3
            x, y, z = math.cos(a) * 1.5, math.sin(a) * 1.5, 2.3 + (i % 3) * .3
            for dx in (-.14, .14):
                p.append(st((x, y, z + .35), (x + dx, y, z), .025, 'leafd', sides=3))
                p.append(ball('cherry', .17, x + dx, y, z, 'berry', sub=1))
    return p
piece('cute_cherry', cherry_tree())
piece('cute_cherry_bare', cherry_tree(False))

def cherries():
    return [ball('cherry', .33, -.25, 0, .34, 'berry', sub=2), ball('cherry', .33, .27, .03, .34, 'fruitred', sub=2),
            st((-.25, 0, .58), (.06, 0, 1.05), .035, 'leafd', sides=5), st((.27, .03, .58), (.06, 0, 1.05), .035, 'leafd', sides=5),
            ball('leaf', .17, .18, 0, 1.06, 'leafwl', sub=1, sc=(1.5, .45, .7))]
piece('cherries', cherries())

def kennel():
    p = [bx('floor', 1.65, 1.65, .12, 0, 0, 0, 'woodd'), bx('back', 1.5, .12, 1.1, 0, -.7, .12, 'wood'),
         bx('side', .13, 1.5, 1.1, -.69, 0, .12, 'woodl'), bx('side', .13, 1.5, 1.1, .69, 0, .12, 'woodl'),
         bx('front', .4, .12, 1.1, -.55, .7, .12, 'wood'), bx('front', .4, .12, 1.1, .55, .7, .12, 'wood'),
         bx('lintel', .75, .12, .27, 0, .7, .96, 'woodl'), bx('cushion', .9, 1.1, .09, 0, .15, .12, 'red'),
         gable('roof', 1.65, 1.7, .65, 0, 0, 1.22, 'teal'), bx('plaque', .57, .08, .2, 0, .87, 1.26, 'cream')]
    for x in (-.18, .18):
        p.append(ball('bone', .065, x, .93, 1.36, 'white', sub=1))
    p.append(bx('bone', .32, .05, .065, 0, .93, 1.325, 'white'))
    return p
piece('kennel', kennel())

def fruit_stand():
    p = [bx('counter', 3.5, 1.35, .2, 0, 0, 1.12, 'woodl'), bx('front', 3.35, .15, .85, 0, .6, .27, 'wood'),
         bx('shelf', 3.3, 1.2, .12, 0, 0, .18, 'woodd')]
    for x in (-1.62, 1.62):
        p.append(bx('post', .13, 1.1, 2.4, x, 0, .12, 'woodd'))
    # A striped peach-and-cream canopy, with three open fruit crates.
    for i in range(8):
        p.append(bx('awning', .47, 1.9, .16, -1.645 + .47 * i, 0, 2.52, 'cream' if i % 2 else 'red'))
        p.append(bx('valance', .47, .12, .23, -1.645 + .47 * i, .95, 2.32, 'cream' if i % 2 else 'red'))
    for j, mt in enumerate(['berry', 'fruitred', 'fruitpeach']):
        x = (j - 1) * 1.05
        p.append(bx('crate', .9, .9, .16, x, 0, 1.32, 'woodd'))
        for i in range(6):
            p.append(ball('fruit', .13, x - .25 + (i % 3) * .25, -.18 + (i // 3) * .33, 1.56, mt, sub=1))
    return p
piece('fruit_stand', fruit_stand())


# =================================================================== the farmhouse interior (AR-015): one room for Explore
# docs/ASSET-REQUESTS.md AR-015 is the contract. Room-local metres, glTF Y up, floor y = 0, door on +z. Shell roots share
# the room origin; each prop is authored around its own base centre facing local +z, and interior-farmhouse.json gives
# its room placement and yaw (applied once at runtime). Separate kit, loaded only on entry: nothing here is in KINDS.
OUT_INTERIOR = os.path.join(ROOT, 'public', 'assets', 'models', 'interior-farmhouse.glb')
META_INTERIOR = os.path.join(ROOT, 'public', 'assets', 'models', 'interior-farmhouse.json')
RW, RD, WALL_H, WALL_T, DOOR_W, DOOR_H = 8.0, 6.0, 2.8, .15, 1.6, 2.2
# id: room position (x, z), yaw, room collider (x0, x1, z0, z1), interaction stand (x, z), focus height (m)
PROPS = {
    'farmhouse_sofa': ((-3.15, -0.60), math.pi / 2, (-3.65, -2.65, -1.80, 0.60), (-2.00, -0.60), .95),
    'farmhouse_wardrobe': ((3.20, 1.50), -math.pi / 2, (2.75, 3.65, 0.65, 2.35), (2.10, 1.50), 1.3),
    'farmhouse_table': ((0.25, -0.30), 0., (-0.75, 1.25, -1.25, 0.65), (0.25, 1.35), .85),
    'farmhouse_kitchen': ((2.45, -2.25), 0., (1.25, 3.65, -2.70, -1.80), (2.40, -1.10), 1.0),
    'farmhouse_desk': ((-1.40, -2.25), 0., (-2.20, -0.60, -2.70, -1.80), (-1.40, -1.10), .9),
    'farmhouse_memory_shelf': ((-3.15, 1.775), math.pi / 2, (-3.65, -2.65, 1.25, 2.30), (-2.00, 1.775), 1.2),
}
# The player's Sit clip, measured on the rigs as the game draws them (skinned meshes only, scaled by the Idle pose's
# height, feet lifted to the floor; Sit mid-frame, the lowest 5 % of the hips bone's vertices): the hips rest at this
# share of the actor's height, this share in front of the root (negative = behind). Feet hang 5-7 cm above the floor.
SIT = {'man': (.2550, -.0218), 'woman': (.2408, .0066)}
ACTOR_H = 1.8                       # the contract's test avatar
SEAT_TOP = round(SIT['man'][0] * ACTOR_H, 2)       # cushion top: the man's hips land on it, the woman's 2.5 cm into it
SEAT_Z = .12                        # cushion centre, prop-local +z

def to_local(prop, x, z):
    (px, pz), yaw = PROPS[prop][0], PROPS[prop][1]
    dx, dz = x - px, z - pz
    return dx * math.cos(yaw) - dz * math.sin(yaw), dx * math.sin(yaw) + dz * math.cos(yaw)
def to_room(prop, lx, lz):
    (px, pz), yaw = PROPS[prop][0], PROPS[prop][1]
    return px + lx * math.cos(yaw) + lz * math.sin(yaw), pz - lx * math.sin(yaw) + lz * math.cos(yaw)

def room_floor(lod=0):
    """The floor: a warm plank slab (top at y = 0) with seams, and a round-cornered rug in the living zone."""
    p = [bx('slab', RW, RD, .1, 0, 0, -.1, 'plank', bev=0)]
    if lod == 0:
        for i in range(1, 16):
            p.append(bx('seam', .03, RD - .3, .004, -RW / 2 + i * .5, 0, 0, 'seam', bev=0))
        for i in range(0, 16, 2):
            p.append(bx('plankd', .47, RD - .3, .003, -RW / 2 + .25 + i * .5, 0, 0, 'plankd', bev=0))
    p += [bx('rug', 2.3, 2.5, .02, -1.55, -.35, 0, 'rug', bev=.01 if lod == 0 else 0), bx('rugin', 1.9, 2.1, .022, -1.55, -.35, 0, 'rugl', bev=0)]
    if lod == 0:
        p.append(bx('mat', 1.2, .6, .02, 0, 2.45, 0, 'sack', bev=.01))        # a doormat on the entrance stand
    return p

def wall_x(name, side, lod=0):
    """Left (-1) or right (+1) wall, thickness inward from x = +-4, with a wainscot band and one window."""
    x = side * (RW / 2 - WALL_T / 2)
    p = [bx(name, WALL_T, RD, WALL_H, x, 0, 0, 'wallin', bev=0), bx('wains', .04, RD - .3, .9, x - side * .09, 0, 0, 'wainscot', bev=0)]
    if lod == 0:
        p.append(bx('rail', .06, RD - .3, .06, x - side * .1, 0, .9, 'wainscotd', bev=0))
    wz = 1.1 if side < 0 else -1.0   # the left window sits over the memory-shelf corner, leaving the sofa wall for a picture
    p += [bx('win', .05, 1.2, 1.0, x - side * .09, wz, 1.2, 'glass', bev=0), bx('winframe', .07, 1.36, .1, x - side * .1, wz, 1.15, 'woodl', bev=0)]
    if lod == 0:
        for dz in (-.72, .72):
            p.append(bx('curtain', .04, .3, 1.25, x - side * .11, wz + dz, 1.05, 'quilt' if side < 0 else 'sun', bev=0))
        if side < 0:   # a little painted landscape over the sofa: sky, hills, a sun; no words
            p += [bx('frame', .05, 1.0, .66, x - side * .1, -.6, 1.45, 'gold', bev=0), bx('sky', .03, .86, .52, x - side * .12, -.6, 1.52, 'sky', bev=0),
                  bx('hill', .035, .86, .2, x - side * .125, -.6, 1.52, 'leafw', bev=0), bx('hill2', .036, .4, .3, x - side * .13, -.75, 1.52, 'leafwl', bev=0),
                  ball('sunp', .07, x - side * .135, -.3, 1.88, 'sun', sub=1, sc=(.3, 1, 1))]
    if lod == 0:
        p += [bx('winframet', .07, 1.36, .1, x - side * .1, wz, 2.2, 'woodl', bev=0), bx('winbar', .06, .06, 1.0, x - side * .1, wz, 1.2, 'woodl', bev=0)]
    return p

def wall_back(lod=0):
    p = [bx('back', RW, WALL_T, WALL_H, 0, -RD / 2 + WALL_T / 2, 0, 'wallin', bev=0), bx('wains', RW - .3, .04, .9, 0, -RD / 2 + .17, 0, 'wainscot', bev=0)]
    if lod == 0:
        p.append(bx('rail', RW - .3, .06, .06, 0, -RD / 2 + .18, .9, 'wainscotd', bev=0))
    if lod == 0:   # a round wall clock without numbers, between the windows
        p += [cl('clock', .24, .05, .55, -RD / 2 + .2, 1.95, 'woodd', verts=16, rot=(math.pi / 2, 0, 0)), cl('face', .2, .02, .55, -RD / 2 + .23, 1.95, 'cream', verts=16, rot=(math.pi / 2, 0, 0)),
              bx('hand', .03, .02, .15, .55, -RD / 2 + .245, 1.95, 'charcoal', bev=0), bx('hand2', .11, .02, .03, .6, -RD / 2 + .245, 1.95, 'charcoal', bev=0)]
    for wx in (-1.4, 2.45):   # windows over the desk and over the kitchen counter
        p += [bx('win', 1.1, .05, .8, wx, -RD / 2 + .17, 1.45, 'glass', bev=0), bx('sill', 1.26, .12, .06, wx, -RD / 2 + .2, 1.4, 'woodl', bev=0)]
        if lod == 0:
            p += [bx('lintel', 1.26, .07, .08, wx, -RD / 2 + .19, 2.25, 'woodl', bev=0), bx('bar', .05, .06, .8, wx, -RD / 2 + .19, 1.45, 'woodl', bev=0)]
            for dx in (-.68, .68):
                p.append(bx('curtain', .26, .04, 1.05, wx + dx, -RD / 2 + .21, 1.25, 'pink' if wx < 0 else 'sun', bev=0))
    return p

def wall_front(lod=0):
    """The front wall with the doorway (x -0.8..0.8, 2.2 m clear, no threshold); hidden at runtime, collision kept."""
    side = (RW - DOOR_W) / 2
    y = RD / 2 - WALL_T / 2
    p = [bx('frontl', side, WALL_T, WALL_H, -(DOOR_W + side) / 2, y, 0, 'wallin', bev=0),
         bx('frontr', side, WALL_T, WALL_H, (DOOR_W + side) / 2, y, 0, 'wallin', bev=0),
         bx('lintel', DOOR_W, WALL_T, WALL_H - DOOR_H, 0, y, DOOR_H, 'wallin', bev=0)]
    p += [bx('jambl', .1, .2, DOOR_H, -DOOR_W / 2 - .05, y, 0, 'woodd', bev=0), bx('jambr', .1, .2, DOOR_H, DOOR_W / 2 + .05, y, 0, 'woodd', bev=0),
          bx('head', DOOR_W + .2, .2, .12, 0, y, DOOR_H, 'woodd', bev=0)]
    if lod == 0:
        p += [bx('wainsl', side - .15, .04, .9, -(DOOR_W + side) / 2 - .07, y - .09, 0, 'wainscot', bev=0),
              bx('wainsr', side - .15, .04, .9, (DOOR_W + side) / 2 + .07, y - .09, 0, 'wainscot', bev=0)]
    return p

# --- props (prop-local, base centre, facing +z) ---
def sofa(lod=0):
    """Sofa (2.4 x 1.0): a chunky blue couch on a wooden plinth. The cushion top is SEAT_TOP, fitted to the Sit clip."""
    b = .03 if lod == 0 else 0
    p = [bx('plinth', 2.3, .9, .16, 0, 0, 0, 'woodd', bev=b), bx('base', 2.3, .9, SEAT_TOP - .3, 0, 0, .16, 'sofad', bev=b),
         bx('cushion', 1.96, .66, .16, 0, SEAT_Z, SEAT_TOP - .16, 'sofa', bev=.06 if lod == 0 else 0),
         bx('back', 2.3, .26, .62, 0, -.32, SEAT_TOP - .14, 'sofa', bev=.08 if lod == 0 else 0)]
    for x in (-1.04, 1.04):
        p.append(bx('arm', .22, .9, .32, x, 0, SEAT_TOP - .14, 'sofal', bev=.07 if lod == 0 else 0))
    if lod == 0:
        p += [bx('seamc', .02, .6, .02, 0, SEAT_Z, SEAT_TOP, 'sofad', bev=0),
              ball('pillow', .2, -.62, -.08, SEAT_TOP + .17, 'pillow', sub=1, sc=(1, .55, 1)), ball('pillow2', .18, .66, -.1, SEAT_TOP + .15, 'quilt', sub=1, sc=(1, .55, 1)),
              bx('throw', .5, .7, .02, .55, .02, SEAT_TOP + .005, 'cream', bev=0, rot=.12)]
    return p
def wardrobe(lod=0):
    """Wardrobe (1.7 x 0.9): a tall painted cupboard with two doors, round knobs, a crown and feet."""
    b = .03 if lod == 0 else 0
    p = [bx('body', 1.6, .62, 1.95, 0, -.08, .1, 'wood', bev=b), bx('crown', 1.7, .7, .12, 0, -.08, 2.03, 'woodd', bev=b),
         bx('doorl', .74, .04, 1.7, -.39, .2, .22, 'woodl', bev=0), bx('doorr', .74, .04, 1.7, .39, .2, .22, 'woodl', bev=0)]
    for x in (-.7, .7):
        p.append(bx('foot', .14, .14, .1, x, .1, 0, 'woodd', bev=0)); p.append(bx('footb', .14, .14, .1, x, -.35, 0, 'woodd', bev=0))
    p += [cl('knobl', .04, .05, -.08, .23, 1.05, 'gold', verts=8, rot=(math.pi / 2, 0, 0)), cl('knobr', .04, .05, .08, .23, 1.05, 'gold', verts=8, rot=(math.pi / 2, 0, 0))]
    if lod == 0:
        for x in (-.39, .39):
            p.append(bx('panel', .5, .02, .6, x, .225, 1.2, 'wood', bev=0)); p.append(bx('panel2', .5, .02, .6, x, .225, .45, 'wood', bev=0))
        p += [bx('hatbox', .4, .36, .24, -.35, -.08, 2.15, 'quilt', bev=.03), bx('basket', .34, .3, .2, .4, -.08, 2.15, 'sack', bev=.03)]
    return p
def table(lod=0):
    """Dining table with two chairs (2.0 x 1.9), plain illustrated seed packets and a jug of flowers on top."""
    b = .02 if lod == 0 else 0
    p = [bx('top', 1.5, .9, .08, 0, 0, .72, 'woodl', bev=b)]
    for x in (-.65, .65):
        for y in (-.35, .35):
            p.append(bx('leg', .08, .08, .72, x, y, 0, 'wood', bev=0))
    for y, face in ((-.72, 1), (.72, -1)):    # a chair behind and one in front of the table, tucked in
        p += [bx('seat', .46, .4, .06, 0, y, .44, 'wood', bev=b), bx('cback', .46, .06, .5, 0, y - face * .17, .5, 'woodd', bev=b)]
        for x in (-.18, .18):
            for yy in (-.16, .16):
                p.append(bx('cleg', .05, .05, .44, x, y + yy * .9, 0, 'woodd', bev=0))
    if lod == 0:
        p += [bx('cloth', 1.2, .5, .01, 0, 0, .8, 'cream', bev=0)]
        for i, (x, c) in enumerate(((-.42, 'leafwl'), (-.18, 'sun'), (.08, 'pink'))):   # seed packets: a plain picture, no words
            p += [bx('packet', .16, .22, .012, x, .12, .81, 'paper', bev=0, rot=(i - 1) * .2), ball('pic', .045, x, .14, .825, c, sub=1, sc=(1, 1, .3))]
        p += [cl('jug', .08, .2, .45, -.12, .8, 'tile', verts=10, rt=.06), ball('bloom', .07, .45, -.12, 1.06, 'quilt', sub=1), ball('bloom2', .06, .52, -.08, 1.02, 'sun', sub=1)]
    return p
def kitchen(lod=0):
    """Kitchen counter (2.4 x 0.9): cupboards, a tiled top with a sink and a little stove, copper pots, an unlettered
    recipe book and a shelf of jars above."""
    b = .02 if lod == 0 else 0
    p = [bx('cab', 2.36, .6, .82, 0, -.12, 0, 'wainscot', bev=b), bx('ctop', 2.4, .66, .08, 0, -.12, .82, 'tile', bev=b),
         bx('stove', .62, .5, .04, .72, -.14, .9, 'charcoal', bev=0), bx('sink', .5, .36, .03, -.55, -.12, .89, 'tiled', bev=0)]
    for x in (-.9, -.3, .3, .9):
        p.append(bx('door', .52, .03, .62, x, .19, .1, 'wainscotd' if lod else 'wainscot', bev=0))
    p += [cl('pot', .14, .16, .6, -.12, .94, 'copper', verts=10), bx('book', .26, .2, .05, -.05, .05, .9, 'red', bev=.01, rot=.2)]   # the recipe book: a plain red cover
    p += [bx('shelf', 2.0, .24, .04, 0, -.32, 1.55, 'woodl', bev=0)]
    if lod == 0:
        for x in (-.84, .84):
            p.append(bx('knob', .05, .03, .05, x, .22, .55, 'gold', bev=0))
        p += [cl('pot2', .11, .12, .86, -.1, .94, 'copper', verts=8), cl('tap', .02, .24, -.55, -.32, .9, 'iron', verts=6),
              bx('bookpage', .24, .18, .01, -.05, .05, .955, 'paper', bev=0, rot=.2)]
        for i, (x, c) in enumerate(((-.8, 'sun'), (-.5, 'berry'), (-.2, 'leafwl'), (.4, 'orange'), (.7, 'pink'))):
            p.append(cl('jar', .07, .16, x, -.32, 1.59, c, verts=8)); p.append(cl('lid', .075, .03, x, -.32, 1.75, 'wood', verts=8))
    return p
def desk(lod=0):
    """A small study desk (1.6 x 0.9) with a chair, a lamp and a closed planning journal (no words)."""
    b = .02 if lod == 0 else 0
    p = [bx('top', 1.3, .5, .06, 0, -.18, .74, 'woodl', bev=b), bx('drawers', .4, .46, .7, .4, -.18, .04, 'wood', bev=b)]
    for x, y in ((-.6, -.38), (-.6, .02)):
        p.append(bx('leg', .06, .06, .74, x, y, 0, 'wood', bev=0))
    p += [bx('seat', .42, .38, .06, -.15, .25, .44, 'wood', bev=b), bx('cback', .42, .05, .44, -.15, .42, .5, 'woodd', bev=b)]
    for x in (-.32, .02):
        for y in (.1, .4):
            p.append(bx('cleg', .05, .05, .44, x, y, 0, 'woodd', bev=0))
    p += [bx('journal', .3, .22, .05, -.15, -.12, .8, 'cloth', bev=.01, rot=-.15), cl('lampbase', .08, .03, .45, -.26, .8, 'iron', verts=8)]
    if lod == 0:
        p += [cl('lampstem', .015, .35, .45, -.26, .83, 'iron', verts=5), cone('shade', .16, .18, (.45, .26, 1.24), C['sun'], verts=10),
              bx('pencil', .02, .16, .02, .02, -.1, .8, 'sun', bev=0, rot=.6), bx('pulls', .12, .02, .03, .4, .06, .5, 'gold', bev=0),
              bx('pulls2', .12, .02, .03, .4, .06, .25, 'gold', bev=0)]
    return p
def memory_shelf(lod=0):
    """The family memory shelf (1.05 x 1.0): an open bookcase of keepsakes and framed pictures, a drawing partly tucked
    behind a frame, and a basket on the floor in front."""
    b = .02 if lod == 0 else 0
    p = [bx('sidel', .06, .38, 1.9, -.48, -.3, 0, 'wood', bev=b), bx('sider', .06, .38, 1.9, .48, -.3, 0, 'wood', bev=b),
         bx('backp', 1.0, .03, 1.9, 0, -.48, 0, 'woodd', bev=0)]
    for z in (.05, .55, 1.05, 1.55, 1.88):
        p.append(bx('board', 1.0, .38, .04, 0, -.3, z, 'woodl', bev=0))
    p += [bx('frame', .3, .04, .36, -.2, -.25, 1.09, 'gold', bev=.01), bx('photo', .24, .02, .28, -.2, -.23, 1.13, 'sky', bev=0),
          bx('drawing', .22, .01, .28, .05, -.3, 1.12, 'paper', bev=0, rot=.15),   # the tucked drawing, half behind the frame
          bx('basket', .5, .36, .26, 0, .25, 0, 'sack', bev=.04 if lod == 0 else 0)]
    if lod == 0:
        for i, (x, c) in enumerate(((-.36, 'red'), (-.3, 'cloth'), (-.24, 'sun'), (-.18, 'leafwl'))):
            p.append(bx('book', .055, .26, .34, x, -.3, .59, c, bev=0))
        p += [bx('frame2', .26, .04, .3, .25, -.25, 1.59, 'woodd', bev=.01), bx('photo2', .2, .02, .22, .25, -.23, 1.63, 'pink', bev=0),
              ball('vase', .1, .26, -.3, .7, 'teal', sub=1, sc=(1, 1, 1.4)), bx('box', .3, .24, .16, .2, -.3, .09, 'quilt', bev=.02),
              ball('yarn', .09, -.1, .27, .3, 'pink', sub=1), cl('wool', .06, .1, .12, .3, .26, 'sun', verts=8), ball('ribbon', .06, -.3, -.25, .12, 'berry', sub=1)]
    return p

PROP_MODELS = {'farmhouse_sofa': sofa, 'farmhouse_wardrobe': wardrobe, 'farmhouse_table': table, 'farmhouse_kitchen': kitchen,
               'farmhouse_desk': desk, 'farmhouse_memory_shelf': memory_shelf}
SHELL = {'farmhouse_interior_floor': room_floor, 'farmhouse_interior_back': wall_back,
         'farmhouse_interior_left': lambda lod=0: wall_x('left', -1, lod), 'farmhouse_interior_front': wall_front,
         'farmhouse_interior_right': lambda lod=0: wall_x('right', 1, lod)}
interior = []
for name, f in {**SHELL, **PROP_MODELS}.items():
    piece(name, f(0), interior); piece(name + '_mid', f(1), interior)

def room_y(v):   # Blender (x, y, z up) -> room (x, y up, z front)
    return [round(v[0], 3), round(v[2], 3), round(-v[1], 3)]
def blender(x, y, z):   # room (x, y up, z front) -> Blender
    return (x, -z, y)

def interior_kit():
    iobjs = build(interior)
    by = {o.name: o for o in iobjs}
    seat = {}
    for sfx in ('', '_mid'):
        fl = by['farmhouse_interior_floor' + sfx]
        add_anchor(fl, 'entry', blender(0, 0, 2.15)); add_anchor(fl, 'exit', blender(0, 0, 2.45))
        add_anchor(fl, 'camera', blender(9, 10, 11)); add_anchor(fl, 'camera_target', blender(0, .6, 0))
        for pid, (pos, yaw, col, stand, fh) in PROPS.items():
            o = by[pid + sfx]; lx, lz = to_local(pid, *stand)
            add_anchor(o, 'interact', blender(lx, 0, lz)); add_anchor(o, 'focus', blender(0, fh, 0))
        # the seat: the actor root that puts the Sit clip's hips on the cushion centre (feet on the floor)
        root_z = SEAT_Z - SIT['man'][1] * ACTOR_H   # the root at floor height, so the hips sit on the cushion centre
        add_anchor(by['farmhouse_sofa' + sfx], 'seat', blender(0, 0, root_z))
        seat = {'local': [0, 0, round(root_z, 3)]}
    bpy.context.view_layer.update()
    # contract checks: every prop inside its collider after placement, the entrance corridor empty, budgets
    report, full_tris, mid_tris = [], 0, 0
    for o in iobjs:
        t = triangles(o); mid = o.name.endswith('_mid'); base = o.name[:-4] if mid else o.name
        if mid: mid_tris += t
        else: full_tris += t
        if base in PROPS:
            assert t <= 1200, f'{o.name}: {t} triangles > 1.2k'
            xs, zs = [], []
            for v in o.data.vertices:
                lx, lz = v.co.x, -v.co.y; rx, rz = to_room(base, lx, lz); xs.append(rx); zs.append(rz)
            (x0, x1, z0, z1) = PROPS[base][2]
            inside = min(xs) >= x0 - 1e-3 and max(xs) <= x1 + 1e-3 and min(zs) >= z0 - 1e-3 and max(zs) <= z1 + 1e-3
            assert inside, f'{o.name} leaves its collider: x {min(xs):.2f}..{max(xs):.2f} (want {x0}..{x1}), z {min(zs):.2f}..{max(zs):.2f} (want {z0}..{z1})'
            assert not (max(xs) > -.65 and min(xs) < .65 and max(zs) > 1.15 and min(zs) < 2.70), f'{o.name} blocks the entrance corridor'
            report.append(f'{o.name}: {t} tris, room x {min(xs):.2f}..{max(xs):.2f}, z {min(zs):.2f}..{max(zs):.2f}')
    shell_tris = sum(triangles(by[n]) for n in SHELL)
    assert shell_tris <= 8000 and full_tris <= 16000 and mid_tris <= 8000, (shell_tris, full_tris, mid_tris)
    # full and mid anchors agree, in room space
    for pid in PROPS:
        for lab in ('interact', 'focus'):
            a, b = bpy.data.objects[f'{pid}.{lab}'].location, bpy.data.objects[f'{pid}_mid.{lab}'].location
            assert (a - b).length < 1e-6, (pid, lab)
    size = packed(iobjs, OUT_INTERIOR)
    meta = interior_meta(seat)
    with open(META_INTERIOR, 'w', encoding='utf-8', newline='\n') as f: json.dump(meta, f, indent=1)
    print('\n'.join(report))
    print(f'interior: shell {shell_tris}, full room {full_tris}, mid room {mid_tris} triangles; {size} bytes; metadata {os.path.getsize(META_INTERIOR)} bytes')

def interior_meta(seat):
    r = lambda v: round(v, 3)
    meshes = [{'node': n, 'position': [0, 0, 0], 'yaw': 0, 'midNode': n + '_mid'} for n in SHELL]
    meshes += [{'node': pid, 'position': [r(pos[0]), 0, r(pos[1])], 'yaw': r(yaw), 'midNode': pid + '_mid'} for pid, (pos, yaw, *_ ) in PROPS.items()]
    half_t = WALL_T
    walls = [{'id': 'wall_back', 'min': [-4, -3], 'max': [4, -3 + half_t]}, {'id': 'wall_left', 'min': [-4, -3], 'max': [-4 + half_t, 3]},
             {'id': 'wall_right', 'min': [4 - half_t, -3], 'max': [4, 3]}, {'id': 'wall_front_left', 'min': [-4, 3 - half_t], 'max': [-DOOR_W / 2, 3]},
             {'id': 'wall_front_right', 'min': [DOOR_W / 2, 3 - half_t], 'max': [4, 3]}]
    colliders = [{'id': pid, 'min': [c[0], c[2]], 'max': [c[1], c[3]]} for pid, (_, _, c, _, _) in PROPS.items()] + walls
    inter = []
    for pid, (pos, yaw, col, stand, fh) in PROPS.items():
        inter.append({'id': pid, 'anchor': f'{pid}.interact', 'stand': [stand[0], 0, stand[1]], 'focus': [r(pos[0]), fh, r(pos[1])]})
    inter.append({'id': 'farmhouse_exit', 'anchor': 'farmhouse_interior_floor.exit', 'stand': [0, 0, 2.45], 'focus': [0, 1.05, 3]})
    sx, sz = to_room('farmhouse_sofa', 0, seat['local'][2])
    yaw = PROPS['farmhouse_sofa'][1]
    return {'schemaVersion': 1, 'roomId': 'farmhouse_main', 'site': 'farmhouse', 'units': 'metres, Y up, yaw radians',
            'bounds': {'room': {'min': [-4, -3], 'max': [4, 3]}, 'wallHeight': WALL_H, 'wallThickness': WALL_T,
                       'innerFloor': {'min': [-3.85, -2.85], 'max': [3.85, 2.85]}, 'avatarCentre': {'min': [-3.55, -2.55], 'max': [3.55, 2.55]},
                       'avatar': {'radius': .3, 'height': ACTOR_H}, 'entranceCorridor': {'min': [-.65, 1.15], 'max': [.65, 2.7]}},
            'zones': {'home_living': {'min': [-3.85, -1.0], 'max': [-.9, 2.85]}, 'home_kitchen': {'min': [-.9, -2.85], 'max': [3.85, .9]},
                      'home_study': {'min': [-3.85, -2.85], 'max': [-.9, -1.0], 'also': ['farmhouse_wardrobe']}},
            'meshes': meshes, 'colliders': colliders, 'interactions': inter,
            'entry': {'anchor': 'farmhouse_interior_floor.entry', 'position': [0, 0, 2.15], 'facing': [0, 0, -1]},
            'exit': {'id': 'farmhouse_exit', 'anchor': 'farmhouse_interior_floor.exit', 'stand': [0, 0, 2.45],
                     'doorway': {'centre': [0, 0, 3], 'width': DOOR_W, 'height': DOOR_H}},
            'camera': {'anchor': 'farmhouse_interior_floor.camera', 'targetAnchor': 'farmhouse_interior_floor.camera_target',
                       'position': [9, 10, 11], 'target': [0, .6, 0], 'padding': .1, 'projection': 'orthographic'},
            'hiddenWalls': {'full': ['farmhouse_interior_front', 'farmhouse_interior_right'], 'mid': ['farmhouse_interior_front_mid', 'farmhouse_interior_right_mid']},
            'seats': [{'id': 'farmhouse_sofa', 'node': 'farmhouse_sofa.seat', 'midNode': 'farmhouse_sofa_mid.seat',
                       'position': [r(sx), 0, r(sz)], 'facing': [r(math.sin(yaw)), 0, r(math.cos(yaw))], 'returnStand': [-2.0, 0, -0.6],
                       'cushionTop': SEAT_TOP, 'actorHeight': ACTOR_H, 'clip': 'Sit',
                       'measured': {rig: {'hipHeight': r(h * ACTOR_H), 'hipForward': r(f * ACTOR_H), 'hipHeightShare': h, 'hipForwardShare': f} for rig, (h, f) in SIT.items()}}]}

# =================================================================== export
def build(group):
    objs = []
    for name, parts, tint in group:
        o = vc_join(parts, name, tint); objs.append(o)
        d = o.dimensions
        print(f'{name}: {triangles(o)} triangles, {d.x:.2f} x {d.z:.2f} x {d.y:.2f} m')
    return objs

def anchor_out(o, A):
    """Add the anchor empties to a joined root; return them in three.js coordinates (x, y up, z front). Farm-kit
    pieces keep their authored origin in the game (KIND_MODELS authored: true), so these need no correction."""
    res = {}
    for label, pts in A.items():
        res[label] = []
        for i, pt in enumerate(pts):
            x, y, z = pt[:3]
            add_anchor(o, f'{label}.{i}' if len(pts) > 1 else label, (x, -y, z))
            res[label].append([round(x, 3), round(z, 3), round(y, 3)] + [round(v, 3) for v in pt[3:]])
    return res

def packed(objs, path):
    """Export to a temporary GLB, then compress it into the game's folder with art/blender/pack.mjs (gltfpack)."""
    import tempfile, subprocess
    raw = os.path.join(tempfile.gettempdir(), 'fv-raw-' + os.path.basename(path))
    export_vc(objs, raw)
    r = subprocess.run(['node', os.path.join(os.path.dirname(__file__), 'pack.mjs'), raw, path], capture_output=True, text=True)
    print(r.stdout.strip(), r.stderr.strip())
    return os.path.getsize(path)

out = {}
objs = build(pieces)
for o in objs:
    if o.name in anchors:
        out[o.name] = anchor_out(o, anchors[o.name])
print(f'wrote {OUT} ({packed(objs, OUT)} bytes)')
dobjs = build(decor)
for o in dobjs:
    if o.name in anchors:
        out[o.name] = anchor_out(o, anchors[o.name])
print(f'wrote {OUT_DECOR} ({packed(dobjs, OUT_DECOR)} bytes)')
# the discovery keepsakes, scaled from their 0.5 m working size to a small handheld size
HANDHELD = .3
kobjs = build(discovery)
for o in kobjs:
    o.data.transform(Matrix.Scale(HANDHELD, 4)); o.data.update()
bpy.context.view_layer.update()
for o in kobjs:
    d = o.dimensions
    print(f'{o.name} (handheld): {d.x:.3f} x {d.y:.3f} x {d.z:.3f} m (w x d x h)')
print(f'wrote {OUT_DISCOVERY} ({packed(kobjs, OUT_DISCOVERY)} bytes)')
xobjs = build(exploration)   # the discovery trail (AR-010), world size
print(f'wrote {OUT_EXPLORATION} ({packed(xobjs, OUT_EXPLORATION)} bytes)')
interior_kit()   # the farmhouse interior (AR-015): its own kit and metadata
json.dump(out, open(ANCHOR_JSON, 'w'), indent=1)
print('anchors', ANCHOR_JSON)
