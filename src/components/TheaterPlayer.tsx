import React from 'react';
import { 
  Play, 
  Pause, 
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
  AlertTriangle
} from 'lucide-react';
import { SpeechItem, LanguageCode } from '../types';

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
}: TheaterPlayerProps) {
  // Recording states
  const [isRecording, setIsRecording] = React.useState<boolean>(false);
  const [recordingTimeSec, setRecordingTimeSec] = React.useState<number>(0);
  const [showRecordConfig, setShowRecordConfig] = React.useState<boolean>(false);
  const [recordResolution, setRecordResolution] = React.useState<'480p' | '720p' | '1080p'>('720p');
  const [includeMic, setIncludeMic] = React.useState<boolean>(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [onlyCurrentTab, setOnlyCurrentTab] = React.useState<boolean>(true);
  const [showRecordingHelp, setShowRecordingHelp] = React.useState<boolean>(false);

  // Recording refs
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const micStreamRef = React.useRef<MediaStream | null>(null);
  const chunksRef = React.useRef<Blob[]>([]);
  const timerIntervalRef = React.useRef<any>(null);

  // Formatter for recorded seconds
  const formatTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Clean up recording structures on unmount
  React.useEffect(() => {
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
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

    } catch (downloadErr: any) {
      console.error("Lỗi khi kết xuất file tải xuống:", downloadErr);
      setErrorMessage(`Lỗi lưu video file: ${downloadErr.message}`);
    }
  };

  // Stop current active screen recording
  const handleStopRecording = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(track => track.stop());
      micStreamRef.current = null;
    }

    setIsRecording(false);
  };

  // Start screen and microphone recording
  const handleStartRecording = async () => {
    setErrorMessage(null);
    chunksRef.current = [];
    
    const resMap = {
      '480p': { width: 854, height: 480 },
      '720p': { width: 1280, height: 720 },
      '1080p': { width: 1920, height: 1080 }
    };
    const { width, height } = resMap[recordResolution];

    try {
      let micStream: MediaStream | null = null;
      if (includeMic) {
        try {
          micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          micStreamRef.current = micStream;
        } catch (micErr: any) {
          console.warn("Microphone access is denied, falling back:", micErr);
          setErrorMessage("Không chọn được Microphone ngoài (có thể chưa cắm hoặc chưa đồng ý cấp quyền). Hệ thống vẫn tiến hành quay video nhưng chỉ ghi âm thanh của máy tính.");
        }
      }

      // Display capture stream with optional preferCurrentTab parameter to bypass chrome blank list bug
      const displayConstraints: any = {
        video: {
          width: { ideal: width },
          height: { ideal: height },
          frameRate: { ideal: 30 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      };

      if (onlyCurrentTab) {
        displayConstraints.preferCurrentTab = true;
        displayConstraints.selfBrowserSurface = "include";
      }

      const displayStream = await (navigator.mediaDevices as any).getDisplayMedia(displayConstraints);
      streamRef.current = displayStream;

      // Make sure we stop everything if the system stops screen-record
      const videoTrack = displayStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.onended = () => {
          handleStopRecording();
        };
      }

      const combinedStream = new MediaStream();
      combinedStream.addTrack(videoTrack);

      try {
        const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
        const displayAudioTracks = displayStream.getAudioTracks();
        const micAudioTracks = includeMic && micStream ? micStream.getAudioTracks() : [];
        
        const hasDisplayAudio = displayAudioTracks.length > 0;
        const hasMicAudio = micAudioTracks.length > 0;

        if (AudioCtxClass && hasDisplayAudio && hasMicAudio) {
          // If we have BOTH systemic tab audio AND microphone, we must mix them using AudioContext
          const audioCtx = new AudioCtxClass();
          if (audioCtx.state === 'suspended') {
            await audioCtx.resume();
          }
          const dest = audioCtx.createMediaStreamDestination();
          
          // Connect tab audio source
          const displaySource = audioCtx.createMediaStreamSource(displayStream);
          displaySource.connect(dest);
          displaySource.connect(audioCtx.destination); // Route to speakers so the user can still hear in real-time

          // Connect microphone source
          const micSource = audioCtx.createMediaStreamSource(micStream!);
          micSource.connect(dest);

          // Use the mixed output track
          const mixedTrack = dest.stream.getAudioTracks()[0];
          combinedStream.addTrack(mixedTrack);
        } else {
          // Fallback: If only one audio stream is present, add it directly to bypass AudioContext limitations completely!
          if (hasDisplayAudio) {
            combinedStream.addTrack(displayAudioTracks[0]);
          } else if (hasMicAudio) {
            combinedStream.addTrack(micAudioTracks[0]);
          }
        }
      } catch (mixError) {
        console.warn("Audio Context coupling failed, falling back to basic stream direct tracks:", mixError);
        const displayAudioTracks = displayStream.getAudioTracks();
        const micAudioTracks = includeMic && micStream ? micStream.getAudioTracks() : [];
        if (displayAudioTracks.length > 0) {
          combinedStream.addTrack(displayAudioTracks[0]);
        } else if (micAudioTracks.length > 0) {
          combinedStream.addTrack(micAudioTracks[0]);
        }
      }

      // Determine best media type configuration
      let options = { mimeType: 'video/webm;codecs=vp9,opus' };
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options = { mimeType: 'video/webm;codecs=vp8,opus' };
      }
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options = { mimeType: 'video/webm' };
      }
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options = { mimeType: '' };
      }

      const recorder = new MediaRecorder(combinedStream, options);
      mediaRecorderRef.current = recorder;

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

    } catch (err: any) {
      console.error("Recording start error:", err);
      const isIframe = window.self !== window.top;
      if (isIframe && (err.name === 'SecurityError' || err.message?.toLowerCase().includes('iframe') || err.message?.toLowerCase().includes('sandboxed') || err.message?.toLowerCase().includes('permission'))) {
        setErrorMessage("LỖI BẢO MẬT IFRAME: Trình duyệt chặn chức năng quay màn hình từ bên trong khung xem thử của AI Studio. Vui lòng nhấn vào biểu tượng 'Mở tab mới' (Open in new tab) nằm ở góc phải phía trên trình duyệt của bạn để chạy ứng dụng độc lập bên ngoài, sau đó tính năng ghi hình sẽ hoạt động hoàn hảo!");
      } else if (err.name === 'NotAllowedError') {
        setErrorMessage("Bạn đã từ chối cấp quyền chia sẻ/ghi hình màn hình của trình duyệt.");
      } else {
        setErrorMessage(`Không thể chuẩn bị công cụ ghi: ${err.message || err.name}`);
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
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
        }
        if (mediaRecorderRef.current) {
          mediaRecorderRef.current.onstop = null;
          if (mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
          }
        }
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
        if (micStreamRef.current) {
          micStreamRef.current.getTracks().forEach(track => track.stop());
          micStreamRef.current = null;
        }
        setIsRecording(false);
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

  // Handle play/pause toggle
  const handlePlayPause = () => {
    if (playingState === 'playing') {
      onStop();
    } else {
      // Speak current active item or start first one
      onPlayItem(activeItem || speechList[0]);
    }
  };

  const isCurrentItemPlaying = playingItemId === activeItem?.id && playingState === 'playing';

  return (
    <div className="fixed inset-0 bg-slate-950 z-50 overflow-hidden flex flex-col md:flex-row font-sans text-slate-100">
      
      {/* LEFT SECTION: MAIN CINEMA STAGE & PLAYER SCREEN */}
      <div className="flex-1 flex flex-col h-full bg-slate-950 relative">
        
        {/* Header Ribbon bar */}
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

          {/* Middle Section: Screen Recording Controls */}
          <div className="relative flex items-center space-x-2">
            {isRecording ? (
              <div className="flex items-center space-x-1.5 sm:space-x-2.5 bg-rose-950/85 border border-rose-800 text-rose-200 px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl shadow-lg shadow-rose-950/20 text-xs font-semibold select-none">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                </span>
                <span className="font-mono font-bold tracking-wider text-[11px] sm:text-xs">REC {formatTime(recordingTimeSec)}</span>
                <span className="hidden sm:inline-block text-[10px] text-rose-300 border-l border-rose-800/60 pl-2">
                  Màn ({recordResolution}){includeMic ? " + Mic" : ""}
                </span>
                <button
                  onClick={handleStopRecording}
                  className="ml-1 sm:ml-2 px-2 py-0.5 sm:py-1 bg-rose-600 hover:bg-rose-700 active:bg-rose-850 text-white text-[10px] font-bold rounded-lg transition cursor-pointer"
                  title="Dừng ghi hình & tải video xuống máy"
                >
                  Dừng & Lưu
                </button>
              </div>
            ) : (
              <div className="relative">
                <button
                  onClick={() => setShowRecordConfig(!showRecordConfig)}
                  className={`flex items-center space-x-1 px-2.5 sm:px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer text-slate-200 hover:text-white ${
                    showRecordConfig 
                      ? 'bg-indigo-650 border border-indigo-500 text-white shadow-lg' 
                      : 'bg-slate-900 border border-slate-800 hover:bg-slate-850'
                  }`}
                  title="Tùy chọn ghi hình trình chiếu"
                >
                  <Video className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="text-[11px] sm:text-xs">Ghi Màn Hình</span>
                  <Sliders className="w-3 h-3 opacity-60 ml-px" />
                </button>

                {/* Popover Settings Dropdown Panel */}
                {showRecordConfig && (
                  <div className="absolute top-12 left-1/2 -translate-x-1/2 w-72 max-h-[calc(100vh-80px)] overflow-y-auto bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-2xl z-50 text-left font-sans text-slate-200 text-xs space-y-3.5 pb-5">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <span className="font-extrabold text-white text-sm flex items-center gap-1.5">
                        <Video className="w-4 h-4 text-indigo-400" />
                        Ghi Hình Chuỗi Học
                      </span>
                      <button 
                        onClick={() => setShowRecordConfig(false)}
                        className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Resolution Choice selection */}
                    <div className="space-y-1.5">
                      <label className="font-bold text-slate-300 block">Độ phân giải video:</label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {(['480p', '720p', '1080p'] as const).map((r) => (
                          <button
                            key={r}
                            onClick={() => setRecordResolution(r)}
                            className={`py-1 rounded-lg text-center font-mono font-bold border transition text-[11px] cursor-pointer ${
                              recordResolution === r
                                ? 'bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/10'
                                : 'bg-slate-950 border-slate-850 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                            }`}
                          >
                            {r}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Mic Toggle Switch section */}
                    <div className="flex items-center justify-between bg-slate-950/60 p-2.5 rounded-xl border border-slate-850">
                      <div className="space-y-0.5 pr-2">
                        <span className="font-bold text-slate-200 block flex items-center gap-1">
                          <Mic className="w-3.5 h-3.5 text-emerald-400" />
                          Ghi Microphone
                        </span>
                        <span className="text-[10px] text-slate-400 leading-tight block">
                          Ghi cả giọng đọc ngoài của bạn để đối chiếu.
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIncludeMic(!includeMic)}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                          includeMic ? 'bg-emerald-500' : 'bg-slate-800'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white transition duration-100 ease-in-out ${
                            includeMic ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Prefer Current Tab Toggle Switch */}
                    <div className="flex items-center justify-between bg-slate-950/60 p-2.5 rounded-xl border border-slate-850">
                      <div className="space-y-0.5 pr-2">
                        <span className="font-bold text-slate-200 block flex items-center gap-1">
                          <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                          Ưu tiên quay Thẻ này
                        </span>
                        <span className="text-[10px] text-slate-400 leading-tight block">
                          Tự động ghi hình thẻ hiện tại để tránh lỗi màn hình trắng trống danh sách của Edge/Chrome.
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setOnlyCurrentTab(!onlyCurrentTab)}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                          onlyCurrentTab ? 'bg-indigo-650' : 'bg-slate-800'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white transition duration-100 ease-in-out ${
                            onlyCurrentTab ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Quick helper Tip reminder - Collapsible to avoid squishing the recording button */}
                    <div className="text-[10px] text-slate-350 bg-slate-950/50 rounded-xl border border-slate-850/55 overflow-hidden transition-all duration-200">
                      <button
                        type="button"
                        onClick={() => setShowRecordingHelp(!showRecordingHelp)}
                        className="w-full flex items-center justify-between p-2.5 font-bold text-indigo-400 text-[11px] hover:bg-slate-950/80 transition cursor-pointer"
                      >
                        <div className="flex items-center gap-1.5">
                          <HelpCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>Mẹo âm thanh & Cách sửa lỗi</span>
                        </div>
                        <span className="text-slate-500 font-mono text-[9px] shrink-0">
                          {showRecordingHelp ? "ẨN ▲" : "XEM ▼"}
                        </span>
                      </button>
                      
                      {showRecordingHelp && (
                        <ul className="list-disc pl-5 pr-3 pb-3 space-y-1.5 text-slate-400 text-[10px] border-t border-slate-850/50 pt-2 bg-slate-950/20">
                          <li>
                            <strong>Tránh màn hình trắng:</strong> Nên giữ bật <em>"Ưu tiên quay Thẻ này"</em>. Khi hộp thoại Chrome hiện, chỉ cần click nút <strong>Chia sẻ</strong>.
                          </li>
                          <li>
                            <strong>Bật âm thanh:</strong> Hãy tích chọn <u>"Đồng thời chia sẻ âm thanh của thẻ"</u> (Also share tab audio) ở góc dưới hộp thoại trình duyệt.
                          </li>
                          <li>
                            <strong>Lưu ý Browser TTS:</strong> Giọng đọc mặc định trình duyệt phát qua loa ngoài máy tính độc lập. Vì vậy, để thu được tiếng, bạn <strong>bắt buộc phải bật nút "Ghi Microphone"</strong> phía trên.
                          </li>
                          <li>
                            <strong>Dành cho Premium AI (Gemini):</strong> Hệ thống tự động thu âm thanh trực tiếp cực chuẩn, không cần dùng Microphone!
                          </li>
                        </ul>
                      )}
                    </div>

                    {/* Main action triggers */}
                    <button
                      onClick={handleStartRecording}
                      className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-indigo-650/10 flex items-center justify-center gap-1.5 transition cursor-pointer hover:scale-[1.02] active:scale-95"
                    >
                      <Circle className="w-3 h-3 fill-rose-500 text-rose-500 animate-pulse bg-transparent rounded-full" />
                      Bắt đầu Ghi hình
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <button
            onClick={handleCloseClick}
            className="flex items-center space-x-1 px-3 py-1.5 bg-slate-900 border border-slate-800 hover:bg-rose-950 hover:border-rose-900 rounded-xl text-xs font-bold text-slate-300 transition cursor-pointer shrink-0"
            title="Thoát chế độ rạp chiếu phim"
          >
            <X className="w-4 h-4 text-rose-500" />
            <span className="hidden sm:inline">Thoát Rạp Chiếu</span>
          </button>
        </div>

        {/* Error notification banner */}
        {errorMessage && (
          <div className="mx-4 mt-3 bg-red-950/60 border border-red-800 text-red-200 px-4 py-3 rounded-2xl text-xs space-y-1 relative select-text z-40 shadow-lg">
            <div className="font-extrabold flex items-center gap-1.5 text-red-300">
              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
              <span>Gợi ý xử lý ghi hình màn hình</span>
              <button 
                onClick={() => setErrorMessage(null)}
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
                      {waitingState.isWaiting ? (
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

          </div>
        </div>

        {/* BOTTOM INTEGRATED CONTROLS PARAMETERS ROW */}
        <div className="px-5 py-4 bg-slate-950 border-t border-slate-900 flex flex-col space-y-4 z-20">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Control Group 1: Navigation keys */}
            <div className="flex items-center space-x-3 justify-center sm:justify-start">
              <button
                onClick={handlePrev}
                disabled={speechList.length <= 1}
                className="p-2.5 bg-slate-900 border border-slate-850 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                title="Quay lại câu trước"
              >
                <SkipBack className="w-4 h-4 fill-current" />
              </button>

              <button
                onClick={handlePlayPause}
                disabled={speechList.length === 0}
                className={`p-4 rounded-full flex items-center justify-center transition-all ${
                  isCurrentItemPlaying
                    ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/10'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/10'
                } cursor-pointer`}
                title={isCurrentItemPlaying ? "Tạm ngưng giọng đọc" : "Bắt đầu phát âm"}
              >
                {isCurrentItemPlaying ? (
                  <Pause className="w-5 h-5 fill-current" />
                ) : (
                  <Play className="w-5 h-5 fill-current ml-0.5" />
                )}
              </button>

              <button
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

      </div>

      {/* RIGHT SIDEBAR: EXQUISITE PLAYLIST COLUMN */}
      <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-slate-900 bg-slate-900 overflow-y-auto shrink-0 flex flex-col h-1/3 md:h-full z-30">
        
        {/* Playlist Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-900 flex items-center justify-between shrink-0">
          <div className="text-left">
            <h3 className="font-extrabold text-sm text-white">Danh Sách Câu Huấn Luyện</h3>
            <p className="text-[10px] text-slate-400 mt-1">Phát lần lượt từ trên xuống dưới</p>
          </div>
          <span className="text-[11px] font-bold text-indigo-400 bg-indigo-950 border border-indigo-900 px-2 py-0.5 rounded-full uppercase">
            {speechList.length} Câu
          </span>
        </div>

        {/* Scrollable listing */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
          {speechList.map((item, idx) => {
            const isPlaying = playingItemId === item.id;
            const itemImageUrl = (useUniversalImage && universalImageUrl) ? universalImageUrl : item.imageUrl;
            const hasCover = !!itemImageUrl;

            return (
              <button
                key={item.id}
                onClick={() => onPlayItem(item)}
                className={`w-full text-left p-2 rounded-xl transition flex items-center gap-3 border ${
                  isPlaying
                    ? 'bg-indigo-950/60 border-indigo-500/80 ring-1 ring-indigo-500'
                    : 'bg-slate-950/40 border-slate-900 hover:bg-slate-900/50 hover:border-slate-800'
                } cursor-pointer group`}
              >
                {/* Image Thumb Thumbnail */}
                <div className="w-11 h-11 rounded-lg bg-slate-800 border border-slate-700 overflow-hidden shrink-0 flex items-center justify-center relative shadow-3xs">
                  {hasCover ? (
                    <img
                      src={itemImageUrl}
                      alt="cover thumbnail"
                      className="w-full h-full object-cover transition group-hover:scale-105"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    /* Default Blue frame */
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-indigo-950 flex items-center justify-center">
                      <span className="text-[10px] font-mono font-extrabold text-white/90">
                        {idx + 1}
                      </span>
                    </div>
                  )}
                  {isPlaying && (
                    <div className="absolute inset-0 bg-indigo-950/65 flex items-center justify-center">
                      <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
                    </div>
                  )}
                </div>

                {/* Subtitle wording detail */}
                <div className="min-w-0 flex-1 text-left">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[9px] font-mono font-bold text-slate-500 group-hover:text-slate-400">
                      CÂU {idx + 1}
                    </span>
                    <span className={`text-[9px] font-extrabold rounded px-1 ${
                      item.resolvedLang === 'vi' 
                        ? 'bg-rose-950 border border-rose-900 text-rose-300' 
                        : 'bg-indigo-950 border border-indigo-900 text-indigo-300'
                    }`}>
                      {item.resolvedLang === 'vi' ? '🇻🇳 VI' : '🇺🇸 EN'}
                    </span>
                  </div>
                  <p className={`text-xs mt-1 font-semibold truncate leading-tight ${
                    isPlaying ? 'text-indigo-200' : 'text-slate-300 group-hover:text-white'
                  }`}>
                    {item.text}
                  </p>
                </div>

                {/* Active Indicator Wave */}
                {isPlaying && (
                  <div className="flex items-end space-x-0.5 h-3 shrink-0 pr-1 select-none animate-pulse">
                    <span className="w-0.5 h-2.5 bg-indigo-400 rounded-full animate-[bounce_0.8s_infinite] delay-100"></span>
                    <span className="w-0.5 h-1.5 bg-indigo-400 rounded-full animate-[bounce_0.8s_infinite] delay-300"></span>
                    <span className="w-0.5 h-3 bg-indigo-400 rounded-full animate-[bounce_0.8s_infinite] delay-0"></span>
                  </div>
                )}
              </button>
            );
          })}
        </div>

      </div>

    </div>
  );
}
