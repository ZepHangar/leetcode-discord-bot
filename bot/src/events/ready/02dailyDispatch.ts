import cron from 'node-cron';
import { runDailyDispatchTick } from '../../services/dailyDispatchService.js';
import { logger } from '../../lib/logger.js';
import type { ExtendedClient } from '../../classes/ExtendedClient.js';

export default async function startDailyDispatch(client: ExtendedClient): Promise<void> {
  cron.schedule('* * * * *', () => {
    runDailyDispatchTick(client).catch((error) => {
      logger.error({ error }, 'Daily dispatch tick failed');
    });
  });
}
