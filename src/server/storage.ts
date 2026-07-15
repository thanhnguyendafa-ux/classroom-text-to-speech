import { SharePlaylistPayload } from "../types";
import { adminDb } from './firebaseAdmin';

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
export type PlaylistPayload = Required<SharePlaylistPayload>;

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
      const docRef = adminDb.collection("playlists").doc(shareId);
      await docRef.set({
        speechList: data.speechList,
        speed: data.speed,
        volume: data.volume,
        autoAdvance: data.autoAdvance,
        timeBetweenLines: data.timeBetweenLines,
        playlistLoopMode: data.playlistLoopMode,
        engineMode: data.engineMode,
        createdAt: data.createdAt || new Date().toISOString(),
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
      const docSnap = await adminDb.collection("playlists").doc(shareId).get();

      if (docSnap.exists) {
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

// Validate Connection to Firestore on request/health check
export async function checkFirestoreConnection() {
  const testPath = "test/connection";
  try {
    await adminDb.collection("test").doc("connection").get();
    console.log("[Firestore] Firestore connection is ready.");
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes("the client is offline")) {
      console.error("[Firestore] Please check your Firebase configuration. Client is offline.");
    } else {
      console.log("[Firestore] Tested connection (non-existent doc expected or offline check).", error);
    }
    return false;
  }
}

