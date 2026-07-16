export interface CaptureStreams { display: MediaStream | null; microphone: MediaStream | null; }
export interface AcquireCaptureStreamsInput { source: 'system' | 'mic'; displayConstraints: DisplayMediaStreamOptions; captureDisplay: (constraints: DisplayMediaStreamOptions) => Promise<MediaStream>; getUserMedia: (constraints: MediaStreamConstraints) => Promise<MediaStream>; }
export async function acquireCaptureStreams(input: AcquireCaptureStreamsInput): Promise<CaptureStreams> {
  if (input.source === 'system') return { display: await input.captureDisplay(input.displayConstraints), microphone: null };
  try { return { display: null, microphone: await input.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } }) }; }
  catch { return { display: null, microphone: await input.getUserMedia({ audio: true }) }; }
}
export function hasCaptureAudio(streams: CaptureStreams): boolean { return Boolean(streams.display?.getAudioTracks().length || streams.microphone?.getAudioTracks().length); }
