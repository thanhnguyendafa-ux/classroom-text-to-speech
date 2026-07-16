import assert from "node:assert/strict";
import test from "node:test";
import type { SpeechItem } from "../../types";
import { findNextPlaybackItem, resolvePreferredBrowserVoiceName } from "./playbackOrchestrator";

const item = (id: string): SpeechItem => ({ id, text: id, detectedLang: "en", selectedLang: "auto", resolvedLang: "en", repeats: 1 });

test("finds the next row and loops only in infinite mode", () => {
  const list = [item("a"), item("b")];
  assert.equal(findNextPlaybackItem(list, "a", "once")?.id, "b");
  assert.equal(findNextPlaybackItem(list, "b", "once"), null);
  assert.equal(findNextPlaybackItem(list, "b", "infinite")?.id, "a");
});

test("maps every supported language to its configured browser voice", () => {
  const voices = { en: "English", vi: "Vietnamese", "zh-cn": "Chinese CN", "zh-tw": "Chinese TW", ja: "Japanese", ko: "Korean" };
  assert.equal(resolvePreferredBrowserVoiceName("zh-tw", voices), "Chinese TW");
  assert.equal(resolvePreferredBrowserVoiceName("ko", voices), "Korean");
});
