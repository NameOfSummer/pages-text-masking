import { describe, expect, it } from "vitest";
import { getEditorPosition, getTooltipPosition } from "./popover";

/** テスト用の画面の大きさ */
const VIEWPORT = { width: 1000, height: 800 };

/**
 * テスト用のタグの位置を作る。
 * @param top 上端
 * @param left 左端
 * @returns {{ top: number; left: number; bottom: number; width: number; height: number }} タグの位置と大きさ
 */
function anchorAt(
  top: number,
  left: number,
): {
  top: number;
  left: number;
  bottom: number;
  width: number;
  height: number;
} {
  return { top, left, bottom: top + 28, width: 100, height: 28 };
}

describe("getEditorPosition", () => {
  it("タグの下に開く", () => {
    expect(
      getEditorPosition(
        anchorAt(100, 200),
        { width: 320, height: 200 },
        VIEWPORT,
      ),
    ).toEqual({ top: 136, left: 200 });
  });

  it("下に入らないときは上に開く", () => {
    expect(
      getEditorPosition(
        anchorAt(700, 200),
        { width: 320, height: 200 },
        VIEWPORT,
      ),
    ).toEqual({ top: 492, left: 200 });
  });

  it("画面の右端からはみ出さない", () => {
    expect(
      getEditorPosition(
        anchorAt(100, 900),
        { width: 320, height: 200 },
        VIEWPORT,
      ).left,
    ).toBe(1000 - 320 - 8);
  });
});

describe("getTooltipPosition", () => {
  it("タグの上に出し、矢印をタグの左寄りに向ける", () => {
    expect(
      getTooltipPosition(
        anchorAt(100, 200),
        { width: 120, height: 30 },
        VIEWPORT,
      ),
    ).toEqual({ top: 62, left: 200, arrowX: 16 });
  });
});
