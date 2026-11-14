#!/bin/bash
# Claude Code の PostToolUse hook（Edit / Write の直後に実行する）。.claude/settings.json から呼ぶ。
# このリポジトリの node_modules/.bin にあるツールだけを使う（npx でダウンロードしない）。
#
# 1. Prettier: 編集したファイルを prettier --write で整形する。
# 2. ESLint: eslint.config.* があれば、編集したファイルを検査する（--fix はしない）。
#    指摘があれば exit 2 で stderr を Claude に返し、Claude に直させる。
#
# リポジトリの外のファイル・node_modules の中のファイル・ツールが入っていない場合は何もしない（exit 0）。

set -u

# NOTE: リポジトリのルート（このスクリプトが置かれた .claude/hooks の 2 つ上）
REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
readonly REPO_ROOT

# NOTE: ESLint を実行する拡張子
readonly LINT_EXT_PATTERN='\.(js|jsx|mjs|cjs|ts|tsx|mts|cts|vue)$'

file_path="$(jq -r '.tool_input.file_path // .tool_response.filePath // empty')"
[ -n "$file_path" ] && [ -f "$file_path" ] || exit 0

case "$file_path" in
  "$REPO_ROOT"/node_modules/*) exit 0 ;;
  "$REPO_ROOT"/*) ;;
  *) exit 0 ;;
esac

cd "$REPO_ROOT" || exit 0

prettier_bin="$REPO_ROOT/node_modules/.bin/prettier"
if [ -x "$prettier_bin" ]; then
  # --ignore-unknown: Prettier が扱えない拡張子は黙って飛ばす。.prettierignore はルートのものが使われる
  "$prettier_bin" --write --ignore-unknown --log-level warn "$file_path" >/dev/null 2>&1
fi

eslint_bin="$REPO_ROOT/node_modules/.bin/eslint"
if [ -x "$eslint_bin" ] && ls "$REPO_ROOT"/eslint.config.* >/dev/null 2>&1 &&
  printf '%s' "$file_path" | grep -Eq "$LINT_EXT_PATTERN"; then
  if ! lint_output="$("$eslint_bin" --no-warn-ignored "$file_path" 2>&1)"; then
    {
      echo "ESLint の指摘があります。修正してください:"
      echo "$lint_output"
    } >&2
    exit 2
  fi
fi

exit 0
