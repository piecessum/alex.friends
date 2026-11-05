import { test } from "node:test";
import assert from "node:assert/strict";
import { seal, unseal } from "./research-auth-state.mjs";

test("refreshed credentials survive encrypted storage without plaintext in cache", () => {
  const plain = Buffer.from('{"tokens":{"refresh_token":"private-session-token"}}');
  const encrypted = seal(plain, "bootstrap-secret-for-test");
  assert.ok(!encrypted.includes(Buffer.from("private-session-token")));
  assert.deepEqual(unseal(encrypted, "bootstrap-secret-for-test"), plain);
  assert.notDeepEqual(seal(plain, "bootstrap-secret-for-test"), encrypted);
});
test("wrong bootstrap login or tampered cache cannot recover credentials", () => {
  const encrypted = seal(Buffer.from("refresh token"), "secret-one");
  assert.throws(() => unseal(encrypted, "secret-two"));
  encrypted[encrypted.length - 1] ^= 1;
  assert.throws(() => unseal(encrypted, "secret-one"));
});
