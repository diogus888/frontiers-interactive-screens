# Pi feasibility sandbox

A single page (`index.html`) that runs the hydra presets from the parent folder with
a live FPS HUD, toggles for the expensive stages, a resolution ladder, and an
automatic benchmark. The point is to find out, on the actual Raspberry Pi, at which
resolution and with which stages the visuals hold a steady frame rate.

Everything is vendored in `vendor/` (hydra-synth + the four extra shader libs), so
it works offline.

## Run it

Desktop (any OS), from this folder:

```
node ../hydra/node_modules/http-server/bin/http-server . -p 8787 -c-1
# or:  python3 -m http.server 8787
```

then open <http://localhost:8787/>.

Raspberry Pi (Pi OS Bookworm, 64-bit, Chromium):

```
chmod +x run-pi.sh
./run-pi.sh                  # interactive
./run-pi.sh --bench          # runs the resolution ladder for preset 1 automatically
./run-pi.sh --bench-all      # ladder + stage ablation, all presets (about 15 min)
```

Results persist in the browser's localStorage; "Copy CSV" puts them on the clipboard,
or select-all in the text box under the table.

Autostart on the Pi (Wayland / labwc, the Bookworm default): add a line to
`~/.config/labwc/autostart`:

```
/home/pi/sandbox/run-pi.sh "preset=preset-1&res=360&panel=0&hud=0" &
```

For the X11 session use `~/.config/lxsession/LXDE-pi/autostart` with `@` prefix.

## What the controls do

| Control | Effect |
| --- | --- |
| Target device | Applies a starting profile and clamps the benchmark ladder. **low budget (Pi Zero 2 W / Pi 3)**: 180p, lowp, 24 fps cap, all heavy stages off, ladder to 360p. **Pi 4**: 270p, 30 cap, no post, single octave, ladder to 540p. **Pi 5**: 360p full chain, 30 cap, ladder to 720p. Also `?target=pi3` in the URL (`run-pi.sh "target=pi3"`). |
| Render res | Internal canvas size. "360p short side" = 640×360 on a 16:9 screen, 360×640 portrait. CSS scales it to fill the window (crop, like `object-fit: cover`). This is the main lever on a Pi. |
| Precision | GLSL float precision. `lowp` is faster on the VideoCore GPU but may band/flicker. |
| FPS cap | Uses hydra's built-in `fps` setting. A stable 30 usually looks better than a wobbly 45. |
| View stage | Show an intermediate output (o1 merge, o2 colour, …) instead of the final o3. Does not change the cost. |
| pixel sort | Removes the `pysort` / `pxsort` calls (the two heaviest single shaders). |
| green pixels | Removes the whole o5 feedback chain and the final `.layer(greenPixels())`. One pass fewer. |
| post-processing | Replaces the o3 chain with a plain copy of o2 (+ green pixels). Removes 4 noise/osc samples per pixel. |
| layer 3 octaves | Off = keep only the first `unoise` octave instead of 8. |
| smooth upscale | `image-rendering: auto` instead of `pixelated` when the canvas is scaled up. Cosmetic. |
| Shader libs | Local vendored copies (default) or the original CDN URLs. |

Stage toggles work by editing the sketch text before it is evaluated; open
"Sketch source as run" at the bottom of the panel to see exactly what ran.

## Reading the HUD

- **fps page** – how often the browser gives us a frame. This is the number that matters: on a Pi the compositor blocks when the GPU is behind, so it drops below 60 as soon as the frame does not fit.
- **render fps** – frames hydra actually rendered (differs from page fps only with an FPS cap).
- **frame ms avg / max** – wall time between frames; max shows hitches.
- **tick cpu ms** – JavaScript time inside `hydra.tick`. Should be tiny; if it is large the CPU, not the GPU, is the bottleneck.
- **passes · Mpx/frame** – number of full-screen render passes × pixels. Rough GPU-load proxy for comparing settings.
- **startup load / compile** – time to load libs + evaluate the sketch, and the first tick (shader compile). On a Pi expect several seconds for the first frame.
- Sparkline: one bar per frame, green < 20 ms, yellow < 36 ms, red above. Faint lines mark 60 fps and 30 fps.

## Benchmark

- **resolution ladder** – 144p → 1080p (short side), each step 2 s warm-up + N s measuring. The ladder for a preset stops once average fps drops below "Stop ladder below".
- **stage ablation** – at the current resolution: full, no sort, no green, no post, L3 single, all lite. Tells you which stage costs the most.
- Verdict column: ≥55 smooth, ≥27 fine at a 30 cap, ≥14 marginal, else no.
- **Device label** (e.g. "Pi 4 4GB", "Pi 5 8GB") is stamped on every row, so you can run the same benchmark on several Pi models, copy the CSVs and merge them into one comparison. It is remembered per browser.

CSV columns include `low1` (1 % low fps, i.e. 1000 / p99 frame time), `compileMs`
and the user agent, so results from several machines can be merged.

## Keys (for a Pi with only a keyboard)

`P` panel · `H` HUD · `1`–`7` presets · `[` `]` resolution · `S` `G` `O` `L` stage toggles · `R` restart · `F` fullscreen · `B` benchmark start/stop · `Esc` hide panel

## Updating presets

`presets.js` is generated from `../presets/preset-*.js`, `../presets/preset.js` and
`../presets/sketch-814b-no-arrows.js`. After editing any of them:

```
node build-presets.mjs
```

## Low-budget Pi expectations (to be confirmed by the benchmark)

- **Pi Zero 2 W / Pi 3** (VideoCore IV, 512 MB / 1 GB): Chromium alone is heavy here; use the 64-bit Lite OS with a minimal desktop, or `cage` as the kiosk compositor. Realistic target is the lite chain (no sort, no green, no post, single octave) at 180p–270p with a 24 fps cap. The full chain will not run.
- **Pi 4** (VideoCore VI): 270p–360p, 30 fps cap; post-processing is the first stage to cut, pixel sort the second.
- **Pi 5** (VideoCore VII): full chain at 360p should hold 30; probably 540p.

## Notes / known things

- `window.frame` is never defined by the presets, so `() => window.frame++` yields `NaN` every frame. This is how the original preset pages behave too; the sandbox does not change it. (Do not name anything `frame` on the page: the sketches overwrite it.)
- The sandbox drives hydra with `autoLoop: false` and its own `requestAnimationFrame` loop so it can time and tear down cleanly. When the tab is hidden the browser pauses rAF and the HUD reads 0. That is normal.
- Changing preset, resolution, precision, libs or a stage rebuilds the hydra instance (new WebGL context). Changing FPS cap or view stage is applied live.
