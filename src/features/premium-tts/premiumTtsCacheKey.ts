export function normalizePremiumTtsText(text: string): string {
  return text.trim().replace(/\s+/g, ' ');
}

export interface PremiumTtsCacheKeyParams {
  text: string;
  lang: string;
  voice: string;
}

export function makePremiumTtsCacheKey({ text, lang, voice }: PremiumTtsCacheKeyParams): string {
  return [
    'premium-tts-v1',
    lang.toLowerCase(),
    voice,
    normalizePremiumTtsText(text)
  ].join('|');
}
