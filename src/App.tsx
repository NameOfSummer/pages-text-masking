import { useEffect, useMemo, useState } from "react";
import { EditorPanel } from "@/components/EditorPanel";
import { RulesPanel } from "@/components/RulesPanel";
import { Splitter } from "@/components/Splitter";
import { useRules } from "@/hooks/useRules";
import { useSplitLayout } from "@/hooks/useSplitLayout";
import { useStorage } from "@/hooks/useStorage";
import { countMatches, splitByRules } from "@/lib/replace";

/** 置換ワードセクションの ID（区切りバーの aria-controls に使う） */
const RULES_PANEL_ID = "rules-panel";

/**
 * アプリ全体のルートコンポーネント。
 * アプリ名は画面に出さず、支援技術向けの h1（視覚的に隠す）としてだけ置く（仕様 2 章）。
 * テキスト本文と置換スイッチの状態は保存しない（伏せたい文章がブラウザに残らないようにするため）。
 * @returns {JSX.Element} アプリのルート要素
 */
export function App() {
  const { storage, isAvailable, reportSaveResult } = useStorage();
  const { rules, setRules, createRuleId } = useRules(storage, reportSaveResult);
  const split = useSplitLayout(storage, reportSaveResult);
  const [text, setText] = useState("");
  const [isReplacing, setIsReplacing] = useState(false);

  // マーカー・置換後の表示・タグの件数は、同じ当てはめ方で数える（仕様 3.2）
  const segments = useMemo(() => splitByRules(text, rules), [text, rules]);
  const counts = useMemo(() => countMatches(segments), [segments]);

  // 本文は保存しないので、入力があるときはページ移動・リロードの前にブラウザの確認を出す
  const hasText = text !== "";
  useEffect(() => {
    if (!hasText) return;
    const handleBeforeUnload = (event: BeforeUnloadEvent): void => {
      event.preventDefault();
      // 古いブラウザ（Chrome 119 以前など）は returnValue が必要
      event.returnValue = true;
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasText]);

  return (
    <div className="flex h-full flex-col px-6 py-5">
      <h1 className="sr-only">Text Masking</h1>
      <main
        ref={split.containerRef}
        style={split.style}
        className="grid min-h-0 flex-1 grid-cols-[minmax(360px,1fr)_24px_var(--rules-width)] stacked:min-h-[464px] stacked:grid-cols-1 stacked:grid-rows-[var(--editor-height)_24px_minmax(240px,1fr)]"
      >
        <EditorPanel
          text={text}
          segments={segments}
          isReplacing={isReplacing}
          onTextChange={setText}
          onReplacingChange={setIsReplacing}
        />
        <Splitter
          isStacked={split.isStacked}
          value={split.value}
          range={split.range}
          controls={RULES_PANEL_ID}
          onDrag={split.dragTo}
          onKey={split.moveByKey}
          onCommit={split.commit}
        />
        <RulesPanel
          id={RULES_PANEL_ID}
          rules={rules}
          counts={counts}
          isStorageAvailable={isAvailable}
          onRulesChange={setRules}
          createRuleId={createRuleId}
        />
      </main>
    </div>
  );
}
