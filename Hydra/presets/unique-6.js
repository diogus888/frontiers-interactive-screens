// unique-6: generated from "paradigm-1920x1080-20260723090209.json" (preset name "P45", seed 123)
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
  cBlack:  { r: 0.3, g: 0.3, b: 0.3 },
  cMid:    { r: 0.9490196078431372, g: 0.14901960784313725, b: 0.4235294117647059 },
  cWhite:  { r: 0.6875, g: 0.6875, b: 0.6875 },
  cDither: { r: 0.8258823529411764, g: 0.28627450980392155, b: 0.9607843137254902 },
}

// VISUAL LAYER 1
osc(() => 37, () => 0.1, () => 0)
  .rotate(() => 1.57, () => 2)
  .modulate(noise(() => 3.9000000000000004, () => 0.5).pixelate(() => 38, () => 8).rotate(() => seed1, () => 0.75))
  .modulateRotate(noise(() => 12, () => 6.4).rotate(() => seed1, () => 0.75), () => 1)
  .scale(() => 2.63)
  .pixelate(() => 2, () => 2044)
  .out(o4)

// VISUAL LAYER 2
osc(() => 241, () => 0.25, () => 0)
  .rotate(() => 3.06, () => 0.020000000000000004)
  .modulate(noise(() => 3.9999999999999996, () => 0.5).pixelate(() => 50, () => 1).rotate(() => seed2, () => 0.75))
  .modulateRotate(noise(() => 10.700000000000001, () => 0.5).rotate(() => seed2, () => 0.75), () => 1.57)
  .scale(() => 45.69999999999999)
  .pixelate(() => 121, () => 5866)
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
  .pysort(() => 0.11, () => window.frame++, 0, sortDirY())
  .blend(src(o4).blend(o6, () => -5.152).blend(o0, () => 11.087), () => blendDt(0.5))
  .contrast(() => contrastDt(1.234))
  .out(o1)

// GREEN PIXELS LAYER
src(o5)
  .invert()
  .pxsort(() => 7.5, () => window.frame++, sortDirX(), 0)
  .blend(o1, () => blendDt(0.102))
  .contrast(() => contrastDt(1.01))
  .out(o5)

const greenPixels = () =>
  solid(() => pal.cDither.r, () => pal.cDither.g, () => pal.cDither.b)
    .mask(src(o5).diff(src(o1).scrollY(() => 4.814)).thresh(() => 0.4, () => 0.4).dither4(gridScale()))

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
  .modulate(noise(() => 996, () => 5), () => 0.002)
  .mult(osc(() => 3046000).add(solid(() => 0.6, () => 0.6, () => 0.6)))
  .add(noise(() => 1201, () => 20).luma(() => 0.6, () => 0.1), () => 0.15)
  .modulate(osc(() => 1.5, () => 0.3, () => 0), () => 0.002)
  .scale(() => 1.02, () => 1.02, () => 1)
  .brightness(() => -0.1)
  .mult(highMask().invert())
  .add(src(o2).add(noise(() => 500, () => 20).luma(() => 0.6, () => 0.1), () => 0.15).mult(highMask()))
  .layer(greenPixels())
  .out(o3)

window.baseSpeed = 0.029999999999999992
speed = window.baseSpeed

render(o3)
