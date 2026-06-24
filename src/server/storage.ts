import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, getDoc, getDocFromServer } from "firebase/firestore";
import fs from "fs";
import path from "path";

// Initialize Firebase using firebase-applet-config.json
const configPath = path.join(process.cwd(), "firebase-applet-config.json");
let firebaseConfig: any = {};
try {
  firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
} catch (err) {
  console.error("Failed to read firebase-applet-config.json:", err);
}

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Error handling types and helpers as required by firebase-integration skill
export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: null,
      email: null,
      emailVerified: null,
      isAnonymous: null,
      tenantId: null,
      providerInfo: [],
    },
    operationType,
    path,
  };
  console.error("Firestore Error: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Interfaces for backend storage provider
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

// In-memory cache for fast subsequent reads
let inMemoryPlaylists: Record<string, any> = {};

/**
 * Shared storage engine using Firebase Firestore
 */
export class PlaylistStorageManager {
  /**
   * Save playlist details to Firestore
   */
  public static async savePlaylist(shareId: string, data: PlaylistPayload): Promise<void> {
    const documentPath = `playlists/${shareId}`;
    try {
      const docRef = doc(db, "playlists", shareId);
      await setDoc(docRef, {
        speechList: data.speechList,
        speed: data.speed,
        volume: data.volume,
        autoAdvance: data.autoAdvance,
        timeBetweenLines: data.timeBetweenLines,
        playlistLoopMode: data.playlistLoopMode,
        engineMode: data.engineMode,
        createdAt: data.createdAt,
      });

      inMemoryPlaylists[shareId] = data;
      console.log(`[Firestore] Successfully saved playlist:${shareId} to Firestore.`);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, documentPath);
    }
  }

  /**
   * Retrieve playlist details by ID from Firestore
   */
  public static async getPlaylist(shareId: string): Promise<PlaylistPayload | null> {
    // Check in-memory cache first
    if (inMemoryPlaylists[shareId]) {
      return inMemoryPlaylists[shareId];
    }

    const documentPath = `playlists/${shareId}`;
    try {
      const docRef = doc(db, "playlists", shareId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data() as PlaylistPayload;
        inMemoryPlaylists[shareId] = data;
        return data;
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, documentPath);
    }

    return null;
  }
}

// Validate Connection to Firestore on startup as mandated by the skill
async function testConnection() {
  const testPath = "test/connection";
  try {
    const docRef = doc(db, "test", "connection");
    await getDocFromServer(docRef);
    console.log("[Firestore] Firestore connection is ready.");
  } catch (error) {
    if (error instanceof Error && error.message.includes("the client is offline")) {
      console.error("[Firestore] Please check your Firebase configuration. Client is offline.");
    } else {
      console.log("[Firestore] Tested connection (non-existent doc expected or offline check).", error);
    }
  }
}
testConnection();
