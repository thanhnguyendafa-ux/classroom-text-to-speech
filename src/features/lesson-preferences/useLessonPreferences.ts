import { useCallback, useState } from 'react';
import { parseLoopMode, parseRowLayoutMode, readStoredValue } from './lessonPreferences';

function browserStorage(): Storage | null {
  return typeof window === 'undefined' ? null : window.localStorage;
}

function initialValue(key: string, fallback: string) {
  const storage = browserStorage();
  return storage ? readStoredValue(storage, key, fallback) : fallback;
}

function persist(key: string, value: string) {
  try {
    browserStorage()?.setItem(key, value);
  } catch {
    // Preferences remain valid in memory when browser storage is unavailable.
  }
}

export function useLessonPreferences() {
  const [volumeState, setVolumeState] = useState(() => Number(initialValue('speechVolume', '1')) || 1);
  const [autoGroupSet, setAutoGroupSet] = useState(() => initialValue('autoGroupSet', 'false') === 'true');
  const [setMultiplier, setSetMultiplier] = useState(() => Number.parseInt(initialValue('setMultiplier', '1'), 10) || 1);
  const [useUniversalImage, setUseUniversalImage] = useState(() => initialValue('useUniversalImage', 'false') === 'true');
  const [universalImageUrl, setUniversalImageUrl] = useState(() => initialValue('universalImageUrl', ''));
  const [playlistLoopMode, setPlaylistLoopMode] = useState(() => parseLoopMode(initialValue('playlistLoopMode', 'once')));
  const [rowLayoutMode, setRowLayoutModeState] = useState(() => parseRowLayoutMode(initialValue('rowLayoutMode', 'below')));

  const setVolume = useCallback((value: number) => {
    setVolumeState(value);
    persist('speechVolume', String(value));
  }, []);
  const handleAutoGroupSetChange = useCallback((value: boolean) => {
    setAutoGroupSet(value);
    persist('autoGroupSet', String(value));
  }, []);
  const handleSetMultiplierChange = useCallback((value: number) => {
    setSetMultiplier(value);
    persist('setMultiplier', String(value));
  }, []);
  const handleUseUniversalImageChange = useCallback((value: boolean) => {
    setUseUniversalImage(value);
    persist('useUniversalImage', String(value));
  }, []);
  const handleUniversalImageUrlChange = useCallback((value: string) => {
    setUniversalImageUrl(value);
    persist('universalImageUrl', value);
  }, []);
  const handlePlaylistLoopModeChange = useCallback((value: 'once' | 'infinite') => {
    setPlaylistLoopMode(value);
    persist('playlistLoopMode', value);
  }, []);
  const setRowLayoutMode = useCallback((value: 'below' | 'side') => {
    setRowLayoutModeState(value);
    persist('rowLayoutMode', value);
  }, []);

  return {
    volume: volumeState,
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
  };
}
