import { cn } from "@/lib/utils";

/** 状態表示の props */
type Props = {
  /** 置換中なら true */
  isReplacing: boolean;
};

/**
 * テキストの状態表示。凹の pill に点を付け、置換中は青にする。
 * @param props 状態表示の props
 * @returns {JSX.Element} 状態表示
 */
export function ModeBadge({ isReplacing }: Props) {
  return (
    <span
      className={cn(
        "inline-flex h-[22px] items-center gap-1.5 rounded-full px-2.5 text-caption shadow-inset-sm",
        isReplacing ? "text-on" : "text-faint",
      )}
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
      <span>{isReplacing ? "置換中" : "編集中"}</span>
    </span>
  );
}
