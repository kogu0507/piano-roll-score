# 教室カタログ作成手順

最終更新日: 2026年7月10日

この資料は、運営側が最初の教室専用カタログを作るための短い手順である。詳細な運用ルールは `docs/classroom-catalog-operations.md`、構想と責任分界は `docs/classroom-catalog-plan.md` を参照する。

## 1. 前提

教室専用カタログは、アプリ本体とは別にサイト側の `/data/` 配下へ置く。

```text
アプリ本体:
/public_html/app/piano-roll-score/

教室専用データ:
/public_html/data/piano-roll-score/classroom-catalogs/{catalogKey}/
```

利用者は、次のようなURLでアプリを開く。

```text
https://seegmund-music-labo.com/app/piano-roll-score/?classroom=教室コード
```

アプリは教室コードを正規化し、SHA-256で `catalogKey` に変換して、次のJSONを探す。

```text
https://seegmund-music-labo.com/data/piano-roll-score/classroom-catalogs/{catalogKey}/catalog.json
```

教室コードは認証ではない。コードやURLを知っている人は開ける可能性があるため、秘密情報、個人情報、権利確認が取れていない教材は置かない。

## 2. 教室コードを決める

例:

```text
kog
```

教室コードは、半角英小文字、数字、ハイフンを推奨する。

## 3. catalogKeyを確認する

```powershell
npm.cmd run classroom:hash -- kog
```

`kog` の現在の出力は次である。

```text
normalizedCode: kog
catalogKey: 6357680cf864aabdefe28b1e7124400f50e419d0ff00855fc26c1d48d9a454d2
catalogUrlPath: /data/piano-roll-score/classroom-catalogs/6357680cf864aabdefe28b1e7124400f50e419d0ff00855fc26c1d48d9a454d2/catalog.json
```

## 4. 雛形を作る

```powershell
npm.cmd run classroom:scaffold -- --code kog --name "運営サンプル教室" --catalog "教室カタログ設定サンプル" --out "C:\Users\kogu0\Documents\seegmund-music-labo-repositorys\public_html\data\piano-roll-score\classroom-catalogs"
```

作成される構造:

```text
C:\Users\kogu0\Documents\seegmund-music-labo-repositorys\public_html\data\piano-roll-score\classroom-catalogs\
  6357680cf864aabdefe28b1e7124400f50e419d0ff00855fc26c1d48d9a454d2\
    catalog.json
    songs\
      README.md
```

既に同じフォルダがある場合、CLIは上書きしない。更新したい場合は、対象パスを確認してから手動で編集する。

## 5. 曲JSONを置く

`songs/` に曲JSONを置く。

例:

```text
songs/
  001.json
  002.json
  006.json
```

既存の内蔵曲を設定サンプルとしてコピーする場合:

```powershell
Copy-Item -LiteralPath "C:\Users\kogu0\Documents\seegmund-music-labo-repositorys\projects\piano-roll-score\public\data\songs\001.json" -Destination "C:\Users\kogu0\Documents\seegmund-music-labo-repositorys\public_html\data\piano-roll-score\classroom-catalogs\6357680cf864aabdefe28b1e7124400f50e419d0ff00855fc26c1d48d9a454d2\songs\001.json" -Force
```

必要な曲数分だけ同様にコピーする。

## 6. catalog.jsonを書く

例:

```json
{
  "schemaVersion": 1,
  "catalogType": "classroom",
  "classroom": {
    "displayName": "運営サンプル教室",
    "catalogName": "教室カタログ設定サンプル",
    "updatedAt": "2026-07-10"
  },
  "songs": [
    {
      "id": "kog-001",
      "title": "メリーさんの羊",
      "description": "教室カタログ設定サンプル。右手導入の確認用。",
      "level": "導入",
      "catalogGroup": "右手導入",
      "songUrl": "./songs/001.json"
    },
    {
      "id": "kog-002",
      "title": "カエルの合唱",
      "description": "教室カタログ設定サンプル。8分音符の連続確認用。",
      "level": "導入",
      "catalogGroup": "右手導入",
      "songUrl": "./songs/002.json"
    },
    {
      "id": "kog-006",
      "title": "聖者の行進",
      "description": "教室カタログ設定サンプル。アウフタクト確認用。",
      "level": "確認",
      "catalogGroup": "リズム確認",
      "songUrl": "./songs/006.json"
    }
  ]
}
```

`songUrl` は `catalog.json` から見た相対パスにする。基本は `./songs/xxx.json` を使う。

カタログ上の `id` と曲JSON内の `id` は一致必須ではない。ただし、運用上は分かりやすいIDを付ける。

## 7. 検証する

```powershell
npm.cmd run classroom:validate -- "C:\Users\kogu0\Documents\seegmund-music-labo-repositorys\public_html\data\piano-roll-score\classroom-catalogs\6357680cf864aabdefe28b1e7124400f50e419d0ff00855fc26c1d48d9a454d2\catalog.json"
```

成功例:

```text
OK: ...\catalog.json
songs: 3
```

エラーが出た場合は、`catalog.json` の形式、`songUrl`、曲JSONの内容を直す。

## 8. ローカル公開環境で確認する

ローカル公開サーバーを起動している場合:

```text
http://127.0.0.1:8765/app/piano-roll-score/?classroom=kog
```

確認すること:

- 教室名が表示される
- カタログ名が表示される
- 曲カードが表示される
- 曲カードの「ピアノ表示」から直接ピアノ表示へ進める
- 曲カードの「スコア表示」から直接スコア表示へ進める
- 必要に応じて「JSONを確認」から曲JSONを確認できる
- スマートフォン幅で横スクロールが出ない

## 9. サーバーへアップロードする

FTPでは、次のフォルダをサーバー側へアップロードする。

```text
ローカル:
C:\Users\kogu0\Documents\seegmund-music-labo-repositorys\public_html\data\piano-roll-score\classroom-catalogs\6357680cf864aabdefe28b1e7124400f50e419d0ff00855fc26c1d48d9a454d2\

サーバー:
/public_html/data/piano-roll-score/classroom-catalogs/6357680cf864aabdefe28b1e7124400f50e419d0ff00855fc26c1d48d9a454d2/
```

アップロード後、公開URLで確認する。

```text
https://seegmund-music-labo.com/app/piano-roll-score/?classroom=kog
```

## 10. 公開停止する場合

該当する `{catalogKey}` フォルダを削除または退避する。

対象を間違えないよう、次を照合してから操作する。

- 教室コード
- catalogKey
- 教室名
- 配置パス

`kog` の場合:

```text
catalogKey:
6357680cf864aabdefe28b1e7124400f50e419d0ff00855fc26c1d48d9a454d2
```

## 11. 注意

- 教室コードは認証ではない。
- 教室コードやURLが漏れた場合、他の人も開ける可能性がある。
- 個人情報を置かない。
- 歌詞を置かない。
- 市販楽譜や教材本の無断転記をしない。
- 著作権確認は教室側または個人利用者側が行う。
- 運営は問題発生時に公開停止できる。
