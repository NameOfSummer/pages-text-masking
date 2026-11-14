import { type Rule } from "./rules";

/** テキストを分割した 1 区間 */
export type Segment = {
  /** テキスト内の開始位置（UTF-16 単位。描画時の key にも使う） */
  start: number;
  /** 原文の文字列 */
  text: string;
  /** 当てはまったルール（当てはまらない区間は null） */
  rule: Rule | null;
};

/**
 * テキストを、有効なルールに当てはまる区間とそれ以外に分割する（仕様 3.2）。
 * 完全一致で大文字・小文字を区別し、長い語を優先する。先頭から 1 回だけ走査するため、置換後がさらに置換されることはない。
 * @param text 対象のテキスト
 * @param rules ルール一覧（無効なルールは比べない）
 * @returns {Segment[]} 分割した区間の一覧
 */
export function splitByRules(text: string, rules: readonly Rule[]): Segment[] {
  const activeRules = rules
    .filter((rule) => rule.isEnabled && rule.source !== "")
    .sort((a, b) => b.source.length - a.source.length);
  // 先頭の 1 文字（UTF-16 単位）で候補を引けるようにしておく
  const rulesByHead = new Map<string, Rule[]>();
  for (const rule of activeRules) {
    const head = rule.source[0];
    const list = rulesByHead.get(head);
    if (list) list.push(rule);
    else rulesByHead.set(head, [rule]);
  }

  const segments: Segment[] = [];
  let plainStart = 0;
  let index = 0;
  while (index < text.length) {
    const candidates = rulesByHead.get(text[index]) ?? [];
    const matched = candidates.find((rule) =>
      text.startsWith(rule.source, index),
    );
    if (!matched) {
      index += 1;
      continue;
    }
    if (plainStart < index) {
      segments.push({
        start: plainStart,
        text: text.slice(plainStart, index),
        rule: null,
      });
    }
    segments.push({ start: index, text: matched.source, rule: matched });
    index += matched.source.length;
    plainStart = index;
  }
  if (plainStart < text.length) {
    segments.push({
      start: plainStart,
      text: text.slice(plainStart),
      rule: null,
    });
  }
  return segments;
}

/**
 * 分割した区間から、置換後のテキストを作る。
 * @param segments 分割した区間の一覧
 * @returns {string} 置換後のテキスト
 */
export function buildReplacedText(segments: readonly Segment[]): string {
  return segments
    .map((segment) => (segment.rule ? segment.rule.replacement : segment.text))
    .join("");
}

/**
 * ルールごとの一致件数を数える。
 * @param segments 分割した区間の一覧
 * @returns {Map<number, number>} ルール ID ごとの一致件数
 */
export function countMatches(
  segments: readonly Segment[],
): Map<number, number> {
  const counts = new Map<number, number>();
  for (const segment of segments) {
    if (!segment.rule) continue;
    counts.set(segment.rule.id, (counts.get(segment.rule.id) ?? 0) + 1);
  }
  return counts;
}
