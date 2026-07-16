import React, { useState, useEffect, useRef } from 'react';
import { buildPromptGuide, type PromptType } from './features/prompt-guide/promptGuide';
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
import { SpeechItem, LanguageCode, LessonSettings } from './types';
import { buildLessonDraft, hydrateLessonDocument } from './domain/lessonModel';
import { useGeminiApiKey } from './features/premium-tts/useGeminiApiKey';
import { usePremiumTts } from './features/premium-tts/usePremiumTts';
import { getPremiumVoiceForLang } from './features/premium-tts/premiumVoices';
import { usePremiumVoiceSettings } from './features/premium-tts/usePremiumVoiceSettings';
import { premiumTtsCacheStore } from './features/premium-tts/premiumTtsCacheStore';
import { usePremiumAudioPreparation } from './features/premium-tts/persistent-audio/usePremiumAudioPreparation';
import PremiumAudioPreparationPanel from './features/premium-tts/persistent-audio/PremiumAudioPreparationPanel';
import { resolvePremiumAudio } from './features/premium-tts/persistent-audio/premiumAudioResolver';
import LessonLibrary from './components/LessonLibrary';
import { SpeechSettingsPanel } from './components/SpeechSettingsPanel';
import { LessonInputPanel, TEMPLATES } from './components/LessonInputPanel';
import { PlaybackController } from './components/PlaybackController';
import { SpeechListBoard } from './components/SpeechListBoard';
import AppWorkspace from './components/AppWorkspace';
import { useSharedPlaylistLoader } from './features/shared-playlist/useSharedPlaylistLoader';
import SharedPlaylistBanner from './features/shared-playlist/SharedPlaylistBanner';
import { useAuth } from './features/auth/useAuth';
import AppShell from './features/app-shell/AppShell';
import LessonsView from './features/lessons/LessonsView';
import LessonBuilderView from './features/lesson-builder/LessonBuilderView';
import { usePlaybackState } from './features/playback/usePlaybackState';
import { createBrowserCountdownController, type CountdownController } from './features/playback/countdownController';
import { createBrowserAudioPlaybackAdapter } from './features/playback/audioPlaybackAdapter';
import { createWindowBrowserSpeechAdapter } from './features/playback/browserSpeechAdapter';
import { createLessonFingerprint } from './features/lesson-editor/lessonEditorStatus';
import { useLessonPreferences } from './features/lesson-preferences/useLessonPreferences';
import { buildSpeechItems, detectLanguage, parseLineSymbols } from './features/lesson-editor/speechItemFactory';
import { parseSpeechListImport } from './features/lesson-editor/speechListImport';
import { duplicateSet, joinWithNext, ungroupSet, updateSpeechItem } from './features/lesson-editor/speechItemCommands';
import { useLessonEditorController } from './application/lesson-editor/useLessonEditorController';
import { useLessonPersistenceController } from './application/lesson-persistence/useLessonPersistenceController';

const ImageSearchModal = React.lazy(() => import('./components/ImageSearchModal'));
const TheaterPlayer = React.lazy(() => import('./components/TheaterPlayer'));
const ShareModal = React.lazy(() => import('./components/ShareModal'));
const AudioExportModal = React.lazy(() => import('./components/AudioExportModal'));


export default function App() {
  const {
    rawText,
    setRawText,
    speechList,
    setSpeechList,
    title: currentLessonTitle,
    setTitle: setCurrentLessonTitle,
    editingItemId,
    setEditingItemId,
    editingText,
    setEditingText,
    loadLesson: loadEditorLesson,
    resetEditor,
  } = useLessonEditorController({
    title: 'Bài học mẫu: Bắp rang bơ',
    rawText: 'popcorn\nbắp rang\ndelicious popcorn\nbắp rang ngon lành\nI love eating delicious popcorn. /1.5\nMình rất thích ăn bắp rang ngon lành.\nsharing popcorn\nchia sẻ bắp rang\nWe are sharing popcorn while watching a movie. ;2\nChúng mình đang chung nhau ăn bắp rang khi xem phim.',
    speechList: [],
  });

  const [speed, setSpeed] = useState<number>(1.0);
  const {
    volume,
    setVolume,
    autoGroupSet,
    handleAutoGroupSetChange,
    setMultiplier,
    handleSetMultiplierChange,
    useUniversalImage,
    handleUseUniversalImageChange,
    universalImageUrl,
    handleUniversalImageUrlChange,
    playlistLoopMode,
    handlePlaylistLoopModeChange,
    rowLayoutMode,
    setRowLayoutMode,
  } = useLessonPreferences();

  // Image & Theater Mode States
  const [isTheaterMode, setIsTheaterMode] = useState<boolean>(false);
  const [isImageSearchModalOpen, setIsImageSearchModalOpen] = useState<boolean>(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
  const [isAudioExportModalOpen, setIsAudioExportModalOpen] = useState<boolean>(false);
  const [selectedItemForImageSearch, setSelectedItemForImageSearch] = useState<SpeechItem | null>(null);
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

  const { user } = useAuth();
  const [activeSection, setActiveSection] = useState<'lessons' | 'builder'>('lessons');
  const [cloudRefreshVersion, setCloudRefreshVersion] = useState<number>(0);
  const [toast, setToast] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
    description?: string;
    action?: {
      label: string;
      onClick: () => void;
    };
  } | null>(null);

  const showToast = (
    type: 'success' | 'error' | 'info',
    message: string,
    description?: string,
    action?: { label: string; onClick: () => void }
  ) => {
    setToast({ type, message, description, action });
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

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

  const audioPlaybackAdapterRef = useRef<ReturnType<typeof createBrowserAudioPlaybackAdapter> | null>(null);
  if (!audioPlaybackAdapterRef.current) audioPlaybackAdapterRef.current = createBrowserAudioPlaybackAdapter();
  const browserSpeechAdapterRef = useRef<ReturnType<typeof createWindowBrowserSpeechAdapter> | null>(null);
  if (!browserSpeechAdapterRef.current) browserSpeechAdapterRef.current = createWindowBrowserSpeechAdapter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    playingItemId,
    playingState,
    currentRepeatIndex,
    waitingState,
    isManualPaused,
    startPlayback,
    stopPlayback,
    pausePlayback,
    resumePlayback,
    setPlayingItemId,
    setPlayingState,
    setCurrentRepeatIndex,
    setWaitingState,
  } = usePlaybackState();
  const countdownControllerRef = useRef<CountdownController | null>(null);
  if (!countdownControllerRef.current) countdownControllerRef.current = createBrowserCountdownController();

  const isSpeechSynthesisPausedRef = useRef<boolean>(false);
  const isPremiumAudioPausedRef = useRef<boolean>(false);

  const clearWaitTimers = () => {
    countdownControllerRef.current?.cancel();
    setWaitingState({ isWaiting: false, remainingSec: 0, itemId: null, type: null });
  };

  const startCountdown = (durationSec: number, type: 'repeat' | 'advance', onComplete: () => void, itemId: string) => {
    countdownControllerRef.current?.start({
      durationSec,
      type,
      itemId,
      onTick: (snapshot) => setWaitingState({
        isWaiting: !snapshot.paused,
        remainingSec: snapshot.remainingSec,
        itemId: snapshot.itemId,
        type: snapshot.type,
      }),
      onComplete: () => {
        setWaitingState({ isWaiting: false, remainingSec: 0, itemId: null, type: null });
        onComplete();
      },
    });
  };
  // HTML5 Drag and Drop states
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Auto progression configuration
  const [autoAdvance, setAutoAdvance] = useState<boolean>(true);

  const [copiedPrompt, setCopiedPrompt] = useState<boolean>(false);
  const [promptTopic, setPromptTopic] = useState<string>('Giao thông công cộng');
  const [promptMainIdeas, setPromptMainIdeas] = useState<string>('Khuyến khích công dân sử dụng phương tiện xanh, điện sạch, metro, xe buýt để giảm thiểu nạn kẹt xe ùn tắc và ngăn chặn ô nhiễm môi trường.');
  const [promptType, setPromptType] = useState<PromptType>('pause');
  const [showGptPromptGuide, setShowGptPromptGuide] = useState<boolean>(false);
  const [showChromeTip, setShowChromeTip] = useState<boolean>(false);
  const [showDrillGuide, setShowDrillGuide] = useState<boolean>(false);

  const generatedPrompt = buildPromptGuide({
    promptTopic,
    promptMainIdeas,
    promptType,
  });

  const handleCopyGPTPrompt = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(generatedPrompt).then(() => {
        setCopiedPrompt(true);
        setTimeout(() => setCopiedPrompt(false), 2055);
      }).catch(err => {
        console.error("Failed to copy GPT Prompt:", err);
      });
    }
  };

  const [isSearchingUniversalImage, setIsSearchingUniversalImage] = useState<boolean>(false);

  const [timeBetweenLines, setTimeBetweenLines] = useState<number>(2.0); // Default pause time in seconds

  // Quick addition line form
  const [newRowText, setNewRowText] = useState<string>('');
  const [newRowLang, setNewRowLang] = useState<LanguageCode | 'auto'>('auto');
  const [newRowRepeats, setNewRowRepeats] = useState<number>(1);
  const [newRowDelay, setNewRowDelay] = useState<number>(2.0);

  // Layout mode for the speech item rows
  const toggleRowLayoutMode = (mode: 'below' | 'side') => {
    setRowLayoutMode(mode);
  };

  // User-supplied Gemini API Key and Premium engine hook
  const {
    apiKey: userGeminiApiKey,
    showApiKey,
    setShowApiKey,
    setApiKey: handleApiKeyChange,
    clearApiKey,
  } = useGeminiApiKey();

  const getCurrentLessonSettings = (): LessonSettings => ({
    speed,
    volume,
    autoAdvance,
    timeBetweenLines,
    rowLayoutMode,
    engineMode,

    selectedPremiumVoiceEn,
    selectedPremiumVoiceVi,
    selectedPremiumVoiceZhCn,
    selectedPremiumVoiceZhTw,
    selectedPremiumVoiceJa,
    selectedPremiumVoiceKo,

    selectedEnVoiceName,
    selectedViVoiceName,
    selectedZhCnVoiceName,
    selectedZhTwVoiceName,
    selectedJaVoiceName,
    selectedKoVoiceName,

    autoGroupSet,
    setMultiplier,
    useUniversalImage,
    universalImageUrl,
  });

  const currentLessonDraft = buildLessonDraft({ title: currentLessonTitle, rawText, speechList, settings: getCurrentLessonSettings() });
  const { lessonId: currentLessonId, status: lessonSaveStatus, isDirty, isSaving: isSavingCloudLesson, error: lessonSaveError, save: handleSaveLesson, saveAsCopy: handleSaveLessonAsCopy, loadSession: loadLessonPersistence, resetSession: resetLessonPersistence, confirmDiscard } = useLessonPersistenceController({
    userId: user?.uid ?? null,
    draft: currentLessonDraft,
    notify: (notification) => showToast(notification.type, notification.message, notification.description, notification.action),
    onCloudChanged: () => setCloudRefreshVersion((version) => version + 1),
    onNavigateLessons: () => setActiveSection('lessons'),
    onCopyTitle: setCurrentLessonTitle,
  });

  const handleCreateNewLesson = () => {
    if (!confirmDiscard('Bài học hiện tại có thay đổi chưa lưu. Bạn có muốn bỏ các thay đổi này?')) return;
    resetEditor('Bài học mới');
    resetLessonPersistence(createLessonFingerprint(buildLessonDraft({ title: 'Bài học mới', rawText: '', speechList: [], settings: getCurrentLessonSettings() })));
    setActiveSection('builder');
  };

  const handleSectionChange = (section: 'lessons' | 'builder') => {
    if (section === 'lessons' && activeSection === 'builder' && !confirmDiscard('Bài học có thay đổi chưa lưu. Bạn có muốn rời khỏi trình soạn thảo?')) return;
    setActiveSection(section);
  };

  const {
    manifests,
    progress: preparationProgress,
    isPreparing: isPreparingAudio,
    isLoadingManifest: isLoadingManifests,
    error: preparationError,
    startPreparation,
    stopPreparation,
    deletePreparedAudio,
    cleanUnusedAudio
  } = usePremiumAudioPreparation({
    userId: user?.uid || null,
    lessonId: currentLessonId,
    speechList,
    userGeminiApiKey,
    premiumVoiceSettings
  });

  const { generateTts } = usePremiumTts();

  // Clear premium audio cache when API key changes
  useEffect(() => {
    premiumTtsCacheStore.clear();
  }, [userGeminiApiKey]);

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
  };

  // Keep references to avoid browser closure or garbage collection issues
  const activePlayingIdRef = useRef<string | null>(null);
  const speechListRef = useRef<SpeechItem[]>([]);

  // Track mutable list to avoid closure locking in async timers
  useEffect(() => {
    speechListRef.current = speechList;
  }, [speechList]);

  // Load browser speech synthesis voices
  useEffect(() => {
    const fetchVoices = () => {
      const browserSpeechAdapter = browserSpeechAdapterRef.current;
      if (browserSpeechAdapter) {
        const availableVoices = browserSpeechAdapter.getVoices();
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
    return browserSpeechAdapterRef.current?.subscribeToVoiceChanges(fetchVoices);
  }, [
    selectedEnVoiceName,
    selectedViVoiceName,
    selectedZhCnVoiceName,
    selectedZhTwVoiceName,
    selectedJaVoiceName,
    selectedKoVoiceName
  ]);

  // Clean speech when active item finishes or component unmounts
  useEffect(() => () => browserSpeechAdapterRef.current?.stop(), []);

  // Shared playlist background loader hook
  const {
    shareLoading,
    bannerMessage,
    bannerType,
    loadedDetails,
    closeBanner,
    handleRetry,
    handleCreateNew,
  } = useSharedPlaylistLoader({
    setSpeechList,
    setRawText,
    setSpeed,
    setVolume,
    setAutoAdvance,
    setTimeBetweenLines,
    setPlaylistLoopMode: handlePlaylistLoopModeChange,
    setEngineMode,
    handleCreateList,
  });

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
        const sanitizedItems = parseSpeechListImport(String(event.target?.result ?? ''));
        setSpeechList(sanitizedItems);
        setRawText(sanitizedItems.map(item => item.text).join('\n'));
        alert(`Nháº­p thĂ nh cĂ´ng ${sanitizedItems.length} cĂ¢u thoáº¡i tá»« file backup! Táº¥t cáº£ thiáº¿t láº­p, thá»i gian chá» nghá»‰ (delay), sá»‘ láº§n láº·p vĂ  hĂ¬nh áº£nh gĂ¡n sẵn Ä‘Ă£ Ä‘Æ°á»£c khĂ´i phá»¥c nguyĂªn váº¹n.`);
      } catch (err: unknown) {
        console.error(err);
        alert(`KhĂ´ng thá»ƒ Ä‘á»c file: ${err instanceof Error ? err.message : 'Äá»‹nh dáº¡ng JSON khĂ´ng há»£p lá»‡.'}`);
      } finally {
        e.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  function handleCreateList(textOverride?: string) {
    const sourceText = typeof textOverride === 'string' ? textOverride : rawText;
    const nonce = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const newList = buildSpeechItems({
      sourceText,
      timeBetweenLines,
      speed,
      autoGroupSet,
      setMultiplier,
      createId: (kind, index) => `${kind}-${nonce}-${index}`,
    });

    setSpeechList(newList);
    handleStopAll();
  }
  // Add single custom row
  const handleAddSingleRow = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRowText.trim()) return;

    // Parse symbols from the text if provided in the quick action form
    const { cleanText, repeats, delaySec } = parseLineSymbols(newRowText.trim(), newRowRepeats, newRowDelay);
    const detected = detectLanguage(cleanText);
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
    browserSpeechAdapterRef.current?.stop();
    audioPlaybackAdapterRef.current?.stop();

    clearWaitTimers();

    isSpeechSynthesisPausedRef.current = false;
    isPremiumAudioPausedRef.current = false;

    let currentIteration = 1;
    const maxIterations = item.repeats || 1;
    activePlayingIdRef.current = item.id;

    if (engineMode === 'browser') {
      const browserSpeechAdapter = browserSpeechAdapterRef.current;
      if (!browserSpeechAdapter) {
        alert('Trình duyệt của bạn không hỗ trợ Web Speech API. Vui lòng thử dùng Google Chrome.');
        return;
      }
      startPlayback(item.id);

      const speakIteration = () => {
        // Security guard to check if audio was general-stopped or switched to another item
        if (activePlayingIdRef.current !== item.id) {
          setPlayingItemId(null);
          setCurrentRepeatIndex(0);
          setPlayingState('idle');
          clearWaitTimers();
          return;
        }

        const langCode = item.selectedLang === 'auto' ? item.detectedLang : item.selectedLang;
        const preferredVoiceName = langCode === 'en'
          ? selectedEnVoiceName
          : langCode === 'vi'
            ? selectedViVoiceName
            : langCode === 'zh-cn'
              ? selectedZhCnVoiceName
              : langCode === 'zh-tw'
                ? selectedZhTwVoiceName
                : langCode === 'ja'
                  ? selectedJaVoiceName
                  : selectedKoVoiceName;

        browserSpeechAdapter.speak({
          text: item.text,
          language: langCode,
          speed: item.speed ?? speed,
          volume,
          preferredVoiceName,
          onStart: () => {
            setPlayingItemId(item.id);
            setCurrentRepeatIndex(currentIteration);
            setPlayingState('playing');
          },
          onEnd: () => {
            if (activePlayingIdRef.current !== item.id) {
              setPlayingItemId(null);
              setCurrentRepeatIndex(0);
              setPlayingState('idle');
              clearWaitTimers();
              return;
            }

            const currentDelay = item.delaySec ?? 2;
            if (currentIteration < maxIterations) {
              currentIteration++;
              setPlayingState('paused');
              startCountdown(currentDelay, 'repeat', speakIteration, item.id);
            } else if (autoAdvance) {
              setPlayingState('paused');
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
          },
          onError: (event) => {
            console.warn('Speech Engine warning:', event);
            setPlayingItemId(null);
            setCurrentRepeatIndex(0);
            setPlayingState('idle');
            clearWaitTimers();
          },
        });
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
      startPlayback(item.id);

      setPlayingItemId(item.id);
      setPlayingState('playing');
      setCurrentRepeatIndex(1);

      const langCode = item.selectedLang === 'auto' ? item.detectedLang : item.selectedLang;
      const chosenVoice = getPremiumVoiceForLang(langCode, premiumVoiceSettings);

      try {
        const audioUrl = await resolvePremiumAudio({
          userId: user?.uid || null,
          lessonId: currentLessonId,
          text: item.text,
          lang: langCode,
          voice: chosenVoice,
          apiKey: userGeminiApiKey,
          mode: 'prefer-saved',
          manifests
        });

        const playIteration = () => {
          if (activePlayingIdRef.current !== item.id) {
            setPlayingItemId(null);
            setCurrentRepeatIndex(0);
            setPlayingState('idle');
            clearWaitTimers();
            return;
          }

          const audio = new Audio(audioUrl);
          audioPlaybackAdapterRef.current?.attach(audio, volume);
          audio.playbackRate = item.speed !== undefined ? item.speed : speed;

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

      } catch (err: unknown) {
        console.error("Premium audio generation failed:", err);
        alert(err instanceof Error ? err.message : "Không thể tải giọng đọc AI Premium. Hãy đảm bảo API Key đã được cấp hoặc chuyển về chế độ Trình duyệt của máy.");
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
    browserSpeechAdapterRef.current?.stop();
    audioPlaybackAdapterRef.current?.stop();

    clearWaitTimers();
    activePlayingIdRef.current = null;
    stopPlayback();
    isSpeechSynthesisPausedRef.current = false;
    isPremiumAudioPausedRef.current = false;
  };

  const handleGlobalPause = () => {
    if (playingState === 'idle' || isManualPaused) return;

    pausePlayback();

    // Case 1: Active speech is playing
    if (playingState === 'playing') {
      if (engineMode === 'browser') {
        browserSpeechAdapterRef.current?.pause();
        isSpeechSynthesisPausedRef.current = true;
      } else {
        audioPlaybackAdapterRef.current?.pause();
        isPremiumAudioPausedRef.current = true;
      }
    }
    // Case 2: In a countdown timer delay (repeat countdown or auto advance countdown)
    else if (playingState === 'paused' && waitingState.isWaiting) {
      const paused = countdownControllerRef.current?.pause();
      if (paused) {
        setWaitingState({ isWaiting: false, remainingSec: paused.remainingSec, itemId: paused.itemId, type: paused.type });
      }
    }  };

  const handleGlobalResume = () => {
    if (!isManualPaused) return;

    resumePlayback();

    // Case 1: Voice was playing before pause
    if (isSpeechSynthesisPausedRef.current) {
      browserSpeechAdapterRef.current?.resume();
      isSpeechSynthesisPausedRef.current = false;
      setPlayingState('playing');
    } else if (isPremiumAudioPausedRef.current) {
      void audioPlaybackAdapterRef.current?.resume().then(() => {
        isPremiumAudioPausedRef.current = false;
        setPlayingState('playing');
      }).catch(err => {
        console.error("Failed to resume Premium Audio:", err);
      });
    }
    // Case 2: Resume the controller-owned countdown.
    else {
      const countdown = countdownControllerRef.current?.getSnapshot();
      if (countdown?.paused) {
        setPlayingState('paused');
        countdownControllerRef.current?.resume();
      }
    }  };

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
    premiumTtsCacheStore.clear();
  };

  // Apply templates
  const handleApplyTemplate = (content: string) => {
    setRawText(content);
    handleCreateList(content);
  };

  const handleRowRepeatsChange = (id: string, count: number) => {
    setSpeechList((items) => updateSpeechItem(items, id, { repeats: count }));
  };

  const handleRowDelayChange = (id: string, delay: number) => {
    setSpeechList((items) => updateSpeechItem(items, id, { delaySec: delay }));
  };

  const handleRowSpeedChange = (id: string, rate: number) => {
    setSpeechList((items) => updateSpeechItem(items, id, { speed: rate }));
  };

  const handleRowLangChange = (id: string, selectedLang: LanguageCode | 'auto') => {
    setSpeechList((items) => updateSpeechItem(items, id, { selectedLang }));
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
        const detected = detectLanguage(cleanText);
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
    const setId = `set-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setSpeechList((items) => joinWithNext(items, index, setId));
  };

  const handleUngroupSet = (setId: string) => {
    setSpeechList((items) => ungroupSet(items, setId));
  };

  const handleDuplicateSet = (setId: string) => {
    const nonce = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setSpeechList((items) => duplicateSet(items, setId, {
      createSetId: () => `set-${nonce}`,
      createRowId: (sourceId) => `row-${nonce}-${sourceId}-dup`,
    }));
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
    <div id="classroom-tts-root" className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-indigo-100 selection:text-indigo-900">

      <AppShell
        activeSection={activeSection}
        onSectionChange={handleSectionChange}
        onCreateNewLesson={handleCreateNewLesson}
        engineMode={engineMode}
        hasPremiumKey={!!userGeminiApiKey}
        speechCount={speechList.length}
      >
        {activeSection === 'lessons' ? (
          <LessonsView
            currentRawText={rawText}
            currentSpeechList={speechList}
            currentSettings={getCurrentLessonSettings()}
            cloudRefreshVersion={cloudRefreshVersion}
            onLoadLesson={(lesson) => {
              const normalizedLesson = hydrateLessonDocument(lesson.id, lesson);
              const s = normalizedLesson.settings;

              // 1. Restore raw text editor
              setRawText(normalizedLesson.rawText);

              // 2. Restore all configurations
              setSpeed(s.speed);
              setTimeBetweenLines(s.timeBetweenLines);
              setRowLayoutMode(s.rowLayoutMode);
              setEngineMode(s.engineMode);

              setSelectedPremiumVoiceEn(s.selectedPremiumVoiceEn);
              setSelectedPremiumVoiceVi(s.selectedPremiumVoiceVi);
              setSelectedPremiumVoiceZhCn(s.selectedPremiumVoiceZhCn);
              setSelectedPremiumVoiceZhTw(s.selectedPremiumVoiceZhTw);
              setSelectedPremiumVoiceJa(s.selectedPremiumVoiceJa);
              setSelectedPremiumVoiceKo(s.selectedPremiumVoiceKo);

              setSelectedEnVoiceName(s.selectedEnVoiceName);
              setSelectedViVoiceName(s.selectedViVoiceName);
              setSelectedZhCnVoiceName(s.selectedZhCnVoiceName);
              setSelectedZhTwVoiceName(s.selectedZhTwVoiceName);
              setSelectedJaVoiceName(s.selectedJaVoiceName);
              setSelectedKoVoiceName(s.selectedKoVoiceName);

              handleAutoGroupSetChange(s.autoGroupSet);
              handleSetMultiplierChange(s.setMultiplier);
              handleUseUniversalImageChange(s.useUniversalImage);
              handleUniversalImageUrlChange(s.universalImageUrl);

              // 3. Restore list of cards & its custom images
              if (normalizedLesson.speechList.length > 0) {
                setSpeechList(normalizedLesson.speechList);
              } else {
                handleCreateList(normalizedLesson.rawText);
              }

              // Set active lesson identification
              loadLessonPersistence(normalizedLesson.id, normalizedLesson.revision, createLessonFingerprint(buildLessonDraft({ title: normalizedLesson.title, rawText: normalizedLesson.rawText, speechList: normalizedLesson.speechList, settings: normalizedLesson.settings, folderId: normalizedLesson.folderId })));
              setCurrentLessonTitle(normalizedLesson.title);

              // Transition to builder workspace
              setActiveSection('builder');
            }}
          />
        ) : (
          <LessonBuilderView
            currentLessonId={currentLessonId}
            currentLessonTitle={currentLessonTitle}
            setCurrentLessonTitle={setCurrentLessonTitle}
            onSaveLesson={handleSaveLesson}
            onSaveAsCopy={handleSaveLessonAsCopy}
            isSaving={isSavingCloudLesson}
            saveStatus={lessonSaveStatus}
            saveError={lessonSaveError}
            onOpenExport={() => setIsAudioExportModalOpen(true)}
            onOpenShare={() => setIsShareModalOpen(true)}
            speechCount={speechList.length}
            leftColumn={
              <>
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



              {/* ChatGPT Prompt Builder Helper Card */}
              <div id="gpt-prompt-helper-box" className="bg-gradient-to-br from-indigo-50/70 via-slate-50 to-pink-50/70 border border-slate-200 rounded-2xl p-5 shadow-xs text-left">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5 justify-start">
                      <Sparkles className="w-4 h-4 text-pink-500 animate-pulse" />
                      Mẫu Prompt AI Tạo Giáo Án
                    </h3>
                    <p className="text-[11px] text-slate-505 mt-0.5">
                      Dán câu lệnh vào ChatGPT / Claude / Gemini để nhận danh sách từ và câu song ngữ nhanh chóng.
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
                        Đã copy!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        Sao chép Prompt
                      </>
                    )}
                  </button>
                </div>

                {/* Guide/Explanation of special symbols - COLLAPSED / TOGGLED */}
                <div className="space-y-2 mb-4">
                  <button
                    type="button"
                    onClick={() => setShowGptPromptGuide(!showGptPromptGuide)}
                    className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 select-none cursor-pointer"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>{showGptPromptGuide ? "Ẩn hướng dẫn ký hiệu / ;" : "Trợ giúp: Hướng dẫn ký hiệu đặc biệt / ;"}</span>
                  </button>
                  {showGptPromptGuide && (
                    <div className="bg-indigo-50/40 border border-indigo-100 rounded-xl p-3 text-[11px] text-slate-605 space-y-1.5 leading-relaxed animate-fade-in text-left">
                      <ul className="list-disc pl-4 space-y-1 text-[10.5px]">
                        <li>
                          <strong className="text-pink-600 font-mono">Dấu gạch chéo (/Y)</strong>: Quy định <strong className="text-slate-800">thời gian nghỉ (giây)</strong> sau dòng đó. <br />
                          <span className="text-slate-500">Ví dụ: <code className="bg-slate-100 px-1 rounded text-[10px]">Xin chào /2</code> (Đọc xong "Xin chào" sẽ dừng nghỉ 2 giây rồi đọc tiếp).</span>
                        </li>
                        <li>
                          <strong className="text-indigo-600 font-mono">Dấu chấm phẩy (;X)</strong>: Quy định <strong className="text-slate-800">số lần đọc lặp lại</strong> dòng đó. <br />
                          <span className="text-slate-500">Ví dụ: <code className="bg-slate-100 px-1 rounded text-[10px]">Apple ;3</code> (Nói từ "Apple" lặp 3 lần liên tiếp rồi học tiếp câu sau).</span>
                        </li>
                      </ul>
                    </div>
                  )}
                </div>

                {/* Live configuration tools */}
                <div className="grid grid-cols-1 gap-4 mb-4">
                  {/* Topic Input */}
                  <div className="space-y-1.5">
                    <label htmlFor="prompt-topic-input" className="text-[10px] font-bold text-slate-500 flex items-center gap-1 uppercase tracking-wider">
                      ✍️ 1. NHẬP CHỦ ĐỀ MUỐN HỌC:
                    </label>
                    <input
                      id="prompt-topic-input"
                      type="text"
                      value={promptTopic}
                      onChange={(e) => setPromptTopic(e.target.value)}
                      placeholder="Ví dụ: Đàm thoại tại nhà hàng, Từ vựng sân bay..."
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-hidden transition text-slate-800"
                    />
                  </div>

                  {/* Main Ideas Input */}
                  <div className="space-y-1.5">
                    <label htmlFor="prompt-ideas-input" className="text-[10px] font-bold text-slate-500 flex items-center gap-1 uppercase tracking-wider">
                      💡 2. Ý CHÍNH CẦN PHÁT TRIỂN:
                    </label>
                    <textarea
                      id="prompt-ideas-input"
                      value={promptMainIdeas}
                      onChange={(e) => setPromptMainIdeas(e.target.value)}
                      placeholder="Ví dụ: Khuyến khích người dân sử dụng phương tiện xanh, điện sạch, xe buýt để tránh kẹt xe và chống biến đổi khí hậu..."
                      rows={2.5}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-hidden transition resize-none text-slate-800 font-sans leading-relaxed"
                    />
                  </div>

                  {/* Prompt Type Selector */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 flex items-center gap-1 uppercase tracking-wider">
                      ⚙️ 3. CHỌN CẤU TRÚC PHÂN CÁCH NGHỈ:
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {[
                        { id: 'basic', label: 'Không có gạch nghỉ /', desc: 'Mẫu cơ bản thô' },
                        { id: 'repeat', label: 'Chỉ có dấu lặp ;', desc: 'Có tần suất lặp ;X' },
                        { id: 'pause', label: 'Chỉ có khoảng nghỉ /', desc: 'Mẫu có giãn cách /Y' },
                        { id: 'advanced', label: 'Mẫu gộp nâng cao ; /', desc: 'Gộp cả lặp ;X và nghỉ /Y' },
                      ].map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setPromptType(t.id as PromptType)}
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
                    <pre className="text-[10.5px] font-mono text-indigo-100 whitespace-pre-wrap max-h-40 overflow-y-auto leading-relaxed scrollbar-thin text-left select-all pr-2">
                      {generatedPrompt}
                    </pre>
                    <div className="mt-2 pt-2 border-t border-slate-850 flex flex-col text-[9px] text-slate-400 gap-1.5">
                      <span>* Giáo án được tạo xen kẽ song ngữ, tuần tự hợp lý.</span>
                      <span className="font-mono text-indigo-350 bg-slate-900/90 px-1.5 py-0.5 rounded border border-slate-800 shrink-0 select-none text-center">
                        Bấm sao chép để dán vào AI
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          }
          centerColumn={
            <>
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

              {/* Instruction workflow summary tips - COLLAPSED / TOGGLED */}
              <div id="classroom-drill-card" className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs text-left">
                <button
                  type="button"
                  onClick={() => setShowDrillGuide(!showDrillGuide)}
                  className="w-full flex items-center justify-between text-slate-800 font-bold select-none cursor-pointer text-xs"
                >
                  <div className="flex items-center space-x-2">
                    <HelpCircle className="w-4 h-4 text-slate-500 shrink-0" />
                    <span>Mẹo kiểm tra và thi chính tả (Dictation Drill)</span>
                  </div>
                  <span className="text-[10px] text-indigo-600 underline font-extrabold shrink-0 ml-2">
                    {showDrillGuide ? 'Ẩn trợ giúp' : 'Bấm Trợ giúp'}
                  </span>
                </button>
                {showDrillGuide && (
                  <div className="mt-3 pt-3 border-t border-slate-100 flex flex-col sm:flex-row gap-3 items-start animate-fade-in">
                    <div className="bg-indigo-50 p-2 rounded-xl text-indigo-650 shrink-0">
                      <HelpCircle className="w-4 h-4" />
                    </div>
                    <div className="text-left text-xs text-slate-500 leading-relaxed space-y-1">
                      <h4 className="font-bold text-slate-900 text-xs mb-1">Cách tạo bài nghe chính tả hoàn hảo:</h4>
                      <ol className="list-decimal list-inside space-y-1">
                        <li>Cài số lần lặp (<strong className="text-slate-700">Lặp</strong>) cho mỗi câu là <strong className="text-indigo-650 font-semibold">2 hoặc 3 lần</strong>.</li>
                        <li>Bật nút tắt <strong className="text-indigo-600 font-semibold">Tự động chuyển câu</strong> ở cột phải và đặt thời gian nghỉ là <strong className="text-slate-700 font-semibold">3-4 giây</strong>.</li>
                        <li>Bấm <strong className="text-slate-800 font-semibold">Phát toàn bài (Play)</strong>. Hệ thống sẽ đọc câu, lặp lại phù hợp, chờ ghi chép rồi tự đi tiếp mượt mà!</li>
                      </ol>
                    </div>
                  </div>
                )}
              </div>
            </>
          }
          rightColumn={
            <>
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
              <div id="universal-theme-box" className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs text-left">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-3">
                  <h3 className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-indigo-600" />
                    Ảnh nền đồng nhất chuỗi học
                  </h3>
                  <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full uppercase">Tùy chọn</span>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl p-3">
                    <div className="flex flex-col pr-2 text-xs">
                      <span className="font-bold text-slate-700">Đồng nhất ảnh minh họa</span>
                      <span className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">
                        Áp dụng 1 ảnh nền duy nhất cho tất cả các câu
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
                      <label htmlFor="universal-img-url" className="text-[10px] font-bold text-slate-500 uppercase block">
                        URL hình ảnh chủ đề hoặc ảnh chụp
                      </label>
                      <div className="flex gap-2">
                        <input
                          id="universal-img-url"
                          type="text"
                          placeholder="Dán URL hình hoặc click Tìm ảnh..."
                          className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-hidden text-slate-705 font-sans"
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
                          className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold border border-indigo-200 text-xs px-2.5 py-1.5 rounded-lg transition shrink-0 cursor-pointer flex items-center justify-center gap-1"
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
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Instruction on Chrome High-Quality Voice Activation - COLLAPSED / TOGGLED */}
              <div id="chrome-voice-info-card" className="bg-emerald-50/50 border border-emerald-150 rounded-2xl p-4 text-xs text-emerald-800 text-left">
                <button
                  type="button"
                  onClick={() => setShowChromeTip(!showChromeTip)}
                  className="w-full flex items-center justify-between text-emerald-900 font-bold select-none cursor-pointer"
                >
                  <div className="flex items-center space-x-2">
                    <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Mẹo dùng giọng Chrome hay nhất</span>
                  </div>
                  <span className="text-[10px] text-emerald-650 underline font-extrabold shrink-0 ml-2">
                    {showChromeTip ? 'Ẩn trợ giúp' : 'Bấm Trợ giúp'}
                  </span>
                </button>
                {showChromeTip && (
                  <p className="leading-relaxed mt-2.5 pt-2.5 border-t border-emerald-100/60 text-slate-700 text-[11px] animate-fade-in">
                    Mặc định trình duyệt Chrome có sẵn gói tts online cực hay như <strong className="text-slate-900">&quot;Google tiếng Việt&quot;</strong> và <strong className="text-slate-900">&quot;Google US English&quot;</strong>. Chọn các giọng có chữ &quot;Google&quot; trong phần cấu hình hoặc chuyển sang chế độ Premium AI để tận dụng sức mạnh trí tuệ nhân tạo Gemini!
                  </p>
                )}
              </div>
            </>
          }
          />
        )}
      </AppShell>

      {/* Modern Search & Assign Image Modal */}
      {isImageSearchModalOpen && (
        <React.Suspense fallback={null}>
          <ImageSearchModal
            isOpen
            onClose={() => {
              setIsImageSearchModalOpen(false);
              setSelectedItemForImageSearch(null);
            }}
            item={selectedItemForImageSearch}
            onAssignImage={handleAssignImage}
          />
        </React.Suspense>
      )}

      {/* Shared Playlist Imported Banner Notification */}
      <SharedPlaylistBanner
        message={bannerMessage}
        type={bannerType}
        loadedDetails={loadedDetails}
        onClose={closeBanner}
        onRetry={handleRetry}
        onCreateNew={handleCreateNew}
      />

      {/* Share Playlist Modal */}
      {isShareModalOpen && (
        <React.Suspense fallback={null}>
          <ShareModal
            isOpen
            onClose={() => setIsShareModalOpen(false)}
            speechList={speechList}
            speed={speed}
            volume={volume}
            autoAdvance={autoAdvance}
            timeBetweenLines={timeBetweenLines}
            playlistLoopMode={playlistLoopMode}
            engineMode={engineMode}
          />
        </React.Suspense>
      )}

      {/* Cinematic Theater/Movie Practice Board Overlay */}
      {isTheaterMode && (
        <React.Suspense fallback={null}>
          <TheaterPlayer
            isOpen
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
        </React.Suspense>
      )}

      {/* Independent Speech/Playlist Audio To MP3/WAV Exporter Overlay */}
      {isAudioExportModalOpen && (
        <React.Suspense fallback={null}>
          <AudioExportModal
            isOpen
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
            userId={user?.uid || null}
            lessonId={currentLessonId}
          />
        </React.Suspense>
      )}

      {/* Sleek Toast Notifications */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-[999] max-w-sm w-full bg-slate-900 border border-slate-800 text-white rounded-2xl shadow-xl p-4 flex gap-3.5 items-start font-sans"
          >
            <div className="flex-1 space-y-1">
              <h4 className="text-xs font-extrabold flex items-center gap-1.5">
                {toast.type === 'success' && <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />}
                {toast.type === 'error' && <span className="inline-block w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />}
                {toast.type === 'info' && <span className="inline-block w-2.5 h-2.5 rounded-full bg-sky-500 shrink-0" />}
                {toast.message}
              </h4>
              {toast.description && (
                <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
                  {toast.description}
                </p>
              )}
            </div>

            <div className="flex flex-col items-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setToast(null)}
                className="text-slate-400 hover:text-white p-0.5 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
              {toast.action && (
                <button
                  type="button"
                  onClick={() => {
                    toast.action?.onClick();
                    setToast(null);
                  }}
                  className="mt-1 text-[10px] font-bold bg-indigo-600 hover:bg-indigo-700 text-white px-2.5 py-1.5 rounded-lg transition active:scale-95 cursor-pointer shadow-sm"
                >
                  {toast.action.label}
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
