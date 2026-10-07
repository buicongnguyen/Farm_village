"""Keep only some root pieces of a GLB kit (smaller downloads: TECH-PLAN 6, loading order).

Run:  blender --background --factory-startup --python art/blender/extract_kit.py -- <in.glb> <out.glb> <name> [<name> ...]
Example: ... -- public/assets/models/rural.glb public/assets/models/rural-lite.glb home_t1 barn mailbox windmill windmill_rotor
"""
import bpy, sys, os
args = sys.argv[sys.argv.index('--') + 1:]
src, out, keep = args[0], args[1], set(args[2:])
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
roots = [o for o in bpy.context.scene.objects if o.parent is None]
for r in roots:
    if r.name.split('.')[0] not in keep:
        for o in [r] + list(r.children_recursive):
            bpy.data.objects.remove(o, do_unlink=True)
kept = [o.name for o in bpy.context.scene.objects if o.parent is None]
bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', export_yup=True, export_apply=False, export_materials='EXPORT',
                          export_cameras=False, export_lights=False, export_animations=False, export_texcoords=False, export_normals=True)
print(f'kept {sorted(kept)} -> {out} ({os.path.getsize(out)} bytes)')
