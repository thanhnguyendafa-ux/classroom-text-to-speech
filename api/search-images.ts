import { searchImages } from "../src/server/handlers.js";
import { applyRateLimitHeaders, imageSearchLimiter } from "../src/server/rateLimiter.js";
import { requireRequestUser } from '../src/server/requestIdentity.js';
import { applySecurityHeaders } from "../src/server/httpSecurity.js";
import { sendApiError } from '../src/server/apiError.js';

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
  let rateLimitKey: string;
  try {
    rateLimitKey = (await requireRequestUser(req)).rateLimitKey;
  } catch (error) {
    sendApiError(res, error, 'image-search-auth');
    return;
  }
  const limitState = await imageSearchLimiter.consume(rateLimitKey);
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
