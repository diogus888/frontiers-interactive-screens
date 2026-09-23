#!/usr/bin/env bash
# Launch the hydra Pi sandbox in kiosk Chromium on a Raspberry Pi.
#
#   ./run-pi.sh                       # interactive: panel + HUD, preset 1 at 360p
#   ./run-pi.sh --bench               # auto-run the resolution ladder, then stay up
#   ./run-pi.sh --bench-all           # ladder + stage ablation for all presets (long)
#   ./run-pi.sh "target=pi3"          # low-budget profile (Zero 2 W / Pi 3), ladder to 360p
#   ./run-pi.sh "preset=preset-3&res=270&panel=0"   # any URL query from "Copy link"
#
# Serves this folder over http://localhost:8787 (fetch/loadScript are happier over
# http than file://) and opens Chromium with the GPU flags a Pi 4/5 needs.
set -euo pipefail
cd "$(dirname "$0")"

PORT=8787
QUERY="hud=1&panel=1"
case "${1:-}" in
  --bench)      QUERY="bench=ladder&panel=1" ;;
  --bench-all)  QUERY="bench=both&scope=all&panel=1" ;;
  "")           ;;
  *)            QUERY="$1" ;;
esac

# static server (python3 ships with Raspberry Pi OS)
if ! curl -fs "http://localhost:$PORT/index.html" >/dev/null 2>&1; then
  python3 -m http.server "$PORT" --bind 127.0.0.1 >/dev/null 2>&1 &
  sleep 1
fi

BROWSER=$(command -v chromium || command -v chromium-browser || true)
if [ -z "$BROWSER" ]; then echo "chromium not found (sudo apt install chromium)"; exit 1; fi

# Keep the flags minimal first; add the commented ones one at a time if fps is poor.
exec "$BROWSER" \
  --kiosk --noerrdialogs --disable-infobars --disable-session-crashed-bubble \
  --autoplay-policy=no-user-gesture-required \
  --ignore-gpu-blocklist --enable-gpu-rasterization --enable-zero-copy \
  --disable-features=TranslateUI \
  --check-for-update-interval=31536000 \
  "http://localhost:$PORT/index.html?$QUERY"
  # --use-gl=egl                # try if WebGL reports SwiftShader / llvmpipe in the Device box
  # --enable-features=VaapiVideoDecoder
  # --force-device-scale-factor=1
