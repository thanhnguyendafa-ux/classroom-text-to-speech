import { generateTextToSpeech } from "../src/server/handlers";

export default async function handler(req: any, res: any) {
  // Enable CORS
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  );

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method Not Allowed" });
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
