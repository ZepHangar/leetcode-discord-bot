/**
 * cv2 card, modal, and Give-Up view builders for the daily problem flow.
 *
 * Pure presentation: every function maps problem/card content to a Discord
 * payload. No DB or AI access — content resolution lives in
 * `services/dailyCardService.ts`.
 *
 * @module features/daily/dailyCard
 */
import {
  FileUploadBuilder,
  LabelBuilder,
  ModalBuilder,
  RadioGroupBuilder,
  TextInputBuilder,
} from '@discordjs/builders';
import { TextInputStyle, type APIRadioGroupOption } from 'discord.js';
import type { CV2MessageOptions } from '../../cv2/index.js';
import type { DailyProblem } from '../../lib/leetcodeApi.js';
import type { DailyCardGeneration } from '../../services/aiPersonalizationService.js';
import { buildCustomId } from '../../utils/customId.js';

const CATEGORY = 'daily';
const COMMAND = 'daily';

/** Self-report rating options for the Submission modal (value → label). */
export const RATING_OPTIONS: readonly APIRadioGroupOption[] = [
  { value: 'piece-of-cake', label: 'Piece of cake' },
  { value: 'easy', label: 'Easy' },
  { value: 'good-challenge', label: 'A good challenge' },
  { value: 'struggled', label: 'I struggled a bit there' },
  { value: 'how', label: 'How do people even do these!?!?' },
];

export const RATING_LABEL_BY_VALUE: Readonly<Record<string, string>> = Object.fromEntries(
  RATING_OPTIONS.map((opt) => [opt.value, opt.label])
);

/**
 * Difficulty emojis — placeholder custom emoji IDs until real assets exist.
 * Only the IDs need replacing; the swap-per-tier logic is already wired.
 */
export const DIFFICULTY_EMOJI: Record<string, { id: string; name: string }> = {
  Easy: { id: '000000000000000000', name: 'easy' },
  Medium: { id: '000000000000000000', name: 'medium' },
  Hard: { id: '000000000000000000', name: 'hard' },
};

const TIER_COLOR: Record<string, number> = {
  Easy: 0x43a047,
  Medium: 0xf9a825,
  Hard: 0xe53935,
};

/** Render the custom emoji for a tier as `<:name:id>` markdown. */
export function difficultyEmojiMarkdown(tier: string): string {
  const emoji = DIFFICULTY_EMOJI[tier] ?? DIFFICULTY_EMOJI['Medium']!;
  return `<:${emoji.name}:${emoji.id}>`;
}

/** Unix seconds for a "YYYY-MM-DD" challenge date (midnight UTC). */
export function unixTimestampFor(dateStr: string): number {
  return Math.floor(Date.parse(`${dateStr}T00:00:00Z`) / 1000);
}

/**
 * UTF-8 byte-aware truncation for cv2's 4000-byte message text budget.
 *
 * @postcondition Result is at most `maxBytes` UTF-8 bytes and ends in `…` when truncated.
 */
export function truncateToBytes(text: string, maxBytes: number): string {
  if (Buffer.byteLength(text, 'utf8') <= maxBytes) return text;
  const contentBudget = maxBytes - Buffer.byteLength('…', 'utf8');
  let end = text.length;
  while (end > 0 && Buffer.byteLength(text.slice(0, end), 'utf8') > contentBudget) end -= 1;
  return `${text.slice(0, end).trimEnd()}…`;
}

// Per-field byte budgets keep the assembled card under cv2's 4000-byte cap
// even for long statements: header+labels+buttons ≈ 500 bytes worst case.
const DESCRIPTION_BUDGET = 500;
const INSTRUCTIONS_BUDGET = 1800;
const EXAMPLES_BUDGET = 1200;

/**
 * The daily problem card: masked-link header, description, instructions,
 * examples, and the Submit / Inc-Dec Difficulty / Give Up action row.
 *
 * @precondition `problem.questionFrontendId` is the "#3090" shown in the subtitle.
 * @postcondition `flags` includes the Components V2 bit (32768); text total ≤ 4000 bytes.
 */
export function buildDailyCard(problem: DailyProblem, content: DailyCardGeneration): CV2MessageOptions {
  const date = problem.date;
  const slug = problem.titleSlug;
  const description = `${difficultyEmojiMarkdown(content.tier)} ${content.description}`;
  // Built as a string: a literal `<t:...:t>` in JSX parses as a namespaced tag.
  const timestamp = `<t:${unixTimestampFor(date)}:t>`;

  return (
    <message>
      <container accentColor={TIER_COLOR[content.tier] ?? 0x5865f2}>
        <text-display>
          [{problem.title}]({problem.link}){'\n'}Daily Leetcode #{problem.questionFrontendId} • {timestamp}
        </text-display>
        <text-display>## Description{'\n'}{truncateToBytes(description, DESCRIPTION_BUDGET)}</text-display>
        <separator />
        <text-display>## Instructions{'\n'}{truncateToBytes(content.instructions, INSTRUCTIONS_BUDGET)}</text-display>
        {content.examples.length > 0 ? (
          <text-display>## Examples{'\n'}{truncateToBytes(content.examples, EXAMPLES_BUDGET)}</text-display>
        ) : null}
        <separator />
        <row>
          <button
            style="success"
            customId={buildCustomId(CATEGORY, COMMAND, 'submit', date, slug)}
            label="Submit"
          />
          <button
            style="secondary"
            customId={buildCustomId(CATEGORY, COMMAND, 'incdec', date, slug)}
            label="Inc/Dec Difficulty"
          />
          <button
            style="danger"
            customId={buildCustomId(CATEGORY, COMMAND, 'giveup', date, slug)}
            label="Give Up"
          />
        </row>
      </container>
    </message>
  );
}

/**
 * The Submission modal: Label-wrapped Radio Group (difficulty) + File Upload (code).
 *
 * @postcondition The modal customId carries `daily:daily:submit:<date>:<slug>`
 *   so the submit handler knows which problem the feedback is for.
 */
export function buildSubmissionModal(date: string, slug: string): ModalBuilder {
  return new ModalBuilder()
    .setCustomId(buildCustomId(CATEGORY, COMMAND, 'submit', date, slug))
    .setTitle('Problem Submission')
    .addLabelComponents(
      new LabelBuilder()
        .setLabel('How hard was this problem?')
        .setRadioGroupComponent(
          new RadioGroupBuilder()
            .setCustomId('difficulty')
            .setRequired(true)
            .setOptions([...RATING_OPTIONS])
        ),
      new LabelBuilder()
        .setLabel('Upload your code here')
        .setFileUploadComponent(new FileUploadBuilder().setCustomId('code').setRequired(true))
    );
}

/**
 * The Inc/Dec Difficulty modal: Label-wrapped Radio Group (direction) + optional
 * paragraph Text Input (details).
 *
 * @postcondition The modal customId carries `daily:daily:incdec:<date>:<slug>`.
 */
export function buildIncDecModal(date: string, slug: string): ModalBuilder {
  return new ModalBuilder()
    .setCustomId(buildCustomId(CATEGORY, COMMAND, 'incdec', date, slug))
    .setTitle('Inc/Dec Difficulty')
    .addLabelComponents(
      new LabelBuilder()
        .setLabel('Increase or decrease difficulty?')
        .setRadioGroupComponent(
          new RadioGroupBuilder()
            .setCustomId('adjustment')
            .setRequired(true)
            .setOptions([
              { value: 'increase', label: 'Increase' },
              { value: 'decrease', label: 'Decrease' },
            ])
        ),
      new LabelBuilder()
        .setLabel('Anything else you want changed?')
        .setTextInputComponent(
          new TextInputBuilder()
            .setCustomId('details')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(false)
            .setMaxLength(1000)
            .setPlaceholder('The problem was easy to solve using X or Y algorithm...')
        )
    );
}

/**
 * Ephemeral Give Up confirmation: Yes (danger), disabled spacer, No (success).
 *
 * @postcondition The spacer is disabled and carries a customId per cv2 rules;
 *   Yes carries `daily:daily:giveup-yes:<date>:<slug>` so the choice can be
 *   persisted against the right problem.
 */
export function buildGiveUpConfirmView(date: string, slug: string): CV2MessageOptions {
  return (
    <message ephemeral>
      <container>
        <text-display>Are you sure you want to give up?</text-display>
        <row>
          <button
            style="danger"
            customId={buildCustomId(CATEGORY, COMMAND, 'giveup-yes', date, slug)}
            label="Yes"
          />
          <button
            style="secondary"
            customId={buildCustomId(CATEGORY, COMMAND, 'giveup-spacer')}
            label=" "
            disabled
          />
          <button style="success" customId={buildCustomId(CATEGORY, COMMAND, 'giveup-no')} label="No" />
        </row>
      </container>
    </message>
  );
}

/**
 * The collapsed Give Up state, edited in place after a choice so a visible
 * record of the decision remains.
 *
 * @postcondition All three buttons are disabled; they can never fire again.
 */
export function buildGiveUpResolvedView(gaveUp: boolean): CV2MessageOptions {
  return (
    <message ephemeral>
      <container>
        <text-display>{gaveUp ? 'You gave up on this problem.' : 'Give up cancelled.'}</text-display>
        <row>
          <button style="danger" customId={buildCustomId(CATEGORY, COMMAND, 'giveup-yes')} label="Yes" disabled />
          <button
            style="secondary"
            customId={buildCustomId(CATEGORY, COMMAND, 'giveup-spacer')}
            label=" "
            disabled
          />
          <button style="success" customId={buildCustomId(CATEGORY, COMMAND, 'giveup-no')} label="No" disabled />
        </row>
      </container>
    </message>
  );
}
