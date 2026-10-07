"""Shared look for the Zoo Garden Blender kit.

Vivid toy style: saturated colours, soft bevels, smooth-by-angle shading and a
slight gloss. Blender is Z up with -Y as the front; glTF exports are Y up with
+Z as the front, in metres, origin at the ground centre.

Import from a generator run with Blender --background --factory-startup:

    import sys, os; sys.path.insert(0, os.path.dirname(__file__))
    from style import *
"""
import bpy
import bmesh
import math
import os
from mathutils import Vector

# ---------------------------------------------------------------- palette
# Warm, saturated colours. Avoid pastel greys: the game camera sees these from
# far away and under a hemisphere light, which already softens everything.
PALETTE = {
    # Greens
    'grass': '#6FD24A', 'leaf': '#4FBF3A', 'leaf_light': '#86E05A', 'leaf_dark': '#2F9A3A',
    'mint': '#5EDFB0', 'sage': '#8CC66B',
    # Blossom and flowers
    'blossom': '#FF9CC8', 'blossom_light': '#FFC2DD', 'blossom_dark': '#F277AE',
    'berry': '#E8335A', 'rose': '#FF5C8A', 'violet': '#9B6BFF', 'lilac': '#C69CFF',
    'sky': '#35B6F2', 'sky_light': '#8FDBFF', 'teal': '#18B8C9', 'navy': '#2B4C9B',
    # Warm accents
    'sun': '#FFC83A', 'gold': '#F5B21E', 'honey': '#FFD66B', 'tangerine': '#FF8A2A',
    'pumpkin': '#FF7A1A', 'red': '#EF3B3B', 'cherry': '#D8243B', 'cream': '#FFF1D2',
    'white': '#FFFDF6', 'snow': '#F4FAFF',
    # Wood, soil and stone
    'wood': '#C77A3A', 'wood_light': '#E3A05A', 'wood_dark': '#8A4B25', 'bark': '#8E5634',
    'soil': '#6A3F2A', 'soil_dark': '#4A2A1C', 'straw': '#F2B33D', 'straw_light': '#FFD35C',
    'straw_dark': '#D98B1F', 'stone': '#B9C0CC', 'stone_light': '#DCE2EA', 'stone_dark': '#8C95A5',
    'iron': '#5B6477', 'charcoal': '#3A3D4A', 'glass': '#7FE3FF', 'lava': '#FF6A1A',
}

# --------------------------------------------------------------- materials
def _linear(c):
    return c / 12.92 if c < 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def rgba(hex_or_name, alpha=1.0):
    value = PALETTE.get(hex_or_name, hex_or_name).lstrip('#')
    return tuple(_linear(int(value[i:i + 2], 16) / 255) for i in (0, 2, 4)) + (alpha,)


def mat(name, color, rough=0.55, metal=0.0, emit=None, emit_strength=0.0, alpha=1.0):
    """A Principled material. Names are part of the runtime contract; keep them stable."""
    existing = bpy.data.materials.get(name)
    if existing:
        return existing
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    base = rgba(color, alpha)
    bsdf.inputs['Base Color'].default_value = base
    bsdf.inputs['Roughness'].default_value = rough
    bsdf.inputs['Metallic'].default_value = metal
    if emit:
        bsdf.inputs['Emission Color'].default_value = rgba(emit)
        bsdf.inputs['Emission Strength'].default_value = emit_strength
    if alpha < 1:
        bsdf.inputs['Alpha'].default_value = alpha
        try:
            m.surface_render_method = 'BLENDED'
        except (AttributeError, TypeError):
            pass
    m.diffuse_color = base
    return m


# ---------------------------------------------------------------- scene
def reset_scene():
    for obj in list(bpy.data.objects):
        bpy.data.objects.remove(obj, do_unlink=True)
    for block in (bpy.data.meshes, bpy.data.materials, bpy.data.cameras, bpy.data.lights,
                  bpy.data.curves, bpy.data.images):
        for item in list(block):
            block.remove(item)
    for col in list(bpy.data.collections):
        bpy.data.collections.remove(col)


def _link(obj, collection=None):
    (collection or bpy.context.scene.collection).objects.link(obj)
    return obj


def _mesh_object(name, bm, material, collection=None):
    data = bpy.data.meshes.new(name)
    bm.to_mesh(data)
    bm.free()
    obj = bpy.data.objects.new(name, data)
    if material is not None:
        data.materials.append(material)
    return _link(obj, collection)


def place(obj, loc=(0, 0, 0), rot=(0, 0, 0), scale=None):
    obj.location = loc
    obj.rotation_euler = rot
    if scale is not None:
        obj.scale = scale if isinstance(scale, (tuple, list)) else (scale, scale, scale)
    return obj


def bevel(obj, width=0.04, segments=3, angle=40):
    """Soft toy edges. Applied at export time."""
    if width > 0:
        mod = obj.modifiers.new('Bevel', 'BEVEL')
        mod.width = width
        mod.segments = segments
        mod.limit_method = 'ANGLE'
        mod.angle_limit = math.radians(angle)
        mod.harden_normals = False
    return obj


def smooth(obj, angle=38):
    for poly in obj.data.polygons:
        poly.use_smooth = True
    # Mark hard edges past the angle so cylinders keep crisp caps.
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    limit = math.radians(angle)
    for edge in bm.edges:
        if len(edge.link_faces) == 2 and edge.calc_face_angle(0) > limit:
            edge.smooth = False
    bm.to_mesh(obj.data)
    bm.free()
    return obj


# -------------------------------------------------------------- primitives
def box(name, size, loc=(0, 0, 0), material=None, bev=0.05, seg=3, rot=(0, 0, 0), collection=None):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=Vector(size), verts=bm.verts)
    obj = _mesh_object(name, bm, material, collection)
    place(obj, loc, rot)
    return smooth(bevel(obj, min(bev, min(size) * 0.45), seg))


def cyl(name, radius, depth, loc=(0, 0, 0), material=None, verts=24, bev=0.03, seg=2,
        rot=(0, 0, 0), radius_top=None, collection=None):
    """Cylinder or truncated cone standing on its base centre when loc is its middle."""
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=verts,
                          radius1=radius, radius2=radius if radius_top is None else radius_top,
                          depth=depth)
    obj = _mesh_object(name, bm, material, collection)
    place(obj, loc, rot)
    return smooth(bevel(obj, bev, seg))


def cone(name, radius, depth, loc=(0, 0, 0), material=None, verts=16, rot=(0, 0, 0), collection=None):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=True, segments=verts,
                          radius1=radius, radius2=0.0, depth=depth)
    obj = _mesh_object(name, bm, material, collection)
    return smooth(place(obj, loc, rot))


def sphere(name, radius, loc=(0, 0, 0), material=None, segs=16, rings=10, scale=None,
           rot=(0, 0, 0), collection=None):
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=segs, v_segments=rings, radius=radius)
    obj = _mesh_object(name, bm, material, collection)
    place(obj, loc, rot, scale)
    for poly in obj.data.polygons:
        poly.use_smooth = True
    return obj


def ico(name, radius, loc=(0, 0, 0), material=None, subdiv=2, scale=None, rot=(0, 0, 0),
        collection=None, smooth_shading=True):
    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=subdiv, radius=radius)
    obj = _mesh_object(name, bm, material, collection)
    place(obj, loc, rot, scale)
    for poly in obj.data.polygons:
        poly.use_smooth = smooth_shading
    return obj


def torus(name, major, minor, loc=(0, 0, 0), material=None, major_segs=24, minor_segs=10,
          rot=(0, 0, 0), collection=None):
    bm = bmesh.new()
    verts = []
    for i in range(major_segs):
        a = i * math.tau / major_segs
        ring = []
        for j in range(minor_segs):
            b = j * math.tau / minor_segs
            r = major + minor * math.cos(b)
            ring.append(bm.verts.new((r * math.cos(a), r * math.sin(a), minor * math.sin(b))))
        verts.append(ring)
    for i in range(major_segs):
        for j in range(minor_segs):
            bm.faces.new((verts[i][j], verts[(i + 1) % major_segs][j],
                          verts[(i + 1) % major_segs][(j + 1) % minor_segs], verts[i][(j + 1) % minor_segs]))
    obj = _mesh_object(name, bm, material, collection)
    place(obj, loc, rot)
    for poly in obj.data.polygons:
        poly.use_smooth = True
    return obj


def lathe(name, profile, loc=(0, 0, 0), material=None, segments=32, cap_top=True, cap_bottom=True,
          rot=(0, 0, 0), smooth_angle=50, collection=None):
    """Revolve [(radius, z), ...] (bottom to top) around Z. Great for roofs, pots and domes."""
    bm = bmesh.new()
    rings = []
    for radius, z in profile:
        if radius <= 1e-5:
            rings.append([bm.verts.new((0, 0, z))])
            continue
        rings.append([bm.verts.new((radius * math.cos(i * math.tau / segments),
                                    radius * math.sin(i * math.tau / segments), z))
                      for i in range(segments)])
    for lower, upper in zip(rings, rings[1:]):
        if len(lower) == 1 and len(upper) == 1:
            continue
        if len(lower) == 1:
            for i in range(segments):
                bm.faces.new((lower[0], upper[i], upper[(i + 1) % segments]))
        elif len(upper) == 1:
            for i in range(segments):
                bm.faces.new((lower[i], lower[(i + 1) % segments], upper[0]))
        else:
            for i in range(segments):
                bm.faces.new((lower[i], lower[(i + 1) % segments], upper[(i + 1) % segments], upper[i]))
    if cap_bottom and len(rings[0]) > 1:
        bm.faces.new(list(reversed(rings[0])))
    if cap_top and len(rings[-1]) > 1:
        bm.faces.new(rings[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    obj = _mesh_object(name, bm, material, collection)
    place(obj, loc, rot)
    return smooth(obj, smooth_angle)


def blob(name, radius, loc=(0, 0, 0), material=None, scale=(1, 1, 1), subdiv=2, wobble=0.08, seed=1,
         collection=None):
    """A soft, slightly irregular ball for foliage, bushes and clouds."""
    import random
    rng = random.Random(seed)
    obj = ico(name, radius, loc, material, subdiv, scale, collection=collection)
    for v in obj.data.vertices:
        n = v.co.normalized()
        v.co += n * radius * wobble * (rng.random() - 0.5) * 2
    return obj


def extrude_outline(name, outline, depth, loc=(0, 0, 0), material=None, rot=(0, 0, 0), bev=0.03,
                    collection=None):
    """Extrude a 2D outline [(x, z), ...] along Y (front/back). Good for arches and signs."""
    bm = bmesh.new()
    front = [bm.verts.new((x, -depth / 2, z)) for x, z in outline]
    back = [bm.verts.new((x, depth / 2, z)) for x, z in outline]
    bm.faces.new(front)
    bm.faces.new(list(reversed(back)))
    n = len(outline)
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new((front[i], back[i], back[j], front[j]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    obj = _mesh_object(name, bm, material, collection)
    place(obj, loc, rot)
    return smooth(bevel(obj, bev, 2))


def beam(name, a, b, width, material=None, bev=0.02, collection=None):
    start, end = Vector(a), Vector(b)
    obj = box(name, (width, width, (end - start).length), (0, 0, 0), material, bev, collection=collection)
    obj.location = (start + end) / 2
    obj.rotation_euler = (end - start).to_track_quat('Z', 'Y').to_euler()
    return obj


# ------------------------------------------------------------------ export
def _apply_all(objects):
    bpy.ops.object.select_all(action='DESELECT')
    for obj in objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.object.convert(target='MESH')  # applies modifiers
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)


def join(objects, name):
    """Join parts into one mesh named `name`, modifiers applied, origin at world origin."""
    objects = [o for o in objects if o.type == 'MESH']
    _apply_all(objects)
    bpy.ops.object.select_all(action='DESELECT')
    for obj in objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    if len(objects) > 1:
        bpy.ops.object.join()
    result = bpy.context.view_layer.objects.active
    result.name = name
    result.data.name = name
    bpy.context.scene.cursor.location = (0, 0, 0)
    bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
    return result


def triangles(obj):
    obj.data.calc_loop_triangles()
    return len(obj.data.loop_triangles)


def export_glb(objects, path):
    """Export the given (already joined) objects as one GLB. Returns the file size in bytes."""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    bpy.ops.object.select_all(action='DESELECT')
    for obj in objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True, export_yup=True,
                              export_apply=True, export_materials='EXPORT', export_extras=False,
                              export_cameras=False, export_lights=False, export_animations=False,
                              export_texcoords=False, export_normals=True)
    return os.path.getsize(path)


# ----------------------------------------------------------------- preview
def _engine(scene):
    for engine in ('BLENDER_EEVEE_NEXT', 'BLENDER_EEVEE'):
        try:
            scene.render.engine = engine
            return
        except TypeError:
            continue


def game_camera(target=(0, 0, 0), ortho_scale=10.0, name='Game camera'):
    """Matches the game: orthographic, offset (0, 23, 23) in three.js, i.e. looking down about 42°."""
    cam_data = bpy.data.cameras.new(name)
    cam_data.type = 'ORTHO'
    cam_data.ortho_scale = ortho_scale
    cam = bpy.data.objects.new(name, cam_data)
    bpy.context.scene.collection.objects.link(cam)
    tx, ty, tz = target
    cam.location = (tx, ty - 25.4, tz + 23.0)
    cam.rotation_euler = (math.radians(90 - 42.16), 0, 0)
    bpy.context.scene.camera = cam
    return cam


def studio(ground_color='#7DD957', size=(1200, 900), transparent=False):
    """Warm key, cool fill and a rim, with the Standard view transform so colour stays vivid."""
    scene = bpy.context.scene
    _engine(scene)
    scene.render.resolution_x, scene.render.resolution_y = size
    scene.render.film_transparent = transparent
    try:
        scene.view_settings.view_transform = 'Standard'
        scene.view_settings.look = 'None'
    except TypeError:
        pass
    world = bpy.data.worlds.get('Kit world') or bpy.data.worlds.new('Kit world')
    world.use_nodes = True
    bg = next(n for n in world.node_tree.nodes if n.type == 'BACKGROUND')
    bg.inputs['Color'].default_value = rgba('#BFE7FF')
    bg.inputs['Strength'].default_value = 0.9
    scene.world = world
    lights = []
    for name, kind, energy, color, rot in (
            ('Key', 'SUN', 3.6, '#FFF1D6', (math.radians(50), 0, math.radians(-35))),
            ('Fill', 'SUN', 1.1, '#CFE6FF', (math.radians(65), 0, math.radians(140))),
            ('Rim', 'SUN', 1.4, '#FFFFFF', (math.radians(30), 0, math.radians(180)))):
        data = bpy.data.lights.new(name, kind)
        data.energy = energy
        data.color = rgba(color)[:3]
        try:
            data.angle = math.radians(8)
        except AttributeError:
            pass
        obj = bpy.data.objects.new(name, data)
        obj.rotation_euler = rot
        scene.collection.objects.link(obj)
        lights.append(obj)
    ground = None
    if not transparent and ground_color:
        ground = box('Preview ground', (80, 80, 0.1), (0, 0, -0.05), mat('Preview ground', ground_color, 0.9), bev=0)
    return lights, ground


def render(path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    scene = bpy.context.scene
    ext = os.path.splitext(path)[1].lower()
    scene.render.image_settings.file_format = 'WEBP' if ext == '.webp' else 'PNG'
    if ext == '.webp':
        scene.render.image_settings.quality = 90
    scene.render.image_settings.color_mode = 'RGBA' if scene.render.film_transparent else 'RGB'
    scene.render.filepath = path
    bpy.ops.render.render(write_still=True)
    return path


# ------------------------------------------------- vertex-colour kit pieces (Farm Village AAA pass)
# The game bakes every root into one geometry with vertex colours (src/view/models.mjs). Pieces made with vc_join()
# already carry their colours in a COLOR_0 attribute with a single white material, so a root is one primitive in the
# GLB (smaller files, faster loads) and Blender previews show the same colours.
def _base_color(m):
    if m is None or not m.use_nodes:
        return (1, 1, 1)
    b = next((n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None)
    if b is None:
        return (1, 1, 1)
    c = b.inputs['Base Color'].default_value
    return (c[0], c[1], c[2])


def vc_material():
    m = bpy.data.materials.get('VC')
    if m:
        return m
    m = bpy.data.materials.new('VC')
    m.use_nodes = True
    nt = m.node_tree
    b = next(n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED')
    b.inputs['Roughness'].default_value = 0.6
    a = nt.nodes.new('ShaderNodeVertexColor')
    a.layer_name = 'Color'
    nt.links.new(a.outputs['Color'], b.inputs['Base Color'])
    return m


def to_vertex_colors(obj, tint=None):
    """Paint each face with its material's base colour (linear), then give the mesh the single VC material."""
    me = obj.data
    cols = [_base_color(s.material) for s in obj.material_slots] or [(1, 1, 1)]
    attr = me.color_attributes.get('Color') or me.color_attributes.new('Color', 'FLOAT_COLOR', 'CORNER')
    for poly in me.polygons:
        c = cols[min(poly.material_index, len(cols) - 1)]
        if tint:
            c = tint(c, poly)
        for li in poly.loop_indices:
            attr.data[li].color = (c[0], c[1], c[2], 1.0)
    me.color_attributes.active_color = attr
    me.materials.clear()
    me.materials.append(vc_material())
    return obj


def vc_join(parts, name, tint=None):
    o = join(parts, name)
    return to_vertex_colors(o, tint)


def leaf(name, base, angle, length, width, material, lift=0.25, droop=0.1, thick=0.03, tilt=0.0):
    """A small diamond leaf with a raised mid-rib, seen from both sides (8 triangles).
    base: (x, y, z); angle: direction on the plan; lift: how high the leaf's middle rises; droop: tip drops below it."""
    bm = bmesh.new()
    ca, sa = math.cos(angle), math.sin(angle)
    def at(d, side, h):
        return bm.verts.new((base[0] + ca * d - sa * side, base[1] + sa * d + ca * side, base[2] + h))
    b = at(0, 0, 0)
    t = at(length, 0, lift - droop)
    l = at(length * .45, width / 2, lift * .8 + tilt)
    r = at(length * .45, -width / 2, lift * .8 - tilt)
    u = at(length * .5, 0, lift + thick)
    d = at(length * .5, 0, lift - thick)
    for f in ((b, l, u), (l, t, u), (t, r, u), (r, b, u), (b, d, l), (l, d, t), (t, d, r), (r, d, b)):
        bm.faces.new(f)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return _mesh_object(name, bm, material)


def spindle(name, r, h, loc, material, sides=4, mid=(0.3, 0.7), lean=(0, 0), twist=0.0):
    """A faceted grain ear, pod or berry: point, two rings, point (sides * 4 triangles)."""
    bm = bmesh.new()
    x, y, z = loc
    def ring(f, rr):
        return [bm.verts.new((x + lean[0] * f * h + rr * math.cos(i * math.tau / sides + twist),
                              y + lean[1] * f * h + rr * math.sin(i * math.tau / sides + twist), z + f * h))
                for i in range(sides)]
    bot = bm.verts.new((x, y, z))
    r1, r2 = ring(mid[0], r), ring(mid[1], r * .85)
    top = bm.verts.new((x + lean[0] * h, y + lean[1] * h, z + h))
    for i in range(sides):
        j = (i + 1) % sides
        bm.faces.new((bot, r1[j], r1[i]))
        bm.faces.new((r1[i], r1[j], r2[j], r2[i]))
        bm.faces.new((r2[i], r2[j], top))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    o = _mesh_object(name, bm, material)
    for p in o.data.polygons:
        p.use_smooth = False
    return o


def stalk(name, a, b, r, material, sides=3, rt=None):
    """A thin open prism from point a to point b (sides * 2 triangles, no caps)."""
    bm = bmesh.new()
    A, B = Vector(a), Vector(b)
    axis = (B - A).normalized()
    ref = Vector((1, 0, 0)) if abs(axis.x) < .9 else Vector((0, 1, 0))
    u = axis.cross(ref).normalized()
    v = axis.cross(u)
    rt = r * .6 if rt is None else rt
    lo = [bm.verts.new(A + (u * math.cos(i * math.tau / sides) + v * math.sin(i * math.tau / sides)) * r) for i in range(sides)]
    hi = [bm.verts.new(B + (u * math.cos(i * math.tau / sides) + v * math.sin(i * math.tau / sides)) * rt) for i in range(sides)]
    for i in range(sides):
        j = (i + 1) % sides
        bm.faces.new((lo[i], lo[j], hi[j], hi[i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return _mesh_object(name, bm, material)


def export_vc(objects, path):
    """Export joined vertex-colour pieces (and any empties parented to them) as one GLB with COLOR_0."""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    bpy.ops.object.select_all(action='DESELECT')
    for obj in objects:
        obj.select_set(True)
        for c in obj.children_recursive:
            c.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True, export_yup=True,
                              export_apply=True, export_materials='EXPORT', export_extras=False,
                              export_cameras=False, export_lights=False, export_animations=False,
                              export_texcoords=False, export_normals=True, export_vertex_color='ACTIVE',
                              export_all_vertex_colors=False)
    return os.path.getsize(path)


def add_anchor(root, label, loc):
    """An empty named '<root>.<label>' parented to a joined root at origin; the game reads them as ANCHORS."""
    e = bpy.data.objects.new(f'{root.name}.{label}', None)
    e.empty_display_size = .2
    bpy.context.scene.collection.objects.link(e)
    e.location = loc
    e.parent = root
    return e
