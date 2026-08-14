import {
  SlashCommandSubcommandBuilder,
  type ChatInputCommandInteraction,
} from 'discord.js';
import type { Command } from '../../types/command.js';
import { fetchDailyProblem, fetchProblemDetails } from '../../lib/leetcodeApi.js';
import { compressFeedback, fallbackCompressedSummary } from '../../services/aiPersonalizationService.js';
import { resolveDailyCardContent } from '../../services/dailyCardService.js';
import { createSubmission } from '../../services/submissionService.js';
import {
  buildDailyCard,
  buildGiveUpConfirmView,
  buildGiveUpResolvedView,
  buildIncDecModal,
  buildSubmissionModal,
  RATING_LABEL_BY_VALUE,
} from '../../features/daily/dailyCard.js';
import { getRadioGroupValue, getUploadedFile } from '../../features/daily/modalFields.js';

export const data = new SlashCommandSubcommandBuilder()
  .setName('daily')
  .setDescription("Show today's LeetCode daily problem");

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const problem = await fetchDailyProblem();
  // Guild cards are shared between members, so they are never personalized.
  const content = await resolveDailyCardContent(
    interaction.user.id,
    { personalized: !interaction.inGuild() },
    problem
  );
  await interaction.reply(buildDailyCard(problem, content));
}

function parseProblemArgs(args: string[]): { date: string; slug: string } {
  const [date, slug] = args;
  if (!date || !slug) throw new Error('daily interaction missing problem args');
  return { date, slug };
}

const buttons: Command['buttons'] = {
  submit: async (interaction, args) => {
    const { date, slug } = parseProblemArgs(args);
    await interaction.showModal(buildSubmissionModal(date, slug));
  },

  incdec: async (interaction, args) => {
    const { date, slug } = parseProblemArgs(args);
    await interaction.showModal(buildIncDecModal(date, slug));
  },

  giveup: async (interaction, args) => {
    const { date, slug } = parseProblemArgs(args);
    await interaction.reply(buildGiveUpConfirmView(date, slug));
  },

  'giveup-yes': async (interaction, args) => {
    const { date, slug } = parseProblemArgs(args);
    // The problem lookup is a network call; defer to extend the response window.
    await interaction.deferUpdate();
    // Problem lookup is best-effort here; the record still persists on failure.
    let problemTitle = slug;
    try {
      problemTitle = (await fetchProblemDetails(slug)).title;
    } catch {
      // keep slug as the title fallback
    }
    await createSubmission({
      discordUserId: interaction.user.id,
      problemSlug: slug,
      problemTitle,
      problemDate: date,
      kind: 'giveup',
      compressedSummary: fallbackCompressedSummary({ kind: 'giveup', problemTitle }),
    });
    await interaction.editReply(buildGiveUpResolvedView(true));
  },

  'giveup-no': async (interaction) => {
    await interaction.update(buildGiveUpResolvedView(false));
  },
};

const modals: Command['modals'] = {
  submit: async (interaction, args) => {
    const { date, slug } = parseProblemArgs(args);
    // The compression call can take seconds; defer to extend the response window.
    await interaction.deferReply({ ephemeral: true });

    const ratingValue = getRadioGroupValue(interaction.fields, 'difficulty');
    if (!ratingValue) {
      await interaction.editReply({ content: 'Please pick how hard the problem was.' });
      return;
    }

    const file = getUploadedFile(interaction.fields, 'code');
    if (!file) {
      await interaction.editReply({ content: 'Please attach your code file to submit.' });
      return;
    }

    const problem = await fetchProblemDetails(slug);
    const ratingLabel = RATING_LABEL_BY_VALUE[ratingValue] ?? ratingValue;
    const summary =
      (await compressFeedback({
        kind: 'submission',
        rating: ratingLabel,
        problemTitle: problem.title,
        problemDifficulty: problem.difficulty,
      })) ??
      fallbackCompressedSummary({ kind: 'submission', rating: ratingLabel, problemTitle: problem.title });

    await createSubmission({
      discordUserId: interaction.user.id,
      problemSlug: slug,
      problemTitle: problem.title,
      problemDate: date,
      kind: 'submission',
      difficultyRating: ratingLabel,
      compressedSummary: summary,
      codeUrl: file.url,
      codeFileName: file.name,
    });

    await interaction.editReply({ content: `Submission recorded for **${problem.title}**.` });
  },

  incdec: async (interaction, args) => {
    const { date, slug } = parseProblemArgs(args);
    // The compression call can take seconds; defer to extend the response window.
    await interaction.deferReply({ ephemeral: true });

    const adjustmentValue = getRadioGroupValue(interaction.fields, 'adjustment');
    if (!adjustmentValue) {
      await interaction.editReply({ content: 'Please pick increase or decrease.' });
      return;
    }

    const adjustment = adjustmentValue === 'increase' ? 'Increase' : 'Decrease';
    const details = interaction.fields.getTextInputValue('details').trim();
    const feedbackText = details.length > 0 ? details : undefined;
    const problem = await fetchProblemDetails(slug);
    const summary =
      (await compressFeedback({
        kind: 'incdec',
        adjustment,
        feedbackText,
        problemTitle: problem.title,
        problemDifficulty: problem.difficulty,
      })) ??
      fallbackCompressedSummary({
        kind: 'incdec',
        adjustment,
        feedbackText,
        problemTitle: problem.title,
      });

    await createSubmission({
      discordUserId: interaction.user.id,
      problemSlug: slug,
      problemTitle: problem.title,
      problemDate: date,
      kind: 'incdec',
      adjustment,
      compressedSummary: summary,
    });

    await interaction.editReply({ content: `Feedback recorded for **${problem.title}**.` });
  },
};

export default { data, execute, buttons, modals } satisfies Command;
