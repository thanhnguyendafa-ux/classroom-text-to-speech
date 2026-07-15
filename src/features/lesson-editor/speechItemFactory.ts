import type { LanguageCode, SpeechItem } from '../../types';

const JAPANESE_CHARACTER_REGEX = /[\u3040-\u309F\u30A0-\u30FF]/;
const KOREAN_CHARACTER_REGEX = /[\uAC00-\uD7A3\u1100-\u11FF\u3130-\u318F]/;
const CHINESE_TRADITIONAL_UNIQUE_CHARS = /[體廣門見劃設對華遷萬國學會東億個開鳳龍聽擊買賣車愛漢義鋸齒靈麗響讓觀認邊發變禮藝]/;
const CHINESE_CHARACTER_REGEX = /[\u4E00-\u9FFF]/;
const VIETNAMESE_DIACRITICS_REGEX = /[àáảãạâầấẩẫậăằắẳẵặèéẻẽẹêềếểễệđìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵĂÂÊÔƠƯĐ]/i;

export interface ParsedLineSymbols {
  cleanText: string;
  repeats: number;
  delaySec: number;
}

export function parseLineSymbols(rawLine: string, defaultRepeats = 1, defaultDelay = 2): ParsedLineSymbols {
  let cleanText = rawLine;
  let repeats = defaultRepeats;
  let delaySec = defaultDelay;
  const delayRegex = /\/\s*(\d+(?:\.\d+)?)\b/;
  const repeatRegex = /;\s*(\d+)\b/;
  const delayMatch = cleanText.match(delayRegex);
  const repeatMatch = cleanText.match(repeatRegex);

  if (delayMatch) {
    delaySec = Number.parseFloat(delayMatch[1]);
    cleanText = cleanText.replace(delayRegex, '');
  }
  if (repeatMatch) {
    repeats = Number.parseInt(repeatMatch[1], 10);
    cleanText = cleanText.replace(repeatRegex, '');
  }

  return { cleanText: cleanText.replace(/\s+/g, ' ').trim(), repeats, delaySec };
}

export function detectLanguage(line: string): LanguageCode {
  const trimmed = line.trim();
  if (KOREAN_CHARACTER_REGEX.test(trimmed)) return 'ko';
  if (JAPANESE_CHARACTER_REGEX.test(trimmed)) return 'ja';
  if (CHINESE_CHARACTER_REGEX.test(trimmed)) {
    return CHINESE_TRADITIONAL_UNIQUE_CHARS.test(trimmed) ? 'zh-tw' : 'zh-cn';
  }
  if (VIETNAMESE_DIACRITICS_REGEX.test(trimmed)) return 'vi';
  return 'en';
}

interface BuildSpeechItemsInput {
  sourceText: string;
  timeBetweenLines: number;
  speed: number;
  autoGroupSet: boolean;
  setMultiplier: number;
  createId: (kind: 'row' | 'set', index: number) => string;
}

export function buildSpeechItems(input: BuildSpeechItemsInput): SpeechItem[] {
  const parsedLines = input.sourceText.split('\n').map((line) => line.trim()).filter(Boolean).map((line) => {
    const { cleanText, repeats, delaySec } = parseLineSymbols(line, 1, input.timeBetweenLines);
    const detectedLang = detectLanguage(cleanText);
    return { text: cleanText, detectedLang, selectedLang: 'auto' as const, resolvedLang: detectedLang, repeats, delaySec, speed: input.speed };
  });
  const items: SpeechItem[] = [];
  let rowIndex = 0;
  let setIndex = 0;

  if (!input.autoGroupSet) {
    return parsedLines.map((item) => ({ ...item, id: input.createId('row', rowIndex++) }));
  }

  const multiplier = Math.max(1, input.setMultiplier);
  for (let index = 0; index < parsedLines.length - 1; index += 2) {
    for (let copy = 0; copy < multiplier; copy += 1) {
      const setId = input.createId('set', setIndex++);
      items.push({ ...parsedLines[index], id: input.createId('row', rowIndex++), setId });
      items.push({ ...parsedLines[index + 1], id: input.createId('row', rowIndex++), setId });
    }
  }

  if (parsedLines.length % 2 !== 0) {
    items.push({ ...parsedLines.at(-1)!, id: input.createId('row', rowIndex) });
  }
  return items;
}
