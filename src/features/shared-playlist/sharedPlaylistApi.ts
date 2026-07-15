import { SharePlaylistPayload } from "../../types";
import { normalizeSharePlaylistPayload } from '../../domain/lessonModel';
import { authenticatedFetch } from '../../lib/firebase/authenticatedFetch';

export type PlaylistPayload = SharePlaylistPayload;

/**
 * Fetch a shared playlist by its short ID from the API.
 */
export async function fetchSharedPlaylist(shareId: string): Promise<PlaylistPayload> {
  const response = await authenticatedFetch(`/api/share-playlist/${shareId}`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Không thể tìm thấy liên kết chia sẻ.");
  }
  const data: unknown = await response.json();
  return normalizeSharePlaylistPayload(data);
}

/**
 * Post a shared playlist payload to create a new share link.
 */
export async function createSharedPlaylistApi(payload: PlaylistPayload): Promise<{ id: string }> {
  const response = await authenticatedFetch("/api/share-playlist", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Máy chủ phản hồi lỗi khi tạo mã chia sẻ.");
  }

  const data = await response.json();
  if (!data.id) {
    throw new Error("Định dạng phản hồi không hợp lệ.");
  }
  return { id: (data as { id: string }).id };
}
