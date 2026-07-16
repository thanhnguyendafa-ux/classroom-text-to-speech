import assert from "node:assert/strict";
import test from "node:test";
import { selectBrowserVoiceDefaults } from "./browserVoiceCatalog";

const voice = (name: string, lang: string) => ({ name, lang } as SpeechSynthesisVoice);

test("selects language-specific defaults without replacing user choices", () => {
  const result = selectBrowserVoiceDefaults([voice("US", "en-US"), voice("VI", "vi-VN"), voice("TW", "zh-TW"), voice("JA", "ja-JP"), voice("KO", "ko-KR")], { en: "Custom", vi: "", "zh-cn": "", "zh-tw": "", ja: "", ko: "" });
  assert.equal(result.en, "Custom");
  assert.equal(result.vi, "VI");
  assert.equal(result["zh-tw"], "TW");
  assert.equal(result.ja, "JA");
  assert.equal(result.ko, "KO");
});

test("falls back to a generic Chinese voice for simplified Chinese", () => {
  const result = selectBrowserVoiceDefaults([voice("Generic Chinese", "zh")], { en: "", vi: "", "zh-cn": "", "zh-tw": "", ja: "", ko: "" });
  assert.equal(result["zh-cn"], "Generic Chinese");
});
