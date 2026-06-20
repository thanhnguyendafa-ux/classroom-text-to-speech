import React, { useState, useEffect, useRef } from 'react';
import { 
  Volume2, 
  VolumeX, 
  Trash2, 
  Plus, 
  X, 
  Check, 
  Sliders, 
  Sparkles, 
  BookOpen, 
  Play, 
  RotateCcw,
  Edit2,
  Trash,
  Info,
  HelpCircle,
  FileText,
  GripVertical,
  Repeat,
  ArrowRight,
  Settings,
  HelpCircle as QuestionIcon,
  Mic,
  Monitor,
  Key,
  Eye,
  EyeOff,
  Link,
  Unlink,
  Copy,
  Download,
  Upload,
  Share2,
  Image as ImageIcon,
  Search,
  Radio
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SpeechItem, LanguageCode } from './types';
import { useGeminiApiKey } from './features/premium-tts/useGeminiApiKey';
import { usePremiumTts } from './features/premium-tts/usePremiumTts';
import { getPremiumVoiceForLang } from './features/premium-tts/premiumVoices';
import { usePremiumVoiceSettings } from './features/premium-tts/usePremiumVoiceSettings';
import ImageSearchModal from './components/ImageSearchModal';
import TheaterPlayer from './components/TheaterPlayer';
import ShareModal from './components/ShareModal';
import LessonLibrary from './components/LessonLibrary';
import AudioExportModal from './components/AudioExportModal';
import { SpeechSettingsPanel } from './components/SpeechSettingsPanel';
import { LessonInputPanel, TEMPLATES } from './components/LessonInputPanel';
import { PlaybackController } from './components/PlaybackController';
import { SpeechListBoard } from './components/SpeechListBoard';


// Helper regex to detect language characters
const JAPANESE_CHARACTER_REGEX = /[\u3040-\u309F\u30A0-\u30FF]/;
const KOREAN_CHARACTER_REGEX = /[\uAC00-\uD7A3\u1100-\u11FF\u3130-\u318F]/;
const CHINESE_TRADITIONAL_UNIQUE_CHARS = /[體廣門見劃設對華遷萬國學會東億個開鳳龍聽擊買賣車愛東漢義鋸齒靈丽響讓觀認邊發變禮藝]/;
const CHINESE_CHARACTER_REGEX = /[\u4E00-\u9FFF]/;
const VIETNAMESE_DIACRITICS_REGEX = /[àáảãạâầấẩẫậăằắẳẵặèéẻẽẹêềếểễệđìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵĂÂÊÔƠƯĐ]/i;

export default function App() {
  const [rawText, setRawText] = useState<string>(
    'popcorn\nbắp rang\ndelicious popcorn\nbắp rang ngon lành\nI love eating delicious popcorn. /1.5\nMình rất thích ăn bắp rang ngon lành.\nsharing popcorn\nchia sẻ bắp rang\nWe are sharing popcorn while watching a movie. ;2\nChúng mình đang chung nhau ăn bắp rang khi xem phim.'
  );
  
  const [speechList, setSpeechList] = useState<SpeechItem[]>([]);
  const [speed, setSpeed] = useState<number>(1.0);

  // Image & Theater Mode States
  const [isTheaterMode, setIsTheaterMode] = useState<boolean>(false);
  const [isImageSearchModalOpen, setIsImageSearchModalOpen] = useState<boolean>(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
  const [isAudioExportModalOpen, setIsAudioExportModalOpen] = useState<boolean>(false);
  const [selectedItemForImageSearch, setSelectedItemForImageSearch] = useState<SpeechItem | null>(null);
  const [volume, setVolume] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('speechVolume');
      return saved !== null ? parseFloat(saved) : 1.0;
    }
    return 1.0;
  });
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  
  // Custom preferred voices
  const [selectedEnVoiceName, setSelectedEnVoiceName] = useState<string>('');
  const [selectedViVoiceName, setSelectedViVoiceName] = useState<string>('');
  const [selectedZhCnVoiceName, setSelectedZhCnVoiceName] = useState<string>('');
  const [selectedZhTwVoiceName, setSelectedZhTwVoiceName] = useState<string>('');
  const [selectedJaVoiceName, setSelectedJaVoiceName] = useState<string>('');
  const [selectedKoVoiceName, setSelectedKoVoiceName] = useState<string>('');

  // Engine Mode: 'browser' (native speech) vs 'premium' (Gemini AI TTS)
  const [engineMode, setEngineMode] = useState<'browser' | 'premium'>('browser');
  
  const {
    selectedPremiumVoiceEn,
    setSelectedPremiumVoiceEn,
    selectedPremiumVoiceVi,
    setSelectedPremiumVoiceVi,
    selectedPremiumVoiceZhCn,
    setSelectedPremiumVoiceZhCn,
    selectedPremiumVoiceZhTw,
    setSelectedPremiumVoiceZhTw,
    selectedPremiumVoiceJa,
    setSelectedPremiumVoiceJa,
    selectedPremiumVoiceKo,
    setSelectedPremiumVoiceKo,
    onVoiceChange,
  } = usePremiumVoiceSettings();

  const selectedPremiumVoices = {
    en: selectedPremiumVoiceEn,
    vi: selectedPremiumVoiceVi,
    'zh-cn': selectedPremiumVoiceZhCn,
    'zh-tw': selectedPremiumVoiceZhTw,
    ja: selectedPremiumVoiceJa,
    ko: selectedPremiumVoiceKo,
  };

  const premiumVoiceSettings = {
    selectedPremiumVoiceEn,
    selectedPremiumVoiceVi,
    selectedPremiumVoiceZhCn,
    selectedPremiumVoiceZhTw,
    selectedPremiumVoiceJa,
    selectedPremiumVoiceKo,
  };
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<any>(null);
  const lastNodesRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const clearWebAudioNodes = () => {
    if (lastNodesRef.current) {
      try {
        lastNodesRef.current.source.disconnect();
        lastNodesRef.current.gain.disconnect();
      } catch (e) {
        console.error("Lỗi khi giải phóng Web Audio:", e);
      }
      lastNodesRef.current = null;
    }
  };
  
  // Active playing item tracker
  const [playingItemId, setPlayingItemId] = useState<string | null>(null);
  const [playingState, setPlayingState] = useState<'idle' | 'playing' | 'paused'>('idle');
  const [currentRepeatIndex, setCurrentRepeatIndex] = useState<number>(0);
  
  // Visual Countdown timer state for pauses between repetitions & lines (ideal for dictation)
  const [waitingState, setWaitingState] = useState<{ isWaiting: boolean; remainingSec: number; itemId: string | null; type: 'repeat' | 'advance' | null }>({
    isWaiting: false,
    remainingSec: 0,
    itemId: null,
    type: null
  });
  const waitTimerRef = useRef<any>(null);
  const waitIntervalRef = useRef<any>(null);

  // Manual pause, resume and stop states
  const [isManualPaused, setIsManualPaused] = useState<boolean>(false);
  const isSpeechSynthesisPausedRef = useRef<boolean>(false);
  const isPremiumAudioPausedRef = useRef<boolean>(false);
  const pausedCountdownSecRef = useRef<number>(0);
  const pausedCountdownTypeRef = useRef<'repeat' | 'advance' | null>(null);
  const pausedCountdownItemIdRef = useRef<string | null>(null);
  const resumeCallbackRef = useRef<(() => void) | null>(null);

  const clearWaitTimers = () => {
    if (waitTimerRef.current) {
      clearTimeout(waitTimerRef.current);
      waitTimerRef.current = null;
    }
    if (waitIntervalRef.current) {
      clearInterval(waitIntervalRef.current);
      waitIntervalRef.current = null;
    }
    setWaitingState({ isWaiting: false, remainingSec: 0, itemId: null, type: null });
  };

  const startCountdown = (sec: number, type: 'repeat' | 'advance', onComplete: () => void, itemId: string) => {
    clearWaitTimers();
    if (sec <= 0) {
      onComplete();
      return;
    }

    // Capture completion callback for pausing
    resumeCallbackRef.current = onComplete;

    setWaitingState({ isWaiting: true, remainingSec: sec, itemId, type });

    const intervalTime = 100; // Update ticker every 100ms
    const totalTicks = Math.round(sec * 10);
    let ticksElapsed = 0;

    waitIntervalRef.current = setInterval(() => {
      ticksElapsed++;
      const left = Math.max(0, sec - (ticksElapsed / 10));
      setWaitingState(prev => {
        if (prev.itemId === itemId) {
          return { ...prev, remainingSec: parseFloat(left.toFixed(1)) };
        }
        return prev;
      });

      if (ticksElapsed >= totalTicks) {
        clearInterval(waitIntervalRef.current);
        waitIntervalRef.current = null;
      }
    }, intervalTime);

    waitTimerRef.current = setTimeout(() => {
      clearWaitTimers();
      if (resumeCallbackRef.current) {
        const cb = resumeCallbackRef.current;
        resumeCallbackRef.current = null;
        cb();
      }
    }, sec * 1000);
  };

  // HTML5 Drag and Drop states
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Auto progression configuration
  const [autoAdvance, setAutoAdvance] = useState<boolean>(true);
  const [autoGroupSet, setAutoGroupSet] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('autoGroupSet') === 'true';
    }
    return false;
  });

  const handleAutoGroupSetChange = (checked: boolean) => {
    setAutoGroupSet(checked);
    if (typeof window !== 'undefined') {
      localStorage.setItem('autoGroupSet', String(checked));
    }
  };

  const [setMultiplier, setSetMultiplier] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const val = localStorage.getItem('setMultiplier');
      return val ? parseInt(val, 10) : 1;
    }
    return 1;
  });

  const handleSetMultiplierChange = (val: number) => {
    setSetMultiplier(val);
    if (typeof window !== 'undefined') {
      localStorage.setItem('setMultiplier', String(val));
    }
  };

  const [copiedPrompt, setCopiedPrompt] = useState<boolean>(false);
  const [promptTopic, setPromptTopic] = useState<string>('Giao tiếp Tiếng Anh hàng ngày');
  const [promptType, setPromptType] = useState<'basic' | 'repeat' | 'pause' | 'advanced'>('advanced');

  const getDynamicGPTPrompt = () => {
    const topicText = promptTopic.trim() || 'Giao tiếp Tiếng Anh hàng ngày';
    switch (promptType) {
      case 'basic':
        return `Hãy đóng vai một giáo viên ngoại ngữ soạn giáo án song ngữ đạt chuẩn. Hãy tạo cho tôi danh sách từ vựng/mẫu câu theo chủ đề song ngữ ANH - VIỆT (tiếng Anh lẻ, tiếng Việt chẵn) dùng để nạp vào ứng dụng luyện nghe nói.

Chủ đề bài học: ${topicText}

Yêu cầu định dạng nghiêm ngặt:
1. Danh sách gồm các cặp dòng xen kẽ: Dòng tiếng Anh lẻ (1, 3, 5,...) và Dòng tiếng Việt chẵn (2, 4, 6,...).
2. Viết liền nhau hoàn toàn, không có dòng trống ở giữa các cặp và dòng kế tiếp.
3. Mỗi cặp tiếng Anh - tiếng Việt là một đơn vị bài học.
4. KHÔNG sử dụng bất kỳ ký tự phân tách đặc biệt nào khác (không có ";" và không có "/").

Hãy soạn bài học gồm khoảng 10-15 dòng (5-8 cặp) phản ánh sự phát triển từ Từ đơn -> Cụm từ -> Câu hoàn chỉnh (Ví dụ: từ "popcorn" đến cụm từ "delicious popcorn" rồi sang câu hoàn chỉnh "I love eating delicious popcorn") liên quan đến chủ đề trên. Định dạng đầu ra chỉ chứa danh sách dòng chữ thô như cấu trúc mẫu dưới đây, không cần tiêu đề hay giải thích thêm:
popcorn
bắp rang
delicious popcorn
bắp rang ngon lành
I love eating delicious popcorn.
Mời rất thích ăn bắp rang ngon lành.`;

      case 'repeat':
        return `Hãy đóng vai một giáo viên ngoại ngữ soạn giáo án song ngữ đạt chuẩn. Hãy tạo cho tôi danh sách từ vựng/mẫu câu theo chủ đề song ngữ ANH - VIỆT (tiếng Anh lẻ, tiếng Việt chẵn) dùng để nạp vào ứng dụng luyện nghe nói có tùy chỉnh tần suất lặp lại.

Chủ đề bài học: ${topicText}

Yêu cầu định dạng nghiêm ngặt:
1. Danh sách gồm các cặp dòng xen kẽ: Dòng tiếng Anh lẻ (1, 3, 5,...) và Dòng tiếng Việt chẵn (2, 4, 6,...).
2. Viết liền nhau hoàn toàn, không có dòng trống ở giữa.
3. Ở cuối câu của dòng tiếng Anh lẻ, hãy kèm ký tự ";X" (với X là số lần lặp đọc lại của câu đó, ví dụ: ';2' hoặc ';3' tùy thuộc độ dài hoặc độ khó của mẫu từ/câu để học viên nhại lại nhiều lần).
4. KHÔNG dùng ký tự gạch chéo "/" để chia khoảng nghỉ.

Hãy soạn bài học gồm khoảng 10-15 dòng (5-8 cặp) phản ánh sự phát triển từ Từ đơn -> Cụm từ -> Câu hoàn chỉnh liên quan đến chủ đề trên. Định dạng đầu ra chỉ chứa danh sách dòng chữ thô như cấu trúc mẫu dưới đây, không cần tiêu đề hay giải thích thêm:
popcorn ;3
bắp rang
delicious popcorn ;2
bắp rang ngon lành
I love eating delicious popcorn. ;3
Mời rất thích ăn bắp rang ngon lành.`;

      case 'pause':
        return `Hãy đóng vai một giáo viên ngoại ngữ soạn giáo án song ngữ đạt chuẩn. Hãy tạo cho tôi danh sách từ vựng/mẫu câu theo chủ đề song ngữ ANH - VIỆT (tiếng Anh lẻ, tiếng Việt chẵn) dùng để nạp vào ứng dụng luyện nghe nói có tùy chỉnh giãn cách nghỉ.

Chủ đề bài học: ${topicText}

Yêu cầu định dạng nghiêm ngặt:
1. Danh sách gồm các cặp dòng xen kẽ: Dòng tiếng Anh lẻ (1, 3, 5,...) và Dòng tiếng Việt chẵn (2, 4, 6,...).
2. Viết liền nhau hoàn toàn, không được để trống dòng ở giữa.
3. Ở cuối câu của dòng tiếng Anh lẻ hoặc dòng tiếng Việt chẵn, hãy kèm ký tự "/Y" (với Y là thời gian chờ tính bằng giây để người học kịp đọc theo/phản xạ trước khi ứng dụng tự động chuyển câu kế tiếp, ví dụ: '/1.5' hoặc '/4' tùy ý bạn thiết kế phù hợp).
4. KHÔNG dùng dấu chấm phẩy ";" để chỉ định số lặp lại.

Hãy soạn bài học gồm khoảng 10-15 dòng (5-8 cặp) phản ánh sự phát triển từ Từ đơn -> Cụm từ -> Câu hoàn chỉnh liên quan đến chủ đề trên. Định dạng đầu ra chỉ chứa danh sách dòng chữ thô như cấu trúc mẫu dưới đây, không cần tiêu đề hay giải thích thêm:
popcorn
bắp rang
delicious popcorn
bắp rang ngon lành /2
I love eating delicious popcorn. /3
Mời rất thích ăn bắp rang ngon lành.`;

      case 'advanced':
      default:
        return `Hãy đóng vai một giáo viên ngoại ngữ soạn giáo án song ngữ đạt chuẩn. Hãy tạo cho tôi danh sách từ vựng/mẫu câu theo chủ đề song ngữ ANH - VIỆT (tiếng Anh lẻ, tiếng Việt chẵn) dùng để nạp vào ứng dụng luyện nghe nói có tùy biến nâng cao (cả tần suất lặp lẫn thời gian nghỉ).

Chủ đề bài học: ${topicText}

Yêu cầu định dạng nghiêm ngặt:
1. Danh sách gồm các cặp dòng xen kẽ: Dòng tiếng Anh lẻ (1, 3, 5,...) và Dòng tiếng Việt chẵn (2, 4, 6,...).
2. Viết liền nhau hoàn toàn, không được để trống dòng ở giữa.
3. Cho phép gộp cả hai tham số nâng cao:
   - Thêm ';X' ở cuối câu để chỉ định số lần lặp đọc lại (ví dụ ';2' hoặc ';3').
   - Thêm '/Y' ở cuối câu để chỉ định số giây nghỉ giải lao sau câu đó (ví dụ '/1.5' hoặc '/4').
   - Bạn có thể đặt cả hai cùng lúc thành ';X /Y' tùy thích.

Hãy soạn bài học gồm khoảng 10-15 dòng (5-8 cặp) phản ánh sự phát triển từ Từ đơn -> Cụm từ -> Câu hoàn chỉnh liên quan đến chủ đề trên. Định dạng đầu ra chỉ chứa danh sách dòng chữ thô như cấu trúc mẫu dưới đây, không cần tiêu đề hay giải thích thêm:
popcorn ;3 /4
bắp rang
delicious popcorn
bắp rang ngon lành /1.5
I love eating delicious popcorn. ;2 /3
Mời rất thích ăn bắp rang ngon lành.`;
    }
  };

  const handleCopyGPTPrompt = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(getDynamicGPTPrompt()).then(() => {
        setCopiedPrompt(true);
        setTimeout(() => setCopiedPrompt(false), 2055);
      }).catch(err => {
        console.error("Failed to copy GPT Prompt:", err);
      });
    }
  };

  const [useUniversalImage, setUseUniversalImage] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('useUniversalImage') === 'true';
    }
    return false;
  });

  const [universalImageUrl, setUniversalImageUrl] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('universalImageUrl') || '';
    }
    return '';
  });

  const [isSearchingUniversalImage, setIsSearchingUniversalImage] = useState<boolean>(false);

  const handleUseUniversalImageChange = (checked: boolean) => {
    setUseUniversalImage(checked);
    if (typeof window !== 'undefined') {
      localStorage.setItem('useUniversalImage', String(checked));
    }
  };

  const handleUniversalImageUrlChange = (url: string) => {
    setUniversalImageUrl(url);
    if (typeof window !== 'undefined') {
      localStorage.setItem('universalImageUrl', url);
    }
  };

  const [timeBetweenLines, setTimeBetweenLines] = useState<number>(2.0); // Default pause time in seconds
  const [playlistLoopMode, setPlaylistLoopMode] = useState<'once' | 'infinite'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('playlistLoopMode');
      return (saved === 'infinite' || saved === 'once') ? saved : 'once';
    }
    return 'once';
  });

  const handlePlaylistLoopModeChange = (mode: 'once' | 'infinite') => {
    setPlaylistLoopMode(mode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('playlistLoopMode', mode);
    }
  };

  // Inline editing row state
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState<string>('');

  // Quick addition line form
  const [newRowText, setNewRowText] = useState<string>('');
  const [newRowLang, setNewRowLang] = useState<LanguageCode | 'auto'>('auto');
  const [newRowRepeats, setNewRowRepeats] = useState<number>(1);
  const [newRowDelay, setNewRowDelay] = useState<number>(2.0);

  // Layout mode for the speech item rows
  const [rowLayoutMode, setRowLayoutMode] = useState<'below' | 'side'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('rowLayoutMode');
      return (saved === 'side' || saved === 'below') ? saved : 'below';
    }
    return 'below';
  });

  const toggleRowLayoutMode = (mode: 'below' | 'side') => {
    setRowLayoutMode(mode);
    localStorage.setItem('rowLayoutMode', mode);
  };

  // User-supplied Gemini API Key and Premium engine hook
  const {
    apiKey: userGeminiApiKey,
    showApiKey,
    setShowApiKey,
    setApiKey: handleApiKeyChange,
    clearApiKey,
  } = useGeminiApiKey();

  const { generateTts } = usePremiumTts();

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    if (typeof window !== 'undefined') {
      localStorage.setItem('speechVolume', String(newVolume));
    }
  };

  // Keep references to avoid browser closure or garbage collection issues
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const activePlayingIdRef = useRef<string | null>(null);
  const speechListRef = useRef<SpeechItem[]>([]);
  
  // Track mutable list to avoid closure locking in async timers
  useEffect(() => {
    speechListRef.current = speechList;
  }, [speechList]);

  // Load browser speech synthesis voices
  useEffect(() => {
    const fetchVoices = () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        const availableVoices = window.speechSynthesis.getVoices();
        setVoices(availableVoices);

        // Auto selection strategy for Vietnamese / English defaults
        if (availableVoices.length > 0) {
          // Check for Chrome or native US voice
          const enVoice = availableVoices.find(v => v.lang.includes('en-US')) || 
                          availableVoices.find(v => v.lang.startsWith('en'));
          if (enVoice && !selectedEnVoiceName) {
            setSelectedEnVoiceName(enVoice.name);
          }

          // Check for native Vietnamese voice
          const viVoice = availableVoices.find(v => v.lang.includes('vi-VN')) || 
                          availableVoices.find(v => v.lang.startsWith('vi'));
          if (viVoice && !selectedViVoiceName) {
            setSelectedViVoiceName(viVoice.name);
          }

          // Check for Chinese Simplified voice
          const zhCnVoice = availableVoices.find(v => v.lang.toLowerCase().replace('_', '-').startsWith('zh-cn') || v.lang.toLowerCase().replace('_', '-').startsWith('zh-chs')) ||
                            availableVoices.find(v => v.lang.toLowerCase().startsWith('zh'));
          if (zhCnVoice && !selectedZhCnVoiceName) {
            setSelectedZhCnVoiceName(zhCnVoice.name);
          }

          // Check for Chinese Traditional voice
          const zhTwVoice = availableVoices.find(v => v.lang.toLowerCase().replace('_', '-').startsWith('zh-tw') || v.lang.toLowerCase().replace('_', '-').startsWith('zh-hk') || v.lang.toLowerCase().replace('_', '-').startsWith('zh-cht'));
          if (zhTwVoice && !selectedZhTwVoiceName) {
            setSelectedZhTwVoiceName(zhTwVoice.name);
          }

          // Check for Japanese voice
          const jaVoice = availableVoices.find(v => v.lang.toLowerCase().startsWith('ja'));
          if (jaVoice && !selectedJaVoiceName) {
            setSelectedJaVoiceName(jaVoice.name);
          }

          // Check for Korean voice
          const koVoice = availableVoices.find(v => v.lang.toLowerCase().startsWith('ko'));
          if (koVoice && !selectedKoVoiceName) {
            setSelectedKoVoiceName(koVoice.name);
          }
        }
      }
    };

    fetchVoices();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = fetchVoices;
    }
  }, [
    selectedEnVoiceName, 
    selectedViVoiceName, 
    selectedZhCnVoiceName, 
    selectedZhTwVoiceName, 
    selectedJaVoiceName, 
    selectedKoVoiceName
  ]);

  // Clean speech when active item finishes or component unmounts
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const [shareLoading, setShareLoading] = useState<boolean>(false);

  // Load shared playlist configurations on app mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const shareId = params.get('share');
    if (!shareId) {
      // Auto-create initial playlist with the default raw text
      handleCreateList();
      return;
    }

    const loadSharedPlaylist = async () => {
      setShareLoading(true);
      try {
        const res = await fetch(`/api/share-playlist/${shareId}`);
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "Không thể tìm thấy liên kết chia sẻ.");
        }
        const data = await res.json();
        
        // Populate state values
        if (Array.isArray(data.speechList)) {
          setSpeechList(data.speechList);
          setRawText(data.speechList.map((item: any) => item.text).join('\n'));
        }
        if (typeof data.speed === 'number') {
          setSpeed(data.speed);
        }
        if (typeof data.volume === 'number') {
          setVolume(data.volume);
        }
        if (typeof data.autoAdvance === 'boolean') {
          setAutoAdvance(data.autoAdvance);
        }
        if (typeof data.timeBetweenLines === 'number') {
          setTimeBetweenLines(data.timeBetweenLines);
        }
        if (data.playlistLoopMode === 'once' || data.playlistLoopMode === 'infinite') {
          handlePlaylistLoopModeChange(data.playlistLoopMode);
        }
        if (data.engineMode === 'browser' || data.engineMode === 'premium') {
          setEngineMode(data.engineMode);
        }

        // Clean the address bar parameters perfectly without full-reloading
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);

        // Alert user
        alert("🎉 Đã tải thành công chuỗi bài học luyện tiếng được chia sẻ công khai!");
      } catch (err: any) {
        console.error("Shared playlist loading error:", err);
        alert(`Không thể tải bài tập chia sẻ: ${err.message || "Rất tiếc, đã có lỗi xảy ra."}`);
      } finally {
        setShareLoading(false);
      }
    };

    loadSharedPlaylist();
  }, []);

  // Helper to assign cover images dynamically
  const handleAssignImage = (imageUrl: string) => {
    if (isSearchingUniversalImage) {
      handleUniversalImageUrlChange(imageUrl);
      setIsSearchingUniversalImage(false);
      setSelectedItemForImageSearch(null);
      return;
    }
    if (!selectedItemForImageSearch) return;
    setSpeechList(prev => prev.map(item => {
      if (item.id === selectedItemForImageSearch.id) {
        return { ...item, imageUrl };
      }
      return item;
    }));
    setSelectedItemForImageSearch(null);
  };

  const handleClearImage = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSpeechList(prev => prev.map(item => {
      if (item.id === id) {
        const { imageUrl, ...rest } = item;
        return rest;
      }
      return item;
    }));
  };

  // Export speechList to portable JSON file
  const handleExportData = () => {
    if (speechList.length === 0) {
      alert("Danh sách câu đang trống, không có gì để xuất.");
      return;
    }
    try {
      const dataStr = JSON.stringify({
        version: "classroom-speech-v1",
        exportedAt: new Date().toISOString(),
        items: speechList
      }, null, 2);
      
      const blob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      
      // Create a nice file name based on local date
      const dateStr = new Date().toLocaleDateString('vi-VN').replace(/\//g, '-');
      link.download = `giao-an-luyen-phat-am-${dateStr}.json`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("Xuất dữ liệu thất bại. Có lỗi xảy ra.");
    }
  };

  // Import speechList from chosen JSON file
  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const fileContent = event.target?.result as string;
        const parsed = JSON.parse(fileContent);

        // Try validation
        let itemsToImport: SpeechItem[] = [];
        if (Array.isArray(parsed)) {
          // If the exported file was just a raw array
          itemsToImport = parsed;
        } else if (parsed && Array.isArray(parsed.items)) {
          // If the exported file is wrapped in our metadata format
          itemsToImport = parsed.items;
        } else {
          throw new Error("Định dạng file không chính thức hoặc bị hỏng.");
        }

        if (itemsToImport.length === 0) {
          alert("File rỗng hoặc không chứa câu thoại hợp lệ.");
          return;
        }

        // Clean & sanitize items (assign new random IDs if they are duplicate or missing to avoid React key conflicts)
        const sanitizedItems: SpeechItem[] = itemsToImport.map(item => {
          const detected = item.detectedLang || handleDetectLanguage(item.text || "");
          const selected = item.selectedLang || "auto";
          const resolved = item.resolvedLang || (selected === 'auto' ? detected : selected);
          return {
            id: item.id || `row-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            text: item.text || "",
            detectedLang: detected,
            selectedLang: selected,
            resolvedLang: resolved,
            repeats: typeof item.repeats === 'number' ? item.repeats : 1,
            delaySec: typeof item.delaySec === 'number' ? item.delaySec : 2,
            speed: typeof item.speed === 'number' ? item.speed : 1.0,
            setId: item.setId || undefined,
            imageUrl: item.imageUrl || undefined
          };
        });

        setSpeechList(sanitizedItems);
        
        // Also update the raw text area with the imported texts for display synchronization
        const rawImportText = sanitizedItems.map(it => it.text).join('\n');
        setRawText(rawImportText);

        alert(`Nhập thành công ${sanitizedItems.length} câu thoại từ file backup! Tất cả thiết lập, thời gian chờ nghỉ (delay), số lần lặp và hình ảnh gán sẵn đã được khôi phục nguyên vẹn.`);
      } catch (err: any) {
        console.error(err);
        alert(`Không thể đọc file: ${err.message || "Định dạng JSON không hợp lệ."}`);
      } finally {
        // Reset the file input so the user can import the same file again if desired
        if (e.target) {
          e.target.value = '';
        }
      }
    };
    reader.readAsText(file);
  };

  // Helper function to extract custom codes /seconds and ;repeats from text lines
  const parseLineSymbols = (
    rawLine: string,
    defaultRepeats: number = 1,
    defaultDelay: number = 2.0
  ) => {
    let cleanText = rawLine;
    let repeats = defaultRepeats;
    let delaySec = defaultDelay;

    // Pattern for /seconds (can be float or integer)
    const delayRegex = /\/\s*(\d+(?:\.\d+)?)\b/;
    const delayMatch = cleanText.match(delayRegex);
    if (delayMatch) {
      delaySec = parseFloat(delayMatch[1]);
      cleanText = cleanText.replace(delayRegex, '').trim();
    }

    // Pattern for ;repeats (integer)
    const repeatRegex = /;\s*(\d+)\b/;
    const repeatMatch = cleanText.match(repeatRegex);
    if (repeatMatch) {
      repeats = parseInt(repeatMatch[1], 10);
      cleanText = cleanText.replace(repeatRegex, '').trim();
    }

    // Clean extra whitespace resulting from stripping
    cleanText = cleanText.replace(/\s+/g, ' ').trim();

    return { cleanText, repeats, delaySec };
  };

  // Helper function to detect language of a given line
  const handleDetectLanguage = (line: string): LanguageCode => {
    const trimmed = line.trim();
    if (KOREAN_CHARACTER_REGEX.test(trimmed)) return 'ko';
    if (JAPANESE_CHARACTER_REGEX.test(trimmed)) return 'ja';
    if (CHINESE_CHARACTER_REGEX.test(trimmed)) {
      return CHINESE_TRADITIONAL_UNIQUE_CHARS.test(trimmed) ? 'zh-tw' : 'zh-cn';
    }
    if (VIETNAMESE_DIACRITICS_REGEX.test(trimmed)) return 'vi';
    return 'en';
  };

  // Create the main interactive speaker list
  function handleCreateList(textOverride?: string) {
    const sourceText = typeof textOverride === 'string' ? textOverride : rawText;
    const lines = sourceText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    // First map all raw lines to structured helper item objects
    const parsedLines = lines.map((lineText) => {
      const { cleanText, repeats, delaySec } = parseLineSymbols(lineText, 1, timeBetweenLines);
      const detected = handleDetectLanguage(cleanText);
      return {
        text: cleanText,
        detectedLang: detected,
        selectedLang: 'auto' as const,
        resolvedLang: detected,
        repeats: repeats,
        delaySec: delaySec,
        speed: speed
      };
    });

    const newList: SpeechItem[] = [];
    let itemIdx = 0;

    if (autoGroupSet) {
      const M = Math.max(1, setMultiplier);
      // Group consecutive parsed lines as pairs
      for (let i = 0; i < parsedLines.length - 1; i += 2) {
        const item1 = parsedLines[i];
        const item2 = parsedLines[i + 1];

        // Duplicate each set pair M times sequentially
        for (let m = 0; m < M; m++) {
          const newSetId = `set-${Date.now()}-${i}-m${m}-${Math.random().toString(36).substr(2, 5)}`;
          newList.push({
            ...item1,
            id: `row-${Date.now()}-${itemIdx++}-${Math.random().toString(36).substr(2, 5)}`,
            setId: newSetId
          });
          newList.push({
            ...item2,
            id: `row-${Date.now()}-${itemIdx++}-${Math.random().toString(36).substr(2, 5)}`,
            setId: newSetId
          });
        }
      }

      // Handle odd leftover line
      if (parsedLines.length % 2 !== 0) {
        const oddItem = parsedLines[parsedLines.length - 1];
        newList.push({
          ...oddItem,
          id: `row-${Date.now()}-${itemIdx++}-${Math.random().toString(36).substr(2, 5)}`
        });
      }
    } else {
      // Normal single row creation
      parsedLines.forEach((item, idx) => {
        newList.push({
          ...item,
          id: `row-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 5)}`
        });
      });
    }

    setSpeechList(newList);
    handleStopAll();
  }

  // Add single custom row
  const handleAddSingleRow = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRowText.trim()) return;

    // Parse symbols from the text if provided in the quick action form
    const { cleanText, repeats, delaySec } = parseLineSymbols(newRowText.trim(), newRowRepeats, newRowDelay);
    const detected = handleDetectLanguage(cleanText);
    const resolved: LanguageCode = newRowLang === 'auto' ? detected : newRowLang;

    const newItem: SpeechItem = {
      id: `row-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      text: cleanText,
      detectedLang: detected,
      selectedLang: newRowLang,
      resolvedLang: resolved,
      repeats: repeats,
      delaySec: delaySec,
      speed: speed
    };

    setSpeechList(prev => [...prev, newItem]);
    setNewRowText('');
    setNewRowLang('auto');
    setNewRowRepeats(1);
    setNewRowDelay(2.0);
  };

  // Main Speech logic: supports customized loop/repeat count and automatic chaining to next line
  const handleSpeakItem = async (item: SpeechItem) => {
    // Terminate existing sounds first
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    clearWebAudioNodes();
    clearWaitTimers();

    setIsManualPaused(false);
    isSpeechSynthesisPausedRef.current = false;
    isPremiumAudioPausedRef.current = false;
    pausedCountdownSecRef.current = 0;
    pausedCountdownTypeRef.current = null;
    pausedCountdownItemIdRef.current = null;

    let currentIteration = 1;
    const maxIterations = item.repeats || 1;
    activePlayingIdRef.current = item.id;

    if (engineMode === 'browser') {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        alert('Trình duyệt của bạn không hỗ trợ Web Speech API. Vui lòng thử dùng Google Chrome.');
        return;
      }

      const speakIteration = () => {
        // Security guard to check if audio was general-stopped or switched to another item
        if (activePlayingIdRef.current !== item.id) {
          setPlayingItemId(null);
          setCurrentRepeatIndex(0);
          setPlayingState('idle');
          clearWaitTimers();
          return;
        }

        const utterance = new SpeechSynthesisUtterance(item.text);
        utteranceRef.current = utterance; // Keep active to avoid Garbage Collector drops
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

        // Attach voice
        let preferredVoiceName = '';
        if (langCode === 'en') {
          preferredVoiceName = selectedEnVoiceName;
        } else if (langCode === 'vi') {
          preferredVoiceName = selectedViVoiceName;
        } else if (langCode === 'zh-cn') {
          preferredVoiceName = selectedZhCnVoiceName;
        } else if (langCode === 'zh-tw') {
          preferredVoiceName = selectedZhTwVoiceName;
        } else if (langCode === 'ja') {
          preferredVoiceName = selectedJaVoiceName;
        } else if (langCode === 'ko') {
          preferredVoiceName = selectedKoVoiceName;
        }

        if (preferredVoiceName) {
          const preferredVoice = voices.find(v => v.name === preferredVoiceName);
          if (preferredVoice) utterance.voice = preferredVoice;
        } else {
          const targetLangPrefix = langCode === 'vi' ? 'vi' : (langCode.startsWith('zh') ? 'zh' : (langCode === 'ja' ? 'ja' : (langCode === 'ko' ? 'ko' : 'en')));
          const bestVoice = voices.find(v => v.lang.toLowerCase().replace('_', '-').startsWith(targetLangPrefix));
          if (bestVoice) utterance.voice = bestVoice;
        }

        utterance.onstart = () => {
          setPlayingItemId(item.id);
          setCurrentRepeatIndex(currentIteration);
          setPlayingState('playing');
        };

        utterance.onend = () => {
          // Enforce check
          if (activePlayingIdRef.current !== item.id) {
            setPlayingItemId(null);
            setCurrentRepeatIndex(0);
            setPlayingState('idle');
            clearWaitTimers();
            return;
          }

          const currentDelay = item.delaySec !== undefined ? item.delaySec : 2.0;

          if (currentIteration < maxIterations) {
            currentIteration++;
            setPlayingState('paused'); // Show that we are waiting for timer
            startCountdown(currentDelay, 'repeat', () => {
              speakIteration();
            }, item.id);
          } else {
            // Completed repetitions for this particular row
            if (autoAdvance) {
              setPlayingState('paused'); // Waiting to advance
              startCountdown(currentDelay, 'advance', () => {
                setPlayingItemId(null);
                setCurrentRepeatIndex(0);
                setPlayingState('idle');
                handleAutoAdvanceToNext(item.id);
              }, item.id);
            } else {
              setPlayingItemId(null);
              setCurrentRepeatIndex(0);
              setPlayingState('idle');
            }
          }
        };

        utterance.onerror = (e) => {
          console.warn('Speech Engine warning:', e);
          setPlayingItemId(null);
          setCurrentRepeatIndex(0);
          setPlayingState('idle');
          clearWaitTimers();
        };

        window.speechSynthesis.speak(utterance);
      };

      speakIteration();
    } else {
      // PREMIUM AI TTS (Gemini tts-preview)
      if (!userGeminiApiKey || !userGeminiApiKey.trim()) {
        alert("⚠️ Bạn đã chọn chế độ Giọng Premium AI. Vui lòng tự nhập Gemini API Key của riêng bạn ở cột 'Cấu hình giọng đọc' (bên trái) để tiếp tục phát âm.");
        setPlayingItemId(null);
        setCurrentRepeatIndex(0);
        setPlayingState('idle');
        return;
      }

      setPlayingItemId(item.id);
      setPlayingState('playing');
      setCurrentRepeatIndex(1);

      const langCode = item.selectedLang === 'auto' ? item.detectedLang : item.selectedLang;
      const chosenVoice = getPremiumVoiceForLang(langCode, premiumVoiceSettings);

      try {
        const audioUrl = await generateTts(item.text, chosenVoice, langCode, userGeminiApiKey);

        const playIteration = () => {
          if (activePlayingIdRef.current !== item.id) {
            setPlayingItemId(null);
            setCurrentRepeatIndex(0);
            setPlayingState('idle');
            clearWaitTimers();
            return;
          }

          const audio = new Audio(audioUrl);
          currentAudioRef.current = audio;
          audio.playbackRate = item.speed !== undefined ? item.speed : speed;

          // Apply audio volume booster using Web Audio Gain Node if volume is > 1.0
          if (volume > 1.0) {
            try {
              if (!audioContextRef.current) {
                audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
              }
              const ctx = audioContextRef.current;
              if (ctx.state === 'suspended') {
                ctx.resume();
              }
              
              clearWebAudioNodes();

              const source = ctx.createMediaElementSource(audio);
              const gainNode = ctx.createGain();
              
              audio.volume = 1.0; // Max normal volume on element
              gainNode.gain.setValueAtTime(volume, ctx.currentTime);
              
              source.connect(gainNode);
              gainNode.connect(ctx.destination);
              
              lastNodesRef.current = { source, gain: gainNode };
            } catch (err) {
              console.error("Web Audio API volume boost error:", err);
              audio.volume = 1.0;
            }
          } else {
            audio.volume = volume;
          }

          audio.onplay = () => {
            setPlayingItemId(item.id);
            setCurrentRepeatIndex(currentIteration);
            setPlayingState('playing');
          };

          audio.onended = () => {
            if (activePlayingIdRef.current !== item.id) {
              setPlayingItemId(null);
              setCurrentRepeatIndex(0);
              setPlayingState('idle');
              clearWaitTimers();
              return;
            }

            const currentDelay = item.delaySec !== undefined ? item.delaySec : 2.0;

            if (currentIteration < maxIterations) {
              currentIteration++;
              setPlayingState('paused'); // waiting
              startCountdown(currentDelay, 'repeat', () => {
                playIteration();
              }, item.id);
            } else {
              if (autoAdvance) {
                setPlayingState('paused'); // waiting
                startCountdown(currentDelay, 'advance', () => {
                  setPlayingItemId(null);
                  setCurrentRepeatIndex(0);
                  setPlayingState('idle');
                  handleAutoAdvanceToNext(item.id);
                }, item.id);
              } else {
                setPlayingItemId(null);
                setCurrentRepeatIndex(0);
                setPlayingState('idle');
              }
            }
          };

          audio.onerror = (e) => {
            console.error("Audio playback error:", e);
            setPlayingItemId(null);
            setCurrentRepeatIndex(0);
            setPlayingState('idle');
            clearWaitTimers();
          };

          audio.play().catch(err => {
            console.error("Play failed:", err);
            setPlayingItemId(null);
            setCurrentRepeatIndex(0);
            setPlayingState('idle');
            clearWaitTimers();
          });
        };

        playIteration();

      } catch (err: any) {
        console.error("Premium audio generation failed:", err);
        alert(err.message || "Không thể tải giọng đọc AI Premium. Hãy đảm bảo API Key đã được cấp hoặc chuyển về chế độ Trình duyệt của máy.");
        setPlayingItemId(null);
        setCurrentRepeatIndex(0);
        setPlayingState('idle');
        clearWaitTimers();
      }
    }
  };

  // Helper to transition automatically to the next active line
  const handleAutoAdvanceToNext = (currentId: string) => {
    const list = speechListRef.current;
    const currentIndex = list.findIndex(item => item.id === currentId);
    if (currentIndex !== -1) {
      if (currentIndex + 1 < list.length) {
        const nextItem = list[currentIndex + 1];
        handleSpeakItem(nextItem);
      } else if (playlistLoopMode === 'infinite' && list.length > 0) {
        const nextItem = list[0];
        handleSpeakItem(nextItem);
      }
    }
  };

  // Draggable Drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    // Add visual styling to indicate drag start
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.4';
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '1';
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDropRow = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) return;

    const listCopy = [...speechList];
    const [draggedItem] = listCopy.splice(draggedIndex, 1);
    listCopy.splice(targetIndex, 0, draggedItem);
    setSpeechList(listCopy);

    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // Immediate cancel
  const handleStopAll = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    clearWebAudioNodes();
    clearWaitTimers();
    activePlayingIdRef.current = null;
    setPlayingItemId(null);
    setCurrentRepeatIndex(0);
    setPlayingState('idle');
    setIsManualPaused(false);
    isSpeechSynthesisPausedRef.current = false;
    isPremiumAudioPausedRef.current = false;
    pausedCountdownSecRef.current = 0;
    pausedCountdownTypeRef.current = null;
    pausedCountdownItemIdRef.current = null;
    resumeCallbackRef.current = null;
  };

  const handleGlobalPause = () => {
    if (playingState === 'idle' || isManualPaused) return;

    setIsManualPaused(true);

    // Case 1: Active speech is playing
    if (playingState === 'playing') {
      if (engineMode === 'browser') {
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
          window.speechSynthesis.pause();
          isSpeechSynthesisPausedRef.current = true;
        }
      } else {
        if (currentAudioRef.current) {
          currentAudioRef.current.pause();
          isPremiumAudioPausedRef.current = true;
        }
      }
    }
    // Case 2: In a countdown timer delay (repeat countdown or auto advance countdown)
    else if (playingState === 'paused' && waitingState.isWaiting) {
      pausedCountdownSecRef.current = waitingState.remainingSec;
      pausedCountdownTypeRef.current = waitingState.type;
      pausedCountdownItemIdRef.current = waitingState.itemId;
      
      // Stop the timers but preserve resumeCallbackRef
      if (waitTimerRef.current) {
        clearTimeout(waitTimerRef.current);
        waitTimerRef.current = null;
      }
      if (waitIntervalRef.current) {
        clearInterval(waitIntervalRef.current);
        waitIntervalRef.current = null;
      }
      setWaitingState(prev => ({ ...prev, isWaiting: false }));
    }
  };

  const handleGlobalResume = () => {
    if (!isManualPaused) return;

    setIsManualPaused(false);

    // Case 1: Voice was playing before pause
    if (isSpeechSynthesisPausedRef.current) {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.resume();
        isSpeechSynthesisPausedRef.current = false;
        setPlayingState('playing');
      }
    } else if (isPremiumAudioPausedRef.current) {
      if (currentAudioRef.current) {
        currentAudioRef.current.play().catch(err => {
          console.error("Failed to resume Premium Audio:", err);
        });
        isPremiumAudioPausedRef.current = false;
        setPlayingState('playing');
      }
    }
    // Case 2: In a countdown delay when paused
    else if (pausedCountdownSecRef.current > 0 && resumeCallbackRef.current) {
      const remaining = pausedCountdownSecRef.current;
      const type = pausedCountdownTypeRef.current!;
      const itemId = pausedCountdownItemIdRef.current!;

      pausedCountdownSecRef.current = 0;
      pausedCountdownTypeRef.current = null;
      pausedCountdownItemIdRef.current = null;

      setPlayingState('paused');
      startCountdown(remaining, type, () => {
        if (resumeCallbackRef.current) {
          const cb = resumeCallbackRef.current;
          resumeCallbackRef.current = null;
          cb();
        }
      }, itemId);
    }
  };

  const handleGlobalPlay = () => {
    if (playingState !== 'idle') {
      if (isManualPaused) {
        handleGlobalResume();
      }
      return;
    }

    // Start playing the currently selected/active item or the first item
    if (speechList.length > 0) {
      const activeItem = speechList.find(item => item.id === playingItemId) || speechList[0];
      handleSpeakItem(activeItem);
    }
  };

  const handleClearAll = () => {
    handleStopAll();
    setSpeechList([]);
  };

  // Apply templates
  const handleApplyTemplate = (content: string) => {
    setRawText(content);
    handleCreateList(content);
  };

  // Modify individual repeats configuration
  const handleRowRepeatsChange = (id: string, count: number) => {
    setSpeechList(prev => prev.map(item => {
      if (item.id === id) {
        return {
          ...item,
          repeats: Math.max(1, Math.min(10, count))
        };
      }
      return item;
    }));
  };

  // Modify individual delay configuration
  const handleRowDelayChange = (id: string, delay: number) => {
    setSpeechList(prev => prev.map(item => {
      if (item.id === id) {
        return {
          ...item,
          delaySec: Math.max(0.5, Math.min(20, Math.round(delay * 10) / 10))
        };
      }
      return item;
    }));
  };

  // Modify individual speech speed configuration
  const handleRowSpeedChange = (id: string, rate: number) => {
    setSpeechList(prev => prev.map(item => {
      if (item.id === id) {
        return {
          ...item,
          speed: Math.max(0.3, Math.min(2.0, Math.round(rate * 10) / 10))
        };
      }
      return item;
    }));
  };

  // Modify individual row language manually
  const handleRowLangChange = (id: string, newLang: LanguageCode | 'auto') => {
    setSpeechList(prev => prev.map(item => {
      if (item.id === id) {
        const detected = item.detectedLang;
        const resolved = newLang === 'auto' ? detected : newLang;
        return {
          ...item,
          selectedLang: newLang,
          resolvedLang: resolved
        };
      }
      return item;
    }));
  };

  // Edit item text inline
  const startEditingRow = (item: SpeechItem) => {
    setEditingItemId(item.id);
    setEditingText(item.text);
  };

  const saveEditedRow = (id: string) => {
    if (!editingText.trim()) {
      handleDeleteRow(id);
      return;
    }

    setSpeechList(prev => prev.map(item => {
      if (item.id === id) {
        const rawNewText = editingText.trim();
        // Parse custom speed and repetition codes if typed during manual edit
        const { cleanText, repeats, delaySec } = parseLineSymbols(rawNewText, item.repeats, item.delaySec);
        const detected = handleDetectLanguage(cleanText);
        const resolved = item.selectedLang === 'auto' ? detected : item.selectedLang;
        return {
          ...item,
          text: cleanText,
          detectedLang: detected,
          resolvedLang: resolved,
          repeats: repeats,
          delaySec: delaySec
        };
      }
      return item;
    }));

    setEditingItemId(null);
    setEditingText('');
  };

  const handleDeleteRow = (id: string) => {
    if (playingItemId === id) {
      handleStopAll();
    }
    setSpeechList(prev => prev.filter(item => item.id !== id));
  };

  const handleJoinWithNext = (index: number) => {
    if (index >= speechList.length - 1) return;
    const newSetId = `set-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    setSpeechList(prev => {
      const next = [...prev];
      const item1 = next[index];
      const item2 = next[index + 1];
      next[index] = { ...item1, setId: newSetId };
      next[index + 1] = { ...item2, setId: newSetId };
      return next;
    });
  };

  const handleUngroupSet = (setId: string) => {
    setSpeechList(prev => prev.map(item => {
      if (item.setId === setId) {
        const { setId: _, ...rest } = item;
        return rest;
      }
      return item;
    }));
  };

  const handleDuplicateSet = (setId: string) => {
    const itemsInSet = speechList.filter(item => item.setId === setId);
    if (itemsInSet.length === 0) return;

    // Create a new unique set ID so the duplicated set is fully independent
    const newSetId = `set-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

    const duplicates: SpeechItem[] = itemsInSet.map(item => ({
      ...item,
      id: `row-${Date.now()}-${Math.random().toString(36).substr(2, 5)}-dup`,
      setId: newSetId
    }));

    setSpeechList(prev => {
      let lastIndex = -1;
      for (let i = prev.length - 1; i >= 0; i--) {
        if (prev[i].setId === setId) {
          lastIndex = i;
          break;
        }
      }

      if (lastIndex === -1) {
        return [...prev, ...duplicates];
      }

      const result = [...prev];
      result.splice(lastIndex + 1, 0, ...duplicates);
      return result;
    });
  };

  // Generate speech starting from row index zero
  const triggerPlaylistDrill = () => {
    if (speechList.length > 0) {
      setIsTheaterMode(true);
      handleSpeakItem(speechList[0]);
    }
  };

  // Filter categories for all supported languages
  const englishVoices = voices.filter(v => v.lang.toLowerCase().startsWith('en'));
  const vietnameseVoices = voices.filter(v => v.lang.toLowerCase().startsWith('vi'));
  const zhCnVoices = voices.filter(v => 
    v.lang.toLowerCase().replace('_', '-').startsWith('zh-cn') || 
    v.lang.toLowerCase().replace('_', '-').startsWith('zh-chs') || 
    (v.lang.toLowerCase().startsWith('zh') && !v.lang.toLowerCase().includes('tw') && !v.lang.toLowerCase().includes('hk'))
  );
  const zhTwVoices = voices.filter(v => 
    v.lang.toLowerCase().replace('_', '-').startsWith('zh-tw') || 
    v.lang.toLowerCase().replace('_', '-').startsWith('zh-hk') || 
    v.lang.toLowerCase().replace('_', '-').startsWith('zh-cht') || 
    (v.lang.toLowerCase().startsWith('zh') && (v.lang.toLowerCase().includes('tw') || v.lang.toLowerCase().includes('hk')))
  );
  const japaneseVoices = voices.filter(v => v.lang.toLowerCase().startsWith('ja'));
  const koreanVoices = voices.filter(v => v.lang.toLowerCase().startsWith('ko'));

  return (
    <div id="classroom-tts-root" className="min-h-screen bg-slate-55 text-slate-800 font-sans selection:bg-indigo-100 selection:text-indigo-900 pb-20">
      
      {/* Dynamic Header */}
      <header id="app-header" className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-indigo-600 rounded-xl text-white shadow-sm flex items-center justify-center">
              <Volume2 className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
                Classroom Speech <span className="text-xs font-semibold px-2.5 py-0.5 bg-indigo-50 border border-indigo-100/50 rounded-full text-indigo-600">Pro Studio</span>
              </h1>
              <p className="text-[11px] text-slate-500 hidden sm:block">Giáo trình luyện nghe, chính tả bài hát tiếng Anh & tiếng Việt tối ưu</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {engineMode === 'premium' ? (
              <div className="hidden md:flex items-center space-x-1.5 bg-indigo-50 border border-indigo-100 rounded-lg px-2.5 py-1 text-xs text-indigo-700 font-bold animate-pulse">
                <Sparkles className="w-3.5 h-3.5 text-indigo-650" />
                <span>Premium Studio AI Active</span>
              </div>
            ) : (
              <div className="hidden md:flex items-center space-x-1.5 bg-emerald-50 border border-emerald-100 rounded-lg px-2.5 py-1 text-xs text-emerald-700 font-semibold">
                <Monitor className="w-3.5 h-3.5" />
                <span>Native Browser SpeechSynthesis</span>
              </div>
            )}
          </div>
        </div>
      </header>

      <main id="app-main" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        
        {/* Banner with Vietnamese focus guidelines */}
        <div id="welcome-message-banner" className="bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 rounded-2xl text-white p-6 sm:p-8 shadow-md relative overflow-hidden mb-6">
          <div className="absolute right-0 bottom-0 opacity-10 translate-x-10 translate-y-10 pointer-events-none">
            <Volume2 className="w-80 h-80" />
          </div>
          <div className="relative z-10 max-w-4xl">
            <div className="flex items-center space-x-2 text-indigo-300 text-xs font-bold uppercase tracking-wider mb-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Chrome / Safari Browser Optimized Speech Technology</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight leading-snug">
              Hệ Thống Luyện Phát Âm Trực Tuyến & Chép Chính Tả
            </h2>
            <p className="text-indigo-200 text-xs sm:text-sm mt-2 leading-relaxed">
              Dành cho giáo viên ngoại ngữ thiết kế bài giảng. Nhập danh sách từ vựng, tự động nhận diện ngôn ngữ tốt nhất, lặp lại phát âm tùy ý từng dòng và tự động chuyển tiếp liên lục để học sinh chép bài. Kéo thả dòng bất kì để đổi thứ tự câu hỏi!
            </p>
          </div>
        </div>

        {/* Primary Functional Dashboard Grid */}
        <div id="studio-grid" className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT AREA: Text Editor & Settings Configurations */}
          <div id="creator-workspace-col" className="lg:col-span-5 space-y-6">
            
            {/* Standard Text Editor Input */}
            <LessonInputPanel
              rawText={rawText}
              setRawText={setRawText}
              autoGroupSet={autoGroupSet}
              onAutoGroupSetChange={handleAutoGroupSetChange}
              setMultiplier={setMultiplier}
              onSetMultiplierChange={handleSetMultiplierChange}
              onCreateList={() => handleCreateList()}
              onClearInput={() => setRawText('')}
              onApplyTemplate={handleApplyTemplate}
            />

            {/* Local Lesson & Folder Library Panel */}
            <LessonLibrary 
              currentRawText={rawText} 
              currentSpeechList={speechList}
              currentSettings={{
                speed,
                timeBetweenLines,
                rowLayoutMode,
                engineMode,
                selectedPremiumVoiceEn,
                selectedPremiumVoiceVi,
                selectedEnVoiceName,
                selectedViVoiceName,
                autoGroupSet,
                setMultiplier,
                useUniversalImage,
                universalImageUrl
              }}
              onLoadLesson={(lesson) => {
                // 1. Restore raw text editor
                setRawText(lesson.rawText);
                
                // 2. Restore all configurations
                if (lesson.settings) {
                  const s = lesson.settings as any;
                  if (typeof s.speed === 'number') setSpeed(s.speed);
                  if (typeof s.timeBetweenLines === 'number') setTimeBetweenLines(s.timeBetweenLines);
                  if (typeof s.rowLayoutMode === 'string') setRowLayoutMode(s.rowLayoutMode);
                  if (typeof s.engineMode === 'string') setEngineMode(s.engineMode);
                  if (typeof s.selectedPremiumVoiceEn === 'string') setSelectedPremiumVoiceEn(s.selectedPremiumVoiceEn);
                  if (typeof s.selectedPremiumVoiceVi === 'string') setSelectedPremiumVoiceVi(s.selectedPremiumVoiceVi);
                  if (typeof s.selectedPremiumVoiceZhCn === 'string') setSelectedPremiumVoiceZhCn(s.selectedPremiumVoiceZhCn);
                  if (typeof s.selectedPremiumVoiceZhTw === 'string') setSelectedPremiumVoiceZhTw(s.selectedPremiumVoiceZhTw);
                  if (typeof s.selectedPremiumVoiceJa === 'string') setSelectedPremiumVoiceJa(s.selectedPremiumVoiceJa);
                  if (typeof s.selectedPremiumVoiceKo === 'string') setSelectedPremiumVoiceKo(s.selectedPremiumVoiceKo);
                  if (typeof s.selectedEnVoiceName === 'string') setSelectedEnVoiceName(s.selectedEnVoiceName);
                  if (typeof s.selectedViVoiceName === 'string') setSelectedViVoiceName(s.selectedViVoiceName);
                  if (typeof s.selectedZhCnVoiceName === 'string') setSelectedZhCnVoiceName(s.selectedZhCnVoiceName);
                  if (typeof s.selectedZhTwVoiceName === 'string') setSelectedZhTwVoiceName(s.selectedZhTwVoiceName);
                  if (typeof s.selectedJaVoiceName === 'string') setSelectedJaVoiceName(s.selectedJaVoiceName);
                  if (typeof s.selectedKoVoiceName === 'string') setSelectedKoVoiceName(s.selectedKoVoiceName);
                  if (typeof s.autoGroupSet === 'boolean') handleAutoGroupSetChange(s.autoGroupSet);
                  if (typeof s.setMultiplier === 'number') handleSetMultiplierChange(s.setMultiplier);
                  if (typeof s.useUniversalImage === 'boolean') handleUseUniversalImageChange(s.useUniversalImage);
                  if (typeof s.universalImageUrl === 'string') handleUniversalImageUrlChange(s.universalImageUrl);
                }

                // 3. Restore list of cards & its custom images
                if (Array.isArray(lesson.speechList) && lesson.speechList.length > 0) {
                  setSpeechList(lesson.speechList);
                } else {
                  handleCreateList(lesson.rawText);
                }
              }}
            />

            {/* ChatGPT Prompt Builder Helper Card */}
            <div id="gpt-prompt-helper-box" className="bg-gradient-to-br from-indigo-50/70 via-slate-50 to-pink-50/70 border border-slate-200 rounded-2xl p-5 shadow-xs text-left">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                <div>
                  <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5 justify-start">
                    <Sparkles className="w-4 h-4 text-pink-500 animate-pulse" />
                    Mẫu Prompt AI Tạo Giáo Án Song Ngữ
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Tùy biến câu lệnh và dán vào ChatGPT / Claude / Gemini để nhận danh sách bài học ngay lập tức.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCopyGPTPrompt}
                  className={`text-[10px] sm:text-xs font-bold px-3 py-1.5 rounded-xl border transition-all flex items-center gap-1.5 justify-center cursor-pointer select-none shrink-0 self-start sm:self-center ${
                    copiedPrompt 
                      ? 'bg-emerald-500 text-white border-emerald-500 shadow-xs scale-102' 
                      : 'bg-indigo-650 hover:bg-indigo-700 text-white border-transparent'
                  }`}
                >
                  {copiedPrompt ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      Đã copy thành công!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Sao chép Prompt
                    </>
                  )}
                </button>
              </div>

              {/* Guide/Explanation of special symbols */}
              <div className="bg-indigo-50/40 border border-indigo-100 rounded-xl p-3 mb-4 text-[11px] text-slate-600 space-y-1.5 leading-relaxed">
                <div className="font-bold text-slate-700 flex items-center gap-1 text-[11px]">
                  <HelpCircle className="w-3.5 h-3.5 text-indigo-500" />
                  Bạn có biết ý nghĩa của các ký hiệu đặc biệt hỗ trợ?
                </div>
                <ul className="list-disc pl-4 space-y-1 text-[10.5px]">
                  <li>
                    <strong className="text-pink-600 font-mono">Dấu gạch chéo (/Y)</strong>: Quy định <strong className="text-slate-800">thời gian nghỉ (giây)</strong> sau dòng đó. <br />
                    <span className="text-slate-500">Ví dụ: <code className="bg-slate-100 px-1 rounded text-[10px]">Xin chào /2</code> (Đọc xong "Xin chào" sẽ dừng nghỉ 2 giây chờ học viên phản xạ trước khi sang câu sau).</span>
                  </li>
                  <li>
                    <strong className="text-indigo-600 font-mono">Dấu chấm phẩy (;X)</strong>: Quy định <strong className="text-slate-800">số lần đọc lặp lại</strong> dòng đó. <br />
                    <span className="text-slate-500">Ví dụ: <code className="bg-slate-100 px-1 rounded text-[10px]">Apple ;3</code> (Ứng dụng sẽ tự động đọc từ "Apple" lặp lại 3 lần liên tiếp trước khi dịch nghĩa).</span>
                  </li>
                </ul>
              </div>

              {/* Live configuration tools */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {/* Topic Input */}
                <div className="space-y-1.5">
                  <label htmlFor="prompt-topic-input" className="text-[10px] font-bold text-slate-505 flex items-center gap-1 uppercase tracking-wider">
                    ✍️ 1. NHẬP CHỦ ĐỀ MUỐN HỌC:
                  </label>
                  <input
                    id="prompt-topic-input"
                    type="text"
                    value={promptTopic}
                    onChange={(e) => setPromptTopic(e.target.value)}
                    placeholder="Ví dụ: Đàm thoại tại nhà hàng, Từ vựng sân bay..."
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-hidden transition"
                  />
                </div>

                {/* Prompt Type Selector */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-505 flex items-center gap-1 uppercase tracking-wider">
                    ⚙️ 2. CHỌN LOẠI CẤU TRÚC PHÙ HỢP:
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { id: 'basic', label: 'Cơ bản thô', desc: 'Không chứa ";" hay "/"' },
                      { id: 'repeat', label: 'Chỉ Lặp lại', desc: 'Có ";" lặp lại câu' },
                      { id: 'pause', label: 'Chỉ Giãn cách', desc: 'Có "/" khoảng nghỉ' },
                      { id: 'advanced', label: 'Nâng cao gộp', desc: 'Có cả ";" và "/"' },
                    ].map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setPromptType(t.id as any)}
                        className={`px-2.5 py-1.5 rounded-lg border text-left transition-all cursor-pointer ${
                          promptType === t.id
                            ? 'bg-indigo-50 border-indigo-300 text-indigo-950 font-semibold shadow-2xs'
                            : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-650'
                        }`}
                      >
                        <div className="text-[10px]">{t.label}</div>
                        <div className={`text-[8.5px] ${promptType === t.id ? 'text-indigo-500' : 'text-slate-400'} font-normal mt-0.5 line-clamp-1`}>
                          {t.desc}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Main code box previewer */}
              <div className="relative">
                <div className="absolute top-2.5 right-3 px-2 py-0.5 rounded-md bg-slate-800 text-[8.5px] font-mono text-slate-350 uppercase tracking-wider pointer-events-none">
                  XEM TRƯỚC PROMPT
                </div>
                <div className="bg-slate-950 border border-slate-850 rounded-2xl p-4 group">
                  <pre className="text-[10.5px] font-mono text-indigo-100 whitespace-pre-wrap max-h-56 overflow-y-auto leading-relaxed scrollbar-thin text-left select-all pr-2">
                    {getDynamicGPTPrompt()}
                  </pre>
                  <div className="mt-2.5 pt-2.5 border-t border-slate-850 flex flex-col sm:flex-row sm:items-center sm:justify-between text-[9px] text-slate-400 gap-2">
                    <span>* Giáo án sinh ra được sắp xếp xen kẽ, đi từ từ đơn đến câu hoàn chỉnh giúp học viên ghi nhớ tốt nhất.</span>
                    <span className="font-mono text-indigo-350 bg-slate-900/90 px-1.5 py-0.5 rounded border border-slate-800 shrink-0 select-none text-center">
                      Bấm "Sao chép Prompt" ở phía trên
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Custom Control Settings box */}
            <SpeechSettingsPanel
              engineMode={engineMode}
              setEngineMode={setEngineMode}
              speed={speed}
              setSpeed={setSpeed}
              onApplySpeedToAll={() => {
                setSpeechList(prev => prev.map(item => ({ ...item, speed: speed })));
              }}
              volume={volume}
              handleVolumeChange={handleVolumeChange}
              autoAdvance={autoAdvance}
              setAutoAdvance={setAutoAdvance}
              timeBetweenLines={timeBetweenLines}
              setTimeBetweenLines={setTimeBetweenLines}
              onApplyDelayToAll={() => {
                setSpeechList(prev => prev.map(item => ({ ...item, delaySec: timeBetweenLines })));
              }}
              playlistLoopMode={playlistLoopMode}
              handlePlaylistLoopModeChange={handlePlaylistLoopModeChange}
              selectedEnVoiceName={selectedEnVoiceName}
              setSelectedEnVoiceName={setSelectedEnVoiceName}
              selectedViVoiceName={selectedViVoiceName}
              setSelectedViVoiceName={setSelectedViVoiceName}
              selectedZhCnVoiceName={selectedZhCnVoiceName}
              setSelectedZhCnVoiceName={setSelectedZhCnVoiceName}
              selectedZhTwVoiceName={selectedZhTwVoiceName}
              setSelectedZhTwVoiceName={setSelectedZhTwVoiceName}
              selectedJaVoiceName={selectedJaVoiceName}
              setSelectedJaVoiceName={setSelectedJaVoiceName}
              selectedKoVoiceName={selectedKoVoiceName}
              setSelectedKoVoiceName={setSelectedKoVoiceName}
              englishVoices={englishVoices}
              vietnameseVoices={vietnameseVoices}
              zhCnVoices={zhCnVoices}
              zhTwVoices={zhTwVoices}
              japaneseVoices={japaneseVoices}
              koreanVoices={koreanVoices}
              userGeminiApiKey={userGeminiApiKey}
              showApiKey={showApiKey}
              setShowApiKey={setShowApiKey}
              handleApiKeyChange={handleApiKeyChange}
              clearApiKey={clearApiKey}
              selectedPremiumVoices={selectedPremiumVoices}
              onVoiceChange={onVoiceChange}
            />

            {/* Unified Background Theme Configurations (Optional) */}
            <div id="universal-theme-box" className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:border-slate-350 transition-colors duration-200">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <ImageIcon className="w-4.5 h-4.5 text-indigo-600" />
                  Ảnh nền đồng nhất chuỗi học
                </h3>
                <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full uppercase">Optional</span>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl p-3">
                  <div className="flex flex-col pr-2">
                    <span className="text-xs font-bold text-slate-700">Đồng nhất ảnh minh họa</span>
                    <span className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">
                      Áp dụng 1 ảnh nền/chủ đề duy nhất cho tất cả các câu khi trình chiếu
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer select-none shrink-0">
                    <input
                      type="checkbox"
                      checked={useUniversalImage}
                      onChange={(e) => handleUseUniversalImageChange(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>

                {useUniversalImage && (
                  <div className="space-y-2 animate-fade-in text-left">
                    <label htmlFor="universal-img-url" className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">
                      URL hình ảnh chủ đề hoặc ảnh chụp
                    </label>
                    <div className="flex gap-2">
                      <input
                        id="universal-img-url"
                        type="text"
                        placeholder="Dán URL hình hoặc click Tìm ảnh..."
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-hidden text-slate-705 font-sans"
                        value={universalImageUrl}
                        onChange={(e) => handleUniversalImageUrlChange(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setIsSearchingUniversalImage(true);
                          setSelectedItemForImageSearch({
                            id: 'universal',
                            text: 'Background template model scenery',
                            lang: 'auto',
                            resolvedLang: 'en',
                            repeats: 1,
                            delaySec: 2.0
                          });
                          setIsImageSearchModalOpen(true);
                        }}
                        className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold border border-indigo-200 text-xs px-3 py-2 rounded-lg transition shrink-0 cursor-pointer flex items-center justify-center gap-1"
                        title="Tìm ảnh đẹp từ kho ảnh của ứng dụng"
                      >
                        <Search className="w-3.5 h-3.5" />
                        Tìm ảnh
                      </button>
                    </div>

                    {universalImageUrl && (
                      <div className="relative mt-2 rounded-xl overflow-hidden aspect-[16/6] border border-slate-200 group/uimg">
                        <img
                          src={universalImageUrl}
                          alt="Universal Theme Background"
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <button
                          type="button"
                          onClick={() => handleUniversalImageUrlChange('')}
                          className="absolute top-1 right-1 p-1 bg-rose-600 hover:bg-rose-700 text-white rounded-full opacity-90 transition shadow-xs cursor-pointer"
                          title="Xoá ảnh nền đồng nhất"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                    <span className="text-[10px] text-slate-400 block mt-1 leading-relaxed">
                      * Khi bật, mọi hình minh họa riêng lẻ của các câu sẽ tạm thời được thay thế bằng hình ảnh này trong chế độ rạp chiếu phim (Cinema Mode) của bạn.
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Instruction on Chrome High-Quality Voice Activation */}
            <div id="chrome-voice-info-card" className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-4 text-xs text-emerald-800 space-y-2">
              <div className="flex items-center space-x-2 text-emerald-900 font-bold">
                <Sparkles className="w-4.5 h-4.5 text-emerald-600 shrink-0" />
                <span>Mẹo dùng giọng đọc Chrome chuẩn nhất</span>
              </div>
              <p className="leading-relaxed">
                Ứng dụng này sử dụng các gói đọc tự nhiên tích hợp sẵn của trình duyệt. 
                Khi sử dụng trên <strong className="text-emerald-900">Google Chrome</strong>, các giọng nói <strong className="text-emerald-950">&quot;Google tiếng Việt&quot;</strong> hoặc <strong className="text-emerald-950">&quot;Google US English&quot;</strong> trực tuyến sẽ tự động được tải, mang đến độ chân thực mượt mà cao nhất mà không tốn chi phí.
              </p>
            </div>

          </div>

          {/* RIGHT AREA: Editable and Interactive Speaker List view */}
          <div id="results-col" className="lg:col-span-7 space-y-6">
            
            <SpeechListBoard
              speechList={speechList}
              rowLayoutMode={rowLayoutMode}
              toggleRowLayoutMode={toggleRowLayoutMode}
              fileInputRef={fileInputRef}
              handleExportData={handleExportData}
              triggerPlaylistDrill={triggerPlaylistDrill}
              handleStopAll={handleStopAll}
              handleClearAll={handleClearAll}
              autoAdvance={autoAdvance}
              newRowText={newRowText}
              setNewRowText={setNewRowText}
              newRowLang={newRowLang}
              setNewRowLang={setNewRowLang}
              newRowRepeats={newRowRepeats}
              setNewRowRepeats={setNewRowRepeats}
              newRowDelay={newRowDelay}
              setNewRowDelay={setNewRowDelay}
              handleAddSingleRow={handleAddSingleRow}
              setIsShareModalOpen={setIsShareModalOpen}
              setIsAudioExportModalOpen={setIsAudioExportModalOpen}
              handleApplyTemplate={handleApplyTemplate}
              
              playingItemId={playingItemId}
              currentRepeatIndex={currentRepeatIndex}
              waitingState={waitingState}
              editingItemId={editingItemId}
              editingText={editingText}
              setEditingText={setEditingText}
              startEditingRow={startEditingRow}
              saveEditedRow={saveEditedRow}
              setEditingItemId={setEditingItemId}
              
              draggedIndex={draggedIndex}
              dragOverIndex={dragOverIndex}
              handleDragStart={handleDragStart}
              handleDragEnd={handleDragEnd}
              handleDragOver={handleDragOver}
              handleDropRow={handleDropRow}
              
              speed={speed}
              handleSpeakItem={handleSpeakItem}
              handleClearImage={handleClearImage}
              setSelectedItemForImageSearch={setSelectedItemForImageSearch}
              setIsImageSearchModalOpen={setIsImageSearchModalOpen}
              handleRowRepeatsChange={handleRowRepeatsChange}
              handleRowDelayChange={handleRowDelayChange}
              handleRowSpeedChange={handleRowSpeedChange}
              handleRowLangChange={handleRowLangChange}
              handleJoinWithNext={handleJoinWithNext}
              handleDeleteRow={handleDeleteRow}
              handleDuplicateSet={handleDuplicateSet}
              handleUngroupSet={handleUngroupSet}
            />

            {/* Instruction workflow summary tips */}
            <div id="classroom-drill-card" className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row gap-4 items-start">
              <div className="bg-indigo-50 p-2.5 rounded-xl text-indigo-600 shrink-0">
                <HelpCircle className="w-5 h-5" />
              </div>
              <div className="text-left text-xs text-slate-500 leading-relaxed">
                <h4 className="font-bold text-slate-900 text-sm mb-1.5">Cách tạo buổi thi chính tả (Spelling/Dictation Drill) hiệu quả:</h4>
                <ol className="list-decimal list-inside space-y-1 sm:space-y-1.5">
                  <li>Cài số lần lặp (<strong className="text-slate-700">Lặp</strong>) cho mỗi câu là <strong className="text-indigo-650">2 hoặc 3 lần</strong>.</li>
                  <li>Bật nút tắt <strong className="text-indigo-600">Tự động chuyển dòng kế tiếp</strong> ở bảng trái và set thời gian nghỉ khoảng <strong className="text-slate-700">3 hoặc 4 giây</strong>.</li>
                  <li>Click nút <strong className="text-slate-800">Phát chuỗi luyện tập (Play)</strong>. Hệ thống sẽ đọc câu 1, lặp lại nó 2 lần, đợi 3 giây cho học sinh viết rồi tự động phát câu 2 mượt mà tuyệt đối!</li>
                </ol>
              </div>
            </div>

          </div>

        </div>

      </main>

      {/* Modern Search & Assign Image Modal */}
      <ImageSearchModal
        isOpen={isImageSearchModalOpen}
        onClose={() => {
          setIsImageSearchModalOpen(false);
          setSelectedItemForImageSearch(null);
        }}
        item={selectedItemForImageSearch}
        onAssignImage={handleAssignImage}
      />

      {/* Share Playlist Modal */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        speechList={speechList}
        speed={speed}
        volume={volume}
        autoAdvance={autoAdvance}
        timeBetweenLines={timeBetweenLines}
        playlistLoopMode={playlistLoopMode}
        engineMode={engineMode}
      />

      {/* Cinematic Theater/Movie Practice Board Overlay */}
      <TheaterPlayer
        isOpen={isTheaterMode}
        onClose={() => setIsTheaterMode(false)}
        speechList={speechList}
        playingItemId={playingItemId}
        playingState={playingState}
        currentRepeatIndex={currentRepeatIndex}
        waitingState={waitingState}
        volume={volume}
        speed={speed}
        onVolumeChange={handleVolumeChange}
        onSpeedChange={(val) => {
          setSpeed(val);
        }}
        onPlayItem={handleSpeakItem}
        onStop={handleStopAll}
        timeBetweenLines={timeBetweenLines}
        onTimeBetweenLinesChange={setTimeBetweenLines}
        autoAdvance={autoAdvance}
        onAutoAdvanceChange={setAutoAdvance}
        engineMode={engineMode}
        playlistLoopMode={playlistLoopMode}
        onPlaylistLoopModeChange={handlePlaylistLoopModeChange}
        useUniversalImage={useUniversalImage}
        universalImageUrl={universalImageUrl}
        isManualPaused={isManualPaused}
        onPause={handleGlobalPause}
        onPlay={handleGlobalPlay}
      />

      {/* Independent Speech/Playlist Audio To MP3/WAV Exporter Overlay */}
      <AudioExportModal
        isOpen={isAudioExportModalOpen}
        onClose={() => setIsAudioExportModalOpen(false)}
        speechList={speechList}
        speed={speed}
        volume={volume}
        timeBetweenLines={timeBetweenLines}
        engineMode={engineMode}
        userGeminiApiKey={userGeminiApiKey}
        voices={voices}
        selectedEnVoiceName={selectedEnVoiceName}
        selectedViVoiceName={selectedViVoiceName}
        selectedZhCnVoiceName={selectedZhCnVoiceName}
        selectedZhTwVoiceName={selectedZhTwVoiceName}
        selectedJaVoiceName={selectedJaVoiceName}
        selectedKoVoiceName={selectedKoVoiceName}
        selectedPremiumVoiceEn={selectedPremiumVoiceEn}
        selectedPremiumVoiceVi={selectedPremiumVoiceVi}
        selectedPremiumVoiceZhCn={selectedPremiumVoiceZhCn}
        selectedPremiumVoiceZhTw={selectedPremiumVoiceZhTw}
        selectedPremiumVoiceJa={selectedPremiumVoiceJa}
        selectedPremiumVoiceKo={selectedPremiumVoiceKo}
      />
    </div>
  );
}
