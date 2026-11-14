import { type PointerEvent, useEffect, useState } from "react";
import { type SplitRange } from "@/lib/split";
import { cn } from "@/lib/utils";

/** 区切りバーの props */
type Props = {
  /** 縦並びなら true（高さを変える） */
  isStacked: boolean;
  /** 今の値（px） */
  value: number;
  /** 取れる範囲 */
  range: SplitRange;
  /** 区切りバーで大きさを変える要素の ID */
  controls: string;
  /** ドラッグ中にポインターの位置を渡す関数 */
  onDrag: (point: { clientX: number; clientY: number }) => void;
  /** キーを渡す関数（対象のキーなら true を返す） */
  onKey: (key: string) => boolean;
  /** ドラッグを終えたときに呼ぶ関数 */
  onCommit: () => void;
};

/**
 * テキストと置換ワードの間の区切りバー。横並びでは幅を、縦並びでは高さを、ドラッグとキー操作で変える。
 * @param props 区切りバーの props
 * @returns {JSX.Element} 区切りバー
 */
export function Splitter({
  isStacked,
  value,
  range,
  controls,
  onDrag,
  onKey,
  onCommit,
}: Props) {
  const [isDragging, setIsDragging] = useState(false);

  // ドラッグ中はページの文字選択を止め、カーソルをそろえる（body の属性と同期する）
  useEffect(() => {
    if (!isDragging) return;
    document.body.dataset.resizing = isStacked ? "vertical" : "horizontal";
    return () => {
      delete document.body.dataset.resizing;
    };
  }, [isDragging, isStacked]);

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>): void => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsDragging(true);
  };

  const handlePointerEnd = (): void => {
    if (!isDragging) return;
    setIsDragging(false);
    onCommit();
  };

  return (
    <div
      role="separator"
      tabIndex={0}
      aria-controls={controls}
      // 横並びの区切りは縦の線（vertical）、縦並びの区切りは横の線（horizontal）
      aria-orientation={isStacked ? "horizontal" : "vertical"}
      aria-label={isStacked ? "高さの調節" : "幅の調節"}
      aria-valuenow={value}
      aria-valuemin={range.min}
      aria-valuemax={range.max}
      onPointerDown={handlePointerDown}
      onPointerMove={(event) => {
        if (isDragging) onDrag(event);
      }}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      onKeyDown={(event) => {
        if (onKey(event.key)) event.preventDefault();
      }}
      className={cn(
        "group flex touch-none items-center justify-center rounded-full",
        isStacked ? "cursor-row-resize" : "cursor-col-resize",
      )}
    >
      <span
        className={cn(
          "rounded-full transition-[background-color,box-shadow] duration-150 group-hover:bg-on group-hover:shadow-none",
          isStacked ? "h-1 w-10" : "h-10 w-1",
          isDragging ? "bg-on shadow-none" : "shadow-inset-sm",
        )}
      />
    </div>
  );
}
