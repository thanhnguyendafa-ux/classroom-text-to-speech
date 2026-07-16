import React, { useCallback, useMemo, useState, useEffect, useRef } from 'react';
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
import { useSharedPlaylistLoader } from './features/shared-playlist/useSharedPlaylistLoader';
import SharedPlaylistBanner from './features/shared-playlist/SharedPlaylistBanner';
import AppWorkspace from './components/AppWorkspace';
import { useAuth } from './features/auth/useAuth';
import AppShell from './features/app-shell/AppShell';
import { AppToast, type AppToastModel } from './features/app-shell/AppToast';
import { AppModalLayer } from './features/app-shell/AppModalLayer';
import { LessonBuilderSettingsColumn } from './features/lesson-builder/LessonBuilderSettingsColumn';
import { LessonBuilderCenterColumn } from './features/lesson-builder/LessonBuilderCenterColumn';
import { LessonBuilderInputColumn } from './features/lesson-builder/LessonBuilderInputColumn';
import LessonsView from './features/lessons/LessonsView';
import LessonBuilderView from './features/lesson-builder/LessonBuilderView';
import { createLessonFingerprint } from './features/lesson-editor/lessonEditorStatus';
import { useLessonPreferences } from './features/lesson-preferences/useLessonPreferences';
import { buildSpeechItems } from './features/lesson-editor/speechItemFactory';
import { useLessonEditorController } from './application/lesson-editor/useLessonEditorController';
import { useLessonRowController } from './application/lesson-editor/useLessonRowController';
import { createImageAssignmentActions } from './application/lesson-editor/createImageAssignmentActions';
import { downloadSpeechList, importSpeechListFile } from './application/lesson-editor/speechListTransfer';
import { useLessonPersistenceController } from './application/lesson-persistence/useLessonPersistenceController';
import { loadLessonIntoWorkspace } from './application/lesson-persistence/loadLessonIntoWorkspace';
import { buildLessonSettingsSnapshot, groupBrowserVoices } from './application/lesson-editor/lessonSettingsViewModel';
import { createLessonWorkflowActions } from './application/lesson-editor/createLessonWorkflowActions';
import { useBrowserVoiceCatalog } from './application/playback/useBrowserVoiceCatalog';
import PromptGuidePanel from './features/prompt-guide/PromptGuidePanel';
import { usePlaybackController } from './application/playback/usePlaybackController';


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
  const [toast, setToast] = useState<AppToastModel | null>(null);

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

  const fileInputRef = useRef<HTMLInputElement>(null);
  const browserVoicePreferences = useMemo(() => ({ en: selectedEnVoiceName, vi: selectedViVoiceName, 'zh-cn': selectedZhCnVoiceName, 'zh-tw': selectedZhTwVoiceName, ja: selectedJaVoiceName, ko: selectedKoVoiceName }), [selectedEnVoiceName, selectedViVoiceName, selectedZhCnVoiceName, selectedZhTwVoiceName, selectedJaVoiceName, selectedKoVoiceName]);
  const applyBrowserVoiceDefaults = useCallback((defaults: typeof browserVoicePreferences) => {
    setSelectedEnVoiceName(defaults.en); setSelectedViVoiceName(defaults.vi); setSelectedZhCnVoiceName(defaults['zh-cn']); setSelectedZhTwVoiceName(defaults['zh-tw']); setSelectedJaVoiceName(defaults.ja); setSelectedKoVoiceName(defaults.ko);
  }, []);
  const voices = useBrowserVoiceCatalog({ preferences: browserVoicePreferences, onDefaultsChanged: applyBrowserVoiceDefaults });

  // Auto progression configuration
  const [autoAdvance, setAutoAdvance] = useState<boolean>(true);

  const [isSearchingUniversalImage, setIsSearchingUniversalImage] = useState<boolean>(false);
  const [showChromeTip, setShowChromeTip] = useState<boolean>(false);
  const [showDrillGuide, setShowDrillGuide] = useState<boolean>(false);

  const [timeBetweenLines, setTimeBetweenLines] = useState<number>(2.0); // Default pause time in seconds

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

  const getCurrentLessonSettings = () => buildLessonSettingsSnapshot({ speed, volume, autoAdvance, timeBetweenLines, rowLayoutMode, engineMode, selectedPremiumVoiceEn, selectedPremiumVoiceVi, selectedPremiumVoiceZhCn, selectedPremiumVoiceZhTw, selectedPremiumVoiceJa, selectedPremiumVoiceKo, selectedEnVoiceName, selectedViVoiceName, selectedZhCnVoiceName, selectedZhTwVoiceName, selectedJaVoiceName, selectedKoVoiceName, autoGroupSet, setMultiplier, useUniversalImage, universalImageUrl });

  const currentLessonDraft = buildLessonDraft({ title: currentLessonTitle, rawText, speechList, settings: getCurrentLessonSettings() });
  const { lessonId: currentLessonId, status: lessonSaveStatus, isDirty, isSaving: isSavingCloudLesson, error: lessonSaveError, save: handleSaveLesson, saveAsCopy: handleSaveLessonAsCopy, loadSession: loadLessonPersistence, resetSession: resetLessonPersistence, confirmDiscard } = useLessonPersistenceController({
    userId: user?.uid ?? null,
    draft: currentLessonDraft,
    notify: (notification) => showToast(notification.type, notification.message, notification.description, notification.action),
    onCloudChanged: () => setCloudRefreshVersion((version) => version + 1),
    onNavigateLessons: () => setActiveSection('lessons'),
    onCopyTitle: setCurrentLessonTitle,
  });

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

  const { playingItemId, playingState, currentRepeatIndex, waitingState, isManualPaused, speak: handleSpeakItem, stop: handleStopAll, pause: handleGlobalPause, resume: handleGlobalResume, play: handleGlobalPlay } = usePlaybackController({
    speechList, engineMode, speed, volume, autoAdvance, playlistLoopMode, browserVoices: browserVoicePreferences, premiumVoices: premiumVoiceSettings, apiKey: userGeminiApiKey, userId: user?.uid ?? null, lessonId: currentLessonId, manifests, onUserError: (message) => window.alert(message),
  });

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
  };

  const imageActions = createImageAssignmentActions({ selectedItem: selectedItemForImageSearch, universalMode: isSearchingUniversalImage, setSpeechList, setSelectedItem: setSelectedItemForImageSearch, setUniversalMode: setIsSearchingUniversalImage, setUniversalUrl: handleUniversalImageUrlChange });
  const handleAssignImage = imageActions.assign;
  const handleClearImage = (id: string, event: React.MouseEvent) => { event.stopPropagation(); imageActions.clear(id); };
  const handleExportData = () => { try { downloadSpeechList(speechList); } catch (cause) { console.error(cause); window.alert(speechList.length ? 'Xuất dữ liệu thất bại.' : 'Danh sách câu đang trống.'); } };
  const handleImportData = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; if (!file) return;
    try { const items = await importSpeechListFile(file); loadEditorLesson({ title: currentLessonTitle, rawText: items.map(item => item.text).join('\n'), speechList: items }); window.alert(`Nhập thành công ${items.length} câu thoại.`); }
    catch (cause) { console.error(cause); window.alert(`Không thể đọc file: ${cause instanceof Error ? cause.message : 'JSON không hợp lệ.'}`); }
    finally { event.target.value = ''; }
  };

  const workflowActions = createLessonWorkflowActions({ rawText, timeBetweenLines, speed, autoGroupSet, setMultiplier, speechList, activeSection, confirmDiscard, resetEditor, resetPersistence: resetLessonPersistence, createNewFingerprint: () => createLessonFingerprint(buildLessonDraft({ title: 'Bài học mới', rawText: '', speechList: [], settings: getCurrentLessonSettings() })), buildList: buildSpeechItems, setRawText, setSpeechList, stopPlayback: handleStopAll, clearCache: () => premiumTtsCacheStore.clear(), setActiveSection, setTheaterMode: setIsTheaterMode, speak: handleSpeakItem });
  const handleCreateList = workflowActions.createList;
  const handleCreateNewLesson = workflowActions.createNew;
  const handleSectionChange = workflowActions.changeSection;
  const handleClearAll = workflowActions.clearAll;
  const handleApplyTemplate = workflowActions.applyTemplate;
  const triggerPlaylistDrill = workflowActions.drill;

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

  const { draggedIndex, dragOverIndex, newRowText, setNewRowText, newRowLang, setNewRowLang, newRowRepeats, setNewRowRepeats, newRowDelay, setNewRowDelay, addSingleRow: handleAddSingleRow, dragStart: handleDragStart, dragEnd: handleDragEnd, dragOver: handleDragOver, dropRow: handleDropRow, updateRepeats: handleRowRepeatsChange, updateDelay: handleRowDelayChange, updateSpeed: handleRowSpeedChange, updateLanguage: handleRowLangChange, startEditing: startEditingRow, saveEditing: saveEditedRow, deleteRow: handleDeleteRow, joinNext: handleJoinWithNext, ungroup: handleUngroupSet, duplicate: handleDuplicateSet } = useLessonRowController({ speechList, setSpeechList, speed, playingItemId, stopPlayback: handleStopAll, editingItemId, setEditingItemId, editingText, setEditingText });

  // Filter categories for all supported languages
  const { englishVoices, vietnameseVoices, zhCnVoices, zhTwVoices, japaneseVoices, koreanVoices } = groupBrowserVoices(voices);

  const handleLoadLessonIntoWorkspace = (lesson: { id: string }) => loadLessonIntoWorkspace({
    lesson, setSpeed, setTimeBetweenLines, setRowLayoutMode, setEngineMode,
    setPremiumVoice: { en: setSelectedPremiumVoiceEn, vi: setSelectedPremiumVoiceVi, 'zh-cn': setSelectedPremiumVoiceZhCn, 'zh-tw': setSelectedPremiumVoiceZhTw, ja: setSelectedPremiumVoiceJa, ko: setSelectedPremiumVoiceKo },
    setBrowserVoice: { en: setSelectedEnVoiceName, vi: setSelectedViVoiceName, 'zh-cn': setSelectedZhCnVoiceName, 'zh-tw': setSelectedZhTwVoiceName, ja: setSelectedJaVoiceName, ko: setSelectedKoVoiceName },
    setAutoGroupSet: handleAutoGroupSetChange, setMultiplier: handleSetMultiplierChange, setUniversalImage: handleUseUniversalImageChange, setUniversalImageUrl: handleUniversalImageUrlChange, loadEditorLesson,
    buildLegacySpeechList: normalized => buildSpeechItems({ sourceText: normalized.rawText, timeBetweenLines: normalized.settings.timeBetweenLines, speed: normalized.settings.speed, autoGroupSet: normalized.settings.autoGroupSet, setMultiplier: normalized.settings.setMultiplier, createId: (kind, index) => `loaded-${kind}-${index}` }),
    createFingerprint: createLessonFingerprint, loadPersistence: loadLessonPersistence, onSectionChange: setActiveSection,
  });

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
            onLoadLesson={handleLoadLessonIntoWorkspace}
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
            <LessonBuilderInputColumn inputProps={{ rawText, setRawText, autoGroupSet, onAutoGroupSetChange: handleAutoGroupSetChange, setMultiplier, onSetMultiplierChange: handleSetMultiplierChange, onCreateList: () => handleCreateList(), onClearInput: () => setRawText(''), onApplyTemplate: handleApplyTemplate }} guide={<PromptGuidePanel />} />
          }
          centerColumn={
            <LessonBuilderCenterColumn
              speechListProps={{
                speechList, rowLayoutMode, toggleRowLayoutMode, fileInputRef, handleExportData, triggerPlaylistDrill, handleStopAll, handleClearAll, autoAdvance, newRowText, setNewRowText, newRowLang, setNewRowLang, newRowRepeats, setNewRowRepeats, newRowDelay, setNewRowDelay, handleAddSingleRow, setIsShareModalOpen, setIsAudioExportModalOpen, handleApplyTemplate, playingItemId, currentRepeatIndex, waitingState, editingItemId, editingText, setEditingText, startEditingRow, saveEditedRow, setEditingItemId, draggedIndex, dragOverIndex, handleDragStart, handleDragEnd, handleDragOver, handleDropRow, speed, handleSpeakItem, handleClearImage, setSelectedItemForImageSearch, setIsImageSearchModalOpen, handleRowRepeatsChange, handleRowDelayChange, handleRowSpeedChange, handleRowLangChange, handleJoinWithNext, handleDeleteRow, handleDuplicateSet, handleUngroupSet,
              }}
              showDrillGuide={showDrillGuide}
              onToggleDrillGuide={() => setShowDrillGuide(value => !value)}
            />
          }
          rightColumn={
            <LessonBuilderSettingsColumn
              speechSettings={{
                engineMode, setEngineMode, speed, setSpeed, onApplySpeedToAll: () => setSpeechList(prev => prev.map(item => ({ ...item, speed }))), volume, handleVolumeChange, autoAdvance, setAutoAdvance, timeBetweenLines, setTimeBetweenLines, onApplyDelayToAll: () => setSpeechList(prev => prev.map(item => ({ ...item, delaySec: timeBetweenLines }))), playlistLoopMode, handlePlaylistLoopModeChange, selectedEnVoiceName, setSelectedEnVoiceName, selectedViVoiceName, setSelectedViVoiceName, selectedZhCnVoiceName, setSelectedZhCnVoiceName, selectedZhTwVoiceName, setSelectedZhTwVoiceName, selectedJaVoiceName, setSelectedJaVoiceName, selectedKoVoiceName, setSelectedKoVoiceName, englishVoices, vietnameseVoices, zhCnVoices, zhTwVoices, japaneseVoices, koreanVoices, userGeminiApiKey, showApiKey, setShowApiKey, handleApiKeyChange, clearApiKey, selectedPremiumVoices, onVoiceChange,
              }}
              useUniversalImage={useUniversalImage}
              universalImageUrl={universalImageUrl}
              showChromeTip={showChromeTip}
              onUniversalImageChange={handleUseUniversalImageChange}
              onSearchUniversalImage={() => { setIsSearchingUniversalImage(true); setIsImageSearchModalOpen(true); }}
              onClearUniversalImage={() => handleUniversalImageUrlChange('')}
              onToggleChromeTip={() => setShowChromeTip(value => !value)}
            />
          }
          />
        )}
      </AppShell>

      <SharedPlaylistBanner message={bannerMessage} type={bannerType} loadedDetails={loadedDetails} onClose={closeBanner} onRetry={handleRetry} onCreateNew={handleCreateNew} />

      <AppModalLayer
        imageSearch={{ open: isImageSearchModalOpen, item: selectedItemForImageSearch, onClose: () => { setIsImageSearchModalOpen(false); setSelectedItemForImageSearch(null); }, onAssign: handleAssignImage }}
        share={{ open: isShareModalOpen, onClose: () => setIsShareModalOpen(false), speechList, speed, volume, autoAdvance, timeBetweenLines, playlistLoopMode, engineMode }}
        theater={{ open: isTheaterMode, onClose: () => setIsTheaterMode(false), speechList, playingItemId, playingState, currentRepeatIndex, waitingState, volume, speed, onVolumeChange: handleVolumeChange, onSpeedChange: setSpeed, onPlayItem: handleSpeakItem, onStop: handleStopAll, timeBetweenLines, onTimeBetweenLinesChange: setTimeBetweenLines, autoAdvance, onAutoAdvanceChange: setAutoAdvance, engineMode, playlistLoopMode, onPlaylistLoopModeChange: handlePlaylistLoopModeChange, useUniversalImage, universalImageUrl, isManualPaused, onPause: handleGlobalPause, onPlay: handleGlobalPlay }}
        audioExport={{ open: isAudioExportModalOpen, onClose: () => setIsAudioExportModalOpen(false), speechList, speed, volume, timeBetweenLines, engineMode, apiKey: userGeminiApiKey, voices, browserVoices: browserVoicePreferences, premiumVoices: selectedPremiumVoices, userId: user?.uid ?? null, lessonId: currentLessonId }}
      />

      <AppToast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
