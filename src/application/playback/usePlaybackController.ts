import { useCallback, useEffect, useRef } from "react";
import type { EngineMode, PlaylistLoopMode, SpeechItem } from "../../types";
import type { PremiumAudioAsset } from "../../features/premium-tts/persistent-audio/premiumAudioTypes";
import { resolvePremiumAudio } from "../../features/premium-tts/persistent-audio/premiumAudioResolver";
import { getPremiumVoiceForLang } from "../../features/premium-tts/premiumVoices";
import { createBrowserCountdownController, type CountdownController } from "../../features/playback/countdownController";
import { createBrowserAudioPlaybackAdapter } from "../../features/playback/audioPlaybackAdapter";
import { createWindowBrowserSpeechAdapter } from "../../features/playback/browserSpeechAdapter";
import { usePlaybackState } from "../../features/playback/usePlaybackState";
import { createBrowserAudioElement, type AudioElementFactory } from "../../infrastructure/audio/browserAudioFactory";
import { findNextPlaybackItem, resolvePreferredBrowserVoiceName, type BrowserVoicePreferences } from "./playbackOrchestrator";

type PremiumVoiceSettings = Parameters<typeof getPremiumVoiceForLang>[1];
type Input = { speechList: SpeechItem[]; engineMode: EngineMode; speed: number; volume: number; autoAdvance: boolean; playlistLoopMode: PlaylistLoopMode; browserVoices: BrowserVoicePreferences; premiumVoices: PremiumVoiceSettings; apiKey: string; userId: string | null; lessonId: string | null; manifests: PremiumAudioAsset[]; onUserError: (message: string) => void; createAudio?: AudioElementFactory };

export function usePlaybackController(input: Input) {
  const playback = usePlaybackState();
  const audioAdapterRef = useRef<ReturnType<typeof createBrowserAudioPlaybackAdapter> | null>(null);
  const speechAdapterRef = useRef<ReturnType<typeof createWindowBrowserSpeechAdapter> | null>(null);
  const countdownRef = useRef<CountdownController | null>(null);
  const activeItemRef = useRef<string | null>(null);
  const listRef = useRef(input.speechList);
  const speechPausedRef = useRef(false);
  const premiumPausedRef = useRef(false);
  const speakRef = useRef<(item: SpeechItem) => Promise<void>>(async () => undefined);
  if (!audioAdapterRef.current) audioAdapterRef.current = createBrowserAudioPlaybackAdapter();
  if (!speechAdapterRef.current) speechAdapterRef.current = createWindowBrowserSpeechAdapter();
  if (!countdownRef.current) countdownRef.current = createBrowserCountdownController();
  useEffect(() => { listRef.current = input.speechList; }, [input.speechList]);

  const clearCountdown = useCallback(() => { countdownRef.current?.cancel(); playback.setWaitingState({ isWaiting: false, remainingSec: 0, itemId: null, type: null }); }, [playback.setWaitingState]);
  const resetActive = useCallback(() => { playback.setPlayingItemId(null); playback.setCurrentRepeatIndex(0); playback.setPlayingState("idle"); clearCountdown(); }, [clearCountdown, playback.setCurrentRepeatIndex, playback.setPlayingItemId, playback.setPlayingState]);
  const startCountdown = useCallback((durationSec: number, type: "repeat" | "advance", itemId: string, onComplete: () => void) => { countdownRef.current?.start({ durationSec, type, itemId, onTick: (snapshot) => playback.setWaitingState({ isWaiting: !snapshot.paused, remainingSec: snapshot.remainingSec, itemId: snapshot.itemId, type: snapshot.type }), onComplete: () => { playback.setWaitingState({ isWaiting: false, remainingSec: 0, itemId: null, type: null }); onComplete(); } }); }, [playback.setWaitingState]);
  const playNext = useCallback((currentId: string) => { const next = findNextPlaybackItem(listRef.current, currentId, input.playlistLoopMode); if (next) void speakRef.current(next); }, [input.playlistLoopMode]);

  const stop = useCallback(() => { speechAdapterRef.current?.stop(); audioAdapterRef.current?.stop(); clearCountdown(); activeItemRef.current = null; playback.stopPlayback(); speechPausedRef.current = false; premiumPausedRef.current = false; }, [clearCountdown, playback.stopPlayback]);

  const speak = useCallback(async (item: SpeechItem) => {
    speechAdapterRef.current?.stop(); audioAdapterRef.current?.stop(); clearCountdown(); speechPausedRef.current = false; premiumPausedRef.current = false;
    let iteration = 1; const maxIterations = item.repeats || 1; activeItemRef.current = item.id;
    const finishIteration = (repeat: () => void) => { if (activeItemRef.current !== item.id) { resetActive(); return; } const delay = item.delaySec ?? 2; if (iteration < maxIterations) { iteration += 1; playback.setPlayingState("paused"); startCountdown(delay, "repeat", item.id, repeat); } else if (input.autoAdvance) { playback.setPlayingState("paused"); startCountdown(delay, "advance", item.id, () => { resetActive(); playNext(item.id); }); } else resetActive(); };
    if (input.engineMode === "browser") {
      const adapter = speechAdapterRef.current; if (!adapter) { input.onUserError("Trình duyệt không hỗ trợ Web Speech API. Vui lòng dùng Google Chrome."); return; }
      playback.startPlayback(item.id);
      const speakIteration = () => { if (activeItemRef.current !== item.id) { resetActive(); return; } const language = item.selectedLang === "auto" ? item.detectedLang : item.selectedLang; adapter.speak({ text: item.text, language, speed: item.speed ?? input.speed, volume: input.volume, preferredVoiceName: resolvePreferredBrowserVoiceName(language, input.browserVoices), onStart: () => { playback.setPlayingItemId(item.id); playback.setCurrentRepeatIndex(iteration); playback.setPlayingState("playing"); }, onEnd: () => finishIteration(speakIteration), onError: () => resetActive() }); };
      speakIteration(); return;
    }
    if (!input.apiKey.trim()) { input.onUserError("Bạn đã chọn Giọng Premium AI. Vui lòng nhập Gemini API Key để tiếp tục."); resetActive(); return; }
    playback.startPlayback(item.id); playback.setPlayingItemId(item.id); playback.setPlayingState("playing"); playback.setCurrentRepeatIndex(1);
    const language = item.selectedLang === "auto" ? item.detectedLang : item.selectedLang;
    try {
      const audioUrl = await resolvePremiumAudio({ userId: input.userId, lessonId: input.lessonId, text: item.text, lang: language, voice: getPremiumVoiceForLang(language, input.premiumVoices), apiKey: input.apiKey, mode: "prefer-saved", manifests: input.manifests });
      const playIteration = () => { if (activeItemRef.current !== item.id) { resetActive(); return; } const audio = (input.createAudio ?? createBrowserAudioElement)(audioUrl); audioAdapterRef.current?.attach(audio, input.volume); audio.playbackRate = item.speed ?? input.speed; audio.onplay = () => { playback.setPlayingItemId(item.id); playback.setCurrentRepeatIndex(iteration); playback.setPlayingState("playing"); }; audio.onended = () => finishIteration(playIteration); audio.onerror = () => resetActive(); void audio.play().catch(() => resetActive()); };
      playIteration();
    } catch (error) { resetActive(); input.onUserError(error instanceof Error ? error.message : "Không thể tải giọng đọc AI Premium."); }
  }, [clearCountdown, input, playNext, playback, resetActive, startCountdown]);
  speakRef.current = speak;

  const pause = useCallback(() => { if (playback.playingState === "idle" || playback.isManualPaused) return; playback.pausePlayback(); if (playback.playingState === "playing") { if (input.engineMode === "browser") { speechAdapterRef.current?.pause(); speechPausedRef.current = true; } else { audioAdapterRef.current?.pause(); premiumPausedRef.current = true; } } else if (playback.waitingState.isWaiting) { const paused = countdownRef.current?.pause(); if (paused) playback.setWaitingState({ isWaiting: false, remainingSec: paused.remainingSec, itemId: paused.itemId, type: paused.type }); } }, [input.engineMode, playback]);
  const resume = useCallback(() => { if (!playback.isManualPaused) return; playback.resumePlayback(); if (speechPausedRef.current) { speechAdapterRef.current?.resume(); speechPausedRef.current = false; playback.setPlayingState("playing"); } else if (premiumPausedRef.current) { void audioAdapterRef.current?.resume().then(() => { premiumPausedRef.current = false; playback.setPlayingState("playing"); }).catch(() => resetActive()); } else if (countdownRef.current?.getSnapshot()?.paused) { playback.setPlayingState("paused"); countdownRef.current?.resume(); } }, [playback, resetActive]);
  const play = useCallback(() => { if (playback.playingState !== "idle") { if (playback.isManualPaused) resume(); return; } const active = input.speechList.find((item) => item.id === playback.playingItemId) ?? input.speechList[0]; if (active) void speak(active); }, [input.speechList, playback.isManualPaused, playback.playingItemId, playback.playingState, resume, speak]);
  useEffect(() => () => { speechAdapterRef.current?.stop(); audioAdapterRef.current?.stop(); countdownRef.current?.cancel(); }, []);
  return { playingItemId: playback.playingItemId, playingState: playback.playingState, currentRepeatIndex: playback.currentRepeatIndex, waitingState: playback.waitingState, isManualPaused: playback.isManualPaused, speak, stop, pause, resume, play };
}
