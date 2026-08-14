import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import type { DailyProblem } from '../lib/leetcodeApi.js';
import { generatePersonalizedBlurb } from './aiPersonalizationService.js';

const PROBLEM: DailyProblem = {
  title: 'Longest Substring of One Repeating Character',
  titleSlug: 'longest-substring-of-one-repeating-character',
  difficulty: 'Hard',
  link: 'https://leetcode.com/problems/longest-substring-of-one-repeating-character/',
  date: '2026-08-13',
};

describe('generatePersonalizedBlurb', () => {
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

  function stubFetch(status: number, body: unknown): void {
    const stub: typeof fetch = (async () =>
      new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;
    globalThis.fetch = stub;
  }

  // If this fails: a length-truncated completion (reasoning model spent the
  // token budget on reasoning, finish_reason=length) is surfaced verbatim as
  // the embed description instead of falling back to the complete default.
  test('returns null when the provider truncates the response (finish_reason=length)', async () => {
    stubFetch(200, {
      choices: [{ message: { content: 'This one is a tricky' }, finish_reason: 'length' }],
    });
    expect(await generatePersonalizedBlurb('be encouraging', PROBLEM)).toBeNull();
  });

  // If this fails: a blurb that ends mid-sentence without a truncation signal
  // is surfaced as a cut-off description in the daily embed.
  test('returns null when the blurb ends mid-sentence', async () => {
    stubFetch(200, {
      choices: [
        {
          message: { content: 'Approach it step by step: first break down the dynamic changes' },
          finish_reason: 'stop',
        },
      ],
    });
    expect(await generatePersonalizedBlurb('be encouraging', PROBLEM)).toBeNull();
  });

  // If this fails: complete blurbs are rejected or their whitespace is not trimmed.
  test('returns the trimmed blurb when the completion is complete', async () => {
    stubFetch(200, {
      choices: [
        {
          message: { content: '  You have got this. Break it down and enjoy the win!  ' },
          finish_reason: 'stop',
        },
      ],
    });
    expect(await generatePersonalizedBlurb('be encouraging', PROBLEM)).toBe(
      'You have got this. Break it down and enjoy the win!'
    );
  });

  // If this fails: valid blurbs ending in non-period punctuation are rejected.
  test('accepts blurbs ending in ? or !', async () => {
    stubFetch(200, {
      choices: [{ message: { content: 'Ready to break it down?' }, finish_reason: 'stop' }],
    });
    expect(await generatePersonalizedBlurb('be encouraging', PROBLEM)).toBe('Ready to break it down?');

    stubFetch(200, {
      choices: [{ message: { content: 'Enjoy the win!' }, finish_reason: 'stop' }],
    });
    expect(await generatePersonalizedBlurb('be encouraging', PROBLEM)).toBe('Enjoy the win!');
  });

  // If this fails: max_tokens regressed below the reasoning headroom and
  // deepseek-v4-flash can truncate blurbs again (finish_reason=length).
  test('requests enough token headroom for reasoning models', async () => {
    let sentBody: { max_tokens?: number } = {};
    const stub: typeof fetch = (async (_url: RequestInfo | URL, init?: RequestInit) => {
      sentBody = JSON.parse(String(init?.body)) as { max_tokens?: number };
      return new Response(
        JSON.stringify({ choices: [{ message: { content: 'You can do it.' }, finish_reason: 'stop' }] }),
        { status: 200 }
      );
    }) as unknown as typeof fetch;
    globalThis.fetch = stub;
    await generatePersonalizedBlurb('be encouraging', PROBLEM);
    expect(sentBody.max_tokens).toBeGreaterThanOrEqual(500);
  });

  // If this fails: the AI is called (and may error) even though personalization is disabled.
  test('returns null without calling the provider when OPENCODE_API_KEY is unset', async () => {
    delete process.env.OPENCODE_API_KEY;
    let called = false;
    const stub: typeof fetch = (async () => {
      called = true;
      return new Response('{}', { status: 200 });
    }) as unknown as typeof fetch;
    globalThis.fetch = stub;
    expect(await generatePersonalizedBlurb('be encouraging', PROBLEM)).toBeNull();
    expect(called).toBe(false);
  });

  // If this fails: a non-OK provider response is treated as a usable blurb.
  test('returns null when the provider responds non-OK', async () => {
    stubFetch(500, {});
    expect(await generatePersonalizedBlurb('be encouraging', PROBLEM)).toBeNull();
  });

  // If this fails: an empty completion is treated as a usable blurb.
  test('returns null when the completion content is empty', async () => {
    stubFetch(200, {
      choices: [{ message: { content: '   ' }, finish_reason: 'stop' }],
    });
    expect(await generatePersonalizedBlurb('be encouraging', PROBLEM)).toBeNull();
  });
});
