import { runLearningAcceptance } from './learning-acceptance.mjs';
process.exitCode = await runLearningAcceptance(false) ? 1 : 0;
