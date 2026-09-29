# Opening this project on the Mac

This project was built on Windows (TouchDesigner 2025.33230) and is shared with a Mac
through Dropbox, not only git. Dropbox syncs gitignored folders too (`.venv/`,
`.embody/`, `.mcp.json`, `logs/`), so machine-specific files from one OS land on the
other. Read this whenever the session is running on macOS (`uname` returns `Darwin`).

Status as of 2026-09-28: the Mac fix below has not been confirmed on the Mac yet. When
you learn the outcome, update this file.

## Known problem: the .toe hangs at 99% loading on the Mac

A new TD file made on Windows opens fine on the Mac, and removing the Envoy COMP from
this file did not help. The prime suspect is `TDPyEnvManagerContext.yaml` beside the
.toe. TD reads it before the network loads, with or without Embody in the file. It
activates `.venv/`, and that venv is a Windows one (`pyvenv.cfg` has
`home = C:\Program Files\Derivative\...`, binaries in `Scripts/`).

Try in this order, one change at a time, and ask the user what happened after each:

1. Move `TDPyEnvManagerContext.yaml` out of the folder, or set `active: false` in it,
   then open the .toe. (On 2026-09-28 it already showed as deleted in git status, so
   check whether it exists before assuming.)
2. Make `Hydra/clips-all.mov` (741 MB, Git LFS in the repo) available offline. All seven
   Movie File In TOPs (`/project1/base1/movie_u01..07`) open it on load.
3. On Windows, save a copy with `/project1/base1/webrender1` (Web Render TOP, loads
   `http://localhost:8080/split?...`) and `/project1/base1/midiin_apc` (MIDI In CHOP,
   APC mini) turned off, and open that copy on the Mac.

No hardcoded Windows paths were found in operator parameters. The Window COMPs
(`window_u01..07`, `/perform`) are not set to open on start.

## Known problem: crash after 1-2 hours on the Mac (reported 2026-09-28)

A Mac user reported a crash every 1-2 hours. The one crash report (TD 2025.33230, macOS
26.5.2, Apple Silicon, 2h19m uptime) was heap corruption (`BUG IN CLIENT OF LIBMALLOC:
memory corruption of free block`), caught in TD's movie reader threads (`libMV`/`libNV`)
while three sibling threads were decoding PNGs. At the time the players swapped
PNG-sequence folders every 5-10 s (~1,000 open/close cycles per 2 h). On 2026-09-29 that
was replaced: all clips are one HAP movie that stays open, and `clip_switcher` only moves
the frame index (see README, Clips). Not yet confirmed on the Mac. If it still crashes,
ask for the new `.ips` files from `~/Library/Logs/DiagnosticReports/` and compare the
faulting thread's libraries.

## Shared machine files: do not break the Windows side

- **`.mcp.json`** points Envoy's bridge at `C:/.../.venv/Scripts/python.exe`, so Envoy
  MCP tools will not connect from the Mac until Envoy regenerates it there. Envoy
  rewrites it on startup, and Dropbox then syncs the Mac version back to Windows. Warn
  the user about this before relying on it. Each machine may need Envoy restarted when
  switching back.
- **`.venv/`** is Windows-built. Do not delete or rebuild it without asking. A Mac rebuild
  syncs to Windows through Dropbox and breaks it there. If a Mac venv is needed,
  discuss a separate location with the user first.
- **`TDPyEnvManagerContext.yaml`**: same issue. Changes made on the Mac reach Windows.

## Hydra preset server on the Mac

- Start it with `Start Hydra server (Mac).command` (Windows uses
  `Start Hydra server (Windows).bat`). It serves `Hydra/serve-presets.mjs` on port 8080.
- Node.js must be installed on the Mac itself (nodejs.org or `brew install node`).
  The server uses only Node built-ins, so it needs no `npm install`.
  Done 2026-09-28: this Mac has no Homebrew, so Node v24.21.0 LTS was installed via
  nvm (`~/.nvm`, default alias `lts/*`); the .command script sources nvm. Server
  verified serving on :8080.
- First run: `chmod +x "Start Hydra server (Mac).command"`. Dropbox does not carry the
  executable bit from Windows. If macOS blocks it, right-click and choose Open.
- `Hydra/hydra/node_modules` was installed on Windows (esbuild ships per-platform
  binaries). Only if rebuilding the hydra library on the Mac: delete it and run
  `npm install` in `Hydra/hydra`. That folder is gitignored but Dropbox-synced, so the
  Windows side then needs its own reinstall. Ask first.
- `Hydra/tools/render-clips.mjs` only looks for Chrome in Windows paths. On the Mac, set
  `CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"`. It also
  loads puppeteer-core from the Frontiers app folder, which must exist on the Mac.

## Other context

- `README.md` covers the normal workflow: the Hydra server, MIDI controls, and the
  ScreenMap mapping tool.
- Claude's per-machine memory from the Windows sessions does not carry over to the
  Mac, because it is keyed to the Windows folder path. This file is the handover.
