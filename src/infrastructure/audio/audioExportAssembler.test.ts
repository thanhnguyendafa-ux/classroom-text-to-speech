import assert from "node:assert/strict";
import test from "node:test";
import { concatenatePcm, createSilence, createWavBlob } from "./audioExportAssembler";
test("concatenates PCM without mutating source buffers", () => { const first = new Int16Array([1, 2]); const second = new Int16Array([3]); assert.deepEqual([...concatenatePcm([first, second])], [1, 2, 3]); assert.deepEqual([...first], [1, 2]); });
test("creates bounded silence and a valid WAV container", async () => { assert.equal(createSilence(24000, -1).length, 0); const blob = createWavBlob(new Int16Array([1, -1]), 24000); assert.equal(blob.type, "audio/wav"); assert.equal(blob.size, 48); assert.equal(new TextDecoder().decode(new Uint8Array(await blob.arrayBuffer()).slice(0, 4)), "RIFF"); });
