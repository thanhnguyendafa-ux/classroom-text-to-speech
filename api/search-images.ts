import { searchImages } from "../src/server/handlers";
import { applyRateLimitHeaders, imageSearchLimiter } from "../src/server/rateLimiter";
import { getRequestRateLimitIdentity } from '../src/server/requestIdentity';
import { applySecurityHeaders } from "../src/server/httpSecurity";
import { sendApiError } from '../src/server/apiError';

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

  // Rate Limiting on Serverless context
  let identity: string;
  try {
    identity = await getRequestRateLimitIdentity(req);
  } catch (error) {
    sendApiError(res, error, 'image-search-auth');
    return;
  }
  const limitState = await imageSearchLimiter.consume(identity);
  applyRateLimitHeaders(res, limitState);
  if (!limitState.success) {
    res.status(429).json({
      error: "Bạn đang tìm kiếm ảnh quá nhanh. Vui lòng thử lại sau 1 phút."
    });
    return;
  }

  try {
    const q = req.query.q;
    const query = typeof q === "string" ? q : "";
    const result = await searchImages(query);
    res.status(200).json(result);
  } catch (error) {
    sendApiError(res, error, 'image-search');
  }
}
