export interface PremiumVoice {
  value: string;
  label: string;
  note?: string;
}

export interface PremiumVoicesConfig {
  lang: string;
  langLabel: string;
  flag: string;
  defaultVoice: string;
  voices: PremiumVoice[];
}

export const GEMINI_TTS_VOICES: PremiumVoice[] = [
  { value: 'Zephyr', label: 'Zephyr 🎙️', note: 'Gợi ý: rõ, sáng, khuyên dùng' },
  { value: 'Puck', label: 'Puck 🎙️', note: 'Gợi ý: vui tươi, cá tính' },
  { value: 'Charon', label: 'Charon 🎙️', note: 'Gợi ý: trầm ấm, dõng dạc' },
  { value: 'Kore', label: 'Kore 🎙️', note: 'Gợi ý: trong trẻo, mượt mà' },
  { value: 'Fenrir', label: 'Fenrir 🎙️', note: 'Gợi ý: sảng khoái, rõ ràng' },
  { value: 'Leda', label: 'Leda 🎙️', note: 'Gợi ý: nhẹ nhàng, dễ chịu' },
  { value: 'Orus', label: 'Orus 🎙️', note: 'Gợi ý: chuyên nghiệp, tự tin' },
  { value: 'Aoede', label: 'Aoede 🎙️', note: 'Gợi ý: thanh thoát, ngân vang' },
  { value: 'Callirrhoe', label: 'Callirrhoe 🎙️', note: 'Gợi ý: sâu lắng, êm ái' },
  { value: 'Autonoe', label: 'Autonoe 🎙️', note: 'Gợi ý: điềm đạm, trí thức' },
  { value: 'Enceladus', label: 'Enceladus 🎙️', note: 'Gợi ý: tự nhiên, hùng dũng' },
  { value: 'Iapetus', label: 'Iapetus 🎙️', note: 'Gợi ý: đĩnh đạc, mộc mạc' },
  { value: 'Umbriel', label: 'Umbriel 🎙️', note: 'Gợi ý: tinh tế, uyển chuyển' },
  { value: 'Algieba', label: 'Algieba 🎙️', note: 'Gợi ý: ấm áp, thân thiện' },
  { value: 'Despina', label: 'Despina 🎙️', note: 'Gợi ý: năng động, trẻ trung' },
  { value: 'Erinome', label: 'Erinome 🎙️', note: 'Gợi ý: gần gũi, thuần phác' },
  { value: 'Algenib', label: 'Algenib 🎙️', note: 'Gợi ý: sắc sảo, linh hoạt' },
  { value: 'Rasalgethi', label: 'Rasalgethi 🎙️', note: 'Gợi ý: dứt khoát, mạnh mẽ' },
  { value: 'Laomedeia', label: 'Laomedeia 🎙️', note: 'Gợi ý: truyền cảm, kể chuyện' },
  { value: 'Achernar', label: 'Achernar 🎙️', note: 'Gợi ý: khoẻ khoắn, đầy đặn' },
  { value: 'Alnilam', label: 'Alnilam 🎙️', note: 'Gợi ý: vang dội, đậm chất' },
  { value: 'Schedar', label: 'Schedar 🎙️', note: 'Gợi ý: nghiêm túc, trầm lắng' },
  { value: 'Gacrux', label: 'Gacrux 🎙️', note: 'Gợi ý: tâm tình, ấm áp' },
  { value: 'Pulcherrima', label: 'Pulcherrima 🎙️', note: 'Gợi ý: sang trọng, truyền cảm' },
  { value: 'Achird', label: 'Achird 🎙️', note: 'Gợi ý: nhẹ bẫng, trong veo' },
  { value: 'Zubenelgenubi', label: 'Zubenelgenubi 🎙️', note: 'Gợi ý: chững chạc, đầy đặn' },
  { value: 'Vindemiatrix', label: 'Vindemiatrix 🎙️', note: 'Gợi ý: cuốn hút, sắc sảo' },
  { value: 'Sadachbia', label: 'Sadachbia 🎙️', note: 'Gợi ý: hiền dịu, hoà ái' },
  { value: 'Sadaltager', label: 'Sadaltager 🎙️', note: 'Gợi ý: đĩnh đạc, chuyên gia' },
  { value: 'Sulafat', label: 'Sulafat 🎙️', note: 'Gợi ý: lôi cuốn, rõ chữ' }
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
