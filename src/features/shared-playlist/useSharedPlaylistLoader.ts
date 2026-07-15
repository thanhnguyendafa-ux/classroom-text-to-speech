import { useState, useEffect } from "react";
import type { SpeechItem } from "../../types";
import { fetchSharedPlaylist, PlaylistPayload } from "./sharedPlaylistApi";

export interface LoaderSetters {
  setSpeechList: (list: SpeechItem[]) => void;
  setRawText: (text: string) => void;
  setSpeed: (speed: number) => void;
  setVolume: (volume: number) => void;
  setAutoAdvance: (val: boolean) => void;
  setTimeBetweenLines: (val: number) => void;
  setPlaylistLoopMode: (mode: "once" | "infinite") => void;
  setEngineMode: (mode: "browser" | "premium") => void;
  handleCreateList: () => void;
}

export interface LoadedDetails {
  numSentences: number;
  numImages: number;
  speed: number;
  delay: number;
  loopMode: "once" | "infinite";
}

export function useSharedPlaylistLoader(setters: LoaderSetters) {
  const [shareLoading, setShareLoading] = useState<boolean>(false);
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);
  const [bannerType, setBannerType] = useState<"success" | "error" | null>(null);
  const [loadedDetails, setLoadedDetails] = useState<LoadedDetails | null>(null);
  const [retryShareId, setRetryShareId] = useState<string | null>(null);

  const loadSharedPlaylist = async (shareId: string) => {
    setShareLoading(true);
    setBannerMessage(null);
    setBannerType(null);
    setRetryShareId(shareId);

    try {
      const data: PlaylistPayload = await fetchSharedPlaylist(shareId);

      // Populate app states
      if (Array.isArray(data.speechList)) {
        setters.setSpeechList(data.speechList);
        setters.setRawText(data.speechList.map((item: SpeechItem) => item.text).join("\n"));
      }
      if (typeof data.speed === "number") {
        setters.setSpeed(data.speed);
      }
      if (typeof data.volume === "number") {
        setters.setVolume(data.volume);
      }
      if (typeof data.autoAdvance === "boolean") {
        setters.setAutoAdvance(data.autoAdvance);
      }
      if (typeof data.timeBetweenLines === "number") {
        setters.setTimeBetweenLines(data.timeBetweenLines);
      }
      if (data.playlistLoopMode === "once" || data.playlistLoopMode === "infinite") {
        setters.setPlaylistLoopMode(data.playlistLoopMode);
        if (typeof window !== "undefined") {
          localStorage.setItem("playlistLoopMode", data.playlistLoopMode);
        }
      }
      if (data.engineMode === "browser" || data.engineMode === "premium") {
        setters.setEngineMode(data.engineMode);
      }

      // Store metadata details for beautiful success banner
      const numImages = data.speechList.filter((item: SpeechItem) => item.imageUrl).length;
      setLoadedDetails({
        numSentences: data.speechList.length,
        numImages,
        speed: data.speed,
        delay: data.timeBetweenLines,
        loopMode: data.playlistLoopMode === "infinite" ? "infinite" : "once",
      });

      setBannerMessage("Đã tải bài học được chia sẻ thành công!");
      setBannerType("success");

      // Clean address bar parameters
      if (typeof window !== "undefined") {
        const newUrl = window.location.pathname;
        window.history.replaceState({}, "", newUrl);
      }
    } catch (err: unknown) {
      console.error("Shared playlist loading error:", err);
      setBannerMessage(err instanceof Error ? err.message : "Không thể tải bài học chia sẻ.");
      setBannerType("error");
    } finally {
      setShareLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const shareId = params.get("share");

    if (!shareId) {
      // Auto-create initial playlist with the default raw text if not mounting from share
      setters.handleCreateList();
      return;
    }

    loadSharedPlaylist(shareId);
  }, []);

  const handleRetry = () => {
    if (retryShareId) {
      loadSharedPlaylist(retryShareId);
    }
  };

  const handleCreateNew = () => {
    setBannerMessage(null);
    setBannerType(null);
    setters.handleCreateList();
  };

  const closeBanner = () => {
    setBannerMessage(null);
    setBannerType(null);
  };

  return {
    shareLoading,
    bannerMessage,
    bannerType,
    loadedDetails,
    closeBanner,
    handleRetry,
    handleCreateNew,
  };
}
