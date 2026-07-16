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
import { encodeCapturedAudio } from '../infrastructure/audio/browserAudioEncodingStrategy';
import { createMediaRecorderSession, type MediaRecorderSession } from '../infrastructure/media/mediaRecorderAdapter';
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
  const recorderSessionRef = useRef<MediaRecorderSession | null>(null);
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
    try { recorderSessionRef.current?.stop(); } catch {}
    recorderSessionRef.current = null;
    
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
    
    addLog(`BĂ„â€Ă‚Â¡Ä‚â€Ă‚ÂºÄ‚â€Ă‚Â¯t Ă„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‹Å“Ă„â€Ă‚Â¡Ä‚â€Ă‚ÂºÄ‚â€Ă‚Â§u xĂ„â€Ă‚Â¡Ä‚â€Ă‚Â»Ä‚â€Ă‚Â­ lÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â½ sĂ„â€Ă‚Â¡Ä‚â€Ă‚Â»Ä‚Â¢Ă¢â€Â¬Ă‹Å“ hÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â³a Ä‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢m thanh Premium vĂ„â€Ă‚Â¡Ä‚â€Ă‚Â»Ä‚Â¢Ă¢â€Â¬Ă‚Âºi ${itemsToExport.length} cÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢u.`);
    
    if (!userGeminiApiKey || !userGeminiApiKey.trim()) {
      setExportPhase('error');
      addLog("LĂ„â€Ă‚Â¡Ä‚â€Ă‚Â»Ä‚Â¢Ă¢â€Â¬Ă¢â‚¬Å“I: ThiĂ„â€Ă‚Â¡Ä‚â€Ă‚ÂºÄ‚â€Ă‚Â¿u Gemini API Key. HÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â£y kÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â­ch hoĂ„â€Ă‚Â¡Ä‚â€Ă‚ÂºÄ‚â€Ă‚Â¡t Ă„â€Ă‚Â¡Ä‚â€Ă‚Â»Ä‚â€¦Ă‚Â¸ bĂ„â€Ă‚Â¡Ä‚â€Ă‚ÂºÄ‚â€Ă‚Â£ng cĂ„â€Ă‚Â¡Ä‚â€Ă‚ÂºÄ‚â€Ă‚Â¥u hÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¬nh bÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Âªn trÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¡i trĂ„â€Ă¢â‚¬Â Ä‚â€Ă‚Â°Ă„â€Ă‚Â¡Ä‚â€Ă‚Â»Ä‚Â¢Ă¢â€Â¬Ă‚Âºc.");
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
    
    addLog("ChuĂ„â€Ă‚Â¡Ä‚â€Ă‚ÂºÄ‚â€Ă‚Â©n bĂ„â€Ă‚Â¡Ä‚â€Ă‚Â»Ä‚Â¢Ă¢â€Â¬Ă‚Â¹ cĂ„â€Ă¢â‚¬Â Ä‚â€Ă‚Â¡ chĂ„â€Ă‚Â¡Ä‚â€Ă‚ÂºÄ‚â€Ă‚Â¿ ghi Ä‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢m SpeechSynthesis cĂ„â€Ă‚Â¡Ä‚â€Ă‚Â»Ä‚â€Ă‚Â§a trÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¬nh duyĂ„â€Ă‚Â¡Ä‚â€Ă‚Â»Ä‚Â¢Ă¢â€Â¬Ă‚Â¡t...");
    if (audioSource === 'system') {
      addLog("HĂ„â€Ă¢â‚¬Â Ä‚â€Ă‚Â¯Ă„â€Ă‚Â¡Ä‚â€Ă‚Â»Ä‚â€Ă‚ÂNG DĂ„â€Ă‚Â¡Ä‚â€Ă‚ÂºÄ‚â€Ă‚ÂªN BĂ„â€Ă‚Â¡Ä‚â€Ă‚ÂºÄ‚â€Ă‚Â®T BUĂ„â€Ă‚Â¡Ä‚â€Ă‚Â»Ä‚â€¹Ă…â€œC: BĂ„â€Ă‚Â¡Ä‚â€Ă‚ÂºÄ‚â€Ă‚Â¡n hÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â£y chĂ„â€Ă‚Â¡Ä‚â€Ă‚Â»Ä‚â€Ă‚Ân tab 'ToÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â n bĂ„â€Ă‚Â¡Ä‚â€Ă‚Â»Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¢ mÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â n hÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¬nh' (Entire Screen), tÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â­ch vÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â o Ä‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â´ 'Chia sĂ„â€Ă‚Â¡Ä‚â€Ă‚ÂºÄ‚â€Ă‚Â» Ä‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢m thanh hĂ„â€Ă‚Â¡Ä‚â€Ă‚Â»Ä‚Â¢Ă¢â€Â¬Ă‚Â¡ thĂ„â€Ă‚Â¡Ä‚â€Ă‚Â»Ä‚Â¢Ă¢â€Â¬Ă‹Å“ng' (Share system audio) Ă„â€Ă‚Â¡Ä‚â€Ă‚Â»Ä‚â€¦Ă‚Â¸ gÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â³c trÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¡i dĂ„â€Ă¢â‚¬Â Ä‚â€Ă‚Â°Ă„â€Ă‚Â¡Ä‚â€Ă‚Â»Ä‚Â¢Ă¢â€Â¬Ă‚Âºi, rĂ„â€Ă‚Â¡Ä‚â€Ă‚Â»Ä‚Â¢Ă¢â€Â¬Ă…â€œi chĂ„â€Ă‚Â¡Ä‚â€Ă‚Â»Ä‚â€Ă‚Ân MÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â n hÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¬nh cĂ„â€Ă‚Â¡Ä‚â€Ă‚Â»Ä‚â€Ă‚Â§a bĂ„â€Ă‚Â¡Ä‚â€Ă‚ÂºÄ‚â€Ă‚Â¡n.");
    } else {
      addLog("HĂ„â€Ă¢â‚¬Â Ä‚â€Ă‚Â¯Ă„â€Ă‚Â¡Ä‚â€Ă‚Â»Ä‚â€Ă‚ÂNG DĂ„â€Ă‚Â¡Ä‚â€Ă‚ÂºÄ‚â€Ă‚ÂªN: MÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¡y ghi Ä‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢m sĂ„â€Ă‚Â¡Ä‚â€Ă‚ÂºÄ‚â€Ă‚Â½ thu trĂ„â€Ă‚Â¡Ä‚â€Ă‚Â»Ä‚â€Ă‚Â±c tiĂ„â€Ă‚Â¡Ä‚â€Ă‚ÂºÄ‚â€Ă‚Â¿p tĂ„â€Ă‚Â¡Ä‚â€Ă‚Â»Ä‚â€Ă‚Â« Microphone qua loa ngoÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â i. HÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â£y bĂ„â€Ă‚Â¡Ä‚â€Ă‚ÂºÄ‚â€Ă‚Â­t mĂ„â€Ă‚Â¡Ä‚â€Ă‚Â»Ä‚â€Ă‚Â©c loa vĂ„â€Ă‚Â¡Ä‚â€Ă‚Â»Ä‚â€Ă‚Â«a Ă„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‹Å“Ă„â€Ă‚Â¡Ä‚â€Ă‚Â»Ä‚â€Ă‚Â§ nghe.");
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
          addLog("Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â£ khĂ„â€Ă‚Â¡Ä‚â€Ă‚Â»Ä‚â€¦Ă‚Â¸i tĂ„â€Ă‚Â¡Ä‚â€Ă‚ÂºÄ‚â€Ă‚Â¡o Microphone thÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â nh cÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â´ng!");
        } catch (micErr: unknown) {
          console.error("Microphone access is denied:", micErr);
          throw new Error("KhÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â´ng thĂ„â€Ă‚Â¡Ä‚â€Ă‚Â»Ä‚â€ Ă¢â‚¬â„¢ truy cĂ„â€Ă‚Â¡Ä‚â€Ă‚ÂºÄ‚â€Ă‚Â­p Microphone. Vui lÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â²ng cĂ„â€Ă‚Â¡Ä‚â€Ă‚ÂºÄ‚â€Ă‚Â¥p quyĂ„â€Ă‚Â¡Ä‚â€Ă‚Â»Ä‚â€Ă‚Ân Microphone Ă„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‹Å“Ă„â€Ă‚Â¡Ä‚â€Ă‚Â»Ä‚â€ Ă¢â‚¬â„¢ sĂ„â€Ă‚Â¡Ä‚â€Ă‚Â»Ä‚â€Ă‚Â­ dĂ„â€Ă‚Â¡Ä‚â€Ă‚Â»Ä‚â€Ă‚Â¥ng chĂ„â€Ă‚Â¡Ä‚â€Ă‚ÂºÄ‚â€Ă‚Â¿ Ă„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‹Å“Ă„â€Ă‚Â¡Ä‚â€Ă‚Â»Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¢ dĂ„â€Ă‚Â¡Ä‚â€Ă‚Â»Ä‚â€Ă‚Â± phÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â²ng!");
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
          throw new Error("BĂ„â€Ă‚Â¡Ä‚â€Ă‚ÂºÄ‚â€Ă‚Â¡n Ă„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‹Å“Ä‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â£ hĂ„â€Ă‚Â¡Ä‚â€Ă‚Â»Ä‚â€Ă‚Â§y chia sĂ„â€Ă‚Â¡Ä‚â€Ă‚ÂºÄ‚â€Ă‚Â» mÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â n hÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¬nh / Ä‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢m thanh hĂ„â€Ă‚Â¡Ä‚â€Ă‚Â»Ä‚Â¢Ă¢â€Â¬Ă‚Â¡ thĂ„â€Ă‚Â¡Ä‚â€Ă‚Â»Ä‚Â¢Ă¢â€Â¬Ă‹Å“ng. Vui lÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â²ng bĂ„â€Ă‚Â¡Ä‚â€Ă‚ÂºÄ‚â€Ă‚Â¥m thĂ„â€Ă‚Â¡Ä‚â€Ă‚Â»Ä‚â€Ă‚Â­ lĂ„â€Ă‚Â¡Ä‚â€Ă‚ÂºÄ‚â€Ă‚Â¡i.");
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
        throw new Error("KhÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â´ng bĂ„â€Ă‚Â¡Ä‚â€Ă‚ÂºÄ‚â€Ă‚Â¯t Ă„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‹Å“Ă„â€Ă¢â‚¬Â Ä‚â€Ă‚Â°Ă„â€Ă‚Â¡Ä‚â€Ă‚Â»Ä‚â€Ă‚Â£c nguĂ„â€Ă‚Â¡Ä‚â€Ă‚Â»Ä‚Â¢Ă¢â€Â¬Ă…â€œn Ä‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢m thanh nÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â o hĂ„â€Ă‚Â¡Ä‚â€Ă‚Â»Ä‚â€Ă‚Â£p lĂ„â€Ă‚Â¡Ä‚â€Ă‚Â»Ä‚Â¢Ă¢â€Â¬Ă‚Â¡. Vui lÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â²ng thĂ„â€Ă‚Â¡Ä‚â€Ă‚Â»Ä‚â€Ă‚Â­ lĂ„â€Ă‚Â¡Ä‚â€Ă‚ÂºÄ‚â€Ă‚Â¡i.");
      }
      
      addLog("KhĂ„â€Ă‚Â¡Ä‚â€Ă‚Â»Ä‚â€¦Ă‚Â¸i tĂ„â€Ă‚Â¡Ä‚â€Ă‚ÂºÄ‚â€Ă‚Â¡o bĂ„â€Ă‚Â¡Ä‚â€Ă‚Â»Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¢ thu Ä‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢m...");
      
      const audioCtx = createAudioContext();
      audioContextRef.current = audioCtx;

      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }
      
      const dest = audioCtx.createMediaStreamDestination();

      // ==========================================
      // STAGE 2: MANDATORY PREFLIGHT CHECK (KIĂ„â€Ă‚Â¡Ä‚â€Ă‚Â»Ä‚Â¢Ă¢â€Â¬Ă‚ÂM TRA TÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂN HIĂ„â€Ă‚Â¡Ä‚â€Ă‚Â»Ä‚Â¢Ă¢â€Â¬Ă‚Â U CĂ„â€Ă‚Â¡Ä‚â€Ă‚Â»Ä‚â€Ă‚Â¨NG)
      // ==========================================
      if (hasDisplayAudio) {
        addLog("Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚Âang chĂ„â€Ă‚Â¡Ä‚â€Ă‚ÂºÄ‚â€Ă‚Â¡y Preflight check: kiĂ„â€Ă‚Â¡Ä‚â€Ă‚Â»Ä‚â€ Ă¢â‚¬â„¢m tra tÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â­n hiĂ„â€Ă‚Â¡Ä‚â€Ă‚Â»Ä‚Â¢Ă¢â€Â¬Ă‚Â¡u SpeechSynthesis...");
        setProgressText("Preflight check: Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚Âang kiĂ„â€Ă‚Â¡Ä‚â€Ă‚Â»Ä‚â€ Ă¢â‚¬â„¢m tra tÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â­n hiĂ„â€Ă‚Â¡Ä‚â€Ă‚Â»Ä‚Â¢Ă¢â€Â¬Ă‚Â¡u Ä‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢m thanh...");
        
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
          throw new Error(`PREFLIGHT_FAIL: Ä‚â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‚Âm thanh hoÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â n toÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â n cÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢m (Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂĂ„â€Ă‚Â¡Ä‚â€Ă‚Â»Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¢ lĂ„â€Ă‚Â¡Ä‚â€Ă‚Â»Ä‚Â¢Ă¢â€Â¬Ă‚Âºn cĂ„â€Ă‚Â¡Ä‚â€Ă‚Â»Ä‚â€Ă‚Â±c Ă„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‹Å“Ă„â€Ă‚Â¡Ä‚â€Ă‚ÂºÄ‚â€Ă‚Â¡i: ${peakLevel.toFixed(1)}). BĂ„â€Ă‚Â¡Ä‚â€Ă‚ÂºÄ‚â€Ă‚Â¡n PHĂ„â€Ă‚Â¡Ä‚â€Ă‚ÂºÄ‚â€Ă‚Â¢I chĂ„â€Ă‚Â¡Ä‚â€Ă‚Â»Ä‚â€Ă‚Ân mĂ„â€Ă‚Â¡Ä‚â€Ă‚Â»Ä‚â€Ă‚Â¥c 'ToÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â n bĂ„â€Ă‚Â¡Ä‚â€Ă‚Â»Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¢ mÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â n hÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¬nh' vÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â  bĂ„â€Ă‚Â¡Ä‚â€Ă‚ÂºÄ‚â€Ă‚Â­t 'Chia sĂ„â€Ă‚Â¡Ä‚â€Ă‚ÂºÄ‚â€Ă‚Â» Ä‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢m thanh hĂ„â€Ă‚Â¡Ä‚â€Ă‚Â»Ä‚Â¢Ă¢â€Â¬Ă‚Â¡ thĂ„â€Ă‚Â¡Ä‚â€Ă‚Â»Ä‚Â¢Ă¢â€Â¬Ă‹Å“ng' Ă„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‹Å“Ă„â€Ă‚Â¡Ä‚â€Ă‚Â»Ä‚â€ Ă¢â‚¬â„¢ thu Ă„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‹Å“Ă„â€Ă¢â‚¬Â Ä‚â€Ă‚Â°Ă„â€Ă‚Â¡Ä‚â€Ă‚Â»Ä‚â€Ă‚Â£c giĂ„â€Ă‚Â¡Ä‚â€Ă‚Â»Ä‚â€Ă‚Âng nÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â³i.`);
        }
        
        addLog(`Preflight OK! NhĂ„â€Ă‚Â¡Ä‚â€Ă‚ÂºÄ‚â€Ă‚Â­n Ă„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‹Å“Ă„â€Ă¢â‚¬Â Ä‚â€Ă‚Â°Ă„â€Ă‚Â¡Ä‚â€Ă‚Â»Ä‚â€Ă‚Â£c tÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â­n hiĂ„â€Ă‚Â¡Ä‚â€Ă‚Â»Ä‚Â¢Ă¢â€Â¬Ă‚Â¡u Ä‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢m thanh hĂ„â€Ă‚Â¡Ä‚â€Ă‚Â»Ä‚Â¢Ă¢â€Â¬Ă‚Â¡ thĂ„â€Ă‚Â¡Ä‚â€Ă‚Â»Ä‚Â¢Ă¢â€Â¬Ă‹Å“ng (CĂ„â€Ă¢â‚¬Â Ä‚â€Ă‚Â°Ă„â€Ă‚Â¡Ä‚â€Ă‚Â»Ä‚â€Ă‚Âng Ă„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‹Å“Ă„â€Ă‚Â¡Ä‚â€Ă‚Â»Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¢ cĂ„â€Ă‚Â¡Ä‚â€Ă‚Â»Ä‚â€Ă‚Â±c Ă„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‹Å“Ă„â€Ă‚Â¡Ä‚â€Ă‚ÂºÄ‚â€Ă‚Â¡i: ${peakLevel.toFixed(1)}).`);
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
              addLog("CĂ„â€Ă‚Â¡Ä‚â€Ă‚ÂºÄ‚â€Ă‚Â¢NH BÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂO: TÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â­n hiĂ„â€Ă‚Â¡Ä‚â€Ă‚Â»Ä‚Â¢Ă¢â€Â¬Ă‚Â¡u Ä‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢m thanh biĂ„â€Ă‚Â¡Ä‚â€Ă‚ÂºÄ‚â€Ă‚Â¿n mĂ„â€Ă‚Â¡Ä‚â€Ă‚ÂºÄ‚â€Ă‚Â¥t khi Ă„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‹Å“ang Ă„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‹Å“Ă„â€Ă‚Â¡Ä‚â€Ă‚Â»Ä‚â€Ă‚Âc bÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â i!");
              abortReasonRef.current = 'silent-during-speech';
              capturePhaseRef.current = 'error';
              
              if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
                animationFrameRef.current = null;
              }
              try { recorderSessionRef.current?.stop(); } catch {}
              
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
      
      const handleRecordedBlob = async (webmBlob: Blob) => {
        if (isStoppedManuallyRef.current) {
          addLog("DĂ„â€Ă‚Â¡Ä‚â€Ă‚Â»Ä‚â€Ă‚Â«ng ghi Ä‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢m do ngĂ„â€Ă¢â‚¬Â Ä‚â€Ă‚Â°Ă„â€Ă‚Â¡Ä‚â€Ă‚Â»Ä‚â€Ă‚Âi dÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¹ng hĂ„â€Ă‚Â¡Ä‚â€Ă‚Â»Ä‚â€Ă‚Â§y bĂ„â€Ă‚Â¡Ä‚â€Ă‚Â»Ä‚â€Ă‚Â.");
          setExportPhase('idle');
          return;
        }

        if (abortReasonRef.current === 'silent-during-speech') {
          setExportPhase('error');
          setProgressText("KhÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â´ng thu Ă„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‹Å“Ă„â€Ă¢â‚¬Â Ä‚â€Ă‚Â°Ă„â€Ă‚Â¡Ä‚â€Ă‚Â»Ä‚â€Ă‚Â£c tiĂ„â€Ă‚Â¡Ä‚â€Ă‚ÂºÄ‚â€Ă‚Â¿ng");
          addLog("LĂ„â€Ă‚Â¡Ä‚â€Ă‚Â»Ä‚Â¢Ă¢â€Â¬Ă¢â‚¬Å“I: TrÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¬nh duyĂ„â€Ă‚Â¡Ä‚â€Ă‚Â»Ä‚Â¢Ă¢â€Â¬Ă‚Â¡t bĂ„â€Ă‚Â¡Ä‚â€Ă‚Â»Ä‚Â¢Ă¢â€Â¬Ă‚Â¹ im lĂ„â€Ă‚Â¡Ä‚â€Ă‚ÂºÄ‚â€Ă‚Â·ng hĂ„â€Ă¢â‚¬Â Ä‚â€Ă‚Â¡n 3 giÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¢y liÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Âªn tiĂ„â€Ă‚Â¡Ä‚â€Ă‚ÂºÄ‚â€Ă‚Â¿p trong quÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¡ trÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¬nh Ă„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‹Å“Ă„â€Ă‚Â¡Ä‚â€Ă‚Â»Ä‚â€Ă‚Âc. BĂ„â€Ă‚Â¡Ä‚â€Ă‚ÂºÄ‚â€Ă‚Â£n ghi bĂ„â€Ă‚Â¡Ä‚â€Ă‚Â»Ä‚Â¢Ă¢â€Â¬Ă‚Â¹ hĂ„â€Ă‚Â¡Ä‚â€Ă‚Â»Ä‚â€Ă‚Â§y.");
          
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

        addLog("Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂĂ„â€Ă‚Â¡Ä‚â€Ă‚Â»Ä‚â€Ă‚Âc hoÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â n tĂ„â€Ă‚Â¡Ä‚â€Ă‚ÂºÄ‚â€Ă‚Â¥t. TiĂ„â€Ă‚Â¡Ä‚â€Ă‚ÂºÄ‚â€Ă‚Â¿n hÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â nh nÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â©n tĂ„â€Ă‚Â¡Ä‚â€Ă‚Â»Ä‚Â¢Ă¢â€Â¬Ă‚Â¡p tin mpeg-MP3 thĂ„â€Ă‚Â¡Ä‚â€Ă‚ÂºÄ‚â€Ă‚Â­t...");
        setProgressText("Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚Âang giĂ„â€Ă‚Â¡Ä‚â€Ă‚ÂºÄ‚â€Ă‚Â£i nÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â©n & nÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â©n sang Ă„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‹Å“Ă„â€Ă‚Â¡Ä‚â€Ă‚Â»Ä‚Â¢Ă¢â€Â¬Ă‚Â¹nh dĂ„â€Ă‚Â¡Ä‚â€Ă‚ÂºÄ‚â€Ă‚Â¡ng MP3 thĂ„â€Ă‚Â¡Ä‚â€Ă‚ÂºÄ‚â€Ă‚Â­t...");
        setExportPhase('processing');
        
        if (webmBlob.size === 0) {
          setExportPhase('error');
          addLog("LĂ„â€Ă‚Â¡Ä‚â€Ă‚Â»Ä‚Â¢Ă¢â€Â¬Ă¢â‚¬Å“I: BĂ„â€Ă‚Â¡Ä‚â€Ă‚ÂºÄ‚â€Ă‚Â£n ghi rĂ„â€Ă‚Â¡Ä‚â€Ă‚Â»Ä‚Â¢Ă¢â€Â¬Ă¢â‚¬Âng.");
          return;
        }
        
        try {
          const arrayBuffer = await webmBlob.arrayBuffer();
          
          // Decode raw audio webm/opus into float32 samples
          const decodeCtx = createAudioContext();
          let decodedBuffer: AudioBuffer;
          try {
            decodedBuffer = await decodeCtx.decodeAudioData(arrayBuffer);
          } catch (decErr) {
            console.error("Failed to decode audio data", decErr);
            addLog("KhÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â´ng thĂ„â€Ă‚Â¡Ä‚â€Ă‚Â»Ä‚â€ Ă¢â‚¬â„¢ giĂ„â€Ă‚Â¡Ä‚â€Ă‚ÂºÄ‚â€Ă‚Â£i mÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â£ PCM tĂ„â€Ă‚Â¡Ä‚â€Ă‚Â»Ä‚â€Ă‚Â« bĂ„â€Ă‚Â¡Ä‚â€Ă‚Â»Ä‚Â¢Ă¢â‚¬ÂĂ‚Â¢ nhĂ„â€Ă‚Â¡Ä‚â€Ă‚Â»Ä‚Â¢Ă¢â€Â¬Ă‚Âº tĂ„â€Ă‚Â¡Ä‚â€Ă‚ÂºÄ‚â€Ă‚Â¡m. LĂ„â€Ă¢â‚¬Â Ä‚â€Ă‚Â°u trĂ„â€Ă‚Â¡Ä‚â€Ă‚Â»Ä‚â€Ă‚Â¯ trĂ„â€Ă‚Â¡Ä‚â€Ă‚Â»Ä‚â€Ă‚Â±c tiĂ„â€Ă‚Â¡Ä‚â€Ă‚ÂºÄ‚â€Ă‚Â¿p dĂ„â€Ă¢â‚¬Â Ä‚â€Ă‚Â°Ă„â€Ă‚Â¡Ä‚â€Ă‚Â»Ä‚Â¢Ă¢â€Â¬Ă‚Âºi dĂ„â€Ă‚Â¡Ä‚â€Ă‚ÂºÄ‚â€Ă‚Â¡ng WebM lÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â m phĂ„â€Ă¢â‚¬Â Ä‚â€Ă‚Â°Ă„â€Ă¢â‚¬Â Ä‚â€Ă‚Â¡ng Ä‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â¡n dĂ„â€Ă‚Â¡Ä‚â€Ă‚Â»Ä‚â€Ă‚Â± phÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â²ng.");
            const webmUrl = URL.createObjectURL(webmBlob);
            replaceAudioBlobUrl(webmUrl);
            setExportPhase('success');
            return;
          } finally {
            decodeCtx.close().catch(() => {});
          }
          
          addLog(`BĂ„â€Ă‚Â¡Ä‚â€Ă‚ÂºÄ‚â€Ă‚Â¯t Ă„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‹Å“Ă„â€Ă‚Â¡Ä‚â€Ă‚ÂºÄ‚â€Ă‚Â§u chuyĂ„â€Ă‚Â¡Ä‚â€Ă‚Â»Ä‚â€ Ă¢â‚¬â„¢n Ă„â€Ă¢â‚¬ÂÄ‚Â¢Ă¢â€Â¬Ă‹Å“Ă„â€Ă‚Â¡Ä‚â€Ă‚Â»Ä‚Â¢Ă¢â€Â¬Ă‚Â¢i mÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â£ hÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â³a sang MP3 128kbps (TĂ„â€Ă‚Â¡Ä‚â€Ă‚ÂºÄ‚â€Ă‚Â§n sĂ„â€Ă‚Â¡Ä‚â€Ă‚Â»Ä‚Â¢Ă¢â€Â¬Ă‹Å“: ${decodedBuffer.sampleRate}Hz)...`);
          
          const encoded = encodeCapturedAudio(decodedBuffer, encodeMonoMp3);
          const { peak, rms, clippingRatio, duration, isLikelyClipped } = encoded.metrics;
          addLog(`Ch?t l??ng thu ?m - Peak: ${peak.toFixed(3)}, RMS: ${rms.toFixed(3)}, clipping: ${(clippingRatio * 100).toFixed(1)}%, th?i l??ng: ${duration.toFixed(1)} gi?y.`);
          if (isLikelyClipped) addLog("C?NH B?O: T?n hi?u c? d?u hi?u clipping ho?c feedback. H?y d?ng System Audio Only v? gi?m ?m l??ng.");
          const finalMp3Blob = encoded.blob;
          const mp3Url = URL.createObjectURL(finalMp3Blob);
          
          replaceAudioBlobUrl(mp3Url);
          capturePhaseRef.current = 'success';
          setExportPhase('success');
          addLog("ChÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Âºc mĂ„â€Ă‚Â¡Ä‚â€Ă‚Â»Ä‚â€Ă‚Â«ng! Ă„â€Ă¢â‚¬ÂÄ‚â€Ă‚ÂÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â£ xuĂ„â€Ă‚Â¡Ä‚â€Ă‚ÂºÄ‚â€Ă‚Â¥t file MP3 thĂ„â€Ă‚Â¡Ä‚â€Ă‚ÂºÄ‚â€Ă‚Â­t (audio/mpeg) thÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â nh cÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â´ng.");
          
        } catch (mp3Err: unknown) {
          console.error("MP3 encoder failed:", mp3Err);
          addLog(`LĂ„â€Ă‚Â¡Ä‚â€Ă‚Â»Ä‚Â¢Ă¢â€Â¬Ă¢â‚¬Âi mÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â£ hÄ‚â€Ă¢â‚¬ÂÄ‚â€Ă‚Â³a MP3: ${errorMessage(mp3Err)}`);
          capturePhaseRef.current = 'error';
          setExportPhase('error');
        }
      };
      const recorderSession = createMediaRecorderSession(recorderStream, blob => { void handleRecordedBlob(blob); });
      recorderSessionRef.current = recorderSession;
      const recorder = recorderSession.recorder;
      addLog(`K?ch ho?t m?y ghi ?m (codec: ${recorder.mimeType || "m?c ??nh"})`);
      
      // Start recording
      recorderSession.start();
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
        recorderSession.stop();
        stopMediaStream(mediaStreamRef.current); mediaStreamRef.current = null;
        stopMediaStream(micStreamRef.current); micStreamRef.current = null;
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
