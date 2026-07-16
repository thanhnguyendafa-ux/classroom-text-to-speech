import { createSharedPlaylist } from "../../src/server/handlers.js";
import { applyRateLimitHeaders, sharePlaylistLimiter } from "../../src/server/rateLimiter.js";
import { requireRequestUser } from '../../src/server/requestIdentity.js';
import { applySecurityHeaders } from "../../src/server/httpSecurity.js";
import { sendApiError } from '../../src/server/apiError.js';

export default async function handler(req: any, res: any) {
  applySecurityHeaders(req, res, "POST,OPTIONS");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method Not Allowed" });
    return;
  }

  // Rate Limiting on Serverless context
  let rateLimitKey: string;
  try {
    rateLimitKey = (await requireRequestUser(req)).rateLimitKey;
  } catch (error) {
    sendApiError(res, error, 'share-playlist-auth');
    return;
  }
  const limitState = await sharePlaylistLimiter.consume(rateLimitKey);
  applyRateLimitHeaders(res, limitState);
  if (!limitState.success) {
    res.status(429).json({
      error: "Bạn đang tạo liên kết chia sẻ quá nhanh. Vui lòng đợi một lát."
    });
    return;
  }

  try {
    const result = await createSharedPlaylist(req.body);
    res.status(200).json(result);
  } catch (error) {
    sendApiError(res, error, 'share-playlist-create');
  }
}
