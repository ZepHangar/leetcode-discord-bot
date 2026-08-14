import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import type { DailyProblem } from '../lib/leetcodeApi.js';
import {
  buildDefaultCardContent,
  compressFeedback,
  fallbackCompressedSummary,
  generateDailyCardContent,
} from './aiPersonalizationService.js';

const PROBLEM: DailyProblem = {
  title: 'Maximum Length Substring With Two Occurrences',
  titleSlug: 'maximum-length-substring-with-two-occurrences',
  difficulty: 'Medium',
  link: 'https://leetcode.com/problems/maximum-length-substring-with-two-occurrences/',
  date: '2026-08-14',
  questionFrontendId: '3090',
  question: '<p>Given a string <code>s</code>, return the maximum length.</p>',
  exampleTestcases: 'bcbbbcba\n4',
  hints: ['Use a sliding window.'],
  solution: null,
};

function validGeneration(overrides?: Record<string, unknown>): unknown {
  return {
    description: 'This Medium problem is a combination of 3 different concepts.',
    tier: 'Medium',
    instructions: 'Given a string s, return the maximum length of a substring.',
    examples: 'Example 1: Input: s = "bcbbbcba", Output: 4',
    ...overrides,
  };
}

describe('generateDailyCardContent', () => {
  let originalEnv: NodeJS.ProcessEnv;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    originalEnv = { ...process.env };
    process.env.DISCORD_TOKEN = 'test-token';
    process.env.DATABASE_URL = 'postgresql://test';
    process.env.OPENCODE_API_KEY = 'sk-test';
  });

  afterEach(() => {
    process.env = originalEnv;
    globalThis.fetch = originalFetch;
  });

  /** Stub fetch: officialSolution lookups fail (→ null), chat completions return `body`. */
  function stubFetch(body: unknown, status = 200): void {
    const stub: typeof fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/officialSolution')) {
        return new Response('{}', { status: 500 });
      }
      return new Response(JSON.stringify(body), { status });
    }) as unknown as typeof fetch;
    globalThis.fetch = stub;
  }

  // If this fails: a valid JSON generation is rejected and the user never gets
  // their personalized card.
  test('returns the parsed generation for valid JSON', async () => {
    stubFetch({ choices: [{ message: { content: JSON.stringify(validGeneration()) }, finish_reason: 'stop' }] });
    const content = await generateDailyCardContent({ prompt: 'be encouraging', problem: PROBLEM, history: [] });
    expect(content).toEqual({
      description: 'This Medium problem is a combination of 3 different concepts.',
      tier: 'Medium',
      instructions: 'Given a string s, return the maximum length of a substring.',
      examples: 'Example 1: Input: s = "bcbbbcba", Output: 4',
    });
  });

  // If this fails: models that wrap JSON in code fences are rejected.
  test('accepts JSON wrapped in code fences', async () => {
    const wrapped = `\`\`\`json\n${JSON.stringify(validGeneration())}\n\`\`\``;
    stubFetch({ choices: [{ message: { content: wrapped }, finish_reason: 'stop' }] });
    const content = await generateDailyCardContent({ prompt: null, problem: PROBLEM, history: [] });
    expect(content?.tier).toBe('Medium');
  });

  // If this fails: a truncated generation (finish_reason=length) is surfaced as
  // a partial card instead of falling back to default content.
  test('returns null when the provider truncates the response', async () => {
    stubFetch({
      choices: [{ message: { content: '{"description": "This Medium', finish_reason: 'length' } }],
    });
    expect(await generateDailyCardContent({ prompt: 'x', problem: PROBLEM, history: [] })).toBeNull();
  });

  // If this fails: a non-JSON completion is treated as usable card content.
  test('returns null when the completion is not valid JSON', async () => {
    stubFetch({ choices: [{ message: { content: 'Sure, here is the problem.' }, finish_reason: 'stop' }] });
    expect(await generateDailyCardContent({ prompt: 'x', problem: PROBLEM, history: [] })).toBeNull();
  });

  // If this fails: an out-of-range difficulty tier is accepted, breaking the
  // tier-swap logic.
  test('returns null when the tier is not Easy/Medium/Hard', async () => {
    stubFetch({
      choices: [{ message: { content: JSON.stringify(validGeneration({ tier: 'Impossible' })), finish_reason: 'stop' } }],
    });
    expect(await generateDailyCardContent({ prompt: 'x', problem: PROBLEM, history: [] })).toBeNull();
  });

  // If this fails: a generation missing the instructions is accepted and the
  // card renders an empty problem statement.
  test('returns null when instructions are missing', async () => {
    stubFetch({
      choices: [{ message: { content: JSON.stringify(validGeneration({ instructions: '  ' })), finish_reason: 'stop' } }],
    });
    expect(await generateDailyCardContent({ prompt: 'x', problem: PROBLEM, history: [] })).toBeNull();
  });

  // If this fails: the AI is called (and may error) even though personalization is disabled.
  test('returns null without calling the provider when OPENCODE_API_KEY is unset', async () => {
    delete process.env.OPENCODE_API_KEY;
    let chatCalled = false;
    const stub: typeof fetch = (async (input: RequestInfo | URL) => {
      if (String(input).includes('opencode.ai')) chatCalled = true;
      return new Response('{}', { status: 500 });
    }) as unknown as typeof fetch;
    globalThis.fetch = stub;
    expect(await generateDailyCardContent({ prompt: 'x', problem: PROBLEM, history: [] })).toBeNull();
    expect(chatCalled).toBe(false);
  });

  // If this fails: the learner's history is not passed to the model, so the
  // feedback loop is broken.
  test('sends the compressed history to the provider', async () => {
    let sentBody = '';
    const stub: typeof fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/officialSolution')) return new Response('{}', { status: 500 });
      sentBody = String(init?.body);
      return new Response(
        JSON.stringify({ choices: [{ message: { content: JSON.stringify(validGeneration()) }, finish_reason: 'stop' }] }),
        { status: 200 }
      );
    }) as unknown as typeof fetch;
    globalThis.fetch = stub;
    const history = [
      {
        id: 1,
        discordUserId: 'u1',
        problemSlug: 'slug',
        problemTitle: 'Title',
        problemDate: '2026-08-13',
        kind: 'submission',
        difficultyRating: 'Easy',
        adjustment: null,
        compressedSummary: 'solved quickly with sliding window, wants more multi-step reasoning',
        codeUrl: null,
        codeFileName: null,
        createdAt: new Date(),
      },
    ];
    await generateDailyCardContent({ prompt: null, problem: PROBLEM, history });
    expect(sentBody).toContain('solved quickly with sliding window');
    expect(sentBody).toContain('2026-08-13');
  });
});

describe('compressFeedback', () => {
  let originalEnv: NodeJS.ProcessEnv;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    originalEnv = { ...process.env };
    process.env.DISCORD_TOKEN = 'test-token';
    process.env.DATABASE_URL = 'postgresql://test';
    process.env.OPENCODE_API_KEY = 'sk-test';
  });

  afterEach(() => {
    process.env = originalEnv;
    globalThis.fetch = originalFetch;
  });

  function stubFetch(content: string, finishReason = 'stop'): void {
    const stub: typeof fetch = (async () =>
      new Response(JSON.stringify({ choices: [{ message: { content }, finish_reason: finishReason }] }), {
        status: 200,
      })) as unknown as typeof fetch;
    globalThis.fetch = stub;
  }

  // If this fails: a complete compressed summary is rejected or not trimmed.
  test('returns the trimmed summary when the completion is complete', async () => {
    stubFetch('  Solved quickly with a sliding window and wants more multi-step reasoning.  ');
    const summary = await compressFeedback({
      kind: 'submission',
      rating: 'Easy',
      problemTitle: PROBLEM.title,
      problemDifficulty: PROBLEM.difficulty,
    });
    expect(summary).toBe('Solved quickly with a sliding window and wants more multi-step reasoning.');
  });

  // If this fails: an incomplete summary is stored and poisons the next generation.
  test('returns null when the summary ends mid-sentence', async () => {
    stubFetch('Solved it with a sliding window but the prompt');
    expect(
      await compressFeedback({
        kind: 'incdec',
        adjustment: 'Increase',
        feedbackText: 'too easy with sliding window',
        problemTitle: PROBLEM.title,
        problemDifficulty: PROBLEM.difficulty,
      })
    ).toBeNull();
  });

  // If this fails: an over-long summary is stored despite the prompt-context budget.
  test('returns null when the summary exceeds the length cap', async () => {
    stubFetch(`${'x'.repeat(250)}.`);
    expect(
      await compressFeedback({
        kind: 'submission',
        rating: 'Easy',
        problemTitle: PROBLEM.title,
        problemDifficulty: PROBLEM.difficulty,
      })
    ).toBeNull();
  });

  // If this fails: a truncated compression (finish_reason=length) is stored.
  test('returns null when the provider truncates the compression', async () => {
    stubFetch('Solved quickly with a sliding', 'length');
    expect(
      await compressFeedback({
        kind: 'submission',
        rating: 'Easy',
        problemTitle: PROBLEM.title,
        problemDifficulty: PROBLEM.difficulty,
      })
    ).toBeNull();
  });
});

describe('fallbackCompressedSummary', () => {
  // If this fails: the mechanical submission summary loses the rating signal.
  test('submission summary includes the rating', () => {
    expect(
      fallbackCompressedSummary({ kind: 'submission', rating: 'A good challenge', problemTitle: PROBLEM.title })
    ).toBe('Solved Maximum Length Substring With Two Occurrences and rated it "A good challenge".');
  });

  // If this fails: an Inc/Dec request without a model call loses the direction
  // and the free-text detail.
  test('incdec summary includes direction and details', () => {
    expect(
      fallbackCompressedSummary({
        kind: 'incdec',
        adjustment: 'Increase',
        feedbackText: 'want more graph problems',
        problemTitle: PROBLEM.title,
      })
    ).toBe('Wants the next problem harder (want more graph problems).');
  });

  // If this fails: give-ups are stored without a summary (or wrongly call the model).
  test('giveup summary is deterministic', () => {
    expect(fallbackCompressedSummary({ kind: 'giveup', problemTitle: PROBLEM.title })).toBe(
      'Gave up on Maximum Length Substring With Two Occurrences without submitting.'
    );
  });
});

describe('buildDefaultCardContent', () => {
  // If this fails: the non-personalized card loses the problem's own difficulty
  // tier or fails to render the plain statement.
  test('uses the problem difficulty and converted statement', () => {
    const content = buildDefaultCardContent(PROBLEM);
    expect(content.tier).toBe('Medium');
    expect(content.description).toContain("Today's LeetCode daily is up");
    expect(content.instructions).toBe('Given a string `s`, return the maximum length.');
    expect(content.examples).toBe('');
  });
});
