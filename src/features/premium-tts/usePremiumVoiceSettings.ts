import { useState } from 'react';

export function usePremiumVoiceSettings() {
  const [selectedPremiumVoiceEn, setSelectedPremiumVoiceEn] = useState<string>('Zephyr');
  const [selectedPremiumVoiceVi, setSelectedPremiumVoiceVi] = useState<string>('Kore');
  const [selectedPremiumVoiceZhCn, setSelectedPremiumVoiceZhCn] = useState<string>('Kore');
  const [selectedPremiumVoiceZhTw, setSelectedPremiumVoiceZhTw] = useState<string>('Zephyr');
  const [selectedPremiumVoiceJa, setSelectedPremiumVoiceJa] = useState<string>('Zephyr');
  const [selectedPremiumVoiceKo, setSelectedPremiumVoiceKo] = useState<string>('Kore');

  const onVoiceChange = (lang: string, value: string) => {
    if (lang === 'en') setSelectedPremiumVoiceEn(value);
    else if (lang === 'vi') setSelectedPremiumVoiceVi(value);
    else if (lang === 'zh-cn') setSelectedPremiumVoiceZhCn(value);
    else if (lang === 'zh-tw') setSelectedPremiumVoiceZhTw(value);
    else if (lang === 'ja') setSelectedPremiumVoiceJa(value);
    else if (lang === 'ko') setSelectedPremiumVoiceKo(value);
  };

  return {
    selectedPremiumVoiceEn,
    setSelectedPremiumVoiceEn,
    selectedPremiumVoiceVi,
    setSelectedPremiumVoiceVi,
    selectedPremiumVoiceZhCn,
    setSelectedPremiumVoiceZhCn,
    selectedPremiumVoiceZhTw,
    setSelectedPremiumVoiceZhTw,
    selectedPremiumVoiceJa,
    setSelectedPremiumVoiceJa,
    selectedPremiumVoiceKo,
    setSelectedPremiumVoiceKo,
    onVoiceChange,
  };
}
