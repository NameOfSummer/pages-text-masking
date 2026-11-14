import { type CSSProperties, type RefObject, useRef, useState } from "react";
import { useElementSize } from "./useElementSize";
import { useMediaQuery } from "./useMediaQuery";
import {
  DEFAULT_EDITOR_HEIGHT_PX,
  DEFAULT_RULES_WIDTH_PX,
  STACKED_MEDIA_QUERY,
  type SplitRange,
  clampSplit,
  getSplitRange,
  getSplitValueFromKey,
  getSplitValueFromPointer,
} from "@/lib/split";
import {
  EDITOR_HEIGHT_STORAGE_KEY,
  RULES_WIDTH_STORAGE_KEY,
  loadNumber,
  saveNumber,
} from "@/lib/storage";

/** 区切りバーの値を渡す CSS 変数 */
type SplitStyle = CSSProperties & {
  "--rules-width": string;
  "--editor-height": string;
};

/** useSplitLayout の戻り値 */
type SplitLayout = {
  /** 縦並びなら true */
  isStacked: boolean;
  /** 区切りバーを置く領域（grid）の ref */
  containerRef: RefObject<HTMLElement | null>;
  /** 領域に渡す CSS 変数 */
  style: SplitStyle;
  /** 今の値（範囲に収めた値。横並びは置換ワードの幅、縦並びはテキストの高さ） */
  value: number;
  /** 今の並びで取れる範囲 */
  range: SplitRange;
  /** ポインターの位置に合わせて値を変える */
  dragTo: (point: { clientX: number; clientY: number }) => void;
  /** キー操作で値を変えて保存する（対象のキーなら true） */
  moveByKey: (key: string) => boolean;
  /** 今の値を保存する（ドラッグを終えたとき） */
  commit: () => void;
};

/**
 * 区切りバーの値（横並びの置換ワードの幅・縦並びのテキストの高さ）を管理する。
 * 値は並びごとに別々に持ち、表示するときに最小値を守るよう範囲に収める。
 * @param storage 使える localStorage（使えなければ null）
 * @param reportSaveResult 保存の結果を知らせる関数
 * @returns {SplitLayout} 区切りバーの状態と操作
 */
export function useSplitLayout(
  storage: Storage | null,
  reportSaveResult: (isSaved: boolean) => void,
): SplitLayout {
  const isStacked = useMediaQuery(STACKED_MEDIA_QUERY);
  const containerRef = useRef<HTMLElement>(null);
  const size = useElementSize(containerRef);
  const [rulesWidth, setRulesWidth] = useState(
    () =>
      loadNumber(storage, RULES_WIDTH_STORAGE_KEY) ?? DEFAULT_RULES_WIDTH_PX,
  );
  const [editorHeight, setEditorHeight] = useState(
    () =>
      loadNumber(storage, EDITOR_HEIGHT_STORAGE_KEY) ??
      DEFAULT_EDITOR_HEIGHT_PX,
  );

  const range = getSplitRange(isStacked, size);
  const value = clampSplit(isStacked ? editorHeight : rulesWidth, range);
  // ドラッグ中は描画を待たずに最新の値を保存できるよう、最後に決めた値を持っておく（保存したら空にする）
  const latestValueRef = useRef<number | null>(null);

  const save = (next: number): void => {
    if (!storage) return;
    const key = isStacked ? EDITOR_HEIGHT_STORAGE_KEY : RULES_WIDTH_STORAGE_KEY;
    reportSaveResult(saveNumber(storage, key, next));
  };

  const setValue = (next: number): void => {
    latestValueRef.current = next;
    if (isStacked) setEditorHeight(next);
    else setRulesWidth(next);
  };

  const dragTo = (point: { clientX: number; clientY: number }): void => {
    const element = containerRef.current;
    if (!element) return;
    const rect = element.getBoundingClientRect();
    setValue(
      clampSplit(getSplitValueFromPointer(isStacked, rect, point), range),
    );
  };

  const moveByKey = (key: string): boolean => {
    const next = getSplitValueFromKey(key, value, range, isStacked);
    if (next === null) return false;
    setValue(next);
    save(next);
    latestValueRef.current = null;
    return true;
  };

  const commit = (): void => {
    save(latestValueRef.current ?? value);
    latestValueRef.current = null;
  };

  const style: SplitStyle = {
    "--rules-width": `${isStacked ? rulesWidth : value}px`,
    "--editor-height": `${isStacked ? value : editorHeight}px`,
  };

  return {
    isStacked,
    containerRef,
    style,
    value,
    range,
    dragTo,
    moveByKey,
    commit,
  };
}
