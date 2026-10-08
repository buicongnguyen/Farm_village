"""Farm Village item models for icons: the goods as the player holds them (a wheat sheaf, a carrot, a corn cob, bread, a
cake ...), plus a coin, an XP star, a heart, a sickle and a glove. Same toy style and palette as build_farm_kit.py.

Run:  blender --background --factory-startup --python art/blender/build_items.py
Writes a raw (unpacked) GLB to the temp folder (fv-raw-items.glb) for art/blender/render_icons.py. The game does not
load it: icons ship as images.
"""
import sys, os, math, random, tempfile
sys.path.insert(0, os.path.dirname(__file__))
from style import *

OUT = os.path.join(tempfile.gettempdir(), 'fv-raw-items.glb')
reset_scene()
C = {n: mat('IT ' + n, c, .5) for n, c in {
    'wheat': '#F5C242', 'wheatl': '#FFE07A', 'wheatd': '#D9A02E', 'twine': '#C2412E', 'carrot': '#FF7A1A', 'carrotd': '#E35E10',
    'leaf': '#4FBF3A', 'leafl': '#7BDB4F', 'leafd': '#2F9A3A', 'corn': '#FFD23F', 'cornd': '#F0B020', 'husk': '#A5DB57', 'huskl': '#C8EC7E',
    'pumpkin': '#FF7A1A', 'stem': '#6E8F2A', 'berry': '#E8335A', 'seed': '#FFE680', 'apple': '#E8333A', 'appled': '#B81F2A',
    'peach': '#FF9A6A', 'peachl': '#FFC59A', 'sack': '#EBD3A3', 'sackd': '#C9AE7E', 'feedg': '#D9A441', 'corng': '#FFC83A',
    'bread': '#D98B3A', 'breadl': '#F2B460', 'breadd': '#A8622A', 'cornbread': '#F5BE3A', 'cornbreadd': '#C98A1E', 'cream': '#FFF4DC',
    'frost': '#FFFDF6', 'cake': '#E8A35A', 'caked': '#B87333', 'plate': '#FFFDF6', 'platerim': '#9FD3F0', 'gold': '#F5B21E',
    'goldl': '#FFD866', 'goldd': '#C98A10', 'star': '#FFC83A', 'starl': '#FFE680', 'heart': '#FF4F7B', 'heartl': '#FF8FA8',
    'iron': '#B9C0CC', 'irond': '#5B6477', 'wood': '#C77A3A', 'woodd': '#8A4B25', 'glove': '#F2C14E', 'gloved': '#D99A2B',
    'piecrust': '#E8A35A', 'piecrustd': '#C47B3A', 'filling': '#C2412E', 'egg': '#FFF4DC', 'milk': '#FFFDF6', 'cap': '#35B6F2',
    # item pass (docs/ITEM-ART.md): brighter straw, burlap, a skillet, a nest, label colours
    'wstalk': '#E9B84A', 'wheatg': '#F0A020', 'burlap': '#D08A4A', 'burlapd': '#A9622E', 'burlapl': '#E8B070', 'label1': '#FFD23F',
    'label2': '#FFD23F', 'pellet': '#7A9A3A', 'burlapo': '#A8A65A', 'burlapod': '#7E7C3E', 'burlapol': '#C8C47E', 'hen': '#E8573F', 'cow': '#3A3D4A', 'skillet': '#3A3D4A', 'skilletl': '#5B6477', 'crumb': '#FFD86A', 'board': '#C98A4A',
    'boardd': '#7A4A28', 'flour': '#FFF8EA', 'straw': '#C99A3A', 'strawd': '#8A5A22', 'eggb': '#E9A868', 'eggb2': '#D98C4A',
    'crustl': '#E39A48', 'eggw': '#FFF1D8', 'violet': '#9B6BFF', 'root': '#F2D9A8', 'rootd': '#C9A878'}.items()}

def P(name, r, loc, mt, sub=2, sc=None):
    return ico(name, r, loc, C[mt], subdiv=sub, scale=sc)

items = []
def item(name, parts):
    items.append((name, parts))

# wheat sheaf (item pass): a full bundle of bright stalks tied with a red twine bow, the ears fanned wide at the top so
# the sheaf reads as gold at 48 px, not as a dark brush
def sheaf():
    p = []
    n = 23
    for i in range(n):
        a = i * 2.39996
        k = (i + .5) / n
        r = .2 * math.sqrt(k)
        top = (math.cos(a) * r * 1.9, math.sin(a) * r * 1.9, .98 + .07 * math.sin(i * 1.7))
        p.append(stalk('st', (math.cos(a) * r * .4, math.sin(a) * r * .4, .05), (top[0] * .92, top[1] * .92, top[2] - .12), .024, C['wstalk'], sides=4))
        p.append(spindle('ear', .085, .4, top, C['wheatl' if i % 4 == 0 else 'wheatg' if i % 5 == 0 else 'wheat'], sides=6,
                         lean=(math.cos(a) * r * .9, math.sin(a) * r * .9)))
    p.append(cyl('bundle', .15, .6, (0, 0, .3), C['wstalk'], verts=14, bev=0, radius_top=.13))
    p.append(cyl('cutends', .155, .03, (0, 0, .015), C['wheatd'], verts=14, bev=0))
    p.append(torus('tie', .16, .04, (0, 0, .46), C['twine'], major_segs=14, minor_segs=6))
    for sx in (-1, 1):
        p.append(P('bow', .07, (sx * .1, -.15, .48), 'twine', sub=1, sc=(1.4, .5, .8)))
    p.append(stalk('tail', (0, -.16, .45), (.05, -.2, .25), .02, C['twine'], sides=4))
    return p
item('item_wheat', sheaf())

def carrot():
    p = [cone('root', .17, .85, (0, 0, -.1), C['carrot'], verts=10, rot=(math.pi, 0, 0))]
    for i in range(5):
        a = i / 5 * math.tau
        p.append(leaf('lf', (0, 0, .3), a, .42, .17, C['leaf' if i % 2 else 'leafl'], lift=.38, droop=.05))
    p[0].location.z = .1
    o = join(p, 'tmpc'); o.rotation_euler = (0, math.radians(35), 0)
    return [o]
item('item_carrot', carrot())

def corn():
    p = [spindle('cob', .16, .78, (0, 0, 0), C['corn'], sides=10, mid=(.2, .75))]
    for k in range(5):
        for j in range(10):
            a = j / 10 * math.tau + k * .3
            p.append(P('kern', .035, (math.cos(a) * .15, math.sin(a) * .15, .17 + k * .11), 'cornd' if (j + k) % 4 == 0 else 'corn', sub=0))
    for i in range(3):
        a = i / 3 * math.tau + .4
        p.append(leaf('husk', (0, 0, .02), a, .55, .24, C['husk' if i % 2 else 'huskl'], lift=.36, droop=-.05))
    o = join(p, 'tmpk'); o.rotation_euler = (0, math.radians(40), 0)
    return [o]
item('item_corn', corn())

def pumpkin():
    seg, r = 16, .42
    prof = [(0 if i in (0, 8) else math.cos(-math.pi / 2 + math.pi * i / 8) * r, (math.sin(-math.pi / 2 + math.pi * i / 8) + 1) * r * .75) for i in range(9)]
    o = lathe('pk', prof, (0, 0, 0), C['pumpkin'], segments=seg, smooth_angle=70)
    for v in o.data.vertices:
        k = .5 + .5 * math.cos(math.atan2(v.co.y, v.co.x) * seg / 2)
        v.co.x *= 1 - .1 * k; v.co.y *= 1 - .1 * k
    return [o, cyl('stem', .06, .2, (0, 0, .66), C['stem'], verts=6, bev=0, radius_top=.04, rot=(.3, 0, 0)),
            leaf('lf', (0, 0, .62), 1.0, .32, .22, C['leaf'], lift=.08, droop=.08)]
item('item_pumpkin', pumpkin())

def strawberry():
    o = spindle('berry', .3, -.6, (0, 0, .62), C['berry'], sides=8, mid=(.25, .62))
    p = [o]
    for k in range(3):
        for j in range(7):
            a = j / 7 * math.tau + k * .45
            rr = .27 - k * .06
            p.append(P('seed', .022, (math.cos(a) * rr, math.sin(a) * rr, .5 - k * .14), 'seed', sub=0, sc=(1, 1, 1.6)))
    for i in range(6):
        p.append(leaf('cal', (0, 0, .6), i / 6 * math.tau, .2, .1, C['leaf'], lift=.02, droop=.04))
    p.append(cyl('stem', .025, .12, (0, 0, .66), C['stem'], verts=5, bev=0))
    return p
item('item_strawberry', strawberry())

def fruit(name, mt, mtd, lf=True):
    p = [sphere('f', .4, (0, 0, .4), C[mt], segs=16, rings=10, scale=(1, 1, .92)), cyl('stem', .03, .2, (0, 0, .82), C['woodd'], verts=5, bev=0, rot=(.25, 0, 0))]
    p.append(P('shine', .07, (-.16, -.3, .6), 'cream', sub=1, sc=(1, .5, 1.4)))
    if lf:
        p.append(leaf('lf', (0, 0, .82), .6, .32, .16, C['leaf'], lift=.05, droop=-.03))
    return p
item('item_apple', fruit('apple', 'apple', 'appled'))
item('item_peach', fruit('peach', 'peach', 'peachl'))

def sack(grain, kern, label, emblem, bag=('burlap', 'burlapd', 'burlapl')):
    """A burlap feed sack (item pass): a soft square bag, its top rolled open on a heap of feed, a yellow label on the
    front with a big emblem (a hen's head for chicken feed, a cow's head for cow feed), a few grains spilled at its foot.
    The two sacks differ in hue too: chicken feed warm orange burlap, cow feed olive."""
    body, seam, rimc = bag
    p = [box('sack', (.82, .6, .78), (0, 0, .39), C[body], bev=.17, seg=3),
         box('seam', (.84, .62, .07), (0, 0, .07), C[seam], bev=.03, seg=1)]
    rim = torus('rim', .33, .08, (0, 0, .8), C[rimc], major_segs=16, minor_segs=6); rim.scale = (1.15, .85, 1); p.append(rim)
    p.append(sphere('heap', .32, (0, 0, .8), C[grain], segs=14, rings=8, scale=(1.12, .82, .5)))
    rnd = random.Random(7)
    for i in range(14):
        a = rnd.uniform(0, math.tau); r = rnd.uniform(0, .27)
        p.append(P('k', .045, (math.cos(a) * r * 1.1, math.sin(a) * r * .8, .9 + (.27 - r) * .35), kern, sub=0))
    p.append(box('label', (.5, .04, .38), (0, -.31, .4), C[label], bev=.03, seg=1))
    p += emblem
    for i in range(8):
        a = i * 2.4
        p.append(P('spill', .05, (.38 + math.cos(a) * .14, -.42 + math.sin(a) * .1, .04), kern, sub=0))
    return p
# emblems on the label's front (y about -.335): a red hen's head with a comb and beak; a dark cow's head with ears
hen_mark = [P('head', .11, (0, -.34, .4), 'hen', sub=2, sc=(1, .35, 1)), P('comb', .05, (-.02, -.345, .52), 'redd' if 'redd' in C else 'twine', sub=1, sc=(1.4, .3, .8)),
            cone('beak', .04, .09, (.13, -.345, .39), C['gold'], verts=6, rot=(0, math.pi / 2, 0)), P('eye', .02, (.04, -.39, .43), 'irond', sub=1)]
cow_mark = [P('head', .1, (0, -.34, .38), 'cow', sub=2, sc=(1, .35, 1.15)), P('snout', .07, (0, -.36, .3), 'peachl', sub=1, sc=(1.3, .3, .8)),
            P('earl', .045, (-.13, -.345, .47), 'cow', sub=1, sc=(1.4, .3, .7)), P('earr', .045, (.13, -.345, .47), 'cow', sub=1, sc=(1.4, .3, .7)),
            P('patch', .05, (.04, -.385, .43), 'frost', sub=1, sc=(1, .3, .8))]
item('chicken_feed', sack('feedg', 'feedg', 'label1', hen_mark))
item('cow_feed', sack('pellet', 'pellet', 'label2', cow_mark, bag=('burlapo', 'burlapod', 'burlapol')))

def loaf():
    """Bread (item pass): a crusty loaf and a round roll on a little bread board. The three scores and the flour sit on
    the crust (crust() is the loaf's top surface), the roll is flatter with one slash, the board darker so the loaf pops."""
    cx, cy, rx, ry, cz, rz = -.08, .02, .6, .344, .3, .272
    def crust(x, y):
        return cz + rz * math.sqrt(max(0, 1 - ((x - cx) / rx) ** 2 - ((y - cy) / ry) ** 2))
    p = [box('board', (1.35, .8, .07), (0, 0, .035), C['board'], bev=.03, seg=1),
         box('boardedge', (1.37, .82, .025), (0, 0, .012), C['boardd'], bev=.01, seg=1),
         cyl('handle', .1, .07, (.75, 0, .035), C['board'], verts=10, bev=.02),
         sphere('base', .4, (cx, cy, .2), C['breadd'], segs=16, rings=10, scale=(1.55, .9, .45)),
         sphere('loaf', .4, (cx, cy, cz), C['bread'], segs=18, rings=12, scale=(1.5, .86, .68)),
         sphere('top', .36, (cx, cy, cz + .03), C['crustl'], segs=16, rings=10, scale=(1.45, .8, .66))]
    for x in (-.36, -.1, .16):   # flush pale slashes across the top
        sc = P('score', .09, (x, cy, crust(x, cy) - .004), 'breadl', sub=2, sc=(.45, 2.3, .22)); sc.rotation_euler = (0, 0, .5); p.append(sc)
    rnd = random.Random(5)
    for i in range(12):
        x, y = rnd.uniform(-.45, .3), rnd.uniform(-.12, .16)
        p.append(P('flour', .02, (x, y, crust(x, y) + .004), 'flour', sub=0, sc=(1, 1, .4)))
    p.append(sphere('roll', .2, (.42, -.22, .16), C['bread'], segs=14, rings=8, scale=(1.15, 1, .65)))
    p.append(P('rollcut', .06, (.42, -.22, .29), 'breadl', sub=1, sc=(1.6, .5, .25)))
    return p
item('bread', loaf())
def cornbread():
    """Corn bread (item pass): golden corn bread in a cast-iron skillet, cut in six; one slice is out and rests on the rim,
    so the dark pan shows where it was. A pat of butter melts on top. A short, thick handle (not a magnifier)."""
    p = [cyl('pan', .58, .18, (0, 0, .09), C['skillet'], verts=24, bev=.03, radius_top=.62),
         torus('panrim', .6, .035, (0, 0, .18), C['skilletl'], major_segs=24, minor_segs=4),
         box('handle', (.2, .17, .1), (.7, 0, .15), C['skillet'], bev=.04, seg=1)]
    def wedge(a0, a1, name='slice'):
        pts = [(0, 0)] + [(math.cos(a0 + (a1 - a0) * k / 5) * .52, math.sin(a0 + (a1 - a0) * k / 5) * .52) for k in range(6)]
        return extrude_outline(name, pts, .1, (0, 0, 0), C['cornbread'], bev=.015)
    for k in range(1, 6):   # five slices in the pan (the first sixth is out)
        w = wedge(k * math.pi / 3 + .03, (k + 1) * math.pi / 3 - .03)
        w.rotation_euler = (math.pi / 2, 0, 0); w.location = (0, 0, .22); p.append(w)
        mid = (k + .5) * math.pi / 3
        p.append(P('crumb', .05, (math.cos(mid) * .3, math.sin(mid) * .3, .28), 'crumb', sub=1, sc=(1.6, 1.2, .3)))
    out = wedge(.03, math.pi / 3 - .03, 'out')   # the slice that is out, resting on the rim, tilted toward the camera
    out.rotation_euler = (math.pi / 2 + .35, 0, -.6); out.location = (-.32, -.5, .3); p.append(out)
    p.append(box('butter', (.18, .14, .07), (-.12, .14, .3), C['wheatl'], bev=.03, seg=1, rot=(0, 0, .4)))
    p.append(P('melt', .11, (-.12, .14, .27), 'wheatl', sub=1, sc=(1.3, 1.1, .2)))
    return p
item('corn_bread', cornbread())
def cake():
    p = [cyl('plate', .62, .05, (0, 0, .025), C['plate'], verts=24, bev=0), torus('rim', .6, .025, (0, 0, .05), C['platerim'], major_segs=24, minor_segs=4)]
    p += [cyl('l1', .48, .22, (0, 0, .16), C['cake'], verts=20, bev=.02), cyl('f1', .49, .05, (0, 0, .3), C['frost'], verts=20, bev=.01),
          cyl('l2', .48, .2, (0, 0, .42), C['cake'], verts=20, bev=.02), cyl('f2', .5, .08, (0, 0, .56), C['frost'], verts=20, bev=.03)]
    for i in range(6):
        a = i / 6 * math.tau
        p.append(cone('car', .04, .16, (math.cos(a) * .34, math.sin(a) * .34, .64), C['carrot'], verts=6, rot=(math.pi / 2, 0, a)))
        p.append(P('lf', .03, (math.cos(a) * .27, math.sin(a) * .27, .63), 'leaf', sub=0))
    return p
item('carrot_cake', cake())
def pie():
    p = [cyl('tin', .55, .14, (0, 0, .07), C['iron'], verts=24, bev=.01, radius_top=.62), cyl('fill', .54, .05, (0, 0, .15), C['filling'], verts=24, bev=0),
         torus('crust', .56, .07, (0, 0, .17), C['piecrust'], major_segs=24, minor_segs=6)]
    for i in range(3):
        p.append(box('lat', (1.0, .1, .04), (0, -.3 + i * .3, .2), C['piecrust'], bev=.02, seg=1))
        p.append(box('lat', (.1, 1.0, .04), (-.3 + i * .3, 0, .22), C['piecrustd'], bev=.02, seg=1))
    return p
item('apple_pie', pie())

def coin():
    return [cyl('coin', .45, .12, (0, 0, .45), C['gold'], verts=24, bev=.03, rot=(math.pi / 2, 0, 0)),
            cyl('face', .34, .14, (0, 0, .45), C['goldl'], verts=24, bev=.01, rot=(math.pi / 2, 0, 0)),
            box('mark', (.12, .16, .4), (0, 0, .45), C['goldd'], bev=.03, seg=1)]
item('coin', coin())
def star():
    pts = []
    for i in range(10):
        r = .5 if i % 2 == 0 else .22
        a = math.pi / 2 + i * math.pi / 5
        pts.append((math.cos(a) * r, math.sin(a) * r))
    o = extrude_outline('star', pts, .2, (0, 0, .5), C['star'], bev=.05)
    return [o]
item('xp', star())
def heart():
    pts = []
    for i in range(32):
        t = i / 32 * math.tau
        x = 16 * math.sin(t) ** 3; y = 13 * math.cos(t) - 5 * math.cos(2 * t) - 2 * math.cos(3 * t) - math.cos(4 * t)
        pts.append((x / 34, y / 34))
    return [extrude_outline('heart', pts, .24, (0, 0, .5), C['heart'], bev=.07)]
item('heart', heart())
def sickle():
    p = [cyl('handle', .06, .55, (0, 0, .28), C['wood'], verts=8, bev=.01), cyl('ferrule', .07, .06, (0, 0, .56), C['irond'], verts=8, bev=0)]
    for i in range(10):
        a0, a1 = i / 10 * math.pi * 1.1, (i + 1) / 10 * math.pi * 1.1
        r0 = .3
        p.append(stalk('blade', (math.cos(a0) * r0 - r0, 0, .6 + math.sin(a0) * r0), (math.cos(a1) * r0 - r0, 0, .6 + math.sin(a1) * r0), .045 - i * .003, C['iron'], sides=4))
    o = join(p, 'tmps'); o.rotation_euler = (0, math.radians(-25), 0)
    return [o]
item('sickle', sickle())
def shovel():
    p = [cyl('handle', .045, .9, (0, 0, .75), C['wood'], verts=8, bev=.01), cyl('grip', .09, .07, (0, 0, 1.22), C['woodd'], verts=8, bev=.02, rot=(0, math.pi / 2, 0)),
         box('blade', (.36, .06, .42), (0, 0, .2), C['iron'], bev=.04, seg=2), cone('tip', .18, .14, (0, 0, -.06), C['iron'], verts=4, rot=(math.pi, 0, math.pi / 4)),
         cyl('sock', .07, .16, (0, 0, .45), C['irond'], verts=8, bev=.01)]
    o = join(p, 'tmpv'); o.rotation_euler = (0, math.radians(-30), 0)
    return [o]
item('shovel', shovel())
def glove():
    p = [sphere('palm', .3, (0, 0, .45), C['glove'], segs=14, rings=10, scale=(1, .55, 1.1)), cyl('cuff', .3, .2, (0, 0, .12), C['gloved'], verts=14, bev=.02, radius_top=.26)]
    for i in range(4):
        x = -.2 + i * .135
        p.append(cyl('finger', .07, .32 - abs(i - 1.5) * .04, (x, 0, .78), C['glove'], verts=8, bev=.03))
        p.append(P('tip', .07, (x, 0, .94 - abs(i - 1.5) * .04), 'glove', sub=1))
    p.append(cyl('thumb', .075, .28, (-.3, 0, .5), C['glove'], verts=8, bev=.03, rot=(0, -.9, 0)))
    return p
item('glove', glove())
def egg():
    """Eggs (item pass): three eggs, two brown and one cream, in a round straw nest (warm enough to read on cream panels)."""
    p = [torus('nest', .4, .15, (0, 0, .14), C['straw'], major_segs=18, minor_segs=8),
         cyl('nestbed', .36, .1, (0, 0, .06), C['strawd'], verts=16, bev=0)]
    rnd = random.Random(11)
    for i in range(16):
        a = rnd.uniform(0, math.tau); r = rnd.uniform(.32, .52)
        b = a + rnd.uniform(.5, 1.1)
        p.append(stalk('straw', (math.cos(a) * r, math.sin(a) * r, .2 + rnd.uniform(-.05, .08)), (math.cos(b) * r, math.sin(b) * r, .18 + rnd.uniform(-.05, .1)), .018, C['strawd' if i % 3 else 'straw'], sides=3))
    for (x, y, z, mt, tilt) in ((-.15, .06, .34, 'eggb', .25), (.17, .1, .33, 'eggb2', -.3), (0, -.14, .32, 'eggw', .1)):
        e = sphere('egg', .2, (x, y, z), C[mt], segs=14, rings=10, scale=(1, 1, 1.3)); e.rotation_euler = (tilt, tilt * .5, 0); p.append(e)
    p.append(P('shine', .045, (-.2, -.06, .48), 'cream', sub=1, sc=(1, .6, 1.4)))
    return p
item('item_egg', egg())


def herb_bundle():
    """Healing herb: a tied bunch of sage-green sprigs with violet flower tips."""
    p = []
    for i in range(9):
        a = i / 9 * math.tau; r = .08 + .03 * (i % 2)
        top = (math.cos(a) * r * 2.4, math.sin(a) * r * 2.4, .85 + .06 * math.sin(i))
        p.append(stalk('st', (math.cos(a) * r * .5, math.sin(a) * r * .5, 0), top, .025, C['leafd'], sides=4))
        for k in range(3):
            t = .45 + k * .18
            p.append(leaf('lf', (top[0] * t, top[1] * t, top[2] * t), a + k, .2, .1, C['leaf' if k % 2 else 'leafl'], lift=.06, droop=.04))
        p.append(spindle('fl', .05, .18, top, C['violet'], sides=6))
    p.append(torus('tie', .12, .035, (0, 0, .3), C['twine'], major_segs=12, minor_segs=5))
    return p
item('item_herb', herb_bundle())
def ginseng_root():
    """Ginseng: a pale forked root with fine hairs, its leafy stem and a few red berries."""
    p = [sphere('body', .17, (0, 0, .45), C['root'], segs=14, rings=10, scale=(1, 1, 1.6))]
    for sx, ln in ((-1, .38), (1, .44)):
        p.append(cone('leg', .1, ln, (sx * .1, 0, .2), C['root'], verts=10, rot=(math.pi, sx * .35, 0)))
    for i in range(6):
        a = i * 1.1
        p.append(stalk('hair', (math.cos(a) * .12, math.sin(a) * .12, .35), (math.cos(a) * .3, math.sin(a) * .3, .22), .01, C['rootd'], sides=3))
    p.append(stalk('stem', (0, 0, .7), (0, 0, 1.05), .025, C['stem'], sides=4))
    for i in range(5):
        p.append(leaf('lf', (0, 0, 1.05), i / 5 * math.tau, .3, .14, C['leaf' if i % 2 else 'leafl'], lift=.06, droop=.07))
    for j in range(5):
        a = j * 1.3
        p.append(P('berry', .05, (math.cos(a) * .05, math.sin(a) * .05, 1.12 + (j % 2) * .04), 'apple', sub=2))
    return p
item('item_ginseng', ginseng_root())

objs = []
for name, parts in items:
    o = vc_join(parts, name)
    objs.append(o)
    print(f'{name}: {triangles(o)} triangles')
print('wrote', OUT, export_vc(objs, OUT))
