import {
  ArrowDownTrayIcon,
  ClipboardDocumentIcon,
  CodeBracketIcon,
} from "@heroicons/react/24/outline";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { ModeBadge } from "./ModeBadge";
import { NeuButton } from "./NeuButton";
import { Switch } from "./Switch";
import { TextEditor } from "./TextEditor";
import { buildDownloadFileName } from "@/lib/download";
import { formatJson, isJsonContainer } from "@/lib/json";
import { buildReplacedText, type Segment } from "@/lib/replace";

/** コピーの結果を出しておく時間（ミリ秒） */
const COPY_STATUS_DURATION_MS = 1800;

/** 見出し行に文言つきのボタンが収まらない幅（28rem 未満）では、丸いアイコンだけのボタンにする */
const ICON_ONLY_CLASS = "@max-md:size-[30px] @max-md:p-0";

/** 狭いときは文言を見た目から隠す（読み上げの名前としては残す） */
const LABEL_CLASS = "@max-md:sr-only";

/** テキストセクションの props */
type Props = {
  /** 原文 */
  text: string;
  /** 原文をルールで分割した区間 */
  segments: readonly Segment[];
  /** 置換中なら true */
  isReplacing: boolean;
  /** 原文を書き換えたときに呼ぶ関数 */
  onTextChange: (text: string) => void;
  /** 置換スイッチを切り替えたときに呼ぶ関数 */
  onReplacingChange: (isReplacing: boolean) => void;
};

/**
 * テキストセクション。見出し・状態表示・置換スイッチ・コピーボタンと、テキストエディタを並べる。
 * @param props テキストセクションの props
 * @returns {JSX.Element} テキストセクション
 */
export function EditorPanel({
  text,
  segments,
  isReplacing,
  onTextChange,
  onReplacingChange,
}: Props) {
  const [copyStatus, setCopyStatus] = useState("");
  const timerRef = useRef<number | undefined>(undefined);
  // 長い本文でも入力を先に反映し、JSON の判定（JSON.parse）は後回しにする
  const deferredText = useDeferredValue(text);
  const isJson = useMemo(() => isJsonContainer(deferredText), [deferredText]);
  // 押せない理由（押せるときは undefined）
  const formatBlockedReason = isReplacing
    ? "置換中"
    : isJson
      ? undefined
      : "JSON ではない";

  // 画面を閉じるときに、コピーの結果を消すタイマーを止める
  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  // 表示中のテキスト（OFF なら原文、ON なら置換後）
  const getShownText = (): string =>
    isReplacing ? buildReplacedText(segments) : text;

  const handleDownload = (): void => {
    const value = getShownText();
    const url = URL.createObjectURL(
      new Blob([value], { type: "text/plain;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    // 置換後は JSON でなくなることもあるため、保存する文字列そのもので判定する
    link.download = buildDownloadFileName(new Date(), isJsonContainer(value));
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleCopy = async (): Promise<void> => {
    const value = getShownText();
    try {
      await navigator.clipboard.writeText(value);
      setCopyStatus("コピー完了");
    } catch {
      setCopyStatus("コピー失敗");
    }
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(
      () => setCopyStatus(""),
      COPY_STATUS_DURATION_MS,
    );
  };

  return (
    <section
      aria-labelledby="editor-title"
      className="@container flex min-h-0 flex-col rounded-[26px] bg-bg p-5 shadow-card"
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <div className="flex items-center gap-3">
          <h2
            id="editor-title"
            className="m-0 font-heading text-section-title font-bold"
          >
            テキスト
          </h2>
          <ModeBadge isReplacing={isReplacing} />
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <Switch
            isChecked={isReplacing}
            label="置換"
            onCheckedChange={onReplacingChange}
          />
          <NeuButton
            disabled={formatBlockedReason !== undefined}
            title={formatBlockedReason ?? "フォーマット"}
            className={ICON_ONLY_CLASS}
            onClick={() => {
              // 判定が遅れている間に JSON でなくなった本文は整形しない
              if (isJsonContainer(text)) onTextChange(formatJson(text));
            }}
          >
            <CodeBracketIcon className="size-3.5" aria-hidden="true" />
            <span className={LABEL_CLASS}>フォーマット</span>
          </NeuButton>
          <NeuButton
            title="コピー"
            className={ICON_ONLY_CLASS}
            onClick={handleCopy}
          >
            <ClipboardDocumentIcon className="size-3.5" aria-hidden="true" />
            <span className={LABEL_CLASS}>コピー</span>
          </NeuButton>
          <NeuButton
            title="ダウンロード"
            className={ICON_ONLY_CLASS}
            onClick={handleDownload}
          >
            <ArrowDownTrayIcon className="size-3.5" aria-hidden="true" />
            <span className={LABEL_CLASS}>ダウンロード</span>
          </NeuButton>
          {/* 空のときは前の gap を打ち消し、ボタンの並びの端をそろえる（読み上げのため要素は残す） */}
          <span
            role="status"
            className="min-h-[1em] text-caption text-sub empty:-ml-4"
          >
            {copyStatus}
          </span>
        </div>
      </div>
      <TextEditor
        text={text}
        segments={segments}
        isReplacing={isReplacing}
        isJson={isJson}
        onTextChange={onTextChange}
      />
      <div className="mt-3 flex items-center justify-between gap-3">
        {/* 置換中は案内文を出さない */}
        <p className="m-0 text-caption text-sub">
          {isReplacing ? "" : "黄色: 一致箇所"}
        </p>
      </div>
    </section>
  );
}
