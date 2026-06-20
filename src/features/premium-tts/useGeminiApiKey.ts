import { useState } from 'react';

export function useGeminiApiKey() {
  const [apiKey, setApiKey] = useState<string>(() => {
    try {
      return localStorage.getItem('userGeminiApiKey') || '';
    } catch {
      return '';
    }
  });
  const [showApiKey, setShowApiKey] = useState(false);

  const saveApiKey = (val: string) => {
    const trimmed = (val || '').trim();
    setApiKey(trimmed);
    try {
      localStorage.setItem('userGeminiApiKey', trimmed);
    } catch (e) {
      console.error('localStorage is blocked or unavailable:', e);
    }
  };

  const clearApiKey = () => {
    setApiKey('');
    try {
      localStorage.removeItem('userGeminiApiKey');
    } catch (e) {
      console.error('localStorage is blocked or unavailable:', e);
    }
  };

  return {
    apiKey,
    showApiKey,
    setShowApiKey,
    setApiKey: saveApiKey,
    clearApiKey,
  };
}
