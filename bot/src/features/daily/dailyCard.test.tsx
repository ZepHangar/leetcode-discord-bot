import { ComponentType } from 'discord.js';
import { describe, expect, test } from 'bun:test';
import type { DailyProblem } from '../../lib/leetcodeApi.js';
import type { DailyCardGeneration } from '../../services/aiPersonalizationService.js';
import {
  buildDailyCard,
  buildGiveUpConfirmView,
  buildGiveUpResolvedView,
  buildIncDecModal,
  buildSubmissionModal,
  DIFFICULTY_EMOJI,
  difficultyEmojiMarkdown,
  RATING_OPTIONS,
  truncateToBytes,
  unixTimestampFor,
} from './dailyCard.js';

const PROBLEM: DailyProblem = {
  title: 'Maximum Length Substring With Two Occurrences',
  titleSlug: 'maximum-length-substring-with-two-occurrences',
  difficulty: 'Medium',
  link: 'https://leetcode.com/problems/maximum-length-substring-with-two-occurrences/',
  date: '2026-08-14',
  questionFrontendId: '3090',
  question: '<p>Given a string <code>s</code>, return the max length.</p>',
  exampleTestcases: 'bcbbbcba\n4',
  hints: ['Use a sliding window.'],
  solution: null,
};

const CONTENT: DailyCardGeneration = {
  description: 'This Medium problem is a combination of 3 different concepts.',
  tier: 'Medium',
  instructions: 'Given a string s, return the maximum length of a substring with at most two occurrences of any character.',
  examples: '**Example 1:**\nInput: s = "bcbbbcba"\nOutput: 4\nExplanation: ...',
};

function flattenText(node: unknown, acc: string[] = []): string[] {
  if (Array.isArray(node)) {
    for (const item of node) flattenText(item, acc);
    return acc;
  }
  if (typeof node !== 'object' || node === null) return acc;
  const record = node as Record<string, unknown>;
  if (typeof record.content === 'string') acc.push(record.content);
  if (Array.isArray(record.components)) for (const child of record.components) flattenText(child, acc);
  if (record.accessory !== undefined) flattenText(record.accessory, acc);
  return acc;
}

function flattenButtons(node: unknown, acc: Array<Record<string, unknown>> = []): Array<Record<string, unknown>> {
  if (Array.isArray(node)) {
    for (const item of node) flattenButtons(item, acc);
    return acc;
  }
  if (typeof node !== 'object' || node === null) return acc;
  const record = node as Record<string, unknown>;
  if (record.type === 2) acc.push(record);
  if (Array.isArray(record.components)) for (const child of record.components) flattenButtons(child, acc);
  return acc;
}

// If this fails: the daily message is not a Components V2 card, or the header
// no longer links to the problem with the daily subtitle.
test('builds the card with masked-link header and subtitle', () => {
  const card = buildDailyCard(PROBLEM, CONTENT);
  expect(card.flags & 32768).toBe(32768);
  const text = flattenText(card.components).join('\n');
  expect(text).toContain('[Maximum Length Substring With Two Occurrences](https://leetcode.com/problems/maximum-length-substring-with-two-occurrences/)');
  expect(text).toContain('Daily Leetcode #3090');
  expect(text).toContain(`<t:${unixTimestampFor('2026-08-14')}:t>`);
});

// If this fails: the description/instructions/examples sections are missing or
// the tier emoji is not rendered into the description.
test('renders description with tier emoji, instructions, and examples sections', () => {
  const card = buildDailyCard(PROBLEM, CONTENT);
  const text = flattenText(card.components).join('\n');
  expect(text).toContain('## Description');
  expect(text).toContain(`${difficultyEmojiMarkdown('Medium')} This Medium problem is a combination of 3 different concepts.`);
  expect(text).toContain('## Instructions');
  expect(text).toContain('## Examples');
});

// If this fails: examples-less (default) content renders an empty Examples section.
test('omits the Examples section when content has none', () => {
  const card = buildDailyCard(PROBLEM, { ...CONTENT, examples: '' });
  expect(flattenText(card.components).join('\n')).not.toContain('## Examples');
});

// If this fails: the action row is missing or the buttons are mislabeled/misstyled.
test('action row has Submit (success), Inc/Dec Difficulty (secondary), Give Up (danger)', () => {
  const card = buildDailyCard(PROBLEM, CONTENT);
  const buttons = flattenButtons(card.components);
  expect(buttons.map((b) => [b.label, b.style, b.custom_id])).toEqual([
    ['Submit', 3, 'daily:daily:submit:2026-08-14:maximum-length-substring-with-two-occurrences'],
    ['Inc/Dec Difficulty', 2, 'daily:daily:incdec:2026-08-14:maximum-length-substring-with-two-occurrences'],
    ['Give Up', 4, 'daily:daily:giveup:2026-08-14:maximum-length-substring-with-two-occurrences'],
  ]);
});

// If this fails: an oversized statement is passed to Discord instead of being
// truncated to the 4000-byte cv2 budget, causing a hard send failure.
test('truncates card text to the cv2 message budget', () => {
  const longInstructions = 'x'.repeat(3000);
  const card = buildDailyCard(PROBLEM, { ...CONTENT, instructions: longInstructions, examples: 'y'.repeat(2000) });
  const totalBytes = Buffer.byteLength(flattenText(card.components).join(''), 'utf8');
  expect(totalBytes).toBeLessThanOrEqual(4000);
});

// If this fails: truncation splits mid-character for multi-byte UTF-8 text.
test('truncateToBytes never splits a multi-byte character', () => {
  const text = 'é'.repeat(100);
  const cut = truncateToBytes(text, 10);
  expect(Buffer.byteLength(cut, 'utf8')).toBeLessThanOrEqual(10);
  expect(() => Buffer.from(cut, 'utf8').toString('utf8')).not.toThrow();
});

// If this fails: the Submission modal loses the problem identity, the radio
// options, or the mandatory file upload.
test('Submission modal carries problem args, 5 radio options, and required file upload', () => {
  const modal = buildSubmissionModal('2026-08-14', 'max-length-substring-with-two-occurrences').toJSON();
  expect(modal.custom_id).toBe('daily:daily:submit:2026-08-14:max-length-substring-with-two-occurrences');
  expect(modal.title).toBe('Problem Submission');
  const labels = modal.components!.map((component) => component as unknown as { type: number; label: string; component: Record<string, unknown> });
  expect(labels.map((l) => l.label)).toEqual(['How hard was this problem?', 'Upload your code here']);
  const radio = labels[0]!.component;
  expect(radio.type).toBe(ComponentType.RadioGroup);
  expect((radio as { options: unknown[] }).options).toHaveLength(5);
  const upload = labels[1]!.component;
  expect(upload.type).toBe(ComponentType.FileUpload);
  expect((upload as { required: boolean }).required).toBe(true);
});

// If this fails: the difficulty options drifted from the wireframe's five labels.
test('rating options match the wireframe exactly', () => {
  expect(RATING_OPTIONS.map((o) => o.label)).toEqual([
    'Piece of cake',
    'Easy',
    'A good challenge',
    'I struggled a bit there',
    'How do people even do these!?!?',
  ]);
});

// If this fails: the Inc/Dec modal loses the direction radio group or the
// optional paragraph input.
test('Inc/Dec modal has 2-option radio group and optional paragraph input', () => {
  const modal = buildIncDecModal('2026-08-14', 'slug').toJSON();
  expect(modal.custom_id).toBe('daily:daily:incdec:2026-08-14:slug');
  expect(modal.title).toBe('Inc/Dec Difficulty');
  const labels = modal.components!.map((component) => component as unknown as { label: string; component: Record<string, unknown> });
  const radio = labels[0]!.component;
  expect(radio.type).toBe(ComponentType.RadioGroup);
  expect((radio as { options: unknown[] }).options).toHaveLength(2);
  const input = labels[1]!.component;
  expect(input.type).toBe(ComponentType.TextInput);
  expect(input).toMatchObject({ required: false, placeholder: 'The problem was easy to solve using X or Y algorithm...' });
});

// If this fails: the Give Up confirm row is not a Yes / disabled spacer / No row.
test('Give Up confirmation has danger Yes, disabled spacer, success No', () => {
  const view = buildGiveUpConfirmView('2026-08-14', 'slug');
  const buttons = flattenButtons(view.components);
  expect(buttons.map((b) => [b.label, b.style, b.disabled])).toEqual([
    ['Yes', 4, undefined],
    [' ', 2, true],
    ['No', 3, undefined],
  ]);
});

// If this fails: the collapsed Give Up state leaves buttons clickable, breaking
// the "visible record of the choice" requirement.
test('resolved Give Up view disables every button', () => {
  for (const gaveUp of [true, false]) {
    const view = buildGiveUpResolvedView(gaveUp);
    const buttons = flattenButtons(view.components);
    expect(buttons.every((b) => b.disabled === true)).toBe(true);
    expect(flattenText(view.components).join('')).toContain(gaveUp ? 'gave up' : 'cancelled');
  }
});

// If this fails: the tier emoji swap maps the wrong name/id to a tier.
test('difficulty emoji swaps per tier with placeholder IDs', () => {
  expect(difficultyEmojiMarkdown('Easy')).toBe(`<:${DIFFICULTY_EMOJI['Easy']!.name}:${DIFFICULTY_EMOJI['Easy']!.id}>`);
  expect(difficultyEmojiMarkdown('Hard')).toBe(`<:${DIFFICULTY_EMOJI['Hard']!.name}:${DIFFICULTY_EMOJI['Hard']!.id}>`);
});
