#!/bin/bash
# Starts the hydra preset server (Hydra/serve-presets.mjs) on http://localhost:8080
# The TouchDesigner wall (webrender1) loads its /split page from there.
# macOS version of "Start Hydra server (Windows).bat". Double-click it in Finder.
# Close this window (or press Ctrl+C) to stop the server.

cd "$(dirname "$0")/Hydra" || exit 1

# Finder-launched shells can miss Homebrew / nvm paths, so add the usual ones.
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
if [ -s "$HOME/.nvm/nvm.sh" ]; then
    . "$HOME/.nvm/nvm.sh" >/dev/null 2>&1
fi

pause() {
    read -r -n 1 -s -p "Press any key to close this window..."
    echo
}

if ! command -v node >/dev/null 2>&1; then
    echo "Node.js was not found on PATH. Install it from https://nodejs.org and try again."
    pause
    exit 1
fi

if lsof -nP -iTCP:8080 -sTCP:LISTEN >/dev/null 2>&1; then
    echo "Port 8080 is already in use -- the hydra server is probably running already."
    echo "Open http://localhost:8080/ to check. Close the other server first to restart it."
    pause
    exit 1
fi

printf '\033]0;hydra preset server\007'
echo "Starting the hydra preset server on http://localhost:8080/ ..."
echo
node serve-presets.mjs
echo
echo "The server stopped."
pause
