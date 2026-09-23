// PRESET 6 = preset 1 + APC mini mk2 (lib/midi.js). Only faders 1 and 2 are mapped for now;
// the other faders, master and pads will be mapped later.
// Every fader is ADDITIVE: it adds 0 .. (max - min) on top of this preset's own value, clamped to
// the rule range, and the preset value holds until the fader moves.
//   fader 1  CC 48  hue shift of the final image     (+ 0 .. 0.5 = half a cycle)
//   fader 2  CC 49  post scanline frequency          (+ 0 .. 9997000, clamped 3000 .. 10000000)
//
// Ctrl+Shift+M shows the incoming MIDI so you can re-map.

await loadScript("https://metagrowing.org/extra-shaders-for-hydra/lib-noise.js")
await loadScript("https://metagrowing.org/extra-shaders-for-hydra/lib-screen.js")
await loadScript("https://cdn.jsdelivr.net/gh/geikha/hyper-hydra@latest/hydra-blend.js")
await loadScript("https://cdn.jsdelivr.net/gh/geikha/hyper-hydra@latest/hydra-arithmetics.js")

const seed1 = 123
const seed2 = 124

const add = (base, n, lo, hi) => () => (midi.cc[n] === undefined ? base : Math.min(hi, Math.max(lo, base + ccs(n) * (hi - lo))))
const gridScale  = () => 1

const pal = {
  cBlack:  { r: 0.8875, g: 0.8875, b: 0.8875 },
  cMid:    { r: 0.9875, g: 0.4157894736842105, b: 0.8329836415362727 },
  cWhite:  { r: 0.7474845201238389, g: 0.4276315789473685, b: 1 },
  cDither: { r: 0.29605263157894735, g: 0.9375, b: 0.5794828641370868 },
}

// VISUAL LAYER 1
osc(120, 0.1, 1)
  .rotate(1.57, 2)
  .modulate(noise(10, 6.6).pixelate(23, 11).rotate(seed1, 12.350000000000001))
  .modulateRotate(noise(1, 0.5).rotate(seed1, 0.75), 1)
  .scale(3.5)
  .pixelate(1324, 1460)
  .out(o4)

// VISUAL LAYER 2
osc(65, 0.37, 0)
  .rotate(1.79, 1.52)
  .modulate(noise(11.200000000000001, 0.5).pixelate(31, 12).rotate(seed2, 15.450000000000001))
  .modulateRotate(noise(1, 0.5).rotate(seed2, 0.75), 1.2850000000000001)
  .scale(77.3)
  .pixelate(207, 5015)
  .out(o6)

// VISUAL LAYER 3
unoise(5.2, 0.1).pixelate(256, 256)
  .darken(unoise(5.2, 0.1).pixelate(128, 128))
  .darken(unoise(5.2, 0.1).pixelate(64, 64))
  .darken(unoise(5.2, 0.1).pixelate(32, 32))
  .darken(unoise(5.2, 0.1).pixelate(16, 16))
  .darken(unoise(5.2, 0.1).pixelate(8, 8))
  .darken(unoise(5.2, 0.1).pixelate(4, 4))
  .darken(unoise(5.2, 0.1).pixelate(2, 2))
  .amp(20)
  .mod(1.001)
  .out(o0)

// MERGE LAYER 1 & 2
src(o1)
  .pysort(0.449, () => window.frame++, 0, 1)
  .blend(src(o4).blend(o6, 7.2540000000000004).blend(o0, 0.535), 0.08)
  .contrast(1.131)
  .out(o1)

// GREEN PIXELS LAYER
src(o5)
  .invert()
  .pxsort(0.01, () => window.frame++, 1, 0)
  .blend(o1, 0.05)
  .contrast(1.0479999999999998)
  .out(o5)

const greenPixels = () =>
  solid(pal.cDither.r, pal.cDither.g, pal.cDither.b)
    .mask(src(o5).diff(src(o1).scrollY(4.4094999999999995)).thresh(0.4, 0.4).dither4(gridScale()))

// COLOR LAYER 1
const midMask = () => src(o1).thresh(0.1).mult(src(o1).thresh(0.8).invert())

solid(pal.cBlack.r, pal.cBlack.g, pal.cBlack.b)
  .mult(src(o1).thresh(0.1).invert())
  .add(solid(pal.cMid.r, pal.cMid.g, pal.cMid.b).mult(midMask()))
  .add(solid(pal.cWhite.r, pal.cWhite.g, pal.cWhite.b).mult(src(o1).thresh(0.8)))
  .out(o2)

// POST PROCESSING
const highMask = () => src(o1).thresh(0.8, 0.15)

src(o2)
  .modulate(noise(596, 5), 0.002)
  .mult(osc(add(9110000, 49, 3000, 10000000)).add(solid(0.6, 0.6, 0.6)))
  .add(noise(1650, 20).luma(0.6, 0.1), 0.15)
  .modulate(osc(6.75, 0.3, 0), 0.007499999999999875)
  .scale(1.02, 1.02, 1)
  .brightness(-0.1)
  .mult(highMask().invert())
  .add(src(o2).add(noise(500, 20).luma(0.6, 0.1), 0.15).mult(highMask()))
  .layer(greenPixels())
  .hue(add(0, 48, 0, 0.5))
  .out(o3)


window.baseSpeed = 0.05399999999999999
speed = window.baseSpeed

render(o3)
