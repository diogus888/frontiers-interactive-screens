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
  cMid:    { r: 0.9686274509803922, g: 0.6235294117647059, b: 0.9921568627450981 },
  cWhite:  { r: 0.1875, g: 0.1875, b: 0.1875 },
  cDither: { r: 1, g: 0.5676691729323305, b: 0.3421052631578947 },
}

// VISUAL LAYER 1
osc(45, () => 0.021999999999999995, () => 0)
  .rotate(() => 1.57, () => 2)
  .modulate(noise(() => 5.5, () => 3.0000000000000004).pixelate(() => 13, () => 9).rotate(() => seed1, () => 7.15))
  .modulateRotate(noise(() => 6.800000000000001, () => 4.8).rotate(() => seed1, () => 0.75), () => 1)
  .scale(5.14)
  .pixelate(() => 1160, () => 231)
  .out(o4)

// VISUAL LAYER 2
osc(76, () => 0.47000000000000003, () => 0)
  .rotate(() => 1.57, () => 0.59)
  .modulate(noise(() => 1.7, () => 0.5).pixelate(() => 15, () => 1).rotate(() => seed2, () => 1.05))
  .modulateRotate(noise(() => 2.9000000000000004, () => 5.4).rotate(() => seed2, () => 0.75), () => 1.57)
  .scale(() => 5.3)
  .pixelate(() => 845, () => 10000)
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
  .pysort(0.147, () => window.frame++, 0, 1)
  .blend(src(o4).blend(o6, 2.608).blend(o0, () => -1.43), 1.313)
  .contrast(1.09)
  .out(o1)

// GREEN PIXELS LAYER
src(o5)
  .invert()
  .pxsort(0.01, () => window.frame++, 1, 0)
  .blend(o1, 0.094)
  .contrast(1.2169999999999999)
  .out(o5)

const greenPixels = () =>
  solid(() => pal.cDither.r, () => pal.cDither.g, () => pal.cDither.b)
    .mask(src(o5).diff(src(o1).scrollY(0.0005)).thresh(() => 0.4, () => 0.4).dither4(gridScale()))

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
  .modulate(noise(() => 193, () => 5), () => 0.002)
  .mult(osc(add(1742000, 49, 3000, 10000000)).add(solid(() => 0.6, () => 0.6, () => 0.6)))
  .add(noise(() => 476, () => 20).luma(() => 0.6, () => 0.1), () => 0.15)
  .modulate(osc(() => 6.75, () => 0.3, () => 0), () => 0.065)
  .scale(() => 1.02, () => 1.02, () => 1)
  .brightness(() => -0.1)
  .mult(highMask().invert())
  .add(src(o2).add(noise(() => 500, () => 20).luma(() => 0.6, () => 0.1), () => 0.15).mult(highMask()))
  .layer(greenPixels())
  .hue(add(0, 48, 0, 0.5))
  .out(o3)


window.baseSpeed = 0.039999999999999994
speed = window.baseSpeed

render(o3)