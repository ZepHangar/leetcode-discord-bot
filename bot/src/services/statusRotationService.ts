import { ActivityType, type PresenceData } from 'discord.js';
import type { ExtendedClient } from '../classes/ExtendedClient.js';
import { STATUS_ROTATION_ENTRIES } from '../lib/statusRotationConfig.js';
import { logger } from '../lib/logger.js';
import type {
  StatusRotationActivityType,
  StatusRotationEntry,
} from '../types/statusRotation.js';
import { validateStatusRotationEntries } from '../types/statusRotation.js';

interface StartStatusRotationOptions {
  entries?: StatusRotationEntry[];
}

function toDiscordActivityType(type: StatusRotationActivityType): ActivityType {
  switch (type) {
    case 'playing':
      return ActivityType.Playing;
    case 'streaming':
      return ActivityType.Streaming;
    case 'listening':
      return ActivityType.Listening;
    case 'watching':
      return ActivityType.Watching;
    case 'competing':
      return ActivityType.Competing;
  }
}

async function applyStatusRotationEntry(
  client: ExtendedClient,
  entry: StatusRotationEntry,
  shouldApply: () => boolean
): Promise<void> {
  if (!shouldApply()) {
    return;
  }

  if (!client.user) {
    throw new Error('Client user is not available for presence updates');
  }

  const rendered = await entry.render(client);

  if (typeof rendered !== 'string') {
    throw new Error('Status rotation render must return a string activity name');
  }

  const name = rendered.trim();
  if (!name) {
    throw new Error('Status rotation render returned an empty activity name');
  }

  if (!shouldApply()) {
    return;
  }

  const presence: PresenceData = {
    activities: [{
      name,
      type: toDiscordActivityType(entry.type),
      ...(entry.type === 'streaming' ? { url: entry.url } : {}),
    }],
    status: entry.status,
  };

  client.user.setPresence(presence);

  logger.debug(
    {
      activityType: entry.type,
      status: entry.status,
      name,
      duration: entry.duration,
      ...(entry.type === 'streaming' ? { url: entry.url } : {}),
    },
    'Applied rotating bot status'
  );
}

export function stopStatusRotation(client: ExtendedClient): void {
  client.statusRotationStop?.();
  client.statusRotationStop = null;
}

export function startStatusRotation(
  client: ExtendedClient,
  options: StartStatusRotationOptions = {}
): () => void {
  if (client.statusRotationStop) {
    logger.debug('Status rotation already running, skipping duplicate start');
    return client.statusRotationStop;
  }

  const entries = validateStatusRotationEntries(options.entries ?? STATUS_ROTATION_ENTRIES);
  let currentIndex = 0;
  // ReturnType here is intentional: the timer handle type differs across Node/Bun/DOM platforms.
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let stopped = false;

  const clearScheduledTick = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  const stop = () => {
    stopped = true;
    clearScheduledTick();
    if (client.statusRotationStop === stop) {
      client.statusRotationStop = null;
    }
  };

  const scheduleNext = (delaySeconds: number) => {
    clearScheduledTick();
    timeoutId = setTimeout(() => {
      void runCurrentEntry();
    }, delaySeconds * 1000);
  };

  const runCurrentEntry = async (): Promise<void> => {
    if (stopped) {
      return;
    }

    const entry = entries[currentIndex];

    if (!entry) {
      logger.error({ index: currentIndex }, 'Status rotation entry was not found');
      stop();
      return;
    }

    const shouldApply = () => !stopped && client.statusRotationStop === stop;

    try {
      await applyStatusRotationEntry(client, entry, shouldApply);
    } catch (error) {
      logger.error({ error, index: currentIndex }, 'Failed to apply rotating bot status');
    }

    currentIndex = (currentIndex + 1) % entries.length;

    if (!stopped) {
      scheduleNext(entry.duration);
    }
  };

  client.statusRotationStop = stop;
  void runCurrentEntry();

  return stop;
}
