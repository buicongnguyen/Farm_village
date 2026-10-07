"""Build a game kit from pieces of other GLB kits, as vertex-colour roots (TECH-PLAN 6, AAA pass).

Spec mode (used for props.glb, nature.glb, rural-extra.glb and farm.glb):
  blender --background --factory-startup --python art/blender/extract_kit.py -- art/blender/kits/<kit>.json

  The spec: {"out": "public/assets/models/props.glb", "pieces": [{
      "src": "<path to a GLB>",          (relative paths: to the repository's parent folder, e.g. "3D_game_scene/public/models/x.glb")
      "root": "<root node name>",        (optional; default: the first root of the file)
      "name": "<name in our kit>",
      "drop": ["<node name>", ...],      (optional: leave these child nodes out, e.g. the fruit for a bare tree)
      "recolor": {"<material>": "#hex"}, (optional: new base colours by material name)
      "boost": 1.1,                      (optional: saturation boost of the colours, 1 = none)
      "mid": "<GLB>" | 0.35,             (optional: <name>_mid from another file (an LOD copy) or by decimating to this ratio)
      "far": "<GLB>" | 0.1,              (optional: <name>_far, the same way)
      "keep": true                       (optional: keep the root's materials instead of baking them into vertex colours)
  }]}
  Each piece is joined into one mesh whose COLOR_0 is (its own COLOR_0, if any) x (its material's base colour), with
  the single white material 'VC'. The raw export is then compressed with art/blender/pack.mjs.

Legacy mode (keep only some roots of a kit, unchanged):
  blender --background --factory-startup --python art/blender/extract_kit.py -- <in.glb> <out.glb> <name> [<name> ...]
"""
import bpy, sys, os, json, colorsys, tempfile, subprocess
sys.path.insert(0, os.path.dirname(__file__))
from style import vc_material, rgba, triangles

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
REPOS = os.path.abspath(os.path.join(ROOT, '..'))
args = sys.argv[sys.argv.index('--') + 1:]


def legacy(src, out, keep):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=src)
    for r in [o for o in bpy.context.scene.objects if o.parent is None]:
        if r.name.split('.')[0] not in keep:
            for o in [r] + list(r.children_recursive):
                bpy.data.objects.remove(o, do_unlink=True)
    bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', export_yup=True, export_apply=False, export_materials='EXPORT',
                              export_cameras=False, export_lights=False, export_animations=False, export_texcoords=False, export_normals=True)
    print(f'kept {sorted(o.name for o in bpy.context.scene.objects if o.parent is None)} -> {out} ({os.path.getsize(out)} bytes)')


def path_of(p):
    return p if os.path.isabs(p) else os.path.join(REPOS, p)


GLTF_COLORS = {}


def gltf_colors(path):
    """Material name -> baseColorFactor (linear RGB) read straight from the GLB's JSON (the importer may wire the
    factor through shader nodes, which leaves the BSDF's Base Color input at white)."""
    import struct
    with open(path, 'rb') as f:
        data = f.read()
    n = struct.unpack_from('<I', data, 12)[0]
    j = json.loads(data[20:20 + n])
    for m in j.get('materials', []):
        GLTF_COLORS[m.get('name', '')] = tuple(m.get('pbrMetallicRoughness', {}).get('baseColorFactor', [1, 1, 1, 1])[:3])


def import_roots(src):
    """Import a GLB; return its new root objects."""
    gltf_colors(path_of(src))
    before = set(bpy.context.scene.objects)
    bpy.ops.import_scene.gltf(filepath=path_of(src))
    new = [o for o in bpy.context.scene.objects if o not in before]
    for o in new:   # the importer's bone-shape helpers
        if o.type == 'MESH' and o.name.startswith('Icosphere') and not o.users_collection:
            pass
    return [o for o in new if o.parent is None or o.parent not in new]


def base_color(m):
    if m is not None and m.name.split('.')[0] in GLTF_COLORS:
        return GLTF_COLORS[m.name.split('.')[0]]
    if m is None or not m.use_nodes:
        return (1, 1, 1)
    b = next((n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None)
    if b is None:
        return (1, 1, 1)
    c = b.inputs['Base Color'].default_value
    return (c[0], c[1], c[2])


def boosted(c, k):
    if k == 1:
        return c
    # boost saturation in sRGB-ish space
    s = [v ** (1 / 2.2) for v in c]
    h, l, sat = colorsys.rgb_to_hls(*s)
    r, g, b = colorsys.hls_to_rgb(h, l, min(1, sat * k))
    return tuple(max(0, v) ** 2.2 for v in (r, g, b))


def bake_colors(obj, recolor, boost):
    """Write (existing COLOR_0) x (material colour) into a fresh corner colour attribute 'FVCol'."""
    me = obj.data
    old = me.color_attributes.active_color or (me.color_attributes[0] if len(me.color_attributes) else None)
    mats = []
    for s in obj.material_slots:
        m = s.material
        if m is not None and recolor and m.name.split('.')[0] in recolor:
            mats.append(rgba(recolor[m.name.split('.')[0]])[:3])
        else:
            mats.append(base_color(m))
    mats = [boosted(c, boost) for c in mats] or [(1, 1, 1)]
    olddata = None
    if old is not None:
        olddata = [tuple(d.color[:3]) for d in old.data]
        old_domain = old.domain
    new = me.color_attributes.new('FVCol', 'FLOAT_COLOR', 'CORNER')
    for poly in me.polygons:
        c = mats[min(poly.material_index, len(mats) - 1)]
        for li in poly.loop_indices:
            v = (1, 1, 1)
            if olddata is not None:
                v = olddata[li] if old_domain == 'CORNER' else olddata[me.loops[li].vertex_index]
            new.data[li].color = (c[0] * v[0], c[1] * v[1], c[2] * v[2], 1)
    for a in [a for a in me.color_attributes if a.name != 'FVCol']:
        me.color_attributes.remove(a)
    me.color_attributes.active_color = me.color_attributes['FVCol']
    me.materials.clear()
    me.materials.append(vc_material())


def collect(root, drop):
    out = []
    for o in [root] + list(root.children_recursive):
        if o.type != 'MESH':
            continue
        if any(o.name.split('.')[0] == d or o.name.startswith(d) for d in drop):
            continue
        out.append(o)
    return out


def make_piece(roots, spec, name):
    root = next((r for r in roots if r.name.split('.')[0] == spec.get('root')), roots[0]) if spec.get('root') else roots[0]
    parts = collect(root, spec.get('drop', []))
    copies = []
    for o in parts:
        c = o.copy(); c.data = o.data.copy(); c.parent = None
        c.matrix_world = o.matrix_world.copy()
        bpy.context.scene.collection.objects.link(c)
        for m in list(c.modifiers):
            c.modifiers.remove(m)
        copies.append(c)
    bpy.ops.object.select_all(action='DESELECT')
    for c in copies:
        c.select_set(True)
    bpy.context.view_layer.objects.active = copies[0]
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    if not spec.get('keep'):
        for c in copies:
            bake_colors(c, spec.get('recolor'), spec.get('boost', 1))
    if len(copies) > 1:
        bpy.ops.object.join()
    o = bpy.context.view_layer.objects.active
    o.name = name; o.data.name = name
    ca = o.data.color_attributes
    if 'FVCol' in ca:
        ca['FVCol'].name = 'Color'
    if 'Color' in ca:
        ca.active_color = ca['Color']
        ca.render_color_index = ca.active_color_index = list(ca).index(ca['Color'])
    return o


def decimated(o, ratio, name):
    c = o.copy(); c.data = o.data.copy(); c.name = name; c.data.name = name
    bpy.context.scene.collection.objects.link(c)
    mod = c.modifiers.new('Decimate', 'DECIMATE'); mod.ratio = ratio
    bpy.ops.object.select_all(action='DESELECT'); c.select_set(True); bpy.context.view_layer.objects.active = c
    bpy.ops.object.modifier_apply(modifier=mod.name)
    return c


def spec_mode(spec_path):
    spec = json.load(open(spec_path if os.path.isabs(spec_path) else os.path.join(ROOT, spec_path)))
    bpy.ops.wm.read_factory_settings(use_empty=True)
    made = []
    for p in spec['pieces']:
        roots = import_roots(p['src'])
        o = make_piece(roots, p, '__piece'); made.append(o)
        for lvl in ('mid', 'far'):
            v = p.get(lvl)
            if v is None:
                continue
            if isinstance(v, str):
                lr = import_roots(v)
                lo = make_piece(lr, {k: p[k] for k in ('recolor', 'boost', 'drop', 'keep') if k in p} | {'root': None}, '__lod')
                made.append(lo)
                for r in lr:
                    for x in [r] + list(r.children_recursive):
                        bpy.data.objects.remove(x, do_unlink=True)
                lo.name = lo.data.name = f"{p['name']}_{lvl}"
            else:
                made.append(decimated(o, float(v), f"{p['name']}_{lvl}"))
        for r in roots:
            for x in [r] + list(r.children_recursive):
                if x.name in bpy.data.objects:
                    bpy.data.objects.remove(x, do_unlink=True)
        o.name = o.data.name = p['name']
    for o in made:
        d = o.dimensions
        print(f'{o.name}: {triangles(o)} triangles, {d.x:.2f} x {d.z:.2f} x {d.y:.2f} m')
    out = os.path.join(ROOT, spec['out'])
    raw = os.path.join(tempfile.gettempdir(), 'fv-raw-' + os.path.basename(out))
    bpy.ops.object.select_all(action='DESELECT')
    for o in made:
        o.select_set(True)
    bpy.context.view_layer.objects.active = made[0]
    bpy.ops.export_scene.gltf(filepath=raw, export_format='GLB', use_selection=True, export_yup=True, export_apply=True,
                              export_materials='EXPORT', export_cameras=False, export_lights=False, export_animations=False,
                              export_texcoords=False, export_normals=True, export_vertex_color='ACTIVE', export_all_vertex_colors=False)
    r = subprocess.run(['node', os.path.join(HERE, 'pack.mjs'), raw, out], capture_output=True, text=True)
    print(r.stdout.strip(), r.stderr.strip())


if args and args[0].endswith('.json'):
    spec_mode(args[0])
else:
    legacy(args[0], args[1], set(args[2:]))
