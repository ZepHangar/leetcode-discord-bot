import pino, { stdSerializers } from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  serializers: {
    error: stdSerializers.err,
  },
});
