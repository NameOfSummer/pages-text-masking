import { useLayoutEffect, useRef } from "react";
import { getTooltipPosition } from "@/lib/popover";

/** 吹き出しの props */
type Props = {
  /** 吹き出しを向けるタグの要素 */
  anchor: HTMLElement;
  /** 吹き出しの文言 */
  text: string;
};

/**
 * タグの上に出す、置換後の吹き出し。描くたびにタグの位置に合わせ直す。
 * @param props 吹き出しの props
 * @returns {JSX.Element} 吹き出し
 */
export function TagTooltip({ anchor, text }: Props) {
  const tooltipRef = useRef<HTMLDivElement>(null);

  // 描くたびに、タグの位置と吹き出しの大きさから位置を決める（DOM の位置と同期する）
  useLayoutEffect(() => {
    const tooltip = tooltipRef.current;
    if (!tooltip) return;
    const position = getTooltipPosition(
      anchor.getBoundingClientRect(),
      tooltip.getBoundingClientRect(),
      { width: window.innerWidth, height: window.innerHeight },
    );
    tooltip.style.top = `${position.top}px`;
    tooltip.style.left = `${position.left}px`;
    tooltip.style.setProperty("--arrow-x", `${position.arrowX}px`);
  });

  return (
    <div
      ref={tooltipRef}
      role="tooltip"
      className="pointer-events-none fixed top-0 left-0 z-30 max-w-[280px] rounded-[10px] bg-tooltip-bg px-3 py-1.5 text-caption whitespace-pre-wrap text-tooltip-ink wrap-anywhere after:absolute after:-bottom-[5px] after:left-(--arrow-x,16px) after:border-[5px] after:border-b-0 after:border-transparent after:border-t-tooltip-bg after:content-['']"
    >
      {text}
    </div>
  );
}
