import { runCompactHud } from './hud-compact-acceptance.mjs';
process.exitCode = await runCompactHud(false) ? 1 : 0;
