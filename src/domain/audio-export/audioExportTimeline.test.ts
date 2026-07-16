import assert from "node:assert/strict";
import test from "node:test";
import type { SpeechItem } from "../../types";
import { buildAudioExportTimeline } from "./audioExportTimeline";
const item = (id: string, repeats: number, delaySec?: number): SpeechItem => ({ id, text: id, detectedLang: "en", selectedLang: "auto", resolvedLang: "en", repeats, delaySec });
test("builds deterministic speech and pause units for repeats", () => { assert.deepEqual(buildAudioExportTimeline([item("a", 2, 1.5), item("b", 1)], 3), [{ type: "speech", itemId: "a", iteration: 1 }, { type: "pause", durationMs: 1500 }, { type: "speech", itemId: "a", iteration: 2 }, { type: "pause", durationMs: 1500 }, { type: "speech", itemId: "b", iteration: 1 }, { type: "pause", durationMs: 3000 }]); });
test("normalizes invalid repeats and pauses without mutating input", () => { const source = [item("a", 0, -4)]; assert.deepEqual(buildAudioExportTimeline(source, Number.NaN), [{ type: "speech", itemId: "a", iteration: 1 }, { type: "pause", durationMs: 0 }]); assert.equal(source[0].repeats, 0); });
