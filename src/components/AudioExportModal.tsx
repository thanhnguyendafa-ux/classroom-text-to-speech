import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  X, 
  Download, 
  Play, 
  Square, 
  HelpCircle, 
  Loader2, 
  AlertCircle,
  Volume2, 
  Radio, 
  Compass, 
  ListMusic, 
  CheckCircle2, 
  Info,
  Mic,
  AlertTriangle
} from 'lucide-react';
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
            <div className="space-y-4">
              <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-4 space-y-3.5">
                {/* 1. Range Scope Selection */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <ListMusic className="w-4 h-4 text-indigo-500" />
                    Pháº¡m vi xuáº¥t Ă¢m thanh:
                  </label>
                  <select 
                    value={selectedRange}
                    onChange={(e) => setSelectedRange(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg text-xs py-2 px-3 font-medium outline-hidden focus:border-indigo-500 cursor-pointer text-slate-700"
                  >
                    <option value="all">ToĂ n bá»™ danh sĂ¡ch ({speechList.length} cĂ¢u)</option>
                    {availableSets.map((setId) => {
                      const count = speechList.filter(item => item.setId === setId).length;
                      return (
                        <option key={setId} value={setId}>
                          Chá»‰ Set: {setId} (Gá»“m {count} cĂ¢u)
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* 2. Audio Engine Selection */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Compass className="w-4 h-4 text-indigo-500" />
                    Cháº¿ Ä‘á»™ Äá»™ng cÆ¡ Giá»ng Ä‘á»c:
                  </label>
                  <div className="grid grid-cols-2 gap-3.5">
                    {/* Browser Engine Selection */}
                    <div 
                      onClick={() => setExportEngine('browser')}
                      className={`p-3 rounded-xl border transition cursor-pointer select-none relative ${
                        exportEngine === 'browser' 
                          ? 'border-indigo-600 bg-indigo-50/40 text-indigo-900 shadow-sm' 
                          : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                      }`}
                    >
                      <div className="font-extrabold text-xs">Giá»ng Browser TTS</div>
                      <div className="text-[10px] text-slate-400 mt-1">Ghi Ă¢m thá»±c báº£n Ä‘á»‹a tá»± Ä‘á»™ng, khĂ´ng tá»‘n tĂ i nguyĂªn.</div>
                      {exportEngine === 'browser' && (
                        <div className="absolute right-2 top-2 w-2 h-2 rounded-full bg-indigo-600" />
                      )}
                    </div>

                    {/* Premium AI Engine Selection */}
                    <div 
                      onClick={() => setExportEngine('premium')}
                      className={`p-3 rounded-xl border transition cursor-pointer select-none relative ${
                        exportEngine === 'premium' 
                          ? 'border-indigo-600 bg-indigo-50/40 text-indigo-900 shadow-sm' 
                          : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                      }`}
                    >
                      <div className="font-extrabold text-xs">Premium AI (Gemini)</div>
                      <div className="text-[10px] text-slate-400 mt-1">Xuáº¥t siĂªu tá»‘c, ká»¹ thuáº­t sá»‘ 100% tinh khiáº¿t, cá»±c hay.</div>
                      {exportEngine === 'premium' && (
                        <div className="absolute right-2 top-2 w-2 h-2 rounded-full bg-indigo-600" />
                      )}
                    </div>
                  </div>
                </div>

                {/* 3. Browser Recording Config Source Selection */}
                {exportEngine === 'browser' && (
                  <div className="mt-2.5 bg-slate-100 border border-slate-200 rounded-xl p-3.5 space-y-3 text-xs animate-fade-in">
                    <span className="font-extrabold text-slate-800 flex items-center gap-1.5">
                      <Mic className="w-4 h-4 text-indigo-600" />
                      Nguá»“n Ă¢m thanh thu Ă¢m:
                    </span>
                    
                    <div className="space-y-2.5">
                      {/* Option 1: System Audio Only */}
                      <div 
                        onClick={() => setAudioSource('system')}
                        className={`p-3 rounded-xl border transition cursor-pointer select-none relative flex gap-2.5 items-start ${
                          audioSource === 'system' 
                            ? 'border-indigo-600 bg-indigo-50/40 text-indigo-900 shadow-3xs' 
                            : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                        }`}
                      >
                        <input 
                          type="radio" 
                          name="audioSource" 
                          checked={audioSource === 'system'} 
                          onChange={() => setAudioSource('system')} 
                          className="mt-0.5 w-3.5 h-3.5 text-indigo-600 border-slate-300 focus:ring-indigo-500 cursor-pointer"
                        />
                        <div className="text-left font-medium">
                          <div className="font-extrabold text-[11px] text-slate-800 flex items-center gap-1">
                            <span>Ghi Ă¢m Há»‡ thá»‘ng (System Audio Only)</span>
                            <span className="text-emerald-700 font-extrabold bg-emerald-50 border border-emerald-100 px-1 py-0.2 rounded text-[9px]">KhuyĂªn dĂ¹ng</span>
                          </div>
                          <div className="text-[10px] text-slate-500 mt-0.5 leading-snug">Ghi Ă¢m ká»¹ thuáº­t sá»‘ trá»±c tiáº¿p phĂ¡t tá»« trĂ¬nh duyá»‡t. HoĂ n toĂ n tinh khiáº¿t, 100% khĂ´ng láº«n táº¡p Ă¢m mĂ´i trÆ°á»ng vĂ  khĂ´ng rĂ¨/vá»ng.</div>
                        </div>
                      </div>

                      {/* Option 2: Mic fallback */}
                      <div 
                        onClick={() => setAudioSource('mic')}
                        className={`p-3 rounded-xl border transition cursor-pointer select-none relative flex gap-2.5 items-start ${
                          audioSource === 'mic' 
                            ? 'border-amber-600 bg-amber-50/20 text-amber-950 shadow-3xs' 
                            : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                        }`}
                      >
                        <input 
                          type="radio" 
                          name="audioSource" 
                          checked={audioSource === 'mic'} 
                          onChange={() => setAudioSource('mic')} 
                          className="mt-0.5 w-3.5 h-3.5 text-amber-600 border-slate-300 focus:ring-amber-500 cursor-pointer"
                        />
                        <div className="text-left font-medium">
                          <div className="font-extrabold text-[11px] text-slate-800 flex items-center gap-1">
                            <span>Microphone (Dá»± phĂ²ng cho mĂ¡y ko há»— trá»£)</span>
                            <span className="text-amber-700 font-extrabold bg-amber-50 border border-amber-100 px-1 py-0.2 rounded text-[9px]">Dá»± phĂ²ng</span>
                          </div>
                          <div className="text-[10px] text-slate-500 mt-0.5 leading-snug">Sá»­ dá»¥ng mic cá»§a thiáº¿t bá»‹ Ä‘á»ƒ thu láº¡i tiáº¿ng loa. Tá»± Ä‘á»™ng báº­t Khá»­ tiáº¿ng vang (Echo Cancel) vĂ  Lá»c nhiá»…u.</div>
                        </div>
                      </div>
                    </div>

                    {/* Warning if Mic source is selected */}
                    {audioSource === 'mic' && (
                      <div className="p-2.5 bg-amber-50 border border-amber-200 text-[#7c2d12] rounded-lg text-[10px] leading-relaxed flex gap-1.5 items-start font-medium animate-fade-in">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <span>Cháº¥t lÆ°á»£ng Ă¢m thanh phá»¥ thuá»™c vĂ o loa ngoĂ i vĂ  Micro cá»§a mĂ¡y báº¡n, dá»… láº«n tiáº¿ng á»“n mĂ´i trÆ°á»ng xung quanh.</span>
                      </div>
                    )}

                    <hr className="border-slate-200" />

                    {/* Checkbox for onlyCurrentTab */}
                    <label className="flex items-center gap-2 text-[11px] text-slate-700 cursor-pointer select-none font-semibold">
                      <input 
                        type="checkbox" 
                        checked={onlyCurrentTab}
                        onChange={(e) => setOnlyCurrentTab(e.target.checked)}
                        className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                      <span>Chá»‰ hiá»ƒn thá»‹ chia sáº» Tháº» trĂ¬nh duyá»‡t hiá»‡n táº¡i</span>
                    </label>
                  </div>
                )}
              </div>

              {/* Instructions and help banners */}
              {exportEngine === 'browser' ? (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
                  <div className="flex gap-2.5">
                    <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div className="text-[11px] text-amber-800 leading-relaxed font-semibold">
                      <strong className="text-amber-900 block mb-1 text-xs">â ï¸ GIá»I Háº N Báº¢O Máº¬T & ROUTING Ă‚M THANH TRĂN CHROME:</strong>
                      Máº·c dĂ¹ báº¡n Ä‘Ă£ báº¥m chá»n "Chia sáº» Ă¢m thanh tháº»" (Share tab audio), Google Chrome gá»™c tiáº¿ng nĂ³i máº·c Ä‘á»‹nh <code className="bg-amber-100 px-1 py-0.5 rounded font-mono font-bold text-amber-950 text-[10px]">speechSynthesis</code> tháº³ng ra loa váº­t lĂ½ vĂ  <strong className="text-rose-700">bá» qua dĂ²ng Ă¢m thanh thu Ă¢m ná»™i bá»™ cá»§a Tháº» (Tab)</strong>. Do Ä‘Ă³ khi chá»‰ chia sáº» "Tháº»", video/audio sáº½ luĂ´n bá»‹ IM Láº¶NG.
                    </div>
                  </div>
                  
                  <div className="bg-white border border-amber-150 p-3 rounded-lg text-[11px] text-slate-700 space-y-2.5 shadow-3xs">
                    <div>
                      <span className="font-extrabold text-emerald-700 block">đŸŒ¿ Giáº£i phĂ¡p 1 (KhuyĂªn dĂ¹ng - ThĂ nh cĂ´ng 100%): Chá»n "Premium AI (Gemini)"</span>
                      <p className="text-slate-600 mt-0.5 leading-snug">
                        Chuyá»ƒn Ä‘á»™ng cÆ¡ phĂ­a trĂªn sang <strong>"Premium AI (Gemini)"</strong>. á» cháº¿ Ä‘á»™ nĂ y, Ă¢m thanh Ä‘Æ°á»£c sá»‘ hĂ³a trá»±c tiáº¿p tá»« mĂ¡y chá»§ Google, <strong>táº£i xuá»‘ng ngay láº­p tá»©c trong 3 giĂ¢y</strong> tinh khiáº¿t 100% khĂ´ng láº«n táº¡p Ă¢m, khĂ´ng cáº§n ngá»“i Ä‘á»£i cháº¡y tá»«ng cĂ¢u phĂ¡t ra loa ngoĂ i.
                        <span className="text-indigo-600 block mt-1 font-semibold">đŸ’¡ CĂ¡ch lĂ m: Chá»‰ cáº§n nháº­p mĂ£ Gemini API Key á»Ÿ cá»™t "Cáº¥u hĂ¬nh" mĂ u xĂ¡m bĂªn trĂ¡i mĂ n hĂ¬nh chĂ­nh.</span>
                      </p>
                    </div>
                    
                    <hr className="border-slate-100" />
                    
                    <div>
                      <span className="font-extrabold text-amber-950 block">đŸ–¥ï¸ Giáº£i phĂ¡p 2 (Äá»ƒ xuáº¥t báº±ng Giá»ng TrĂ¬nh Duyá»‡t): Chia sáº» ToĂ n MĂ n HĂ¬nh hoáº·c dĂ¹ng Microphone</span>
                      <p className="text-slate-600 mt-0.5 leading-snug">
                        Náº¿u váº«n muá»‘n dĂ¹ng giá»ng Ä‘á»c mĂ¡y tĂ­nh tá»± do, nhá» tuá»³ chá»n <strong>"Thu cáº£ Mic/Loa ngoĂ i"</strong> Ä‘Ă£ kĂ­ch hoáº¡t phĂ­a trĂªn (CÆ¡ cháº¿ giá»‘ng quay Video):
                      </p>
                      <ol className="list-decimal pl-4.5 mt-1 space-y-1 text-slate-600 text-[10.5px]">
                        <li>Khi há»™p thoáº¡i chia sáº» hiá»‡n lĂªn, hĂ£y nhá»› tĂ­ch chá»n má»¥c <strong className="text-slate-900">"Äá»“ng thá»i chia sáº» Ă¢m thanh tháº»" (Also share tab audio)</strong> á»Ÿ gĂ³c dÆ°á»›i (náº¿u chá»n chia sáº» Tháº»/Tab).</li>
                        <li>Hoáº·c chá»n <strong className="text-slate-900 font-extrabold">"ToĂ n bá»™ mĂ n hĂ¬nh" (Entire Screen)</strong> vĂ  tĂ­ch chá»n <strong className="text-slate-900 font-extrabold">"Chia sáº» Ă¢m thanh há»‡ thá»‘ng"</strong> á»Ÿ gĂ³c dÆ°á»›i cĂ¹ng bĂªn trĂ¡i.</li>
                        <li>Do mic laptop sáº½ thu láº¡i tiáº¿ng phĂ¡t ra tá»« loa Asus, báº¡n hĂ£y <strong>báº­t loa laptop Asus lá»›n lĂªn má»™t chĂºt</strong> Ä‘á»ƒ Microphone ghi nháº­n rĂµ nĂ©t nhĂ©!</li>
                      </ol>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-indigo-50/60 border border-indigo-100 rounded-xl p-3.5 flex gap-2.5 animate-fade-in">
                  <CheckCircle2 className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                  <div className="text-[11px] text-indigo-850 leading-relaxed font-medium">
                    <strong className="text-indigo-900 font-extrabold">Xuáº¥t Báº£n Ă‚m Thanh Ká»¹ Thuáº­t Sá»‘ (Premium AI):</strong> Há»‡ thá»‘ng táº£i cĂ¡c phĂ¢n Ä‘oáº¡n Ă¢m thanh cháº¥t lÆ°á»£ng cao trá»±c tiáº¿p vĂ  ghĂ©p ná»‘i tá»± Ä‘á»™ng. Tá»‘c Ä‘á»™ xuáº¥t nhanh Ä‘á»™t phĂ¡, chuáº©n xĂ¡c 100%, khĂ´ng phá»¥ thuá»™c vĂ o loa hay mic mĂ¡y tĂ­nh cá»§a báº¡n.
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <button
                type="button"
                onClick={handleStartExport}
                className="w-full bg-indigo-600 text-white rounded-xl py-2.5 font-bold hover:bg-indigo-700 transition active:scale-98 text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                <Download className="w-4 h-4" />
                <span>Báº¯t Ä‘áº§u Xuáº¥t Ă‚m Thanh ({itemsToExport.length} cĂ¢u)</span>
              </button>
            </div>
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

