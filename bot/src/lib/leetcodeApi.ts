/**
 * Client for the internal `leetcode-api` service (alfa-leetcode-api).
 *
 * @module lib/leetcodeApi
 */
import { loadEnv } from './env.js';

/** Core identity of a LeetCode problem, shared by `/daily` and `/select`. */
export interface ProblemCore {
  title: string;
  titleSlug: string;
  difficulty: string;
  link: string;
}

/** Full statement/test/solution payload available on both `/daily` and `/select`. */
export interface ProblemDetails {
  /** Raw HTML of the problem statement (LeetCode markup). */
  question: string;
  /** Raw newline-separated example test cases (LeetCode format). */
  exampleTestcases: string;
  hints: string[];
  /** Official solution content (HTML), or null when premium-gated/unavailable. */
  solution: string | null;
}

/** Today's LeetCode daily challenge, mapped from the leetcode-api `/daily` response. */
export interface DailyProblem extends ProblemCore, ProblemDetails {
  date: string;
  /** LeetCode frontend id (the "#3090" in the wireframe header). */
  questionFrontendId: string;
}

/** Raw shape returned by `GET /daily` on the leetcode-api service. */
interface DailyProblemResponse {
  questionTitle: string;
  titleSlug: string;
  difficulty: string;
  questionLink: string;
  date: string;
  questionFrontendId: string;
  question: string;
  exampleTestcases: string;
  hints: string[];
}

/** Raw shape returned by `GET /select?titleSlug=...`. */
interface SelectProblemResponse {
  questionTitle: string;
  titleSlug: string;
  difficulty: string;
  link: string;
  question: string;
  exampleTestcases: string;
  hints: string[];
}

/** Raw shape returned by `GET /officialSolution?titleSlug=...`. */
interface OfficialSolutionResponse {
  questionTitle: string;
  solution: {
    content: string | null;
  } | null;
}

/** How long to wait for leetcode-api before giving up (prevents the cron tick from hanging). */
const FETCH_TIMEOUT_MS = 10_000;

/**
 * Fetch today's LeetCode daily problem.
 *
 * @throws {Error} If the request fails, times out, or leetcode-api responds with a non-OK status.
 */
export async function fetchDailyProblem(): Promise<DailyProblem> {
  const env = loadEnv();
  const res = await fetch(`${env.LEETCODE_API_URL}/daily`, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

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
    questionFrontendId: data.questionFrontendId,
    question: data.question,
    exampleTestcases: data.exampleTestcases,
    hints: data.hints ?? [],
    solution: null, // /daily exposes only solution metadata, never content
  };
}

/**
 * Fetch a problem's statement/test-case payload by slug.
 *
 * Used by the submission flow to recover the problem title/difficulty for a
 * card the user interacted with, without trusting client-supplied data.
 *
 * @throws {Error} If the request fails, times out, or leetcode-api responds with a non-OK status.
 */
export async function fetchProblemDetails(titleSlug: string): Promise<ProblemCore & ProblemDetails> {
  const env = loadEnv();
  const res = await fetch(`${env.LEETCODE_API_URL}/select?titleSlug=${encodeURIComponent(titleSlug)}`, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (!res.ok) {
    throw new Error(`leetcode-api /select returned ${res.status}`);
  }

  const data = (await res.json()) as SelectProblemResponse;

  return {
    title: data.questionTitle,
    titleSlug: data.titleSlug,
    difficulty: data.difficulty,
    link: data.link,
    question: data.question,
    exampleTestcases: data.exampleTestcases,
    hints: data.hints ?? [],
    solution: null,
  };
}

/**
 * Fetch the official solution content for a problem slug.
 *
 * @returns The official solution HTML, or `null` when the solution is
 *   premium-gated, missing, or the endpoint fails — never throws, since the
 *   reference solution is only enrichment for the AI prompt.
 */
export async function fetchOfficialSolution(titleSlug: string): Promise<string | null> {
  const env = loadEnv();
  try {
    const res = await fetch(`${env.LEETCODE_API_URL}/officialSolution?titleSlug=${encodeURIComponent(titleSlug)}`, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as OfficialSolutionResponse;
    return data.solution?.content?.trim() || null;
  } catch {
    return null;
  }
}
