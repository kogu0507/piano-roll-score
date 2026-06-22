import { validateSong, type Song } from "../schema/song-schema";
import type { ValidationIssue } from "../schema/validation";

export const MAX_JSON_BYTES = 2 * 1024 * 1024;
export const MAX_VISIBLE_VALIDATION_ISSUES = 20;

export type SongJsonErrorKind = "empty" | "too-large" | "json" | "schema";

export interface SongJsonError {
  readonly kind: SongJsonErrorKind;
  readonly message: string;
  readonly issues: readonly ValidationIssue[];
}

export type SongJsonResult =
  | {
      readonly success: true;
      readonly song: Song;
      readonly formattedJson: string;
    }
  | {
      readonly success: false;
      readonly error: SongJsonError;
    };

export interface VisibleValidationIssues {
  readonly visible: readonly ValidationIssue[];
  readonly remainingCount: number;
}

export function stripUtf8Bom(text: string): string {
  return text.startsWith("\uFEFF") ? text.slice(1) : text;
}

export function getUtf8ByteLength(text: string): number {
  return new TextEncoder().encode(text).byteLength;
}

export function formatSongJson(song: Song): string {
  return `${JSON.stringify(song, null, 2)}\n`;
}

export function parseAndValidateSongJson(text: string): SongJsonResult {
  if (getUtf8ByteLength(text) > MAX_JSON_BYTES) {
    return {
      success: false,
      error: {
        kind: "too-large",
        message: "JSONは2 MiB以下にしてください。",
        issues: [],
      },
    };
  }

  const normalizedText = stripUtf8Bom(text);

  if (normalizedText.trim().length === 0) {
    return {
      success: false,
      error: {
        kind: "empty",
        message: "楽曲JSONを入力してください。",
        issues: [],
      },
    };
  }

  let input: unknown;

  try {
    input = JSON.parse(normalizedText) as unknown;
  } catch (error) {
    return {
      success: false,
      error: {
        kind: "json",
        message: "JSONの構文を確認してください。",
        issues: [
          {
            path: "JSON",
            message:
              error instanceof SyntaxError
                ? error.message
                : "JSONとして解析できませんでした。",
          },
        ],
      },
    };
  }

  const validated = validateSong(input);

  if (!validated.success) {
    return {
      success: false,
      error: {
        kind: "schema",
        message: "楽曲データの内容を確認してください。",
        issues: validated.issues,
      },
    };
  }

  return {
    success: true,
    song: validated.data,
    formattedJson: formatSongJson(validated.data),
  };
}

export function getVisibleValidationIssues(
  issues: readonly ValidationIssue[],
): VisibleValidationIssues {
  return {
    visible: issues.slice(0, MAX_VISIBLE_VALIDATION_ISSUES),
    remainingCount: Math.max(0, issues.length - MAX_VISIBLE_VALIDATION_ISSUES),
  };
}
