import Redis from 'ioredis';
import { env } from './env';
import logger from './logger';

let retryAttempts = 0;
const MAX_RETRY_LOGS = 3;

const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  retryStrategy(times) {
    if (times > 10) {
      return null;
    }
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

redis.on('error', (error) => {
  if (retryAttempts < MAX_RETRY_LOGS) {
    logger.warn('Redis connection failed, continuing without cache', { 
      error: error.message 
    });
    retryAttempts++;
  }
});

redis.on('connect', () => {
  retryAttempts = 0;
  logger.info('Redis connected successfully');
});

redis.on('ready', () => {
  logger.info('Redis ready to accept commands');
});

redis.connect().catch(() => {
  logger.info('Redis unavailable, caching disabled');
});

export default redis;
