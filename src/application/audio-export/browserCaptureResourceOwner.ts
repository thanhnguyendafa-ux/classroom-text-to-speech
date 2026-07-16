import type { MediaRecorderSession } from '../../infrastructure/media/mediaRecorderAdapter';
export type BrowserCapturePhase = 'idle' | 'preflight' | 'recording' | 'encoding' | 'success' | 'error';
export class BrowserCaptureResourceOwner {
  audioContext: AudioContext | null = null; displayStream: MediaStream | null = null; microphoneStream: MediaStream | null = null; recorderSession: MediaRecorderSession | null = null; recordingUtterance: SpeechSynthesisUtterance | null = null; stoppedManually = false; stopLevelMonitor: (() => void) | null = null; phase: BrowserCapturePhase = 'idle'; abortReason: string | null = null; expectingSpeech = false;
  stopResources() { this.recorderSession?.stop(); this.recorderSession = null; this.displayStream?.getTracks().forEach(track => track.stop()); this.displayStream = null; this.microphoneStream?.getTracks().forEach(track => track.stop()); this.microphoneStream = null; if (this.audioContext && this.audioContext.state !== 'closed') void this.audioContext.close().catch(error => console.warn('Failed to close capture audio context', error)); this.audioContext = null; this.stopLevelMonitor?.(); this.stopLevelMonitor = null; this.expectingSpeech = false; }
  cancel() { this.stoppedManually = true; this.phase = 'error'; this.stopResources(); }
}

