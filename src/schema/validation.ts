import type { z } from "zod";

export interface ValidationIssue {
  readonly path: string;
  readonly message: string;
  readonly noteId?: string;
}

export type ValidationResult<T> =
  | {
      readonly success: true;
      readonly data: T;
    }
  | {
      readonly success: false;
      readonly issues: readonly ValidationIssue[];
    };

function getNoteId(
  input: unknown,
  path: readonly PropertyKey[],
): string | undefined {
  if (
    path[0] !== "notes" ||
    typeof path[1] !== "number" ||
    typeof input !== "object" ||
    input === null ||
    !("notes" in input) ||
    !Array.isArray(input.notes)
  ) {
    return undefined;
  }

  const note = input.notes[path[1]];

  if (
    typeof note === "object" &&
    note !== null &&
    "id" in note &&
    typeof note.id === "string"
  ) {
    return note.id;
  }

  return undefined;
}

export function validateWithSchema<T>(
  schema: z.ZodType<T>,
  input: unknown,
): ValidationResult<T> {
  const result = schema.safeParse(input);

  if (result.success) {
    return result;
  }

  return {
    success: false,
    issues: result.error.issues.map((issue) => {
      const noteId = getNoteId(input, issue.path);

      return {
        path: issue.path.join("."),
        message: issue.message,
        ...(noteId === undefined ? {} : { noteId }),
      };
    }),
  };
}
