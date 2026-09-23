// unique-5: generated from "paradigm-1920x1080-20260716134353.json" (preset name "P38", seed 123)
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
  cBlack:  { r: 0.8352941176470589, g: 0.8392156862745098, b: 0.792156862745098 },
  cMid:    { r: 0.3584046052631577, g: 0.9625, b: 0.1646381578947368 },
  cWhite:  { r: 0.9625, g: 0.7051031294452346, b: 0.15197368421052637 },
  cDither: { r: 0.8274509803921568, g: 0.8313725490196079, b: 0.9372549019607843 },
}

// VISUAL LAYER 1
osc(() => 131, () => 0.012999999999999994, () => 0)
  .rotate(() => 1.57, () => 2)
  .modulate(noise(() => 8, () => 0.5).pixelate(() => 26, () => 20).rotate(() => seed1, () => 19.05))
  .modulateRotate(noise(() => 0.8, () => 0.5).rotate(() => seed1, () => 0.75), () => 50)
  .scale(() => 5.62)
  .pixelate(() => 2810, () => 300)
  .out(o4)

// VISUAL LAYER 2
osc(() => 68, () => 0.25, () => 0)
  .rotate(() => 3.72, () => 2)
  .modulate(noise(() => 4.3999999999999995, () => 0.03999999999999999).pixelate(() => 17, () => 3).rotate(() => seed2, () => 5.05))
  .modulateRotate(noise(() => 10.9, () => 5).rotate(() => seed2, () => 0.75), () => 1.57)
  .scale(() => 173.4)
  .pixelate(() => 160, () => 3909)
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
  .pysort(() => 0.28800000000000003, () => window.frame++, 0, sortDirY())
  .blend(src(o4).blend(o6, () => 6.261).blend(o0, () => 1.304), () => blendDt(0.173))
  .contrast(() => contrastDt(1.0799999999999998))
  .out(o1)

// GREEN PIXELS LAYER
src(o5)
  .invert()
  .pxsort(() => 7.8100000000000005, () => window.frame++, sortDirX(), 0)
  .blend(o1, () => blendDt(0.249))
  .contrast(() => contrastDt(1.359))
  .out(o5)

const greenPixels = () =>
  solid(() => pal.cDither.r, () => pal.cDither.g, () => pal.cDither.b)
    .mask(src(o5).diff(src(o1).scrollY(() => 2.949)).thresh(() => 0.4, () => 0.4).dither4(gridScale()))

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
  .modulate(noise(() => 943, () => 5), () => 0.002)
  .mult(osc(() => 5060000).add(solid(() => 0.6, () => 0.6, () => 0.6)))
  .add(noise(() => 300, () => 20).luma(() => 0.6, () => 0.1), () => 0.15)
  .modulate(osc(() => 1.5, () => 0.3, () => 0), () => 0.00999999999999975)
  .scale(() => 1.02, () => 1.02, () => 1)
  .brightness(() => -0.1)
  .mult(highMask().invert())
  .add(src(o2).add(noise(() => 500, () => 20).luma(() => 0.6, () => 0.1), () => 0.15).mult(highMask()))
  .layer(greenPixels())
  .out(o3)

window.baseSpeed = 0.039999999999999994
speed = window.baseSpeed

render(o3)
