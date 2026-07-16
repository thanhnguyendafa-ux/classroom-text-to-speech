import { generateTextToSpeech } from "../src/server/handlers.js";
import { applyRateLimitHeaders, ttsLimiter } from "../src/server/rateLimiter.js";
import { requireRequestUser } from '../src/server/requestIdentity.js';
import { applySecurityHeaders } from "../src/server/httpSecurity.js";
import { sendApiError } from '../src/server/apiError.js';

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
    sendApiError(res, error, 'tts-auth');
    return;
  }
  const limitState = await ttsLimiter.consume(rateLimitKey);
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
  } catch (error) {
    sendApiError(res, error, 'tts');
  }
}
