import { SpeechItem } from '../../../types';

export type PremiumAudioStatus = 'ready' | 'pending' | 'failed';

export interface PremiumAudioAsset {
  assetId: string;
  cacheKey: string;
  textHash: string;
  textPreview: string;
  lang: string;
  voice: string;
  status: PremiumAudioStatus;
  storagePath: string | null;
  durationMs?: number;
  sizeBytes?: number;
  errorCode?: string;
  errorMessage?: string;
  sourceVersion: 'premium-tts-v1';
  createdAt: number;
  updatedAt: number;
}

export interface PreparationProgress {
  total: number;
  ready: number;
  missing: number;
  failed: number;
  duplicateReused: number;
  quotaSaved: number;
  statusMap: Record<string, PremiumAudioStatus | 'missing'>;
}

export type PlaybackResolveMode = 'prefer-saved' | 'fallback-live' | 'only-ready';
