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
    'piecrust': '#E8A35A', 'piecrustd': '#C47B3A', 'filling': '#C2412E', 'egg': '#FFF4DC', 'milk': '#FFFDF6', 'cap': '#35B6F2'}.items()}

def P(name, r, loc, mt, sub=2, sc=None):
    return ico(name, r, loc, C[mt], subdiv=sub, scale=sc)

items = []
def item(name, parts):
    items.append((name, parts))

# wheat sheaf: a bundle of stalks tied with twine, ears fanned at the top
def sheaf():
    p = []
    rnd = random.Random(3)
    for i in range(13):
        a = i / 13 * math.tau
        r = .05 + .04 * (i % 3)
        lean = (math.cos(a) * .28, math.sin(a) * .28)
        top = (math.cos(a) * r + lean[0] * .55, math.sin(a) * r + lean[1] * .55, .95)
        p.append(stalk('st', (math.cos(a) * r * .6, math.sin(a) * r * .6, 0), top, .02, C['wheatd'], sides=4))
        p.append(spindle('ear', .055, .3, top, C['wheatl' if i % 3 == 0 else 'wheat'], sides=5, lean=(lean[0] * .9, lean[1] * .9)))
    p.append(cyl('tie', .13, .08, (0, 0, .42), C['twine'], verts=12, bev=0))
    p.append(cyl('bundle', .1, .5, (0, 0, .25), C['wheatd'], verts=10, bev=0, radius_top=.11))
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

def sack(grain, kern, band):
    p = [sphere('sack', .42, (0, 0, .38), C['sack'], segs=16, rings=10, scale=(1.05, .85, .95)), cyl('neck', .16, .16, (0, 0, .78), C['sackd'], verts=10, bev=0, radius_top=.24),
         cyl('band', .405, .14, (0, 0, .36), C[band], verts=16, bev=0, radius_top=.4),
         cyl('grain', .23, .05, (0, 0, .87), C[grain], verts=10, bev=0), torus('tie', .16, .03, (0, 0, .74), C['twine'], major_segs=12, minor_segs=5)]
    for i in range(7):
        a = i * 2.4
        p.append(P('k', .05, (.45 + math.cos(a) * .12, -.25 + math.sin(a) * .12, .04), kern, sub=0))
    return p
item('chicken_feed', sack('feedg', 'feedg', 'twine'))
item('cow_feed', sack('corng', 'leafd', 'cap'))

def loaf(mt, mtd, scale=(1.5, .85, .7)):
    p = [sphere('loaf', .4, (0, 0, .3), C[mt], segs=16, rings=10, scale=scale)]
    for i in range(3):
        p.append(box('cut', (.09, .42, .05), (-.25 + i * .25, 0, .5), C['breadl'], bev=.02, seg=1, rot=(-.15, 0, .55)))
    return p
item('bread', loaf('bread', 'breadd'))
def cornbread():
    p = [box('cb', (.9, .7, .36), (0, 0, .18), C['cornbread'], bev=.08, seg=2), box('cbtop', (.86, .66, .06), (0, 0, .37), C['cornbreadd'], bev=.03, seg=1)]
    for i in range(6):
        p.append(P('k', .04, (-.3 + (i % 3) * .3, -.15 + (i // 3) * .3, .41), 'corn', sub=0))
    p.append(cyl('butter', .12, .07, (.1, .05, .43), C['wheatl'], verts=4, bev=.01, rot=(0, 0, .5)))
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
    return [sphere('egg', .32, (0, 0, .42), C['egg'], segs=16, rings=12, scale=(1, 1, 1.3))]
item('item_egg', egg())

objs = []
for name, parts in items:
    o = vc_join(parts, name)
    objs.append(o)
    print(f'{name}: {triangles(o)} triangles')
print('wrote', OUT, export_vc(objs, OUT))
