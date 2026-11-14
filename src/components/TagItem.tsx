import { XMarkIcon } from "@heroicons/react/24/outline";
import { type KeyboardEvent } from "react";
import { type FocusDirection, type Rule } from "@/lib/rules";
import { cn } from "@/lib/utils";

/** タグの props */
type Props = {
  /** 表示するルール */
  rule: Rule;
  /** テキスト内で当てはまった件数 */
  count: number;
  /** 編集欄を開いているタグなら true */
  isEditing: boolean;
  /** 点滅させる合図（値が変わるたびに点滅し直す。点滅しないときは null） */
  flashToken: number | null;
  /** タグの要素を親に渡す関数（フォーカスや編集欄の位置合わせに使う） */
  onElementChange: (id: number, element: HTMLSpanElement | null) => void;
  /** タグを押したときに呼ぶ関数 */
  onOpen: (id: number) => void;
  /** × を押したときに呼ぶ関数 */
  onDelete: (id: number) => void;
  /** タグの上で Backspace / Delete を押したときに呼ぶ関数 */
  onDeleteKey: (id: number, direction: FocusDirection) => void;
  /** 吹き出しを出すときに呼ぶ関数 */
  onShowTooltip: (id: number) => void;
  /** 吹き出しを隠すときに呼ぶ関数 */
  onHideTooltip: () => void;
};

/**
 * 置換ルールのタグ。置換前・手入力の印・一致件数と、削除の × を並べる。
 * @param props タグの props
 * @returns {JSX.Element} タグ
 */
export function TagItem({
  rule,
  count,
  isEditing,
  flashToken,
  onElementChange,
  onOpen,
  onDelete,
  onDeleteKey,
  onShowTooltip,
  onHideTooltip,
}: Props) {
  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>): void => {
    if (event.key !== "Backspace" && event.key !== "Delete") return;
    event.preventDefault();
    onDeleteKey(rule.id, event.key === "Backspace" ? "backward" : "forward");
  };

  // 凸の影が基本。編集中は凹、無効は影をなくして薄い内枠にする
  const shadowClass = isEditing
    ? "shadow-inset-sm"
    : rule.isEnabled
      ? "shadow-raised-sm"
      : "shadow-flat";

  return (
    <span
      // 点滅をはじめから再生し直すため、合図が変わったら作り直す
      key={flashToken ?? "static"}
      ref={(element) => onElementChange(rule.id, element)}
      data-rule-tag=""
      onMouseEnter={() => onShowTooltip(rule.id)}
      onMouseLeave={onHideTooltip}
      onFocus={() => onShowTooltip(rule.id)}
      onBlur={onHideTooltip}
      className={cn(
        "inline-flex h-7 max-w-full items-stretch rounded-full bg-bg text-control transition-shadow duration-150",
        shadowClass,
        flashToken !== null && "animate-tag-flash",
      )}
    >
      <button
        type="button"
        data-tag-main=""
        aria-label={`${rule.source}（置換後: ${rule.replacement}${rule.isEnabled ? "" : "、無効"}）`}
        aria-haspopup="dialog"
        aria-expanded={isEditing}
        onClick={() => onOpen(rule.id)}
        onKeyDown={handleKeyDown}
        className={cn(
          "inline-flex max-w-60 min-w-0 cursor-pointer items-center gap-[5px] rounded-l-full border-none bg-transparent py-0 pr-1 pl-3",
          rule.isEnabled ? "text-ink" : "text-faint",
        )}
      >
        <span className={cn("truncate", !rule.isEnabled && "line-through")}>
          {rule.source}
        </span>
        {rule.isCustom && (
          <span
            title="変更済み"
            className={cn(
              "size-1.5 flex-none rounded-full",
              rule.isEnabled ? "bg-orange" : "bg-faint",
            )}
          />
        )}
        {rule.isEnabled && (
          <span
            className={cn(
              "h-[18px] min-w-[18px] flex-none rounded-full px-[5px] text-center text-badge leading-[18px] tabular-nums",
              count === 0
                ? "bg-transparent text-faint shadow-inset-sm"
                : "bg-on text-white",
            )}
          >
            {count}
          </span>
        )}
      </button>
      <button
        type="button"
        tabIndex={-1}
        aria-label={`${rule.source}を削除`}
        onClick={() => onDelete(rule.id)}
        className="inline-flex w-7 flex-none cursor-pointer items-center justify-center rounded-r-full border-none bg-transparent p-0 text-faint hover:text-error"
      >
        <XMarkIcon className="size-3" aria-hidden="true" />
      </button>
    </span>
  );
}
