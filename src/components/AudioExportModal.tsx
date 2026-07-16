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

  // Clean-up on close/unmount
  useEffect(() => {
    return () => {
      cancelAllProcesses();
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
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }

    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(track => track.stop());
      micStreamRef.current = null;
    }
    
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
    setAudioBlobUrl(null);
    setProgressPercent(0);
    
    addLog(`Báº¯t Ä‘áº§u xá»­ lĂ½ sá»‘ hĂ³a Ă¢m thanh Premium vá»›i ${itemsToExport.length} cĂ¢u.`);
    
    if (!userGeminiApiKey || !userGeminiApiKey.trim()) {
      setStatus('error');
      addLog("Lá»–I: Thiáº¿u Gemini API Key. HĂ£y kĂ­ch hoáº¡t á»Ÿ báº£ng cáº¥u hĂ¬nh bĂªn trĂ¡i trÆ°á»›c.");
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
      setAudioBlobUrl(url);
      setProgressPercent(100);
      setStatus('success');
      addLog("Xu?t file ?m thanh th?nh c?ng.");
    } catch (err: unknown) {
      console.error("Lá»—i xuáº¥t Premium AI:", err);
      setStatus('error');
      addLog(`Lá»—i: ${errorMessage(err) || "KhĂ´ng thá»ƒ táº£i giá»ng Ä‘á»c AI."}`);
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
    setAudioBlobUrl(null);
    setProgressPercent(0);
    setSoundLevel(0);
    setSilentTimerCount(0);
    setMicActiveWarning(false);
    chunksRef.current = [];
    
    addLog("Chuáº©n bá»‹ cÆ¡ cháº¿ ghi Ă¢m SpeechSynthesis cá»§a trĂ¬nh duyá»‡t...");
    if (audioSource === 'system') {
      addLog("HÆ¯á»NG DáºªN Báº®T BUá»˜C: Báº¡n hĂ£y chá»n tab 'ToĂ n bá»™ mĂ n hĂ¬nh' (Entire Screen), tĂ­ch vĂ o Ă´ 'Chia sáº» Ă¢m thanh há»‡ thá»‘ng' (Share system audio) á»Ÿ gĂ³c trĂ¡i dÆ°á»›i, rá»“i chá»n MĂ n hĂ¬nh cá»§a báº¡n.");
    } else {
      addLog("HÆ¯á»NG DáºªN: MĂ¡y ghi Ă¢m sáº½ thu trá»±c tiáº¿p tá»« Microphone qua loa ngoĂ i. HĂ£y báº­t má»©c loa vá»«a Ä‘á»§ nghe.");
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
          addLog("ÄĂ£ khá»Ÿi táº¡o Microphone thĂ nh cĂ´ng!");
        } catch (micErr: unknown) {
          console.error("Microphone access is denied:", micErr);
          throw new Error("KhĂ´ng thá»ƒ truy cáº­p Microphone. Vui lĂ²ng cáº¥p quyá»n Microphone Ä‘á»ƒ sá»­ dá»¥ng cháº¿ Ä‘á»™ dá»± phĂ²ng!");
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
          throw new Error("Báº¡n Ä‘Ă£ há»§y chia sáº» mĂ n hĂ¬nh / Ă¢m thanh há»‡ thá»‘ng. Vui lĂ²ng báº¥m thá»­ láº¡i.");
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
        throw new Error("KhĂ´ng báº¯t Ä‘Æ°á»£c nguá»“n Ă¢m thanh nĂ o há»£p lá»‡. Vui lĂ²ng thá»­ láº¡i.");
      }
      
      addLog("Khá»Ÿi táº¡o bá»™ thu Ă¢m...");
      
      const audioCtx = createAudioContext();
      audioContextRef.current = audioCtx;

      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }
      
      const dest = audioCtx.createMediaStreamDestination();

      // ==========================================
      // STAGE 2: MANDATORY PREFLIGHT CHECK (KIá»‚M TRA TĂN HIá»†U Cá»¨NG)
      // ==========================================
      if (hasDisplayAudio) {
        addLog("Äang cháº¡y Preflight check: kiá»ƒm tra tĂ­n hiá»‡u SpeechSynthesis...");
        setProgressText("Preflight check: Äang kiá»ƒm tra tĂ­n hiá»‡u Ă¢m thanh...");
        
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
          throw new Error(`PREFLIGHT_FAIL: Ă‚m thanh hoĂ n toĂ n cĂ¢m (Äá»™ lá»›n cá»±c Ä‘áº¡i: ${peakLevel.toFixed(1)}). Báº¡n PHáº¢I chá»n má»¥c 'ToĂ n bá»™ mĂ n hĂ¬nh' vĂ  báº­t 'Chia sáº» Ă¢m thanh há»‡ thá»‘ng' Ä‘á»ƒ thu Ä‘Æ°á»£c giá»ng nĂ³i.`);
        }
        
        addLog(`Preflight OK! Nháº­n Ä‘Æ°á»£c tĂ­n hiá»‡u Ă¢m thanh há»‡ thá»‘ng (CÆ°á»ng Ä‘á»™ cá»±c Ä‘áº¡i: ${peakLevel.toFixed(1)}).`);
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
              addLog("Cáº¢NH BĂO: TĂ­n hiá»‡u Ă¢m thanh biáº¿n máº¥t khi Ä‘ang Ä‘á»c bĂ i!");
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
      
      addLog(`KĂ­ch hoáº¡t mĂ¡y ghi Ă¢m phá»¥ trá»£ (codec: ${options.mimeType || "máº·c Ä‘á»‹nh"})`);
      const recorder = new MediaRecorder(recorderStream, options);
      mediaRecorderRef.current = recorder;
      
      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) {
          chunksRef.current.push(ev.data);
        }
      };
      
      recorder.onstop = async () => {
        if (isStoppedManuallyRef.current) {
          addLog("Dá»«ng ghi Ă¢m do ngÆ°á»i dĂ¹ng há»§y bá».");
          setStatus('idle');
          return;
        }

        if (abortReasonRef.current === 'silent-during-speech') {
          setStatus('error');
          setProgressText("KhĂ´ng thu Ä‘Æ°á»£c tiáº¿ng");
          addLog("Lá»–I: TrĂ¬nh duyá»‡t bá»‹ im láº·ng hÆ¡n 3 giĂ¢y liĂªn tiáº¿p trong quĂ¡ trĂ¬nh Ä‘á»c. Báº£n ghi bá»‹ há»§y.");
          
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

        addLog("Äá»c hoĂ n táº¥t. Tiáº¿n hĂ nh nĂ©n tá»‡p tin mpeg-MP3 tháº­t...");
        setProgressText("Äang giáº£i nĂ©n & nĂ©n sang Ä‘á»‹nh dáº¡ng MP3 tháº­t...");
        setStatus('processing');
        
        if (chunksRef.current.length === 0) {
          setStatus('error');
          addLog("Lá»–I: Báº£n ghi rá»—ng.");
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
            addLog("KhĂ´ng thá»ƒ giáº£i mĂ£ PCM tá»« bá»™ nhá»› táº¡m. LÆ°u trá»¯ trá»±c tiáº¿p dÆ°á»›i dáº¡ng WebM lĂ m phÆ°Æ¡ng Ă¡n dá»± phĂ²ng.");
            const webmUrl = URL.createObjectURL(webmBlob);
            setAudioBlobUrl(webmUrl);
            setStatus('success');
            return;
          } finally {
            decodeCtx.close().catch(() => {});
          }
          
          addLog(`Báº¯t Ä‘áº§u chuyá»ƒn Ä‘á»•i mĂ£ hĂ³a sang MP3 128kbps (Táº§n sá»‘: ${decodedBuffer.sampleRate}Hz)...`);
          
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
          
          addLog(`Cháº¥t lÆ°á»£ng thu Ă¢m - Peak: ${peak.toFixed(3)}, RMS: ${rms.toFixed(3)}, Tá»· lá»‡ clipping (rĂ¨): ${(clippingRatio * 100).toFixed(1)}%, Thá»i lÆ°á»£ng: ${duration.toFixed(1)} giĂ¢y.`);
          
          if (clippingRatio > 0.05 || (rms > 0.5 && peak > 0.98)) {
            addLog("â ï¸ Cáº¢NH BĂO CHáº¤T LÆ¯á»¢NG: PhĂ¡t hiá»‡n tĂ­n hiá»‡u Ă¢m thanh cĂ³ hiá»‡n tÆ°á»£ng rĂ¨ (clipping) hoáº·c rĂº (feedback loop) quĂ¡ lá»›n.");
            addLog("KhuyĂªn dĂ¹ng: Báº¡n nĂªn chuyá»ƒn nguá»“n thĂ nh 'Ghi Ă¢m tá»« trĂ¬nh duyá»‡t (System Audio Only)' vĂ  táº¯t Micro Ä‘á»ƒ Ä‘áº¡t Ä‘á»™ tinh khiáº¿t tá»‘i Æ°u.");
          }
          
          addLog("NĂ©n dá»¯ liá»‡u PCM sang luá»“ng nĂ©n MP3 báº±ng bá»™ nĂ©n tá»‘i Æ°u...");
          const finalMp3Blob = encodeMonoMp3(pcmInt16, decodedBuffer.sampleRate, 128);
          const mp3Url = URL.createObjectURL(finalMp3Blob);
          
          setAudioBlobUrl(mp3Url);
          capturePhaseRef.current = 'success';
          setStatus('success');
          addLog("ChĂºc má»«ng! ÄĂ£ xuáº¥t file MP3 tháº­t (audio/mpeg) thĂ nh cĂ´ng.");
          
        } catch (mp3Err: unknown) {
          console.error("MP3 encoder failed:", mp3Err);
          addLog(`Lá»—i mĂ£ hĂ³a MP3: ${errorMessage(mp3Err)}`);
          capturePhaseRef.current = 'error';
          setStatus('error');
        }
      };
      
      // Start recording
      recorder.start();
      capturePhaseRef.current = 'recording';
      
      // 4. Sequential browser SpeechSynthesis loop
      let currentIndex = 0;
      
      const playNextItem = () => {
        if (isStoppedManuallyRef.current) {
          recorder.stop();
          return;
        }
        
        if (currentIndex >= itemsToExport.length) {
          addLog("ÄĂ£ cháº¡y háº¿t danh sĂ¡ch cĂ¢u. Äang dá»«ng ghi Ă¢m...");
          capturePhaseRef.current = 'encoding';
          isExpectingSpeechRef.current = false;
          if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
          }
          recorder.stop();
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
        
        const item = itemsToExport[currentIndex];
        const percent = Math.round((currentIndex / itemsToExport.length) * 100);
        setProgressPercent(percent);
        setProgressText(`Äang phĂ¡t dĂ²ng ${currentIndex + 1}/${itemsToExport.length}: "${item.text.substring(0, 40)}"`);
        
        let currentRepeat = 1;
        const maxRepeats = item.repeats || 1;
        const lineDelay = item.delaySec !== undefined ? item.delaySec : timeBetweenLines;
        
        const speakIteration = () => {
          if (isStoppedManuallyRef.current) return;
          
          const utterance = new SpeechSynthesisUtterance(item.text);
          recordingUtteranceRef.current = utterance;
          
          // Configure parameters
          utterance.rate = item.speed !== undefined ? item.speed : speed;
          utterance.volume = Math.min(1.0, volume);
          
          const langCode = item.selectedLang === 'auto' ? item.detectedLang : item.selectedLang;
          let targetLang = 'en-US';
          if (langCode === 'vi') targetLang = 'vi-VN';
          else if (langCode === 'zh-cn') targetLang = 'zh-CN';
          else if (langCode === 'zh-tw') targetLang = 'zh-TW';
          else if (langCode === 'ja') targetLang = 'ja-JP';
          else if (langCode === 'ko') targetLang = 'ko-KR';
          utterance.lang = targetLang;
          
          // Attach browser voices matching settings
          let preferredVoiceName = '';
          if (langCode === 'en') preferredVoiceName = selectedEnVoiceName;
          else if (langCode === 'vi') preferredVoiceName = selectedViVoiceName;
          else if (langCode === 'zh-cn') preferredVoiceName = selectedZhCnVoiceName;
          else if (langCode === 'zh-tw') preferredVoiceName = selectedZhTwVoiceName;
          else if (langCode === 'ja') preferredVoiceName = selectedJaVoiceName;
          else if (langCode === 'ko') preferredVoiceName = selectedKoVoiceName;
          
          if (preferredVoiceName) {
            const preferredVoice = voices.find(v => v.name === preferredVoiceName);
            if (preferredVoice) utterance.voice = preferredVoice;
          } else {
            const targetPrefix = langCode === 'vi' ? 'vi' : (langCode.startsWith('zh') ? 'zh' : (langCode === 'ja' ? 'ja' : (langCode === 'ko' ? 'ko' : 'en')));
            const bestVoice = voices.find(v => v.lang.toLowerCase().replace('_', '-').startsWith(targetPrefix));
            if (bestVoice) utterance.voice = bestVoice;
          }
          
          utterance.onstart = () => {
            isExpectingSpeechRef.current = true;
          };
          
          utterance.onend = () => {
            isExpectingSpeechRef.current = false;
            if (isStoppedManuallyRef.current) return;
            
            if (currentRepeat < maxRepeats) {
              currentRepeat++;
              addLog(`Äá»c láº¡i cĂ¢u ${currentIndex + 1} (láº§n ${currentRepeat}/${maxRepeats})`);
              setTimeout(speakIteration, lineDelay * 1000);
            } else {
              // Finish this sentence. Move to next!
              currentIndex++;
              setTimeout(playNextItem, lineDelay * 1050);
            }
          };
          
          utterance.onerror = (e) => {
            isExpectingSpeechRef.current = false;
            addLog(`Há»‡ thá»‘ng TTS cáº£nh bĂ¡o trĂªn dĂ²ng ${currentIndex + 1}: ${e.error}`);
            currentIndex++;
            setTimeout(playNextItem, 1000);
          };
          
          window.speechSynthesis.speak(utterance);
        };
        
        speakIteration();
      };
      
      // Start loop
      playNextItem();
      
    } catch (err: unknown) {
      console.error(err);
      setStatus('error');
      addLog(`Lá»—i chuáº©n bá»‹ ghi Ă¢m: ${errorMessage(err)}`);
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
              <h3 className="font-extrabold text-slate-900 text-base">Bá»™ Xuáº¥t Ă‚m Thanh Äá»™c Láº­p</h3>
              <p className="text-[11px] text-slate-500 font-medium">Xuáº¥t danh sĂ¡ch bĂ i táº­p thĂ nh cĂ¡c file Ă¢m thanh MP3/WAV ngoáº¡i tuyáº¿n</p>
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
