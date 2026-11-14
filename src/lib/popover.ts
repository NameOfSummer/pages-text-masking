/** 基準の要素と吹き出し・編集欄のすき間（px） */
export const POPOVER_GAP_PX = 8;

/** 画面の端から空ける幅（px） */
export const VIEWPORT_MARGIN_PX = 8;

/** 吹き出しの矢印の、左端からの既定の位置（px） */
const ARROW_OFFSET_PX = 16;

/** 吹き出しの矢印を寄せられる左端（px） */
const ARROW_MIN_PX = 10;

/** 吹き出しの矢印を寄せられる右端からの幅（px） */
const ARROW_RIGHT_INSET_PX = 20;

/** 要素の位置と大きさ */
export type Box = Pick<DOMRect, "top" | "left" | "bottom" | "width" | "height">;

/** 画面の大きさ */
export type Viewport = {
  /** 幅（px） */
  width: number;
  /** 高さ（px） */
  height: number;
};

/** 画面上の位置 */
export type PopoverPosition = {
  /** 上端（px） */
  top: number;
  /** 左端（px） */
  left: number;
};

/** 吹き出しの位置と、矢印の位置 */
export type TooltipPosition = PopoverPosition & {
  /** 矢印の、吹き出しの左端からの位置（px） */
  arrowX: number;
};

/**
 * 基準の要素の左端にそろえつつ、画面の左右からはみ出さない左端の位置を求める。
 * @param anchor 基準の要素
 * @param popoverWidth 出す要素の幅
 * @param viewport 画面の大きさ
 * @returns {number} 左端の位置（px）
 */
function getClampedLeft(
  anchor: Box,
  popoverWidth: number,
  viewport: Viewport,
): number {
  const maxLeft = viewport.width - popoverWidth - VIEWPORT_MARGIN_PX;
  return Math.max(VIEWPORT_MARGIN_PX, Math.min(anchor.left, maxLeft));
}

/**
 * 編集欄の位置を求める。タグの下に開き、下に入らないときは上に開く（仕様 4.2）。
 * @param anchor 編集中のタグ
 * @param popover 編集欄の大きさ
 * @param viewport 画面の大きさ
 * @returns {PopoverPosition} 編集欄の位置
 */
export function getEditorPosition(
  anchor: Box,
  popover: Pick<Box, "width" | "height">,
  viewport: Viewport,
): PopoverPosition {
  const left = getClampedLeft(anchor, popover.width, viewport);
  const below = anchor.bottom + POPOVER_GAP_PX;
  if (below + popover.height <= viewport.height - VIEWPORT_MARGIN_PX) {
    return { top: below, left };
  }
  const above = anchor.top - popover.height - POPOVER_GAP_PX;
  return { top: Math.max(VIEWPORT_MARGIN_PX, above), left };
}

/**
 * 吹き出しの位置を求める。タグの上に出し、矢印はタグの左寄りに向ける。
 * @param anchor マウスを載せたタグ
 * @param tooltip 吹き出しの大きさ
 * @param viewport 画面の大きさ
 * @returns {TooltipPosition} 吹き出しと矢印の位置
 */
export function getTooltipPosition(
  anchor: Box,
  tooltip: Pick<Box, "width" | "height">,
  viewport: Viewport,
): TooltipPosition {
  const left = getClampedLeft(anchor, tooltip.width, viewport);
  const arrowX = Math.max(
    ARROW_MIN_PX,
    Math.min(
      anchor.left - left + ARROW_OFFSET_PX,
      tooltip.width - ARROW_RIGHT_INSET_PX,
    ),
  );
  return {
    top: anchor.top - tooltip.height - POPOVER_GAP_PX,
    left,
    arrowX,
  };
}
