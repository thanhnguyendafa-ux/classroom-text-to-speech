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
  getClientIp,
  ttsLimiter,
  imageSearchLimiter,
  sharePlaylistLimiter,
} from "./src/server/rateLimiter";
import { checkFirestoreConnection } from "./src/server/storage";

dotenv.config();

const app = express();
const PORT = 3000;

// Set payload body size limit to prevent oversized request attacks
app.use(express.json({ limit: "500kb" }));

// 0. API Health and Connection Status Check
app.get("/api/health", async (req, res) => {
  try {
    const isOk = await checkFirestoreConnection();
    res.json({
      status: isOk ? "ok" : "error",
      service: "classroom-text-to-speech-api",
      firestore: isOk ? "connected" : "disconnected"
    });
  } catch (err: any) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

// 1. Unsplash Image Search with Rate Limiting
app.get("/api/search-images", async (req, res) => {
  const ip = getClientIp(req);
  const rateLimit = imageSearchLimiter.consume(ip);
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
  } catch (err: any) {
    console.error("Image search error:", err);
    res.status(500).json({ error: err.message || "Failed to search images" });
  }
});

// 2. High-performance Gemini TTS with Rate Limiting
app.post("/api/tts", async (req, res) => {
  const ip = getClientIp(req);
  const rateLimit = ttsLimiter.consume(ip);
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
  } catch (err: any) {
    console.error("TTS Premium API Error:", err);
    res.status(500).json({ error: err.message || "Lỗi xử lý giọng nói AI" });
  }
});

// 3. Share custom playlist with Rate Limiting
app.post("/api/share-playlist", async (req, res) => {
  const ip = getClientIp(req);
  const rateLimit = sharePlaylistLimiter.consume(ip);
  if (!rateLimit.success) {
    res.status(429).json({
      error: "Bạn đang tạo liên kết chia sẻ quá nhanh. Vui lòng đợi một lát."
    });
    return;
  }

  try {
    const result = await createSharedPlaylist(req.body);
    res.json(result);
  } catch (err: any) {
    console.error("Error publishing shared playlist:", err);
    res.status(500).json({ error: err.message || "Không thể tạo liên kết chia sẻ." });
  }
});

// 4. Retrieve custom playlist by ID (No rate limit for views to keep user experience smooth, but lightweight lookup)
app.get("/api/share-playlist/:id", async (req, res) => {
  try {
    const shareId = req.params.id;
    const result = await getSharedPlaylist(shareId);
    res.json(result);
  } catch (err: any) {
    console.error("Error loading shared playlist:", err);
    res.status(404).json({ error: err.message || "Không tìm thấy chuỗi luyện tập này hoặc liên kết đã hết hạn." });
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
