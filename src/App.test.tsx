import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { App } from "./App";
import { RULES_STORAGE_KEY } from "@/lib/storage";

/**
 * アプリを描画し、操作用の userEvent を返す。
 * @returns {ReturnType<typeof userEvent.setup>} userEvent
 */
function setup(): ReturnType<typeof userEvent.setup> {
  const user = userEvent.setup();
  render(<App />);
  return user;
}

/**
 * タグの入力欄に語を入れて Enter で追加する。
 * @param user userEvent
 * @param source 置換前
 * @returns {Promise<void>} 追加し終えたら解決する
 */
async function addTag(
  user: ReturnType<typeof userEvent.setup>,
  source: string,
): Promise<void> {
  await user.type(
    screen.getByLabelText("置換する語を追加"),
    `${source}{Enter}`,
  );
}

describe("App", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("支援技術向けの h1 にアプリ名を置く", () => {
    render(<App />);
    expect(
      screen.getByRole("heading", { level: 1, name: "Text Masking" }),
    ).toBeInTheDocument();
  });

  it("ルールがないときは検索欄と絞り込みを出さない", () => {
    render(<App />);
    expect(screen.queryByLabelText("置換前を検索")).not.toBeInTheDocument();
    expect(screen.getByText("0 / 200")).toBeInTheDocument();
  });

  it("Enter で追加し、一致件数を出し、置換 ON で置換後を表示する", async () => {
    const user = setup();
    await user.type(
      screen.getByRole("textbox", { name: "テキスト" }),
      "山田太郎と山田太郎",
    );
    await addTag(user, "山田太郎");

    const tag = screen.getByRole("button", { name: /^山田太郎（置換後/ });
    expect(within(tag).getByText("2")).toBeInTheDocument();
    expect(screen.getByText("1 / 200")).toBeInTheDocument();
    expect(screen.getByLabelText("置換前を検索")).toBeInTheDocument();

    await user.click(screen.getByRole("switch", { name: "置換" }));
    expect(screen.getByText("置換中")).toBeInTheDocument();
    expect(
      screen.getByRole("textbox", { name: "置換後のテキスト" }),
    ).toHaveTextContent("山＊＊郎と山＊＊郎");
    expect(screen.queryByText("黄色: 一致箇所")).not.toBeInTheDocument();
  });

  it("ルールを保存し、テキスト本文は保存しない", async () => {
    const user = setup();
    await user.type(
      screen.getByRole("textbox", { name: "テキスト" }),
      "秘密の本文",
    );
    await addTag(user, "秘密");
    const stored = localStorage.getItem(RULES_STORAGE_KEY) ?? "";
    expect(JSON.parse(stored)).toEqual([
      { source: "秘密", replacement: "秘＊", isCustom: false, isEnabled: true },
    ]);
    const allValues = Object.keys(localStorage).map(
      (key) => localStorage.getItem(key) ?? "",
    );
    expect(allValues.some((value) => value.includes("秘密の本文"))).toBe(false);
  });

  it("保存されていたルールを読み込む", () => {
    localStorage.setItem(
      RULES_STORAGE_KEY,
      JSON.stringify([
        { source: "佐藤", replacement: "S", isCustom: true, isEnabled: false },
      ]),
    );
    render(<App />);
    expect(
      screen.getByRole("button", { name: "佐藤（置換後: S、無効）" }),
    ).toBeInTheDocument();
    expect(screen.getByText("1 / 200（無効 1）")).toBeInTheDocument();
  });

  it("重複した語は追加せず、入力を残す", async () => {
    const user = setup();
    await addTag(user, "山田");
    await addTag(user, "山田");
    expect(
      screen.getAllByRole("button", { name: /^山田（置換後/ }),
    ).toHaveLength(1);
    expect(screen.getByLabelText("置換する語を追加")).toHaveValue("山田");
  });

  it("入力欄が空のとき Backspace で最後のタグに移り、もう一度で削除する", async () => {
    const user = setup();
    await addTag(user, "a1");
    await addTag(user, "b2");
    await user.keyboard("{Backspace}");
    expect(screen.getByRole("button", { name: /^b2（置換後/ })).toHaveFocus();
    await user.keyboard("{Backspace}");
    expect(
      screen.queryByRole("button", { name: /^b2（置換後/ }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^a1（置換後/ })).toHaveFocus();
  });

  it("タグにマウスを載せると、置換後を矢印なしで吹き出しに出す", async () => {
    const user = setup();
    await addTag(user, "山田太郎");
    await user.hover(screen.getByRole("button", { name: /^山田太郎（置換後/ }));
    expect(screen.getByRole("tooltip")).toHaveTextContent(/^山＊＊郎$/);
  });

  it("× でタグを削除する", async () => {
    const user = setup();
    await addTag(user, "山田");
    await user.click(screen.getByRole("button", { name: "山田を削除" }));
    expect(screen.getByText("0 / 200")).toBeInTheDocument();
  });

  it("編集欄で置換後を書き換え、Esc で閉じるとタグにフォーカスを戻す", async () => {
    const user = setup();
    await user.type(screen.getByRole("textbox", { name: "テキスト" }), "山田");
    await addTag(user, "山田");
    await user.click(screen.getByRole("button", { name: /^山田（置換後/ }));

    const dialog = screen.getByRole("dialog", { name: "ルール編集" });
    const replacement = within(dialog).getByLabelText("置換後");
    await user.clear(replacement);
    await user.type(replacement, "Y");
    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    const tag = screen.getByRole("button", { name: "山田（置換後: Y）" });
    expect(tag).toHaveFocus();
    expect(within(tag).getByTitle("変更済み")).toBeInTheDocument();
  });

  it("置換前を重複させるとエラーを出し、閉じると元に戻す", async () => {
    const user = setup();
    await addTag(user, "山田");
    await addTag(user, "佐藤");
    await user.click(screen.getByRole("button", { name: /^山田（置換後/ }));

    const source = within(screen.getByRole("dialog")).getByLabelText("置換前");
    await user.clear(source);
    expect(
      screen.getByText("置換前が空（閉じると元に戻る）"),
    ).toBeInTheDocument();
    await user.type(source, "佐藤");
    expect(
      screen.getByText("ほかのタグと重複（閉じると元に戻る）"),
    ).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(
      screen.getByRole("button", { name: "山田（置換後: 山＊）" }),
    ).toBeInTheDocument();
  });

  it("編集欄の有効スイッチで無効にすると、置換の対象から外す", async () => {
    const user = setup();
    await user.type(screen.getByRole("textbox", { name: "テキスト" }), "山田");
    await addTag(user, "山田");
    await user.click(screen.getByRole("button", { name: /^山田（置換後/ }));
    await user.click(
      within(screen.getByRole("dialog")).getByRole("switch", { name: "有効" }),
    );
    await user.keyboard("{Escape}");
    await user.click(screen.getByRole("switch", { name: "置換" }));
    expect(
      screen.getByRole("textbox", { name: "置換後のテキスト" }),
    ).toHaveTextContent("山田");
    expect(screen.getByText("1 / 200（無効 1）")).toBeInTheDocument();
  });

  it("検索と絞り込みで表示を絞り、該当がなければ「該当なし」を出す", async () => {
    const user = setup();
    await addTag(user, "Tanaka");
    await addTag(user, "山田");
    await user.type(screen.getByLabelText("置換前を検索"), "ｔａｎ");
    expect(screen.getByText("1 / 2")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /^山田（置換後/ }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "無効" }));
    expect(screen.getByText("該当なし")).toBeInTheDocument();

    // タグを追加すると、検索と絞り込みを戻す
    await addTag(user, "佐藤");
    expect(screen.getByLabelText("置換前を検索")).toHaveValue("");
    expect(screen.getByRole("button", { name: "すべて" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByText("3 / 200")).toBeInTheDocument();
  });

  it("コピーボタンは、アイコンを付けても名前は「コピー」のまま。置換中は置換後をコピーする", async () => {
    const user = setup();
    await user.type(screen.getByRole("textbox", { name: "テキスト" }), "山田");
    await addTag(user, "山田");
    await user.click(screen.getByRole("switch", { name: "置換" }));

    const copyButton = screen.getByRole("button", { name: "コピー" });
    expect(copyButton.querySelector("svg")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
    await user.click(copyButton);
    expect(await navigator.clipboard.readText()).toBe("山＊");
    expect(screen.getByText("コピー完了")).toBeInTheDocument();
  });

  it("区切りバーに role と aria 属性を付け、キーで動かす", async () => {
    const user = setup();
    const separator = screen.getByRole("separator", { name: "幅の調節" });
    expect(separator).toHaveAttribute("aria-orientation", "vertical");
    expect(separator).toHaveAttribute("aria-valuemin", "280");
    separator.focus();
    await user.keyboard("{End}");
    expect(separator).toHaveAttribute(
      "aria-valuenow",
      separator.getAttribute("aria-valuemax"),
    );
  });
});
