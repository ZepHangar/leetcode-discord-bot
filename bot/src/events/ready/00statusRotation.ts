import type { ExtendedClient } from '../../classes/ExtendedClient.js';
import { logger } from '../../lib/logger.js';
import { startStatusRotation } from '../../services/statusRotationService.js';

export default async function startRotatingStatus(
  client: ExtendedClient
): Promise<void> {
  try {
    startStatusRotation(client);
    logger.info('Rotating bot status started');
  } catch (error) {
    logger.error({ error }, 'Failed to start rotating bot status');
  }
}
