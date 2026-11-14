/** 半角の文字を伏せるときの記号 */
const HALF_MASK = "*";

/** 全角の文字を伏せるときの記号 */
const FULL_MASK = "＊";

/** 伏せずにそのまま残す文字（記号・空白・数字（半角・全角）・制御文字） */
const PRESERVED_CHAR_PATTERN = /^[\p{P}\p{S}\p{Z}\p{Nd}\p{C}\s]$/u;

/** 半角として扱う最大のコードポイント */
const HALF_WIDTH_MAX_CODE_POINT = 0x10ff;

/** 半角カナ・半角ハングルの範囲 */
const HALF_WIDTH_KANA_RANGE = { min: 0xff61, max: 0xffdc } as const;

/** 半角記号の範囲 */
const HALF_WIDTH_SYMBOL_RANGE = { min: 0xffe8, max: 0xffee } as const;

/**
 * 1 文字が半角かどうかを判定する（簡易判定。仕様 3.1）。
 * @param char 判定する 1 文字（サロゲートペアは 1 文字として渡す）
 * @returns {boolean} 半角なら true
 */
export function isHalfWidth(char: string): boolean {
  const codePoint = char.codePointAt(0) ?? 0;
  if (codePoint <= HALF_WIDTH_MAX_CODE_POINT) return true;
  return (
    (codePoint >= HALF_WIDTH_KANA_RANGE.min &&
      codePoint <= HALF_WIDTH_KANA_RANGE.max) ||
    (codePoint >= HALF_WIDTH_SYMBOL_RANGE.min &&
      codePoint <= HALF_WIDTH_SYMBOL_RANGE.max)
  );
}

/**
 * 伏せ字にせずそのまま残す文字かを判定する。
 * @param char 判定する 1 文字
 * @returns {boolean} 残す文字なら true
 */
export function isPreservedChar(char: string): boolean {
  return PRESERVED_CHAR_PATTERN.test(char);
}

/**
 * 置換前の文字列から、デフォルトの伏せ字の値を作る（仕様 3.1）。
 * 伏せる対象の文字のうち最初と最後の 1 文字を残す。2 文字なら最初だけを残し、1 文字なら残さない。
 * @param value 置換前の文字列
 * @returns {string} 伏せ字にした文字列
 */
export function maskValue(value: string): string {
  // サロゲートペア（絵文字など）を 1 文字として扱うため、コードポイント単位に分ける
  const chars = Array.from(value);
  const targetIndexes = chars.flatMap((char, index) =>
    isPreservedChar(char) ? [] : [index],
  );
  const keptIndexes = new Set<number>();
  if (targetIndexes.length >= 2) keptIndexes.add(targetIndexes[0]);
  if (targetIndexes.length >= 3) keptIndexes.add(targetIndexes.at(-1) ?? -1);
  return chars
    .map((char, index) => {
      if (isPreservedChar(char) || keptIndexes.has(index)) return char;
      return isHalfWidth(char) ? HALF_MASK : FULL_MASK;
    })
    .join("");
}
