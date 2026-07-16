import { useCallback, useEffect, useRef } from 'react';
import { buildDisplayCaptureConstraints, captureDisplay, createAudioContext, errorMessage, errorName } from '../../features/media-capture/mediaCaptureAdapter';
import { prepareTheaterRecording, selectTheaterRecorderOptions } from './prepareTheaterRecording';
import { createTheaterRecordingSession, type TheaterRecordingSession } from './theaterRecordingSession';

type Resolution = '720p' | '1080p';

interface UseTheaterRecorderInput {
  resolution: Resolution;
  includeMicrophone: boolean;
  disableEchoCancellation: boolean;
  onlyCurrentTab: boolean;
  onRecordingChange: (recording: boolean) => void;
  onRecordingTimeChange: (update: number | ((current: number) => number)) => void;
  onConfigOpenChange: (open: boolean) => void;
  onError: (message: string | null) => void;
}

export function formatRecordingTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function useTheaterRecorder(input: UseTheaterRecorderInput) {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionRef = useRef<TheaterRecordingSession | null>(null);

  const saveVideo = useCallback(() => {
    if (chunksRef.current.length === 0) return;
    try {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      chunksRef.current = [];
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      const now = new Date();
      const timestamp = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('') + '_' + [String(now.getHours()).padStart(2, '0'), String(now.getMinutes()).padStart(2, '0'), String(now.getSeconds()).padStart(2, '0')].join('');
      anchor.href = url;
      anchor.download = `LuyenDoc_Video_${input.resolution}_${timestamp}.webm`;
      document.body.appendChild(anchor);
      anchor.click();
      setTimeout(() => { anchor.remove(); URL.revokeObjectURL(url); }, 500);
    } catch (cause) {
      console.error('Recording download error:', cause);
      input.onError(`Lỗi lưu video file: ${errorMessage(cause)}`);
    }
  }, [input.resolution, input.onError]);

  const stop = useCallback(() => {
    sessionRef.current?.stop();
    sessionRef.current = null;
  }, []);

  const discard = useCallback(() => {
    if (recorderRef.current) recorderRef.current.onstop = null;
    chunksRef.current = [];
    stop();
  }, [stop]);

  useEffect(() => discard, [discard]);

  const start = useCallback(async () => {
    input.onError(null);
    chunksRef.current = [];
    const { width, height } = createTheaterRecordingSession.resolution(input.resolution);
    try {
      const prepared = await prepareTheaterRecording({
        includeMicrophone: input.includeMicrophone,
        disableEchoCancellation: input.disableEchoCancellation,
        displayConstraints: buildDisplayCaptureConstraints({ width, height, onlyCurrentTab: input.onlyCurrentTab }),
        captureDisplay,
        getUserMedia: constraints => navigator.mediaDevices.getUserMedia(constraints),
        createCombinedStream: () => new MediaStream(),
        createAudioContext,
        onMicrophoneUnavailable: cause => {
          console.warn('Microphone unavailable; continuing with display audio', cause);
          input.onError('Không chọn được microphone ngoài. Hệ thống vẫn tiếp tục quay bằng âm thanh máy tính.');
        },
      });
      const options = selectTheaterRecorderOptions(type => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(prepared.combinedStream, options);
      recorderRef.current = recorder;
      sessionRef.current = createTheaterRecordingSession({
        recorder,
        displayStream: prepared.displayStream,
        microphoneStream: prepared.microphoneStream,
        clearTimer: () => { if (timerRef.current) clearInterval(timerRef.current); timerRef.current = null; },
        onStopped: () => input.onRecordingChange(false),
      });
      prepared.videoTrack.onended = stop;
      recorder.ondataavailable = event => { if (event.data?.size > 0) chunksRef.current.push(event.data); };
      recorder.onstop = saveVideo;
      recorder.start(1000);
      input.onRecordingChange(true);
      input.onRecordingTimeChange(0);
      input.onConfigOpenChange(false);
      timerRef.current = setInterval(() => input.onRecordingTimeChange(current => current + 1), 1000);
    } catch (cause) {
      console.error('Recording start error:', cause);
      const message = errorMessage(cause).toLowerCase();
      if (window.self !== window.top && (errorName(cause) === 'SecurityError' || message.includes('iframe') || message.includes('sandboxed') || message.includes('permission'))) input.onError('Trình duyệt chặn quay màn hình trong iframe. Hãy mở ứng dụng ở tab riêng rồi thử lại.');
      else if (errorName(cause) === 'NotAllowedError') input.onError('Bạn đã từ chối quyền chia sẻ hoặc ghi hình màn hình.');
      else input.onError(`Không thể chuẩn bị công cụ ghi: ${errorMessage(cause)}`);
    }
  }, [input, saveVideo, stop]);

  return { start, stop, discard };
}
