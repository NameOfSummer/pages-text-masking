/**
 * アプリ全体のルートコンポーネント。
 * アプリ名は画面に出さず、支援技術向けの h1（視覚的に隠す）としてだけ置く（仕様 2 章）。
 * @returns {JSX.Element} アプリのルート要素
 */
export function App() {
  return (
    <main>
      <h1 className="sr-only">Text Masking</h1>
    </main>
  );
}
