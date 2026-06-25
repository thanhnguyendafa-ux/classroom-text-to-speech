import { SharePlaylistPayload } from "../types";
import { normalizeSharePlaylistPayload } from "../domain/lessonModel";

export type ValidatedPlaylistPayload = SharePlaylistPayload;

/**
 * Validates the full payload of a shared playlist using standard canonical validation
 */
export function validatePlaylistPayload(body: any): ValidatedPlaylistPayload {
  if (!body || typeof body !== "object") {
    throw new Error("Payload không hợp lệ.");
  }

  const payload = normalizeSharePlaylistPayload(body);

  if (payload.speechList.length === 0) {
    throw new Error("Danh sách câu luyện nói không được rỗng.");
  }

  if (payload.speechList.length > 100) {
    throw new Error("Mỗi chuỗi chia sẻ chỉ được chứa tối đa 100 câu luyện tập.");
  }

  return payload;
}

