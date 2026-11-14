/** 縦並びに切り替える画面幅（src/index.css の stacked variant と同じ条件） */
export const STACKED_MEDIA_QUERY = "(max-width: 900px)";

/** 区切りバーの押せる範囲（px） */
export const SPLITTER_SIZE_PX = 24;

/** キー操作で 1 回に動かす量（px） */
export const SPLITTER_KEY_STEP_PX = 16;

/** 横並び: テキストの最小幅（px） */
export const WIDE_EDITOR_MIN_PX = 360;

/** 横並び: 置換ワードの最小幅（px） */
export const WIDE_RULES_MIN_PX = 280;

/** 縦並び: テキストの最小高さ（px） */
export const STACKED_EDITOR_MIN_PX = 200;

/** 縦並び: 置換ワードの最小高さ（px） */
export const STACKED_RULES_MIN_PX = 240;

/** 横並び: 置換ワードの幅の初期値（px） */
export const DEFAULT_RULES_WIDTH_PX = 380;

/** 縦並び: テキストの高さの初期値（px） */
export const DEFAULT_EDITOR_HEIGHT_PX = 420;

/** 区切りバーが取れる値の範囲 */
export type SplitRange = {
  /** 最小値（px） */
  min: number;
  /** 最大値（px） */
  max: number;
};

/** 区切りバーを置く領域の大きさ */
export type SplitContainerSize = {
  /** 幅（px） */
  width: number;
  /** 高さ（px） */
  height: number;
};

/**
 * 今の並びで区切りバーが取れる値の範囲を返す。両側の最小値を守り、領域が狭いときは最小値に寄せる。
 * @param isStacked 縦並びなら true
 * @param size 区切りバーを置く領域の大きさ
 * @returns {SplitRange} 最小値と最大値（横並びは置換ワードの幅、縦並びはテキストの高さ）
 */
export function getSplitRange(
  isStacked: boolean,
  size: SplitContainerSize,
): SplitRange {
  if (isStacked) {
    const max = size.height - SPLITTER_SIZE_PX - STACKED_RULES_MIN_PX;
    return {
      min: STACKED_EDITOR_MIN_PX,
      max: Math.max(STACKED_EDITOR_MIN_PX, Math.round(max)),
    };
  }
  const max = size.width - SPLITTER_SIZE_PX - WIDE_EDITOR_MIN_PX;
  return {
    min: WIDE_RULES_MIN_PX,
    max: Math.max(WIDE_RULES_MIN_PX, Math.round(max)),
  };
}

/**
 * 区切りバーの値を範囲に収める。
 * @param value 区切りバーの値（px）
 * @param range 取れる範囲
 * @returns {number} 範囲に収めた整数の値（px）
 */
export function clampSplit(value: number, range: SplitRange): number {
  return Math.round(Math.min(Math.max(value, range.min), range.max));
}

/**
 * キー操作から区切りバーの次の値を求める。
 * 横並びは ← で置換ワードを広げ、→ で狭める。縦並びは ↑ でテキストを低く、↓ で高くする。Home / End で端まで動く。
 * @param key 押されたキー（KeyboardEvent.key）
 * @param current 今の値（px）
 * @param range 取れる範囲
 * @param isStacked 縦並びなら true
 * @returns {number | null} 次の値（範囲に収めた値。対象外のキーなら null）
 */
export function getSplitValueFromKey(
  key: string,
  current: number,
  range: SplitRange,
  isStacked: boolean,
): number | null {
  if (key === "Home") return range.min;
  if (key === "End") return range.max;
  const decreaseKey = isStacked ? "ArrowUp" : "ArrowRight";
  const increaseKey = isStacked ? "ArrowDown" : "ArrowLeft";
  if (key === decreaseKey) {
    return clampSplit(current - SPLITTER_KEY_STEP_PX, range);
  }
  if (key === increaseKey) {
    return clampSplit(current + SPLITTER_KEY_STEP_PX, range);
  }
  return null;
}

/**
 * ポインターの位置から区切りバーの値を求める（区切りバーの中心がポインターに来るようにする）。
 * @param isStacked 縦並びなら true
 * @param rect 区切りバーを置く領域の位置と大きさ
 * @param point ポインターの位置
 * @returns {number} 横並びは置換ワードの幅、縦並びはテキストの高さ（px。範囲には収めない）
 */
export function getSplitValueFromPointer(
  isStacked: boolean,
  rect: Pick<DOMRect, "top" | "right">,
  point: { clientX: number; clientY: number },
): number {
  if (isStacked) return point.clientY - rect.top - SPLITTER_SIZE_PX / 2;
  return rect.right - point.clientX - SPLITTER_SIZE_PX / 2;
}
