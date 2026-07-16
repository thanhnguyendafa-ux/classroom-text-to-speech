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
  Image as ImageIcon,
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
import { buildDisplayCaptureConstraints, captureDisplay, createAudioContext, errorMessage as getErrorMessage, errorName, stopMediaStream } from '../features/media-capture/mediaCaptureAdapter';
import { useRecordingController } from '../application/theater/useRecordingController';
import { createTheaterRecordingSession, type TheaterRecordingSession } from '../application/theater/theaterRecordingSession';
import { prepareTheaterRecording, selectTheaterRecorderOptions } from '../application/theater/prepareTheaterRecording';
import { TheaterPlaylist } from '../features/theater/TheaterPlaylist';
import { RecordingControls } from '../features/theater/RecordingControls';

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

  // Recording refs
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const micStreamRef = React.useRef<MediaStream | null>(null);
  const chunksRef = React.useRef<Blob[]>([]);
  const timerIntervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingSessionRef = React.useRef<TheaterRecordingSession | null>(null);

  // Formatter for recorded seconds
  const formatTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Clean up recording structures on unmount
  React.useEffect(() => () => {
    recordingSessionRef.current?.stop();
    recordingSessionRef.current = null;
  }, []);

  // Download logic helper
  const saveRecordedVideo = () => {
    if (chunksRef.current.length === 0) return;

    try {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      chunksRef.current = [];

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const now = new Date();
      const dateStr = now.getFullYear() + 
        String(now.getMonth() + 1).padStart(2, '0') + 
        String(now.getDate()).padStart(2, '0') + '_' + 
        String(now.getHours()).padStart(2, '0') + 
        String(now.getMinutes()).padStart(2, '0') + 
        String(now.getSeconds()).padStart(2, '0');

      a.href = url;
      a.download = `LuyenDoc_Video_${recordResolution}_${dateStr}.webm`;
      document.body.appendChild(a);
      a.click();
      
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 500);

    } catch (downloadErr: unknown) {
      console.error("Lỗi khi kết xuất file tải xuống:", downloadErr);
      setErrorMessage(`Lỗi lưu video file: ${getErrorMessage(downloadErr)}`);
    }
  };

  // Stop current active screen recording
  const handleStopRecording = () => {
    recordingSessionRef.current?.stop();
    recordingSessionRef.current = null;
  };

  // Start screen and microphone recording
  const handleStartRecording = async () => {
    setErrorMessage(null);
    chunksRef.current = [];
    
    const { width, height } = createTheaterRecordingSession.resolution(recordResolution);

    try {
      const prepared = await prepareTheaterRecording({
        includeMicrophone: includeMic,
        disableEchoCancellation,
        displayConstraints: buildDisplayCaptureConstraints({ width, height, onlyCurrentTab }),
        captureDisplay,
        getUserMedia: constraints => navigator.mediaDevices.getUserMedia(constraints),
        createCombinedStream: () => new MediaStream(),
        createAudioContext,
        onMicrophoneUnavailable: error => {
          console.warn('Microphone access denied; continuing with display audio', error);
          setErrorMessage("Không chọn được Microphone ngoài. Hệ thống vẫn tiếp tục quay video bằng âm thanh máy tính.");
        },
      });
      const { displayStream, microphoneStream: micStream, combinedStream, videoTrack } = prepared;
      streamRef.current = displayStream;
      micStreamRef.current = micStream;
      if (videoTrack) videoTrack.onended = handleStopRecording;
      const options = selectTheaterRecorderOptions(type => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(combinedStream, options);
      mediaRecorderRef.current = recorder;
      recordingSessionRef.current = createTheaterRecordingSession({
        recorder,
        displayStream,
        microphoneStream: micStream,
        clearTimer: () => {
          if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
        },
        onStopped: () => setIsRecording(false),
      });

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        saveRecordedVideo();
      };

      // Start recording
      recorder.start(1000);
      setIsRecording(true);
      setRecordingTimeSec(0);
      setShowRecordConfig(false);

      timerIntervalRef.current = setInterval(() => {
        setRecordingTimeSec(prev => prev + 1);
      }, 1000);

    } catch (err: unknown) {
      console.error("Recording start error:", err);
      const isIframe = window.self !== window.top;
      if (isIframe && (errorName(err) === 'SecurityError' || getErrorMessage(err).toLowerCase().includes('iframe') || getErrorMessage(err)?.toLowerCase().includes('sandboxed') || getErrorMessage(err)?.toLowerCase().includes('permission'))) {
        setErrorMessage("LỖI BẢO MẬT IFRAME: Trình duyệt chặn chức năng quay màn hình từ bên trong khung xem thử của AI Studio. Vui lòng nhấn vào biểu tượng 'Mở tab mới' (Open in new tab) nằm ở góc phải phía trên trình duyệt của bạn để chạy ứng dụng độc lập bên ngoài, sau đó tính năng ghi hình sẽ hoạt động hoàn hảo!");
      } else if (errorName(err) === 'NotAllowedError') {
        setErrorMessage("Bạn đã từ chối cấp quyền chia sẻ/ghi hình màn hình của trình duyệt.");
      } else {
        setErrorMessage(`Không thể chuẩn bị công cụ ghi: ${getErrorMessage(err)}`);
      }
    }
  };

  // Safe Exit Close Button click with record-warning intercept
  const handleCloseClick = () => {
    if (isRecording) {
      if (window.confirm("Bạn đang ghi bải đọc. Bạn có muốn DỪNG QUAY và TẢI VIDEO về máy trước khi thoát không?")) {
        handleStopRecording();
        onStop();
        onClose();
      } else {
        if (mediaRecorderRef.current) mediaRecorderRef.current.onstop = null;
        recordingSessionRef.current?.stop();
        recordingSessionRef.current = null;
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
        
        {/* Floating toggle back button when controls are hidden */}
        {hideControls && (
          <div className="absolute top-4 right-4 z-50 flex items-center gap-2 select-none">
            <span className="text-[10px] text-slate-500 font-mono bg-slate-950/80 border border-slate-900/60 px-2 py-1 rounded-lg backdrop-blur-xs">
              Mẹo: Phím <strong className="text-indigo-300 font-extrabold font-mono">H</strong> để Ẩn / Hiện
            </span>
            <button
              onClick={() => setHideControls(false)}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-900/90 border border-slate-800 hover:bg-slate-850 hover:border-slate-700 rounded-xl text-xs font-bold text-slate-300 hover:text-white transition shadow-xl cursor-pointer backdrop-blur-md opacity-40 hover:opacity-100 duration-200"
              title="Hiện lại toàn bộ nút và bảng điều khiển (Hoặc bấm phím H)"
            >
              <Eye className="w-4 h-4 text-indigo-400" />
              <span>Hiện Giao Diện</span>
            </button>
          </div>
        )}
        
        {/* Header Ribbon bar */}
        {!hideControls && (
          <div className="h-14 sm:h-16 px-4 flex items-center justify-between border-b border-slate-900 bg-slate-950/90 z-20 gap-4">
          <div className="flex items-center space-x-2 shrink-0">
            <div className="p-1.5 bg-indigo-600 rounded-lg text-white hidden sm:block">
              <Film className="w-5 h-5" />
            </div>
            <div className="text-left">
              <h1 className="font-extrabold text-xs sm:text-base tracking-tight text-white flex items-center gap-1.5">
                Rạp Chiếu Luyện Tập <span className="text-[9px] sm:text-[10px] bg-indigo-500/35 border border-indigo-500/50 text-indigo-200 font-bold px-1.5 sm:px-2 py-0.5 rounded-full uppercase">Cinema Mode</span>
              </h1>
              <p className="text-[10px] text-slate-400 hidden md:block">Chế độ chiếu ảnh kèm phụ đề hỗ trợ nghe chép chính tả lớp học</p>
            </div>
          </div>

          <RecordingControls
            isRecording={isRecording}
            recordingTime={formatTime(recordingTimeSec)}
            resolution={recordResolution}
            includeMicrophone={includeMic}
            disableEchoCancellation={disableEchoCancellation}
            onlyCurrentTab={onlyCurrentTab}
            showConfig={showRecordConfig}
            showHelp={showRecordingHelp}
            onStop={handleStopRecording}
            onStart={handleStartRecording}
            onShowConfigChange={setShowRecordConfig}
            onResolutionChange={setRecordResolution}
            onMicrophoneChange={setIncludeMic}
            onEchoCancellationChange={setDisableEchoCancellation}
            onCurrentTabChange={setOnlyCurrentTab}
            onShowHelpChange={setShowRecordingHelp}
          />

          <button
            onClick={() => setHideControls(true)}
            className="flex items-center space-x-1 px-3 py-1.5 bg-slate-900 border border-slate-800 hover:bg-indigo-950 hover:border-indigo-900 rounded-xl text-xs font-bold text-slate-300 transition cursor-pointer shrink-0"
            title="Ẩn giao diện điều khiển để tập trung quay video đẹp hơn (Bấm phím 'H' để khôi phục)"
          >
            <EyeOff className="w-4 h-4 text-indigo-400" />
            <span className="hidden sm:inline">Ẩn Giao Diện</span>
          </button>

          <button
            onClick={handleCloseClick}
            className="flex items-center space-x-1 px-3 py-1.5 bg-slate-900 border border-slate-800 hover:bg-rose-950 hover:border-rose-900 rounded-xl text-xs font-bold text-slate-300 transition cursor-pointer shrink-0"
            title="Thoát chế độ rạp chiếu phim"
          >
            <X className="w-4 h-4 text-rose-500" />
            <span className="hidden sm:inline">Thoát Rạp Chiếu</span>
          </button>
        </div>
        )}

        {/* Error notification banner */}
        {errorMessage && (
          <div className="mx-4 mt-3 bg-red-950/60 border border-red-800 text-red-200 px-4 py-3 rounded-2xl text-xs space-y-1 relative select-text z-40 shadow-lg">
            <div className="font-extrabold flex items-center gap-1.5 text-red-300">
              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
              <span>Gợi ý xử lý ghi hình màn hình</span>
              <button 
                onClick={clearError}
                className="absolute top-2.5 right-3 text-red-400 hover:text-white p-1 hover:bg-red-900/30 rounded cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="leading-relaxed font-semibold">{errorMessage}</p>
          </div>
        )}

        {/* VIDEOTHEQUE CANVAS / VIEWPORT STAGE */}
        <div className="flex-1 relative flex items-center justify-center p-4 min-h-0 bg-slate-1000 z-10 select-none">
          {/* Blur background layer behind active slide image */}
          {activeImageUrl ? (
            <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
              <img 
                src={activeImageUrl} 
                alt="blurred bg"
                className="w-full h-full object-cover blur-2xl opacity-20 scale-110"
                referrerPolicy="no-referrer"
              />
            </div>
          ) : null}

          {/* Core Visual Stage Frame */}
          <div className="w-full max-w-4xl aspect-video bg-slate-950 rounded-2xl overflow-hidden shadow-2xl border border-slate-900/60 relative flex flex-col items-center justify-center">
            
            {/* Slide screen area */}
            <div className="flex-1 w-full h-full relative flex items-center justify-center">
              {activeImageUrl ? (
                /* Cinematic Image scale layer - Full bleed stretch */
                <img
                  src={activeImageUrl}
                  alt={activeItem ? activeItem.text : "Chủ đề"}
                  className="absolute inset-0 w-full h-full object-cover transition-all duration-300"
                  referrerPolicy="no-referrer"
                />
              ) : (
                /* Fallback screen: Solid slate-blue training wallpaper */
                <div className="absolute inset-0 bg-gradient-to-br from-blue-700 via-indigo-900 to-indigo-950 flex flex-col items-center justify-center p-10">
                  <div className="w-16 h-16 rounded-full bg-blue-600/35 border border-blue-400/30 flex items-center justify-center text-white/90 animate-pulse mb-4 z-10 shadow-xs">
                    <ImageIcon className="w-8 h-8 opacity-80" />
                  </div>
                  <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-blue-600/10 to-transparent pointer-events-none" />
                </div>
              )}

              {/* OVERLAY SUBTITLES FRAME */}
              <div className="absolute bottom-6 inset-x-4 text-center z-10 px-4">
                <div className="inline-block bg-black/60 backdrop-blur-md border border-white/5 py-3 px-6 sm:px-8 rounded-2xl max-w-3xl shadow-xl transition-all">
                  <span className="text-xl sm:text-3.5xl font-extrabold text-white text-center tracking-tight leading-normal drop-shadow-[0_2px_5px_rgba(0,0,0,0.9)] uppercase-none block">
                    {activeItem ? activeItem.text : "Chưa tải bài luyện"}
                  </span>
                  
                  {/* Local playing micro badges */}
                  {playingItemId === activeItem?.id && (
                    <div className="flex items-center justify-center space-x-1.5 mt-2 text-xs font-mono">
                      {isManualPaused ? (
                        <span className="text-amber-400 font-extrabold bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-md animate-pulse uppercase text-[10px]">
                          ⏸️ Đang tạm dừng
                        </span>
                      ) : waitingState.isWaiting ? (
                        <span className="text-amber-400 font-extrabold bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md animate-pulse">
                          ⏱️ {waitingState.type === 'repeat' ? 'Chờ lặp' : 'Chờ chuyển câu'}: {waitingState.remainingSec}s
                        </span>
                      ) : (
                        <span className="text-indigo-400 font-extrabold bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-md animate-pulse uppercase text-[10px]">
                          🔊 Đang phát (Lần {currentRepeatIndex}/{activeItem.repeats || 1})
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Quick floating indicators */}
            {!hideControls && (
              <>
                <div className="absolute top-4 left-4 flex gap-2">
                  <span className="bg-black/60 border border-white/10 text-slate-300 px-3 py-1 text-xs font-mono rounded-lg flex items-center gap-1.5 backdrop-blur-xs">
                    {activeIndex !== -1 ? `${activeIndex + 1} / ${speechList.length}` : '—'}
                  </span>
                  <span className={`px-2.5 py-1 text-xs font-bold rounded-lg ${
                    activeItem?.resolvedLang === 'vi' 
                      ? 'bg-rose-600/80 border border-rose-500/50 text-white' 
                      : 'bg-indigo-650/80 border border-indigo-500/50 text-white'
                  }`}>
                    {activeItem?.resolvedLang === 'vi' ? '🇻🇳 VI Voice' : '🇺🇸 EN Voice'}
                  </span>
                </div>

                <div className="absolute top-4 right-4 flex gap-2">
                  {engineMode === 'premium' ? (
                    <span className="bg-amber-600 border border-amber-500/40 text-white px-2.5 py-1 text-[10px] font-bold uppercase rounded-lg animate-pulse">
                      💎 Active: Premium Voice (Gemini AI)
                    </span>
                  ) : (
                    <span className="bg-slate-900 border border-slate-800 text-slate-400 px-2.5 py-0.5 text-[10px] font-semibold rounded-lg">
                      🌐 Active: Brower Engine
                    </span>
                  )}
                </div>
              </>
            )}

          </div>
        </div>

        {/* Toggle Collapse Bottom Bar Handle */}
        {!hideControls && (
          <div className={`relative w-full z-30 flex justify-center ${
            isBottomBarCollapsed ? 'absolute bottom-4 left-0 right-0' : 'h-0 -mt-3.5'
          }`}>
            <button
              type="button"
              id="toggle-bottom-bar-trigger"
              onClick={() => setIsBottomBarCollapsed(!isBottomBarCollapsed)}
              className="px-4 py-1.5 bg-slate-900/95 hover:bg-slate-850 hover:text-indigo-400 border border-slate-800 text-slate-300 rounded-full flex items-center space-x-1.5 text-[11px] font-bold shadow-lg shadow-black/90 transition-all duration-200 cursor-pointer backdrop-blur-md"
              title={isBottomBarCollapsed ? "Nhấn để kéo lồi bảng nút điều khiển lên" : "Nhấn để thu gọn/ẩn bớt các phím chỉnh xuống dưới"}
            >
              {isBottomBarCollapsed ? (
                <>
                  <ChevronUp className="w-3.5 h-3.5 text-indigo-400 animate-bounce" />
                  <span>Bảng điều khiển 🔼</span>
                </>
              ) : (
                <>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  <span>Thu gọn 🔽</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* BOTTOM INTEGRATED CONTROLS PARAMETERS ROW */}
        {!hideControls && (
          <div className={`bg-slate-950 border-t border-slate-900 flex flex-col z-20 transition-all duration-300 ${
            isBottomBarCollapsed ? 'h-0 py-0 border-t-0 opacity-0 overflow-hidden shrink-0' : 'px-5 py-4 h-auto opacity-100 shrink-0 space-y-4'
          }`}>
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Control Group 1: Navigation keys */}
            <div className="flex items-center space-x-2.5 justify-center sm:justify-start">
              {/* Back button */}
              <button
                type="button"
                onClick={handlePrev}
                disabled={speechList.length <= 1}
                className="p-2.5 bg-slate-900 border border-slate-850 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                title="Quay lại câu trước"
              >
                <SkipBack className="w-4 h-4 fill-current" />
              </button>

              {/* Play Tổng Button */}
              <button
                type="button"
                onClick={onPlay}
                disabled={speechList.length === 0}
                className={`p-3.5 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                  (playingState === 'playing' || (playingState === 'paused' && !isManualPaused))
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20 scale-105 border border-emerald-400/30'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-indigo-100 hover:text-white shadow-md hover:shadow-indigo-600/10'
                }`}
                title="Play Tổng - Bắt đầu đọc hoặc tiếp tục tiến trình"
              >
                <Play className="w-4.5 h-4.5 fill-current ml-0.5" />
              </button>

              {/* Pause Tổng Button */}
              <button
                type="button"
                onClick={onPause}
                disabled={playingState === 'idle' || isManualPaused}
                className={`p-3 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                  isManualPaused
                    ? 'bg-amber-600 text-white shadow-lg shadow-amber-500/30 animate-pulse border border-amber-400/40'
                    : 'bg-slate-900 hover:bg-slate-800 border border-slate-850 text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:pointer-events-none'
                }`}
                title="Pause Tổng - Tạm ngưng phát âm hoặc dừng đếm ngược"
              >
                <Pause className="w-4 h-4 fill-current" />
              </button>

              {/* Stop Button */}
              <button
                type="button"
                onClick={onStop}
                disabled={playingState === 'idle' && !isManualPaused}
                className="p-3 bg-rose-600 hover:bg-rose-700 text-white border border-rose-500/20 rounded-full transition disabled:opacity-30 disabled:pointer-events-none cursor-pointer flex items-center justify-center shadow-md hover:shadow-rose-500/15"
                title="Stop / Dừng bộ phát - Khôi phục trạng thái ban đầu"
              >
                <Square className="w-4 h-4 fill-current text-white" />
              </button>

              {/* Next button */}
              <button
                type="button"
                onClick={handleNext}
                disabled={speechList.length <= 1}
                className="p-2.5 bg-slate-900 border border-slate-850 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                title="Bỏ qua đến câu tiếp theo"
              >
                <SkipForward className="w-4 h-4 fill-current" />
              </button>
            </div>

            {/* Control Group 2: Speeds, Autoplay, Staying time, Volume knobs */}
            <div className="flex flex-wrap items-center justify-center sm:justify-end gap-3 sm:gap-4 flex-1">
              
              {/* Autoplay Advance toggle */}
              <div className="bg-slate-900/60 border border-slate-900 rounded-xl p-2 px-3 flex items-center space-x-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tự chuyển tiếp</span>
                <button
                  type="button"
                  onClick={() => onAutoAdvanceChange(!autoAdvance)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                    autoAdvance ? 'bg-indigo-600' : 'bg-slate-800'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ease-in-out ${
                      autoAdvance ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Playlist continuous repeat loop toggle */}
              {autoAdvance && (
                <div className="bg-slate-900/60 border border-slate-900 rounded-xl p-1.5 px-3 flex items-center space-x-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Hết danh sách:</span>
                  <div className="flex bg-slate-950 rounded-lg p-0.5 border border-slate-850">
                    <button
                      type="button"
                      onClick={() => onPlaylistLoopModeChange('once')}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                        playlistLoopMode === 'once'
                          ? 'bg-indigo-600 text-white'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                      title="Phát xong toàn bộ câu thì dừng lại"
                    >
                      🎯 Phát 1 lần
                    </button>
                    <button
                      type="button"
                      onClick={() => onPlaylistLoopModeChange('infinite')}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer flex items-center gap-1 ${
                        playlistLoopMode === 'infinite'
                          ? 'bg-amber-600 text-white animate-pulse-subtle'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                      title="Phát xong toàn bộ câu thì tự lặp lại vô hạn từ đầu"
                    >
                      🔁 Lặp vô hạn
                    </button>
                  </div>
                </div>
              )}

              {/* Default Stay delay configuration */}
              {autoAdvance && (
                <div className="bg-slate-900/60 border border-slate-900 rounded-xl p-2 px-3 flex items-center space-x-2 text-xs">
                  <div className="flex items-center gap-1 text-slate-400">
                    <Timer className="w-3.5 h-3.5" />
                    <span className="text-[11px] font-bold uppercase tracking-wider">Nghỉ giữa:</span>
                  </div>
                  <input
                    type="range"
                    min="1.0"
                    max="8.0"
                    step="0.5"
                    className="accent-indigo-500 w-20 sm:w-24 h-1 bg-slate-800"
                    value={timeBetweenLines}
                    onChange={(e) => onTimeBetweenLinesChange(parseFloat(e.target.value))}
                  />
                  <span className="font-mono font-bold text-indigo-400">{timeBetweenLines}s</span>
                </div>
              )}

              {/* Speed dials */}
              <div className="bg-slate-900/60 border border-slate-900 rounded-xl p-2 px-3 flex items-center space-x-2 text-xs">
                <div className="flex items-center gap-1 text-slate-400">
                  <Sliders className="w-3.5 h-3.5" />
                  <span className="text-[11px] font-bold uppercase tracking-wider">Tốc độ:</span>
                </div>
                <div className="flex bg-slate-950 rounded-lg p-0.5 border border-slate-850">
                  {[0.5, 1.0, 1.25, 1.5, 2.0].map((rate) => (
                    <button
                      key={rate}
                      type="button"
                      onClick={() => onSpeedChange(rate)}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold transition cursor-pointer ${
                        Math.abs(speed - rate) < 0.05
                          ? 'bg-indigo-600 text-white'
                          : 'text-slate-450 hover:text-slate-200'
                      }`}
                    >
                      {rate === 1.0 ? '1x' : `${rate}x`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Speaker Volume dials */}
              <div className="bg-slate-900/60 border border-slate-900 rounded-xl p-2 px-3 flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => onVolumeChange(volume === 0 ? 1.0 : 0)}
                  className="p-1 text-slate-400 hover:text-white rounded"
                  title="Tắt tiếng / Bật âm"
                >
                  {volume === 0 ? <VolumeX className="w-4 h-4 text-rose-500" /> : <Volume2 className="w-4 h-4 text-indigo-400" />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1.5"
                  step="0.1"
                  className="accent-indigo-500 w-16 sm:w-20 h-1 bg-slate-800"
                  value={volume}
                  onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                />
                <span className="text-[10px] font-mono font-bold text-slate-400 w-8">{Math.round(volume * 100)}%</span>
              </div>

            </div>
          </div>
        </div>
        )}

      </div>

      {!hideControls ? <TheaterPlaylist speechList={speechList} playingItemId={playingItemId} onPlayItem={onPlayItem} useUniversalImage={useUniversalImage} universalImageUrl={universalImageUrl} /> : null}
    </div>
  );
}
