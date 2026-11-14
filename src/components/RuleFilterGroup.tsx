import { type RuleFilter } from "@/lib/ruleSearch";
import { cn } from "@/lib/utils";

/** 絞り込みの選択肢 */
const FILTER_OPTIONS: ReadonlyArray<{ value: RuleFilter; label: string }> = [
  { value: "all", label: "すべて" },
  { value: "enabled", label: "有効" },
  { value: "disabled", label: "無効" },
];

/** 絞り込みの props */
type Props = {
  /** 選んでいる絞り込み */
  value: RuleFilter;
  /** 選び直したときに呼ぶ関数 */
  onValueChange: (value: RuleFilter) => void;
};

/**
 * 「すべて / 有効 / 無効」の切り替え。凹の溝の中で、選んだものだけを凸にする。
 * @param props 絞り込みの props
 * @returns {JSX.Element} 絞り込みの切り替え
 */
export function RuleFilterGroup({ value, onValueChange }: Props) {
  return (
    <div
      role="group"
      aria-label="絞り込み"
      className="ml-auto inline-flex flex-none gap-0.5 rounded-full p-[3px] shadow-inset-sm"
    >
      {FILTER_OPTIONS.map((option) => {
        const isSelected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={isSelected}
            onClick={() => onValueChange(option.value)}
            className={cn(
              "inline-flex h-6 cursor-pointer items-center rounded-full border-none bg-transparent px-3 text-control transition-[box-shadow,color] duration-150 hover:text-ink",
              isSelected ? "text-ink shadow-raised-sm" : "text-sub",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
