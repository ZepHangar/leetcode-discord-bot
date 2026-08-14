/**
 * Persistence for daily-problem submissions and difficulty feedback.
 *
 * Every row is one feedback event keyed by user + problem; `compressedSummary`
 * is the only free-text kept from the user and is what gets re-injected into
 * the next generation.
 *
 * @module services/submissionService
 */
import type { Submission } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

export type SubmissionKind = 'submission' | 'incdec' | 'giveup';

export interface NewSubmission {
  discordUserId: string;
  problemSlug: string;
  problemTitle: string;
  /** "YYYY-MM-DD" of the daily problem the card was for. */
  problemDate: string;
  kind: SubmissionKind;
  /** Self-reported rating label (kind = "submission"). */
  difficultyRating?: string;
  /** "Increase" | "Decrease" (kind = "incdec"). */
  adjustment?: string;
  compressedSummary: string;
  codeUrl?: string;
  codeFileName?: string;
}

/**
 * Persist one feedback event.
 *
 * @postcondition A `Submission` row exists for the user+problem+event.
 */
export async function createSubmission(data: NewSubmission): Promise<Submission> {
  return prisma.submission.create({ data });
}

/**
 * A user's accumulated feedback history, newest first.
 *
 * @precondition `limit` is positive.
 * @postcondition Rows are ordered by `createdAt` descending, capped at `limit`.
 */
export async function listUserHistory(discordUserId: string, limit = 10): Promise<Submission[]> {
  return prisma.submission.findMany({
    where: { discordUserId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}
