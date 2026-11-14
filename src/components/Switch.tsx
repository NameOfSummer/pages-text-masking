import { cn } from "@/lib/utils";

/** スイッチの props */
type Props = {
  /** ON なら true */
  isChecked: boolean;
  /** スイッチの横に出す文言 */
  label: string;
  /** 切り替えたときに呼ぶ関数（次の状態を渡す） */
  onCheckedChange: (isChecked: boolean) => void;
};

/**
 * 凹んだ溝に凸のつまみを載せたスイッチ。ON は溝を青にし、つまみを白にして右へ動かす。
 * @param props スイッチの props
 * @returns {JSX.Element} スイッチ
 */
export function Switch({ isChecked, label, onCheckedChange }: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={isChecked}
      onClick={() => onCheckedChange(!isChecked)}
      className="inline-flex cursor-pointer items-center gap-2 rounded-full border-none bg-transparent p-0.5 text-ink"
    >
      <span
        className={cn(
          "relative h-[22px] w-10 rounded-full transition-[background-color] duration-200",
          isChecked ? "bg-on shadow-inset-on" : "shadow-inset-sm",
        )}
      >
        <span
          className={cn(
            "absolute top-[3px] left-[3px] size-4 rounded-full shadow-thumb transition-[translate,background-color] duration-200",
            isChecked ? "translate-x-[18px] bg-white" : "bg-bg",
          )}
        />
      </span>
      <span className="text-control">{label}</span>
    </button>
  );
}
