# 教室専用カタログ運用手順

この資料は、運営側が教室専用カタログを作成し、サイト側の `/data/` 配下へ配置するための手順をまとめる。

教室専用データはアプリ本体の `public/` には入れない。本番運用では、アプリのビルド成果物とは別に、サイト側の次の場所へ置く。

```text
/data/piano-roll-score/classroom-catalogs/{catalogKey}/catalog.json
/data/piano-roll-score/classroom-catalogs/{catalogKey}/songs/*.json
```

## 1. 教室コードを決める

教室コードは、先生が生徒へ伝える合言葉である。

推奨形式:

```text
sakura-4832
```

使用できる文字は、アプリ側の第18段階仕様と同じく、正規化後の半角英小文字、数字、ハイフンである。

教室コードは認証ではない。コードまたはURLを知っている人はカタログを開ける可能性があるため、秘密情報、個人情報、権利確認が取れていない教材を置かない。

## 2. catalogKeyを確認する

```text
npm.cmd run classroom:hash -- sakura-4832
```

出力例:

```text
normalizedCode: sakura-4832
catalogKey: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
catalogUrlPath: /data/piano-roll-score/classroom-catalogs/{catalogKey}/catalog.json
```

このCLIは本番運用向けのcatalogKey確認ツールである。アプリ画面側では開発確認用コード `demo` だけをアプリ同梱デモカタログへ特別にマップするが、このCLIでは `demo` も通常の教室コードとしてハッシュ化する。

## 3. 教室フォルダの雛形を作る

出力先は必ず `--out` で明示する。

```text
npm.cmd run classroom:scaffold -- --code sakura-4832 --name "さくらピアノ教室" --catalog "導入教材" --out "C:\Users\kogu0\Documents\seegmund-music-labo-repositorys\public_html\data\piano-roll-score\classroom-catalogs"
```

作成される構造:

```text
{out}/
  {catalogKey}/
    catalog.json
    songs/
      README.md
```

既存の `{catalogKey}` フォルダまたは `catalog.json` は上書きしない。既存データがある場合は、停止、退避、更新の方針を確認してから手動で扱う。

## 4. 曲JSONを置く

`songs/` に曲JSONを置き、`catalog.json` の `songs[].songUrl` は次のように書く。

```json
{
  "id": "lesson-001",
  "title": "導入課題1",
  "description": "右手導入用",
  "level": "導入",
  "catalogGroup": "右手",
  "songUrl": "./songs/lesson-001.json"
}
```

曲JSONは既存の楽曲スキーマに通る必要がある。カタログ上の `songs[].id` と曲JSON内の `id` は、運用上そろえることを推奨するが、検証CLIでは一致必須にはしない。

## 5. 検証する

```text
npm.cmd run classroom:validate -- "C:\Users\kogu0\Documents\seegmund-music-labo-repositorys\public_html\data\piano-roll-score\classroom-catalogs\{catalogKey}\catalog.json"
```

検証内容:

- `catalog.json` が教室カタログスキーマを満たす
- `songs[].songUrl` に危険なURLスキームがない
- 相対 `songUrl` が解決できる
- 同一教室フォルダ配下の曲JSONが存在する
- 存在する曲JSONが既存楽曲スキーマに通る

リモート `http:` / `https:` の `songUrl` は許可するが、ローカルCLIでは存在確認と楽曲スキーマ検証をスキップする。

## 6. ローカル公開URLで確認する

ローカル公開用ディレクトリに配置したら、アプリから次のように開く。

```text
https://<ドメイン>/app/piano-roll-score/?classroom=sakura-4832
```

確認すること:

- 教室名とカタログ名が表示される
- グループごとにカードが表示される
- 曲カードの「ピアノ表示」から直接ピアノ表示へ進める
- 曲カードの「スコア表示」から直接スコア表示へ進める
- 必要に応じて「JSONを確認」から曲JSONを確認できる
- スマートフォン幅で横スクロールが出ない

## 7. FTPで配置する

FTPでは、サーバー側の次に相当する場所へアップロードする。

```text
/public_html/data/piano-roll-score/classroom-catalogs/{catalogKey}/catalog.json
/public_html/data/piano-roll-score/classroom-catalogs/{catalogKey}/songs/*.json
```

アプリ本体の `/public_html/app/piano-roll-score/` とは別管理にする。

古いファイルが残ると不要ファイルが公開され続ける可能性があるため、更新時はアップロード先を確認する。ただし、退避ディレクトリや他教室のフォルダを勝手に削除しない。

## 8. 公開停止

公開停止時は、該当する `{catalogKey}` フォルダを削除または退避する。

停止・削除の対象を間違えないよう、教室名、教室コード、catalogKey、配置パスを照合してから操作する。

運営は、権利上の疑義、規約違反、契約終了、支払い停止などがある場合、該当カタログを停止できる方針とする。

## 9. 設定サンプル

実際の作成手順を短く確認するため、`docs/classroom-catalog-quickstart.md` に `kog` を例にした設定サンプル手順を置く。

`kog` は教室コードであり、フォルダ名ではない。実際のフォルダ名は、次のSHA-256 catalogKeyである。

```text
6357680cf864aabdefe28b1e7124400f50e419d0ff00855fc26c1d48d9a454d2
```

ローカル公開用ディレクトリでは、次のURLで確認できる。

```text
http://127.0.0.1:8765/app/piano-roll-score/?classroom=kog
```
