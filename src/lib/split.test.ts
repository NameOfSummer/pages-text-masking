import { describe, expect, it } from "vitest";
import {
  STACKED_EDITOR_MIN_PX,
  WIDE_RULES_MIN_PX,
  clampSplit,
  getSplitRange,
  getSplitValueFromKey,
  getSplitValueFromPointer,
} from "./split";

describe("getSplitRange", () => {
  it("横並びは、テキスト 360px と置換ワード 280px の最小幅を守る", () => {
    expect(getSplitRange(false, { width: 1000, height: 600 })).toEqual({
      min: 280,
      max: 1000 - 24 - 360,
    });
  });

  it("縦並びは、テキスト 200px と置換ワード 240px の最小高さを守る", () => {
    expect(getSplitRange(true, { width: 500, height: 800 })).toEqual({
      min: 200,
      max: 800 - 24 - 240,
    });
  });

  it("領域が狭すぎるときは最小値に寄せる", () => {
    expect(getSplitRange(false, { width: 0, height: 0 })).toEqual({
      min: WIDE_RULES_MIN_PX,
      max: WIDE_RULES_MIN_PX,
    });
    expect(getSplitRange(true, { width: 0, height: 300 })).toEqual({
      min: STACKED_EDITOR_MIN_PX,
      max: STACKED_EDITOR_MIN_PX,
    });
  });
});

describe("clampSplit", () => {
  it("範囲に収めて整数にする", () => {
    const range = { min: 280, max: 600 };
    expect(clampSplit(100, range)).toBe(280);
    expect(clampSplit(900, range)).toBe(600);
    expect(clampSplit(400.6, range)).toBe(401);
  });
});

describe("getSplitValueFromKey", () => {
  const range = { min: 280, max: 600 };

  it("横並びは ← で広げ、→ で狭める（16px ずつ）", () => {
    expect(getSplitValueFromKey("ArrowLeft", 380, range, false)).toBe(396);
    expect(getSplitValueFromKey("ArrowRight", 380, range, false)).toBe(364);
    expect(getSplitValueFromKey("ArrowUp", 380, range, false)).toBeNull();
  });

  it("縦並びは ↑ で低く、↓ で高くする", () => {
    expect(getSplitValueFromKey("ArrowUp", 420, range, true)).toBe(404);
    expect(getSplitValueFromKey("ArrowDown", 420, range, true)).toBe(436);
    expect(getSplitValueFromKey("ArrowLeft", 420, range, true)).toBeNull();
  });

  it("Home / End で端まで動き、矢印でも範囲を超えない", () => {
    expect(getSplitValueFromKey("Home", 400, range, false)).toBe(280);
    expect(getSplitValueFromKey("End", 400, range, false)).toBe(600);
    expect(getSplitValueFromKey("ArrowLeft", 595, range, false)).toBe(600);
    expect(getSplitValueFromKey("ArrowRight", 285, range, false)).toBe(280);
  });
});

describe("getSplitValueFromPointer", () => {
  it("区切りバーの中心がポインターに来るように求める", () => {
    const rect = { top: 100, right: 1000 };
    expect(
      getSplitValueFromPointer(false, rect, { clientX: 600, clientY: 0 }),
    ).toBe(1000 - 600 - 12);
    expect(
      getSplitValueFromPointer(true, rect, { clientX: 0, clientY: 600 }),
    ).toBe(600 - 100 - 12);
  });
});
