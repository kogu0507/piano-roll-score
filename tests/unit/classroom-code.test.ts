import { webcrypto } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
  buildClassroomCatalogUrlFromCode,
  buildDemoClassroomCatalogUrl,
  buildProductionClassroomCatalogUrl,
  hashClassroomCode,
  normalizeClassroomCode,
} from "../../src/core/classroom-code";

const subtleCrypto = webcrypto.subtle as unknown as SubtleCrypto;

function expectNormalized(rawCode: string, expectedCode: string): void {
  expect(normalizeClassroomCode(rawCode)).toEqual({
    success: true,
    data: expectedCode,
  });
}

describe("教室コード正規化", () => {
  it("前後空白と英字大文字を正規化する", () => {
    expectNormalized(" Sakura-4832 ", "sakura-4832");
    expectNormalized("SAKURA-4832", "sakura-4832");
  });

  it("代表的な全角英数字と全角ハイフンを半角へ寄せる", () => {
    expectNormalized("ＳＡＫＵＲＡ－４８３２", "sakura-4832");
  });

  it("ハイフン類を半角ハイフンへ寄せる", () => {
    expectNormalized("sakura−4832", "sakura-4832");
    expectNormalized("sakuraー4832", "sakura-4832");
  });

  it("空文字を拒否する", () => {
    expect(normalizeClassroomCode("   ")).toEqual({
      success: false,
      error: expect.objectContaining({ kind: "validation" }),
    });
  });

  it("許可外文字を拒否する", () => {
    expect(normalizeClassroomCode("さくら")).toEqual({
      success: false,
      error: expect.objectContaining({ kind: "validation" }),
    });
    expect(normalizeClassroomCode("abc def")).toEqual({
      success: false,
      error: expect.objectContaining({ kind: "validation" }),
    });
  });
});

describe("教室コードURL生成", () => {
  it("SHA-256をlowercase hexで生成する", async () => {
    await expect(hashClassroomCode("abc", subtleCrypto)).resolves.toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });

  it("本番想定の/data配下URLを生成する", async () => {
    const result = await buildClassroomCatalogUrlFromCode(
      "abc",
      "/app/piano-roll-score/",
      subtleCrypto,
    );

    expect(result).toEqual({
      success: true,
      data: {
        code: "abc",
        source: "production",
        catalogUrl: buildProductionClassroomCatalogUrl(
          "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
        ),
      },
    });
  });

  it("demoだけアプリ同梱デモカタログへマップする", async () => {
    const result = await buildClassroomCatalogUrlFromCode(
      " demo ",
      "/app/piano-roll-score/",
      subtleCrypto,
    );

    expect(result).toEqual({
      success: true,
      data: {
        code: "demo",
        source: "demo",
        catalogUrl: buildDemoClassroomCatalogUrl("/app/piano-roll-score/"),
      },
    });
  });
});
