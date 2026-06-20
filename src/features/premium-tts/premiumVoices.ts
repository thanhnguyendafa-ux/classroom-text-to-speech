export interface PremiumVoice {
  value: string;
  label: string;
}

export interface PremiumVoicesConfig {
  lang: string;
  langLabel: string;
  flag: string;
  defaultVoice: string;
  voices: PremiumVoice[];
}

export const PREMIUM_VOICES: Record<string, PremiumVoicesConfig> = {
  en: {
    lang: 'en',
    langLabel: 'Giọng Premium EN (Gemini AI)',
    flag: '🇺🇸',
    defaultVoice: 'Zephyr',
    voices: [
      { value: 'Zephyr', label: 'Zephyr 👩‍💼 (Nữ - Truyền cảm, khuyến nghị)' },
      { value: 'Kore', label: 'Kore 👩 (Nữ - Trong trẻo)' },
      { value: 'Puck', label: 'Puck 👦 (Nam - Cá tính, vui vẻ)' },
      { value: 'Charon', label: 'Charon 👨 (Nam - Trầm ấm, dõng dạc)' },
      { value: 'Fenrir', label: 'Fenrir 🧔 (Nam - Sảng khoái, rõ ràng)' }
    ]
  },
  vi: {
    lang: 'vi',
    langLabel: 'Giọng Premium VI (Gemini AI)',
    flag: '🇻🇳',
    defaultVoice: 'Kore',
    voices: [
      { value: 'Kore', label: 'Kore 👩 (Nữ - Trong trẻo, khuyến nghị)' },
      { value: 'Zephyr', label: 'Zephyr 👩‍💼 (Nữ - Sống động)' },
      { value: 'Puck', label: 'Puck 👦 (Nam - Cá tính)' },
      { value: 'Charon', label: 'Charon 👨 (Nam - Vừa phải, ấm áp)' },
      { value: 'Fenrir', label: 'Fenrir 🧔 (Nam - Mạnh mẽ, rõ chữ)' }
    ]
  },
  'zh-cn': {
    lang: 'zh-cn',
    langLabel: 'Giọng Premium ZH-CN (Gemini)',
    flag: '🇨🇳',
    defaultVoice: 'Kore',
    voices: [
      { value: 'Kore', label: 'Kore 👩 (Nữ - Trong trẻo, khuyến nghị)' },
      { value: 'Zephyr', label: 'Zephyr 👩‍💼 (Nữ - Sống động)' },
      { value: 'Puck', label: 'Puck 👦 (Nam - Cá tính)' },
      { value: 'Charon', label: 'Charon 👨 (Nam - Ấm áp)' },
      { value: 'Fenrir', label: 'Fenrir 🧔 (Nam - Rõ chữ)' }
    ]
  },
  'zh-tw': {
    lang: 'zh-tw',
    langLabel: 'Giọng Premium ZH-TW (Gemini)',
    flag: '🇭🇰',
    defaultVoice: 'Zephyr',
    voices: [
      { value: 'Zephyr', label: 'Zephyr 👩‍💼 (Nữ - Truyền cảm, khuyến nghị)' },
      { value: 'Kore', label: 'Kore 👩 (Nữ - Trong trẻo)' },
      { value: 'Puck', label: 'Puck 👦 (Nam - Cá tính)' },
      { value: 'Charon', label: 'Charon 👨 (Nam - Trầm ấm)' },
      { value: 'Fenrir', label: 'Fenrir 🧔 (Nam - Dõng dạc)' }
    ]
  },
  ja: {
    lang: 'ja',
    langLabel: 'Giọng Premium JA (Gemini)',
    flag: '🇯🇵',
    defaultVoice: 'Zephyr',
    voices: [
      { value: 'Zephyr', label: 'Zephyr 👩‍💼 (Nữ - Truyền cảm, khuyến nghị)' },
      { value: 'Kore', label: 'Kore 👩 (Nữ - Trong trẻo)' },
      { value: 'Puck', label: 'Puck 👦 (Nam - Cá tính)' },
      { value: 'Charon', label: 'Charon 👨 (Nam - Trầm ấm)' },
      { value: 'Fenrir', label: 'Fenrir 🧔 (Nam - Sảng khoái)' }
    ]
  },
  ko: {
    lang: 'ko',
    langLabel: 'Giọng Premium KO (Gemini)',
    flag: '🇰🇷',
    defaultVoice: 'Kore',
    voices: [
      { value: 'Kore', label: 'Kore 👩 (Nữ - Trong trẻo, khuyến nghị)' },
      { value: 'Zephyr', label: 'Zephyr 👩‍💼 (Nữ - Sống động)' },
      { value: 'Puck', label: 'Puck 👦 (Nam - Cá tính)' },
      { value: 'Charon', label: 'Charon 👨 (Nam - Vừa phải)' },
      { value: 'Fenrir', label: 'Fenrir 🧔 (Nam - Mạnh mẽ)' }
    ]
  }
};

export function getPremiumVoiceForLang(
  lang: string,
  settings: {
    selectedPremiumVoiceEn?: string;
    selectedPremiumVoiceVi?: string;
    selectedPremiumVoiceZhCn?: string;
    selectedPremiumVoiceZhTw?: string;
    selectedPremiumVoiceJa?: string;
    selectedPremiumVoiceKo?: string;
    [key: string]: string | undefined;
  }
): string {
  const normalizedLang = lang.toLowerCase();
  if (normalizedLang === 'vi') {
    return settings.selectedPremiumVoiceVi || 'Kore';
  } else if (normalizedLang === 'zh-cn' || normalizedLang === 'zh') {
    return settings.selectedPremiumVoiceZhCn || 'Kore';
  } else if (normalizedLang === 'zh-tw') {
    return settings.selectedPremiumVoiceZhTw || 'Zephyr';
  } else if (normalizedLang === 'ja') {
    return settings.selectedPremiumVoiceJa || 'Zephyr';
  } else if (normalizedLang === 'ko') {
    return settings.selectedPremiumVoiceKo || 'Kore';
  } else {
    return settings.selectedPremiumVoiceEn || 'Zephyr';
  }
}
