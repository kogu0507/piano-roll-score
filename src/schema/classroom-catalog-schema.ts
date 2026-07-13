import { z } from "zod";

import { catalogVariationMetadataShape } from "./catalog-variation-metadata";
import { validateWithSchema, type ValidationResult } from "./validation";

const nonEmptyText = z.string().trim().min(1, "空文字は指定できません。");

export const classroomCatalogSongSchema = z.object({
  id: nonEmptyText,
  title: nonEmptyText,
  description: z.string().optional(),
  level: z.string().optional(),
  catalogGroup: z.string().optional(),
  songUrl: nonEmptyText,
  ...catalogVariationMetadataShape,
});

export const classroomCatalogSchema = z
  .object({
    schemaVersion: z.literal(1, {
      error: "対応している教室カタログのschemaVersionは1です。",
    }),
    catalogType: z.literal("classroom", {
      error: "catalogTypeはclassroomにしてください。",
    }),
    classroom: z.object({
      displayName: nonEmptyText,
      catalogName: nonEmptyText,
      updatedAt: z.string().optional(),
    }),
    songs: z.array(classroomCatalogSongSchema),
  })
  .superRefine((catalog, context) => {
    const knownIds = new Set<string>();

    catalog.songs.forEach((song, index) => {
      if (knownIds.has(song.id)) {
        context.addIssue({
          code: "custom",
          path: ["songs", index, "id"],
          message: `教室カタログ内の曲ID「${song.id}」が重複しています。`,
        });
      }

      knownIds.add(song.id);
    });
  });

export type ClassroomCatalogSong = z.infer<typeof classroomCatalogSongSchema>;
export type ClassroomCatalog = z.infer<typeof classroomCatalogSchema>;

export function validateClassroomCatalog(
  input: unknown,
): ValidationResult<ClassroomCatalog> {
  return validateWithSchema(classroomCatalogSchema, input);
}
