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
  cBlack:  { r: 0.7450980392156863, g: 1, b: 0.6901960784313725 },
  cMid:    { r: 0.6980392156862745, g: 0.9372549019607843, b: 0.3333333333333333 },
  cWhite:  { r: 1, g: 1, b: 1 },
  cDither: { r: 0.7058823529411765, g: 0.42745098039215684, b: 1 },
}

// VISUAL LAYER 1
osc(51, () => 0.037, () => 0)
  .rotate(() => 1.57, () => 2)
  .modulate(noise(() => 8, () => 9.1).pixelate(() => 33, () => 8).rotate(() => seed1, () => 5.55))
  .modulateRotate(noise(() => 5.300000000000001, () => 0.5).rotate(() => seed1, () => 0.75), () => 1.2850000000000001)
  .scale(3)
  .pixelate(() => 266, () => 227)
  .out(o4)

// VISUAL LAYER 2
osc(54, () => 0.21999999999999997, () => 0)
  .rotate(() => 4.29, () => 1.25)
  .modulate(noise(() => 6.3, () => 0.42000000000000004).pixelate(() => 50, () => 6).rotate(() => seed2, () => 5.05))
  .modulateRotate(noise(() => 4.3999999999999995, () => 0.5).rotate(() => seed2, () => 0.75), () => 1.57)
  .scale(() => 8.5)
  .pixelate(() => 344, () => 2554)
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
  .pysort(0.222, () => window.frame++, 0, 1)
  .blend(src(o4).blend(o6, 6.763).blend(o0, () => 4.1850000000000005), 1.9060000000000001)
  .contrast(1.2670000000000001)
  .out(o1)

// GREEN PIXELS LAYER
src(o5)
  .invert()
  .pxsort(2.23, () => window.frame++, 1, 0)
  .blend(o1, 0.155)
  .contrast(1.001)
  .out(o5)

const greenPixels = () =>
  solid(() => pal.cDither.r, () => pal.cDither.g, () => pal.cDither.b)
    .mask(src(o5).diff(src(o1).scrollY(4.0765)).thresh(() => 0.4, () => 0.4).dither4(gridScale()))

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
  .modulate(noise(() => 603, () => 5), () => 0.002)
  .mult(osc(add(502000, 49, 3000, 10000000)).add(solid(() => 0.6, () => 0.6, () => 0.6)))
  .add(noise(() => 331, () => 20).luma(() => 0.6, () => 0.1), () => 0.15)
  .modulate(osc(() => 1.5, () => 0.3, () => 0), () => 0.005)
  .scale(() => 1.02, () => 1.02, () => 1)
  .brightness(() => -0.1)
  .mult(highMask().invert())
  .add(src(o2).add(noise(() => 500, () => 20).luma(() => 0.6, () => 0.1), () => 0.15).mult(highMask()))
  .layer(greenPixels())
  .hue(add(0, 48, 0, 0.5))
  .out(o3)


window.baseSpeed = 0.053
speed = window.baseSpeed

render(o3)