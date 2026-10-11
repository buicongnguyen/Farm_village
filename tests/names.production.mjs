import { runNamesAcceptance } from './names-acceptance.mjs';
process.exitCode = await runNamesAcceptance(false) ? 1 : 0;
