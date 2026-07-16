import React, { useState, useEffect, useMemo, useRef } from 'react';
import { X, Play, Square, Volume2, Radio } from 'lucide-react';
import { SpeechItem, LanguageCode } from '../types';
import { encodeMonoMp3 } from '../audio/mp3Encoder';
import { getPremiumVoiceForLang } from '../features/premium-tts/premiumVoices';
import { premiumTtsCacheStore } from '../features/premium-tts/premiumTtsCacheStore';
import { resolvePremiumAudio } from '../features/premium-tts/persistent-audio/premiumAudioResolver';
import { buildDisplayCaptureConstraints, captureDisplay, createAudioContext, errorMessage, stopMediaStream } from '../features/media-capture/mediaCaptureAdapter';
import { createWavBlob } from '../infrastructure/audio/audioExportAssembler';
import { PremiumAudioExportCancelledError, runPremiumAudioExport } from '../infrastructure/audio/premiumAudioExportStrategy';
import { runBrowserSpeechSequence } from '../infrastructure/audio/browserSpeechSequence';
import { AudioExportResult } from '../features/audio-export/AudioExportResult';
import { AudioExportProgress } from '../features/audio-export/AudioExportProgress';
import { AudioExportSettings } from '../features/audio-export/AudioExportSettings';
import { useAudioExportController } from '../application/audio-export/useAudioExportController';

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
  const audioBlobUrlRef = useRef<string | null>(null);
  
  // Live capture/volume states
  const [soundLevel, setSoundLevel] = useState<number>(0);
  const [micActiveWarning, setMicActiveWarning] = useState<boolean>(false);
  const [silentTimerCount, setSilentTimerCount] = useState<number>(0);
  
  // Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const isStoppedManuallyRef = useRef<boolean>(false);
  const animationFrameRef = useRef<number | null>(null);
  const capturePhaseRef = useRef<'idle' | 'preflight' | 'recording' | 'encoding' | 'success' | 'error'>('idle');
  const abortReasonRef = useRef<string | null>(null);
  const isExpectingSpeechRef = useRef<boolean>(false);
  
  const availableSets = useMemo(() => Array.from(new Set(speechList.flatMap(item => item.setId ? [item.setId] : []))), [speechList]);
  const itemsToExport = useMemo(() => selectedRange === 'all' ? speechList : speechList.filter(item => item.setId === selectedRange), [speechList, selectedRange]);

  const replaceAudioBlobUrl = (nextUrl: string | null) => {
    const previousUrl = audioBlobUrlRef.current;
    if (previousUrl && previousUrl !== nextUrl) URL.revokeObjectURL(previousUrl);
    audioBlobUrlRef.current = nextUrl;
    setResultUrl(nextUrl);
  };
  const resetExportSession = () => {
    replaceAudioBlobUrl(null);
    resetExportState();
  };

  // Clean-up on close/unmount
  useEffect(() => {
    return () => {
      cancelAllProcesses();
      replaceAudioBlobUrl(null);
    };
  }, []);

  const addLog = (message: string) => {
    appendLog(`[${new Date().toLocaleTimeString()}] ${message}`);
  };

  const cancelAllProcesses = () => {
    isStoppedManuallyRef.current = true;
    capturePhaseRef.current = 'error';
    isExpectingSpeechRef.current = false;
    
    // Stop recording refs
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {}
    }
    
    // Stop streams
    stopMediaStream(mediaStreamRef.current);
    mediaStreamRef.current = null;

    stopMediaStream(micStreamRef.current);
    micStreamRef.current = null;
    
    // Cancel system TTS playbacks
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    
    // Close AudioContext
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    
    // Clear anim
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
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
    isStoppedManuallyRef.current = false;
    setExportPhase('processing');
    clearLogs();
    replaceAudioBlobUrl(null);
    setProgressPercent(0);
    
    addLog(`BÄ‚Â¡Ă‚ÂºĂ‚Â¯t Ä‚â€Ă¢â‚¬ËœÄ‚Â¡Ă‚ÂºĂ‚Â§u xÄ‚Â¡Ă‚Â»Ă‚Â­ lĂ„â€Ă‚Â½ sÄ‚Â¡Ă‚Â»Ă¢â‚¬Ëœ hĂ„â€Ă‚Â³a Ă„â€Ă‚Â¢m thanh Premium vÄ‚Â¡Ă‚Â»Ă¢â‚¬Âºi ${itemsToExport.length} cĂ„â€Ă‚Â¢u.`);
    
    if (!userGeminiApiKey || !userGeminiApiKey.trim()) {
      setExportPhase('error');
      addLog("LÄ‚Â¡Ă‚Â»Ă¢â‚¬â€œI: ThiÄ‚Â¡Ă‚ÂºĂ‚Â¿u Gemini API Key. HĂ„â€Ă‚Â£y kĂ„â€Ă‚Â­ch hoÄ‚Â¡Ă‚ÂºĂ‚Â¡t Ä‚Â¡Ă‚Â»Ă…Â¸ bÄ‚Â¡Ă‚ÂºĂ‚Â£ng cÄ‚Â¡Ă‚ÂºĂ‚Â¥u hĂ„â€Ă‚Â¬nh bĂ„â€Ă‚Âªn trĂ„â€Ă‚Â¡i trÄ‚â€ Ă‚Â°Ä‚Â¡Ă‚Â»Ă¢â‚¬Âºc.");
      return;
    }
    
    const sampleRate = 24000;

    try {
      const compiledPcm = await runPremiumAudioExport({
        items: itemsToExport,
        defaultPauseSeconds: timeBetweenLines,
        sampleRate,
        isCancelled: () => isStoppedManuallyRef.current,
        onItemProgress: (completed, total, item) => {
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
      const finalWavBlob = createWavBlob(compiledPcm, sampleRate);
      const url = URL.createObjectURL(finalWavBlob);
      replaceAudioBlobUrl(url);
      setProgressPercent(100);
      setExportPhase('success');
      addLog("Xu?t file ?m thanh th?nh c?ng.");
    } catch (err: unknown) {
      console.error("LÄ‚Â¡Ă‚Â»Ă¢â‚¬â€i xuÄ‚Â¡Ă‚ÂºĂ‚Â¥t Premium AI:", err);
      setExportPhase('error');
      addLog(`LÄ‚Â¡Ă‚Â»Ă¢â‚¬â€i: ${errorMessage(err) || "KhĂ„â€Ă‚Â´ng thÄ‚Â¡Ă‚Â»Ă†â€™ tÄ‚Â¡Ă‚ÂºĂ‚Â£i giÄ‚Â¡Ă‚Â»Ă‚Âng Ä‚â€Ă¢â‚¬ËœÄ‚Â¡Ă‚Â»Ă‚Âc AI."}`);
    }
  };

  /**
   * WEB-ONLY EXPORT FLOW: BROWSER SPEECH SYNTHESIS RECORDING
   * Records native window speechSynthesis played on the local tab
   */
  const handleExportBrowserTTS = async () => {
    isStoppedManuallyRef.current = false;
    capturePhaseRef.current = 'preflight';
    abortReasonRef.current = null;
    isExpectingSpeechRef.current = false;
    setExportPhase('recording');
    clearLogs();
    replaceAudioBlobUrl(null);
    setProgressPercent(0);
    setSoundLevel(0);
    setSilentTimerCount(0);
    setMicActiveWarning(false);
    chunksRef.current = [];
    
    addLog("ChuÄ‚Â¡Ă‚ÂºĂ‚Â©n bÄ‚Â¡Ă‚Â»Ă¢â‚¬Â¹ cÄ‚â€ Ă‚Â¡ chÄ‚Â¡Ă‚ÂºĂ‚Â¿ ghi Ă„â€Ă‚Â¢m SpeechSynthesis cÄ‚Â¡Ă‚Â»Ă‚Â§a trĂ„â€Ă‚Â¬nh duyÄ‚Â¡Ă‚Â»Ă¢â‚¬Â¡t...");
    if (audioSource === 'system') {
      addLog("HÄ‚â€ Ă‚Â¯Ä‚Â¡Ă‚Â»Ă‚ÂNG DÄ‚Â¡Ă‚ÂºĂ‚ÂªN BÄ‚Â¡Ă‚ÂºĂ‚Â®T BUÄ‚Â¡Ă‚Â»Ă‹Å“C: BÄ‚Â¡Ă‚ÂºĂ‚Â¡n hĂ„â€Ă‚Â£y chÄ‚Â¡Ă‚Â»Ă‚Ân tab 'ToĂ„â€Ă‚Â n bÄ‚Â¡Ă‚Â»Ă¢â€Â¢ mĂ„â€Ă‚Â n hĂ„â€Ă‚Â¬nh' (Entire Screen), tĂ„â€Ă‚Â­ch vĂ„â€Ă‚Â o Ă„â€Ă‚Â´ 'Chia sÄ‚Â¡Ă‚ÂºĂ‚Â» Ă„â€Ă‚Â¢m thanh hÄ‚Â¡Ă‚Â»Ă¢â‚¬Â¡ thÄ‚Â¡Ă‚Â»Ă¢â‚¬Ëœng' (Share system audio) Ä‚Â¡Ă‚Â»Ă…Â¸ gĂ„â€Ă‚Â³c trĂ„â€Ă‚Â¡i dÄ‚â€ Ă‚Â°Ä‚Â¡Ă‚Â»Ă¢â‚¬Âºi, rÄ‚Â¡Ă‚Â»Ă¢â‚¬Å“i chÄ‚Â¡Ă‚Â»Ă‚Ân MĂ„â€Ă‚Â n hĂ„â€Ă‚Â¬nh cÄ‚Â¡Ă‚Â»Ă‚Â§a bÄ‚Â¡Ă‚ÂºĂ‚Â¡n.");
    } else {
      addLog("HÄ‚â€ Ă‚Â¯Ä‚Â¡Ă‚Â»Ă‚ÂNG DÄ‚Â¡Ă‚ÂºĂ‚ÂªN: MĂ„â€Ă‚Â¡y ghi Ă„â€Ă‚Â¢m sÄ‚Â¡Ă‚ÂºĂ‚Â½ thu trÄ‚Â¡Ă‚Â»Ă‚Â±c tiÄ‚Â¡Ă‚ÂºĂ‚Â¿p tÄ‚Â¡Ă‚Â»Ă‚Â« Microphone qua loa ngoĂ„â€Ă‚Â i. HĂ„â€Ă‚Â£y bÄ‚Â¡Ă‚ÂºĂ‚Â­t mÄ‚Â¡Ă‚Â»Ă‚Â©c loa vÄ‚Â¡Ă‚Â»Ă‚Â«a Ä‚â€Ă¢â‚¬ËœÄ‚Â¡Ă‚Â»Ă‚Â§ nghe.");
    }

    try {
      let micStream: MediaStream | null = null;
      let stream: MediaStream | null = null;

      if (audioSource === 'mic') {
        try {
          try {
            micStream = await navigator.mediaDevices.getUserMedia({
              audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
              }
            });
          } catch (firstTryErr) {
            console.warn("Direct customizable mic stream constraints failed, falling back to basic audio stream:", firstTryErr);
            micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          }
          micStreamRef.current = micStream;
          addLog("Ä‚â€Ă‚ÂĂ„â€Ă‚Â£ khÄ‚Â¡Ă‚Â»Ă…Â¸i tÄ‚Â¡Ă‚ÂºĂ‚Â¡o Microphone thĂ„â€Ă‚Â nh cĂ„â€Ă‚Â´ng!");
        } catch (micErr: unknown) {
          console.error("Microphone access is denied:", micErr);
          throw new Error("KhĂ„â€Ă‚Â´ng thÄ‚Â¡Ă‚Â»Ă†â€™ truy cÄ‚Â¡Ă‚ÂºĂ‚Â­p Microphone. Vui lĂ„â€Ă‚Â²ng cÄ‚Â¡Ă‚ÂºĂ‚Â¥p quyÄ‚Â¡Ă‚Â»Ă‚Ân Microphone Ä‚â€Ă¢â‚¬ËœÄ‚Â¡Ă‚Â»Ă†â€™ sÄ‚Â¡Ă‚Â»Ă‚Â­ dÄ‚Â¡Ă‚Â»Ă‚Â¥ng chÄ‚Â¡Ă‚ÂºĂ‚Â¿ Ä‚â€Ă¢â‚¬ËœÄ‚Â¡Ă‚Â»Ă¢â€Â¢ dÄ‚Â¡Ă‚Â»Ă‚Â± phĂ„â€Ă‚Â²ng!");
        }
      } else {
        // 1. Capture display stream with optimized entire screen / system audio cues
        const displayConstraints = buildDisplayCaptureConstraints({
          width: 320,
          height: 180,
          frameRate: 10,
          onlyCurrentTab,
          captureSystemAudio: true,
        });

        try {
          stream = await captureDisplay(displayConstraints);
          mediaStreamRef.current = stream;
        } catch (displayErr: unknown) {
          console.error("Display media capturing failed:", displayErr);
          throw new Error("BÄ‚Â¡Ă‚ÂºĂ‚Â¡n Ä‚â€Ă¢â‚¬ËœĂ„â€Ă‚Â£ hÄ‚Â¡Ă‚Â»Ă‚Â§y chia sÄ‚Â¡Ă‚ÂºĂ‚Â» mĂ„â€Ă‚Â n hĂ„â€Ă‚Â¬nh / Ă„â€Ă‚Â¢m thanh hÄ‚Â¡Ă‚Â»Ă¢â‚¬Â¡ thÄ‚Â¡Ă‚Â»Ă¢â‚¬Ëœng. Vui lĂ„â€Ă‚Â²ng bÄ‚Â¡Ă‚ÂºĂ‚Â¥m thÄ‚Â¡Ă‚Â»Ă‚Â­ lÄ‚Â¡Ă‚ÂºĂ‚Â¡i.");
        }
      }
      
      // 2. Validate audio track selection
      const displayAudioTracks = stream ? stream.getAudioTracks() : [];
      const micAudioTracks = micStream ? micStream.getAudioTracks() : [];
      const hasDisplayAudio = displayAudioTracks.length > 0;
      const hasMicAudio = micAudioTracks.length > 0;

      if (!hasDisplayAudio && !hasMicAudio) {
        stopMediaStream(stream);
        stopMediaStream(micStream);
        throw new Error("KhĂ„â€Ă‚Â´ng bÄ‚Â¡Ă‚ÂºĂ‚Â¯t Ä‚â€Ă¢â‚¬ËœÄ‚â€ Ă‚Â°Ä‚Â¡Ă‚Â»Ă‚Â£c nguÄ‚Â¡Ă‚Â»Ă¢â‚¬Å“n Ă„â€Ă‚Â¢m thanh nĂ„â€Ă‚Â o hÄ‚Â¡Ă‚Â»Ă‚Â£p lÄ‚Â¡Ă‚Â»Ă¢â‚¬Â¡. Vui lĂ„â€Ă‚Â²ng thÄ‚Â¡Ă‚Â»Ă‚Â­ lÄ‚Â¡Ă‚ÂºĂ‚Â¡i.");
      }
      
      addLog("KhÄ‚Â¡Ă‚Â»Ă…Â¸i tÄ‚Â¡Ă‚ÂºĂ‚Â¡o bÄ‚Â¡Ă‚Â»Ă¢â€Â¢ thu Ă„â€Ă‚Â¢m...");
      
      const audioCtx = createAudioContext();
      audioContextRef.current = audioCtx;

      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }
      
      const dest = audioCtx.createMediaStreamDestination();

      // ==========================================
      // STAGE 2: MANDATORY PREFLIGHT CHECK (KIÄ‚Â¡Ă‚Â»Ă¢â‚¬ÂM TRA TĂ„â€Ă‚ÂN HIÄ‚Â¡Ă‚Â»Ă¢â‚¬Â U CÄ‚Â¡Ă‚Â»Ă‚Â¨NG)
      // ==========================================
      if (hasDisplayAudio) {
        addLog("Ä‚â€Ă‚Âang chÄ‚Â¡Ă‚ÂºĂ‚Â¡y Preflight check: kiÄ‚Â¡Ă‚Â»Ă†â€™m tra tĂ„â€Ă‚Â­n hiÄ‚Â¡Ă‚Â»Ă¢â‚¬Â¡u SpeechSynthesis...");
        setProgressText("Preflight check: Ä‚â€Ă‚Âang kiÄ‚Â¡Ă‚Â»Ă†â€™m tra tĂ„â€Ă‚Â­n hiÄ‚Â¡Ă‚Â»Ă¢â‚¬Â¡u Ă„â€Ă‚Â¢m thanh...");
        
        // Setup temporary preflight connections
        const preflightSource = audioCtx.createMediaStreamSource(stream);
        const preflightAnalyser = audioCtx.createAnalyser();
        preflightAnalyser.fftSize = 256;
        preflightSource.connect(preflightAnalyser);
        
        const preflightData = new Uint8Array(preflightAnalyser.frequencyBinCount);
        
        // Trigger short test utterance
        const testUtterance = new SpeechSynthesisUtterance("Starting");
        testUtterance.volume = 1.0;
        testUtterance.rate = 1.0;
        testUtterance.lang = "en-US";
        
        // Force cancellation and play
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(testUtterance);
        
        let detectedSignal = false;
        let peakLevel = 0;
        const startTime = Date.now();
        
        const checkPreflight = () => {
          return new Promise<boolean>((resolve) => {
            const checkTimer = setInterval(() => {
              preflightAnalyser.getByteFrequencyData(preflightData);
              let sum = 0;
              for (let i = 0; i < preflightData.length; i++) {
                sum += preflightData[i];
              }
              const avg = sum / preflightData.length;
              if (avg > peakLevel) peakLevel = avg;
              if (avg > 2.0) {
                detectedSignal = true;
              }
              
              if (Date.now() - startTime >= 2500) {
                clearInterval(checkTimer);
                resolve(detectedSignal);
              }
            }, 100);
          });
        };
        
        const preflightResult = await checkPreflight();
        window.speechSynthesis.cancel(); // Stop preflight speech
        
        // Clean up preflight connections
        preflightSource.disconnect();
        
        if (!preflightResult) {
          stream.getTracks().forEach(t => t.stop());
          if (micStream) micStream.getTracks().forEach(t => t.stop());
          throw new Error(`PREFLIGHT_FAIL: Ă„â€Ă¢â‚¬Âm thanh hoĂ„â€Ă‚Â n toĂ„â€Ă‚Â n cĂ„â€Ă‚Â¢m (Ä‚â€Ă‚ÂÄ‚Â¡Ă‚Â»Ă¢â€Â¢ lÄ‚Â¡Ă‚Â»Ă¢â‚¬Âºn cÄ‚Â¡Ă‚Â»Ă‚Â±c Ä‚â€Ă¢â‚¬ËœÄ‚Â¡Ă‚ÂºĂ‚Â¡i: ${peakLevel.toFixed(1)}). BÄ‚Â¡Ă‚ÂºĂ‚Â¡n PHÄ‚Â¡Ă‚ÂºĂ‚Â¢I chÄ‚Â¡Ă‚Â»Ă‚Ân mÄ‚Â¡Ă‚Â»Ă‚Â¥c 'ToĂ„â€Ă‚Â n bÄ‚Â¡Ă‚Â»Ă¢â€Â¢ mĂ„â€Ă‚Â n hĂ„â€Ă‚Â¬nh' vĂ„â€Ă‚Â  bÄ‚Â¡Ă‚ÂºĂ‚Â­t 'Chia sÄ‚Â¡Ă‚ÂºĂ‚Â» Ă„â€Ă‚Â¢m thanh hÄ‚Â¡Ă‚Â»Ă¢â‚¬Â¡ thÄ‚Â¡Ă‚Â»Ă¢â‚¬Ëœng' Ä‚â€Ă¢â‚¬ËœÄ‚Â¡Ă‚Â»Ă†â€™ thu Ä‚â€Ă¢â‚¬ËœÄ‚â€ Ă‚Â°Ä‚Â¡Ă‚Â»Ă‚Â£c giÄ‚Â¡Ă‚Â»Ă‚Âng nĂ„â€Ă‚Â³i.`);
        }
        
        addLog(`Preflight OK! NhÄ‚Â¡Ă‚ÂºĂ‚Â­n Ä‚â€Ă¢â‚¬ËœÄ‚â€ Ă‚Â°Ä‚Â¡Ă‚Â»Ă‚Â£c tĂ„â€Ă‚Â­n hiÄ‚Â¡Ă‚Â»Ă¢â‚¬Â¡u Ă„â€Ă‚Â¢m thanh hÄ‚Â¡Ă‚Â»Ă¢â‚¬Â¡ thÄ‚Â¡Ă‚Â»Ă¢â‚¬Ëœng (CÄ‚â€ Ă‚Â°Ä‚Â¡Ă‚Â»Ă‚Âng Ä‚â€Ă¢â‚¬ËœÄ‚Â¡Ă‚Â»Ă¢â€Â¢ cÄ‚Â¡Ă‚Â»Ă‚Â±c Ä‚â€Ă¢â‚¬ËœÄ‚Â¡Ă‚ÂºĂ‚Â¡i: ${peakLevel.toFixed(1)}).`);
      }
      
      // Setup permanent live routing
      let displaySourceNode: MediaStreamAudioSourceNode | null = null;
      let analyserNode: AnalyserNode | null = null;
      let analyserDataArray: Uint8Array | null = null;

      if (hasDisplayAudio && stream) {
        displaySourceNode = audioCtx.createMediaStreamSource(stream);
        displaySourceNode.connect(dest);
        
        analyserNode = audioCtx.createAnalyser();
        analyserNode.fftSize = 256;
        displaySourceNode.connect(analyserNode);
        analyserDataArray = new Uint8Array(analyserNode.frequencyBinCount);
      }

      if (hasMicAudio && micStream) {
        const micSource = audioCtx.createMediaStreamSource(micStream);
        micSource.connect(dest);

        if (!analyserNode) {
          analyserNode = audioCtx.createAnalyser();
          analyserNode.fftSize = 256;
          micSource.connect(analyserNode);
          analyserDataArray = new Uint8Array(analyserNode.frequencyBinCount);
        }
      }
      
      // Setup active silence checker loop
      let lastCheckTime = Date.now();
      let activeSilenceDuration = 0;
      let warningSilenceCounter = 0;

      const updateVolumePeak = () => {
        if (isStoppedManuallyRef.current || !analyserNode || !analyserDataArray) return;
        
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
        
        // Silent gate: if browser currently speaking, but no audio gets captured for 3 seconds, throw error!
        // Only run this silent gate during active recording phase
        const isCurrentlySpeaking = isExpectingSpeechRef.current;
        if (isCurrentlySpeaking && capturePhaseRef.current === 'recording') {
          if (avg < 1.0) {
            activeSilenceDuration += delta;
            if (activeSilenceDuration >= 3.0) {
              addLog("CÄ‚Â¡Ă‚ÂºĂ‚Â¢NH BĂ„â€Ă‚ÂO: TĂ„â€Ă‚Â­n hiÄ‚Â¡Ă‚Â»Ă¢â‚¬Â¡u Ă„â€Ă‚Â¢m thanh biÄ‚Â¡Ă‚ÂºĂ‚Â¿n mÄ‚Â¡Ă‚ÂºĂ‚Â¥t khi Ä‚â€Ă¢â‚¬Ëœang Ä‚â€Ă¢â‚¬ËœÄ‚Â¡Ă‚Â»Ă‚Âc bĂ„â€Ă‚Â i!");
              abortReasonRef.current = 'silent-during-speech';
              capturePhaseRef.current = 'error';
              
              if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
                animationFrameRef.current = null;
              }
              
              if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
                try {
                  mediaRecorderRef.current.stop();
                } catch (e) {}
              }
              
              if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
                window.speechSynthesis.cancel();
              }
              return;
            }
          } else {
            activeSilenceDuration = 0;
          }
        } else {
          activeSilenceDuration = 0;
        }

        if (avg < 2) {
          warningSilenceCounter++;
          if (warningSilenceCounter > 180) {
            setMicActiveWarning(true);
          }
        } else {
          warningSilenceCounter = 0;
          setMicActiveWarning(false);
        }
        
        animationFrameRef.current = requestAnimationFrame(updateVolumePeak);
      };

      if (hasDisplayAudio) {
        lastCheckTime = Date.now();
        updateVolumePeak();
      } else {
        setSoundLevel(5); // fallback level
      }

      // 3. Initialize MediaRecorder to capture webm/opus buffer sequentially
      const recorderStream = new MediaStream();
      const mixedTracks = dest.stream.getAudioTracks();
      if (mixedTracks.length > 0) {
        recorderStream.addTrack(mixedTracks[0]);
      } else {
        if (hasDisplayAudio) {
          recorderStream.addTrack(displayAudioTracks[0]);
        } else if (hasMicAudio) {
          recorderStream.addTrack(micAudioTracks[0]);
        }
      }
      
      let options = { mimeType: 'audio/webm;codecs=opus' };
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options = { mimeType: 'audio/ogg;codecs=opus' };
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
          options = { mimeType: '' }; // Fallback to browser default
        }
      }
      
      addLog(`KĂ„â€Ă‚Â­ch hoÄ‚Â¡Ă‚ÂºĂ‚Â¡t mĂ„â€Ă‚Â¡y ghi Ă„â€Ă‚Â¢m phÄ‚Â¡Ă‚Â»Ă‚Â¥ trÄ‚Â¡Ă‚Â»Ă‚Â£ (codec: ${options.mimeType || "mÄ‚Â¡Ă‚ÂºĂ‚Â·c Ä‚â€Ă¢â‚¬ËœÄ‚Â¡Ă‚Â»Ă¢â‚¬Â¹nh"})`);
      const recorder = new MediaRecorder(recorderStream, options);
      mediaRecorderRef.current = recorder;
      
      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) {
          chunksRef.current.push(ev.data);
        }
      };
      
      recorder.onstop = async () => {
        if (isStoppedManuallyRef.current) {
          addLog("DÄ‚Â¡Ă‚Â»Ă‚Â«ng ghi Ă„â€Ă‚Â¢m do ngÄ‚â€ Ă‚Â°Ä‚Â¡Ă‚Â»Ă‚Âi dĂ„â€Ă‚Â¹ng hÄ‚Â¡Ă‚Â»Ă‚Â§y bÄ‚Â¡Ă‚Â»Ă‚Â.");
          setExportPhase('idle');
          return;
        }

        if (abortReasonRef.current === 'silent-during-speech') {
          setExportPhase('error');
          setProgressText("KhĂ„â€Ă‚Â´ng thu Ä‚â€Ă¢â‚¬ËœÄ‚â€ Ă‚Â°Ä‚Â¡Ă‚Â»Ă‚Â£c tiÄ‚Â¡Ă‚ÂºĂ‚Â¿ng");
          addLog("LÄ‚Â¡Ă‚Â»Ă¢â‚¬â€œI: TrĂ„â€Ă‚Â¬nh duyÄ‚Â¡Ă‚Â»Ă¢â‚¬Â¡t bÄ‚Â¡Ă‚Â»Ă¢â‚¬Â¹ im lÄ‚Â¡Ă‚ÂºĂ‚Â·ng hÄ‚â€ Ă‚Â¡n 3 giĂ„â€Ă‚Â¢y liĂ„â€Ă‚Âªn tiÄ‚Â¡Ă‚ÂºĂ‚Â¿p trong quĂ„â€Ă‚Â¡ trĂ„â€Ă‚Â¬nh Ä‚â€Ă¢â‚¬ËœÄ‚Â¡Ă‚Â»Ă‚Âc. BÄ‚Â¡Ă‚ÂºĂ‚Â£n ghi bÄ‚Â¡Ă‚Â»Ă¢â‚¬Â¹ hÄ‚Â¡Ă‚Â»Ă‚Â§y.");
          
          if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(t => t.stop());
            mediaStreamRef.current = null;
          }
          if (micStreamRef.current) {
            micStreamRef.current.getTracks().forEach(t => t.stop());
            micStreamRef.current = null;
          }
          return;
        }

        addLog("Ä‚â€Ă‚ÂÄ‚Â¡Ă‚Â»Ă‚Âc hoĂ„â€Ă‚Â n tÄ‚Â¡Ă‚ÂºĂ‚Â¥t. TiÄ‚Â¡Ă‚ÂºĂ‚Â¿n hĂ„â€Ă‚Â nh nĂ„â€Ă‚Â©n tÄ‚Â¡Ă‚Â»Ă¢â‚¬Â¡p tin mpeg-MP3 thÄ‚Â¡Ă‚ÂºĂ‚Â­t...");
        setProgressText("Ä‚â€Ă‚Âang giÄ‚Â¡Ă‚ÂºĂ‚Â£i nĂ„â€Ă‚Â©n & nĂ„â€Ă‚Â©n sang Ä‚â€Ă¢â‚¬ËœÄ‚Â¡Ă‚Â»Ă¢â‚¬Â¹nh dÄ‚Â¡Ă‚ÂºĂ‚Â¡ng MP3 thÄ‚Â¡Ă‚ÂºĂ‚Â­t...");
        setExportPhase('processing');
        
        if (chunksRef.current.length === 0) {
          setExportPhase('error');
          addLog("LÄ‚Â¡Ă‚Â»Ă¢â‚¬â€œI: BÄ‚Â¡Ă‚ÂºĂ‚Â£n ghi rÄ‚Â¡Ă‚Â»Ă¢â‚¬â€ng.");
          return;
        }
        
        try {
          const webmBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
          const arrayBuffer = await webmBlob.arrayBuffer();
          
          // Decode raw audio webm/opus into float32 samples
          const decodeCtx = createAudioContext();
          let decodedBuffer: AudioBuffer;
          try {
            decodedBuffer = await decodeCtx.decodeAudioData(arrayBuffer);
          } catch (decErr) {
            console.error("Failed to decode audio data", decErr);
            addLog("KhĂ„â€Ă‚Â´ng thÄ‚Â¡Ă‚Â»Ă†â€™ giÄ‚Â¡Ă‚ÂºĂ‚Â£i mĂ„â€Ă‚Â£ PCM tÄ‚Â¡Ă‚Â»Ă‚Â« bÄ‚Â¡Ă‚Â»Ă¢â€Â¢ nhÄ‚Â¡Ă‚Â»Ă¢â‚¬Âº tÄ‚Â¡Ă‚ÂºĂ‚Â¡m. LÄ‚â€ Ă‚Â°u trÄ‚Â¡Ă‚Â»Ă‚Â¯ trÄ‚Â¡Ă‚Â»Ă‚Â±c tiÄ‚Â¡Ă‚ÂºĂ‚Â¿p dÄ‚â€ Ă‚Â°Ä‚Â¡Ă‚Â»Ă¢â‚¬Âºi dÄ‚Â¡Ă‚ÂºĂ‚Â¡ng WebM lĂ„â€Ă‚Â m phÄ‚â€ Ă‚Â°Ä‚â€ Ă‚Â¡ng Ă„â€Ă‚Â¡n dÄ‚Â¡Ă‚Â»Ă‚Â± phĂ„â€Ă‚Â²ng.");
            const webmUrl = URL.createObjectURL(webmBlob);
            replaceAudioBlobUrl(webmUrl);
            setExportPhase('success');
            return;
          } finally {
            decodeCtx.close().catch(() => {});
          }
          
          addLog(`BÄ‚Â¡Ă‚ÂºĂ‚Â¯t Ä‚â€Ă¢â‚¬ËœÄ‚Â¡Ă‚ÂºĂ‚Â§u chuyÄ‚Â¡Ă‚Â»Ă†â€™n Ä‚â€Ă¢â‚¬ËœÄ‚Â¡Ă‚Â»Ă¢â‚¬Â¢i mĂ„â€Ă‚Â£ hĂ„â€Ă‚Â³a sang MP3 128kbps (TÄ‚Â¡Ă‚ÂºĂ‚Â§n sÄ‚Â¡Ă‚Â»Ă¢â‚¬Ëœ: ${decodedBuffer.sampleRate}Hz)...`);
          
          const numSamples = decodedBuffer.length;
          const leftChan = decodedBuffer.getChannelData(0);
          const rightChan = decodedBuffer.numberOfChannels > 1 ? decodedBuffer.getChannelData(1) : null;
          
          // Mixed to Mono Float32
          const monoFloat = new Float32Array(numSamples);
          if (rightChan) {
            for (let i = 0; i < numSamples; i++) {
              monoFloat[i] = (leftChan[i] + rightChan[i]) / 2;
            }
          } else {
            monoFloat.set(leftChan);
          }
          
          // Float32 to Int16
          const pcmInt16 = new Int16Array(numSamples);
          for (let i = 0; i < numSamples; i++) {
            let s = monoFloat[i];
            s = Math.max(-1.0, Math.min(1.0, s));
            pcmInt16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
          }

          // Quality gate check: measure peak, RMS, clipping ratio, duration
          let peak = 0;
          let sumSquares = 0;
          let clippingCount = 0;
          const duration = decodedBuffer.duration;
          
          for (let i = 0; i < numSamples; i++) {
            const val = monoFloat[i];
            const absVal = Math.abs(val);
            if (absVal > peak) peak = absVal;
            sumSquares += val * val;
            if (absVal >= 0.99) { // threshold for clipping
              clippingCount++;
            }
          }
          
          const rms = Math.sqrt(sumSquares / numSamples);
          const clippingRatio = clippingCount / numSamples;
          
          addLog(`ChÄ‚Â¡Ă‚ÂºĂ‚Â¥t lÄ‚â€ Ă‚Â°Ä‚Â¡Ă‚Â»Ă‚Â£ng thu Ă„â€Ă‚Â¢m - Peak: ${peak.toFixed(3)}, RMS: ${rms.toFixed(3)}, TÄ‚Â¡Ă‚Â»Ă‚Â· lÄ‚Â¡Ă‚Â»Ă¢â‚¬Â¡ clipping (rĂ„â€Ă‚Â¨): ${(clippingRatio * 100).toFixed(1)}%, ThÄ‚Â¡Ă‚Â»Ă‚Âi lÄ‚â€ Ă‚Â°Ä‚Â¡Ă‚Â»Ă‚Â£ng: ${duration.toFixed(1)} giĂ„â€Ă‚Â¢y.`);
          
          if (clippingRatio > 0.05 || (rms > 0.5 && peak > 0.98)) {
            addLog("Ä‚Â¢Ă‚ÂĂ‚Â Ä‚Â¯Ă‚Â¸Ă‚Â CÄ‚Â¡Ă‚ÂºĂ‚Â¢NH BĂ„â€Ă‚ÂO CHÄ‚Â¡Ă‚ÂºĂ‚Â¤T LÄ‚â€ Ă‚Â¯Ä‚Â¡Ă‚Â»Ă‚Â¢NG: PhĂ„â€Ă‚Â¡t hiÄ‚Â¡Ă‚Â»Ă¢â‚¬Â¡n tĂ„â€Ă‚Â­n hiÄ‚Â¡Ă‚Â»Ă¢â‚¬Â¡u Ă„â€Ă‚Â¢m thanh cĂ„â€Ă‚Â³ hiÄ‚Â¡Ă‚Â»Ă¢â‚¬Â¡n tÄ‚â€ Ă‚Â°Ä‚Â¡Ă‚Â»Ă‚Â£ng rĂ„â€Ă‚Â¨ (clipping) hoÄ‚Â¡Ă‚ÂºĂ‚Â·c rĂ„â€Ă‚Âº (feedback loop) quĂ„â€Ă‚Â¡ lÄ‚Â¡Ă‚Â»Ă¢â‚¬Âºn.");
            addLog("KhuyĂ„â€Ă‚Âªn dĂ„â€Ă‚Â¹ng: BÄ‚Â¡Ă‚ÂºĂ‚Â¡n nĂ„â€Ă‚Âªn chuyÄ‚Â¡Ă‚Â»Ă†â€™n nguÄ‚Â¡Ă‚Â»Ă¢â‚¬Å“n thĂ„â€Ă‚Â nh 'Ghi Ă„â€Ă‚Â¢m tÄ‚Â¡Ă‚Â»Ă‚Â« trĂ„â€Ă‚Â¬nh duyÄ‚Â¡Ă‚Â»Ă¢â‚¬Â¡t (System Audio Only)' vĂ„â€Ă‚Â  tÄ‚Â¡Ă‚ÂºĂ‚Â¯t Micro Ä‚â€Ă¢â‚¬ËœÄ‚Â¡Ă‚Â»Ă†â€™ Ä‚â€Ă¢â‚¬ËœÄ‚Â¡Ă‚ÂºĂ‚Â¡t Ä‚â€Ă¢â‚¬ËœÄ‚Â¡Ă‚Â»Ă¢â€Â¢ tinh khiÄ‚Â¡Ă‚ÂºĂ‚Â¿t tÄ‚Â¡Ă‚Â»Ă¢â‚¬Ëœi Ä‚â€ Ă‚Â°u.");
          }
          
          addLog("NĂ„â€Ă‚Â©n dÄ‚Â¡Ă‚Â»Ă‚Â¯ liÄ‚Â¡Ă‚Â»Ă¢â‚¬Â¡u PCM sang luÄ‚Â¡Ă‚Â»Ă¢â‚¬Å“ng nĂ„â€Ă‚Â©n MP3 bÄ‚Â¡Ă‚ÂºĂ‚Â±ng bÄ‚Â¡Ă‚Â»Ă¢â€Â¢ nĂ„â€Ă‚Â©n tÄ‚Â¡Ă‚Â»Ă¢â‚¬Ëœi Ä‚â€ Ă‚Â°u...");
          const finalMp3Blob = encodeMonoMp3(pcmInt16, decodedBuffer.sampleRate, 128);
          const mp3Url = URL.createObjectURL(finalMp3Blob);
          
          replaceAudioBlobUrl(mp3Url);
          capturePhaseRef.current = 'success';
          setExportPhase('success');
          addLog("ChĂ„â€Ă‚Âºc mÄ‚Â¡Ă‚Â»Ă‚Â«ng! Ä‚â€Ă‚ÂĂ„â€Ă‚Â£ xuÄ‚Â¡Ă‚ÂºĂ‚Â¥t file MP3 thÄ‚Â¡Ă‚ÂºĂ‚Â­t (audio/mpeg) thĂ„â€Ă‚Â nh cĂ„â€Ă‚Â´ng.");
          
        } catch (mp3Err: unknown) {
          console.error("MP3 encoder failed:", mp3Err);
          addLog(`LÄ‚Â¡Ă‚Â»Ă¢â‚¬â€i mĂ„â€Ă‚Â£ hĂ„â€Ă‚Â³a MP3: ${errorMessage(mp3Err)}`);
          capturePhaseRef.current = 'error';
          setExportPhase('error');
        }
      };
      
      // Start recording
      recorder.start();
      capturePhaseRef.current = 'recording';
      
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
        isCancelled: () => isStoppedManuallyRef.current,
        defaultPauseSeconds: timeBetweenLines,
        onProgress: (index, item) => { setProgressPercent(Math.round((index / itemsToExport.length) * 100)); setProgressText(`?ang ph?t d?ng ${index + 1}/${itemsToExport.length}: "${item.text.substring(0, 40)}"`); },
        onRepeat: (index, repeat, total) => addLog(`??c l?i c?u ${index + 1} (l?n ${repeat}/${total})`),
        onError: (index, error) => addLog(`H? th?ng TTS c?nh b?o tr?n d?ng ${index + 1}: ${error}`),
        onExpectationChange: expecting => { isExpectingSpeechRef.current = expecting; },
        onUtterance: utterance => { recordingUtteranceRef.current = utterance; },
      });
      if (!isStoppedManuallyRef.current) {
        addLog("?? ch?y h?t danh s?ch c?u. ?ang d?ng ghi ?m...");
        capturePhaseRef.current = 'encoding';
        isExpectingSpeechRef.current = false;
        if (animationFrameRef.current) { cancelAnimationFrame(animationFrameRef.current); animationFrameRef.current = null; }
        recorder.stop();
        stopMediaStream(mediaStreamRef.current); mediaStreamRef.current = null;
        stopMediaStream(micStreamRef.current); micStreamRef.current = null;
      }
      
    } catch (err: unknown) {
      console.error(err);
      setExportPhase('error');
      addLog(`LÄ‚Â¡Ă‚Â»Ă¢â‚¬â€i chuÄ‚Â¡Ă‚ÂºĂ‚Â©n bÄ‚Â¡Ă‚Â»Ă¢â‚¬Â¹ ghi Ă„â€Ă‚Â¢m: ${errorMessage(err)}`);
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
    if (!audioBlobUrl) return;
    
    const link = document.createElement('a');
    link.href = audioBlobUrl;
    
    const dateStr = new Date().toLocaleDateString('vi-VN').replace(/\//g, '-');
    const rangeText = selectedRange === 'all' ? 'FULL' : `Set-${selectedRange}`;
    const fileExt = exportEngine === 'premium' ? 'wav' : 'mp3'; // browser exports opus-webm, we name to mp3 for easier player triggers
    
    link.download = `am-thanh-luyen-nghe-${rangeText}-${dateStr}.${fileExt}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
              <h3 className="font-extrabold text-slate-900 text-base">BÄ‚Â¡Ă‚Â»Ă¢â€Â¢ XuÄ‚Â¡Ă‚ÂºĂ‚Â¥t Ă„â€Ă¢â‚¬Âm Thanh Ä‚â€Ă‚ÂÄ‚Â¡Ă‚Â»Ă¢â€Â¢c LÄ‚Â¡Ă‚ÂºĂ‚Â­p</h3>
              <p className="text-[11px] text-slate-500 font-medium">XuÄ‚Â¡Ă‚ÂºĂ‚Â¥t danh sĂ„â€Ă‚Â¡ch bĂ„â€Ă‚Â i tÄ‚Â¡Ă‚ÂºĂ‚Â­p thĂ„â€Ă‚Â nh cĂ„â€Ă‚Â¡c file Ă„â€Ă‚Â¢m thanh MP3/WAV ngoÄ‚Â¡Ă‚ÂºĂ‚Â¡i tuyÄ‚Â¡Ă‚ÂºĂ‚Â¿n</p>
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
