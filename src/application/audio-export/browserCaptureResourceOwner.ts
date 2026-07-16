import type { MediaRecorderSession } from '../../infrastructure/media/mediaRecorderAdapter';
export type BrowserCapturePhase = 'idle' | 'preflight' | 'recording' | 'encoding' | 'success' | 'error';
export class BrowserCaptureResourceOwner {
  audioContext: AudioContext | null = null; displayStream: MediaStream | null = null; microphoneStream: MediaStream | null = null; recorderSession: MediaRecorderSession | null = null; recordingUtterance: SpeechSynthesisUtterance | null = null; stoppedManually = false; animationFrame: number | null = null; phase: BrowserCapturePhase = 'idle'; abortReason: string | null = null; expectingSpeech = false;
  stopResources() { try { this.recorderSession?.stop(); } catch {} this.recorderSession = null; this.displayStream?.getTracks().forEach(track => track.stop()); this.displayStream = null; this.microphoneStream?.getTracks().forEach(track => track.stop()); this.microphoneStream = null; if (this.audioContext && this.audioContext.state !== 'closed') void this.audioContext.close().catch(() => {}); this.audioContext = null; if (this.animationFrame !== null) cancelAnimationFrame(this.animationFrame); this.animationFrame = null; this.expectingSpeech = false; }
  cancel() { this.stoppedManually = true; this.phase = 'error'; this.stopResources(); }
}

