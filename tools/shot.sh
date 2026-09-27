#!/usr/bin/env bash
# 无头截图入口。macOS 没有 timeout(1)，Chrome 又不会自己退出 —— 起后台、跑 CDP、再杀掉。
#
#   tools/shot.sh <url> <out.png> [width] [height]
set -u
URL="${1:?usage: shot.sh <url> <out.png> [w] [h]}"
OUT="${2:?usage: shot.sh <url> <out.png> [w] [h]}"
W="${3:-1680}"
H="${4:-1000}"
PORT=$((9300 + RANDOM % 400))
PROFILE="$(mktemp -d /tmp/chrome-shot-XXXXXX)"

"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless=new --no-sandbox --enable-unsafe-swiftshader --hide-scrollbars \
  --user-data-dir="$PROFILE" --remote-debugging-port="$PORT" \
  --window-size="${W},${H}" about:blank >/dev/null 2>&1 &
PID=$!

node "$(dirname "$0")/shot.mjs" "$URL" "$OUT" "$W" "$H" "$PORT"
RC=$?

kill "$PID" 2>/dev/null
pkill -f "$PROFILE" 2>/dev/null
rm -rf "$PROFILE"
exit $RC
