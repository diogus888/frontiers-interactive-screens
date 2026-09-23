// Stamps every preset JSON into the preset template and writes the served sketches.
//
//   node tools/presets-from-json.mjs                 presets/json/*.json -> presets/preset-N.js
//   node tools/presets-from-json.mjs --prefix wall   ... -> presets/wall-N.js
//   node tools/presets-from-json.mjs --json <dir> --template <file> --out <dir> --prefix <name>
//
// Workflow: the TEMPLATE (presets/template.js) owns the sketch structure, helpers and
// the MIDI fader map; each JSON (an export from the Frontiers app) owns only the values.
// Add a JSON, re-run this, refresh the page. Change the fader map once in the template,
// re-run this, and every preset gets it. Numbering follows the sorted JSON file names,
// so add new files with a later timestamp to keep existing preset numbers stable.
//
// Template syntax (see the header of presets/template.js):
//   {{key}}  {{cMid.r}}  {{seed1}} {{seed2}} {{d1}} {{name}} {{json}} {{file}}
//   a line ending in "// @if t_xxx" is dropped when that toggle is false in the JSON.
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs'
import { join, dirname, basename } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const args = Object.fromEntries(process.argv.slice(2).map((a, i, all) => a.startsWith('--') ? [a.slice(2), all[i + 1]] : null).filter(Boolean))
const jsonDir = args.json || join(here, '..', 'presets', 'json')
const templateFile = args.template || join(here, '..', 'presets', 'template.js')
const outDir = args.out || join(here, '..', 'presets')
const prefix = args.prefix || 'preset'

// values the app treats as fixed and sometimes leaves out of an export
const FIXED = {
  v78: 5.2, v79: 0.1, v80: 256, v81: 256, v82: 5.2, v83: 0.1, v84: 128, v85: 128,
  v86: 5.2, v87: 0.1, v88: 64, v89: 64, v90: 5.2, v91: 0.1, v92: 32, v93: 32,
  v94: 5.2, v95: 0.1, v96: 16, v97: 16, v98: 5.2, v99: 0.1, v100: 8, v101: 8,
  v102: 5.2, v103: 0.1, v104: 4, v105: 4, v106: 5.2, v107: 0.1, v108: 2, v109: 2,
  v110: 20, v111: 1.001, v39_bis: 0.2,
}
// what the app assumes when a toggle is absent from an export (app/src/presets.js defaults):
// every t_* is on except these
const TOGGLE_DEFAULT_OFF = new Set(['t_pp_inverted'])
const toggleOn = (T, k) => (k in T ? T[k] !== false : !TOGGLE_DEFAULT_OFF.has(k))

function stamp(template, preset, meta) {
  const V = preset.values || {}, T = preset.toggles || {}, C = preset.colors || {}, D = preset.dropdowns || {}
  const seed = Number.isFinite(preset.seed) ? preset.seed : 1
  const special = {
    seed1: seed, seed2: seed + 1, seed,
    d1: /^o\d+$/.test(D.d1) ? D.d1 : 'o3',
    name: preset.name || meta.json.replace(/\.json$/i, ''), json: meta.json, file: meta.file,
  }
  const missing = new Set(), unknownToggles = new Set()

  const value = (key) => {
    if (key in special) return String(special[key])
    const m = /^(\w+)\.([rgb])$/.exec(key)
    if (m) { const c = C[m[1]]; if (c && Number.isFinite(c[m[2]])) return String(c[m[2]]); missing.add(key); return `{{${key}}}` }
    if (Number.isFinite(V[key])) return String(V[key])
    if (key in FIXED) return String(FIXED[key])
    missing.add(key); return `{{${key}}}`
  }

  const lines = []
  for (const raw of template.split('\n')) {
    const m = /^(.*?)\s*\/\/ @if (\w+)\s*$/.exec(raw)
    let line = raw
    if (m) {
      if (!(m[2] in T)) unknownToggles.add(m[2])
      if (!toggleOn(T, m[2])) continue         // toggle off (or absent with an off default): drop the line
      line = m[1]
    }
    lines.push(line.replace(/\{\{([\w.]+)\}\}/g, (_, key) => value(key)))
  }
  if (missing.size) throw new Error(`${meta.json}: no value for {{${[...missing].join('}}, {{')}}}`)
  return { code: lines.join('\n'), unknownToggles }
}

// ---- run
if (!existsSync(jsonDir)) { console.error(`no JSON folder: ${jsonDir}`); process.exit(1) }
const templateRaw = readFileSync(templateFile, 'utf8').replace(/\r\n/g, '\n')
// drop the template's own explanatory header (everything up to and including the first "// ====" closing line)
const template = templateRaw.replace(/^\/\/ =+\n[\s\S]*?\n\/\/ =+\n/, '')
const files = readdirSync(jsonDir).filter(f => f.toLowerCase().endsWith('.json')).sort()
if (!files.length) { console.error(`no *.json in ${jsonDir}`); process.exit(1) }
mkdirSync(outDir, { recursive: true })

let failed = false
files.forEach((f, i) => {
  const file = `${prefix}-${i + 1}.js`
  try {
    const preset = JSON.parse(readFileSync(join(jsonDir, f), 'utf8'))
    const { code, unknownToggles } = stamp(template, preset, { json: f, file })
    writeFileSync(join(outDir, file), code)
    const off = Object.entries(preset.toggles || {}).filter(([, v]) => v === false).map(([k]) => k)
    console.log(`${file.padEnd(14)} <- ${f}  (${preset.name}${off.length ? `, off: ${off.join(' ')}` : ''})`)
    if (unknownToggles.size) console.warn(`   note: toggles absent from this JSON, app default used: ${[...unknownToggles].map(k => `${k}=${TOGGLE_DEFAULT_OFF.has(k) ? 'off' : 'on'}`).join(' ')}`)
  } catch (err) {
    failed = true
    console.error(`${file.padEnd(14)} FAILED  ${err.message}`)
  }
})

// generated files beyond the current JSON count are stale: say so, never delete
for (let n = files.length + 1; ; n++) {
  const p = join(outDir, `${prefix}-${n}.js`)
  if (!existsSync(p)) break
  console.warn(`stale: ${basename(p)} has no JSON any more (left in place)`)
}
process.exit(failed ? 1 : 0)
