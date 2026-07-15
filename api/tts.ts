import { generateTextToSpeech } from "../src/server/handlers";
import { applyRateLimitHeaders, ttsLimiter } from "../src/server/rateLimiter";
import { getRequestRateLimitIdentity } from '../src/server/requestIdentity';
import { applySecurityHeaders } from "../src/server/httpSecurity";
import { sendApiError } from '../src/server/apiError';

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
    sendApiError(res, error, 'tts-auth');
    return;
  }
  const limitState = await ttsLimiter.consume(identity);
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
