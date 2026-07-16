import type { AudioQualityMetrics, EncodedCapturedAudio } from './browserAudioEncodingStrategy';

export interface ProcessBrowserRecordingInput {
  blob: Blob;
  decode: (data: ArrayBuffer) => Promise<AudioBuffer>;
  encode: (buffer: AudioBuffer) => EncodedCapturedAudio;
  createObjectUrl: (blob: Blob) => string;
}

export type ProcessBrowserRecordingResult =
  | { kind: 'source-fallback'; url: string; decodeError: string }
  | { kind: 'encoded'; url: string; metrics: AudioQualityMetrics };

export async function processBrowserRecording(input: ProcessBrowserRecordingInput): Promise<ProcessBrowserRecordingResult> {
  if (input.blob.size === 0) throw new Error('empty-recording');
  let decoded: AudioBuffer;
  try {
    decoded = await input.decode(await input.blob.arrayBuffer());
  } catch (error: unknown) {
    const decodeError = error instanceof Error ? error.message : String(error);
    return { kind: 'source-fallback', url: input.createObjectUrl(input.blob), decodeError };
  }
  const encoded = input.encode(decoded);
  return { kind: 'encoded', url: input.createObjectUrl(encoded.blob), metrics: encoded.metrics }
}

