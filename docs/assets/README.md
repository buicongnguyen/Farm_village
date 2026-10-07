# Asset provenance by package

Each work package adds rows here for the models, icons and sounds it brings in (source repository, file, commit, changes).

## Art package

The art package's rows live in [`docs/ASSETS.md`](../ASSETS.md) (models, icons and the tools in `art/blender/`):

- Starline (`3D_game_scene` at 42424c7): props.glb and nature.glb pieces (`build_props.py`, `build_nature.py`),
  character and tool models used for icons, and the ported `render_icons.py` / `icon_post.py`.
- Willowmere (`3d_farmer_fish_sell` at 6390128): rural-extra.glb from `rural.glb`; farm.glb roots.
- Zoo Garden (`cute_game` at 96f8748): goat, kid, goose, gosling and their shelters in farm.glb.
- New in this repository: farm-kit.glb, decor.glb, the item models for icons (`build_items.py`) and all 73 icons.

Other packages add their files here: [juice](juice-provenance.md), [cast](cast-provenance.md).
