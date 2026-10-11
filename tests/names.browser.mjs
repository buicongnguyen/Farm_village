import { runNamesAcceptance } from './names-acceptance.mjs';
process.exitCode = await runNamesAcceptance(true) ? 1 : 0;
