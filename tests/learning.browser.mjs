import { runLearningAcceptance } from './learning-acceptance.mjs';
process.exitCode = await runLearningAcceptance(true) ? 1 : 0;
