// preset-233.js -- GENERATED from presets/json/paradigm-1920x1080-20260723144423.json ("P20+P29-avg+P38+P25-avg+P29+P45-avg+P25+P25-avg+P12+P20-avg+218more-avg-avg", seed 138). Do not edit by hand.

await loadScript("https://metagrowing.org/extra-shaders-for-hydra/lib-noise.js")
await loadScript("https://metagrowing.org/extra-shaders-for-hydra/lib-screen.js")
await loadScript("https://cdn.jsdelivr.net/gh/geikha/hyper-hydra@latest/hydra-blend.js")
await loadScript("https://cdn.jsdelivr.net/gh/geikha/hyper-hydra@latest/hydra-arithmetics.js")

const seed1 = 138
const seed2 = 139

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
  cBlack:  { r: 1, g: 1, b: 1 },
  cMid:    { r: 0.9375, g: 0.6955488499792795, b: 0.28371710526315796 },
  cWhite:  { r: 0.925, g: 0.334703947368421, b: 0.6242831429990072 },
  cDither: { r: 0.4527268005540174, g: 0.21167763157894737, b: 0.975 },
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
osc(mul(53, 54, 1, 300), 0.074, 0.4924920395508631)
  .rotate(1.5699999999999983, 1.997134238310709)
  .modulate(noise(7.1, 7.7).pixelate(26, 20).rotate(seed1, 2.65))
  .modulateRotate(noise(4.9, 1.1).rotate(seed1, 0.764809218568795), 14.208414488687785)
  .scale(4.52)
  .pixelate(div(3, 51, 2, 4000), div(3, 52, 2, 4000))
  .out(o4)

// VISUAL LAYER 2
osc(mul(83, 54, 1, 300), 0.35000000000000003, 0)
  .rotate(3.89, 1.3)
  .modulate(noise(3.6999999999999993, 0.31).pixelate(23, 12.333333333333334).rotate(seed2, 5.65))
  .modulateRotate(noise(3.9000000000000004, 2.7).rotate(seed2, 0.7533182503770739), 1.5465780231271982)
  .scale(34.19999999999999)
  .pixelate(div(248, 51, 2, 1000), div(607, 52, 2, 10000))
  .out(o6)

// VISUAL LAYER 3
unoise(5.200000000000007, 0.10000000000000007).pixelate(256, 256)
  .darken(unoise(5.200000000000007, 0.10000000000000007).pixelate(128, 128))
  .darken(unoise(5.200000000000007, 0.10000000000000007).pixelate(64, 64))
  .darken(unoise(5.200000000000007, 0.10000000000000007).pixelate(32, 32))
  .darken(unoise(5.200000000000007, 0.10000000000000007).pixelate(16, 16))
  .darken(unoise(5.200000000000007, 0.10000000000000007).pixelate(8, 8))
  .darken(unoise(5.200000000000007, 0.10000000000000007).pixelate(4, 4))
  .darken(unoise(5.200000000000007, 0.10000000000000007).pixelate(2, 2))
  .amp(20)
  .mod(1.001000000000001)
  .out(o0)

// MERGE LAYER 1 & 2
src(o1)
  .pysort(0.209, () => window.frame++, 0, 1)
  .blend(src(o4).blend(o6, add(-1, 56, -1, 1)).blend(o0, add(-1, 56, -1, 1)), 1.0739999999999998)
  .contrast(1.178)
  .out(o1)

// GREEN PIXELS LAYER
src(o5)
  .invert()
  .pxsort(1.3800000000000001, () => window.frame++, 1, 0)
  .blend(o1, 0.151)
  .contrast(1.168)
  .out(o5)

const greenPixels = () =>
  solid(col.cDither.r, col.cDither.g, col.cDither.b)
    .mask(src(o5).diff(src(o1).scrollY(4.209)).thresh(0.4003794057315237, 0.40046801612200467).dither4(gridScale()))

// COLOR LAYER 1
const midMask = () => src(o1).thresh(0.10000000000000007).mult(src(o1).thresh(0.8000000000000006).invert())

solid(col.cBlack.r, col.cBlack.g, col.cBlack.b)
  .mult(src(o1).thresh(0.10623953376906332).invert())
  .add(solid(col.cMid.r, col.cMid.g, col.cMid.b).mult(midMask()))
  .add(solid(col.cWhite.r, col.cWhite.g, col.cWhite.b).mult(src(o1).thresh(0.8000000000000006)))
  .out(o2)

// POST PROCESSING
const highMask = () => src(o1).thresh(0.8000000000000006, 0.1499999999999998)

src(o2)
  .modulate(noise(884, 5), 0.0020000000000000005)
  .mult(osc(add(749000, 50, 3000, 10000000)).add(solid(0.6019768520194394, 0.5999999999999992, 0.5999999999999992)))
  .add(noise(447, 19.927266633148985).luma(0.5999999999999992, 0.10075414781297141), 0.1613630869783809)
  .modulate(osc(1.7612906993799233, 0.30077662242332787, 0.0007131756996815821), add(0.17999999999999977, 55, 0.002, 12))
  .scale(1.0200000000000011, 1.0200000000000011, 1)
  .brightness(-0.10000000000000007)
  .mult(highMask().invert())
  .add(src(o2).add(noise(500, 20).luma(0.5999999999999992, 0.10075414781297141), 0.1499999999999998).mult(highMask()))
  .layer(greenPixels())
  .out(o3)

window.baseSpeed = 0.03099999999999999
// speed is a plain number in hydra, so fader 6 is applied once per frame (hydra calls update() every frame)
const slowDown = sub(window.baseSpeed, 53, 0.01, 0.15)
speed = window.baseSpeed
update = () => { speed = slowDown() }

render(o3)
