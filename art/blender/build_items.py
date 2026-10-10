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
    'crustl': '#E39A48', 'eggw': '#FFF1D8', 'dish': '#1FB5B0', 'dishd': '#14857F', 'frostw': '#FFF4DC', 'xpblue': '#2F95EA', 'xpbluel': '#8FD0FF',
    'fruitpeachr': '#FF6A5A', 'orangefd': '#E8771A', 'violet': '#9B6BFF', 'orangef': '#FF9A1F', 'root': '#F2D9A8', 'rootd': '#C9A878',
    # tree pack 2 fruit
    'lemon': '#FFE23A', 'lemonl': '#FFF6A8', 'plum': '#7A3AA8', 'pluml': '#C7A0F0', 'mango': '#FFB22E', 'mangor': '#FF6A3A',
    'grape': '#6A3AA8', 'grapel': '#9A62D8', 'longan': '#D8B070', 'longand': '#B8904E', 'lychee': '#F0425E', 'lycheed': '#C82E4A',
    'lycheew': '#FFF8EE'}.items()}

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
    """Carrot (item pass 2): a smooth lathe root, a little bent, with shallow rings and a bushy top of leaflets."""
    prof = [(0, -.5), (.07, -.42), (.1, -.3), (.14, -.15), (.165, 0), (.18, .15), (.17, .28), (0, .32)]
    o = lathe('root', [(r, z + .5) for r, z in prof], (0, 0, 0), C['carrot'], segments=20, smooth_angle=180)
    p = [o]
    for z in (.2, .35, .5, .65):
        p.append(torus('ring', .12 + z * .07, .012, (0, 0, z), C['carrotd'], major_segs=16, minor_segs=3))
    for i in range(3):
        a = i / 3 * math.tau + .3
        p.append(stalk('stem', (0, 0, .8), (math.cos(a) * .12, math.sin(a) * .12, 1.15), .025, C['leafd'], sides=4))
        for k in range(3):
            p.append(P('leaflet', .08, (math.cos(a) * (.08 + k * .03), math.sin(a) * (.08 + k * .03), 1.0 + k * .08), 'leaf' if k % 2 else 'leafl', sub=1, sc=(1, .45, .6)))
    o2 = join(p, 'tmpc2'); o2.rotation_euler = (0, math.radians(30), 0)
    return [o2]
item('item_carrot', carrot())

def corn():
    """Corn (item pass 2): a fat golden cob in neat kernel rows, its green husk peeled back in three leaves."""
    p = [lathe('cob', [(0, 0), (.13, .05), (.17, .25), (.17, .6), (.12, .82), (0, .88)], (0, 0, 0), C['corn'], segments=16, smooth_angle=180)]
    for k in range(7):
        for j in range(10):
            a = j / 10 * math.tau + (k % 2) * .31
            z = .12 + k * .1; r = .17 if .2 < z < .65 else .14
            p.append(P('kern', .04, (math.cos(a) * r, math.sin(a) * r, z), 'cornd' if (j + k) % 5 == 0 else 'corn', sub=1, sc=(1, 1, .8)))
    for i in range(3):
        a = i / 3 * math.tau + .5
        p.append(leaf('husk', (0, 0, .05), a, .62, .3, C['husk' if i % 2 else 'huskl'], lift=.32, droop=.1))
    o = join(p, 'tmpk2'); o.rotation_euler = (0, math.radians(35), 0)
    return [o]
item('item_corn', corn())

def pumpkin():
    """Pumpkin (item pass 2): deep ten-lobed body with a dimpled top, a thick curly stem and a leaf."""
    seg, r = 30, .44
    prof = [(0 if i in (0, 10) else math.cos(-math.pi / 2 + math.pi * i / 10) * r, (math.sin(-math.pi / 2 + math.pi * i / 10) + 1) * r * .74) for i in range(11)]
    o = lathe('pk', prof, (0, 0, 0), C['pumpkin'], segments=seg, smooth_angle=180)
    for v in o.data.vertices:
        f = 1 - .16 * abs(math.cos(5 * math.atan2(v.co.y, v.co.x))) ** .6
        v.co.x *= f; v.co.y *= f
        if v.co.z > r * 1.35 and math.hypot(v.co.x, v.co.y) < .12: v.co.z -= .05
    return [o, cyl('stem', .07, .22, (0, 0, .68), C['stem'], verts=8, bev=0, radius_top=.05, rot=(.35, 0, 0)),
            leaf('lf', (0, 0, .64), 1.0, .38, .26, C['leaf'], lift=.1, droop=.08), leaf('lf2', (0, 0, .64), 3.6, .3, .2, C['leafl'], lift=.08, droop=.06)]
item('item_pumpkin', pumpkin())

def strawberry():
    """Strawberry (item pass 2): a smooth heart-shaped berry with yellow seeds and a leafy green cap."""
    prof = [(0, 0), (.1, .06), (.22, .25), (.3, .5), (.29, .62), (.2, .7), (0, .72)]
    p = [lathe('berry', prof, (0, 0, 0), C['berry'], segments=20, smooth_angle=180)]
    for k in range(4):
        for j in range(7):
            a = j / 7 * math.tau + k * .45
            z = .15 + k * .14; rr = [.13, .22, .28, .29][k] + .005
            p.append(P('seed', .022, (math.cos(a) * rr, math.sin(a) * rr, z), 'seed', sub=1, sc=(1, 1, 1.5)))
    for i in range(7):
        p.append(leaf('cal', (0, 0, .7), i / 7 * math.tau, .24, .12, C['leaf' if i % 2 else 'leafd'], lift=.02, droop=.05))
    p.append(cyl('stem', .03, .14, (0, 0, .78), C['stem'], verts=6, bev=0))
    return p
item('item_strawberry', strawberry())

def fruit(name, mt, mtd, lf=True, kind='apple'):
    """Round fruit (item pass 2): dimpled poles; the peach has a suture crease and a soft point, the apple a gloss dot."""
    o = sphere('f', .4, (0, 0, .4), C[mt], segs=20, rings=12, scale=(1, 1, .92))
    for v in o.data.vertices:
        if abs(v.co.z) > .3 and math.hypot(v.co.x, v.co.y) < .14: v.co.z *= .88
        if kind == 'peach' and v.co.y < 0 and abs(v.co.x) < .06: v.co.y *= .9
        if kind == 'peach' and v.co.z > .34: v.co.z += .03
    p = [o, cyl('stem', .03, .2, (0, 0, .82), C['woodd'], verts=6, bev=0, rot=(.25, 0, 0))]
    if kind == 'apple': p.append(P('shine', .07, (-.16, -.3, .6), 'cream', sub=1, sc=(1, .5, 1.4)))
    if lf: p.append(leaf('lf', (0, 0, .82), .6, .34, .17, C['leaf'], lift=.05, droop=-.03))
    return p
item('item_apple', fruit('apple', 'apple', 'appled'))
item('item_peach', fruit('peach', 'peach', 'fruitpeachr', kind='peach'))
item('item_orange', fruit('orange', 'orangef', 'orangefd', kind='orange'))
def coconut():
    """A coconut: a hairy brown husk ball, one half cracked open to the white flesh."""
    return [sphere('husk', .36, (-.18, 0, .36), C['woodd'], segs=16, rings=10), sphere('half', .3, (.32, -.1, .2), C['woodd'], segs=14, rings=8, scale=(1, 1, .6)),
            cyl('flesh', .25, .04, (.32, -.1, .37), C['egg'], verts=16, bev=0), P('eye', .04, (-.18, -.3, .5), 'woodd', sub=1)]
item('item_coconut', coconut())

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
    """Carrot cake (item pass 2): a whole cake with one slice cut out so the layers show, on a teal plate."""
    p = [cyl('plate', .66, .05, (0, 0, .025), C['dish'], verts=28, bev=0), torus('rim', .64, .03, (0, 0, .05), C['dishd'], major_segs=28, minor_segs=4)]
    def ring(a0, a1, r, z0, h, mt, name):
        pts = [(0, 0)] + [(math.cos(a0 + (a1 - a0) * k / 16) * r, math.sin(a0 + (a1 - a0) * k / 16) * r) for k in range(17)]
        o = extrude_outline(name, pts, h, (0, 0, 0), C[mt], bev=0); o.rotation_euler = (math.pi / 2, 0, 0); o.location = (0, 0, z0 + h / 2); return o
    a0, a1 = .5, .5 + math.tau * 5 / 6
    for z0, h, mt in ((.05, .16, 'cake'), (.21, .04, 'eggw'), (.25, .16, 'cake'), (.41, .07, 'frostw')):
        p.append(ring(a0, a1, .5, z0, h, mt, 'layer'))
    for i in range(6):
        a = a0 + (a1 - a0) * (i + .5) / 6
        p.append(cone('car', .045, .18, (math.cos(a) * .34, math.sin(a) * .34, .52), C['carrot'], verts=6, rot=(math.pi / 2, 0, a)))
        p.append(P('lf', .035, (math.cos(a) * .27, math.sin(a) * .27, .51), 'leaf', sub=1))
    return p
item('carrot_cake', cake())
def pie():
    """Apple pie (item pass 2): a fluted teal dish, a crimped golden crust and a lattice with apple peeking through."""
    p = [cyl('dish', .6, .16, (0, 0, .08), C['dish'], verts=28, bev=.02, radius_top=.66), cyl('fill', .56, .05, (0, 0, .17), C['filling'], verts=28, bev=0)]
    for i in range(24):
        a = i / 24 * math.tau
        p.append(P('crimp', .07, (math.cos(a) * .58, math.sin(a) * .58, .21), 'piecrust' if i % 2 else 'piecrustd', sub=1, sc=(1, 1, .7)))
    for i in range(3):
        p.append(box('lat', (1.0, .1, .04), (0, -.3 + i * .3, .22), C['piecrust'], bev=.02, seg=1))
        p.append(box('lat', (.1, 1.0, .04), (-.3 + i * .3, 0, .24), C['piecrustd'], bev=.02, seg=1))
    for x, y in ((-.15, -.15), (.15, .15), (.15, -.15), (-.15, .15)):
        p.append(P('apple', .05, (x, y, .2), 'wheatl', sub=1, sc=(1, 1, .5)))
    return p
item('apple_pie', pie())

def coin():
    """Coin (item pass 2): a thick gold coin with a raised rim and an embossed wheat ear (not a bar)."""
    p = [cyl('coin', .45, .16, (0, 0, .45), C['gold'], verts=40, bev=.03, rot=(math.pi / 2, 0, 0)),
         cyl('face', .35, .17, (0, 0, .45), C['goldl'], verts=40, bev=.01, rot=(math.pi / 2, 0, 0)),
         torus('rimring', .4, .035, (0, 0, .45), C['goldd'], major_segs=40, minor_segs=4, rot=(math.pi / 2, 0, 0))]
    p.append(stalk('stalk', (0, -.1, .25), (0, -.1, .62), .025, C['goldd'], sides=4))
    for k in range(4):
        for sx in (-1, 1):
            p.append(P('grain', .045, (sx * .05, -.1, .48 + k * .06), 'goldd', sub=1, sc=(.7, .5, 1.1)))
    return p
item('coin', coin())
def star():
    """XP star (item pass 2): a domed blue star with a gold rim, so it never reads as a coin."""
    def outline(r1, r2):
        return [(math.cos(math.pi / 2 + i * math.pi / 5) * (r1 if i % 2 == 0 else r2), math.sin(math.pi / 2 + i * math.pi / 5) * (r1 if i % 2 == 0 else r2)) for i in range(10)]
    return [extrude_outline('rim', outline(.52, .23), .2, (0, 0, .5), C['gold'], bev=.06),
            extrude_outline('face', outline(.42, .19), .26, (0, 0, .5), C['xpblue'], bev=.05),
            P('dome', .14, (0, -.12, .5), 'xpbluel', sub=2, sc=(1, .5, 1))]
item('xp', star())
def heart():
    """Heart (item pass 2): a puffy pillow heart, deeper red at the tip, with a soft highlight."""
    pts = []
    for i in range(40):
        t = i / 40 * math.tau
        x = 16 * math.sin(t) ** 3; y = 13 * math.cos(t) - 5 * math.cos(2 * t) - 2 * math.cos(3 * t) - math.cos(4 * t)
        pts.append((x / 34, y / 34))
    return [extrude_outline('heart', pts, .26, (0, 0, .5), C['heart'], bev=.1),
            extrude_outline('front', [(x * .8, y * .8 + .03) for x, y in pts], .34, (0, 0, .5), C['heartl'], bev=.06),
            P('shine', .07, (-.2, -.2, .66), 'cream', sub=1, sc=(1.2, .5, .8))]
item('heart', heart())
def sickle():
    """Sickle (tool:harvest): a thick wooden handle with a green grip sleeve and a bright crescent blade."""
    p = [cyl('handle', .07, .55, (0, 0, .28), C['wood'], verts=10, bev=.01), cyl('grip', .085, .25, (0, 0, .15), C['leafd'], verts=10, bev=.02),
         cyl('ferrule', .08, .06, (0, 0, .56), C['irond'], verts=10, bev=0)]
    for i in range(12):
        a0, a1 = i / 12 * math.pi * 1.1, (i + 1) / 12 * math.pi * 1.1
        r0 = .3
        p.append(stalk('blade', (math.cos(a0) * r0 - r0, 0, .6 + math.sin(a0) * r0), (math.cos(a1) * r0 - r0, 0, .6 + math.sin(a1) * r0), .055 - i * .003, C['iron'], sides=4))
    o = join(p, 'tmps'); o.rotation_euler = (0, math.radians(-25), 0)
    return [o]
item('sickle', sickle())
def shovel():
    """Shovel (tool:clear): a thick handle with a red grip, a D-grip top and a bright steel blade with dirt on the tip."""
    p = [cyl('handle', .065, .9, (0, 0, .75), C['wood'], verts=10, bev=.01), cyl('grip', .08, .25, (0, 0, 1.05), C['twine'], verts=10, bev=.02),
         torus('dgrip', .11, .03, (0, 0, 1.28), C['woodd'], major_segs=12, minor_segs=4, rot=(math.pi / 2, 0, 0)),
         box('blade', (.38, .06, .44), (0, 0, .2), C['iron'], bev=.04, seg=2), cone('tip', .19, .14, (0, 0, -.06), C['iron'], verts=4, rot=(math.pi, 0, math.pi / 4)),
         box('dirt', (.3, .07, .1), (0, 0, .02), C['woodd'], bev=.03, seg=1), cyl('sock', .075, .16, (0, 0, .45), C['irond'], verts=8, bev=.01)]
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

def juice(color):
    """A juice bottle: a glass bottle of coloured juice with a cream label and a red cap, a little fruit slice beside it."""
    return [cyl('juice', .24, .62, (0, 0, .31), C[color], verts=16, bev=.04), cyl('glass', .23, .1, (0, 0, .67), C['milk'], verts=16, bev=.02),
            cyl('neck', .1, .2, (0, 0, .82), C['milk'], verts=12, bev=0, radius_top=.08), cyl('cap', .1, .1, (0, 0, .96), C['twine'], verts=12, bev=.02),
            cyl('label', .245, .2, (0, 0, .4), C['cream'], verts=16, bev=0), P('slice', .16, (.34, -.18, .08), color, sub=2, sc=(1, 1, .35))]
item('item_apple_juice', juice('apple'))
item('item_carrot_juice', juice('carrot'))
item('item_orange_juice', juice('orangef'))
def noodle_bundle():
    """Noodles: a bundle of pale noodles tied with a red band, a few loose strands, on a little bamboo mat."""
    p = [box('mat', (1.0, .7, .04), (0, 0, .02), C['wheat'], bev=.02, seg=1)]
    for i in range(14):
        a = i / 14 * math.tau
        p.append(stalk('n', (math.cos(a) * .12 - .4, math.sin(a) * .08, .12), (math.cos(a) * .12 + .4, math.sin(a) * .08, .12), .03, C['cream' if i % 2 else 'wheatl'], sides=4))
    p.append(torus('band', .16, .04, (0, 0, .12), C['twine'], major_segs=12, minor_segs=5, rot=(0, math.pi / 2, 0)))
    return p
item('item_noodles', noodle_bundle())
def noodle_cup():
    """Instant noodles: a red and cream cup with a peeled-back lid, steam-free, a fork on top."""
    return [cyl('cup', .34, .6, (0, 0, .3), C['twine'], verts=20, bev=.02, radius_top=.4), cyl('band', .38, .18, (0, 0, .42), C['cream'], verts=20, bev=0, radius_top=.39),
            cyl('noodle', .37, .04, (0, 0, .6), C['wheatl'], verts=20, bev=0), box('lid', (.5, .46, .02), (.1, .2, .68), C['cream'], bev=.01, seg=1, rot=(.6, 0, .3)),
            P('egg', .1, (-.12, -.08, .64), 'egg', sub=1, sc=(1, 1, .4)), P('herb', .06, (.12, -.12, .63), 'leaf', sub=1, sc=(1, 1, .3))]
item('item_instant_noodles', noodle_cup())

def almanac():
    """Today (ui:today): a tear-off wall almanac with a red header, a big day page and a sunflower tucked in."""
    p = [box('board', (.8, .1, 1.0), (0, 0, .5), C['wood'], bev=.04, seg=1), box('header', (.82, .12, .25), (0, 0, .92), C['apple'], bev=.04, seg=1),
         box('page', (.7, .04, .62), (0, -.07, .45), C['cream'], bev=.02, seg=1), box('page2', (.7, .03, .6), (.02, -.04, .44), C['sack'], bev=.02, seg=1)]
    for x in (-.2, 0, .2):
        p.append(cyl('ring', .04, .06, (x, -.06, 1.05), C['irond'], verts=8, bev=0, rot=(math.pi / 2, 0, 0)))
    p += [box('num1', (.08, .03, .3), (-.1, -.1, .45), C['twine'], bev=.01, seg=1), box('num2', (.2, .03, .07), (.08, -.1, .58), C['twine'], bev=.01, seg=1),
          box('num3', (.2, .03, .07), (.08, -.1, .45), C['twine'], bev=.01, seg=1), box('num4', (.2, .03, .07), (.08, -.1, .32), C['twine'], bev=.01, seg=1)]
    for i in range(10):
        a = i / 10 * math.tau
        p.append(P('petal', .07, (.38 + math.cos(a) * .1, -.14, .15 + math.sin(a) * .1), 'gold', sub=1, sc=(1, .3, 1)))
    p.append(P('core', .06, (.38, -.16, .15), 'woodd', sub=1, sc=(1, .4, 1)))
    return p
item('ui_today', almanac())
def postbox():
    """Mail (ui:mail): a red postbox on a post with an envelope peeking out of the slot."""
    return [cyl('post', .06, .6, (0, 0, .3), C['wood'], verts=8, bev=0), box('box', (.55, .4, .42), (0, 0, .8), C['apple'], bev=.08, seg=2),
            cyl('roof', .2, .55, (0, 0, 1.01), C['appled'], verts=12, bev=0, rot=(0, math.pi / 2, 0)), box('slot', (.3, .02, .05), (0, -.21, .85), C['irond'], bev=0, seg=1),
            box('envelope', (.32, .02, .2), (0, -.24, .92), C['cream'], bev=.01, seg=1, rot=(.25, 0, 0)), box('seal', (.07, .025, .07), (0, -.26, .9), C['apple'], bev=.01, seg=1, rot=(.25, 0, 0)),
            box('flag', (.04, .2, .18), (.3, 0, .92), C['gold'], bev=.01, seg=1)]
item('ui_mail', postbox())
def crowbar():
    """Demolish (tool:demolish): a red crowbar over a split plank (never a mallet)."""
    p = [box('plank1', (.9, .22, .1), (-.15, 0, .3), C['wstalk'], bev=.03, seg=1, rot=(0, .3, .2)), box('plank2', (.5, .22, .1), (.45, .05, .2), C['wood'], bev=.03, seg=1, rot=(0, -.4, -.3))]
    p.append(stalk('bar', (-.45, -.1, .05), (.45, -.1, .95), .05, C['apple'], sides=6))
    p.append(stalk('hook', (.45, -.1, .95), (.6, -.1, .85), .05, C['apple'], sides=6))
    p.append(stalk('claw', (-.45, -.1, .05), (-.55, -.1, .12), .045, C['iron'], sides=6))
    for x, z in ((.05, .5), (.2, .42)):
        p.append(P('splinter', .04, (x, -.05, z), 'wstalk', sub=0, sc=(1, .4, 2)))
    return p
item('tool_demolish', crowbar())
def harvest_basket():
    """Harvest all (ui:harvest_all): a woven basket heaped with wheat, a carrot, corn and a little pumpkin."""
    p = [cyl('basket', .45, .38, (0, 0, .19), C['wood'], verts=16, bev=.03, radius_top=.52), torus('rim', .5, .05, (0, 0, .38), C['wstalk'], major_segs=16, minor_segs=5)]
    for k in range(3):
        p.append(torus('weave', .47 + k * .015, .015, (0, 0, .1 + k * .1), C['woodd'], major_segs=16, minor_segs=3))
    p.append(stalk('handle', (-.45, 0, .38), (0, 0, .95), .04, C['wstalk'], sides=5)); p.append(stalk('handle2', (0, 0, .95), (.45, 0, .38), .04, C['wstalk'], sides=5))
    for i in range(6):
        a = i * 1.05
        p.append(stalk('ws', (-.15, .1, .4), (-.2 + math.cos(a) * .12, .1 + math.sin(a) * .08, .78), .02, C['wstalk'], sides=3))
        p.append(P('ear', .05, (-.2 + math.cos(a) * .12, .1 + math.sin(a) * .08, .8), 'wheat', sub=1, sc=(1, 1, 1.8)))
    p += [P('pumpkin', .16, (.18, -.12, .48), 'pumpkin', sub=2, sc=(1.1, 1.1, .8)), P('corn', .08, (.0, -.2, .5), 'corn', sub=2, sc=(1, 1, 2.2)),
          cone('carrot', .07, .4, (-.25, -.15, .52), C['carrot'], verts=8, rot=(1.2, 0, .5))]
    return p
item('ui_harvest_all', harvest_basket())

# tree pack 2 fruit (goods icons): lemon, plum, mango, a grape bunch, a longan sprig, a lychee sprig
def lemon_fruit():
    """A lemon: a bright oval with pointed ends, a gloss dot and a leaf."""
    o = sphere('f', .34, (-.12, 0, .34), C['lemon'], segs=18, rings=12, scale=(1.35, 1, 1))
    p = [o, P('tipl', .08, (-.6, 0, .34), 'lemon', sub=1), P('tipr', .08, (.36, 0, .34), 'lemon', sub=1),
         P('shine', .07, (-.3, -.3, .5), 'lemonl', sub=1, sc=(1.4, .5, 1))]
    p.append(leaf('lf', (-.2, 0, .66), .4, .34, .16, C['leaf'], lift=.05, droop=-.03))
    return p
item('item_lemon', lemon_fruit())
def plum_fruit():
    """Two plums: deep purple with a soft bloom highlight and a crease, one stalk and leaf."""
    p = []
    for x, s in ((-.18, 1), (.26, .85)):
        o = sphere('f', .3 * s, (x, 0, .3 * s), C['plum'], segs=18, rings=12)
        p += [o, P('bloom', .06 * s, (x - .1, -.24 * s, .4 * s), 'pluml', sub=1, sc=(1, .5, 1.5))]
    p += [cyl('stem', .025, .16, (-.18, 0, .64), C['woodd'], verts=6, bev=0, rot=(.3, 0, 0)), leaf('lf', (-.18, 0, .66), .8, .3, .14, C['leaf'], lift=.05, droop=-.03)]
    return p
item('item_plum', plum_fruit())
def mango_fruit():
    """A mango: a fat kidney shape blushing from gold to orange-red, short stalk and a long leaf."""
    o = sphere('f', .34, (0, 0, .32), C['mango'], segs=18, rings=12, scale=(1.4, .95, 1))
    for v in o.data.vertices:
        v.co.z += .06 * (v.co.x / .34) ** 2 * (1 if v.co.z > 0 else -1)
    p = [o, sphere('blush', .33, (.1, -.01, .33), C['mangor'], segs=18, rings=12, scale=(1.3, .96, 1.0)), cyl('stem', .03, .12, (-.4, 0, .5), C['woodd'], verts=6, bev=0),
         leaf('lf', (-.4, 0, .58), 2.6, .5, .14, C['leafd'], lift=.05, droop=.05)]
    return p
item('item_mango', mango_fruit())
def bunch(mt, mt2, r, rows, stem=True):
    p = [cyl('stalk', .025, .25, (0, 0, .95), C['woodd'], verts=6, bev=0)] if stem else []
    for row, m in enumerate(rows):
        for j in range(m):
            a = j / m * math.tau + row * .6; rr = r * (m - 1) * .62
            p.append(P('b', r, (math.cos(a) * rr, math.sin(a) * rr, .9 - row * r * 1.55), mt if (row + j) % 3 else mt2, sub=2))
    return p
def grapes():
    """A grape bunch: purple berries in narrowing rows, a woody stalk and a big vine leaf."""
    return bunch('grape', 'grapel', .1, (5, 5, 4, 3, 2, 1)) + [leaf('lf', (0, 0, 1.08), .5, .4, .32, C['leaf'], lift=.05, droop=.05)]
item('item_grape', grapes())
def longan_sprig():
    """A longan sprig: small tan round fruit on a branching twig, one peeled to its glassy white flesh."""
    p = bunch('longan', 'longand', .16, (5, 4, 3, 1)) + [P('peeled', .14, (.36, -.3, .3), 'lycheew', sub=2), P('seed', .055, (.36, -.42, .33), 'woodd', sub=1)]
    return p + [leaf('lf', (0, 0, 1.1), 2.2, .36, .14, C['leafd'], lift=.05, droop=.05)]
item('item_longan', longan_sprig())
def lychee_sprig():
    """A lychee sprig: rosy-red bumpy fruit on a twig, one opened to the white flesh."""
    p = bunch('lychee', 'lycheed', .16, (5, 4, 3, 1))
    for o in p[1:]:
        for v in o.data.vertices:
            if hash((round(v.co.x, 3), round(v.co.y, 3))) % 3 == 0: v.co *= 1.06
    return p + [P('open', .14, (.36, -.3, .3), 'lycheew', sub=2), leaf('lf', (0, 0, 1.1), 2.2, .36, .14, C['leaf'], lift=.05, droop=.05)]
item('item_lychee', lychee_sprig())

# ---- meadow and dairy (v0.5, docs/MEADOW-DAIRY-SCOPE.md): goat feed, goat milk, butter, cheese
C.update({n: mat('IT ' + n, c, .5) for n, c in {'goat': '#E9E2D2', 'goatd': '#8A7B68', 'horn': '#C9A878', 'burlapg': '#7FB8A8', 'burlapgd': '#4E8E7E', 'burlapgl': '#A8D8C8',
    'oat': '#E8D08A', 'capg': '#9B6BFF', 'labelg': '#EAD9FF', 'butter': '#FFE066', 'butterl': '#FFF2A8', 'butterd': '#E8B93A', 'paperw': '#FFFDF6',
    'cheese': '#FFC83A', 'cheesel': '#FFE07A', 'cheesed': '#E89A1E', 'rind': '#F08A2E'}.items()})
goat_mark = [P('head', .1, (0, -.34, .38), 'goat', sub=2, sc=(.9, .35, 1.2)), P('snout', .06, (0, -.36, .29), 'goatd', sub=1, sc=(1.1, .3, .7)),
             P('earl', .045, (-.14, -.345, .42), 'goat', sub=1, sc=(1.6, .3, .6)), P('earr', .045, (.14, -.345, .42), 'goat', sub=1, sc=(1.6, .3, .6)),
             cone('hornl', .03, .14, (-.06, -.345, .54), C['horn'], verts=6, rot=(0, -.35, 0)), cone('hornr', .03, .14, (.06, -.345, .54), C['horn'], verts=6, rot=(0, .35, 0)),
             P('beard', .035, (0, -.36, .22), 'goatd', sub=1, sc=(.7, .3, 1.4))]
item('goat_feed', sack('oat', 'oat', 'label1', goat_mark, bag=('burlapg', 'burlapgd', 'burlapgl')))

def goat_milk():
    """Goat milk: a squat round-shouldered bottle with a violet cap and a lilac label carrying the goat's head, so it
    never reads as the tall blue-capped cow's milk."""
    p = [cyl('body', .3, .62, (0, 0, .31), C['milk'], verts=16, bev=.06), sphere('shoulder', .3, (0, 0, .62), C['milk'], segs=16, rings=8, scale=(1, 1, .6)),
         cyl('neck', .14, .22, (0, 0, .86), C['milk'], verts=12, bev=.02), cyl('cap', .17, .1, (0, 0, 1.0), C['capg'], verts=12, bev=.03),
         box('label', (.4, .05, .3), (0, -.28, .34), C['labelg'], bev=.03, seg=1), P('shine', .05, (-.17, -.2, .62), 'cream', sub=1, sc=(1, .6, 1.6))]
    return p + [P('head', .08, (0, -.31, .34), 'goat', sub=2, sc=(.9, .35, 1.2)), P('earl', .036, (-.11, -.312, .37), 'goat', sub=1, sc=(1.6, .3, .6)),
                P('earr', .036, (.11, -.312, .37), 'goat', sub=1, sc=(1.6, .3, .6)), cone('hornl', .024, .11, (-.05, -.312, .46), C['horn'], verts=6, rot=(0, -.35, 0)),
                cone('hornr', .024, .11, (.05, -.312, .46), C['horn'], verts=6, rot=(0, .35, 0)), P('snout', .045, (0, -.325, .27), 'goatd', sub=1, sc=(1.1, .3, .7))]
item('goat_milk', goat_milk())

def butter():
    """Butter: a golden block on a blue-rimmed dish, half out of its white paper, with one pat cut off."""
    return [cyl('dishrim', .62, .06, (0, 0, .03), C['platerim'], verts=20, bev=.02), cyl('dish', .54, .05, (0, 0, .07), C['plate'], verts=20, bev=.01),
            box('paper', (.78, .5, .04), (-.08, 0, .11), C['paperw'], bev=.01, seg=1), box('block', (.6, .38, .3), (-.08, 0, .27), C['butter'], bev=.05, seg=2),
            box('top', (.5, .28, .03), (-.08, 0, .42), C['butterl'], bev=.01, seg=1), box('wrap', (.24, .42, .34), (-.3, 0, .28), C['paperw'], bev=.04, seg=1),
            box('pat', (.12, .34, .26), (.34, .02, .22), C['butter'], bev=.03, seg=1, rot=(0, .25, .12)), box('patface', (.02, .28, .2), (.28, .02, .24), C['butterd'], bev=0, seg=1, rot=(0, .25, .12)),
            P('shine', .045, (-.22, -.12, .44), 'cream', sub=1, sc=(1.8, .8, .3))]
item('butter', butter())

def cheese():
    """Cheese: a fat wedge cut from a wheel with an orange rind, holes on the cut faces, a crumb beside it."""
    p = [extrude_outline('wedge', [(-.5, 0), (.5, 0), (.5, .42), (-.5, .3)], .56, (0, 0, 0), C['cheese'], bev=.04),
         box('rind', (.07, .6, .44), (.52, 0, .22), C['rind'], bev=.03, seg=1), box('toplight', (.9, .5, .02), (0, 0, .385), C['cheesel'], bev=0, seg=1, rot=(0, -.12, 0))]
    for (x, z, r) in ((-.2, .14, .075), (.12, .2, .095), (.3, .08, .06), (-.02, .06, .05)):
        p.append(P('hole', r, (x, -.285, z), 'cheesed', sub=1, sc=(1, .25, 1)))
    p += [P('crumb', .07, (-.5, -.42, .06), 'cheese', sub=1, sc=(1.2, 1, .8)), P('crumb2', .045, (-.34, -.5, .04), 'cheesel', sub=1)]
    return p
item('cheese', cheese())

# ---- more vegetables (v0.5): tomato, potato, cabbage, onion, chili
C.update({n: mat('IT ' + n, c, .5) for n, c in {'tomato': '#F03A2E', 'tomatol': '#FF7A5A', 'potato': '#D9B27A', 'potatod': '#B08A52', 'cabbage': '#BFE68A', 'cabbaged': '#7FC24A',
    'cabbagel': '#E6F7C0', 'onion': '#B05AC8', 'onionl': '#E8C8F0', 'oniond': '#7E3A9A', 'chili': '#F03A2E', 'chilid': '#C21F1F'}.items()})
def tomato_item():
    """Two ripe tomatoes on the vine, each with a green star calyx."""
    p = []
    for (x, y, z, r) in ((-.2, 0, .34, .34), (.3, .08, .27, .27)):
        p += [sphere('tomato', r, (x, y, z), C['tomato'], segs=16, rings=10, scale=(1, 1, .88)), P('shine', r * .2, (x - r * .4, y - r * .45, z + r * .4), 'tomatol', sub=1)]
        for i in range(5):
            a = i * math.tau / 5
            p.append(leaf('calyx', (x, y, z + r * .82), a, r * .5, r * .2, C['leafd'], lift=.02, droop=.1))
        p.append(cyl('stalk', .03, .14, (x, y, z + r * .9), C['leafd'], verts=6, bev=0))
    p.append(stalk('vine', (-.2, 0, .74), (.3, .08, .62), .025, C['leafd']))
    return p
item('tomato', tomato_item())

def potato_item():
    """Three potatoes: tan lumps with darker eyes, one cut to show its pale inside."""
    p = []
    for (x, y, z, sc, rot) in ((-.2, .05, .22, (1.45, 1, .85), .3), (.28, -.1, .18, (1.2, .95, .8), -.5), (.05, .3, .17, (1.1, .9, .78), 1.2)):
        o = sphere('potato', .24, (x, y, z), C['potato'], segs=14, rings=9, scale=sc); o.rotation_euler = (0, 0, rot); p.append(o)
        for k in range(3):
            p.append(P('eye', .03, (x - .1 + k * .1, y - .2, z + .08 - k * .03), 'potatod', sub=0))
    return p
item('potato', potato_item())

def cabbage_item():
    """A cabbage: a pale round head in a collar of darker outer leaves."""
    p = [sphere('head', .42, (0, 0, .42), C['cabbage'], segs=18, rings=12, scale=(1, 1, .9)), sphere('cap', .3, (.03, -.03, .62), C['cabbagel'], segs=14, rings=8, scale=(1, 1, .6))]
    for i in range(6):
        a = i * math.tau / 6
        p.append(leaf('outer', (0, 0, .08), a, .62, .5, C['cabbaged'], lift=.3, droop=.02))
    for i in range(3):
        a = i * 2.1 + .5
        p.append(stalk('vein', (0, 0, .5), (math.cos(a) * .3, math.sin(a) * .3 - .1, .78), .015, C['cabbagel']))
    return p
item('cabbage', cabbage_item())

def onion_item():
    """A purple onion with papery pale shoulders and green shoots, a second one behind it."""
    p = []
    for (x, y, z, r) in ((-.12, 0, .32, .32), (.32, .2, .24, .24)):
        p += [sphere('bulb', r, (x, y, z), C['onion'], segs=16, rings=10, scale=(1, 1, .9)), sphere('top', r * .5, (x, y, z + r * .7), C['onionl'], segs=10, rings=6, scale=(1, 1, .9)),
              P('shine', r * .2, (x - r * .45, y - r * .4, z + r * .3), 'onionl', sub=1), cyl('roots', r * .25, .05, (x, y, .02), C['oniond'], verts=8, bev=0)]
        for i in range(3):
            p.append(stalk('shoot', (x, y, z + r), (x + (i - 1) * .12, y + .04 * i, z + r + .42 - i * .05), .035, C['leaf' if i % 2 else 'leafl'], rt=.012))
    return p
item('onion', onion_item())

def chili_item():
    """Three red chili pods, curved, with green caps."""
    p = []
    for k, (x, y, yaw) in enumerate(((-.25, 0, .2), (.05, .05, -.1), (.32, -.02, .35))):
        for i in range(5):
            f = i / 4
            p.append(sphere('pod', .11 * (1 - f * .7), (x + math.sin(yaw) * f * .2 + f * f * .12, y - f * .08, .62 - f * .5), C['chili' if k != 1 else 'chilid'], segs=10, rings=6, scale=(1, 1, 1.5)))
        p += [cyl('cap', .09, .07, (x, y, .7), C['leafd'], verts=8, bev=.01), stalk('stem', (x, y, .72), (x - .05, y, .9), .025, C['leafd'])]
    return p
item('chili', chili_item())

# ---- chapter 11 (the one choice): tins from the cannery; honey and honey cake from the kept meadow
C.update({n: mat('IT ' + n, c, .5) for n, c in {'tin': '#C9D1DC', 'tind': '#8C95A5', 'labely': '#FFD23F', 'labelr': '#EF3B3B', 'honey': '#F5A81E',
    'honeyl': '#FFD866', 'honeyd': '#C97A10', 'sponge': '#F2C777', 'sponged': '#D9A24E'}.items()})
def tin(label, veg):
    """A tin of preserves: a silver can with a bright paper label and a picture of what is inside, and one of them beside it."""
    return [cyl('can', .3, .6, (0, 0, .3), C['tin'], verts=20, bev=.02), torus('rimt', .3, .025, (0, 0, .6), C['tind'], major_segs=20, minor_segs=4),
            torus('rimb', .3, .025, (0, 0, .02), C['tind'], major_segs=20, minor_segs=4), cyl('label', .306, .36, (0, 0, .3), C[label], verts=20, bev=0),
            P('pic', .13, (0, -.31, .3), veg, sub=2, sc=(1, .25, 1)), cyl('lid', .25, .02, (0, 0, .615), C['tind'], verts=20, bev=0),
            P('veg', .15, (.43, -.18, .13), veg, sub=2), P('vegleaf', .06, (.43, -.18, .27), 'leaf', sub=1, sc=(1.4, 1.4, .5))]
item('canned_corn', tin('labelr', 'corn'))
item('canned_tomato', tin('labely', 'tomato'))
def honey_jar():
    """A jar of honey: amber glass, a cream lid and label with a bee, a wooden dipper leaning on it and a golden drop."""
    return [cyl('jar', .27, .46, (0, 0, .23), C['honey'], verts=16, bev=.05), cyl('shine', .2, .05, (0, 0, .47), C['honeyl'], verts=16, bev=.02),
            cyl('lid', .22, .1, (0, 0, .54), C['cream'], verts=14, bev=.02), cyl('labelj', .276, .17, (0, 0, .24), C['cream'], verts=16, bev=0),
            P('bee', .065, (0, -.28, .24), 'honeyd', sub=1, sc=(1.5, .4, 1)), stalk('dipper', (.34, -.12, .04), (.52, -.12, .66), .03, C['woodd']),
            P('dip', .09, (.5, -.12, .6), 'honeyd', sub=1, sc=(1, 1, 1.3)), P('drop', .08, (.3, -.26, .04), 'honeyl', sub=1, sc=(1.3, 1.3, .4))]
item('honey', honey_jar())
def honey_cake():
    """Honey cake: thin sponge layers with cream between, a honey glaze running down, a piece of honeycomb on top, on a teal plate."""
    p = [cyl('plate', .66, .05, (0, 0, .025), C['dish'], verts=28, bev=0), torus('rim', .64, .03, (0, 0, .05), C['dishd'], major_segs=28, minor_segs=4)]
    for i in range(4):
        p.append(cyl('sponge', .5, .09, (0, 0, .1 + i * .12), C['sponge' if i % 2 == 0 else 'sponged'], verts=24, bev=.01))
        p.append(cyl('cream', .49, .03, (0, 0, .16 + i * .12), C['eggw'], verts=24, bev=0))
    p.append(cyl('glaze', .51, .05, (0, 0, .55), C['honey'], verts=24, bev=.02))
    for i in range(7):
        a = i / 7 * math.tau
        p.append(P('drip', .07, (math.cos(a) * .5, math.sin(a) * .5, .47 - (i % 3) * .06), 'honey', sub=1, sc=(.8, .8, 1.5)))
    p += [box('comb', (.26, .2, .1), (0, 0, .63), C['honeyl'], bev=.02, seg=1, rot=(0, 0, .4)), P('combdrop', .05, (.12, -.1, .62), 'honeyd', sub=1)]
    return p
item('honey_cake', honey_cake())

objs = []
for name, parts in items:
    o = vc_join(parts, name)
    objs.append(o)
    print(f'{name}: {triangles(o)} triangles')
print('wrote', OUT, export_vc(objs, OUT))
