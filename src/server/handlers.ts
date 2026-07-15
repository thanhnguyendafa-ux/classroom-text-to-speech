import crypto from "crypto";
import { GoogleGenAI } from "@google/genai";
import { PlaylistStorageManager, PlaylistPayload } from "./storage";
import { validatePlaylistPayload } from "./validation";
import { ApiError } from './apiError';
import { normalizeUnsplashResults, type UnsplashResult } from './unsplashResult';

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

/**
 * Helper to generate a cryptographically secure, high-entropy,
 * completely unguessable, url-safe short ID.
 */
function generateShortId(): string {
  // 6 secure random bytes produce 8 base64url characters
  return crypto.randomBytes(6).toString("base64url");
}

/**
 * Image Search Business Logic
 */
export async function searchImages(query: string | undefined): Promise<{ results: UnsplashResult[] }> {
  if (!query || typeof query !== "string" || !query.trim()) {
    return { results: [] };
  }

  // Safe substring to prevent extremely long queries
  const sanitizedQuery = query.trim().substring(0, 100);

  const searchUrl = `https://unsplash.com/napi/search/photos?query=${encodeURIComponent(sanitizedQuery)}&per_page=12`;
  const response = await fetch(searchUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/437.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/437.36"
    }
  });

  if (!response.ok) {
    throw new Error(`Unsplash API returned standard status: ${response.status}`);
  }

  const data: unknown = await response.json();
  return { results: normalizeUnsplashResults(data) };
}

/**
 * Text-to-Speech (TTS) Business Logic
 */
export async function generateTextToSpeech(payload: {
  text: string;
  voice?: string;
  lang?: string;
  userApiKey?: string;
}): Promise<{ audioUrl: string }> {
  const { text, voice, lang, userApiKey } = payload;

  if (!text || typeof text !== "string" || !text.trim()) {
    throw new ApiError(400, 'TTS_TEXT_REQUIRED', 'Nội dung văn bản thoại là bắt buộc.');
  }

  // Enforce a strict text length threshold per request on raw generation
  const trimmedText = text.trim().substring(0, 1000);

  // Require user-supplied key for all transactions. Server-key fallback disabled.
  const keyToUse = (userApiKey && typeof userApiKey === "string" && userApiKey.trim() !== "")
    ? userApiKey.trim()
    : null;

  if (!keyToUse) {
    throw new ApiError(400, 'GEMINI_KEY_REQUIRED', 'Vui lòng nhập Gemini API Key để sử dụng giọng đọc Premium AI.');
  }

  // Initialize GoogleGenAI instance using the client's provided key
  const aiInstance = new GoogleGenAI({
    apiKey: keyToUse,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  // Structuring appropriate triggers for languages
  let steeringPrompt = trimmedText;
  if (lang === "vi") {
    steeringPrompt = `Say in natural, perfect Vietnamese with appropriate accent, tone, and pacing: ${trimmedText}`;
  } else if (lang === "zh-cn") {
    steeringPrompt = `Say in natural, perfect Mandarin Chinese (Simplified character mode) with appropriate tone and pacing: ${trimmedText}`;
  } else if (lang === "zh-tw") {
    steeringPrompt = `Say in natural, perfect Traditional Mandarin Chinese (Traditional character/Taiwan/Hong Kong style) with appropriate tone and pacing: ${trimmedText}`;
  } else if (lang === "ja") {
    steeringPrompt = `Say in perfect natural Japanese with perfect accentuation and natural rhythm: ${trimmedText}`;
  } else if (lang === "ko") {
    steeringPrompt = `Say in perfect natural Korean with appropriate pronunciation, rhythm, and intonation: ${trimmedText}`;
  } else {
    steeringPrompt = `Say in natural, standard native English with appropriate pacing: ${trimmedText}`;
  }

  const chosenVoice = voice || "Kore";

  // Call Gemini 3.1 tts-preview model
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
    throw new ApiError(502, 'TTS_UPSTREAM_INVALID', 'Dịch vụ giọng nói chưa trả về âm thanh hợp lệ. Vui lòng thử lại.');
  }

  const pcmBuffer = Buffer.from(base64Audio, "base64");
  const wavBuffer = encodeWAV(pcmBuffer, 24000);
  const wavBase64 = wavBuffer.toString("base64");

  return {
    audioUrl: `data:audio/wav;base64,${wavBase64}`
  };
}

/**
 * Share Playlist Business Logic - Save Custom Lesson Playlist
 */
export async function createSharedPlaylist(playlistBody: unknown): Promise<{ id: string }> {
  // Validate request schema and enforce maximum items & length bounds
  const validated = validatePlaylistPayload(playlistBody);

  const shareId = generateShortId();
  const payload: PlaylistPayload = {
    ...validated,
    createdAt: validated.createdAt || new Date().toISOString(),
  };

  await PlaylistStorageManager.savePlaylist(shareId, payload);
  return { id: shareId };
}

/**
 * Share Playlist Business Logic - Retrieve Saved Custom Lesson Playlist
 */
export async function getSharedPlaylist(shareId: string | undefined): Promise<PlaylistPayload> {
  if (!shareId || typeof shareId !== "string" || !shareId.trim()) {
    throw new ApiError(400, 'INVALID_SHARE_ID', 'Mã chia sẻ không hợp lệ.');
  }

  const playlist = await PlaylistStorageManager.getPlaylist(shareId.trim());

  if (!playlist) {
    throw new ApiError(404, 'PLAYLIST_NOT_FOUND', 'Không tìm thấy chuỗi luyện tập này hoặc liên kết đã hết hạn.');
  }

  return playlist;
}
