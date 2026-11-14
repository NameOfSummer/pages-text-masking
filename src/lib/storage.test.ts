import { beforeEach, describe, expect, it } from "vitest";
import { MAX_RULES, MAX_TEXT_LENGTH, type Rule } from "./rules";
import {
  RULES_STORAGE_KEY,
  RULES_WIDTH_STORAGE_KEY,
  loadNumber,
  loadRules,
  parseStoredRules,
  saveNumber,
  saveRules,
} from "./storage";

/**
 * 保存形式のルールを作る。
 * @param source 置換前
 * @returns {Record<string, unknown>} 保存形式のルール
 */
function storedRule(source: string): Record<string, unknown> {
  return { source, replacement: "x", isCustom: true, isEnabled: true };
}

describe("parseStoredRules", () => {
  it("正しいデータはそのまま使う", () => {
    expect(parseStoredRules([storedRule("a")])).toEqual([
      { source: "a", replacement: "x", isCustom: true, isEnabled: true },
    ]);
  });

  it("手入力でない置換後は、置換前から作り直す", () => {
    expect(
      parseStoredRules([
        { source: "山田", replacement: "?", isCustom: false, isEnabled: true },
        { source: "佐藤", replacement: "", isCustom: true, isEnabled: false },
      ]),
    ).toEqual([
      { source: "山田", replacement: "山＊", isCustom: false, isEnabled: true },
      {
        source: "佐藤",
        replacement: "佐＊",
        isCustom: false,
        isEnabled: false,
      },
    ]);
  });

  it.each([
    ["配列でない", { rules: [] }],
    ["null", null],
    ["要素がオブジェクトでない", ["a"]],
    ["型が違う", [{ ...storedRule("a"), isEnabled: "true" }]],
    ["項目が足りない", [{ source: "a", replacement: "x", isCustom: true }]],
    ["置換前が空", [storedRule("")]],
    ["置換前が長すぎる", [storedRule("a".repeat(MAX_TEXT_LENGTH + 1))]],
    [
      "置換後が長すぎる",
      [{ ...storedRule("a"), replacement: "x".repeat(MAX_TEXT_LENGTH + 1) }],
    ],
    ["置換前が重複", [storedRule("a"), storedRule("a")]],
    [
      "件数が上限超え",
      Array.from({ length: MAX_RULES + 1 }, (_, i) => storedRule(`w${i}`)),
    ],
  ])("壊れたデータ（%s）は全体を無視する", (_label, value) => {
    expect(parseStoredRules(value)).toBeNull();
  });

  it("上限ちょうどの件数・文字数は使う", () => {
    const value = Array.from({ length: MAX_RULES }, (_, i) =>
      storedRule(`${i}`.padEnd(MAX_TEXT_LENGTH, "a")),
    );
    expect(parseStoredRules(value)).toHaveLength(MAX_RULES);
  });
});

describe("loadRules / saveRules", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("保存したルールを読み込める（ID は保存しない）", () => {
    const rules: Rule[] = [
      {
        id: 9,
        source: "a",
        replacement: "b",
        isCustom: true,
        isEnabled: false,
      },
    ];
    expect(saveRules(localStorage, rules)).toBe(true);
    expect(localStorage.getItem(RULES_STORAGE_KEY)).not.toContain('"id"');
    expect(loadRules(localStorage)).toEqual([
      { source: "a", replacement: "b", isCustom: true, isEnabled: false },
    ]);
  });

  it("JSON として壊れていれば空の一覧", () => {
    localStorage.setItem(RULES_STORAGE_KEY, "{broken");
    expect(loadRules(localStorage)).toEqual([]);
  });

  it("Storage が使えなければ空の一覧", () => {
    expect(loadRules(null)).toEqual([]);
  });
});

describe("loadNumber / saveNumber", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("保存した数値を読み込める", () => {
    saveNumber(localStorage, RULES_WIDTH_STORAGE_KEY, 420);
    expect(loadNumber(localStorage, RULES_WIDTH_STORAGE_KEY)).toBe(420);
  });

  it.each([['"420"'], ["-1"], ["0"], ["null"], ["{"]])(
    "数値として正しくなければ null（%s）",
    (raw) => {
      localStorage.setItem(RULES_WIDTH_STORAGE_KEY, raw);
      expect(loadNumber(localStorage, RULES_WIDTH_STORAGE_KEY)).toBeNull();
    },
  );
});
