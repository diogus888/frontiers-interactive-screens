# Frontiers Interactive Screens

TouchDesigner project for the Frontiers screen wall. Three interactive screens run
live [hydra](https://hydra.ojack.xyz/) sketches served from a local Node server and
played through a Web Render TOP; an Akai APC mini mk2 drives the sketches over MIDI.
The seven non-interactive screens play pre-rendered clips from `Hydra/clips/`.

## Requirements

- Windows, TouchDesigner 2025+
- [Node.js](https://nodejs.org) on the PATH (the preset server and the tools are plain Node, no `npm install` needed)
- Google Chrome (only for previewing sketches outside TouchDesigner and for rendering clips)
- Akai APC mini mk2 on USB

## 1. Start the hydra server

Double-click **`Start Hydra server.bat`** in this folder.

It opens a console window, checks that Node is installed and that port 8080 is free,
then runs `Hydra/serve-presets.mjs`. The server is up when the window says
`Starting the hydra preset server on http://localhost:8080/`.

- Keep the window open. Closing it (or Ctrl+C) stops the server.
- If it says port 8080 is already in use, the server is probably already running.
  Open <http://localhost:8080/> to check.
- If you just closed a server and the new one fails right away, the port was still
  releasing. Run the .bat again.
- The server re-reads a sketch file on every request, so after editing a preset you only
  need to reload the page. Changes to `serve-presets.mjs` itself need a restart.

The page TouchDesigner loads once it runs (three panes stacked vertically):

```
http://localhost:8080/split?a=main-1&b=main-2&c=main-3&dir=v&scale=0.5&stagger=0
```

## 2. Open the TouchDesigner project

Open `Interactive Screens.toe`. The Web Render TOP `webrender1` loads the split URL above
and the crops feed the three interactive screens. Start the hydra server **before**
opening the .toe, or reload the Web Render TOP afterwards.

## 3. MIDI setup (APC mini mk2)

The sketches read the faders through `Hydra/lib/midi.js`. The embedded Chromium inside a Web Render TOP has no MIDI permission dialog, so Web MIDI
never works there. TouchDesigner reads the controller itself and pushes the values into
the page:

1. Plug in the APC mini mk2 before launching TouchDesigner.
2. In TouchDesigner open **Dialogs > MIDI Device Mapper** and check that the APC mini mk2
   is listed as device **1** (the `midiin_apc` MIDI In CHOP uses device id 1).
3. Make sure no Chrome tab with a hydra page is open. If Chrome holds the MIDI port,
   TouchDesigner receives nothing.
4. Move a fader. The `midi_to_web` CHOP Execute DAT forwards every change to the page
   with `midi.set(...)`, and the split page relays it to all three panes.

If you reload the page in `webrender1` the sketches start from their preset values.
To re-send the current fader positions, run `pushAll()` from the `midi_to_web` DAT's
module in the Textport (right-click the DAT to see its path):

```python
op('<network>/midi_to_web').module.pushAll()
```

### Fader map

Faders are **additive**: each one adds to the preset's own value and the result is clamped
to the value rules. A fader at rest leaves the preset untouched. The map lives in the header
of `Hydra/presets/template.js`, which is the source of truth.

| Fader | CC | Controls |
|---|---|---|
| 1 | 48 | Palette hue A: rotates the hue of the black and mid colours (full cycle) |
| 2 | 49 | Palette hue B: rotates the hue of the white and dither colours |
| 3 | 50 | Post scanline frequency |
| 4 | 51 | Pixelate X of layers 1 and 2 (fewer cells = chunkier) |
| 5 | 52 | Pixelate Y of layers 1 and 2 |
| 6 | 53 | Slow down (subtracts from the preset speed) |
| 7 | 54 | Frequency multiplier of layers 1 and 2, centre = x1, snaps to steps of 15 |
| 8 | 55 | Post wobble amount |
| Master | 56 | Merge blend amounts (-1 .. 1) |

Pads (notes 0..63) are not mapped yet.

## Presets

The template owns the code, the JSONs own the values. Never edit a generated
`preset-N.js` or `main-N.js`; its header says GENERATED.

- `Hydra/presets/template.js`: the one sketch (structure, helpers, fader map).
- `Hydra/presets/json/*.json`: exports from the Frontiers app, one per preset.
  Numbering follows the sorted file names.
- `Hydra/presets/3 Main screens/`: the three interactive screens. The PNGs carry the
  full preset JSON in a `paradigm` tEXt chunk; the extracted JSONs sit in its `json/` folder.

Regenerate after adding a JSON or editing the template (run from the `Hydra` folder):

```bat
node tools/presets-from-json.mjs
node tools/presets-from-json.mjs --json "presets/3 Main screens/json" --prefix main
```

Then reload the page. `unique-N.js` come from the older `tools/json-to-sketch.mjs`
and have no MIDI map by design.

## Clips for the non-interactive screens

`Hydra/clips/clip-NN_preset-N/` are 600-frame PNG sequences rendered from the presets by
`Hydra/tools/render-clips.mjs` (headless Chrome via puppeteer-core, which it borrows from
the sibling `Frontiers x Hydra/app/node_modules`; the preset server must be running). The
TouchDesigner Movie File In TOPs read the folders as image sequences and a timer swaps a
random screen to a clip not already playing every 5 to 10 s. New clips dropped into
`Hydra/clips/` are picked up automatically.

## Repository layout

| Path | Contents |
|---|---|
| `Interactive Screens.toe` | The TouchDesigner project |
| `project1/` | Embody externalizations (TDXN network files, externalizations table) |
| `Hydra/serve-presets.mjs`, `preset-1.html` | Preset server and page shell |
| `Hydra/lib/midi.js` | Web MIDI helpers (`cc`, `ccs`, `note`, `midi.set`) |
| `Hydra/presets/` | Template, JSONs and generated sketches |
| `Hydra/tools/` | Preset generators and the clip renderer |
| `Hydra/clips/` | Rendered clips for the non-interactive screens |
| `Hydra/hydra/` | Git submodule: the hydra editor fork ([diogus888/hydra-unlimited-buffers](https://github.com/diogus888/hydra-unlimited-buffers)), used for the wall's on-screen editor experiments. Not needed to run the wall |
| `Unique screens hydra presets/` | App exports for the seven unique screens |
| `Mockup Screens/` | Screen layout mockup |

Clone with the submodule:

```bat
git clone --recurse-submodules https://github.com/diogus888/frontiers-interactive-screens.git
```

Not in the repo: TouchDesigner backups, the Python venv, logs, and the Paradigm font
(licensed; the editor fork falls back to a monospace font without it).
