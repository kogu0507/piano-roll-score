#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { z } from "zod";

const productionCatalogRoot = "/data/piano-roll-score/classroom-catalogs";
const classroomCodePattern = /^[a-z0-9-]+$/;
const hyphenLikePattern = /[\u2010-\u2015\u2212\u30fc\uff0d]/g;
const allowedRemoteProtocols = new Set(["http:", "https:"]);
const dangerousProtocols = new Set(["javascript:", "data:", "file:"]);
const midiMin = 21;
const midiMax = 108;
const bpmMin = 20;
const bpmMax = 300;
const maxNotes = 5_000;
const internalIdPattern = /^[A-Za-z0-9_-]+$/;
const musicalSteps = ["A", "B", "C", "D", "E", "F", "G"];
const accidentals = ["natural", "sharp", "flat"];
const naturalSemitones = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};
const accidentalOffsets = {
  natural: 0,
  sharp: 1,
  flat: -1,
};

class CliError extends Error {
  constructor(message, exitCode = 1) {
    super(message);
    this.exitCode = exitCode;
  }
}

const finiteNumber = z.number().finite("有限の数値を指定してください。");
const nonEmptyText = z.string().trim().min(1, "空文字は指定できません。");

const classroomCatalogSongSchema = z.object({
  id: nonEmptyText,
  title: nonEmptyText,
  description: z.string().optional(),
  level: z.string().optional(),
  catalogGroup: z.string().optional(),
  songUrl: nonEmptyText,
});

const classroomCatalogSchema = z
  .object({
    schemaVersion: z.literal(1),
    catalogType: z.literal("classroom"),
    classroom: z.object({
      displayName: nonEmptyText,
      catalogName: nonEmptyText,
      updatedAt: z.string().optional(),
    }),
    songs: z.array(classroomCatalogSongSchema),
  })
  .superRefine((catalog, context) => {
    const knownIds = new Set();

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

const pitchSpellingSchema = z.object({
  step: z.enum(musicalSteps),
  accidental: z.enum(accidentals),
  octave: z.number().int("オクターブは整数で指定してください。"),
});

const noteSchema = z.object({
  id: nonEmptyText,
  pitch: z
    .number()
    .int("MIDI番号は整数で指定してください。")
    .min(midiMin, `MIDI番号は${midiMin}以上で指定してください。`)
    .max(midiMax, `MIDI番号は${midiMax}以下で指定してください。`),
  spelling: pitchSpellingSchema,
  hand: z.enum(["right", "left", "unspecified"]).optional(),
  finger: z
    .number()
    .int("指番号は整数で指定してください。")
    .min(1, "指番号は1以上で指定してください。")
    .max(5, "指番号は5以下で指定してください。")
    .optional(),
  time: finiteNumber,
  duration: finiteNumber.positive("音の長さは0より大きくしてください。"),
});

const displayRangeSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("auto"),
  }),
  z.object({
    mode: z.literal("fixed"),
    minPitch: z
      .number()
      .int()
      .min(midiMin)
      .max(midiMax),
    maxPitch: z
      .number()
      .int()
      .min(midiMin)
      .max(midiMax),
  }),
]);

const songSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: z
      .string()
      .regex(
        internalIdPattern,
        "IDには英数字、ハイフン、アンダースコアだけを使用できます。",
      )
      .optional(),
    title: nonEmptyText,
    description: z.string().optional(),
    bpm: finiteNumber
      .min(bpmMin, `BPMは${bpmMin}以上で指定してください。`)
      .max(bpmMax, `BPMは${bpmMax}以下で指定してください。`),
    timeSignature: z.object({
      numerator: z
        .number()
        .int("拍子の分子は整数で指定してください。")
        .min(1, "拍子の分子は1以上で指定してください。")
        .max(32, "拍子の分子は32以下で指定してください。"),
      denominator: z.union([
        z.literal(1),
        z.literal(2),
        z.literal(4),
        z.literal(8),
        z.literal(16),
        z.literal(32),
      ]),
    }),
    pickupBeats: finiteNumber
      .min(0, "アウフタクトの長さは0以上で指定してください。")
      .optional(),
    clef: z.enum(["treble", "bass"]),
    displayRange: displayRangeSchema,
    notes: z
      .array(noteSchema)
      .min(1, "音符は1件以上必要です。")
      .max(maxNotes, `音符は${maxNotes}件以下にしてください。`),
  })
  .superRefine((song, context) => {
    const noteIndexesById = new Map();
    const pickupBeats = song.pickupBeats ?? 0;

    if (pickupBeats >= song.timeSignature.numerator) {
      context.addIssue({
        code: "custom",
        path: ["pickupBeats"],
        message: "アウフタクトの長さは拍子の分子より小さい値にしてください。",
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
          message: "pitchとspellingが同じ実音高を示していません。",
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

function pitchMatchesSpelling(pitch, spelling) {
  const midiPitch =
    (spelling.octave + 1) * 12 +
    naturalSemitones[spelling.step] +
    accidentalOffsets[spelling.accidental];

  return pitch === midiPitch;
}

export function normalizeClassroomCodeForTool(rawCode) {
  const normalized = String(rawCode)
    .trim()
    .normalize("NFKC")
    .replace(hyphenLikePattern, "-")
    .toLowerCase();

  if (normalized.length === 0) {
    throw new CliError("教室コードを入力してください。");
  }

  if (!classroomCodePattern.test(normalized)) {
    throw new CliError(
      "教室コードに使える文字は、半角英小文字、数字、ハイフンだけです。",
    );
  }

  return normalized;
}

export function hashClassroomCodeForTool(normalizedCode) {
  return createHash("sha256").update(normalizedCode, "utf8").digest("hex");
}

export function buildCatalogUrlPath(catalogKey) {
  return `${productionCatalogRoot}/${catalogKey}/catalog.json`;
}

export function resolveClassroomCodeForTool(rawCode) {
  const normalizedCode = normalizeClassroomCodeForTool(rawCode);
  const catalogKey = hashClassroomCodeForTool(normalizedCode);

  return {
    normalizedCode,
    catalogKey,
    catalogUrlPath: buildCatalogUrlPath(catalogKey),
  };
}

function formatZodIssues(error, prefix = "") {
  return error.issues.map((issue) => {
    const pathText = issue.path.length > 0 ? issue.path.join(".") : "(root)";
    const path = prefix ? `${prefix}.${pathText}` : pathText;

    return `${path}: ${issue.message}`;
  });
}

function parseOptions(args) {
  const options = new Map();
  const positional = [];

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (!arg.startsWith("--")) {
      positional.push(arg);
      continue;
    }

    const key = arg.slice(2);
    const value = args[index + 1];

    if (!key || value === undefined || value.startsWith("--")) {
      throw new CliError(`--${key} の値を指定してください。`);
    }

    options.set(key, value);
    index += 1;
  }

  return { options, positional };
}

function requireOption(options, key) {
  const value = options.get(key);

  if (value === undefined || value.trim().length === 0) {
    throw new CliError(`--${key} を指定してください。`);
  }

  return value;
}

function currentDateString(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

function songsReadmeContent() {
  return `# songs

このフォルダに、この教室カタログで使う曲JSONを置きます。

- catalog.json の \`songs[].songUrl\` は \`./songs/001.json\` のように指定してください。
- 曲JSONは piano-roll-score の既存楽曲スキーマに通る必要があります。
- 個人情報、秘密情報、権利確認が取れていない教材は置かないでください。
`;
}

export async function scaffoldClassroomCatalog({
  code,
  displayName,
  catalogName,
  outDir,
  now = new Date(),
}) {
  const resolvedCode = resolveClassroomCodeForTool(code);
  const outputRoot = path.resolve(outDir);
  const targetDir = path.join(outputRoot, resolvedCode.catalogKey);
  const catalogPath = path.join(targetDir, "catalog.json");
  const songsDir = path.join(targetDir, "songs");
  const songsReadmePath = path.join(songsDir, "README.md");

  if (existsSync(targetDir)) {
    throw new CliError(`作成先フォルダが既に存在します: ${targetDir}`);
  }

  if (existsSync(catalogPath)) {
    throw new CliError(`catalog.json が既に存在します: ${catalogPath}`);
  }

  const catalog = {
    schemaVersion: 1,
    catalogType: "classroom",
    classroom: {
      displayName,
      catalogName,
      updatedAt: currentDateString(now),
    },
    songs: [],
  };

  await mkdir(songsDir, { recursive: true });
  await writeFile(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");
  await writeFile(songsReadmePath, songsReadmeContent(), "utf8");

  return {
    ...resolvedCode,
    outputRoot,
    targetDir,
    catalogPath,
    songsDir,
    songsReadmePath,
  };
}

function explicitProtocol(rawUrl) {
  const match = /^[a-zA-Z][a-zA-Z\d+.-]*:/.exec(rawUrl.trim());

  return match?.[0].toLowerCase();
}

function isPathInside(parent, child) {
  const relative = path.relative(parent, child);

  return relative.length === 0 || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

async function readJsonFile(filePath, label) {
  let text;

  try {
    text = await readFile(filePath, "utf8");
  } catch (error) {
    throw new CliError(`${label} を読み込めません: ${error.message}`);
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    throw new CliError(`${label} はJSONとして解析できません: ${error.message}`);
  }
}

async function validateExistingSongJson(songFilePath, errorPrefix) {
  let songJson;

  try {
    songJson = await readJsonFile(songFilePath, `${errorPrefix} の曲JSON`);
  } catch (error) {
    return [error instanceof Error ? error.message : String(error)];
  }

  const result = songSchema.safeParse(songJson);

  if (result.success) {
    return [];
  }

  return formatZodIssues(result.error, `${errorPrefix}.songJson`);
}

async function resolveAndValidateSongUrl(song, catalogPath, catalogDir, index) {
  const errors = [];
  const warnings = [];
  const rawSongUrl = song.songUrl.trim();
  const protocol = explicitProtocol(rawSongUrl);
  const pathPrefix = `songs.${index}.songUrl`;

  if (protocol !== undefined) {
    if (dangerousProtocols.has(protocol)) {
      return {
        errors: [`${pathPrefix}: 危険なURLスキームは使用できません: ${protocol}`],
        warnings,
      };
    }

    if (!allowedRemoteProtocols.has(protocol)) {
      return {
        errors: [`${pathPrefix}: songUrlはhttp、https、相対URLだけを使用できます。`],
        warnings,
      };
    }

    warnings.push(
      `${pathPrefix}: リモート曲JSONの存在確認と楽曲スキーマ検証はスキップしました。`,
    );

    return { errors, warnings };
  }

  let resolvedUrl;

  try {
    resolvedUrl = new URL(rawSongUrl, pathToFileURL(catalogPath));
  } catch (error) {
    return {
      errors: [`${pathPrefix}: songUrlを解決できません: ${error.message}`],
      warnings,
    };
  }

  if (resolvedUrl.protocol !== "file:") {
    return {
      errors: [`${pathPrefix}: ローカル相対URLとして解決できません。`],
      warnings,
    };
  }

  const songFilePath = fileURLToPath(resolvedUrl);

  if (!isPathInside(catalogDir, songFilePath)) {
    errors.push(
      `${pathPrefix}: production運用ではcatalog.jsonと同じ教室フォルダ配下の曲JSONを参照してください。`,
    );
    return { errors, warnings };
  }

  if (!existsSync(songFilePath)) {
    errors.push(`${pathPrefix}: 曲JSONが見つかりません: ${songFilePath}`);
    return { errors, warnings };
  }

  const songFileStat = await stat(songFilePath);

  if (!songFileStat.isFile()) {
    errors.push(`${pathPrefix}: 曲JSONはファイルを指定してください: ${songFilePath}`);
    return { errors, warnings };
  }

  errors.push(
    ...(await validateExistingSongJson(songFilePath, `songs.${index}`)),
  );

  return { errors, warnings };
}

export async function validateClassroomCatalogFile(catalogFilePath) {
  const catalogPath = path.resolve(catalogFilePath);
  const catalogDir = path.dirname(catalogPath);
  const errors = [];
  const warnings = [];

  if (!existsSync(catalogPath)) {
    return {
      ok: false,
      catalogPath,
      errors: [`catalog.json が見つかりません: ${catalogPath}`],
      warnings,
    };
  }

  let catalogJson;

  try {
    catalogJson = await readJsonFile(catalogPath, "catalog.json");
  } catch (error) {
    return {
      ok: false,
      catalogPath,
      errors: [error.message],
      warnings,
    };
  }

  const catalogResult = classroomCatalogSchema.safeParse(catalogJson);

  if (!catalogResult.success) {
    return {
      ok: false,
      catalogPath,
      errors: formatZodIssues(catalogResult.error),
      warnings,
    };
  }

  for (const [index, song] of catalogResult.data.songs.entries()) {
    const result = await resolveAndValidateSongUrl(
      song,
      catalogPath,
      catalogDir,
      index,
    );

    errors.push(...result.errors);
    warnings.push(...result.warnings);
  }

  return {
    ok: errors.length === 0,
    catalogPath,
    catalog: catalogResult.data,
    errors,
    warnings,
  };
}

async function commandHash(args) {
  if (args.length !== 1) {
    throw new CliError("使用方法: npm.cmd run classroom:hash -- <教室コード>");
  }

  const result = resolveClassroomCodeForTool(args[0]);

  console.log(`normalizedCode: ${result.normalizedCode}`);
  console.log(`catalogKey: ${result.catalogKey}`);
  console.log(`catalogUrlPath: ${result.catalogUrlPath}`);
}

async function commandScaffold(args) {
  const { options, positional } = parseOptions(args);

  if (positional.length > 0) {
    throw new CliError("scaffold では位置引数を使用しません。");
  }

  const result = await scaffoldClassroomCatalog({
    code: requireOption(options, "code"),
    displayName: requireOption(options, "name"),
    catalogName: requireOption(options, "catalog"),
    outDir: requireOption(options, "out"),
  });

  console.log(`normalizedCode: ${result.normalizedCode}`);
  console.log(`catalogKey: ${result.catalogKey}`);
  console.log(`catalogUrlPath: ${result.catalogUrlPath}`);
  console.log(`created: ${result.targetDir}`);
  console.log(`catalog: ${result.catalogPath}`);
  console.log(`songs: ${result.songsDir}`);
}

async function commandValidate(args) {
  if (args.length !== 1) {
    throw new CliError("使用方法: npm.cmd run classroom:validate -- <catalog.json>");
  }

  const result = await validateClassroomCatalogFile(args[0]);

  for (const warning of result.warnings) {
    console.warn(`WARNING: ${warning}`);
  }

  if (!result.ok) {
    for (const error of result.errors) {
      console.error(`ERROR: ${error}`);
    }
    throw new CliError(`教室カタログ検証に失敗しました: ${result.catalogPath}`);
  }

  const songCount = result.catalog?.songs.length ?? 0;

  console.log(`OK: ${result.catalogPath}`);
  console.log(`songs: ${songCount}`);
}

async function main(args) {
  const [command, ...rest] = args;

  switch (command) {
    case "hash":
      await commandHash(rest);
      return;
    case "scaffold":
      await commandScaffold(rest);
      return;
    case "validate":
      await commandValidate(rest);
      return;
    default:
      throw new CliError(
        [
          "使用方法:",
          "  npm.cmd run classroom:hash -- <教室コード>",
          "  npm.cmd run classroom:scaffold -- --code <教室コード> --name <教室名> --catalog <カタログ名> --out <出力先>",
          "  npm.cmd run classroom:validate -- <catalog.json>",
        ].join("\n"),
        command === undefined ? 0 : 1,
      );
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode =
      error instanceof CliError && typeof error.exitCode === "number"
        ? error.exitCode
        : 1;
  });
}
