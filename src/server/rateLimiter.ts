import { createHash } from 'node:crypto';
import { adminDb } from './firebaseAdmin';

export interface RateLimitEntry {
  points: number;
  resetTime: number;
}

export interface RateLimitResult extends RateLimitEntry {
  success: boolean;
  limit: number;
  remaining: number;
}

export function nextRateLimitState(
  entry: RateLimitEntry | undefined,
  now: number,
  windowMs: number,
  maxRequests: number,
): RateLimitResult {
  if (!entry || entry.resetTime <= now) {
    return {
      success: true,
      points: 1,
      limit: maxRequests,
      remaining: maxRequests - 1,
      resetTime: now + windowMs,
    };
  }

  if (entry.points >= maxRequests) {
    return {
      success: false,
      points: entry.points,
      limit: maxRequests,
      remaining: 0,
      resetTime: entry.resetTime,
    };
  }

  const points = entry.points + 1;
  return {
    success: true,
    points,
    limit: maxRequests,
    remaining: maxRequests - points,
    resetTime: entry.resetTime,
  };
}

export function getClientIp(req: any): string {
  const xForwardedFor = req.headers?.['x-forwarded-for'];
  if (typeof xForwardedFor === 'string') {
    return xForwardedFor.split(',')[0].trim();
  }
  if (Array.isArray(xForwardedFor) && xForwardedFor.length > 0) {
    return xForwardedFor[0].trim();
  }
  return req.socket?.remoteAddress || req.connection?.remoteAddress || req.ip || '127.0.0.1';
}

export function applyRateLimitHeaders(
  response: { setHeader(name: string, value: number): void },
  result: Pick<RateLimitResult, 'limit' | 'remaining' | 'resetTime'>,
) {
  response.setHeader('X-RateLimit-Limit', result.limit);
  response.setHeader('X-RateLimit-Remaining', result.remaining);
  response.setHeader('X-RateLimit-Reset', Math.ceil(result.resetTime / 1000));
}

export function createRateLimiter(options: {
  keyPrefix: string;
  maxRequests: number;
  windowMs: number;
}) {
  const { keyPrefix, maxRequests, windowMs } = options;

  return {
    async consume(key: string): Promise<RateLimitResult> {
      const keyHash = createHash('sha256').update(key).digest('hex');
      const document = adminDb.collection('rateLimits').doc(`${keyPrefix}_${keyHash}`);

      return adminDb.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(document);
        const current = snapshot.exists ? snapshot.data() as RateLimitEntry : undefined;
        const result = nextRateLimitState(current, Date.now(), windowMs, maxRequests);

        if (result.success) {
          transaction.set(document, {
            points: result.points,
            resetTime: result.resetTime,
            expiresAt: new Date(result.resetTime),
          });
        }

        return result;
      });
    },
  };
}

export const ttsLimiter = createRateLimiter({
  keyPrefix: 'api_tts',
  maxRequests: 30,
  windowMs: 60 * 1000,
});

export const imageSearchLimiter = createRateLimiter({
  keyPrefix: 'api_image_search',
  maxRequests: 20,
  windowMs: 60 * 1000,
});

export const sharePlaylistLimiter = createRateLimiter({
  keyPrefix: 'api_share_playlist',
  maxRequests: 15,
  windowMs: 60 * 1000,
});
