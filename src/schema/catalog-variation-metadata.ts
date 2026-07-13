import { z } from "zod";

export const catalogPartValues = [
  "right",
  "left",
  "both",
  "primo",
  "secondo",
  "etude",
  "scale",
  "other",
] as const;

export const catalogPartSchema = z.enum(catalogPartValues);

const optionalNonEmptyText = z.string().trim().min(1).optional();

export const catalogVariationMetadataShape = {
  seriesId: optionalNonEmptyText,
  seriesTitle: optionalNonEmptyText,
  part: catalogPartSchema.optional(),
  variantLabel: optionalNonEmptyText,
  sortOrder: z.number().finite().optional(),
};

export type CatalogPart = z.infer<typeof catalogPartSchema>;
