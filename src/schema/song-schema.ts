import { z } from "zod";

import {
  ACCIDENTALS,
  MUSICAL_STEPS,
  pitchMatchesSpelling,
} from "../core/pitch";
import { validateWithSchema, type ValidationResult } from "./validation";

const MIDI_MIN = 21;
const MIDI_MAX = 108;
const BPM_MIN = 20;
const BPM_MAX = 300;
const TIME_SIGNATURE_NUMERATOR_MIN = 1;
const TIME_SIGNATURE_NUMERATOR_MAX = 32;
const MAX_NOTES = 5_000;
const INTERNAL_ID_PATTERN = /^[A-Za-z0-9_-]+$/;

const finiteNumber = z.number().finite("有限の数値を指定してください。");
const midiNumber = z
  .number()
  .int("MIDI番号は整数で指定してください。")
  .min(MIDI_MIN, `MIDI番号は${MIDI_MIN}以上で指定してください。`)
  .max(MIDI_MAX, `MIDI番号は${MIDI_MAX}以下で指定してください。`);
const nonEmptyText = z.string().trim().min(1, "空文字は指定できません。");

export const pitchSpellingSchema = z.object({
  step: z.enum(MUSICAL_STEPS, {
    error: "音名はAからGで指定してください。",
  }),
  accidental: z.enum(ACCIDENTALS, {
    error: "変化記号はnatural、sharp、flatで指定してください。",
  }),
  octave: z.number().int("オクターブは整数で指定してください。"),
});

export const noteSchema = z.object({
  id: nonEmptyText,
  pitch: midiNumber,
  spelling: pitchSpellingSchema,
  hand: z.enum(["right", "left", "unspecified"]).default("unspecified"),
  finger: z
    .number()
    .int("指番号は整数で指定してください。")
    .min(1, "指番号は1以上で指定してください。")
    .max(5, "指番号は5以下で指定してください。")
    .optional(),
  time: finiteNumber,
  duration: finiteNumber.positive("音の長さは0より大きくしてください。"),
});

const autoDisplayRangeSchema = z.object({
  mode: z.literal("auto"),
});

const fixedDisplayRangeSchema = z.object({
  mode: z.literal("fixed"),
  minPitch: midiNumber,
  maxPitch: midiNumber,
});

export const displayRangeSchema = z.discriminatedUnion("mode", [
  autoDisplayRangeSchema,
  fixedDisplayRangeSchema,
]);

export const songSchema = z
  .object({
    schemaVersion: z.literal(1, {
      error: "対応しているschemaVersionは1です。",
    }),
    id: z
      .string()
      .regex(
        INTERNAL_ID_PATTERN,
        "IDには英数字、ハイフン、アンダースコアだけを使用できます。",
      )
      .optional(),
    title: nonEmptyText,
    description: z.string().optional(),
    bpm: finiteNumber
      .min(BPM_MIN, `BPMは${BPM_MIN}以上で指定してください。`)
      .max(BPM_MAX, `BPMは${BPM_MAX}以下で指定してください。`),
    timeSignature: z.object({
      numerator: z
        .number()
        .int("拍子の分子は整数で指定してください。")
        .min(
          TIME_SIGNATURE_NUMERATOR_MIN,
          `拍子の分子は${TIME_SIGNATURE_NUMERATOR_MIN}以上で指定してください。`,
        )
        .max(
          TIME_SIGNATURE_NUMERATOR_MAX,
          `拍子の分子は${TIME_SIGNATURE_NUMERATOR_MAX}以下で指定してください。`,
        ),
      denominator: z.union([
        z.literal(1),
        z.literal(2),
        z.literal(4),
        z.literal(8),
        z.literal(16),
        z.literal(32),
      ], {
        error: "拍子の分母は1、2、4、8、16、32のいずれかを指定してください。",
      }),
    }),
    pickupBeats: finiteNumber
      .min(0, "アウフタクトの長さは0以上で指定してください。")
      .optional(),
    clef: z.enum(["treble", "bass"], {
      error: "音部記号はtrebleまたはbassで指定してください。",
    }),
    displayRange: displayRangeSchema,
    notes: z
      .array(noteSchema)
      .min(1, "音符は1件以上必要です。")
      .max(MAX_NOTES, `音符は${MAX_NOTES}件以下にしてください。`),
  })
  .superRefine((song, context) => {
    const noteIndexesById = new Map<string, number>();
    const pickupBeats = song.pickupBeats ?? 0;

    if (pickupBeats >= song.timeSignature.numerator) {
      context.addIssue({
        code: "custom",
        path: ["pickupBeats"],
        message:
          "アウフタクトの長さは拍子の分子より小さい値にしてください。",
      });
    }

    song.notes.forEach((note, index) => {
      const previousIndex = noteIndexesById.get(note.id);

      if (previousIndex !== undefined) {
        context.addIssue({
          code: "custom",
          path: ["notes", index, "id"],
          message: `音符ID「${note.id}」が重複しています。`,
        });
      } else {
        noteIndexesById.set(note.id, index);
      }

      if (!pitchMatchesSpelling(note.pitch, note.spelling)) {
        context.addIssue({
          code: "custom",
          path: ["notes", index, "spelling"],
          message: `pitchとspellingが同じ実音高を示していません。`,
        });
      }

      const minTime = pickupBeats > 0 ? -pickupBeats : 0;

      if (note.time < minTime) {
        context.addIssue({
          code: "custom",
          path: ["notes", index, "time"],
          message:
            pickupBeats > 0
              ? `アウフタクト付きの曲では開始位置は${minTime}以上で指定してください。`
              : "開始位置は0以上で指定してください。",
        });
      }
    });

    if (song.displayRange.mode !== "fixed") {
      return;
    }

    const { minPitch, maxPitch } = song.displayRange;

    if (minPitch > maxPitch) {
      context.addIssue({
        code: "custom",
        path: ["displayRange", "maxPitch"],
        message: "固定表示範囲のmaxPitchはminPitch以上にしてください。",
      });
      return;
    }

    song.notes.forEach((note, index) => {
      if (note.pitch < minPitch || note.pitch > maxPitch) {
        context.addIssue({
          code: "custom",
          path: ["notes", index, "pitch"],
          message: `音符が固定表示範囲${minPitch}から${maxPitch}の外にあります。`,
        });
      }
    });
  });

export type PitchSpelling = z.infer<typeof pitchSpellingSchema>;
export type SongNote = z.infer<typeof noteSchema>;
export type DisplayRange = z.infer<typeof displayRangeSchema>;
export type Song = z.infer<typeof songSchema>;

export function validateSong(input: unknown): ValidationResult<Song> {
  return validateWithSchema(songSchema, input);
}
