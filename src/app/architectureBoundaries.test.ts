import assert from "node:assert/strict";
import test from "node:test";
import { checkArchitectureBoundaries } from "../../scripts/architectureBoundaries";

test("accepts the current dependency graph under the declared architecture rules", async () => {
  const violations = await checkArchitectureBoundaries(process.cwd());
  assert.deepEqual(violations, []);
});

test("reports domain imports of React, Firebase, and browser globals", async () => {
  const files = new Map([
    ["src/domain/example.ts", 'import React from "react"; import { db } from "firebase/firestore"; const audio = window.Audio;'],
  ]);
  const violations = await checkArchitectureBoundaries("virtual", { files });
  assert.deepEqual(violations.map((item) => item.rule), ["domain-purity", "domain-purity", "domain-purity"]);
});

test("reports infrastructure imports of UI and cross-feature internal imports", async () => {
  const files = new Map([
    ["src/infrastructure/example.ts", 'import View from "../components/View";'],
    ["src/features/a/view.ts", 'import value from "../b/internal";'],
  ]);
  const violations = await checkArchitectureBoundaries("virtual", { files });
  assert.deepEqual(violations.map((item) => item.rule).sort(), ["cross-feature-internal", "infrastructure-ui"]);
});
