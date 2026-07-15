import { SharePlaylistPayload } from "../types";
import { adminDb } from './firebaseAdmin';
import { logger } from './structuredLogger';

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
  logger.error('firestore_operation_failed', { operationType, path, error: errInfo.error });
  throw new Error(JSON.stringify(errInfo));
}

// Interfaces for backend storage provider
export type PlaylistPayload = Required<SharePlaylistPayload>;

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

      logger.info('shared_playlist_saved', { shareId });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, documentPath);
    }
  }

  /**
   * Retrieve playlist details by ID from Firestore
   */
  public static async getPlaylist(shareId: string): Promise<PlaylistPayload | null> {
    const documentPath = `playlists/${shareId}`;
    try {
      const docSnap = await adminDb.collection("playlists").doc(shareId).get();

      if (docSnap.exists) {
        const data = docSnap.data() as PlaylistPayload;
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
    logger.info('firestore_connection_ready');
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes("the client is offline")) {
      logger.error('firestore_connection_offline');
    } else {
      logger.warn('firestore_connection_check_inconclusive', { error });
    }
    return false;
  }
}

