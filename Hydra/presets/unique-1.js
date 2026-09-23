// unique-1: generated from "paradigm-1920x1080-20260707152056.json" (preset name "P08", seed 123)
// by tools/json-to-sketch.mjs -- re-run it after editing the JSON.

await loadScript("https://metagrowing.org/extra-shaders-for-hydra/lib-noise.js")
await loadScript("https://metagrowing.org/extra-shaders-for-hydra/lib-screen.js")
await loadScript("https://cdn.jsdelivr.net/gh/geikha/hyper-hydra@latest/hydra-blend.js")
await loadScript("https://cdn.jsdelivr.net/gh/geikha/hyper-hydra@latest/hydra-arithmetics.js")

const seed1 = 123
const seed2 = 124

const blendDt    = (amt) => amt
const contrastDt = (amt) => amt
const sortDirX   = () => 1
const sortDirY   = () => 1
const gridScale  = () => 1

const pal = {
  cBlack:  { r: 0.8486936090225561, g: 0.9125, b: 0.35419407894736843 },
  cMid:    { r: 0.3802866541353378, g: 0.3638980263157895, b: 0.9375 },
  cWhite:  { r: 0.9411764705882353, g: 0.9411764705882353, b: 0.9411764705882353 },
  cDither: { r: 0.5125, g: 0.5125, b: 0.5125 },
}

// VISUAL LAYER 1
osc(() => 20, () => 0.25, () => 0)
  .rotate(() => 1.57, () => 2)
  .modulate(noise(() => 12, () => 0.5).pixelate(() => 45, () => 1).rotate(() => seed1, () => 0.75))
  .modulateRotate(noise(() => 12, () => 0.5).rotate(() => seed1, () => 0.752), () => 0.5)
  .scale(() => 6.85)
  .pixelate(() => 40, () => 400)
  .out(o4)

// VISUAL LAYER 2
osc(() => 125, () => 1, () => 0)
  .rotate(() => 4.57, () => 3.469446951953614e-18)
  .modulate(noise(() => 0, () => 0).pixelate(() => 12, () => 6).rotate(() => seed2, () => 11.950000000000001))
  .modulateRotate(noise(() => 0.5, () => 1).rotate(() => seed2, () => 0.75), () => 1.57)
  .scale(() => 0.9999999999999883)
  .pixelate(() => 20, () => 5007)
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
  .pysort(() => 0.368, () => window.frame++, 0, sortDirY())
  .blend(src(o4).blend(o6, () => 0.1).blend(o0, () => 0.7000000000000001), () => blendDt(0.5))
  .contrast(() => contrastDt(1.283))
  .out(o1)

// GREEN PIXELS LAYER
src(o5)
  .invert()
  .pxsort(() => 0.01, () => window.frame++, sortDirX(), 0)
  .blend(o1, () => blendDt(0.05))
  .contrast(() => contrastDt(1.343))
  .out(o5)

const greenPixels = () =>
  solid(() => pal.cDither.r, () => pal.cDither.g, () => pal.cDither.b)
    .mask(src(o5).diff(src(o1).scrollY(() => 0.0005)).thresh(() => 0.5, () => 0.5).dither4(gridScale()))

// COLOR LAYER 1
const midMask = () => src(o1).thresh(() => 0.1).mult(src(o1).thresh(() => 0.8).invert())

solid(() => pal.cBlack.r, () => pal.cBlack.g, () => pal.cBlack.b)
  .mult(src(o1).thresh(() => 0.4).invert())
  .add(solid(() => pal.cMid.r, () => pal.cMid.g, () => pal.cMid.b).mult(midMask()))
  .add(solid(() => pal.cWhite.r, () => pal.cWhite.g, () => pal.cWhite.b).mult(src(o1).thresh(() => 0.8)))
  .out(o2)

// POST PROCESSING
const highMask = () => src(o1).thresh(() => 0.8, () => 0.15)

src(o2)
  .modulate(noise(() => 10, () => 5), () => 0.002)
  .mult(osc(() => 3000).add(solid(() => 0.6, () => 0.6, () => 0.6)))
  .add(noise(() => 300, () => 20).luma(() => 0.6, () => 0.1), () => 0.15)
  .modulate(osc(() => 1.5, () => 0.3, () => 0), () => 0.005)
  .scale(() => 1.02, () => 1.02, () => 1)
  .brightness(() => -0.1)
  .mult(highMask().invert())
  .add(src(o2).add(noise(() => 500, () => 20).luma(() => 0.6, () => 0.1), () => 0.15).mult(highMask()))
  .layer(greenPixels())
  .out(o3)

window.baseSpeed = 0.15
speed = window.baseSpeed

render(o3)
