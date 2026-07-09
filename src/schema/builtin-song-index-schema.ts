import { z } from "zod";

import { validateWithSchema, type ValidationResult } from "./validation";

export const BUILTIN_SONG_ID_PATTERN = /^[A-Za-z0-9_-]+$/;

export const builtinSongSummarySchema = z.object({
  id: z
    .string()
    .regex(
      BUILTIN_SONG_ID_PATTERN,
      "IDには英数字、ハイフン、アンダースコアだけを使用できます。",
    ),
  title: z.string(),
  description: z.string(),
  level: z.string(),
  visibleInHome: z.boolean().optional(),
  catalogGroup: z.string().optional(),
});

export const builtinSongIndexSchema = z
  .object({
    schemaVersion: z.literal(1, {
      error: "対応している一覧のschemaVersionは1です。",
    }),
    songs: z.array(builtinSongSummarySchema),
  })
  .superRefine((index, context) => {
    const knownIds = new Set<string>();

    index.songs.forEach((song, songIndex) => {
      if (knownIds.has(song.id)) {
        context.addIssue({
          code: "custom",
          path: ["songs", songIndex, "id"],
          message: `内蔵曲ID「${song.id}」が重複しています。`,
        });
      }

      knownIds.add(song.id);
    });
  });

export type BuiltinSongSummary = z.infer<typeof builtinSongSummarySchema>;
export type BuiltinSongIndex = z.infer<typeof builtinSongIndexSchema>;

export function isBuiltinSongVisibleInHome(
  song: Pick<BuiltinSongSummary, "visibleInHome">,
): boolean {
  return song.visibleInHome !== false;
}

export function validateBuiltinSongIndex(
  input: unknown,
): ValidationResult<BuiltinSongIndex> {
  return validateWithSchema(builtinSongIndexSchema, input);
}
