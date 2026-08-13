/**
 * Cron-worker template — copy this file, change the schedule and the service call.
 *
 * Pattern: wait for command registration (workers that touch commands must not
 * start early), schedule with node-cron, log failures instead of throwing —
 * a cron tick that throws would kill the ready-event chain.
 */
import cron from 'node-cron';
import { runExampleSweep } from '../../services/exampleService.js';
import { logger } from '../../lib/logger.js';
import type { ExtendedClient } from '../../classes/ExtendedClient.js';
import { waitForCommandRegistration } from '../../utils/lifecycle.js';

export default async function startExampleCron(client: ExtendedClient): Promise<void> {
  await waitForCommandRegistration(client);

  cron.schedule('*/5 * * * *', () => {
    runExampleSweep(client).catch((error) => {
      logger.error({ error }, 'Example cron tick failed');
    });
  });

  logger.info('Example cron started (every 5 minutes)');

  runExampleSweep(client).catch((error) => {
    logger.error({ error }, 'Initial example sweep failed');
  });
}
