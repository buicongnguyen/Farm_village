"""Item, building, tool and portrait icons for Farm Village: 256 px transparent WebP renders, one camera rule, one
lighting rig (warm key, cool fill, strong warm rim) and a thin dark outline so every icon reads at 48 px.
Ported from Starline's art/blender/render_icons.py and icon_post.py (same lights, framing and post-process).

  blender -b --factory-startup --python art/blender/render_icons.py -- [art/blender/icons.json] [ids...] [--size 256] [--ss 2]

The job file lists {"id", "src", "root"?, "view"?: [azimuth, elevation], "recolor"?: {material: "#hex"}, "drop"?: [...],
"portrait"?: true, "group"?: [{"src", "recolor", "x"}], "spin"?: degrees, "roll"?: degrees (turns the picture in the
icon square so a long subject, a fish, lies on the diagonal and fills it), "margin"?: framing factor}. Sources:
  "raw:<kit>"      the raw (unpacked) export of one of our kits in the temp folder (run build_farm_kit.py,
                   build_items.py and extract_kit.py first: they leave fv-raw-<kit>.glb there)
  "<repo>/<path>"  a GLB in a sibling repository (Starline's characters and tools)
Writes public/assets/icons/<id>.webp, then runs icon_post.py with the system Python (PIL) for the outline, the WebP
files and the review sheets (art-icons.png, at 160 px and 48 px, on dark and light panels) in the temp folder.
"""
import bpy, os, sys, json, math, subprocess, tempfile
from mathutils import Vector, Matrix

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
REPOS = os.path.abspath(os.path.join(ROOT, '..'))
TMP = os.path.join(tempfile.gettempdir(), 'fv-icons-raw')
args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
size, ss, job_file, only, engine = 256, 2, os.path.join(HERE, 'icons.json'), [], 'cycles'
i = 0
while i < len(args):
    if args[i] == '--size': size = int(args[i + 1]); i += 2
    elif args[i] == '--ss': ss = int(args[i + 1]); i += 2
    elif args[i] == '--engine': engine = args[i + 1]; i += 2
    elif args[i].endswith('.json'): job_file = args[i] if os.path.isabs(args[i]) else os.path.join(ROOT, args[i]); i += 1
    else: only.append(args[i]); i += 1
OUT = os.path.join(ROOT, 'public', 'assets', 'icons')
os.makedirs(TMP, exist_ok=True); os.makedirs(OUT, exist_ok=True)


def src_path(src):
    if src.startswith('raw:'):
        return os.path.join(tempfile.gettempdir(), f'fv-raw-{src[4:]}.glb')
    return src if os.path.isabs(src) else os.path.join(REPOS, src)


def linear(hexc):
    h = hexc.lstrip('#')
    f = lambda c: c / 12.92 if c < 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    return tuple(f(int(h[k:k + 2], 16) / 255) for k in (0, 2, 4)) + (1,)


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    s = bpy.context.scene
    # Icon render v2 (docs/REFERENCE-NONGTRAI.md, R1): Cycles for the final pass, for soft contact shadows and real
    # occlusion in the crevices, so icons have the value range of a painted icon; EEVEE (--engine eevee) for quick drafts
    if engine == 'cycles':
        s.render.engine = 'CYCLES'
        s.cycles.samples = 96
        s.cycles.use_adaptive_sampling = True
        s.cycles.use_denoising = True
        try:
            s.cycles.denoiser = 'OPENIMAGEDENOISE'
        except TypeError:
            pass
        s.cycles.max_bounces = 4
    else:
        try:
            s.render.engine = 'BLENDER_EEVEE_NEXT'
        except TypeError:
            s.render.engine = 'BLENDER_EEVEE'
        try:
            s.eevee.taa_render_samples = 48
        except Exception:
            pass
    s.view_settings.view_transform = 'Standard'
    s.view_settings.look = 'None'
    s.render.film_transparent = True
    s.render.resolution_x = s.render.resolution_y = size * ss
    s.render.image_settings.file_format = 'PNG'
    s.render.image_settings.color_mode = 'RGBA'
    s.world = bpy.data.worlds.new('w')
    s.world.use_nodes = True
    # a warm gradient sky at a low strength (v1 used a flat .8 fill, which flattened the values): warm earth below, cream above
    nt = s.world.node_tree
    bg = next(n for n in nt.nodes if n.type == 'BACKGROUND')
    tc, sep, ramp = nt.nodes.new('ShaderNodeTexCoord'), nt.nodes.new('ShaderNodeSeparateXYZ'), nt.nodes.new('ShaderNodeValToRGB')
    nt.links.new(tc.outputs['Generated'], sep.inputs[0]); nt.links.new(sep.outputs['Z'], ramp.inputs[0])
    ramp.color_ramp.elements[0].position, ramp.color_ramp.elements[1].position = .35, .65
    ramp.color_ramp.elements[0].color, ramp.color_ramp.elements[1].color = linear('#C98A50'), linear('#FFF3DC')
    nt.links.new(ramp.outputs['Color'], bg.inputs[0])
    bg.inputs[1].default_value = .3
    return s


def wire_vertex_colors(objs):
    """Multiply COLOR_0 into the base colour, as the game does (the importer leaves it unconnected)."""
    done = set()
    for o in objs:
        if not o.data.color_attributes:
            continue
        for m in o.data.materials:
            if not m or m in done or not m.use_nodes:
                continue
            done.add(m)
            nt = m.node_tree
            b = next((n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED'), None)
            if not b or any(n.type in ('VERTEX_COLOR', 'ATTRIBUTE') for n in nt.nodes):
                continue
            attr = nt.nodes.new('ShaderNodeVertexColor')
            attr.layer_name = o.data.color_attributes[0].name
            mix = nt.nodes.new('ShaderNodeMix')
            mix.data_type = 'RGBA'; mix.blend_type = 'MULTIPLY'; mix.inputs[0].default_value = 1.0
            src = b.inputs['Base Color']
            if src.links:
                nt.links.new(src.links[0].from_socket, mix.inputs[6])
            else:
                mix.inputs[6].default_value = src.default_value
            nt.links.new(attr.outputs['Color'], mix.inputs[7])
            nt.links.new(mix.outputs[2], src)


def recolor(objs, table):
    for o in objs:
        for m in o.data.materials:
            if not m or not m.use_nodes:
                continue
            key = m.name.split('.')[0]
            if key not in table:
                continue
            b = next((n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None)
            if b is None:
                continue
            for l in list(b.inputs['Base Color'].links):
                m.node_tree.links.remove(l)
            b.inputs['Base Color'].default_value = linear(table[key])


def import_piece(src, root=None, drop=(), table=None, x=0.0):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=src_path(src))
    new = [o for o in bpy.data.objects if o not in before]
    roots = [o for o in new if o.parent is None]
    keep = roots
    if root:
        keep = [r for r in roots if r.name.split('.')[0] == root]
        if not keep:
            raise RuntimeError(f'{root} not in {src}')
    keepset = set()
    for r in keep:
        keepset |= {r, *r.children_recursive}
    for o in new:
        if o not in keepset or any(o.name.split('.')[0] == d for d in drop):
            bpy.data.objects.remove(o, do_unlink=True)
    shapes = {pb.custom_shape for a in bpy.data.objects if a.type == 'ARMATURE' for pb in a.pose.bones if pb.custom_shape}
    meshes = [o for o in keepset if o.name in bpy.data.objects and o.type == 'MESH' and o not in shapes]
    for o in shapes:
        o.hide_render = True
    for r in keep:
        r.location.x += x
    if table:
        recolor(meshes, table)
    return meshes


def area(loc, target, size_m, energy, color):
    data = bpy.data.lights.new('area', 'AREA'); data.energy = energy; data.color = color; data.size = size_m
    o = bpy.data.objects.new('area', data); bpy.context.scene.collection.objects.link(o)
    o.location = loc; o.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
    return o


def surface(meshes, rough=None, metal=None):
    """Per-job surface (R1.5): roughness and metalness on every material of the icon's meshes."""
    seen = set()
    for o in meshes:
        for m in o.data.materials:
            if not m or m.name in seen or not m.use_nodes:
                continue
            seen.add(m.name)
            b = next((n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None)
            if b is None:
                continue
            if rough is not None: b.inputs['Roughness'].default_value = rough
            if metal is not None: b.inputs['Metallic'].default_value = metal


# Camera presets (R5): a job's own keys override them. Buildings, decorations and portraits keep their tuned views.
PRESETS = {
    'goods': {'view': [-40, 32], 'margin': 1.18},
    'dish': {'view': [-35, 40], 'margin': 1.18},
    'token': {'view': [-20, 12], 'margin': 1.15},
    'tool': {'margin': 1.15},
    'fish': {'view': [-65, 30], 'roll': 38, 'margin': 1.12},
    'building': {'margin': 1.10},
}
KEY = 18.0   # key light strength factor (energy = KEY * distance^2): painted depth without blowing out bright goods


def sun(direction, energy, color, angle=6):
    data = bpy.data.lights.new('sun', 'SUN'); data.energy = energy; data.color = color; data.angle = math.radians(angle)
    o = bpy.data.objects.new('sun', data); bpy.context.scene.collection.objects.link(o)
    o.rotation_euler = (-Vector(direction).normalized()).to_track_quat('-Z', 'Y').to_euler()


def render(job):
    s = reset()
    meshes = []
    for part in job.get('group') or [job]:
        meshes += import_piece(part['src'], part.get('root'), part.get('drop', ()), part.get('recolor'), part.get('x', 0.0))
    bpy.context.view_layer.update()
    wire_vertex_colors(meshes)
    if job.get('spin'):
        for o in bpy.data.objects:
            if o.parent is None:
                o.rotation_euler.z += math.radians(job['spin'])
        bpy.context.view_layer.update()
    job = {**PRESETS.get(job.get('preset', ''), {}), **job}
    surface(meshes, job.get('rough', .55), job.get('metal', 0.0))
    portrait = job.get('portrait')
    az, el = job.get('view', [0, 6] if portrait else [-35, 28])
    az, el = math.radians(az), math.radians(el)
    d = (Vector((-math.sin(az), -math.cos(az), 0)) * math.cos(el) + Vector((0, 0, math.sin(el)))).normalized()
    deps = bpy.context.evaluated_depsgraph_get()
    pts = []
    for o in meshes:
        ev = o.evaluated_get(deps); me = ev.to_mesh()
        pts.extend(ev.matrix_world @ v.co for v in me.vertices)
        ev.to_mesh_clear()
    lo = Vector([min(p[k] for p in pts) for k in range(3)]); hi = Vector([max(p[k] for p in pts) for k in range(3)])
    if portrait:   # head and shoulders: the top part of the figure(s)
        cut = hi.z - (hi.z - lo.z) * job.get('crop', .36)
        pts = [p for p in pts if p.z >= cut]
        lo = Vector([min(p[k] for p in pts) for k in range(3)]); hi = Vector([max(p[k] for p in pts) for k in range(3)])
    c = (lo + hi) / 2; R = max(1e-3, (hi - lo).length)
    cam_data = bpy.data.cameras.new('cam'); cam_data.type = 'ORTHO'
    cam = bpy.data.objects.new('cam', cam_data); s.collection.objects.link(cam)
    cam.location = c + d * R * 3
    cam.rotation_euler = (-d).to_track_quat('-Z', 'Y').to_euler()
    if job.get('roll'): cam.rotation_euler = (cam.rotation_euler.to_matrix().to_4x4() @ Matrix.Rotation(math.radians(job['roll']), 4, 'Z')).to_euler()
    bpy.context.view_layer.update()
    inv = cam.matrix_world.inverted()
    cs = [inv @ p for p in pts]
    xs = [p.x for p in cs]; ys = [p.y for p in cs]
    w, h = max(xs) - min(xs), max(ys) - min(ys)
    cam.location = cam.matrix_world @ Vector(((max(xs) + min(xs)) / 2, (max(ys) + min(ys)) / 2, 0))
    cam_data.ortho_scale = max(w, h) * job.get('margin', 1.1)
    cam_data.clip_end = R * 10
    s.camera = cam
    # the light rig in the camera's basis (after roll), so light always comes from the top left of the picture: a big warm
    # key, a soft warm fill at 25 %, a rim at 35 %; and a floor out of the camera's sight for warm bounce and contact shade
    right, up, back = cam.matrix_world.col[0].xyz.normalized(), cam.matrix_world.col[1].xyz.normalized(), d.normalized()
    Rr = max(1e-3, max(w, h))
    for vec, dist, sz, k, col in (((-.8, .9, 1.0), 2.2, 3.0, 1.0, (1, .93, .82)), ((1.0, .1, .8), 2.5, 4.0, .25, (1, .97, .92)),
                                  ((.5, .8, -1.0), 2.2, 1.0, .35, (1, .92, .80))):
        v = (right * vec[0] + up * vec[1] + back * vec[2]).normalized()
        area(c + v * dist * Rr, c, sz * Rr, KEY * (1.35 if portrait else 1.0) * k * (dist * Rr) ** 2, col)   # faces a little brighter
    bpy.ops.mesh.primitive_plane_add(size=8 * Rr, location=(c.x, c.y, lo.z - .001))
    floor = bpy.context.active_object; fm = bpy.data.materials.new('bounce'); fm.use_nodes = True
    fb = next(n for n in fm.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'); fb.inputs['Base Color'].default_value = linear('#E8B070'); fb.inputs['Roughness'].default_value = 1
    floor.data.materials.append(fm)
    try:
        floor.visible_camera = False
    except AttributeError:
        floor.hide_render = engine != 'cycles'
    path = os.path.join(TMP, job['id'].replace(':', '__') + '.png')
    s.render.filepath = path
    bpy.ops.render.render(write_still=True)
    return path


jobs = json.load(open(job_file, encoding='utf-8'))
raw = {}
for job in jobs:
    if only and job['id'] not in only:
        continue
    try:
        raw[job['id']] = render(job)
    except Exception as e:
        print('SKIP', job['id'], e)
post = os.path.join(HERE, 'icon_post.py')
jf = os.path.join(TMP, 'job.json')
json.dump({'raw': raw, 'size': size, 'out': OUT, 'glow': {}, 'preview': tempfile.gettempdir()}, open(jf, 'w'))
r = subprocess.run(['python', post, jf], capture_output=True, text=True)
print(r.stdout[-3000:], r.stderr[-3000:])
print('ICONS', len(raw))
