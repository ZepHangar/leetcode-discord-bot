/**
 * Client for the internal `leetcode-api` service (alfa-leetcode-api).
 *
 * @module lib/leetcodeApi
 */
import { loadEnv } from './env.js';

/** Today's LeetCode daily challenge, mapped from the leetcode-api `/daily` response. */
export interface DailyProblem {
  title: string;
  titleSlug: string;
  difficulty: string;
  link: string;
  date: string;
}

/** Raw shape returned by `GET /daily` on the leetcode-api service. */
interface DailyProblemResponse {
  questionTitle: string;
  titleSlug: string;
  difficulty: string;
  questionLink: string;
  date: string;
}

/**
 * Fetch today's LeetCode daily problem.
 *
 * @throws {Error} If the request fails or leetcode-api responds with a non-OK status.
 */
export async function fetchDailyProblem(): Promise<DailyProblem> {
  const env = loadEnv();
  const res = await fetch(`${env.LEETCODE_API_URL}/daily`);

  if (!res.ok) {
    throw new Error(`leetcode-api /daily returned ${res.status}`);
  }

  const data = (await res.json()) as DailyProblemResponse;

  return {
    title: data.questionTitle,
    titleSlug: data.titleSlug,
    difficulty: data.difficulty,
    link: data.questionLink,
    date: data.date,
  };
}
