import React from 'react';
import type { LanguageCode, SpeechItem } from '../../types';

const ImageSearchModal = React.lazy(() => import('../../components/ImageSearchModal'));
const TheaterPlayer = React.lazy(() => import('../../components/TheaterPlayer'));
const ShareModal = React.lazy(() => import('../../components/ShareModal'));
const AudioExportModal = React.lazy(() => import('../../components/AudioExportModal'));

type WaitingState = { isWaiting: boolean; remainingSec: number; itemId: string | null; type: 'repeat' | 'advance' | null };
interface AppModalLayerProps {
  imageSearch: { open: boolean; item: SpeechItem | null; onClose: () => void; onAssign: (url: string) => void };
  share: { open: boolean; onClose: () => void; speechList: SpeechItem[]; speed: number; volume: number; autoAdvance: boolean; timeBetweenLines: number; playlistLoopMode: 'once' | 'infinite'; engineMode: 'browser' | 'premium' };
  theater: { open: boolean; onClose: () => void; speechList: SpeechItem[]; playingItemId: string | null; playingState: 'idle' | 'playing' | 'paused'; currentRepeatIndex: number; waitingState: WaitingState; volume: number; speed: number; onVolumeChange: (value: number) => void; onSpeedChange: (value: number) => void; onPlayItem: (item: SpeechItem) => void; onStop: () => void; timeBetweenLines: number; onTimeBetweenLinesChange: (value: number) => void; autoAdvance: boolean; onAutoAdvanceChange: (value: boolean) => void; engineMode: 'browser' | 'premium'; playlistLoopMode: 'once' | 'infinite'; onPlaylistLoopModeChange: (value: 'once' | 'infinite') => void; useUniversalImage: boolean; universalImageUrl: string; isManualPaused: boolean; onPause: () => void; onPlay: () => void };
  audioExport: { open: boolean; onClose: () => void; speechList: SpeechItem[]; speed: number; volume: number; timeBetweenLines: number; engineMode: 'browser' | 'premium'; apiKey: string; voices: SpeechSynthesisVoice[]; browserVoices: Record<LanguageCode, string>; premiumVoices: Record<LanguageCode, string>; userId: string | null; lessonId: string | null };
}

export function AppModalLayer({ imageSearch, share, theater, audioExport }: AppModalLayerProps) {
  return <>
    {imageSearch.open && <React.Suspense fallback={null}><ImageSearchModal isOpen onClose={imageSearch.onClose} item={imageSearch.item} onAssignImage={imageSearch.onAssign} /></React.Suspense>}
    {share.open && <React.Suspense fallback={null}><ShareModal isOpen onClose={share.onClose} speechList={share.speechList} speed={share.speed} volume={share.volume} autoAdvance={share.autoAdvance} timeBetweenLines={share.timeBetweenLines} playlistLoopMode={share.playlistLoopMode} engineMode={share.engineMode} /></React.Suspense>}
    {theater.open && <React.Suspense fallback={null}><TheaterPlayer isOpen {...(({ open: _open, ...props }) => props)(theater)} /></React.Suspense>}
    {audioExport.open && <React.Suspense fallback={null}><AudioExportModal isOpen onClose={audioExport.onClose} speechList={audioExport.speechList} speed={audioExport.speed} volume={audioExport.volume} timeBetweenLines={audioExport.timeBetweenLines} engineMode={audioExport.engineMode} userGeminiApiKey={audioExport.apiKey} voices={audioExport.voices} selectedEnVoiceName={audioExport.browserVoices.en} selectedViVoiceName={audioExport.browserVoices.vi} selectedZhCnVoiceName={audioExport.browserVoices['zh-cn']} selectedZhTwVoiceName={audioExport.browserVoices['zh-tw']} selectedJaVoiceName={audioExport.browserVoices.ja} selectedKoVoiceName={audioExport.browserVoices.ko} selectedPremiumVoiceEn={audioExport.premiumVoices.en} selectedPremiumVoiceVi={audioExport.premiumVoices.vi} selectedPremiumVoiceZhCn={audioExport.premiumVoices['zh-cn']} selectedPremiumVoiceZhTw={audioExport.premiumVoices['zh-tw']} selectedPremiumVoiceJa={audioExport.premiumVoices.ja} selectedPremiumVoiceKo={audioExport.premiumVoices.ko} userId={audioExport.userId} lessonId={audioExport.lessonId} /></React.Suspense>}
  </>;
}
