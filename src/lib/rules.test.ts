import { describe, expect, it } from "vitest";
import {
  DUPLICATE_SOURCE_ERROR,
  EMPTY_SOURCE_ERROR,
  MAX_RULES,
  MAX_TEXT_LENGTH,
  type Rule,
  addRule,
  applyReplacementInput,
  applySourceInput,
  finishEditing,
  getFocusTargetAfterDelete,
  removeRule,
  restoreDefaultReplacement,
  startEditing,
  toggleRuleEnabled,
  truncateText,
  validateSource,
} from "./rules";

/**
 * テスト用に、置換前の一覧からルールを作る。
 * @param sources 置換前の一覧
 * @returns {Rule[]} ルール一覧（ID は 1 から）
 */
function makeRules(sources: readonly string[]): Rule[] {
  return sources.reduce<Rule[]>((rules, source, index) => {
    const result = addRule(rules, source, index + 1);
    return result.status === "added" ? result.rules : rules;
  }, []);
}

describe("addRule", () => {
  it("末尾に有効なルールとして追加し、置換後に伏せ字の値を入れる", () => {
    const result = addRule([], "山田太郎", 1);
    expect(result).toEqual({
      status: "added",
      rule: {
        id: 1,
        source: "山田太郎",
        replacement: "山＊＊郎",
        isCustom: false,
        isEnabled: true,
      },
      rules: [expect.objectContaining({ source: "山田太郎" })],
    });
  });

  it("空なら追加しない", () => {
    expect(addRule([], "", 1)).toEqual({ status: "empty" });
  });

  it("同じ置換前があれば（無効なルールでも）追加せず、そのルールを返す", () => {
    const rules = toggleRuleEnabled(makeRules(["山田"]), 1);
    const result = addRule(rules, "山田", 2);
    expect(result).toEqual({ status: "duplicate", rule: rules[0] });
  });

  it("上限に達していたら追加しない", () => {
    const rules = makeRules(
      Array.from({ length: MAX_RULES }, (_, i) => `w${i}`),
    );
    expect(rules).toHaveLength(MAX_RULES);
    expect(addRule(rules, "new", MAX_RULES + 1)).toEqual({ status: "full" });
  });

  it("上限の文字数を超えた分は切り詰める", () => {
    const result = addRule([], "a".repeat(MAX_TEXT_LENGTH + 5), 1);
    expect(result.status === "added" && result.rule.source.length).toBe(
      MAX_TEXT_LENGTH,
    );
  });
});

describe("truncateText", () => {
  it("末尾で割れたサロゲートペアを落とす", () => {
    const value = `${"a".repeat(MAX_TEXT_LENGTH - 1)}𠮷`;
    expect(truncateText(value)).toBe("a".repeat(MAX_TEXT_LENGTH - 1));
  });
});

describe("removeRule / getFocusTargetAfterDelete", () => {
  const rules = makeRules(["a", "b", "c"]);

  it("ルールを削除する", () => {
    expect(removeRule(rules, 2).map((rule) => rule.source)).toEqual(["a", "c"]);
  });

  it("Backspace は前、Delete は次へ移り、なければ反対側へ移る", () => {
    expect(getFocusTargetAfterDelete(rules, 2, "backward")).toBe(1);
    expect(getFocusTargetAfterDelete(rules, 2, "forward")).toBe(3);
    expect(getFocusTargetAfterDelete(rules, 1, "backward")).toBe(2);
    expect(getFocusTargetAfterDelete(rules, 3, "forward")).toBe(2);
  });

  it("ほかにタグがなければ null（入力欄へ）", () => {
    expect(getFocusTargetAfterDelete(makeRules(["a"]), 1, "forward")).toBe(
      null,
    );
  });
});

describe("編集欄", () => {
  it("置換前のエラーを返す", () => {
    const rules = makeRules(["a", "b"]);
    expect(validateSource(rules, "", 1)).toBe(EMPTY_SOURCE_ERROR);
    expect(validateSource(rules, "b", 1)).toBe(DUPLICATE_SOURCE_ERROR);
    expect(validateSource(rules, "a", 1)).toBe("");
  });

  it("置換前の変更に置換後が追従する。エラーのあいだは反映しない", () => {
    let rules = makeRules(["山田", "佐藤"]);
    rules = applySourceInput(rules, 1, "山田太郎");
    expect(rules[0]).toMatchObject({
      source: "山田太郎",
      replacement: "山＊＊郎",
    });
    rules = applySourceInput(rules, 1, "佐藤");
    expect(rules[0].source).toBe("山田太郎");
    rules = applySourceInput(rules, 1, "");
    expect(rules[0].source).toBe("山田太郎");
  });

  it("置換後を手で書き換えたら追従せず、空にしたらまた追従する", () => {
    let rules = makeRules(["山田"]);
    rules = applyReplacementInput(rules, 1, "Y");
    expect(rules[0]).toMatchObject({ replacement: "Y", isCustom: true });
    rules = applySourceInput(rules, 1, "山田太郎");
    expect(rules[0].replacement).toBe("Y");
    rules = applyReplacementInput(rules, 1, "");
    expect(rules[0].isCustom).toBe(false);
    rules = applySourceInput(rules, 1, "山田花子");
    expect(rules[0].replacement).toBe("山＊＊子");
  });

  it("デフォルトに戻すと、置換後を伏せ字の値にする", () => {
    const rules = restoreDefaultReplacement(
      applyReplacementInput(makeRules(["山田"]), 1, "Y"),
      1,
    );
    expect(rules[0]).toMatchObject({ replacement: "山＊", isCustom: false });
  });

  it("閉じるとき、置換前がエラーなら開いたときの値に戻し、有効・無効の切り替えは残す", () => {
    let rules = makeRules(["山田", "佐藤"]);
    const editing = startEditing(rules[0]);
    rules = applySourceInput(rules, 1, "山田太郎");
    rules = applyReplacementInput(rules, 1, "Y");
    rules = toggleRuleEnabled(rules, 1);
    // 置換前を重複させたまま閉じる
    rules = applySourceInput(rules, 1, "佐藤");
    const closed = finishEditing(rules, { ...editing, draftSource: "佐藤" });
    expect(closed[0]).toEqual({
      id: 1,
      source: "山田",
      replacement: "山＊",
      isCustom: false,
      isEnabled: false,
    });
  });

  it("閉じるとき、置換前が空でも開いたときの値に戻す", () => {
    const rules = makeRules(["山田"]);
    const editing = { ...startEditing(rules[0]), draftSource: "" };
    expect(finishEditing(rules, editing)[0].source).toBe("山田");
  });

  it("閉じるとき、置換後が空なら伏せ字の値に戻す", () => {
    let rules = makeRules(["山田"]);
    const editing = startEditing(rules[0]);
    rules = applySourceInput(rules, 1, "山田太郎");
    rules = applyReplacementInput(rules, 1, "");
    const closed = finishEditing(rules, {
      ...editing,
      draftSource: "山田太郎",
    });
    expect(closed[0]).toMatchObject({
      source: "山田太郎",
      replacement: "山＊＊郎",
      isCustom: false,
    });
  });
});
