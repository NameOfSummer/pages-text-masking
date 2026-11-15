/** ダウンロードするファイル名の先頭 */
const FILE_NAME_PREFIX = "text_";

/**
 * 数値を 2 桁にそろえる。
 * @param value 数値
 * @returns {string} 2 桁の文字列
 */
function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

/**
 * ダウンロードするファイル名を作る（例: text_20261201-215959.json）。日時は端末のローカル時刻。
 * @param date ファイル名に入れる日時
 * @param isJson JSON なら true（拡張子を .json にする）
 * @returns {string} ファイル名
 */
export function buildDownloadFileName(date: Date, isJson: boolean): string {
  const day = `${date.getFullYear()}${pad2(date.getMonth() + 1)}${pad2(date.getDate())}`;
  const time = `${pad2(date.getHours())}${pad2(date.getMinutes())}${pad2(date.getSeconds())}`;
  return `${FILE_NAME_PREFIX}${day}-${time}.${isJson ? "json" : "txt"}`;
}
