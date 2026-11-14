import { type RefObject, useLayoutEffect, useState } from "react";
import { type SplitContainerSize } from "@/lib/split";

/** 測る前の大きさ */
const INITIAL_SIZE: SplitContainerSize = { width: 0, height: 0 };

/**
 * 要素の大きさを測り、ウィンドウや要素の大きさが変わったら測り直す。
 * @param ref 測る要素の ref
 * @returns {SplitContainerSize} 要素の幅と高さ（px）
 */
export function useElementSize(
  ref: RefObject<HTMLElement | null>,
): SplitContainerSize {
  const [size, setSize] = useState<SplitContainerSize>(INITIAL_SIZE);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const update = (): void => {
      const rect = element.getBoundingClientRect();
      setSize((previous) =>
        previous.width === rect.width && previous.height === rect.height
          ? previous
          : { width: rect.width, height: rect.height },
      );
    };
    update();
    window.addEventListener("resize", update);
    // ResizeObserver が無い環境（jsdom など）では、ウィンドウの大きさの変化だけを見る
    const observer =
      typeof ResizeObserver === "function" ? new ResizeObserver(update) : null;
    observer?.observe(element);
    return () => {
      window.removeEventListener("resize", update);
      observer?.disconnect();
    };
  }, [ref]);

  return size;
}
