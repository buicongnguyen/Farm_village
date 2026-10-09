import { runCompactHud } from './hud-compact-acceptance.mjs';
process.exitCode = await runCompactHud(true) ? 1 : 0;
