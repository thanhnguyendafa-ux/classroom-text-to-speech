import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import {
  searchImages,
  generateTextToSpeech,
  createSharedPlaylist,
  getSharedPlaylist,
} from "./src/server/handlers";
import {
  applyRateLimitHeaders,
  ttsLimiter,
  imageSearchLimiter,
  sharePlaylistLimiter,
  sharePlaylistReadLimiter,
  getClientIp,
} from "./src/server/rateLimiter";
import { applySecurityHeaders } from "./src/server/httpSecurity";
import { sendApiError } from './src/server/apiError';
import { requireRequestUser } from './src/server/requestIdentity';
import { resolveServerPort } from "./src/server/serverConfig";
import { createHealthResponse } from "./src/server/health";
import { checkFirestoreConnection } from "./src/server/storage";

dotenv.config();

const app = express();
const PORT = resolveServerPort(process.env.PORT);

// Set payload body size limit to prevent oversized request attacks
app.use(express.json({ limit: "500kb" }));
app.use((req, res, next) => {
  applySecurityHeaders(req, res, "GET,POST,OPTIONS");
  next();
});

// 0. API Health and Connection Status Check
app.get("/api/health", async (_req, res) => {
  const response = await createHealthResponse(checkFirestoreConnection);
  res.status(response.statusCode).json(response.body);
});

// 1. Unsplash Image Search with Rate Limiting
app.get("/api/search-images", async (req, res) => {
  let rateLimitKey: string;
  try {
    rateLimitKey = (await requireRequestUser(req)).rateLimitKey;
  } catch (error) {
    sendApiError(res, error, 'image-search-auth');
    return;
  }
  const rateLimit = await imageSearchLimiter.consume(rateLimitKey);
  applyRateLimitHeaders(res, rateLimit);
  if (!rateLimit.success) {
    res.status(429).json({
      error: "Bạn đang tìm kiếm ảnh quá nhanh. Vui lòng thử lại sau 1 phút."
    });
    return;
  }

  try {
    const q = req.query.q;
    const query = typeof q === "string" ? q : "";
    const result = await searchImages(query);
    res.json(result);
  } catch (error) {
    sendApiError(res, error, 'image-search');
  }
});

// 2. High-performance Gemini TTS with Rate Limiting
app.post("/api/tts", async (req, res) => {
  let rateLimitKey: string;
  try {
    rateLimitKey = (await requireRequestUser(req)).rateLimitKey;
  } catch (error) {
    sendApiError(res, error, 'tts-auth');
    return;
  }
  const rateLimit = await ttsLimiter.consume(rateLimitKey);
  applyRateLimitHeaders(res, rateLimit);
  if (!rateLimit.success) {
    res.status(429).json({
      error: "Bạn đang dịch giọng nói quá nhanh. Vui lòng chậm lại một lát."
    });
    return;
  }

  try {
    const { text, voice, lang, userApiKey } = req.body;
    const result = await generateTextToSpeech({ text, voice, lang, userApiKey });
    res.json(result);
  } catch (error) {
    sendApiError(res, error, 'tts');
  }
});

// 3. Share custom playlist with Rate Limiting
app.post("/api/share-playlist", async (req, res) => {
  let rateLimitKey: string;
  try {
    rateLimitKey = (await requireRequestUser(req)).rateLimitKey;
  } catch (error) {
    sendApiError(res, error, 'share-playlist-auth');
    return;
  }
  const rateLimit = await sharePlaylistLimiter.consume(rateLimitKey);
  applyRateLimitHeaders(res, rateLimit);
  if (!rateLimit.success) {
    res.status(429).json({
      error: "Bạn đang tạo liên kết chia sẻ quá nhanh. Vui lòng đợi một lát."
    });
    return;
  }

  try {
    const result = await createSharedPlaylist(req.body);
    res.json(result);
  } catch (error) {
    sendApiError(res, error, 'share-playlist-create');
  }
});

// 4. Retrieve custom playlist by ID (No rate limit for views to keep user experience smooth, but lightweight lookup)
app.get("/api/share-playlist/:id", async (req, res) => {
  try {
    const rateLimit = await sharePlaylistReadLimiter.consume(`ip:${getClientIp(req)}`);
    applyRateLimitHeaders(res, rateLimit);
    if (!rateLimit.success) {
      res.status(429).json({ error: "Bạn đã mở quá nhiều liên kết trong thời gian ngắn." });
      return;
    }
    const shareId = req.params.id;
    const result = await getSharedPlaylist(shareId);
    res.json(result);
  } catch (error) {
    sendApiError(res, error, 'share-playlist-read');
  }
});

// Serve frontend assets / boot Vite middleware
async function start() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

start();
