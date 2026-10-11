import { runLocaleLoadingAcceptance } from './locale-loading-acceptance.mjs';
process.exitCode = await runLocaleLoadingAcceptance() ? 1 : 0;
