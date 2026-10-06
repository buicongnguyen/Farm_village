"""Farm Village farm kit: the models Willowmere's kits do not have (TECH-PLAN 5).

Run:  blender --background --factory-startup --python art/blender/build_farm_kit.py
Writes public/assets/models/farm-kit.glb and prints each piece's triangles and size.

Pieces: crop_wheat, feed_mill (2 x 2 cells), bakery (3 x 2 cells), bench, lamp, order_board.
Contract (glTF, Y up, front faces +Z, origin = ground centre, metres, scale 1). Every material is opaque and flat:
the game bakes them into vertex colours (src/view/models.mjs) so each kind draws in one call per batch.
"""
import sys, os, math, random
sys.path.insert(0, os.path.dirname(__file__))
from style import *

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUT = os.path.join(ROOT, 'public', 'assets', 'models', 'farm-kit.glb')
reset_scene()
C = {}
for n, c in {'cream': '#FFF1D2', 'white': '#FFFDF6', 'red': '#EF3B3B', 'redd': '#C22F2A', 'roof': '#D8574A', 'roofd': '#A93F35',
             'wood': '#C77A3A', 'woodl': '#E3A05A', 'woodd': '#8A4B25', 'stone': '#B9C0CC', 'stoned': '#8C95A5', 'iron': '#5B6477',
             'charcoal': '#3A3D4A', 'straw': '#F2B33D', 'strawl': '#FFD35C', 'strawd': '#D98B1F', 'stalk': '#B9C95A', 'leaf': '#4FBF3A',
             'sun': '#FFC83A', 'glass': '#7FE3FF', 'sack': '#E9D2A6', 'sackd': '#C9AE7E', 'bread': '#D98B3A', 'breadl': '#F2B460',
             'cork': '#C98F55', 'paper': '#FFF6D8', 'pink': '#FF9CC8', 'sky': '#35B6F2', 'mint': '#5EDFB0'}.items():
    C[n] = mat('FK ' + n, c, .55)
C['lampglow'] = mat('FK lampglow', '#FFE08A', .4, emit='#FFE08A', emit_strength=2.0)

def bx(name, w, d, h, x, y, z, mt, bev=.03, seg=1, rot=0.):
    """Box: width w (x), depth d (toward the front), height h; (x, y) on the plan with y toward the front; z = bottom."""
    return box(name, (w, d, h), (x, -y, z + h / 2), C[mt], bev=bev, seg=seg, rot=(0, 0, rot))
def cl(name, r, h, x, y, z, mt, verts=10, rt=None, bev=0.):
    return cyl(name, r, h, (x, -y, z + h / 2), C[mt], verts=verts, bev=bev, seg=1, radius_top=rt)
def ball(name, r, x, y, z, mt, sub=1, sc=None):
    return ico(name, r, (x, -y, z), C[mt], subdiv=sub, scale=sc)
def gable(name, w, d, h, x, y, z, mt, over=.18):
    """A pitched roof: ridge along x, w wide, d deep, h tall, sitting on z."""
    hw, hd = w / 2 + over, d / 2 + over
    return extrude_outline(name, [(-hd, 0), (hd, 0), (0, h)], w + 2 * over, (x, -y, z), C[mt], rot=(0, 0, math.pi / 2), bev=.02)

pieces = []
def piece(name, parts): pieces.append((name, parts))

# ------------------------------------------------------------------ crop_wheat: a 1.3 m patch of golden stalks
def wheat():
    rnd = random.Random(7); p = []
    for i in range(11):
        a = i / 11 * math.tau + rnd.uniform(-.2, .2); r = .18 + .38 * ((i * 7) % 5) / 4
        x, y, h = math.cos(a) * r, math.sin(a) * r, .7 + rnd.uniform(0, .25)
        p.append(cl('stalk', .025, h, x, y, 0, 'stalk', verts=5))
        p.append(ball('ear', .07, x, y, h + .1, 'straw' if i % 3 else 'strawl', sub=0, sc=(1, 1, 2.6)))
    p.append(cl('tuft', .32, .12, 0, 0, 0, 'leaf', verts=8, rt=.12))
    return p
piece('crop_wheat', wheat())

# ------------------------------------------------------------------ feed_mill: 2 x 2 cells (about 3.4 m), door at the front
def feed_mill():
    p = [bx('base', 2.7, 2.5, .35, 0, 0, 0, 'stone', bev=.05), bx('walls', 2.4, 2.2, 1.7, 0, 0, .35, 'cream', bev=.05),
         gable('roof', 2.4, 2.2, 1.0, 0, 0, 2.05, 'roof'), bx('door', .75, .1, 1.15, 0, 1.12, .35, 'woodd', bev=.02),
         bx('doorframe', .95, .08, 1.3, 0, 1.1, .33, 'wood', bev=.02), bx('window', .5, .08, .45, -.85, 1.12, 1.15, 'glass', bev=.02)]
    # the grain hopper on the side, with its chute
    p += [cl('hopper', .55, .7, 1.55, -.3, 1.6, 'woodl', verts=8, rt=.75), cl('hopperleg', .12, 1.6, 1.55, -.3, 0, 'woodd', verts=6),
          bx('chute', .22, .7, .18, 1.35, .2, 1.2, 'wood', rot=.3)]
    # two grain sacks and a bucket by the door
    for i, (x, y) in enumerate([(-1.0, 1.45), (-.6, 1.6)]):
        p += [ball('sack', .3, x, y, .3, 'sack', sc=(1, .9, 1.1)), ball('sacktop', .14, x, y, .64, 'sackd', sub=0)]
    p.append(cl('bucket', .18, .3, .8, 1.45, 0, 'iron', verts=8, rt=.22))
    # a little wind vane on the ridge
    p += [cl('vanepole', .03, .5, 0, 0, 3.0, 'iron', verts=5), bx('vane', .5, .04, .14, .1, 0, 3.4, 'red', bev=0)]
    return p
piece('feed_mill', feed_mill())

# ------------------------------------------------------------------ bakery: 3 x 2 cells (about 5.4 x 3.4 m), door at the front
def bakery():
    p = [bx('base', 4.6, 2.8, .3, 0, 0, 0, 'stone', bev=.05), bx('walls', 4.3, 2.5, 2.0, 0, 0, .3, 'cream', bev=.05),
         gable('roof', 4.3, 2.5, 1.15, 0, 0, 2.3, 'roofd'), bx('door', .8, .1, 1.3, 0, 1.27, .3, 'woodd', bev=.02),
         bx('win1', .8, .08, .6, -1.35, 1.27, 1.0, 'glass', bev=.02), bx('win2', .8, .08, .6, 1.35, 1.27, 1.0, 'glass', bev=.02),
         bx('sill1', .95, .2, .08, -1.35, 1.33, .95, 'wood'), bx('sill2', .95, .2, .08, 1.35, 1.33, .95, 'wood')]
    # striped awning over the front
    for i in range(7):
        p.append(bx('awn', .62, .9, .06, -1.86 + i * .62, 1.6, 1.95, 'red' if i % 2 else 'white', bev=.01, rot=0))
    p.append(bx('awnfront', 4.34, .08, .22, 0, 2.05, 1.84, 'redd', bev=.01))
    # chimney with a warm top, and the bread sign
    p += [bx('chimney', .55, .55, 1.3, 1.4, -.4, 2.7, 'stoned'), bx('chimneytop', .7, .7, .14, 1.4, -.4, 4.0, 'charcoal')]
    # a hanging bread sign beside the door
    p += [bx('signarm', .5, .06, .06, .75, 1.45, 1.75, 'iron', bev=0), bx('signboard', .5, .06, .42, .85, 1.5, 1.25, 'woodl'),
          ball('loaf', .16, .85, 1.56, 1.47, 'bread', sc=(1.6, .6, .8))]
    # flower boxes under the windows
    for x in (-1.35, 1.35):
        p += [bx('box', .9, .22, .18, x, 1.42, .75, 'woodd'), ball('fl', .12, x - .25, 1.42, .98, 'pink', sub=0), ball('fl', .12, x + .2, 1.42, .98, 'sun', sub=0)]
    return p
piece('bakery', bakery())

# ------------------------------------------------------------------ bench (1.4 m) and lamp (2.3 m)
piece('bench', [bx('seat', 1.4, .45, .08, 0, 0, .42, 'wood'), bx('back', 1.4, .08, .4, 0, -.22, .58, 'wood'),
                bx('legl', .08, .45, .42, -.6, 0, 0, 'iron', bev=.01), bx('legr', .08, .45, .42, .6, 0, 0, 'iron', bev=.01),
                bx('armr', .08, .45, .2, .66, 0, .5, 'woodd'), bx('arml', .08, .45, .2, -.66, 0, .5, 'woodd')])
piece('lamp', [cl('foot', .22, .18, 0, 0, 0, 'charcoal', verts=8, rt=.15), cl('pole', .06, 2.0, 0, 0, .18, 'iron', verts=6),
               bx('arm', .1, .1, .1, 0, 0, 2.15, 'iron'), cl('cap', .26, .14, 0, 0, 2.48, 'charcoal', verts=6, rt=.08),
               cl('glass', .18, .3, 0, 0, 2.18, 'lampglow', verts=6)])
# ------------------------------------------------------------------ order_board: the notice board by the gate
def board():
    p = [bx('postl', .12, .12, 1.9, -.75, 0, 0, 'woodd'), bx('postr', .12, .12, 1.9, .75, 0, 0, 'woodd'),
         bx('board', 1.5, .08, .95, 0, .02, .8, 'cork', bev=.02), bx('frame', 1.62, .06, 1.05, 0, -.02, .75, 'wood', bev=.02),
         gable('roof', 1.8, .5, .3, 0, 0, 1.9, 'roof', over=.08)]
    for i, (x, z, c) in enumerate([(-.45, 1.3, 'paper'), (0, 1.25, 'mint'), (.45, 1.32, 'paper'), (-.22, .95, 'sun'), (.28, .95, 'paper')]):
        p.append(bx('note', .3, .03, .28, x, .08, z - .14, c, bev=0, rot=((i % 3) - 1) * .06))
    return p
piece('order_board', board())

objs = []
for name, parts in pieces:
    o = join(parts, name); objs.append(o)
    d = o.dimensions
    print(f'{name}: {triangles(o)} triangles, {d.x:.2f} x {d.z:.2f} x {d.y:.2f} m')
size = export_glb(objs, OUT)
print(f'wrote {OUT} ({size} bytes)')
