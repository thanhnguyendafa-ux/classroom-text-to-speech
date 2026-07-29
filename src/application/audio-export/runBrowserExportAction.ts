import type { Dispatch, SetStateAction } from 'react';
import type { LanguageCode, SpeechItem } from '../../types';
import { encodeMonoMp3 } from '../../audio/mp3Encoder';
import { buildDisplayCaptureConstraints, captureDisplay, createAudioContext, errorMessage, stopMediaStream } from '../../features/media-capture/mediaCaptureAdapter';
import { runBrowserSpeechSequence } from '../../infrastructure/audio/browserSpeechSequence';
import { encodeCapturedAudio } from '../../infrastructure/audio/browserAudioEncodingStrategy';
import { processBrowserRecording } from '../../infrastructure/audio/browserRecordingProcessor';
import { createCaptureAudioMix } from '../../infrastructure/audio/browserCaptureMix';
import { runAudioPreflight } from '../../infrastructure/audio/browserAudioPreflight';
import { createMediaRecorderSession } from '../../infrastructure/media/mediaRecorderAdapter';
import { createAudioSilenceMonitor } from '../../domain/audio-export/audioSilenceMonitor';
import { startBrowserCaptureLevelMonitor } from '../../infrastructure/audio/browserCaptureLevelMonitor';
import { prepareBrowserCapture } from './prepareBrowserCapture';
import { runBrowserCaptureSession } from './runBrowserCaptureSession';
import type { BrowserCaptureResourceOwner } from './browserCaptureResourceOwner';

type Phase = 'idle' | 'processing' | 'recording' | 'success' | 'error';
interface RunBrowserExportActionInput {
  capture: BrowserCaptureResourceOwner;
  audioSource: 'system' | 'mic';
  onlyCurrentTab: boolean;
  itemsToExport: SpeechItem[];
  speed: number;
  volume: number;
  voices: SpeechSynthesisVoice[];
  preferredVoiceNames: Record<LanguageCode, string>;
  timeBetweenLines: number;
  setExportPhase: (phase: Phase) => void;
  clearLogs: () => void;
  replaceAudioBlobUrl: (url: string | null) => void;
  setProgressPercent: (value: number) => void;
  setProgressText: (value: string) => void;
  setSoundLevel: Dispatch<SetStateAction<number>>;
  setSilentTimerCount: Dispatch<SetStateAction<number>>;
  setMicActiveWarning: Dispatch<SetStateAction<boolean>>;
  addLog: (message: string) => void;
}

export async function runBrowserExportAction(input: RunBrowserExportActionInput) {
  const { capture, audioSource, onlyCurrentTab, itemsToExport, speed, volume, voices, preferredVoiceNames, timeBetweenLines, setExportPhase, clearLogs, replaceAudioBlobUrl, setProgressPercent, setProgressText, setSoundLevel, setSilentTimerCount, setMicActiveWarning, addLog } = input;

    capture.stoppedManually = false;
    capture.phase = 'preflight';
    capture.abortReason = null;
    capture.expectingSpeech = false;
    setExportPhase('recording');
    clearLogs();
    replaceAudioBlobUrl(null);
    setProgressPercent(0);
    setSoundLevel(0);
    setSilentTimerCount(0);
    setMicActiveWarning(false);
    
    addLog("Chuẩn bị cơ chế ghi âm SpeechSynthesis của trình duyệt...");
    if (audioSource === 'system') {
      addLog("HƯỚNG DẪN BẮT BUỘC: Bạn hãy chọn tab 'Toàn bộ màn hình' (Entire Screen), tích vào ô 'Chia sẻ âm thanh hệ thống' (Share system audio) ở góc trái dưới, rồi chọn Màn hình của bạn.");
    } else {
      addLog("HƯỚNG DẪN: Máy ghi âm sẽ thu trực tiếp từ Microphone qua loa ngoài. Hãy bật mức loa vừa đủ nghe.");
    }

    try {
      if (audioSource === 'system') setProgressText("Preflight: đang kiểm tra tín hiệu âm thanh...");
      const preparedCapture = await prepareBrowserCapture({
        source: audioSource,
        displayConstraints: buildDisplayCaptureConstraints({ width: 320, height: 180, frameRate: 10, onlyCurrentTab, captureSystemAudio: true }),
        captureDisplay,
        getUserMedia: constraints => navigator.mediaDevices.getUserMedia(constraints),
        createAudioContext,
        runPreflight: runAudioPreflight,
        createMix: createCaptureAudioMix,
        cancelSpeech: () => window.speechSynthesis.cancel(),
        speakProbe: () => {
          const utterance = new SpeechSynthesisUtterance("Starting");
          utterance.volume = 1;
          utterance.rate = 1;
          utterance.lang = "en-US";
          window.speechSynthesis.speak(utterance);
        },
      });
      const stream = preparedCapture.display;
      const micStream = preparedCapture.microphone;
      const audioCtx = preparedCapture.audioContext;
      const analyserNode = preparedCapture.analyser;
      const recorderStream = preparedCapture.recorderStream;
      const hasDisplayAudio = preparedCapture.hasDisplayAudio;
      capture.displayStream = stream;
      capture.microphoneStream = micStream;
      capture.audioContext = audioCtx;
      addLog(audioSource === 'mic' ? "Đã khởi tạo microphone." : "Đã nhận luồng âm thanh hệ thống.");
      if (preparedCapture.preflightPeak !== null) addLog(`Preflight OK, peak ${preparedCapture.preflightPeak.toFixed(1)}.`);
      if (hasDisplayAudio) {
        const silenceMonitor = createAudioSilenceMonitor();
        capture.stopLevelMonitor = startBrowserCaptureLevelMonitor({
          analyser: analyserNode,
          sample: input => silenceMonitor.sample(input),
          isCancelled: () => capture.stoppedManually,
          isExpectingSpeech: () => capture.expectingSpeech,
          isRecording: () => capture.phase === 'recording',
          now: () => Date.now(),
          requestFrame: callback => requestAnimationFrame(callback),
          cancelFrame: frame => cancelAnimationFrame(frame),
          onLevel: level => setSoundLevel(level),
          onWarning: warning => setMicActiveWarning(warning),
          onAbort: () => {
            addLog("CẢNH BÁO: Tín hiệu âm thanh biến mất khi đang đọc bài.");
            capture.abortReason = 'silent-during-speech';
            capture.phase = 'error';
            capture.stopLevelMonitor?.();
            capture.stopLevelMonitor = null;
            capture.recorderSession?.stop();
            window.speechSynthesis.cancel();
          },
        });
      } else {
        setSoundLevel(5);
      }

      // 3. Initialize MediaRecorder to capture webm/opus buffer sequentially
const handleRecordedBlob = async (webmBlob: Blob) => {
        if (capture.stoppedManually) {
          addLog("Đã dừng ghi âm theo yêu cầu.");
          setExportPhase('idle');
          return;
        }
        if (capture.abortReason === 'silent-during-speech') {
          setExportPhase('error');
          setProgressText("Không thu được tiếng");
          addLog("LỖI: Trình duyệt bị im lặng liên tục khi đang đọc. Bản ghi đã bị hủy.");
          stopMediaStream(capture.displayStream); capture.displayStream = null;
          stopMediaStream(capture.microphoneStream); capture.microphoneStream = null;
          return;
        }
        setProgressText("Đang giải nén và chuyển sang MP3...");
        setExportPhase('processing');
        const decodeContext = createAudioContext();
        try {
          const result = await processBrowserRecording({
            blob: webmBlob,
            decode: data => decodeContext.decodeAudioData(data),
            encode: buffer => encodeCapturedAudio(buffer, encodeMonoMp3),
            createObjectUrl: blob => URL.createObjectURL(blob),
          });
          replaceAudioBlobUrl(result.url);
          capture.phase = 'success';
          setExportPhase('success');
          if (result.kind === 'source-fallback') {
            addLog(`Không thể mã hóa MP3 (${result.decodeError}). Giữ bản ghi WebM để tránh mất dữ liệu.`);
            return;
          }
          const { peak, rms, clippingRatio, duration, isLikelyClipped } = result.metrics;
          addLog(`Chất lượng thu âm - Peak: ${peak.toFixed(3)}, RMS: ${rms.toFixed(3)}, clipping: ${(clippingRatio * 100).toFixed(1)}%, thời lượng: ${duration.toFixed(1)} giây.`);
          if (isLikelyClipped) addLog("CẢNH BÁO: Tín hiệu có dấu hiệu clipping hoặc feedback. Hãy dùng System Audio Only và giảm âm lượng.");
          addLog("Đã xuất file MP3 thành công.");
        } catch (error: unknown) {
          console.error("Browser recording processing failed:", error);
          addLog(`Lỗi mã hóa bản ghi: ${errorMessage(error)}`);
          capture.phase = 'error';
          setExportPhase('error');
        } finally {
          void decodeContext.close().catch(() => {});
        }
      };
      await runBrowserCaptureSession({
        owner: capture,
        recorderStream,
        items: itemsToExport,
        speed,
        volume,
        voices,
        preferredVoiceNames,
        defaultPauseSeconds: timeBetweenLines,
        createRecorderSession: (stream, onBlob) => createMediaRecorderSession(stream, onBlob),
        runSpeechSequence: runBrowserSpeechSequence,
        onRecordedBlob: handleRecordedBlob,
        onRecorderReady: mimeType => addLog(`Kích hoạt máy ghi âm (codec: ${mimeType}).`),
        onProgress: (index, item) => {
          setProgressPercent(Math.round((index / itemsToExport.length) * 100));
          setProgressText(`Đang phát dòng ${index + 1}/${itemsToExport.length}: "${item.text.substring(0, 40)}"`);
        },
        onRepeat: (index, repeat, total) => addLog(`Đọc lại câu ${index + 1} (lần ${repeat}/${total})`),
        onError: (index, error) => addLog(`TTS cảnh báo trên dòng ${index + 1}: ${error}`),
        speechSynthesis: window.speechSynthesis,
        createUtterance: text => new SpeechSynthesisUtterance(text),
        wait: (callback, delayMs) => window.setTimeout(callback, delayMs),
      });
      if (!capture.stoppedManually) addLog("Đã chạy hết danh sách câu. Đang dừng ghi âm...");

    } catch (err: unknown) {
      console.error(err);
      setExportPhase('error');
      addLog(`Lỗi chuẩn bị ghi âm: ${errorMessage(err)}`);
    }
}
