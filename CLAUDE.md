# CLAUDE.md

このファイルは、このリポジトリで作業する Claude Code (claude.ai/code) 向けのガイドです。

text-masking は、テキストの一部を伏せ字などに置き換えるブラウザだけで動くテキストエディタです。置換ルール（置換前 → 置換後）をタグで管理し、置換スイッチを ON にすると置換後のテキストを表示・コピーできます。構成は Vite + React 19 + TypeScript + Tailwind v4 + shadcn/ui (Radix)。GitHub Pages にデプロイします（`vite.config.ts` の `base: "/pages-text-masking/"`）。

- 仕様の正: `.claude.local/specs/spec.md`（git 管理外。実装前に必ず読む）
- 見た目と動きの正: `.claude.local/samples/editor-screen.html`（素の HTML/JS）
- デザインの正: `DESIGN.md`（ツール UI の項: 2 章の色、3.4.1 の文字サイズ、4 章の Icons、6.1 の影）

## コマンド

```bash
npm ci
npm run dev
npm run lint              # ESLint（必須の JSDoc ルールを含む）
npm run format:check      # Prettier の整形チェック（整形するときは npm run format）
npm run typecheck         # tsc --noEmit
npm test                  # Vitest（jsdom + Testing Library）
npm run build             # typecheck + vite build
```

変更したら `npm run lint`・`npm run typecheck`・`npm test`・`npm run build` で確認します。CI（`.github/workflows/ci.yml`）は PR で audit → lint → format:check → test → build を実行し、`main` への push で GitHub Pages にデプロイします。

## 守ること（仕様から）

- **テキスト本文と置換スイッチの状態は保存しない。** 伏せたい文章がブラウザに残らないようにするため。localStorage に保存するのは置換ルールと区切りバーの値だけ（キーは `text-masking:<対象>:v<版>`）。
- 読み込んだ保存データは信用せず、型と上限（200 件・200 文字・置換前の重複）を確かめてから使う。localStorage が使えない環境でも動くようにする。
- 文言は短い常体でそろえ、「マスキング」ではなく「置換」と言う（仕様 6 章）。
- ダークモードは今回対応しない。

## 規約（lint / tsc でチェックされる）

- named export のみ使い、`export default` は使わない（設定ファイルは例外）。コンポーネントは `export function Name()` の形で書き、Props はファイル内の `type Props` で定義する。1 ファイルにつき 1 コンポーネントとし、ファイル名は export 名と同じにする。
- ディレクトリをまたぐ import は `@/`、同じディレクトリ内の import は `./` を使う。型だけの import は `import type` / `import { type ... }` を使う。未使用の変数・引数には `_` を付ける。
- Tailwind のクラスは静的な文字列で書き、条件付きの結合は `cn()`（`@/lib/utils`）で行う。色・影・文字サイズは DESIGN.md のトークンを CSS 変数で定義して使う。
- アイコンは Heroicons（`@heroicons/react/24/outline` を基本）。lucide は使わない。
- `src/components/ui/` は shadcn/ui の生成コードなので、アプリの規約に合わせて書き換えない（`components.json` の `iconLibrary` は lucide のままなので、生成コードがアイコンを使う場合は置き換えを検討する）。
- すべての `function` 宣言と、トップレベルのすべての `const` / `var` / `type` に**日本語の JSDoc が必須**。説明文、引数ごとの `@param`、`@returns {Type}`（`@returns {void}` も含む）を書く。引数なしの関数には `@param` を書かない。分割代入で props を受け取る関数は `@param props` として書く。
- 整形は Prettier（既定設定）に任せる。ESLint 側の整形ルールは `eslint-config-prettier` で無効化している。
- テストは `src/**/*.test.{ts,tsx}` に置く。純粋なロジック（伏せ字・当てはめ・検索の正規化・保存データの検証・区切りバーの範囲）は React から切り離して `src/lib/` に置き、ユニットテストする。
- コメントとコミットメッセージは日本語で書く。

## 依存関係

- `.npmrc` の `min-release-age=7` と `ignore-scripts=true` は外さない（サプライチェーン攻撃対策）。
- Vite 8 は esbuild に依存しないため、pic-edit にある `rebuild:esbuild` は不要。install スクリプトが必要なパッケージが出てきたら、設定は変えずに報告し、承認を得てから個別に `npm rebuild <パッケージ名>` する。
- `tsc` は `@typescript/native` 経由の TypeScript 7。typescript-eslint はまだ TS 7 のコンパイラ API を import できないため、`typescript` というパッケージ名を `@typescript/typescript6` のエイリアスにしている。このエイリアスは「修正」しないこと。
