import { generateTextToSpeech } from "../src/server/handlers";
import { applyRateLimitHeaders, getClientIp, ttsLimiter } from "../src/server/rateLimiter";
import { applySecurityHeaders } from "../src/server/httpSecurity";

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
  const limitState = await ttsLimiter.consume(ip);
  applyRateLimitHeaders(res, limitState);
  if (!limitState.success) {
    res.status(429).json({
      error: "Bạn đang dịch giọng nói quá nhanh. Vui lòng chậm lại một lát."
    });
    return;
  }

  try {
    const { text, voice, lang, userApiKey } = req.body || {};
    const result = await generateTextToSpeech({ text, voice, lang, userApiKey });
    res.status(200).json(result);
  } catch (err: any) {
    console.error("Vercel Serverless TTS Error:", err);
    res.status(500).json({ error: err.message || "Lỗi xử lý giọng nói AI" });
  }
}
