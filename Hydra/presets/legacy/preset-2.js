await loadScript("https://metagrowing.org/extra-shaders-for-hydra/lib-noise.js")
await loadScript("https://metagrowing.org/extra-shaders-for-hydra/lib-screen.js")
await loadScript("https://cdn.jsdelivr.net/gh/geikha/hyper-hydra@latest/hydra-blend.js")
await loadScript("https://cdn.jsdelivr.net/gh/geikha/hyper-hydra@latest/hydra-arithmetics.js")

const seed1 = 123
const seed2 = 124

// ---- APC mini mk2 (needs lib/midi.js). Only faders 1 and 2 are mapped for now; the other
// faders, master and pads will be mapped later.
// Every fader is ADDITIVE: it adds 0 .. (max - min) on top of this preset's own value, clamped to
// the rule range from "Frontiers x Hydra/code-rules.txt", and the preset value holds until it moves.
//   fader 1 CC48  hue shift of the final image   + 0 .. 0.5 (half a cycle)
//   fader 2 CC49  post scanline frequency        + 0 .. 9997000, clamped 3000 .. 10000000 (the .mult(osc(F)) in src(o2))
const add = (base, n, lo, hi) => () => (midi.cc[n] === undefined ? base : Math.min(hi, Math.max(lo, base + ccs(n) * (hi - lo))))
const gridScale  = () => 1

const pal = {
  cBlack:  { r: 1, g: 1, b: 1 },
  cMid:    { r: 0.5115881615804219, g: 1, b: 0.3714671834984762 },
  cWhite:  { r: 0.6363815789473684, g: 0.6375, b: 0.6333059210526315 },
  cDither: { r: 0.5560325487180706, g: 0.44898034346731086, b: 0.9625 },
}

// VISUAL LAYER 1
osc(143.5, () => 0.049999999999999996, () => 1)
  .modulate(noise(() => 4, () => 8.9).pixelate(() => 24.5, () => 1).rotate(() => seed1, () => 0.75))
  .modulateRotate(noise(() => 3.25, () => 1.4000000000000001).rotate(() => seed1, () => 0.75), () => 1.2850000000000001)
  .scale(3.21)
  .pixelate(() => 266, () => 226.5)
  .out(o4)

// VISUAL LAYER 2
osc(152, () => 0.215, () => 0)
  .rotate(() => 1.57, () => 2)
  .modulate(noise(() => 5.4, () => 0.5).pixelate(() => 26.5, () => 1).rotate(() => seed2, () => 0.75))
  .modulateRotate(noise(() => 3.2, () => 0.5).rotate(() => seed2, () => 0.75), () => 1.57)
  .scale(() => 8.499999999999995)
  .pixelate(() => 313, () => 89)
  .out(o6)

// VISUAL LAYER 3
unoise(() => 5.2, () => 0.1).pixelate(() => 256, () => 256)
  .darken(unoise(() => 5.2, () => 0.1).pixelate(() => 128, () => 128))
  .darken(unoise(() => 5.2, () => 0.1).pixelate(() => 64, () => 64))
  .darken(unoise(() => 5.2, () => 0.1).pixelate(() => 32, () => 32))
  .darken(unoise(() => 5.2, () => 0.1).pixelate(() => 16, () => 16))
  .darken(unoise(() => 5.2, () => 0.1).pixelate(() => 8, () => 8))
  .darken(unoise(() => 5.2, () => 0.1).pixelate(() => 4, () => 4))
  .darken(unoise(() => 5.2, () => 0.1).pixelate(() => 2, () => 2))
  .amp(() => 20)
  .mod(() => 1.001)
  .out(o0)

// MERGE LAYER 1 & 2
src(o1)
  .pysort(0.2705, () => window.frame++, 0, 1)
  .blend(src(o4).blend(o6, 6.0715).blend(o0, () => 4.0895), 0.3)
  .contrast(1.08)
  .out(o1)

// GREEN PIXELS LAYER
src(o5)
  .invert()
  .pxsort(2.21, () => window.frame++, 1, 0)
  .contrast(1.0059999999999998)
  .out(o5)

const greenPixels = () =>
  solid(() => pal.cDither.r, () => pal.cDither.g, () => pal.cDither.b)
    .mask(src(o5).diff(src(o1).scrollY(3.5549999999999997)).thresh(() => 0.4, () => 0.4).dither4(gridScale()))

// COLOR LAYER 1
const midMask = () => src(o1).thresh(() => 0.1).mult(src(o1).thresh(() => 0.8).invert())

solid(() => pal.cBlack.r, () => pal.cBlack.g, () => pal.cBlack.b)
  .mult(src(o1).thresh(() => 0.1).invert())
  .add(solid(() => pal.cMid.r, () => pal.cMid.g, () => pal.cMid.b).mult(midMask()))
  .add(solid(() => pal.cWhite.r, () => pal.cWhite.g, () => pal.cWhite.b).mult(src(o1).thresh(() => 0.8)))
  .out(o2)

// POST PROCESSING
const highMask = () => src(o1).thresh(() => 0.8, () => 0.15)

src(o2)
  .modulate(noise(() => 806.5, () => 5), () => 0.002)
  .mult(osc(add(501500, 49, 3000, 10000000)).add(solid(() => 0.6, () => 0.6, () => 0.6)))
  .add(noise(() => 320.5, () => 20).luma(() => 0.6, () => 0.1), () => 0.15)
  .modulate(osc(() => 1.5, () => 0.3, () => 0), () => 0.007499999999999875)
  .scale(() => 1.02, () => 1.02, () => 1)
  .brightness(() => -0.1)
  .mult(highMask().invert())
  .add(src(o2).add(noise(() => 500, () => 20).luma(() => 0.6, () => 0.1), () => 0.15).mult(highMask()))
  .layer(greenPixels())
  .hue(add(0, 48, 0, 0.5))
  .out(o3)


window.baseSpeed = 0.05999999999999999
speed = window.baseSpeed

render(o3)