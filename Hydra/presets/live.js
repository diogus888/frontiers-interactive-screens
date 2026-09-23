// LIVE-VALUES SKETCH for the NON-INTERACTIVE screens (the tile grid of /split).
//
// One fixed superset of the preset structure; every number is an arrow function reading V, so a
// "preset change" is just window.applyPreset(json, fadeMs): every value glides from the old preset to the
// new one over fadeMs (default 1500, smoothstep; 0 = hard cut) with NO shader regeneration, no compile, no
// page load -- the glide keeps the feedback loops from being shocked, which is what made a hard cut hitch. Toggles that a preset turns off are emulated with neutral
// values (rotate 0/0, modulate amount 0, scale 1, pixelate 4096, invert 0, blend 0, contrast 1,
// green threshold 2 = nothing passes, exclusion 0), which is why one structure can play all of them.
// Values not in a JSON fall back to the app's fixed layer-3 constants. No MIDI here by design.
await loadScript("https://metagrowing.org/extra-shaders-for-hydra/lib-noise.js")
await loadScript("https://metagrowing.org/extra-shaders-for-hydra/lib-screen.js")
await loadScript("https://cdn.jsdelivr.net/gh/geikha/hyper-hydra@latest/hydra-blend.js")
await loadScript("https://cdn.jsdelivr.net/gh/geikha/hyper-hydra@latest/hydra-arithmetics.js")

const seed1 = 123
const seed2 = 124
const gridScale = () => 1

const FIXED = {
  v78: 5.2, v79: 0.1, v80: 256, v81: 256, v82: 5.2, v83: 0.1, v84: 128, v85: 128,
  v86: 5.2, v87: 0.1, v88: 64, v89: 64, v90: 5.2, v91: 0.1, v92: 32, v93: 32,
  v94: 5.2, v95: 0.1, v96: 16, v97: 16, v98: 5.2, v99: 0.1, v100: 8, v101: 8,
  v102: 5.2, v103: 0.1, v104: 4, v105: 4, v106: 5.2, v107: 0.1, v108: 2, v109: 2,
  v110: 20, v111: 1.001, v39_bis: 0.2,
}

// preset JSON (values / toggles / colors) -> the flat V the sketch reads
let Vfrom = null, Vto = null, fadeStart = 0, fadeDur = 0
const ease = (t) => t * t * (3 - 2 * t)
const fadeT = () => (fadeDur > 0 ? Math.min(1, (performance.now() - fadeStart) / fadeDur) : 1)
const cur = (k) => { const b = Vto[k]; if (!Vfrom || fadeT() >= 1) return b; const a = Vfrom[k]; return (typeof a === 'number' && typeof b === 'number') ? a + (b - a) * ease(fadeT()) : b }
window.applyPreset = (p, fadeMs = 1500) => {
  const v = p.values || {}, t = p.toggles || {}, c = p.colors || {}
  const g = (k) => (Number.isFinite(v[k]) ? v[k] : (k in FIXED ? FIXED[k] : 0))
  const on = (k, dflt = true) => (k in t ? t[k] !== false : dflt)
  const col = (name, d) => { const x = c[name] || d; return { r: x.r, g: x.g, b: x.b } }
  const flat = (name, x) => ({ [name + '_r']: x.r, [name + '_g']: x.g, [name + '_b']: x.b })
  const N = {}
  for (const k of Object.keys(v)) N[k] = g(k)
  for (const k of Object.keys(FIXED)) if (!(k in N)) N[k] = FIXED[k]
  Object.assign(N, {
    l1rotA: on('t_l1_rotate') ? g('k1') : 0, l1rotS: on('t_l1_rotate') ? g('v10') : 0,
    l1modAmt: on('t_l1_modulate') ? 0.1 : 0,
    l1mrMul: on('t_l1_modulateRotate') ? g('v19') : 0,
    l1scale: on('t_l1_scale') ? g('v20') : 1,
    l1px: on('t_l1_pixelate') ? g('xy1x') : 4096, l1py: on('t_l1_pixelate') ? g('xy1y') : 4096,
    l2rotA: on('t_l2_rotate') ? g('v24') : 0, l2rotS: on('t_l2_rotate') ? g('v25') : 0,
    l2modAmt: on('t_l2_modulate') ? 0.1 : 0,
    l2mrMul: on('t_l2_modulateRotate') ? g('v34') : 0,
    l2scale: on('t_l2_scale') ? g('v35') : 1,
    l2px: on('t_l2_pixelate') ? g('v36') : 4096, l2py: on('t_l2_pixelate') ? g('v37') : 4096,
    l3amp: on('t_l3_amp') ? g('v110') : 1, l3mod: on('t_l3_mod') ? g('v111') : 1e4,
    mergeBlendAmt: on('t_merge_blend') ? g('v40') : 0, mergeCon: on('t_merge_contrast') ? g('v41') : 1,
    gpInv: on('t_gp_invert') ? 1 : 0, gpBlend: on('t_gp_blend') ? g('v43') : 0, gpCon: on('t_gp_contrast') ? g('v44') : 1,
    gpThresh: on('t_gp_const') ? g('v46') : 2,
    clMult: on('t_cl_mult') ? 1 : 0, clMid: on('t_cl_add_mid') ? 1 : 0, clWhite: on('t_cl_add_white') ? 1 : 0,
    ppHigh: on('t_pp_highmask') ? 1 : 0, ppInv: on('t_pp_inverted', false) ? 1 : 0,
    ...flat('cBlack', col('cBlack', { r: 1, g: 1, b: 1 })), ...flat('cMid', col('cMid', { r: 0.5, g: 0.5, b: 0.5 })),
    ...flat('cWhite', col('cWhite', { r: 0, g: 0, b: 0 })), ...flat('cDither', col('cDither', { r: 0, g: 1, b: 0 })),
    speed1: Number.isFinite(v.speed1) ? v.speed1 : 0.05,
  })
  if (Vto) { const snap = {}; for (const k of Object.keys(Vto)) snap[k] = cur(k); Vfrom = snap } else Vfrom = null   // mid-fade re-trigger stays smooth
  Vto = N
  fadeStart = performance.now(); fadeDur = Number.isFinite(fadeMs) ? fadeMs : 1500
  window.V = N                                   // the target, for inspection
  window.currentPresetName = p.name || ''
}
applyPreset(window.__pendingPreset || {"name":"P73","seed":123,"values":{"s1":20,"v8":0.25,"v9":0,"k1":1.57,"v10":2,"v11":12,"v12":0.5,"v13":50,"v14":1,"v15":0.75,"v16":7.3,"v17":0.5,"v18":0.75,"v19":1,"v20":5,"xy1x":400,"xy1y":1152,"v21":125,"v22":0.25,"v23":0,"v24":1.57,"v25":2,"v26":4,"v27":0.5,"v28":50,"v29":1,"v30":0.75,"v31":1,"v32":0.5,"v33":0.75,"v34":1.57,"v35":12.99999999999999,"v36":100,"v37":120,"v38":0.05,"v39":6.3,"v39_bis":0.8,"v40":0.02999999999999998,"v41":1.08,"v42":0.32,"v43":0.278,"v44":1.001,"v45":5.0005,"v46":0.4,"v47":0.4,"v48":0.1,"v49":0.8,"v50":0.1,"v51":0.8,"v52":0.8,"v53":0.15,"v54":1000,"v55":5,"v56":0.002,"v57":5000,"v58":0.6,"v59":0.6,"v60":0.6,"v61":300,"v62":20,"v63":0.6,"v64":0.1,"v65":0.15,"v66":1.5,"v67":0.3,"v68":0,"v69":7.65,"v70":1.02,"v71":1.02,"v72":1,"s2":-0.1,"v73":500,"v74":20,"v75":0.6,"v76":0.1,"v77":0.15,"speed1":0.10999999999999999,"v78":5.2,"v79":0.1,"v80":256,"v81":256,"v82":5.2,"v83":0.1,"v84":128,"v85":128,"v86":5.2,"v87":0.1,"v88":64,"v89":64,"v90":5.2,"v91":0.1,"v92":32,"v93":32,"v94":5.2,"v95":0.1,"v96":16,"v97":16,"v98":5.2,"v99":0.1,"v100":8,"v101":8,"v102":5.2,"v103":0.1,"v104":4,"v105":4,"v106":5.2,"v107":0.1,"v108":2,"v109":2,"v110":20,"v111":1.001,"n1":5,"n2":10,"v1":8.58,"v2":0.5,"v3":8,"v4":85,"v5":0.785,"v6":50,"v7":50},"toggles":{"t_l1_rotate":true,"t_l1_modulate":true,"t_l1_modulateRotate":true,"t_l1_scale":true,"t_l1_pixelate":true,"t_l2_rotate":true,"t_l2_modulate":true,"t_l2_modulateRotate":true,"t_l2_scale":true,"t_l2_pixelate":true,"t_l3_darken1":true,"t_l3_darken2":true,"t_l3_darken3":true,"t_l3_darken4":true,"t_l3_darken5":true,"t_l3_darken6":true,"t_l3_darken7":true,"t_l3_amp":true,"t_l3_mod":true,"t_merge_pysort":true,"t_merge_blend":true,"t_merge_contrast":true,"t_gp_invert":true,"t_gp_pxsort":true,"t_gp_blend":true,"t_gp_contrast":true,"t_gp_const":true,"t_cl_midmask":true,"t_cl_mult":true,"t_cl_add_mid":true,"t_cl_add_white":true,"t_pp_highmask":true,"t_pp_inverted":false,"t2":true,"t3":true,"t4":true,"t5":true,"t6":true,"t7":true,"t8":true,"t9":true,"t11":true,"t_bg_scale":true,"t_bg_color":true,"t_bg_rotate":true,"t_bg_pixelate":true,"t10":true},"colors":{"cBlack":{"r":0.9098039215686274,"g":0.9098039215686274,"b":0.9098039215686274},"cMid":{"r":0.3411764705882354,"g":1,"b":0.9152941176470595},"cWhite":{"r":0.9333333333333333,"g":0.4470588235294118,"b":0.6392156862745098},"cDither":{"r":0.5215686274509804,"g":1,"b":0.5294117647058824}}})
const $ = (k) => () => cur(k)

// VISUAL LAYER 1
osc($('s1'), $('v8'), $('v9'))
  .rotate($('l1rotA'), $('l1rotS'))
  .modulate(noise($('v11'), $('v12')).pixelate($('v13'), $('v14')).rotate(seed1, $('v15')), $('l1modAmt'))
  .modulateRotate(noise($('v16'), $('v17')).rotate(seed1, $('v18')), $('l1mrMul'))
  .scale($('l1scale'))
  .pixelate($('l1px'), $('l1py'))
  .out(o4)

// VISUAL LAYER 2
osc($('v21'), $('v22'), $('v23'))
  .rotate($('l2rotA'), $('l2rotS'))
  .modulate(noise($('v26'), $('v27')).pixelate($('v28'), $('v29')).rotate(seed2, $('v30')), $('l2modAmt'))
  .modulateRotate(noise($('v31'), $('v32')).rotate(seed2, $('v33')), $('l2mrMul'))
  .scale($('l2scale'))
  .pixelate($('l2px'), $('l2py'))
  .out(o6)

// VISUAL LAYER 3 (all presets keep every darken step on)
unoise($('v78'), $('v79')).pixelate($('v80'), $('v81'))
  .darken(unoise($('v82'), $('v83')).pixelate($('v84'), $('v85')))
  .darken(unoise($('v86'), $('v87')).pixelate($('v88'), $('v89')))
  .darken(unoise($('v90'), $('v91')).pixelate($('v92'), $('v93')))
  .darken(unoise($('v94'), $('v95')).pixelate($('v96'), $('v97')))
  .darken(unoise($('v98'), $('v99')).pixelate($('v100'), $('v101')))
  .darken(unoise($('v102'), $('v103')).pixelate($('v104'), $('v105')))
  .darken(unoise($('v106'), $('v107')).pixelate($('v108'), $('v109')))
  .amp($('l3amp'))
  .mod($('l3mod'))
  .out(o0)

// MERGE LAYER 1 & 2
src(o1)
  .pysort($('v38'), () => window.frame++, 0, 1)
  .blend(src(o4).blend(o6, $('v39')).blend(o0, $('v39_bis')), $('mergeBlendAmt'))
  .contrast($('mergeCon'))
  .out(o1)

// GREEN PIXELS LAYER
src(o5)
  .invert($('gpInv'))
  .pxsort($('v42'), () => window.frame++, 1, 0)
  .blend(o1, $('gpBlend'))
  .contrast($('gpCon'))
  .out(o5)

const greenPixels = () =>
  solid($('cDither_r'), $('cDither_g'), $('cDither_b'))
    .mask(src(o5).diff(src(o1).scrollY($('v45'))).thresh($('gpThresh'), $('v47')).dither4(gridScale()))

// COLOR LAYER 1
const midMask = () => src(o1).thresh($('v48')).mult(src(o1).thresh($('v49')).invert())

solid($('cBlack_r'), $('cBlack_g'), $('cBlack_b'))
  .mult(src(o1).thresh($('v50')).invert(), $('clMult'))
  .add(solid($('cMid_r'), $('cMid_g'), $('cMid_b')).mult(midMask()), $('clMid'))
  .add(solid($('cWhite_r'), $('cWhite_g'), $('cWhite_b')).mult(src(o1).thresh($('v51'))), $('clWhite'))
  .out(o2)

// POST PROCESSING
const highMask = () => src(o1).thresh($('v52'), $('v53'))

src(o2)
  .modulate(noise($('v54'), $('v55')), $('v56'))
  .mult(osc($('v57')).add(solid($('v58'), $('v59'), $('v60'))))
  .add(noise($('v61'), $('v62')).luma($('v63'), $('v64')), $('v65'))
  .modulate(osc($('v66'), $('v67'), $('v68')), $('v69'))
  .scale($('v70'), $('v71'), $('v72'))
  .brightness($('s2'))
  .mult(highMask().invert(), $('ppHigh'))
  .add(src(o2).add(noise($('v73'), $('v74')).luma($('v75'), $('v76')), $('v77')).mult(highMask()), $('ppHigh'))
  .layer(greenPixels())
  .exclusion(src(o1).scrollX(-0.5), $('ppInv'))
  .out(o3)

update = () => { speed = cur('speed1') }

render(o3)
