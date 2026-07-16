import { acquireCaptureStreams, hasCaptureAudio } from '../../infrastructure/audio/browserCaptureStreams';
import type { CaptureAudioMix } from '../../infrastructure/audio/browserCaptureMix';

export interface PrepareBrowserCaptureInput {
  source: 'system' | 'mic';
  displayConstraints: DisplayMediaStreamOptions;
  captureDisplay: (constraints: DisplayMediaStreamOptions) => Promise<MediaStream>;
  getUserMedia: (constraints: MediaStreamConstraints) => Promise<MediaStream>;
  createAudioContext: () => AudioContext;
  runPreflight: (input: { analyser: AnalyserNode; cancel: () => void; speak: () => void }) => Promise<{ detected: boolean; peak: number }>;
  createMix: (context: AudioContext, display: MediaStream | null, microphone: MediaStream | null, analyser: AnalyserNode) => CaptureAudioMix;
  cancelSpeech: () => void;
  speakProbe: () => void;
}

export interface PreparedBrowserCapture {
  display: MediaStream | null;
  microphone: MediaStream | null;
  audioContext: AudioContext;
  analyser: AnalyserNode;
  recorderStream: MediaStream;
  hasDisplayAudio: boolean;
  preflightPeak: number | null;
}

function stopStream(stream: MediaStream | null): void {
  stream?.getTracks().forEach(track => track.stop());
}

export async function prepareBrowserCapture(input: PrepareBrowserCaptureInput): Promise<PreparedBrowserCapture> {
  const streams = await acquireCaptureStreams({
    source: input.source,
    displayConstraints: input.displayConstraints,
    captureDisplay: input.captureDisplay,
    getUserMedia: input.getUserMedia,
  });
  if (!hasCaptureAudio(streams)) {
    stopStream(streams.display);
    stopStream(streams.microphone);
    throw new Error('capture-audio-unavailable');
  }

  const audioContext = input.createAudioContext();
  try {
    if (audioContext.state === 'suspended') await audioContext.resume();
    const hasDisplayAudio = Boolean(streams.display?.getAudioTracks().length);
    let preflightPeak: number | null = null;
    if (hasDisplayAudio && streams.display) {
      const source = audioContext.createMediaStreamSource(streams.display);
      const preflightAnalyser = audioContext.createAnalyser();
      preflightAnalyser.fftSize = 256;
      source.connect(preflightAnalyser);
      try {
        const result = await input.runPreflight({ analyser: preflightAnalyser, cancel: input.cancelSpeech, speak: input.speakProbe });
        preflightPeak = result.peak;
        if (!result.detected) throw new Error(`capture-preflight-failed:${result.peak.toFixed(1)}`);
      } finally {
        source.disconnect();
      }
    }
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    const mix = input.createMix(audioContext, streams.display, streams.microphone, analyser);
    return { ...streams, audioContext, analyser, recorderStream: mix.recorderStream, hasDisplayAudio, preflightPeak };
  } catch (error) {
    stopStream(streams.display);
    stopStream(streams.microphone);
    if (audioContext.state !== 'closed') await audioContext.close().catch(closeError => console.warn('Failed to close capture context after setup failure', closeError));
    throw error;
  }
}
