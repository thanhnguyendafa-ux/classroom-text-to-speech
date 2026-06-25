import { SharePlaylistPayload } from "../../types";

export type PlaylistPayload = SharePlaylistPayload;

/**
 * Fetch a shared playlist by its short ID from the API.
 */
export async function fetchSharedPlaylist(shareId: string): Promise<PlaylistPayload> {
  const response = await fetch(`/api/share-playlist/${shareId}`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Không thể tìm thấy liên kết chia sẻ.");
  }
  return response.json();
}

/**
 * Post a shared playlist payload to create a new share link.
 */
export async function createSharedPlaylistApi(payload: PlaylistPayload): Promise<{ id: string }> {
  const response = await fetch("/api/share-playlist", {
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
  return data;
}
