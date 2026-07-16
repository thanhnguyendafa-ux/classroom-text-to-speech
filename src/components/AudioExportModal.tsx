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
  const [status, setStatus] = useState<'idle' | 'processing' | 'recording' | 'success' | 'error'>('idle');
  const [progressText, setProgressText] = useState<string>('');
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [audioBlobUrl, setAudioBlobUrl] = useState<string | null>(null);
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
    setAudioBlobUrl(nextUrl);
  };

  // Clean-up on close/unmount
  useEffect(() => {
    return () => {
      cancelAllProcesses();
      replaceAudioBlobUrl(null);
    };
  }, []);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
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
    setStatus('processing');
    setLogs([]);
    replaceAudioBlobUrl(null);
    setProgressPercent(0);
    
    addLog(`BĂ¡ÂºÂ¯t Ă„â€˜Ă¡ÂºÂ§u xĂ¡Â»Â­ lÄ‚Â½ sĂ¡Â»â€˜ hÄ‚Â³a Ä‚Â¢m thanh Premium vĂ¡Â»â€ºi ${itemsToExport.length} cÄ‚Â¢u.`);
    
    if (!userGeminiApiKey || !userGeminiApiKey.trim()) {
      setStatus('error');
      addLog("LĂ¡Â»â€“I: ThiĂ¡ÂºÂ¿u Gemini API Key. HÄ‚Â£y kÄ‚Â­ch hoĂ¡ÂºÂ¡t Ă¡Â»Å¸ bĂ¡ÂºÂ£ng cĂ¡ÂºÂ¥u hÄ‚Â¬nh bÄ‚Âªn trÄ‚Â¡i trĂ†Â°Ă¡Â»â€ºc.");
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
      setStatus('success');
      addLog("Xu?t file ?m thanh th?nh c?ng.");
    } catch (err: unknown) {
      console.error("LĂ¡Â»â€”i xuĂ¡ÂºÂ¥t Premium AI:", err);
      setStatus('error');
      addLog(`LĂ¡Â»â€”i: ${errorMessage(err) || "KhÄ‚Â´ng thĂ¡Â»Æ’ tĂ¡ÂºÂ£i giĂ¡Â»Âng Ă„â€˜Ă¡Â»Âc AI."}`);
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
    setStatus('recording');
    setLogs([]);
    replaceAudioBlobUrl(null);
    setProgressPercent(0);
    setSoundLevel(0);
    setSilentTimerCount(0);
    setMicActiveWarning(false);
    chunksRef.current = [];
    
    addLog("ChuĂ¡ÂºÂ©n bĂ¡Â»â€¹ cĂ†Â¡ chĂ¡ÂºÂ¿ ghi Ä‚Â¢m SpeechSynthesis cĂ¡Â»Â§a trÄ‚Â¬nh duyĂ¡Â»â€¡t...");
    if (audioSource === 'system') {
      addLog("HĂ†Â¯Ă¡Â»ÂNG DĂ¡ÂºÂªN BĂ¡ÂºÂ®T BUĂ¡Â»ËœC: BĂ¡ÂºÂ¡n hÄ‚Â£y chĂ¡Â»Ân tab 'ToÄ‚Â n bĂ¡Â»â„¢ mÄ‚Â n hÄ‚Â¬nh' (Entire Screen), tÄ‚Â­ch vÄ‚Â o Ä‚Â´ 'Chia sĂ¡ÂºÂ» Ä‚Â¢m thanh hĂ¡Â»â€¡ thĂ¡Â»â€˜ng' (Share system audio) Ă¡Â»Å¸ gÄ‚Â³c trÄ‚Â¡i dĂ†Â°Ă¡Â»â€ºi, rĂ¡Â»â€œi chĂ¡Â»Ân MÄ‚Â n hÄ‚Â¬nh cĂ¡Â»Â§a bĂ¡ÂºÂ¡n.");
    } else {
      addLog("HĂ†Â¯Ă¡Â»ÂNG DĂ¡ÂºÂªN: MÄ‚Â¡y ghi Ä‚Â¢m sĂ¡ÂºÂ½ thu trĂ¡Â»Â±c tiĂ¡ÂºÂ¿p tĂ¡Â»Â« Microphone qua loa ngoÄ‚Â i. HÄ‚Â£y bĂ¡ÂºÂ­t mĂ¡Â»Â©c loa vĂ¡Â»Â«a Ă„â€˜Ă¡Â»Â§ nghe.");
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
          addLog("Ă„ÂÄ‚Â£ khĂ¡Â»Å¸i tĂ¡ÂºÂ¡o Microphone thÄ‚Â nh cÄ‚Â´ng!");
        } catch (micErr: unknown) {
          console.error("Microphone access is denied:", micErr);
          throw new Error("KhÄ‚Â´ng thĂ¡Â»Æ’ truy cĂ¡ÂºÂ­p Microphone. Vui lÄ‚Â²ng cĂ¡ÂºÂ¥p quyĂ¡Â»Ân Microphone Ă„â€˜Ă¡Â»Æ’ sĂ¡Â»Â­ dĂ¡Â»Â¥ng chĂ¡ÂºÂ¿ Ă„â€˜Ă¡Â»â„¢ dĂ¡Â»Â± phÄ‚Â²ng!");
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
          throw new Error("BĂ¡ÂºÂ¡n Ă„â€˜Ä‚Â£ hĂ¡Â»Â§y chia sĂ¡ÂºÂ» mÄ‚Â n hÄ‚Â¬nh / Ä‚Â¢m thanh hĂ¡Â»â€¡ thĂ¡Â»â€˜ng. Vui lÄ‚Â²ng bĂ¡ÂºÂ¥m thĂ¡Â»Â­ lĂ¡ÂºÂ¡i.");
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
        throw new Error("KhÄ‚Â´ng bĂ¡ÂºÂ¯t Ă„â€˜Ă†Â°Ă¡Â»Â£c nguĂ¡Â»â€œn Ä‚Â¢m thanh nÄ‚Â o hĂ¡Â»Â£p lĂ¡Â»â€¡. Vui lÄ‚Â²ng thĂ¡Â»Â­ lĂ¡ÂºÂ¡i.");
      }
      
      addLog("KhĂ¡Â»Å¸i tĂ¡ÂºÂ¡o bĂ¡Â»â„¢ thu Ä‚Â¢m...");
      
      const audioCtx = createAudioContext();
      audioContextRef.current = audioCtx;

      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }
      
      const dest = audioCtx.createMediaStreamDestination();

      // ==========================================
      // STAGE 2: MANDATORY PREFLIGHT CHECK (KIĂ¡Â»â€M TRA TÄ‚ÂN HIĂ¡Â»â€ U CĂ¡Â»Â¨NG)
      // ==========================================
      if (hasDisplayAudio) {
        addLog("Ă„Âang chĂ¡ÂºÂ¡y Preflight check: kiĂ¡Â»Æ’m tra tÄ‚Â­n hiĂ¡Â»â€¡u SpeechSynthesis...");
        setProgressText("Preflight check: Ă„Âang kiĂ¡Â»Æ’m tra tÄ‚Â­n hiĂ¡Â»â€¡u Ä‚Â¢m thanh...");
        
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
          throw new Error(`PREFLIGHT_FAIL: Ä‚â€m thanh hoÄ‚Â n toÄ‚Â n cÄ‚Â¢m (Ă„ÂĂ¡Â»â„¢ lĂ¡Â»â€ºn cĂ¡Â»Â±c Ă„â€˜Ă¡ÂºÂ¡i: ${peakLevel.toFixed(1)}). BĂ¡ÂºÂ¡n PHĂ¡ÂºÂ¢I chĂ¡Â»Ân mĂ¡Â»Â¥c 'ToÄ‚Â n bĂ¡Â»â„¢ mÄ‚Â n hÄ‚Â¬nh' vÄ‚Â  bĂ¡ÂºÂ­t 'Chia sĂ¡ÂºÂ» Ä‚Â¢m thanh hĂ¡Â»â€¡ thĂ¡Â»â€˜ng' Ă„â€˜Ă¡Â»Æ’ thu Ă„â€˜Ă†Â°Ă¡Â»Â£c giĂ¡Â»Âng nÄ‚Â³i.`);
        }
        
        addLog(`Preflight OK! NhĂ¡ÂºÂ­n Ă„â€˜Ă†Â°Ă¡Â»Â£c tÄ‚Â­n hiĂ¡Â»â€¡u Ä‚Â¢m thanh hĂ¡Â»â€¡ thĂ¡Â»â€˜ng (CĂ†Â°Ă¡Â»Âng Ă„â€˜Ă¡Â»â„¢ cĂ¡Â»Â±c Ă„â€˜Ă¡ÂºÂ¡i: ${peakLevel.toFixed(1)}).`);
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
              addLog("CĂ¡ÂºÂ¢NH BÄ‚ÂO: TÄ‚Â­n hiĂ¡Â»â€¡u Ä‚Â¢m thanh biĂ¡ÂºÂ¿n mĂ¡ÂºÂ¥t khi Ă„â€˜ang Ă„â€˜Ă¡Â»Âc bÄ‚Â i!");
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
      
      addLog(`KÄ‚Â­ch hoĂ¡ÂºÂ¡t mÄ‚Â¡y ghi Ä‚Â¢m phĂ¡Â»Â¥ trĂ¡Â»Â£ (codec: ${options.mimeType || "mĂ¡ÂºÂ·c Ă„â€˜Ă¡Â»â€¹nh"})`);
      const recorder = new MediaRecorder(recorderStream, options);
      mediaRecorderRef.current = recorder;
      
      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) {
          chunksRef.current.push(ev.data);
        }
      };
      
      recorder.onstop = async () => {
        if (isStoppedManuallyRef.current) {
          addLog("DĂ¡Â»Â«ng ghi Ä‚Â¢m do ngĂ†Â°Ă¡Â»Âi dÄ‚Â¹ng hĂ¡Â»Â§y bĂ¡Â»Â.");
          setStatus('idle');
          return;
        }

        if (abortReasonRef.current === 'silent-during-speech') {
          setStatus('error');
          setProgressText("KhÄ‚Â´ng thu Ă„â€˜Ă†Â°Ă¡Â»Â£c tiĂ¡ÂºÂ¿ng");
          addLog("LĂ¡Â»â€“I: TrÄ‚Â¬nh duyĂ¡Â»â€¡t bĂ¡Â»â€¹ im lĂ¡ÂºÂ·ng hĂ†Â¡n 3 giÄ‚Â¢y liÄ‚Âªn tiĂ¡ÂºÂ¿p trong quÄ‚Â¡ trÄ‚Â¬nh Ă„â€˜Ă¡Â»Âc. BĂ¡ÂºÂ£n ghi bĂ¡Â»â€¹ hĂ¡Â»Â§y.");
          
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

        addLog("Ă„ÂĂ¡Â»Âc hoÄ‚Â n tĂ¡ÂºÂ¥t. TiĂ¡ÂºÂ¿n hÄ‚Â nh nÄ‚Â©n tĂ¡Â»â€¡p tin mpeg-MP3 thĂ¡ÂºÂ­t...");
        setProgressText("Ă„Âang giĂ¡ÂºÂ£i nÄ‚Â©n & nÄ‚Â©n sang Ă„â€˜Ă¡Â»â€¹nh dĂ¡ÂºÂ¡ng MP3 thĂ¡ÂºÂ­t...");
        setStatus('processing');
        
        if (chunksRef.current.length === 0) {
          setStatus('error');
          addLog("LĂ¡Â»â€“I: BĂ¡ÂºÂ£n ghi rĂ¡Â»â€”ng.");
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
            addLog("KhÄ‚Â´ng thĂ¡Â»Æ’ giĂ¡ÂºÂ£i mÄ‚Â£ PCM tĂ¡Â»Â« bĂ¡Â»â„¢ nhĂ¡Â»â€º tĂ¡ÂºÂ¡m. LĂ†Â°u trĂ¡Â»Â¯ trĂ¡Â»Â±c tiĂ¡ÂºÂ¿p dĂ†Â°Ă¡Â»â€ºi dĂ¡ÂºÂ¡ng WebM lÄ‚Â m phĂ†Â°Ă†Â¡ng Ä‚Â¡n dĂ¡Â»Â± phÄ‚Â²ng.");
            const webmUrl = URL.createObjectURL(webmBlob);
            replaceAudioBlobUrl(webmUrl);
            setStatus('success');
            return;
          } finally {
            decodeCtx.close().catch(() => {});
          }
          
          addLog(`BĂ¡ÂºÂ¯t Ă„â€˜Ă¡ÂºÂ§u chuyĂ¡Â»Æ’n Ă„â€˜Ă¡Â»â€¢i mÄ‚Â£ hÄ‚Â³a sang MP3 128kbps (TĂ¡ÂºÂ§n sĂ¡Â»â€˜: ${decodedBuffer.sampleRate}Hz)...`);
          
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
          
          addLog(`ChĂ¡ÂºÂ¥t lĂ†Â°Ă¡Â»Â£ng thu Ä‚Â¢m - Peak: ${peak.toFixed(3)}, RMS: ${rms.toFixed(3)}, TĂ¡Â»Â· lĂ¡Â»â€¡ clipping (rÄ‚Â¨): ${(clippingRatio * 100).toFixed(1)}%, ThĂ¡Â»Âi lĂ†Â°Ă¡Â»Â£ng: ${duration.toFixed(1)} giÄ‚Â¢y.`);
          
          if (clippingRatio > 0.05 || (rms > 0.5 && peak > 0.98)) {
            addLog("Ă¢ÂÂ Ă¯Â¸Â CĂ¡ÂºÂ¢NH BÄ‚ÂO CHĂ¡ÂºÂ¤T LĂ†Â¯Ă¡Â»Â¢NG: PhÄ‚Â¡t hiĂ¡Â»â€¡n tÄ‚Â­n hiĂ¡Â»â€¡u Ä‚Â¢m thanh cÄ‚Â³ hiĂ¡Â»â€¡n tĂ†Â°Ă¡Â»Â£ng rÄ‚Â¨ (clipping) hoĂ¡ÂºÂ·c rÄ‚Âº (feedback loop) quÄ‚Â¡ lĂ¡Â»â€ºn.");
            addLog("KhuyÄ‚Âªn dÄ‚Â¹ng: BĂ¡ÂºÂ¡n nÄ‚Âªn chuyĂ¡Â»Æ’n nguĂ¡Â»â€œn thÄ‚Â nh 'Ghi Ä‚Â¢m tĂ¡Â»Â« trÄ‚Â¬nh duyĂ¡Â»â€¡t (System Audio Only)' vÄ‚Â  tĂ¡ÂºÂ¯t Micro Ă„â€˜Ă¡Â»Æ’ Ă„â€˜Ă¡ÂºÂ¡t Ă„â€˜Ă¡Â»â„¢ tinh khiĂ¡ÂºÂ¿t tĂ¡Â»â€˜i Ă†Â°u.");
          }
          
          addLog("NÄ‚Â©n dĂ¡Â»Â¯ liĂ¡Â»â€¡u PCM sang luĂ¡Â»â€œng nÄ‚Â©n MP3 bĂ¡ÂºÂ±ng bĂ¡Â»â„¢ nÄ‚Â©n tĂ¡Â»â€˜i Ă†Â°u...");
          const finalMp3Blob = encodeMonoMp3(pcmInt16, decodedBuffer.sampleRate, 128);
          const mp3Url = URL.createObjectURL(finalMp3Blob);
          
          replaceAudioBlobUrl(mp3Url);
          capturePhaseRef.current = 'success';
          setStatus('success');
          addLog("ChÄ‚Âºc mĂ¡Â»Â«ng! Ă„ÂÄ‚Â£ xuĂ¡ÂºÂ¥t file MP3 thĂ¡ÂºÂ­t (audio/mpeg) thÄ‚Â nh cÄ‚Â´ng.");
          
        } catch (mp3Err: unknown) {
          console.error("MP3 encoder failed:", mp3Err);
          addLog(`LĂ¡Â»â€”i mÄ‚Â£ hÄ‚Â³a MP3: ${errorMessage(mp3Err)}`);
          capturePhaseRef.current = 'error';
          setStatus('error');
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
      setStatus('error');
      addLog(`LĂ¡Â»â€”i chuĂ¡ÂºÂ©n bĂ¡Â»â€¹ ghi Ä‚Â¢m: ${errorMessage(err)}`);
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
              <h3 className="font-extrabold text-slate-900 text-base">BĂ¡Â»â„¢ XuĂ¡ÂºÂ¥t Ä‚â€m Thanh Ă„ÂĂ¡Â»â„¢c LĂ¡ÂºÂ­p</h3>
              <p className="text-[11px] text-slate-500 font-medium">XuĂ¡ÂºÂ¥t danh sÄ‚Â¡ch bÄ‚Â i tĂ¡ÂºÂ­p thÄ‚Â nh cÄ‚Â¡c file Ä‚Â¢m thanh MP3/WAV ngoĂ¡ÂºÂ¡i tuyĂ¡ÂºÂ¿n</p>
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
            <AudioExportProgress status={status} progressText={progressText} progressPercent={progressPercent} soundLevel={soundLevel} micActiveWarning={micActiveWarning} logs={logs} onCancel={() => { cancelAllProcesses(); setStatus('idle'); }} />
          )}

          {(status === 'success' || status === 'error') && (
            <AudioExportResult status={status} audioBlobUrl={audioBlobUrl} logs={logs} onReset={() => setStatus('idle')} onDownload={handleDownload} />
          )}
        </div>
      </div>
    </div>
  );
}
