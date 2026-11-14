import { describe, expect, it } from "vitest";
import { isHalfWidth, isPreservedChar, maskValue } from "./mask";

describe("maskValue", () => {
  it.each([
    ["山田太郎", "山＊＊郎"],
    ["tanaka@example.com", "t*****@*******.**m"],
    ["山田", "山＊"],
    ["a", "*"],
    ["ＡＢＣ１２３", "Ａ＊Ｃ１２３"],
    ["ｶﾀｶﾅ", "ｶ**ﾅ"],
    ["03-1234-5678", "03-1234-5678"],
  ])("仕様 3.1 の例: %s → %s", (source, expected) => {
    expect(maskValue(source)).toBe(expected);
  });

  it("空文字は空文字のまま", () => {
    expect(maskValue("")).toBe("");
  });

  it("サロゲートペアの文字は 1 文字として扱う", () => {
    expect(maskValue("𠮷野家")).toBe("𠮷＊家");
    expect(maskValue("𠮷野")).toBe("𠮷＊");
    expect(maskValue("𠮷")).toBe("＊");
  });

  it("空白は残し、最初と最後は伏せる対象の文字の中で数える", () => {
    expect(maskValue("Yamada Taro")).toBe("Y***** ***o");
    expect(maskValue("(株)サンプル")).toBe("(株)＊＊＊ル");
  });
});

describe("isHalfWidth", () => {
  it("ASCII・半角カナ・半角記号は半角", () => {
    expect(isHalfWidth("a")).toBe(true);
    expect(isHalfWidth("ｱ")).toBe(true);
    expect(isHalfWidth("￨")).toBe(true);
  });

  it("漢字・全角英字は全角", () => {
    expect(isHalfWidth("山")).toBe(false);
    expect(isHalfWidth("Ａ")).toBe(false);
  });
});

describe("isPreservedChar", () => {
  it("記号・空白・数字は残す", () => {
    for (const char of ["@", ".", "-", " ", "　", "1", "１", "【"]) {
      expect(isPreservedChar(char)).toBe(true);
    }
  });

  it("文字は残さない", () => {
    for (const char of ["a", "山", "ｱ", "Ａ"]) {
      expect(isPreservedChar(char)).toBe(false);
    }
  });
});
