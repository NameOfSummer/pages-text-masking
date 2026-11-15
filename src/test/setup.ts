import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// globals: false のため、Testing Library の自動 cleanup が効かない。テストごとに DOM を片付ける。
afterEach(() => {
  cleanup();
});

// jsdom は Range のレイアウト計測を持たず、CodeMirror の計測で落ちるため、空の結果を返す（as は DOMRectList の型に合わせるだけ）
Range.prototype.getClientRects = () =>
  Object.assign([], { item: () => null }) as unknown as DOMRectList;
Range.prototype.getBoundingClientRect = () => new DOMRect();
