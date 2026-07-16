import type { SpeechItem } from '../../types';
import type { BrowserSpeechSequenceInput } from '../../infrastructure/audio/browserSpeechSequence';
import type { MediaRecorderSession } from '../../infrastructure/media/mediaRecorderAdapter';
import type { BrowserCaptureResourceOwner } from './browserCaptureResourceOwner';

export interface RunBrowserCaptureSessionInput {
  owner: BrowserCaptureResourceOwner;
  recorderStream: MediaStream;
  items: readonly SpeechItem[];
  speed: number;
  volume: number;
  voices: readonly SpeechSynthesisVoice[];
  preferredVoiceNames: Partial<Record<string, string>>;
  defaultPauseSeconds: number;
  createRecorderSession: (stream: MediaStream, onBlob: (blob: Blob) => void) => MediaRecorderSession;
  runSpeechSequence: (input: BrowserSpeechSequenceInput) => Promise<void>;
  onRecordedBlob: (blob: Blob) => Promise<void>;
  onRecorderReady: (mimeType: string) => void;
  onProgress: NonNullable<BrowserSpeechSequenceInput['onProgress']>;
  onRepeat: NonNullable<BrowserSpeechSequenceInput['onRepeat']>;
  onError: NonNullable<BrowserSpeechSequenceInput['onError']>;
  speechSynthesis: SpeechSynthesis;
  createUtterance: (text: string) => SpeechSynthesisUtterance;
  wait: (callback: () => void, delayMs: number) => unknown;
}

export async function runBrowserCaptureSession(input: RunBrowserCaptureSessionInput): Promise<void> {
  const session = input.createRecorderSession(input.recorderStream, blob => { void input.onRecordedBlob(blob); });
  input.owner.recorderSession = session;
  input.onRecorderReady(session.recorder.mimeType || 'default');
  session.start();
  input.owner.phase = 'recording';
  await input.runSpeechSequence({
    items: input.items,
    speed: input.speed,
    volume: input.volume,
    voices: input.voices,
    preferredVoiceNames: input.preferredVoiceNames,
    speechSynthesis: input.speechSynthesis,
    createUtterance: input.createUtterance,
    wait: input.wait,
    isCancelled: () => input.owner.stoppedManually,
    defaultPauseSeconds: input.defaultPauseSeconds,
    onProgress: input.onProgress,
    onRepeat: input.onRepeat,
    onError: input.onError,
    onExpectationChange: expecting => { input.owner.expectingSpeech = expecting; },
    onUtterance: utterance => { input.owner.recordingUtterance = utterance; },
  });
  if (input.owner.stoppedManually) return;
  input.owner.phase = 'encoding';
  input.owner.expectingSpeech = false;
  input.owner.stopLevelMonitor?.();
  input.owner.stopLevelMonitor = null;
  session.stop();
  input.owner.displayStream?.getTracks().forEach(track => track.stop());
  input.owner.displayStream = null;
  input.owner.microphoneStream?.getTracks().forEach(track => track.stop());
  input.owner.microphoneStream = null;
}
