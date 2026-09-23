// unique-3: generated from "paradigm-1920x1080-20260710114237.json" (preset name "P01", seed 123)
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
  cBlack:  { r: 1, g: 1, b: 1 },
  cMid:    { r: 0.525, g: 0.525, b: 0.525 },
  cWhite:  { r: 0.9882352941176471, g: 0.2313725490196079, b: 0.5038439291732324 },
  cDither: { r: 1, g: 0.4114275251116074, b: 0 },
}

// VISUAL LAYER 1
osc(() => 20, () => 0.006999999999999995, () => 0)
  .rotate(() => 1.57, () => 2)
  .modulate(noise(() => 2.6, () => 0.5).pixelate(() => 8, () => 9).rotate(() => seed1, () => 0.65))
  .modulateRotate(noise(() => 3.2, () => 1.5).rotate(() => seed1, () => 1.75), () => 1.57)
  .scale(() => 1.25)
  .pixelate(() => 463, () => 12)
  .out(o4)

// VISUAL LAYER 2
osc(() => 32, () => 0, () => 0)
  .rotate(() => 2.16, () => 0.1)
  .modulate(noise(() => 0, () => 0.37).pixelate(() => 50, () => 7).rotate(() => seed2, () => 15.55))
  .modulateRotate(noise(() => 9.8, () => 12).rotate(() => seed2, () => 0.75), () => 1.57)
  .scale(() => 21.29999999999999)
  .pixelate(() => 117, () => 1999)
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
  .pysort(() => 0.419, () => window.frame++, 0, sortDirY())
  .blend(src(o4).blend(o6, () => 6.699).blend(o0, () => -14.524000000000001), () => blendDt(1))
  .contrast(() => contrastDt(1.137))
  .out(o1)

// GREEN PIXELS LAYER
src(o5)
  .invert()
  .pxsort(() => 2.59, () => window.frame++, sortDirX(), 0)
  .blend(o1, () => blendDt(0.196))
  .contrast(() => contrastDt(1.779))
  .out(o5)

const greenPixels = () =>
  solid(() => pal.cDither.r, () => pal.cDither.g, () => pal.cDither.b)
    .mask(src(o5).diff(src(o1).scrollY(() => 1.7104999999999997)).thresh(() => 0.4, () => 0.4).dither4(gridScale()))

// COLOR LAYER 1
const midMask = () => src(o1).thresh(() => 0.1).mult(src(o1).thresh(() => 0.8).invert())

solid(() => pal.cBlack.r, () => pal.cBlack.g, () => pal.cBlack.b)
  .mult(src(o1).thresh(() => 0.9).invert())
  .add(solid(() => pal.cMid.r, () => pal.cMid.g, () => pal.cMid.b).mult(midMask()))
  .add(solid(() => pal.cWhite.r, () => pal.cWhite.g, () => pal.cWhite.b).mult(src(o1).thresh(() => 0.8)))
  .out(o2)

// POST PROCESSING
const highMask = () => src(o1).thresh(() => 0.8, () => 0.15)

src(o2)
  .modulate(noise(() => 242, () => 5), () => 0.002)
  .mult(osc(() => 3000).add(solid(() => 0.9, () => 0.6, () => 0.6)))
  .add(noise(() => 1778, () => 10).luma(() => 0.6, () => 0.1), () => 0.9)
  .modulate(osc(() => 12, () => 0.3, () => 0.1), () => 0.00999999999999975)
  .scale(() => 1.02, () => 1.02, () => 1)
  .brightness(() => -0.1)
  .mult(highMask().invert())
  .add(src(o2).add(noise(() => 500, () => 20).luma(() => 0.6, () => 0.1), () => 0.15).mult(highMask()))
  .layer(greenPixels())
  .out(o3)

window.baseSpeed = 0.15
speed = window.baseSpeed

render(o3)
