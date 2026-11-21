// A working gta6-cover-art-01 entry (Node 22, standard library only): the app is this directory's app/ folder, plain
// static files a desktop browser loads offline (app/index.html and its ES modules, no library and no network
// request), and the program hands it in. It copies app/ and screenshots/ from beside this file to /output and writes
// /output/dossier.json, the summary the judge reads, with the vendored make.fun library. Only the plumbing, not the
// cover art the bounty asks for: Cover Snap, a plain one-photo square cover with a sunset tint and a bold caption,
// exported as a 1080 x 1080 PNG. Its two sample photos (app/samples/) were made for make.fun with an image model and
// are free to use. Build your own GTA-style cover maker in its place, put your 3 or 4 PNG or JPEG screenshots in
// screenshots/ (the first by name is the cover) and run it.
//
// Entry built for this bounty: Poster Cover Studio, a multi-panel GTA-poster-style cover
// maker (layouts, colour grades, per-panel crops, caption lettering, PNG export at three
// sizes). The app under app/ is entirely my own code; only this packaging is the kit's.
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes; the others refuse an entry the
// scorer would refuse (more than 4 screenshots or one over 256 KiB; more than 993 files in app/ or 48 MiB of app
// files, in all, or a path under app/ over 1000 bytes: app/ counts beside /output's own 1000-entry cap, its
// screenshots/ and dossier.json).
console.log(`gta6-cover-art-01: copied app/ and screenshots/ to ${out}`); // my own line: a plain record of where the entry went
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  }),
);

// A pre-flight check of what was just handed in, against the gate's screenshot limits
// (3-4 shots, each at most 256 KiB, long side at most 1280 px, short side at least
// 480 px). It only reads the copied files and logs: the dossier above is already
// written and nothing here can change its bytes, so repeat runs stay identical.
function imageSize(buf) {
  // PNG: the IHDR width and height sit at bytes 16 and 20, big-endian.
  if (buf.length > 24 && buf.readUInt32BE(0) === 0x89504e47) {
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }
  // JPEG: walk the marker segments until a start-of-frame marker (C0-C2) turns up;
  // its payload is precision (1 byte), height (2), width (2).
  if (buf.length > 4 && buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i + 9 < buf.length) {
      if (buf[i] !== 0xff) { i += 1; continue; }
      const marker = buf[i + 1];
      if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2) {
        return { width: buf.readUInt16BE(i + 7), height: buf.readUInt16BE(i + 5) };
      }
      if (marker === 0xd9 || marker === 0xda) break;
      i += 2 + buf.readUInt16BE(i + 2);
    }
  }
  return null;
}

const shotDir = join(out, 'screenshots');
const shots = existsSync(shotDir) ? readdirSync(shotDir).sort() : [];
const problems = [];
if (shots.length < 3 || shots.length > 4) problems.push(`expected 3-4 screenshots, found ${shots.length}`);
let shotBytes = 0;
for (const name of shots) {
  const path = join(shotDir, name);
  const bytes = statSync(path).size;
  shotBytes += bytes;
  if (bytes > 262144) problems.push(`${name} is ${bytes} bytes, over the 256 KiB cap`);
  const size = imageSize(readFileSync(path));
  if (!size) { problems.push(`${name}: dimensions not readable`); continue; }
  const long = Math.max(size.width, size.height);
  const short = Math.min(size.width, size.height);
  if (long > 1280) problems.push(`${name} is ${size.width}x${size.height}, long side over 1280`);
  if (short < 480) problems.push(`${name} is ${size.width}x${size.height}, short side under 480`);
}
for (const problem of problems) console.log(`gta6-cover-art-01: WARNING ${problem}`);
console.log(
  `gta6-cover-art-01: handed in ${shots.length} screenshot(s), ${shotBytes} bytes in all; ` +
  (problems.length ? `${problems.length} problem(s) found` : 'all within the gate limits'),
);
