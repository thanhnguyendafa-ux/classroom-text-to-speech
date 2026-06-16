import fs from "fs";
import path from "path";

// Detect Vercel environments
const isVercel = !!process.env.VERCEL;

// Define directories for local file persistence
const DATA_DIR = isVercel ? "/tmp" : path.join(process.cwd(), "data");
const PLAYLISTS_FILE = path.join(DATA_DIR, "shared_playlists.json");

// In-memory cache for fast subsequent reads (per sandbox/worker container)
let inMemoryPlaylists: Record<string, any> = {};

/**
 * Interfaces for backend storage provider
 */
export interface PlaylistPayload {
  speechList: any[];
  speed: number;
  volume: number;
  autoAdvance: boolean;
  timeBetweenLines: number;
  playlistLoopMode: "once" | "infinite";
  engineMode: "browser" | "premium";
  createdAt: string;
}

/**
 * Shared storage engine to support:
 * 1. Local Express / Docker server (reads/writes in workspace `data/` dir)
 * 2. Vercel Serverless Function (writes to `/tmp/` to avoid Read-Only file system)
 * 3. Durable persistence on Vercel (optional, zero-dependency REST client for Vercel KV if configured)
 */
export class PlaylistStorageManager {
  /**
   * Safe helper to load all playlists from disk for local mode
   */
  private static loadPlaylistsFromFile(): Record<string, any> {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(PLAYLISTS_FILE)) {
        const content = fs.readFileSync(PLAYLISTS_FILE, "utf-8");
        return JSON.parse(content);
      }
    } catch (err) {
      console.error("Error reading shared playlists file:", err);
    }
    return {};
  }

  /**
   * Check if Vercel KV integration is configured in environment variables
   */
  private static isKvEnabled(): boolean {
    return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
  }

  /**
   * Save playlist details
   */
  public static async savePlaylist(shareId: string, data: PlaylistPayload): Promise<void> {
    // 1. Try Vercel KV database if configured
    if (this.isKvEnabled()) {
      try {
        const url = `${process.env.KV_REST_API_URL}/set/playlist:${shareId}`;
        const response = await fetch(url, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        });

        if (response.ok) {
          console.log(`[Storage] Successfully saved playlist:${shareId} to Vercel KV.`);
          inMemoryPlaylists[shareId] = data;
          return;
        }
        console.error(`[Storage] Vercel KV save returned status ${response.status}`);
      } catch (err) {
        console.error("[Storage] Failed to save to Vercel KV, falling back to local file system:", err);
      }
    }

    // 2. Fallback to Local system / Serverless tmp file system
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const current = this.loadPlaylistsFromFile();
      current[shareId] = data;
      fs.writeFileSync(PLAYLISTS_FILE, JSON.stringify(current, null, 2), "utf-8");
      
      inMemoryPlaylists[shareId] = data;
      console.log(`[Storage] Successfully saved playlist:${shareId} to disk at ${PLAYLISTS_FILE}.`);
    } catch (err) {
      console.error("[Storage] Failed saving playlist data to file:", err);
      throw new Error("Không thể ghi tệp cấu hình chia sẻ.");
    }
  }

  /**
   * Retrieve playlist details by ID
   */
  public static async getPlaylist(shareId: string): Promise<PlaylistPayload | null> {
    // check in-memory cache first
    if (inMemoryPlaylists[shareId]) {
      return inMemoryPlaylists[shareId];
    }

    // 1. Try Vercel KV database if configured
    if (this.isKvEnabled()) {
      try {
        const url = `${process.env.KV_REST_API_URL}/get/playlist:${shareId}`;
        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}`,
          },
        });

        if (response.ok) {
          const result = await response.json();
          // Upstash REST API returns { result: "..." } or { result: null }
          if (result && result.result) {
            const data = typeof result.result === "string" ? JSON.parse(result.result) : result.result;
            inMemoryPlaylists[shareId] = data;
            return data;
          }
        }
      } catch (err) {
        console.error("[Storage] Failed to fetch from Vercel KV, trying local disk:", err);
      }
    }

    // 2. Fallback to Disk loader
    try {
      const allFromFile = this.loadPlaylistsFromFile();
      const playlist = allFromFile[shareId];
      if (playlist) {
        inMemoryPlaylists[shareId] = playlist;
        return playlist;
      }
    } catch (err) {
      console.error("[Storage] Failed seeking playlist in local file system:", err);
    }

    return null;
  }
}
