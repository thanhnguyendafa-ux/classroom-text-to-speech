import { createSharedPlaylist } from "../../src/server/handlers";
import { getClientIp, sharePlaylistLimiter } from "../../src/server/rateLimiter";
import { applySecurityHeaders } from "../../src/server/httpSecurity";

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
  const ip = getClientIp(req);
  const limitState = sharePlaylistLimiter.consume(ip);
  if (!limitState.success) {
    res.status(429).json({
      error: "Bạn đang tạo liên kết chia sẻ quá nhanh. Vui lòng đợi một lát."
    });
    return;
  }

  try {
    const result = await createSharedPlaylist(req.body);
    res.status(200).json(result);
  } catch (err: any) {
    console.error("Vercel Serverless Create Share Error:", err);
    res.status(500).json({ error: err.message || "Không thể tạo liên kết chia sẻ." });
  }
}
