import assert from "node:assert/strict";
import test from "node:test";
import { resolveServerPort } from "./serverConfig";

test("resolveServerPort uses the configured port", () => {
  assert.equal(resolveServerPort("3100"), 3100);
});

test("resolveServerPort defaults when PORT is absent", () => {
  assert.equal(resolveServerPort(undefined), 3000);
});

test("resolveServerPort rejects invalid ports", () => {
  assert.throws(() => resolveServerPort("not-a-port"), /PORT/);
  assert.throws(() => resolveServerPort("0"), /PORT/);
  assert.throws(() => resolveServerPort("65536"), /PORT/);
});
