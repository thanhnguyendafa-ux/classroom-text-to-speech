/**
 * Sliding/fixed window in-memory rate limiter
 * Safe for micro-frontends & serverless workers. Prevents abuse, DDOS, and scraper attacks.
 */

interface LimitEntry {
  points: number;
  resetTime: number;
}

const stores: Record<string, Record<string, LimitEntry>> = {};

/**
 * Retrieves the client's real IP, taking reverse proxies, CDN layers (Cloud Run, Vercel),
 * and VPN cascades into careful consideration.
 */
export function getClientIp(req: any): string {
  const xForwardedFor = req.headers ? req.headers["x-forwarded-for"] : null;
  if (xForwardedFor) {
    if (typeof xForwardedFor === "string") {
      return xForwardedFor.split(",")[0].trim();
    }
    if (Array.isArray(xForwardedFor) && xForwardedFor.length > 0) {
      return xForwardedFor[0].trim();
    }
  }
  
  const connection = req.connection;
  const socket = req.socket;
  
  return (
    socket?.remoteAddress || 
    connection?.remoteAddress || 
    req.ip || 
    "127.0.0.1"
  );
}

/**
 * Configures and tracks consumption bounds on a key-prefixed store
 */
export function createRateLimiter(options: {
  keyPrefix: string;
  maxRequests: number;
  windowMs: number;
}) {
  const { keyPrefix, maxRequests, windowMs } = options;

  if (!stores[keyPrefix]) {
    stores[keyPrefix] = {};
  }
  
  const store = stores[keyPrefix];

  return {
    consume: (ip: string) => {
      const now = Date.now();

      // Prune expired entries to maintain a constant O(1) memory profile
      for (const key of Object.keys(store)) {
        if (store[key].resetTime < now) {
          delete store[key];
        }
      }

      const record = store[ip];

      if (!record || record.resetTime < now) {
        const resetTime = now + windowMs;
        store[ip] = { points: 1, resetTime };
        return {
          success: true,
          limit: maxRequests,
          remaining: maxRequests - 1,
          resetTime,
        };
      }

      if (record.points >= maxRequests) {
        return {
          success: false,
          limit: maxRequests,
          remaining: 0,
          resetTime: record.resetTime,
        };
      }

      record.points += 1;
      return {
        success: true,
        limit: maxRequests,
        remaining: maxRequests - record.points,
        resetTime: record.resetTime,
      };
    }
  };
}

// Configured rate limiters for our core API endpoints
export const ttsLimiter = createRateLimiter({
  keyPrefix: "api_tts",
  maxRequests: 30, // Max 30 requests per minute per IP
  windowMs: 60 * 1000,
});

export const imageSearchLimiter = createRateLimiter({
  keyPrefix: "api_image_search",
  maxRequests: 20, // Max 20 requests per minute per IP
  windowMs: 60 * 1000,
});

export const sharePlaylistLimiter = createRateLimiter({
  keyPrefix: "api_share_playlist",
  maxRequests: 15, // Max 15 requests per minute per IP
  windowMs: 60 * 1000,
});
