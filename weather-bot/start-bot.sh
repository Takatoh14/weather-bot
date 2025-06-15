#!/bin/bash

export TZ=Asia/Tokyo
SHELL=/bin/bash
PATH=/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin

cd /Users/takatotanabe/Desktop/開発/weather-bot/weather-bot || exit 1

# 絶対パスでログファイル指定
LOG_FILE="/Users/takatotanabe/Desktop/開発/weather-bot/weather-bot/log.txt"

# 環境変数読み込み（失敗時の安全処理込み）
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
else
  echo "[`date`] ❌ .envファイルが見つかりません" >> "$LOG_FILE"
  exit 1
fi

# 起動ログ出力
echo "[`date '+%Y-%m-%d %H:%M:%S'`] 🚀 cronでBot起動中..." >> "$LOG_FILE"

/usr/local/bin/node index.js >> "$LOG_FILE" 2>&1 &
