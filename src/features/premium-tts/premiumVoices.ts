export interface PremiumVoice {
  value: string;
  label: string;
  styleHint?: string;
}

export interface PremiumVoicesConfig {
  lang: string;
  langLabel: string;
  flag: string;
  defaultVoice: string;
  voices: PremiumVoice[];
}

export const GEMINI_TTS_VOICES: PremiumVoice[] = [
  { value: 'Zephyr', label: 'Zephyr 👩‍💼', styleHint: 'Nữ - Truyền cảm, khuyến nghị' },
  { value: 'Puck', label: 'Puck 👦', styleHint: 'Nam - Cá tính, vui vẻ' },
  { value: 'Charon', label: 'Charon 👨', styleHint: 'Nam - Trầm ấm, dõng dạc' },
  { value: 'Kore', label: 'Kore 👩', styleHint: 'Nữ - Trong trẻo, mượt mà' },
  { value: 'Fenrir', label: 'Fenrir 🧔', styleHint: 'Nam - Sảng khoái, rõ ràng' },
  { value: 'Leda', label: 'Leda 👩‍⚕️', styleHint: 'Nữ - Nhẹ nhàng, dễ chịu' },
  { value: 'Orus', label: 'Orus 👨‍💼', styleHint: 'Nam - Chuyên nghiệp, tự tin' },
  { value: 'Aoede', label: 'Aoede 👩‍🎤', styleHint: 'Nữ - Thanh thoát, bay bổng' },
  { value: 'Callirrhoe', label: 'Callirrhoe 👱‍♀️', styleHint: 'Nữ - Êm ái, sâu lắng' },
  { value: 'Autonoe', label: 'Autonoe 👩‍🎓', styleHint: 'Nữ - Trí thức, điềm đạm' },
  { value: 'Enceladus', label: 'Enceladus 👨‍🚀', styleHint: 'Nam - Hùng dũng, tự nhiên' },
  { value: 'Iapetus', label: 'Iapetus 👴', styleHint: 'Nam - Thuần súc, đĩnh đạc' },
  { value: 'Umbriel', label: 'Umbriel 👩‍🎨', styleHint: 'Nữ - Nghệ sĩ, tinh tế' },
  { value: 'Algieba', label: 'Algieba 👩', styleHint: 'Nữ - Ấm áp, thân thiện' },
  { value: 'Despina', label: 'Despina 👧', styleHint: 'Nữ - Trẻ trung, năng động' },
  { value: 'Erinome', label: 'Erinome 👩', styleHint: 'Nữ - Mộc mạc, gần gũi' },
  { value: 'Algenib', label: 'Algenib 👨', styleHint: 'Nam - Linh hoạt, sắc sảo' },
  { value: 'Rasalgethi', label: 'Rasalgethi 👨', styleHint: 'Nam - Mạnh mẽ, dứt khoát' },
  { value: 'Laomedeia', label: 'Laomedeia 👩', styleHint: 'Nữ - Du dương, kể chuyện' },
  { value: 'Achernar', label: 'Achernar 👨', styleHint: 'Nam - Khoẻ khoắn, nhiệt huyết' },
  { value: 'Alnilam', label: 'Alnilam 👨', styleHint: 'Nam - Đậm đà, vang dội' },
  { value: 'Schedar', label: 'Schedar 👩', styleHint: 'Nữ - Trầm lắng, nghiêm túc' },
  { value: 'Gacrux', label: 'Gacrux 👨', styleHint: 'Nam - Ấm áp, tâm tình' },
  { value: 'Pulcherrima', label: 'Pulcherrima 👩', styleHint: 'Nữ - Sang trọng, truyền cảm' },
  { value: 'Achird', label: 'Achird 👩', styleHint: 'Nữ - Trong veo, nhẹ bẫng' },
  { value: 'Zubenelgenubi', label: 'Zubenelgenubi 👨', styleHint: 'Nam - Đầy đặn, chững chạc' },
  { value: 'Vindemiatrix', label: 'Vindemiatrix 👩', styleHint: 'Nữ - Sắc sảo, cuốn hút' },
  { value: 'Sadachbia', label: 'Sadachbia 👩', styleHint: 'Nữ - Hoà ái, hiền dịu' },
  { value: 'Sadaltager', label: 'Sadaltager 👨', styleHint: 'Nam - Chuyên gia, đĩnh đạc' },
  { value: 'Sulafat', label: 'Sulafat 👩', styleHint: 'Nữ - Rõ chữ, lôi cuốn' }
];

export const PREMIUM_VOICES: Record<string, PremiumVoicesConfig> = {
  en: {
    lang: 'en',
    langLabel: 'Giọng Premium EN (Gemini AI)',
    flag: '🇺🇸',
    defaultVoice: 'Zephyr',
    voices: GEMINI_TTS_VOICES
  },
  vi: {
    lang: 'vi',
    langLabel: 'Giọng Premium VI (Gemini AI)',
    flag: '🇻🇳',
    defaultVoice: 'Kore',
    voices: GEMINI_TTS_VOICES
  },
  'zh-cn': {
    lang: 'zh-cn',
    langLabel: 'Giọng Premium ZH-CN (Gemini)',
    flag: '🇨🇳',
    defaultVoice: 'Kore',
    voices: GEMINI_TTS_VOICES
  },
  'zh-tw': {
    lang: 'zh-tw',
    langLabel: 'Giọng Premium ZH-TW (Gemini)',
    flag: '🇭🇰',
    defaultVoice: 'Zephyr',
    voices: GEMINI_TTS_VOICES
  },
  ja: {
    lang: 'ja',
    langLabel: 'Giọng Premium JA (Gemini)',
    flag: '🇯🇵',
    defaultVoice: 'Zephyr',
    voices: GEMINI_TTS_VOICES
  },
  ko: {
    lang: 'ko',
    langLabel: 'Giọng Premium KO (Gemini)',
    flag: '🇰🇷',
    defaultVoice: 'Kore',
    voices: GEMINI_TTS_VOICES
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
