/** 整形のインデント（スペース 2 つ） */
const INDENT = "  ";

/** JSON のトークン（文字列リテラル・記号・それ以外の値）。原文の空白は拾わない */
const TOKEN_PATTERN = /"(?:[^"\\]|\\.)*"|[{}[\],:]|[^\s{}[\],:"]+/g;

/**
 * 最上位がオブジェクトか配列の JSON かを判定する（前後の空白は許す）。
 * @param text 判定する文字列
 * @returns {boolean} オブジェクトか配列の JSON なら true
 */
export function isJsonContainer(text: string): boolean {
  try {
    const value: unknown = JSON.parse(text);
    return typeof value === "object" && value !== null;
  } catch {
    return false;
  }
}

/**
 * JSON をスペース 2 つで整形する。値を丸めたり重複キーを消したりしないよう、トークンは原文のまま並べ直す。
 * isJsonContainer が true の文字列だけを渡す。
 * @param text 整形する JSON
 * @returns {string} 整形後の JSON
 */
export function formatJson(text: string): string {
  const tokens = text.match(TOKEN_PATTERN) ?? [];
  let depth = 0;
  let result = "";
  const newline = (): string => `\n${INDENT.repeat(depth)}`;
  tokens.forEach((token, index) => {
    const isOpen = token === "{" || token === "[";
    const isClose = token === "}" || token === "]";
    // 空の {} / [] は改行しない
    const isEmptyOpen =
      isOpen && (tokens[index + 1] === "}" || tokens[index + 1] === "]");
    const isEmptyClose =
      isClose && (tokens[index - 1] === "{" || tokens[index - 1] === "[");
    if (isOpen && !isEmptyOpen) {
      depth += 1;
      result += token + newline();
    } else if (isClose && !isEmptyClose) {
      depth -= 1;
      result += newline() + token;
    } else if (token === ",") {
      result += `,${newline()}`;
    } else if (token === ":") {
      result += ": ";
    } else {
      result += token;
    }
  });
  return result;
}
