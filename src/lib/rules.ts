import { maskValue } from "./mask";

/** 置換ルールの最大件数（有効・無効をあわせて数える） */
export const MAX_RULES = 200;

/** 置換前・置換後の最大文字数（UTF-16 の長さ。input の maxLength と同じ数え方） */
export const MAX_TEXT_LENGTH = 200;

/** 置換前が空のときのエラー */
export const EMPTY_SOURCE_ERROR = "置換前が空（閉じると元に戻る）";

/** 置換前がほかのルールと重複しているときのエラー */
export const DUPLICATE_SOURCE_ERROR = "ほかのタグと重複（閉じると元に戻る）";

/** 置換ルール 1 件 */
export type Rule = {
  /** 画面内でだけ使う ID（保存しない） */
  id: number;
  /** 置換前 */
  source: string;
  /** 置換後 */
  replacement: string;
  /** 置換後を手で書き換えたか（true なら置換前に追従しない） */
  isCustom: boolean;
  /** 置換とマーカーの対象にするか */
  isEnabled: boolean;
};

/** ルールを追加した結果 */
export type AddRuleResult =
  | { status: "added"; rules: Rule[]; rule: Rule }
  | { status: "duplicate"; rule: Rule }
  | { status: "full" }
  | { status: "empty" };

/** 編集欄で開いているルールと、開いたときの値 */
export type EditingState = {
  /** 編集中のルールの ID */
  id: number;
  /** 開いたときの値（閉じるときに置換前がエラーなら、これに戻す） */
  original: Pick<Rule, "source" | "replacement" | "isCustom">;
  /** 置換前の入力欄の値（エラーのあいだはルールに反映しない） */
  draftSource: string;
};

/** 削除後にフォーカスを移す向き（Backspace は前、Delete は次） */
export type FocusDirection = "backward" | "forward";

/**
 * 文字列を上限の長さまでに切り詰める。末尾でサロゲートペアが割れたときは、その半分を落とす。
 * @param value 対象の文字列
 * @returns {string} 切り詰めた文字列
 */
export function truncateText(value: string): string {
  if (value.length <= MAX_TEXT_LENGTH) return value;
  const sliced = value.slice(0, MAX_TEXT_LENGTH);
  const lastCode = sliced.charCodeAt(sliced.length - 1);
  // 末尾が上位サロゲートなら、下位サロゲートが切れているので落とす
  const isHighSurrogate = lastCode >= 0xd800 && lastCode <= 0xdbff;
  return isHighSurrogate ? sliced.slice(0, -1) : sliced;
}

/**
 * 置換前が一致するルールを探す（無効なルールも含む）。
 * @param rules ルール一覧
 * @param source 置換前
 * @param excludeId 比較から除くルールの ID
 * @returns {Rule | undefined} 見つかったルール
 */
export function findRuleBySource(
  rules: readonly Rule[],
  source: string,
  excludeId?: number,
): Rule | undefined {
  return rules.find((rule) => rule.source === source && rule.id !== excludeId);
}

/**
 * ルールを末尾に追加する。追加したルールは有効にし、置換後には伏せ字の値を入れる。
 * @param rules ルール一覧
 * @param source 置換前
 * @param id 新しいルールに付ける ID
 * @returns {AddRuleResult} 追加した結果（重複・上限・空のときは追加しない）
 */
export function addRule(
  rules: readonly Rule[],
  source: string,
  id: number,
): AddRuleResult {
  const truncated = truncateText(source);
  if (truncated === "") return { status: "empty" };
  const duplicated = findRuleBySource(rules, truncated);
  if (duplicated) return { status: "duplicate", rule: duplicated };
  if (rules.length >= MAX_RULES) return { status: "full" };
  const rule: Rule = {
    id,
    source: truncated,
    replacement: maskValue(truncated),
    isCustom: false,
    isEnabled: true,
  };
  return { status: "added", rules: [...rules, rule], rule };
}

/**
 * ルールを削除する。
 * @param rules ルール一覧
 * @param id 削除するルールの ID
 * @returns {Rule[]} 削除後のルール一覧
 */
export function removeRule(rules: readonly Rule[], id: number): Rule[] {
  return rules.filter((rule) => rule.id !== id);
}

/**
 * 指定したルールだけを書き換える。
 * @param rules ルール一覧
 * @param id 書き換えるルールの ID
 * @param update 書き換える内容を返す関数
 * @returns {Rule[]} 書き換え後のルール一覧
 */
function updateRule(
  rules: readonly Rule[],
  id: number,
  update: (rule: Rule) => Partial<Rule>,
): Rule[] {
  return rules.map((rule) =>
    rule.id === id ? { ...rule, ...update(rule) } : rule,
  );
}

/**
 * 編集欄の置換前の入力値を検証する。
 * @param rules ルール一覧
 * @param source 置換前の入力値
 * @param id 編集中のルールの ID
 * @returns {string} エラーメッセージ（問題なければ空文字）
 */
export function validateSource(
  rules: readonly Rule[],
  source: string,
  id: number,
): string {
  if (source === "") return EMPTY_SOURCE_ERROR;
  if (findRuleBySource(rules, source, id)) return DUPLICATE_SOURCE_ERROR;
  return "";
}

/**
 * 編集を始めるときの状態を作る。
 * @param rule 編集するルール
 * @returns {EditingState} 編集中の状態
 */
export function startEditing(rule: Rule): EditingState {
  return {
    id: rule.id,
    original: {
      source: rule.source,
      replacement: rule.replacement,
      isCustom: rule.isCustom,
    },
    draftSource: rule.source,
  };
}

/**
 * 置換前の入力値をルールに反映する。エラーのあいだは反映せず、最後に正しかった値のままにする。
 * 置換後を手で書き換えていなければ、置換後も置換前に追従させる。
 * @param rules ルール一覧
 * @param id 編集中のルールの ID
 * @param source 置換前の入力値
 * @returns {Rule[]} 反映後のルール一覧
 */
export function applySourceInput(
  rules: readonly Rule[],
  id: number,
  source: string,
): Rule[] {
  const truncated = truncateText(source);
  if (validateSource(rules, truncated, id) !== "") return [...rules];
  return updateRule(rules, id, (rule) => ({
    source: truncated,
    replacement: rule.isCustom ? rule.replacement : maskValue(truncated),
  }));
}

/**
 * 置換後の入力値をルールに反映する。空にしたら、また置換前に追従させる。
 * @param rules ルール一覧
 * @param id 編集中のルールの ID
 * @param replacement 置換後の入力値
 * @returns {Rule[]} 反映後のルール一覧
 */
export function applyReplacementInput(
  rules: readonly Rule[],
  id: number,
  replacement: string,
): Rule[] {
  const truncated = truncateText(replacement);
  return updateRule(rules, id, () => ({
    replacement: truncated,
    isCustom: truncated !== "",
  }));
}

/**
 * 置換後を伏せ字の値（デフォルト）に戻す。
 * @param rules ルール一覧
 * @param id 対象のルールの ID
 * @returns {Rule[]} 戻した後のルール一覧
 */
export function restoreDefaultReplacement(
  rules: readonly Rule[],
  id: number,
): Rule[] {
  return updateRule(rules, id, (rule) => ({
    replacement: maskValue(rule.source),
    isCustom: false,
  }));
}

/**
 * ルールの有効・無効を切り替える。
 * @param rules ルール一覧
 * @param id 対象のルールの ID
 * @returns {Rule[]} 切り替えた後のルール一覧
 */
export function toggleRuleEnabled(rules: readonly Rule[], id: number): Rule[] {
  return updateRule(rules, id, (rule) => ({ isEnabled: !rule.isEnabled }));
}

/**
 * 編集欄を閉じるときの値の直しを行う（仕様 4.2）。
 * 置換前がエラーのままなら置換前・置換後を開いたときの値に戻し（有効・無効は残す）、置換後が空なら伏せ字の値に戻す。
 * @param rules ルール一覧
 * @param editing 編集中の状態
 * @returns {Rule[]} 直した後のルール一覧
 */
export function finishEditing(
  rules: readonly Rule[],
  editing: EditingState,
): Rule[] {
  const hasSourceError =
    validateSource(rules, editing.draftSource, editing.id) !== "";
  return updateRule(rules, editing.id, (rule) => {
    const restored = hasSourceError ? { ...rule, ...editing.original } : rule;
    if (restored.replacement !== "") return restored;
    return {
      ...restored,
      replacement: maskValue(restored.source),
      isCustom: false,
    };
  });
}

/**
 * ルールを削除したあとにフォーカスを移すルールを決める（仕様 4.1）。
 * Backspace は前、Delete は次のルールへ移り、なければ反対側へ移る。
 * @param visibleRules 表示中のルール一覧（削除前）
 * @param id 削除するルールの ID
 * @param direction 移る向き
 * @returns {number | null} フォーカスを移すルールの ID（なければ null で、入力欄に移す）
 */
export function getFocusTargetAfterDelete(
  visibleRules: readonly Rule[],
  id: number,
  direction: FocusDirection,
): number | null {
  const index = visibleRules.findIndex((rule) => rule.id === id);
  if (index === -1) return null;
  const previous = visibleRules[index - 1];
  const next = visibleRules[index + 1];
  const target =
    direction === "backward" ? (previous ?? next) : (next ?? previous);
  return target?.id ?? null;
}
