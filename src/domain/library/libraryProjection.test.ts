import assert from "node:assert/strict";
import test from "node:test";
import { projectCloudLibrary, projectLocalLibrary } from "./libraryProjection";

const settings = { speed: 1, timeBetweenLines: 2, rowLayoutMode: "below" as const, engineMode: "browser" as const, selectedPremiumVoiceEn: "", selectedPremiumVoiceVi: "", selectedPremiumVoiceZhCn: "", selectedPremiumVoiceZhTw: "", selectedPremiumVoiceJa: "", selectedPremiumVoiceKo: "", selectedEnVoiceName: "", selectedViVoiceName: "", selectedZhCnVoiceName: "", selectedZhTwVoiceName: "", selectedJaVoiceName: "", selectedKoVoiceName: "", autoGroupSet: false, setMultiplier: 1, useUniversalImage: false, universalImageUrl: "" };
const lesson = { id: "l1", schemaVersion: 1 as const, revision: 3, title: "Lesson", rawText: "Text", speechList: [], settings, folderId: "f1", createdAt: 1, updatedAt: 2 };

test("projects cloud folders and lessons into one display snapshot", () => { const result = projectCloudLibrary([{ id: "f1", name: "Folder", createdAt: 1, updatedAt: 2 }], [lesson]); assert.equal(result.folders[0].lessons[0].revision, 3); assert.equal(result.uncategorized.length, 0); });
test("projects local folders and uncategorized lessons without mutating source", () => { const result = projectLocalLibrary([{ id: "f1", name: "Folder", createdAt: 1, lessons: [lesson] }], []); assert.equal(result.folders[0].lessons[0].id, "l1"); assert.notEqual(result.folders[0].lessons[0], lesson); });
