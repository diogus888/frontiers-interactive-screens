// Converts Frontiers-app preset JSON files into standalone hydra sketches for the wall.
//
//   node tools/json-to-sketch.mjs "<folder with paradigm-*.json>" [outPrefix=unique]
//
// Writes <outPrefix>-1.js, -2.js ... into Hydra/presets/ (sorted by file name), so
// serve-presets.mjs serves them at /unique-1, /unique-2 ...  The code generation is a
// port of buildPresetCode() from "Frontiers x Hydra/app/src/presets.js" (mode 'full'),
// with the four shader-library loadScript lines the other presets use prepended.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { join, dirname, basename } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const outDir = join(here, '..', 'presets')
const [, , srcDir, outPrefix = 'unique'] = process.argv
if (!srcDir) { console.error('usage: node tools/json-to-sketch.mjs <folder> [outPrefix]'); process.exit(1) }

const LOADS = `await loadScript("https://metagrowing.org/extra-shaders-for-hydra/lib-noise.js")
await loadScript("https://metagrowing.org/extra-shaders-for-hydra/lib-screen.js")
await loadScript("https://cdn.jsdelivr.net/gh/geikha/hyper-hydra@latest/hydra-blend.js")
await loadScript("https://cdn.jsdelivr.net/gh/geikha/hyper-hydra@latest/hydra-arithmetics.js")`

const HELPERS = `const blendDt    = (amt) => amt
const contrastDt = (amt) => amt
const sortDirX   = () => 1
const sortDirY   = () => 1
const gridScale  = () => 1`

const FIXED = {
  v78: 5.2, v79: 0.1, v80: 256, v81: 256, v82: 5.2, v83: 0.1, v84: 128, v85: 128,
  v86: 5.2, v87: 0.1, v88: 64, v89: 64, v90: 5.2, v91: 0.1, v92: 32, v93: 32,
  v94: 5.2, v95: 0.1, v96: 16, v97: 16, v98: 5.2, v99: 0.1, v100: 8, v101: 8,
  v102: 5.2, v103: 0.1, v104: 4, v105: 4, v106: 5.2, v107: 0.1, v108: 2, v109: 2,
  v110: 20, v111: 1.001, v39_bis: 0.2,
}

function buildPresetCode(preset) {
  const V = preset.values || {}, T = preset.toggles || {}, C = preset.colors || {}, D = preset.dropdowns || {}
  const g = (k) => (V[k] !== undefined ? V[k] : (FIXED[k] !== undefined ? FIXED[k] : 0))
  const d = (k) => `() => ${g(k)}`
  const on = (k) => T[k] !== false
  const seed = Number.isFinite(preset.seed) ? preset.seed : 1
  const renderTarget = /^o\d+$/.test(D.d1) ? D.d1 : 'o3'
  const col = (name, dflt) => { const c = C[name] || dflt; return `{ r: ${c.r}, g: ${c.g}, b: ${c.b} }` }
  const PAL = `const pal = {
  cBlack:  ${col('cBlack', { r: 1, g: 1, b: 1 })},
  cMid:    ${col('cMid', { r: 0.5, g: 0.5, b: 0.5 })},
  cWhite:  ${col('cWhite', { r: 0, g: 0, b: 0 })},
  cDither: ${col('cDither', { r: 0, g: 1, b: 0 })},
}`
  let l1 = `osc(${d('s1')}, ${d('v8')}, ${d('v9')})`
  if (on('t_l1_rotate')) l1 += `\n  .rotate(${d('k1')}, ${d('v10')})`
  if (on('t_l1_modulate')) l1 += `\n  .modulate(noise(${d('v11')}, ${d('v12')}).pixelate(${d('v13')}, ${d('v14')}).rotate(() => seed1, ${d('v15')}))`
  if (on('t_l1_modulateRotate')) l1 += `\n  .modulateRotate(noise(${d('v16')}, ${d('v17')}).rotate(() => seed1, ${d('v18')}), ${d('v19')})`
  if (on('t_l1_scale')) l1 += `\n  .scale(${d('v20')})`
  if (on('t_l1_pixelate')) l1 += `\n  .pixelate(${d('xy1x')}, ${d('xy1y')})`
  l1 += `\n  .out(o4)`

  let l2 = `osc(${d('v21')}, ${d('v22')}, ${d('v23')})`
  if (on('t_l2_rotate')) l2 += `\n  .rotate(${d('v24')}, ${d('v25')})`
  if (on('t_l2_modulate')) l2 += `\n  .modulate(noise(${d('v26')}, ${d('v27')}).pixelate(${d('v28')}, ${d('v29')}).rotate(() => seed2, ${d('v30')}))`
  if (on('t_l2_modulateRotate')) l2 += `\n  .modulateRotate(noise(${d('v31')}, ${d('v32')}).rotate(() => seed2, ${d('v33')}), ${d('v34')})`
  if (on('t_l2_scale')) l2 += `\n  .scale(${d('v35')})`
  if (on('t_l2_pixelate')) l2 += `\n  .pixelate(${d('v36')}, ${d('v37')})`
  l2 += `\n  .out(o6)`

  const dk = (n, a, b, px, py) => on(`t_l3_darken${n}`) ? `\n  .darken(unoise(${d(a)}, ${d(b)}).pixelate(${d(px)}, ${d(py)}))` : ''
  let l3 = `unoise(${d('v78')}, ${d('v79')}).pixelate(${d('v80')}, ${d('v81')})`
  l3 += dk(1, 'v82', 'v83', 'v84', 'v85') + dk(2, 'v86', 'v87', 'v88', 'v89') + dk(3, 'v90', 'v91', 'v92', 'v93')
  l3 += dk(4, 'v94', 'v95', 'v96', 'v97') + dk(5, 'v98', 'v99', 'v100', 'v101') + dk(6, 'v102', 'v103', 'v104', 'v105')
  l3 += dk(7, 'v106', 'v107', 'v108', 'v109')
  if (on('t_l3_amp')) l3 += `\n  .amp(${d('v110')})`
  if (on('t_l3_mod')) l3 += `\n  .mod(${d('v111')})`
  l3 += `\n  .out(o0)`

  let merge = `src(o1)`
  if (on('t_merge_pysort')) merge += `\n  .pysort(${d('v38')}, () => window.frame++, 0, sortDirY())`
  if (on('t_merge_blend')) merge += `\n  .blend(src(o4).blend(o6, ${d('v39')}).blend(o0, ${d('v39_bis')}), () => blendDt(${g('v40')}))`
  if (on('t_merge_contrast')) merge += `\n  .contrast(() => contrastDt(${g('v41')}))`
  merge += `\n  .out(o1)`

  let gp = `src(o5)`
  if (on('t_gp_invert')) gp += `\n  .invert()`
  if (on('t_gp_pxsort')) gp += `\n  .pxsort(${d('v42')}, () => window.frame++, sortDirX(), 0)`
  if (on('t_gp_blend')) gp += `\n  .blend(o1, () => blendDt(${g('v43')}))`
  if (on('t_gp_contrast')) gp += `\n  .contrast(() => contrastDt(${g('v44')}))`
  gp += `\n  .out(o5)`

  const greenPixels = `const greenPixels = () =>
  solid(() => pal.cDither.r, () => pal.cDither.g, () => pal.cDither.b)
    .mask(src(o5).diff(src(o1).scrollY(${d('v45')})).thresh(${d('v46')}, ${d('v47')}).dither4(gridScale()))`

  const midMask = `const midMask = () => src(o1).thresh(${d('v48')}).mult(src(o1).thresh(${d('v49')}).invert())`
  let color = `solid(() => pal.cBlack.r, () => pal.cBlack.g, () => pal.cBlack.b)`
  if (on('t_cl_mult')) color += `\n  .mult(src(o1).thresh(${d('v50')}).invert())`
  if (on('t_cl_add_mid')) color += `\n  .add(solid(() => pal.cMid.r, () => pal.cMid.g, () => pal.cMid.b).mult(midMask()))`
  if (on('t_cl_add_white')) color += `\n  .add(solid(() => pal.cWhite.r, () => pal.cWhite.g, () => pal.cWhite.b).mult(src(o1).thresh(${d('v51')})))`
  color += `\n  .out(o2)`

  const highMask = `const highMask = () => src(o1).thresh(${d('v52')}, ${d('v53')})`
  let post = `src(o2)
  .modulate(noise(${d('v54')}, ${d('v55')}), ${d('v56')})
  .mult(osc(${d('v57')}).add(solid(${d('v58')}, ${d('v59')}, ${d('v60')})))
  .add(noise(${d('v61')}, ${d('v62')}).luma(${d('v63')}, ${d('v64')}), ${d('v65')})
  .modulate(osc(${d('v66')}, ${d('v67')}, ${d('v68')}), ${d('v69')})
  .scale(${d('v70')}, ${d('v71')}, ${d('v72')})
  .brightness(${d('s2')})`
  if (on('t_pp_highmask')) {
    post += `\n  .mult(highMask().invert())`
    post += `\n  .add(src(o2).add(noise(${d('v73')}, ${d('v74')}).luma(${d('v75')}, ${d('v76')}), ${d('v77')}).mult(highMask()))`
  }
  if (on('t_gp_const')) post += `\n  .layer(greenPixels())`
  if (on('t_pp_inverted')) post += `\n  .exclusion(src(o1).scrollX(-0.5), 1)`
  post += `\n  .out(${renderTarget})`

  return [
    `const seed1 = ${seed}`, `const seed2 = ${seed + 1}`, ``, HELPERS, ``, PAL, ``,
    `// VISUAL LAYER 1`, l1, ``, `// VISUAL LAYER 2`, l2, ``, `// VISUAL LAYER 3`, l3, ``,
    `// MERGE LAYER 1 & 2`, merge, ``, `// GREEN PIXELS LAYER`, gp, ``, greenPixels, ``,
    `// COLOR LAYER 1`, midMask, ``, color, ``, `// POST PROCESSING`, highMask, ``, post, ``,
    `window.baseSpeed = ${g('speed1')}`, `speed = window.baseSpeed`, ``, `render(${renderTarget})`,
  ].join('\n')
}

const files = readdirSync(srcDir).filter(f => f.toLowerCase().endsWith('.json')).sort()
files.forEach((f, i) => {
  const preset = JSON.parse(readFileSync(join(srcDir, f), 'utf8'))
  const out = join(outDir, `${outPrefix}-${i + 1}.js`)
  const header = `// ${outPrefix}-${i + 1}: generated from "${basename(f)}" (preset name "${preset.name}", seed ${preset.seed})\n// by tools/json-to-sketch.mjs -- re-run it after editing the JSON.\n\n`
  writeFileSync(out, header + LOADS + '\n\n' + buildPresetCode(preset) + '\n')
  console.log(`${basename(out)}  <-  ${f}  (${preset.name})`)
})
