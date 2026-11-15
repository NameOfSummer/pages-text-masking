import { describe, expect, it } from "vitest";
import {
  buildReplacedRange,
  buildReplacedText,
  countMatches,
  splitByRules,
} from "./replace";
import { type Rule } from "./rules";

/**
 * テスト用のルールを作る。
 * @param id ルールの ID
 * @param source 置換前
 * @param replacement 置換後
 * @param isEnabled 有効か
 * @returns {Rule} ルール
 */
function makeRule(
  id: number,
  source: string,
  replacement: string,
  isEnabled = true,
): Rule {
  return { id, source, replacement, isCustom: true, isEnabled };
}

describe("splitByRules / buildReplacedText", () => {
  it("一致した箇所を置換後にする", () => {
    const rules = [makeRule(1, "山田", "X")];
    const segments = splitByRules("山田さんと山田さん", rules);
    expect(buildReplacedText(segments)).toBe("XさんとXさん");
    expect(segments.map((segment) => segment.start)).toEqual([0, 2, 5, 7]);
  });

  it("長い語を優先する", () => {
    const rules = [
      makeRule(1, "株式会社サンプル", "A"),
      makeRule(2, "株式会社サンプル商事", "B"),
    ];
    const segments = splitByRules(
      "株式会社サンプル商事と株式会社サンプル",
      rules,
    );
    expect(buildReplacedText(segments)).toBe("BとA");
  });

  it("無効なルールは比べない（短い有効なルールが当たる）", () => {
    const rules = [
      makeRule(1, "株式会社サンプル", "A"),
      makeRule(2, "株式会社サンプル商事", "B", false),
    ];
    expect(buildReplacedText(splitByRules("株式会社サンプル商事", rules))).toBe(
      "A商事",
    );
  });

  it("置換後をさらに置換しない", () => {
    const rules = [makeRule(1, "a", "b"), makeRule(2, "b", "c")];
    expect(buildReplacedText(splitByRules("ab", rules))).toBe("bc");
  });

  it("大文字・小文字を区別する", () => {
    const rules = [makeRule(1, "Tanaka", "T")];
    expect(buildReplacedText(splitByRules("tanaka Tanaka", rules))).toBe(
      "tanaka T",
    );
  });

  it("サロゲートペアを含む語も当てはまる", () => {
    const rules = [makeRule(1, "𠮷野", "Y")];
    expect(buildReplacedText(splitByRules("𠮷野家と𠮷田", rules))).toBe(
      "Y家と𠮷田",
    );
  });

  it("ルールがなければ全体を 1 区間にする。空のテキストは区間なし", () => {
    expect(splitByRules("abc", [])).toEqual([
      { start: 0, text: "abc", rule: null },
    ]);
    expect(splitByRules("", [makeRule(1, "a", "b")])).toEqual([]);
  });
});

describe("countMatches", () => {
  it("ルールごとの件数を、長い語優先の当てはめ方で数える", () => {
    const rules = [
      makeRule(1, "サンプル", "A"),
      makeRule(2, "サンプル商事", "B"),
      makeRule(3, "なし", "C"),
    ];
    const counts = countMatches(
      splitByRules("サンプル商事、サンプル、サンプル", rules),
    );
    expect(counts.get(1)).toBe(2);
    expect(counts.get(2)).toBe(1);
    expect(counts.get(3)).toBeUndefined();
  });

  it("無効なルールは数えない", () => {
    const rules = [makeRule(1, "a", "b", false)];
    expect(countMatches(splitByRules("aaa", rules)).size).toBe(0);
  });
});

describe("buildReplacedRange", () => {
  const segments = splitByRules("あ山田い", [makeRule(1, "山田", "＊＊")]);

  it("範囲内の一致箇所を置換後にし、それ以外は原文を切り出す", () => {
    expect(buildReplacedRange(segments, 0, 4)).toBe("あ＊＊い");
    expect(buildReplacedRange(segments, 3, 4)).toBe("い");
  });

  it("一致箇所に一部でもかかれば、置換後を丸ごと入れる", () => {
    expect(buildReplacedRange(segments, 2, 4)).toBe("＊＊い");
  });
});
