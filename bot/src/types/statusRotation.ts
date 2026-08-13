import type { ExtendedClient } from '../classes/ExtendedClient.js';

export type StatusRotationActivityType =
  | 'playing'
  | 'streaming'
  | 'listening'
  | 'watching'
  | 'competing';

export type StatusRotationPresenceStatus = 'online' | 'idle' | 'dnd';

interface BaseStatusRotationEntry {
  status: StatusRotationPresenceStatus;
  duration: number;
  render: (client: ExtendedClient) => string | Promise<string>;
}

export interface StreamingStatusRotationEntry extends BaseStatusRotationEntry {
  type: 'streaming';
  url: string;
}

export interface NonStreamingStatusRotationEntry extends BaseStatusRotationEntry {
  type: Exclude<StatusRotationActivityType, 'streaming'>;
}

export type StatusRotationEntry =
  | StreamingStatusRotationEntry
  | NonStreamingStatusRotationEntry;

const VALID_ACTIVITY_TYPES = new Set<StatusRotationActivityType>([
  'playing',
  'streaming',
  'listening',
  'watching',
  'competing',
]);

const VALID_PRESENCE_STATUSES = new Set<StatusRotationPresenceStatus>([
  'online',
  'idle',
  'dnd',
]);

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function validateStatusRotationEntries(
  entries: unknown
): StatusRotationEntry[] {
  if (!Array.isArray(entries)) {
    throw new Error('Status rotation entries must be an array');
  }

  if (entries.length === 0) {
    throw new Error('Status rotation requires at least one entry');
  }

  for (const [index, entry] of entries.entries()) {
    if (!isObjectRecord(entry)) {
      throw new Error(`Invalid status rotation entry at index ${index}`);
    }

    if (typeof entry.type !== 'string' || !VALID_ACTIVITY_TYPES.has(entry.type as StatusRotationActivityType)) {
      throw new Error(`Invalid status rotation activity type at index ${index}`);
    }

    if (typeof entry.status !== 'string' || !VALID_PRESENCE_STATUSES.has(entry.status as StatusRotationPresenceStatus)) {
      throw new Error(`Invalid status rotation presence status at index ${index}`);
    }

    if (typeof entry.duration !== 'number' || !Number.isInteger(entry.duration) || entry.duration < 1) {
      throw new Error(`Invalid status rotation duration at index ${index}`);
    }

    if (typeof entry.render !== 'function') {
      throw new Error(`Invalid status rotation render function at index ${index}`);
    }

    if (entry.type === 'streaming') {
      if (typeof entry.url !== 'string' || !entry.url.trim()) {
        throw new Error(`Streaming status rotation entry at index ${index} requires a URL`);
      }

      try {
        const url = new URL(entry.url);

        if (!['http:', 'https:'].includes(url.protocol)) {
          throw new Error('Unsupported protocol');
        }
      } catch {
        throw new Error(`Invalid streaming status rotation URL at index ${index}`);
      }
    }
  }

  return entries as StatusRotationEntry[];
}
