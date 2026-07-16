import React from 'react';
import { 
  Play, 
  Pause, 
  Square,
  Volume2, 
  VolumeX, 
  SkipBack, 
  SkipForward, 
  X, 
  Film, 
  Tv, 
  Sliders, 
  Sparkles, 
  Timer, 
  Video,
  Mic,
  MicOff,
  Circle,
  HelpCircle,
  AlertTriangle,
  Eye,
  EyeOff,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { SpeechItem, LanguageCode } from '../types';
import { useRecordingController } from '../application/theater/useRecordingController';
import { createTheaterRecordingSession, type TheaterRecordingSession } from '../application/theater/theaterRecordingSession';
import { prepareTheaterRecording, selectTheaterRecorderOptions } from '../application/theater/prepareTheaterRecording';
import { TheaterPlaylist } from '../features/theater/TheaterPlaylist';
import { TheaterPlaybackControls } from '../features/theater/TheaterPlaybackControls';
import { TheaterStage } from '../features/theater/TheaterStage';
import { TheaterBottomBarToggle, TheaterErrorBanner, TheaterHeader } from '../features/theater/TheaterChrome';
import { formatRecordingTime, useTheaterRecorder } from '../application/theater/useTheaterRecorder';

interface TheaterPlayerProps {
  isOpen: boolean;
  onClose: () => void;
  speechList: SpeechItem[];
  playingItemId: string | null;
  playingState: 'idle' | 'playing' | 'paused';
  currentRepeatIndex: number;
  waitingState: {
    isWaiting: boolean;
    remainingSec: number;
    itemId: string | null;
    type: 'repeat' | 'advance' | null;
  };
  volume: number;
  speed: number;
  onVolumeChange: (vol: number) => void;
  onSpeedChange: (speed: number) => void;
  onPlayItem: (item: SpeechItem) => void;
  onStop: () => void;
  timeBetweenLines: number;
  onTimeBetweenLinesChange: (time: number) => void;
  autoAdvance: boolean;
  onAutoAdvanceChange: (val: boolean) => void;
  engineMode: 'browser' | 'premium';
  playlistLoopMode: 'once' | 'infinite';
  onPlaylistLoopModeChange: (val: 'once' | 'infinite') => void;
  useUniversalImage?: boolean;
  universalImageUrl?: string;
  isManualPaused?: boolean;
  onPause?: () => void;
  onPlay?: () => void;
}

export default function TheaterPlayer({
  isOpen,
  onClose,
  speechList,
  playingItemId,
  playingState,
  currentRepeatIndex,
  waitingState,
  volume,
  speed,
  onVolumeChange,
  onSpeedChange,
  onPlayItem,
  onStop,
  timeBetweenLines,
  onTimeBetweenLinesChange,
  autoAdvance,
  onAutoAdvanceChange,
  engineMode,
  playlistLoopMode,
  onPlaylistLoopModeChange,
  useUniversalImage = false,
  universalImageUrl = '',
  isManualPaused = false,
  onPause = () => {},
  onPlay = () => {},
}: TheaterPlayerProps) {
  const {
    isRecording, recordingTimeSec, showRecordConfig, recordResolution, includeMic,
    disableEchoCancellation, errorMessage, onlyCurrentTab, showRecordingHelp,
    hideControls, isBottomBarCollapsed, setIsRecording, setRecordingTimeSec,
    setShowRecordConfig, setRecordResolution, setIncludeMic, setDisableEchoCancellation,
    setErrorMessage, clearError, setOnlyCurrentTab, setShowRecordingHelp,
    setHideControls, setIsBottomBarCollapsed,
  } = useRecordingController();

  // Keyboard shortcut to toggle UI controls quickly (using 'h' or 'H')
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }
      if (e.key === 'h' || e.key === 'H') {
        setHideControls(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const recorder = useTheaterRecorder({
    resolution: recordResolution,
    includeMicrophone: includeMic,
    disableEchoCancellation,
    onlyCurrentTab,
    onRecordingChange: setIsRecording,
    onRecordingTimeChange: setRecordingTimeSec,
    onConfigOpenChange: setShowRecordConfig,
    onError: setErrorMessage,
  });

  // Safe Exit Close Button click with record-warning intercept
  const handleCloseClick = () => {
    if (isRecording) {
      if (window.confirm("Bạn đang ghi bải đọc. Bạn có muốn DỪNG QUAY và TẢI VIDEO về máy trước khi thoát không?")) {
        recorder.stop();
        onStop();
        onClose();
      } else {
        recorder.discard();
        onStop();
        onClose();
      }
    } else {
      onStop();
      onClose();
    }
  };

  if (!isOpen) return null;

  // Find the currently active speech item
  const activeItem = speechList.find(item => item.id === playingItemId) || speechList[0];
  const activeIndex = speechList.findIndex(item => item.id === playingItemId);

  const activeImageUrl = (useUniversalImage && universalImageUrl) ? universalImageUrl : activeItem?.imageUrl;

  // Handle play previous
  const handlePrev = () => {
    if (speechList.length === 0) return;
    let targetIndex = activeIndex - 1;
    if (targetIndex < 0) {
      targetIndex = speechList.length - 1; // loop back to end
    }
    onPlayItem(speechList[targetIndex]);
  };

  // Handle play next
  const handleNext = () => {
    if (speechList.length === 0) return;
    let targetIndex = activeIndex + 1;
    if (targetIndex >= speechList.length) {
      targetIndex = 0; // loop back to start
    }
    onPlayItem(speechList[targetIndex]);
  };

  return (
    <div className="fixed inset-0 bg-slate-950 z-50 overflow-hidden flex flex-col md:flex-row font-sans text-slate-100">
      
      {/* LEFT SECTION: MAIN CINEMA STAGE & PLAYER SCREEN */}
      <div className="flex-1 flex flex-col h-full bg-slate-950 relative">
        
        <TheaterHeader
          hidden={hideControls}
          isRecording={isRecording}
          recordingTime={formatRecordingTime(recordingTimeSec)}
          resolution={recordResolution}
          includeMicrophone={includeMic}
          disableEchoCancellation={disableEchoCancellation}
          onlyCurrentTab={onlyCurrentTab}
          showConfig={showRecordConfig}
          showHelp={showRecordingHelp}
          onRestore={() => setHideControls(false)}
          onHide={() => setHideControls(true)}
          onClose={handleCloseClick}
          onStopRecording={recorder.stop}
          onStartRecording={recorder.start}
          onShowConfigChange={setShowRecordConfig}
          onResolutionChange={setRecordResolution}
          onMicrophoneChange={setIncludeMic}
          onEchoCancellationChange={setDisableEchoCancellation}
          onCurrentTabChange={setOnlyCurrentTab}
          onShowHelpChange={setShowRecordingHelp}
        />
        <TheaterErrorBanner message={errorMessage} onDismiss={clearError} />

        <TheaterStage
          activeItem={activeItem}
          activeIndex={activeIndex}
          speechCount={speechList.length}
          playingItemId={playingItemId}
          currentRepeatIndex={currentRepeatIndex}
          waitingState={waitingState}
          isManualPaused={isManualPaused}
          activeImageUrl={activeImageUrl}
          hideControls={hideControls}
          engineMode={engineMode}
        />

        {!hideControls ? <TheaterBottomBarToggle collapsed={isBottomBarCollapsed} onToggle={() => setIsBottomBarCollapsed(!isBottomBarCollapsed)} /> : null}

        {!hideControls ? <TheaterPlaybackControls
          itemCount={speechList.length}
          playingState={playingState}
          isManualPaused={isManualPaused}
          speed={speed}
          volume={volume}
          autoAdvance={autoAdvance}
          timeBetweenLines={timeBetweenLines}
          playlistLoopMode={playlistLoopMode}
          collapsed={isBottomBarCollapsed}
          onPrevious={handlePrev}
          onNext={handleNext}
          onPlay={onPlay}
          onPause={onPause}
          onStop={onStop}
          onSpeedChange={onSpeedChange}
          onVolumeChange={onVolumeChange}
          onAutoAdvanceChange={onAutoAdvanceChange}
          onTimeBetweenLinesChange={onTimeBetweenLinesChange}
          onPlaylistLoopModeChange={onPlaylistLoopModeChange}
        /> : null}

      </div>

      {!hideControls ? <TheaterPlaylist speechList={speechList} playingItemId={playingItemId} onPlayItem={onPlayItem} useUniversalImage={useUniversalImage} universalImageUrl={universalImageUrl} /> : null}
    </div>
  );
}
