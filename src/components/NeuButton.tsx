import { type ComponentProps } from "react";
import { cn } from "@/lib/utils";

/** ボタンの props */
type Props = Omit<ComponentProps<"button">, "type"> & {
  /** 文言なしの丸いアイコンボタンにするか */
  isRound?: boolean;
  /** 削除など取り消せない操作として赤くするか */
  isDanger?: boolean;
};

/**
 * 凸の pill のボタン。ベタ塗りはせず影で押せることを示し、押下中は凹にする。
 * @param props ボタンの props（button の属性も渡せる）
 * @returns {JSX.Element} ボタン
 */
export function NeuButton({
  isRound = false,
  isDanger = false,
  className,
  children,
  ...rest
}: Props) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-full border-none bg-bg text-control shadow-raised-sm transition-[box-shadow,color] duration-150 enabled:active:shadow-inset-sm disabled:cursor-default disabled:text-faint disabled:shadow-none",
        isRound ? "size-[30px] p-0" : "min-h-[30px] px-5 py-1",
        isDanger ? "text-error" : "text-sub enabled:hover:text-ink",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
