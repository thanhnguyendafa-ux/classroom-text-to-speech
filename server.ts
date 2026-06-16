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

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// 1. Unsplash Image Search
app.get("/api/search-images", async (req, res) => {
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

// 2. High-performance Gemini TTS
app.post("/api/tts", async (req, res) => {
  try {
    const { text, voice, lang, userApiKey } = req.body;
    const result = await generateTextToSpeech({ text, voice, lang, userApiKey });
    res.json(result);
  } catch (err: any) {
    console.error("TTS Premium API Error:", err);
    res.status(500).json({ error: err.message || "Lỗi xử lý giọng nói AI" });
  }
});

// 3. Share custom playlist
app.post("/api/share-playlist", async (req, res) => {
  try {
    const result = await createSharedPlaylist(req.body);
    res.json(result);
  } catch (err: any) {
    console.error("Error publishing shared playlist:", err);
    res.status(500).json({ error: err.message || "Không thể tạo liên kết chia sẻ." });
  }
});

// 4. Retrieve custom playlist by ID
app.get("/api/share-playlist/:id", async (req, res) => {
  try {
    const shareId = req.params.id;
    const result = await getSharedPlaylist(shareId);
    res.json(result);
  } catch (err: any) {
    console.error("Error loading shared playlist:", err);
    res.status(404).json({ error: err.message || "Không tìm thấy chuỗi luyện tập này." });
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
