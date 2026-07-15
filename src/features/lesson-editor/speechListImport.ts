import type { SpeechItem } from '../../types';
import { normalizeSpeechList } from '../../domain/lessonModel';

export function parseSpeechListImport(text: string): SpeechItem[] {
  let parsed: unknown;
  try { parsed = JSON.parse(text); } catch { throw new Error('Invalid JSON backup format.'); }
  const items = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === 'object' && Array.isArray((parsed as { items?: unknown }).items)
      ? (parsed as { items: unknown[] }).items
      : null;
  if (!items || items.length === 0) throw new Error('Import does not contain speech items.');
  const normalized = normalizeSpeechList(items);
  if (normalized.length === 0) throw new Error('Import does not contain valid speech items.');
  return normalized;
}
