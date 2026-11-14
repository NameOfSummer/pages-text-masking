import { ArrowUturnLeftIcon, TrashIcon } from "@heroicons/react/24/outline";
import {
  useEffect,
  useEffectEvent,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { NeuButton } from "./NeuButton";
import { Switch } from "./Switch";
import { maskValue } from "@/lib/mask";
import { getEditorPosition } from "@/lib/popover";
import { MAX_TEXT_LENGTH, type Rule } from "@/lib/rules";
import { cn } from "@/lib/utils";

/** 編集欄の入力欄に共通のクラス */
const FIELD_INPUT_CLASS =
  "h-8 w-full rounded-full border-none bg-bg px-3.5 text-control text-ink";

/** 編集欄の props */
type Props = {
  /** 編集中のルール */
  rule: Rule;
  /** 置換前の入力欄の値 */
  draftSource: string;
  /** 置換前のエラー（なければ空文字） */
  sourceError: string;
  /** 編集中のタグの要素（位置合わせに使う） */
  anchor: HTMLElement | undefined;
  /** 置換前を書き換えたときに呼ぶ関数 */
  onSourceChange: (source: string) => void;
  /** 置換後を書き換えたときに呼ぶ関数 */
  onReplacementChange: (replacement: string) => void;
  /** 有効スイッチを切り替えたときに呼ぶ関数 */
  onToggleEnabled: () => void;
  /** デフォルトに戻すを押したときに呼ぶ関数 */
  onRestore: () => void;
  /** 削除を押したときに呼ぶ関数 */
  onDelete: () => void;
  /** 閉じるときに呼ぶ関数（Esc で閉じたときはタグにフォーカスを戻す） */
  onClose: (shouldRestoreFocus: boolean) => void;
};

/**
 * タグの編集欄。タグの下（入らなければ上）に開き、置換前・置換後・有効を書き換える。Esc か外側を押すと閉じる。
 * @param props 編集欄の props
 * @returns {JSX.Element} 編集欄
 */
export function RuleEditor({
  rule,
  draftSource,
  sourceError,
  anchor,
  onSourceChange,
  onReplacementChange,
  onToggleEnabled,
  onRestore,
  onDelete,
  onClose,
}: Props) {
  const editorRef = useRef<HTMLDivElement>(null);
  const sourceInputRef = useRef<HTMLInputElement>(null);
  const sourceId = useId();
  const sourceErrorId = useId();
  const replacementId = useId();
  // スクロールや画面の大きさの変化で、位置を合わせ直すための合図
  const [layoutTick, setLayoutTick] = useState(0);

  // 開いたら置換前の入力欄にフォーカスする
  useEffect(() => {
    sourceInputRef.current?.focus();
  }, []);

  // タグの位置と編集欄の大きさから位置を決める（DOM の位置と同期する）
  useLayoutEffect(() => {
    const editor = editorRef.current;
    if (!editor || !anchor) return;
    const position = getEditorPosition(
      anchor.getBoundingClientRect(),
      editor.getBoundingClientRect(),
      { width: window.innerWidth, height: window.innerHeight },
    );
    editor.style.top = `${position.top}px`;
    editor.style.left = `${position.left}px`;
  });

  const close = useEffectEvent((shouldRestoreFocus: boolean) => {
    onClose(shouldRestoreFocus);
  });

  // Esc・外側のクリックで閉じる。スクロールや画面の大きさが変わったら位置を合わせ直す
  useEffect(() => {
    const handleKeyDown = (event: globalThis.KeyboardEvent): void => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      close(true);
    };
    const handlePointerDown = (event: globalThis.PointerEvent): void => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (editorRef.current?.contains(target)) return;
      // タグを押したときはここで閉じない（タグの click 側で、閉じてから開き直す）
      if (target.closest("[data-rule-tag]")) return;
      close(false);
    };
    const handleLayoutChange = (): void => setLayoutTick((tick) => tick + 1);
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown, true);
    window.addEventListener("resize", handleLayoutChange);
    window.addEventListener("scroll", handleLayoutChange, true);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown, true);
      window.removeEventListener("resize", handleLayoutChange);
      window.removeEventListener("scroll", handleLayoutChange, true);
    };
  }, []);

  return (
    <div
      ref={editorRef}
      role="dialog"
      aria-label="ルール編集"
      data-layout-tick={layoutTick}
      className="fixed top-0 left-0 z-40 w-80 max-w-[calc(100vw-16px)] rounded-[20px] bg-bg px-4 pt-3.5 pb-4 text-ink shadow-popover"
    >
      <div className="mb-3 flex flex-col gap-1">
        <label htmlFor={sourceId} className="text-caption text-sub">
          置換前
        </label>
        <input
          ref={sourceInputRef}
          id={sourceId}
          type="text"
          maxLength={MAX_TEXT_LENGTH}
          value={draftSource}
          aria-invalid={sourceError !== ""}
          aria-describedby={sourceError === "" ? undefined : sourceErrorId}
          onChange={(event) => onSourceChange(event.target.value)}
          className={cn(
            FIELD_INPUT_CLASS,
            sourceError === "" ? "shadow-inset-sm" : "shadow-inset-error",
          )}
        />
        {sourceError !== "" && (
          <span id={sourceErrorId} className="text-caption text-error">
            {sourceError}
          </span>
        )}
      </div>
      <div className="mb-3 flex flex-col gap-1">
        <label htmlFor={replacementId} className="text-caption text-sub">
          置換後
        </label>
        <input
          id={replacementId}
          type="text"
          maxLength={MAX_TEXT_LENGTH}
          value={rule.replacement}
          placeholder={maskValue(draftSource)}
          onChange={(event) => onReplacementChange(event.target.value)}
          className={cn(FIELD_INPUT_CLASS, "shadow-inset-sm")}
        />
      </div>
      <div className="mt-1 flex items-center justify-between gap-3">
        <Switch
          isChecked={rule.isEnabled}
          label="有効"
          onCheckedChange={onToggleEnabled}
        />
        <div className="flex gap-2">
          <NeuButton
            isRound
            aria-label="デフォルトに戻す"
            title="デフォルトに戻す"
            onClick={onRestore}
          >
            <ArrowUturnLeftIcon className="size-3.5" aria-hidden="true" />
          </NeuButton>
          <NeuButton
            isRound
            isDanger
            aria-label="削除"
            title="削除"
            onClick={onDelete}
          >
            <TrashIcon className="size-3.5" aria-hidden="true" />
          </NeuButton>
        </div>
      </div>
    </div>
  );
}
