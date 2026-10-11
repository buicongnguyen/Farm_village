// Regenerate the room contract after editing its pure-data source. Furniture packing is documented in ASSETS.md.
import { writeFileSync } from 'node:fs';
import { COTTAGE_ROOM } from '../src/content/cottage.mjs';
writeFileSync(new URL('../public/assets/models/interior-cottage.json', import.meta.url), JSON.stringify(COTTAGE_ROOM, null, 2) + '\n');
