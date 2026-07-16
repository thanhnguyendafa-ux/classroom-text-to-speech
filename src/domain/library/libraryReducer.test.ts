import assert from "node:assert/strict";
import test from "node:test";
import type { LibraryDisplayLesson } from "../../features/lessons/libraryDisplayModel";
import { createLibraryState, libraryReducer, selectFilteredLibrary } from "./libraryReducer";

const lesson = (id: string, title: string, folderId: string | null = null): LibraryDisplayLesson => ({ id, schemaVersion: 1, revision: 1, title, rawText: title, speechList: [], settings: { speed: 1, timeBetweenLines: 2, rowLayoutMode: "below", engineMode: "browser", selectedPremiumVoiceEn: "", selectedPremiumVoiceVi: "", selectedPremiumVoiceZhCn: "", selectedPremiumVoiceZhTw: "", selectedPremiumVoiceJa: "", selectedPremiumVoiceKo: "", selectedEnVoiceName: "", selectedViVoiceName: "", selectedZhCnVoiceName: "", selectedZhTwVoiceName: "", selectedJaVoiceName: "", selectedKoVoiceName: "", autoGroupSet: false, setMultiplier: 1, useUniversalImage: false, universalImageUrl: "" }, createdAt: 1, folderId });

test("loads one source snapshot atomically and resets drilldown", () => {
  const local = libraryReducer(createLibraryState(), { type: "snapshotLoaded", source: "local", folders: [{ id: "f1", name: "Folder", lessons: [lesson("l1", "Alpha", "f1")] }], uncategorized: [] });
  const selected = libraryReducer(local, { type: "folderSelected", folderId: "f1" });
  const cloud = libraryReducer(selected, { type: "snapshotLoaded", source: "cloud", folders: [], uncategorized: [lesson("l2", "Cloud")] });
  assert.equal(cloud.source, "cloud"); assert.equal(cloud.selectedFolderId, null); assert.deepEqual(cloud.uncategorized.map((item) => item.id), ["l2"]);
});

test("filters folders and lessons as derived state without mutating snapshot", () => {
  const state = libraryReducer(createLibraryState(), { type: "snapshotLoaded", source: "local", folders: [{ id: "f1", name: "Travel", lessons: [lesson("l1", "Airport", "f1"), lesson("l2", "Food", "f1")] }], uncategorized: [lesson("l3", "Airport Extra")] });
  const queried = libraryReducer(state, { type: "queryChanged", query: "airport" });
  const filtered = selectFilteredLibrary(queried);
  assert.deepEqual(filtered.folders[0].lessons.map((item) => item.id), ["l1"]); assert.deepEqual(filtered.uncategorized.map((item) => item.id), ["l3"]); assert.equal(state.folders[0].lessons.length, 2);
});

test("tracks loading and mutation failure without replacing the last good snapshot", () => {
  const loaded = libraryReducer(createLibraryState(), { type: "snapshotLoaded", source: "local", folders: [], uncategorized: [lesson("l1", "Saved")] });
  const loading = libraryReducer(loaded, { type: "loadStarted", source: "cloud" });
  const failed = libraryReducer(loading, { type: "loadFailed", error: "offline" });
  assert.deepEqual(failed.uncategorized, loaded.uncategorized); assert.equal(failed.loadStatus, "error"); assert.equal(failed.error, "offline");
});
