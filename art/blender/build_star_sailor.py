"""Hollowbrook's own costume: the Star sailor, a magical-girl sailor outfit (an original design in that genre: a sailor
collar and a big bow, a pleated skirt, two hair buns with long tails and a star tiara; not a copy of any one character).

It is authored with the costume tools of the owner's Zoo Garden (cute_game/art/blender/kit/build_hero.py: the chibi
explorer's envelope, shells, lathes, tubes), in the same space and with the same part tags as that game's disguises, so
art/tools/build-wear.mjs cuts it like the others and src/view/skinned.mjs re-fits it onto our villagers.

    blender -b --factory-startup --python art/blender/build_star_sailor.py -- <cute_game repo> <out.glb>
"""
import math
import os
import sys

from mathutils import Vector

ARGS = sys.argv[sys.argv.index('--') + 1:]
sys.path.insert(0, os.path.join(ARGS[0], 'art', 'blender', 'kit'))
import build_hero as H   # noqa: E402  (its main() is guarded: importing builds nothing)
from build_hero import (Costume, TAU, RAD, C, UP, axis_grid, ring_phis, lathe, ellipsoid, torus, tube, bez, facing, xf,   # noqa: E402
                        shell_torso, shell_arm, glove, boot, pack_cover, env_r, back_point, on_head, star_solid, smoothstep)


def dz_star():
    k = Costume('dz_star', 'star')
    white = k.m('white', '#FFFDF7', 0.5)
    violet = k.m('violet', '#5B4FE0', 0.45)
    deep = k.m('violet deep', '#3F36B0', 0.45)
    gold = k.m('gold', '#FFC83A', 0.3, 0.2)
    rose = k.m('rose', '#FF6FA8', 0.4)
    hair = k.m('hair', '#FFB3D1', 0.35)
    gem = k.m('gem', '#7FF0FF', 0.15, emit='#7FF0FF', strength=0.5)
    # two buns high on the head, each with a long tail that swings out and down, and a gold band at each bun
    for s in (-1, 1):
        bun = on_head((0.62 * s, 0.12, 0.7), 0.66)
        k.add('buns', 'head', ellipsoid(bun, (0.21, 0.21, 0.2), segs=10, rings=6), hair)
        k.add('buns', 'head', torus(bun - Vector((0.04 * s, 0, 0.07)), (0.5 * s, 0, 1), 0.17, 0.035, 12, 4), gold)
        # (the tails are long in the chibi's space: a villager's head is small, and they should reach the waist)
        path = bez([bun + Vector((0.05 * s, 0.02, -0.1)), Vector((1.15 * s, 0.25, 1.5)), Vector((1.25 * s, 0.4, 0.6)), Vector((1.05 * s, 0.4, -0.5))], 10)
        k.add('tails', 'head', tube(path, 0.13, sides=6, flatten=0.6, cap_start=True, cap_end=True), hair)
    # a gold tiara across the brow with a bright star
    k.add('tiara', 'head', torus(C + Vector((0, -0.05, 0.3)), (0, -0.42, 1), 0.575, 0.022, 20, 4), gold)
    fc = on_head((0, -1, 0.5), 0.63)
    k.add('tiara', 'head', star_solid(5, 0.085, 0.038, 0.03, 0.012).transformed(facing(fc, (0, -1, 0.5))), gold)
    k.add('tiara', 'head', ellipsoid(fc + Vector((0, -0.022, 0.012)), (0.026, 0.02, 0.026), segs=6, rings=4), gem)

    # the top: white, with a violet sailor collar round the shoulders and back
    def rr(phi, z):
        return env_r(max(z, 0.525)) + 0.036
    k.add('top', 'body', shell_torso(bottom=0.68, rows=5, segs=20, radius=rr, lip_tag=violet,
                                     tag=lambda phi, z: violet if (z > 1.02 and abs(math.remainder(phi, TAU)) > 0.34) else None), white)
    # the bow on the chest with a star brooch
    bow = Vector((0, -(env_r(1.0) + 0.05), 1.0))
    for s in (-1, 1):
        k.add('top', 'body', ellipsoid(None, (0.1, 0.035, 0.06), segs=8, rings=4, m=xf(bow + Vector((0.085 * s, 0, 0.005)), (0, 0.3 * s, 0))), rose)
    k.add('top', 'body', star_solid(5, 0.05, 0.024, 0.024, 0.01).transformed(facing(bow + Vector((0, -0.03, 0)), (0, -1, 0.1))), gold)
    # the pleated skirt: a flare of twenty pleats in two violets, on a gold waistband
    phis, zs, top_r = ring_phis(20), [0.44, 0.58, 0.71], env_r(0.7) + 0.045
    skirt = axis_grid(phis, zs, lambda phi, z, i, j: top_r + (0.71 - z) / 0.27 * 0.3 * (1.0 + (0.1 if i % 2 else -0.04) * (0.71 - z) / 0.27),
                      tag=lambda i, j: deep if i % 2 else None)
    k.add('skirt', 'body', skirt.solidify(0.016), violet)
    k.add('skirt', 'body', torus((0, 0, 0.705), (0, 0, 1), top_r + 0.012, 0.028, 18, 4), gold)
    # a big bow on the back with two ribbon ends (it covers the explorer's pack)
    k.add('ribbon', 'body', pack_cover(radius=0.06), white)
    bp = back_point(0.84) + Vector((0, 0.2, 0))
    for s in (-1, 1):
        k.add('ribbon', 'body', ellipsoid(None, (0.2, 0.06, 0.12), segs=8, rings=4, m=xf(bp + Vector((0.17 * s, 0, 0.02)), (0, 0.35 * s, 0))), rose)
        k.add('ribbon', 'body', tube(bez([bp + Vector((0.04 * s, 0.01, -0.04)), bp + Vector((0.12 * s, 0.06, -0.24)), bp + Vector((0.16 * s, 0.05, -0.44))], 5), 0.06,
                                     sides=5, flatten=0.3, cap_end=True), rose)
    k.add('ribbon', 'body', ellipsoid(bp + Vector((0, 0.02, 0)), (0.06, 0.05, 0.06), segs=6, rings=4), rose)
    # short puffed sleeves with a violet edge, long white gloves with a gold cuff
    for side, part in ((-1, 'arm-left'), (1, 'arm-right')):
        k.add('sleeve', part, shell_arm(side, 0.045, bottom=1.0, rows=3, tag=lambda z: violet if z < 1.03 else None, lip_tag=violet), white)
        k.add('glove', part, glove(side, 0.02, cuff=(0.125, 0.15)), white)
        k.add('glove', part, torus(Vector((0.37 * side, -0.02, 0.87)), (0, 0, 1), 0.15, 0.02, 10, 4), gold)
    # tall violet boots with a gold top
    for side, part in ((-1, 'leg-left'), (1, 'leg-right')):
        k.add('boot', part, boot(side, 0.024, shaft=0.24, segs=10, toe=0.06, cuff=0.02,
                                 tag=lambda z0, z1: gold if z0 >= 0.24 else None), violet)   # (a short shaft: on our long legs it comes to the knee)
    return k


H.BUILDERS['dz_star'] = dz_star
H.reset_scene()
k, root, objs = H.build_costume('dz_star')
size = H.export_glb([root] + objs, os.path.abspath(ARGS[1]))
print('STAR SAILOR', {o.name: len(o.data.polygons) for o in objs}, size, 'bytes')
