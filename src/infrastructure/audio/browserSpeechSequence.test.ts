import assert from "node:assert/strict";
import test from "node:test";
import type { SpeechItem } from "../../types";
import { runBrowserSpeechSequence } from "./browserSpeechSequence";
const item = (id: string): SpeechItem => ({ id, text: id, detectedLang: "en", selectedLang: "auto", resolvedLang: "en", repeats: 2, delaySec: 0 });
test("sequences repeats and advances in order", async () => { const spoken: string[] = []; const utterances: Array<any> = []; const waits: Array<() => void> = []; const fakeSpeech = { speak: (utterance: any) => { spoken.push(utterance.text); utterances.push(utterance); }, cancel: () => undefined }; const promise = runBrowserSpeechSequence({ items: [item("a"), { ...item("b"), repeats: 1 }], speed: 1, volume: 1, voices: [], preferredVoiceNames: {}, speechSynthesis: fakeSpeech, createUtterance: text => ({ text, onstart: undefined, onend: undefined, onerror: undefined } as any), wait: callback => { waits.push(callback); return 1 as any; }, isCancelled: () => false, defaultPauseSeconds: 0 }); utterances[0].onend(); waits.shift()!(); utterances[1].onend(); waits.shift()!(); utterances[2].onend(); waits.shift()!(); await promise; assert.deepEqual(spoken, ["a", "a", "b"]); });

