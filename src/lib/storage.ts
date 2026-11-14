import { maskValue } from "./mask";
import { MAX_RULES, MAX_TEXT_LENGTH, type Rule } from "./rules";

/** 置換ルールの保存キー */
export const RULES_STORAGE_KEY = "text-masking:rules:v1";

/** 横並びの置換ワードの幅の保存キー */
export const RULES_WIDTH_STORAGE_KEY = "text-masking:rules-width:v1";

/** 縦並びのテキストの高さの保存キー */
export const EDITOR_HEIGHT_STORAGE_KEY = "text-masking:editor-height:v1";

/** localStorage が使えるかを確かめるためのキー */
const PROBE_STORAGE_KEY = "text-masking:probe";

/** 保存する置換ルール（ID は保存せず、読み込むときに振り直す） */
export type StoredRule = Omit<Rule, "id">;

/**
 * localStorage を取得する。プライベートブラウズなどで使えない（アクセスや書き込みで例外が出る）ときは null を返す。
 * @returns {Storage | null} 使える Storage（使えなければ null）
 */
export function getStorage(): Storage | null {
  try {
    const storage = window.localStorage;
    storage.setItem(PROBE_STORAGE_KEY, "1");
    storage.removeItem(PROBE_STORAGE_KEY);
    return storage;
  } catch {
    return null;
  }
}

/**
 * 値がプレーンなオブジェクトかを判定する。
 * @param value 判定する値
 * @returns {boolean} オブジェクトなら true
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * 保存されていたルール 1 件を検証する。
 * @param value 保存されていた値
 * @returns {StoredRule | null} 正しければルール（壊れていれば null）
 */
function parseStoredRule(value: unknown): StoredRule | null {
  if (!isRecord(value)) return null;
  const { source, replacement, isCustom, isEnabled } = value;
  if (typeof source !== "string" || typeof replacement !== "string") {
    return null;
  }
  if (typeof isCustom !== "boolean" || typeof isEnabled !== "boolean") {
    return null;
  }
  if (source === "" || source.length > MAX_TEXT_LENGTH) return null;
  if (replacement.length > MAX_TEXT_LENGTH) return null;
  // 手で書き換えていない置換後は、置換前から作り直して食い違いをなくす
  const isCustomReplacement = isCustom && replacement !== "";
  return {
    source,
    replacement: isCustomReplacement ? replacement : maskValue(source),
    isCustom: isCustomReplacement,
    isEnabled,
  };
}

/**
 * 保存されていたルール一覧を検証する。型・件数・文字数・置換前の重複のどれかが不正なら、全体を壊れているとみなす。
 * @param value JSON.parse した値
 * @returns {StoredRule[] | null} 正しければルール一覧（壊れていれば null）
 */
export function parseStoredRules(value: unknown): StoredRule[] | null {
  if (!Array.isArray(value) || value.length > MAX_RULES) return null;
  const rules: StoredRule[] = [];
  const sources = new Set<string>();
  for (const item of value) {
    const rule = parseStoredRule(item);
    if (!rule || sources.has(rule.source)) return null;
    sources.add(rule.source);
    rules.push(rule);
  }
  return rules;
}

/**
 * 保存されていた JSON を読み込む。
 * @param storage 読み込む Storage
 * @param key 保存キー
 * @returns {unknown} JSON.parse した値（なければ・壊れていれば undefined）
 */
function readJson(storage: Storage, key: string): unknown {
  try {
    const raw = storage.getItem(key);
    return raw === null ? undefined : JSON.parse(raw);
  } catch {
    return undefined;
  }
}

/**
 * 値を JSON にして保存する。
 * @param storage 保存先の Storage
 * @param key 保存キー
 * @param value 保存する値
 * @returns {boolean} 保存できたら true
 */
function writeJson(storage: Storage, key: string, value: unknown): boolean {
  try {
    storage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

/**
 * 保存されていた置換ルールを読み込む。なければ・壊れていれば空の一覧を返す。
 * @param storage 読み込む Storage（使えなければ null）
 * @returns {StoredRule[]} ルール一覧
 */
export function loadRules(storage: Storage | null): StoredRule[] {
  if (!storage) return [];
  return parseStoredRules(readJson(storage, RULES_STORAGE_KEY)) ?? [];
}

/**
 * 置換ルールを保存する（ID は保存しない）。
 * @param storage 保存先の Storage
 * @param rules ルール一覧
 * @returns {boolean} 保存できたら true
 */
export function saveRules(storage: Storage, rules: readonly Rule[]): boolean {
  const stored: StoredRule[] = rules.map(
    ({ source, replacement, isCustom, isEnabled }) => ({
      source,
      replacement,
      isCustom,
      isEnabled,
    }),
  );
  return writeJson(storage, RULES_STORAGE_KEY, stored);
}

/**
 * 保存されていた数値（区切りバーの値）を読み込む。
 * @param storage 読み込む Storage（使えなければ null）
 * @param key 保存キー
 * @returns {number | null} 有限の正の数なら その値（なければ・壊れていれば null）
 */
export function loadNumber(
  storage: Storage | null,
  key: string,
): number | null {
  if (!storage) return null;
  const value = readJson(storage, key);
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return null;
  }
  return value;
}

/**
 * 数値（区切りバーの値）を保存する。
 * @param storage 保存先の Storage
 * @param key 保存キー
 * @param value 保存する値
 * @returns {boolean} 保存できたら true
 */
export function saveNumber(
  storage: Storage,
  key: string,
  value: number,
): boolean {
  return writeJson(storage, key, value);
}
