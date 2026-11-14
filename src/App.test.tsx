import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "./App";

describe("App", () => {
  it("支援技術向けの h1 にアプリ名を置く", () => {
    render(<App />);
    expect(
      screen.getByRole("heading", { level: 1, name: "Text Masking" }),
    ).toBeInTheDocument();
  });
});
