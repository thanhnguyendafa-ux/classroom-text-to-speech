import { useState } from 'react';

export function useGeminiApiKey() {
  const [apiKey, setApiKey] = useState<string>(() => {
    try {
      const sessionKey = sessionStorage.getItem('userGeminiApiKey') || '';
      const legacyKey = localStorage.getItem('userGeminiApiKey') || '';
      localStorage.removeItem('userGeminiApiKey');
      if (!sessionKey && legacyKey) sessionStorage.setItem('userGeminiApiKey', legacyKey);
      return sessionKey || legacyKey;
    } catch {
      return '';
    }
  });
  const [showApiKey, setShowApiKey] = useState(false);

  const saveApiKey = (val: string) => {
    const trimmed = (val || '').trim();
    setApiKey(trimmed);
    try {
      sessionStorage.setItem('userGeminiApiKey', trimmed);
    } catch (e) {
      console.error('sessionStorage is blocked or unavailable:', e);
    }
  };

  const clearApiKey = () => {
    setApiKey('');
    try {
      sessionStorage.removeItem('userGeminiApiKey');
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
