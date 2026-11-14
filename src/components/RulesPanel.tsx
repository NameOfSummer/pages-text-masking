import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import {
  type KeyboardEvent,
  type MouseEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { RuleEditor } from "./RuleEditor";
import { RuleFilterGroup } from "./RuleFilterGroup";
import { TagItem } from "./TagItem";
import { TagTooltip } from "./TagTooltip";
import {
  DEFAULT_RULE_QUERY,
  type RuleQuery,
  isFiltering,
  isRuleVisible,
  matchesRuleQuery,
} from "@/lib/ruleSearch";
import {
  type EditingState,
  type FocusDirection,
  MAX_RULES,
  MAX_TEXT_LENGTH,
  type Rule,
  addRule,
  applyReplacementInput,
  applySourceInput,
  finishEditing,
  getFocusTargetAfterDelete,
  removeRule,
  restoreDefaultReplacement,
  startEditing,
  toggleRuleEnabled,
  validateSource,
} from "@/lib/rules";

/** 重複したタグを点滅させておく時間（ミリ秒。CSS の 250ms × 3 回より少し長く取る） */
const FLASH_DURATION_MS = 900;

/** IME で変換中の keydown で、Safari などが渡す keyCode */
const IME_PROCESS_KEY_CODE = 229;

/** 置換ワードセクションの props */
type Props = {
  /** セクションの ID（区切りバーの aria-controls に使う） */
  id: string;
  /** ルール一覧 */
  rules: Rule[];
  /** ルールごとの一致件数 */
  counts: ReadonlyMap<number, number>;
  /** 保存できる状態か */
  isStorageAvailable: boolean;
  /** ルール一覧を置き換える関数 */
  onRulesChange: (rules: Rule[]) => void;
  /** 新しいルールの ID を発行する関数 */
  createRuleId: () => number;
};

/** 点滅させるタグ */
type FlashState = {
  /** 点滅させるルールの ID */
  id: number;
  /** 点滅し直すための合図 */
  token: number;
};

/**
 * 件数の表示を作る（仕様 4.4）。検索・絞り込み中は「表示数 / 全件数」、それ以外は「登録数 / 上限」にし、無効なルールの数を添える。
 * @param rules ルール一覧
 * @param visibleCount 表示中のルール数
 * @param isFiltered 検索・絞り込み中なら true
 * @returns {string} 件数の表示
 */
function formatRuleCount(
  rules: readonly Rule[],
  visibleCount: number,
  isFiltered: boolean,
): string {
  const total = rules.length;
  const disabledCount = rules.filter((rule) => !rule.isEnabled).length;
  const base = isFiltered
    ? `${visibleCount} / ${total}`
    : `${total} / ${MAX_RULES}`;
  return disabledCount > 0 ? `${base}（無効 ${disabledCount}）` : base;
}

/**
 * 置換ワードセクション。検索・絞り込み、タグの一覧と入力欄、編集欄、件数を出す。
 * @param props 置換ワードセクションの props
 * @returns {JSX.Element} 置換ワードセクション
 */
export function RulesPanel({
  id,
  rules,
  counts,
  isStorageAvailable,
  onRulesChange,
  createRuleId,
}: Props) {
  const [query, setQuery] = useState<RuleQuery>(DEFAULT_RULE_QUERY);
  const [inputValue, setInputValue] = useState("");
  const [editing, setEditing] = useState<EditingState | null>(null);
  const [tooltipId, setTooltipId] = useState<number | null>(null);
  const [flash, setFlash] = useState<FlashState | null>(null);
  const tagElementsRef = useRef(new Map<number, HTMLSpanElement>());
  const inputRef = useRef<HTMLInputElement>(null);
  const tagBoxRef = useRef<HTMLDivElement>(null);
  const flashTokenRef = useRef(0);
  const shouldScrollToEndRef = useRef(false);

  const editingId = editing?.id ?? null;
  const visibleRules = rules.filter((rule) =>
    isRuleVisible(rule, query, editingId),
  );
  const editingRule = rules.find((rule) => rule.id === editingId);
  const tooltipRule = editing
    ? undefined
    : rules.find((rule) => rule.id === tooltipId);
  const tooltipAnchor =
    tooltipRule && tagElementsRef.current.get(tooltipRule.id);
  const isFull = rules.length >= MAX_RULES;
  const isFiltered = isFiltering(query);

  // 追加したら、タグの欄を末尾までスクロールする（DOM のスクロール位置と同期する）
  useLayoutEffect(() => {
    if (!shouldScrollToEndRef.current || !tagBoxRef.current) return;
    shouldScrollToEndRef.current = false;
    tagBoxRef.current.scrollTop = tagBoxRef.current.scrollHeight;
  });

  // 点滅させるタグを見える位置までスクロールし、少しあとで点滅を終える
  useEffect(() => {
    if (!flash) return;
    tagElementsRef.current
      .get(flash.id)
      ?.scrollIntoView?.({ block: "nearest" });
    const timer = window.setTimeout(() => setFlash(null), FLASH_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [flash]);

  const handleTagElementChange = useCallback(
    (ruleId: number, element: HTMLSpanElement | null) => {
      if (element) tagElementsRef.current.set(ruleId, element);
      else tagElementsRef.current.delete(ruleId);
    },
    [],
  );

  const focusTag = (ruleId: number | null): void => {
    const main =
      ruleId === null
        ? null
        : tagElementsRef.current
            .get(ruleId)
            ?.querySelector<HTMLButtonElement>("[data-tag-main]");
    if (main) main.focus();
    else inputRef.current?.focus();
  };

  const handleAdd = (): void => {
    const result = addRule(rules, inputValue, createRuleId());
    switch (result.status) {
      case "added":
        onRulesChange(result.rules);
        setQuery(DEFAULT_RULE_QUERY);
        setInputValue("");
        shouldScrollToEndRef.current = true;
        return;
      case "duplicate":
        // 検索や絞り込みで隠れていると点滅が見えないため、表示を戻してから点滅させる
        if (!isRuleVisible(result.rule, query, editingId)) {
          setQuery(DEFAULT_RULE_QUERY);
        }
        flashTokenRef.current += 1;
        setFlash({ id: result.rule.id, token: flashTokenRef.current });
        return;
      case "full":
      case "empty":
        return;
    }
  };

  const handleInputKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    // IME で変換中の Enter では追加しない
    if (
      event.nativeEvent.isComposing ||
      event.keyCode === IME_PROCESS_KEY_CODE
    ) {
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      handleAdd();
      return;
    }
    if (event.key === "Backspace" && inputValue === "") {
      const last = visibleRules.at(-1);
      if (!last) return;
      event.preventDefault();
      focusTag(last.id);
    }
  };

  const deleteRule = (ruleId: number): void => {
    if (editingId === ruleId) setEditing(null);
    if (tooltipId === ruleId) setTooltipId(null);
    onRulesChange(removeRule(rules, ruleId));
  };

  const handleDeleteKey = (ruleId: number, direction: FocusDirection): void => {
    const target = getFocusTargetAfterDelete(visibleRules, ruleId, direction);
    deleteRule(ruleId);
    focusTag(target);
  };

  const closeEditor = (shouldRestoreFocus: boolean): void => {
    if (!editing) return;
    const nextRules = finishEditing(rules, editing);
    onRulesChange(nextRules);
    setEditing(null);
    if (!shouldRestoreFocus) return;
    // 絞り込みに合わなくなったタグは閉じると隠れるため、そのときは入力欄に戻す
    const rule = nextRules.find((item) => item.id === editing.id);
    focusTag(rule && matchesRuleQuery(rule, query) ? rule.id : null);
  };

  const handleOpen = (ruleId: number): void => {
    // 編集中のタグをもう一度押したときは何もしない
    if (editingId === ruleId) return;
    // 別のタグを押したときは、今の編集欄を閉じてから開く
    const nextRules = editing ? finishEditing(rules, editing) : rules;
    const rule = nextRules.find((item) => item.id === ruleId);
    if (!rule) return;
    if (editing) onRulesChange(nextRules);
    setTooltipId(null);
    setEditing(startEditing(rule));
  };

  const handleEditorDelete = (): void => {
    if (!editing) return;
    const target = getFocusTargetAfterDelete(
      visibleRules,
      editing.id,
      "forward",
    );
    deleteRule(editing.id);
    focusTag(target);
  };

  const handleTagBoxClick = (event: MouseEvent<HTMLDivElement>): void => {
    // タグ以外の余白を押したら入力欄にフォーカスする
    if (
      event.target === event.currentTarget ||
      event.target === event.currentTarget.firstChild
    ) {
      inputRef.current?.focus();
    }
  };

  return (
    <section
      id={id}
      aria-labelledby="rules-title"
      className="flex min-h-0 flex-col rounded-[26px] bg-bg p-5 shadow-card"
    >
      {/* 見出しと検索欄を横に並べる。絞り込みは横並びでは次の行の右端、縦並びでは同じ行に置く */}
      <div className="mb-3 flex flex-wrap items-center justify-start gap-x-3 gap-y-2">
        <h2
          id="rules-title"
          className="m-0 flex-none font-heading text-section-title font-bold"
        >
          置換ワード
        </h2>
        {rules.length > 0 && (
          <>
            <span className="relative min-w-0 flex-[1_1_120px]">
              <MagnifyingGlassIcon
                className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-faint"
                aria-hidden="true"
              />
              <input
                type="search"
                placeholder="検索"
                aria-label="置換前を検索"
                value={query.search}
                onChange={(event) =>
                  setQuery({ ...query, search: event.target.value })
                }
                className="h-8 w-full appearance-none rounded-full border-none bg-bg pr-3.5 pl-8 text-control text-ink shadow-inset-sm"
              />
            </span>
            <span
              className="h-0 basis-full stacked:hidden"
              aria-hidden="true"
            />
            <RuleFilterGroup
              value={query.filter}
              onValueChange={(filter) => setQuery({ ...query, filter })}
            />
          </>
        )}
      </div>
      <div
        ref={tagBoxRef}
        onClick={handleTagBoxClick}
        onScroll={() => setTooltipId(null)}
        className="max-h-full min-h-[120px] flex-1 cursor-text overflow-y-auto rounded-[18px] px-2.5 py-2 shadow-inset focus-within:shadow-inset-focus"
      >
        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-2">
          {visibleRules.map((rule) => (
            <TagItem
              key={rule.id}
              rule={rule}
              count={counts.get(rule.id) ?? 0}
              isEditing={rule.id === editingId}
              flashToken={flash?.id === rule.id ? flash.token : null}
              onElementChange={handleTagElementChange}
              onOpen={handleOpen}
              onDelete={deleteRule}
              onDeleteKey={handleDeleteKey}
              onShowTooltip={setTooltipId}
              onHideTooltip={() => setTooltipId(null)}
            />
          ))}
          {visibleRules.length === 0 && rules.length > 0 && (
            <span className="w-full text-caption text-sub">該当なし</span>
          )}
          <input
            ref={inputRef}
            type="text"
            maxLength={MAX_TEXT_LENGTH}
            aria-label="置換する語を追加"
            placeholder={isFull ? `上限 ${MAX_RULES} 件` : "置換する語を入力"}
            disabled={isFull}
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
            onKeyDown={handleInputKeyDown}
            // 入力したままほかの所を押しても追加する
            onBlur={() => {
              if (inputValue !== "") handleAdd();
            }}
            className="h-7 min-w-[140px] flex-[1_1_140px] border-none bg-transparent px-1.5 text-control text-ink focus-visible:outline-none disabled:cursor-not-allowed disabled:text-faint"
          />
        </div>
      </div>
      <div className="mt-2.5 flex items-start justify-between gap-3 px-1">
        <div className="flex flex-col">
          <p className="m-0 text-caption text-sub">Enter で追加・タグで編集</p>
          {!isStorageAvailable && (
            <p role="status" className="m-0 text-caption text-error">
              保存不可（閉じると消える）
            </p>
          )}
        </div>
        <span
          aria-live="polite"
          className="ml-auto flex-none text-caption whitespace-nowrap text-sub tabular-nums"
        >
          {formatRuleCount(rules, visibleRules.length, isFiltered)}
        </span>
      </div>
      {tooltipRule && tooltipAnchor && (
        <TagTooltip
          anchor={tooltipAnchor}
          text={`→ ${tooltipRule.replacement}${tooltipRule.isEnabled ? "" : "（無効）"}`}
        />
      )}
      {editing && editingRule && (
        <RuleEditor
          key={editing.id}
          rule={editingRule}
          draftSource={editing.draftSource}
          sourceError={validateSource(rules, editing.draftSource, editing.id)}
          anchor={tagElementsRef.current.get(editing.id)}
          onSourceChange={(source) => {
            setEditing({ ...editing, draftSource: source });
            onRulesChange(applySourceInput(rules, editing.id, source));
          }}
          onReplacementChange={(replacement) =>
            onRulesChange(applyReplacementInput(rules, editing.id, replacement))
          }
          onToggleEnabled={() =>
            onRulesChange(toggleRuleEnabled(rules, editing.id))
          }
          onRestore={() =>
            onRulesChange(restoreDefaultReplacement(rules, editing.id))
          }
          onDelete={handleEditorDelete}
          onClose={closeEditor}
        />
      )}
    </section>
  );
}
