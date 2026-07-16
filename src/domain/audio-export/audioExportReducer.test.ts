import assert from "node:assert/strict";
import test from "node:test";
import { audioExportReducer, createAudioExportState } from "./audioExportReducer";
test("owns phase, progress, logs, and result as one state", () => { let state = audioExportReducer(createAudioExportState(), { type: "phaseChanged", status: "processing" }); state = audioExportReducer(state, { type: "progressChanged", percent: 40, text: "working" }); state = audioExportReducer(state, { type: "logAdded", message: "line" }); state = audioExportReducer(state, { type: "resultChanged", url: "blob:x" }); assert.equal(state.status, "processing"); assert.equal(state.progressPercent, 40); assert.deepEqual(state.logs, ["line"]); assert.equal(state.resultUrl, "blob:x"); });
test("reset returns a clean export session", () => { const dirty = audioExportReducer({ ...createAudioExportState(), status: "error", logs: ["x"], resultUrl: "blob:x" }, { type: "reset" }); assert.deepEqual(dirty, createAudioExportState()); });
