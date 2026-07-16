import { getSharedPlaylist } from "../../src/server/handlers.js";
import { applyRateLimitHeaders, getClientIp, sharePlaylistReadLimiter } from "../../src/server/rateLimiter.js";
import { applySecurityHeaders } from "../../src/server/httpSecurity.js";
import { sendApiError } from '../../src/server/apiError.js';

export default async function handler(req: any, res: any) {
  applySecurityHeaders(req, res, "GET,OPTIONS");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method !== "GET") {
    res.status(405).json({ error: "Method Not Allowed" });
    return;
  }

  try {
    const rateLimit = await sharePlaylistReadLimiter.consume(`ip:${getClientIp(req)}`);
    applyRateLimitHeaders(res, rateLimit);
    if (!rateLimit.success) {
      res.status(429).json({ error: "Bạn đã mở quá nhiều liên kết trong thời gian ngắn." });
      return;
    }
    const { id } = req.query;
    const shareId = typeof id === "string" ? id : "";
    
    const result = await getSharedPlaylist(shareId);
    res.status(200).json(result);
  } catch (error) {
    sendApiError(res, error, 'share-playlist-read');
  }
}
