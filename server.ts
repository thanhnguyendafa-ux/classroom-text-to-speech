import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Initialize GoogleGenAI SDK with key
const apiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({
  apiKey: apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Helper function to attach 44-byte standard WAV container headers to 16-bit PCM 24kHz stream
function encodeWAV(pcmBuffer: Buffer, sampleRate = 24000): Buffer {
  const buffer = new ArrayBuffer(44 + pcmBuffer.length);
  const view = new DataView(buffer);

  // RIFF identifier
  writeString(view, 0, 'RIFF');
  // File length
  view.setUint32(4, 36 + pcmBuffer.length, true);
  // RIFF type
  writeString(view, 8, 'WAVE');
  // Format chunk identifier
  writeString(view, 12, 'fmt ');
  // Format chunk length
  view.setUint32(16, 16, true);
  // Sample format (raw PCM)
  view.setUint16(20, 1, true); // 1 = PCM (Integer)
  // Channel count
  view.setUint16(22, 1, true); // Mono
  // Sample rate
  view.setUint32(24, sampleRate, true);
  // Byte rate (sample rate * block align)
  view.setUint32(28, sampleRate * 2, true);
  // Block align (channel count * bytes per sample)
  view.setUint16(32, 2, true); // 2 bytes per sample (16-bit mono)
  // Bits per sample
  view.setUint16(34, 16, true); // 16-bit
  // Data chunk identifier
  writeString(view, 36, 'data');
  // Data chunk length
  view.setUint32(40, pcmBuffer.length, true);

  // Write PCM audio bytes
  const pcmArray = new Uint8Array(pcmBuffer);
  const wavArray = new Uint8Array(buffer);
  wavArray.set(pcmArray, 44);

  return Buffer.from(wavArray);
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

// Request parsers
app.use(express.json());

// Premium TTS proxy endpoint
app.post("/api/tts", async (req, res) => {
  try {
    const { text, voice, lang, userApiKey } = req.body;

    if (!text || typeof text !== "string") {
      res.status(400).json({ error: "Text content is required" });
      return;
    }

    // Use user-supplied key if provided, else fall back to server's key
    const keyToUse = (userApiKey && typeof userApiKey === "string" && userApiKey.trim() !== "")
      ? userApiKey.trim()
      : apiKey;

    if (!keyToUse) {
      res.status(400).json({ 
        error: "Vui lòng nhập Gemini API Key của riêng bạn trong cột Cấu hình bên trái để sử dụng giọng đọc Premium AI." 
      });
      return;
    }

    // Determine GoogleGenAI instance
    let aiInstance = ai;
    if (keyToUse !== apiKey) {
      aiInstance = new GoogleGenAI({
        apiKey: keyToUse,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
    }

    // Structure appropriate trigger prompt according to language choice
    let steeringPrompt = text;
    if (lang === "vi") {
      steeringPrompt = `Say in natural, perfect Vietnamese with appropriate accent, tone, and pacing: ${text}`;
    } else if (lang === "zh-cn") {
      steeringPrompt = `Say in natural, perfect Mandarin Chinese (Simplified character mode) with appropriate tone and pacing: ${text}`;
    } else if (lang === "zh-tw") {
      steeringPrompt = `Say in natural, perfect Traditional Mandarin Chinese (Traditional character/Taiwan/Hong Kong style) with appropriate tone and pacing: ${text}`;
    } else if (lang === "ja") {
      steeringPrompt = `Say in perfect natural Japanese with perfect accentuation and natural rhythm: ${text}`;
    } else if (lang === "ko") {
      steeringPrompt = `Say in perfect natural Korean with appropriate pronunciation, rhythm, and intonation: ${text}`;
    } else {
      steeringPrompt = `Say in natural, standard native English with appropriate pacing: ${text}`;
    }

    const chosenVoice = voice || "Kore";

    // Call Gemini 3.1 TTS model
    const response = await aiInstance.models.generateContent({
      model: "gemini-3.1-flash-tts-preview",
      contents: [{ parts: [{ text: steeringPrompt }] }],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: chosenVoice }
          }
        }
      }
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!base64Audio) {
      res.status(500).json({ error: "Thất bại khi lấy dữ liệu âm thanh từ động cơ AI" });
      return;
    }

    const pcmBuffer = Buffer.from(base64Audio, "base64");
    const wavBuffer = encodeWAV(pcmBuffer, 24000);
    const wavBase64 = wavBuffer.toString("base64");

    res.json({
      audioUrl: `data:audio/wav;base64,${wavBase64}`
    });

  } catch (err: any) {
    console.error("TTS Premium API Error:", err);
    res.status(500).json({ error: err.message || "Lỗi xử lý giọng nói AI" });
  }
});

// Mount Vite middleware or serve static files in production
async function start() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

start();
