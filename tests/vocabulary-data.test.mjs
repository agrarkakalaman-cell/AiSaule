import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const requiredLanguages = ["kk", "en", "tk", "prs", "ps", "be", "hu", "ky", "zh-CN", "mn", "ur", "ru", "tr", "uz", "uk"];

test("bundles 300 unique daily vocabulary entries in every interface language", async () => {
  const raw = await readFile(new URL("../app/data/daily-vocabulary.json", import.meta.url), "utf8");
  const entries = JSON.parse(raw);

  assert.equal(entries.length, 300);
  assert.equal(new Set(entries.map((entry) => entry.kazakh.toLocaleLowerCase("kk"))).size, 300);
  for (const entry of entries) {
    assert.deepEqual(Object.keys(entry.translations).sort(), [...requiredLanguages].sort());
    assert.ok(Object.values(entry.translations).every((translation) => typeof translation === "string" && translation.trim().length > 0));
  }
});

test("bundles complete interface copy for every language", async () => {
  const raw = await readFile(new URL("../app/data/ui-copy.json", import.meta.url), "utf8");
  const copy = JSON.parse(raw);
  assert.deepEqual(Object.keys(copy).sort(), [...requiredLanguages].sort());
  const requiredKeys = Object.keys(copy.kk).sort();
  assert.ok(requiredKeys.length >= 35);
  for (const languageCopy of Object.values(copy)) {
    assert.deepEqual(Object.keys(languageCopy).sort(), requiredKeys);
    assert.ok(Object.values(languageCopy).every((value) => typeof value === "string" && value.trim().length > 0));
  }
});
