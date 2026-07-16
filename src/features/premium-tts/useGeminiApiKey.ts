import { useState } from 'react';
import {
  clearBrowserGeminiApiKey,
  loadBrowserGeminiApiKey,
  saveBrowserGeminiApiKey,
} from '../../lib/security/geminiApiKeyStorage';

export function useGeminiApiKey() {
  const [apiKey, setApiKey] = useState<string>(() => {
    try { return loadBrowserGeminiApiKey(); } catch { return ''; }
  });
  const [showApiKey, setShowApiKey] = useState(false);

  const saveApiKey = (val: string) => {
    try {
      setApiKey(saveBrowserGeminiApiKey(val || ''));
    } catch (e) {
      console.error('sessionStorage is blocked or unavailable:', e);
    }
  };

  const clearApiKey = () => {
    setApiKey('');
    try {
      clearBrowserGeminiApiKey();
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
