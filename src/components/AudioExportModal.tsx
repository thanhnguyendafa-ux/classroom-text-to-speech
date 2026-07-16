import React, { useState, useEffect, useMemo, useRef } from 'react';
import { X, Play, Square, Volume2, Radio } from 'lucide-react';
import { SpeechItem, LanguageCode } from '../types';
import { encodeMonoMp3 } from '../audio/mp3Encoder';
import { getPremiumVoiceForLang } from '../features/premium-tts/premiumVoices';
import { premiumTtsCacheStore } from '../features/premium-tts/premiumTtsCacheStore';
import { resolvePremiumAudio } from '../features/premium-tts/persistent-audio/premiumAudioResolver';
import { buildDisplayCaptureConstraints, captureDisplay, createAudioContext, errorMessage, stopMediaStream } from '../features/media-capture/mediaCaptureAdapter';
import { PremiumAudioExportCancelledError } from '../infrastructure/audio/premiumAudioExportStrategy';
import { runBrowserSpeechSequence } from '../infrastructure/audio/browserSpeechSequence';
import { encodeCapturedAudio } from '../infrastructure/audio/browserAudioEncodingStrategy';
import { processBrowserRecording } from '../infrastructure/audio/browserRecordingProcessor';
import { acquireCaptureStreams } from '../infrastructure/audio/browserCaptureStreams';
import { createCaptureAudioMix } from '../infrastructure/audio/browserCaptureMix';
import { runAudioPreflight } from '../infrastructure/audio/browserAudioPreflight';
import { buildAudioExportFilename, downloadObjectUrl } from '../infrastructure/audio/audioExportDownload';
import { createMediaRecorderSession, type MediaRecorderSession } from '../infrastructure/media/mediaRecorderAdapter';
import { AudioExportResult } from '../features/audio-export/AudioExportResult';
import { AudioExportProgress } from '../features/audio-export/AudioExportProgress';
import { AudioExportSettings } from '../features/audio-export/AudioExportSettings';
import { useAudioExportController } from '../application/audio-export/useAudioExportController';
import { useOwnedObjectUrl } from '../application/audio-export/useOwnedObjectUrl';
import { BrowserCaptureResourceOwner } from '../application/audio-export/browserCaptureResourceOwner';
import { executePremiumAudioExport } from '../application/audio-export/executePremiumAudioExport';
import { createAudioSilenceMonitor } from '../domain/audio-export/audioSilenceMonitor';

interface AudioExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  speechList: SpeechItem[];
  speed: number;
  volume: number;
  timeBetweenLines: number;
  engineMode: 'browser' | 'premium';
  userGeminiApiKey: string;
  voices: SpeechSynthesisVoice[];
  
  // Preferred browser voices from App settings
  selectedEnVoiceName: string;
  selectedViVoiceName: string;
  selectedZhCnVoiceName: string;
  selectedZhTwVoiceName: string;
  selectedJaVoiceName: string;
  selectedKoVoiceName: string;

  // Premium voices
  selectedPremiumVoiceEn: string;
  selectedPremiumVoiceVi: string;
  selectedPremiumVoiceZhCn: string;
  selectedPremiumVoiceZhTw: string;
  selectedPremiumVoiceJa: string;
  selectedPremiumVoiceKo: string;

  // Persistent audio preparation props
  userId: string | null;
  lessonId: string | null;
}

export default function AudioExportModal({
  isOpen,
  onClose,
  speechList,
  speed,
  volume,
  timeBetweenLines,
  engineMode,
  userGeminiApiKey,
  voices,
  selectedEnVoiceName,
  selectedViVoiceName,
  selectedZhCnVoiceName,
  selectedZhTwVoiceName,
  selectedJaVoiceName,
  selectedKoVoiceName,
  selectedPremiumVoiceEn,
  selectedPremiumVoiceVi,
  selectedPremiumVoiceZhCn,
  selectedPremiumVoiceZhTw,
  selectedPremiumVoiceJa,
  selectedPremiumVoiceKo,
  userId,
  lessonId
}: AudioExportModalProps) {
  // Config states
  const [selectedRange, setSelectedRange] = useState<'all' | string>('all');
  const [exportEngine, setExportEngine] = useState<'browser' | 'premium'>(engineMode);
  
  // Audio Source selection for browser recording
  const [audioSource, setAudioSource] = useState<'system' | 'mic'>('system');
  const [onlyCurrentTab, setOnlyCurrentTab] = useState<boolean>(false);

  const includeMic = audioSource === 'mic';
  const disableEchoCancellation = audioSource === 'system';
  
  // Progress states
  const { state: exportState, setPhase: setExportPhase, setProgress: setProgressPercent, setProgressText, clearLogs, appendLog, setResultUrl, reset: resetExportState } = useAudioExportController();
  const { status, progressText, progressPercent, logs, resultUrl: audioBlobUrl } = exportState;
  
  // Live capture/volume states
  const [soundLevel, setSoundLevel] = useState<number>(0);
  const [micActiveWarning, setMicActiveWarning] = useState<boolean>(false);
  const [silentTimerCount, setSilentTimerCount] = useState<number>(0);
  
  // Refs
  const captureOwnerRef = useRef<BrowserCaptureResourceOwner | null>(null);
  if (!captureOwnerRef.current) captureOwnerRef.current = new BrowserCaptureResourceOwner();
  const capture = captureOwnerRef.current;
  
  const availableSets = useMemo(() => Array.from(new Set(speechList.flatMap(item => item.setId ? [item.setId] : []))), [speechList]);
  const itemsToExport = useMemo(() => selectedRange === 'all' ? speechList : speechList.filter(item => item.setId === selectedRange), [speechList, selectedRange]);

  const replaceAudioBlobUrl = useOwnedObjectUrl(setResultUrl);
  const resetExportSession = () => {
    replaceAudioBlobUrl(null);
    resetExportState();
  };

  // Clean-up on close/unmount
  useEffect(() => {
    return () => {
      cancelAllProcesses();
    };
  }, []);

  const addLog = (message: string) => {
    appendLog(`[${new Date().toLocaleTimeString()}] ${message}`);
  };

  const cancelAllProcesses = () => {
    capture.cancel();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
  };

  const extractPcmFromWavDataUrl = (dataUrl: string): Int16Array => {
    const base64 = dataUrl.split(',')[1];
    const binary = window.atob(base64);
    const bytes = Uint8Array.from(binary, character => character.charCodeAt(0));
    const pcmBytes = bytes.slice(44);
    return new Int16Array(pcmBytes.buffer, pcmBytes.byteOffset, pcmBytes.length / 2);
  };

  /**
   * FULL-STACK EXPORT GENERATION: PREMIUM AI TTS (Sequence Calls)
   * This retrieves clean audio blocks digitally with 0 background noise
   */
  const handleExportPremiumAI = async () => {
    capture.stoppedManually = false;
    setExportPhase('processing');
    clearLogs();
    replaceAudioBlobUrl(null);
    setProgressPercent(0);
    
    addLog(`BĂ„â€Ă‚Â¡Ä‚â€Ă‚ÂºÄ‚â€Ă‚Â¯t Ă„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‹Å“Ă„â€Ă‚Â¡Ä‚â€Ă‚ÂºÄ‚â€Ă‚Â§u xĂ„â€Ă‚Â¡Ä‚â€Ă‚Â»Ä‚â€Ă‚Â­ lÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â½ sĂ„â€Ă‚Â¡Ä‚â€Ă‚Â»Ä‚Â¢Ă¢â€Â¬Ă‹Å“ hÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â³a Ä‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢m thanh Premium vĂ„â€Ă‚Â¡Ä‚â€Ă‚Â»Ä‚Â¢Ă¢â€Â¬Ă‚Âºi ${itemsToExport.length} cÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢u.`);
    
    if (!userGeminiApiKey || !userGeminiApiKey.trim()) {
      setExportPhase('error');
      addLog("LĂ„â€Ă‚Â¡Ä‚â€Ă‚Â»Ä‚Â¢Ă¢â€Â¬Ă¢â‚¬Å“I: ThiĂ„â€Ă‚Â¡Ä‚â€Ă‚ÂºÄ‚â€Ă‚Â¿u Gemini API Key. HÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â£y kÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â­ch hoĂ„â€Ă‚Â¡Ä‚â€Ă‚ÂºÄ‚â€Ă‚Â¡t Ă„â€Ă‚Â¡Ä‚â€Ă‚Â»Ä‚â€¦Ă‚Â¸ bĂ„â€Ă‚Â¡Ä‚â€Ă‚ÂºÄ‚â€Ă‚Â£ng cĂ„â€Ă‚Â¡Ä‚â€Ă‚ÂºÄ‚â€Ă‚Â¥u hÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¬nh bÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Âªn trÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¡i trĂ„â€Ă¢â‚¬Â Ä‚â€Ă‚Â°Ă„â€Ă‚Â¡Ä‚â€Ă‚Â»Ä‚Â¢Ă¢â€Â¬Ă‚Âºc.");
      return;
    }
    
    try {
      const url = await executePremiumAudioExport({
        items: itemsToExport,
        defaultPauseSeconds: timeBetweenLines,
        apiKey: userGeminiApiKey,
        isCancelled: () => capture.stoppedManually,
        onProgress: (completed, total, item) => {
          setProgressPercent(Math.round((completed / total) * 80));
          setProgressText(`?? t?i gi?ng ??c c?u ${completed}/${total}: "${item.text.substring(0, 40)}"`);
        },
        resolvePcm: async (item) => {
          const itemLang = item.selectedLang === 'auto' ? item.detectedLang : item.selectedLang;
          const chosenVoice = getPremiumVoiceForLang(itemLang, {
            selectedPremiumVoiceEn,
            selectedPremiumVoiceVi,
            selectedPremiumVoiceZhCn,
            selectedPremiumVoiceZhTw,
            selectedPremiumVoiceJa,
            selectedPremiumVoiceKo
          });
          addLog(`G?i API [${itemLang}]: "${item.text.substring(0, 30)}..."`);
          const audioUrl = await resolvePremiumAudio({ userId, lessonId, text: item.text, voice: chosenVoice, lang: itemLang, apiKey: userGeminiApiKey, mode: 'prefer-saved' });
          return extractPcmFromWavDataUrl(audioUrl);
        },
      });
      setProgressPercent(90);
      setProgressText("?ang ??ng g?i WAV...");
      replaceAudioBlobUrl(url);
      setProgressPercent(100);
      setExportPhase('success');
      addLog("Xu?t file ?m thanh th?nh c?ng.");
    } catch (err: unknown) {
      console.error("LĂ„â€Ă‚Â¡Ä‚â€Ă‚Â»Ä‚Â¢Ă¢â€Â¬Ă¢â‚¬Âi xuĂ„â€Ă‚Â¡Ä‚â€Ă‚ÂºÄ‚â€Ă‚Â¥t Premium AI:", err);
      setExportPhase('error');
      addLog(`LĂ„â€Ă‚Â¡Ä‚â€Ă‚Â»Ä‚Â¢Ă¢â€Â¬Ă¢â‚¬Âi: ${errorMessage(err) || "KhÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â´ng thĂ„â€Ă‚Â¡Ä‚â€Ă‚Â»Ä‚â€ Ă¢â‚¬â„¢ tĂ„â€Ă‚Â¡Ä‚â€Ă‚ÂºÄ‚â€Ă‚Â£i giĂ„â€Ă‚Â¡Ä‚â€Ă‚Â»Ä‚â€Ă‚Âng Ă„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‹Å“Ă„â€Ă‚Â¡Ä‚â€Ă‚Â»Ä‚â€Ă‚Âc AI."}`);
    }
  };

  /**
   * WEB-ONLY EXPORT FLOW: BROWSER SPEECH SYNTHESIS RECORDING
   * Records native window speechSynthesis played on the local tab
   */
  const handleExportBrowserTTS = async () => {
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
    
    addLog("ChuĂ„â€Ă‚Â¡Ä‚â€Ă‚ÂºÄ‚â€Ă‚Â©n bĂ„â€Ă‚Â¡Ä‚â€Ă‚Â»Ä‚Â¢Ă¢â€Â¬Ă‚Â¹ cĂ„â€Ă¢â‚¬Â Ä‚â€Ă‚Â¡ chĂ„â€Ă‚Â¡Ä‚â€Ă‚ÂºÄ‚â€Ă‚Â¿ ghi Ä‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢m SpeechSynthesis cĂ„â€Ă‚Â¡Ä‚â€Ă‚Â»Ä‚â€Ă‚Â§a trÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¬nh duyĂ„â€Ă‚Â¡Ä‚â€Ă‚Â»Ä‚Â¢Ă¢â€Â¬Ă‚Â¡t...");
    if (audioSource === 'system') {
      addLog("HĂ„â€Ă¢â‚¬Â Ä‚â€Ă‚Â¯Ă„â€Ă‚Â¡Ä‚â€Ă‚Â»Ä‚â€Ă‚ÂNG DĂ„â€Ă‚Â¡Ä‚â€Ă‚ÂºÄ‚â€Ă‚ÂªN BĂ„â€Ă‚Â¡Ä‚â€Ă‚ÂºÄ‚â€Ă‚Â®T BUĂ„â€Ă‚Â¡Ä‚â€Ă‚Â»Ä‚â€¹Ă…â€œC: BĂ„â€Ă‚Â¡Ä‚â€Ă‚ÂºÄ‚â€Ă‚Â¡n hÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â£y chĂ„â€Ă‚Â¡Ä‚â€Ă‚Â»Ä‚â€Ă‚Ân tab 'ToÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â n bĂ„â€Ă‚Â¡Ä‚â€Ă‚Â»Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¢ mÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â n hÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¬nh' (Entire Screen), tÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â­ch vÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â o Ä‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â´ 'Chia sĂ„â€Ă‚Â¡Ä‚â€Ă‚ÂºÄ‚â€Ă‚Â» Ä‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢m thanh hĂ„â€Ă‚Â¡Ä‚â€Ă‚Â»Ä‚Â¢Ă¢â€Â¬Ă‚Â¡ thĂ„â€Ă‚Â¡Ä‚â€Ă‚Â»Ä‚Â¢Ă¢â€Â¬Ă‹Å“ng' (Share system audio) Ă„â€Ă‚Â¡Ä‚â€Ă‚Â»Ä‚â€¦Ă‚Â¸ gÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â³c trÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¡i dĂ„â€Ă¢â‚¬Â Ä‚â€Ă‚Â°Ă„â€Ă‚Â¡Ä‚â€Ă‚Â»Ä‚Â¢Ă¢â€Â¬Ă‚Âºi, rĂ„â€Ă‚Â¡Ä‚â€Ă‚Â»Ä‚Â¢Ă¢â€Â¬Ă…â€œi chĂ„â€Ă‚Â¡Ä‚â€Ă‚Â»Ä‚â€Ă‚Ân MÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â n hÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¬nh cĂ„â€Ă‚Â¡Ä‚â€Ă‚Â»Ä‚â€Ă‚Â§a bĂ„â€Ă‚Â¡Ä‚â€Ă‚ÂºÄ‚â€Ă‚Â¡n.");
    } else {
      addLog("HĂ„â€Ă¢â‚¬Â Ä‚â€Ă‚Â¯Ă„â€Ă‚Â¡Ä‚â€Ă‚Â»Ä‚â€Ă‚ÂNG DĂ„â€Ă‚Â¡Ä‚â€Ă‚ÂºÄ‚â€Ă‚ÂªN: MÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¡y ghi Ä‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢m sĂ„â€Ă‚Â¡Ä‚â€Ă‚ÂºÄ‚â€Ă‚Â½ thu trĂ„â€Ă‚Â¡Ä‚â€Ă‚Â»Ä‚â€Ă‚Â±c tiĂ„â€Ă‚Â¡Ä‚â€Ă‚ÂºÄ‚â€Ă‚Â¿p tĂ„â€Ă‚Â¡Ä‚â€Ă‚Â»Ä‚â€Ă‚Â« Microphone qua loa ngoÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â i. HÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â£y bĂ„â€Ă‚Â¡Ä‚â€Ă‚ÂºÄ‚â€Ă‚Â­t mĂ„â€Ă‚Â¡Ä‚â€Ă‚Â»Ä‚â€Ă‚Â©c loa vĂ„â€Ă‚Â¡Ä‚â€Ă‚Â»Ä‚â€Ă‚Â«a Ă„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‹Å“Ă„â€Ă‚Â¡Ä‚â€Ă‚Â»Ä‚â€Ă‚Â§ nghe.");
    }

    try {
      const displayConstraints = buildDisplayCaptureConstraints({ width: 320, height: 180, frameRate: 10, onlyCurrentTab, captureSystemAudio: true });
      const captureStreams = await acquireCaptureStreams({
        source: audioSource,
        displayConstraints,
        captureDisplay,
        getUserMedia: constraints => navigator.mediaDevices.getUserMedia(constraints),
      });
      const stream = captureStreams.display;
      const micStream = captureStreams.microphone;
      capture.displayStream = stream;
      capture.microphoneStream = micStream;
      addLog(audioSource === 'mic' ? "?? kh?i t?o Microphone." : "?? nh?n lu?ng chia s? m?n h?nh v? ?m thanh h? th?ng.");
      
      // 2. Validate audio track selection
      const displayAudioTracks = stream ? stream.getAudioTracks() : [];
      const micAudioTracks = micStream ? micStream.getAudioTracks() : [];
      const hasDisplayAudio = displayAudioTracks.length > 0;
      const hasMicAudio = micAudioTracks.length > 0;

      if (!hasDisplayAudio && !hasMicAudio) {
        stopMediaStream(stream);
        stopMediaStream(micStream);
        throw new Error("KhÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â´ng bĂ„â€Ă‚Â¡Ä‚â€Ă‚ÂºÄ‚â€Ă‚Â¯t Ă„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‹Å“Ă„â€Ă¢â‚¬Â Ä‚â€Ă‚Â°Ă„â€Ă‚Â¡Ä‚â€Ă‚Â»Ä‚â€Ă‚Â£c nguĂ„â€Ă‚Â¡Ä‚â€Ă‚Â»Ä‚Â¢Ă¢â€Â¬Ă…â€œn Ä‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢m thanh nÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â o hĂ„â€Ă‚Â¡Ä‚â€Ă‚Â»Ä‚â€Ă‚Â£p lĂ„â€Ă‚Â¡Ä‚â€Ă‚Â»Ä‚Â¢Ă¢â€Â¬Ă‚Â¡. Vui lÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â²ng thĂ„â€Ă‚Â¡Ä‚â€Ă‚Â»Ä‚â€Ă‚Â­ lĂ„â€Ă‚Â¡Ä‚â€Ă‚ÂºÄ‚â€Ă‚Â¡i.");
      }
      
      addLog("KhĂ„â€Ă‚Â¡Ä‚â€Ă‚Â»Ä‚â€¦Ă‚Â¸i tĂ„â€Ă‚Â¡Ä‚â€Ă‚ÂºÄ‚â€Ă‚Â¡o bĂ„â€Ă‚Â¡Ä‚â€Ă‚Â»Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¢ thu Ä‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢m...");
      
      const audioCtx = createAudioContext();
      capture.audioContext = audioCtx;

      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }
      
      // Stage 2: mandatory system-audio preflight
      if (hasDisplayAudio && stream) {
        setProgressText("Preflight: ?ang ki?m tra t?n hi?u ?m thanh...");
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        const result = await runAudioPreflight({
          analyser,
          cancel: () => window.speechSynthesis.cancel(),
          speak: () => { const utterance = new SpeechSynthesisUtterance("Starting"); utterance.volume = 1; utterance.rate = 1; utterance.lang = "en-US"; window.speechSynthesis.speak(utterance); },
        });
        source.disconnect();
        if (!result.detected) { stopMediaStream(stream); stopMediaStream(micStream); throw new Error(`PREFLIGHT_FAIL: Kh?ng nh?n ???c t?n hi?u ?m thanh h? th?ng (peak ${result.peak.toFixed(1)}).`); }
        addLog(`Preflight OK, peak ${result.peak.toFixed(1)}.`);
      }
      
      // Setup permanent live routing
      const analyserNode = audioCtx.createAnalyser();
      analyserNode.fftSize = 256;
      const captureMix = createCaptureAudioMix(audioCtx, stream, micStream, analyserNode);
      const analyserDataArray = new Uint8Array(analyserNode.frequencyBinCount);
      
      // Setup active silence checker loop
      let lastCheckTime = Date.now();
      const silenceMonitor = createAudioSilenceMonitor();

      const updateVolumePeak = () => {
        if (capture.stoppedManually || !analyserNode || !analyserDataArray) return;
        
        analyserNode.getByteFrequencyData(analyserDataArray);
        let sum = 0;
        for (let i = 0; i < analyserDataArray.length; i++) {
          sum += analyserDataArray[i];
        }
        const avg = sum / analyserDataArray.length;
        setSoundLevel(avg);
        
        const now = Date.now();
        const delta = (now - lastCheckTime) / 1000;
        lastCheckTime = now;
        
        const decision = silenceMonitor.sample({ level: avg, elapsedSeconds: delta, expectingSpeech: capture.expectingSpeech, recording: capture.phase === 'recording' });
        setMicActiveWarning(decision.warn);
        if (decision.abort) {
          addLog("C?NH B?O: T?n hi?u ?m thanh bi?n m?t khi ?ang ??c b?i.");
          capture.abortReason = 'silent-during-speech';
          capture.phase = 'error';
          if (capture.animationFrame) { cancelAnimationFrame(capture.animationFrame); capture.animationFrame = null; }
          try { capture.recorderSession?.stop(); } catch {}
          window.speechSynthesis.cancel();
          return;
        }
        
        capture.animationFrame = requestAnimationFrame(updateVolumePeak);
      };

      if (hasDisplayAudio) {
        lastCheckTime = Date.now();
        updateVolumePeak();
      } else {
        setSoundLevel(5); // fallback level
      }

      // 3. Initialize MediaRecorder to capture webm/opus buffer sequentially
      const recorderStream = captureMix.recorderStream;
      
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
      const recorderSession = createMediaRecorderSession(recorderStream, blob => { void handleRecordedBlob(blob); });
      capture.recorderSession = recorderSession;
      const recorder = recorderSession.recorder;
      addLog(`K?ch ho?t m?y ghi ?m (codec: ${recorder.mimeType || "m?c ??nh"})`);
      
      // Start recording
      recorderSession.start();
      capture.phase = 'recording';
      
      // 4. Sequential browser SpeechSynthesis loop
      await runBrowserSpeechSequence({
        items: itemsToExport,
        speed,
        volume,
        voices,
        preferredVoiceNames: { en: selectedEnVoiceName, vi: selectedViVoiceName, 'zh-cn': selectedZhCnVoiceName, 'zh-tw': selectedZhTwVoiceName, ja: selectedJaVoiceName, ko: selectedKoVoiceName },
        speechSynthesis: window.speechSynthesis,
        createUtterance: text => new SpeechSynthesisUtterance(text),
        wait: (callback, delayMs) => window.setTimeout(callback, delayMs),
        isCancelled: () => capture.stoppedManually,
        defaultPauseSeconds: timeBetweenLines,
        onProgress: (index, item) => { setProgressPercent(Math.round((index / itemsToExport.length) * 100)); setProgressText(`?ang ph?t d?ng ${index + 1}/${itemsToExport.length}: "${item.text.substring(0, 40)}"`); },
        onRepeat: (index, repeat, total) => addLog(`??c l?i c?u ${index + 1} (l?n ${repeat}/${total})`),
        onError: (index, error) => addLog(`H? th?ng TTS c?nh b?o tr?n d?ng ${index + 1}: ${error}`),
        onExpectationChange: expecting => { capture.expectingSpeech = expecting; },
        onUtterance: utterance => { capture.recordingUtterance = utterance; },
      });
      if (!capture.stoppedManually) {
        addLog("?? ch?y h?t danh s?ch c?u. ?ang d?ng ghi ?m...");
        capture.phase = 'encoding';
        capture.expectingSpeech = false;
        if (capture.animationFrame) { cancelAnimationFrame(capture.animationFrame); capture.animationFrame = null; }
        recorderSession.stop();
        stopMediaStream(capture.displayStream); capture.displayStream = null;
        stopMediaStream(capture.microphoneStream); capture.microphoneStream = null;
      }
      
    } catch (err: unknown) {
      console.error(err);
      setExportPhase('error');
      addLog(`LĂ„â€Ă‚Â¡Ä‚â€Ă‚Â»Ä‚Â¢Ă¢â€Â¬Ă¢â‚¬Âi chuĂ„â€Ă‚Â¡Ä‚â€Ă‚ÂºÄ‚â€Ă‚Â©n bĂ„â€Ă‚Â¡Ä‚â€Ă‚Â»Ä‚Â¢Ă¢â€Â¬Ă‚Â¹ ghi Ä‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢m: ${errorMessage(err)}`);
    }
  };

  const handleStartExport = () => {
    if (exportEngine === 'premium') {
      handleExportPremiumAI();
    } else {
      handleExportBrowserTTS();
    }
  };

  const handleDownload = () => {
    if (audioBlobUrl) downloadObjectUrl(audioBlobUrl, buildAudioExportFilename({ range: selectedRange, engine: exportEngine, date: new Date() }));
  };

  if (!isOpen) return null;

  return (
    <div id="audio-export-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs select-none animate-fade-in">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden relative flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">BĂ„â€Ă‚Â¡Ä‚â€Ă‚Â»Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¢ XuĂ„â€Ă‚Â¡Ä‚â€Ă‚ÂºÄ‚â€Ă‚Â¥t Ä‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚Âm Thanh Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂĂ„â€Ă‚Â¡Ä‚â€Ă‚Â»Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¢c LĂ„â€Ă‚Â¡Ä‚â€Ă‚ÂºÄ‚â€Ă‚Â­p</h3>
              <p className="text-[11px] text-slate-500 font-medium">XuĂ„â€Ă‚Â¡Ä‚â€Ă‚ÂºÄ‚â€Ă‚Â¥t danh sÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¡ch bÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â i tĂ„â€Ă‚Â¡Ä‚â€Ă‚ÂºÄ‚â€Ă‚Â­p thÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â nh cÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¡c file Ä‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢m thanh MP3/WAV ngoĂ„â€Ă‚Â¡Ä‚â€Ă‚ÂºÄ‚â€Ă‚Â¡i tuyĂ„â€Ă‚Â¡Ä‚â€Ă‚ÂºÄ‚â€Ă‚Â¿n</p>
            </div>
          </div>
          <button 
            onClick={() => {
              cancelAllProcesses();
              onClose();
            }}
            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {status === 'idle' && (
            <AudioExportSettings selectedRange={selectedRange} onSelectedRangeChange={setSelectedRange} availableSets={availableSets} speechList={speechList} exportEngine={exportEngine} onExportEngineChange={setExportEngine} audioSource={audioSource} onAudioSourceChange={setAudioSource} onlyCurrentTab={onlyCurrentTab} onOnlyCurrentTabChange={setOnlyCurrentTab} itemCount={itemsToExport.length} onStart={handleStartExport} />
          )}

          {(status === 'processing' || status === 'recording') && (
            <AudioExportProgress status={status} progressText={progressText} progressPercent={progressPercent} soundLevel={soundLevel} micActiveWarning={micActiveWarning} logs={logs} onCancel={() => { cancelAllProcesses(); resetExportSession(); }} />
          )}

          {(status === 'success' || status === 'error') && (
            <AudioExportResult status={status} audioBlobUrl={audioBlobUrl} logs={logs} onReset={resetExportSession} onDownload={handleDownload} />
          )}
        </div>
      </div>
    </div>
  );
}
