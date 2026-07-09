import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const defaultPublicBaseUrl =
  "https://seegmund-music-labo.com/app/piano-roll-score/";

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function ensureTrailingSlash(value) {
  return value.endsWith("/") ? value : `${value}/`;
}

function assertSongIndex(index) {
  if (index === null || typeof index !== "object" || !Array.isArray(index.songs)) {
    throw new Error("public/data/songs/index.json の形式が正しくありません。");
  }
}

export function generateSongCatalogHtml(
  index,
  { publicBaseUrl = defaultPublicBaseUrl } = {},
) {
  assertSongIndex(index);
  const baseUrl = ensureTrailingSlash(publicBaseUrl);
  let currentGroup = "";
  const rows = index.songs
    .map((song) => {
      const group = song.catalogGroup || "未分類";
      const isVisibleInHome = song.visibleInHome !== false;
      const relativeHref = `./?id=${encodeURIComponent(song.id)}`;
      const absoluteUrl = `${baseUrl}?id=${encodeURIComponent(song.id)}`;
      const groupRow =
        group === currentGroup
          ? ""
          : `        <tr class="catalog-group" data-catalog-group="${escapeHtml(group)}">
          <th colspan="8">${escapeHtml(group)}</th>
        </tr>
`;

      currentGroup = group;

      return `${groupRow}        <tr data-song-id="${escapeHtml(song.id)}" data-visible-in-home="${String(isVisibleInHome)}">
          <td><code>${escapeHtml(song.id)}</code></td>
          <td>${escapeHtml(song.title)}</td>
          <td>${escapeHtml(song.description)}</td>
          <td>${escapeHtml(song.level)}</td>
          <td>${escapeHtml(group)}</td>
          <td>${isVisibleInHome ? "表示" : "カタログのみ"}</td>
          <td><a href="${relativeHref}">開く</a></td>
          <td><code>${escapeHtml(absoluteUrl)}</code></td>
        </tr>`;
    })
    .join("\n");

  return `<!doctype html>
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>piano-roll-score 曲一覧</title>
    <style>
      :root {
        color-scheme: light;
        font-family:
          system-ui,
          -apple-system,
          BlinkMacSystemFont,
          "Segoe UI",
          sans-serif;
        color: #1f2933;
        background: #f7f4ed;
      }

      body {
        margin: 0;
      }

      main {
        box-sizing: border-box;
        max-width: 1040px;
        margin: 0 auto;
        padding: 24px 16px 40px;
      }

      h1 {
        margin: 0 0 8px;
        font-size: clamp(1.5rem, 4vw, 2rem);
      }

      p {
        line-height: 1.7;
      }

      .catalog-nav {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        align-items: center;
        justify-content: space-between;
        margin: 0 0 16px;
      }

      .home-link {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 40px;
        padding: 8px 14px;
        color: #173123;
        background: #edf5f0;
        border: 1px solid #a9c4b4;
        border-radius: 10px;
        font-weight: 700;
        text-decoration: none;
      }

      .table-wrap {
        overflow-x: auto;
        border: 1px solid #d8d1c4;
        border-radius: 14px;
        background: #fffdf8;
      }

      table {
        width: 100%;
        min-width: 920px;
        border-collapse: collapse;
      }

      th,
      td {
        padding: 12px 14px;
        border-bottom: 1px solid #e6dfd2;
        text-align: left;
        vertical-align: top;
      }

      th {
        background: #f0e8d8;
        font-weight: 700;
      }

      .catalog-group th {
        background: #e3efe8;
        color: #173123;
        font-size: 1.05rem;
      }

      tr:last-child td {
        border-bottom: 0;
      }

      a {
        color: #125c64;
        font-weight: 700;
      }

      code {
        overflow-wrap: anywhere;
      }
    </style>
  </head>
  <body>
    <main>
      <div class="catalog-nav">
        <h1>piano-roll-score 曲一覧</h1>
        <a class="home-link" href="./">ホームへ戻る</a>
      </div>
      <p>
        内蔵サンプル曲と教材のID、曲名、ホーム表示状態を確認するための一覧です。リンク本体はローカル環境でも公開後でも動く相対リンクです。
      </p>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>曲名</th>
              <th>説明</th>
              <th>level</th>
              <th>グループ</th>
              <th>ホーム表示</th>
              <th>直接開くリンク</th>
              <th>直接URL例</th>
            </tr>
          </thead>
          <tbody>
${rows}
          </tbody>
        </table>
      </div>
    </main>
  </body>
</html>
`;
}

export async function generateSongCatalog({
  root = repoRoot,
  publicBaseUrl = defaultPublicBaseUrl,
} = {}) {
  const indexPath = path.join(root, "public", "data", "songs", "index.json");
  const outputPath = path.join(root, "public", "catalog.html");
  const index = JSON.parse(await readFile(indexPath, "utf8"));
  const html = generateSongCatalogHtml(index, { publicBaseUrl });

  await writeFile(outputPath, html, "utf8");
  return outputPath;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const outputPath = await generateSongCatalog();
  console.log(`generated ${path.relative(repoRoot, outputPath)}`);
}
