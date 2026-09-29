// Joins every Hydra/clips/clip-* PNG-sequence folder into one HAP movie for TouchDesigner.
//
//   node Hydra/tools/join-clips.mjs
//
// Writes Hydra/clips-all.mov (HAP, 60 fps, 600 frames per clip, back to back) and
// Hydra/clips-all.txt (the clip folder names in movie order, one per line). The players
// movie_u01..07 read the movie with Specify Index and clip_switcher picks clips by line
// number in the .txt, so re-run this after adding or re-rendering clips, then reload the
// Movie File In TOPs. Needs ffmpeg on the PATH (built with the hap encoder).
import { spawn } from 'node:child_process';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const CLIP_FRAMES = 600;
const hydra = join(dirname(fileURLToPath(import.meta.url)), '..');
const clipsDir = join(hydra, 'clips');

const clips = readdirSync(clipsDir, { withFileTypes: true })
  .filter((d) => d.isDirectory() && d.name.startsWith('clip-'))
  .map((d) => d.name)
  .sort();

for (const clip of clips) {
  const n = readdirSync(join(clipsDir, clip)).filter((f) => f.endsWith('.png')).length;
  if (n !== CLIP_FRAMES) throw new Error(`${clip} has ${n} frames, expected ${CLIP_FRAMES}`);
}

const ffmpeg = spawn('ffmpeg', [
  '-hide_banner', '-loglevel', 'error', '-y',
  '-f', 'image2pipe', '-framerate', '60', '-c:v', 'png', '-i', '-',
  '-c:v', 'hap', '-format', 'hap', '-chunks', '4', '-r', '60',
  join(hydra, 'clips-all.mov'),
], { stdio: ['pipe', 'inherit', 'inherit'] });

const done = new Promise((resolve, reject) => {
  ffmpeg.on('error', reject);
  ffmpeg.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exited with ${code}`))));
});

for (const [i, clip] of clips.entries()) {
  const dir = join(clipsDir, clip);
  const frames = readdirSync(dir).filter((f) => f.endsWith('.png')).sort();
  for (const f of frames) {
    if (!ffmpeg.stdin.write(readFileSync(join(dir, f)))) {
      await new Promise((r) => ffmpeg.stdin.once('drain', r));
    }
  }
  console.log(`${i + 1}/${clips.length} ${clip}`);
}
ffmpeg.stdin.end();
await done;

writeFileSync(join(hydra, 'clips-all.txt'), clips.join('\n') + '\n');
console.log(`Wrote clips-all.mov (${clips.length} clips x ${CLIP_FRAMES} frames) and clips-all.txt`);
