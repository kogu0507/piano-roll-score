import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();
const toolPath = path.join(repoRoot, "scripts", "classroom-catalog-tool.mjs");

interface ToolResult {
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
}

function sha256Hex(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function runTool(args: readonly string[]): Promise<ToolResult> {
  return new Promise((resolve) => {
    execFile(
      process.execPath,
      [toolPath, ...args],
      {
        cwd: repoRoot,
        encoding: "utf8",
      },
      (error, stdout, stderr) => {
        const errorWithCode = error as NodeJS.ErrnoException | null;
        const exitCode =
          typeof errorWithCode?.code === "number"
            ? errorWithCode.code
            : error
              ? 1
              : 0;

        resolve({ exitCode, stdout, stderr });
      },
    );
  });
}

async function createTempDir(): Promise<string> {
  return mkdtemp(path.join(os.tmpdir(), "piano-roll-score-classroom-tool-"));
}

async function withTempDir<T>(callback: (tempDir: string) => Promise<T>): Promise<T> {
  const tempDir = await createTempDir();

  try {
    return await callback(tempDir);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

const validSong = {
  schemaVersion: 1,
  id: "lesson-001",
  title: "検証曲",
  bpm: 90,
  timeSignature: { numerator: 4, denominator: 4 },
  clef: "treble",
  displayRange: { mode: "auto" },
  notes: [
    {
      id: "n1",
      pitch: 60,
      spelling: { step: "C", accidental: "natural", octave: 4 },
      time: 0,
      duration: 1,
    },
  ],
};

const validCatalog = {
  schemaVersion: 1,
  catalogType: "classroom",
  classroom: {
    displayName: "デモ教室",
    catalogName: "導入教材",
    updatedAt: "2026-07-10",
  },
  songs: [
    {
      id: "lesson-001",
      title: "検証曲",
      songUrl: "./songs/lesson-001.json",
    },
  ],
};

describe("教室カタログ運用CLI", () => {
  it("教室コードを正規化し、SHA-256のcatalogKeyを出力する", async () => {
    const result = await runTool(["hash", "ＳＡＫＵＲＡ－４８３２"]);
    const expectedHash = sha256Hex("sakura-4832");

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("normalizedCode: sakura-4832");
    expect(result.stdout).toContain(`catalogKey: ${expectedHash}`);
    expect(result.stdout).toContain(
      `/data/piano-roll-score/classroom-catalogs/${expectedHash}/catalog.json`,
    );
  });

  it("雛形フォルダ、catalog.json、songs/README.mdを作成する", async () => {
    await withTempDir(async (tempDir) => {
      const result = await runTool([
        "scaffold",
        "--code",
        "demo-school",
        "--name",
        "デモ教室",
        "--catalog",
        "導入教材",
        "--out",
        tempDir,
      ]);
      const catalogKey = sha256Hex("demo-school");
      const catalogPath = path.join(tempDir, catalogKey, "catalog.json");
      const songsReadmePath = path.join(tempDir, catalogKey, "songs", "README.md");
      const catalog = JSON.parse(await readFile(catalogPath, "utf8")) as unknown;
      const songsReadme = await readFile(songsReadmePath, "utf8");

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain(`catalogKey: ${catalogKey}`);
      expect(catalog).toEqual({
        schemaVersion: 1,
        catalogType: "classroom",
        classroom: {
          displayName: "デモ教室",
          catalogName: "導入教材",
          updatedAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        },
        songs: [],
      });
      expect(songsReadme).toContain("./songs/001.json");
    });
  });

  it("既存のcatalog.jsonを上書きしない", async () => {
    await withTempDir(async (tempDir) => {
      const args = [
        "scaffold",
        "--code",
        "demo-school",
        "--name",
        "デモ教室",
        "--catalog",
        "導入教材",
        "--out",
        tempDir,
      ] as const;

      expect((await runTool(args)).exitCode).toBe(0);
      const result = await runTool(args);

      expect(result.exitCode).not.toBe(0);
      expect(result.stderr).toContain("既に存在します");
    });
  });

  it("正常な空カタログを検証OKにする", async () => {
    await withTempDir(async (tempDir) => {
      await runTool([
        "scaffold",
        "--code",
        "demo-school",
        "--name",
        "デモ教室",
        "--catalog",
        "導入教材",
        "--out",
        tempDir,
      ]);
      const catalogPath = path.join(
        tempDir,
        sha256Hex("demo-school"),
        "catalog.json",
      );
      const result = await runTool(["validate", catalogPath]);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("OK:");
      expect(result.stdout).toContain("songs: 0");
    });
  });

  it("壊れたcatalog.jsonを検証エラーにする", async () => {
    await withTempDir(async (tempDir) => {
      const catalogPath = path.join(tempDir, "catalog.json");
      await writeFile(
        catalogPath,
        JSON.stringify({ schemaVersion: 1, catalogType: "classroom", songs: [] }),
        "utf8",
      );
      const result = await runTool(["validate", catalogPath]);

      expect(result.exitCode).not.toBe(0);
      expect(result.stderr).toContain("ERROR:");
      expect(result.stderr).toContain("classroom");
    });
  });

  it("危険なsongUrlを検証エラーにする", async () => {
    await withTempDir(async (tempDir) => {
      const catalogPath = path.join(tempDir, "catalog.json");
      await writeFile(
        catalogPath,
        JSON.stringify({
          ...validCatalog,
          songs: [
            {
              ...validCatalog.songs[0],
              songUrl: "javascript:alert(1)",
            },
          ],
        }),
        "utf8",
      );
      const result = await runTool(["validate", catalogPath]);

      expect(result.exitCode).not.toBe(0);
      expect(result.stderr).toContain("危険なURLスキーム");
    });
  });

  it("存在する曲JSONを既存楽曲形式として検証する", async () => {
    await withTempDir(async (tempDir) => {
      const songsDir = path.join(tempDir, "songs");
      const catalogPath = path.join(tempDir, "catalog.json");

      await mkdir(songsDir, { recursive: true });
      await writeFile(catalogPath, JSON.stringify(validCatalog), "utf8");
      await writeFile(
        path.join(songsDir, "lesson-001.json"),
        JSON.stringify(validSong),
        "utf8",
      );

      const result = await runTool(["validate", catalogPath]);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("songs: 1");
    });
  });
});
