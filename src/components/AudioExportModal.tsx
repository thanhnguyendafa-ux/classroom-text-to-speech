import React, { useState, useEffect, useMemo, useRef } from 'react';
import { SpeechItem } from '../types';
import { buildAudioExportFilename, downloadObjectUrl } from '../infrastructure/audio/audioExportDownload';
import { AudioExportView } from '../features/audio-export/AudioExportView';
import { useAudioExportController } from '../application/audio-export/useAudioExportController';
import { useOwnedObjectUrl } from '../application/audio-export/useOwnedObjectUrl';
import { BrowserCaptureResourceOwner } from '../application/audio-export/browserCaptureResourceOwner';
import { runPremiumExportAction } from '../application/audio-export/runPremiumExportAction';
import { runBrowserExportAction } from '../application/audio-export/runBrowserExportAction';

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

  /**
   * FULL-STACK EXPORT GENERATION: PREMIUM AI TTS (Sequence Calls)
   * This retrieves clean audio blocks digitally with 0 background noise
   */
  const handleExportPremiumAI = () => runPremiumExportAction({
    items: itemsToExport, defaultPauseSeconds: timeBetweenLines, apiKey: userGeminiApiKey,
    voices: { en: selectedPremiumVoiceEn, vi: selectedPremiumVoiceVi, 'zh-cn': selectedPremiumVoiceZhCn, 'zh-tw': selectedPremiumVoiceZhTw, ja: selectedPremiumVoiceJa, ko: selectedPremiumVoiceKo },
    userId, lessonId, isCancelled: () => capture.stoppedManually,
    markRunning: () => { capture.stoppedManually = false; }, clearLogs, replaceResultUrl: replaceAudioBlobUrl,
    setPhase: setExportPhase, setProgress: setProgressPercent, setProgressText, addLog,
  });

  /**
   * WEB-ONLY EXPORT FLOW: BROWSER SPEECH SYNTHESIS RECORDING
   * Records native window speechSynthesis played on the local tab
   */
  const handleExportBrowserTTS = () => runBrowserExportAction({
    capture, audioSource, onlyCurrentTab, itemsToExport, speed, volume, voices,
    preferredVoiceNames: { en: selectedEnVoiceName, vi: selectedViVoiceName, 'zh-cn': selectedZhCnVoiceName, 'zh-tw': selectedZhTwVoiceName, ja: selectedJaVoiceName, ko: selectedKoVoiceName },
    timeBetweenLines, setExportPhase, clearLogs, replaceAudioBlobUrl, setProgressPercent, setProgressText,
    setSoundLevel, setSilentTimerCount, setMicActiveWarning, addLog,
  });;

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
    <AudioExportView
      status={status}
      selectedRange={selectedRange}
      availableSets={availableSets}
      speechList={speechList}
      exportEngine={exportEngine}
      audioSource={audioSource}
      onlyCurrentTab={onlyCurrentTab}
      itemCount={itemsToExport.length}
      progressText={progressText}
      progressPercent={progressPercent}
      soundLevel={soundLevel}
      micActiveWarning={micActiveWarning}
      logs={logs}
      audioBlobUrl={audioBlobUrl}
      onClose={() => { cancelAllProcesses(); onClose(); }}
      onCancel={() => { cancelAllProcesses(); resetExportSession(); }}
      onReset={resetExportSession}
      onDownload={handleDownload}
      onStart={handleStartExport}
      onSelectedRangeChange={setSelectedRange}
      onExportEngineChange={setExportEngine}
      onAudioSourceChange={setAudioSource}
      onOnlyCurrentTabChange={setOnlyCurrentTab}
    />
  );
}