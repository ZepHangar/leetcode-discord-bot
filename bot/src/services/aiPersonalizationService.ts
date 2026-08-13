/**
 * AI-personalized blurbs for daily LeetCode reminders, via OpenCode Go.
 *
 * @module services/aiPersonalizationService
 */
import { loadEnv } from '../lib/env.js';
import { logger } from '../lib/logger.js';
import type { DailyProblem } from '../lib/leetcodeApi.js';

const OPENCODE_GO_CHAT_URL = 'https://opencode.ai/zen/go/v1/chat/completions';

/** How long to wait for the AI provider before giving up (prevents the cron tick from hanging). */
const FETCH_TIMEOUT_MS = 10_000;

const SYSTEM_PROMPT =
  "You are a motivating coding coach. Write a short (2-3 sentence) personalized note introducing today's LeetCode daily problem, following the user's stated preferences. Do not include the problem link or title verbatim; that is shown separately.";

interface OpenCodeChatResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

/**
 * Generate a short personalized blurb introducing today's daily problem.
 *
 * @precondition `prompt` is non-empty.
 * @postcondition Returns a trimmed 2–4 sentence blurb, or `null` if `OPENCODE_API_KEY`
 *   is unset or the request/response fails — never throws, since this runs inside a
 *   background cron tick where a flaky third-party AI call must not block the rest
 *   of the dispatch.
 */
export async function generatePersonalizedBlurb(
  prompt: string,
  problem: DailyProblem
): Promise<string | null> {
  const env = loadEnv();
  if (!env.OPENCODE_API_KEY) return null;

  let res: Response;
  try {
    res = await fetch(OPENCODE_GO_CHAT_URL, {
      method: 'POST',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: {
        Authorization: `Bearer ${env.OPENCODE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: env.OPENCODE_GO_MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: `User preferences: ${prompt}\n\nToday's problem: "${problem.title}" (${problem.difficulty})`,
          },
        ],
        max_tokens: 200,
      }),
    });
  } catch (error) {
    logger.warn({ error }, 'OpenCode Go request failed');
    return null;
  }

  if (!res.ok) {
    logger.warn({ status: res.status }, 'OpenCode Go request failed');
    return null;
  }

  let data: OpenCodeChatResponse;
  try {
    data = (await res.json()) as OpenCodeChatResponse;
  } catch (error) {
    logger.warn({ error }, 'OpenCode Go response was not valid JSON');
    return null;
  }
  const content = data.choices?.[0]?.message?.content?.trim();
  return content || null;
}
