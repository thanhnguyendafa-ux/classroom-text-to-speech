import { searchImages } from "../src/server/handlers";
import { applyRateLimitHeaders, getClientIp, imageSearchLimiter } from "../src/server/rateLimiter";
import { applySecurityHeaders } from "../src/server/httpSecurity";

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
  const ip = getClientIp(req);
  const limitState = await imageSearchLimiter.consume(ip);
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
  } catch (err: any) {
    console.error("Vercel Serverless Image Search Error:", err);
    res.status(500).json({ error: err.message || "Failed to search images" });
  }
}
