// unique-7: generated from "paradigm-1920x1080-20260723121311.json" (preset name "G17", seed 196)
// by tools/json-to-sketch.mjs -- re-run it after editing the JSON.

await loadScript("https://metagrowing.org/extra-shaders-for-hydra/lib-noise.js")
await loadScript("https://metagrowing.org/extra-shaders-for-hydra/lib-screen.js")
await loadScript("https://cdn.jsdelivr.net/gh/geikha/hyper-hydra@latest/hydra-blend.js")
await loadScript("https://cdn.jsdelivr.net/gh/geikha/hyper-hydra@latest/hydra-arithmetics.js")

const seed1 = 196
const seed2 = 197

const blendDt    = (amt) => amt
const contrastDt = (amt) => amt
const sortDirX   = () => 1
const sortDirY   = () => 1
const gridScale  = () => 1

const pal = {
  cBlack:  { r: 0.7077310924369754, g: 0.5647058823529412, b: 1 },
  cMid:    { r: 0.7215686274509804, g: 1, b: 0.396078431372549 },
  cWhite:  { r: 0.8117647058823529, g: 0.8117647058823529, b: 0.8117647058823529 },
  cDither: { r: 0.43137254901960786, g: 0.43137254901960786, b: 0.43137254901960786 },
}

// VISUAL LAYER 1
osc(() => 17, () => 0, () => 0)
  .rotate(() => 1.57, () => 2)
  .modulate(noise(() => 9.8, () => 22).pixelate(() => 41, () => 1).rotate(() => seed1, () => 0.14999999999999997))
  .pixelate(() => 2, () => 3174)
  .out(o4)

// VISUAL LAYER 2
osc(() => 101, () => 1, () => 0)
  .rotate(() => 7, () => 2)
  .modulate(noise(() => 5.4, () => 0.19999999999999998).pixelate(() => 48, () => 34).rotate(() => seed2, () => 5.05))
  .modulateRotate(noise(() => 6.2, () => 7.1).rotate(() => seed2, () => 0.75), () => 1.57)
  .scale(() => 156.8)
  .pixelate(() => 510, () => 8672)
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
  .pysort(() => 0.747, () => window.frame++, 0, sortDirY())
  .blend(src(o4).blend(o6, () => -10.847).blend(o0, () => 1.429), () => blendDt(0.508))
  .contrast(() => contrastDt(1.49))
  .out(o1)

// GREEN PIXELS LAYER
src(o5)
  .invert()
  .pxsort(() => 8.05, () => window.frame++, sortDirX(), 0)
  .blend(o1, () => blendDt(0.128))
  .contrast(() => contrastDt(1.2069999999999999))
  .out(o5)

const greenPixels = () =>
  solid(() => pal.cDither.r, () => pal.cDither.g, () => pal.cDither.b)
    .mask(src(o5).diff(src(o1).scrollY(() => 4.832)).thresh(() => 0.4, () => 0.40752).dither4(gridScale()))

// COLOR LAYER 1
const midMask = () => src(o1).thresh(() => 0.1).mult(src(o1).thresh(() => 0.8).invert())

solid(() => pal.cBlack.r, () => pal.cBlack.g, () => pal.cBlack.b)
  .mult(src(o1).thresh(() => 0.121522).invert())
  .add(solid(() => pal.cMid.r, () => pal.cMid.g, () => pal.cMid.b).mult(midMask()))
  .add(solid(() => pal.cWhite.r, () => pal.cWhite.g, () => pal.cWhite.b).mult(src(o1).thresh(() => 0.8)))
  .out(o2)

// POST PROCESSING
const highMask = () => src(o1).thresh(() => 0.8, () => 0.15)

src(o2)
  .modulate(noise(() => 953, () => 5), () => 0.002)
  .mult(osc(() => 876000).add(solid(() => 0.6, () => 0.6, () => 0.6)))
  .add(noise(() => 2701, () => 20).luma(() => 0.6, () => 0.1), () => 0.214383)
  .modulate(osc(() => 1.5, () => 0.345675, () => 0), () => 0.16999999999999976)
  .scale(() => 1.02, () => 1.02, () => 1)
  .brightness(() => -0.1)
  .mult(highMask().invert())
  .add(src(o2).add(noise(() => 500, () => 20).luma(() => 0.6, () => 0.1), () => 0.15).mult(highMask()))
  .layer(greenPixels())
  .out(o3)

window.baseSpeed = 0.05399999999999999
speed = window.baseSpeed

render(o3)
