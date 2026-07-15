import type { LanguageCode, SpeechItem } from '../../types';

export interface SpeechItemUpdate {
  repeats?: number;
  delaySec?: number;
  speed?: number;
  selectedLang?: LanguageCode | 'auto';
  text?: string;
  detectedLang?: LanguageCode;
}

export function updateSpeechItem(items: SpeechItem[], id: string, update: SpeechItemUpdate): SpeechItem[] {
  return items.map((item) => {
    if (item.id !== id) return item;
    const next = { ...item, ...update };
    if (update.repeats !== undefined) next.repeats = Math.max(1, Math.min(10, update.repeats));
    if (update.delaySec !== undefined) next.delaySec = Math.max(0.5, Math.min(20, Math.round(update.delaySec * 10) / 10));
    if (update.speed !== undefined) next.speed = Math.max(0.3, Math.min(2, Math.round(update.speed * 10) / 10));
    if (update.selectedLang !== undefined) next.resolvedLang = update.selectedLang === 'auto' ? next.detectedLang : update.selectedLang;
    return next;
  });
}

export function joinWithNext(items: SpeechItem[], index: number, setId: string): SpeechItem[] {
  if (index < 0 || index >= items.length - 1) return items;
  const next = [...items];
  next[index] = { ...next[index], setId };
  next[index + 1] = { ...next[index + 1], setId };
  return next;
}

export function ungroupSet(items: SpeechItem[], setId: string): SpeechItem[] {
  return items.map((item) => {
    if (item.setId !== setId) return item;
    const { setId: _setId, ...rest } = item;
    return rest;
  });
}

export interface DuplicateSetIds {
  createSetId: () => string;
  createRowId: (sourceId: string) => string;
}

export function duplicateSet(items: SpeechItem[], setId: string, ids: DuplicateSetIds): SpeechItem[] {
  const members = items.filter((item) => item.setId === setId);
  if (members.length === 0) return items;
  const newSetId = ids.createSetId();
  const duplicates = members.map((item) => ({ ...item, id: ids.createRowId(item.id), setId: newSetId }));
  let lastIndex = -1;
  for (let index = items.length - 1; index >= 0; index -= 1) {
    if (items[index].setId === setId) {
      lastIndex = index;
      break;
    }
  }
  return [...items.slice(0, lastIndex + 1), ...duplicates, ...items.slice(lastIndex + 1)];
}
