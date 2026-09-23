// Serves every preset in ./presets/ at its own URL, no dependencies.
//
//   node serve-presets.mjs            # http://localhost:8080
//   node serve-presets.mjs 9000       # other port
//
//   /            index with links to all presets
//   /1 … /6      presets/preset-1.js … preset-6.js   (also /preset-1 …)
//   /base        presets/preset.js
//   /<name>      any other presets/<name>.js sketch (e.g. /unique-1); presets/template.js is skipped
//                (preset-N.js are GENERATED from it + presets/json/*.json by tools/presets-from-json.mjs)
//   ?res=WxH     fixed render resolution, e.g. /1?res=1920x1080
//   ?scale=0.5   render at half the window size and stretch (also passed through by /split)
//
// The page shell is taken from preset-1.html and the sketch from the .js file,
// so editing a .js file shows up on refresh. Static files are served too, so
// /preset-1.html and /sandbox/ still work.
import { createServer } from 'node:http'
import { readFileSync, existsSync, readdirSync, statSync, appendFileSync } from 'node:fs'
import { dirname, join, extname, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'
import { networkInterfaces } from 'node:os'

const here = dirname(fileURLToPath(import.meta.url))
const presetsDir = join(here, 'presets')   // the sketches live here; the page shell stays beside this file
const port = Number(process.argv[2]) || 8080

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.md': 'text/plain; charset=utf-8', '.txt': 'text/plain; charset=utf-8',
}

// ---- presets (in ./presets/): preset-N.js -> /N, preset.js -> /base, other *.js -> /<name>
function listPresets() {
  const out = []
  for (const f of readdirSync(presetsDir).sort()) {
    if (!f.endsWith('.js') || f === 'template.js') continue   // template.js is the source the presets are generated from
    let m
    if ((m = /^preset-(\d+)\.js$/.exec(f))) out.push({ route: m[1], file: f, label: `Preset ${m[1]}` })
    else if (f === 'preset.js') out.push({ route: 'base', file: f, label: 'Base (preset.js)' })
    else out.push({ route: f.slice(0, -3), file: f, label: f })
  }
  return out
}

function findPreset(route) {
  const presets = listPresets()
  return presets.find(p => p.route === route)
    || presets.find(p => p.file === route + '.js')          // /preset-1
    || presets.find(p => p.file === route)                  // /preset-1.js (rendered)
}

function renderPreset(p) {
  const shell = readFileSync(join(here, 'preset-1.html'), 'utf8')
  const sketch = readFileSync(join(presetsDir, p.file), 'utf8').replace(/\r\n/g, '\n').trim()
  return shell
    .replace(/<title>[^<]*<\/title>/, `<title>hydra ${p.label}</title>`)
    .replace(/(<script id="sketch" type="text\/plain">)[\s\S]*?(<\/script>)/,
      (_, open, close) => `${open}\n${sketch.replace(/<\/script/gi, '<' + String.fromCharCode(92) + '/script')}\n  ${close}`)
}

function renderIndex() {
  const items = listPresets().map(p =>
    `<li><a href="/${p.route}">/${p.route}</a> <span>${p.label} · presets/${p.file}</span></li>`).join('\n')
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>hydra presets</title>
<style>body{background:#000;color:#eee;font:15px/1.6 Menlo,Consolas,monospace;padding:32px}
a{color:#b8ff4a;text-decoration:none;font-weight:700}a:hover{text-decoration:underline}
li span{color:#888;margin-left:10px}ul{list-style:none;padding:0}p{color:#888}</style></head>
<body><h1>hydra presets</h1><ul>${items}</ul>
<p>Add <code>?res=1920x1080</code> for a fixed render resolution. Ctrl+Shift+H toggles the code overlay, Ctrl+Shift+M the MIDI monitor.<br>
<a href="/split?a=1&amp;b=2">/split?a=1&amp;b=2</a> two presets side by side in one page (<code>&amp;dir=v</code> stacked, <code>&amp;ratio=0.3</code>, more panes with <code>&amp;c=3</code>)<br>
<a href="/sandbox/">/sandbox/</a> Pi feasibility sandbox</p></body></html>`
}

// ---- split screen: several presets in ONE page, each in its own iframe (own hydra + WebGL context)
//   /split?a=1&b=2            left = preset 1, right = preset 2
//   /split?a=1&b=2&dir=v      top / bottom
//   /split?a=1&b=2&c=3        three columns (any number of a, b, c, d ... params)
//   /split?a=1&b=2&ratio=0.3  first pane gets 30 %
//   /split?a=1&b=2&c=3&d=u1,u2&weights=2,2,2,1   pane weights: the 4th pane is half the size of the others
//   /split?a=1&b=2&res=960x1080   passed through to every pane (so is &scale=0.5)
// The wall page loads lib/midi.js itself: window.midi.set(...) (TouchDesigner's push via midi_to_web ->
// executeJavaScript) and Web MIDI both land here and are forwarded to the INTERACTIVE panes only (the numbered
// ones); panes never open MIDI themselves (lib/midi.js returns early when embedded). FADER 1 (CC 48, hue) is
// forwarded as a left-to-right wave, screen i delayed i * &stagger (default 0 = no wave). Fader 3 is unmapped.
// A pane value with commas (d=unique-1,...,unique-7) becomes the NESTED GRID = the NON-INTERACTIVE SCREENS:
// it gets no MIDI. Its tiles all run presets/live.js, ONE fixed superset sketch whose every number is an arrow
// function reading a values object, so every &drift=5,10 seconds one random tile is handed a random preset's
// JSON ({type:'hydra-values'} -> applyPreset) and the values swap on the next frame: no code re-run, no shader
// regeneration, no compile, no page load. The values GLIDE over &fade=1500 ms (smoothstep) so the feedback
// loops are not shocked -- MEASURED WORSE than a hard cut (the unsettled period is what costs), so the default is
// &fade=0. &tilescale=0.25 renders only the tiles at that scale. Off-toggles are neutral values in live.js.
// Never the same tile twice in a row, never a preset already showing; &drift=0 stops it (tiles then show the
// routes as written). Ctrl+Shift+M / +H go to the focused pane.
function paneSrc(r, qs) {
  if (!r.includes(',')) return `/${encodeURIComponent(r)}${qs}`
  const p = new URLSearchParams()
  r.split(',').map(s => s.trim()).filter(Boolean).forEach((s, i) => p.set(String.fromCharCode(97 + i), s))
  p.set('grid', '1')
  return `/split?${p.toString()}${qs ? '&' + qs.slice(1) : ''}`
}

function renderSplit(url) {
  const q = url.searchParams
  const routes = [...q.keys()].filter(k => /^[a-z]$/.test(k)).sort().map(k => q.get(k)).filter(Boolean)
  if (routes.length < 2) return null
  const grid = q.get('grid') === '1'
  const dir = q.get('dir') === 'v' ? 'column' : 'row'
  const ratio = Math.min(0.9, Math.max(0.1, Number(q.get('ratio')) || 0))
  const num = (k, d) => (Number.isFinite(Number(q.get(k))) && q.get(k) !== null ? Number(q.get(k)) : d)
  const telemetry = q.get('telemetry') === '1'      // &telemetry=1 makes the wall page POST long frames to /log (Hydra/hitch.log); off by default
  const stagger = num('stagger', 0)                 // ms between one interactive screen and the next for the HUE wave; 0 = all screens at once (user choice 2026-09-22)
  // non-interactive screens (a nested grid pane): one random tile changes to a random preset every drift[0]..drift[1] s
  const drift = (q.get('drift') || '5,10').split(',').map(Number).filter(n => Number.isFinite(n))
  const driftMin = drift[0] ?? 5, driftMax = drift[1] ?? driftMin
  const fade = num('fade', 0)                       // ms a tile glides from the old preset's values to the new; 0 = hard cut (default: a glide measured WORSE)
  const tileScale = q.get('tilescale')                // &tilescale=0.25: the grid tiles render at this scale instead of &scale
  const pass = new URLSearchParams()
  if (q.get('res')) pass.set('res', q.get('res'))
  if (q.get('scale')) pass.set('scale', q.get('scale'))   // &scale=0.5: every pane renders at half size (quarter of the pixels)
  if (q.get('drift')) pass.set('drift', q.get('drift'))   // reaches the nested grid page
  if (q.get('fade')) pass.set('fade', q.get('fade'))
  const qs = pass.toString() ? '?' + pass.toString() : ''
  const paneQs = (() => { const p = new URLSearchParams(pass); p.delete('drift'); p.delete('fade'); return p.toString() ? '?' + p.toString() : '' })()
  const gridQs = (() => { const p = new URLSearchParams(pass); if (tileScale) p.set('scale', tileScale); return p.toString() ? '?' + p.toString() : '' })()   // what the nested grid page receives
  // pane weights: &weights=2,2,2,1 gives the 4th pane half the size of the others (overrides &ratio)
  const weights = (q.get('weights') || '').split(',').map(Number).filter(n => n > 0)
  const flex = (i) => weights.length === routes.length ? weights[i]
    : ratio && routes.length === 2 ? (i === 0 ? ratio : 1 - ratio) : 1
  const style = (i) => grid ? '' : ` style="flex:${flex(i)} 1 0"`
  // in the GRID page every tile is a plain iframe running the /live sketch; presets are swapped as VALUES (see the grid script);
  // in the wall page a numbered pane is a plain interactive iframe and a comma list becomes the nested grid pane
  const jsonFiles = readdirSync(join(presetsDir, 'json')).filter(f => f.toLowerCase().endsWith('.json')).sort()   // preset N = jsonFiles[N-1]
  const liveTiles = grid && driftMin > 0                 // drifting tiles all run the values-driven /live sketch
  const frames = routes.map((r, i) => grid
    ? `<iframe src="${paneSrc(liveTiles ? 'live' : r, paneQs)}" data-route="${liveTiles ? '' : r}" title="tile ${i + 1}"></iframe>`
    : `<iframe src="${paneSrc(r, r.includes(',') ? gridQs : qs)}" allow="midi" data-route="${r}"${r.includes(',') ? ' data-grid="1"' : ''}${style(i)} title="preset ${r}"></iframe>`).join('\n  ')
  const numbered = listPresets().map(p => p.route).filter(r => /^\d+$/.test(r))
  const cols = Math.ceil(routes.length / 2)
  // grid tiles are always 16:9 (the sketches are designed for it); rows are centred if the pane is taller
  const layout = grid
    ? `body{display:grid;grid-template-columns:repeat(${cols},1fr);grid-auto-rows:calc(100vw / ${cols} * 9 / 16);align-content:center}iframe{width:100%;height:100%}`
    : `body{display:flex;flex-direction:${dir}}`
  const script = grid ? `<script>
  // ---- NON-INTERACTIVE SCREENS: this nested grid gets no MIDI at all. Every tile runs the ONE fixed
  // /live sketch (presets/live.js), whose every number is an arrow function reading a values object, so a
  // "preset change" is just fetching a preset's JSON and posting {type:'hydra-values'} to the tile: the values
  // swap on the next frame -- no code re-run, no shader regeneration, no compile, no page load, no lag.
  // Every DRIFT_MIN..DRIFT_MAX seconds one random tile (never the same one twice in a row) gets a random preset
  // (never one already showing). &drift=5,10 sets the range in seconds; &drift=0 stops it. Each tile gets a
  // distinct random preset as soon as it is up.
  const JSONS = ${JSON.stringify(jsonFiles)}
  const DRIFT_MIN_MS = ${driftMin * 1000}, DRIFT_MAX_MS = ${driftMax * 1000}, FADE_MS = ${fade}
  const tiles = () => Array.from(document.querySelectorAll('iframe'))
  const showing = () => tiles().map(f => f.dataset.route).filter(Boolean)
  const pick = (exclude) => {                     // a preset NUMBER (1-based, matches /N and JSONS[N-1])
    let pool = JSONS.map((_, i) => String(i + 1)).filter(r => !exclude.has(r))
    if (!pool.length) pool = JSONS.map((_, i) => String(i + 1))
    return pool[Math.floor(Math.random() * pool.length)]
  }
  const cache = new Map()
  const presetJson = async (r) => {
    if (!cache.has(r)) cache.set(r, fetch('/presets/json/' + encodeURIComponent(JSONS[Number(r) - 1])).then(x => x.json()))
    return cache.get(r)
  }
  let busy = false, lastTile = -1
  const assign = async (tile, r) => {             // hand a preset's values to the tile's running live sketch
    try {
      const preset = await presetJson(r)
      tile.dataset.route = r
      tile.title = 'preset ' + r
      tile.contentWindow.postMessage({ type: 'hydra-values', preset, route: r, fadeMs: FADE_MS }, '*')
    } catch (err) { console.warn('[grid] preset', r, 'failed:', err) }
  }
  const change = async () => {                    // one random tile, one random preset
    if (busy || DRIFT_MIN_MS <= 0) return
    const list = tiles()
    if (!list.length) return
    let i = Math.floor(Math.random() * list.length)
    if (list.length > 1 && i === lastTile) i = (i + 1) % list.length
    lastTile = i
    busy = true
    const r = pick(new Set(showing()))
    console.log('[grid] tile', i, '->', r)
    if (parent !== window) parent.postMessage({ type: 'grid-change', tile: i, route: r }, '*')
    await assign(list[i], r)
    busy = false
    schedule()
  }
  const schedule = () => { if (DRIFT_MIN_MS > 0) setTimeout(change, DRIFT_MIN_MS + Math.random() * Math.max(0, DRIFT_MAX_MS - DRIFT_MIN_MS)) }
  // first assignment: a distinct random preset per tile as soon as its page is up
  tiles().forEach(f => f.addEventListener('load', () => { if (!/^\\d+$/.test(f.dataset.route || '')) assign(f, pick(new Set(showing()))) }))
  schedule()
  window.change = change                          // manual: change() in the console
</script>` : `<script src="/lib/midi.js"></script>
<script>
  const frames = () => Array.from(document.querySelectorAll('iframe'))
  const interactive = () => frames().filter(f => !f.dataset.grid)   // the numbered panes; the nested grid never gets MIDI
  const STAGGER_MS = ${stagger}
  const HUE_CCS = [48, 49]                                       // faders 1 and 2 = palette hue A / B

  // ---- MIDI: this page owns the device (lib/midi.js here gets Web MIDI; TouchDesigner pushes into
  // midi.set). Panes never open MIDI themselves (midi.js returns early when embedded), so every
  // message reaches them through forward() below. Fader 1 (hue) is delivered as a WAVE, left to right:
  // screen 1 now, screen 2 after STAGGER_MS, screen 3 after 2x. Everything else arrives at once.
  const forward = (type, n, v, ch) => {
    const hue = type === 'cc' && HUE_CCS.includes(Number(n))
    interactive().forEach((f, i) => {
      const w = f.contentWindow
      if (!w || !w.midi || !w.midi.set) return
      const delay = hue ? i * STAGGER_MS : 0
      if (delay > 0) setTimeout(() => { if (f.contentWindow && f.contentWindow.midi) f.contentWindow.midi.set(type, n, v, ch) }, delay)
      else w.midi.set(type, n, v, ch)
    })
  }
  const localSet = midi.set
  midi.set = (type, n, v, ch) => { localSet(type, n, v, ch); forward(type, n, v, ch) }          // TouchDesigner path
  midi.onMessage = (e) => forward(e.type === 'cc' ? 'cc' : 'note', e.n, e.type === 'note off' ? 0 : e.v, e.ch)   // Web MIDI path
  midi.source = 'split'

  // ---- hitch telemetry (diagnostic): frames longer than 50 ms are POSTed to /log with the time since the last
  // tile change, plus an fps sample every 5 s -- read Hydra/hitch.log. &telemetry=0 turns it off.
  if (${telemetry}) {
    let lastChange = { at: -1e9, what: 'none' }, lastT = performance.now(), count = 0
    window.addEventListener('message', (e) => { if (e.data && e.data.type === 'grid-change') lastChange = { at: performance.now(), what: 'tile ' + e.data.tile + ' -> ' + e.data.route } })
    const report = (o) => fetch('/log', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(o) }).catch(() => {})
    const tick = (now) => {
      const dt = now - lastT; lastT = now; count++
      if (dt > 50) report({ hitchMs: Math.round(dt), sinceChangeMs: Math.round(now - lastChange.at), lastChange: lastChange.what })
      requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
    setInterval(() => { report({ fps: Math.round(count / 5) }); count = 0 }, 5000)
  }

  // a pane that (re)loads starts with no fader state: hand it everything this page has seen
  interactive().forEach(f => f.addEventListener('load', () => {
    const w = f.contentWindow
    if (!w || !w.midi || !w.midi.set) return
    for (const [n, v] of Object.entries(midi.cc)) w.midi.set('cc', n, v)
  }))
</script>`
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>hydra split ${routes.join(' | ')}</title>
<style>html,body{margin:0;width:100%;height:100%;background:#000;overflow:hidden}
${layout}iframe{border:0;min-width:0;min-height:0;display:block}
</style></head>
<body>
  ${frames}
${script}
</body></html>`
}

// ---- server
createServer((req, res) => {
  const url = new URL(req.url, 'http://x')
  const path = decodeURIComponent(url.pathname)
  const send = (code, type, body) => { res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store' }); res.end(body) }

  try {
    if (req.method === 'POST' && path === '/log') {           // hitch telemetry from the wall page -> hitch.log
      let body = ''
      req.on('data', c => { body += c })
      req.on('end', () => { appendFileSync(join(here, 'hitch.log'), new Date().toISOString() + ' ' + body.replace(/\s+/g, ' ').slice(0, 400) + '\n'); send(204, 'text/plain', '') })
      return
    }
    if (path === '/') return send(200, MIME['.html'], renderIndex())
    if (path === '/blank') return send(200, MIME['.html'], '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>blank</title><style>html,body{margin:0;width:100%;height:100%;background:#000}</style></head><body></body></html>')   // a free pane (the non-interactive screens are video in TD now)
    if (path === '/split') {
      const page = renderSplit(url)
      return page ? send(200, MIME['.html'], page) : send(400, 'text/plain', 'usage: /split?a=1&b=2  (&dir=v  &ratio=0.3  &res=WxH)')
    }

    const preset = findPreset(path.slice(1))
    if (preset) return send(200, MIME['.html'], renderPreset(preset))

    // static fallback (preset-1.html, sandbox/, …)
    let file = normalize(join(here, path))
    if (!file.startsWith(here)) return send(403, 'text/plain', 'forbidden')
    if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html')
    if (existsSync(file) && statSync(file).isFile()) return send(200, MIME[extname(file).toLowerCase()] || 'application/octet-stream', readFileSync(file))

    send(404, 'text/plain', `not found: ${path}`)
  } catch (err) {
    send(500, 'text/plain', String(err.stack || err))
  }
}).listen(port, '0.0.0.0', () => {
  console.log(`hydra presets  http://localhost:${port}/`)
  for (const list of Object.values(networkInterfaces()))
    for (const n of list) if (n.family === 'IPv4' && !n.internal) console.log(`               http://${n.address}:${port}/`)
  // startup listing: only the routes the wall uses (main-N, the split page) -- every other sketch is still served on
  // request (nothing is loaded until a page asks for it); the index page at / lists them all
  const all = listPresets(), main = all.filter(p => /^main-\d+$/.test(p.route))
  for (const p of main) console.log(`  /${p.route.padEnd(8)} presets/${p.file}`)
  console.log(`  /split?a=main-1&b=main-2&c=main-3&dir=v&scale=0.5   the wall page (TouchDesigner webrender1)`)
  console.log(`  ... plus ${all.length - main.length} other sketches on request (index at /)`)
})
