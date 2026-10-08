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
        'rim': '#9C6236', 'riml': '#B87A45',
        # keepsakes (AR-009)
        'cloth': '#6F9FD8', 'clothd': '#5281BE', 'clothl': '#9DC2EC', 'pebble': '#7D8BA6',
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

pieces, decor, discovery, anchors = [], [], [], {}
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

CROPS = {'wheat': wheat, 'carrot': carrot, 'corn': corn, 'pumpkin': pumpkin, 'strawberry': strawberry}
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
         cl('water', 3.3, .12, 0, 0, .12, 'water', verts=22), cl('water2', 2.2, .12, -.2, 1.5, .12, 'water', verts=18), cl('water3', 2.1, .12, .5, -1.5, .12, 'water', verts=18)]
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
def cute(name, base, light, dark, fruit=None, nfruit=7):
    p = [cl('trunk', .4, 2.4, 0, 0, 0, 'wood', verts=8, rt=.28), cl('root', .58, .25, 0, 0, 0, 'woodd', verts=8, rt=.4)]
    for i, (x, y, z, r, k) in enumerate(CANOPY):
        p.append(ball('puff', r, x, y, z, [base, light, dark, base, light][k % 5] if i else base, sub=2, sc=(1, 1, .92)))
    if fruit:
        for i in range(nfruit):
            a = i / nfruit * math.tau + .4; r = 1.55 + .25 * (i % 2); z = 2.4 + .8 * ((i * 3) % 4) / 3
            p.append(ball('fruit', .2, math.cos(a) * r * .8, math.sin(a) * r * .8, z, fruit, sub=0))
    return p
piece('cute_round', cute('r', 'leafw', 'leafwl', 'leafwd'))
piece('cute_apple', cute('a', 'leafw', 'leafwl', 'leafwd', 'fruitred'))
piece('cute_apple_bare', cute('ab', 'leafw', 'leafwl', 'leafwd'))
piece('cute_peach', cute('p', 'leafwl', 'leafw', 'leafwd', 'fruitpeach'))
piece('cute_peach_bare', cute('pb', 'leafwl', 'leafw', 'leafwd'))
piece('cute_blossom', cute('b', 'blossom', 'blossoml', 'blossomd'))
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
json.dump(out, open(ANCHOR_JSON, 'w'), indent=1)
print('anchors', ANCHOR_JSON)
