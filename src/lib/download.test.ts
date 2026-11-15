import { describe, expect, it } from "vitest";
import { buildDownloadFileName } from "./download";

describe("buildDownloadFileName", () => {
  it("日時を 2 桁にそろえ、JSON なら .json にする", () => {
    const date = new Date(2026, 0, 2, 3, 4, 5);
    expect(buildDownloadFileName(date, true)).toBe("text_20260102-030405.json");
    expect(buildDownloadFileName(date, false)).toBe("text_20260102-030405.txt");
  });

  it("2 桁の値はそのまま入れる", () => {
    const date = new Date(2026, 11, 1, 21, 59, 59);
    expect(buildDownloadFileName(date, false)).toBe("text_20261201-215959.txt");
  });
});
