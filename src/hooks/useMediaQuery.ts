import { useCallback, useSyncExternalStore } from "react";

/**
 * メディアクエリに一致しているかを返し、変わったら再描画する。matchMedia が無い環境では false を返す。
 * @param query メディアクエリ（例: "(max-width: 900px)"）
 * @returns {boolean} 一致していれば true
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (typeof window.matchMedia !== "function") return () => {};
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    [query],
  );
  const getSnapshot = (): boolean =>
    typeof window.matchMedia === "function" && window.matchMedia(query).matches;
  return useSyncExternalStore(subscribe, getSnapshot);
}
