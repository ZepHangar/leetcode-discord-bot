/**
 * Orchestrates daily-card content: model-personalized when the user has
 * context, default content otherwise.
 *
 * @module services/dailyCardService
 */
import type { DailyProblem } from '../lib/leetcodeApi.js';
import {
  buildDefaultCardContent,
  generateDailyCardContent,
  type DailyCardGeneration,
} from './aiPersonalizationService.js';
import { getUserSetup } from './setupService.js';
import { listUserHistory } from './submissionService.js';

/**
 * Resolve the content for one user's daily card.
 *
 * @param personalized `false` for guild-shared cards, which are never
 *   personalized (the message is shared between users).
 * @postcondition Returns model-personalized content when the user has an AI
 *   prompt or history and generation succeeds; otherwise the default content.
 *   Never throws.
 */
export async function resolveDailyCardContent(
  discordUserId: string,
  opts: { personalized: boolean },
  problem: DailyProblem
): Promise<DailyCardGeneration> {
  if (!opts.personalized) return buildDefaultCardContent(problem);

  const [setup, history] = await Promise.all([
    getUserSetup(discordUserId),
    listUserHistory(discordUserId),
  ]);
  if (!setup?.aiPrompt && history.length === 0) return buildDefaultCardContent(problem);

  return (
    (await generateDailyCardContent({ prompt: setup?.aiPrompt ?? null, problem, history })) ??
    buildDefaultCardContent(problem)
  );
}
