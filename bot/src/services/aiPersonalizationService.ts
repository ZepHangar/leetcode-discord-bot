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
  choices?: Array<{
    message?: { content?: string };
    finish_reason?: string;
  }>;
}

/**
 * Generate a short personalized blurb introducing today's daily problem.
 *
 * @precondition `prompt` is non-empty.
 * @postcondition Returns a trimmed 2–4 sentence blurb, or `null` if `OPENCODE_API_KEY`
 *   is unset, the request/response fails, or the provider returns a truncated
 *   (mid-sentence) completion — never throws, since this runs inside a
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
        // deepseek-v4-flash (and other Go reasoning models) count reasoning
        // tokens against max_tokens; leave headroom so the visible blurb isn't
        // cut off mid-sentence when the model reasons long.
        max_tokens: 500,
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
  const choice = data.choices?.[0];
  const content = choice?.message?.content?.trim();
  if (!content) return null;

  // A `length` finish_reason means the model hit the token budget mid-sentence
  // (reasoning models spend tokens reasoning before writing). Surfacing the
  // partial text as the embed description is the bug reported in #17; treat it
  // as a failed generation so the caller falls back to a complete default
  // description instead of a cut-off sentence.
  if (choice?.finish_reason?.toLowerCase() === 'length') {
    logger.warn({ prompt }, 'OpenCode Go response truncated (finish_reason=length); using fallback description');
    return null;
  }

  // Guard against models that stop early without signalling truncation: a blurb
  // that doesn't end in sentence-final punctuation is incomplete.
  if (!/[.!?…:]["'”’)]*$/.test(content)) {
    logger.warn({ prompt }, 'OpenCode Go blurb ended mid-sentence; using fallback description');
    return null;
  }

  return content;
}
