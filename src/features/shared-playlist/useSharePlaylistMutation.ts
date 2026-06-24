import { useState } from "react";
import { createSharedPlaylistApi, PlaylistPayload } from "./sharedPlaylistApi";

export function useSharePlaylistMutation() {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [shareId, setShareId] = useState<string | null>(null);

  const generateShareLink = async (payload: PlaylistPayload) => {
    setIsLoading(true);
    setError(null);
    setShareId(null);
    try {
      const data = await createSharedPlaylistApi(payload);
      setShareId(data.id);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Không thể tạo liên kết chia sẻ. Vui lòng thử lại.");
    } finally {
      setIsLoading(false);
    }
  };

  const resetMutation = () => {
    setIsLoading(false);
    setError(null);
    setShareId(null);
  };

  return {
    isLoading,
    error,
    shareId,
    generateShareLink,
    resetMutation,
  };
}
