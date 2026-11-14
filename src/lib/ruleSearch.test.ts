import { describe, expect, it } from "vitest";
import {
  DEFAULT_RULE_QUERY,
  isFiltering,
  isRuleVisible,
  matchesRuleQuery,
  normalizeForSearch,
} from "./ruleSearch";
import { type Rule } from "./rules";

/** テスト用の有効なルール */
const ENABLED_RULE: Rule = {
  id: 1,
  source: "Ｔａｎａｋａ",
  replacement: "Ｔ＊＊＊ａ",
  isCustom: false,
  isEnabled: true,
};

/** テスト用の無効なルール */
const DISABLED_RULE: Rule = { ...ENABLED_RULE, id: 2, isEnabled: false };

describe("normalizeForSearch", () => {
  it("全角・半角と大文字・小文字をそろえる", () => {
    expect(normalizeForSearch("Ｔａｎａｋａ")).toBe("tanaka");
    expect(normalizeForSearch("ｶﾀｶﾅ")).toBe("カタカナ");
    expect(normalizeForSearch("ABC")).toBe("abc");
  });
});

describe("matchesRuleQuery", () => {
  it("置換前の部分一致で、全角・半角と大文字・小文字を区別しない", () => {
    expect(
      matchesRuleQuery(ENABLED_RULE, { search: "NAK", filter: "all" }),
    ).toBe(true);
    expect(
      matchesRuleQuery(ENABLED_RULE, { search: "suzuki", filter: "all" }),
    ).toBe(false);
  });

  it("有効・無効で絞り込み、検索と組み合わせられる", () => {
    const enabled = { search: "", filter: "enabled" } as const;
    const disabled = { search: "tana", filter: "disabled" } as const;
    expect(matchesRuleQuery(ENABLED_RULE, enabled)).toBe(true);
    expect(matchesRuleQuery(DISABLED_RULE, enabled)).toBe(false);
    expect(matchesRuleQuery(DISABLED_RULE, disabled)).toBe(true);
    expect(matchesRuleQuery(ENABLED_RULE, disabled)).toBe(false);
  });
});

describe("isRuleVisible", () => {
  it("編集中のタグは、条件に合わなくても出し続ける", () => {
    const query = { search: "", filter: "enabled" } as const;
    expect(isRuleVisible(DISABLED_RULE, query, null)).toBe(false);
    expect(isRuleVisible(DISABLED_RULE, query, DISABLED_RULE.id)).toBe(true);
  });
});

describe("isFiltering", () => {
  it("検索か絞り込みが掛かっているときだけ true", () => {
    expect(isFiltering(DEFAULT_RULE_QUERY)).toBe(false);
    expect(isFiltering({ search: "a", filter: "all" })).toBe(true);
    expect(isFiltering({ search: "", filter: "disabled" })).toBe(true);
  });
});
