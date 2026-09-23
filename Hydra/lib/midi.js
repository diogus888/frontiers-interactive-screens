// Web MIDI -> hydra. Loaded by the preset pages before the sketch runs.
//
// In a sketch, wrap the value in an arrow function so hydra re-reads it every frame:
//
//   osc(() => 20 + cc(48) * 100)          // fader 1 (CC 48) drives frequency, 0..1 scaled to 20..120
//   .rotate(() => ccs(49) * 6.28)         // fader 2, smoothed, so 7-bit steps do not jump
//   speed = () => 0.02 + cc(56, 0.5) * 0.2   // master fader; 0.5 is used until the fader moves
//
//   cc(n, def = 0)        latest value of controller n on any channel, 0..1 (def until first message)
//   ccs(n, def = 0, k)    same, eased toward the target each frame (k = 0.15 by default)
//   note(n)               velocity 0..1 of note n while held, 0 when released (pads)
//   midi.cc / midi.note   raw maps;  midi.last = most recent message
//
// Ctrl+Shift+M toggles a monitor that shows the connected inputs and every incoming
// message, so you can find out which CC number a fader or knob sends ("MIDI learn").
//
// Akai APC mini mk2: faders 1-8 = CC 48..55, master = CC 56, pads = notes 0..63,
// scene buttons = notes 112..119 (channel 1).
//
// Chrome asks once for permission to use MIDI devices. Web MIDI needs a secure
// context: http://localhost works, a plain http://<ip> page does not.
;(() => {
  const midi = (window.midi = {
    cc: {},       // cc[number] -> 0..1
    ccCh: {},     // ccCh[channel][number] -> 0..1
    note: {},     // note[number] -> velocity 0..1 (0 after note off)
    last: null,   // { type, ch, n, v, raw }
    inputs: [],   // names of connected inputs
    ready: false,
    error: null,
    log: [],
  })
  const smooth = {}

  window.cc = (n, def = 0) => (midi.cc[n] === undefined ? def : midi.cc[n])
  window.ccs = (n, def = 0, k = 0.15) => {
    const target = window.cc(n, def)
    if (smooth[n] === undefined) smooth[n] = target
    smooth[n] += (target - smooth[n]) * k
    return smooth[n]
  }
  window.note = (n) => midi.note[n] || 0

  // ---- external feed: TouchDesigner's Web Render TOP has no MIDI permission UI, so a
  // MIDI In CHOP there pushes values in through webrender.executeJavaScript("midi.set(...)").
  //   midi.set('cc', 48, 0.5)        controller 48 -> 0.5     (optional 4th arg = MIDI channel)
  //   midi.set('note', 3, 1)         note 3 velocity 1 (0 = released)
  midi.set = (type, n, v, ch = 1) => {
    midi.source = 'external'
    handle({ type: type === 'note' ? (v > 0 ? 'note on' : 'note off') : 'cc', ch, n: Number(n), v: Number(v), raw: null })
  }

  // ---- monitor overlay (Ctrl+Shift+M)
  const mon = document.createElement('pre')
  mon.id = 'midi-monitor'
  mon.hidden = true
  mon.style.cssText = [
    'position:fixed', 'right:0', 'top:0', 'margin:0', 'padding:10px 12px', 'z-index:30',
    'max-height:100%', 'overflow:auto', 'color:#b8ff4a', 'background:rgba(0,0,0,0.75)',
    'font:12px/1.4 Menlo,Consolas,monospace', 'white-space:pre', 'pointer-events:none',
  ].join(';')
  const attach = () => document.body ? document.body.appendChild(mon) : document.addEventListener('DOMContentLoaded', () => document.body.appendChild(mon))
  attach()

  const render = () => {
    if (mon.hidden) return
    const head = midi.source === 'external' ? 'MIDI: fed externally (TouchDesigner midi.set)'
      : midi.error ? `MIDI error: ${midi.error}`
      : !midi.ready ? 'MIDI: waiting for permission...'
      : `MIDI inputs: ${midi.inputs.length ? midi.inputs.join(', ') : '(none)'}`
    const held = Object.entries(midi.cc).map(([n, v]) => `cc ${n} = ${v.toFixed(3)}`).join('   ')
    mon.textContent = `${head}\n${held}\n\n${midi.log.slice(-24).join('\n')}`
  }

  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.code === 'KeyM') {
      e.preventDefault()
      mon.hidden = !mon.hidden
      render()
    }
  })

  // ---- message handling (shared by Web MIDI and midi.set)
  function handle(entry) {
    if (entry.type === 'cc') {
      midi.cc[entry.n] = entry.v
      ;(midi.ccCh[entry.ch] = midi.ccCh[entry.ch] || {})[entry.n] = entry.v
    } else {
      midi.note[entry.n] = entry.type === 'note on' ? entry.v : 0
    }
    midi.last = entry
    midi.log.push(`${entry.type.padEnd(8)} ch ${String(entry.ch).padStart(2)}  n ${String(entry.n).padStart(3)}  ${entry.v.toFixed(3)}`)
    if (midi.log.length > 200) midi.log.splice(0, midi.log.length - 200)
    render()
  }

  const onMessage = (e) => {
    const [status, d1, d2] = e.data
    const type = status >> 4
    const ch = (status & 0x0f) + 1
    const raw = Array.from(e.data)
    let entry = null
    if (type === 0xb) entry = { type: 'cc', ch, n: d1, v: d2 / 127, raw }
    else if (type === 0x9 && d2 > 0) entry = { type: 'note on', ch, n: d1, v: d2 / 127, raw }
    else if (type === 0x8 || (type === 0x9 && d2 === 0)) entry = { type: 'note off', ch, n: d1, v: 0, raw }
    if (!entry) return
    handle(entry)
    // hook for a page that embeds others (/split): forward what Web MIDI delivered here to its panes
    if (typeof midi.onMessage === 'function') midi.onMessage(entry)
  }

  // Embedded in another page (a /split pane): that page owns the MIDI device and forwards every
  // message through midi.set(), so this frame must not also open Web MIDI -- otherwise the
  // parent's per-screen timing (the staggered hue) would be bypassed by the direct feed.
  if (window !== window.top) {
    midi.source = 'external'
    return
  }

  const bind = (access) => {
    midi.ready = true
    midi.inputs = []
    access.inputs.forEach((input) => {
      midi.inputs.push(input.name)
      input.onmidimessage = onMessage
    })
    console.log('[midi] inputs:', midi.inputs.length ? midi.inputs.join(', ') : '(none)')
    render()
  }

  if (!navigator.requestMIDIAccess) {
    midi.error = 'Web MIDI not available in this browser'
    console.warn('[midi]', midi.error)
    return
  }
  navigator.requestMIDIAccess().then((access) => {
    bind(access)
    access.onstatechange = () => bind(access)   // hot-plug
  }).catch((err) => {
    midi.error = String(err && err.message || err)
    console.warn('[midi]', midi.error)
    render()
  })
})()
