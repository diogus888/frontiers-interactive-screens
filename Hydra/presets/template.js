// ============================================================================
// PRESET TEMPLATE -- the ONE place the sketch structure and the MIDI map live.
//
// tools/presets-from-json.mjs stamps every presets/json/*.json into this file and
// writes presets/preset-1.js, preset-2.js ... (sorted by JSON file name).
//
//   {{key}}          a number from the JSON "values" (s1, v8 ... v111, xy1x, speed1, ...)
//   {{cMid.r}}       a colour channel from "colors"
//   {{seed1}} {{seed2}}   seed and seed + 1        {{d1}}   render target from "dropdowns"
//   {{name}} {{json}} {{file}}   preset name, source JSON file, generated file name
//   // @if t_xxx     the line is kept only when that toggle is not false in the JSON
//
// Values that are not in a JSON fall back to FIXED in the tool (the layer-3 constants).
// Edit THIS file for anything that is not a value: structure, helpers, the fader map.
// Edit the JSON for values. Then re-run:   node tools/presets-from-json.mjs
// ============================================================================
// {{file}} -- GENERATED from presets/json/{{json}} ("{{name}}", seed {{seed1}}). Do not edit by hand.

await loadScript("https://metagrowing.org/extra-shaders-for-hydra/lib-noise.js")
await loadScript("https://metagrowing.org/extra-shaders-for-hydra/lib-screen.js")
await loadScript("https://cdn.jsdelivr.net/gh/geikha/hyper-hydra@latest/hydra-blend.js")
await loadScript("https://cdn.jsdelivr.net/gh/geikha/hyper-hydra@latest/hydra-arithmetics.js")

const seed1 = {{seed1}}
const seed2 = {{seed2}}

// ---- APC mini mk2 (needs lib/midi.js). Faders 1-8 and the master fader are mapped; the pads will be mapped later.
// Every fader is ADDITIVE: it adds 0 .. (max - min) on top of this preset's own value, clamped to
// the rule range from "Frontiers x Hydra/code-rules.txt", and the preset value holds until it moves.
//   fader 1 CC48  PALETTE HUE A: rotates the hue of cBlack and cMid, 0 .. 1 = a full cycle (top = back to the preset colours)
//   fader 2 CC49  PALETTE HUE B: rotates the hue of cWhite and cDither, same range
//   fader 3 CC50  post scanline frequency        + 0 .. 9997000, clamped 3000 .. 10000000 (the .mult(osc(F)) in src(o2))
//   fader 4 CC51  PIXELATE X of layer 1 and layer 2: the x cell count = preset value divided by up to 100 (exponential,
//                 mid fader = /10), clamped to its rule range (layer 1: 2 .. 4000, layer 2: 2 .. 1000). Fewer cells = chunkier
//   fader 5 CC52  PIXELATE Y of layer 1 and layer 2: same, on the y cell count (layer 1: 2 .. 4000, layer 2: 2 .. 10000)
//   fader 6 CC53  SLOW DOWN: speed = preset speed - 0 .. 0.14, clamped 0.01 .. 0.15 (rule range); at rest = preset speed
//   fader 7 CC54  layer-1 AND layer-2 frequency MULTIPLIER (the osc(s1) / osc(v21) below): centre = x1 (preset value), top = x4, bottom = x0.1,
//                 the result SNAPS to multiples of 15 (15, 30, 45 ...; floor 15), clamped to the rule range 1 .. 300; the preset value holds until the fader moves
//   fader 8 CC55  post wobble (v69, the amount of .modulate(osc(1.5, 0.3, 0), V) in src(o2)): preset value + 0 .. 11.998,
//                 clamped 0.002 .. 12 (rule range)
//   master CC56   MERGE BLENDS: both blend amounts of the merge layer (src(o4).blend(o6, V).blend(o0, V)) are FORCED to
//                 -1 on these screens (the preset`s v39 / v39_bis are ignored) and the fader adds 0 .. 2, so -1 .. 1
const add = (base, n, lo, hi) => () => (midi.cc[n] === undefined ? base : Math.min(hi, Math.max(lo, base + ccs(n) * (hi - lo))))
const sub = (base, n, lo, hi) => () => (midi.cc[n] === undefined ? base : Math.min(hi, Math.max(lo, base - ccs(n) * (hi - lo))))
// divider: fader 0 = preset value, fader 1 = value / factor, exponential in between, clamped to [lo, hi]
// PIXELATE_INT (test, 2026-09-22): snap the pixelate cell counts to whole numbers while the fader moves; set to false to go back
const PIXELATE_INT = true
const snap = (v) => (PIXELATE_INT ? Math.round(v) : v)
const div = (base, n, lo, hi, factor = 100) => () => (midi.cc[n] === undefined ? base : snap(Math.min(hi, Math.max(lo, base / Math.pow(factor, ccs(n))))))
// bipolar multiplier: fader 0.5 = x1, 1 = x up, 0 = x down, clamped to [lo, hi];
// step > 0 snaps the result to multiples of step (never below step, so the oscillator never reaches 0)
const mul = (base, n, lo, hi, down = 0.1, up = 4, step = 15) => () => {
  if (midi.cc[n] === undefined) return base
  const f = ccs(n)
  const k = f >= 0.5 ? 1 + (f - 0.5) * 2 * (up - 1) : down + f * 2 * (1 - down)
  const v = Math.min(hi, Math.max(lo, base * k))
  return step > 0 ? Math.min(hi, Math.max(step, Math.round(v / step) * step)) : v
}
const gridScale  = () => 1

const pal = {
  cBlack:  { r: {{cBlack.r}}, g: {{cBlack.g}}, b: {{cBlack.b}} },
  cMid:    { r: {{cMid.r}}, g: {{cMid.g}}, b: {{cMid.b}} },
  cWhite:  { r: {{cWhite.r}}, g: {{cWhite.g}}, b: {{cWhite.b}} },
  cDither: { r: {{cDither.r}}, g: {{cDither.g}}, b: {{cDither.b}} },
}
// palette hue faders: a colour's hue rotated by fader n (0 .. 1 = a full cycle), saturation and lightness untouched;
// at rest (fader never moved) the preset colour is used as-is. Returns {r, g, b} as functions, evaluated by hydra each frame.
const rgb2hsl = (r, g, b) => {
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2
  if (max === min) return [0, 0, l]
  const d = max - min, s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  return [h / 6, s, l]
}
const hsl2rgb = (h, s, l) => {
  if (s === 0) return [l, l, l]
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q
  const f = (t) => { t = ((t % 1) + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p }
  return [f(h + 1 / 3), f(h), f(h - 1 / 3)]
}
const hued = (c, n) => {
  const [h, s, l] = rgb2hsl(c.r, c.g, c.b)
  let at = null, rgb = [c.r, c.g, c.b]           // memoised per frame (hydra's `time`), so ccs() smooths at the same rate as the other faders
  const get = () => { if (at !== time) { at = time; rgb = midi.cc[n] === undefined ? [c.r, c.g, c.b] : hsl2rgb(h + ccs(n), s, l) } return rgb }
  return { r: () => get()[0], g: () => get()[1], b: () => get()[2] }
}
const col = { cBlack: hued(pal.cBlack, 48), cMid: hued(pal.cMid, 48), cWhite: hued(pal.cWhite, 49), cDither: hued(pal.cDither, 49) }

// VISUAL LAYER 1
osc(mul({{s1}}, 54, 1, 300), {{v8}}, {{v9}})
  .rotate({{k1}}, {{v10}}) // @if t_l1_rotate
  .modulate(noise({{v11}}, {{v12}}).pixelate({{v13}}, {{v14}}).rotate(seed1, {{v15}})) // @if t_l1_modulate
  .modulateRotate(noise({{v16}}, {{v17}}).rotate(seed1, {{v18}}), {{v19}}) // @if t_l1_modulateRotate
  .scale({{v20}}) // @if t_l1_scale
  .pixelate(div({{xy1x}}, 51, 2, 4000), div({{xy1y}}, 52, 2, 4000)) // @if t_l1_pixelate
  .out(o4)

// VISUAL LAYER 2
osc(mul({{v21}}, 54, 1, 300), {{v22}}, {{v23}})
  .rotate({{v24}}, {{v25}}) // @if t_l2_rotate
  .modulate(noise({{v26}}, {{v27}}).pixelate({{v28}}, {{v29}}).rotate(seed2, {{v30}})) // @if t_l2_modulate
  .modulateRotate(noise({{v31}}, {{v32}}).rotate(seed2, {{v33}}), {{v34}}) // @if t_l2_modulateRotate
  .scale({{v35}}) // @if t_l2_scale
  .pixelate(div({{v36}}, 51, 2, 1000), div({{v37}}, 52, 2, 10000)) // @if t_l2_pixelate
  .out(o6)

// VISUAL LAYER 3
unoise({{v78}}, {{v79}}).pixelate({{v80}}, {{v81}})
  .darken(unoise({{v82}}, {{v83}}).pixelate({{v84}}, {{v85}})) // @if t_l3_darken1
  .darken(unoise({{v86}}, {{v87}}).pixelate({{v88}}, {{v89}})) // @if t_l3_darken2
  .darken(unoise({{v90}}, {{v91}}).pixelate({{v92}}, {{v93}})) // @if t_l3_darken3
  .darken(unoise({{v94}}, {{v95}}).pixelate({{v96}}, {{v97}})) // @if t_l3_darken4
  .darken(unoise({{v98}}, {{v99}}).pixelate({{v100}}, {{v101}})) // @if t_l3_darken5
  .darken(unoise({{v102}}, {{v103}}).pixelate({{v104}}, {{v105}})) // @if t_l3_darken6
  .darken(unoise({{v106}}, {{v107}}).pixelate({{v108}}, {{v109}})) // @if t_l3_darken7
  .amp({{v110}}) // @if t_l3_amp
  .mod({{v111}}) // @if t_l3_mod
  .out(o0)

// MERGE LAYER 1 & 2
src(o1)
  .pysort({{v38}}, () => window.frame++, 0, 1) // @if t_merge_pysort
  .blend(src(o4).blend(o6, add(-1, 56, -1, 1)).blend(o0, add(-1, 56, -1, 1)), {{v40}}) // @if t_merge_blend
  .contrast({{v41}}) // @if t_merge_contrast
  .out(o1)

// GREEN PIXELS LAYER
src(o5)
  .invert() // @if t_gp_invert
  .pxsort({{v42}}, () => window.frame++, 1, 0) // @if t_gp_pxsort
  .blend(o1, {{v43}}) // @if t_gp_blend
  .contrast({{v44}}) // @if t_gp_contrast
  .out(o5)

const greenPixels = () =>
  solid(col.cDither.r, col.cDither.g, col.cDither.b)
    .mask(src(o5).diff(src(o1).scrollY({{v45}})).thresh({{v46}}, {{v47}}).dither4(gridScale()))

// COLOR LAYER 1
const midMask = () => src(o1).thresh({{v48}}).mult(src(o1).thresh({{v49}}).invert())

solid(col.cBlack.r, col.cBlack.g, col.cBlack.b)
  .mult(src(o1).thresh({{v50}}).invert()) // @if t_cl_mult
  .add(solid(col.cMid.r, col.cMid.g, col.cMid.b).mult(midMask())) // @if t_cl_add_mid
  .add(solid(col.cWhite.r, col.cWhite.g, col.cWhite.b).mult(src(o1).thresh({{v51}}))) // @if t_cl_add_white
  .out(o2)

// POST PROCESSING
const highMask = () => src(o1).thresh({{v52}}, {{v53}})

src(o2)
  .modulate(noise({{v54}}, {{v55}}), {{v56}})
  .mult(osc(add({{v57}}, 50, 3000, 10000000)).add(solid({{v58}}, {{v59}}, {{v60}})))
  .add(noise({{v61}}, {{v62}}).luma({{v63}}, {{v64}}), {{v65}})
  .modulate(osc({{v66}}, {{v67}}, {{v68}}), add({{v69}}, 55, 0.002, 12))
  .scale({{v70}}, {{v71}}, {{v72}})
  .brightness({{s2}})
  .mult(highMask().invert()) // @if t_pp_highmask
  .add(src(o2).add(noise({{v73}}, {{v74}}).luma({{v75}}, {{v76}}), {{v77}}).mult(highMask())) // @if t_pp_highmask
  .layer(greenPixels()) // @if t_gp_const
  .exclusion(src(o1).scrollX(-0.5), 1) // @if t_pp_inverted
  .out({{d1}})

window.baseSpeed = {{speed1}}
// speed is a plain number in hydra, so fader 6 is applied once per frame (hydra calls update() every frame)
const slowDown = sub(window.baseSpeed, 53, 0.01, 0.15)
speed = window.baseSpeed
update = () => { speed = slowDown() }

render({{d1}})
