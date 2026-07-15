export interface DisplayCaptureConstraints extends DisplayMediaStreamOptions {
  preferCurrentTab?: boolean;
  selfBrowserSurface?: 'include' | 'exclude';
  monitorTypeSurfaces?: 'include' | 'exclude';
  systemAudio?: 'include' | 'exclude';
}

interface DisplayCaptureOptions {
  width: number;
  height: number;
  onlyCurrentTab: boolean;
  frameRate?: number;
}

export function buildDisplayCaptureConstraints(options: DisplayCaptureOptions): DisplayCaptureConstraints {
  const constraints: DisplayCaptureConstraints = {
    video: {
      width: { ideal: options.width },
      height: { ideal: options.height },
      frameRate: { ideal: options.frameRate ?? 30 },
    },
    audio: {
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
    },
  };
  if (options.onlyCurrentTab) {
    constraints.preferCurrentTab = true;
    constraints.selfBrowserSurface = 'include';
  }
  return constraints;
}

export async function captureDisplay(constraints: DisplayCaptureConstraints): Promise<MediaStream> {
  return navigator.mediaDevices.getDisplayMedia(constraints);
}

export function createAudioContext(): AudioContext {
  const AudioContextConstructor = window.AudioContext ?? (window as Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextConstructor) throw new Error('Web Audio API is not supported');
  return new AudioContextConstructor();
}

export function stopMediaStream(stream: MediaStream | null | undefined): void {
  stream?.getTracks().forEach((track) => track.stop());
}

export function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'Unknown media error';
}

export function errorName(error: unknown): string {
  return error instanceof Error ? error.name : '';
}
