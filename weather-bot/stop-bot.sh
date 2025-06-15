#!/bin/bash
export TZ=Asia/Tokyo
SHELL=/bin/bash

cd /Users/takatotanabe/Desktop/開発/weather-bot/weather-bot
LOG_FILE="log.txt"

echo "[`date '+%Y-%m-%d %H:%M:%S'`] 🛑 Botを停止します。" >> "$LOG_FILE"

# プロセス停止
pkill -f "index.js"

echo "[`date '+%Y-%m-%d %H:%M:%S'`] ✅ Botのプロセスを停止しました。" >> "$LOG_FILE"
