import { describe, expect, it } from "vitest";

import { APP_NAME, getAppStatus } from "../../src/app";

describe("getAppStatus", () => {
  it("ロード画面に必要なアプリ名と開発状態を返す", () => {
    expect(getAppStatus()).toEqual({
      heading: APP_NAME,
      message: "現在、開発基盤を構築中です。",
    });
  });
});
