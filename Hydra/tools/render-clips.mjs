// Renders preset pages to PNG sequences, offline and deterministic, for the non-interactive screens.
//
//   node tools/render-clips.mjs [--count=10] [--seconds=10] [--fps=60] [--width=320] [--height=180]
//                               [--warmup=10] [--seed=1] [--presets=12,57,203] [--out=clips] [--headful]
//
// Needs the preset server on :8080. A headless Chrome (puppeteer-core, borrowed from the Frontiers app's
// node_modules) opens /N?res=WxH&manual=1 -- the shell then runs hydra WITHOUT its own frame loop -- and this
// script steps it with window.__tick(1000/fps): `warmup` seconds so the feedback buffers evolve from black,
// then `seconds` x fps captured frames. Every frame is one tick and one canvas read in the same JS task, so
// there is nothing to drop or duplicate. Output: <out>/clip-01_preset-N/frame_0000.png ... + manifest.json.
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const HYDRA = path.resolve(here, '..')
const APP = path.resolve(HYDRA, '..', '..', 'Frontiers x Hydra', 'app')
const require = createRequire(path.join(APP, 'package.json'))
const puppeteer = require('puppeteer-core')

const opts = { count: 10, seconds: 10, fps: 60, width: 320, height: 180, warmup: 10, seed: 1, presets: '', out: path.join(HYDRA, 'clips'), start: 0, headful: false, server: 'http://localhost:8080' }
// --start=N numbers the new clips from N; default 0 = continue after the highest clip-NN already in --out
// --seed picks presets not already rendered into --out (so a new seed never repeats a clip)
for (const a of process.argv.slice(2)) {
  const m = /^--([a-z]+)(?:=(.*))?$/.exec(a)
  if (!m) continue
  const [, k, v] = m
  if (k === 'headful') opts.headful = true
  else if (k in opts) opts[k] = typeof opts[k] === 'number' ? Number(v) : v
  else { console.error(`unknown option --${k}`); process.exit(1) }
}

const chrome = [process.env.CHROME_PATH, `${process.env.ProgramFiles}\\Google\\Chrome\\Application\\chrome.exe`, `${process.env['ProgramFiles(x86)']}\\Google\\Chrome\\Application\\chrome.exe`].filter(Boolean).find(p => fs.existsSync(p))
if (!chrome) { console.error('no Chrome found -- set CHROME_PATH'); process.exit(1) }

// preset numbers = sorted JSON files (same rule as the server and the build tool)
const total = fs.readdirSync(path.join(HYDRA, 'presets', 'json')).filter(f => f.toLowerCase().endsWith('.json')).length
fs.mkdirSync(opts.out, { recursive: true })
// what is already there: clip-NN_preset-N folders -> highest NN and the presets already used
const existing = fs.readdirSync(opts.out).map(f => /^clip-(\d+)_preset-(\d+)$/.exec(f)).filter(Boolean).map(m => ({ index: Number(m[1]), preset: Number(m[2]) }))
const usedPresets = new Set(existing.map(e => e.preset))
const startIndex = opts.start > 0 ? opts.start : (existing.length ? Math.max(...existing.map(e => e.index)) + 1 : 1)
let presets
if (opts.presets) presets = String(opts.presets).split(',').map(s => Number(s.trim())).filter(n => n >= 1 && n <= total)
else {
  let s = (Number(opts.seed) >>> 0) || 1                       // mulberry32: the same seed always picks the same clips
  const rnd = () => { s += 0x6D2B79F5; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
  const pool = [...Array(total).keys()].map(i => i + 1).filter(n => !usedPresets.has(n))
  presets = []
  while (presets.length < Math.min(opts.count, pool.length)) presets.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0])
}
const frames = Math.round(opts.seconds * opts.fps), warmupFrames = Math.round(opts.warmup * opts.fps), dt = 1000 / opts.fps
console.log(`presets ${presets.join(' ')} of ${total} | ${opts.width}x${opts.height} @ ${opts.fps} fps | ${frames} frames after ${warmupFrames} warm-up | -> ${opts.out}`)

const browser = await puppeteer.launch({ executablePath: chrome, headless: !opts.headful, args: ['--ignore-gpu-blocklist', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'], defaultViewport: { width: opts.width, height: opts.height } })
const manifestPath = path.join(opts.out, 'manifest.json')
const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')) : { width: opts.width, height: opts.height, fps: opts.fps, frames, warmupFrames, clips: [] }
manifest.rendered = new Date().toISOString()
manifest.clips = manifest.clips || []
try {
  const page = await browser.newPage()
  page.on('pageerror', e => console.warn('  page error:', e.message))
  for (let c = 0; c < presets.length; c++) {
    const n = presets[c]
    const dir = path.join(opts.out, `clip-${String(startIndex + c).padStart(2, '0')}_preset-${n}`)
    fs.mkdirSync(dir, { recursive: true })
    const t0 = Date.now()
    await page.goto(`${opts.server}/${n}?res=${opts.width}x${opts.height}&manual=1`, { waitUntil: 'load' })
    await page.waitForFunction(() => window.__sketchReady === true, { timeout: 90000 })
    const info = await page.evaluate(() => {
      const err = document.getElementById('err')
      const gl = document.getElementById('hydra-canvas').getContext('webgl') || document.getElementById('hydra-canvas').getContext('webgl2')
      let renderer = '?'; try { const x = gl.getExtension('WEBGL_debug_renderer_info'); renderer = x ? gl.getParameter(x.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER) } catch {}
      return { err: err.hidden ? null : err.textContent.slice(0, 200), renderer, w: document.getElementById('hydra-canvas').width, h: document.getElementById('hydra-canvas').height, name: document.title }
    })
    if (c === 0) console.log(`GL renderer: ${info.renderer}`)
    if (info.err) { console.error(`preset ${n}: sketch error, skipped -- ${info.err}`); continue }
    if (info.w !== opts.width || info.h !== opts.height) { console.error(`preset ${n}: canvas is ${info.w}x${info.h}, skipped`); continue }
    // warm-up: evolve from black without capturing
    await page.evaluate((k, dt) => { window.frame = 0; for (let i = 0; i < k; i++) window.__tick(dt) }, warmupFrames, dt)
    // capture: one tick + one read per frame, in the same task
    let prevSig = '', dupes = 0
    for (let i = 0; i < frames; i++) {
      const dataUrl = await page.evaluate((dt) => { window.__tick(dt); return document.getElementById('hydra-canvas').toDataURL('image/png') }, dt)
      const buf = Buffer.from(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64')
      fs.writeFileSync(path.join(dir, `frame_${String(i).padStart(4, '0')}.png`), buf)
      const sig = buf.length + ':' + buf.subarray(buf.length - 64).toString('hex')   // cheap identical-frame check
      if (sig === prevSig) dupes++
      prevSig = sig
      if (i % 120 === 0) process.stdout.write(`\r  clip ${c + 1}/${presets.length} preset ${n}: ${i}/${frames}`)
    }
    const secs = ((Date.now() - t0) / 1000).toFixed(1)
    console.log(`\r  clip ${c + 1}/${presets.length} preset ${n}: ${frames} frames in ${secs}s${dupes ? `  WARNING ${dupes} identical consecutive frames` : ''}`)
    manifest.clips.push({ index: startIndex + c, preset: n, dir: path.basename(dir), frames, identicalConsecutiveFrames: dupes, seconds: Number(secs) })
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2))   // after every clip, so an interrupted run still leaves a true manifest
  }
} finally {
  await browser.close()
}
console.log(`done: ${presets.length} new clips, ${manifest.clips.length} in total -> ${opts.out}`)
