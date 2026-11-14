import { type Rule } from "./rules";

/** 有効・無効の絞り込み */
export type RuleFilter = "all" | "enabled" | "disabled";

/** 検索と絞り込みの条件 */
export type RuleQuery = {
  /** 検索欄の値（置換前の部分一致） */
  search: string;
  /** 有効・無効の絞り込み */
  filter: RuleFilter;
};

/** 検索・絞り込みの初期状態 */
export const DEFAULT_RULE_QUERY: RuleQuery = { search: "", filter: "all" };

/**
 * 検索用に文字列を正規化する（全角・半角と大文字・小文字を区別しない）。
 * @param value 対象の文字列
 * @returns {string} 正規化した文字列
 */
export function normalizeForSearch(value: string): string {
  return value.normalize("NFKC").toLowerCase();
}

/**
 * 検索・絞り込みが掛かっているかを返す。
 * @param query 検索と絞り込みの条件
 * @returns {boolean} 掛かっていれば true
 */
export function isFiltering(query: RuleQuery): boolean {
  return query.search !== "" || query.filter !== "all";
}

/**
 * ルールが検索・絞り込みの条件に合うかを判定する。
 * @param rule ルール
 * @param query 検索と絞り込みの条件
 * @returns {boolean} 合えば true
 */
export function matchesRuleQuery(rule: Rule, query: RuleQuery): boolean {
  if (query.filter === "enabled" && !rule.isEnabled) return false;
  if (query.filter === "disabled" && rule.isEnabled) return false;
  if (query.search === "") return true;
  return normalizeForSearch(rule.source).includes(
    normalizeForSearch(query.search),
  );
}

/**
 * ルールをタグの欄に出すかを判定する。編集中のタグは、条件に合わなくなっても閉じるまで出し続ける。
 * @param rule ルール
 * @param query 検索と絞り込みの条件
 * @param editingId 編集中のルールの ID（なければ null）
 * @returns {boolean} 出すなら true
 */
export function isRuleVisible(
  rule: Rule,
  query: RuleQuery,
  editingId: number | null,
): boolean {
  return rule.id === editingId || matchesRuleQuery(rule, query);
}
