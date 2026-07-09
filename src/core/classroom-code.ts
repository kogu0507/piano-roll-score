import type { DataLoadResult } from "../data/builtin-song-repository";

export const CLASSROOM_DEMO_CODE = "demo";

export interface ClassroomCatalogUrlForCode {
  readonly code: string;
  readonly catalogUrl: string;
  readonly source: "demo" | "production";
}

const CLASSROOM_CODE_PATTERN = /^[a-z0-9-]+$/;
const HYPHEN_LIKE_PATTERN = /[\u2010-\u2015\u2212\u30fc\uff0d]/g;
const PRODUCTION_CLASSROOM_CATALOG_ROOT =
  "/data/piano-roll-score/classroom-catalogs";

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
}

function toClassroomCodeError(
  message: string,
): DataLoadResult<ClassroomCatalogUrlForCode> {
  return {
    success: false,
    error: {
      kind: "validation",
      message,
      issues: [
        {
          path: "classroomCode",
          message,
        },
      ],
    },
  };
}

export function normalizeClassroomCode(
  rawCode: string,
): DataLoadResult<string> {
  const normalized = rawCode
    .trim()
    .normalize("NFKC")
    .replace(HYPHEN_LIKE_PATTERN, "-")
    .toLowerCase();

  if (normalized.length === 0) {
    return {
      success: false,
      error: {
        kind: "validation",
        message: "教室コードを入力してください。",
        issues: [
          {
            path: "classroomCode",
            message: "教室コードを入力してください。",
          },
        ],
      },
    };
  }

  if (!CLASSROOM_CODE_PATTERN.test(normalized)) {
    return {
      success: false,
      error: {
        kind: "validation",
        message:
          "教室コードに使える文字は、半角英小文字、数字、ハイフンだけです。",
        issues: [
          {
            path: "classroomCode",
            message:
              "教室コードに使える文字は、半角英小文字、数字、ハイフンだけです。",
          },
        ],
      },
    };
  }

  return {
    success: true,
    data: normalized,
  };
}

export async function hashClassroomCode(
  normalizedCode: string,
  subtleCrypto: SubtleCrypto = globalThis.crypto.subtle,
): Promise<string> {
  const digest = await subtleCrypto.digest(
    "SHA-256",
    new TextEncoder().encode(normalizedCode),
  );

  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function buildProductionClassroomCatalogUrl(hash: string): string {
  return `${PRODUCTION_CLASSROOM_CATALOG_ROOT}/${hash}/catalog.json`;
}

export function buildDemoClassroomCatalogUrl(baseUrl: string): string {
  return `${normalizeBaseUrl(baseUrl)}data/classroom-catalogs/demo/catalog.json`;
}

export async function buildClassroomCatalogUrlFromCode(
  rawCode: string,
  baseUrl: string,
  subtleCrypto?: SubtleCrypto,
): Promise<DataLoadResult<ClassroomCatalogUrlForCode>> {
  const normalizedCode = normalizeClassroomCode(rawCode);

  if (!normalizedCode.success) {
    return toClassroomCodeError(normalizedCode.error.message);
  }

  if (normalizedCode.data === CLASSROOM_DEMO_CODE) {
    return {
      success: true,
      data: {
        code: normalizedCode.data,
        catalogUrl: buildDemoClassroomCatalogUrl(baseUrl),
        source: "demo",
      },
    };
  }

  const hash = await hashClassroomCode(
    normalizedCode.data,
    subtleCrypto ?? globalThis.crypto.subtle,
  );

  return {
    success: true,
    data: {
      code: normalizedCode.data,
      catalogUrl: buildProductionClassroomCatalogUrl(hash),
      source: "production",
    },
  };
}
