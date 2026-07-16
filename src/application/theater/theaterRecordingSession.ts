import type { RecordingResolution } from './recordingReducer';

export interface TheaterRecordingSession {
  stop: () => void;
}
export interface CreateTheaterRecordingSessionInput {
  recorder: MediaRecorder;
  displayStream: MediaStream | null;
  microphoneStream: MediaStream | null;
  clearTimer: () => void;
  onStopped: () => void;
}
const dimensions: Record<RecordingResolution, { width: number; height: number }> = {
  '480p': { width: 854, height: 480 },
  '720p': { width: 1280, height: 720 },
  '1080p': { width: 1920, height: 1080 },
};
function createSession(input: CreateTheaterRecordingSessionInput): TheaterRecordingSession {
  let stopped = false;
  return {
    stop: () => {
      if (stopped) return;
      stopped = true;
      input.clearTimer();
      if (input.recorder.state === 'recording') input.recorder.stop();
      input.displayStream?.getTracks().forEach(track => track.stop());
      input.microphoneStream?.getTracks().forEach(track => track.stop());
      input.onStopped();
    },
  };
}
export const createTheaterRecordingSession = Object.assign(createSession, {
  resolution: (resolution: RecordingResolution) => dimensions[resolution],
});
