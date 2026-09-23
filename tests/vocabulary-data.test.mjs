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
