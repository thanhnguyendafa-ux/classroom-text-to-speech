import { createSharedPlaylist } from "../../src/server/handlers";
import { applyRateLimitHeaders, sharePlaylistLimiter } from "../../src/server/rateLimiter";
import { getRequestRateLimitIdentity } from '../../src/server/requestIdentity';
import { applySecurityHeaders } from "../../src/server/httpSecurity";
import { sendApiError } from '../../src/server/apiError';

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
  let identity: string;
  try {
    identity = await getRequestRateLimitIdentity(req);
  } catch (error) {
    sendApiError(res, error, 'share-playlist-auth');
    return;
  }
  const limitState = await sharePlaylistLimiter.consume(identity);
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
