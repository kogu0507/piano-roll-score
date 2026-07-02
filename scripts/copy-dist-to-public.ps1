$ErrorActionPreference = "Stop"

$expectedTarget = "C:\Users\kogu0\Documents\seegmund-music-labo-repositorys\public_html\app\piano-roll-score"
$repoRoot = Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")
$distPath = Join-Path $repoRoot "dist"

if (-not (Test-Path -LiteralPath (Join-Path $distPath "index.html"))) {
  throw "dist/index.html が見つかりません。先に npm.cmd run build を実行してください。"
}

$targetParent = Split-Path -Parent $expectedTarget
if (-not (Test-Path -LiteralPath $targetParent)) {
  throw "公開先の親ディレクトリが見つかりません: $targetParent"
}

if (-not (Test-Path -LiteralPath $expectedTarget)) {
  New-Item -ItemType Directory -Path $expectedTarget | Out-Null
}

$resolvedTarget = (Resolve-Path -LiteralPath $expectedTarget).Path
if ($resolvedTarget -ne $expectedTarget) {
  throw "想定外のコピー先です: $resolvedTarget"
}

Get-ChildItem -LiteralPath $distPath -Force | ForEach-Object {
  Copy-Item -LiteralPath $_.FullName -Destination $resolvedTarget -Recurse -Force
}

Write-Output "COPIED_DIST_TO=$resolvedTarget"
Write-Output "古いファイルの削除は行っていません。不要ファイルがある場合は、削除対象を確認してから手動で整理してください。"
