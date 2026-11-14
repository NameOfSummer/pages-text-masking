import { Fragment, useLayoutEffect, useRef } from "react";
import { type Segment } from "@/lib/replace";
import { cn } from "@/lib/utils";

/**
 * textarea・下敷き・置換後の表示に共通のクラス。
 * マーカーの位置をそろえるため、同じ寸法・同じ折り返しにする。
 */
const LAYER_CLASS =
  "absolute inset-0 m-0 overflow-y-scroll rounded-[18px] border-none px-5 py-[18px] font-editor text-editor tracking-normal whitespace-pre-wrap wrap-anywhere";

/** テキストエディタの props */
type Props = {
  /** 原文 */
  text: string;
  /** 原文をルールで分割した区間 */
  segments: readonly Segment[];
  /** 置換中なら true（置換後を読み取り専用で出す） */
  isReplacing: boolean;
  /** 原文を書き換えたときに呼ぶ関数 */
  onTextChange: (text: string) => void;
};

/**
 * テキストエディタ。置換 OFF では textarea の下に一致箇所の黄色いマーカーを敷き、置換 ON では置換後を薄い青の印付きで出す。
 * @param props テキストエディタの props
 * @returns {JSX.Element} テキストエディタ
 */
export function TextEditor({
  text,
  segments,
  isReplacing,
  onTextChange,
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  const syncScroll = (): void => {
    if (!textareaRef.current || !backdropRef.current) return;
    backdropRef.current.scrollTop = textareaRef.current.scrollTop;
  };

  // 描き直したあとも、下敷きのスクロール位置を textarea に合わせる
  useLayoutEffect(() => {
    syncScroll();
  });

  return (
    <div className="relative min-h-0 flex-1 overflow-hidden rounded-[18px] bg-bg shadow-inset focus-within:shadow-inset-focus">
      <div
        ref={backdropRef}
        aria-hidden="true"
        hidden={isReplacing}
        className={cn(LAYER_CLASS, "pointer-events-none text-transparent")}
      >
        {segments.map((segment) =>
          segment.rule ? (
            <mark
              key={segment.start}
              className="rounded-[3px] bg-marker text-transparent"
            >
              {segment.text}
            </mark>
          ) : (
            <Fragment key={segment.start}>{segment.text}</Fragment>
          ),
        )}
        {/* 末尾の改行の高さをそろえるためのダミー */}{" "}
      </div>
      <textarea
        ref={textareaRef}
        aria-label="テキスト"
        spellCheck={false}
        hidden={isReplacing}
        value={text}
        onChange={(event) => onTextChange(event.target.value)}
        onScroll={syncScroll}
        className={cn(
          LAYER_CLASS,
          "resize-none bg-transparent text-ink caret-ink focus-visible:outline-none",
        )}
      />
      <div
        role="textbox"
        aria-readonly="true"
        aria-multiline="true"
        aria-label="置換後のテキスト"
        tabIndex={0}
        hidden={!isReplacing}
        className={cn(LAYER_CLASS, "bg-bg text-ink focus-visible:outline-none")}
      >
        {segments.map((segment) =>
          segment.rule ? (
            <mark
              key={segment.start}
              className="rounded-[3px] bg-marker-replaced text-inherit"
            >
              {segment.rule.replacement}
            </mark>
          ) : (
            <Fragment key={segment.start}>{segment.text}</Fragment>
          ),
        )}
      </div>
    </div>
  );
}
