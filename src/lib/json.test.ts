import { describe, expect, it } from "vitest";
import { formatJson, isJsonContainer } from "./json";

describe("isJsonContainer", () => {
  it.each(['{"a":1}', "[1,2]", '  {"a":1}\n'])(
    "%j は JSON とみなす",
    (text) => {
      expect(isJsonContainer(text)).toBe(true);
    },
  );

  it.each(["123", '"abc"', "null", "", "{a:1}", '{"a":1'])(
    "%j は JSON とみなさない",
    (text) => {
      expect(isJsonContainer(text)).toBe(false);
    },
  );
});

describe("formatJson", () => {
  it("入れ子をスペース 2 つで整形する", () => {
    expect(formatJson('{"a":[1,{"b":true}],"c":null}')).toBe(
      '{\n  "a": [\n    1,\n    {\n      "b": true\n    }\n  ],\n  "c": null\n}',
    );
  });

  it("数値・エスケープ・重複キーを原文のまま残す", () => {
    expect(
      formatJson(
        '{"n":12345678901234567890,"f":1.0,"e":1e10,"u":"\\u3042","n":2}',
      ),
    ).toBe(
      '{\n  "n": 12345678901234567890,\n  "f": 1.0,\n  "e": 1e10,\n  "u": "\\u3042",\n  "n": 2\n}',
    );
  });

  it("文字列中の記号やエスケープした引用符で崩れない", () => {
    expect(formatJson('["{ } , : \\" \\\\"]')).toBe(
      '[\n  "{ } , : \\" \\\\"\n]',
    );
  });

  it("空の {} と [] はそのまま", () => {
    expect(formatJson('{"a":{},"b":[]}')).toBe('{\n  "a": {},\n  "b": []\n}');
    expect(formatJson(" [ ] ")).toBe("[]");
  });

  it("整形済みをもう一度整形しても同じ", () => {
    const once = formatJson('{"a":[1,2],"b":{"c":"d"}}');
    expect(formatJson(once)).toBe(once);
  });
});
