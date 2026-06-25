import { SpeechItem, LanguageCode, LessonDocument } from "../types";
import { buildLessonDraft } from "../domain/lessonModel";

export type ValidatedPlaylistPayload = Omit<LessonDocument, 'id' | 'folderId'>;

const VALID_LANGS: LanguageCode[] = ["en", "vi", "zh-cn", "zh-tw", "ja", "ko"];

/**
 * Validates a speech item structure to ensure precise matching with the SpeechItem model in types.ts
 */
export function validateSpeechItem(item: any): SpeechItem {
  if (!item || typeof item !== "object") {
    throw new Error("Mỗi câu luyện tập phải là một đối tượng hợp lệ.");
  }

  const id = typeof item.id === "string" && item.id.trim() 
    ? item.id.trim().substring(0, 50) 
    : `item_${Math.random().toString(36).substring(2, 9)}`;
  
  if (typeof item.text !== "string") {
    throw new Error("Nội dung văn bản luyện nói không hợp lệ.");
  }

  const text = item.text.trim().substring(0, 1000); // Enforce safe character limits
  if (!text) {
    throw new Error("Nội dung văn bản luyện nói không được để trống.");
  }

  // Check language fields
  const detectedLang: LanguageCode = VALID_LANGS.includes(item.detectedLang) 
    ? item.detectedLang 
    : "en";
    
  const selectedLang: LanguageCode | "auto" = (item.selectedLang === "auto" || VALID_LANGS.includes(item.selectedLang)) 
    ? item.selectedLang 
    : "auto";

  // Calculate resolvedLang
  const resolvedLang: LanguageCode = VALID_LANGS.includes(item.resolvedLang)
    ? item.resolvedLang
    : (selectedLang === "auto" ? detectedLang : (selectedLang as LanguageCode));

  const repeats = typeof item.repeats === "number" && !isNaN(item.repeats) 
    ? Math.max(1, Math.min(10, Math.floor(item.repeats))) 
    : 1;

  // Read delay values supporting both 'delay' (from frontend payload) and 'delaySec' (from DB structure)
  const incomingDelay = typeof item.delaySec === "number" ? item.delaySec : item.delay;
  const delaySec = typeof incomingDelay === "number" && !isNaN(incomingDelay) 
    ? Math.max(0, Math.min(30, incomingDelay)) 
    : 2.0;

  const speed = typeof item.speed === "number" && !isNaN(item.speed) 
    ? Math.max(0.25, Math.min(3.0, item.speed)) 
    : undefined;

  let imageUrl: string | undefined = undefined;
  if (typeof item.imageUrl === "string" && item.imageUrl.trim()) {
    imageUrl = item.imageUrl.trim().substring(0, 1500);
    // Enforce absolute URLs or dataURI assets
    if (!imageUrl.startsWith("http://") && !imageUrl.startsWith("https://") && !imageUrl.startsWith("data:image/")) {
      imageUrl = undefined;
    }
  }

  const setId = typeof item.setId === "string" && item.setId.trim() 
    ? item.setId.trim().substring(0, 50) 
    : undefined;

  return {
    id,
    text,
    detectedLang,
    selectedLang,
    resolvedLang,
    repeats,
    delaySec,
    speed,
    setId,
    imageUrl
  };
}

/**
 * Validates the full payload of a shared playlist
 */
export function validatePlaylistPayload(body: any): ValidatedPlaylistPayload {
  const draft = buildLessonDraft(body);
  return {
    title: draft.title,
    rawText: draft.rawText,
    speechList: draft.speechList,
    settings: draft.settings,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}
