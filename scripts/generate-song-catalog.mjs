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
  const groups = [];

  index.songs.forEach((song) => {
    const groupName = song.catalogGroup || "未分類";
    const currentGroup = groups.find((group) => group.name === groupName);

    if (currentGroup) {
      currentGroup.songs.push(song);
      return;
    }

    groups.push({ name: groupName, songs: [song] });
  });

  const sections = groups
    .map((group, groupIndex) => {
      const sectionId = `catalog-group-${groupIndex + 1}`;
      const cards = group.songs
        .map((song) => {
          const groupName = song.catalogGroup || "未分類";
          const isVisibleInHome = song.visibleInHome !== false;
          const homeStatus = isVisibleInHome ? "ホーム表示" : "カタログのみ";
          const relativeHref = `./?id=${encodeURIComponent(song.id)}`;
          const absoluteUrl = `${baseUrl}?id=${encodeURIComponent(song.id)}`;

          return `          <article class="song-card" data-song-id="${escapeHtml(song.id)}" data-visible-in-home="${String(isVisibleInHome)}">
            <div class="song-card__header">
              <p class="song-card__id">ID <code>${escapeHtml(song.id)}</code></p>
              <h3 class="song-card__title">${escapeHtml(song.title)}</h3>
            </div>
            <div class="song-card__badges" aria-label="曲の分類">
              <span class="song-card__badge">${escapeHtml(groupName)}</span>
              <span class="song-card__badge">${escapeHtml(song.level)}</span>
              <span class="song-card__badge ${isVisibleInHome ? "song-card__badge--home" : "song-card__badge--catalog-only"}">${homeStatus}</span>
            </div>
            <p class="song-card__description">${escapeHtml(song.description)}</p>
            <div class="song-card__actions">
              <a class="open-link" href="${relativeHref}">開く</a>
            </div>
            <details class="direct-url">
              <summary>直接URL例</summary>
              <code>${escapeHtml(absoluteUrl)}</code>
            </details>
          </article>`;
        })
        .join("\n");

      return `      <section class="catalog-section" data-catalog-group="${escapeHtml(group.name)}" aria-labelledby="${sectionId}">
        <h2 id="${sectionId}" class="catalog-section__title">${escapeHtml(group.name)}</h2>
        <div class="catalog-card-list">
${cards}
        </div>
      </section>`;
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
        max-width: 1120px;
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

      .catalog-sections {
        display: grid;
        gap: 28px;
      }

      .catalog-section {
        display: grid;
        gap: 14px;
      }

      .catalog-section__title {
        margin: 0;
        padding: 0 0 8px;
        color: #173123;
        border-bottom: 2px solid #d8d1c4;
        font-size: clamp(1.2rem, 3vw, 1.5rem);
      }

      .catalog-card-list {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(min(100%, 18rem), 1fr));
        gap: 16px;
      }

      .song-card {
        display: flex;
        flex-direction: column;
        min-width: 0;
        min-height: 100%;
        padding: 18px;
        border: 1px solid #d8d1c4;
        border-radius: 14px;
        background: #fffdf8;
      }

      .song-card__header {
        display: grid;
        gap: 6px;
      }

      .song-card__id {
        margin: 0;
        color: #647067;
        font-size: 0.9rem;
        font-weight: 700;
      }

      .song-card__title {
        margin: 0;
        font-size: 1.25rem;
        line-height: 1.35;
      }

      .song-card__badges {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin: 14px 0 0;
      }

      .song-card__badge {
        display: inline-flex;
        align-items: center;
        min-height: 28px;
        padding: 4px 9px;
        color: #35443b;
        background: #edf3ee;
        border: 1px solid #d7e0d9;
        border-radius: 999px;
        font-size: 0.84rem;
        font-weight: 700;
      }

      .song-card__badge--home {
        color: #1f513a;
        background: #e7f5ec;
        border-color: #b7d9c3;
      }

      .song-card__badge--catalog-only {
        color: #59431b;
        background: #f7ecd8;
        border-color: #e3cda5;
      }

      .song-card__description {
        margin: 14px 0 18px;
        overflow-wrap: anywhere;
      }

      .song-card__actions {
        margin-top: auto;
      }

      .open-link {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 42px;
        min-width: 7rem;
        padding: 9px 16px;
        color: #ffffff;
        background: #286345;
        border: 1px solid #286345;
        border-radius: 10px;
        font-weight: 800;
        text-decoration: none;
      }

      .open-link:hover {
        background: #1f5238;
      }

      .direct-url {
        margin-top: 14px;
        color: #405148;
      }

      .direct-url summary {
        cursor: pointer;
        font-weight: 700;
      }

      .direct-url code {
        display: block;
        margin-top: 8px;
        padding: 10px;
        overflow-wrap: anywhere;
        background: #f4efe5;
        border-radius: 10px;
      }

      a {
        color: #125c64;
        font-weight: 700;
      }

      code {
        overflow-wrap: anywhere;
      }

      @media (max-width: 520px) {
        main {
          padding: 20px 12px 32px;
        }

        .catalog-nav {
          align-items: flex-start;
          flex-direction: column;
        }

        .home-link,
        .open-link {
          width: 100%;
          box-sizing: border-box;
        }

        .song-card {
          padding: 16px;
        }
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
        内蔵サンプル曲と教材を探して開くための一覧です。リンク本体はローカル環境でも公開後でも動く相対リンクです。
      </p>
      <div class="catalog-sections">
${sections}
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
