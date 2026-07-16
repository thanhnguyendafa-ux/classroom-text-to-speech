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
    
    addLog("ChuÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¡Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂºĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â©n bÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¡Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â»Ă„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚Â¹ cÄ‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚Â Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¡ chÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¡Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂºĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¿ ghi Ă„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢m SpeechSynthesis cÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¡Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â»Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â§a trĂ„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¬nh duyÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¡Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â»Ă„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚Â¡t...");
    if (audioSource === 'system') {
      addLog("HÄ‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚Â Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¯Ä‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¡Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â»Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂNG DÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¡Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂºĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂªN BÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¡Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂºĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â®T BUÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¡Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â»Ă„â€Ă¢â‚¬Â¹Ä‚â€¦Ă¢â‚¬Å“C: BÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¡Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂºĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¡n hĂ„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â£y chÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¡Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â»Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚Ân tab 'ToĂ„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â n bÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¡Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â»Ă„â€Ă‚Â¢Ä‚Â¢Ă¢â€Â¬Ă‚ÂÄ‚â€Ă‚Â¢ mĂ„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â n hĂ„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¬nh' (Entire Screen), tĂ„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â­ch vĂ„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â o Ă„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â´ 'Chia sÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¡Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂºĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â» Ă„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢m thanh hÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¡Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â»Ă„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚Â¡ thÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¡Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â»Ă„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€¹Ă…â€œng' (Share system audio) Ä‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¡Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â»Ă„â€Ă¢â‚¬Â¦Ä‚â€Ă‚Â¸ gĂ„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â³c trĂ„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¡i dÄ‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚Â Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â°Ä‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¡Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â»Ă„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚Âºi, rÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¡Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â»Ă„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€¦Ă¢â‚¬Å“i chÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¡Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â»Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚Ân MĂ„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â n hĂ„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¬nh cÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¡Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â»Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â§a bÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¡Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂºĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¡n.");
    } else {
      addLog("HÄ‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚Â Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¯Ä‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¡Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â»Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂNG DÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¡Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂºĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂªN: MĂ„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¡y ghi Ă„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢m sÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¡Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂºĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â½ thu trÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¡Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â»Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â±c tiÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¡Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂºĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¿p tÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¡Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â»Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â« Microphone qua loa ngoĂ„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â i. HĂ„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â£y bÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¡Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂºĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â­t mÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¡Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â»Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â©c loa vÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¡Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â»Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â«a Ä‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€¹Ă…â€œÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¡Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â»Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â§ nghe.");
    }

    try {
      if (audioSource === 'system') setProgressText("Preflight: Ä‘ang kiá»ƒm tra tĂ­n hiá»‡u Ă¢m thanh...");
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
      addLog(audioSource === 'mic' ? "ÄĂ£ khá»Ÿi táº¡o microphone." : "ÄĂ£ nháº­n luá»“ng Ă¢m thanh há»‡ thá»‘ng.");
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
            addLog("Cáº¢NH BĂO: TĂ­n hiá»‡u Ă¢m thanh biáº¿n máº¥t khi Ä‘ang Ä‘á»c bĂ i.");
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
          addLog("ÄĂ£ dá»«ng ghi Ă¢m theo yĂªu cáº§u.");
          setExportPhase('idle');
          return;
        }
        if (capture.abortReason === 'silent-during-speech') {
          setExportPhase('error');
          setProgressText("KhĂ´ng thu Ä‘Æ°á»£c tiáº¿ng");
          addLog("Lá»–I: TrĂ¬nh duyá»‡t bá»‹ im láº·ng liĂªn tá»¥c khi Ä‘ang Ä‘á»c. Báº£n ghi Ä‘Ă£ bá»‹ há»§y.");
          stopMediaStream(capture.displayStream); capture.displayStream = null;
          stopMediaStream(capture.microphoneStream); capture.microphoneStream = null;
          return;
        }
        setProgressText("Äang giáº£i nĂ©n vĂ  chuyá»ƒn sang MP3...");
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
            addLog(`KhĂ´ng thá»ƒ mĂ£ hĂ³a MP3 (${result.decodeError}). Giá»¯ báº£n ghi WebM Ä‘á»ƒ trĂ¡nh máº¥t dá»¯ liá»‡u.`);
            return;
          }
          const { peak, rms, clippingRatio, duration, isLikelyClipped } = result.metrics;
          addLog(`Cháº¥t lÆ°á»£ng thu Ă¢m - Peak: ${peak.toFixed(3)}, RMS: ${rms.toFixed(3)}, clipping: ${(clippingRatio * 100).toFixed(1)}%, thá»i lÆ°á»£ng: ${duration.toFixed(1)} giĂ¢y.`);
          if (isLikelyClipped) addLog("Cáº¢NH BĂO: TĂ­n hiá»‡u cĂ³ dáº¥u hiá»‡u clipping hoáº·c feedback. HĂ£y dĂ¹ng System Audio Only vĂ  giáº£m Ă¢m lÆ°á»£ng.");
          addLog("ÄĂ£ xuáº¥t file MP3 thĂ nh cĂ´ng.");
        } catch (error: unknown) {
          console.error("Browser recording processing failed:", error);
          addLog(`Lá»—i mĂ£ hĂ³a báº£n ghi: ${errorMessage(error)}`);
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
        onRecorderReady: mimeType => addLog(`KĂ­ch hoáº¡t mĂ¡y ghi Ă¢m (codec: ${mimeType}).`),
        onProgress: (index, item) => {
          setProgressPercent(Math.round((index / itemsToExport.length) * 100));
          setProgressText(`Äang phĂ¡t dĂ²ng ${index + 1}/${itemsToExport.length}: "${item.text.substring(0, 40)}"`);
        },
        onRepeat: (index, repeat, total) => addLog(`Äá»c láº¡i cĂ¢u ${index + 1} (láº§n ${repeat}/${total})`),
        onError: (index, error) => addLog(`TTS cáº£nh bĂ¡o trĂªn dĂ²ng ${index + 1}: ${error}`),
        speechSynthesis: window.speechSynthesis,
        createUtterance: text => new SpeechSynthesisUtterance(text),
        wait: (callback, delayMs) => window.setTimeout(callback, delayMs),
      });
      if (!capture.stoppedManually) addLog("ÄĂ£ cháº¡y háº¿t danh sĂ¡ch cĂ¢u. Äang dá»«ng ghi Ă¢m...");

    } catch (err: unknown) {
      console.error(err);
      setExportPhase('error');
      addLog(`LÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¡Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â»Ă„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚Â¢Ă¢â€Â¬Ă‚Âi chuÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¡Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂºĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â©n bÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¡Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â»Ă„â€Ă‚Â¢Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¬Ä‚â€Ă‚Â¹ ghi Ă„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚ÂĂ„â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢m: ${errorMessage(err)}`);
    }
}
