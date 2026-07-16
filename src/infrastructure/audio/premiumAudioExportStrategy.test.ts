import assert from "node:assert/strict";
import test from "node:test";
import type { SpeechItem } from "../../types";
import { PremiumAudioExportCancelledError, runPremiumAudioExport } from "./premiumAudioExportStrategy";
const item = (id: string, repeats: number, delaySec?: number): SpeechItem => ({ id, text: id, detectedLang: "en", selectedLang: "auto", resolvedLang: "en", repeats, delaySec });
test("resolves each item once and assembles the canonical timeline", async () => { const calls: string[] = []; const result = await runPremiumAudioExport({ items: [item("a", 2, 0.001), item("b", 1)], defaultPauseSeconds: 1, sampleRate: 1000, resolvePcm: async current => { calls.push(current.id); return new Int16Array(current.id === "a" ? [1] : [2]); } }); assert.deepEqual(calls, ["a", "b"]); assert.deepEqual([...result], [1, 0, 1, 0, 2]); });
test("stops before assembly when cancellation is requested", async () => { let cancelled = false; await assert.rejects(() => runPremiumAudioExport({ items: [item("a", 1), item("b", 1)], defaultPauseSeconds: 0, sampleRate: 1000, isCancelled: () => cancelled, resolvePcm: async current => { if (current.id === "a") cancelled = true; return new Int16Array([1]); } }), PremiumAudioExportCancelledError); });
